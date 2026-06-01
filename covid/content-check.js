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

function readPngDimensions(relativePath) {
  const fullPath = path.join(assetsDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const buffer = fs.readFileSync(fullPath);
  const isPng = buffer.length >= 24
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47;
  if (!isPng) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertPngQuality(relativePath, rules = {}) {
  const dimensions = readPngDimensions(relativePath);
  assert(Boolean(dimensions), `${relativePath} should be a readable PNG file.`);
  if (!dimensions) return null;
  const ratio = dimensions.width / dimensions.height;
  const minWidth = rules.minWidth || 1;
  const minHeight = rules.minHeight || 1;
  const minRatio = rules.minRatio || 0.1;
  const maxRatio = rules.maxRatio || 10;
  assert(dimensions.width >= minWidth, `${relativePath} width ${dimensions.width} is below ${minWidth}.`);
  assert(dimensions.height >= minHeight, `${relativePath} height ${dimensions.height} is below ${minHeight}.`);
  assert(
    ratio >= minRatio && ratio <= maxRatio,
    `${relativePath} aspect ratio ${ratio.toFixed(2)} is outside ${minRatio}-${maxRatio}.`,
  );
  return dimensions;
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
    assertPngQuality(image, { minWidth: 900, minHeight: 900, minRatio: 0.9, maxRatio: 1.9 });
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
  assert(
    stageSchedule.every((item) => item.focusAction && item.focusAction.id && item.focusAction.mode && item.focusAction.pointId && item.focusAction.label),
    "Every stage schedule item should expose a focusable preparation action.",
  );
  const onlineConsult = stageSchedule.find((item) => item.id === "p4_online_consultation_open");
  assert(
    onlineConsult && /线上分流/.test(onlineConsult.conditionLabel) && !String(onlineConsult.conditionDetail).includes("[object Object]"),
    "Online consultation fixed window should explain its trigger condition.",
  );
  assert(
    onlineConsult.focusAction && /社区临时门诊|线上政务与远程办公|重点人群药品直送/.test(onlineConsult.focusAction.label),
    "Online consultation fixed window should point to a plausible preparation action.",
  );
  core.SCHEDULED_EVENTS.forEach((schedule) => {
    const state = core.createGame({ difficulty: "normal", seed: 20260700 + schedule.day });
    state.day = schedule.day;
    state.phase = core.phaseForDay(state.day);
    const row = core.getStageSchedule(state).find((item) => item.id === schedule.eventId);
    assert(
      row && row.focusAction && row.focusAction.id && row.focusAction.mode && row.focusAction.pointId,
      `Scheduled event ${schedule.eventId} should expose a preparation focus action on its phase calendar.`,
    );
  });
}

function validateMapAndCityActions() {
  const operationIds = new Set(Object.keys(core.OPERATIONS || {}));
  const resolutionIds = new Set(Object.keys(core.RESOLUTIONS || {}));

  assert(assetExists("city-map.png"), "Missing city-map.png.");
  assert(assetExists("tilesheet.png"), "Missing tilesheet.png.");
  assert(assetExists("mascot-dingdong-sprite.png"), "Missing mascot-dingdong-sprite.png.");
  assert(assetExists("mascot-dabai-sprite.png"), "Missing mascot-dabai-sprite.png.");
  assertPngQuality("city-map.png", { minWidth: 1200, minHeight: 800, minRatio: 1.4, maxRatio: 1.6 });
  assertPngQuality("tilesheet.png", { minWidth: 1200, minHeight: 800, minRatio: 1.4, maxRatio: 1.6 });
  assertPngQuality("mascot-dingdong-sprite.png", { minWidth: 1600, minHeight: 300, minRatio: 4, maxRatio: 7 });
  assertPngQuality("mascot-dabai-sprite.png", { minWidth: 1600, minHeight: 300, minRatio: 4, maxRatio: 7 });

  assert(Array.isArray(core.MAP_POINTS), "MAP_POINTS must be exported as an array.");
  core.MAP_POINTS.forEach((point) => {
    assert(point.id && point.label, "Each map point needs id and label.");
    assert(Number.isFinite(point.x) && Number.isFinite(point.y), `${point.id} needs numeric x/y coordinates.`);
    assert(assetExists(`highlight-${point.id}.png`), `${point.id} highlight asset is missing.`);
    assertPngQuality(`highlight-${point.id}.png`, { minWidth: 1200, minHeight: 760, minRatio: 1.4, maxRatio: 1.8 });

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
    assertPngQuality(item.image, { minWidth: 900, minHeight: 900, minRatio: 0.9, maxRatio: 1.1 });
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

function validateRuntimeImageFallbacks() {
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  [
    "setManagedImage",
    "EVENT_IMAGE_FALLBACK",
    "NEWS_IMAGE_FALLBACK",
    "image.dataset.fallbackUsed",
    "image.onerror",
    "image-loading",
    "image-error",
  ].forEach((text) => {
    assert(appJs.includes(text), `app.js should keep runtime image fallback support for ${text}.`);
  });
  [
    ".event-image.is-loading",
    ".event-image.is-error",
    ".event-visual.image-error",
    '.event-visual[data-motion="lab"]',
    '.event-visual[data-motion="convoy"]',
    '.event-visual[data-motion="ledger"]',
    '.event-visual[data-motion="broadcast"]',
    ".news-card.image-loading img",
    ".news-card.image-error img",
  ].forEach((text) => {
    assert(styles.includes(text), `styles.css should style image loading/error state: ${text}.`);
  });
  [
    'return "lab"',
    'return "convoy"',
    'return "ledger"',
    'return "broadcast"',
    'return "care"',
    'return "school"',
  ].forEach((text) => {
    assert(appJs.includes(text), `Event motion classifier should include ${text}.`);
  });
}

function validateSettlementNarrativeUi() {
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  [
    "renderSettlementNarrative",
    "renderSettlementReview",
    "getSettlementNarrative",
    "getSettlementReview",
    "settlement-cause",
    "settlement-review",
  ].forEach((text) => {
    assert(appJs.includes(text), `app.js should render settlement narrative UI for ${text}.`);
  });
  [
    ".settlement-cause",
    ".settlement-cause.good",
    ".settlement-cause.warn",
    ".settlement-review",
    ".settlement-review-chips",
  ].forEach((text) => {
    assert(styles.includes(text), `styles.css should style settlement narrative state: ${text}.`);
  });
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
  assert(indexHtml.includes('form="startForm"'), "Start screen should expose a first-viewport submit button wired to the setup form.");
  [
    "推荐顺序",
    "立即开始第 1 天",
    "今日压力摘要",
    "今日调度目标",
    "今晚趋势",
    "对准目标",
    "城市行动决策徽章",
    "耗资金",
    "铺资产",
    "后果复盘",
    "决策徽章",
    "贴合目标",
    "红线风险",
    "高危二次确认",
    "危险倒计时",
    "合并成一次确认",
    "有后账",
    "下一步队列",
    "今日首选",
    "顶部选前提醒",
    "选前提醒",
    "还有城市行动未用",
    "可定位",
    "第一次点击事件只进入确认结算态",
    "再次点击才会结算",
    "选后结算",
    "明日可排",
    "后续影响",
    "若触发",
    "财政与活力面板",
    "今日处方",
    "预算压力",
    "现金余量",
    "可承受支出",
    "回流资产",
    "筹措资金",
    "低接触活力",
    "财政透支",
    "治理路线",
    "最近路线账本",
    "本阶段公共节点",
    "准备行动",
    "归档预估",
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
    report.items.every((item) => item.pointId && item.mode && item.label && item.status && item.impact && item.routeTag && item.routeTag.label),
    "Every recovery lever needs pointId, mode, label, status, impact, and routeTag.",
  );
}

function validateFiscalOutlook() {
  assert(typeof core.getFiscalOutlook === "function", "game-core.js must export getFiscalOutlook.");
  assert(typeof core.getFiscalChannelPlan === "function", "game-core.js must export getFiscalChannelPlan.");
  assert(typeof core.getFiscalChannelAdvice === "function", "game-core.js must export getFiscalChannelAdvice.");
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  const state = core.createGame({ difficulty: "normal", seed: 20260619 });
  const opening = core.getFiscalOutlook(state);
  assert(opening && Array.isArray(opening.items), "getFiscalOutlook must return an object with items.");
  assert(opening.items.length === 3, "Fiscal outlook should expose funds, economy, and locked-action readouts.");
  assert(opening.runway && Array.isArray(opening.runway.items), "Fiscal outlook should expose a budget runway readout.");
  assert(opening.runway.items.length === 3, "Budget runway should expose cash runway, safe spend, and bridge assets.");
  assert(
    opening.runway.items.every((item) => item.id && item.label && item.value !== undefined && item.detail && item.tone),
    "Every budget runway item needs id, label, value, detail, and tone.",
  );
  assert(opening.network && Array.isArray(opening.network) && opening.network.length === 3, "Fiscal outlook should expose fiscal/micro network readouts.");
  assert(
    opening.network.every((item) => item.id && item.label && item.value !== undefined && item.detail && item.tone),
    "Every fiscal/micro network readout needs id, label, value, detail, and tone.",
  );
  assert(!String(opening.runway.summary).includes("[object Object]"), "Budget runway summary must be readable text.");
  assert(opening.prescription && Array.isArray(opening.prescription.steps), "Fiscal outlook should expose a daily fiscal/economy prescription.");
  assert(opening.prescription.steps.length >= 2, "Opening prescription should include at least two recovery priorities.");
  assert(
    opening.prescription.steps.every((item) => item.id && item.label && item.detail && item.status && item.tone),
    "Every fiscal prescription step needs id, label, detail, status, and tone.",
  );
  assert(!String(opening.prescription.detail).includes("[object Object]"), "Fiscal prescription detail must be readable text.");
  assert(Array.isArray(opening.roadmap) && opening.roadmap.length === 3, "Fiscal outlook should expose a three-part recovery roadmap.");
  assert(
    opening.roadmap.every((item) => item.id && item.label && item.stage && item.detail && item.counts && Number.isFinite(item.progress)),
    "Every recovery roadmap item needs id, label, stage, detail, counts, and progress.",
  );
  assert(
    opening.roadmap.some((item) => item.id === "fiscalChain") && opening.roadmap.some((item) => item.id === "microLoop"),
    "Recovery roadmap should distinguish the fiscal chain from the low-contact micro-loop.",
  );
  assert(Array.isArray(opening.channels) && opening.channels.length === 6, "Fiscal outlook should expose a six-part funds/economy channel plan.");
  assert(
    opening.channels.every((item) => item.id && item.label && item.status && item.detail && item.warning && item.counts && Number.isFinite(item.progress)),
    "Every fiscal channel plan item needs id, label, status, detail, warning, counts, and progress.",
  );
  assert(
    ["appropriation", "mutualAid", "creditBridge", "lowContactVitality", "productionLoop", "lastResort"].every((id) => opening.channels.some((item) => item.id === id)),
    "Fiscal channel plan should distinguish appropriation, mutual aid, credit, vitality, production, and last-resort routes.",
  );
  assert(
    core.getFiscalChannelPlan(state).some((item) => item.next && item.next.id && item.next.pointId && item.next.mode),
    "Fiscal channel plan should carry focusable next actions when routes are available or locked.",
  );
  assert(Array.isArray(opening.channelAdvice) && opening.channelAdvice.length >= 2, "Fiscal outlook should expose state-sensitive channel advice.");
  assert(
    opening.channelAdvice.every((item) => item.id && item.label && item.reason && item.status && item.tone),
    "Every channel advice item needs id, label, reason, status, and tone.",
  );
  assert(
    opening.channelAdvice.some((item) => item.actionId && item.mode && item.pointId),
    "Channel advice should carry focusable next actions.",
  );
  assert(
    opening.channels.some((item) => item.recommended),
    "Recommended channel advice should mark matching channel cards.",
  );
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
  assert(report.runway && report.runway.tone === "danger", "Budget runway should flag severe cashflow states as danger.");
  assert(report.items.some((item) => item.id === "locks"), "Fiscal outlook should include funding lock count.");

  const assetState = core.createGame({ difficulty: "normal", seed: 20260621 });
  assetState.flags.operationUses.fiscalTransparencyLedger = 1;
  assetState.flags.operationUses.emergencyGapLedger = 1;
  assetState.metrics.trust = 62;
  assetState.resources.funds = 42;
  const assetReport = core.getFiscalOutlook(assetState);
  assert(Array.isArray(assetReport.activeAssets), "Fiscal outlook should expose active fiscal assets.");
  assert(assetReport.activeAssets.length >= 2, "Fiscal outlook should surface active recovery assets after setup actions.");

  const bridgeState = core.createGame({ difficulty: "normal", seed: 20260622 });
  bridgeState.metrics.economy = 58;
  bridgeState.metrics.trust = 62;
  bridgeState.resources.funds = 30;
  bridgeState.flags.operationUses.fiscalTransparencyLedger = 1;
  bridgeState.flags.operationUses.emergencyGapLedger = 1;
  bridgeState.flags.operationUses.fastGrantReport = 1;
  const bridgeReport = core.getFiscalOutlook(bridgeState);
  const bridgeFunds = bridgeReport.items.find((item) => item.id === "funds");
  assert(bridgeFunds.delta >= 3, "Three active fiscal assets at low funds should raise the capped cashflow bridge to at least +3.");
  assert(
    bridgeFunds.components.some((item) => item.id === "assetYield" && item.value >= 3),
    "Fiscal outlook should explain the stronger low-fund recovery asset yield.",
  );

  const microState = core.createGame({ difficulty: "normal", seed: 20260623 });
  microState.day = 10;
  microState.metrics.infection = 48;
  microState.metrics.economy = 62;
  microState.metrics.staffFatigue = 52;
  microState.hidden.policyStrictness = 42;
  microState.flags.operationUses.essentialServicePermit = 1;
  microState.flags.operationUses.remoteApprovalDesk = 1;
  const microReport = core.getFiscalOutlook(microState);
  const microEconomy = microReport.items.find((item) => item.id === "economy");
  const microRoadmap = microReport.roadmap.find((item) => item.id === "microLoop");
  assert(
    microEconomy.components.some((item) => item.id === "microRecoveryAssets" && item.value > 0),
    "Two low-flow recovery assets should create a readable micro-recovery economy component.",
  );
  assert(microRoadmap.counts.established >= 2, "Micro-loop roadmap should count established low-contact vitality assets.");
  assert(
    microReport.network.some((item) => item.id === "microNetwork" && item.tone === "warn" && item.detail.includes("发现率")),
    "Micro network readout should warn when low detection makes micro-recovery risky.",
  );
  assert(appJs.includes("renderFiscalRunway"), "Fiscal panel should render the budget runway.");
  assert(appJs.includes("renderFiscalPrescription"), "Fiscal panel should render the daily prescription.");
  assert(appJs.includes("renderFiscalChannels"), "Fiscal panel should render the funds/economy channel plan.");
  assert(appJs.includes("data-channel-action"), "Fiscal channel cards should carry exact next-action ids.");
  assert(
    appJs.includes("bindCityActionPreview(button, () => button.dataset.channelMode, () => button.dataset.channelAction)"),
    "Fiscal channel cards should preview their next action on hover/focus.",
  );
  assert(appJs.includes("renderFiscalNetwork"), "Fiscal panel should render fiscal/micro network readouts.");
  assert(styles.includes(".fiscal-runway"), "Budget runway needs dedicated styling.");
  assert(styles.includes(".fiscal-prescription"), "Daily fiscal prescription needs dedicated styling.");
  assert(appJs.includes("renderFiscalChannelAdvice"), "Fiscal panel should render channel advice.");
  assert(styles.includes(".fiscal-channel-advice"), "Channel advice needs dedicated styling.");
  assert(styles.includes(".fiscal-channel-card.recommended"), "Recommended fiscal channel cards need a visible state.");
  assert(styles.includes(".fiscal-channel-card"), "Fiscal channel plan needs dedicated styling.");
  assert(styles.includes(".fiscal-network"), "Fiscal/micro network readouts need dedicated styling.");
}

function validateCrisisDashboard() {
  assert(typeof core.getCrisisDashboard === "function", "game-core.js must export getCrisisDashboard.");
  const state = core.createGame({ difficulty: "normal", seed: 20260627 });
  state.metrics.hospitalLoad = 96;
  state.flags.failureStreaks.medical = 1;
  const risks = core.getCrisisDashboard(state);
  const medical = risks.find((item) => item.id === "medical");
  assert(medical && medical.status === "1/3", "Medical crisis dashboard should expose the active countdown status.");
  assert(
    medical.clockText && medical.clockText.includes("仍有 2 天补救"),
    "Active crisis countdown should spell out the remaining rescue window.",
  );
  const stable = risks.find((item) => item.id === "supply");
  assert(stable && stable.clockText, "Stable crisis rows should still explain that no failure countdown is active.");
}

function validateMicroRecoveryPressure() {
  assert(typeof core.getDailyPressureSummary === "function", "game-core.js must export getDailyPressureSummary.");
  const assertActionablePressure = (summary, id, message) => {
    const item = summary.find((entry) => entry.id === id);
    assert(item, `${message} should be present.`);
    assert(
      item.actionId && item.mode && item.pointId,
      `${message} should carry a focusable city action target.`,
    );
  };

  const opening = core.createGame({ difficulty: "normal", seed: 20260625 });
  const openingSummary = core.getDailyPressureSummary(opening);
  assert(
    openingSummary.some((item) => item.id === "city_action_window" && /今日调度还剩/.test(item.detail)),
    "Daily pressure summary should remind players when a no-advance city action is still available before the event.",
  );
  const openingActionWindow = openingSummary.find((item) => item.id === "city_action_window");
  assert(
    openingActionWindow && openingActionWindow.actionId && openingActionWindow.mode && openingActionWindow.pointId,
    "Daily pressure action-window summary should carry a focusable city action target.",
  );

  const state = core.createGame({ difficulty: "normal", seed: 20260624 });
  state.day = 10;
  state.metrics.infection = 50;
  state.metrics.economy = 62;
  state.metrics.staffFatigue = 52;
  state.hidden.detectedRate = 50;
  state.hidden.policyStrictness = 42;
  state.flags.operationUses.essentialServicePermit = 1;
  state.flags.operationUses.remoteApprovalDesk = 1;
  const summary = core.getDailyPressureSummary(state);
  assert(
    summary.some((item) => item.id === "micro_flow_pressure"),
    "Low-detection micro-recovery route should surface its extra flow risk in the daily pressure summary.",
  );
  assertActionablePressure(
    summary,
    "micro_flow_pressure",
    "Low-detection micro-recovery pressure",
  );
  const thresholdState = core.createGame({ difficulty: "normal", seed: 2026062401 });
  thresholdState.metrics.infection = 50;
  thresholdState.hidden.detectedRate = 65;
  thresholdState.flags.operationUses.essentialServicePermit = 1;
  thresholdState.flags.operationUses.remoteApprovalDesk = 1;
  const thresholdSummary = core.getDailyPressureSummary(thresholdState);
  assert(
    thresholdSummary.some((item) => item.id === "micro_flow_pressure"),
    "Daily pressure summary should use the same detectedRate<70 micro-flow threshold as daily resolution.",
  );

  const fundsState = core.createGame({ difficulty: "normal", seed: 2026062402 });
  fundsState.day = 8;
  fundsState.resources.funds = 9;
  assertActionablePressure(
    core.getDailyPressureSummary(fundsState),
    "resource_funds_low",
    "Low-funds pressure",
  );

  const economyState = core.createGame({ difficulty: "normal", seed: 2026062403 });
  economyState.day = 8;
  economyState.metrics.economy = 20;
  economyState.metrics.infection = 40;
  economyState.resources.funds = 50;
  assertActionablePressure(
    core.getDailyPressureSummary(economyState),
    "metric_economy_low",
    "Low-economy pressure",
  );

  const pendingState = core.createGame({ difficulty: "normal", seed: 2026062409 });
  pendingState.day = 8;
  pendingState.phase = core.phaseForDay(pendingState.day);
  pendingState.resources.funds = 50;
  pendingState.pendingEffects = [{
    dueDay: 9,
    eventTitle: "账期谈判复核",
    label: "供应商尾款到期",
    effects: {},
    hidden: {},
    resources: { funds: -5 },
    condition: null,
  }];
  const pendingSummary = core.getDailyPressureSummary(pendingState);
  assertActionablePressure(
    pendingSummary,
    "pending_due",
    "Pending delayed-effect pressure",
  );
  assert(
    pendingSummary.some((item) => item.id === "pending_due" && /风险指向资金 -5/.test(item.detail) && /可先准备/.test(item.detail)),
    "Pending delayed-effect pressure should explain the threatened metric and name a preparation action.",
  );
  assert(typeof core.getPendingEffectReadouts === "function", "game-core.js must export getPendingEffectReadouts.");
  const pendingReadouts = core.getPendingEffectReadouts(pendingState);
  assert(
    pendingReadouts.some((item) => item.risk && item.risk.metric === "funds" && item.actionId && item.mode && item.pointId),
    "Pending timeline readouts should expose the threatened metric and a focusable preparation action.",
  );

  const hospitalState = core.createGame({ difficulty: "normal", seed: 2026062404 });
  hospitalState.metrics.hospitalLoad = 88;
  hospitalState.resources.funds = 80;
  assertActionablePressure(
    core.getDailyPressureSummary(hospitalState),
    "metric_hospital_high",
    "High-hospital pressure",
  );

  const trustState = core.createGame({ difficulty: "normal", seed: 2026062406 });
  trustState.metrics.trust = 25;
  trustState.resources.funds = 80;
  assertActionablePressure(
    core.getDailyPressureSummary(trustState),
    "metric_trust_low",
    "Low-trust pressure",
  );

  const memoryState = core.createGame({ difficulty: "normal", seed: 2026062407 });
  memoryState.day = 30;
  memoryState.phase = core.phaseForDay(memoryState.day);
  memoryState.hidden.publicMemory = 70;
  memoryState.resources.funds = 80;
  assertActionablePressure(
    core.getDailyPressureSummary(memoryState),
    "hidden_memory_high",
    "High-public-memory pressure",
  );

  const policyState = core.createGame({ difficulty: "normal", seed: 2026062408 });
  policyState.hidden.policyStrictness = 85;
  policyState.metrics.infection = 40;
  policyState.metrics.economy = 40;
  policyState.resources.funds = 80;
  assertActionablePressure(
    core.getDailyPressureSummary(policyState),
    "hidden_policy_high",
    "High-policy-strictness pressure",
  );

  const scheduledState = core.createGame({ difficulty: "normal", seed: 2026062405 });
  scheduledState.day = 20;
  scheduledState.phase = core.phaseForDay(scheduledState.day);
  const scheduledSummary = core.getDailyPressureSummary(scheduledState);
  assertActionablePressure(
    scheduledSummary,
    "scheduled_soon",
    "Upcoming scheduled-event pressure",
  );
  assert(
    scheduledSummary.some((item) => item.id === "scheduled_soon" && /可准备|差条件|已铺垫/.test(item.detail)),
    "Upcoming scheduled-event pressure should name the preparation action status.",
  );

  const inertiaState = core.createGame({ difficulty: "normal", seed: 20260626 });
  inertiaState.day = 18;
  inertiaState.phase = core.phaseForDay(inertiaState.day);
  inertiaState.flags.actionUses.citywideSilence = 2;
  inertiaState.history.unshift({
    day: 8,
    phase: 1,
    title: "路线惯性校验",
    choice: "路线惯性校验",
    routeKey: "hard",
    routeLabel: "高压止血",
    routeTone: "danger",
    routeSource: "eventChoice",
    notes: [],
    changes: {},
  });
  const inertiaSummary = core.getDailyPressureSummary(inertiaState);
  assert(
    inertiaSummary.some((item) => item.id === "strategy_inertia" && /建议补/.test(item.detail)),
    "Daily pressure summary should surface overused strategy-route inertia with complement advice.",
  );
  assertActionablePressure(
    inertiaSummary,
    "strategy_inertia",
    "Strategy-inertia pressure",
  );
}

function validateStatusEffectActions() {
  assert(typeof core.getStatusEffects === "function", "game-core.js must export getStatusEffects.");
  const assertActionableStatus = (state, id, message) => {
    const item = core.getStatusEffects(state).find((entry) => entry.id === id);
    assert(item, `${message} should be present.`);
    assert(
      item && item.actionId && item.mode && item.pointId,
      `${message} should carry a focusable city action target.`,
    );
    assert(
      item && /应对入口/.test(item.description),
      `${message} should explain the linked preparation action in its description.`,
    );
  };

  const hospitalState = core.createGame({ difficulty: "normal", seed: 2026062501 });
  hospitalState.metrics.hospitalLoad = 88;
  hospitalState.resources.funds = 80;
  assertActionableStatus(hospitalState, "hospitalHigh", "High-hospital status effect");

  const fundsState = core.createGame({ difficulty: "normal", seed: 2026062502 });
  fundsState.resources.funds = 8;
  assertActionableStatus(fundsState, "fundsLow", "Low-funds status effect");

  const economyState = core.createGame({ difficulty: "normal", seed: 2026062503 });
  economyState.day = 8;
  economyState.phase = core.phaseForDay(economyState.day);
  economyState.metrics.economy = 20;
  economyState.metrics.infection = 40;
  economyState.resources.funds = 50;
  assertActionableStatus(economyState, "economyLow", "Low-economy status effect");

  const infectionWindowState = core.createGame({ difficulty: "normal", seed: 2026062504 });
  infectionWindowState.day = 8;
  infectionWindowState.phase = core.phaseForDay(infectionWindowState.day);
  infectionWindowState.metrics.infection = 20;
  infectionWindowState.metrics.economy = 55;
  infectionWindowState.resources.funds = 50;
  assertActionableStatus(infectionWindowState, "infectionLow", "Low-infection opportunity status effect");

  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  assert(appJs.includes("data-status-action"), "Status-effect UI should render focusable action buttons.");
  assert(appJs.includes("focusRecoveryLever(button.dataset.statusPoint"), "Status-effect action buttons should focus the linked city action.");
}

function validateCityBadges() {
  assert(typeof core.getCityBadges === "function", "game-core.js must export getCityBadges.");
  const state = core.createGame({ difficulty: "normal", seed: 20260617 });
  const opening = core.getCityBadges(state);
  assert(opening && Array.isArray(opening.earned) && Array.isArray(opening.watch), "getCityBadges must return earned and watch arrays.");
  assert(opening.total >= 8, `Expected at least 8 city badge rules, found ${opening.total}.`);
  assert(
    opening.watch.every((item) => item.focus && item.focus.pointId && item.focus.mode && item.focus.actionId),
    "Opening watched city badges should expose focusable map actions.",
  );
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
    [...report.earned, ...report.watch].every((item) => item.id && item.label && item.category && item.detail && item.status && item.tone && Array.isArray(item.gaps) && Object.prototype.hasOwnProperty.call(item, "focus")),
    "Every city badge needs id, label, category, detail, status, tone, gaps, and focus.",
  );
  assert(
    report.watch.every((item) => item.gaps.length > 0),
    "Watched city badges should expose concrete remaining gaps.",
  );
  assert(
    report.watch.every((item) => item.focus && item.focus.pointId && item.focus.mode && item.focus.actionId && item.focus.label && item.focus.status),
    "Watched city badges should expose a focusable map action.",
  );
}

function validateFiscalEconomyChannels() {
  const required = [
    "emergencyGapLedger",
    "fastGrantReport",
    "bankCreditWindow",
    "budgetFreezeReview",
    "insurancePreSettlement",
    "publicDonationDrive",
    "donationClaimList",
    "platformLogisticsShare",
    "interProvinceSupport",
    "supplierPaymentExtension",
    "contactlessLivelihoodStalls",
    "neighborhoodPickupWindow",
    "onlineGovOvertime",
    "remoteApprovalDesk",
    "onlineVendorDesk",
    "neighborhoodErrandRoster",
    "microEnterpriseRoster",
    "neighborhoodCommerceLedger",
    "serviceVoucherPilot",
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
  const routeExpectations = {
    fiscalTransparencyLedger: "筹措资金",
    emergencyGapLedger: "筹措资金",
    bankCreditWindow: "筹措资金",
    budgetFreezeReview: "筹措资金",
    insurancePreSettlement: "筹措资金",
    publicDonationDrive: "筹措资金",
    microEnterpriseRoster: "低接触活力",
    onlineVendorDesk: "低接触活力",
    neighborhoodErrandRoster: "低接触活力",
    remoteApprovalDesk: "低接触活力",
    essentialServicePermit: "低接触活力",
    temporaryTurnoverPool: "财政透支",
    emergencyLevy: "财政透支",
  };
  Object.entries(routeExpectations).forEach(([id, label]) => {
    const tag = core.getChoiceRouteTag({ id });
    assert(tag && tag.label === label, `${id} should use the ${label} route tag.`);
  });
  assert(openingAvailable.length >= 5, `Normal opening should expose at least 5 fiscal/economy recovery choices, found ${openingAvailable.length}.`);
  assert(
    openingAvailable.some((item) => /资金/.test(item.impact)) && openingAvailable.some((item) => /活力/.test(item.impact)),
    "Normal opening recovery choices should include both fiscal and vitality routes.",
  );
  assert(
    openingAvailable.some((item) => item.route === "筹措资金") && openingAvailable.some((item) => item.route === "低接触活力"),
    "Normal opening recovery choices should label both fundraising and low-contact vitality routes.",
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
  assert(available.length >= 6, `Expected at least 6 early fiscal/economy channels available, found ${available.length}.`);
  assert(resolutionStatuses.length === requiredResolutions.length, "All fiscal/economy recovery resolutions should produce resolution statuses.");
  assert(availableResolutions.length >= 4, `Expected at least 4 early fiscal/economy recovery resolutions available, found ${availableResolutions.length}.`);
  const report = core.getRecoveryLevers(state);
  assert(report.totalCount >= 44, `Recovery lever report should recognize expanded fiscal/economy channels, found ${report.totalCount}.`);
}

function validateCityActionOpportunities() {
  assert(typeof core.getCityActionOpportunities === "function", "game-core.js must export getCityActionOpportunities.");
  assert(typeof core.getCityActionDecisionTags === "function", "game-core.js must export getCityActionDecisionTags.");
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
  const actionTags = core.getCityActionDecisionTags(state, "operations", "triageNetwork");
  assert(Array.isArray(actionTags), "City action decision tags should return an array.");
  assert(actionTags.length > 0, "Available city actions should expose compact decision tags.");
  assert(
    actionTags.every((tag) => tag.id && tag.label && tag.detail && tag.tone),
    "Every city action decision tag needs id, label, detail, and tone.",
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
  const queuedTags = core.getCityActionDecisionTags(fullBudget, "operations", "triageNetwork");
  assert(
    queuedTags.some((tag) => /明日可排|等资金|差条件|已处理/.test(tag.label)),
    "Locked or queued city actions should expose the lock reason as a decision tag.",
  );

  assert(typeof core.getCityActionLockPreview === "function", "game-core.js must export getCityActionLockPreview.");
  const lockedPreview = core.getCityActionLockPreview(core.createGame({ difficulty: "normal", seed: 20260606 }), "operations", "publicDonationDrive");
  assert(lockedPreview && lockedPreview.items && lockedPreview.items.length >= 2, "Locked city actions should expose a readable lock preview with impact chips.");
  assert(
    lockedPreview.items[0].display && lockedPreview.items.every((item) => item.detail && item.tone),
    "Every locked action preview item needs display/detail/tone text.",
  );
  assert(
    lockedPreview.items.some((item) => item.display.includes("资金") || item.display.includes("物资") || item.display.includes("信任")),
    "Locked action preview should still show the action's future impact.",
  );
}

function validateCityActionUndo() {
  assert(typeof core.getCityActionUndo === "function", "game-core.js must export getCityActionUndo.");
  assert(typeof core.undoCityAction === "function", "game-core.js must export undoCityAction.");
  assert(typeof core.getEventSettlementHint === "function", "game-core.js must export getEventSettlementHint.");
  const state = core.createGame({ difficulty: "normal", seed: 20260615 });
  const openingHint = core.getEventSettlementHint(state);
  assert(openingHint && openingHint.id === "cityActionUnused", "Event settlement hint should warn when today's city action budget is unused.");
  assert(openingHint.actionId && openingHint.pointId && /可先处理/.test(openingHint.detail), "Unused-action settlement hint should name a concrete city action before event resolution.");
  const before = core.exportState(state);
  core.executeOperation(state, "campusSentinel");
  const undo = core.getCityActionUndo(state);
  assert(undo && undo.label === core.OPERATIONS.campusSentinel.label, "Executed city actions should expose an undo record.");
  const committedHint = core.getEventSettlementHint(state);
  assert(
    committedHint && committedHint.id === "cityActionCommitted" && /撤销/.test(committedHint.detail),
    "Event settlement hint should explain that an executed city action can still be undone before resolving the event.",
  );
  assert(state.flags.cityActionsToday === 1, "Executing a city action should consume today's city action budget.");
  assert(state.history.length === 1, "Executing a city action should add one history row before undo.");
  const undoSummary = core.getDailyPressureSummary(state);
  assert(
    undoSummary.some((item) => item.id === "city_action_undo" && /可先撤销/.test(item.detail)),
    "Daily pressure summary should remind players that the latest city action can be undone before resolving the event.",
  );
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
  state.history.unshift({
    day: 2,
    phase: 1,
    title: "地图趋势校验",
    choice: "地图趋势校验",
    changes: { hospitalLoad: 5, supplies: -4, staffFatigue: 3 },
  });
  const signals = core.getMapSignals(state);
  assert(Array.isArray(signals), "getMapSignals must return an array.");
  assert(signals.length > 0 && signals.length <= 3, "Map signals should surface 1-3 top entries under pressure.");
  assert(
    signals.every((item) => item.id && item.pointId && item.pointLabel && item.label && item.detail && item.tone && item.status),
    "Every map signal needs id, pointId, pointLabel, label, detail, tone, and status.",
  );
  assert(
    signals.some((item) => item.actionId && item.mode && item.actionPointId && item.actionLabel && /应对入口/.test(item.detail)),
    "Map signals should expose a focusable response action when one is available.",
  );
  assert(core.getMapPointStatus(state, "hospital").tone === "danger", "Hospital map status should reflect a medical redline.");
  const hospitalStatus = core.getMapPointStatus(state, "hospital");
  assert(
    hospitalStatus.trend && hospitalStatus.trend.delta === 5 && hospitalStatus.trend.tone === "bad",
    "Hospital map status should expose a compact worsening trend when recent history changed the metric.",
  );
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  assert(appJs.includes("status-${pointStatus.tone}"), "Map hotspots should receive status tone classes.");
  assert(appJs.includes("map-status-trend"), "Map status chips should render compact trend deltas.");
  assert(appJs.includes("data-action-point-id"), "Map signal items should carry exact response action point hooks.");
  assert(appJs.includes("focusCityActionCard(button.dataset.actionId)"), "Map signal clicks should focus the exact response action when available.");
  assert(styles.includes(".map-signal-item small"), "Map signal response actions need compact styling.");
  ["status-danger", "status-warn", "status-good"].forEach((className) => {
    assert(styles.includes(`.map-hotspot.${className}::before`), `Missing map pressure halo style for ${className}.`);
  });
  assert(styles.includes(".map-status-trend.bad"), "Map trend chip needs a visible worsening style.");
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
  const openingObjectives = core.getStageObjectives(core.createGame({ difficulty: "normal", seed: 20260624 }), { includeFocusActions: true });
  assert(
    openingObjectives.some((objective) => !objective.done && objective.focusAction && objective.focusAction.id && objective.focusAction.pointId),
    "Unfinished stage objectives should expose a concrete focus action when one is available.",
  );
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
    comparison.items.every((item) => Array.isArray(item.decisionTags) && item.decisionTags.length > 0),
    "Every choice comparison item should expose compact decision tags.",
  );
  assert(
    comparison.items.every((item) => item.decisionTags.every((tag) => tag.id && tag.label && tag.detail && tag.tone)),
    "Every decision tag needs id, label, detail, and tone.",
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
  assert(typeof core.getSettlementNarrative === "function", "game-core.js must export getSettlementNarrative.");
  assert(typeof core.getSettlementReview === "function", "game-core.js must export getSettlementReview.");
  assert(typeof core.getHistoryEntryMeta === "function", "game-core.js must export getHistoryEntryMeta.");
  const highlights = core.getSettlementHighlights(entry);
  const narrative = core.getSettlementNarrative(entry);
  const review = core.getSettlementReview(entry);
  assert(Array.isArray(highlights), "Settlement highlights should return an array.");
  assert(highlights.length > 0, "Settlement highlights should include at least one readable battle-report item.");
  assert(narrative && narrative.label && narrative.detail && narrative.tone, "Settlement narrative should summarize the main cause in readable text.");
  assert(review && review.label && review.detail && review.tone && Array.isArray(review.items), "Settlement review should summarize consequence type in readable text.");
  assert(!String(narrative.detail).includes("[object Object]"), "Settlement narrative details must render readable text.");
  assert(!String(review.detail).includes("[object Object]"), "Settlement review details must render readable text.");
  assert(
    review.items.every((item) => item.id && item.label && item.detail && item.tone),
    "Every settlement review item needs id, label, detail, and tone.",
  );
  assert(
    highlights.every((item) => item.id && item.label && item.detail && item.tone),
    "Every settlement highlight needs id, label, detail, and tone.",
  );
  assert(
    highlights.every((item) => !String(item.detail).includes("[object Object]")),
    "Settlement highlight details must render readable text.",
  );
  assert(
    review.items.every((item) => !String(item.detail).includes("[object Object]")),
    "Settlement review item details must render readable text.",
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
  activeState.flags.actionUses.citywideSilence = 2;
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
    changes: { trust: -4, infection: -2 },
  });
  const profile = core.getStrategyProfile(activeState);
  assert(core.getChoiceRouteTag({ actionKey: "citywideSilence" }).label === "高压止血", "Base hard-control actions should count toward strategy routes.");
  assert(core.getChoiceRouteTag({ actionKey: "expandTesting" }).label === "监测治理", "Base testing actions should count toward strategy routes.");
  assert(profile.inertia && profile.inertia.detail && profile.inertia.complementLabel, "Overused routes should expose a readable inertia warning with complements.");
  assert(Array.isArray(profile.recommendations), "Strategy profile should expose recommendations.");
  assert(profile.recommendations.length > 0, "Strategy recommendations should surface route complements under pressure.");
  assert(Array.isArray(profile.debts), "Strategy profile should expose route debt warnings.");
  assert(profile.debts.length > 0, "A dominant route under pressure should expose at least one route debt warning.");
  assert(Array.isArray(profile.recentMoves), "Strategy profile should expose recent route moves.");
  assert(profile.recentMoves.length > 0, "Strategy profile should show recent route ledger rows after history entries.");
  assert(
    profile.recentMoves.every((item) => item.day && item.sourceLabel && item.routeLabel && item.label && item.detail),
    "Every recent route move needs day, sourceLabel, routeLabel, label, and detail.",
  );
  assert(
    profile.recentMoves.some((item) => /代价|收益|变化/.test(item.detail)),
    "Recent route moves should summarize visible impact, not only repeat the title.",
  );
  assert(
    profile.debts.every((item) => item.label && item.status && item.detail && item.tone),
    "Every route debt warning needs label, status, detail, and tone.",
  );
  assert(
    profile.debts.some((item) => item.actionId && item.mode && item.pointId && /应对入口/.test(item.detail)),
    "Route debt warnings should expose at least one focusable response action when the city still has action budget.",
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
    "balancedDistinctEndingMin",
    "balancedNonCollapseEndingMin",
    "balancedDominantEndingMax",
    "balancedMedicalCollapseMax",
    "dominantEndingPct",
    "medicalCollapsePct",
    "singleStrategyPassMax",
  ].forEach((text) => {
    assert(balanceSim.includes(text), `balance-sim.js should expose ${text}.`);
  });
}

function validateActionPreviewCoverage() {
  const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const coreJs = fs.readFileSync(path.join(rootDir, "game-core.js"), "utf8");
  const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  [
    "data-crisis-action",
    "data-action-id",
    "bindCityActionPreview(button, () => button.dataset.crisisMode",
    "bindCityActionPreview(button, () => button.dataset.mode, () => button.dataset.actionId)",
    "previewCityAction(actionMode, button.dataset.actionId)",
  ].forEach((text) => {
    assert(appJs.includes(text), `app.js should keep city action preview coverage for ${text}.`);
  });
  assert(coreJs.includes("focusActionId"), "Crisis dashboard should expose focusActionId for previewing primary relief.");
  assert(appJs.includes("renderRecoveryUnlockHint"), "Recovery lever UI should expose readable unlock hints for locked channels.");
  assert(appJs.includes("(report.items || []).slice(0, 7)"), "Recovery lever UI should render the expanded seven-item shortlist.");
  assert(appJs.includes("data-recovery-action"), "Recovery lever cards should carry exact action ids for click-through preview.");
  assert(
    appJs.includes("bindCityActionPreview(button, () => button.dataset.recoveryMode, () => button.dataset.recoveryAction)"),
    "Recovery lever cards should preview the exact recovery action on hover/focus.",
  );
  assert(
    appJs.includes("focusRecoveryLever(button.dataset.recoveryPoint, button.dataset.recoveryMode, button.dataset.recoveryAction)"),
    "Recovery lever clicks should focus the exact recovery action, not only the map point.",
  );
  assert(styles.includes(".recovery-unlock"), "Recovery unlock hints need dedicated styling.");
  assert(appJs.includes("crisis-clock"), "Crisis rows should render readable failure countdown text.");
  assert(styles.includes(".crisis-clock"), "Crisis countdown text needs dedicated styling.");
  assert(appJs.includes("renderFiscalRoadmap"), "Fiscal panel should render the recovery route roadmap.");
  assert(appJs.includes("data-roadmap-action"), "Fiscal recovery roadmap cards should carry exact next-action ids.");
  assert(
    appJs.includes("bindCityActionPreview(button, () => button.dataset.roadmapMode, () => button.dataset.roadmapAction)"),
    "Fiscal recovery roadmap cards should preview their next action on hover/focus.",
  );
  assert(
    appJs.includes("focusRecoveryLever(button.dataset.roadmapPoint, button.dataset.roadmapMode, button.dataset.roadmapAction)"),
    "Fiscal recovery roadmap cards should focus their exact next action on click.",
  );
  assert(styles.includes(".fiscal-route-card"), "Recovery route roadmap cards need dedicated styling.");
  assert(styles.includes("button.fiscal-route-card"), "Clickable recovery route cards need button-specific styling.");
  assert(appJs.includes("pendingImpactSummary"), "Pending timeline should expose readable delayed-effect impact summaries.");
  assert(appJs.includes("data-pending-action"), "Pending timeline items should expose focusable preparation action hooks.");
  assert(appJs.includes("focusRecoveryLever(button.dataset.pendingPoint"), "Pending timeline action clicks should focus the exact preparation action.");
  assert(appJs.includes("\"若触发\""), "Conditional pending effects should be labeled as conditional rather than certain.");
  assert(styles.includes(".pending-impact"), "Pending impact summaries need dedicated styling.");
  assert(styles.includes(".pending-action"), "Pending preparation actions need dedicated styling.");
  assert(appJs.includes("summarizeTrendItems"), "Trend preview should include a readable overall trend summary.");
  assert(styles.includes(".trend-summary"), "Trend preview summary needs dedicated styling.");
  assert(appJs.includes("strategy-inertia"), "Strategy profile should render route inertia warnings.");
  assert(styles.includes(".strategy-inertia"), "Route inertia warnings need dedicated styling.");
  assert(appJs.includes("data-debt-action"), "Strategy debt warnings should expose focusable action hooks.");
  assert(appJs.includes("focusRecoveryLever(button.dataset.debtPoint"), "Strategy debt clicks should focus the exact response action.");
  assert(styles.includes(".strategy-debt.actionable"), "Clickable strategy debt warnings need dedicated styling.");
  assert(appJs.includes("renderStrategyLedger"), "Strategy profile should render a recent route ledger.");
  assert(styles.includes(".strategy-ledger"), "Recent route ledger needs dedicated styling.");
  assert(appJs.includes("renderActionFinderRouteTag"), "Action finder should render explicit strategy route tags.");
  assert(appJs.includes("core.getChoiceRouteTag({ id: item.id })"), "City action cards should derive route tags from their action id.");
  assert(styles.includes(".action-finder-route"), "Action finder route tags need dedicated styling.");
  assert(styles.includes(".action-card .action-finder-route"), "Map action cards should style route tags consistently.");
  assert(coreJs.includes("buildActionOpportunityQueue"), "Action finder should return a readable next-action queue.");
  assert(appJs.includes("renderActionQueue"), "Action finder should render the next-action queue summary.");
  assert(appJs.includes("action-queue-step"), "Action queue steps should be clickable map-action targets.");
  assert(styles.includes(".action-queue"), "Action queue summary needs dedicated styling.");
  assert(styles.includes(".action-finder-item.is-queue-primary"), "Primary queued action should be visually distinct.");
  assert(appJs.includes("renderChoiceRankBadge"), "Event choice buttons should render recommendation/rank badges from the comparison model.");
  assert(appJs.includes("renderChoiceDecisionTags"), "Event choice buttons should render compact decision tags.");
  assert(appJs.includes("choiceButtonComparisonClass"), "Event choice buttons should inherit comparison tone classes.");
  assert(styles.includes(".choice-rank-badge"), "Choice recommendation badges need dedicated styling.");
  assert(styles.includes(".choice-decision-tags"), "Choice decision tags need dedicated styling.");
  assert(styles.includes(".choice-button.choice-recommended"), "Recommended choice buttons should have a visible persistent state.");
  assert(appJs.includes("renderChoiceSettlementHint"), "Event choice buttons should explain that selecting them settles the day.");
  assert(indexHtml.includes("id=\"preSettlementHint\""), "Event panel should expose a top pre-settlement hint container.");
  assert(appJs.includes("renderPreSettlementHint"), "Event panel should render the top pre-settlement action hint.");
  assert(appJs.includes("data-pressure-action"), "Pressure summary action chips should carry exact action ids.");
  assert(
    appJs.includes("bindCityActionPreview(button, () => button.dataset.pressureMode, () => button.dataset.pressureAction)"),
    "Pressure summary action chips should preview their target city action on hover/focus.",
  );
  assert(
    appJs.includes("focusRecoveryLever(button.dataset.pressurePoint, button.dataset.pressureMode, button.dataset.pressureAction)"),
    "Pressure summary action chips should focus the exact city action on click.",
  );
  assert(styles.includes("button.pressure-chip"), "Actionable pressure summary chips need button-specific styling.");
  assert(appJs.includes("pendingSettlementChoice"), "Event choice clicks should track a pending settlement confirmation.");
  assert(appJs.includes("shouldConfirmSettlementBeforeChoice"), "Event choice clicks should guard against settling with unused city action budget.");
  assert(appJs.includes("renderChoiceSettlementConfirm"), "Event choices should render a visible second-click confirmation state.");
  assert(appJs.includes("pendingCriticalChoice"), "Event choice clicks should track critical redline confirmations.");
  assert(appJs.includes("shouldConfirmCriticalChoice"), "Event choice clicks should guard high-risk redline choices.");
  assert(appJs.includes("renderChoiceCriticalConfirm"), "Event choices should render a visible critical-risk confirmation state.");
  assert(appJs.includes("pendingCriticalChoice = risk"), "Unused-action settlement confirmation should merge critical redline confirmation when both apply.");
  assert(appJs.includes("data-pre-settlement-action"), "Top pre-settlement hints should expose an action focus hook.");
  assert(appJs.includes("data-pre-settlement-undo"), "Top pre-settlement hints should expose an undo hook after a city action.");
  assert(appJs.includes("focusRecoveryLever("), "Top pre-settlement action hints should focus the exact map action.");
  assert(appJs.includes("core.getEventSettlementHint"), "Event choice settlement hints should use the core pre-settlement warning.");
  assert(appJs.includes("choice-settlement-hint ${escapeHtml(hint.tone"), "Event choice settlement hints should receive warning tone classes.");
  assert(coreJs.includes("getEventSettlementHint"), "Core should expose event settlement warnings for unused city action budget.");
  assert(appJs.includes("今日城市行动将定稿"), "Event choice settlement hint should warn that today's city actions become final.");
  assert(styles.includes(".choice-settlement-hint"), "Event settlement hints need dedicated styling.");
  assert(styles.includes(".choice-settlement-hint.warn"), "Unused-action settlement hints need a visible warning style.");
  assert(styles.includes(".choice-button.choice-awaiting-settlement"), "Event choices awaiting confirmation need a visible guard state.");
  assert(styles.includes(".choice-settlement-confirm"), "Second-click settlement confirmation needs dedicated styling.");
  assert(styles.includes(".choice-button.choice-awaiting-risk"), "Critical redline choices awaiting confirmation need a visible guard state.");
  assert(styles.includes(".choice-critical-confirm"), "Critical redline confirmation needs dedicated styling.");
  assert(styles.includes(".choice-settlement-confirm.has-risk"), "Merged settlement/risk confirmation needs a distinct danger style.");
  assert(styles.includes(".pre-settlement-hint"), "Top pre-settlement hints need dedicated styling.");
  assert(styles.includes(".pre-settlement-action"), "Top pre-settlement hint action buttons need dedicated styling.");
  assert(appJs.includes("renderCityBadgeGaps"), "City badge cards should render concrete remaining gaps.");
  assert(styles.includes(".city-badge-gaps"), "City badge gap chips need dedicated styling.");
  assert(appJs.includes("readStoredSave"), "Continue button should parse saved games through a shared helper.");
  assert(appJs.includes("summarizeStoredSave"), "Continue button should expose a readable save summary.");
  assert(appJs.includes("继续第 "), "Continue button title should show saved day.");
  assert(appJs.includes("没有可继续的存档"), "Continue button should clearly label missing saves.");
  assert(styles.includes(".icon-button.has-save"), "Continue button with a save should be visually distinct.");
  assert(styles.includes(".icon-button:disabled"), "Disabled topbar buttons should be visually muted.");
  assert(appJs.includes("focusCityActionCard"), "City action navigation should scroll to and highlight the exact target card.");
  assert(appJs.includes(".action-card.is-targeted"), "City action focus helper should mark the target card visibly.");
  assert(styles.includes(".action-card.is-targeted"), "Targeted city action cards need dedicated highlight styling.");
  assert(styles.includes("@keyframes actionTargetPulse"), "Targeted city action cards should pulse briefly after navigation.");
  assert(coreJs.includes("getCityActionLockPreview"), "Core should expose locked city action previews.");
  assert(appJs.includes("renderTrendItems(lockPreview.items"), "UI should render locked city action previews in the trend panel.");
  assert(appJs.includes("modeClass === \"is-lock\""), "Trend summary should support locked-action mode.");
  assert(styles.includes(".trend-preview.is-lock"), "Locked action previews need dedicated trend styling.");
  assert(appJs.includes("renderActionLockHint"), "Locked city action cards should render visible unlock hints.");
  assert(appJs.includes("previewCityAction(actionMode, item.id);"), "Clicking a locked city action button should show its lock preview.");
  assert(styles.includes(".action-lock-hint"), "Visible city action lock hints need dedicated styling.");
  assert(appJs.includes("renderActionExecutionHint"), "Available city action cards should explain immediate execution and budget cost.");
  assert(appJs.includes("事件前可撤销"), "Available city action cards should remind players that city actions are undoable before the daily event.");
  assert(styles.includes(".action-execution-hint"), "Execution/budget hints need dedicated styling.");
  assert(appJs.includes("action-forecast-summary"), "City action forecast chips should include a readable summary.");
  assert(styles.includes(".action-forecast-summary"), "City action forecast summaries need dedicated styling.");
  assert(appJs.includes("renderSettlementUndoAction"), "Immediate city action recaps should expose a visible undo action.");
  assert(appJs.includes("data-settlement-undo"), "Settlement undo buttons need a dedicated data hook.");
  assert(styles.includes(".settlement-undo-action"), "Settlement undo buttons need dedicated styling.");
  assert(indexHtml.includes("id=\"eventPanel\""), "Event panel should expose a stable scroll target after daily settlement.");
  assert(appJs.includes("postRenderFocus = \"event-settlement\""), "Event choices should mark the post-render event settlement focus.");
  assert(appJs.includes("applyPostRenderFocus()"), "Render pass should apply post-settlement focus after rebuilding UI.");
  assert(styles.includes(".event-panel.is-settlement-focus"), "Event panel should receive a visible settlement focus highlight.");
  assert(appJs.includes("focusCityBadgeAction"), "City badge cards should be clickable map-action targets.");
  assert(appJs.includes("data-badge-point"), "City badge cards should carry map target data attributes.");
  assert(styles.includes(".city-badge.actionable"), "Clickable city badges need dedicated styling.");
  assert(styles.includes(".city-badge-focus"), "City badge focus hints need dedicated styling.");
  assert(appJs.includes("renderStageObjectiveAction"), "Stage objectives should render a concrete focus action when available.");
  assert(appJs.includes("data-stage-action"), "Stage objective focus buttons need action data hooks.");
  assert(
    appJs.includes("bindCityActionPreview(button, () => button.dataset.stageMode, () => button.dataset.stageAction)"),
    "Stage objective focus buttons should preview the exact city action.",
  );
  assert(styles.includes(".stage-objective-action"), "Stage objective focus buttons need dedicated styling.");
  assert(appJs.includes("renderStageScheduleAction"), "Stage schedule should render a concrete preparation action when available.");
  assert(appJs.includes("data-schedule-action"), "Stage schedule preparation buttons need action data hooks.");
  assert(
    appJs.includes("bindCityActionPreview(button, () => button.dataset.scheduleMode, () => button.dataset.scheduleAction)"),
    "Stage schedule preparation buttons should support hover previews.",
  );
  assert(styles.includes(".stage-schedule-action"), "Stage schedule preparation buttons need dedicated styling.");
}

function run() {
  const { eventIds, phaseCounts } = validateEventCorpus();
  validateSchedule(eventIds);
  validateMapAndCityActions();
  validateNewsAssets();
  validateCacheVersions();
  validateRuntimeImageFallbacks();
  validateSettlementNarrativeUi();
  validateScenarios();
  validateTutorialCopy();
  validateRecoveryLevers();
  validateFiscalOutlook();
  validateCrisisDashboard();
  validateMicroRecoveryPressure();
  validateStatusEffectActions();
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
  validateActionPreviewCoverage();

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
