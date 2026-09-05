const express = require("express");
const {
  UserRole,
  DealStage,
  DealEventType,
  Prisma,
} = require("../../../node_modules/@prisma/client");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const {
  forwardTransitions,
  backwardTransitions,
  stageProbabilities,
} = require("../config/dealLifecycle");
const {
  nextForwardStage,
  persistStageTransition,
} = require("../lib/dealLifecycle");
const { dealAccess } = require("../lib/dealAccess");

const router = express.Router();
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decimal = /^\d{1,12}(\.\d{1,2})?$/;
const positiveInteger = /^[1-9]\d*$/;
const sortFields = {
  value: "value",
  expectedCloseDate: "expectedCloseDate",
  lastUpdate: "updatedAt",
};
const defaultPageSize = 10;
const maxPageSize = 100;
const maxBulkDeals = 100;
const openStages = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
];
const include = {
  company: { select: { id: true, name: true, archivedAt: true } },
  owner: { select: { id: true, email: true, role: true } },
};

function validId(value) {
  return typeof value === "string" && uuid.test(value);
}

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function utcToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

function parseDealFields(body) {
  const { title, value, expectedCloseDate } = body || {};
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof value !== "string" ||
    !decimal.test(value) ||
    !validDate(expectedCloseDate)
  )
    return null;

  return {
    title: title.trim(),
    value: new Prisma.Decimal(value),
    expectedCloseDate: new Date(expectedCloseDate),
  };
}

async function findAccessibleDeal(id, user) {
  if (!validId(id)) return null;
  return prisma.deal.findFirst({
    where: { id, deletedAt: null, ...dealAccess(user) },
    include,
  });
}

async function findAccessibleCompany(id, user) {
  if (!validId(id)) return null;
  if (user.role === UserRole.MANAGER) {
    return prisma.company.findUnique({ where: { id } });
  }

  return prisma.company.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        {
          deals: {
            some: {
              deletedAt: null,
              collaborators: { some: { userId: user.id } },
            },
          },
        },
      ],
    },
  });
}

async function findSalesRep(id) {
  if (!validId(id)) return null;
  return prisma.user.findFirst({
    where: { id, role: UserRole.SALES_REP },
    select: { id: true, email: true, role: true },
  });
}

async function findUser(id) {
  if (!validId(id)) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
}

function canManageCollaborators(deal, user) {
  return user.role === UserRole.MANAGER || deal.ownerId === user.id;
}

router.use(requireAuth);

