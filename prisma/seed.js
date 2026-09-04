const bcrypt = require('bcrypt')
const { PrismaClient, DealStage, DealEventType, UserRole } = require('@prisma/client')

const prisma = new PrismaClient()
const DEMO_PASSWORD = 'DemoPassword123!'

async function upsertUser(email, role) {
  return prisma.user.upsert({
    where: { email },
    update: { role },
    create: {
      email,
      role,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  })
}

async function findOrCreateCompany(data) {
  const existing = await prisma.company.findFirst({
    where: { name: data.name, ownerId: data.ownerId },
  })

  return existing ?? prisma.company.create({ data })
}

async function findOrCreateDeal(data) {
  const existing = await prisma.deal.findFirst({
    where: { title: data.title, companyId: data.companyId },
  })

  return existing ?? prisma.deal.create({ data })
}

async function createEventIfMissing(data) {
  const existing = await prisma.dealEvent.findFirst({
    where: { dealId: data.dealId, type: data.type, noteBody: data.noteBody ?? undefined },
  })

  if (!existing) {
    await prisma.dealEvent.create({ data })
  }
}

async function main() {
  const manager = await upsertUser('manager@demo.salescrm.test', UserRole.MANAGER)
  const ava = await upsertUser('ava@demo.salescrm.test', UserRole.SALES_REP)
  const ben = await upsertUser('ben@demo.salescrm.test', UserRole.SALES_REP)
  const chloe = await upsertUser('chloe@demo.salescrm.test', UserRole.SALES_REP)

  const northstar = await findOrCreateCompany({
    name: 'Northstar Analytics', industry: 'Analytics', website: 'https://northstar.example', ownerId: ava.id,
  })
  const orbit = await findOrCreateCompany({
    name: 'Orbit Logistics', industry: 'Logistics', website: 'https://orbit.example', ownerId: ben.id,
  })
  const cedar = await findOrCreateCompany({
    name: 'Cedar Health', industry: 'Healthcare', website: 'https://cedar.example', ownerId: chloe.id,
  })
  const archive = await findOrCreateCompany({
    name: 'Archive Works', industry: 'Manufacturing', website: 'https://archiveworks.example', ownerId: ava.id,
  })
  if (!archive.archivedAt) {
    await prisma.company.update({ where: { id: archive.id }, data: { archivedAt: new Date('2026-08-01T00:00:00Z') } })
  }

  const northstarDeal = await findOrCreateDeal({
    companyId: northstar.id, ownerId: ava.id, title: 'Northstar reporting platform', value: '85000.00',
    expectedCloseDate: new Date('2026-10-15'), stage: DealStage.PROPOSAL,
  })
  const orbitDeal = await findOrCreateDeal({
    companyId: orbit.id, ownerId: ben.id, title: 'Orbit fleet workflow', value: '120000.00',
    expectedCloseDate: new Date('2026-09-20'), stage: DealStage.NEGOTIATION,
  })
  const cedarWon = await findOrCreateDeal({
    companyId: cedar.id, ownerId: chloe.id, title: 'Cedar patient intake', value: '64000.00',
    expectedCloseDate: new Date('2026-08-28'), stage: DealStage.WON,
    closedAt: new Date('2026-08-28T15:00:00Z'), stageBeforeClose: DealStage.NEGOTIATION,
  })
  const cedarLost = await findOrCreateDeal({
    companyId: cedar.id, ownerId: chloe.id, title: 'Cedar scheduling expansion', value: '38000.00',
    expectedCloseDate: new Date('2026-08-10'), stage: DealStage.LOST,
    closedAt: new Date('2026-08-10T11:00:00Z'), stageBeforeClose: DealStage.PROPOSAL,
  })
  const overdue = await findOrCreateDeal({
    companyId: northstar.id, ownerId: ava.id, title: 'Northstar data migration', value: '42000.00',
    expectedCloseDate: new Date('2026-08-25'), stage: DealStage.QUALIFIED,
  })

  await prisma.dealCollaborator.upsert({
    where: { dealId_userId: { dealId: northstarDeal.id, userId: ben.id } },
    update: {}, create: { dealId: northstarDeal.id, userId: ben.id },
  })
  await prisma.dealCollaborator.upsert({
    where: { dealId_userId: { dealId: orbitDeal.id, userId: ava.id } },
    update: {}, create: { dealId: orbitDeal.id, userId: ava.id },
  })

  await createEventIfMissing({ dealId: northstarDeal.id, actorId: ava.id, type: DealEventType.DEAL_CREATED })
  await createEventIfMissing({ dealId: northstarDeal.id, actorId: ava.id, type: DealEventType.STAGE_CHANGED, oldStage: DealStage.QUALIFIED, newStage: DealStage.PROPOSAL })
  await createEventIfMissing({ dealId: northstarDeal.id, actorId: ben.id, type: DealEventType.NOTE_ADDED, noteBody: 'Technical discovery completed with the analytics team.' })
  await createEventIfMissing({ dealId: orbitDeal.id, actorId: ben.id, type: DealEventType.DEAL_CREATED })
  await createEventIfMissing({ dealId: orbitDeal.id, actorId: manager.id, type: DealEventType.OWNER_REASSIGNED, previousOwnerId: ava.id, newOwnerId: ben.id })
  await createEventIfMissing({ dealId: cedarWon.id, actorId: chloe.id, type: DealEventType.DEAL_CREATED })
  await createEventIfMissing({ dealId: cedarWon.id, actorId: chloe.id, type: DealEventType.STAGE_CHANGED, oldStage: DealStage.NEGOTIATION, newStage: DealStage.WON })
  await createEventIfMissing({ dealId: cedarLost.id, actorId: chloe.id, type: DealEventType.STAGE_CHANGED, oldStage: DealStage.PROPOSAL, newStage: DealStage.LOST })
  await createEventIfMissing({ dealId: overdue.id, actorId: ava.id, type: DealEventType.DEAL_CREATED })

  console.log('Seeded 1 manager, 3 sales reps, 4 companies, 5 deals, collaborators, and timeline events.')
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
