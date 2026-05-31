(function () {
  "use strict";

  const STORAGE_KEY = "linjiang72-save-v2";
  const ASSET_PATH = "./assets/";
  const ASSET_VERSION = "v36";
  const core = window.Linjiang72;

  let state = null;
  let actionMode = "operations";
  const MASCOT_FRAME_COUNT = 6;
  const MASCOT_ACTION_FRAME_MS = 118;
  const MASCOT_IDLE_FRAME_MS = 760;
  const mapView = { scale: 1, x: 0, y: 0 };
  const mapPointer = {
    active: false,
    moved: false,
    suppressClick: false,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
    pointerId: null,
  };

  const MAP_ZOOM_MIN = 1;
  const MAP_ZOOM_MAX = 2.8;
  const MAP_FOOTPRINTS = {
    hospital: { w: 12, h: 13, markerX: 55, markerY: 56 },
    stadium: { w: 18, h: 14, markerX: 51, markerY: 49 },
    market: { w: 19, h: 12, markerX: 49, markerY: 50 },
    road: { w: 25, h: 11, markerX: 54, markerY: 52 },
    school: { w: 16, h: 12, markerX: 49, markerY: 51 },
    factory: { w: 20, h: 17, markerX: 52, markerY: 51 },
    residents: { w: 18, h: 16, markerX: 52, markerY: 54 },
    volunteers: { w: 16, h: 13, markerX: 52, markerY: 53 },
  };
  const mascotTimers = new WeakMap();
  const MASCOT_ACTIONS = {
    dingdong: [
      { kind: "point", frames: [0, 1, 2, 3, 3, 2, 1, 0], text: "叮咚鸡：先把菜篮子稳住，城市才有耐心。" },
      { kind: "wave", frames: [0, 1, 2, 2, 1, 0], text: "叮咚鸡：感染下降不是终点，疲劳和信任也要看。" },
      { kind: "point", frames: [0, 1, 2, 3, 3, 2, 1, 0], text: "叮咚鸡：遇到坏消息，别急着一键硬压，先看代价。" },
      { kind: "point", frames: [0, 1, 2, 3, 3, 2, 1, 0], text: "叮咚鸡：发现率太低时，复工试点会很冒险。" },
      { kind: "cheer", frames: [0, 1, 2, 4, 4, 2, 1, 0], text: "叮咚鸡：第 12 天的阶段缓冲，是救最差指标的机会。" },
    ],
    dabai: [
      { kind: "point", frames: [0, 1, 2, 3, 3, 2, 1, 0], text: "大白：医疗负载接近 85，就该提前拆火。" },
      { kind: "cheer", frames: [0, 1, 2, 4, 4, 2, 1, 0], text: "大白：方舱建设能救急，但会吃资金、物资和人手。" },
      { kind: "wave", frames: [0, 1, 2, 2, 1, 0], text: "大白：健康码更适合发现率和信任都不差的时候。" },
      { kind: "wave", frames: [0, 1, 2, 2, 1, 0], text: "大白：基层疲劳超过 80，所有行动都会变钝。" },
      { kind: "point", frames: [0, 1, 2, 3, 3, 2, 1, 0], text: "大白：公开信息很强，但供应和医疗要跟得上。" },
    ],
  };
  const els = {
    startScreen: document.getElementById("startScreen"),
    gameScreen: document.getElementById("gameScreen"),
    endingScreen: document.getElementById("endingScreen"),
    startForm: document.getElementById("startForm"),
    newGameBtn: document.getElementById("newGameBtn"),
    continueBtn: document.getElementById("continueBtn"),
    tutorialBtn: document.getElementById("tutorialBtn"),
    startTutorialBtn: document.getElementById("startTutorialBtn"),
    closeTutorialBtn: document.getElementById("closeTutorialBtn"),
    tutorialStartBtn: document.getElementById("tutorialStartBtn"),
    tutorialOverlay: document.getElementById("tutorialOverlay"),
    mascotBubble: document.getElementById("mascotBubble"),
    endingRestartBtn: document.getElementById("endingRestartBtn"),
    dayLabel: document.getElementById("dayLabel"),
    phaseLabel: document.getElementById("phaseLabel"),
    difficultyLabel: document.getElementById("difficultyLabel"),
    fundsLabel: document.getElementById("fundsLabel"),
    fundsReadout: document.getElementById("fundsReadout"),
    stageName: document.getElementById("stageName"),
    stageDays: document.getElementById("stageDays"),
    stageProgressText: document.getElementById("stageProgressText"),
    stageProgressFill: document.getElementById("stageProgressFill"),
    stageSituation: document.getElementById("stageSituation"),
    stageFocus: document.getElementById("stageFocus"),
    stageChallenges: document.getElementById("stageChallenges"),
    metricsList: document.getElementById("metricsList"),
    detectedRate: document.getElementById("detectedRate"),
    policyStrictness: document.getElementById("policyStrictness"),
    publicMemory: document.getElementById("publicMemory"),
    statusEffects: document.getElementById("statusEffects"),
    briefStrip: document.getElementById("briefStrip"),
    pendingTimeline: document.getElementById("pendingTimeline"),
    cityMapWrap: document.getElementById("cityMapWrap"),
    mapStage: document.getElementById("mapStage"),
    mapHighlightLayer: document.getElementById("mapHighlightLayer"),
    resetMapView: document.getElementById("resetMapView"),
    mapHotspots: document.getElementById("mapHotspots"),
    mapInspector: document.getElementById("mapInspector"),
    mapHint: document.getElementById("mapHint"),
    eventType: document.getElementById("eventType"),
    eventTitle: document.getElementById("eventTitle"),
    pressureSummary: document.getElementById("pressureSummary"),
    eventBody: document.getElementById("eventBody"),
    eventSource: document.getElementById("eventSource"),
    eventSourceNote: document.getElementById("eventSourceNote"),
    eventVisual: document.getElementById("eventVisual"),
    eventImage: document.getElementById("eventImage"),
    choiceList: document.getElementById("choiceList"),
    alerts: document.getElementById("alerts"),
    operationsTab: document.getElementById("operationsTab"),
    resolutionsTab: document.getElementById("resolutionsTab"),
    actionFinder: document.getElementById("actionFinder"),
    operationsList: document.getElementById("operationsList"),
    newsList: document.getElementById("newsList"),
    historyList: document.getElementById("historyList"),
    endingTitle: document.getElementById("endingTitle"),
    endingSummary: document.getElementById("endingSummary"),
    endingScore: document.getElementById("endingScore"),
    endingMetrics: document.getElementById("endingMetrics"),
  };
  const PREVIEW_METRIC_BY_SHORT = Object.fromEntries([
    ...Object.entries(core.METRIC_META).map(([metric, meta]) => [meta.short, metric]),
    ...Object.entries(core.RESOURCE_META).map(([metric, meta]) => [meta.short, metric]),
  ]);

  function init() {
    els.startForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(els.startForm);
      startNewGame(data.get("difficulty") || "normal");
    });
    els.newGameBtn.addEventListener("click", () => showStart());
    els.continueBtn.addEventListener("click", continueGame);
    els.endingRestartBtn.addEventListener("click", () => showStart());
    els.tutorialBtn.addEventListener("click", openTutorial);
    els.startTutorialBtn.addEventListener("click", openTutorial);
    els.closeTutorialBtn.addEventListener("click", closeTutorial);
    els.tutorialStartBtn.addEventListener("click", closeTutorial);
    els.tutorialOverlay.addEventListener("click", (event) => {
      if (event.target === els.tutorialOverlay) closeTutorial();
    });
    document.addEventListener("click", handleMapTargetActivation);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (handleMapTargetActivation(event)) event.preventDefault();
    });
    initMapViewport();
    initMascots();
    els.operationsTab.addEventListener("click", () => {
      actionMode = "operations";
      renderActionMode();
    });
    els.resolutionsTab.addEventListener("click", () => {
      actionMode = "resolutions";
      renderActionMode();
    });

    updateContinueButton();
    showStart();
  }

  function initMascots() {
    document.querySelectorAll("[data-mascot]").forEach((button, index) => {
      setMascotFrame(button, index % 2);
      startMascotIdle(button, index % 2);
      button.addEventListener("click", () => playMascotAction(button));
    });
  }

  function setMascotFrame(button, frame) {
    const safeFrame = Math.max(0, Math.min(MASCOT_FRAME_COUNT - 1, frame));
    button.style.setProperty("--frame-shift", `${safeFrame * (-100 / MASCOT_FRAME_COUNT)}%`);
    button.dataset.frame = String(safeFrame);
  }

  function getMascotTimer(button) {
    const timer = mascotTimers.get(button) || {};
    mascotTimers.set(button, timer);
    return timer;
  }

  function startMascotIdle(button, initialFrame = 0) {
    const timer = getMascotTimer(button);
    timer.idleFrame = initialFrame % 2;
    if (timer.idle) window.clearInterval(timer.idle);
    timer.idle = window.setInterval(() => {
      if (button.dataset.action === "play") return;
      timer.idleFrame = timer.idleFrame === 0 ? 1 : 0;
      setMascotFrame(button, timer.idleFrame);
    }, MASCOT_IDLE_FRAME_MS);
  }

  function playMascotAction(button) {
    const type = button.dataset.mascot;
    const actions = MASCOT_ACTIONS[type] || MASCOT_ACTIONS.dingdong;
    const nextIndex = (Number(button.dataset.actionIndex || -1) + 1) % actions.length;
    const next = actions[nextIndex];
    const frames = next.frames || [0, 1, 2, 2, 1, 0];
    const timer = getMascotTimer(button);

    if (timer.play) window.clearTimeout(timer.play);
    button.dataset.actionIndex = String(nextIndex);
    button.dataset.action = "play";
    button.dataset.actionKind = next.kind || "wave";
    setMascotFrame(button, frames[0]);

    if (els.mascotBubble) {
      els.mascotBubble.textContent = next.text;
      els.mascotBubble.classList.toggle("from-dingdong", type === "dingdong");
      els.mascotBubble.classList.toggle("from-dabai", type === "dabai");
    }

    let frameIndex = 0;
    const advance = () => {
      frameIndex += 1;
      if (frameIndex >= frames.length) {
        timer.play = null;
        timer.idleFrame = 0;
        button.dataset.action = "idle";
        button.dataset.actionKind = "";
        setMascotFrame(button, 0);
        return;
      }
      setMascotFrame(button, frames[frameIndex]);
      timer.play = window.setTimeout(advance, MASCOT_ACTION_FRAME_MS);
    };

    timer.play = window.setTimeout(advance, MASCOT_ACTION_FRAME_MS);
  }

  function startNewGame(difficulty) {
    state = core.createGame({ difficulty });
    resetMapView();
    save();
    render();
  }

  function continueGame() {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("linjiang72-save-v1");
    if (!raw) return;
    try {
      state = core.importState(JSON.parse(raw));
      resetMapView();
      save();
      render();
    } catch (error) {
      console.error(error);
      localStorage.removeItem(STORAGE_KEY);
      showStart();
    }
  }

  function showStart() {
    state = null;
    els.startScreen.hidden = false;
    els.gameScreen.hidden = true;
    els.endingScreen.hidden = true;
    els.dayLabel.textContent = "第 1 天";
    els.phaseLabel.textContent = "阶段 1 / 6";
    els.difficultyLabel.textContent = "普通";
    els.fundsLabel.textContent = "资金 68";
    updateContinueButton();
  }

  function openTutorial() {
    els.tutorialOverlay.hidden = false;
  }

  function closeTutorial() {
    els.tutorialOverlay.hidden = true;
  }

  function updateContinueButton() {
    const hasSave = Boolean(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("linjiang72-save-v1"));
    els.continueBtn.disabled = !hasSave;
    els.continueBtn.title = hasSave ? "继续存档" : "没有存档";
  }

  function save() {
    if (!state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(core.exportState(state)));
    updateContinueButton();
  }

  function render() {
    if (!state) return;
    if (state.ended) {
      save();
      renderEnding();
      return;
    }

    els.startScreen.hidden = true;
    els.gameScreen.hidden = false;
    els.endingScreen.hidden = true;

    const difficulty = core.DIFFICULTIES[state.difficulty] || core.DIFFICULTIES.normal;
    els.dayLabel.textContent = `第 ${state.day} 天`;
    els.phaseLabel.textContent = `阶段 ${state.phase} / 6`;
    els.difficultyLabel.textContent = difficulty.label;
    els.fundsLabel.textContent = `资金 ${state.resources.funds}`;

    renderStageInfo();
    renderMetrics();
    renderBriefs();
    renderPendingTimeline();
    renderMap();
    renderEvent();
    renderAlerts();
    renderActionMode();
    renderNews();
    renderHistory();
  }

  function renderMetrics() {
    const visible = core.getVisibleMetrics(state);
    els.metricsList.innerHTML = "";
    core.CORE_METRICS.forEach((metric) => {
      const value = state.metrics[metric];
      const meta = core.METRIC_META[metric];
      const band = core.getRiskBand(metric, value);
      const article = document.createElement("article");
      article.className = `metric ${band}`;
      article.innerHTML = `
        <div class="metric-top">
          <span class="metric-name">${meta.label}</span>
          <span class="metric-value">${value}</span>
        </div>
        <div class="meter" aria-hidden="true">
          <div class="meter-fill" style="width:${value}%"></div>
        </div>
        <p>${metric === "infection" ? `报告值 ${visible.reportedInfection}；` : ""}${meta.description}</p>
      `;
      els.metricsList.appendChild(article);
    });

    els.fundsReadout.textContent = state.resources.funds;
    els.detectedRate.textContent = state.hidden.detectedRate;
    els.policyStrictness.textContent = state.hidden.policyStrictness;
    els.publicMemory.textContent = state.hidden.publicMemory;
    renderStatusEffects();
  }

  function renderStatusEffects() {
    if (!els.statusEffects) return;
    const effects = state.statusEffects || (core.getStatusEffects ? core.getStatusEffects(state) : []);
    if (!effects.length) {
      els.statusEffects.innerHTML = "<p class=\"empty-state\">暂无高低位状态。</p>";
      return;
    }
    els.statusEffects.innerHTML = effects
      .map((effect) => `
        <article class="status-effect ${escapeHtml(effect.tone)}">
          <strong>${escapeHtml(effect.label)}</strong>
          <p>${escapeHtml(effect.description)}</p>
        </article>
      `)
      .join("");
  }

  function renderStageInfo() {
    const info = core.getStageInfo(state);
    els.stageName.textContent = `${info.phase}. ${info.name}`;
    els.stageDays.textContent = info.days;
    els.stageProgressText.textContent = `${info.dayInPhase} / ${core.PHASE_SIZE}`;
    els.stageProgressFill.style.width = `${info.phaseProgress}%`;
    els.stageSituation.textContent = info.situation;
    els.stageFocus.textContent = info.focus;
    els.stageChallenges.innerHTML = "";
    info.challenges.forEach((challenge) => {
      const li = document.createElement("li");
      li.textContent = challenge;
      els.stageChallenges.appendChild(li);
    });
  }

  function renderBriefs() {
    els.briefStrip.innerHTML = "";
    core.getSystemReadouts(state).forEach((line, index) => {
      const item = document.createElement("div");
      item.className = "brief-item";
      item.innerHTML = `<span>${["疾控", "医院", "社区"][index] || "简报"}</span><strong>${escapeHtml(line)}</strong>`;
      els.briefStrip.appendChild(item);
    });
  }

  function renderPendingTimeline() {
    if (!els.pendingTimeline) return;
    const pending = [...(state.pendingEffects || [])]
      .sort((a, b) => a.dueDay - b.dueDay || String(a.label).localeCompare(String(b.label), "zh-Hans-CN"))
      .slice(0, 5);
    if (!pending.length) {
      els.pendingTimeline.innerHTML = `
        <div class="pending-head">
          <span>后续影响</span>
          <strong>0</strong>
        </div>
        <p class="pending-empty">暂无排队中的延迟后果。</p>
      `;
      return;
    }

    els.pendingTimeline.innerHTML = `
      <div class="pending-head">
        <span>后续影响</span>
        <strong>${state.pendingEffects.length}</strong>
      </div>
      <div class="pending-list">
        ${pending.map((item) => renderPendingItem(item)).join("")}
      </div>
    `;
  }

  function renderPendingItem(item) {
    const dayGap = item.dueDay - state.day;
    const dueText = dayGap <= 0 ? "今日" : dayGap === 1 ? "明日" : `${dayGap}日后`;
    const title = `${item.eventTitle || "后续"} · ${item.choiceLabel || item.label}`;
    const chips = renderEffectChips({
      resources: item.resources || {},
      effects: item.effects || {},
      hidden: item.hidden || {},
    });
    const condition = item.condition ? `<span class="pending-condition">${escapeHtml(conditionLabel(item.condition))}</span>` : "";
    const complete = item.completeProject ? "<span class=\"chip delay\">项目完成</span>" : "";
    return `
      <article class="pending-item">
        <div class="pending-item-top">
          <span>${escapeHtml(dueText)}</span>
          ${condition}
        </div>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(title)}</p>
        <div class="chips">${chips}${complete}</div>
      </article>
    `;
  }

  function conditionLabel(condition) {
    const labels = {
      staffFatigueAbove80: "疲劳>80时触发",
      staffFatigueAbove75: "疲劳>75时触发",
      trustBelow40: "信任<40时触发",
      trustBelow45: "信任<45时触发",
      trustAtLeast60: "信任≥60时触发",
      hospitalAtLeast80: "医疗≥80时触发",
      hospitalAbove85: "医疗>85时触发",
      suppliesBelow25: "物资<25时触发",
      detectedBelow50: "发现率<50时触发",
      fundsBelow20: "资金<20时触发",
      economyBelow40: "活力<40时触发",
    };
    return labels[condition] || "满足条件时触发";
  }

  function renderMap() {
    els.mapHotspots.innerHTML = "";
    renderMapHighlights();
    core.MAP_POINTS.forEach((point) => {
      const pointState = core.getMapPoint(state, point.id);
      const availableOps = pointState.operations.filter((item) => item.available).length;
      const availableRes = pointState.resolutions.filter((item) => item.available).length;
      const availableTotal = availableOps + availableRes;
      const footprint = getMapFootprint(point);
      const button = document.createElement("button");
      button.className = `map-hotspot ${point.type}${state.selectedMapPointId === point.id ? " active" : ""}${availableTotal ? " has-actions" : ""}`;
      button.type = "button";
      button.style.left = `${point.x}%`;
      button.style.top = `${point.y}%`;
      button.style.setProperty("--hit-w", `${footprint.w}%`);
      button.style.setProperty("--hit-h", `${footprint.h}%`);
      button.style.setProperty("--marker-x", `${footprint.markerX || 50}%`);
      button.style.setProperty("--marker-y", `${footprint.markerY || 50}%`);
      const actionHint = availableTotal
        ? `，可用${availableOps ? `${availableOps}项工程` : ""}${availableOps && availableRes ? "、" : ""}${availableRes ? `${availableRes}项决议` : ""}`
        : "";
      button.title = `${point.label}${actionHint}`;
      button.setAttribute("aria-label", `${point.label}${actionHint}`);
      button.innerHTML = `
        <span class="map-hotspot-label">${escapeHtml(point.label)}</span>
        ${availableTotal ? `<span class="map-hotspot-badge" aria-hidden="true">${availableTotal}</span>` : ""}
      `;
      const showHighlight = () => {
        setMapHighlight(point.id);
        els.mapHint.textContent = `悬停：${point.label}${availableTotal ? ` · 可用行动 ${availableTotal}` : ""}`;
      };
      const hideHighlight = () => {
        setMapHighlight(null);
        renderMapHint();
      };
      button.addEventListener("mouseenter", showHighlight);
      button.addEventListener("mouseleave", hideHighlight);
      button.addEventListener("pointerenter", showHighlight);
      button.addEventListener("pointerleave", hideHighlight);
      button.addEventListener("focus", showHighlight);
      button.addEventListener("blur", hideHighlight);
      button.addEventListener("click", () => {
        core.selectMapPoint(state, point.id);
        save();
        renderMap();
        renderActionMode();
      });
      els.mapHotspots.appendChild(button);
    });
    renderMapInspector();
  }

  function renderMapHighlights() {
    if (!els.mapHighlightLayer) return;
    els.mapHighlightLayer.innerHTML = core.MAP_POINTS.map((point) => `
      <img class="map-highlight" data-map-highlight="${point.id}" src="${ASSET_PATH}highlight-${point.id}.png?${ASSET_VERSION}" alt="">
    `).join("");
  }

  function setMapHighlight(pointId) {
    if (!els.mapHighlightLayer) return;
    els.mapHighlightLayer.querySelectorAll(".map-highlight").forEach((item) => {
      item.classList.toggle("hover", item.dataset.mapHighlight === pointId);
    });
  }

  function renderMapInspector() {
    const point = core.getMapPoint(state, state.selectedMapPointId);
    renderMapHint();
    const availableOps = point.operations.filter((item) => item.available).length;
    const availableRes = point.resolutions.filter((item) => item.available).length;
    const availableItems = [
      ...point.operations.filter((item) => item.available).map((item) => ({ ...item, kind: "工程" })),
      ...point.resolutions.filter((item) => item.available).map((item) => ({ ...item, kind: "决议" })),
    ];
    const availableList = availableItems.length
      ? `
        <div class="map-ready-list" aria-label="当前节点可用行动">
          ${availableItems.slice(0, 4).map((item) => `
            <button class="map-ready-item" type="button" data-mode="${item.kind === "工程" ? "operations" : "resolutions"}">
              <span>${escapeHtml(item.kind)}</span>
              <strong>${escapeHtml(item.label)}</strong>
            </button>
          `).join("")}
        </div>
      `
      : "<p class=\"map-ready-empty\">当前节点暂无可立即执行的行动。</p>";
    els.mapInspector.innerHTML = `
      <div>
        <p class="eyebrow">${point.type === "road" ? "道路节点" : point.type === "people" ? "人群节点" : "建筑节点"}</p>
        <h3>${escapeHtml(point.label)}</h3>
        <p>${escapeHtml(point.description)}</p>
        ${availableList}
      </div>
      <div class="map-stats">
        <span>可执行工程 <strong>${availableOps}</strong></span>
        <span>可通过决议 <strong>${availableRes}</strong></span>
      </div>
    `;
    els.mapInspector.querySelectorAll(".map-ready-item").forEach((button) => {
      button.addEventListener("click", () => {
        actionMode = button.dataset.mode === "resolutions" ? "resolutions" : "operations";
        renderActionMode();
      });
    });
  }

  function renderMapHint() {
    if (!state) return;
    const point = core.getMapPoint(state, state.selectedMapPointId);
    const zoomLabel = `${Math.round(mapView.scale * 100)}%`;
    const availableTotal = point.operations.filter((item) => item.available).length
      + point.resolutions.filter((item) => item.available).length;
    els.mapHint.textContent = `当前：${point.label} · 缩放 ${zoomLabel}${availableTotal ? ` · 可用行动 ${availableTotal}` : ""}`;
  }

  function getMapFootprint(point) {
    return MAP_FOOTPRINTS[point.id] || {
      w: point.type === "road" ? 18 : 12,
      h: point.type === "road" ? 9 : 12,
      markerX: 50,
      markerY: 50,
    };
  }

  function initMapViewport() {
    if (!els.cityMapWrap || !els.mapStage) return;

    els.cityMapWrap.addEventListener("wheel", onMapWheel, { passive: false });
    els.cityMapWrap.addEventListener("pointerdown", onMapPointerDown);
    els.cityMapWrap.addEventListener("pointermove", onMapPointerMove);
    els.cityMapWrap.addEventListener("pointerup", onMapPointerEnd);
    els.cityMapWrap.addEventListener("pointercancel", onMapPointerEnd);
    els.cityMapWrap.addEventListener(
      "click",
      (event) => {
        if (!mapPointer.suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
    els.resetMapView.addEventListener("click", resetMapView);
    window.addEventListener("resize", () => {
      clampMapView();
      applyMapTransform();
    });
    applyMapTransform();
  }

  function onMapWheel(event) {
    event.preventDefault();
    const nextScale = clamp(
      mapView.scale * (event.deltaY < 0 ? 1.14 : 0.88),
      MAP_ZOOM_MIN,
      MAP_ZOOM_MAX
    );
    zoomMapAt(event.clientX, event.clientY, nextScale);
  }

  function onMapPointerDown(event) {
    if (event.button !== 0) return;
    mapPointer.active = true;
    mapPointer.moved = false;
    mapPointer.pointerId = event.pointerId;
    mapPointer.startClientX = event.clientX;
    mapPointer.startClientY = event.clientY;
    mapPointer.startX = mapView.x;
    mapPointer.startY = mapView.y;
  }

  function onMapPointerMove(event) {
    if (!mapPointer.active || event.pointerId !== mapPointer.pointerId) return;
    const dx = event.clientX - mapPointer.startClientX;
    const dy = event.clientY - mapPointer.startClientY;
    if (!mapPointer.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      mapPointer.moved = true;
      els.cityMapWrap.classList.add("is-dragging");
      els.cityMapWrap.setPointerCapture(event.pointerId);
    }
    if (!mapPointer.moved) return;
    event.preventDefault();
    mapView.x = mapPointer.startX + dx;
    mapView.y = mapPointer.startY + dy;
    clampMapView();
    applyMapTransform();
  }

  function onMapPointerEnd(event) {
    if (!mapPointer.active || event.pointerId !== mapPointer.pointerId) return;
    if (els.cityMapWrap.hasPointerCapture(event.pointerId)) {
      els.cityMapWrap.releasePointerCapture(event.pointerId);
    }
    mapPointer.active = false;
    mapPointer.pointerId = null;
    els.cityMapWrap.classList.remove("is-dragging");
    if (mapPointer.moved) {
      mapPointer.suppressClick = true;
      window.setTimeout(() => {
        mapPointer.suppressClick = false;
      }, 0);
    }
  }

  function zoomMapAt(clientX, clientY, nextScale) {
    const rect = els.cityMapWrap.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - mapView.x) / mapView.scale;
    const worldY = (localY - mapView.y) / mapView.scale;

    mapView.scale = nextScale;
    mapView.x = localX - worldX * nextScale;
    mapView.y = localY - worldY * nextScale;
    clampMapView();
    applyMapTransform();
    renderMapHint();
  }

  function resetMapView() {
    mapView.scale = 1;
    mapView.x = 0;
    mapView.y = 0;
    applyMapTransform();
    renderMapHint();
  }

  function clampMapView() {
    const rect = els.cityMapWrap.getBoundingClientRect();
    if (mapView.scale <= MAP_ZOOM_MIN) {
      mapView.scale = MAP_ZOOM_MIN;
      mapView.x = 0;
      mapView.y = 0;
      return;
    }
    const minX = rect.width * (1 - mapView.scale);
    const minY = rect.height * (1 - mapView.scale);
    mapView.x = clamp(mapView.x, minX, 0);
    mapView.y = clamp(mapView.y, minY, 0);
  }

  function applyMapTransform() {
    if (!els.mapStage) return;
    els.mapStage.style.transform = `translate(${mapView.x}px, ${mapView.y}px) scale(${mapView.scale})`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function renderEvent() {
    const event = core.getCurrentEvent(state);
    els.eventType.textContent = event.type === "buffer" ? "阶段缓冲" : "今日事件";
    els.eventTitle.textContent = event.title;
    renderPressureSummary();
    els.eventBody.textContent = event.description || event.body;
    if (event.sourceNote) {
      els.eventSource.hidden = false;
      els.eventSource.open = false;
      els.eventSourceNote.textContent = event.sourceNote;
    } else {
      els.eventSource.hidden = true;
      els.eventSource.open = false;
      els.eventSourceNote.textContent = "";
    }
    els.eventImage.src = `${ASSET_PATH + event.image}?${ASSET_VERSION}`;
    els.eventImage.alt = `${event.title} 配图`;
    els.eventVisual.dataset.motion = motionForEventImage(event.image, event.imageKey);
    els.eventVisual.dataset.key = event.imageKey || "default";
    els.choiceList.innerHTML = "";

    event.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.disabled = choice.available === false;
      const chips = choice.effectPreview
        .map((item) => `<span class="chip ${chipClassForPreview(item)}" title="${escapeHtml(previewChipTitle(item))}">${escapeHtml(item)}</span>`)
        .join("");
      const routeTag = choice.routeTag || (core.getChoiceRouteTag ? core.getChoiceRouteTag(choice) : null);
      const tag = routeTag
        ? `<span class="route-tag ${routeTag.tone || "neutral"}">${escapeHtml(routeTag.label)}</span>`
        : "";
      button.innerHTML = `
        <div class="choice-title"><strong>${escapeHtml(choice.label)}</strong>${tag}</div>
        <p>${escapeHtml(choice.available === false ? choice.lockedReason : choice.description)}</p>
        <div class="chips">${chips}</div>
      `;
      button.addEventListener("click", () => {
        if (choice.available === false) return;
        core.resolveChoice(state, choice.id);
        save();
        render();
      });
      els.choiceList.appendChild(button);
    });
  }

  function renderPressureSummary() {
    if (!els.pressureSummary || !core.getDailyPressureSummary) return;
    const items = core.getDailyPressureSummary(state);
    if (!items.length) {
      els.pressureSummary.hidden = true;
      els.pressureSummary.innerHTML = "";
      return;
    }
    els.pressureSummary.hidden = false;
    els.pressureSummary.innerHTML = items
      .map((item) => `
        <span class="pressure-chip ${item.tone || "info"}" title="${escapeHtml(item.detail)}">
          <strong>${escapeHtml(item.label)}</strong>
          <em>${escapeHtml(item.detail)}</em>
        </span>
      `)
      .join("");
  }

  function handleMapTargetActivation(event) {
    const target =
      event.target instanceof Element ? event.target.closest("[data-map-target]") : null;
    if (!target || !state) return false;
    const mapTarget = target.getAttribute("data-map-target");
    if (!mapTarget) return false;

    core.selectMapPoint(state, mapTarget);
    save();
    renderMap();
    renderActionMode();
    return true;
  }

  function motionForEventImage(image, imageKey = "") {
    if (["notice", "code"].includes(imageKey)) return "code";
    if (["clinic", "hospital"].includes(imageKey)) return "medical";
    if (["market", "community"].includes(imageKey)) return "supply";
    if (["station", "transport", "factory", "budget"].includes(imageKey)) return "factory";
    if (["shelter", "memory"].includes(imageKey)) return "shelter";
    if (!image) return "default";
    if (image.includes("hospital")) return "medical";
    if (image.includes("supply")) return "supply";
    if (image.includes("health-code")) return "code";
    if (image.includes("factory")) return "factory";
    if (image.includes("shelter")) return "shelter";
    return "default";
  }

  function renderAlerts() {
    els.alerts.innerHTML = "";
    state.alerts.forEach((alert) => {
      const item = document.createElement("div");
      item.className = "alert";
      item.textContent = alert;
      els.alerts.appendChild(item);
    });
  }

  function renderActionMode() {
    if (!state) return;
    els.operationsTab.classList.toggle("active", actionMode === "operations");
    els.resolutionsTab.classList.toggle("active", actionMode === "resolutions");
    renderActionFinder();
    const point = core.getMapPoint(state, state.selectedMapPointId);
    const items = actionMode === "operations" ? point.operations : point.resolutions;
    els.operationsList.innerHTML = "";

    if (!items.length) {
      els.operationsList.innerHTML = "<p class=\"empty-state\">这个节点暂时没有对应行动。</p>";
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = `action-card${item.available ? "" : " locked"}`;
      const lockDetail = item.available ? "" : item.lockedDetail || item.lockedReason || "";
      if (lockDetail) {
        card.setAttribute("data-lock-detail", lockDetail);
        card.setAttribute("title", lockDetail);
        card.tabIndex = 0;
      }
      const preview = renderEffectChips(item);
      card.innerHTML = `
        <div class="action-card-main">
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.description)}</p>
          <div class="chips">${preview}</div>
        </div>
        <button class="small-action" type="button" ${item.available ? "" : "aria-disabled=\"true\""} ${lockDetail ? `title="${escapeHtml(lockDetail)}"` : ""}>
          ${item.available ? "执行" : escapeHtml(item.lockedReason)}
        </button>
      `;
      const button = card.querySelector("button");
      button.addEventListener("click", () => {
        if (!item.available) return;
        if (actionMode === "operations") core.executeOperation(state, item.id);
        else core.executeResolution(state, item.id);
        save();
        render();
      });
      els.operationsList.appendChild(card);
    });
  }

  function renderActionFinder() {
    if (!els.actionFinder) return;
    const cityActions = collectCityActions();
    if (!cityActions.length) {
      els.actionFinder.innerHTML = `
        <div class="action-finder-head">
          <span>全城可用</span>
          <strong>0</strong>
        </div>
        <p class="action-finder-empty">暂无立即可执行的工程或决议，先处理今日事件或改善条件。</p>
      `;
      return;
    }

    els.actionFinder.innerHTML = `
      <div class="action-finder-head">
        <span>全城可用</span>
        <strong>${cityActions.length}</strong>
      </div>
      <div class="action-finder-list">
        ${cityActions.slice(0, 6).map(({ point, item, mode, kind }) => `
          <button class="action-finder-item" type="button" data-point-id="${point.id}" data-mode="${mode}">
            <span>${escapeHtml(kind)} · ${escapeHtml(point.label)}</span>
            <strong>${escapeHtml(item.label)}</strong>
          </button>
        `).join("")}
      </div>
    `;

    els.actionFinder.querySelectorAll(".action-finder-item").forEach((button) => {
      button.addEventListener("click", () => {
        core.selectMapPoint(state, button.dataset.pointId);
        actionMode = button.dataset.mode === "resolutions" ? "resolutions" : "operations";
        save();
        renderMap();
        renderActionMode();
      });
    });
  }

  function collectCityActions() {
    const seen = new Set();
    const actions = [];
    core.MAP_POINTS.forEach((mapPoint) => {
      const point = core.getMapPoint(state, mapPoint.id);
      [
        { mode: "operations", kind: "工程", items: point.operations },
        { mode: "resolutions", kind: "决议", items: point.resolutions },
      ].forEach((group) => {
        group.items
          .filter((item) => item.available)
          .forEach((item) => {
            const key = `${group.mode}:${item.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            actions.push({ point, item, mode: group.mode, kind: group.kind });
          });
      });
    });
    return actions.sort((a, b) => {
      if (a.point.id === state.selectedMapPointId && b.point.id !== state.selectedMapPointId) return -1;
      if (b.point.id === state.selectedMapPointId && a.point.id !== state.selectedMapPointId) return 1;
      if (a.mode !== b.mode) return a.mode === "operations" ? -1 : 1;
      return a.item.label.localeCompare(b.item.label, "zh-Hans-CN");
    });
  }

  function renderEffectChips(item) {
    const effects = typeof item.effects === "function" ? item.effects(state) : item.effects || {};
    const hidden = typeof item.hidden === "function" ? item.hidden(state) : item.hidden || {};
    const resources = item.resources || {};
    const all = [
      ...Object.entries(resources).map(([metric, delta]) => [metric, delta, core.RESOURCE_META[metric]]),
      ...Object.entries(effects).map(([metric, delta]) => [metric, delta, core.METRIC_META[metric]]),
      ...Object.entries(hidden).map(([metric, delta]) => [metric, delta, core.METRIC_META[metric]]),
    ];
    const chips = all
      .filter(([, delta, meta]) => delta && meta)
      .slice(0, 5)
      .map(([metric, delta, meta]) => `<span class="chip ${changeClass(metric, delta)}" title="${escapeHtml(meta.description)}">${meta.short} ${delta > 0 ? "+" : ""}${delta}</span>`);
    if (item.delayed) chips.push(`<span class="chip delay">${item.delayed.delay}日后：${escapeHtml(item.delayed.label)}</span>`);
    return chips.join("");
  }

  function renderNews() {
    els.newsList.innerHTML = "";
    state.news.forEach((item) => {
      const card = document.createElement("article");
      card.className = "news-card";
      card.innerHTML = `
        <img src="${ASSET_PATH + item.image}?${ASSET_VERSION}" alt="${escapeHtml(item.title)} 配图">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </div>
      `;
      els.newsList.appendChild(card);
    });
  }

  function renderHistory() {
    els.historyList.innerHTML = "";
    if (!state.history.length) {
      const empty = document.createElement("li");
      empty.innerHTML = "<span class=\"history-meta\">尚无记录</span><strong>第一份日志会在今天决策后生成。</strong>";
      els.historyList.appendChild(empty);
      return;
    }

    state.history.forEach((entry) => {
      const li = document.createElement("li");
      const changes = Object.entries(entry.changes)
        .map(([metric, delta]) => {
          const meta = core.METRIC_META[metric] || core.RESOURCE_META[metric];
          if (!meta) return "";
          return `<span class="change ${changeClass(metric, delta)}" title="${escapeHtml(meta.description)}">${meta.short} ${delta > 0 ? "+" : ""}${delta}</span>`;
        })
        .join("");
      li.innerHTML = `
        <span class="history-meta">第 ${entry.day} 天 / 阶段 ${entry.phase}</span>
        <strong>${escapeHtml(entry.choice)}</strong>
        <p>${escapeHtml(entry.title)}</p>
        <div class="change-list">${changes}</div>
      `;
      els.historyList.appendChild(li);
    });
  }

  function renderEnding() {
    els.startScreen.hidden = true;
    els.gameScreen.hidden = true;
    els.endingScreen.hidden = false;

    els.dayLabel.textContent = `第 ${state.day} 天`;
    els.phaseLabel.textContent = "归档";
    els.difficultyLabel.textContent = (core.DIFFICULTIES[state.difficulty] || core.DIFFICULTIES.normal).label;
    els.fundsLabel.textContent = `资金 ${state.resources.funds}`;

    els.endingTitle.textContent = state.ending.title;
    els.endingSummary.textContent = state.ending.summary;
    els.endingScore.textContent = `综合评分 ${state.ending.scoreText}`;
    els.endingMetrics.innerHTML = "";
    [...core.CORE_METRICS, ...core.RESOURCE_METRICS].forEach((metric) => {
      const meta = core.METRIC_META[metric] || core.RESOURCE_META[metric];
      const value = state.metrics[metric] ?? state.resources[metric];
      const item = document.createElement("div");
      item.innerHTML = `<span>${meta.label}</span><strong>${value}</strong>`;
      els.endingMetrics.appendChild(item);
    });
  }

  function changeClass(metric, delta) {
    const meta = core.METRIC_META[metric] || core.RESOURCE_META[metric];
    if (!meta) return "neutral";
    if (meta.direction === "good") return delta >= 0 ? "good-change" : "bad-change";
    if (meta.direction === "danger") return delta <= 0 ? "good-change" : "bad-change";
    return "mixed-change";
  }

  function chipClassForPreview(text) {
    const value = String(text);
    if (/^\d+日后/.test(value)) return "delay";
    const match = value.match(/^(.+?)\s*([+-]\d+)/);
    if (!match) return "neutral";
    const metric = PREVIEW_METRIC_BY_SHORT[match[1].trim()];
    if (!metric) return "neutral";
    return changeClass(metric, Number(match[2]));
  }

  function previewChipTitle(text) {
    const value = String(text);
    if (/^\d+日后/.test(value)) return "延迟后果，会在之后的每日结算中触发。";
    const match = value.match(/^(.+?)\s*([+-]\d+)/);
    if (!match) return "";
    const metric = PREVIEW_METRIC_BY_SHORT[match[1].trim()];
    const meta = metric && (core.METRIC_META[metric] || core.RESOURCE_META[metric]);
    return meta ? meta.description : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  init();
})();
