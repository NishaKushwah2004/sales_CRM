const express = require("express");
const { DealStage, Prisma } = require("../../../node_modules/@prisma/client");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { dealAccess } = require("../lib/dealAccess");
const { stageProbabilities } = require("../config/dealLifecycle");

const router = express.Router();
const openStages = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
];

function startOfUtcWeek(date) {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - daysSinceMonday,
    ),
  );
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const access = dealAccess(req.user);
    const openWhere = { deletedAt: null, stage: { in: openStages }, ...access };
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const currentWeekStart = startOfUtcWeek(now);
    const eightWeekStart = new Date(currentWeekStart);
    eightWeekStart.setUTCDate(eightWeekStart.getUTCDate() - 49);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const [
      openDeals,
      wonThisMonth,
      lostThisMonth,
      stageGroups,
      ownerGroups,
      weightedGroups,
      wonWeeks,
    ] = await Promise.all([
      prisma.deal.count({ where: openWhere }),
      prisma.deal.count({
        where: {
          deletedAt: null,
          stage: DealStage.WON,
          closedAt: { gte: monthStart, lt: nextMonthStart },
          ...access,
        },
      }),
      prisma.deal.count({
        where: {
          deletedAt: null,
          stage: DealStage.LOST,
          closedAt: { gte: monthStart, lt: nextMonthStart },
          ...access,
        },
      }),
      prisma.deal.groupBy({
        by: ["stage"],
        where: openWhere,
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["ownerId"],
        where: openWhere,
        _count: { _all: true },
      }),
      Promise.all(
        openStages.map((stage) =>
          prisma.deal.aggregate({
            where: { ...openWhere, stage },
            _sum: { value: true },
          }),
        ),
      ),
      prisma.deal.findMany({
        where: {
          deletedAt: null,
          stage: DealStage.WON,
          closedAt: { gte: eightWeekStart, lt: weekEnd },
          ...access,
        },
        select: { closedAt: true },
      }),
    ]);

    const weightedPipeline = weightedGroups.reduce((total, group, index) => {
      const stageTotal = group._sum.value || new Prisma.Decimal(0);
      return total.add(
        stageTotal.mul(String(stageProbabilities[openStages[index]])),
      );
    }, new Prisma.Decimal(0));
    const stageCounts = new Map(
      stageGroups.map((group) => [group.stage, group._count._all]),
    );
    const ownerIds = ownerGroups.map((group) => group.ownerId);
    const owners =
      ownerIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, email: true },
          });
    const ownerEmails = new Map(owners.map((owner) => [owner.id, owner.email]));
    const weeklyCounts = new Map();
    for (const deal of wonWeeks) {
      const week = dateKey(startOfUtcWeek(deal.closedAt));
      weeklyCounts.set(week, (weeklyCounts.get(week) || 0) + 1);
    }
    const wonPerWeek = Array.from({ length: 8 }, (_, index) => {
      const week = new Date(eightWeekStart);
      week.setUTCDate(week.getUTCDate() + index * 7);
      const key = dateKey(week);
      return { week: key, count: weeklyCounts.get(key) || 0 };
    });

    return res.json({
      success: true,
      data: {
        metrics: {
          openDeals,
          weightedPipeline: weightedPipeline.toFixed(2),
          wonThisMonth,
          lostThisMonth,
        },
        openDealsByStage: openStages.map((stage) => ({
          stage,
          count: stageCounts.get(stage) || 0,
        })),
        openDealsByOwner: ownerGroups.map((group) => ({
          ownerId: group.ownerId,
          ownerEmail: ownerEmails.get(group.ownerId) || "Unknown owner",
          count: group._count._all,
        })),
        wonPerWeek,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
