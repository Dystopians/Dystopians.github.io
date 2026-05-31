"use strict";

const fs = require("fs");
const path = require("path");
const core = require("./game-core.js");

const rootDir = __dirname;
const assetsDir = path.join(rootDir, "assets");
const failures = [];
const warnings = [];

const CORE_LIMITED_KEYS = new Set([
  "infection",
  "hospitalLoad",
  "supplies",
  "trust",
  "economy",
  "staffFatigue",
]);

const BANNED_SOURCE_NOTE_PATTERNS = [
  /新闻原型只提供/,
  /具体城市和人物均为虚构/,
  /仅用于模拟经营叙事/,
  /不构成现实治理建议/,
];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function hasOwnValue(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function countChangedKeys(map) {
  return Object.values(map || {}).filter((value) => typeof value === "number" && value !== 0).length;
}

function collectChoiceChangeCount(choice) {
  const immediate = countChangedKeys(choice.resources)
    + countChangedKeys(choice.effects)
    + countChangedKeys(choice.hidden)
    + countChangedKeys(choice.modifiers);
  const delayed = choice.delayed
    ? countChangedKeys(choice.delayed.resources)
      + countChangedKeys(choice.delayed.effects)
      + countChangedKeys(choice.delayed.hidden)
    : 0;
  return immediate + delayed;
}

function collectImmediateDeltas(choice) {
  return {
    ...(choice.resources || {}),
    ...(choice.effects || {}),
    ...(choice.hidden || {}),
  };
}

function assetExists(relativePath) {
  return Boolean(relativePath) && fs.existsSync(path.join(assetsDir, relativePath));
}

function eventImagePath(event) {
  const image = core.getEventImage(event);
  if (!image) return "";
  return image.replace(/^assets\//, "");
}

function validateEventCorpus() {
  const eventIds = new Set();
  const phaseCounts = new Map();

  assert(Array.isArray(core.EVENTS), "EVENTS must be exported as an array.");
  assert(core.EVENTS.length >= 96, `Expected at least 96 corpus events, found ${core.EVENTS.length}.`);

  core.EVENTS.forEach((event) => {
    assert(event.id, "Every event needs a stable id.");
    assert(!eventIds.has(event.id), `Duplicate event id: ${event.id}.`);
    eventIds.add(event.id);

    const phases = Array.isArray(event.phase) ? event.phase : [];
    assert(phases.length > 0, `${event.id} needs at least one phase.`);
    phases.forEach((phase) => {
      phaseCounts.set(phase, (phaseCounts.get(phase) || 0) + 1);
    });

    assert(Boolean(event.title), `${event.id} is missing title.`);
    assert(Boolean(event.description || event.body), `${event.id} is missing long description/body.`);
    assert(Boolean(event.sourceNote), `${event.id} is missing sourceNote.`);
    BANNED_SOURCE_NOTE_PATTERNS.forEach((pattern) => {
      assert(!pattern.test(event.sourceNote || ""), `${event.id} sourceNote contains banned disclaimer text.`);
    });
    assert(Boolean(event.imageKey || event.image), `${event.id} is missing imageKey/image.`);

    const image = eventImagePath(event);
    assert(assetExists(image), `${event.id} image is missing: covid/assets/${image}.`);

    assert(Array.isArray(event.choices), `${event.id} choices must be an array.`);
    assert(event.choices.length === 3, `${event.id} must have exactly 3 choices.`);

    const choiceLabels = new Set();
    event.choices.forEach((choice, index) => {
      const choiceName = `${event.id}.choice${index + 1}`;
      assert(choice.id, `${choiceName} is missing id.`);
      assert(choice.label, `${choiceName} is missing label.`);
      assert(choice.description, `${choiceName} is missing strategy description.`);
      assert(!choiceLabels.has(choice.label), `${event.id} repeats choice label "${choice.label}".`);
      choiceLabels.add(choice.label);

      const tag = choice.routeTag || core.getChoiceRouteTag(choice);
      assert(Boolean(tag && tag.label), `${choiceName} is missing route tag.`);

      const changeCount = collectChoiceChangeCount(choice);
      assert(changeCount >= 3, `${choiceName} changes only ${changeCount} values; expected at least 3.`);

      const deltas = collectImmediateDeltas(choice);
      CORE_LIMITED_KEYS.forEach((key) => {
        if (hasOwnValue(deltas, key)) {
          assert(
            Math.abs(deltas[key]) <= 12,
            `${choiceName} changes ${key} by ${deltas[key]}, exceeding the single-choice core limit.`,
          );
        }
      });
    });
  });

  for (let phase = 1; phase <= 6; phase += 1) {
    assert((phaseCounts.get(phase) || 0) >= 16, `Phase ${phase} has fewer than 16 events.`);
  }

  return { eventIds, phaseCounts };
}

function validateSchedule(eventIds) {
  const scheduledKeys = new Set();
  let lastDay = 0;

  assert(Array.isArray(core.SCHEDULED_EVENTS), "SCHEDULED_EVENTS must be exported as an array.");
  assert(core.SCHEDULED_EVENTS.length > 0, "Expected at least one scheduled event.");

  core.SCHEDULED_EVENTS.forEach((schedule) => {
    const key = `${schedule.day}:${schedule.eventId}`;
    assert(!scheduledKeys.has(key), `Duplicate scheduled event slot: ${key}.`);
    scheduledKeys.add(key);

    assert(Number.isInteger(schedule.day), `${schedule.eventId} scheduled day must be an integer.`);
    assert(schedule.day >= 1 && schedule.day <= core.TOTAL_DAYS, `${schedule.eventId} scheduled day is out of range: ${schedule.day}.`);
    assert(schedule.day >= lastDay, `${schedule.eventId} schedule is out of chronological order.`);
    lastDay = schedule.day;
    assert(eventIds.has(schedule.eventId), `Scheduled event does not exist in EVENTS: ${schedule.eventId}.`);
    assert(schedule.condition, `${schedule.eventId} scheduled item is missing condition.`);
  });

  const dayOne = core.SCHEDULED_EVENTS.find((item) => item.day === 1);
  assert(dayOne && dayOne.eventId === "p1_notice_eight_rumor", "Day 1 must trigger p1_notice_eight_rumor.");

  const liLiang = core.SCHEDULED_EVENTS.find((item) => item.eventId === "p2_li_liang_death");
  assert(liLiang && liLiang.day === 21, "p2_li_liang_death must be fixed on day 21.");
}

function validateMapAndCityActions() {
  const operationIds = new Set(Object.keys(core.OPERATIONS || {}));
  const resolutionIds = new Set(Object.keys(core.RESOLUTIONS || {}));

  assert(assetExists("city-map.png"), "Missing city-map.png.");
  assert(assetExists("tilesheet.png"), "Missing tilesheet.png.");
  assert(assetExists("mascot-dingdong-sprite.png"), "Missing mascot-dingdong-sprite.png.");
  assert(assetExists("mascot-dabai-sprite.png"), "Missing mascot-dabai-sprite.png.");

  assert(Array.isArray(core.MAP_POINTS), "MAP_POINTS must be exported as an array.");
  core.MAP_POINTS.forEach((point) => {
    assert(point.id && point.label, "Each map point needs id and label.");
    assert(Number.isFinite(point.x) && Number.isFinite(point.y), `${point.id} needs numeric x/y coordinates.`);
    assert(assetExists(`highlight-${point.id}.png`), `${point.id} highlight asset is missing.`);

    (point.operations || []).forEach((id) => {
      assert(operationIds.has(id), `${point.id} references missing operation ${id}.`);
    });
    (point.resolutions || []).forEach((id) => {
      assert(resolutionIds.has(id), `${point.id} references missing resolution ${id}.`);
    });
  });

  Object.entries(core.OPERATIONS || {}).forEach(([id, operation]) => {
    assert(operation.label && operation.description, `${id} operation needs label and description.`);
    assert(operation.location, `${id} operation is missing location.`);
    assert(Number.isInteger(operation.maxUses) && operation.maxUses >= 1, `${id} operation needs a positive maxUses.`);
    if (operation.condition) {
      assert(operation.conditionText, `${id} operation has condition but no conditionText.`);
    }
  });

  Object.entries(core.RESOLUTIONS || {}).forEach(([id, resolution]) => {
    assert(resolution.label && resolution.description, `${id} resolution needs label and description.`);
    assert(resolution.once === true, `${id} resolution must be once-per-run.`);
    if (resolution.condition) {
      assert(resolution.conditionText, `${id} resolution has condition but no conditionText.`);
    }
  });
}

function validateNewsAssets() {
  (core.NEWS_POOL || []).forEach((item) => {
    assert(item.id && item.title && item.body, "Every news item needs id/title/body.");
    assert(assetExists(item.image), `${item.id} news image is missing: covid/assets/${item.image}.`);
  });
}

function validateCacheVersions() {
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const scriptVersions = [...indexHtml.matchAll(/\.(?:js|css)\?v=(\d+)/g)].map((match) => match[1]);
  const uniqueScriptVersions = [...new Set(scriptVersions)];
  assert(scriptVersions.length >= 3, "index.html should version stylesheet, game-core.js, and app.js.");
  assert(uniqueScriptVersions.length === 1, `index.html has mismatched cache versions: ${uniqueScriptVersions.join(", ")}.`);

  const assetVersion = appJs.match(/ASSET_VERSION\s*=\s*"v(\d+)"/);
  assert(Boolean(assetVersion), "app.js is missing ASSET_VERSION.");
  if (uniqueScriptVersions.length === 1 && assetVersion) {
    assert(
      assetVersion[1] === uniqueScriptVersions[0],
      `app.js ASSET_VERSION v${assetVersion[1]} does not match index.html v${uniqueScriptVersions[0]}.`,
    );
  }
}

function validateRecoveryLevers() {
  assert(typeof core.getRecoveryLevers === "function", "game-core.js must export getRecoveryLevers.");
  const state = core.createGame({ difficulty: "normal", seed: 20260601 });
  const report = core.getRecoveryLevers(state);
  assert(report && Array.isArray(report.items), "getRecoveryLevers must return an object with items.");
  assert(report.totalCount >= 8, `Expected at least 8 recovery levers, found ${report.totalCount}.`);
  assert(
    report.items.every((item) => item.pointId && item.mode && item.label && item.status && item.impact),
    "Every recovery lever needs pointId, mode, label, status, and impact.",
  );
}

function validateFiscalEconomyChannels() {
  const required = [
    "fastGrantReport",
    "interProvinceSupport",
    "supplierPaymentExtension",
    "contactlessLivelihoodStalls",
    "onlineGovOvertime",
    "communityRepairWhitelist",
  ];
  required.forEach((id) => {
    assert(core.OPERATIONS[id], `Missing fiscal/economy recovery operation: ${id}.`);
  });
  const mappedOperationIds = new Set(core.MAP_POINTS.flatMap((point) => point.operations || []));
  required.forEach((id) => {
    assert(mappedOperationIds.has(id), `Fiscal/economy operation is not reachable from the city map: ${id}.`);
  });
  const state = core.createGame({ difficulty: "normal", seed: 20260607 });
  state.day = 9;
  state.metrics.infection = 44;
  state.metrics.hospitalLoad = 50;
  state.metrics.supplies = 55;
  state.metrics.trust = 58;
  state.metrics.economy = 58;
  state.metrics.staffFatigue = 46;
  state.resources.funds = 48;
  state.hidden.detectedRate = 58;
  const statuses = core.getAvailableOperations(state).filter((item) => required.includes(item.id));
  const available = statuses.filter((item) => item.available);
  assert(statuses.length === required.length, "All new fiscal/economy operations should produce operation statuses.");
  assert(available.length >= 4, `Expected at least 4 early fiscal/economy channels available, found ${available.length}.`);
  const report = core.getRecoveryLevers(state);
  assert(report.totalCount >= 29, `Recovery lever report should recognize expanded fiscal/economy channels, found ${report.totalCount}.`);
}

function validateCityActionOpportunities() {
  assert(typeof core.getCityActionOpportunities === "function", "game-core.js must export getCityActionOpportunities.");
  const state = core.createGame({ difficulty: "normal", seed: 20260604 });
  state.day = 14;
  state.metrics.hospitalLoad = 76;
  state.metrics.supplies = 38;
  state.metrics.staffFatigue = 66;
  state.metrics.economy = 42;
  state.resources.funds = 28;
  state.hidden.detectedRate = 58;
  const report = core.getCityActionOpportunities(state);
  assert(report && Array.isArray(report.items), "getCityActionOpportunities must return an object with items.");
  assert(Number.isInteger(report.availableCount), "Action opportunity report needs availableCount.");
  assert(report.items.length > 0, "Action opportunity report should surface at least one available action in a pressured state.");
  assert(
    report.items.every((item) => item.id && item.pointId && item.mode && item.kind && item.label && item.reason && item.impact && item.status),
    "Every action opportunity needs id, pointId, mode, kind, label, reason, impact, and status.",
  );
  assert(
    report.items.every((item) => item.routeTag && item.routeTag.label),
    "Every action opportunity should expose a routeTag label.",
  );
}

function validateMapSignals() {
  assert(typeof core.getMapSignals === "function", "game-core.js must export getMapSignals.");
  const state = core.createGame({ difficulty: "normal", seed: 20260606 });
  state.metrics.hospitalLoad = 90;
  state.metrics.supplies = 24;
  state.metrics.staffFatigue = 82;
  state.resources.funds = 14;
  const signals = core.getMapSignals(state);
  assert(Array.isArray(signals), "getMapSignals must return an array.");
  assert(signals.length > 0 && signals.length <= 3, "Map signals should surface 1-3 top entries under pressure.");
  assert(
    signals.every((item) => item.id && item.pointId && item.pointLabel && item.label && item.detail && item.tone && item.status),
    "Every map signal needs id, pointId, pointLabel, label, detail, tone, and status.",
  );
}

function validateStageReview() {
  assert(typeof core.getStageReview === "function", "game-core.js must export getStageReview.");
  const state = core.createGame({ difficulty: "normal", seed: 20260605 });
  state.day = 12;
  state.phase = 1;
  state.currentEventId = "buffer_1";
  state.metrics.staffFatigue = 72;
  state.metrics.trust = 42;
  state.hidden.detectedRate = 43;
  const review = core.getStageReview(state);
  assert(review && review.summary && review.detail, "getStageReview must return summary and detail.");
  assert(review.reward && review.reward.label && review.reward.detail, "Stage review should expose momentum reward status.");
  assert(Array.isArray(review.objectives) && review.objectives.length === 3, "Stage review should include current phase objectives.");
  assert(Array.isArray(review.weaknesses), "Stage review should expose weaknesses.");
  assert(review.nextPhase && review.nextPhase.objectives.length > 0, "Stage review should include next phase preparation.");
  const event = core.getCurrentEvent(state);
  assert(event && event.stageReview && event.type === "buffer", "Buffer event should include dynamic stageReview data.");
  assert(event.choices.some((choice) => /托底/.test(choice.label) && choice.effectPreview.length >= 3), "Buffer repair choice should describe its dynamic target.");
  const goodState = core.createGame({ difficulty: "normal", seed: 20260610 });
  goodState.day = 12;
  goodState.phase = 1;
  goodState.currentEventId = "buffer_1";
  goodState.hidden.detectedRate = 60;
  goodState.metrics.trust = 60;
  goodState.metrics.staffFatigue = 30;
  const goodEvent = core.getCurrentEvent(goodState);
  assert(
    goodEvent.choices.some((choice) => choice.id === "claimStageMomentum" && choice.effectPreview.length >= 3),
    "Buffer event should add a momentum reward choice when enough stage objectives are complete.",
  );
}

function validateChoiceRiskPreview() {
  assert(typeof core.getChoiceRiskPreview === "function", "game-core.js must export getChoiceRiskPreview.");
  assert(typeof core.getChoiceFit === "function", "game-core.js must export getChoiceFit.");
  const state = core.createGame({ difficulty: "normal", seed: 20260602 });
  state.metrics.hospitalLoad = 96;
  state.flags.failureStreaks.medical = 1;
  const choice = core.getCurrentEvent(state).choices.find((item) => item.available !== false);
  assert(Boolean(choice), "Expected at least one available opening choice for risk preview validation.");
  const preview = core.getChoiceRiskPreview(state, choice.id);
  assert(Array.isArray(preview), "getChoiceRiskPreview must return an array.");
  assert(preview.some((item) => item.label && item.tone && item.detail), "Choice risk preview should expose label, tone, and detail under redline pressure.");
  const fit = core.getChoiceFit(state, choice.id);
  assert(fit && fit.label && fit.tone && fit.detail, "getChoiceFit should expose label, tone, and detail for event choices.");
}

function validateSettlementBreakdown() {
  const state = core.createGame({ difficulty: "normal", seed: 20260609 });
  const event = core.getCurrentEvent(state);
  const choice = event.choices.find((item) => item.available !== false);
  assert(Boolean(choice), "Expected an available opening choice for settlement breakdown validation.");
  core.resolveChoice(state, choice.id);
  const entry = state.history[0];
  assert(entry && Array.isArray(entry.breakdown), "Resolved choices should write settlement breakdown rows.");
  assert(entry.breakdown.length > 0, "Settlement breakdown should include at least one source row.");
  assert(
    entry.breakdown.every((item) => item.source && item.deltas && Object.keys(item.deltas).length),
    "Every settlement breakdown row needs source and non-empty deltas.",
  );
}

function validateEndingStrategyReview() {
  assert(typeof core.getStrategyProfile === "function", "game-core.js must export getStrategyProfile.");
  const state = core.createGame({ difficulty: "normal", seed: 20260603 });
  state.metrics.hospitalLoad = 88;
  state.metrics.economy = 28;
  state.resources.funds = 16;
  state.history.unshift({
    day: 1,
    phase: 1,
    title: "校验路线",
    choice: "校验选择",
    routeKey: "specialFundingApplication",
    routeLabel: "恢复财政",
    routeTone: "mixed",
    routeSource: "operation",
    notes: [],
    changes: {},
  });
  const review = core.getEndingReview(state);
  assert(review && review.strategyReview, "getEndingReview must include strategyReview.");
  assert(Array.isArray(review.nextPlans), "getEndingReview must include nextPlans.");
  assert(review.nextPlans.length > 0, "Ending review should produce at least one next-run plan.");
  assert(
    review.nextPlans.every((item) => item.route && item.detail && item.examples),
    "Every next-run plan needs route, detail, and examples.",
  );

  const activeState = core.createGame({ difficulty: "normal", seed: 20260608 });
  activeState.currentEventId = "p1_notice_eight_rumor";
  activeState.day = 9;
  activeState.metrics.hospitalLoad = 78;
  activeState.metrics.infection = 68;
  activeState.metrics.staffFatigue = 68;
  activeState.metrics.economy = 48;
  activeState.resources.funds = 38;
  activeState.history.unshift({
    day: 8,
    phase: 1,
    title: "路线偏重校验",
    choice: "路线偏重校验",
    routeKey: "hard",
    routeLabel: "高压止血",
    routeTone: "danger",
    routeSource: "eventChoice",
    notes: [],
    changes: {},
  });
  const profile = core.getStrategyProfile(activeState);
  assert(Array.isArray(profile.recommendations), "Strategy profile should expose recommendations.");
  assert(profile.recommendations.length > 0, "Strategy recommendations should surface route complements under pressure.");
  assert(
    profile.recommendations.every((item) => item.kind && item.label && item.status && item.detail && item.routeLabel),
    "Every strategy recommendation needs kind, label, status, detail, and routeLabel.",
  );
  assert(
    profile.recommendations.every((item) => !String(item.detail).includes("[object Object]")),
    "Strategy recommendation details must render readable forecast text.",
  );
}

function run() {
  const { eventIds, phaseCounts } = validateEventCorpus();
  validateSchedule(eventIds);
  validateMapAndCityActions();
  validateNewsAssets();
  validateCacheVersions();
  validateRecoveryLevers();
  validateFiscalEconomyChannels();
  validateCityActionOpportunities();
  validateMapSignals();
  validateStageReview();
  validateChoiceRiskPreview();
  validateSettlementBreakdown();
  validateEndingStrategyReview();

  const summary = {
    ok: failures.length === 0,
    events: core.EVENTS.length,
    scheduledEvents: core.SCHEDULED_EVENTS.length,
    phases: Object.fromEntries([...phaseCounts.entries()].sort(([a], [b]) => a - b)),
    warnings,
  };

  if (failures.length > 0) {
    console.error("Content check failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  warnings.forEach((message) => console.warn(`Warning: ${message}`));
  console.log(JSON.stringify(summary, null, 2));
}

run();
