const stageProbabilities = Object.freeze({
  NEW: 0.10,
  QUALIFIED: 0.25,
  PROPOSAL: 0.50,
  NEGOTIATION: 0.75,
  WON: 1.00,
  LOST: 0.00,
})

const forwardTransitions = Object.freeze({
  NEW: ['QUALIFIED'],
  QUALIFIED: ['PROPOSAL'],
  PROPOSAL: ['NEGOTIATION'],
  NEGOTIATION: ['WON', 'LOST'],
})

const backwardTransitions = Object.freeze({
  QUALIFIED: 'NEW',
  PROPOSAL: 'QUALIFIED',
  NEGOTIATION: 'PROPOSAL',
})

module.exports = { stageProbabilities, forwardTransitions, backwardTransitions }