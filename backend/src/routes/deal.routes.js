const express = require('express')
const { UserRole, DealStage, Prisma } = require('../../../node_modules/@prisma/client')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { forwardTransitions, backwardTransitions } = require('../config/dealLifecycle')

const router = express.Router()
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const decimal = /^\d{1,12}(\.\d{1,2})?$/
const include = {
  company: { select: { id: true, name: true, archivedAt: true } },
  owner: { select: { id: true, email: true, role: true } },
}

function dealAccess(user) {
  return user.role === UserRole.MANAGER
    ? {}
    : { OR: [{ ownerId: user.id }, { collaborators: { some: { userId: user.id } } }] }
}

function validId(value) {
  return typeof value === 'string' && uuid.test(value)
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function parseDealFields(body) {
  const { title, value, expectedCloseDate } = body || {}
  if (
    typeof title !== 'string' || !title.trim() ||
    typeof value !== 'string' || !decimal.test(value) ||
    !validDate(expectedCloseDate)
  ) return null

  return {
    title: title.trim(),
    value: new Prisma.Decimal(value),
    expectedCloseDate: new Date(expectedCloseDate),
  }
}

async function findAccessibleDeal(id, user) {
  if (!validId(id)) return null
  return prisma.deal.findFirst({
    where: { id, deletedAt: null, ...dealAccess(user) },
    include,
  })
}

async function findAccessibleCompany(id, user) {
  if (!validId(id)) return null
  if (user.role === UserRole.MANAGER) {
    return prisma.company.findUnique({ where: { id } })
  }

  return prisma.company.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        { deals: { some: { deletedAt: null, collaborators: { some: { userId: user.id } } } } },
      ],
    },
  })
}

async function findSalesRep(id) {
  if (!validId(id)) return null
  return prisma.user.findFirst({ where: { id, role: UserRole.SALES_REP }, select: { id: true, email: true, role: true } })
}

async function findUser(id) {
  if (!validId(id)) return null
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } })
}

function canManageCollaborators(deal, user) {
  return user.role === UserRole.MANAGER || deal.ownerId === user.id
}

router.use(requireAuth)

router.get('/owners', async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.MANAGER) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Manager access required.' } })
    }
    const owners = await prisma.user.findMany({
      where: { role: UserRole.SALES_REP },
      select: { id: true, email: true, role: true },
      orderBy: { email: 'asc' },
    })
    return res.json({ success: true, data: { owners } })
  } catch (error) {
    return next(error)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const deals = await prisma.deal.findMany({
      where: { deletedAt: null, ...dealAccess(req.user) },
      include,
      orderBy: { updatedAt: 'desc' },
    })
    return res.json({ success: true, data: { deals } })
  } catch (error) {
    return next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const fields = parseDealFields(req.body)
    if (!fields || !validId(req.body?.companyId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid company, title, exact value, and expected close date are required.' } })
    }

    const company = await findAccessibleCompany(req.body.companyId, req.user)
    if (!company) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this company.' } })
    }
    if (company.archivedAt) {
      return res.status(409).json({ success: false, error: { code: 'ARCHIVED_COMPANY', message: 'Archived companies cannot receive new deals.' } })
    }

    const ownerId = req.user.role === UserRole.MANAGER ? req.body.ownerId : req.user.id
    const owner = await findSalesRep(ownerId)
    if (!owner) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_OWNER', message: 'Deal owner must be a sales rep.' } })
    }

    const deal = await prisma.deal.create({
      data: { ...fields, companyId: company.id, ownerId: owner.id, stage: DealStage.NEW },
      include,
    })
    return res.status(201).json({ success: true, data: { deal } })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id/collaborator-candidates', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }
    if (!canManageCollaborators(deal, req.user)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to view collaborator candidates.' } })
    }
    const candidates = await prisma.user.findMany({
      where: { role: UserRole.SALES_REP },
      select: { id: true, email: true, role: true },
      orderBy: { email: 'asc' },
    })
    return res.json({ success: true, data: { candidates } })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id/collaborators', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }
    const collaborators = await prisma.dealCollaborator.findMany({
      where: { dealId: deal.id },
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ success: true, data: { collaborators: collaborators.map(({ user }) => user) } })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/collaborators', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }
    if (!canManageCollaborators(deal, req.user)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage collaborators.' } })
    }
    const target = await findUser(req.body?.userId)
    if (!target || target.role !== UserRole.SALES_REP) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_COLLABORATOR', message: 'Only sales reps can be collaborators.' } })
    }
    if (target.id === deal.ownerId) {
      return res.status(409).json({ success: false, error: { code: 'OWNER_COLLABORATOR', message: 'The deal owner does not need to be added as a collaborator.' } })
    }

    try {
      await prisma.dealCollaborator.create({ data: { dealId: deal.id, userId: target.id } })
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE_COLLABORATOR', message: 'This sales rep is already a collaborator on this deal.' } })
      }
      throw error
    }
    return res.status(201).json({ success: true, data: { collaborator: target } })
  } catch (error) {
    return next(error)
  }
})

