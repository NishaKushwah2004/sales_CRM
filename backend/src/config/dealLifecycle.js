const stageProbabilities = Object.freeze({
  NEW: 0.1,
  QUALIFIED: 0.25,
  PROPOSAL: 0.5,
  NEGOTIATION: 0.75,
  WON: 1.0,
  LOST: 0.0,
});

const forwardTransitions = Object.freeze({
  NEW: ["QUALIFIED"],
  QUALIFIED: ["PROPOSAL"],
  PROPOSAL: ["NEGOTIATION"],
  NEGOTIATION: ["WON", "LOST"],
});

const backwardTransitions = Object.freeze({
  QUALIFIED: "NEW",
  PROPOSAL: "QUALIFIED",
  NEGOTIATION: "PROPOSAL",
});

module.exports = {
  stageProbabilities,
  forwardTransitions,
  backwardTransitions,
};
