const {
  DealStage,
  DealEventType,
} = require("../../../node_modules/@prisma/client");
const { forwardTransitions } = require("../config/dealLifecycle");

function nextForwardStage(stage) {
  return forwardTransitions[stage]?.[0] || null;
}

async function persistStageTransition(
  transaction,
  deal,
  newStage,
  actorId,
  backwardReason,
) {
  const oldStage = deal.stage;
  await transaction.deal.update({
    where: { id: deal.id },
    data: {
      stage: newStage,
      ...(newStage === DealStage.WON || newStage === DealStage.LOST
        ? { closedAt: new Date(), stageBeforeClose: oldStage }
        : {}),
    },
  });
  await transaction.dealEvent.create({
    data: {
      dealId: deal.id,
      actorId,
      type: DealEventType.STAGE_CHANGED,
      oldStage,
      newStage,
      backwardReason,
    },
  });
  return { oldStage, newStage };
}

module.exports = { nextForwardStage, persistStageTransition };
