#!/usr/bin/env node
"use strict";

const core = require("./game-core.js");

const DEFAULT_RUNS = 50;
const DEFAULT_SEED = 1000;
const BALANCE_TARGETS = {
  balancedPassMin: 45,
  balancedPassMax: 65,
  balancedFatigueMin: 45,
  balancedFatigueMax: 75,
  balancedDistinctEndingMin: 3,
  balancedNonCollapseEndingMin: 2,
  balancedDominantEndingMax: 70,
  balancedMedicalCollapseMax: 45,
  noProjectPassMax: 15,
  singleStrategyPassMax: 10,
};
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
    return prefer(["reopen", "whiteList", "remoteWorkGovServices", "essentialServicePermit", "taxFeeDeferralDesk", "contactlessServiceRegistry", "microFreightPermit", "livelihoodStaggeredReopen", "closedLoopSmallShift", "lowRiskWorkList", "elasticTransit", "nightFreightWindow", "jobSubsidyAdvance", "rentDeferralCoordination", "enterpriseExemption", "factoryClosedLoop"]) || moves[0];
  }
  if (policy === "financeFirst") {
    return prefer(["fiscalTransparencyLedger", "emergencyAccountClearing", "procurementCreditNegotiation", "specialFundingApplication", "donationCoordination", "budgetReallocationMeeting", "specialBondQuota", "emergencyLevy", "fiscalDebt", "finance", "enterpriseExemption", "jobSubsidyAdvance", "taxFeeDeferralDesk"]) || moves[0];
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
  const average = (fn) => results.reduce((sum, result) => sum + fn(result), 0) / results.length;
  const avg = (fn) => Number(average(fn)).toFixed(1);
  const endings = Object.fromEntries([...new Set(results.map((result) => result.ending))]
    .sort()
    .map((ending) => [ending, results.filter((result) => result.ending === ending).length]));
  const passes = results.filter((result) => !String(result.ending).includes("Collapse")).length;
  const endingCounts = Object.values(endings);
  const dominantEndingCount = endingCounts.length ? Math.max(...endingCounts) : 0;
  const dominantEnding = Object.entries(endings).find(([, count]) => count === dominantEndingCount)?.[0] || "";
  const nonCollapseEndings = Object.keys(endings).filter((ending) => !String(ending).includes("Collapse"));
  return {
    passRate: `${passes}/${results.length}`,
    passPct: Number((passes / results.length * 100).toFixed(1)),
    avgScore: avg((result) => result.score),
    avgDay: avg((result) => result.endedDay),
    avgInfection: avg((result) => result.metrics.infection),
    avgHospital: avg((result) => result.metrics.hospitalLoad),
    avgSupplies: avg((result) => result.metrics.supplies),
    avgTrust: avg((result) => result.metrics.trust),
    avgEconomy: avg((result) => result.metrics.economy),
    avgFatigue: avg((result) => result.metrics.staffFatigue),
    avgFunds: avg((result) => result.resources.funds),
    distinctEndings: Object.keys(endings).length,
    nonCollapseEndings: nonCollapseEndings.length,
    dominantEnding,
    dominantEndingPct: Number((dominantEndingCount / results.length * 100).toFixed(1)),
    medicalCollapsePct: Number(((endings.medicalCollapse || 0) / results.length * 100).toFixed(1)),
    endings,
  };
}

function parseArgs(argv) {
  const options = {
    check: false,
    runs: DEFAULT_RUNS,
    startSeed: DEFAULT_SEED,
  };
  const positional = [];
  argv.forEach((arg) => {
    if (arg === "--check") {
      options.check = true;
      return;
    }
    if (arg.startsWith("--runs=")) {
      options.runs = Number(arg.slice("--runs=".length));
      return;
    }
    if (arg.startsWith("--seed=")) {
      options.startSeed = Number(arg.slice("--seed=".length));
      return;
    }
    positional.push(arg);
  });
  if (positional[0]) options.runs = Number(positional[0]);
  if (positional[1]) options.startSeed = Number(positional[1]);
  if (!Number.isFinite(options.runs) || options.runs <= 0) options.runs = DEFAULT_RUNS;
  if (!Number.isFinite(options.startSeed)) options.startSeed = DEFAULT_SEED;
  options.runs = Math.floor(options.runs);
  options.startSeed = Math.floor(options.startSeed);
  return options;
}

