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
  const eventImages = new Map();
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
    assert(image.startsWith("events/"), `${event.id} must use a dedicated event image, found ${image}.`);
    assert(assetExists(image), `${event.id} image is missing: covid/assets/${image}.`);
    if (!eventImages.has(image)) eventImages.set(image, []);
    eventImages.get(image).push(event.id);

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

  eventImages.forEach((ids, image) => {
    assert(ids.length === 1, `Dedicated event image is reused by multiple events: ${image} -> ${ids.join(", ")}.`);
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

  [
    "p4_online_consultation_open",
    "p6_recovery_grant_window",
  ].forEach((eventId) => {
    assert(core.SCHEDULED_EVENTS.some((item) => item.eventId === eventId), `Positive support event should have a fixed window: ${eventId}.`);
  });

  const scheduleState = core.createGame({ difficulty: "normal", seed: 20260621 });
  scheduleState.day = 41;
  scheduleState.phase = core.phaseForDay(scheduleState.day);
  const stageSchedule = core.getStageSchedule(scheduleState);
  assert(
    stageSchedule.every((item) => item.conditionLabel && item.conditionDetail && item.conditionTone),
    "Every stage schedule item should expose readable condition hints.",
  );
  const onlineConsult = stageSchedule.find((item) => item.id === "p4_online_consultation_open");
  assert(
    onlineConsult && /线上分流/.test(onlineConsult.conditionLabel) && !String(onlineConsult.conditionDetail).includes("[object Object]"),
    "Online consultation fixed window should explain its trigger condition.",
  );
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
  assert(
    (core.OPERATIONS.volunteerDispatch.delayed.effects.staffFatigue || 0) <= -5,
    "Volunteer dispatch should be a meaningful delayed fatigue-relief project.",
  );

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
  assert(
    appJs.includes("delayedEffectText") && /delayedEffectText\(delayed\)/.test(appJs),
    "Action delayed chips should include readable delayed effect values.",
  );
  if (uniqueScriptVersions.length === 1 && assetVersion) {
    assert(
      assetVersion[1] === uniqueScriptVersions[0],
      `app.js ASSET_VERSION v${assetVersion[1]} does not match index.html v${uniqueScriptVersions[0]}.`,
    );
  }
}

function validateScenarios() {
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  assert(core.SCENARIOS && typeof core.SCENARIOS === "object", "game-core.js must export SCENARIOS.");
  assert(typeof core.getScenarioBriefing === "function", "game-core.js must export getScenarioBriefing.");
  const scenarioIds = Object.keys(core.SCENARIOS || {});
  assert(scenarioIds.length >= 5, `Expected at least 5 starting scenarios, found ${scenarioIds.length}.`);
  assert(indexHtml.includes('name="scenario"'), "index.html must expose starting scenario radio options.");
  assert(indexHtml.includes("scenarioBrief"), "index.html must expose the scenario briefing container.");
  scenarioIds.forEach((id) => {
    const scenario = core.SCENARIOS[id];
    assert(scenario.label && scenario.summary, `${id} scenario needs label and summary.`);
    assert(scenario.adjustments && typeof scenario.adjustments === "object", `${id} scenario needs adjustments object.`);
    assert(Array.isArray(scenario.priorities) && scenario.priorities.length >= 2, `${id} scenario needs at least two early priorities.`);
    assert(indexHtml.includes(`value="${id}"`), `${id} scenario is not selectable on the start screen.`);
  });
  const standard = core.createGame({ difficulty: "normal", scenario: "standard", seed: 20260613 });
  assert(standard.scenario === "standard", "Standard scenario should be recorded on state.");
  assert(standard.metrics.infection === 22 && standard.resources.funds === 68, "Standard scenario should preserve normal default opening values.");
  const medical = core.createGame({ difficulty: "normal", scenario: "medicalFront", seed: 20260613 });
  assert(medical.metrics.hospitalLoad > standard.metrics.hospitalLoad, "medicalFront should raise hospital load.");
  assert(medical.metrics.staffFatigue > standard.metrics.staffFatigue, "medicalFront should raise staff fatigue.");
  const supply = core.createGame({ difficulty: "normal", scenario: "supplyStress", seed: 20260613 });
  assert(supply.metrics.supplies < standard.metrics.supplies, "supplyStress should lower opening supplies.");
  const fiscal = core.createGame({ difficulty: "normal", scenario: "fiscalSqueeze", seed: 20260613 });
  assert(fiscal.resources.funds < standard.resources.funds, "fiscalSqueeze should lower opening funds.");
  const blind = core.createGame({ difficulty: "normal", scenario: "informationBlind", seed: 20260613 });
  assert(blind.hidden.detectedRate < standard.hidden.detectedRate, "informationBlind should lower opening detectedRate.");
  const imported = core.importState(core.exportState(blind));
  assert(imported.scenario === "informationBlind", "Scenario id should survive export/import.");
  const blindBrief = core.getScenarioBriefing({ difficulty: "normal", scenario: "informationBlind" });
  assert(blindBrief.label === core.SCENARIOS.informationBlind.label, "Scenario briefing should expose the selected label.");
  assert(blindBrief.changes.detectedRate === -12, "Scenario briefing should expose detectedRate delta for informationBlind.");
  assert(Array.isArray(blindBrief.readouts) && blindBrief.readouts.length >= 8, "Scenario briefing should include opening readouts.");
  assert(Array.isArray(blindBrief.priorities) && blindBrief.priorities.length >= 2, "Scenario briefing should include early priorities.");
  const hardFiscalBrief = core.getScenarioBriefing({ difficulty: "hard", scenario: "fiscalSqueeze" });
  assert(hardFiscalBrief.difficultyLabel === core.DIFFICULTIES.hard.label, "Scenario briefing should respect selected difficulty.");
  assert(hardFiscalBrief.changes.funds === -16, "Scenario deltas should be relative to the selected difficulty baseline.");
}

function validateTutorialCopy() {
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  [
    "推荐顺序",
    "今日调度目标",
    "对准目标",
    "明日可排",
    "财政与活力面板",
    "治理路线",
  ].forEach((text) => {
    assert(indexHtml.includes(text), `Tutorial copy should explain "${text}".`);
  });
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

function validateFiscalOutlook() {
  assert(typeof core.getFiscalOutlook === "function", "game-core.js must export getFiscalOutlook.");
  const state = core.createGame({ difficulty: "normal", seed: 20260619 });
  const opening = core.getFiscalOutlook(state);
  assert(opening && Array.isArray(opening.items), "getFiscalOutlook must return an object with items.");
  assert(opening.items.length === 3, "Fiscal outlook should expose funds, economy, and locked-action readouts.");
  assert(
    opening.items.every((item) => item.id && item.label && item.value !== undefined && item.detail && item.tone),
    "Every fiscal outlook item needs id, label, value, detail, and tone.",
  );
  assert(
    opening.items.every((item) => Array.isArray(item.components)),
    "Every fiscal outlook item should expose component rows for readable formula breakdowns.",
  );
  assert(
    opening.items.every((item) => !String(item.detail).includes("[object Object]")),
    "Fiscal outlook details must be readable text.",
  );
  const pressured = core.createGame({ difficulty: "normal", seed: 20260620 });
  pressured.metrics.economy = 20;
  pressured.metrics.hospitalLoad = 88;
  pressured.metrics.trust = 22;
  pressured.hidden.policyStrictness = 82;
  pressured.resources.funds = 9;
  const report = core.getFiscalOutlook(pressured);
  assert(report.tone === "danger", "Fiscal outlook should flag severe cashflow states as danger.");
  assert(report.items.some((item) => item.id === "locks"), "Fiscal outlook should include funding lock count.");

  const assetState = core.createGame({ difficulty: "normal", seed: 20260621 });
  assetState.flags.operationUses.fiscalTransparencyLedger = 1;
  assetState.flags.operationUses.emergencyGapLedger = 1;
  assetState.metrics.trust = 62;
  assetState.resources.funds = 42;
  const assetReport = core.getFiscalOutlook(assetState);
  assert(Array.isArray(assetReport.activeAssets), "Fiscal outlook should expose active fiscal assets.");
  assert(assetReport.activeAssets.length >= 2, "Fiscal outlook should surface active recovery assets after setup actions.");
}

function validateCityBadges() {
  assert(typeof core.getCityBadges === "function", "game-core.js must export getCityBadges.");
  const state = core.createGame({ difficulty: "normal", seed: 20260617 });
  const opening = core.getCityBadges(state);
  assert(opening && Array.isArray(opening.earned) && Array.isArray(opening.watch), "getCityBadges must return earned and watch arrays.");
  assert(opening.total >= 8, `Expected at least 8 city badge rules, found ${opening.total}.`);
  const developed = core.createGame({ difficulty: "normal", seed: 20260618 });
  developed.day = 40;
  developed.metrics.infection = 28;
  developed.metrics.hospitalLoad = 42;
  developed.metrics.supplies = 80;
  developed.metrics.trust = 78;
  developed.metrics.economy = 62;
  developed.metrics.staffFatigue = 34;
  developed.resources.funds = 46;
  developed.hidden.detectedRate = 76;
  developed.hidden.publicMemory = 12;
  developed.completedProjects.healthCode = true;
  developed.completedProjects.supplyCorridor = true;
  developed.completedProjects.triageNetwork = true;
  developed.flags.operationUses = {
    campusSentinel: 1,
    donationCoordination: 1,
    microFreightPermit: 1,
  };
  developed.flags.resolutions.publicReviewBrief = true;
  developed.history.unshift(
    { routeLabel: "公开修复", routeKey: "open", routeTone: "good", routeSource: "eventChoice" },
    { routeLabel: "恢复财政", routeKey: "fastGrantReport", routeTone: "mixed", routeSource: "operation" },
    { routeLabel: "民生保供", routeKey: "supply", routeTone: "good", routeSource: "eventChoice" },
    { routeLabel: "医疗优先", routeKey: "triage", routeTone: "good", routeSource: "eventChoice" },
    { routeLabel: "基层减压", routeKey: "volunteer", routeTone: "good", routeSource: "eventChoice" },
    { routeLabel: "监测治理", routeKey: "testing", routeTone: "info", routeSource: "eventChoice" },
  );
  const report = core.getCityBadges(developed);
  assert(report.earned.length >= 6, `Developed state should earn several city badges, found ${report.earned.length}.`);
  assert(
    [...report.earned, ...report.watch].every((item) => item.id && item.label && item.category && item.detail && item.status && item.tone),
    "Every city badge needs id, label, category, detail, status, and tone.",
  );
}

function validateFiscalEconomyChannels() {
  const required = [
    "emergencyGapLedger",
    "fastGrantReport",
    "donationClaimList",
    "platformLogisticsShare",
    "interProvinceSupport",
    "supplierPaymentExtension",
    "contactlessLivelihoodStalls",
    "neighborhoodPickupWindow",
    "onlineGovOvertime",
    "remoteApprovalDesk",
    "essentialMaintenanceRoster",
    "communityRepairWhitelist",
  ];
  const requiredResolutions = [
    "mutualAidFund",
    "temporaryTurnoverPool",
    "lowContactBusinessPermit",
    "supplyOrderPrepaySwap",
    "deferProjectPayment",
  ];
  required.forEach((id) => {
    assert(core.OPERATIONS[id], `Missing fiscal/economy recovery operation: ${id}.`);
  });
  requiredResolutions.forEach((id) => {
    assert(core.RESOLUTIONS[id], `Missing fiscal/economy recovery resolution: ${id}.`);
    assert(core.RESOLUTIONS[id].once === true, `Fiscal/economy recovery resolution should be one-time: ${id}.`);
  });
  const mappedOperationIds = new Set(core.MAP_POINTS.flatMap((point) => point.operations || []));
  required.forEach((id) => {
    assert(mappedOperationIds.has(id), `Fiscal/economy operation is not reachable from the city map: ${id}.`);
  });
  const mappedResolutionIds = new Set(core.MAP_POINTS.flatMap((point) => point.resolutions || []));
  requiredResolutions.forEach((id) => {
    assert(mappedResolutionIds.has(id), `Fiscal/economy resolution is not reachable from the city map: ${id}.`);
  });
  const opening = core.createGame({ difficulty: "normal", seed: 20260608 });
  const openingReport = core.getRecoveryLevers(opening);
  const openingAvailable = openingReport.items.filter((item) => item.bucket === "available");
  assert(openingAvailable.length >= 3, `Normal opening should expose at least 3 fiscal/economy recovery choices, found ${openingAvailable.length}.`);
  assert(
    openingAvailable.some((item) => /资金/.test(item.impact)) && openingAvailable.some((item) => /活力/.test(item.impact)),
    "Normal opening recovery choices should include both fiscal and vitality routes.",
  );
  const state = core.createGame({ difficulty: "normal", seed: 20260607 });
  state.day = 9;
  state.metrics.infection = 44;
  state.metrics.hospitalLoad = 50;
  state.metrics.supplies = 55;
  state.metrics.trust = 58;
  state.metrics.economy = 58;
  state.metrics.staffFatigue = 46;
  state.resources.funds = 44;
  state.hidden.detectedRate = 58;
  const statuses = core.getAvailableOperations(state).filter((item) => required.includes(item.id));
  const available = statuses.filter((item) => item.available);
  const resolutionStatuses = core.getAvailableResolutions(state).filter((item) => requiredResolutions.includes(item.id));
  const availableResolutions = resolutionStatuses.filter((item) => item.available);
  assert(statuses.length === required.length, "All new fiscal/economy operations should produce operation statuses.");
  assert(available.length >= 4, `Expected at least 4 early fiscal/economy channels available, found ${available.length}.`);
  assert(resolutionStatuses.length === requiredResolutions.length, "All fiscal/economy recovery resolutions should produce resolution statuses.");
  assert(availableResolutions.length >= 4, `Expected at least 4 early fiscal/economy recovery resolutions available, found ${availableResolutions.length}.`);
  const report = core.getRecoveryLevers(state);
  assert(report.totalCount >= 40, `Recovery lever report should recognize expanded fiscal/economy channels, found ${report.totalCount}.`);
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
  assert(
    report.items.every((item) => item.available === true),
    "Available action opportunities should expose available=true for UI badges.",
  );

  const fullBudget = core.createGame({ difficulty: "normal", seed: 20260605 });
  fullBudget.flags.cityActionsToday = core.getCityActionBudget(fullBudget).limit;
  fullBudget.metrics.hospitalLoad = 76;
  fullBudget.metrics.supplies = 42;
  fullBudget.metrics.staffFatigue = 66;
  fullBudget.resources.funds = 40;
  const fullReport = core.getCityActionOpportunities(fullBudget);
  assert(Array.isArray(fullReport.nextDayItems), "Action opportunity report should expose nextDayItems.");
  assert(fullReport.nextDayItems.length > 0, "Full city action budget should expose tomorrow's queue.");
  assert(
    fullReport.nextDayItems.every((item) => item.lockedReason === "今日调度已满" && item.status === "明日可排"),
    "Tomorrow queue should only contain actions locked by today's city action budget.",
  );
  assert(
    (fullReport.lockedItems || []).every((item) => item.lockedReason !== "今日调度已满"),
    "Condition/funding locked preview should not mix in tomorrow-queue actions.",
  );
}

function validateCityActionUndo() {
  assert(typeof core.getCityActionUndo === "function", "game-core.js must export getCityActionUndo.");
  assert(typeof core.undoCityAction === "function", "game-core.js must export undoCityAction.");
  const state = core.createGame({ difficulty: "normal", seed: 20260615 });
  const before = core.exportState(state);
  core.executeOperation(state, "campusSentinel");
  const undo = core.getCityActionUndo(state);
  assert(undo && undo.label === core.OPERATIONS.campusSentinel.label, "Executed city actions should expose an undo record.");
  assert(state.flags.cityActionsToday === 1, "Executing a city action should consume today's city action budget.");
  assert(state.history.length === 1, "Executing a city action should add one history row before undo.");
  const imported = core.importState(core.exportState(state));
  assert(core.getCityActionUndo(imported), "City action undo should survive save/import before the daily event is resolved.");
  const undone = core.undoCityAction(state);
  assert(undone === true, "undoCityAction should report success when an undo record is available.");
  assert(state.day === before.day && state.currentEventId === before.currentEventId, "Undo should restore the same day and event.");
  assert(state.resources.funds === before.resources.funds, "Undo should restore resources.");
  assert(state.metrics.staffFatigue === before.metrics.staffFatigue, "Undo should restore metrics.");
  assert((state.flags.operationUses.campusSentinel || 0) === 0, "Undo should remove operation use counts.");
  assert(state.flags.cityActionsToday === 0, "Undo should restore today's city action budget.");
  assert(!core.getCityActionUndo(state), "Undo record should clear after a successful undo.");

  const afterChoice = core.createGame({ difficulty: "normal", seed: 20260616 });
  core.executeOperation(afterChoice, "campusSentinel");
  const event = core.getCurrentEvent(afterChoice);
  const choice = event.choices.find((item) => item.available !== false);
  core.resolveChoice(afterChoice, choice.id);
  assert(!core.getCityActionUndo(afterChoice), "Resolving today's event should clear city action undo.");
}

function validateMapSignals() {
  assert(typeof core.getMapSignals === "function", "game-core.js must export getMapSignals.");
  assert(typeof core.getMapPointStatus === "function", "game-core.js must export getMapPointStatus.");
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
  assert(core.getMapPointStatus(state, "hospital").tone === "danger", "Hospital map status should reflect a medical redline.");
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  assert(appJs.includes("status-${pointStatus.tone}"), "Map hotspots should receive status tone classes.");
  ["status-danger", "status-warn", "status-good"].forEach((className) => {
    assert(styles.includes(`.map-hotspot.${className}::before`), `Missing map pressure halo style for ${className}.`);
  });
}

function validateStageReview() {
  assert(typeof core.getStageReview === "function", "game-core.js must export getStageReview.");
  assert(typeof core.getStageTransitionBrief === "function", "game-core.js must export getStageTransitionBrief.");
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
  const transition = core.getStageTransitionBrief(core.createGame({ difficulty: "normal", seed: 20260622 }));
  assert(transition && transition.title && transition.pressureLabel && transition.objectiveText, "Stage transition brief should expose title, pressure label, and objectives on phase entry.");
  const midStage = core.createGame({ difficulty: "normal", seed: 20260623 });
  midStage.day = 15;
  midStage.phase = core.phaseForDay(midStage.day);
  assert(core.getStageTransitionBrief(midStage) === null, "Stage transition brief should not stay visible deep into a phase.");
}

function validateChoiceRiskPreview() {
  assert(typeof core.getChoiceRiskPreview === "function", "game-core.js must export getChoiceRiskPreview.");
  assert(typeof core.getChoiceFit === "function", "game-core.js must export getChoiceFit.");
  assert(typeof core.getChoiceComparison === "function", "game-core.js must export getChoiceComparison.");
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
  const comparison = core.getChoiceComparison(state);
  assert(comparison && Array.isArray(comparison.items), "getChoiceComparison should return a comparison item list.");
  assert(comparison.items.length === core.getCurrentEvent(state).choices.length, "Choice comparison should include every current event choice.");
  assert(
    comparison.items.every((item) => item.choiceId && item.choiceLabel && item.routeLabel && item.label && item.detail && item.tone),
    "Every choice comparison item needs choiceId, choiceLabel, routeLabel, label, detail, and tone.",
  );
  assert(
    comparison.items.filter((item) => item.available).some((item) => item.rank === 1),
    "Choice comparison should rank available choices.",
  );
}

function validateDailyDirective() {
  assert(typeof core.getDailyDirective === "function", "game-core.js must export getDailyDirective.");
  assert(typeof core.getDailyDirectiveOptions === "function", "game-core.js must export getDailyDirectiveOptions.");
  assert(typeof core.getChoiceDirectiveFit === "function", "game-core.js must export getChoiceDirectiveFit.");
  assert(typeof core.getCityActionDirectiveFit === "function", "game-core.js must export getCityActionDirectiveFit.");
  const state = core.createGame({ difficulty: "normal", seed: 20260614 });
  const directive = core.getDailyDirective(state);
  assert(directive && directive.label && directive.detail, "getDailyDirective should return a readable daily target.");
  assert(directive.metric && directive.targetText && directive.status, "Daily directive needs metric, targetText, and status.");
  const options = core.getDailyDirectiveOptions(state);
  assert(options && Array.isArray(options.items), "getDailyDirectiveOptions should return an item list.");
  assert(options.items.length > 0, "Opening daily directive should expose at least one target-aligned option.");
  assert(
    options.items.every((item) => item.id && item.kind && item.label && item.status && item.detail && item.tone),
    "Every daily directive option needs id, kind, label, status, detail, and tone.",
  );
  assert(
    options.items.every((item) => item.choiceId || (item.pointId && item.mode && item.actionId)),
    "Daily directive options should link to either an event choice or a city action.",
  );
  const event = core.getCurrentEvent(state);
  const choice = event.choices.find((item) => item.available !== false);
  assert(Boolean(choice), "Expected an available opening choice for daily directive validation.");
  const fit = core.getChoiceDirectiveFit(state, choice.id);
  assert(fit && fit.label && fit.tone && fit.detail, "Choice directive fit should describe how a choice affects today's target.");
  const pressured = core.createGame({ difficulty: "normal", seed: 20260615 });
  pressured.metrics.hospitalLoad = 88;
  const pressureDirective = core.getDailyDirective(pressured);
  assert(pressureDirective.metric === "hospitalLoad", "Hospital redline should become the daily directive under medical pressure.");
  assert(pressureDirective.tone === "danger", "Redline daily directive should use danger tone.");
  const healthCodeFit = core.getCityActionDirectiveFit(state, "operations", "deployHealthCode");
  assert(healthCodeFit && healthCodeFit.tone === "good", "Health code operation should advance the opening detectedRate directive.");
  assert(/主动行动即时生效/.test(healthCodeFit.detail), "City action directive fit should clarify that actions do not advance the day.");
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
  assert(typeof core.getSettlementHighlights === "function", "game-core.js must export getSettlementHighlights.");
  assert(typeof core.getHistoryEntryMeta === "function", "game-core.js must export getHistoryEntryMeta.");
  const highlights = core.getSettlementHighlights(entry);
  assert(Array.isArray(highlights), "Settlement highlights should return an array.");
  assert(highlights.length > 0, "Settlement highlights should include at least one readable battle-report item.");
  assert(
    highlights.every((item) => item.id && item.label && item.detail && item.tone),
    "Every settlement highlight needs id, label, detail, and tone.",
  );
  assert(
    highlights.every((item) => !String(item.detail).includes("[object Object]")),
    "Settlement highlight details must render readable text.",
  );
  const eventMeta = core.getHistoryEntryMeta(entry);
  assert(eventMeta && eventMeta.label === "最新结算" && eventMeta.status === "日期推进", "Event history should be labeled as daily settlement.");
  const actionState = core.createGame({ difficulty: "normal", seed: 20260622 });
  core.executeOperation(actionState, "campusSentinel");
  const actionMeta = core.getHistoryEntryMeta(actionState.history[0]);
  assert(actionMeta.label === "最新行动" && actionMeta.sourceLabel === "工程", "Operation history should be labeled as an immediate action.");
  assert(/不会因此推进/.test(actionMeta.detail), "Immediate action meta should clarify that the date does not advance.");
}

function validateMetricTrends() {
  assert(typeof core.getMetricTrend === "function", "game-core.js must export getMetricTrend.");
  const state = core.createGame({ difficulty: "normal", seed: 20260611 });
  const event = core.getCurrentEvent(state);
  const choice = event.choices.find((item) => item.available !== false);
  assert(Boolean(choice), "Expected an available opening choice for metric trend validation.");
  core.resolveChoice(state, choice.id);
  const trend = core.getMetricTrend(state, "infection", 6);
  assert(trend && Array.isArray(trend.values), "getMetricTrend should return values.");
  assert(trend.values.length >= 2, "Metric trend should reconstruct at least one historical step after a choice.");
  assert(trend.summary && trend.detail && trend.tone, "Metric trend needs summary, detail, and tone.");
  const mixedState = core.createGame({ difficulty: "normal", seed: 20260612 });
  mixedState.hidden.policyStrictness = 30;
  mixedState.history.unshift({ changes: { policyStrictness: 5 } });
  const mixedTrend = core.getMetricTrend(mixedState, "policyStrictness", 6);
  assert(mixedTrend && mixedTrend.tone === "mixed", "Mixed-direction metrics such as policyStrictness should not be colored as purely good or bad.");
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
  assert(Array.isArray(profile.debts), "Strategy profile should expose route debt warnings.");
  assert(profile.debts.length > 0, "A dominant route under pressure should expose at least one route debt warning.");
  assert(
    profile.debts.every((item) => item.label && item.status && item.detail && item.tone),
    "Every route debt warning needs label, status, detail, and tone.",
  );
  assert(
    profile.recommendations.every((item) => item.kind && item.label && item.status && item.detail && item.routeLabel),
    "Every strategy recommendation needs kind, label, status, detail, and routeLabel.",
  );
  assert(
    profile.recommendations.every((item) => !String(item.detail).includes("[object Object]")),
    "Strategy recommendation details must render readable forecast text.",
  );
}

function validateEndingOutlook() {
  const state = core.createGame({ difficulty: "normal", seed: 20260609 });
  const opening = core.getEndingOutlook(state);
  assert(opening && Array.isArray(opening.drivers), "Ending outlook should expose score drivers.");
  assert(opening.drivers.length === 3, "Ending outlook should list the top 3 score drivers.");
  assert(
    opening.drivers.every((item) => item.metric && item.label && item.status && item.detail && item.tone),
    "Every ending outlook score driver needs metric, label, status, detail, and tone.",
  );

  state.metrics.hospitalLoad = 96;
  state.metrics.supplies = 22;
  state.metrics.staffFatigue = 84;
  state.flags.failureStreaks.medical = 2;
  const pressured = core.getEndingOutlook(state);
  assert(pressured && Array.isArray(pressured.riskClocks), "Ending outlook should expose failure risk clocks.");
  assert(pressured.riskClocks.length > 0, "Pressured ending outlook should show at least one failure clock.");
  assert(
    pressured.riskClocks.some((item) => item.id === "medical" && item.status.includes("/")),
    "Active medical failure countdown should appear in ending outlook risk clocks.",
  );
}

function validateBalanceSimCheckMode() {
  const balanceSim = fs.readFileSync(path.join(rootDir, "balance-sim.js"), "utf8");
  [
    "BALANCE_TARGETS",
    "--check",
    "validateBalanceTargets",
    "balancedPassMin",
    "balancedFatigueMax",
    "singleStrategyPassMax",
  ].forEach((text) => {
    assert(balanceSim.includes(text), `balance-sim.js should expose ${text}.`);
  });
}

function run() {
  const { eventIds, phaseCounts } = validateEventCorpus();
  validateSchedule(eventIds);
  validateMapAndCityActions();
  validateNewsAssets();
  validateCacheVersions();
  validateScenarios();
  validateTutorialCopy();
  validateRecoveryLevers();
  validateFiscalOutlook();
  validateCityBadges();
  validateFiscalEconomyChannels();
  validateCityActionOpportunities();
  validateCityActionUndo();
  validateMapSignals();
  validateStageReview();
  validateChoiceRiskPreview();
  validateDailyDirective();
  validateSettlementBreakdown();
  validateMetricTrends();
  validateEndingStrategyReview();
  validateEndingOutlook();
  validateBalanceSimCheckMode();

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
