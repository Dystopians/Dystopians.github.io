(function () {
  "use strict";

  const STORAGE_KEY = "linjiang72-save-v2";
  const ASSET_PATH = "./assets/";
  const ASSET_VERSION = "v120";
  const EVENT_IMAGE_FALLBACK = "news-hospital.png";
  const NEWS_IMAGE_FALLBACK = "news-supply.png";
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
  const CITY_ASSET_REGISTRY = [
    {
      id: "shelterHospital",
      label: "方舱医院",
      kind: "工程",
      detail: "临时收治空间已进入城市调度表，方舱收治标准和医疗分流会更有意义。",
      completeProject: "shelterHospital",
    },
    {
      id: "healthCode",
      label: "健康码系统",
      kind: "工程",
      detail: "数字通行、核验和申诉系统已铺开，监测治理与复工白名单更稳定。",
      completeProject: "healthCode",
    },
    {
      id: "supplyCorridor",
      label: "保供专线",
      kind: "工程",
      detail: "货运白名单和配送线路已经稳定，供应恢复和夜间货运窗口会有更强支撑。",
      completeProject: "supplyCorridor",
    },
    {
      id: "triageNetwork",
      label: "分级诊疗网络",
      kind: "工程",
      detail: "社区转诊与分流流程开始磨合，医院每日压力会被持续削减。",
      completeProject: "triageNetwork",
    },
    {
      id: "communityClinic",
      label: "社区临时门诊",
      kind: "工程",
      detail: "轻症咨询和慢病续方前移，普通医院获得额外分流能力。",
      completeProject: "communityClinic",
    },
    {
      id: "campusSentinel",
      label: "校园哨点筛查",
      kind: "节点",
      detail: "学校片区症状报告和家庭筛查已铺开，早期发现能力获得补强。",
      operation: "campusSentinel",
    },
    {
      id: "volunteerDispatch",
      label: "志愿者调度站",
      kind: "节点",
      detail: "志愿者排班和物资登记纳入统一调度，保供末端更有韧性。",
      operation: "volunteerDispatch",
    },
    {
      id: "mentalHealthLine",
      label: "心理与轮休热线",
      kind: "节点",
      detail: "基层、医护和居民的减压入口已经建立，疲劳与创伤有了长期缓冲。",
      operation: "mentalHealthLine",
    },
    {
      id: "factoryClosedLoop",
      label: "工厂闭环复工",
      kind: "节点",
      detail: "工业园闭环产能恢复，财政和城市活力获得恢复窗口。",
      operation: "factoryClosedLoop",
    },
    {
      id: "taxFeeDeferralDesk",
      label: "税费社保缓缴窗口",
      kind: "财政",
      detail: "小微商户和关键企业获得缴费缓冲，城市活力被更早托住。",
      operation: "taxFeeDeferralDesk",
    },
    {
      id: "fiscalTransparencyLedger",
      label: "财政透明台账",
      kind: "财政",
      detail: "应急采购、捐赠和拨付开始可追踪，信任能更稳定地转成协作资金。",
      operation: "fiscalTransparencyLedger",
    },
    {
      id: "emergencyGapLedger",
      label: "应急缺口清单",
      kind: "财政",
      detail: "医院、保供、社区和企业缺口被整理成可核验清单，早期拨付有了抓手。",
      operation: "emergencyGapLedger",
    },
    {
      id: "emergencyAccountClearing",
      label: "小额账款清分",
      kind: "财政",
      detail: "可延期、可核销和必须支付的账目被拆开，早期现金流获得小幅缓冲。",
      operation: "emergencyAccountClearing",
    },
    {
      id: "essentialServicePermit",
      label: "民生服务保留名录",
      kind: "节点",
      detail: "药店、菜摊和维修点以限流方式保留，最低城市运转没有完全熄火。",
      operation: "essentialServicePermit",
    },
    {
      id: "livelihoodStaggeredReopen",
      label: "民生网点分时复业",
      kind: "节点",
      detail: "药店、菜店和维修网点开始错峰恢复，前期烟火气被小心托住。",
      operation: "livelihoodStaggeredReopen",
    },
    {
      id: "closedLoopSmallShift",
      label: "保供工厂小班闭环",
      kind: "节点",
      detail: "保供相关产线以小班闭环运行，库存和城市活力有了早期支点。",
      operation: "closedLoopSmallShift",
    },
    {
      id: "contactlessServiceRegistry",
      label: "无接触商铺备案",
      kind: "节点",
      detail: "药店、菜店和维修点以预约取货与门外交接恢复，城市活力获得早期支撑。",
      operation: "contactlessServiceRegistry",
    },
    {
      id: "neighborhoodPickupWindow",
      label: "社区预约取货窗口",
      kind: "节点",
      detail: "菜店、药店和团购点转为分时预约，城市微循环被更早托住。",
      operation: "neighborhoodPickupWindow",
    },
    {
      id: "microFreightPermit",
      label: "货运微循环许可",
      kind: "节点",
      detail: "药品、生鲜和工业原料车辆获得短时段许可，城市微循环被谨慎托住。",
      operation: "microFreightPermit",
    },
    {
      id: "rentDeferralCoordination",
      label: "小微租金缓缴协调",
      kind: "财政",
      detail: "小微主体的租金和服务费获得缓冲，城市活力有了低速恢复空间。",
      operation: "rentDeferralCoordination",
    },
    {
      id: "remoteWorkGovServices",
      label: "线上政务与远程办公",
      kind: "节点",
      detail: "企业申报、通行咨询和低风险岗位转到线上，城市运转能力被保留下来。",
      operation: "remoteWorkGovServices",
    },
    {
      id: "remoteApprovalDesk",
      label: "线上预审窗口",
      kind: "节点",
      detail: "采购报销、通行材料和小微申报先在线预审，街面不动但后台开始恢复。",
      operation: "remoteApprovalDesk",
    },
    {
      id: "essentialMaintenanceRoster",
      label: "必要维修预约窗",
      kind: "节点",
      detail: "水电、燃气、药房设备和必要维修进入预约白单，城市机能少掉一些断点。",
      operation: "essentialMaintenanceRoster",
    },
    {
      id: "donationCoordination",
      label: "社会捐助统筹",
      kind: "财政",
      detail: "捐助专户和缺口清单开始对齐，资金与物资能够更快转成实际补位。",
      operation: "donationCoordination",
    },
    {
      id: "donationClaimList",
      label: "捐助认领清单",
      kind: "财政",
      detail: "社会捐助被拆成可认领的小缺口，善意更容易转成现金流和物资补位。",
      operation: "donationClaimList",
    },
    {
      id: "platformLogisticsShare",
      label: "平台运力共担协议",
      kind: "财政",
      detail: "配送平台、药店和商超接入临时共担协议，保供末端和活力都获得缓冲。",
      operation: "platformLogisticsShare",
    },
    {
      id: "procurementCreditNegotiation",
      label: "采购账期谈判",
      kind: "财政",
      detail: "部分采购付款被后移，短期现金流得到缓冲，但后续账期仍会回来。",
      operation: "procurementCreditNegotiation",
    },
    {
      id: "specialFundingApplication",
      label: "专项资金申报",
      kind: "财政",
      detail: "医院、保供和复产缺口已整理上报，财政到账会形成短期缓冲。",
      operation: "specialFundingApplication",
    },
    {
      id: "budgetReallocationMeeting",
      label: "预算重排会议",
      kind: "财政",
      detail: "恢复期和非急迫项目预算转入应急账本，资金压力被短期压低。",
      operation: "budgetReallocationMeeting",
    },
  ];
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
    stageTransitionBrief: document.getElementById("stageTransitionBrief"),
    stageObjectives: document.getElementById("stageObjectives"),
    endingOutlook: document.getElementById("endingOutlook"),
    stageSchedule: document.getElementById("stageSchedule"),
    stageChallenges: document.getElementById("stageChallenges"),
    metricsList: document.getElementById("metricsList"),
    detectedRate: document.getElementById("detectedRate"),
    policyStrictness: document.getElementById("policyStrictness"),
    publicMemory: document.getElementById("publicMemory"),
    statusEffects: document.getElementById("statusEffects"),
    crisisList: document.getElementById("crisisList"),
    briefStrip: document.getElementById("briefStrip"),
    fiscalOutlook: document.getElementById("fiscalOutlook"),
    recoveryLevers: document.getElementById("recoveryLevers"),
    pendingTimeline: document.getElementById("pendingTimeline"),
    strategyProfile: document.getElementById("strategyProfile"),
    cityMapWrap: document.getElementById("cityMapWrap"),
    mapStage: document.getElementById("mapStage"),
    mapHighlightLayer: document.getElementById("mapHighlightLayer"),
    resetMapView: document.getElementById("resetMapView"),
    mapHotspots: document.getElementById("mapHotspots"),
    mapSignals: document.getElementById("mapSignals"),
    mapInspector: document.getElementById("mapInspector"),
    mapHint: document.getElementById("mapHint"),
    eventType: document.getElementById("eventType"),
    eventTitle: document.getElementById("eventTitle"),
    pressureSummary: document.getElementById("pressureSummary"),
    dailyDirective: document.getElementById("dailyDirective"),
    trendPreview: document.getElementById("trendPreview"),
    eventBody: document.getElementById("eventBody"),
    eventStageReview: document.getElementById("eventStageReview"),
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
    cityBadges: document.getElementById("cityBadges"),
    assetList: document.getElementById("assetList"),
    newsList: document.getElementById("newsList"),
    historyList: document.getElementById("historyList"),
    endingTitle: document.getElementById("endingTitle"),
    endingSummary: document.getElementById("endingSummary"),
    endingScore: document.getElementById("endingScore"),
    endingMetrics: document.getElementById("endingMetrics"),
    endingReview: document.getElementById("endingReview"),
    scenarioBrief: document.getElementById("scenarioBrief"),
  };
  const PREVIEW_METRIC_BY_SHORT = Object.fromEntries([
    ...Object.entries(core.METRIC_META).map(([metric, meta]) => [meta.short, metric]),
    ...Object.entries(core.RESOURCE_META).map(([metric, meta]) => [meta.short, metric]),
  ]);

  function init() {
    els.startForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(els.startForm);
      startNewGame(data.get("difficulty") || "normal", data.get("scenario") || "standard");
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
    els.startForm.querySelectorAll("input[name='difficulty'], input[name='scenario']").forEach((input) => {
      input.addEventListener("change", renderScenarioBrief);
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

  function startNewGame(difficulty, scenario = "standard") {
    state = core.createGame({ difficulty, scenario });
    resetMapView();
    save();
    render();
    resetPageScroll();
  }

  function continueGame() {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("linjiang72-save-v1");
    if (!raw) return;
    try {
      state = core.importState(JSON.parse(raw));
      resetMapView();
      save();
      render();
      resetPageScroll();
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
    els.difficultyLabel.textContent = "普通 · 标准档案";
    els.fundsLabel.textContent = "资金 68";
    updateContinueButton();
    renderScenarioBrief();
    resetPageScroll();
  }

  function renderScenarioBrief() {
    if (!els.scenarioBrief || !core.getScenarioBriefing) return;
    const data = new FormData(els.startForm);
    const brief = core.getScenarioBriefing({
      difficulty: data.get("difficulty") || "normal",
      scenario: data.get("scenario") || "standard",
    });
    const changes = Object.keys(brief.changes || {}).length
      ? renderChangeChips(brief.changes, 8)
      : "<span class=\"change neutral\">保持标准开局</span>";
    const readouts = (brief.readouts || [])
      .map((item) => `
        <span class="${escapeHtml(item.tone || "warn")}" title="${escapeHtml(item.description || "")}">
          ${escapeHtml(item.short)} ${escapeHtml(String(item.value))}
        </span>
      `)
      .join("");
    const priorities = (brief.priorities || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
    els.scenarioBrief.innerHTML = `
      <div class="scenario-brief-head">
        <span>档案情报</span>
        <strong>${escapeHtml(brief.difficultyLabel)} · ${escapeHtml(brief.label)}</strong>
      </div>
      <p>${escapeHtml(brief.summary)}</p>
      <div class="scenario-readouts" aria-label="开局读数">${readouts}</div>
      <div class="chips">${changes}</div>
      ${priorities ? `<ul>${priorities}</ul>` : ""}
    `;
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

  function resetPageScroll() {
    const reset = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    };
    reset();
    window.requestAnimationFrame(() => {
      reset();
      window.requestAnimationFrame(reset);
    });
    window.setTimeout(reset, 80);
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
    const scenario = core.SCENARIOS && core.SCENARIOS[state.scenario] ? core.SCENARIOS[state.scenario] : null;
    els.dayLabel.textContent = `第 ${state.day} 天`;
    els.phaseLabel.textContent = `阶段 ${state.phase} / 6`;
    els.difficultyLabel.textContent = scenario ? `${difficulty.label} · ${scenario.label}` : difficulty.label;
    els.fundsLabel.textContent = `资金 ${state.resources.funds}`;

    renderStageInfo();
    renderMetrics();
    renderBriefs();
    renderFiscalOutlook();
    renderRecoveryLevers();
    renderPendingTimeline();
    renderStrategyProfile();
    renderMap();
    renderEvent();
    renderAlerts();
    renderActionMode();
    renderCityBadges();
    renderCityAssets();
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
        ${renderMetricTrend(metric)}
        <p>${metric === "infection" ? `报告值 ${visible.reportedInfection}；` : ""}${meta.description}</p>
      `;
      els.metricsList.appendChild(article);
    });

    els.fundsReadout.textContent = state.resources.funds;
    els.detectedRate.textContent = state.hidden.detectedRate;
    els.policyStrictness.textContent = state.hidden.policyStrictness;
    els.publicMemory.textContent = state.hidden.publicMemory;
    renderResourceReadoutTrends();
    renderStatusEffects();
    renderCrisisBoard();
  }

  function renderMetricTrend(metric) {
    if (!core.getMetricTrend) return "";
    const trend = core.getMetricTrend(state, metric, 6);
    if (!trend || !Array.isArray(trend.values)) return "";
    const bars = trend.values
      .map((value) => {
        const height = Math.max(4, Math.min(28, Math.round(value * 0.28)));
        return `<i style="height:${height}px" title="${escapeHtml(String(value))}" aria-hidden="true"></i>`;
      })
      .join("");
    return `
      <div class="metric-trend ${escapeHtml(trend.tone)}" title="${escapeHtml(trend.detail)}">
        <span>${escapeHtml(trend.summary)}</span>
        <div>${bars}</div>
      </div>
    `;
  }

  function renderResourceReadoutTrends() {
    if (!core.getMetricTrend) return;
    document.querySelectorAll("[data-resource-metric]").forEach((node) => {
      const metric = node.dataset.resourceMetric;
      const trend = core.getMetricTrend(state, metric, 6);
      if (!trend || !Array.isArray(trend.values)) return;
      let trendNode = node.querySelector(".readout-trend");
      if (!trendNode) {
        trendNode = document.createElement("div");
        trendNode.className = "readout-trend";
        node.appendChild(trendNode);
      }
      const bars = trend.values
        .map((value) => {
          const height = Math.max(3, Math.min(18, Math.round(value * 0.18)));
          return `<i style="height:${height}px" title="${escapeHtml(String(value))}" aria-hidden="true"></i>`;
        })
        .join("");
      trendNode.className = `readout-trend ${escapeHtml(trend.tone || "neutral")}`;
      trendNode.title = trend.detail;
      trendNode.innerHTML = `
        <span>${escapeHtml(trend.summary)}</span>
        <div class="readout-trend-bars">${bars}</div>
      `;
    });
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

  function renderCrisisBoard() {
    if (!els.crisisList || !core.getCrisisDashboard) return;
    const risks = core.getCrisisDashboard(state);
    if (!risks.length) {
      els.crisisList.innerHTML = "<p class=\"empty-state\">暂无失败预警。</p>";
      return;
    }
    els.crisisList.innerHTML = risks
      .map((risk) => `
        <article class="crisis-row ${escapeHtml(risk.tone)}">
          <div class="crisis-row-top">
            <strong>${escapeHtml(risk.label)}</strong>
            <span>${escapeHtml(risk.status)}</span>
          </div>
          <div class="crisis-track" aria-hidden="true">
            <i style="width:${Math.max(0, Math.min(100, risk.progress))}%"></i>
          </div>
          <p>${escapeHtml(risk.metricShort)} ${risk.value} · ${escapeHtml(risk.thresholdText)}</p>
          <em title="${escapeHtml(risk.detail)}">${escapeHtml(risk.hint)}</em>
          ${renderCrisisReliefActions(risk)}
          ${risk.tone === "good" ? "" : `<button class="crisis-jump" type="button" data-crisis-target="${escapeHtml(risk.focusPointId)}" data-crisis-mode="${escapeHtml(risk.focusMode)}" data-crisis-action="${escapeHtml(risk.focusActionId || "")}">
            ${escapeHtml(risk.focusLabel || "定位补救")}
          </button>`}
        </article>
      `)
      .join("");
    els.crisisList.querySelectorAll("[data-crisis-target]").forEach((button) => {
      bindCityActionPreview(button, () => button.dataset.crisisMode, () => button.dataset.crisisAction);
      button.addEventListener("click", () => {
        focusCrisisTarget(button.dataset.crisisTarget, button.dataset.crisisMode, button.dataset.crisisAction);
      });
    });
  }

  function renderCrisisReliefActions(risk) {
    if (risk.tone === "good") return "";
    const actions = risk.reliefActions || [];
    if (!actions.length) {
      return "<p class=\"crisis-empty\">暂无直接可用补救，先改善资金、条件或处理今日事件。</p>";
    }
    return `
      <div class="crisis-relief-list" aria-label="${escapeHtml(risk.label)}候选补救">
        ${actions.map((action) => `
          <button class="crisis-relief" type="button" data-crisis-target="${escapeHtml(action.pointId)}" data-crisis-mode="${escapeHtml(action.mode)}" data-crisis-action="${escapeHtml(action.id)}">
            <span>${escapeHtml(action.kind)} · ${escapeHtml(action.pointLabel)}</span>
            <strong>${escapeHtml(action.label)}</strong>
            <em>${escapeHtml(action.effectText)}</em>
          </button>
        `).join("")}
      </div>
    `;
  }

  function focusCrisisTarget(pointId, preferredMode = "operations", actionId = "") {
    if (!pointId) return;
    core.selectMapPoint(state, pointId);
    const point = core.getMapPoint(state, pointId);
    actionMode = chooseCrisisActionMode(point, preferredMode);
    save();
    renderMap();
    renderActionMode();
    renderCityBadges();
    renderCityAssets();
    renderCrisisBoard();
    previewCityAction(actionMode, actionId);
    const pointLabel = point ? point.label : "补救节点";
    els.mapHint.textContent = `已定位：${pointLabel} · 查看${actionMode === "resolutions" ? "决议" : "工程"}`;
    if (els.operationsList && typeof els.operationsList.scrollIntoView === "function") {
      els.operationsList.scrollIntoView({ block: "nearest" });
    }
  }

  function chooseCrisisActionMode(point, preferredMode) {
    if (!point) return preferredMode === "resolutions" ? "resolutions" : "operations";
    const hasAvailable = (items) => items.some((item) => item.available);
    const preferredItems = preferredMode === "resolutions" ? point.resolutions : point.operations;
    const alternateItems = preferredMode === "resolutions" ? point.operations : point.resolutions;
    if (hasAvailable(preferredItems)) return preferredMode;
    if (hasAvailable(alternateItems)) return preferredMode === "resolutions" ? "operations" : "resolutions";
    return preferredMode === "resolutions" ? "resolutions" : "operations";
  }

  function renderStageInfo() {
    const info = core.getStageInfo(state);
    els.stageName.textContent = `${info.phase}. ${info.name}`;
    els.stageDays.textContent = info.days;
    els.stageProgressText.textContent = `${info.dayInPhase} / ${core.PHASE_SIZE}`;
    els.stageProgressFill.style.width = `${info.phaseProgress}%`;
    els.stageSituation.textContent = info.situation;
    els.stageFocus.textContent = info.focus;
    renderStageTransitionBrief();
    renderStageObjectives();
    renderEndingOutlook();
    renderStageSchedule();
    els.stageChallenges.innerHTML = "";
    info.challenges.forEach((challenge) => {
      const li = document.createElement("li");
      li.textContent = challenge;
      els.stageChallenges.appendChild(li);
    });
  }

  function renderStageTransitionBrief() {
    if (!els.stageTransitionBrief || !core.getStageTransitionBrief) return;
    const brief = core.getStageTransitionBrief(state);
    if (!brief) {
      els.stageTransitionBrief.hidden = true;
      els.stageTransitionBrief.innerHTML = "";
      return;
    }
    els.stageTransitionBrief.hidden = false;
    els.stageTransitionBrief.className = `stage-transition-brief ${escapeHtml(brief.tone || "info")}`;
    els.stageTransitionBrief.innerHTML = `
      <div class="stage-transition-head">
        <span>${escapeHtml(brief.subtitle || "")}</span>
        <strong>${escapeHtml(brief.title || "阶段交接")}</strong>
        <em>${escapeHtml(brief.pressureLabel || "")}</em>
      </div>
      <p>${escapeHtml(brief.focus || brief.situation || "")}</p>
      <div class="stage-transition-objectives">
        ${(brief.objectives || []).map((item) => `
          <span class="${escapeHtml(item.tone || "warn")}" title="${escapeHtml(item.detail || "")}">
            ${escapeHtml(item.label)} · ${escapeHtml(item.done ? "已达成" : item.targetText)}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderStageObjectives() {
    if (!els.stageObjectives || !core.getStageObjectives) return;
    const objectives = core.getStageObjectives(state);
    if (!objectives.length) {
      els.stageObjectives.innerHTML = "";
      return;
    }
    els.stageObjectives.innerHTML = objectives
      .map((objective) => `
        <article class="stage-objective ${escapeHtml(objective.tone)}">
          <div>
            <strong>${escapeHtml(objective.label)}</strong>
            <span>${escapeHtml(objective.done ? "已达成" : objective.targetText)}</span>
          </div>
          <p>${escapeHtml(objective.detail)}</p>
          <em>${escapeHtml(objective.metricShort)} ${objective.value}</em>
        </article>
      `)
      .join("");
  }

  function renderEndingOutlook() {
    if (!els.endingOutlook || !core.getEndingOutlook) return;
    const outlook = core.getEndingOutlook(state);
    if (!outlook) {
      els.endingOutlook.innerHTML = "";
      return;
    }
    const drivers = (outlook.drivers || []).slice(0, 3);
    const driverList = drivers.length
      ? `
        <div class="ending-driver-list" aria-label="主要扣分项">
          ${drivers.map((item) => `
            <span class="${escapeHtml(item.tone || "warn")}" title="${escapeHtml(item.detail || "")}">
              ${escapeHtml(item.label)} ${escapeHtml(String(item.value))} · ${escapeHtml(item.status)}
            </span>
          `).join("")}
        </div>
      `
      : "";
    const clocks = (outlook.riskClocks || []).slice(0, 3);
    const clockList = clocks.length
      ? `
        <div class="ending-clock-list" aria-label="失败倒计时">
          ${clocks.map((item) => `
            <span class="${escapeHtml(item.tone || "warn")}" title="${escapeHtml(item.detail || "")}">
              ${escapeHtml(item.label)} ${escapeHtml(item.status)} · ${escapeHtml(item.threshold)}
            </span>
          `).join("")}
        </div>
      `
      : "";
    els.endingOutlook.innerHTML = `
      <article class="ending-outlook-card ${escapeHtml(outlook.tone)}">
        <div>
          <span>归档预估</span>
          <strong>${escapeHtml(outlook.scoreText)}</strong>
        </div>
        <h3>${escapeHtml(outlook.title)}</h3>
        <p>${escapeHtml(outlook.detail)}</p>
        <em>${escapeHtml(outlook.nextText)}</em>
        ${driverList}
        ${clockList}
      </article>
    `;
  }

  function renderStageSchedule() {
    if (!els.stageSchedule || !core.getStageSchedule) return;
    const items = core.getStageSchedule(state);
    if (!items.length) {
      els.stageSchedule.innerHTML = "";
      return;
    }
    els.stageSchedule.innerHTML = `
      <div class="stage-schedule-head">
        <span>本阶段公共节点</span>
        <strong>${items.length}</strong>
      </div>
      <div class="stage-schedule-list">
        ${items.map((item) => `
          <article class="stage-schedule-item ${escapeHtml(item.tone)}" title="${escapeHtml(`${item.reason || ""} ${item.conditionDetail || ""}`.trim())}">
            <span>${escapeHtml(item.relative)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <em>${escapeHtml(item.status)}</em>
            ${item.conditionDetail ? `<p class="${escapeHtml(item.conditionTone || "waiting")}">${escapeHtml(item.conditionLabel || "条件")} · ${escapeHtml(item.conditionDetail)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    `;
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

  function renderFiscalOutlook() {
    if (!els.fiscalOutlook || !core.getFiscalOutlook) return;
    const report = core.getFiscalOutlook(state);
    const items = (report.items || []).slice(0, 3);
    const activeAssets = (report.activeAssets || []).slice(0, 4);
    const assetList = activeAssets.length
      ? `
        <div class="fiscal-assets" aria-label="生效恢复资产">
          <span>生效资产</span>
          ${activeAssets.map((asset) => `<em>${escapeHtml(asset)}</em>`).join("")}
        </div>
      `
      : "";
    els.fiscalOutlook.innerHTML = `
      <div class="fiscal-head">
        <div>
          <span>${escapeHtml(report.label || "财政与活力")}</span>
          <p>${escapeHtml(report.detail || "")}</p>
        </div>
        <strong class="${escapeHtml(report.tone || "info")}">${escapeHtml(report.lockedByFunds ? `${report.lockedByFunds}锁` : "账本")}</strong>
      </div>
      <div class="fiscal-grid">
        ${items.map((item) => `
          <article class="fiscal-item ${escapeHtml(item.tone || "info")}" title="${escapeHtml(item.detail || "")}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            ${(item.components || []).length ? "" : `<p>${escapeHtml(item.detail || "")}</p>`}
            ${renderFiscalComponents(item)}
          </article>
        `).join("")}
      </div>
      ${assetList}
    `;
  }

  function renderFiscalComponents(item) {
    const components = (item.components || []).slice(0, 3);
    if (!components.length) return "";
    return `
      <div class="fiscal-components" aria-label="${escapeHtml(item.label || "联动")}拆解">
        ${components.map((component) => `
          <span class="${escapeHtml(component.tone || "info")}" title="${escapeHtml(component.detail || "")}">
            ${escapeHtml(component.label)} ${Number(component.value) > 0 ? "+" : ""}${escapeHtml(String(component.value))}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderRecoveryLevers() {
    if (!els.recoveryLevers || !core.getRecoveryLevers) return;
    const report = core.getRecoveryLevers(state);
    const items = (report.items || []).slice(0, 7);
    const countText = `${report.availableCount || 0}/${report.totalCount || 0}`;
    const headerTone = report.tone || "info";
    if (!items.length) {
      els.recoveryLevers.innerHTML = `
        <div class="recovery-head">
          <span>恢复渠道</span>
          <strong class="${escapeHtml(headerTone)}">${escapeHtml(countText)}</strong>
        </div>
        <p class="recovery-empty">暂无明确资金或活力恢复窗口，先稳住感染、医疗和基层执行。</p>
      `;
      return;
    }

    els.recoveryLevers.innerHTML = `
      <div class="recovery-head">
        <span>恢复渠道</span>
        <strong class="${escapeHtml(headerTone)}" title="${escapeHtml(report.detail || "")}">${escapeHtml(countText)}</strong>
      </div>
      <p class="recovery-summary">${escapeHtml(report.detail || "资金与城市活力会影响工程、供应恢复和最终归档。")}</p>
      <div class="recovery-list">
        ${items.map((item) => `
          <button class="recovery-item ${escapeHtml(item.tone || "info")} ${escapeHtml(item.bucket || "locked")}" type="button"
            data-recovery-point="${escapeHtml(item.pointId)}" data-recovery-mode="${escapeHtml(item.mode)}"
            title="${escapeHtml(item.detail)}">
            <span>${escapeHtml(item.status)} · ${escapeHtml(item.pointLabel)} · ${escapeHtml(item.route)}</span>
            <strong>${escapeHtml(item.label)}</strong>
            <em>${escapeHtml(item.impact)}</em>
            ${renderRecoveryUnlockHint(item)}
          </button>
        `).join("")}
      </div>
    `;

    els.recoveryLevers.querySelectorAll("[data-recovery-point]").forEach((button) => {
      button.addEventListener("click", () => {
        focusRecoveryLever(button.dataset.recoveryPoint, button.dataset.recoveryMode);
      });
    });
  }

  function renderRecoveryUnlockHint(item) {
    if (!item || item.bucket === "available") return "";
    const prefix = item.bucket === "established" ? "已铺垫" : "解锁";
    const detail = item.detail || item.lockedReason || "";
    if (!detail) return "";
    return `<small class="recovery-unlock">${escapeHtml(prefix)}：${escapeHtml(detail)}</small>`;
  }

  function focusRecoveryLever(pointId, preferredMode = "operations") {
    if (!pointId) return;
    core.selectMapPoint(state, pointId);
    const point = core.getMapPoint(state, pointId);
    actionMode = chooseCrisisActionMode(point, preferredMode);
    save();
    renderMap();
    renderActionMode();
    renderCityAssets();
    renderCrisisBoard();
    const pointLabel = point ? point.label : "恢复节点";
    els.mapHint.textContent = `已定位：${pointLabel} · 查看${actionMode === "resolutions" ? "决议" : "工程"}恢复渠道`;
    if (els.operationsList && typeof els.operationsList.scrollIntoView === "function") {
      els.operationsList.scrollIntoView({ block: "nearest" });
    }
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

  function renderStrategyProfile() {
    if (!els.strategyProfile || !core.getStrategyProfile) return;
    const profile = core.getStrategyProfile(state);
    if (!profile) {
      els.strategyProfile.innerHTML = "";
      return;
    }
    const routes = (profile.routes || []).slice(0, 5);
    const routeList = routes.length
      ? routes.map((route) => `
        <article class="strategy-route ${escapeHtml(route.tone || "neutral")}">
          <div>
            <strong>${escapeHtml(route.label)}</strong>
            <span>${escapeHtml(String(route.count))}次 · ${escapeHtml(String(route.percent))}%</span>
          </div>
          <i aria-hidden="true"><b style="width:${Math.max(0, Math.min(100, route.percent || 0))}%"></b></i>
        </article>
      `).join("")
      : "<p class=\"strategy-empty\">尚未形成路线。</p>";
    const blindSpot = profile.blindSpot
      ? `<p class="strategy-blindspot ${escapeHtml(profile.blindSpot.tone || "warn")}"><strong>${escapeHtml(profile.blindSpot.label)}</strong>${escapeHtml(profile.blindSpot.detail)}</p>`
      : "";
    const inertia = profile.inertia
      ? `
        <div class="strategy-inertia ${escapeHtml(profile.inertia.tone || "warn")}">
          <span>${escapeHtml(profile.inertia.status || "路线惯性")}</span>
          <strong>${escapeHtml(profile.inertia.routeLabel)} ${escapeHtml(String(profile.inertia.percent))}%</strong>
          <p>${escapeHtml(profile.inertia.detail)}</p>
          <em>${escapeHtml(profile.inertia.complementLabel)}</em>
        </div>
      `
      : "";
    const debts = (profile.debts || []).slice(0, 3);
    const debtList = debts.length
      ? `
        <div class="strategy-debt-list" aria-label="路线债务">
          ${debts.map((item) => `
            <article class="strategy-debt ${escapeHtml(item.tone || "info")}" title="${escapeHtml(item.detail)}">
              <span>${escapeHtml(item.status || "需要盯防")} · ${escapeHtml(item.label)} ${escapeHtml(String(item.value))}</span>
              <strong>${escapeHtml(item.detail)}</strong>
            </article>
          `).join("")}
        </div>
      `
      : "";
    const recommendations = (profile.recommendations || []).slice(0, 3);
    const recommendationList = recommendations.length
      ? `
        <div class="strategy-rec-list">
          ${recommendations.map((item) => `
            <button class="strategy-rec ${escapeHtml(item.tone || "info")}${item.locked ? " locked" : ""}" type="button"
              data-mode="${escapeHtml(item.mode || "")}" data-point-id="${escapeHtml(item.pointId || "")}"
              data-action-id="${escapeHtml(item.actionId || "")}"
              data-choice-id="${escapeHtml(item.choiceId || "")}" title="${escapeHtml(item.detail)}">
              <span>${escapeHtml(item.kind)} · ${escapeHtml(item.status)}${item.pointLabel ? ` · ${escapeHtml(item.pointLabel)}` : ""}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <em>${escapeHtml(item.detail)}</em>
            </button>
          `).join("")}
        </div>
      `
      : "<p class=\"strategy-rec-empty\">暂无明确配套建议，先处理今日最高压力。</p>";
    els.strategyProfile.innerHTML = `
      <div class="strategy-profile-head">
        <span>治理路线</span>
        <strong class="${escapeHtml(profile.tone || "info")}">${escapeHtml(profile.label)}</strong>
      </div>
      <p>${escapeHtml(profile.detail)}</p>
      ${inertia}
      <div class="strategy-route-list">${routeList}</div>
      ${blindSpot}
      ${debtList}
      <div class="strategy-recommendations">
        <span>配套建议</span>
        ${recommendationList}
      </div>
    `;
    els.strategyProfile.querySelectorAll(".strategy-rec").forEach((button) => {
      bindChoicePreview(button, () => button.dataset.choiceId);
      bindCityActionPreview(button, () => button.dataset.mode, () => button.dataset.actionId);
      button.addEventListener("click", () => {
        const choiceId = button.dataset.choiceId;
        if (choiceId) {
          focusChoiceOption(choiceId);
          return;
        }
        if (button.dataset.pointId) {
          core.selectMapPoint(state, button.dataset.pointId);
          if (button.dataset.mode) {
            actionMode = button.dataset.mode === "resolutions" ? "resolutions" : "operations";
          }
          save();
          renderMap();
          renderActionMode();
          previewCityAction(actionMode, button.dataset.actionId);
          els.mapHint.textContent = `已定位配套建议：${core.getMapPoint(state, button.dataset.pointId).label}`;
          els.cityMapWrap.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
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
    const conditionReady = item.condition ? core.isConditionMet(state, item.condition) : true;
    const condition = item.condition
      ? `<span class="pending-condition ${conditionReady ? "is-ready" : "is-waiting"}">${escapeHtml(conditionLabel(item.condition))} · ${conditionReady ? "当前满足" : "当前未满足"}</span>`
      : "<span class=\"pending-condition is-ready\">必定触发</span>";
    const complete = item.completeProject ? "<span class=\"chip delay\">项目完成</span>" : "";
    return `
      <article class="pending-item">
        <div class="pending-item-top">
          <span>${escapeHtml(dueText)}</span>
          ${condition}
        </div>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(title)}</p>
        <small class="pending-impact">${escapeHtml(pendingImpactSummary(item))}</small>
        <div class="chips">${chips}${complete}</div>
      </article>
    `;
  }

  function pendingImpactSummary(item) {
    const parts = [];
    const add = (source, metaMap) => {
      Object.entries(source || {}).forEach(([metric, delta]) => {
        const meta = metaMap[metric];
        if (!meta || !delta) return;
        parts.push(`${meta.short} ${delta > 0 ? "+" : ""}${delta}`);
      });
    };
    add(item.resources, core.RESOURCE_META || {});
    add(item.effects, core.METRIC_META || {});
    add(item.hidden, core.METRIC_META || {});
    if (item.completeProject) parts.push("项目完成");
    const prefix = item.condition ? "若触发" : "预计";
    return parts.length
      ? `${prefix}：${parts.slice(0, 5).join(" / ")}`
      : `${prefix}：仅记录后续叙事变化`;
  }

  function conditionLabel(condition) {
    const labels = {
      staffFatigueAbove80: "疲劳>80时触发",
      staffFatigueAbove75: "疲劳>75时触发",
      trustBelow40: "信任<40时触发",
      trustBelow45: "信任<45时触发",
      trustAtLeast55: "信任≥55时触发",
      trustAtLeast60: "信任≥60时触发",
      hospitalAtLeast80: "医疗≥80时触发",
      hospitalAbove85: "医疗>85时触发",
      suppliesBelow25: "物资<25时触发",
      detectedBelow50: "发现率<50时触发",
      detectedAtLeast50: "发现率≥50时触发",
      fundsBelow20: "资金<20时触发",
      economyBelow40: "活力<40时触发",
    };
    return labels[condition] || "满足条件时触发";
  }

  function delayedChipText(delayed) {
    const condition = delayed.condition ? `（条件：${conditionLabel(delayed.condition).replace("时触发", "")}）` : "";
    const effects = delayedEffectText(delayed);
    return `${delayed.delay}日后：${delayed.label}${effects ? ` · ${effects}` : ""}${condition}`;
  }

  function delayedEffectText(delayed) {
    const entries = [
      ...Object.entries(delayed.resources || {}).map(([metric, delta]) => [metric, delta, core.RESOURCE_META[metric]]),
      ...Object.entries(delayed.effects || {}).map(([metric, delta]) => [metric, delta, core.METRIC_META[metric]]),
      ...Object.entries(delayed.hidden || {}).map(([metric, delta]) => [metric, delta, core.METRIC_META[metric]]),
    ].filter(([, delta, meta]) => delta && meta);
    return entries
      .slice(0, 3)
      .map(([, delta, meta]) => `${meta.short} ${delta > 0 ? "+" : ""}${delta}`)
      .join("、");
  }

  function renderMap() {
    els.mapHotspots.innerHTML = "";
    renderMapHighlights();
    const mapSignals = core.getMapSignals ? core.getMapSignals(state) : [];
    core.MAP_POINTS.forEach((point) => {
      const pointState = core.getMapPoint(state, point.id);
      const pointStatus = core.getMapPointStatus ? core.getMapPointStatus(state, point.id) : null;
      const pointSignal = mapSignals.find((item) => item.pointId === point.id);
      const availableOps = pointState.operations.filter((item) => item.available).length;
      const availableRes = pointState.resolutions.filter((item) => item.available).length;
      const availableTotal = availableOps + availableRes;
      const footprint = getMapFootprint(point);
      const button = document.createElement("button");
      button.className = `map-hotspot ${point.type}${state.selectedMapPointId === point.id ? " active" : ""}${availableTotal ? " has-actions" : ""}${pointStatus ? ` status-${pointStatus.tone}` : ""}${pointSignal ? ` has-signal signal-${pointSignal.tone}` : ""}`;
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
      const statusHint = pointStatus ? `，${pointStatus.label}${pointStatus.value}` : "";
      button.title = `${point.label}${statusHint}${actionHint}`;
      button.setAttribute("aria-label", `${point.label}${statusHint}${actionHint}`);
      button.innerHTML = `
        <span class="map-hotspot-label">${escapeHtml(point.label)}</span>
        ${pointStatus ? `
          <span class="map-status-chip ${escapeHtml(pointStatus.tone)}" title="${escapeHtml(pointStatus.detail)}">
            <strong>${escapeHtml(pointStatus.short)}</strong>
            <em>${escapeHtml(String(pointStatus.value))}</em>
          </span>
        ` : ""}
        ${pointSignal ? `<span class="map-signal-dot ${escapeHtml(pointSignal.tone)}" title="${escapeHtml(pointSignal.detail)}">!</span>` : ""}
        ${availableTotal ? `<span class="map-hotspot-badge" aria-hidden="true">${availableTotal}</span>` : ""}
      `;
      const showHighlight = () => {
        setMapHighlight(point.id);
        els.mapHint.textContent = `悬停：${point.label}${pointSignal ? ` · ${pointSignal.label}` : ""}${pointStatus ? ` · ${pointStatus.short} ${pointStatus.value}` : ""}${availableTotal ? ` · 可用行动 ${availableTotal}` : ""} · ${cityActionBudgetText()}`;
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
    renderMapSignals(mapSignals);
    renderMapInspector();
  }

  function renderMapSignals(signals = []) {
    if (!els.mapSignals) return;
    if (!signals.length) {
      els.mapSignals.innerHTML = `
        <div class="map-signals-head">
          <span>城市信号</span>
          <strong>0</strong>
        </div>
        <p class="map-signals-empty">暂无高优先地图信号，当前可按事件和行动窗口推进。</p>
      `;
      return;
    }
    els.mapSignals.innerHTML = `
      <div class="map-signals-head">
        <span>城市信号</span>
        <strong>${signals.length}</strong>
      </div>
      <div class="map-signal-list">
        ${signals.map((signal) => `
          <button class="map-signal-item ${escapeHtml(signal.tone || "info")}" type="button"
            data-point-id="${escapeHtml(signal.pointId)}" data-mode="${escapeHtml(signal.mode || "")}"
            title="${escapeHtml(signal.detail)}">
            <span>${escapeHtml(signal.pointLabel)} · ${escapeHtml(signal.status || "观察")}</span>
            <strong>${escapeHtml(signal.label)}</strong>
            <em>${escapeHtml(signal.detail)}</em>
          </button>
        `).join("")}
      </div>
    `;
    els.mapSignals.querySelectorAll(".map-signal-item").forEach((button) => {
      button.addEventListener("click", () => {
        core.selectMapPoint(state, button.dataset.pointId);
        if (button.dataset.mode) {
          actionMode = button.dataset.mode === "resolutions" ? "resolutions" : "operations";
        }
        save();
        renderMap();
        renderActionMode();
        els.mapHint.textContent = `已定位城市信号：${core.getMapPoint(state, button.dataset.pointId).label}`;
      });
    });
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
            <button class="map-ready-item" type="button" data-mode="${item.kind === "工程" ? "operations" : "resolutions"}" data-action-id="${escapeHtml(item.id)}">
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
      bindCityActionPreview(button, () => button.dataset.mode, () => button.dataset.actionId);
      button.addEventListener("click", () => {
        actionMode = button.dataset.mode === "resolutions" ? "resolutions" : "operations";
        renderActionMode();
        previewCityAction(actionMode, button.dataset.actionId);
      });
    });
  }

  function renderMapHint() {
    if (!state) return;
    const point = core.getMapPoint(state, state.selectedMapPointId);
    const zoomLabel = `${Math.round(mapView.scale * 100)}%`;
    const availableTotal = point.operations.filter((item) => item.available).length
      + point.resolutions.filter((item) => item.available).length;
    els.mapHint.textContent = `当前：${point.label} · 缩放 ${zoomLabel}${availableTotal ? ` · 可用行动 ${availableTotal}` : ""} · ${cityActionBudgetText()}`;
  }

  function cityActionBudgetText() {
    const budget = core.getCityActionBudget(state);
    return `今日调度 ${budget.remaining}/${budget.limit}`;
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
    renderDailyDirective();
    renderTrendPreview();
    els.eventBody.textContent = event.description || event.body;
    renderEventStageReview(event.stageReview);
    if (event.sourceNote) {
      els.eventSource.hidden = false;
      els.eventSource.open = false;
      els.eventSourceNote.textContent = event.sourceNote;
    } else {
      els.eventSource.hidden = true;
      els.eventSource.open = false;
      els.eventSourceNote.textContent = "";
    }
    els.eventVisual.dataset.motion = motionForEventImage(event.image, event.imageKey);
    els.eventVisual.dataset.key = event.imageKey || "default";
    setManagedImage(
      els.eventImage,
      event.image,
      `${event.title} 配图`,
      EVENT_IMAGE_FALLBACK,
      els.eventVisual,
    );
    els.choiceList.innerHTML = "";
    const comparison = renderChoiceComparison();
    if (comparison) {
      els.choiceList.insertAdjacentHTML("beforeend", comparison);
      bindChoiceComparison();
    }

    event.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.disabled = choice.available === false;
      button.dataset.choiceId = choice.id;
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
        ${renderChoiceFit(choice)}
        ${renderChoiceDirectiveFit(choice)}
        ${renderChoiceImpacts(choice)}
        ${renderChoiceForecast(choice)}
        ${renderChoiceRiskPreview(choice)}
        <div class="chips">${chips}</div>
      `;
      button.addEventListener("click", () => {
        if (choice.available === false) return;
        core.resolveChoice(state, choice.id);
        save();
        render();
      });
      button.addEventListener("mouseenter", () => renderTrendPreview(choice));
      button.addEventListener("pointerenter", () => renderTrendPreview(choice));
      button.addEventListener("focus", () => renderTrendPreview(choice));
      button.addEventListener("mouseleave", () => renderTrendPreview());
      button.addEventListener("pointerleave", () => renderTrendPreview());
      button.addEventListener("blur", () => renderTrendPreview());
      els.choiceList.appendChild(button);
    });
  }

  function renderChoiceComparison() {
    if (!core.getChoiceComparison) return "";
    const comparison = core.getChoiceComparison(state);
    const items = comparison && comparison.items ? comparison.items : [];
    if (!items.length) return "";
    return `
      <section class="choice-comparison ${escapeHtml(comparison.tone || "info")}" aria-label="三案对比">
        <div class="choice-comparison-head">
          <span>${escapeHtml(comparison.label || "三案对比")}</span>
          <strong>${escapeHtml(comparison.detail || "")}</strong>
        </div>
        <div class="choice-comparison-list">
          ${items.map((item) => `
            <button class="choice-compare-item ${escapeHtml(item.tone || "info")}${item.recommended ? " recommended" : ""}" type="button"
              data-compare-choice="${escapeHtml(item.choiceId || "")}" title="${escapeHtml(item.detail || "")}">
              <span>${escapeHtml(item.recommended ? "建议" : item.rank ? `#${item.rank}` : "锁定")} · ${escapeHtml(item.routeLabel || "综合路线")}</span>
              <strong>${escapeHtml(item.label || "策略取舍")}</strong>
              <em>${escapeHtml(item.detail || "")}</em>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function bindChoiceComparison() {
    els.choiceList.querySelectorAll("[data-compare-choice]").forEach((button) => {
      bindChoicePreview(button, () => button.dataset.compareChoice);
      button.addEventListener("click", () => {
        const choiceId = button.dataset.compareChoice;
        focusChoiceOption(choiceId);
      });
    });
  }

  function renderChoiceFit(choice) {
    if (!core.getChoiceFit) return "";
    const fit = core.getChoiceFit(state, choice.id);
    if (!fit) return "";
    return `
      <div class="choice-fit ${escapeHtml(fit.tone || "info")}" title="${escapeHtml(fit.detail || "")}">
        <span>适配</span>
        <strong>${escapeHtml(fit.label || "策略取舍")}</strong>
        <em>${escapeHtml(fit.detail || "")}</em>
      </div>
    `;
  }

  function renderChoiceDirectiveFit(choice) {
    if (!core.getChoiceDirectiveFit) return "";
    const fit = core.getChoiceDirectiveFit(state, choice.id);
    if (!fit) return "";
    return `
      <div class="choice-directive ${escapeHtml(fit.tone || "info")}" title="${escapeHtml(fit.detail || "")}">
        <span>今日目标</span>
        <strong>${escapeHtml(fit.label || "目标影响")}</strong>
        <em>${escapeHtml(fit.detail || "")}</em>
      </div>
    `;
  }

  function renderEventStageReview(review) {
    if (!els.eventStageReview) return;
    if (!review) {
      els.eventStageReview.hidden = true;
      els.eventStageReview.innerHTML = "";
      return;
    }
    els.eventStageReview.hidden = false;
    const weaknesses = (review.weaknesses || []).length
      ? (review.weaknesses || []).map((item) => `
        <article class="stage-review-weakness ${escapeHtml(item.tone || "warn")}" title="${escapeHtml(item.detail)}">
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.detail)}</p>
        </article>
      `).join("")
      : "<p class=\"stage-review-empty\">没有明显红线短板，可以把缓冲选择用于下一阶段铺垫。</p>";
    const objectives = (review.objectives || []).map((item) => `
      <span class="stage-review-objective ${escapeHtml(item.tone || "warn")}" title="${escapeHtml(item.targetText)}">
        ${escapeHtml(item.label)} · ${escapeHtml(item.done ? "达成" : `${item.metricShort} ${item.value}`)}
      </span>
    `).join("");
    const next = review.nextPhase
      ? `
        <div class="stage-review-next">
          <span>下一阶段</span>
          <strong>${escapeHtml(review.nextPhase.name)}</strong>
          <p>${escapeHtml(review.nextPhase.focus)}</p>
          <div>
            ${(review.nextPhase.objectives || []).map((item) => `<em title="${escapeHtml(item.detail)}">${escapeHtml(item.targetText)}</em>`).join("")}
          </div>
        </div>
      `
      : "";
    const reward = review.reward
      ? `
        <div class="stage-review-reward ${escapeHtml(review.reward.tone || "warn")}">
          <span>${escapeHtml(review.reward.available ? "可兑现余裕" : "余裕不足")}</span>
          <strong>${escapeHtml(review.reward.label)}</strong>
          <p>${escapeHtml(review.reward.detail)}</p>
        </div>
      `
      : "";
    els.eventStageReview.innerHTML = `
      <div class="stage-review-head ${escapeHtml(review.tone || "warn")}">
        <span>${escapeHtml(review.title || "阶段复盘")}</span>
        <strong>${escapeHtml(String(review.completed))}/${escapeHtml(String(review.total))}</strong>
      </div>
      <p class="stage-review-summary">${escapeHtml(review.summary || "")}</p>
      <div class="stage-review-objectives">${objectives}</div>
      ${reward}
      <div class="stage-review-weaknesses">${weaknesses}</div>
      ${next}
    `;
  }

  function renderChoiceImpacts(choice) {
    const impacts = choice.crisisImpacts || [];
    if (!impacts.length) return "";
    return `
      <div class="choice-impact-list" aria-label="策略影响">
        ${impacts.map((impact) => `
          <span class="choice-impact ${escapeHtml(impact.tone)}" title="${escapeHtml(impact.detail)}">
            ${escapeHtml(impact.label)}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderChoiceForecast(choice) {
    if (choice.available === false || !core.getChoiceOutcomePreview) return "";
    const items = core.getChoiceOutcomePreview(state, choice.id).slice(0, 4);
    if (!items.length) return "";
    return `
      <div class="choice-forecast" aria-label="结算后预估">
        <span>结算后</span>
        ${items.map((item) => `
          <em class="${item.tone || "neutral"}" title="${escapeHtml(item.detail)}">
            ${escapeHtml(item.short)} ${item.delta > 0 ? "+" : ""}${item.delta}
          </em>
        `).join("")}
      </div>
    `;
  }

  function renderChoiceRiskPreview(choice) {
    if (choice.available === false || !core.getChoiceRiskPreview) return "";
    const items = core.getChoiceRiskPreview(state, choice.id).slice(0, 2);
    if (!items.length) return "";
    return `
      <div class="choice-risk-preview" aria-label="红线预判">
        <span>红线</span>
        ${items.map((item) => `
          <em class="${item.tone || "warn"}" title="${escapeHtml(item.detail)}">
            ${escapeHtml(item.label)}
          </em>
        `).join("")}
      </div>
    `;
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

  function renderDailyDirective() {
    if (!els.dailyDirective || !core.getDailyDirective) return;
    const directive = core.getDailyDirective(state);
    if (!directive) {
      els.dailyDirective.hidden = true;
      els.dailyDirective.innerHTML = "";
      return;
    }
    els.dailyDirective.hidden = false;
    els.dailyDirective.className = `daily-directive ${escapeHtml(directive.tone || "warn")}`;
    const optionReport = core.getDailyDirectiveOptions ? core.getDailyDirectiveOptions(state) : null;
    els.dailyDirective.innerHTML = `
      <div>
        <span>今日调度目标</span>
        <strong>${escapeHtml(directive.label)}</strong>
        <em>${escapeHtml(directive.status)} · ${escapeHtml(directive.metricShort)} ${escapeHtml(String(directive.current))} / ${escapeHtml(directive.targetText)}</em>
      </div>
      <p>${escapeHtml(directive.detail)}</p>
      ${renderDailyDirectiveOptions(optionReport)}
    `;
    bindDailyDirectiveOptions();
  }

  function renderDailyDirectiveOptions(report) {
    const items = (report && report.items ? report.items : []).slice(0, 4);
    if (!items.length) return "";
    return `
      <div class="directive-options" aria-label="今日目标候选行动">
        <span>对准目标</span>
        ${items.map((item) => `
          <button class="directive-option ${escapeHtml(item.tone || "info")}" type="button"
            data-directive-choice="${escapeHtml(item.choiceId || "")}"
            data-directive-point="${escapeHtml(item.pointId || "")}"
            data-directive-mode="${escapeHtml(item.mode || "")}"
            data-directive-action="${escapeHtml(item.actionId || "")}"
            title="${escapeHtml(item.detail || "")}">
            <strong>${escapeHtml(item.label)}</strong>
            <em>${escapeHtml(item.kind)} · ${escapeHtml(item.routeLabel || item.pointLabel || "候选")}</em>
          </button>
        `).join("")}
      </div>
    `;
  }

  function bindDailyDirectiveOptions() {
    els.dailyDirective.querySelectorAll(".directive-option").forEach((button) => {
      bindChoicePreview(button, () => button.dataset.directiveChoice);
      bindCityActionPreview(button, () => button.dataset.directiveMode, () => button.dataset.directiveAction);
      button.addEventListener("click", () => {
        const choiceId = button.dataset.directiveChoice;
        if (choiceId) {
          focusChoiceOption(choiceId);
          return;
        }
        const pointId = button.dataset.directivePoint;
        if (!pointId) return;
        core.selectMapPoint(state, pointId);
        if (button.dataset.directiveMode) {
          actionMode = button.dataset.directiveMode === "resolutions" ? "resolutions" : "operations";
        }
        save();
        renderMap();
        renderActionMode();
        renderCityAssets();
        previewCityAction(actionMode, button.dataset.directiveAction);
        const point = core.getMapPoint(state, pointId);
        els.mapHint.textContent = `已定位今日目标候选：${point ? point.label : "城市节点"}`;
        if (els.operationsList && typeof els.operationsList.scrollIntoView === "function") {
          els.operationsList.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  function focusChoiceOption(choiceId) {
    const target = [...els.choiceList.querySelectorAll(".choice-button")]
      .find((item) => item.dataset.choiceId === choiceId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-recommended");
    const event = core.getCurrentEvent(state);
    const choice = event && event.choices.find((item) => item.id === choiceId);
    if (choice) renderTrendPreview(choice);
    setTimeout(() => target.classList.remove("is-recommended"), 1600);
  }

  function getCurrentChoiceById(choiceId) {
    if (!choiceId) return null;
    const event = core.getCurrentEvent(state);
    return event && event.choices.find((item) => item.id === choiceId);
  }

  function previewChoiceOption(choiceId) {
    const choice = getCurrentChoiceById(choiceId);
    if (choice) renderTrendPreview(choice);
  }

  function bindChoicePreview(button, getChoiceId) {
    if (!button || typeof getChoiceId !== "function") return;
    const show = () => previewChoiceOption(getChoiceId());
    const clear = () => renderTrendPreview();
    button.addEventListener("mouseenter", show);
    button.addEventListener("pointerenter", show);
    button.addEventListener("focus", show);
    button.addEventListener("mouseleave", clear);
    button.addEventListener("pointerleave", clear);
    button.addEventListener("blur", clear);
  }

  function previewCityAction(mode, actionId) {
    if (!actionId || !core.getCityActionOutcomePreview) return;
    const normalizedMode = mode === "resolutions" ? "resolutions" : "operations";
    const items = core.getCityActionOutcomePreview(state, normalizedMode, actionId);
    if (!items.length) {
      renderTrendPreview();
      return;
    }
    const label = normalizedMode === "resolutions" ? "决议后趋势" : "工程后趋势";
    const title = normalizedMode === "resolutions"
      ? "若先通过这项城市决议，不含今日事件选择，估算今晚主要变化。"
      : "若先执行这项城市工程，不含今日事件选择，估算今晚主要变化。";
    renderTrendItems(items, label, title, "is-action");
  }

  function bindCityActionPreview(element, getMode, getActionId) {
    if (!element || typeof getMode !== "function" || typeof getActionId !== "function") return;
    const show = () => previewCityAction(getMode(), getActionId());
    const clear = () => renderTrendPreview();
    element.addEventListener("mouseenter", show);
    element.addEventListener("pointerenter", show);
    element.addEventListener("focusin", show);
    element.addEventListener("mouseleave", clear);
    element.addEventListener("pointerleave", clear);
    element.addEventListener("focusout", clear);
  }

  function renderTrendPreview(choice = null) {
    if (!els.trendPreview || !core.getDailyTrendPreview) return;
    const useChoice = choice && choice.available !== false && core.getChoiceOutcomePreview;
    const items = useChoice
      ? core.getChoiceOutcomePreview(state, choice.id)
      : core.getDailyTrendPreview(state);
    const label = useChoice ? "选后结算" : "今晚趋势";
    const title = useChoice
      ? `若选择“${choice.label}”，估算本日完整结算后的主要变化。`
      : "按当前状态估算今晚自然联动和已到期后续影响，不含你接下来选择的事件策略。";
    renderTrendItems(items, label, title, useChoice ? "is-choice" : "");
  }

  function renderTrendItems(items, label, title, modeClass = "") {
    if (!els.trendPreview) return;
    if (!items.length) {
      els.trendPreview.hidden = true;
      els.trendPreview.innerHTML = "";
      return;
    }
    els.trendPreview.hidden = false;
    els.trendPreview.classList.toggle("is-choice", modeClass === "is-choice");
    els.trendPreview.classList.toggle("is-action", modeClass === "is-action");
    const summary = summarizeTrendItems(items);
    els.trendPreview.innerHTML = `
      <span class="trend-label" title="${escapeHtml(title)}">${escapeHtml(label)}</span>
      <span class="trend-summary ${escapeHtml(summary.tone)}" title="${escapeHtml(summary.detail)}">${escapeHtml(summary.text)}</span>
      ${items.map((item) => `
        <span class="trend-chip ${item.tone || "neutral"}" title="${escapeHtml(item.detail)}">
          ${escapeHtml(item.short)} ${item.delta > 0 ? "+" : ""}${item.delta}
        </span>
      `).join("")}
    `;
  }

  function summarizeTrendItems(items) {
    const bad = items.filter((item) => item.tone === "bad");
    const good = items.filter((item) => item.tone === "good");
    const mixed = items.filter((item) => item.tone === "mixed");
    const firstBad = bad[0];
    const firstGood = good[0];
    if (bad.length && good.length) {
      return {
        tone: "mixed",
        text: `风险${bad.length}项 / 改善${good.length}项 · 盯住${firstBad.short}`,
        detail: firstBad.detail,
      };
    }
    if (bad.length) {
      return {
        tone: bad.length >= 2 ? "bad" : "mixed",
        text: `风险${bad.length}项 · 主要压力：${firstBad.short}`,
        detail: firstBad.detail,
      };
    }
    if (good.length) {
      return {
        tone: "good",
        text: `改善${good.length}项 · 主要收益：${firstGood.short}`,
        detail: firstGood.detail,
      };
    }
    if (mixed.length) {
      return {
        tone: "mixed",
        text: `权衡${mixed.length}项 · 留意联动`,
        detail: mixed[0].detail,
      };
    }
    return {
      tone: "neutral",
      text: "变化温和",
      detail: "今晚趋势没有明显单项波动。",
    };
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
    const recap = renderLatestSettlement();
    if (recap) els.alerts.appendChild(recap);
    state.alerts.forEach((alert) => {
      const item = document.createElement("div");
      item.className = "alert";
      item.textContent = alert;
      els.alerts.appendChild(item);
    });
    bindLatestSettlementActions();
  }

  function renderLatestSettlement() {
    const entry = state.history && state.history[0];
    if (!entry) return null;
    const meta = historyEntryMeta(entry);
    const card = document.createElement("article");
    card.className = `settlement-recap ${settlementTone(entry)}`;
    const changes = renderChangeChips(entry.changes, 7);
    const narrative = renderSettlementNarrative(entry);
    const highlights = renderSettlementHighlights(entry);
    const breakdown = renderBreakdownRows(entry.breakdown, 4);
    const nextStep = renderSettlementNextStep(meta);
    const notes = (entry.notes || [])
      .filter(Boolean)
      .slice(0, breakdown ? 2 : 3)
      .map((note) => `<li>${escapeHtml(note)}</li>`)
      .join("");
    card.innerHTML = `
      <div class="settlement-head">
        <span>${escapeHtml(meta.label)}</span>
        <strong>第 ${entry.day} 天</strong>
      </div>
      <p><b>${escapeHtml(entry.choice)}</b> / ${escapeHtml(entry.title)}</p>
      ${narrative}
      ${renderHistoryBadges(meta, "settlement-tags")}
      ${highlights}
      <div class="change-list">${changes}</div>
      ${breakdown}
      ${notes ? `<ul class="settlement-notes">${notes}</ul>` : ""}
      ${nextStep}
    `;
    return card;
  }

  function historyEntryMeta(entry) {
    if (core.getHistoryEntryMeta) return core.getHistoryEntryMeta(entry);
    return {
      label: "最新结算",
      sourceLabel: "事件选择",
      routeLabel: entry.routeLabel || "综合路线",
      status: "日期推进",
      tone: entry.routeTone || "info",
      detail: "",
    };
  }

  function renderHistoryBadges(meta, className = "history-tags") {
    if (!meta) return "";
    const tags = [
      [meta.sourceLabel, meta.detail],
      [meta.routeLabel, meta.detail],
      [meta.status, meta.detail],
    ].filter(([label]) => label);
    if (!tags.length) return "";
    return `
      <div class="${className}" aria-label="记录来源">
        ${tags.map(([label, title], index) => `
          <span class="${index === 1 ? escapeHtml(meta.tone || "info") : "info"}" title="${escapeHtml(title || "")}">
            ${escapeHtml(label)}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderSettlementNextStep(meta) {
    if (!core.getDailyDirectiveOptions) return "";
    const report = core.getDailyDirectiveOptions(state);
    const directive = report && report.directive;
    if (!directive) return "";
    const items = (report.items || []).slice(0, 2);
    const prompt = meta && meta.status === "即时生效"
      ? "今日事件仍未处理，先用事件选项收束当天结算。"
      : "新一天已经刷新，先看最能推进当前目标的候选。";
    const buttons = items.length
      ? `
        <div class="settlement-next-actions">
          ${items.map((item) => `
            <button type="button" class="settlement-next-action ${escapeHtml(item.tone || "info")}"
              data-next-choice="${escapeHtml(item.choiceId || "")}"
              data-next-point="${escapeHtml(item.pointId || "")}"
              data-next-mode="${escapeHtml(item.mode || "")}"
              data-next-action="${escapeHtml(item.actionId || "")}"
              title="${escapeHtml(item.detail || "")}">
              <strong>${escapeHtml(item.label)}</strong>
              <em>${escapeHtml(item.kind)} · ${escapeHtml(item.status || item.routeLabel || "候选")}</em>
            </button>
          `).join("")}
        </div>
      `
      : "";
    return `
      <div class="settlement-next-step ${escapeHtml(directive.tone || "info")}">
        <span>下一步</span>
        <strong>${escapeHtml(directive.label)}</strong>
        <p>${escapeHtml(prompt)}</p>
        ${buttons}
      </div>
    `;
  }

  function bindLatestSettlementActions() {
    if (!els.alerts) return;
    els.alerts.querySelectorAll(".settlement-next-action").forEach((button) => {
      bindChoicePreview(button, () => button.dataset.nextChoice);
      bindCityActionPreview(button, () => button.dataset.nextMode, () => button.dataset.nextAction);
      button.addEventListener("click", () => {
        const choiceId = button.dataset.nextChoice;
        if (choiceId) {
          focusChoiceOption(choiceId);
          return;
        }
        const pointId = button.dataset.nextPoint;
        if (!pointId) return;
        core.selectMapPoint(state, pointId);
        if (button.dataset.nextMode) {
          actionMode = button.dataset.nextMode === "resolutions" ? "resolutions" : "operations";
        }
        save();
        renderMap();
        renderActionMode();
        renderCityAssets();
        previewCityAction(actionMode, button.dataset.nextAction);
        const point = core.getMapPoint(state, pointId);
        els.mapHint.textContent = `已定位下一步候选：${point ? point.label : "城市节点"}`;
        if (els.operationsList && typeof els.operationsList.scrollIntoView === "function") {
          els.operationsList.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  function renderActionMode() {
    if (!state) return;
    els.operationsTab.classList.toggle("active", actionMode === "operations");
    els.resolutionsTab.classList.toggle("active", actionMode === "resolutions");
    renderActionFinder();
    const point = core.getMapPoint(state, state.selectedMapPointId);
    const items = actionMode === "operations" ? point.operations : point.resolutions;
    els.operationsList.innerHTML = renderCityActionBudget();

    if (!items.length) {
      els.operationsList.innerHTML += "<p class=\"empty-state\">这个节点暂时没有对应行动。</p>";
      bindCityActionUndo();
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = `action-card${item.available ? "" : " locked"}`;
      card.dataset.actionMode = actionMode;
      card.dataset.actionId = item.id;
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
          ${renderActionDirectiveFit(item, actionMode)}
          ${renderActionForecast(item, actionMode)}
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
      bindCityActionPreview(card, () => actionMode, () => item.id);
      els.operationsList.appendChild(card);
    });
    bindCityActionUndo();
  }

  function renderActionForecast(item, mode) {
    if (!item.available || !core.getCityActionOutcomePreview) return "";
    const items = core.getCityActionOutcomePreview(state, mode, item.id).slice(0, 4);
    if (!items.length) return "";
    return `
      <div class="action-forecast" aria-label="行动后趋势">
        <span>行动后趋势</span>
        ${items.map((forecast) => `
          <em class="${forecast.tone || "neutral"}" title="${escapeHtml(forecast.detail)}">
            ${escapeHtml(forecast.short)} ${forecast.delta > 0 ? "+" : ""}${forecast.delta}
          </em>
        `).join("")}
      </div>
    `;
  }

  function renderActionDirectiveFit(item, mode) {
    if (!item.available || !core.getCityActionDirectiveFit) return "";
    const fit = core.getCityActionDirectiveFit(state, mode, item.id);
    if (!fit) return "";
    return `
      <div class="action-directive ${escapeHtml(fit.tone || "info")}" title="${escapeHtml(fit.detail || "")}">
        <span>今日目标</span>
        <strong>${escapeHtml(fit.label || "目标影响")}</strong>
      </div>
    `;
  }

  function renderActionFinder() {
    if (!els.actionFinder) return;
    if (!core.getCityActionOpportunities) {
      els.actionFinder.innerHTML = "";
      return;
    }
    const report = core.getCityActionOpportunities(state);
    const cityActions = report.items || [];
    const nextDayActions = report.nextDayItems || [];
    const lockedActions = report.lockedItems || [];
    const budget = report.budget || core.getCityActionBudget(state);
    const budgetClass = budget.exhausted ? "city-budget-pill exhausted" : "city-budget-pill";
    const budgetText = `${budget.label} ${budget.remaining}/${budget.limit}`;
    if (!cityActions.length && !nextDayActions.length && !lockedActions.length) {
      els.actionFinder.innerHTML = `
        <div class="action-finder-head">
          <span>行动窗口</span>
          <strong>0</strong>
          <em class="${budgetClass}" title="${escapeHtml(budget.detail || "")}">${escapeHtml(budgetText)}</em>
        </div>
        <p class="action-finder-empty">暂无立即可执行的工程或决议，先处理今日事件或改善条件。</p>
      `;
      return;
    }

    const availableList = cityActions.length
      ? `
        <div class="action-finder-list">
          ${cityActions.map((item) => `
            <button class="action-finder-item ${escapeHtml(item.tone || "info")}" type="button"
              data-point-id="${escapeHtml(item.pointId)}" data-mode="${escapeHtml(item.mode)}"
              data-action-id="${escapeHtml(item.id)}"
              title="${escapeHtml(item.detail || item.reason || "")}">
              <span>${escapeHtml(item.kind)} · ${escapeHtml(item.pointLabel)} · ${escapeHtml((item.routeTag && item.routeTag.label) || "综合调度")}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.reason || item.impact || "根据当前压力推荐。")}</p>
              ${renderActionFinderDirective(item)}
              <div class="action-finder-chips">${renderOpportunityChips(item)}</div>
            </button>
          `).join("")}
        </div>
      `
      : "<p class=\"action-finder-empty\">暂无立即可执行的工程或决议，先处理今日事件或改善条件。</p>";
    const nextDayList = nextDayActions.length
      ? `
        <div class="action-finder-subhead tomorrow">
          <span>明日可排</span>
          <strong>${nextDayActions.length}/${report.nextDayCount || nextDayActions.length}</strong>
        </div>
        <div class="action-finder-list tomorrow">
          ${nextDayActions.map((item) => `
            <button class="action-finder-item next-day ${escapeHtml(item.tone || "info")}" type="button"
              data-point-id="${escapeHtml(item.pointId)}" data-mode="${escapeHtml(item.mode)}"
              data-action-id="${escapeHtml(item.id)}"
              title="${escapeHtml(item.detail || item.reason || "")}">
              <span>${escapeHtml(item.kind)} · ${escapeHtml(item.pointLabel)} · ${escapeHtml(item.status || "明日可排")}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.reason || item.impact || "明日调度额度恢复后可执行。")}</p>
              <div class="action-finder-chips">${renderOpportunityChips(item)}</div>
            </button>
          `).join("")}
        </div>
      `
      : "";
    const lockedList = lockedActions.length
      ? `
        <div class="action-finder-subhead">
          <span>临近解锁</span>
          <strong>${lockedActions.length}/${report.lockedCount}</strong>
        </div>
        <div class="action-finder-list locked">
          ${lockedActions.map((item) => `
            <button class="action-finder-item locked-preview ${escapeHtml(item.tone || "mixed")}" type="button"
              data-point-id="${escapeHtml(item.pointId)}" data-mode="${escapeHtml(item.mode)}"
              data-action-id="${escapeHtml(item.id)}"
              title="${escapeHtml(item.detail || item.reason || "")}">
              <span>${escapeHtml(item.kind)} · ${escapeHtml(item.pointLabel)} · ${escapeHtml(item.status || "未解锁")}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.reason || item.detail || "当前条件不足。")}</p>
              <div class="action-finder-chips">${renderOpportunityChips(item)}</div>
            </button>
          `).join("")}
        </div>
      `
      : "";

    els.actionFinder.innerHTML = `
      <div class="action-finder-head">
        <span title="${escapeHtml(report.detail || "全城可执行工程与决议")}">行动窗口</span>
        <strong class="${escapeHtml(report.tone || "info")}">${report.availableCount}</strong>
        <em class="${budgetClass}" title="${escapeHtml(budget.detail || "")}">${escapeHtml(budgetText)}</em>
      </div>
      ${report.detail ? `<p class="action-finder-summary">${escapeHtml(report.detail)}</p>` : ""}
      ${availableList}
      ${nextDayList}
      ${lockedList}
    `;

    els.actionFinder.querySelectorAll(".action-finder-item").forEach((button) => {
      bindCityActionPreview(button, () => button.dataset.mode, () => button.dataset.actionId);
      button.addEventListener("click", () => {
        core.selectMapPoint(state, button.dataset.pointId);
        actionMode = button.dataset.mode === "resolutions" ? "resolutions" : "operations";
        save();
        renderMap();
        renderActionMode();
        renderCrisisBoard();
        previewCityAction(actionMode, button.dataset.actionId);
        els.mapHint.textContent = `已定位行动窗口：${core.getMapPoint(state, button.dataset.pointId).label}`;
      });
    });
  }

  function renderOpportunityChips(item) {
    const forecast = item.forecast || [];
    if (forecast.length) {
      return forecast
        .slice(0, 4)
        .map((entry) => `<em class="${forecastChipClass(entry)}" title="${escapeHtml(entry.detail || "")}">${escapeHtml(entry.short)} ${entry.delta > 0 ? "+" : ""}${entry.delta}</em>`)
        .join("");
    }
    return item.impact
      ? `<em class="mixed-change" title="${escapeHtml(item.detail || item.reason || "")}">${escapeHtml(item.impact)}</em>`
      : "";
  }

  function renderActionFinderDirective(item) {
    if (!item || !item.id || !item.available || !core.getCityActionDirectiveFit) return "";
    const fit = core.getCityActionDirectiveFit(state, item.mode, item.id);
    if (!fit) return "";
    return `
      <em class="action-finder-directive ${escapeHtml(fit.tone || "info")}" title="${escapeHtml(fit.detail || "")}">
        今日目标 · ${escapeHtml(fit.label)}
      </em>
    `;
  }

  function forecastChipClass(entry) {
    if (!entry) return "mixed-change";
    if (entry.tone === "good") return "good-change";
    if (entry.tone === "bad" || entry.tone === "danger") return "bad-change";
    return "mixed-change";
  }

  function renderCityActionBudget() {
    const budget = core.getCityActionBudget(state);
    const undo = core.getCityActionUndo ? core.getCityActionUndo(state) : null;
    const status = budget.exhausted ? "已用完" : `剩余 ${budget.remaining}`;
    return `
      <article class="city-action-budget ${budget.exhausted ? "exhausted" : ""} ${undo ? "has-undo" : ""}">
        <div>
          <span>${escapeHtml(budget.label)}</span>
          <strong>${escapeHtml(status)} / ${budget.limit}</strong>
        </div>
        <p>${escapeHtml(budget.detail)}</p>
        ${undo ? `
          <button class="undo-city-action" type="button" data-undo-city-action title="${escapeHtml(undo.detail)}">
            撤销：${escapeHtml(undo.label)}
          </button>
        ` : ""}
      </article>
    `;
  }

  function bindCityActionUndo() {
    const button = els.operationsList.querySelector("[data-undo-city-action]");
    if (!button || !core.undoCityAction) return;
    button.addEventListener("click", () => {
      const undone = core.undoCityAction(state);
      if (!undone) {
        renderActionMode();
        return;
      }
      save();
      render();
    });
  }

  function renderCityBadges() {
    if (!els.cityBadges || !core.getCityBadges) return;
    const report = core.getCityBadges(state);
    const badges = [
      ...(report.earned || []).slice(0, 5),
      ...(report.watch || []).slice(0, Math.max(0, 5 - (report.earned || []).slice(0, 5).length)),
    ];
    els.cityBadges.innerHTML = `
      <div class="city-badges-head">
        <div>
          <span>${escapeHtml(report.label || "城市档案")}</span>
          <p>${escapeHtml(report.detail || "")}</p>
        </div>
        <strong class="${escapeHtml(report.tone || "info")}">${(report.earned || []).length}/${report.total || 0}</strong>
      </div>
      ${badges.length ? `
        <div class="city-badge-list">
          ${badges.map((badge) => `
            <article class="city-badge ${escapeHtml(badge.tone || "info")} ${badge.earned ? "earned" : "watch"}"
              title="${escapeHtml(badge.hint || badge.detail || "")}">
              <span>${escapeHtml(badge.category || "档案")} · ${escapeHtml(badge.status || "")}</span>
              <strong>${escapeHtml(badge.label)}</strong>
              <p>${escapeHtml(badge.detail || "")}</p>
              ${badge.earned ? "" : `<i style="width:${Math.max(4, Math.min(100, badge.progress || 0))}%" aria-hidden="true"></i>`}
            </article>
          `).join("")}
        </div>
      ` : ""}
    `;
  }

  function renderCityAssets() {
    if (!els.assetList) return;
    const assets = collectCityAssets();
    if (!assets.length) {
      els.assetList.innerHTML = "<p class=\"empty-state\">尚未形成长期资产。建设工程、铺设节点或通过决议后会在这里留档。</p>";
      return;
    }

    els.assetList.innerHTML = assets
      .map((asset) => `
        <article class="asset-card ${escapeHtml(asset.statusTone)}">
          <span>${escapeHtml(asset.kind)} · ${escapeHtml(asset.status)}</span>
          <strong>${escapeHtml(asset.label)}</strong>
          <p>${escapeHtml(asset.detail)}</p>
        </article>
      `)
      .join("");
  }

  function collectCityAssets() {
    const pendingProjects = new Map(
      (state.pendingEffects || [])
        .filter((item) => item.completeProject)
        .map((item) => [item.completeProject, item])
    );
    const assets = [];

    CITY_ASSET_REGISTRY.forEach((item) => {
      const pending = item.completeProject ? pendingProjects.get(item.completeProject) : null;
      const completed = item.completeProject ? Boolean(state.completedProjects[item.completeProject]) : false;
      const deployed = item.operation ? Boolean((state.flags.operationUses || {})[item.operation]) : false;
      if (!pending && !completed && !deployed) return;
      assets.push({
        ...item,
        status: pending && !completed
          ? `${Math.max(0, pending.dueDay - state.day)}日后启用`
          : completed
            ? "已启用"
            : "已部署",
        statusTone: pending && !completed ? "pending" : "ready",
      });
    });

    Object.entries(state.flags.resolutions || {})
      .filter(([, used]) => used)
      .forEach(([id]) => {
        const resolution = core.RESOLUTIONS[id];
        assets.push({
          id: `resolution-${id}`,
          kind: "决议",
          label: resolution ? resolution.label : id,
          detail: resolution ? resolution.description : "城市决议已通过。",
          status: "已通过",
          statusTone: "passed",
        });
      });

    return assets.slice(0, 12);
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
    if (item.delayed) {
      const title = item.delayed.condition ? conditionLabel(item.delayed.condition) : "必定触发";
      chips.push(`<span class="chip delay" title="${escapeHtml(title)}">${escapeHtml(delayedChipText(item.delayed))}</span>`);
    }
    return chips.join("");
  }

  function renderNews() {
    els.newsList.innerHTML = "";
    state.news.forEach((item) => {
      const card = document.createElement("article");
      card.className = "news-card";
      card.innerHTML = `
        <img alt="${escapeHtml(item.title)} 配图">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </div>
      `;
      setManagedImage(card.querySelector("img"), item.image, `${item.title} 配图`, NEWS_IMAGE_FALLBACK, card);
      els.newsList.appendChild(card);
    });
  }

  function setManagedImage(image, assetPath, altText, fallbackPath, frame) {
    if (!image) return;
    const source = `${ASSET_PATH + assetPath}?${ASSET_VERSION}`;
    const fallback = fallbackPath ? `${ASSET_PATH + fallbackPath}?${ASSET_VERSION}` : "";
    image.alt = altText || "";
    image.dataset.fallbackSrc = fallback;
    image.dataset.fallbackUsed = "false";
    image.classList.add("is-loading");
    image.classList.remove("is-error");
    if (frame) {
      frame.classList.add("image-loading");
      frame.classList.remove("image-error");
    }
    image.onload = () => {
      image.classList.remove("is-loading", "is-error");
      if (frame) frame.classList.remove("image-loading", "image-error");
    };
    image.onerror = () => {
      const fallbackSrc = image.dataset.fallbackSrc || "";
      if (fallbackSrc && image.dataset.fallbackUsed !== "true") {
        image.dataset.fallbackUsed = "true";
        image.src = fallbackSrc;
        return;
      }
      image.classList.remove("is-loading");
      image.classList.add("is-error");
      if (frame) {
        frame.classList.remove("image-loading");
        frame.classList.add("image-error");
      }
    };
    image.src = source;
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
      const meta = historyEntryMeta(entry);
      const changes = renderChangeChips(entry.changes, 8);
      const narrative = renderSettlementNarrative(entry);
      const breakdown = renderBreakdownRows(entry.breakdown, 2);
      const notes = (entry.notes || [])
        .filter(Boolean)
        .slice(0, breakdown ? 1 : 2)
        .map((note) => `<li>${escapeHtml(note)}</li>`)
        .join("");
      li.innerHTML = `
        <span class="history-meta">第 ${entry.day} 天 / 阶段 ${entry.phase} / ${escapeHtml(meta.label)}</span>
        <strong>${escapeHtml(entry.choice)}</strong>
        <p>${escapeHtml(entry.title)}</p>
        ${narrative}
        ${renderHistoryBadges(meta)}
        <div class="change-list">${changes}</div>
        ${breakdown}
        ${notes ? `<ul class="history-notes">${notes}</ul>` : ""}
      `;
      els.historyList.appendChild(li);
    });
  }

  function renderEnding() {
    els.startScreen.hidden = true;
    els.gameScreen.hidden = true;
    els.endingScreen.hidden = false;
    resetPageScroll();

    els.dayLabel.textContent = `第 ${state.day} 天`;
    els.phaseLabel.textContent = "归档";
    const difficulty = core.DIFFICULTIES[state.difficulty] || core.DIFFICULTIES.normal;
    const scenario = core.SCENARIOS && core.SCENARIOS[state.scenario] ? core.SCENARIOS[state.scenario] : null;
    els.difficultyLabel.textContent = scenario ? `${difficulty.label} · ${scenario.label}` : difficulty.label;
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
    renderEndingReview();
  }

  function renderEndingReview() {
    if (!els.endingReview || !core.getEndingReview) return;
    const review = core.getEndingReview(state);
    if (!review) {
      els.endingReview.innerHTML = "";
      return;
    }
    els.endingReview.innerHTML = `
      <section class="ending-review-section">
        <div class="ending-review-head">
          <span>评分拆解</span>
          <strong>${escapeHtml(review.scoreText)}</strong>
        </div>
        <div class="ending-score-grid">
          ${review.breakdown.map((item) => `
            <article class="ending-score-row ${escapeHtml(item.tone)}">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(String(item.value))} · ${escapeHtml(String(item.points))}/${escapeHtml(String(item.max))}</span>
              </div>
              <i aria-hidden="true"><b style="width:${Math.max(0, Math.min(100, item.pct))}%"></b></i>
              <em>失分 ${escapeHtml(String(item.lost))}</em>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="ending-review-section">
        <div class="ending-review-head">
          <span>下一局重点</span>
          <strong>${review.priorities.length}</strong>
        </div>
        <div class="ending-priority-list">
          ${review.priorities.map((item) => `
            <article class="ending-priority ${escapeHtml(item.tone)}">
              <span>${escapeHtml(item.label)} · 失分 ${escapeHtml(String(item.lost))}</span>
              <p>${escapeHtml(item.advice)}</p>
            </article>
          `).join("")}
        </div>
      </section>
      ${renderEndingStrategyReview(review)}
    `;
  }

  function renderEndingStrategyReview(review) {
    const strategy = review.strategyReview;
    const plans = review.nextPlans || [];
    if (!strategy && !plans.length) return "";
    const routes = strategy && strategy.routes && strategy.routes.length
      ? `
        <div class="ending-route-list">
          ${strategy.routes.map((route) => `
            <article class="ending-route ${escapeHtml(route.tone || "neutral")}">
              <div>
                <strong>${escapeHtml(route.label)}</strong>
                <span>${escapeHtml(String(route.count))}次 · ${escapeHtml(String(route.percent))}%</span>
              </div>
              <i aria-hidden="true"><b style="width:${Math.max(0, Math.min(100, route.percent || 0))}%"></b></i>
            </article>
          `).join("")}
        </div>
      `
      : "<p class=\"ending-route-empty\">本局路线尚未形成稳定样本。</p>";
    const blindSpot = strategy && strategy.blindSpot
      ? `<p class="ending-route-blindspot ${escapeHtml(strategy.blindSpot.tone || "warn")}"><strong>${escapeHtml(strategy.blindSpot.label)}</strong>${escapeHtml(strategy.blindSpot.detail)}</p>`
      : "";
    const planList = plans.length
      ? `
        <div class="ending-next-plan-list">
          ${plans.map((item) => `
            <article class="ending-next-plan ${escapeHtml(item.tone || "warn")}">
              <span>${escapeHtml(item.route)} · ${escapeHtml(item.label)}</span>
              <p>${escapeHtml(item.detail)}</p>
              <em>${escapeHtml(item.examples)}</em>
            </article>
          `).join("")}
        </div>
      `
      : "";
    return `
      <section class="ending-review-section">
        <div class="ending-review-head">
          <span>路线复盘</span>
          <strong>${escapeHtml(strategy ? strategy.label : "未成型")}</strong>
        </div>
        ${strategy ? `<p class="ending-strategy-detail">${escapeHtml(strategy.detail)}</p>` : ""}
        ${routes}
        ${blindSpot}
        ${planList}
      </section>
    `;
  }

  function changeClass(metric, delta) {
    const meta = core.METRIC_META[metric] || core.RESOURCE_META[metric];
    if (!meta) return "neutral";
    if (meta.direction === "good") return delta >= 0 ? "good-change" : "bad-change";
    if (meta.direction === "danger") return delta <= 0 ? "good-change" : "bad-change";
    return "mixed-change";
  }

  function renderSettlementHighlights(entry) {
    if (!core.getSettlementHighlights) return "";
    const highlights = core.getSettlementHighlights(entry);
    if (!highlights.length) return "";
    return `
      <div class="settlement-highlights" aria-label="结算要点">
        ${highlights.map((item) => `
          <article class="${escapeHtml(item.tone || "info")}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.detail)}</strong>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderSettlementNarrative(entry) {
    if (!core.getSettlementNarrative) return "";
    const narrative = core.getSettlementNarrative(entry);
    if (!narrative) return "";
    return `
      <p class="settlement-cause ${escapeHtml(narrative.tone || "info")}">
        <span>${escapeHtml(narrative.label || "结算主因")}</span>
        ${escapeHtml(narrative.detail || "")}
      </p>
    `;
  }

  function renderBreakdownRows(breakdown = [], limit = 4) {
    const rows = (breakdown || [])
      .filter((item) => item && item.source && item.deltas && Object.keys(item.deltas).length)
      .slice(0, limit);
    if (!rows.length) return "";
    return `
      <div class="settlement-breakdown" aria-label="结算拆解">
        <span>结算拆解</span>
        ${rows.map((item) => `
          <article>
            <strong>${escapeHtml(item.source)}</strong>
            <div class="change-list">${renderChangeChips(item.deltas, 4)}</div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderChangeChips(changes = {}, limit = 8) {
    return Object.entries(changes || {})
      .sort(([metricA, deltaA], [metricB, deltaB]) => changePriority(metricB, deltaB) - changePriority(metricA, deltaA))
      .slice(0, limit)
      .map(([metric, delta]) => {
        const meta = core.METRIC_META[metric] || core.RESOURCE_META[metric];
        if (!meta) return "";
        return `<span class="change ${changeClass(metric, delta)}" title="${escapeHtml(meta.description)}">${meta.short} ${delta > 0 ? "+" : ""}${delta}</span>`;
      })
      .filter(Boolean)
      .join("") || "<span class=\"change neutral\">无直接数值变化</span>";
  }

  function changePriority(metric, delta) {
    const dangerBoost = ["infection", "hospitalLoad", "staffFatigue", "trust", "funds"].includes(metric) ? 4 : 0;
    const badBoost = changeClass(metric, delta) === "bad-change" ? 8 : 0;
    return Math.abs(delta) + dangerBoost + badBoost;
  }

  function settlementTone(entry) {
    const changes = Object.entries(entry.changes || {});
    if (!changes.length) return "neutral";
    const bad = changes.filter(([metric, delta]) => changeClass(metric, delta) === "bad-change")
      .reduce((sum, [, delta]) => sum + Math.abs(delta), 0);
    const good = changes.filter(([metric, delta]) => changeClass(metric, delta) === "good-change")
      .reduce((sum, [, delta]) => sum + Math.abs(delta), 0);
    if (bad >= good + 6) return "bad";
    if (good >= bad + 6) return "good";
    return "mixed";
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
    if (/^\d+日后/.test(value)) {
      return value.includes("条件：")
        ? "条件满足时才会进入之后的每日结算。"
        : "延迟后果，会在之后的每日结算中触发。";
    }
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