function buildReport(runs, startSeed) {
  const report = {};
  for (const policy of POLICIES) {
    const results = [];
    for (let index = 0; index < runs; index += 1) {
      results.push(run(startSeed + index, policy));
    }
    report[policy] = summarize(results);
  }
  return report;
}

function validateBalanceTargets(report) {
  const failures = [];
  const balanced = report.balanced || {};
  const noProjects = report.balancedNoProjects || {};
  const singlePolicies = ["hardControl", "reopen", "financeFirst", "trustSacrifice", "fatigueFirst"];
  const within = (value, min, max) => Number(value) >= min && Number(value) <= max;

  if (!within(balanced.passPct, BALANCE_TARGETS.balancedPassMin, BALANCE_TARGETS.balancedPassMax)) {
    failures.push(`balanced passPct ${balanced.passPct}% should stay ${BALANCE_TARGETS.balancedPassMin}-${BALANCE_TARGETS.balancedPassMax}%.`);
  }
  if (!within(balanced.avgFatigue, BALANCE_TARGETS.balancedFatigueMin, BALANCE_TARGETS.balancedFatigueMax)) {
    failures.push(`balanced avgFatigue ${balanced.avgFatigue} should stay ${BALANCE_TARGETS.balancedFatigueMin}-${BALANCE_TARGETS.balancedFatigueMax}.`);
  }
  if (Number(balanced.distinctEndings) < BALANCE_TARGETS.balancedDistinctEndingMin) {
    failures.push(`balanced distinctEndings ${balanced.distinctEndings} should stay >= ${BALANCE_TARGETS.balancedDistinctEndingMin}.`);
  }
  if (Number(balanced.nonCollapseEndings) < BALANCE_TARGETS.balancedNonCollapseEndingMin) {
    failures.push(`balanced nonCollapseEndings ${balanced.nonCollapseEndings} should stay >= ${BALANCE_TARGETS.balancedNonCollapseEndingMin}.`);
  }
  if (Number(balanced.dominantEndingPct) > BALANCE_TARGETS.balancedDominantEndingMax) {
    failures.push(`balanced dominantEnding ${balanced.dominantEnding || "unknown"} at ${balanced.dominantEndingPct}% should stay <= ${BALANCE_TARGETS.balancedDominantEndingMax}%.`);
  }
  if (Number(balanced.medicalCollapsePct) > BALANCE_TARGETS.balancedMedicalCollapseMax) {
    failures.push(`balanced medicalCollapsePct ${balanced.medicalCollapsePct}% should stay <= ${BALANCE_TARGETS.balancedMedicalCollapseMax}%.`);
  }
  if (Number(noProjects.passPct) > BALANCE_TARGETS.noProjectPassMax) {
    failures.push(`balancedNoProjects passPct ${noProjects.passPct}% should stay <= ${BALANCE_TARGETS.noProjectPassMax}%.`);
  }
  singlePolicies.forEach((policy) => {
    const result = report[policy] || {};
    if (Number(result.passPct) > BALANCE_TARGETS.singleStrategyPassMax) {
      failures.push(`${policy} passPct ${result.passPct}% should stay <= ${BALANCE_TARGETS.singleStrategyPassMax}%.`);
    }
  });
  return {
    ok: failures.length === 0,
    failures,
    targets: BALANCE_TARGETS,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options.runs, options.startSeed);
  const validation = validateBalanceTargets(report);
  report._meta = {
    runs: options.runs,
    startSeed: options.startSeed,
    check: options.check,
    validation,
  };
  console.log(JSON.stringify(report, null, 2));
  if (options.check && !validation.ok) {
    process.exitCode = 1;
  }
}

main();