router.get("/alerts/past-due", async (req, res, next) => {
  try {
    const today = utcToday();
    const deals = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        stage: { in: openStages },
        expectedCloseDate: { lt: today },
        ...dealAccess(req.user),
      },
      select: {
        id: true,
        title: true,
        value: true,
        stage: true,
        ownerId: true,
        expectedCloseDate: true,
        company: { select: { name: true } },
        owner: { select: { id: true, email: true, role: true } },
      },
      orderBy: [{ expectedCloseDate: "asc" }, { id: "asc" }],
    });
    const dealIds = deals.map((deal) => deal.id);
    const dismissals =
      dealIds.length === 0
        ? []
        : await prisma.dealAlertDismissal.findMany({
            where: { dealId: { in: dealIds }, dismissedById: req.user.id },
            select: { dealId: true, expectedCloseDate: true },
          });
    const dismissedDates = new Set(
      dismissals.map(
        (dismissal) =>
          `${dismissal.dealId}:${dateKey(dismissal.expectedCloseDate)}`,
      ),
    );
    const alerts = deals
      .filter(
        (deal) =>
          !dismissedDates.has(`${deal.id}:${dateKey(deal.expectedCloseDate)}`),
      )
      .map((deal) => ({
        dealId: deal.id,
        title: deal.title,
        companyName: deal.company.name,
        owner: deal.owner,
        expectedCloseDate: dateKey(deal.expectedCloseDate),
        stage: deal.stage,
        value: deal.value.toFixed(2),
        canDismiss: deal.ownerId === req.user.id,
      }));
    return res.json({ success: true, data: { alerts, count: alerts.length } });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/alerts/past-due/dismiss", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    if (deal.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only the deal owner can dismiss this alert.",
          },
        });
    }
    if (!openStages.includes(deal.stage)) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "DEAL_CLOSED",
            message: "Closed deals cannot have past-due alerts.",
          },
        });
    }
    if (!(deal.expectedCloseDate < utcToday())) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "NOT_PAST_DUE",
            message: "This deal is not past due.",
          },
        });
    }
    try {
      await prisma.dealAlertDismissal.create({
        data: {
          dealId: deal.id,
          dismissedById: req.user.id,
          expectedCloseDate: deal.expectedCloseDate,
        },
      });
    } catch (error) {
      if (error.code !== "P2002") throw error;
    }
    return res.json({
      success: true,
      data: {
        dismissed: true,
        expectedCloseDate: dateKey(deal.expectedCloseDate),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/owners", async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.MANAGER) {
      return res
        .status(403)
        .json({
          success: false,
          error: { code: "FORBIDDEN", message: "Manager access required." },
        });
    }
    const owners = await prisma.user.findMany({
      where: { role: UserRole.SALES_REP },
      select: { id: true, email: true, role: true },
      orderBy: { email: "asc" },
    });
    return res.json({ success: true, data: { owners } });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { search, companyId, stage, ownerId, sortBy, sortOrder } = req.query;
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const pageSize =
      req.query.pageSize === undefined
        ? defaultPageSize
        : Number(req.query.pageSize);
    if (
      (req.query.page !== undefined &&
        (!positiveInteger.test(req.query.page) ||
          !Number.isSafeInteger(page))) ||
      (req.query.pageSize !== undefined &&
        (!positiveInteger.test(req.query.pageSize) ||
          !Number.isSafeInteger(pageSize) ||
          pageSize > maxPageSize))
    ) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_PAGINATION",
            message: `Page must be a positive integer and pageSize must be between 1 and ${maxPageSize}.`,
          },
        });
    }
    if (
      sortBy !== undefined &&
      !Object.prototype.hasOwnProperty.call(sortFields, sortBy)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_SORT_FIELD",
            message: "sortBy must be value, expectedCloseDate, or lastUpdate.",
          },
        });
    }
    if (
      sortOrder !== undefined &&
      sortOrder !== "asc" &&
      sortOrder !== "desc"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_SORT_ORDER",
            message: "sortOrder must be asc or desc.",
          },
        });
    }
    if (companyId !== undefined && !validId(companyId)) {
      return res
        .status(400)
        .json({
          success: false,
          error: { code: "INVALID_COMPANY", message: "companyId is invalid." },
        });
    }
    if (ownerId !== undefined && !validId(ownerId)) {
      return res
        .status(400)
        .json({
          success: false,
          error: { code: "INVALID_OWNER", message: "ownerId is invalid." },
        });
    }
    if (stage !== undefined && !Object.values(DealStage).includes(stage)) {
      return res
        .status(400)
        .json({
          success: false,
          error: { code: "INVALID_STAGE", message: "stage is invalid." },
        });
    }

    const conditions = [];
    if (typeof search === "string" && search.trim()) {
      conditions.push({
        OR: [
          { title: { contains: search.trim(), mode: "insensitive" } },
          {
            company: { name: { contains: search.trim(), mode: "insensitive" } },
          },
        ],
      });
    }
    if (companyId) conditions.push({ companyId });
    if (stage) conditions.push({ stage });
    if (ownerId) conditions.push({ ownerId });
    const where = {
      deletedAt: null,
      ...dealAccess(req.user),
      ...(conditions.length ? { AND: conditions } : {}),
    };
    const orderBy = [
      { [sortFields[sortBy || "lastUpdate"]]: sortOrder || "desc" },
      { id: "asc" },
    ];
    const [deals, total] = await prisma.$transaction([
      prisma.deal.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.deal.count({ where }),
    ]);
    return res.json({
      success: true,
      data: {
        deals,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

function invalidBulkRequest(body) {
  if (!Array.isArray(body?.dealIds) || body.dealIds.length === 0)
    return "dealIds must be a non-empty array.";
  if (body.dealIds.length > maxBulkDeals)
    return `A maximum of ${maxBulkDeals} deals can be selected at once.`;
  if (new Set(body.dealIds).size !== body.dealIds.length)
    return "dealIds must not contain duplicates.";
  return null;
}

function bulkFailure(dealId, reason) {
  return { dealId, success: false, reason };
}

router.post("/bulk-reassign", async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.MANAGER) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only a manager can perform bulk operations.",
          },
        });
    }
    const validationError = invalidBulkRequest(req.body);
    if (validationError || !validId(req.body?.ownerId)) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationError || "A valid ownerId is required.",
          },
        });
    }
    const owner = await findSalesRep(req.body.ownerId);
    if (!owner) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_OWNER",
            message: "Bulk deal owner must be an active sales rep.",
          },
        });
    }

    const results = [];
    for (const dealId of req.body.dealIds) {
      if (!validId(dealId)) {
        results.push(bulkFailure(dealId, "Deal id is invalid."));
        continue;
      }
      const deal = await prisma.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.deletedAt) {
        results.push(bulkFailure(dealId, "Deal does not exist or is deleted."));
        continue;
      }
      if (deal.ownerId === owner.id) {
        results.push(bulkFailure(dealId, "Deal already has this owner."));
        continue;
      }
      const previousOwnerId = deal.ownerId;
      try {
        await prisma.$transaction(async (transaction) => {
          await transaction.deal.update({
            where: { id: deal.id },
            data: { ownerId: owner.id },
          });
          await transaction.dealEvent.create({
            data: {
              dealId: deal.id,
              actorId: req.user.id,
              type: DealEventType.OWNER_REASSIGNED,
              previousOwnerId,
              newOwnerId: owner.id,
            },
          });
        });
        results.push({
          dealId,
          success: true,
          previousOwnerId,
          newOwnerId: owner.id,
        });
      } catch (error) {
        results.push(bulkFailure(dealId, "Deal could not be reassigned."));
      }
    }
    return res.json({ success: true, data: { results } });
  } catch (error) {
    return next(error);
  }
});

