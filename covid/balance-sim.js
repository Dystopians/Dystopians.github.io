#!/usr/bin/env node
"use strict";

const core = require("./game-core.js");

const DEFAULT_RUNS = 50;
const DEFAULT_SEED = 1000;
const POLICIES = [
  "balanced",
  "balancedNoProjects",
  "hardControl",
  "reopen",
  "financeFirst",
  "trustSacrifice",
  "fatigueFirst",
];

function utility(state) {
  const m = state.metrics;
  const h = state.hidden;
  const r = state.resources;
  return (
    (100 - m.infection) * 1.25
    + (100 - m.hospitalLoad) * 1.25
    + m.supplies * 0.95
    + m.trust * 1.1
    + m.economy * 0.85
    + (100 - m.staffFatigue) * 1.05
    + (100 - h.publicMemory) * 0.45
    + r.funds * 0.35
    + h.detectedRate * 0.2
    - Math.max(0, h.policyStrictness - 65) * 0.35
  );
}

function dangerPenalty(state) {
  const m = state.metrics;
  const h = state.hidden;
  const r = state.resources;
  return (
    Math.max(0, m.infection - 70) * 2
    + Math.max(0, m.hospitalLoad - 75) * 3
    + Math.max(0, 35 - m.supplies) * 2
    + Math.max(0, 40 - m.trust) * 2
    + Math.max(0, 35 - m.economy)
    + Math.max(0, m.staffFatigue - 70) * 2
    + Math.max(0, 25 - r.funds)
    + Math.max(0, h.publicMemory - 45)
  );
}

function cloneState(state) {
  return core.importState(core.exportState(state));
}

function availableMoves(state) {
  const event = core.getCurrentEvent(state);
  const choices = event.choices
    .filter((choice) => choice.available !== false)
    .map((choice) => ({
      kind: "choice",
      id: choice.id,
      strategy: choice.strategyKey || choice.actionKey || "",
    }));
  const operations = core.getAvailableOperations(state)
    .filter((operation) => operation.available)
    .map((operation) => ({
      kind: "operation",
      id: operation.id,
      strategy: operation.id,
    }));
  const resolutions = core.getAvailableResolutions(state)
    .filter((resolution) => resolution.available)
    .map((resolution) => ({
      kind: "resolution",
      id: resolution.id,
      strategy: resolution.id,
    }));
  return [...choices, ...operations, ...resolutions];
}

function applyMove(state, move) {
  if (move.kind === "choice") return core.resolveChoice(state, move.id);
  if (move.kind === "operation") return core.executeOperation(state, move.id);
  return core.executeResolution(state, move.id);
}

function chooseMove(state, policy) {
  const moves = availableMoves(state);
  const prefer = (keys) => moves.find((move) => (
    keys.includes(move.strategy) || keys.includes(move.id)
  ));

  if (policy === "hardControl") {
    return prefer(["hard", "messageControl", "quietClose", "zoningControl", "citywideSilence", "suppressRumorLine"]) || moves[0];
  }
  if (policy === "reopen") {
    return prefer(["reopen", "whiteList", "remoteWorkGovServices", "contactlessServiceRegistry", "microFreightPermit", "livelihoodStaggeredReopen", "closedLoopSmallShift", "lowRiskWorkList", "elasticTransit", "nightFreightWindow", "jobSubsidyAdvance", "rentDeferralCoordination", "enterpriseExemption", "factoryClosedLoop"]) || moves[0];
  }
  if (policy === "financeFirst") {
    return prefer(["fiscalTransparencyLedger", "procurementCreditNegotiation", "specialFundingApplication", "donationCoordination", "budgetReallocationMeeting", "specialBondQuota", "emergencyLevy", "fiscalDebt", "finance", "enterpriseExemption", "jobSubsidyAdvance"]) || moves[0];
  }
  if (policy === "trustSacrifice") {
    return prefer(["messageControl", "delay", "hard", "outsource", "finance", "whiteList", "community", "hardWarehouse", "emergencyLevy", "specialBondQuota", "delayBadNews", "communityAutonomy"]) || moves[0];
  }
  if (policy === "fatigueFirst") {
    return prefer(["rest", "compress", "volunteer", "supportTeam", "community", "mentalHealthLine", "staffRotationOrder", "communityAutonomy"]) || moves[0];
  }

  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const simulation = cloneState(state);
    applyMove(simulation, move);
    let score = utility(simulation) - dangerPenalty(simulation) * 4;
    if (core.getCurrentEvent(state).type !== "buffer" && move.kind !== "choice") score -= 2;
    if (policy === "balancedNoProjects" && move.kind !== "choice") score -= 999;
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

function run(seed, policy) {
  const state = core.createGame({ seed, difficulty: "normal" });
  while (!state.ended && state.day <= core.TOTAL_DAYS) {
    applyMove(state, chooseMove(state, policy));
  }
  return {
    endedDay: state.day,
    ending: state.ending && state.ending.id,
    score: Math.round(state.score || core.calculateScore(state)),
    metrics: state.metrics,
    hidden: state.hidden,
    resources: state.resources,
  };
}

function summarize(results) {
  const avg = (fn) => Number(results.reduce((sum, result) => sum + fn(result), 0) / results.length).toFixed(1);
  const endings = Object.fromEntries([...new Set(results.map((result) => result.ending))]
    .sort()
    .map((ending) => [ending, results.filter((result) => result.ending === ending).length]));
  const passes = results.filter((result) => !String(result.ending).includes("Collapse")).length;
  return {
    passRate: `${passes}/${results.length}`,
    avgScore: avg((result) => result.score),
    avgDay: avg((result) => result.endedDay),
    avgInfection: avg((result) => result.metrics.infection),
    avgHospital: avg((result) => result.metrics.hospitalLoad),
    avgSupplies: avg((result) => result.metrics.supplies),
    avgTrust: avg((result) => result.metrics.trust),
    avgEconomy: avg((result) => result.metrics.economy),
    avgFatigue: avg((result) => result.metrics.staffFatigue),
    avgFunds: avg((result) => result.resources.funds),
    endings,
  };
}

function main() {
  const runs = Number(process.argv[2] || DEFAULT_RUNS);
  const startSeed = Number(process.argv[3] || DEFAULT_SEED);
  const report = {};
  for (const policy of POLICIES) {
    const results = [];
    for (let index = 0; index < runs; index += 1) {
      results.push(run(startSeed + index, policy));
    }
    report[policy] = summarize(results);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