router.delete('/:id/collaborators/:userId', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }
    if (!canManageCollaborators(deal, req.user)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage collaborators.' } })
    }
    if (!validId(req.params.userId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_COLLABORATOR', message: 'Collaborator id is invalid.' } })
    }
    const existing = await prisma.dealCollaborator.findUnique({ where: { dealId_userId: { dealId: deal.id, userId: req.params.userId } } })
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'COLLABORATOR_NOT_FOUND', message: 'This sales rep is not a collaborator on this deal.' } })
    }
    await prisma.dealCollaborator.delete({ where: { dealId_userId: { dealId: deal.id, userId: req.params.userId } } })
    return res.json({ success: true, data: { message: 'Collaborator removed.' } })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }
    return res.json({ success: true, data: { deal } })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id/stage', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }

    const requestedStage = req.body?.stage
    if (!Object.values(DealStage).includes(requestedStage)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STAGE', message: 'A valid deal stage is required.' } })
    }
    if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
      return res.status(409).json({ success: false, error: { code: 'DEAL_CLOSED', message: 'This deal is closed. A manager must reopen it before changing its stage.' } })
    }

    const nextForwardStages = forwardTransitions[deal.stage] || []
    const isForward = nextForwardStages.includes(requestedStage)
    const isBackward = backwardTransitions[deal.stage] === requestedStage
    if (!isForward && !isBackward) {
      return res.status(409).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Cannot skip stages. Deals must move one stage at a time.' } })
    }

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    if (isBackward && !reason) {
      return res.status(400).json({ success: false, error: { code: 'BACKWARD_REASON_REQUIRED', message: 'A reason is required when moving a deal backward.' } })
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.deal.update({
        where: { id: deal.id },
        data: {
          stage: requestedStage,
          ...(requestedStage === DealStage.WON || requestedStage === DealStage.LOST
            ? { closedAt: new Date(), stageBeforeClose: deal.stage }
            : {}),
        },
      })
      await transaction.dealEvent.create({
        data: {
          dealId: deal.id,
          actorId: req.user.id,
          type: 'STAGE_CHANGED',
          oldStage: deal.stage,
          newStage: requestedStage,
          backwardReason: isBackward ? reason : undefined,
        },
      })
      return transaction.deal.findUnique({ where: { id: deal.id }, include })
    })

    return res.json({ success: true, data: { deal: updated } })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/reopen', async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.MANAGER) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only a manager can reopen a closed deal.' } })
    }
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }
    if ((deal.stage !== DealStage.WON && deal.stage !== DealStage.LOST) || !deal.stageBeforeClose) {
      return res.status(409).json({ success: false, error: { code: 'DEAL_NOT_CLOSED', message: 'Only a closed Won or Lost deal can be reopened.' } })
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.deal.update({
        where: { id: deal.id },
        data: { stage: deal.stageBeforeClose, closedAt: null, stageBeforeClose: null },
      })
      await transaction.dealEvent.create({
        data: {
          dealId: deal.id,
          actorId: req.user.id,
          type: 'STAGE_CHANGED',
          oldStage: deal.stage,
          newStage: deal.stageBeforeClose,
        },
      })
      return transaction.deal.findUnique({ where: { id: deal.id }, include })
    })

    return res.json({ success: true, data: { deal: updated } })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }

    const fields = parseDealFields(req.body)
    if (!fields) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title, exact value, and expected close date are required.' } })
    }

    let companyId = deal.companyId
    if (req.body.companyId && req.body.companyId !== deal.companyId) {
      if (!validId(req.body.companyId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company id is invalid.' } })
      }
      const company = await findAccessibleCompany(req.body.companyId, req.user)
      if (!company) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to the target company.' } })
      }
      if (company.archivedAt) {
        return res.status(409).json({ success: false, error: { code: 'ARCHIVED_COMPANY', message: 'Archived companies cannot receive deals.' } })
      }
      companyId = company.id
    }

    let ownerId = deal.ownerId
    if (req.body.ownerId !== undefined) {
      if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only a manager can reassign a deal owner.' } })
      }
      const owner = await findSalesRep(req.body.ownerId)
      if (!owner) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_OWNER', message: 'Deal owner must be a sales rep.' } })
      }
      ownerId = owner.id
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { ...fields, companyId, ownerId },
      include,
    })
    return res.json({ success: true, data: { deal: updated } })
  } catch (error) {
    return next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const deal = await findAccessibleDeal(req.params.id, req.user)
    if (!deal) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this deal.' } })
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { deletedAt: new Date() },
      include,
    })
    return res.json({ success: true, data: { deal: updated } })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