router.post("/bulk-advance", async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.MANAGER) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only a manager can perform bulk operations.",
          },
        });
    }
    const validationError = invalidBulkRequest(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: validationError },
        });
    }

    const results = [];
    for (const dealId of req.body.dealIds) {
      if (!validId(dealId)) {
        results.push(bulkFailure(dealId, "Deal id is invalid."));
        continue;
      }
      const deal = await prisma.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.deletedAt) {
        results.push(bulkFailure(dealId, "Deal does not exist or is deleted."));
        continue;
      }
      if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
        results.push(bulkFailure(dealId, "Deal is already closed."));
        continue;
      }
      const newStage = nextForwardStage(deal.stage);
      if (!newStage) {
        results.push(
          bulkFailure(dealId, "Deal cannot advance from its current stage."),
        );
        continue;
      }
      try {
        const transition = await prisma.$transaction(async (transaction) =>
          persistStageTransition(transaction, deal, newStage, req.user.id),
        );
        results.push({ dealId, success: true, ...transition });
      } catch (error) {
        results.push(bulkFailure(dealId, "Deal could not be advanced."));
      }
    }
    return res.json({ success: true, data: { results } });
  } catch (error) {
    return next(error);
  }
});

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

router.get("/export", async (req, res, next) => {
  try {
    const deals = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: [DealStage.WON, DealStage.LOST] },
        ...dealAccess(req.user),
      },
      include: { company: { select: { name: true } } },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
    const rows = [
      ["Company", "Stage", "Value", "Stage Weighted Value"]
        .map(csvValue)
        .join(","),
      ...deals.map((deal) =>
        [
          deal.company.name,
          deal.stage,
          new Prisma.Decimal(deal.value).toFixed(2),
          new Prisma.Decimal(deal.value)
            .mul(stageProbabilities[deal.stage])
            .toFixed(2),
        ]
          .map(csvValue)
          .join(","),
      ),
    ];
    res.type("text/csv");
    res.set(
      "Content-Disposition",
      'attachment; filename="sales-crm-open-deals.csv"',
    );
    return res.send(rows.join("\r\n"));
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const fields = parseDealFields(req.body);
    if (!fields || !validId(req.body?.companyId)) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Valid company, title, exact value, and expected close date are required.",
          },
        });
    }

    const company = await findAccessibleCompany(req.body.companyId, req.user);
    if (!company) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this company.",
          },
        });
    }
    if (company.archivedAt) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "ARCHIVED_COMPANY",
            message: "Archived companies cannot receive new deals.",
          },
        });
    }

    const ownerId =
      req.user.role === UserRole.MANAGER ? req.body.ownerId : req.user.id;
    const owner = await findSalesRep(ownerId);
    if (!owner) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_OWNER",
            message: "Deal owner must be a sales rep.",
          },
        });
    }

    const deal = await prisma.$transaction(async (transaction) => {
      const created = await transaction.deal.create({
        data: {
          ...fields,
          companyId: company.id,
          ownerId: owner.id,
          stage: DealStage.NEW,
        },
        include,
      });
      await transaction.dealEvent.create({
        data: {
          dealId: created.id,
          actorId: req.user.id,
          type: DealEventType.DEAL_CREATED,
        },
      });
      return created;
    });
    return res.status(201).json({ success: true, data: { deal } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/history", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    const events = await prisma.dealEvent.findMany({
      where: { dealId: deal.id },
      include: {
        actor: { select: { id: true, email: true, role: true } },
        previousOwner: { select: { id: true, email: true, role: true } },
        newOwner: { select: { id: true, email: true, role: true } },
      },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    });
    return res.json({ success: true, data: { events } });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/notes", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    const noteBody =
      typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!noteBody || noteBody.length > 5000) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_NOTE",
            message: "A note between 1 and 5000 characters is required.",
          },
        });
    }
    const event = await prisma.dealEvent.create({
      data: {
        dealId: deal.id,
        actorId: req.user.id,
        type: DealEventType.NOTE_ADDED,
        noteBody,
      },
      include: { actor: { select: { id: true, email: true, role: true } } },
    });
    return res.status(201).json({ success: true, data: { event } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/collaborator-candidates", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    if (!canManageCollaborators(deal, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message:
              "You do not have permission to view collaborator candidates.",
          },
        });
    }
    const candidates = await prisma.user.findMany({
      where: { role: UserRole.SALES_REP },
      select: { id: true, email: true, role: true },
      orderBy: { email: "asc" },
    });
    return res.json({ success: true, data: { candidates } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/collaborators", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    const collaborators = await prisma.dealCollaborator.findMany({
      where: { dealId: deal.id },
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.json({
      success: true,
      data: { collaborators: collaborators.map(({ user }) => user) },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/collaborators", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    if (!canManageCollaborators(deal, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage collaborators.",
          },
        });
    }
    const target = await findUser(req.body?.userId);
    if (!target || target.role !== UserRole.SALES_REP) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_COLLABORATOR",
            message: "Only sales reps can be collaborators.",
          },
        });
    }
    if (target.id === deal.ownerId) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "OWNER_COLLABORATOR",
            message:
              "The deal owner does not need to be added as a collaborator.",
          },
        });
    }

    try {
      await prisma.dealCollaborator.create({
        data: { dealId: deal.id, userId: target.id },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({
            success: false,
            error: {
              code: "DUPLICATE_COLLABORATOR",
              message: "This sales rep is already a collaborator on this deal.",
            },
          });
      }
      throw error;
    }
    return res
      .status(201)
      .json({ success: true, data: { collaborator: target } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/collaborators/:userId", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    if (!canManageCollaborators(deal, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage collaborators.",
          },
        });
    }
    if (!validId(req.params.userId)) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_COLLABORATOR",
            message: "Collaborator id is invalid.",
          },
        });
    }
    const existing = await prisma.dealCollaborator.findUnique({
      where: { dealId_userId: { dealId: deal.id, userId: req.params.userId } },
    });
    if (!existing) {
      return res
        .status(404)
        .json({
          success: false,
          error: {
            code: "COLLABORATOR_NOT_FOUND",
            message: "This sales rep is not a collaborator on this deal.",
          },
        });
    }
    await prisma.dealCollaborator.delete({
      where: { dealId_userId: { dealId: deal.id, userId: req.params.userId } },
    });
    return res.json({
      success: true,
      data: { message: "Collaborator removed." },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    return res.json({ success: true, data: { deal } });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/stage", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }

    const requestedStage = req.body?.stage;
    if (!Object.values(DealStage).includes(requestedStage)) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "INVALID_STAGE",
            message: "A valid deal stage is required.",
          },
        });
    }
    if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "DEAL_CLOSED",
            message:
              "This deal is closed. A manager must reopen it before changing its stage.",
          },
        });
    }

    const nextForwardStages = forwardTransitions[deal.stage] || [];
    const isForward = nextForwardStages.includes(requestedStage);
    const isBackward = backwardTransitions[deal.stage] === requestedStage;
    if (!isForward && !isBackward) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "INVALID_TRANSITION",
            message: "Cannot skip stages. Deals must move one stage at a time.",
          },
        });
    }

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (isBackward && !reason) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "BACKWARD_REASON_REQUIRED",
            message: "A reason is required when moving a deal backward.",
          },
        });
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await persistStageTransition(
        transaction,
        deal,
        requestedStage,
        req.user.id,
        isBackward ? reason : undefined,
      );
      return transaction.deal.findUnique({ where: { id: deal.id }, include });
    });

    return res.json({ success: true, data: { deal: updated } });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/reopen", async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.MANAGER) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only a manager can reopen a closed deal.",
          },
        });
    }
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    if (
      (deal.stage !== DealStage.WON && deal.stage !== DealStage.LOST) ||
      !deal.stageBeforeClose
    ) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "DEAL_NOT_CLOSED",
            message: "Only a closed Won or Lost deal can be reopened.",
          },
        });
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.deal.update({
        where: { id: deal.id },
        data: {
          stage: deal.stageBeforeClose,
          closedAt: null,
          stageBeforeClose: null,
        },
      });
      await transaction.dealEvent.create({
        data: {
          dealId: deal.id,
          actorId: req.user.id,
          type: DealEventType.STAGE_CHANGED,
          oldStage: deal.stage,
          newStage: deal.stageBeforeClose,
        },
      });
      return transaction.deal.findUnique({ where: { id: deal.id }, include });
    });

    return res.json({ success: true, data: { deal: updated } });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }
    if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
      return res
        .status(409)
        .json({
          success: false,
          error: {
            code: "DEAL_CLOSED",
            message:
              "Closed deals cannot be edited. A manager must reopen the deal first.",
          },
        });
    }

    const fields = parseDealFields(req.body);
    if (!fields) {
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Title, exact value, and expected close date are required.",
          },
        });
    }

    let companyId = deal.companyId;
    if (req.body.companyId && req.body.companyId !== deal.companyId) {
      if (!validId(req.body.companyId)) {
        return res
          .status(400)
          .json({
            success: false,
            error: {
              code: "INVALID_COMPANY",
              message: "Company id is invalid.",
            },
          });
      }
      const company = await findAccessibleCompany(req.body.companyId, req.user);
      if (!company) {
        return res
          .status(403)
          .json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have access to the target company.",
            },
          });
      }
      if (company.archivedAt) {
        return res
          .status(409)
          .json({
            success: false,
            error: {
              code: "ARCHIVED_COMPANY",
              message: "Archived companies cannot receive deals.",
            },
          });
      }
      companyId = company.id;
    }

    let ownerId = deal.ownerId;
    if (req.body.ownerId !== undefined) {
      if (req.user.role !== UserRole.MANAGER) {
        return res
          .status(403)
          .json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Only a manager can reassign a deal owner.",
            },
          });
      }
      const owner = await findSalesRep(req.body.ownerId);
      if (!owner) {
        return res
          .status(400)
          .json({
            success: false,
            error: {
              code: "INVALID_OWNER",
              message: "Deal owner must be a sales rep.",
            },
          });
      }
      ownerId = owner.id;
    }

    const updated =
      ownerId !== deal.ownerId
        ? await prisma.$transaction(async (transaction) => {
            const reassigned = await transaction.deal.update({
              where: { id: deal.id },
              data: { ...fields, companyId, ownerId },
              include,
            });
            await transaction.dealEvent.create({
              data: {
                dealId: deal.id,
                actorId: req.user.id,
                type: DealEventType.OWNER_REASSIGNED,
                previousOwnerId: deal.ownerId,
                newOwnerId: ownerId,
              },
            });
            return reassigned;
          })
        : await prisma.deal.update({
            where: { id: deal.id },
            data: { ...fields, companyId, ownerId },
            include,
          });
    return res.json({ success: true, data: { deal: updated } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user);
    if (!deal) {
      return res
        .status(403)
        .json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deal.",
          },
        });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { deletedAt: new Date() },
      include,
    });
    return res.json({ success: true, data: { deal: updated } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
