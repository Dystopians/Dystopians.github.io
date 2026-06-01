(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Linjiang72 = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TOTAL_DAYS = 72;
  const PHASE_SIZE = 12;
  const DAILY_CORE_CAP = 12;
  const CITY_ACTIONS_PER_DAY = 1;
  const PHASE_PRESSURE = [2, 3, 4, 3, 2, 1];

  const CORE_METRICS = [
    "infection",
    "hospitalLoad",
    "supplies",
    "trust",
    "economy",
    "staffFatigue",
  ];

  const HIDDEN_METRICS = ["detectedRate", "policyStrictness", "publicMemory"];
  const RESOURCE_METRICS = ["funds"];

  const METRIC_META = {
    infection: {
      label: "感染压力",
      short: "感染",
      direction: "danger",
      description: "真实感染压力。越高，越容易推高医院负载和触发管控事件。",
    },
    hospitalLoad: {
      label: "医疗负载",
      short: "医疗负载",
      direction: "danger",
      description: "医院、急诊、床位与医护承压程度。高位连续会导致医疗挤兑。",
    },
    supplies: {
      label: "物资供应",
      short: "物资",
      direction: "good",
      description: "生活物资与医疗耗材余量。低位会伤害信任和基层效率。",
    },
    trust: {
      label: "市民信任",
      short: "信任",
      direction: "good",
      description: "居民对信息与政策执行的信任。低信任会削弱行动效果。",
    },
    economy: {
      label: "城市活力",
      short: "活力",
      direction: "good",
      description: "生产、就业、财政与物流恢复能力。低位会拖累保供和扩容。",
    },
    staffFatigue: {
      label: "基层疲劳",
      short: "疲劳",
      direction: "danger",
      description: "基层、医护、志愿者与配送队伍的透支程度。高位会削弱所有行动。",
    },
    detectedRate: {
      label: "发现率",
      short: "发现",
      direction: "good",
      description: "病例发现能力。越高，玩家看到的数据越接近真实压力。",
    },
    policyStrictness: {
      label: "管控强度",
      short: "管控",
      direction: "mixed",
      description: "限制流动与组织执行的强度。能压低感染，也会消耗社会系统。",
    },
    publicMemory: {
      label: "公共创伤",
      short: "创伤",
      direction: "danger",
      description: "城市在医疗、民生与沟通中积累的长期伤痕。",
    },
  };

  const INITIAL_VALUES = {
    infection: 22,
    hospitalLoad: 28,
    supplies: 62,
    trust: 58,
    economy: 72,
    staffFatigue: 26,
    detectedRate: 35,
    policyStrictness: 20,
    publicMemory: 0,
    funds: 68,
  };

  const RESOURCE_META = {
    funds: {
      label: "应急资金",
      short: "资金",
      direction: "good",
      description: "财政、专项拨款和社会协作额度。主动工程和决议会消耗资金。",
    },
  };

  const DIFFICULTIES = {
    easy: {
      label: "简单",
      failureLimit: 4,
      adjustments: {
        supplies: 8,
        trust: 8,
        staffFatigue: -6,
        funds: 8,
      },
    },
    normal: {
      label: "普通",
      failureLimit: 3,
      adjustments: {},
    },
    hard: {
      label: "困难",
      failureLimit: 3,
      adjustments: {
        infection: 8,
        hospitalLoad: 8,
        supplies: -8,
        trust: -6,
        funds: -6,
      },
    },
  };

  const SCENARIOS = {
    standard: {
      label: "标准档案",
      summary: "保持默认开局，适合第一次游玩和继续调参对照。",
      adjustments: {},
      priorities: ["按第一号通告建立可信口径", "观察发现率与医疗负载的联动", "保留资金给前两周的关键工程"],
    },
    medicalFront: {
      label: "医疗前线吃紧",
      summary: "开局医院与基层更紧，资金略多但救急窗口更短。",
      adjustments: {
        infection: 4,
        hospitalLoad: 10,
        supplies: -4,
        staffFatigue: 6,
        funds: 4,
      },
      priorities: ["尽早做分诊或医疗扩容", "避免连续强压基层", "用保供和公开解释稳住信任"],
    },
    supplyStress: {
      label: "保供链条紧绷",
      summary: "民生供应与物流开局偏弱，需要更早投入保供和信任修复。",
      adjustments: {
        supplies: -14,
        trust: -3,
        economy: -4,
        staffFatigue: 3,
        funds: 6,
      },
      priorities: ["优先打通市场和道路节点", "避免物资低位拖垮信任", "把民间互助纳入可见流程"],
    },
    fiscalSqueeze: {
      label: "财政收缩",
      summary: "资金和城市活力都偏低，但公众耐心略高，考验早期恢复路线。",
      adjustments: {
        funds: -16,
        economy: -5,
        trust: 3,
        publicMemory: -2,
      },
      priorities: ["早做专项资金或台账工程", "谨慎使用高价工程", "用小规模复业托住活力"],
    },
    informationBlind: {
      label: "信息盲区",
      summary: "发现率更低、真实感染略高，早期必须更重视监测和公开。",
      adjustments: {
        infection: 5,
        detectedRate: -12,
        trust: -2,
        staffFatigue: -2,
        funds: 3,
      },
      priorities: ["优先扩大检测和信息公开", "低发现率下谨慎复工", "用匿名上报和健康码铺垫监测"],
    },
  };

  const STAGE_INFO = [
    {
      phase: 1,
      name: "异常信号",
      days: "第 1-12 天",
      situation: "城市仍处在信息不完整的早期窗口。病例可能已经进入社区，但检测、医院和居民感知还没有对齐。",
      challenges: ["尽快提高发现率", "避免谣言先于通告扩散", "不要过早耗尽基层与物资"],
      focus: "判断早期风险，建立可信口径。",
    },
    {
      phase: 2,
      name: "扩散确认",
      days: "第 13-24 天",
      situation: "传播链逐渐清晰，检测、转运和社区解释成为城市运转的核心压力点。",
      challenges: ["检测拥堵", "密接转运争议", "货运和保供流程卡顿"],
      focus: "把发现能力、执行秩序和公众信任拉到同一节奏。",
    },
    {
      phase: 3,
      name: "高压封控",
      days: "第 25-36 天",
      situation: "城市进入高强度管控期。感染可以被压低，但民生供应和基层疲劳会快速积累。",
      challenges: ["独居老人和慢病药品", "团购与配送稳定性", "小区冲突和基层透支"],
      focus: "用保供和解释维持管控的可执行性。",
    },
    {
      phase: 4,
      name: "医疗挤兑风险",
      days: "第 37-48 天",
      situation: "医院压力来到最危险的区间。临时扩容、分级诊疗和非疫情患者保障会互相争夺资源。",
      challenges: ["床位与氧气", "医护感染和排班缺口", "非疫情患者延误"],
      focus: "尽快卸下医院负载，同时避免把疲劳和创伤推到不可逆。",
    },
    {
      phase: 5,
      name: "疲劳与反弹",
      days: "第 49-60 天",
      situation: "连续管控带来的政策疲劳开始显现。经济压力、拒检、复工诉求和感染反弹风险同时出现。",
      challenges: ["企业现金流", "居民拒检", "基层人员请辞"],
      focus: "在恢复活力和防止反弹之间找到更细的治理颗粒度。",
    },
    {
      phase: 6,
      name: "收束与复盘",
      days: "第 61-72 天",
      situation: "城市进入恢复窗口，但账本、创伤和信任问题开始浮出水面。结局不只看感染，也看代价如何被处理。",
      challenges: ["复课复工安排", "财政缺口", "公开复盘与公共记忆"],
      focus: "把恢复、解释和长期修复放进同一个结局。",
    },
  ];

  const STAGE_OBJECTIVES = {
    1: [
      { id: "p1_detect", metric: "detectedRate", op: ">=", target: 50, label: "看清早期信号", detail: "把发现率拉到能支持判断的水平，避免报告数字长期失真。" },
      { id: "p1_trust", metric: "trust", op: ">=", target: 55, label: "稳住第一轮信任", detail: "早期口径要经得起追问，避免低配合过早出现。" },
      { id: "p1_fatigue", metric: "staffFatigue", op: "<=", target: 45, label: "保留基层余力", detail: "不要在疫情尚未明朗时把排班压到失灵边缘。" },
    ],
    2: [
      { id: "p2_detect", metric: "detectedRate", op: ">=", target: 60, label: "形成监测底盘", detail: "扩散确认期需要足够发现率支撑转运和分区判断。" },
      { id: "p2_hospital", metric: "hospitalLoad", op: "<=", target: 65, label: "压住医院上行", detail: "医疗负载不要带着高位进入方舱和筛查期。" },
      { id: "p2_supplies", metric: "supplies", op: ">=", target: 45, label: "保供不断档", detail: "物资低位会同时拖累信任、疲劳和医疗效率。" },
    ],
    3: [
      { id: "p3_supplies", metric: "supplies", op: ">=", target: 55, label: "维持封控民生", detail: "高管控能否执行，取决于配送和药品能否托住。" },
      { id: "p3_trust", metric: "trust", op: ">=", target: 45, label: "避免低配合", detail: "信任跌破低位后，管控和检测都会变钝。" },
      { id: "p3_fatigue", metric: "staffFatigue", op: "<=", target: 70, label: "别让排班透支", detail: "基层疲劳进入高位会削弱后续所有补救动作。" },
    ],
    4: [
      { id: "p4_hospital", metric: "hospitalLoad", op: "<=", target: 80, label: "拆掉医疗高压", detail: "医疗负载越过红线会持续伤害信任并累积创伤。" },
      { id: "p4_funds", metric: "funds", op: ">=", target: 15, label: "留出救急资金", detail: "医疗扩容、分诊和保供都需要最低现金流支撑。" },
      { id: "p4_fatigue", metric: "staffFatigue", op: "<=", target: 75, label: "保护一线效率", detail: "医护和社区排班透支后，救急按钮也会变钝。" },
    ],
    5: [
      { id: "p5_economy", metric: "economy", op: ">=", target: 40, label: "恢复城市活力", detail: "活力过低会限制财政、供应恢复和复工窗口。" },
      { id: "p5_infection", metric: "infection", op: "<=", target: 75, label: "防止恢复反弹", detail: "复工和流动恢复不能把感染压力重新推上红线。" },
      { id: "p5_trust", metric: "trust", op: ">=", target: 45, label: "留住执行配合", detail: "恢复期若信任不足，任何细颗粒治理都会变粗糙。" },
    ],
    6: [
      { id: "p6_memory", metric: "publicMemory", op: "<=", target: 55, label: "处理公共创伤", detail: "创伤过高会压住最终结局，即使表面秩序恢复。" },
      { id: "p6_economy", metric: "economy", op: ">=", target: 45, label: "让恢复落地", detail: "城市需要足够活力承接复课、复工和财政结算。" },
      { id: "p6_hospital", metric: "hospitalLoad", op: "<=", target: 75, label: "避免收尾挤兑", detail: "最后阶段仍要守住普通门诊和发热门诊的分流。" },
    ],
  };

  const ACTIONS = {
    expandTesting: {
      label: "扩大检测",
      icon: "search",
      intent: "提高发现率，提前看见风险",
      summary: "发现率上升，消耗物资并增加基层疲劳。",
      compute(state) {
        const m = state.metrics;
        const hidden = { detectedRate: m.trust < 35 ? 5 : 8 };
        if (m.staffFatigue <= 35) hidden.detectedRate += 1;
        if (m.trust >= 75) hidden.detectedRate += 1;
        return {
          effects: { supplies: -4, staffFatigue: m.trust >= 75 ? 3 : 4 },
          hidden,
          modifiers: { testingFocus: 1 },
          notes: [m.trust < 35 ? "低信任使检测配合下降" : "检测网络扩大"],
        };
      },
    },
    zoningControl: {
      label: "分区管控",
      icon: "map",
      intent: "压低局部传播",
      summary: "降低感染，抬高管控强度，损伤活力与基层状态。",
      compute(state) {
        const m = state.metrics;
        const highTrustBuffer = m.trust >= 75;
        const infectionRelief = (m.trust >= 65 ? -4 : -3) + (highTrustBuffer ? -1 : 0);
        return {
          effects: {
            infection: infectionRelief,
            economy: highTrustBuffer ? -3 : -4,
            staffFatigue: highTrustBuffer ? 3 : 5,
          },
          hidden: { policyStrictness: 10 },
          modifiers: {},
          notes: [m.trust >= 65 ? "配合度较高，管控更有效" : "执行阻力消耗基层"],
        };
      },
    },
    citywideSilence: {
      label: "全域静默",
      icon: "pause",
      intent: "用强管控迅速压低流动",
      summary: "大幅压低感染，但显著损伤活力、信任、物资与疲劳。",
      compute(state) {
        const m = state.metrics;
        const overused = state.flags.silenceUses >= 2;
        return {
          effects: {
            infection: -6,
            economy: -9,
            supplies: -5,
            trust: (m.supplies > 70 ? -3 : -4) + (overused ? -3 : 0),
            staffFatigue: (m.trust > 70 ? 7 : 8) + (overused ? 2 : 0),
          },
          hidden: {
            policyStrictness: 18,
            publicMemory: overused ? 6 : 2,
          },
          modifiers: {},
          flags: { silenceUses: 1 },
          notes: [overused ? "重复静默积累额外创伤" : "流动被迅速压低"],
        };
      },
    },
    supplyPriority: {
      label: "保供优先",
      icon: "package",
      intent: "稳住民生与配送",
      summary: "补充物资和信任，但消耗活力与基层。",
      compute(state) {
        const m = state.metrics;
        let supplyGain = m.staffFatigue > 80 ? 6 : 10;
        if (m.economy > 65) supplyGain += 1;
        if (m.staffFatigue <= 35) supplyGain += 1;
        if (m.supplies <= 25) supplyGain -= 1;
        if (m.economy <= 25) supplyGain -= 1;
        return {
          effects: {
            supplies: supplyGain,
            trust: 4,
            economy: -2,
            staffFatigue: 4,
          },
          hidden: {},
          modifiers: { supplyRecovery: 1 },
          notes: [m.staffFatigue > 80 ? "疲劳过高，配送效率打折" : "保供线路得到优先保障"],
        };
      },
    },
    medicalExpansion: {
      label: "医疗扩容",
      icon: "plus",
      intent: "缓解医院承压",
      summary: "降低医疗负载，消耗物资与人力，并积累少量创伤。",
      compute(state) {
        const m = state.metrics;
        let relief = m.economy < 30 ? -5 : -8;
        if (m.economy > 65) relief -= 1;
        if (m.staffFatigue <= 35) relief -= 1;
        if (m.economy <= 25) relief += 1;
        return {
          effects: {
            hospitalLoad: relief,
            supplies: -6,
            staffFatigue: 6,
          },
          hidden: { publicMemory: 1 },
          modifiers: { medicalRelief: 2 },
          notes: [m.economy < 30 ? "财政和物流限制了扩容效率" : "临时容量开始释放压力"],
        };
      },
    },
    transparency: {
      label: "信息公开",
      icon: "broadcast",
      intent: "修复信任与信息质量",
      summary: "提升信任和发现率，但坏消息会带来短期压力。",
      compute(state) {
        const m = state.metrics;
        const trustGain = (m.hospitalLoad > 85 ? 5 : 7) + (state.hidden.publicMemory <= 15 ? 1 : 0);
        return {
          effects: {
            trust: trustGain,
            infection: 1,
          },
          hidden: { detectedRate: 3 },
          modifiers: { transparencyBonus: 1 },
          notes: [m.hospitalLoad > 85 ? "坏消息削弱了公开带来的安定感" : "信息透明改善了配合度"],
        };
      },
    },
    reopenPilot: {
      label: "复工试点",
      icon: "factory",
      intent: "恢复城市活力",
      summary: "恢复经济并放松管控，但增加感染反弹风险。",
      compute(state) {
        const m = state.metrics;
        const h = state.hidden;
        let infectionCost = h.detectedRate < 50 ? 5 : 3;
        if (h.detectedRate >= 80) infectionCost -= 1;
        if (h.detectedRate <= 35) infectionCost += 1;
        if (m.infection <= 25) infectionCost -= 1;
        infectionCost = Math.max(1, infectionCost);
        return {
          effects: {
            economy: 8,
            infection: infectionCost,
            trust: 1,
          },
          hidden: { policyStrictness: -6 },
          modifiers: { reopenBonus: 1 },
          notes: [h.detectedRate < 50 ? "发现率偏低，复工风险被低估" : "试点区域具备基本监测"],
        };
      },
    },
    restPolicy: {
      label: "轮休与减压",
      icon: "heart",
      intent: "恢复执行能力",
      summary: "显著降低基层疲劳，但短期增加医院与物资压力。",
      compute(state) {
        const m = state.metrics;
        const highTrust = m.trust >= 75;
        const lowHospital = m.hospitalLoad <= 35;
        return {
          effects: {
            staffFatigue: (m.trust >= 60 ? -10 : -8) + (highTrust ? -1 : 0),
            hospitalLoad: lowHospital ? 1 : 2,
            supplies: highTrust ? -1 : -2,
          },
          hidden: {},
          modifiers: { restPolicyBonus: 2 },
          notes: [m.trust >= 60 ? "居民理解让轮休更顺利" : "轮休缓解透支，但接替成本较高"],
        };
      },
    },
    supportTeam: {
      label: "调配支援队",
      icon: "users",
      intent: "用外部人手接住基层排班",
      summary: "降低基层疲劳，但消耗资金、物资并牺牲部分信任。",
      maxUses: 3,
      compute(state) {
        const fatigueRelief = state.metrics.trust < 35 ? -3 : -6;
        return {
          resources: { funds: -6 },
          effects: { staffFatigue: fatigueRelief, trust: -3, supplies: -2 },
          hidden: {},
          modifiers: { restPolicyBonus: 1 },
          notes: [state.metrics.trust < 35 ? "低信任让临时支援难以顺利接管" : "支援队分担了一线压力"],
        };
      },
    },
    compressAdmin: {
      label: "压缩社区台账",
      icon: "clipboard",
      intent: "砍掉非必要填报，让人手回到现场",
      summary: "降低疲劳，但发现率和信任都会受损。",
      maxUses: 3,
      compute() {
        return {
          effects: { staffFatigue: -4, trust: -2, infection: 1 },
          hidden: { detectedRate: -4 },
          modifiers: { restPolicyBonus: 1 },
          notes: ["台账被压缩，基层喘了一口气，但信息颗粒度变粗"],
        };
      },
    },
    outsourceDelivery: {
      label: "临时外包配送",
      icon: "truck",
      intent: "用外包队伍替换一部分社区配送",
      summary: "降低疲劳并补充物资，但资金和信任都会承压。",
      maxUses: 3,
      compute() {
        return {
          resources: { funds: -8 },
          effects: { staffFatigue: -3, supplies: 4, trust: -4 },
          hidden: { publicMemory: 1 },
          modifiers: { supplyRecovery: 1 },
          notes: ["外包队伍接入配送，但居民对价格和公平性有疑虑"],
        };
      },
      condition(state) {
        return state.resources.funds >= 20;
      },
    },
    forceSimplify: {
      label: "强制简化流程",
      icon: "scissors",
      intent: "用行政命令砍掉流程层级",
      summary: "快速降低疲劳，但显著损害信任、发现率和公共记忆。",
      maxUses: 1,
      compute() {
        return {
          effects: { staffFatigue: -7, trust: -6 },
          hidden: { detectedRate: -6, publicMemory: 2 },
          modifiers: { restPolicyBonus: 1 },
          notes: ["流程被强行压扁，短期有效，长期会留下争议"],
        };
      },
    },
    fiscalDebt: {
      label: "定向财政举债",
      icon: "coin",
      intent: "提前透支恢复期财政换取眼前资金",
      summary: "补充资金，但损伤活力、信任并积累创伤。",
      maxUses: 2,
      compute(state) {
        return {
          resources: { funds: state.metrics.economy < 30 ? 9 : 14 },
          effects: { economy: -4, trust: -3 },
          hidden: { publicMemory: 1 },
          modifiers: {},
          notes: [state.metrics.economy < 30 ? "活力低迷限制了举债空间" : "财政额度被提前挪到应急账本"],
        };
      },
    },
  };

  function p(resources = {}, effects = {}, hidden = {}, modifiers = {}, extra = {}) {
    return { resources, effects, hidden, modifiers, ...extra };
  }

  const CHOICE_PROFILES = {
    open: p({}, { trust: 1, infection: 1 }, { detectedRate: 2, publicMemory: -1 }, { transparencyBonus: 1 }, {
      axis: "公开沟通",
      risk: "追问与短期恐慌",
      delayed: { delay: 2, label: "公开后的追问", effects: { trust: -2 }, condition: "hospitalAtLeast80" },
    }),
    hard: p({}, { infection: -2, trust: -5, staffFatigue: 2 }, { policyStrictness: 5, publicMemory: 2 }, {}, {
      axis: "强制秩序",
      risk: "低信任回流",
      delayed: { delay: 3, label: "强硬处置余波", effects: { trust: -2 }, condition: "trustBelow40" },
    }),
    testing: p({}, { infection: -1, supplies: -3, staffFatigue: 3 }, { detectedRate: 5 }, { testingFocus: 1 }, {
      axis: "扩大筛查",
      risk: "采样与复核挤压",
      delayed: { delay: 2, label: "检测排队压力", effects: { staffFatigue: 1 }, condition: "staffFatigueAbove75" },
    }),
    medical: p({ funds: -5 }, { hospitalLoad: -7, supplies: -3, staffFatigue: 2 }, { publicMemory: 1 }, { medicalRelief: 1 }, {
      axis: "医疗救急",
      risk: "物资和人手透支",
      delayed: { delay: 2, label: "医疗扩容账单", resources: { funds: -2 }, effects: { staffFatigue: 1 } },
    }),
    triage: p({ funds: -3 }, { hospitalLoad: -6, trust: 2, staffFatigue: 1 }, { detectedRate: 1 }, { medicalRelief: 1 }, {
      axis: "分级调度",
      risk: "标准争议",
      delayed: { delay: 3, label: "分诊标准被复盘", effects: { trust: -1 }, condition: "trustBelow45" },
    }),
    supply: p({ funds: -4 }, { supplies: 4, trust: 1, staffFatigue: 2, economy: -1 }, {}, { supplyRecovery: 1 }, {
      axis: "保供补位",
      risk: "配送和仓储消耗",
      delayed: { delay: 2, label: "配送队疲劳回流", effects: { staffFatigue: 1 }, condition: "staffFatigueAbove75" },
    }),
    outsource: p({ funds: -7 }, { supplies: 4, staffFatigue: -3, trust: -4 }, { publicMemory: 1 }, { supplyRecovery: 1 }, {
      axis: "外包与征用",
      risk: "公平性质疑",
      delayed: { delay: 3, label: "外包合同争议", effects: { trust: -2 }, condition: "trustBelow45" },
    }),
    rest: p({ funds: -3 }, { staffFatigue: -8, hospitalLoad: 2, supplies: -2, trust: 1 }, {}, { restPolicyBonus: 1 }, {
      axis: "轮换减压",
      risk: "服务窗口变薄",
      delayed: { delay: 2, label: "轮休稳定生效", effects: { staffFatigue: -2 }, condition: "trustAtLeast60" },
    }),
    compress: p({}, { staffFatigue: -5, trust: -3, infection: 1 }, { detectedRate: -4, publicMemory: 1 }, { restPolicyBonus: 1 }, {
      axis: "压缩流程",
      risk: "信息质量下降",
      delayed: { delay: 3, label: "漏报补录", effects: { infection: 1 }, condition: "detectedBelow50" },
    }),
    finance: p({ funds: 12 }, { economy: -3, trust: -4 }, { publicMemory: 2 }, {}, {
      axis: "财政透支",
      risk: "恢复期账单",
      delayed: { delay: 4, label: "举债压力显现", effects: { economy: -2 }, resources: { funds: -2 } },
    }),
    reopen: p({ funds: 2 }, { economy: 7, infection: 3, trust: 1 }, { policyStrictness: -4 }, { reopenBonus: 1 }, {
      axis: "恢复流动",
      risk: "传播反弹",
      delayed: { delay: 2, label: "流动反弹观察", effects: { infection: 2 }, condition: "detectedBelow50" },
    }),
    digital: p({ funds: -5 }, { trust: -2, staffFatigue: 1 }, { detectedRate: 4, policyStrictness: 2 }, { testingFocus: 1 }, {
      axis: "数字治理",
      risk: "误判和申诉积压",
      delayed: { delay: 3, label: "申诉队列堆积", effects: { trust: -2 }, condition: "trustBelow45" },
    }),
    audit: p({ funds: -2 }, { trust: 1, economy: -2 }, { publicMemory: -1 }, { transparencyBonus: 1 }, {
      axis: "审计留痕",
      risk: "一线速度放慢",
      delayed: { delay: 2, label: "审计材料补交", effects: { staffFatigue: 1 } },
    }),
    delay: p({}, { trust: 3 }, { detectedRate: -5, publicMemory: 4 }, {}, {
      axis: "延后公布",
      risk: "坏消息集中爆发",
      delayed: { delay: 3, label: "延迟公布反噬", effects: { trust: -6 }, condition: "hospitalAtLeast80" },
    }),
    whiteList: p({ funds: 4 }, { economy: 8, infection: 2, trust: -5 }, { policyStrictness: -3, publicMemory: 1 }, { reopenBonus: 1 }, {
      axis: "白名单豁免",
      risk: "公平性争议",
      delayed: { delay: 3, label: "白名单外泄", effects: { trust: -2 }, condition: "trustBelow45" },
    }),
    compensate: p({ funds: -7 }, { trust: 3, economy: -1, staffFatigue: 1 }, { publicMemory: -2 }, { transparencyBonus: 1 }, {
      axis: "补偿安抚",
      risk: "资金消耗",
      delayed: { delay: 3, label: "补偿缺口", resources: { funds: -2 }, condition: "fundsBelow20" },
    }),
    community: p({}, { staffFatigue: -6, trust: -3, supplies: -2 }, { publicMemory: 1 }, { restPolicyBonus: 1 }, {
      axis: "社区自治",
      risk: "责任下沉",
      delayed: { delay: 2, label: "自治标准不一", effects: { trust: -1 }, condition: "trustBelow45" },
    }),
    volunteer: p({ funds: -4 }, { staffFatigue: -7, trust: 2, supplies: -1 }, {}, { restPolicyBonus: 1 }, {
      axis: "志愿补位",
      risk: "培训和补贴压力",
      delayed: { delay: 2, label: "志愿者磨合", effects: { staffFatigue: 1 } },
    }),
    supportTeam: p({ funds: -5 }, { staffFatigue: -8, supplies: -2, trust: -3 }, { publicMemory: 1 }, { restPolicyBonus: 1 }, {
      axis: "外部支援",
      risk: "磨合和信任代价",
      delayed: { delay: 2, label: "支援队磨合", effects: { trust: -1 }, condition: "trustBelow45" },
    }),
    messageControl: p({}, { infection: -1, trust: -6 }, { policyStrictness: 5, detectedRate: -2, publicMemory: 2 }, {}, {
      axis: "口径压制",
      risk: "信任伤痕",
      delayed: { delay: 3, label: "口径冲突回流", effects: { trust: -2 }, condition: "trustBelow40" },
    }),
    medicine: p({ funds: -4 }, { hospitalLoad: -4, supplies: -5, trust: 3, staffFatigue: 3 }, {}, { medicalRelief: 1 }, {
      axis: "重点救治",
      risk: "药品与配送消耗",
      delayed: { delay: 2, label: "慢病药库存告急", effects: { supplies: -2 }, condition: "suppliesBelow25" },
    }),
    protectWorkers: p({ funds: -4 }, { staffFatigue: -5, supplies: -3, trust: 2 }, { detectedRate: 1 }, { restPolicyBonus: 1 }, {
      axis: "保护一线",
      risk: "防护物资消耗",
      delayed: { delay: 2, label: "防护消耗补单", effects: { supplies: -1 } },
    }),
    mutualAid: p({}, { supplies: 3, trust: 3, economy: 1, staffFatigue: 1 }, { detectedRate: -1 }, { supplyRecovery: 1 }, {
      axis: "居民互助",
      risk: "秩序和质量参差",
      delayed: { delay: 3, label: "互助群质量争议", effects: { trust: -1 }, condition: "trustBelow45" },
    }),
    quietClose: p({}, { infection: -3, economy: -4, trust: -4, staffFatigue: 3 }, { policyStrictness: 7, publicMemory: 2 }, {}, {
      axis: "静默收紧",
      risk: "疲劳与创伤",
      delayed: { delay: 2, label: "静默代价显现", effects: { staffFatigue: 1, trust: -1 } },
    }),
    memory: p({ funds: -2 }, { trust: 3, economy: -2, staffFatigue: -2 }, { publicMemory: -5 }, { transparencyBonus: 1, restPolicyBonus: 1 }, {
      axis: "公共记忆",
      risk: "复盘牵动旧伤",
      delayed: { delay: 3, label: "复盘后的释压", effects: { trust: 1, staffFatigue: -1 } },
    }),
  };

  const ROUTE_TAGS = {
    open: { label: "公开修复", tone: "good" },
    audit: { label: "公开修复", tone: "good" },
    messageControl: { label: "口径压制", tone: "danger" },
    delay: { label: "口径压制", tone: "danger" },
    hard: { label: "高压止血", tone: "danger" },
    quietClose: { label: "高压止血", tone: "danger" },
    expandTesting: { label: "监测治理", tone: "info" },
    zoningControl: { label: "高压止血", tone: "danger" },
    citywideSilence: { label: "高压止血", tone: "danger" },
    supplyPriority: { label: "民生保供", tone: "good" },
    medicalExpansion: { label: "医疗优先", tone: "good" },
    transparency: { label: "公开修复", tone: "good" },
    reopenPilot: { label: "恢复财政", tone: "mixed" },
    restPolicy: { label: "基层减压", tone: "good" },
    rest: { label: "基层减压", tone: "good" },
    protectWorkers: { label: "基层减压", tone: "good" },
    volunteer: { label: "基层减压", tone: "good" },
    community: { label: "基层减压", tone: "mixed" },
    compress: { label: "基层减压", tone: "mixed" },
    supply: { label: "民生保供", tone: "good" },
    medicine: { label: "民生保供", tone: "good" },
    compensate: { label: "民生保供", tone: "good" },
    outsource: { label: "民生保供", tone: "mixed" },
    medical: { label: "医疗优先", tone: "good" },
    triage: { label: "医疗优先", tone: "good" },
    shelter: { label: "医疗优先", tone: "good" },
    buildShelterHospital: { label: "医疗优先", tone: "good" },
    triageNetwork: { label: "医疗优先", tone: "good" },
    communityClinic: { label: "医疗优先", tone: "good" },
    shelterAdmissionStandard: { label: "医疗优先", tone: "mixed" },
    testing: { label: "监测治理", tone: "info" },
    digital: { label: "监测治理", tone: "info" },
    code: { label: "监测治理", tone: "info" },
    deployHealthCode: { label: "监测治理", tone: "info" },
    campusSentinel: { label: "监测治理", tone: "info" },
    reopen: { label: "恢复财政", tone: "mixed" },
    whiteList: { label: "恢复财政", tone: "mixed" },
    finance: { label: "财政透支", tone: "danger" },
    fiscalTransparencyLedger: { label: "筹措资金", tone: "good" },
    emergencyGapLedger: { label: "筹措资金", tone: "good" },
    fastGrantReport: { label: "筹措资金", tone: "good" },
    bankCreditWindow: { label: "筹措资金", tone: "mixed" },
    publicDonationDrive: { label: "筹措资金", tone: "good" },
    donationClaimList: { label: "筹措资金", tone: "good" },
    platformLogisticsShare: { label: "筹措资金", tone: "mixed" },
    procurementCreditNegotiation: { label: "筹措资金", tone: "mixed" },
    supplierPaymentExtension: { label: "筹措资金", tone: "mixed" },
    emergencyAccountClearing: { label: "筹措资金", tone: "mixed" },
    specialFundingApplication: { label: "筹措资金", tone: "mixed" },
    donationCoordination: { label: "筹措资金", tone: "good" },
    interProvinceSupport: { label: "筹措资金", tone: "good" },
    budgetFreezeReview: { label: "筹措资金", tone: "mixed" },
    insurancePreSettlement: { label: "筹措资金", tone: "good" },
    microEnterpriseRoster: { label: "低接触活力", tone: "good" },
    onlineVendorDesk: { label: "低接触活力", tone: "good" },
    neighborhoodErrandRoster: { label: "低接触活力", tone: "mixed" },
    neighborhoodCommerceLedger: { label: "恢复财政", tone: "mixed" },
    rentDeferralCoordination: { label: "低接触活力", tone: "mixed" },
    serviceVoucherPilot: { label: "低接触活力", tone: "mixed" },
    contactlessLivelihoodStalls: { label: "低接触活力", tone: "mixed" },
    neighborhoodPickupWindow: { label: "低接触活力", tone: "mixed" },
    onlineGovOvertime: { label: "低接触活力", tone: "good" },
    remoteApprovalDesk: { label: "低接触活力", tone: "good" },
    communityRepairWhitelist: { label: "低接触活力", tone: "mixed" },
    essentialMaintenanceRoster: { label: "低接触活力", tone: "mixed" },
    microFreightPermit: { label: "低接触活力", tone: "mixed" },
    essentialServicePermit: { label: "低接触活力", tone: "mixed" },
    factoryClosedLoop: { label: "低接触活力", tone: "mixed" },
    livelihoodStaggeredReopen: { label: "低接触活力", tone: "mixed" },
    closedLoopSmallShift: { label: "低接触活力", tone: "mixed" },
    contactlessServiceRegistry: { label: "低接触活力", tone: "mixed" },
    remoteWorkGovServices: { label: "低接触活力", tone: "good" },
    taxFeeDeferralDesk: { label: "低接触活力", tone: "mixed" },
    budgetReallocationMeeting: { label: "财政透支", tone: "danger" },
    specialBondQuota: { label: "财政透支", tone: "danger" },
    jobSubsidyAdvance: { label: "低接触活力", tone: "mixed" },
    mutualAidFund: { label: "筹措资金", tone: "good" },
    temporaryTurnoverPool: { label: "财政透支", tone: "mixed" },
    lowContactBusinessPermit: { label: "低接触活力", tone: "mixed" },
    supplyOrderPrepaySwap: { label: "民生保供", tone: "mixed" },
    deferProjectPayment: { label: "财政透支", tone: "danger" },
    lowRiskWorkList: { label: "低接触活力", tone: "mixed" },
    elasticTransit: { label: "低接触活力", tone: "mixed" },
    enterpriseExemption: { label: "恢复财政", tone: "mixed" },
    emergencyLevy: { label: "财政透支", tone: "danger" },
    fiscalDebt: { label: "财政透支", tone: "danger" },
    nightFreightWindow: { label: "民生保供", tone: "mixed" },
    supplyCorridor: { label: "民生保供", tone: "good" },
    medicineRoute: { label: "民生保供", tone: "good" },
    priorityMedicineRoute: { label: "民生保供", tone: "good" },
    hardWarehouse: { label: "民生保供", tone: "danger" },
    volunteerDispatch: { label: "基层减压", tone: "good" },
    mentalHealthLine: { label: "基层减压", tone: "good" },
    staffRotationOrder: { label: "基层减压", tone: "good" },
    communityAutonomy: { label: "基层减压", tone: "mixed" },
    suppressRumorLine: { label: "口径压制", tone: "danger" },
    delayBadNews: { label: "口径压制", tone: "danger" },
    publicReviewBrief: { label: "公开修复", tone: "good" },
    memory: { label: "创伤修复", tone: "good" },
    mutualAid: { label: "创伤修复", tone: "good" },
    dynamicRepair: { label: "应急托底", tone: "info" },
    dynamicRelease: { label: "基层减压", tone: "good" },
    dynamicConcentrate: { label: "高压止血", tone: "danger" },
    dynamicMomentum: { label: "恢复财政", tone: "good" },
    fallback_livelihood: { label: "民生保供", tone: "good" },
    fallback_control: { label: "高压止血", tone: "danger" },
    fallback_relief: { label: "基层减压", tone: "good" },
  };

  const STRATEGY_ROUTES = [
    {
      id: "openRepair",
      label: "公开修复",
      tone: "good",
      labels: ["公开修复"],
      advice: "继续用可核验说明、审计和复盘保护信任，同时别让医疗与供应只停在口头修复。",
    },
    {
      id: "control",
      label: "管控止血",
      tone: "danger",
      labels: ["口径压制", "高压止血"],
      advice: "压低传播很快，但信任、创伤、活力和疲劳都会还账，需要配套保供和公开修复。",
    },
    {
      id: "livelihood",
      label: "民生保供",
      tone: "good",
      labels: ["民生保供"],
      advice: "民生路线能稳住耐心和库存，但不能直接替代医疗分流、检测和感染控制。",
    },
    {
      id: "medical",
      label: "医疗优先",
      tone: "good",
      labels: ["医疗优先"],
      advice: "医疗路线能拆失败风险，但资金、物资和基层负荷会被持续占用。",
    },
    {
      id: "monitoring",
      label: "监测治理",
      tone: "info",
      labels: ["监测治理"],
      advice: "监测让复工和分区更可靠，但在低信任或高疲劳时容易变成申诉与执行压力。",
    },
    {
      id: "workerRelief",
      label: "基层减压",
      tone: "good",
      labels: ["基层减压"],
      advice: "减压能保住后期执行效率，但如果只减压不拆医疗和传播，压力会换地方堆积。",
    },
    {
      id: "recovery",
      label: "恢复财政",
      tone: "mixed",
      labels: ["恢复财政", "筹措资金", "低接触活力", "财政透支"],
      advice: "财政与活力路线能扩大回旋余地，但感染反弹、公平性质疑和账期压力要提前兜住。",
    },
    {
      id: "memory",
      label: "创伤修复",
      tone: "good",
      labels: ["创伤修复"],
      advice: "修复创伤能改善结局质感，但通常需要牺牲短期效率或资金。",
    },
    {
      id: "fallback",
      label: "应急托底",
      tone: "info",
      labels: ["应急托底"],
      advice: "托底选择说明局势已进入补救段，后续要尽快回到更明确的长期路线。",
    },
  ];

  const STRATEGY_COMPLEMENTS = {
    control: {
      routeIds: ["livelihood", "openRepair", "workerRelief"],
      label: "建议补：民生保供 / 公开修复 / 基层减压",
      detail: "高压止血越重，越需要把生活供应、解释口径和基层休整一起补上。",
    },
    recovery: {
      routeIds: ["monitoring", "livelihood", "medical"],
      label: "建议补：监测治理 / 民生保供 / 医疗优先",
      detail: "恢复财政会带回流动和公平性质疑，需要用监测、保供和医疗缓冲接住反弹。",
    },
    medical: {
      routeIds: ["recovery", "workerRelief", "livelihood"],
      label: "建议补：恢复财政 / 基层减压 / 民生保供",
      detail: "医疗优先会持续占用资金、物资和人手，需要财政与基层路线分担账单。",
    },
    monitoring: {
      routeIds: ["medical", "recovery", "openRepair"],
      label: "建议补：医疗优先 / 恢复财政 / 公开修复",
      detail: "监测治理能看见问题，但复核、申诉和检测账单要靠医疗、财政与公开解释承接。",
    },
    livelihood: {
      routeIds: ["medical", "monitoring", "recovery"],
      label: "建议补：医疗优先 / 监测治理 / 恢复财政",
      detail: "民生保供能稳住耐心，但不能替代医院分流、传播监测和长期现金流。",
    },
    workerRelief: {
      routeIds: ["medical", "monitoring", "livelihood"],
      label: "建议补：医疗优先 / 监测治理 / 民生保供",
      detail: "基层减压能保执行力，但如果不处理医院、传播和供应，压力会换位置堆积。",
    },
    openRepair: {
      routeIds: ["medical", "livelihood", "recovery"],
      label: "建议补：医疗优先 / 民生保供 / 恢复财政",
      detail: "公开修复能保信任，但必须配套看得见的医疗、供应和财政动作。",
    },
    memory: {
      routeIds: ["recovery", "medical", "openRepair"],
      label: "建议补：恢复财政 / 医疗优先 / 公开修复",
      detail: "创伤修复改善恢复质感，但需要财政、医疗和可核验复盘把承诺落地。",
    },
    fallback: {
      routeIds: ["medical", "livelihood", "recovery"],
      label: "建议补：医疗优先 / 民生保供 / 恢复财政",
      detail: "应急托底只能争取窗口，下一步要回到能改变结构的长期路线。",
    },
  };

  function badgeAtLeast(value, target) {
    return clamp(Math.round((value / target) * 100), 0, 100);
  }

  function badgeAtMost(value, target) {
    if (value <= target) return 100;
    return clamp(Math.round(((100 - value) / (100 - target)) * 100), 0, 100);
  }

  function badgeWeighted(parts) {
    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0) || 1;
    return clamp(Math.round(parts.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight), 0, 100);
  }

  const CITY_BADGE_RULES = [
    {
      id: "monitoring_net",
      label: "监测成网",
      category: "监测",
      tone: "info",
      detail: "发现率达到 70，且健康码、校园哨点或其他监测工程已经铺开。",
      hint: "提高发现率并部署健康码或校园哨点。",
      condition(state) {
        return state.hidden.detectedRate >= 70
          && (state.completedProjects.healthCode || (state.flags.operationUses.campusSentinel || 0) > 0);
      },
      progress(state) {
        const asset = state.completedProjects.healthCode || (state.flags.operationUses.campusSentinel || 0) > 0 ? 100 : 0;
        return badgeWeighted([
          { value: badgeAtLeast(state.hidden.detectedRate, 70), weight: 7 },
          { value: asset, weight: 3 },
        ]);
      },
    },
    {
      id: "medical_buffer",
      label: "医疗缓冲带",
      category: "医疗",
      tone: "good",
      detail: "医疗负载保持在 55 以下，并形成方舱、分诊或社区门诊等分流资产。",
      hint: "降低医疗负载，并完成至少一个分流工程。",
      condition(state) {
        return state.metrics.hospitalLoad <= 55
          && (state.completedProjects.shelterHospital
            || state.completedProjects.triageNetwork
            || state.completedProjects.communityClinic);
      },
      progress(state) {
        const asset = state.completedProjects.shelterHospital || state.completedProjects.triageNetwork || state.completedProjects.communityClinic ? 100 : 0;
        return badgeWeighted([
          { value: badgeAtMost(state.metrics.hospitalLoad, 55), weight: 6 },
          { value: asset, weight: 4 },
        ]);
      },
    },
    {
      id: "supply_mesh",
      label: "保供网格",
      category: "民生",
      tone: "good",
      detail: "物资供应达到 75，并有保供专线、捐助统筹或微循环类行动支撑。",
      hint: "把物资推到 75，并铺设保供或捐助协作渠道。",
      condition(state) {
        return state.metrics.supplies >= 75
          && (state.completedProjects.supplyCorridor
            || (state.flags.operationUses.donationCoordination || 0) > 0
            || (state.flags.operationUses.microFreightPermit || 0) > 0);
      },
      progress(state) {
        const asset = state.completedProjects.supplyCorridor
          || (state.flags.operationUses.donationCoordination || 0) > 0
          || (state.flags.operationUses.microFreightPermit || 0) > 0 ? 100 : 0;
        return badgeWeighted([
          { value: badgeAtLeast(state.metrics.supplies, 75), weight: 7 },
          { value: asset, weight: 3 },
        ]);
      },
    },
    {
      id: "trusted_city",
      label: "高配合城市",
      category: "信任",
      tone: "good",
      detail: "市民信任达到 75，且公共创伤未进入高位。",
      hint: "提高信任，并避免公共创伤持续积累。",
      condition(state) {
        return state.metrics.trust >= 75 && state.hidden.publicMemory <= 35;
      },
      progress(state) {
        const memoryPenalty = state.hidden.publicMemory > 35 ? 18 : 0;
        return clamp(Math.round((state.metrics.trust / 75) * 100 - memoryPenalty), 0, 100);
      },
    },
    {
      id: "worker_breathing_room",
      label: "基层喘息",
      category: "执行",
      tone: "good",
      detail: "进入第二阶段后，基层疲劳仍低于 45，说明轮换、支援或减压机制有效。",
      hint: "在第 13 天后把基层疲劳压到 45 以下。",
      condition(state) {
        return state.day >= 13 && state.metrics.staffFatigue <= 45;
      },
      progress(state) {
        const dayPart = state.day >= 13 ? 35 : Math.round((state.day / 13) * 35);
        return badgeWeighted([
          { value: Math.round((dayPart / 35) * 100), weight: 5 },
          { value: badgeAtMost(state.metrics.staffFatigue, 45), weight: 5 },
        ]);
      },
    },
    {
      id: "fiscal_landing",
      label: "恢复落地",
      category: "财政",
      tone: "mixed",
      detail: "进入第四阶段后，城市活力达到 55 且资金不低于 35，恢复不只停在口号里。",
      hint: "第 37 天后，让活力达到 55，并保留 35 以上资金。",
      condition(state) {
        return state.day >= 37 && state.metrics.economy >= 55 && state.resources.funds >= 35;
      },
      progress(state) {
        const dayPart = state.day >= 37 ? 100 : Math.round((state.day / 37) * 100);
        return badgeWeighted([
          { value: dayPart, weight: 5 },
          { value: badgeAtLeast(state.metrics.economy, 55), weight: 3 },
          { value: badgeAtLeast(state.resources.funds, 35), weight: 2 },
        ]);
      },
    },
    {
      id: "low_spread_window",
      label: "低传播窗口",
      category: "疫情",
      tone: "info",
      detail: "进入第二阶段后，感染压力低于 35 且医疗负载未被推上高位。",
      hint: "第 13 天后，把感染压到 35 以下，并让医疗负载低于 65。",
      condition(state) {
        return state.day >= 13 && state.metrics.infection <= 35 && state.metrics.hospitalLoad <= 65;
      },
      progress(state) {
        const dayPart = state.day >= 13 ? 100 : Math.round((state.day / 13) * 100);
        return badgeWeighted([
          { value: dayPart, weight: 5 },
          { value: badgeAtMost(state.metrics.infection, 35), weight: 3 },
          { value: badgeAtMost(state.metrics.hospitalLoad, 65), weight: 2 },
        ]);
      },
    },
    {
      id: "memory_repair",
      label: "记忆修复",
      category: "创伤",
      tone: "good",
      detail: "进入后半程后，公共创伤仍低于 18，且通过公开复盘或创伤修复路线做过解释。",
      hint: "第 37 天后控制公共创伤，并通过复盘或创伤修复行动。",
      condition(state) {
        return state.day >= 37
          && state.hidden.publicMemory <= 18
          && (Boolean(state.flags.resolutions.publicReviewBrief)
            || (state.history || []).some((entry) => entry.routeLabel === "创伤修复" || entry.routeLabel === "公开修复"));
      },
      progress(state) {
        const dayPart = state.day >= 37 ? 100 : Math.round((state.day / 37) * 100);
        const routePart = Boolean(state.flags.resolutions.publicReviewBrief)
          || (state.history || []).some((entry) => entry.routeLabel === "创伤修复" || entry.routeLabel === "公开修复") ? 25 : 0;
        return badgeWeighted([
          { value: dayPart, weight: 5 },
          { value: routePart ? 100 : 0, weight: 2 },
          { value: badgeAtMost(state.hidden.publicMemory, 18), weight: 3 },
        ]);
      },
    },
    {
      id: "mixed_governance",
      label: "组合治理",
      category: "路线",
      tone: "info",
      detail: "本局已经使用至少 4 条治理路线，避免单一路线把代价堆到同一处。",
      hint: "在事件、工程和决议里使用至少 4 种不同治理路线。",
      condition(state) {
        const profile = getStrategyProfile(state);
        return (profile.routes || []).filter((route) => route.count > 0).length >= 4 && profile.total >= 6;
      },
      progress(state) {
        const profile = getStrategyProfile(state);
        const active = (profile.routes || []).filter((route) => route.count > 0).length;
        return clamp(active * 18 + Math.min(profile.total || 0, 6) * 5, 0, 100);
      },
    },
  ];

  function cityBadgeGaps(id, state) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const operationUses = state.flags.operationUses || {};
    const history = state.history || [];
    const gaps = [];
    const addAtLeast = (label, value, target) => {
      if (value < target) gaps.push(`${label} +${target - value}`);
    };
    const addAtMost = (label, value, target) => {
      if (value > target) gaps.push(`${label} -${value - target}`);
    };
    const addDay = (day) => {
      if (state.day < day) gaps.push(`等到第${day}天`);
    };
    const hasMonitoringAsset = state.completedProjects.healthCode || (operationUses.campusSentinel || 0) > 0;
    const hasMedicalAsset = state.completedProjects.shelterHospital
      || state.completedProjects.triageNetwork
      || state.completedProjects.communityClinic;
    const hasSupplyAsset = state.completedProjects.supplyCorridor
      || (operationUses.donationCoordination || 0) > 0
      || (operationUses.microFreightPermit || 0) > 0;
    const hasMemoryRepair = Boolean(state.flags.resolutions.publicReviewBrief)
      || history.some((entry) => entry.routeLabel === "创伤修复" || entry.routeLabel === "公开修复");
    const routeProfile = id === "mixed_governance" ? getStrategyProfile(state) : null;

    if (id === "monitoring_net") {
      addAtLeast("发现率", h.detectedRate, 70);
      if (!hasMonitoringAsset) gaps.push("铺监测工程");
    } else if (id === "medical_buffer") {
      addAtMost("医疗负载", m.hospitalLoad, 55);
      if (!hasMedicalAsset) gaps.push("建分流资产");
    } else if (id === "supply_mesh") {
      addAtLeast("物资", m.supplies, 75);
      if (!hasSupplyAsset) gaps.push("铺保供资产");
    } else if (id === "trusted_city") {
      addAtLeast("信任", m.trust, 75);
      addAtMost("创伤", h.publicMemory, 35);
    } else if (id === "worker_breathing_room") {
      addDay(13);
      addAtMost("疲劳", m.staffFatigue, 45);
    } else if (id === "fiscal_landing") {
      addDay(37);
      addAtLeast("活力", m.economy, 55);
      addAtLeast("资金", r.funds, 35);
    } else if (id === "low_spread_window") {
      addDay(13);
      addAtMost("感染", m.infection, 35);
      addAtMost("医疗负载", m.hospitalLoad, 65);
    } else if (id === "memory_repair") {
      addDay(37);
      addAtMost("创伤", h.publicMemory, 18);
      if (!hasMemoryRepair) gaps.push("完成复盘修复");
    } else if (id === "mixed_governance") {
      const active = (routeProfile.routes || []).filter((route) => route.count > 0).length;
      if (active < 4) gaps.push(`路线 +${4 - active}`);
      if ((routeProfile.total || 0) < 6) gaps.push(`行动 +${6 - (routeProfile.total || 0)}`);
    }

    return gaps.slice(0, 3);
  }

  const CITY_BADGE_FOCUS_CANDIDATES = {
    monitoring_net: [
      ["operations", "deployHealthCode"],
      ["operations", "campusSentinel"],
    ],
    medical_buffer: [
      ["operations", "triageNetwork"],
      ["operations", "communityClinic"],
      ["operations", "buildShelterHospital"],
      ["resolutions", "shelterAdmissionStandard"],
    ],
    supply_mesh: [
      ["operations", "supplyCorridor"],
      ["operations", "donationCoordination"],
      ["operations", "microFreightPermit"],
      ["operations", "publicDonationDrive"],
    ],
    trusted_city: [
      ["resolutions", "publicReviewBrief"],
      ["resolutions", "priorityMedicineRoute"],
      ["operations", "fiscalTransparencyLedger"],
    ],
    worker_breathing_room: [
      ["operations", "mentalHealthLine"],
      ["operations", "volunteerDispatch"],
      ["resolutions", "staffRotationOrder"],
    ],
    fiscal_landing: [
      ["operations", "emergencyGapLedger"],
      ["operations", "fastGrantReport"],
      ["operations", "remoteApprovalDesk"],
      ["operations", "factoryClosedLoop"],
    ],
    low_spread_window: [
      ["operations", "deployHealthCode"],
      ["operations", "campusSentinel"],
      ["resolutions", "lowRiskWorkList"],
    ],
    memory_repair: [
      ["resolutions", "publicReviewBrief"],
      ["operations", "mentalHealthLine"],
      ["resolutions", "priorityMedicineRoute"],
    ],
    mixed_governance: [
      ["operations", "fiscalTransparencyLedger"],
      ["operations", "triageNetwork"],
      ["operations", "volunteerDispatch"],
      ["operations", "supplyCorridor"],
    ],
  };

  function cityBadgeFocus(state, id) {
    const candidates = CITY_BADGE_FOCUS_CANDIDATES[id] || [];
    const rows = candidates
      .map(([mode, actionId]) => {
        const status = mode === "resolutions"
          ? getResolutionStatus(state, actionId)
          : getOperationStatus(state, actionId);
        if (!status) return null;
        return { mode, status };
      })
      .filter(Boolean);
    const selected = rows.find((row) => row.status.available)
      || rows.find((row) => row.status.lockedReason !== "次数已用完" && row.status.lockedReason !== "已通过")
      || rows[0];
    if (!selected) return null;
    const pointId = mapPointIdForAction(selected.mode, selected.status.id, selected.status.location);
    const point = getMapPoint(state, pointId);
    const detail = selected.status.available
      ? selected.status.description
      : selected.status.lockedDetail || selected.status.lockedReason || selected.status.description;
    return {
      mode: selected.mode,
      actionId: selected.status.id,
      pointId,
      pointLabel: point ? point.label : "",
      label: selected.status.label,
      status: selected.status.available ? "可执行" : unlockPreviewLabel(selected.status.lockedReason),
      detail,
      available: Boolean(selected.status.available),
    };
  }

  function mapPointIdForAction(mode, actionId, fallback = "") {
    if (fallback) return fallback;
    const key = mode === "resolutions" ? "resolutions" : "operations";
    const point = MAP_POINTS.find((item) => (item[key] || []).includes(actionId));
    return point ? point.id : "";
  }

  const EVENT_IMAGE_BY_KEY = {
    notice: "news-health-code.png",
    market: "news-supply.png",
    clinic: "news-hospital.png",
    station: "news-factory.png",
    hospital: "news-hospital.png",
    community: "news-supply.png",
    transport: "news-factory.png",
    shelter: "news-shelter.png",
    code: "news-health-code.png",
    factory: "news-factory.png",
    budget: "news-factory.png",
    memory: "news-shelter.png",
  };

  const PHASE_EVENT_CONTEXT = [
    "阴影初现",
    "封城与急救",
    "方舱与筛查",
    "常态化与复工",
    "静默城市",
    "恢复与记忆",
  ];

  function c(profile, label, detail, extra = {}) {
    return { profile, label, detail, ...extra };
  }

  function e(id, title, tags, imageKey, scene, source, choices, extra = {}) {
    return { id, title, tags, imageKey, scene, source, choices, ...extra };
  }

  function createEventFromBlueprint(item, phase, index) {
    const phaseName = PHASE_EVENT_CONTEXT[phase - 1];
    const description = `${item.scene} 指挥部桌上同时摆着医院、社区、宣传和财政口的几份记录，数字彼此咬合却不完全吻合。临江正处在“${phaseName}”阶段，任何选择都会把压力推向感染、医疗、供应、信任、活力或基层疲劳中的另一端。`;
    return {
      id: `p${phase}_${item.id}`,
      phase: [phase],
      tags: item.tags,
      title: item.title,
      body: description,
      description,
      sourceNote: `受${item.source}启发。`,
      sourceTags: item.tags,
      imageKey: item.imageKey,
      image: item.image || `events/p${phase}_${item.id}.png`,
      choices: item.choices.map((choice, choiceIndex) => createCorpusChoice(item, choice, choiceIndex, index)),
    };
  }

  function createCorpusChoice(event, choice, choiceIndex, eventIndex) {
    const profile = CHOICE_PROFILES[choice.profile] || CHOICE_PROFILES.open;
    const delayed = choice.delayed === false
      ? null
      : cloneDelayed(choice.delayed || profile.delayed);
    const description = `${choice.detail} 这条策略围绕“${event.title}”展开，核心是${profile.axis}：今天会得到可见收益，但${profile.risk}可能在后续结算或事件权重里回流。`;
    return {
      id: `c${choiceIndex + 1}`,
      strategyKey: choice.profile,
      label: choice.label,
      description,
      routeTag: getChoiceRouteTag({ strategyKey: choice.profile }),
      resources: removeZeroes(mergeEffects(profile.resources, choice.resources)),
      effects: removeZeroes(mergeEffects(profile.effects, choice.effects)),
      hidden: removeZeroes(mergeEffects(profile.hidden, choice.hidden)),
      modifiers: removeZeroes(mergeEffects(profile.modifiers, choice.modifiers)),
      delayed,
      condition: choice.condition || null,
      notes: [
        `事件策略 ${eventIndex + 1}.${choiceIndex + 1}：${profile.axis}`,
        ...(choice.notes || []),
      ],
    };
  }

  function cloneDelayed(delayed) {
    if (!delayed) return null;
    return {
      delay: delayed.delay,
      label: delayed.label,
      effects: { ...(delayed.effects || {}) },
      hidden: { ...(delayed.hidden || {}) },
      resources: { ...(delayed.resources || {}) },
      completeProject: delayed.completeProject || null,
      condition: delayed.condition || null,
    };
  }

  const EVENT_BLUEPRINTS = [
    [
      e(
        "notice_eight_rumor",
        "8名“造谣者”被查处",
        ["trust", "infection", "rumor"],
        "notice",
        "临江卫健委刚发布不明肺炎通告，公安口径随即通报查处八名转发医院群聊截图的人。截图里有夸张措辞，也有一线医生对异常病例的真实担忧。通告压住了一部分转发，却让市民开始追问：到底是谣言，还是没人愿意说明的风险。",
        "2020 年初武汉不明肺炎通告与“8人传谣”争议",
        [
          c("open", "纠正定性并补发风险说明", "承认查处口径过急，把截图中未经证实和需要警惕的部分分开说明，给市民一个可以核验的正式版本。"),
          c("messageControl", "维持查处口径压住扩散", "坚持按扰乱秩序处理，要求平台降低转发热度，把时间留给内部排查和医院复核。"),
          c("testing", "设匿名医护预警通道", "不公开翻案，先允许医护匿名上报异常病例、防护缺口和院感隐患，用更高发现率换取短期组织负荷。"),
        ],
      ),
      e("market_closure", "海鲜市场休市", ["infection", "supply", "economy"], "market", "批发市场里有摊位被临时封存，商户要求明确补偿，附近居民则担心货源和感染线索都被一起切断。市场是否马上休市，牵动采样、保供和舆情三条线。", "早期市场休市和环境采样报道", [c("testing", "封场采样并保留账册", "暂时关闭重点区，保留交易记录和物流单据，优先追踪潜在传播链。"), c("compensate", "给商户临时停业补偿", "用财政补偿换配合，避免摊主私下转移库存或隐瞒接触名单。"), c("supply", "设替代批发点", "把蔬菜和肉蛋交易挪到备用场地，先守住民生供应再慢慢复核。")]),
      e("fever_night_shift", "发热门诊夜班", ["medical", "infection", "fatigue"], "clinic", "中心医院夜间发热门诊排队到院外，护士长报告防护服更换频率异常升高，候诊区有人开始拍摄视频。", "早期发热门诊排队和医院承压报道", [c("medical", "临时扩出夜间诊区", "把普通门诊一角改成夜间发热分流区，先压住医疗负载。"), c("testing", "增派采样车到院门口", "把初筛前移到院外，减少候诊混杂，但采样物资会很快下降。"), c("rest", "强制换班防止差错", "让连续值守人员下线，接受短时服务窗口变薄的代价。")]),
      e("lab_report_leak", "检验报告外流", ["trust", "infection", "rumor"], "notice", "一张疑似阳性检验报告在群聊流传，报告编号和医院印章都被打码。宣传口担心引发恐慌，检验科担心样本链条被外界误读。", "早期检测报告和社交媒体截图传播", [c("open", "核验后公开样本口径", "确认报告真假后解释检测含义，把不确定性放进正式文本。"), c("delay", "暂缓回应等待复核", "先不回应截图，争取复核时间，但承担后续被追问的风险。"), c("messageControl", "要求平台删除截图", "先清理传播源，防止群聊继续发酵，同时牺牲部分公众信任。")]),
      e("spring_station_check", "春运车站测温", ["infection", "economy", "fatigue"], "station", "临江火车站进入春运高峰，测温枪、广播和临时隔离间都刚刚到位。交通口希望别拖慢客流，疾控口希望留下更完整名单。", "春运期间交通测温和人员流动报道", [c("digital", "建立旅客登记二维码", "用临时登记码记录去向和联系方式，提高后续发现率。"), c("hard", "对发热旅客就地留观", "把发热旅客直接带离候车区，用强制秩序压低传播风险。"), c("reopen", "只保留抽样测温", "减少排队和拥堵，保护交通效率，但承担漏检反弹。")]),
      e("hospital_muzzle_meeting", "医院内部禁言会", ["trust", "medical", "rumor"], "hospital", "几名医生在内部会上被提醒不要向外讨论病例，院感办则认为一线提醒被压住会延误防护升级。沉默能稳住表面秩序，也可能让真实风险继续积累。", "早期医护预警和信息流动争议", [c("open", "允许专业预警上行", "把医护提醒纳入内部快报，并承诺不因专业判断追责。"), c("messageControl", "统一由院办对外发声", "收紧对外发言，避免多头信息，但基层会觉得真实问题被压住。"), c("protectWorkers", "先发防护升级令", "不公开争议，直接给重点科室升级防护和休整安排。")]),
      e("unknown_pneumonia_family_group", "不明肺炎家属群", ["trust", "medical", "public"], "community", "几个病患家属自建群互通床位和药品消息，里面既有真实求助，也有无法核实的数字。群主请求政府给一个能联系到人的窗口。", "早期患者家属线上求助和信息互助", [c("open", "派驻公开联络员", "由卫健和社区共同进群回应，让求助信息进入正式台账。"), c("community", "交由街道分片承接", "把求助分给社区网格，减轻市级压力但可能出现标准不一。"), c("medical", "开设重症家属专线", "优先处理重症和转院问题，牺牲部分资金与人手。")]),
      e("first_severe_transfer", "第一例重症转院", ["medical", "trust", "infection"], "hospital", "一名重症患者需要跨院转运，接收医院担心院感，家属担心再等几个小时会错过窗口。转运路径第一次暴露出系统缝隙。", "早期重症转院和定点医院调度报道", [c("triage", "建立重症绿色分诊", "先按重症风险排序，给转运和接收医院一个统一标准。"), c("medical", "临时打通 ICU 床位", "用资金和物资换床位，快速降低医疗负载。"), c("delay", "等专家组确认后转运", "先稳住院方疑虑，延迟决定会减少误判也会积累信任风险。")]),
      e("mask_price_spike", "口罩批发价跳涨", ["supply", "trust", "economy"], "market", "口罩批发价一夜翻倍，药店说进不到货，居民怀疑有人囤积。市场监管想查处，保供组更担心明天医院也缺口罩。", "早期口罩抢购和价格波动报道", [c("supply", "统购统配重点口罩", "把现货优先配给医院和社区窗口，缓解最急的缺口。"), c("audit", "公开价格检查结果", "对哄抬价格立案并公示，让信任恢复但拖慢采购速度。"), c("outsource", "高价采购应急库存", "绕过常规比价先买一批，立刻补库存但留下公平和审计隐患。")]),
      e("first_grid_survey", "社区网格第一次摸排", ["fatigue", "infection", "trust"], "community", "街道第一次要求网格员摸排发热、返乡和接触史，表格多到没人知道哪份最重要。居民还不理解为什么要报这么细。", "社区网格化排查和返乡登记报道", [c("testing", "摸排发热与接触史", "把登记重点收束到发热和接触史，提升发现率但增加基层疲劳。"), c("compress", "只保留三项必填", "砍掉冗余台账，让基层能喘口气，但信息盲区会变大。"), c("open", "向居民解释摸排用途", "说明数据只用于流调和保供，提高配合度但会引来更多追问。")]),
      e("cross_city_case_rumor", "跨城病例传闻", ["rumor", "infection", "economy"], "station", "邻市出现疑似病例的传闻传到临江，客运站和物流园都要求给出通行口径。封不封、查不查，都会影响货流。", "跨城病例和交通防控报道", [c("digital", "建立跨城登记白单", "要求重点线路登记和回访，让货运继续走但保留追踪能力。"), c("quietClose", "临时收紧客运班线", "先压低输入风险，让城市活力承受短期损失。"), c("open", "联合邻市发布说明", "与邻市同步口径，减少谣言，但公开后会放大风险感。")]),
      e("expert_team_eve", "专家组抵达前夜", ["trust", "infection", "medical"], "hospital", "专家组明天到临江，今晚各部门都想把材料整理得更好看。疾控人员提醒，漂亮材料可能遮住真正需要被看见的风险。", "专家组赴地方调查和会诊报道", [c("open", "提交原始问题清单", "把院感、防护和检测缺口原样交给专家组，换取更高发现率。"), c("delay", "先整理统一汇报稿", "把混乱材料收束成单一文本，短期稳住口径但可能延迟暴露问题。"), c("medical", "先按最坏情况补床位", "不等结论，提前做医疗扩容和物资调配。")]),
      e("hospital_infection_doubt", "医院感染疑云", ["medical", "infection", "public"], "hospital", "一名住院患者的接触史说不清楚，同病区又出现发热。院方不愿承认院内传播，护士则要求立刻升级防护。", "院内感染风险和早期防护争议", [c("protectWorkers", "升级病区防护等级", "先保护医护和同病区患者，用防护物资换取稳定。"), c("testing", "全病区复核采样", "把相关病区纳入复核，尽快确定传播范围。"), c("messageControl", "先内部封存病区消息", "避免恐慌扩散，先在内部处理，但会加深创伤和不信任。")]),
      e("school_winter_list", "学校寒假返乡名单", ["infection", "trust", "economy"], "school", "教育局收到学校返乡名单，部分学生来自出现病例传闻的城市。家长要求停课，企业家长又担心没人照看孩子。", "寒假返乡、停课和校园防控报道", [c("digital", "做校园返乡健康登记", "把学生返乡地和健康情况纳入登记，提升追踪能力。"), c("quietClose", "提前结束线下活动", "先暂停补课和集体活动，换取传播风险下降。"), c("open", "给家长发布问答清单", "承认不确定性并解释校园安排，争取家庭配合。")]),
      e("sample_delivery_delay", "疾控样本送检延迟", ["infection", "fatigue", "medical"], "clinic", "疾控中心的样本箱排队等车，实验室说试剂和人手都有限。延迟一天，数据就会更模糊；硬推加班，错误率会上升。", "早期实验室检测能力和样本送检压力", [c("testing", "临时扩充送检批次", "增加样本车和夜间班次，提高发现率但迅速消耗一线。"), c("outsource", "借用第三方实验室", "付费接入外部检测能力，减轻压力但留下资质争议。"), c("rest", "保留复核休息窗口", "限制夜间连续工作，降低差错风险但让医疗负载短时上升。")]),
      e("first_press_conference", "第一次新闻发布会", ["trust", "rumor", "infection"], "notice", "临江准备第一次发布会，稿子里每个词都被反复推敲。说得太满，未来会被反噬；说得太少，市民会从群聊里找答案。", "早期疫情新闻发布会和风险沟通报道", [c("open", "承认信息仍在核实", "用明确边界解释未知，争取信任和配合。"), c("messageControl", "突出总体可控", "用稳定口径降低短期恐慌，但牺牲发现率和长期信任。"), c("testing", "发布检测扩容承诺", "把发布会和检测计划绑定，让公众知道下一步如何验证。")]),
    ],
    [
      e("midnight_transport_stop", "凌晨交通停摆", ["infection", "economy", "trust"], "transport", "凌晨四点，临江宣布暂停离城公共交通，车站外仍有人拖着行李排队。交通口要求明确例外，社区则担心消息传到小区后引发抢购。", "城市交通管制和离城通道关闭报道", [c("quietClose", "立即封停离城通道", "用最强流动限制压住外溢风险，承受活力和信任代价。"), c("open", "同步公布例外清单", "把就医、保供和特殊通行条件一次讲清，减少混乱。"), c("digital", "发放临时通行登记码", "让必要通行留下轨迹，避免一刀切拖垮供应。")]),
      e("ticket_refund_wave", "离城车票退改潮", ["economy", "trust", "fatigue"], "station", "停售消息后，票务热线被打爆，外地务工者担心退票规则，车站工作人员也不知道该按哪份通知执行。", "封控初期退票、滞留和交通咨询报道", [c("compensate", "协调免手续费退票", "用财政和企业协调换取情绪稳定，保护信任。"), c("community", "把滞留者交给街道安置", "让各街道分片接住滞留人员，降低市级调度压力。"), c("messageControl", "只发布统一客服口径", "压缩解释空间，先让窗口人员有话可说。")]),
      e("highway_checkpoint_queue", "高速卡口排队", ["supply", "economy", "fatigue"], "transport", "高速入口排起货车长队，司机睡在驾驶室里等核验。蔬菜、药品和工业零件混在一起，谁先过卡口成了今天的问题。", "高速卡口查验和货运保供报道", [c("supply", "开保供车辆绿色道", "把蔬菜药品车辆先放行，守住供应和医院。"), c("digital", "启用货运通行码", "用电子登记减少人工查验，提高效率但增加误判风险。"), c("audit", "公开卡口放行规则", "让司机知道排序标准，降低信任损耗但拖慢现场速度。")]),
      e("ambulance_dispatch_overload", "救护车调度爆满", ["medical", "fatigue", "trust"], "hospital", "120 调度台同时接到发热、胸痛和转运请求，接线员开始手写补记录。每一辆车去哪，都可能让另一处等待更久。", "急救调度承压和转运需求上升报道", [c("triage", "设急救分级台", "先把呼叫按重症风险排序，减少盲目派车。"), c("medical", "征用非急救车辆转运", "把部分轻症转运交给改装车辆，缓解救护车压力。"), c("open", "公布非急救求助渠道", "引导轻症和咨询分流，换取接线压力下降。")]),
      e("temporary_ward_requisition", "临时病区征用", ["medical", "supply", "public"], "shelter", "一栋培训中心被列入临时病区备选，业主要求补偿，周边居民担心感染风险。施工队今晚就能进场，但账本和口碑都会变重。", "临时病区、隔离点和公共设施征用报道", [c("medical", "马上改成观察病区", "用物资和资金换床位，先让医院喘口气。"), c("compensate", "先签补偿和告知书", "把征用补偿说清楚，减少公共创伤。"), c("messageControl", "低调施工不做公告", "避免周边反弹，争取建设时间，但后续解释成本更高。")]),
      e("mask_factory_return", "口罩厂复工谈判", ["supply", "economy", "fatigue"], "factory", "郊区口罩厂愿意复工，但员工返岗、原料运输和住宿闭环都没准备好。厂长要求政府给出订单和防护承诺。", "防护物资产能恢复和企业复工报道", [c("finance", "预付订单锁产能", "用应急资金换产能，恢复库存但透支财政。"), c("protectWorkers", "派防护员驻厂", "保障工人安全和排班，让供应恢复更稳。"), c("reopen", "允许分批返岗生产", "加快城市活力和物资恢复，但增加流动风险。")]),
      e("charity_warehouse_dispute", "红十字仓库争议", ["supply", "trust", "funds"], "market", "捐赠物资在仓库里堆着，医院说没拿到，志愿者说流程卡住。网上开始追问谁有权分配。", "捐赠物资分配和仓储争议报道", [c("audit", "公开入库出库流水", "把捐赠流向做成日清单，修复信任。"), c("supply", "直接转给定点医院", "先绕开慢流程，把物资送到最需要的地方。"), c("messageControl", "先压下仓库偷拍视频", "避免争议扩大，给内部整理留时间。")]),
      e("online_help_form", "网上求助表单", ["trust", "medical", "fatigue"], "community", "一份民间求助表单在网上流传，里面有床位、买药和独居老人需求。数据很乱，但比官方热线更快。", "线上求助表单和民间互助信息报道", [c("open", "把表单接入热线台账", "承认民间表单价值，让求助进入正式流程。"), c("community", "交给各街道认领", "让社区认领本辖区求助，降低市级处理压力。"), c("medical", "优先筛出危急就医", "先处理危急患者，压低医疗风险但增加人手消耗。")]),
      e("li_liang_death", "李亮医生去世", ["trust", "medical", "public"], "hospital", "临江中心医院眼科医生李亮去世，医院群聊、居民群和指挥部值班室都安静了几分钟。他曾因早期提醒异常病例而被训诫，如今又在一线感染后离世。市民开始把第一号通告、医护预警和信息公开重新连成一条线：如果真实提醒被压低，临江还会错过什么。", "2020 年 2 月一线医生去世及后续调查、悼念报道", [
        c("open", "公开哀悼并重启早期口径复盘", "承认早期沟通造成的伤口，公布医护预警的处理流程和复盘时限，让哀悼转化成可见的制度修补。", { resources: { funds: -2 }, effects: { trust: 2, hospitalLoad: -1, staffFatigue: 1 }, hidden: { detectedRate: 2, publicMemory: 3 }, delayed: { delay: 3, label: "复盘追问继续发酵", effects: { trust: -1 }, hidden: { detectedRate: 1 } } }),
        c("protectWorkers", "设立医护预警保护机制", "不把事件只停留在悼念上，给医护匿名上报、院感升级和轮换保护明确入口，优先保护仍在一线的人。", { effects: { hospitalLoad: -1, trust: 1, staffFatigue: 2 }, hidden: { publicMemory: 2 }, delayed: { delay: 2, label: "预警通道带来新线索", hidden: { detectedRate: 2 }, effects: { staffFatigue: 1 } } }),
        c("messageControl", "低调处理追悼和讨论", "限制相关讨论扩散，只发布简短慰问和工作伤害认定，避免悲伤迅速变成对早期处置的集中质疑。", { effects: { staffFatigue: 1, infection: -1 }, hidden: { publicMemory: 5, detectedRate: -1 }, delayed: { delay: 3, label: "压低哀悼后的反噬", effects: { trust: -3 }, hidden: { publicMemory: 1 }, condition: "trustBelow45" } }),
      ], { image: "events/p2_li_liang_death.png" }),
      e("community_closure_notice", "社区封闭公告", ["infection", "trust", "fatigue"], "community", "第一批小区要贴封闭管理公告，门岗问能不能放人买菜，居民问还能不能照顾外地父母。公告每多一句，执行也多一层。", "小区封闭管理和社区执行报道", [c("quietClose", "统一封闭门岗规则", "先让所有门岗按同一标准执行，压低传播。"), c("open", "写明就医和照护例外", "把例外情形写进公告，换取信任和配合。"), c("compress", "只保留三条硬规则", "让门岗容易执行，但牺牲细节和发现率。")]),
      e("vegetable_panic_buy", "菜场抢购", ["supply", "trust", "economy"], "market", "封城消息传开后，菜场摊位前排起长队。真正库存还够，但恐慌会把今天的供应拖进明天。", "封控初期抢购和民生保供报道", [c("supply", "投放平价保供菜", "把储备菜集中投放，先打断抢购循环。"), c("open", "公布库存和补货时间", "用可验证的补货节奏安抚居民。"), c("hard", "限制单人采购量", "用强规则压住抢购，但会伤害信任。")]),
      e("medical_team_arrival", "医护支援队抵达", ["medical", "fatigue", "trust"], "hospital", "第一批外地支援医护抵达临江，机场和医院都在等接驳。如何分配支援队，会影响医院负载和本地医护情绪。", "各地医疗队支援疫情城市报道", [c("medical", "优先派往重症医院", "把支援队放到压力最高的医院，立刻降低医疗负载。"), c("protectWorkers", "先让本地医护轮换", "把支援队用于顶班，让疲劳从高位降下来。"), c("open", "公开支援队分配原则", "解释为什么有的医院先得到支援，减少猜疑。")]),
      e("close_contact_verification", "密接名单核验", ["infection", "fatigue", "trust"], "community", "流调名单里同名同姓太多，电话打不通的密接越来越多。基层希望少填表，疾控希望每条线索都别丢。", "密接追踪、流调和信息核验报道", [c("testing", "扩充流调电话组", "增加核验电话和回访，提高发现率。"), c("compress", "只追高风险接触链", "压缩低价值台账，缓解基层疲劳但放大盲区。"), c("digital", "接入运营商轨迹核验", "用数字轨迹辅助核验，提升效率但带来隐私和信任代价。")]),
      e("mortuary_data_dispute", "殡葬与死亡数据争议", ["medical", "trust", "public"], "hospital", "殡葬系统的转运量与公开数据不完全一致，家属和媒体开始追问口径。医疗系统已经很累，但沉默会让伤痕变深。", "死亡统计口径和殡葬压力报道", [c("open", "解释死亡统计口径", "承认口径差异，给出后续校正时间表。"), c("delay", "等复核后集中公布", "先争取核实时间，短期稳住舆情但积累反噬。"), c("memory", "设立家属联络窗口", "让家属得到回应，减少公共创伤。")]),
      e("hotel_isolation_conversion", "隔离酒店改造", ["supply", "trust", "medical"], "shelter", "一批酒店被列入隔离点，消防、餐食和污物通道都要改。酒店老板问补偿，周边小区问安全距离。", "隔离酒店征用和集中隔离点改造报道", [c("medical", "先改造高标准楼层", "优先确保隔离点可用，缓解医院和转运压力。"), c("compensate", "同步签署补偿协议", "用资金换业主配合，减少后续争议。"), c("open", "发布周边安全说明", "解释隔离点运行和消杀流程，修复信任。")]),
      e("forced_entry_dispute", "居家观察破门争议", ["trust", "infection", "public"], "community", "一户居家观察对象失联，楼栋群里有人要求破门，有人担心执法过度。门外的几分钟会被手机完整记录。", "居家隔离执行争议和执法边界报道", [c("triage", "请医疗与民警共同评估", "先确认健康风险和执法依据，避免单线决定。"), c("hard", "强制进入确认情况", "快速排除传播风险，但增加创伤和不信任。"), c("open", "事后公开处置流程", "将执法边界和救助理由写清楚，减少谣言。")]),
      e("cross_district_pass", "跨区通行证", ["supply", "economy", "trust"], "transport", "保供车辆、医护通勤和照护家庭都在申请跨区通行证。审批口子开得太大，管控会漏；太小，城市会堵。", "疫情期间通行证和必要出行管理报道", [c("digital", "通行证改为扫码核验", "用动态核验减少纸质证明混乱。"), c("whiteList", "给关键企业批量通行", "让供应和生产先恢复一部分，但公平性争议会上升。"), c("audit", "公布通行证申请标准", "让各区按同一标准执行，减少暗箱质疑。")]),
    ],
    [
      e("stadium_shelter_conversion", "体育馆改方舱", ["medical", "supply", "fatigue"], "shelter", "临江体育馆地板刚铺上临时床位，施工队、医护和转运组都在等最终图纸。方舱能分流轻症，也会把物资和人手集中拉紧。", "武汉方舱医院建设与轻症集中收治报道", [c("medical", "先开放低风险床区", "让轻症先进入分流区，迅速降低医院负载。"), c("supply", "先补齐床品和餐食", "把方舱开舱前的保供链条做实，避免入住后失控。"), c("protectWorkers", "给驻舱人员排轮休表", "提前保护医护和志愿者，降低后续疲劳爆点。")]),
      e("collect_all_transfer_night", "“应收尽收”转运夜", ["infection", "medical", "fatigue"], "transport", "夜里转运名单突然加长，社区电话、救护车和方舱接收口全部排队。口号很清楚，执行却落在每一辆车和每一张床上。", "集中收治和转运压力报道", [c("quietClose", "集中转运不留尾巴", "用高强度转运快速切断传播尾巴。"), c("triage", "按症状分级转运", "先把重症和高风险人群排在前面，避免车床错配。"), c("rest", "给转运组强制换班", "保护司机和调度，接受短时转运速度下降。")]),
      e("clinical_definition_change", "临床诊断口径变更", ["trust", "medical", "infection"], "notice", "上级允许临床诊断纳入统计，临江病例数可能一天跳高。数据更接近真实压力，也会让市民怀疑昨天的数据。", "病例诊断和统计口径调整报道", [c("open", "解释口径变更原因", "把病例数跳升和统计调整讲清楚，保护长期信任。"), c("delay", "分批消化新增数据", "把新增数据拆成几天公布，短期稳定但后续风险更大。"), c("medical", "同步扩充收治能力", "用医疗扩容承接口径变化带来的床位压力。")]),
      e("test_kit_shortage", "核酸试剂短缺", ["infection", "supply", "fatigue"], "clinic", "实验室报告试剂盒只能撑两天，采样点却还在扩。继续大筛会让库存见底，收窄检测又会让盲区变大。", "核酸检测能力和试剂供应报道", [c("testing", "优先高风险人群检测", "把试剂用在密接、医护和发热人群，提高有效发现率。"), c("supply", "紧急调拨试剂库存", "用保供链条补检测物资，牺牲配送余力。"), c("compress", "暂停低风险重复检测", "减少试剂和人力消耗，但接受发现率下降。")]),
      e("ct_queue", "CT 排队", ["medical", "trust", "fatigue"], "hospital", "影像科门口排起长队，医生说 CT 能补上核酸缺口，病人说自己只是想知道是否还有床。", "CT 筛查和医院影像资源承压报道", [c("triage", "按症状和血氧分流 CT", "优先让高风险患者进入影像检查，避免资源空转。"), c("medical", "临时调用民营影像车", "购买外部影像服务，缓解医院负载。"), c("open", "公布检查优先规则", "让等待者知道排序原因，减少冲突。")]),
      e("shelter_broadcast", "方舱广播站", ["trust", "fatigue", "public"], "shelter", "方舱里开始有人组织广播、读信和求助登记。秩序需要温度，但每一项活动都需要志愿者和医护维持。", "方舱内患者互助、广播和心理支持报道", [c("volunteer", "招募舱内互助组长", "让轻症患者参与秩序维护，降低基层疲劳。"), c("memory", "保留舱内故事记录", "让城市记住普通人的互助，降低公共创伤。"), c("hard", "限制非必要聚集活动", "把舱内活动压到最低，减少传播和管理风险。")]),
      e("mild_patient_mutual_aid", "轻症患者情绪互助", ["trust", "public", "fatigue"], "shelter", "方舱里有人开始焦虑失眠，也有人主动做互助表。医护希望情绪稳定，管理组担心互助群变成投诉群。", "方舱心理支持和患者互助报道", [c("mutualAid", "支持舱内互助小组", "让患者互相照看，提升信任但增加秩序维护压力。"), c("medical", "派心理医生巡舱", "用专业资源处理焦虑和冲突，减轻公共创伤。"), c("messageControl", "关闭舱内非官方群", "避免情绪扩散，换取短期秩序但伤害信任。")]),
      e("chronic_medicine_delivery", "慢病药配送", ["supply", "medical", "trust"], "community", "慢病药需求被挤到社区群里，药房能配一部分，配送员却不够。老人和家属开始逐户打电话催促。", "封控期间慢病药配送和就医保障报道", [c("medicine", "开慢病药绿色配送", "把药房、社区和志愿者接成一条线，优先保障慢病患者。"), c("outsource", "外包药品末端配送", "花钱减轻社区压力，但药品错送和问责风险上升。"), c("open", "发布缺药登记入口", "让居民知道去哪登记，减少重复求助。")]),
      e("nurse_shift_crash", "护士轮班崩溃", ["medical", "fatigue", "supply"], "hospital", "方舱和医院同时缺护士，几名护士已经连续多天睡在值班室。再撑一天也许能过关，但差错正在靠近。", "医护连续值守和疲劳报道", [c("rest", "强制下线超时班次", "让最疲劳的护士休息，接受医疗负载短时上升。"), c("protectWorkers", "给高压科室防护包", "用物资保护一线，降低疲劳和感染风险。"), c("medical", "调支援队补夜班", "把支援医护投向夜班缺口，快速稳住医疗负载。")]),
      e("volunteer_driver_gap", "志愿司机缺口", ["fatigue", "supply", "medical"], "transport", "药品、样本和转运都在等车，志愿司机群里却没人敢接夜间单。补贴、保险和通行权都要今天定下来。", "志愿司机、转运和保供车辆缺口报道", [c("volunteer", "给志愿司机补贴保险", "用资金换稳定司机池，降低基层疲劳。"), c("digital", "发放夜间通行码", "让司机能快速过卡，提升调度效率。"), c("outsource", "临时外包车队", "花更多钱买车队能力，牺牲信任和审计安全。")]),
      e("building_disinfection", "楼栋集中消杀", ["infection", "trust", "supply"], "community", "阳性楼栋要求集中消杀，居民担心物品被损坏，消杀队担心防护物资不够。看得见的动作能安抚人，也可能流于表演。", "楼栋消杀和社区防疫报道", [c("supply", "规范消杀物资配给", "把消杀物资统一配给重点楼栋，减少无序消耗。"), c("open", "公开消杀范围和流程", "解释为什么消杀、怎么保护个人物品，稳定信任。"), c("hard", "封闭楼栋完成集中消杀", "用更强管控保证消杀执行，压低感染风险。")]),
      e("child_close_contact_care", "密接儿童照护", ["trust", "medical", "public"], "community", "几名儿童被判密接，家长要求陪护，隔离点担心管理难度。简单转运最省事，却可能留下很深的伤。", "儿童隔离、陪护和特殊人群保障报道", [c("compensate", "设家庭陪护隔离间", "用资源换取儿童和家属的安全感，降低创伤。"), c("triage", "由儿科医生评估转运", "让医疗判断进入流程，避免单纯行政处置。"), c("messageControl", "统一按成人密接流程", "快速执行并减少例外，但信任和创伤代价明显。")]),
      e("positive_retest_dispute", "阳性复核争议", ["infection", "trust", "medical"], "clinic", "一名居民初筛阳性、复核阴性，楼栋群里吵成一团。继续转运还是等待第三次结果，会影响所有人对检测的理解。", "核酸复核、假阳性和检测争议报道", [c("testing", "启动第三方复核", "用额外检测提高确定性，消耗试剂和人力。"), c("open", "解释初筛和复核差别", "让居民理解检测不等于绝对答案，保护信任。"), c("hard", "按初筛阳性先转运", "宁可多转运也先压住传播风险，承担信任代价。")]),
      e("bed_tiering", "病床分级调度", ["medical", "trust", "funds"], "hospital", "普通床、氧疗床、ICU 床开始互相挤压。医院希望有硬标准，家属希望自己的亲人不是被规则抛下。", "分级诊疗和床位调度报道", [c("triage", "发布床位分级标准", "用明确标准降低临场混乱和医疗负载。"), c("medical", "购买临时氧疗设备", "用资金和物资扩出中间层床位。"), c("open", "设家属解释热线", "把分级理由讲给家属，减少信任流失。")]),
      e("psychological_hotline_day_one", "心理热线首日", ["trust", "fatigue", "public"], "community", "心理热线第一天就被打爆，来电有恐惧、愤怒和求药。接线员不是医生，却成了城市情绪的入口。", "疫情心理援助热线和情绪支持报道", [c("rest", "给接线员轮休督导", "让热线能持续运行，降低基层疲劳。"), c("volunteer", "培训志愿心理接线员", "扩大热线容量，用培训成本换社会支持。"), c("memory", "把高频诉求写进日报", "让情绪数据进入决策，减少被忽视的创伤。")]),
      e("discharge_standard_debate", "出舱标准争论", ["medical", "infection", "trust"], "shelter", "方舱床位紧张，部分患者达到出舱指标，社区却担心接回后反弹。标准越严，床越满；标准越松，居民越怕。", "方舱出院/出舱标准和社区接收报道", [c("triage", "按风险分层出舱", "让低风险患者先出舱，高风险继续观察，缓解床位压力。"), c("open", "公开出舱医学标准", "解释为什么可以出舱，减少社区抵触。"), c("hard", "延长统一观察期", "用更严标准换取安全感，但推高医疗负载。")]),
    ],
    [
      e("health_code_launch", "健康码上线", ["infection", "trust", "economy"], "code", "临江准备上线健康码，绿码能让城市部分恢复流动，红黄码也可能把误判和申诉推到每个卡口。", "杭州健康码和数字通行方案报道", [c("digital", "先在重点区域试运行", "让健康码从医院、车站和园区小范围开始，逐步提升发现率。"), c("open", "公布判码和申诉规则", "把判码逻辑和申诉入口讲清，减少误伤信任。"), c("whiteList", "直接接入企业复工名单", "让健康码服务复工白名单，恢复活力但加剧公平争议。")]),
      e("green_code_error", "绿码误判", ["trust", "infection", "public"], "code", "一名有接触史的居民仍显示绿码，另一名低风险居民却被黄码困在楼下。技术问题变成了信任问题。", "健康码误判、申诉和数字治理争议报道", [c("audit", "建立人工复核窗口", "让误判有人工出口，修复信任但增加工作量。"), c("digital", "提高判码敏感度", "宁可多拦一点人，换取传播风险下降。"), c("messageControl", "先称系统正常运行", "避免短期质疑扩散，但会积累公共创伤。")]),
      e("factory_closed_loop", "工厂闭环复产", ["economy", "infection", "fatigue"], "factory", "工业园申请闭环复产，员工吃住在厂内，物流走专用通道。企业说再不开工订单就没了，社区担心外溢风险。", "闭环生产和工业复工报道", [c("whiteList", "批准重点工厂闭环", "让关键工厂先恢复生产，换取资金和活力。"), c("testing", "每日抽检闭环人员", "用检测保障闭环可信度，增加疲劳和物资消耗。"), c("open", "公布闭环违规处罚", "让居民知道复工不是放任，保护信任。")]),
      e("bus_scan_crowd", "公交扫码拥堵", ["economy", "infection", "fatigue"], "transport", "公交恢复后，扫码上车导致站台拥堵，老人不会操作，司机也被迫当解释员。恢复流动的第一天并不轻松。", "公共交通扫码和恢复运行报道", [c("digital", "优化公交离线核验", "减少扫码失败和拥堵，提高通行效率。"), c("volunteer", "派志愿者协助老人扫码", "用志愿者补上数字鸿沟，降低现场冲突。"), c("reopen", "高峰期放宽扫码速度", "保护通勤效率，但接受感染反弹。")]),
      e("courier_pass", "外卖骑手通行", ["supply", "economy", "trust"], "transport", "外卖骑手既是保供末端，也是跨小区流动风险。没有他们，独居和隔离家庭会更难；放得太宽，卡口形同虚设。", "骑手、配送和通行管理报道", [c("digital", "给骑手动态通行码", "用通行码记录配送路径，兼顾保供和追踪。"), c("protectWorkers", "发放骑手防护包", "保护配送员并稳定供应末端。"), c("hard", "限制骑手跨区接单", "压低流动风险，但削弱供应和活力。")]),
      e("online_school_fatigue", "学校网课疲劳", ["trust", "fatigue", "economy"], "school", "网课进入第三周，学生和家长都开始疲惫。教育局想保持教学进度，心理老师则提醒家庭压力已经外溢。", "停课不停学、网课压力和家庭照护报道", [c("rest", "给学校设置无课缓冲日", "降低家庭和教师疲劳，接受进度放慢。"), c("open", "公布返校判断指标", "让家长知道复课看什么，不再只等传闻。"), c("reopen", "低风险毕业班先返校", "恢复教育秩序和城市活力，但增加感染代价。")]),
      e("imported_flight", "境外输入航班", ["infection", "medical", "trust"], "station", "一趟国际航班转降临江，隔离酒店、机场和医院都要配合。市民担心输入风险，商务口担心航线直接停掉。", "境外输入病例和入境隔离报道", [c("triage", "机场设独立分诊线", "把入境人员和本地就医流线分开，降低医疗混杂。"), c("digital", "接入入境闭环健康码", "用数字闭环提高追踪能力。"), c("quietClose", "暂停相关中转业务", "用强管控压输入风险，牺牲城市活力。")]),
      e("cold_chain_positive", "冷链仓库检出", ["infection", "supply", "economy"], "market", "冷链仓库环境样本出现阳性，仓库里还有肉类和药品冷藏物资。封仓容易，替代供应不容易。", "冷链检测、仓储和货物流通报道", [c("testing", "仓库人员全量复核", "先确认人群风险，提高发现率。"), c("supply", "调拨替代冷链仓", "守住冷藏物资供应，增加保供压力。"), c("hard", "封存全部关联货品", "用最稳妥方式压风险，但损伤供应和经济。")]),
      e("sentinel_clinic", "社区哨点诊所", ["infection", "medical", "trust"], "clinic", "常态化后，社区诊所被要求承担哨点功能。诊所医生担心设备不足，居民则希望别一发热就跑大医院。", "基层哨点诊所和分级防控报道", [c("medical", "给哨点诊所配设备", "增强基层识别能力，减轻医院负载。"), c("testing", "发热首诊即采样", "把发现率前移到社区，但增加基层疲劳。"), c("open", "公布基层就诊流程", "让居民知道何时去诊所、何时去医院。")]),
      e("mall_limited_reopen", "商圈限流复开", ["economy", "infection", "trust"], "market", "临江核心商圈申请限流开放，商户需要现金流，居民也想看看城市是否真的恢复。入口限流和健康码核验会决定风险。", "商场限流开放和消费恢复报道", [c("reopen", "分时段限流复开", "恢复消费和活力，承担可控感染反弹。"), c("digital", "入口健康码加预约", "用预约和扫码降低人流峰值。"), c("open", "公布商圈风险评估", "让开放理由可被检查，减少质疑。")]),
      e("enterprise_white_list", "企业白名单", ["economy", "trust", "funds"], "factory", "复工白名单摆上桌，龙头企业、保供企业和小微企业都要求优先。名单越有用，越会被质疑。", "复工复产白名单和企业豁免报道", [c("whiteList", "先批关键供应企业", "让对供应链最重要的企业先动起来，恢复资金和活力。"), c("audit", "公开白名单评分项", "解释为什么这些企业先复工，降低不公平感。"), c("finance", "给小微企业纾困贷款", "用财政透支缓和白名单之外的压力。")]),
      e("dashboard_revision", "数据看板改版", ["trust", "infection", "public"], "notice", "数据看板准备增加无症状、复核中和转归三栏。信息更细，也更难解释；少一栏，就少一个被误解的入口。", "疫情数据看板、统计口径和公开信息报道", [c("open", "上线分层数据看板", "把数据口径拆清楚，提高信任和发现率。"), c("compress", "只保留核心三项", "让公众更容易理解，但牺牲信息质量。"), c("delay", "等口径稳定再改版", "避免今天改明天又改，但承担延迟公开风险。")]),
      e("asymptomatic_count", "无症状统计口径", ["trust", "infection", "medical"], "notice", "无症状感染者是否并入每日主标题，成为宣传口和疾控口的争论。口径变化会让风险更清楚，也会让数字变难看。", "无症状感染者统计和公开口径报道", [c("open", "把无症状单列说明", "承认无症状传播风险，提升长期信任。"), c("testing", "加强无症状关联筛查", "围绕无症状病例扩大筛查，压低隐匿传播。"), c("messageControl", "主标题只报确诊", "维持短期稳定口径，但发现率和信任会受损。")]),
      e("community_unlock_countdown", "小区解封倒计时", ["trust", "economy", "infection"], "community", "连续多日无新增的小区开始问解封时间。太早解封可能反弹，太晚解封会让配合变成怨气。", "分区解封、无新增小区管理和恢复流动报道", [c("open", "公布解封倒计时规则", "让居民看见解除条件，修复信任。"), c("reopen", "低风险楼栋先恢复出入", "让城市活力回升，承担小幅反弹。"), c("hard", "继续整区观察七天", "压低感染风险，但加重疲劳和信任损耗。")]),
      e("wedding_delay_dispute", "婚宴延期纠纷", ["trust", "economy", "public"], "community", "几场婚宴因限流被取消，酒店、家庭和市场监管都在互相推责任。看似不是医疗问题，却会影响人们对规则的感受。", "聚集活动取消、婚宴延期和消费纠纷报道", [c("compensate", "协调延期和定金规则", "用协调补偿减少个人损失和公共创伤。"), c("open", "发布聚集活动问答", "把婚宴、会议和宴席的边界讲清楚。"), c("hard", "一律暂停大型宴席", "保持简单硬规则，牺牲经济和信任。")]),
      e("vaccine_booking_prep", "疫苗预约早期准备", ["trust", "medical", "funds"], "clinic", "疫苗预约系统还在测试，社区已经被问到什么时候能打。早铺底能提高信任，但过早承诺会被追着兑现。", "疫苗接种预约和重点人群准备报道", [c("digital", "搭建重点人群预约库", "提前整理接种对象，提高后续组织能力。"), c("open", "发布不承诺日期的说明", "说清楚准备进度和不确定性，减少误解。"), c("medical", "先培训接种点人员", "投入医疗和基层资源，为后续接种做准备。")]),
    ],
    [
      e("zoned_silent_control", "分区分批封控", ["infection", "trust", "economy"], "community", "新增曲线又抬头，临江准备分区分批静默。低风险片区质疑为什么一起承受代价，高风险片区希望快一点切断传播。", "分区封控、静默管理和差异化管控报道", [c("quietClose", "高风险区先静默三天", "把最危险片区先压住，降低感染压力。"), c("open", "公开分区判定图", "让居民知道为什么本楼本街道被纳入管控。"), c("reopen", "保留低风险通勤窗口", "给低风险片区留一条恢复线，承受反弹风险。")]),
      e("mass_testing_queue", "全员核酸长队", ["infection", "fatigue", "trust"], "clinic", "全员核酸点排到街角，排队本身开始带来风险。大筛能找出隐匿传播，也能把基层和居民耐心磨薄。", "全员核酸、排队和采样点管理报道", [c("testing", "增设流动采样小队", "把采样点拆到楼栋和园区，提升发现率。"), c("rest", "给采样人员轮换间隔", "降低采样差错和疲劳，接受速度变慢。"), c("open", "公布各点排队热力", "让居民错峰采样，减少拥堵和不满。")]),
      e("antigen_to_door", "抗原试剂入户", ["infection", "supply", "trust"], "community", "抗原试剂开始按户发放，楼组长担心有人不会用，也担心有人不上传结果。自测让筛查更快，也让数据更乱。", "抗原自测入户和结果上报报道", [c("testing", "抗原阳性优先复核", "用抗原做前哨，核酸资源跟进高风险结果。"), c("supply", "按楼栋发放抗原包", "用物资换更快覆盖，增加配送压力。"), c("open", "制作自测图文说明", "减少误用和漏报，保护信任。")]),
      e("group_buy_overload", "团购群爆单", ["supply", "trust", "fatigue"], "market", "居民团购群一夜增加几十个，团长、司机和小区门岗都被订单压住。互助正在变成新的供应系统。", "封控期间社区团购和微信群互助报道", [c("mutualAid", "承认团购群为补充渠道", "让居民互助进入秩序，提升供应和信任。"), c("outsource", "引入平台统一配送", "用外部平台承接爆单，降低疲劳但牺牲信任。"), c("audit", "公开团购价格抽查", "减少劣质和加价争议，拖慢部分配送。")]),
      e("vegetable_pack_quality", "蔬菜包质量争议", ["supply", "trust", "funds"], "market", "一批蔬菜包送达后被拍出烂叶和缺斤少两。供应团队说仓储太急，居民说这是最低限度的生活。", "保供物资质量和价格争议报道", [c("audit", "抽查并公开供应商", "把采购和质量问题摊开，修复信任。"), c("supply", "立刻补发问题蔬菜包", "先补货止损，牺牲资金和配送人手。"), c("messageControl", "要求删除夸张视频", "压住舆情扩散，换取短期稳定但加深创伤。")]),
      e("elder_lives_alone_medicine", "独居老人断药", ["medical", "supply", "trust"], "community", "独居老人慢病药只剩一天，子女在外区进不来，社区电话一直占线。每个环节都能解释，却没人真正把药送到门口。", "独居老人、慢病药和封控就医保障报道", [c("medicine", "开通独居老人送药线", "把药房、社区和志愿者连成专线，优先保障慢病药。"), c("community", "交由楼栋自治认领", "让楼栋内互助解决最后一百米，降低基层压力。"), c("open", "公布急药求助热线", "让类似求助进入统一入口，减少无序求救。")]),
      e("non_covid_er_blocked", "非新冠急诊受阻", ["medical", "trust", "public"], "hospital", "一名非疫情急症患者在卡口等待，医院要求核酸证明，家属要求先救人。规则和生命在同一个路口相撞。", "非新冠患者就医延误和急诊通道报道", [c("triage", "急危重症先救治后补验", "给急危重症明确例外，降低医疗创伤。"), c("open", "公布非新冠急诊流程", "让卡口和医院按同一流程执行。"), c("hard", "继续执行核酸前置", "减少院感风险，但信任和公共创伤代价很高。")]),
      e("midnight_transfer_bus", "转运大巴深夜到达", ["medical", "fatigue", "trust"], "transport", "凌晨两点，转运大巴停在小区门口，居民不知道去哪里、带什么、住几天。司机、社区和接收点都在等下一条消息。", "集中转运、隔离点接收和深夜转运报道", [c("open", "转运前发清单和去向", "让居民知道目的地、携带物和联系人，减少恐惧。"), c("triage", "按楼栋风险分车转运", "避免车上混杂和接收点错配，降低医疗压力。"), c("rest", "限制司机连续夜班", "保护转运司机，接受转运速度下降。")]),
      e("central_isolation_beds", "集中隔离点床位", ["medical", "supply", "funds"], "shelter", "集中隔离点床位还差两百张，床品、餐食、保洁和医废路线都没完全到位。床位数字背后是完整系统。", "集中隔离点建设和床位扩容报道", [c("medical", "先启用基础床位", "用最小配置先接收，迅速缓解医院压力。"), c("supply", "补齐餐食保洁链条", "先把隔离点生活保障做好，避免二次危机。"), c("finance", "追加隔离点专项款", "用资金换建设速度，承担恢复期财政压力。")]),
      e("building_zero_clear", "楼栋阳性“清零”", ["infection", "trust", "fatigue"], "community", "几个楼栋被要求尽快清零，基层担心目标变成层层加码。居民希望解封，却不想被为了数字而转运。", "动态清零、楼栋管理和执行压力报道", [c("testing", "用连续复核确认清零", "用检测证明楼栋风险下降，增加人力和试剂消耗。"), c("open", "公布楼栋清零标准", "让居民知道清零不是口号，而是可验证条件。"), c("messageControl", "压实街道清零责任", "用硬目标加速执行，但疲劳和创伤都会上升。")]),
      e("care_package_dispute", "陪护物品处置争议", ["trust", "public", "supply"], "community", "隔离转运时，一户人家的陪护物品被要求留在门外。工作人员说流程如此，家属说那是孩子唯一熟悉的东西。", "转运、隔离和个人物品处置争议报道", [c("compensate", "设特殊物品登记袋", "允许必要陪护物品登记随行，降低公共创伤。"), c("open", "解释消杀和携带边界", "把什么能带、为什么不能带说清楚。"), c("hard", "一律禁止非必要物品", "简化执行并降低感染风险，但信任代价明显。")]),
      e("volunteer_subsidy_dispute", "志愿者补贴争议", ["fatigue", "trust", "funds"], "community", "志愿者和临聘人员开始询问补贴标准，居民也想知道钱从哪里来。没有补贴，人留不住；补贴不明，信任也留不住。", "志愿者补贴、临聘人员和基层保障报道", [c("volunteer", "明确补贴和保险标准", "用资金稳定志愿者队伍，降低疲劳。"), c("audit", "公开补贴发放规则", "减少补贴争议，保护信任。"), c("finance", "先垫付后审计", "让补贴不断档，承担财政和审计压力。")]),
      e("supply_vehicle_pass", "保供车辆通行", ["supply", "economy", "infection"], "transport", "保供车辆拿着不同颜色的通行证，卡口却不认识。司机不敢进城，居民等不到菜。", "保供车辆通行证和物流白名单报道", [c("digital", "统一电子保供通行证", "用一个码打通卡口识别，提高保供效率。"), c("supply", "派驻卡口保供专员", "让保供车辆有人解释和协调，增加基层消耗。"), c("whiteList", "给核心供应商长期通行", "稳定供应链，但公平性争议上升。")]),
      e("cadre_sick_leave_wave", "社区干部请假潮", ["fatigue", "trust", "supply"], "community", "几个街道同时出现病假和调休申请，留下的人已经接近极限。任务不减，人却在减少。", "基层人员疲劳、请假和社区执行压力报道", [c("rest", "批准轮休并重排任务", "让基层疲劳真正下降，承受服务窗口变薄。"), c("community", "把部分事务交给楼组", "让社区自治承接低风险事务，降低干部负荷。"), c("supportTeam", "调配机关支援队", "抽调机关干部下沉，资金和信任都会承压。", { effects: { staffFatigue: -4, trust: -2 }, resources: { funds: -3 } })]),
      e("data_delay_release", "数据延迟公布", ["trust", "infection", "public"], "notice", "一组复核数据与前日报告不一致，发布口径迟迟没有签字。每晚的数据都在塑造市民对城市的判断。", "疫情数据延迟、复核和统计口径争议报道", [c("open", "连同误差一起公布", "承认数据修订，把复核原因写清楚。"), c("delay", "等复核完成再发布", "争取核对时间，短期保住秩序但后续反噬大。"), c("messageControl", "只发布趋势不放明细", "减少被抓住细节质疑，牺牲发现率和信任。")]),
      e("balcony_video_spread", "阳台呼喊视频流传", ["trust", "supply", "public"], "community", "夜里有居民在阳台喊缺菜缺药，视频被迅速转发。有人说夸张，有人说终于有人把话喊出来。", "封控期间居民求助视频和舆情传播报道", [c("supply", "逐栋核查缺菜缺药", "用保供行动回应视频，快速修复民生压力。"), c("open", "承认问题并给处理时限", "公开回应诉求，避免把情绪推向谣言。"), c("messageControl", "要求平台降低传播", "先压住扩散，争取补救时间但伤害信任。")]),
    ],
    [
      e("policy_optimization_notice", "优化措施发布", ["trust", "economy", "infection"], "notice", "上级发布优化措施，临江要把旧规则撤到哪里、保留到哪里。放松太快会反弹，撤得太慢会失去信任。", "防控措施优化和政策转换报道", [c("open", "逐条解释新旧规则", "把哪些取消、哪些保留说清楚，修复信任。"), c("reopen", "同步恢复低风险流动", "让城市活力尽快回升，承担感染反弹。"), c("triage", "保留医院重点防线", "把防线从社区转向医院，保护医疗系统。")]),
      e("health_code_retirement", "健康码退场争议", ["trust", "public", "economy"], "code", "健康码不再作为日常通行依据，但很多场所还在要求扫码。数字工具退出时，留下的数据和习惯也要处理。", "健康码使用调整、退出和数据治理争议报道", [c("open", "公布健康码停用边界", "明确哪些场景不再扫码，修复信任。"), c("audit", "启动健康数据封存审计", "让数据退出有记录，降低公共创伤。"), c("digital", "保留医院预约核验", "在医疗场景保留少量数字核验，提升发现率但延长争议。")]),
      e("fever_clinic_queue_return", "发热门诊排队", ["medical", "infection", "fatigue"], "clinic", "措施调整后，发热门诊再次排队。很多人不再等社区安排，直接到医院寻找确定答案。", "优化后发热门诊压力和就医高峰报道", [c("triage", "设置轻重症分流线", "让轻症咨询和重症救治分开，降低医疗负载。"), c("medical", "临时扩容发热门诊", "用资金和人手迅速压低医院压力。"), c("open", "发布居家观察与就医指南", "减少不必要就诊，保护信任。")]),
      e("fever_medicine_shortage", "退烧药短缺", ["supply", "trust", "medical"], "market", "退烧药货架空了，药店门口排着人。医院不希望轻症都涌进来，居民只想知道什么时候能买到药。", "退烧药短缺和药品保供报道", [c("medicine", "定量保障重点人群用药", "优先老人、儿童和基础病患者，降低医疗风险。"), c("supply", "协调药企紧急配送", "补药品供应，增加资金和配送压力。"), c("open", "公布到货时间和替代方案", "减少抢购和重复排队，修复信任。")]),
      e("elder_booster_mobilization", "老年加强针动员", ["medical", "trust", "fatigue"], "community", "老年加强针动员重新提上日程。社区知道名单，却不知道怎么说服犹豫的人，也担心把医疗建议说成行政任务。", "老年人疫苗接种和加强针动员报道", [c("open", "请家庭医生做风险沟通", "用专业解释替代命令，提升信任。"), c("community", "楼栋逐户预约接种", "把任务交给熟人网络，降低市级压力但消耗社区信任。"), c("medical", "布置流动接种点", "让医疗资源靠近老人，降低重症压力。")]),
      e("factory_absenteeism", "企业复工缺勤", ["economy", "supply", "infection"], "factory", "企业复工后，很多员工因感染、照护或担忧无法返岗。产线开了灯，却没有足够的人。", "复工后缺勤、感染高峰和生产恢复报道", [c("reopen", "允许弹性返岗排班", "保护企业活力，让恢复不被一次性卡死。"), c("protectWorkers", "给复工人员防护包", "减少岗位传播和焦虑，消耗物资。"), c("finance", "给关键岗位稳岗补贴", "用资金留住产线和物流骨干。")]),
      e("normal_clinic_restart", "医院恢复普通门诊", ["medical", "economy", "trust"], "hospital", "医院想恢复普通门诊，积压的慢病、手术和复查排队很长。恢复越快，发热高峰越容易挤在一起。", "普通医疗服务恢复和积压就医需求报道", [c("triage", "分时恢复普通门诊", "让普通门诊和发热流线错开，降低医疗混杂。"), c("open", "公布积压就诊排序", "解释哪些患者先恢复，减少争议。"), c("medical", "购买周末加诊班次", "用资金和人手消化积压，增加疲劳。")]),
      e("procurement_audit", "财政审计", ["funds", "trust", "public"], "budget", "保供、方舱、检测和外包账单终于进入审计。有人希望查清楚，有人担心追责让后续工作无人敢做。", "疫情采购审计、财政结算和问责报道", [c("audit", "公开重点采购审计", "把大额采购和异常合同交代清楚，修复信任。"), c("finance", "先结清一线欠款", "用财政透支避免工程和补贴断档。"), c("delay", "等恢复稳定后再披露", "避免此刻引发争议，但创伤和质疑会积累。")]),
      e("community_archive_seal", "社区档案封存", ["trust", "public", "fatigue"], "community", "街道准备封存疫情期间的台账、截图和通行证记录。基层想尽快结束，居民担心自己的信息和求助就此消失。", "社区防疫档案、个人信息和治理记录报道", [c("audit", "清理并封存个人数据", "用审计流程处理台账，降低公共创伤。"), c("memory", "保留匿名复盘材料", "把经验留下，不让一线只剩疲劳。"), c("compress", "快速销毁非必要台账", "让基层减负，但可能损失复盘线索。")]),
      e("public_memorial", "悼念与公共记忆", ["public", "trust", "medical"], "memory", "城市恢复了人流，也有人开始在网上整理逝者、医护和志愿者名单。忘记能让生活继续，记住才能让伤口不被遮住。", "疫情悼念、公共记忆和医护纪念报道", [c("memory", "设立公开纪念页面", "让逝者和一线人员被记录，降低公共创伤。"), c("open", "发布医疗救治复盘摘要", "把救治中的经验和不足写出来，修复信任。"), c("messageControl", "引导纪念保持低调", "避免情绪再度聚集，但信任代价很重。")]),
      e("student_return", "学生返校", ["economy", "trust", "infection"], "school", "学校准备返校，家长担心交叉感染，企业家长又需要恢复工作节奏。教室门口的测温线成了恢复的象征。", "返校复课和校园防控报道", [c("reopen", "分年级错峰返校", "恢复教育和家庭秩序，承担可控感染反弹。"), c("digital", "校园健康申报保留两周", "用短期健康申报降低返校风险。"), c("open", "公布停课触发条件", "让家长知道何时会再次调整，保护信任。")]),
      e("dine_in_restart", "餐饮堂食重开", ["economy", "infection", "trust"], "market", "餐饮店终于等到堂食重开，店主想多摆几桌，监管人员要求间距和通风。烟火气回来，也会带回风险。", "堂食恢复、限流和消费复苏报道", [c("reopen", "限流恢复堂食", "恢复城市活力和就业，承担感染代价。"), c("digital", "保留预约和通风检查", "让堂食恢复更可控，增加执行成本。"), c("audit", "公开抽查问题店铺", "用可见监管换取信任，拖慢部分恢复。")]),
      e("antigen_reporting_fatigue", "抗原自测上报疲劳", ["fatigue", "infection", "trust"], "community", "居民已经不愿每天上传抗原结果，社区也看不过来。自测从工具变成了负担。", "抗原自测上报、居民疲劳和常态化监测报道", [c("compress", "改为阳性和重点人群上报", "减少低价值填报，降低疲劳但扩大盲区。"), c("open", "解释为何调整上报频率", "承认疲劳，说明监测目标改变，保护信任。"), c("testing", "保留重点楼栋抽样复核", "把资源集中到风险点，避免完全失明。")]),
      e("hotline_review", "热线投诉复盘", ["trust", "fatigue", "public"], "community", "热线系统导出几千条投诉，买药、转运和通行是最高频词。把它们看完很累，但不看就等于没听见。", "市民热线、投诉复盘和服务改进报道", [c("memory", "把投诉整理成复盘清单", "承认问题并修复创伤，让基层也看见改进方向。"), c("rest", "给热线人员复盘假", "让长期接线人员休整，降低疲劳。"), c("delay", "先归档不公开", "避免再掀舆情，但会牺牲信任。")]),
      e("grassroots_honor_list", "基层表彰名单", ["trust", "fatigue", "public"], "community", "表彰名单准备发布，有人连续值守却没上榜，也有人认为现在谈表彰太早。荣誉能修复疲劳，也可能制造新的不公平。", "基层表彰、志愿者认可和一线疲劳报道", [c("memory", "把表彰与问题复盘同发", "既记录付出，也承认不足，减少空泛宣传感。"), c("volunteer", "给一线人员补休补贴", "用实质补偿而不是只给荣誉，降低疲劳。"), c("messageControl", "先发正面名单不谈争议", "快速提振士气，但被遗漏者的不满会回流。")]),
      e("final_review_meeting", "最后一次阶段总结会", ["trust", "economy", "public"], "budget", "第 72 天前的最后一次总结会开始，桌上有恢复指标、投诉清单、财政账本和未公开的伤痕。城市要决定留下些什么。", "疫情阶段复盘、恢复评估和长期治理讨论", [c("memory", "发布完整阶段复盘", "把成功和失败一起写进公开报告，修复长期信任。"), c("finance", "优先结算恢复工程", "让城市活力继续回升，承担财政和信任代价。"), c("open", "召开市民代表说明会", "用面对面解释完成最后一次信任修复。")]),
    ],
  ];

  const POSITIVE_EVENT_BLUEPRINTS = [
    [
      e("provincial_lab_channel", "省级实验室开放复核通道", ["infection", "medical", "fatigue"], "clinic", "省级疾控和几所高校实验室同意为临江开放夜间复核通道，第一批样本箱已经在疾控门口排队。实验室能帮城市更快看见风险，但样本转运、双盲复核和结果解释都会压到临江自己的台账上。", "早期实验室检测能力扩容、高校和疾控协作报道", [
        c("testing", "优先复核重症和医护样本", "把最容易影响医院调度的样本先送出去，尽快识别院感和重症风险。", { resources: { funds: -2 }, effects: { trust: 2 }, hidden: { detectedRate: 2 }, delayed: { delay: 2, label: "复核数据并表", effects: { trust: 1 }, hidden: { detectedRate: 1 } } }),
        c("audit", "建立跨实验室样本台账", "每份样本都留转运、接收和复核记录，降低误读和追责争议。", { effects: { supplies: -1, staffFatigue: 1 }, hidden: { detectedRate: 3 }, delayed: { delay: 2, label: "台账补录压力", effects: { staffFatigue: 1 } } }),
        c("compress", "只送关键样本不做全量复核", "把通道留给重症、医护和聚集性病例，减少基层填报，但会扩大一部分信息盲区。", { effects: { hospitalLoad: -1, supplies: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 3, label: "未复核样本追问", effects: { trust: -1 }, condition: "trustBelow45" } }),
      ], { image: "events/p1_provincial_lab_channel.png" }),
      e("protective_supply_package", "定向防护包送达一线", ["supply", "medical", "trust"], "hospital", "几家企业和校友会把口罩、防护面屏和消毒物资送到临江，纸箱上写着收货科室。医院想直接入库，社区窗口也在缺防护，公众则盯着这批物资会不会又变成一笔说不清的账。", "疫情期间社会捐赠防护物资和定向支援一线报道", [
        c("protectWorkers", "先配发发热门诊和转运队", "把最危险岗位的防护缺口先补上，减少一线焦虑。", { effects: { hospitalLoad: -1, trust: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "防护消耗回补", effects: { supplies: -1 } } }),
        c("supply", "拆分给医院和社区窗口", "医院、街道和卡口各拿一部分，保护更多服务窗口。", { effects: { supplies: 2, trust: 1, staffFatigue: 1 }, delayed: { delay: 2, label: "分发记录补交", effects: { staffFatigue: 1 } } }),
        c("audit", "公布捐赠流向清单", "用公开清单解释谁收到了物资、为什么这样分配，换取信任。", { effects: { supplies: 2, staffFatigue: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "清单核对完成", effects: { trust: 1 } } }),
      ], { image: "events/p1_protective_supply_package.png" }),
    ],
    [
      e("multi_province_volunteer_team", "多省抗疫志愿队抵达临江", ["fatigue", "medical", "trust"], "transport", "几支来自外省的志愿队和机关支援队抵达临江，车上有人做过医院后勤，有人熟悉社区配送，也有人第一次进入封控城市。支援让街道终于看见轮换机会，但陌生队伍接管本地工作会带来磨合、住宿、防护和解释成本。", "全国多地支援湖北、医疗队和志愿力量驰援疫区报道", [
        c("supportTeam", "按街道分派支援队", "把外部人手直接补到最缺人的街道，先让连续值守人员下线。", { resources: { funds: -1 }, effects: { hospitalLoad: -1, trust: 4, staffFatigue: 4 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "支援队磨合完成", effects: { staffFatigue: -1 } } }),
        c("protectWorkers", "优先补进医院后勤和转运", "让外援接住发热门诊后勤、转运登记和物资搬运，保护医护排班。", { effects: { hospitalLoad: -1, staffFatigue: 2, trust: 1 }, hidden: { detectedRate: 1 }, delayed: { delay: 2, label: "岗位培训消耗", effects: { staffFatigue: 1 } } }),
        c("open", "公开支援队排班和职责", "让居民知道外援做什么、不做什么，减少陌生队伍带来的误解。", { resources: { funds: -2 }, effects: { supplies: -1, staffFatigue: 1 }, delayed: { delay: 3, label: "支援名单复核", effects: { trust: 1 } } }),
      ], { image: "events/p2_multi_province_volunteer_team.png" }),
      e("traceable_donation_account", "捐款专户到账并可追踪", ["funds", "supply", "trust"], "budget", "社会捐款和几笔专项援助汇入临江应急专户，金额足以补上一批短板，却也足以引发新的追问：钱先给医院、保供还是隔离点？财务口建议每笔留痕，保供组担心流程太慢会错过采购窗口。", "疫情防控社会捐赠、专项资金和公开监督报道", [
        c("audit", "上线可追踪捐款台账", "每笔捐款标注来源、用途和拨付状态，先稳住公信力。", { resources: { funds: 10 }, effects: { supplies: 2, trust: 1 }, delayed: { delay: 2, label: "台账审核补件", effects: { staffFatigue: 1 } } }),
        c("supply", "直拨保供和医院短缺清单", "把到账资金立刻换成药品、防护和菜包，让居民看见实物。", { resources: { funds: 2 }, effects: { supplies: 4, hospitalLoad: -2, trust: 1 }, delayed: { delay: 3, label: "采购价格复核", resources: { funds: -1 } } }),
        c("finance", "先拨付最危险缺口", "允许指挥部先花后审，快速补上隔离点和急诊账单。", { effects: { supplies: 4, hospitalLoad: -2, trust: 2 }, hidden: { publicMemory: -1 }, delayed: { delay: 4, label: "专户审计压力", effects: { trust: -1 } } }),
      ], { image: "events/p2_traceable_donation_account.png" }),
    ],
    [
      e("recovered_plasma_call", "康复者血浆倡议", ["medical", "trust", "public"], "hospital", "几名康复出院者愿意登记捐献血浆，医院伦理组、检验科和宣传口同时坐到一张桌前。倡议能给重症救治带来新的希望，但也必须把适应症、风险和自愿原则说清楚，否则好消息很快会变成过度承诺。", "康复者捐献血浆和恢复期血浆治疗探索报道", [
        c("triage", "只纳入重症会诊名单", "把血浆作为重症会诊的补充方案，不把它宣传成万能办法。", { effects: { hospitalLoad: -3, trust: 1 }, hidden: { detectedRate: 1 }, delayed: { delay: 3, label: "疗效口径复盘", effects: { trust: 1 } } }),
        c("open", "公开自愿登记和适应症", "把谁能捐、谁适合用、可能有什么风险讲清楚。", { resources: { funds: -2 }, effects: { hospitalLoad: -1, trust: 2 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "家属咨询增多", effects: { staffFatigue: 1 } } }),
        c("medical", "建立采供血绿色流程", "用专门流程接住康复者登记、检测和医院使用，争取更快缓解重症压力。", { effects: { hospitalLoad: -2, trust: 2 }, hidden: { detectedRate: 1 }, delayed: { delay: 2, label: "采供血流程消耗", effects: { supplies: -1, staffFatigue: 1 } } }),
      ], { image: "events/p3_recovered_plasma_call.png" }),
      e("remote_psych_support", "外地心理援助热线接入", ["fatigue", "trust", "public"], "community", "外地高校和心理协会愿意为临江接入远程热线，先服务一线人员和隔离点居民。热线不是床位也不是菜包，却能让不断被求助电话击穿的基层得到一点支撑；难点在于转介、保密和危机个案交接。", "疫情期间心理援助热线、远程咨询和一线人员心理支持报道", [
        c("rest", "优先服务医护和社区值守", "把最透支岗位列为首批支持对象，减少连续值守后的失误。", { effects: { trust: 2, staffFatigue: 4 }, hidden: { publicMemory: -2 }, delayed: { delay: 2, label: "心理热线稳定生效", effects: { staffFatigue: -1 } } }),
        c("digital", "开通匿名线上咨询入口", "让隔离点和小区居民能匿名求助，提高可达性。", { effects: { trust: 4, staffFatigue: -2 }, hidden: { publicMemory: -1 }, delayed: { delay: 3, label: "危机个案转介压力", effects: { staffFatigue: 1 } } }),
        c("volunteer", "培训志愿者做首轮倾听", "把普通陪伴和高危个案分开，让专业热线不被淹没。", { effects: { hospitalLoad: 1, staffFatigue: 3 }, hidden: { publicMemory: -2 }, delayed: { delay: 2, label: "志愿者督导补课", resources: { funds: -1 }, effects: { staffFatigue: 1 } } }),
      ], { image: "events/p3_remote_psych_support.png" }),
    ],
    [
      e("vaccine_trial_greenlight", "疫苗研究获批试点", ["trust", "medical", "infection"], "code", "临江参与的疫苗研究项目获得小范围试点许可，科研团队希望招募低风险志愿者，医院更关心不良反应监测，宣传口则担心市民把试点误解为城市已经安全。科研进展是好消息，但它更像一份需要耐心解释的长期投资。", "新冠疫苗早期临床试验、志愿者招募和安全性研究报道", [
        c("open", "公开伦理审查和招募边界", "把试点目的、风险和不纳入人群写清楚，避免把科研进展说成即时解药。", { resources: { funds: -4 }, effects: { trust: 1, staffFatigue: 1 }, hidden: { detectedRate: 2 }, delayed: { delay: 3, label: "试点随访队列建立", effects: { trust: 1 } } }),
        c("medical", "优先纳入高风险岗位观察", "让医护、转运和保供岗位进入严格随访队列，换取未来保护窗口。", { effects: { trust: 2, infection: 1 }, hidden: { detectedRate: 2 }, delayed: { delay: 4, label: "随访占用医疗人手", effects: { staffFatigue: 1 } } }),
        c("audit", "设独立不良反应登记", "把科研团队、医院和监督方分开记录，避免好消息压过真实风险。", { effects: { staffFatigue: 2, infection: 1, trust: 1 }, hidden: { detectedRate: 3, publicMemory: -1 }, delayed: { delay: 3, label: "登记数据公开摘要", effects: { trust: 1 } } }),
      ], { image: "events/p4_vaccine_trial_greenlight.png" }),
      e("online_consultation_open", "互联网医院义诊开放", ["medical", "trust", "fatigue"], "code", "几家互联网医院和本地三甲医院开通免费图文问诊，居民可以先在线咨询发热、慢病用药和复诊问题。线上入口能分流医院排队，但也会把很多难以判断的病情推到护士和社区的二次转介里。", "疫情期间互联网医院、在线问诊和远程医疗服务报道", [
        c("digital", "接入官方发热门诊分流", "把线上问诊和线下分诊连起来，减少无效到院。", { effects: { hospitalLoad: -3, trust: 3 }, hidden: { detectedRate: 1 }, delayed: { delay: 3, label: "线上申诉队列", effects: { staffFatigue: 1 } } }),
        c("open", "发布线上问诊使用指南", "说明哪些情况可以线上问、哪些必须马上就医，减少误用。", { effects: { hospitalLoad: -2, staffFatigue: -1 }, hidden: { detectedRate: 1 }, delayed: { delay: 2, label: "指南带来更多咨询", effects: { staffFatigue: 1 } } }),
        c("triage", "设护士二次回拨小组", "把疑似重症和慢病断药从线上队列里捞出来，保护医院入口。", { effects: { hospitalLoad: -2, trust: 1 }, hidden: { detectedRate: 1 }, delayed: { delay: 2, label: "回拨小组加班", effects: { staffFatigue: 1 } } }),
      ], { image: "events/p4_online_consultation_open.png" }),
    ],
    [
      e("neighboring_vegetable_convoy", "邻省蔬菜车队抵达", ["supply", "trust", "fatigue"], "market", "邻省组织的蔬菜、米面和药品车队抵达临江外环，司机带着绿色通行单等在卡口。车队能迅速补上菜篮子，但进城排序、消杀卸货和分配规则会决定这份好消息是安定人心，还是引发新的不公平感。", "多地向封控城市捐赠蔬菜、生活物资和保供车队报道", [
        c("supply", "按缺口清单直配社区", "把物资先送到缺菜、缺药和高龄居民集中的社区。", { resources: { funds: 1 }, effects: { supplies: 5, trust: 2 }, delayed: { delay: 2, label: "卸货队疲劳回流", effects: { staffFatigue: 1 }, condition: "staffFatigueAbove75" } }),
        c("audit", "公开车队分配规则", "先把每车去向和分配标准贴出来，避免好事变成质疑。", { effects: { supplies: 4, staffFatigue: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "分配争议降温", effects: { trust: 1 } } }),
        c("mutualAid", "交给团长按楼栋认领", "利用熟人网络加快分发，让低风险楼栋自己组织到户。", { resources: { funds: -1 }, effects: { supplies: 4, staffFatigue: 1 }, delayed: { delay: 3, label: "团长质量差异", effects: { trust: -1 }, condition: "trustBelow45" } }),
      ], { image: "events/p5_neighboring_vegetable_convoy.png" }),
      e("group_buy_orderbook", "团购团长共建订货表", ["supply", "trust", "economy"], "community", "几个小区团长把各自的采购渠道、价格和余量汇成共享表，街道第一次看见民间保供网络的真实规模。它能补上官方配送的盲点，也可能把质量、价格和优先级争议带进每个楼栋群。", "封控期间社区团购、微信群互助和居民自组织保供报道", [
        c("mutualAid", "承认团购表为辅助渠道", "把民间团购纳入保供地图，不让它和官方配送互相打架。", { effects: { supplies: 3, trust: 1, staffFatigue: 1 }, delayed: { delay: 3, label: "团购质量抽检", resources: { funds: -1 }, effects: { trust: 1 } } }),
        c("audit", "公布团购价格和投诉入口", "允许居民继续自组织，但让价格、退款和质量投诉有入口。", { effects: { supplies: 3, economy: 1, staffFatigue: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "投诉归集压力", effects: { staffFatigue: 1 } } }),
        c("outsource", "外包统一结算和配送", "让第三方平台把团购订单合并配送，减轻基层搬运。", { effects: { supplies: 2, staffFatigue: -2, trust: 1 }, delayed: { delay: 3, label: "外包价格争议", effects: { trust: -1 }, condition: "trustBelow45" } }),
      ], { image: "events/p5_group_buy_orderbook.png" }),
    ],
    [
      e("aid_team_handoff", "援临队返程前交接", ["fatigue", "trust", "public"], "memory", "援临医疗队和志愿队准备分批返程，病区、隔离点和街道都递来交接表。欢送仪式能鼓舞士气，但更重要的是把他们留下的流程、缺口和教训交给本地团队，否则外援离开后压力会重新塌回来。", "援助湖北医疗队返程、交接和表彰报道", [
        c("memory", "发布交接清单和感谢名单", "把外援做过的工作、接手人和未完成问题一起写清楚。", { effects: { hospitalLoad: -2, trust: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 3, label: "交接后本地接稳", effects: { staffFatigue: -1 } } }),
        c("rest", "给本地接班队伍补休窗口", "趁外援还在，让本地队伍轮换恢复，避免返程后立刻断档。", { effects: { trust: 1, hospitalLoad: -1, staffFatigue: 5 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "补休后执行恢复", effects: { staffFatigue: -1 } } }),
        c("audit", "整理外援流程为本地手册", "把临时经验固化成手册，减少恢复期反复摸索。", { effects: { trust: 1 }, hidden: { publicMemory: -2 }, delayed: { delay: 2, label: "手册培训消耗", effects: { staffFatigue: 1 } } }),
      ], { image: "events/p6_aid_team_handoff.png" }),
      e("recovery_grant_window", "小微恢复补助到账", ["economy", "funds", "trust"], "budget", "一笔面向小微商户、物流网点和药店的恢复补助终于到账。经济口希望尽快发下去，审计口要求留发放标准，街道担心谁先拿、谁没拿会在居民群里发酵。补助能让城市重新动起来，但它不是没有代价的礼物。", "疫情后复工复产扶持、减免补贴和小微企业恢复政策报道", [
        c("compensate", "优先补贴药店和保供网点", "让药店、菜店和物流点先恢复供给，稳定居民日常。", { resources: { funds: 8 }, effects: { economy: 3, supplies: 1 }, delayed: { delay: 3, label: "补助名单复核", effects: { staffFatigue: 1 } } }),
        c("whiteList", "给低风险商户复业额度", "让符合条件的小店尽快开门，恢复街面活力。", { effects: { infection: -1, trust: 2, staffFatigue: 1 }, delayed: { delay: 3, label: "复业名单质疑", effects: { trust: -1 }, condition: "trustBelow45" } }),
        c("audit", "公开补助标准后分批发放", "先把谁能领、怎么领、如何申诉说清楚，再分批拨付。", { resources: { funds: 4 }, effects: { economy: 4, trust: 1 }, hidden: { publicMemory: -1 }, delayed: { delay: 2, label: "材料审核排队", effects: { staffFatigue: 1 } } }),
      ], { image: "events/p6_recovery_grant_window.png" }),
    ],
  ];

  const ALL_EVENT_BLUEPRINTS = EVENT_BLUEPRINTS.map((phaseEvents, phaseIndex) => [
    ...phaseEvents,
    ...(POSITIVE_EVENT_BLUEPRINTS[phaseIndex] || []),
  ]);

  const EVENTS = ALL_EVENT_BLUEPRINTS.flatMap((phaseEvents, phaseIndex) => (
    phaseEvents.map((item, eventIndex) => createEventFromBlueprint(item, phaseIndex + 1, eventIndex))
  ));

  const SCHEDULED_EVENTS = [
    { day: 1, eventId: "p1_notice_eight_rumor", condition: "always", priority: 100, reason: "开局必须处理早期通告与查处余波。" },
    { day: 4, eventId: "p1_fever_night_shift", condition: "feverNightPressure", priority: 40, reason: "早期感染或信息盲区会先压到发热门诊。" },
    { day: 6, eventId: "p1_provincial_lab_channel", condition: "labSupportWindow", priority: 42, reason: "早期若发现率仍不足，外部实验室支援会成为固定窗口。" },
    { day: 8, eventId: "p1_first_press_conference", condition: "always", priority: 40, reason: "第一阶段中段必须面对正式风险沟通。" },
    { day: 13, eventId: "p2_midnight_transport_stop", condition: "always", priority: 50, reason: "阶段切换后固定进入交通停摆议题。" },
    { day: 16, eventId: "p2_multi_province_volunteer_team", condition: "always", priority: 45, reason: "封城急救阶段需要一次外部支援窗口。" },
    { day: 18, eventId: "p2_charity_warehouse_dispute", condition: "warehouseDisputePressure", priority: 40, reason: "供应或信任吃紧时，捐赠仓储争议会被放大。" },
    { day: 20, eventId: "p2_traceable_donation_account", condition: "always", priority: 45, reason: "捐赠和资金支持进入分配压力期。" },
    { day: 21, eventId: "p2_li_liang_death", condition: "always", priority: 60, reason: "阶段 2 固定触发李亮医生去世带来的公共哀悼和信息信任考验。" },
    { day: 22, eventId: "p2_medical_team_arrival", condition: "medicalTeamNeed", priority: 40, reason: "医疗或基层承压时，支援队抵达成为关键选择。" },
    { day: 25, eventId: "p3_stadium_shelter_conversion", condition: "shelterNeed", priority: 50, reason: "第三阶段开端固定检查方舱建设窗口。" },
    { day: 29, eventId: "p3_collect_all_transfer_night", condition: "transferNeed", priority: 40, reason: "感染或医院压力高位时，转运夜会提前成为核心冲突。" },
    { day: 31, eventId: "p3_recovered_plasma_call", condition: "plasmaResearchWindow", priority: 42, reason: "筛查和收治稳定后，康复者支援议题出现。" },
    { day: 34, eventId: "p3_discharge_standard_debate", condition: "dischargeDebateWindow", priority: 40, reason: "床位压力缓和且发现率尚可时，出舱标准才会成为争议。" },
    { day: 37, eventId: "p4_health_code_launch", condition: "always", priority: 50, reason: "常态化阶段固定进入数字通行工具。" },
    { day: 41, eventId: "p4_online_consultation_open", condition: "onlineConsultNeed", priority: 43, reason: "常态化前段若医院或感染仍承压，互联网医院会成为非工程分流窗口。" },
    { day: 42, eventId: "p4_green_code_error", condition: "healthCodeRisk", priority: 40, reason: "发现率提高或健康码工程落地后，误判申诉才有现实基础。" },
    { day: 43, eventId: "p4_vaccine_trial_greenlight", condition: "always", priority: 42, reason: "常态化阶段引入科研试点与风险沟通。" },
    { day: 47, eventId: "p4_enterprise_white_list", condition: "enterpriseWhiteListPressure", priority: 40, reason: "经济或资金承压时，企业白名单会推到桌面上。" },
    { day: 49, eventId: "p5_zoned_silent_control", condition: "silentControlWindow", priority: 50, reason: "进入静默阶段后，若传播仍未降下，分区封控会成为固定冲突。" },
    { day: 53, eventId: "p5_mass_testing_queue", condition: "massTestingNeed", priority: 40, reason: "感染压力或发现率不足会让全员检测队列成为焦点。" },
    { day: 55, eventId: "p5_neighboring_vegetable_convoy", condition: "vegetableConvoyNeed", priority: 42, reason: "静默城市阶段固定提供一次外部保供支援窗口。" },
    { day: 56, eventId: "p5_group_buy_overload", condition: "groupBuyPressure", priority: 40, reason: "供应或高管控压力会把团购互助推成新系统。" },
    { day: 59, eventId: "p5_data_delay_release", condition: "dataDelayPressure", priority: 40, reason: "避开第 60 天阶段复盘，提前固定检查数据发布争议。" },
    { day: 61, eventId: "p6_policy_optimization_notice", condition: "always", priority: 50, reason: "恢复阶段开端固定处理优化措施。" },
    { day: 64, eventId: "p6_fever_medicine_shortage", condition: "feverMedicinePressure", priority: 40, reason: "感染或医疗压力仍高时，退烧药短缺才会显著化。" },
    { day: 66, eventId: "p6_aid_team_handoff", condition: "always", priority: 42, reason: "恢复阶段需要处理支援队交接与记忆修复。" },
    { day: 68, eventId: "p6_procurement_audit", condition: "procurementAuditPressure", priority: 40, reason: "资金吃紧或大额工程使用后，采购审计进入议程。" },
    { day: 70, eventId: "p6_recovery_grant_window", condition: "recoveryGrantNeed", priority: 41, reason: "结局前若活力或资金仍偏低，小微恢复补助会给最后一次修复机会。" },
    { day: 71, eventId: "p6_public_memorial", condition: "memorialPressure", priority: 40, reason: "结局前若创伤或医疗压力仍重，公共记忆事件固定出现。" },
  ];

  const SCHEDULED_EVENT_IDS = new Set(SCHEDULED_EVENTS.map((item) => item.eventId));

  const SCHEDULE_CONDITION_FOCUS_CANDIDATES = {
    feverNightPressure: [["operations", "triageNetwork"], ["operations", "communityClinic"], ["operations", "deployHealthCode"]],
    labSupportWindow: [["operations", "campusSentinel"], ["operations", "deployHealthCode"]],
    warehouseDisputePressure: [["operations", "fiscalTransparencyLedger"], ["operations", "donationCoordination"], ["operations", "donationClaimList"]],
    medicalTeamNeed: [["operations", "interProvinceSupport"], ["operations", "volunteerDispatch"], ["operations", "mentalHealthLine"]],
    shelterNeed: [["operations", "buildShelterHospital"], ["operations", "triageNetwork"], ["resolutions", "shelterAdmissionStandard"]],
    transferNeed: [["operations", "triageNetwork"], ["operations", "communityClinic"], ["operations", "buildShelterHospital"]],
    plasmaResearchWindow: [["operations", "communityClinic"], ["operations", "campusSentinel"], ["resolutions", "priorityMedicineRoute"]],
    dischargeDebateWindow: [["resolutions", "shelterAdmissionStandard"], ["operations", "triageNetwork"], ["resolutions", "publicReviewBrief"]],
    onlineConsultNeed: [["operations", "communityClinic"], ["operations", "remoteWorkGovServices"], ["resolutions", "priorityMedicineRoute"]],
    healthCodeRisk: [["operations", "deployHealthCode"], ["operations", "campusSentinel"], ["resolutions", "suppressRumorLine"]],
    enterpriseWhiteListPressure: [["operations", "microEnterpriseRoster"], ["resolutions", "lowRiskWorkList"], ["resolutions", "lowContactBusinessPermit"], ["resolutions", "enterpriseExemption"]],
    silentControlWindow: [["operations", "deployHealthCode"], ["operations", "supplyCorridor"], ["resolutions", "nightFreightWindow"]],
    massTestingNeed: [["operations", "deployHealthCode"], ["operations", "campusSentinel"], ["operations", "triageNetwork"]],
    vegetableConvoyNeed: [["operations", "supplyCorridor"], ["operations", "interProvinceSupport"], ["operations", "platformLogisticsShare"]],
    groupBuyPressure: [["operations", "neighborhoodCommerceLedger"], ["operations", "onlineVendorDesk"], ["operations", "platformLogisticsShare"]],
    dataDelayPressure: [["resolutions", "publicReviewBrief"], ["operations", "fiscalTransparencyLedger"], ["resolutions", "delayBadNews"]],
    feverMedicinePressure: [["resolutions", "priorityMedicineRoute"], ["operations", "medicineRoute"], ["operations", "communityClinic"]],
    procurementAuditPressure: [["operations", "fiscalTransparencyLedger"], ["operations", "budgetFreezeReview"], ["operations", "emergencyAccountClearing"]],
    recoveryGrantNeed: [["operations", "specialFundingApplication"], ["operations", "fastGrantReport"], ["resolutions", "jobSubsidyAdvance"]],
    memorialPressure: [["resolutions", "publicReviewBrief"], ["operations", "mentalHealthLine"], ["resolutions", "priorityMedicineRoute"]],
  };

  const SCHEDULE_EVENT_FOCUS_CANDIDATES = {
    p1_notice_eight_rumor: [["operations", "campusSentinel"], ["operations", "fiscalTransparencyLedger"], ["resolutions", "publicReviewBrief"]],
    p1_first_press_conference: [["resolutions", "publicReviewBrief"], ["operations", "fiscalTransparencyLedger"], ["operations", "campusSentinel"]],
    p2_midnight_transport_stop: [["operations", "deployHealthCode"], ["operations", "microFreightPermit"], ["resolutions", "nightFreightWindow"]],
    p2_multi_province_volunteer_team: [["operations", "interProvinceSupport"], ["operations", "volunteerDispatch"]],
    p2_traceable_donation_account: [["operations", "publicDonationDrive"], ["operations", "donationClaimList"], ["operations", "fiscalTransparencyLedger"]],
    p2_li_liang_death: [["resolutions", "publicReviewBrief"], ["operations", "mentalHealthLine"], ["operations", "fiscalTransparencyLedger"]],
    p4_health_code_launch: [["operations", "deployHealthCode"], ["operations", "campusSentinel"]],
    p4_vaccine_trial_greenlight: [["operations", "campusSentinel"], ["resolutions", "publicReviewBrief"], ["operations", "communityClinic"]],
    p5_neighboring_vegetable_convoy: [["operations", "supplyCorridor"], ["operations", "interProvinceSupport"], ["operations", "platformLogisticsShare"]],
    p6_policy_optimization_notice: [["resolutions", "publicReviewBrief"], ["resolutions", "lowRiskWorkList"], ["resolutions", "lowContactBusinessPermit"]],
    p6_aid_team_handoff: [["operations", "mentalHealthLine"], ["resolutions", "publicReviewBrief"], ["operations", "interProvinceSupport"]],
  };

  const NEWS_POOL = [
    {
      id: "news_fever_night_shift",
      title: "发热门诊夜班加开窗口",
      body: "候诊区临时增设分诊桌，值班医生提醒居民带好既往病历和用药清单。",
      image: "events/p1_fever_night_shift.png",
      tags: ["medical", "infection", "fatigue"],
      phases: [1],
    },
    {
      id: "news_lab_channel",
      title: "样本送检开通临时绿色线",
      body: "疾控和医院开始复核样本流转单，公开口径仍等待专家组确认。",
      image: "events/p1_provincial_lab_channel.png",
      tags: ["infection", "trust"],
      phases: [1],
    },
    {
      id: "news_market_sampling",
      title: "批发市场完成首轮环境采样",
      body: "商户要求明确停业补偿，居民更关心明天菜价会不会继续上涨。",
      image: "events/p1_market_closure.png",
      tags: ["supply", "infection", "economy"],
      phases: [1],
    },
    {
      id: "news_mask_price",
      title: "口罩批发报价一日多变",
      body: "市场监管和药店开始核对进货价，部分社区建议先把库存留给高风险人群。",
      image: "events/p1_mask_price_spike.png",
      tags: ["funds", "supply", "trust"],
      phases: [1],
    },
    {
      id: "news_midnight_stop",
      title: "凌晨交通停摆后首批通行证发出",
      body: "货运、急救和社区配送被列为优先通行对象，卡口仍在磨合口径。",
      image: "events/p2_midnight_transport_stop.png",
      tags: ["economy", "supply", "trust"],
      phases: [2],
    },
    {
      id: "news_medical_team_arrival",
      title: "外地医疗队抵达临江东站",
      body: "支援队先进入短训和分组对接，中心医院准备把重症压力分段移交。",
      image: "events/p2_medical_team_arrival.png",
      tags: ["medical", "fatigue", "trust"],
      phases: [2],
    },
    {
      id: "news_donation_account",
      title: "捐助专户公布第一批认领清单",
      body: "药品、防护服和菜包缺口被拆成小项，公示速度决定后续信任。",
      image: "events/p2_traceable_donation_account.png",
      tags: ["funds", "trust", "supply"],
      phases: [2],
    },
    {
      id: "news_ambulance_dispatch",
      title: "救护车调度台全天满线",
      body: "非急症转运被建议改走社区登记，调度员担心漏掉真正需要急救的人。",
      image: "events/p2_ambulance_dispatch_overload.png",
      tags: ["medical", "fatigue", "infection"],
      phases: [2],
    },
    {
      id: "news_mask_factory",
      title: "口罩厂闭环复工谈判继续",
      body: "企业要求保障原料和通勤，街道希望先锁定一部分产品给医院和社区。",
      image: "events/p2_mask_factory_return.png",
      tags: ["supply", "economy", "funds"],
      phases: [2],
    },
    {
      id: "news_shelter_conversion",
      title: "体育馆床位区开始编号",
      body: "床位、广播和清洁动线同步施工，转运队希望先明确入舱标准。",
      image: "events/p3_stadium_shelter_conversion.png",
      tags: ["medical", "fatigue", "public"],
      phases: [3],
    },
    {
      id: "news_test_kit_shortage",
      title: "核酸试剂优先流向高风险点位",
      body: "部分社区排队被推迟，疾控要求先保证医院、密接和重点楼栋复核。",
      image: "events/p3_test_kit_shortage.png",
      tags: ["infection", "medical", "supply"],
      phases: [3],
    },
    {
      id: "news_chronic_medicine",
      title: "慢病药直送清单扩到第三批",
      body: "社区医生负责复核处方，配送组提醒居民尽量合并取药需求。",
      image: "events/p3_chronic_medicine_delivery.png",
      tags: ["supply", "trust", "public"],
      phases: [3],
    },
    {
      id: "news_volunteer_driver",
      title: "志愿司机缺口仍在扩大",
      body: "夜间转运和药品配送同时抢人，排班表需要重新压缩非急任务。",
      image: "events/p3_volunteer_driver_gap.png",
      tags: ["fatigue", "supply", "medical"],
      phases: [3],
    },
    {
      id: "news_remote_psych",
      title: "远程心理支持开始接入方舱",
      body: "志愿咨询师先服务轻症患者和高压岗位，一线排班仍需要实质减负。",
      image: "events/p3_remote_psych_support.png",
      tags: ["fatigue", "trust", "public"],
      phases: [3, 6],
    },
    {
      id: "news_health_code_launch",
      title: "健康码闸机完成小范围压测",
      body: "误判申诉和老人无码通行成为测试重点，通行效率尚需观察。",
      image: "events/p4_health_code_launch.png",
      tags: ["trust", "infection", "economy"],
      phases: [4],
    },
    {
      id: "news_factory_loop",
      title: "工厂闭环小班恢复产线",
      body: "厂区承诺每日健康登记，物流方希望同步开放原料短驳窗口。",
      image: "events/p4_factory_closed_loop.png",
      tags: ["economy", "supply", "infection"],
      phases: [4],
    },
    {
      id: "news_bus_scan",
      title: "公交扫码拥堵点位增加志愿引导",
      body: "早晚高峰仍会形成排队，交通口建议错峰通勤和保供车辆分流。",
      image: "events/p4_bus_scan_crowd.png",
      tags: ["trust", "economy", "infection"],
      phases: [4],
    },
    {
      id: "news_vaccine_trial",
      title: "疫苗研究试点消息带来谨慎乐观",
      body: "专家提醒仍要保持监测，预约和重点人群动员需要提前设计。",
      image: "events/p4_vaccine_trial_greenlight.png",
      tags: ["infection", "trust", "public"],
      phases: [4, 6],
    },
    {
      id: "news_online_consult",
      title: "线上问诊入口今日扩容",
      body: "慢病咨询和复诊需求开始转移，医院后台还需要更多分诊人手。",
      image: "events/p4_online_consultation_open.png",
      tags: ["medical", "fatigue", "trust"],
      phases: [4, 6],
    },
    {
      id: "news_group_buy",
      title: "团购订单本改为分楼栋结算",
      body: "团长要求公开缺货和退款规则，居民更在意明天能不能准时到货。",
      image: "events/p5_group_buy_orderbook.png",
      tags: ["supply", "trust", "funds"],
      phases: [5],
    },
    {
      id: "news_vegetable_convoy",
      title: "邻省蔬菜车队夜间抵达",
      body: "入城检验和分拨仍需排队，市场口希望先保障独居老人和封控楼栋。",
      image: "events/p5_neighboring_vegetable_convoy.png",
      tags: ["supply", "trust", "economy"],
      phases: [5],
    },
    {
      id: "news_elder_medicine",
      title: "独居老人送药热线再次占线",
      body: "社区把慢病药和急症求助分开登记，志愿者排班压力仍在上升。",
      image: "events/p5_elder_lives_alone_medicine.png",
      tags: ["medical", "supply", "trust", "public"],
      phases: [5],
    },
    {
      id: "news_antigen_door",
      title: "抗原试剂开始按楼栋入户",
      body: "部分居民需要协助上报结果，社区提醒不要把阴性结果当成通行证。",
      image: "events/p5_antigen_to_door.png",
      tags: ["infection", "supply", "fatigue"],
      phases: [5],
    },
    {
      id: "news_transfer_bus",
      title: "深夜转运大巴完成分批消杀",
      body: "转运效率提高后，隔离点床位和陪护物品规则成为新的争议点。",
      image: "events/p5_midnight_transfer_bus.png",
      tags: ["medical", "fatigue", "public"],
      phases: [5],
    },
    {
      id: "news_aid_handoff",
      title: "支援队开始向本地团队交接",
      body: "交接清单包括病区流程、药品台账和基层轮休建议，恢复期压力仍未消失。",
      image: "events/p6_aid_team_handoff.png",
      tags: ["fatigue", "trust", "public"],
      phases: [6],
    },
    {
      id: "news_recovery_grant",
      title: "恢复补助窗口开放预约",
      body: "小微主体和保供企业排队提交材料，财政口提醒先补齐闭环证明。",
      image: "events/p6_recovery_grant_window.png",
      tags: ["funds", "economy", "trust"],
      phases: [6],
    },
    {
      id: "news_health_code_retire",
      title: "健康码退场后的数据留存引发追问",
      body: "居民关心申诉记录和出行数据如何封存，公开复盘会影响长期信任。",
      image: "events/p6_health_code_retirement.png",
      tags: ["trust", "public", "economy"],
      phases: [6],
    },
    {
      id: "news_dine_restart",
      title: "餐饮堂食重开先从小桌距试点",
      body: "店主希望尽快恢复现金流，社区要求保留预约和通风记录。",
      image: "events/p6_dine_in_restart.png",
      tags: ["economy", "trust", "infection"],
      phases: [6],
    },
    {
      id: "news_procurement_audit",
      title: "采购审计开始抽查高价订单",
      body: "审计组要求保留紧急采购理由，供应商担心尾款结算再次推迟。",
      image: "events/p6_procurement_audit.png",
      tags: ["funds", "trust", "public"],
      phases: [6],
    },
    {
      id: "news_student_return",
      title: "学生返校名单进入班级复核",
      body: "家长希望课程恢复节奏，学校更担心晨检、错峰和心理支持能否跟上。",
      image: "events/p6_student_return.png",
      tags: ["trust", "economy", "public"],
      phases: [6],
    },
  ];

  const MAP_POINTS = [
    {
      id: "hospital",
      type: "building",
      label: "中心医院",
      x: 48,
      y: 43,
      description: "医疗负载的核心观察点。适合执行医疗扩容、分诊与重点人群救治相关行动。",
      operations: ["triageNetwork", "communityClinic", "interProvinceSupport"],
      resolutions: ["shelterAdmissionStandard", "priorityMedicineRoute", "delayBadNews"],
    },
    {
      id: "stadium",
      type: "building",
      label: "体育馆",
      x: 24,
      y: 55,
      description: "可改造为临时收治与分流空间。建设周期较长，消耗资金、物资和基层组织力。",
      operations: ["buildShelterHospital"],
      resolutions: ["shelterAdmissionStandard"],
    },
    {
      id: "market",
      type: "building",
      label: "批发市场",
      x: 39,
      y: 81,
      description: "保供网络的关键节点。保障这里能明显改善物资，但会挤占财政和配送人手。",
      operations: ["supplyCorridor", "essentialServicePermit", "onlineVendorDesk", "contactlessLivelihoodStalls", "neighborhoodPickupWindow", "neighborhoodErrandRoster", "neighborhoodCommerceLedger", "publicDonationDrive", "donationClaimList", "donationCoordination", "platformLogisticsShare", "interProvinceSupport", "procurementCreditNegotiation", "supplierPaymentExtension", "rentDeferralCoordination", "serviceVoucherPilot", "livelihoodStaggeredReopen", "contactlessServiceRegistry"],
      resolutions: ["priorityMedicineRoute", "mutualAidFund", "supplyOrderPrepaySwap", "lowContactBusinessPermit", "hardWarehouse", "emergencyLevy", "nightFreightWindow"],
    },
    {
      id: "road",
      type: "road",
      label: "主干道卡口",
      x: 78,
      y: 70,
      description: "道路通行决定物资和复工效率。健康码和货运白名单都会在这里体现代价。",
      operations: ["deployHealthCode", "supplyCorridor", "microFreightPermit", "remoteWorkGovServices", "onlineGovOvertime", "remoteApprovalDesk", "microEnterpriseRoster", "onlineVendorDesk", "platformLogisticsShare"],
      resolutions: ["elasticTransit", "lowRiskWorkList", "lowContactBusinessPermit", "suppressRumorLine", "nightFreightWindow"],
    },
    {
      id: "school",
      type: "building",
      label: "学校片区",
      x: 73,
      y: 34,
      description: "复课、筛查和家庭照护压力交汇的片区。过快开放会带来感染反弹。",
      operations: ["campusSentinel"],
      resolutions: ["lowRiskWorkList"],
    },
    {
      id: "factory",
      type: "building",
      label: "工业园",
      x: 86,
      y: 19,
      description: "城市活力和财政恢复来源。复工需要足够发现率和通行秩序支撑。",
      operations: ["factoryClosedLoop", "taxFeeDeferralDesk", "fiscalTransparencyLedger", "emergencyGapLedger", "budgetFreezeReview", "fastGrantReport", "bankCreditWindow", "emergencyAccountClearing", "specialFundingApplication", "insurancePreSettlement", "microEnterpriseRoster", "closedLoopSmallShift", "remoteApprovalDesk", "budgetReallocationMeeting"],
      resolutions: ["lowRiskWorkList", "elasticTransit", "temporaryTurnoverPool", "enterpriseExemption", "jobSubsidyAdvance", "specialBondQuota", "deferProjectPayment"],
    },
    {
      id: "residents",
      type: "people",
      label: "居民楼院",
      x: 30,
      y: 24,
      description: "居民信任、药品配送和基层疲劳最容易在这里体现。",
      operations: ["medicineRoute", "mentalHealthLine", "communityRepairWhitelist", "essentialMaintenanceRoster", "neighborhoodPickupWindow", "neighborhoodErrandRoster", "serviceVoucherPilot"],
      resolutions: ["priorityMedicineRoute", "publicReviewBrief", "communityAutonomy", "delayBadNews"],
    },
    {
      id: "volunteers",
      type: "people",
      label: "志愿者集散点",
      x: 64,
      y: 66,
      description: "志愿者能托住保供和社区秩序，但持续高压会转化成执行风险。",
      operations: ["volunteerDispatch", "mentalHealthLine"],
      resolutions: ["staffRotationOrder", "communityAutonomy"],
    },
  ];

  const OPERATIONS = {
    buildShelterHospital: {
      label: "方舱医院建设",
      location: "stadium",
      description: "征用体育馆建设临时收治空间，4 天后启用。强力缓解医疗负载，但会消耗资金、物资和基层力量。",
      resources: { funds: -20 },
      effects: { supplies: -9, economy: -4, staffFatigue: 8 },
      hidden: { publicMemory: 2, policyStrictness: 2 },
      delayed: {
        delay: 4,
        label: "方舱启用",
        effects: { hospitalLoad: -14, trust: 1 },
        hidden: { publicMemory: 1 },
        completeProject: "shelterHospital",
      },
      maxUses: 1,
      conditionText: "需要方舱医院尚未完成。",
      condition(state) {
        return !state.completedProjects.shelterHospital;
      },
    },
    deployHealthCode: {
      label: "健康码部署",
      location: "road",
      description: "部署数字通行与申诉系统，3 天后提高发现率和分区治理能力。会带来短期信任争议和活力损耗。",
      resources: { funds: -15 },
      effects(state) {
        return {
          trust: state.metrics.trust < 45 ? -6 : -3,
          economy: -3,
          staffFatigue: 4,
        };
      },
      hidden(state) {
        return {
          detectedRate: 4,
          policyStrictness: 4,
          publicMemory: state.metrics.trust < 45 ? 2 : 0,
        };
      },
      delayed: {
        delay: 3,
        label: "健康码试运行",
        effects: { infection: -2, trust: 1 },
        hidden: { detectedRate: 8 },
        completeProject: "healthCode",
      },
      maxUses: 1,
      conditionText: "需要健康码系统尚未部署。",
      condition(state) {
        return !state.completedProjects.healthCode;
      },
    },
    supplyCorridor: {
      label: "保供专线招标",
      location: "market",
      description: "用资金换取货运白名单和稳定配送线路。能补物资和活力，但增加短期流动风险。",
      resources: { funds: -14 },
      effects: { supplies: 9, economy: 3, trust: 1, infection: 1, staffFatigue: 3 },
      hidden: { policyStrictness: -2 },
      delayed: {
        delay: 2,
        label: "保供专线稳定",
        effects: { supplies: 3, trust: 1 },
        hidden: {},
        completeProject: "supplyCorridor",
      },
      maxUses: 1,
      conditionText: "需要物资≤55、管控≥45，或进入第18天后。",
      condition(state) {
        return state.metrics.supplies <= 55
          || state.hidden.policyStrictness >= 45
          || state.day >= 18;
      },
    },
    specialFundingApplication: {
      label: "专项资金申报",
      location: "factory",
      description: "把医院、保供和复产缺口整理成专项资金申请。两天后到账，短期会增加填报负担并稍微拖慢企业窗口。",
      resources: {},
      effects: { staffFatigue: 2, trust: -1, economy: -1 },
      hidden: {},
      delayed: {
        delay: 2,
        label: "专项资金到账",
        resources: { funds: 8 },
        effects: {},
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第5天后，且资金≤55、医疗负载≥55或物资≤50。",
      condition(state) {
        return state.day >= 5
          && (state.resources.funds <= 55
            || state.metrics.hospitalLoad >= 55
            || state.metrics.supplies <= 50);
      },
    },
    fiscalTransparencyLedger: {
      label: "财政透明台账",
      location: "factory",
      description: "把应急采购、捐赠、拨付和工程缺口做成可追踪台账。它不能凭空造钱，但能较早修复信任并撬动小额协作资金。",
      resources: { funds: 3 },
      effects: { trust: 1, staffFatigue: 2 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 2,
        label: "台账带来协作拨付",
        resources: { funds: 2 },
        effects: { trust: 1 },
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第1天后，且资金≤72、信任≤70或公共创伤≥8。",
      condition(state) {
        return state.day >= 1
          && (state.resources.funds <= 72
            || state.metrics.trust <= 70
          || state.hidden.publicMemory >= 8);
      },
    },
    emergencyGapLedger: {
      label: "应急缺口清单",
      location: "factory",
      description: "把医院、保供、社区和企业的缺口压成一张可核验清单。它当天不变出大钱，但两天后能换来第一笔小额拨付，是前期铺财政线的低风险入口。",
      resources: {},
      effects: { staffFatigue: 1, economy: -1 },
      hidden: { detectedRate: 1 },
      delayed: {
        delay: 2,
        label: "缺口清单批复",
        resources: { funds: 5 },
        effects: { trust: 1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第1天后，且资金≤75、医疗负载≥28、物资≤68或城市活力≤74。",
      condition(state) {
        return state.day >= 1
          && (state.resources.funds <= 75
            || state.metrics.hospitalLoad >= 28
            || state.metrics.supplies <= 68
            || state.metrics.economy <= 74);
      },
    },
    budgetFreezeReview: {
      label: "非急预算冻结评审",
      location: "factory",
      description: "把宣传、会务和非急迫项目临时冻结，先把现金拨给医疗、保供和基层窗口。它是前期最温和的现金入口之一，但会压低城市活力并引来“为什么现在才调整”的追问。",
      resources: { funds: 3 },
      effects: { economy: -1, trust: -2 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 3,
        label: "冻结预算复核",
        effects: { trust: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第3天后，且资金≤58、医疗负载≥55、物资≤58或城市活力≤66。",
      condition(state) {
        return state.day >= 3
          && (state.resources.funds <= 58
            || state.metrics.hospitalLoad >= 55
            || state.metrics.supplies <= 58
            || state.metrics.economy <= 66);
      },
    },
    fastGrantReport: {
      label: "专项资金快报",
      location: "factory",
      description: "把医院、保供和复产缺口压缩成日报式申请，抢在大型工程前拿到一笔小额周转。它收益不爆炸，但能让前期现金流不只靠举债。",
      resources: {},
      effects: { trust: 1, staffFatigue: 1 },
      hidden: {},
      delayed: {
        delay: 2,
        label: "专项快报批复",
        resources: { funds: 7 },
        effects: {},
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第4天后，且资金≤62、医疗负载≥45或物资≤58。",
      condition(state) {
        return state.day >= 4
          && (state.resources.funds <= 62
            || state.metrics.hospitalLoad >= 45
          || state.metrics.supplies <= 58);
      },
    },
    bankCreditWindow: {
      label: "银行临时授信窗口",
      location: "factory",
      description: "协调本地银行给保供商户、药店和关键企业开临时授信。它把财政信用换成短期现金，能缓住前期工程缺口，但数日后会回到账本上。",
      resources(state) {
        return { funds: state.metrics.trust >= 60 ? 7 : 5 };
      },
      effects: { economy: 1, trust: -1 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 4,
        label: "临时授信还款",
        resources: { funds: -3 },
        effects: { economy: -1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第2天后，信任≥42，且资金≤66或城市活力≤70。",
      condition(state) {
        return state.day >= 2
          && state.metrics.trust >= 42
          && (state.resources.funds <= 66 || state.metrics.economy <= 70);
      },
    },
    insurancePreSettlement: {
      label: "医保预结算窗口",
      location: "hospital",
      description: "把定点医院垫付的急诊、慢病续方和防护费用先做预结算，给医疗系统和应急账本一口气。它能补现金流，也能稍微降低医院压力，但会增加财务、医保和医院后台的复核负担。",
      resources: { funds: 4 },
      effects: { hospitalLoad: -1, staffFatigue: 1 },
      hidden: {},
      delayed: {
        delay: 4,
        label: "医保预结算复核",
        resources: { funds: -2 },
        effects: {},
      },
      maxUses: 1,
      conditionText: "需要第3天后，且资金≤64、医疗负载≥36或基层疲劳≥45。",
      condition(state) {
        return state.day >= 3
          && (state.resources.funds <= 64
            || state.metrics.hospitalLoad >= 36
            || state.metrics.staffFatigue >= 45);
      },
    },
    publicDonationDrive: {
      label: "公开募捐专户",
      location: "market",
      description: "开设公开募捐专户，把医院防护、慢病药、菜包和转运缺口拆成可认领条目。它能在前期补现金流和物资，但必须承担登记、复核和舆论追问。",
      resources(state) {
        return { funds: state.metrics.trust >= 65 ? 7 : 5 };
      },
      effects: { hospitalLoad: -1, supplies: 1, trust: 2, staffFatigue: 2 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "募捐专户复核",
        resources: { funds: -1 },
        effects: { hospitalLoad: -1, trust: -1 },
      },
      maxUses: 1,
      conditionText: "需要第2天后，信任≥50，且资金≤64、物资≤62或公共创伤≥8。",
      condition(state) {
        return state.day >= 2
          && state.metrics.trust >= 50
          && (state.resources.funds <= 64
            || state.metrics.supplies <= 62
            || state.hidden.publicMemory >= 8);
      },
    },
    donationCoordination: {
      label: "社会捐助统筹",
      location: "market",
      description: "开设可追踪捐助清单，把社会捐赠转成防护、药品和配送缺口。能补资金和物资，但需要基层登记与后续复核。",
      resources(state) {
        return { funds: state.metrics.trust < 40 ? 1 : 4 };
      },
      effects: { supplies: 1, trust: 1, staffFatigue: 2 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "捐助专户复核",
        effects: { trust: -1 },
        hidden: {},
        condition: "trustBelow45",
      },
      maxUses: 1,
      conditionText: "需要第6天后，且资金≤55、物资≤65、信任≤65或公共创伤≥15。",
      condition(state) {
        return state.day >= 6
          && (state.resources.funds <= 55
            || state.metrics.supplies <= 65
            || state.metrics.trust <= 65
            || state.hidden.publicMemory >= 15);
      },
    },
    donationClaimList: {
      label: "捐助认领清单",
      location: "market",
      description: "把社会捐助拆成可认领的小缺口：一箱口罩、一条送药线、一个社区菜包点。信任越稳，捐助越容易变成现金流；清单越细，基层复核越累。",
      resources(state) {
        return { funds: state.metrics.trust >= 60 ? 5 : 3 };
      },
      effects: { supplies: 2, trust: 1, staffFatigue: 1 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "捐助认领复核",
        effects: { trust: -1 },
        hidden: { publicMemory: 1 },
        condition: "trustBelow45",
      },
      maxUses: 1,
      conditionText: "需要第3天后，且信任≥45，并满足资金≤60、物资≤58、医疗负载≥35或公共创伤≥6。",
      condition(state) {
        return state.day >= 3
          && state.metrics.trust >= 45
          && (state.resources.funds <= 60
            || state.metrics.supplies <= 58
            || state.metrics.hospitalLoad >= 35
            || state.hidden.publicMemory >= 6);
      },
    },
    interProvinceSupport: {
      label: "省际支援协调",
      location: "hospital",
      description: "对接外省医疗、物资和志愿支援，把外部善意转成可调度清单。它能同时补资金、物资和人手，但接待、分配和磨合也会占用系统。",
      resources: { funds: 5 },
      effects: { hospitalLoad: -3, supplies: 4, staffFatigue: -3, trust: 1 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 2,
        label: "支援队磨合成本",
        effects: { hospitalLoad: -2, staffFatigue: 1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第8天后，且医疗负载≥45、基层疲劳≥45或物资≤58。",
      condition(state) {
        return state.day >= 8
          && (state.metrics.hospitalLoad >= 45
            || state.metrics.staffFatigue >= 45
            || state.metrics.supplies <= 58);
      },
    },
    procurementCreditNegotiation: {
      label: "采购账期谈判",
      location: "market",
      description: "与药品、防护和生鲜供应商谈判延期结算，先把现金流留给急迫工程。账期会回来，且供应商会要求更清楚的付款口径。",
      resources: { funds: 5 },
      effects: { supplies: -1, trust: -2, staffFatigue: 1 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 4,
        label: "采购账期到期",
        resources: { funds: -5 },
        effects: { trust: -1 },
        condition: "trustBelow45",
      },
      maxUses: 1,
      conditionText: "需要第3天后，且资金≤56、物资≥28。",
      condition(state) {
        return state.day >= 3 && state.resources.funds <= 56 && state.metrics.supplies >= 28;
      },
    },
    supplierPaymentExtension: {
      label: "供应商账期展期",
      location: "market",
      description: "把药品、生鲜和防护品的短账期统一展期，先把现金留给医疗和保供节点。它是现金流动作，不是免费资金，数日后会形成回款压力。",
      resources: { funds: 8 },
      effects: { supplies: -1, trust: -1, staffFatigue: 1 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 4,
        label: "展期账款回落",
        resources: { funds: -5 },
        effects: { trust: -1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第3天后，且资金≤50、物资≥32。",
      condition(state) {
        return state.day >= 3 && state.resources.funds <= 50 && state.metrics.supplies >= 32;
      },
    },
    platformLogisticsShare: {
      label: "平台运力共担协议",
      location: "market",
      description: "与配送平台、药店和商超签一份临时共担协议，把部分运力和预付账期换成保供末端。它能早期托住资金、物资和活力，但会引发公平和结算压力。",
      resources: { funds: 3 },
      effects: { supplies: 2, economy: 2, trust: -2, staffFatigue: 1 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 4,
        label: "平台运力结算",
        resources: { funds: -2 },
        effects: { trust: -1 },
        condition: "trustBelow45",
      },
      maxUses: 1,
      conditionText: "需要第3天后，且资金≤50、物资≤60、城市活力≤68或管控强度≥35。",
      condition(state) {
        return state.day >= 3
          && (state.resources.funds <= 50
            || state.metrics.supplies <= 60
            || state.metrics.economy <= 68
            || state.hidden.policyStrictness >= 35);
      },
    },
    emergencyAccountClearing: {
      label: "小额账款清分",
      location: "factory",
      description: "把保供、街道和医院的小额欠款拆成可延期、可核销和必须立刻支付的清单。能早期释放现金流，但会增加审计、人手和口径压力。",
      resources: { funds: 6 },
      effects: { economy: -1, trust: -1, staffFatigue: 2 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 3,
        label: "清分账目追问",
        resources: { funds: -2 },
        effects: { trust: -1 },
        condition: "trustBelow45",
      },
      maxUses: 1,
      conditionText: "需要第2天后，且资金≤62、活力≤68或物资≤58。",
      condition(state) {
        return state.day >= 2
          && (state.resources.funds <= 62
            || state.metrics.economy <= 68
            || state.metrics.supplies <= 58);
      },
    },
    triageNetwork: {
      label: "分级诊疗网络",
      location: "hospital",
      description: "建立社区转诊与分级分流。适合医院或感染压力已经抬头时使用，能降低医院负载，但需要医护培训和信息沟通。",
      resources: { funds: -10 },
      effects: { hospitalLoad: -4, trust: 1, staffFatigue: 5, supplies: -3 },
      hidden: { detectedRate: 3 },
      delayed: {
        delay: 2,
        label: "分诊流程磨合",
        effects: { hospitalLoad: -2, staffFatigue: -1 },
        hidden: {},
        completeProject: "triageNetwork",
      },
      maxUses: 1,
      conditionText: "需要医疗负载≥38，或感染压力≥45，或进入第25天后。",
      condition(state) {
        return state.metrics.hospitalLoad >= 38 || state.metrics.infection >= 45 || state.day >= 25;
      },
    },
    medicineRoute: {
      label: "慢病药品直送",
      location: "residents",
      description: "面向独居老人和慢病患者建立药品配送清单。提升信任、降低创伤，但消耗物资和配送人手。",
      resources: { funds: -8 },
      effects: { trust: 7, supplies: -6, staffFatigue: 4 },
      hidden: { publicMemory: -3 },
      delayed: {
        delay: 2,
        label: "药品通道反馈",
        effects: { trust: 2 },
        hidden: { publicMemory: -1 },
      },
      maxUses: 3,
    },
    mentalHealthLine: {
      label: "心理与轮休热线",
      location: "volunteers",
      description: "为基层、医护和居民开通减压热线与轮换支持。适合疲劳、医疗或创伤已经显形时使用；过早铺设会被闲置，不能当成开局白拿的减压按钮。",
      resources: { funds: -7 },
      effects: { staffFatigue: -6, trust: 2, hospitalLoad: 2 },
      hidden: { publicMemory: -2 },
      delayed: {
        delay: 2,
        label: "减压机制生效",
        effects: { staffFatigue: -3, trust: 1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要基层疲劳≥42、医疗负载≥65、信任≤45，或公共创伤≥18。",
      condition(state) {
        return state.metrics.staffFatigue >= 42
          || state.metrics.hospitalLoad >= 65
          || state.metrics.trust <= 45
          || state.hidden.publicMemory >= 18;
      },
    },
    campusSentinel: {
      label: "校园哨点筛查",
      location: "school",
      description: "在学校片区建立症状报告和家庭筛查。提高发现率，压低隐匿传播，但会消耗基层和物资。",
      resources: { funds: -8 },
      effects: { infection: -2, supplies: -3, staffFatigue: 4, trust: 1 },
      hidden: { detectedRate: 8 },
      delayed: {
        delay: 3,
        label: "校园哨点报告",
        effects: { infection: -2 },
        hidden: { detectedRate: 2 },
      },
      maxUses: 1,
    },
    factoryClosedLoop: {
      label: "工厂闭环复工",
      location: "factory",
      description: "以闭环通勤和厂区检测恢复部分产能。恢复活力和资金，但若发现率不足会推高感染。",
      resources: { funds: -8 },
      effects(state) {
        return {
          economy: 9,
          infection: state.hidden.detectedRate < 55 ? 5 : 3,
          trust: 1,
          staffFatigue: 3,
        };
      },
      hidden: { policyStrictness: 2 },
      delayed: {
        delay: 2,
        label: "产能恢复",
        resources: { funds: 5 },
        effects: { economy: 3, supplies: 1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要发现率≥55，且活力≤60或资金≤35；第37天后可放宽执行。",
      condition(state) {
        return (state.hidden.detectedRate >= 55
          && (state.metrics.economy <= 60 || state.resources.funds <= 35)
          && state.metrics.infection < 70)
          || state.day >= 37;
      },
    },
    livelihoodStaggeredReopen: {
      label: "民生网点分时复业",
      location: "market",
      description: "允许药店、菜店和维修网点错峰开门。前期能小幅恢复烟火气和信任，但发现率不足时会放大隐匿传播。",
      resources: { funds: -3 },
      effects(state) {
        return {
          economy: 5,
          trust: 2,
          infection: state.hidden.detectedRate < 50 ? 3 : 2,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -2 },
      delayed: {
        delay: 2,
        label: "分时复业回访",
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast60",
      },
      maxUses: 1,
      conditionText: "需要第8天后，感染压力<65，且城市活力≤68或信任≤62。",
      condition(state) {
        return state.day >= 8
          && state.metrics.infection < 65
          && (state.metrics.economy <= 68 || state.metrics.trust <= 62);
      },
    },
    essentialServicePermit: {
      label: "民生服务保留名录",
      location: "market",
      description: "先保留药店、菜摊、维修和少量社区服务点，用预约、限流和门外交接维持最低城市运转。它比复工更温和，但会带来流动、排班和漏检压力。",
      resources: { funds: -3 },
      effects(state) {
        return {
          economy: 4,
          supplies: 1,
          trust: 1,
          infection: state.hidden.detectedRate < 45 ? 2 : 1,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 2,
        label: "保留名录复核",
        effects: { economy: 1 },
        hidden: {},
        condition: "detectedAtLeast50",
      },
      maxUses: 1,
      conditionText: "需要第1天后，感染压力<65，且城市活力≤74或物资≤68。",
      condition(state) {
        return state.day >= 1
          && state.metrics.infection < 65
          && (state.metrics.economy <= 74 || state.metrics.supplies <= 68);
      },
    },
    contactlessLivelihoodStalls: {
      label: "无接触民生摊点",
      location: "market",
      description: "允许菜摊、药店和小修小补摊点用预约、打包和门外交接恢复最低营业。它不是完整复工，而是在前期给城市活力留一条细线。",
      resources: { funds: -2 },
      effects(state) {
        return {
          economy: 3,
          supplies: 1,
          trust: 1,
          infection: state.hidden.detectedRate < 45 ? 2 : 1,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 2,
        label: "民生摊点复核",
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第2天后，感染压力<65，且活力≤72或物资≤70。",
      condition(state) {
        return state.day >= 2
          && state.metrics.infection < 65
          && (state.metrics.economy <= 72 || state.metrics.supplies <= 70);
      },
    },
    neighborhoodPickupWindow: {
      label: "社区预约取货窗口",
      location: "market",
      description: "把菜店、药店和团购点改成预约取货，居民分时段到门外交接。它恢复的是很小的生活循环，收益不大，但能在早期减少完全停摆感。",
      resources: { funds: -2 },
      effects(state) {
        return {
          economy: 2,
          supplies: 2,
          trust: 1,
          infection: state.hidden.detectedRate >= 55 ? 1 : 2,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 2,
        label: "预约取货复核",
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第2天后，感染压力<68，且物资≤60、活力≤68或管控强度≥35。",
      condition(state) {
        return state.day >= 2
          && state.metrics.infection < 68
          && (state.metrics.supplies <= 60
            || state.metrics.economy <= 68
            || state.hidden.policyStrictness >= 35);
      },
    },
    onlineVendorDesk: {
      label: "线上摊位登记台",
      location: "market",
      description: "把药店、菜摊、维修点和低风险小商户先登记成线上摊位，允许电话下单、门外取货和无接触结算。它几乎不放大街面流动，却能让前期活力和账目有一个低速入口。",
      resources: { funds: -1 },
      effects: { economy: 2 },
      hidden: { detectedRate: 1 },
      delayed: {
        delay: 2,
        label: "线上摊位跑通",
        resources: { funds: 1 },
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第2天后，感染压力<70，且城市活力≤68、资金≤58或管控强度≥35。",
      condition(state) {
        return state.day >= 2
          && state.metrics.infection < 70
          && (state.metrics.economy <= 68
            || state.resources.funds <= 58
            || state.hidden.policyStrictness >= 35);
      },
    },
    neighborhoodErrandRoster: {
      label: "楼栋错峰服务单",
      location: "residents",
      description: "让每栋楼只保留少量代买、送修、取药和取菜服务时段，居民按楼栋错峰交接。它能减少完全停摆感，也会让社区多一层排班和核验压力。",
      resources: { funds: -2 },
      effects(state) {
        return {
          economy: 2,
          infection: state.hidden.detectedRate >= 55 ? 1 : 2,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 2,
        label: "楼栋服务单复核",
        effects: { economy: 1, trust: 1 },
        hidden: {},
        condition: "detectedAtLeast50",
      },
      maxUses: 1,
      conditionText: "需要第2天后，感染压力<68，且物资≤60、城市活力≤66或管控强度≥35。",
      condition(state) {
        return state.day >= 2
          && state.metrics.infection < 68
          && (state.metrics.supplies <= 60
            || state.metrics.economy <= 66
            || state.hidden.policyStrictness >= 35);
      },
    },
    neighborhoodCommerceLedger: {
      label: "社区团购结算台",
      location: "market",
      description: "把团购、药店配送和菜包采购的结算汇到一张轻量台账。它能把零散交易转成一点现金流、物资和活力，但复核、公平和排队压力也会回到基层。",
      resources: { funds: 2 },
      effects(state) {
        return {
          economy: 3,
          supplies: 1,
          trust: state.metrics.trust >= 60 ? 0 : -1,
          infection: state.hidden.detectedRate >= 55 ? 1 : 2,
          staffFatigue: 2,
        };
      },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 2,
        label: "团购结算复核",
        resources: { funds: 1 },
        effects: { trust: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第2天后，感染压力<68，且资金≤64、物资≤70、活力≤72或管控强度≥35。",
      condition(state) {
        return state.day >= 2
          && state.metrics.infection < 68
          && (state.resources.funds <= 64
            || state.metrics.supplies <= 70
            || state.metrics.economy <= 72
            || state.hidden.policyStrictness >= 35);
      },
    },
    onlineGovOvertime: {
      label: "线上政务加班窗口",
      location: "road",
      description: "把企业申报、通行咨询和采购材料审核临时搬到线上加班处理。它恢复的是城市运转能力和财政周转，而不是街面流量。",
      resources: { funds: -2 },
      effects(state) {
        return {
          economy: state.metrics.trust >= 60 ? 3 : 2,
          trust: 1,
          staffFatigue: 1,
        };
      },
      hidden: { detectedRate: 1 },
      delayed: {
        delay: 2,
        label: "线上窗口跑通",
        resources: { funds: 2 },
        effects: { economy: 1 },
        hidden: { detectedRate: 1 },
      },
      maxUses: 1,
      conditionText: "需要第2天后，且活力≤72、资金≤62或管控强度≥30。",
      condition(state) {
        return state.day >= 2
          && (state.metrics.economy <= 72
            || state.resources.funds <= 62
            || state.hidden.policyStrictness >= 30);
      },
    },
    remoteApprovalDesk: {
      label: "线上预审窗口",
      location: "road",
      description: "把采购报销、通行材料和小微申报先搬到线上预审。它几乎不增加街面流动，能给前期活力留一点空气，但会增加后台值守。",
      resources: { funds: -1 },
      effects: { economy: 2, trust: 1 },
      hidden: { detectedRate: 1 },
      delayed: {
        delay: 2,
        label: "预审材料跑通",
        resources: { funds: 2 },
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第1天后，且城市活力≤74、资金≤70或管控强度≥30。",
      condition(state) {
        return state.day >= 1
          && (state.metrics.economy <= 74
            || state.resources.funds <= 70
            || state.hidden.policyStrictness >= 30);
      },
    },
    microEnterpriseRoster: {
      label: "小微主体保留名册",
      location: "road",
      description: "先把药店、菜店、维修点和可远程办公的小微主体整理成保留名册。它不直接放开街面流动，却能让前期恢复有对象可找、有窗口可排。",
      resources: { funds: -1 },
      effects: { economy: 2, trust: 1 },
      hidden: { detectedRate: 1 },
      delayed: {
        delay: 2,
        label: "小微名册跑通",
        resources: { funds: 1 },
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第1天后，且城市活力≤74、资金≤70或管控强度≥20。",
      condition(state) {
        return state.day >= 1
          && (state.metrics.economy <= 74
            || state.resources.funds <= 70
            || state.hidden.policyStrictness >= 20);
      },
    },
    communityRepairWhitelist: {
      label: "社区维修白名单",
      location: "residents",
      description: "给水电、燃气、药房设备和必要维修建立小范围白名单。它能减少城市生活停摆感，但需要社区核验和低风险通行。",
      resources: { funds: -2 },
      effects(state) {
        return {
          economy: 3,
          trust: 1,
          infection: state.hidden.detectedRate >= 60 ? 1 : 2,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 3,
        label: "维修白名单回访",
        effects: { economy: 1, trust: 1 },
        hidden: {},
        condition: "detectedAtLeast50",
      },
      maxUses: 1,
      conditionText: "需要第7天后，信任≥45、感染压力<70，且活力≤65或公共创伤≥10。",
      condition(state) {
        return state.day >= 7
          && state.metrics.trust >= 45
          && state.metrics.infection < 70
          && (state.metrics.economy <= 65 || state.hidden.publicMemory >= 10);
      },
    },
    essentialMaintenanceRoster: {
      label: "必要维修预约窗",
      location: "residents",
      description: "给水电、燃气、药房设备和必要家修开一个预约窗口，先处理影响生活和保供的故障。它不等于复工，但能让城市机能少掉一些断点。",
      resources: { funds: -2 },
      effects(state) {
        return {
          economy: 3,
          trust: 1,
          infection: state.hidden.detectedRate >= 55 ? 1 : 2,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 3,
        label: "维修预约回访",
        effects: { economy: 1, trust: 1 },
        hidden: {},
        condition: "detectedAtLeast50",
      },
      maxUses: 1,
      conditionText: "需要第3天后，信任≥45、感染压力<70，且活力≤66、物资≤60或公共创伤≥8。",
      condition(state) {
        return state.day >= 3
          && state.metrics.trust >= 45
          && state.metrics.infection < 70
          && (state.metrics.economy <= 66
            || state.metrics.supplies <= 60
            || state.hidden.publicMemory >= 8);
      },
    },
    closedLoopSmallShift: {
      label: "保供工厂闭环小班",
      location: "factory",
      description: "先让保供相关工厂以小班闭环运转，补库存也稳住产能。它比完整复工更早可用，但仍会带来流动和排班压力。",
      resources: { funds: -4 },
      effects(state) {
        return {
          economy: 4,
          supplies: 4,
          infection: state.hidden.detectedRate < 55 ? 3 : 1,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: 1 },
      delayed: {
        delay: 2,
        label: "小班产能稳定",
        resources: { funds: 2 },
        effects: { supplies: 1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要第6天后，物资≤65或城市活力≤60，且感染压力<75。",
      condition(state) {
        return state.day >= 6
          && state.metrics.infection < 75
          && (state.metrics.supplies <= 65 || state.metrics.economy <= 60);
      },
    },
    contactlessServiceRegistry: {
      label: "无接触商铺备案",
      location: "market",
      description: "允许药店、菜店、维修点用预约取货和门外交接恢复营业。它能在早期托住活力、物资和信任，但发现率不足时会带来隐匿流动。",
      resources: { funds: -4 },
      effects(state) {
        return {
          economy: 3,
          supplies: 1,
          trust: 1,
          infection: state.hidden.detectedRate < 45 ? 2 : 1,
          staffFatigue: 3,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 3,
        label: "备案商铺回访",
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast60",
      },
      maxUses: 1,
      conditionText: "需要第4天后，感染压力<70，且城市活力≤68或物资≤68。",
      condition(state) {
        return state.day >= 4
          && state.metrics.infection < 70
          && (state.metrics.economy <= 68 || state.metrics.supplies <= 68);
      },
    },
    microFreightPermit: {
      label: "货运微循环许可",
      location: "road",
      description: "给药品、生鲜和工业原料车辆设置短时段、短路线许可。它恢复的是城市微循环，收益不大，但能在全面复工前托住供应和活力。",
      resources: { funds: -3 },
      effects(state) {
        return {
          supplies: 3,
          economy: 2,
          infection: state.completedProjects.healthCode ? 1 : 2,
          staffFatigue: 3,
        };
      },
      hidden: { policyStrictness: -1 },
      delayed: {
        delay: 2,
        label: "货运点位复核",
        effects: { economy: 1 },
        hidden: {},
        condition: "detectedAtLeast50",
      },
      maxUses: 1,
      conditionText: "需要第4天后，管控强度≥30，且感染压力<75。",
      condition(state) {
        return state.day >= 4 && state.hidden.policyStrictness >= 30 && state.metrics.infection < 75;
      },
    },
    rentDeferralCoordination: {
      label: "小微租金缓缴协调",
      location: "market",
      description: "协调商铺、房东和平台把租金与服务费往后缓一缓。它能保住小微主体和居民日常服务，但会占用财政信用。",
      resources: { funds: -4 },
      effects: { economy: 4, trust: 2, staffFatigue: 1 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "缓缴缺口复核",
        resources: { funds: -2 },
        condition: "economyBelow40",
      },
      maxUses: 1,
      conditionText: "需要第5天后，城市活力≤66，且应急资金≥12。",
      condition(state) {
        return state.day >= 5 && state.metrics.economy <= 66 && state.resources.funds >= 12;
      },
    },
    serviceVoucherPilot: {
      label: "民生服务券试点",
      location: "market",
      description: "给药店、菜店、维修点和低接触服务发放小额服务券，鼓励居民预约消费。它能较早托住小微主体和街区活力，但会消耗现金并增加核销工作。",
      resources: { funds: -5 },
      effects(state) {
        return {
          economy: 5,
          trust: 2,
          supplies: -1,
          infection: state.hidden.detectedRate >= 55 ? 1 : 2,
          staffFatigue: 1,
        };
      },
      hidden: { policyStrictness: -1, publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "服务券核销回流",
        resources: { funds: 1 },
        effects: { economy: 1 },
        hidden: {},
        condition: "trustAtLeast55",
      },
      maxUses: 1,
      conditionText: "需要第6天后，资金≥18、感染压力<65，且城市活力≤62或信任≤58。",
      condition(state) {
        return state.day >= 6
          && state.resources.funds >= 18
          && state.metrics.infection < 65
          && (state.metrics.economy <= 62 || state.metrics.trust <= 58);
      },
    },
    taxFeeDeferralDesk: {
      label: "税费社保缓缴窗口",
      location: "factory",
      description: "把小微商户和关键企业的税费、社保和平台服务费缓一缓。它能在封控初期留住经营主体，但会推迟财政回款并增加材料审核压力。",
      resources: { funds: -2 },
      effects: { economy: 5, trust: 1, staffFatigue: 2 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 5,
        label: "缓缴回款缺口",
        resources: { funds: -3 },
        effects: { economy: 1 },
        condition: "economyBelow40",
      },
      maxUses: 1,
      conditionText: "需要第3天后，城市活力≤68，且应急资金≥18。",
      condition(state) {
        return state.day >= 3 && state.metrics.economy <= 68 && state.resources.funds >= 18;
      },
    },
    remoteWorkGovServices: {
      label: "线上政务与远程办公",
      location: "road",
      description: "把企业申报、通行咨询和部分政务窗口搬到线上，同时推动低风险岗位远程办公。它恢复的是城市运转能力，不是街面流量。",
      resources: { funds: -4 },
      effects(state) {
        return {
          economy: state.metrics.trust >= 65 ? 3 : 2,
          trust: 1,
          staffFatigue: 1,
        };
      },
      hidden: { detectedRate: 2 },
      delayed: {
        delay: 2,
        label: "线上流程跑通",
        effects: { economy: 1 },
        hidden: { detectedRate: 1 },
      },
      maxUses: 1,
      conditionText: "需要第2天后，且城市活力≤70、管控强度≥30或资金≤55。",
      condition(state) {
        return state.day >= 2
          && (state.metrics.economy <= 70
            || state.hidden.policyStrictness >= 30
            || state.resources.funds <= 55);
      },
    },
    budgetReallocationMeeting: {
      label: "预算重排会议",
      location: "factory",
      description: "把恢复期、宣传和非急迫项目预算挪进应急账本。它能补资金缺口，但会压缩早期活力并带来被质疑的空间。",
      resources: { funds: 8 },
      effects: { economy: -2, trust: -2, staffFatigue: 1 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 4,
        label: "预算重排追问",
        effects: { trust: -1 },
        condition: "trustBelow45",
      },
      maxUses: 2,
      conditionText: "需要第5天后，且资金≤45或医疗负载≥70；每局最多两次。",
      condition(state) {
        return state.day >= 5
          && (state.resources.funds <= 45 || state.metrics.hospitalLoad >= 70);
      },
    },
    volunteerDispatch: {
      label: "志愿者调度站",
      location: "volunteers",
      description: "把志愿者纳入统一排班和物资登记。适合保供或基层排班出现缺口后启用；若城市还没有明显压力，提前扩站只会消耗预算。",
      resources: { funds: -7 },
      effects: { supplies: 3, trust: 2, staffFatigue: 1 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 2,
        label: "志愿者排班稳定",
        effects: { staffFatigue: -5, supplies: 1 },
        hidden: {},
      },
      maxUses: 1,
      conditionText: "需要物资≤55、基层疲劳≥42、信任≤52、管控≥45，或进入第18天后。",
      condition(state) {
        return state.metrics.supplies <= 55
          || state.metrics.staffFatigue >= 42
          || state.metrics.trust <= 52
          || state.hidden.policyStrictness >= 45
          || state.day >= 18;
      },
    },
    communityClinic: {
      label: "社区临时门诊",
      location: "hospital",
      description: "把轻症咨询和慢病续方前移到社区。适合医院压力或感染压力进入高位后分流；压力太低时改造门诊会变成低效消耗。",
      resources: { funds: -12 },
      effects: { hospitalLoad: -6, supplies: -4, staffFatigue: 6, trust: 2 },
      hidden: { detectedRate: 2 },
      delayed: {
        delay: 3,
        label: "社区门诊分流",
        effects: { hospitalLoad: -3, trust: 1 },
        hidden: {},
        completeProject: "communityClinic",
      },
      maxUses: 1,
      conditionText: "需要社区门诊尚未建成，且医疗负载≥50、感染压力≥65，或进入第37天后。",
      condition(state) {
        return !state.completedProjects.communityClinic
          && (state.metrics.hospitalLoad >= 50 || state.metrics.infection >= 65 || state.day >= 37);
      },
    },
  };

  const RESOLUTIONS = {
    shelterAdmissionStandard: {
      label: "启动方舱收治标准",
      description: "统一轻症转运、分区和出舱标准。需要方舱已启用或医疗负载越过高压线。",
      resources: { funds: -5 },
      effects: { hospitalLoad: -7, trust: -2, staffFatigue: 5 },
      hidden: { publicMemory: 2 },
      once: true,
      conditionText: "需要方舱已启用，或医疗负载≥78。",
      condition(state) {
        return state.completedProjects.shelterHospital || state.metrics.hospitalLoad >= 78;
      },
    },
    lowRiskWorkList: {
      label: "低风险片区白名单复工",
      description: "在发现率足够时恢复低风险片区通勤。恢复活力，但承担小幅反弹风险。",
      resources: { funds: -4 },
      effects(state) {
        return {
          economy: 9,
          infection: state.hidden.detectedRate >= 75 ? 3 : 4,
          trust: 2,
          staffFatigue: 3,
        };
      },
      hidden: { policyStrictness: -6 },
      once: true,
      conditionText: "需要发现率≥65，感染压力<55，且活力≤58或进入第37天后。",
      condition(state) {
        return state.hidden.detectedRate >= 65
          && state.metrics.infection < 55
          && (state.metrics.economy <= 58 || state.day >= 37);
      },
    },
    publicReviewBrief: {
      label: "公开阶段复盘简报",
      description: "公开误差、延误与改进清单。修复长期信任，但短期会把压力重新带到台前。",
      resources: { funds: -3 },
      effects: { trust: 2, economy: -2, staffFatigue: -1 },
      hidden: { publicMemory: -3, detectedRate: 1 },
      once: true,
      conditionText: "需要第24天后；若第12天后信任<55、公共创伤>20或发现率<55，也可提前复盘。",
      condition(state) {
        return state.day >= 24
          || (state.day >= 12
            && (state.metrics.trust < 55
              || state.hidden.publicMemory > 20
              || state.hidden.detectedRate < 55));
      },
    },
    staffRotationOrder: {
      label: "基层轮换令",
      description: "强制把一线排班从硬撑改成轮换。疲劳显著下降，但医疗和保供短期变紧。",
      resources: { funds: -9 },
      effects: { staffFatigue: -11, hospitalLoad: 3, supplies: -4, trust: -5 },
      hidden: {},
      once: true,
      conditionText: "需要基层疲劳≥62。",
      condition(state) {
        return state.metrics.staffFatigue >= 62;
      },
    },
    priorityMedicineRoute: {
      label: "重点人群药品直送",
      description: "把有限药品优先发给高风险人群。能明显修复信任和创伤，但会消耗库存。",
      resources: { funds: -6 },
      effects: { supplies: -8, trust: 6, staffFatigue: 4 },
      hidden: { publicMemory: -3 },
      once: true,
      conditionText: "需要物资供应≥32，且信任≤65、公共创伤≥12、医疗负载≥55，或进入第40天后。",
      condition(state) {
        return state.metrics.supplies >= 32
          && (state.metrics.trust <= 65
            || state.hidden.publicMemory >= 12
            || state.metrics.hospitalLoad >= 55
            || state.day >= 40);
      },
    },
    elasticTransit: {
      label: "全市弹性交通",
      description: "用错峰通勤和货运通道恢复城市流动。适合经济低迷时使用，感染会承压。",
      resources: { funds: -5 },
      effects: { economy: 7, supplies: 2, infection: 4, trust: 1 },
      hidden: { policyStrictness: -5 },
      once: true,
      conditionText: "需要城市活力<55，且感染压力<70。",
      condition(state) {
        return state.metrics.economy < 55 && state.metrics.infection < 70;
      },
    },
    nightFreightWindow: {
      label: "夜间货运窗口",
      description: "在夜间开放保供车辆和工业原料专用通道，给高管控下的城市留出物流缝隙。物资和活力会恢复，但排班与流动风险上升。",
      resources: { funds: -3 },
      effects: { supplies: 5, economy: 4, infection: 2, staffFatigue: 2 },
      hidden: { policyStrictness: -2 },
      once: true,
      conditionText: "需要管控强度≥35，且感染压力<75。",
      condition(state) {
        return state.hidden.policyStrictness >= 35 && state.metrics.infection < 75;
      },
    },
    mutualAidFund: {
      label: "临江互助基金",
      description: "把社会捐款、平台运力和社区互助资金汇入公开专户。信任足够时，它能把善意转成现金流和物资；信任不足时，基金会先变成新的质疑点。",
      resources(state) {
        return { funds: state.metrics.trust >= 70 ? 6 : 4 };
      },
      effects: { supplies: 2, trust: 2, staffFatigue: 3 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "互助基金公示",
        resources: { funds: 2 },
        effects: { trust: -1 },
        condition: "trustBelow45",
      },
      once: true,
      conditionText: "需要第6天后，信任≥55，且资金≤60、物资≤62或公共创伤≥10。",
      condition(state) {
        return state.day >= 6
          && state.metrics.trust >= 55
          && (state.resources.funds <= 60
            || state.metrics.supplies <= 62
            || state.hidden.publicMemory >= 10);
      },
    },
    temporaryTurnoverPool: {
      label: "应急财政周转池",
      description: "把可延期拨付和短账期工程款做成临时周转池。它能补上现金流空洞，但会把恢复期预算压薄，并要求后续还账。",
      resources: { funds: 8 },
      effects: { economy: -2, trust: -2, staffFatigue: 1 },
      hidden: { publicMemory: 1 },
      delayed: {
        delay: 4,
        label: "周转池回补",
        resources: { funds: -5 },
        effects: { economy: -1 },
      },
      once: true,
      conditionText: "需要第5天后，资金≤45，且信任≥35。",
      condition(state) {
        return state.day >= 5 && state.resources.funds <= 45 && state.metrics.trust >= 35;
      },
    },
    lowContactBusinessPermit: {
      label: "低接触复业许可",
      description: "给药房、维修、线上取货和必要服务网点发放低接触许可。它恢复的是细小但真实的城市循环，前提是发现率足够承接漏检风险。",
      resources: { funds: 2 },
      effects(state) {
        return {
          economy: 6,
          infection: state.hidden.detectedRate >= 60 ? 2 : 3,
          trust: 1,
          staffFatigue: 3,
        };
      },
      hidden: { policyStrictness: -3 },
      delayed: {
        delay: 2,
        label: "低接触许可复核",
        effects: { economy: 1 },
        condition: "detectedAtLeast50",
      },
      once: true,
      conditionText: "需要第6天后，发现率≥50、感染压力<62，且活力≤66或资金≤45。",
      condition(state) {
        return state.day >= 6
          && state.hidden.detectedRate >= 50
          && state.metrics.infection < 62
          && (state.metrics.economy <= 66 || state.resources.funds <= 45);
      },
    },
    supplyOrderPrepaySwap: {
      label: "保供订单预付置换",
      description: "用小额预付款换取药品、生鲜和保供工厂的优先排产。它先花钱稳供应和活力，若执行顺利，几天后会回收一部分财政周转。",
      resources: { funds: -6 },
      effects: { supplies: 5, economy: 3, trust: 1, staffFatigue: 3 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 3,
        label: "保供订单回款",
        resources: { funds: 2 },
        effects: { economy: 1 },
        condition: "trustAtLeast55",
      },
      once: true,
      conditionText: "需要第5天后，资金≥18，且物资≤60或活力≤62。",
      condition(state) {
        return state.day >= 5
          && state.resources.funds >= 18
          && (state.metrics.supplies <= 60 || state.metrics.economy <= 62);
      },
    },
    hardWarehouse: {
      label: "硬性征用仓储",
      description: "临时征用仓储与冷链空间，快速补上库存。物资会稳定，但信任和公共创伤要付账。",
      resources: { funds: -4 },
      effects: { supplies: 14, trust: -8 },
      hidden: { publicMemory: 3 },
      once: true,
      conditionText: "需要物资供应<35，或管控强度>60。",
      condition(state) {
        return state.metrics.supplies < 35 || state.hidden.policyStrictness > 60;
      },
    },
    suppressRumorLine: {
      label: "统一口径压制谣言",
      description: "用强口径压住扩散消息。能短期压低感染风险，但发现率和信任都会变差。",
      resources: {},
      effects: { trust: -6, infection: -2 },
      hidden: { detectedRate: -3, policyStrictness: 5 },
      once: true,
      conditionText: "需要市民信任≥45、公共创伤≤40，且感染≥60或信任≤55。",
      condition(state) {
        return state.metrics.trust >= 45
          && state.hidden.publicMemory <= 40
          && (state.metrics.infection >= 60 || state.metrics.trust <= 55);
      },
    },
    delayBadNews: {
      label: "延迟公布坏消息",
      description: "暂缓公布复核中的坏消息，争取三天处置窗口。若医疗仍在高位，反噬会更重。",
      resources: {},
      effects: { trust: 4 },
      hidden: { publicMemory: 4, detectedRate: -5 },
      delayed: {
        delay: 3,
        label: "坏消息反噬",
        effects: { trust: -8 },
        hidden: { publicMemory: 2 },
        condition: "hospitalAtLeast80",
      },
      once: true,
      conditionText: "需要医疗负载≥65，或公共创伤≥25。",
      condition(state) {
        return state.metrics.hospitalLoad >= 65 || state.hidden.publicMemory >= 25;
      },
    },
    enterpriseExemption: {
      label: "企业定向豁免",
      description: "给关键企业定向通勤豁免，换取产能和税源恢复。只在活力或资金承压时值得冒险；名单公平性会损伤信任。",
      resources: { funds: 5 },
      effects: { economy: 8, infection: 4, trust: -6 },
      hidden: {},
      once: true,
      conditionText: "需要发现率≥60、感染压力<65，且城市活力≤55或资金≤25。",
      condition(state) {
        return state.hidden.detectedRate >= 60
          && state.metrics.infection < 65
          && (state.metrics.economy <= 55 || state.resources.funds <= 25);
      },
    },
    communityAutonomy: {
      label: "社区自治包干",
      description: "把部分任务交给小区自组织承接。基层疲劳下降，但标准不一会损伤信任和库存。",
      resources: {},
      effects: { staffFatigue: -7, trust: -8, supplies: -4 },
      hidden: { publicMemory: 2 },
      once: true,
      conditionText: "需要基层疲劳≥70。",
      condition(state) {
        return state.metrics.staffFatigue >= 70;
      },
    },
    emergencyLevy: {
      label: "财政紧急摊派",
      description: "向恢复期预算和社会协作账户紧急摊派资金。能救资金红线，但社会代价很明显。",
      resources: { funds: 18 },
      effects: { trust: -10, economy: -3 },
      hidden: { publicMemory: 3 },
      once: true,
      conditionText: "需要应急资金≤15。",
      condition(state) {
        return state.resources.funds <= 15;
      },
    },
    specialBondQuota: {
      label: "专项债转应急额度",
      description: "把恢复期专项债额度临时转入应急账本。它能立刻补足大工程缺口，但会压缩后续恢复空间并损伤信任。",
      resources: { funds: 16 },
      effects: { economy: -6, trust: -4 },
      hidden: { publicMemory: 2 },
      once: true,
      conditionText: "需要应急资金≤20，且城市活力≥35。",
      condition(state) {
        return state.resources.funds <= 20 && state.metrics.economy >= 35;
      },
    },
    deferProjectPayment: {
      label: "延期支付工程款",
      description: "把非急迫工程和采购尾款延后支付，给医疗、保供和检测留下现金。它是明显的信用透支，会损伤供应商信任并在数日后回到财政账本。",
      resources: { funds: 10 },
      effects: { trust: -5, supplies: -2, economy: -1 },
      hidden: { publicMemory: 2 },
      delayed: {
        delay: 4,
        label: "延期工程款到期",
        resources: { funds: -5 },
        effects: { trust: -2 },
      },
      once: true,
      conditionText: "需要资金≤20，且公共创伤≤55。",
      condition(state) {
        return state.resources.funds <= 20 && state.hidden.publicMemory <= 55;
      },
    },
    jobSubsidyAdvance: {
      label: "稳岗补贴前置发放",
      description: "把恢复期稳岗补贴提前发给关键岗位和小微商户。能较早托住城市活力和信任，但会消耗现金流。",
      resources: { funds: -8 },
      effects: { economy: 7, trust: 3 },
      hidden: {},
      delayed: {
        delay: 4,
        label: "补贴缺口复核",
        resources: { funds: -3 },
        condition: "economyBelow40",
      },
      once: true,
      conditionText: "需要第12天后，城市活力≤55，且应急资金≥16。",
      condition(state) {
        return state.day >= 12 && state.metrics.economy <= 55 && state.resources.funds >= 16;
      },
    },
  };

  const ENDINGS = {
    medicalCollapse: {
      title: "医疗挤兑",
      tone: "failure",
      summary: "医院负载连续越过红线，转诊、急诊和普通治疗都无法稳定运转。城市没有在最关键的窗口前卸下压力。",
    },
    supplyCollapse: {
      title: "供应断裂",
      tone: "failure",
      summary: "物资供应长期低位，民生秩序先于疫情模型失稳。居民不再相信下一次配送会准时到来。",
    },
    trustCollapse: {
      title: "信任崩塌",
      tone: "failure",
      summary: "公开信息、政策执行和居民配合之间的链条断裂。之后的每一项措施都变得更重、更慢。",
    },
    staffCollapse: {
      title: "执行失灵",
      tone: "failure",
      summary: "基层与医护系统持续透支，任务还在增加，真正能执行的人却越来越少。",
    },
    hardWon: {
      title: "艰难守住",
      tone: "success",
      summary: "临江市在多条红线之间撑到了恢复窗口。没有胜利的欢呼，只有每个系统都还没有断裂的清晨。",
    },
    quietRecovery: {
      title: "低声恢复",
      tone: "success",
      summary: "城市恢复得缓慢但相对诚实。信任没有完全流失，很多人愿意相信下一次会做得更早一点。",
    },
    silentCost: {
      title: "静默代价",
      tone: "mixed",
      summary: "数字上看，城市逐步恢复；记忆里看，很多问题只是被压低了音量。",
    },
    winterScars: {
      title: "带伤过冬",
      tone: "mixed",
      summary: "临江市没有崩盘，但许多系统被迫以欠账的方式维持。接下来的恢复会比通报写得更久。",
    },
    surfaceRecovery: {
      title: "表面恢复",
      tone: "mixed",
      summary: "秩序回到了街面上，代价留在家庭、医院、社区和账本里。城市过关了，但没有真正轻松。",
    },
  };

  const SCORE_COMPONENTS = [
    { metric: "infection", source: "metrics", max: 17, label: "感染压力", advice: "更早用检测、分区管控和低传播窗口复工，避免感染把医疗拖上去。" },
    { metric: "hospitalLoad", source: "metrics", max: 17, label: "医疗负载", advice: "优先铺分级诊疗、社区门诊或方舱，不要等到医疗红线后才救急。" },
    { metric: "supplies", source: "metrics", max: 13, label: "物资供应", advice: "保供专线、捐助统筹和货运微循环要早于库存低位启动。" },
    { metric: "trust", source: "metrics", max: 17, label: "市民信任", advice: "公开复盘、补偿和可核验流程能让强政策不至于越用越钝。" },
    { metric: "economy", source: "metrics", max: 13, label: "城市活力", advice: "前期用远程办公、闭环小班和小微缓缴托住活力，不必只靠大复工。" },
    { metric: "staffFatigue", source: "metrics", max: 11, label: "基层疲劳", advice: "轮休、志愿者调度和压缩流程要穿插使用，连续强压会吞掉后期收益。" },
    { metric: "publicMemory", source: "hidden", max: 5, label: "公共创伤", advice: "减少强硬余波，利用公开复盘、药品直送和记忆修复类事件降创伤。" },
    { metric: "funds", source: "resources", max: 7, label: "应急资金", advice: "专项资金、社会捐助和账期谈判可以补现金流，但别让资金路线压垮信任。" },
  ];

  const NEXT_RUN_ROUTE_PLANS = {
    infection: {
      route: "监测治理 + 管控止血",
      detail: "下一局更早把发现率推上去，再用分区或短时管控压峰，避免感染把医疗一并拖穿。",
      examples: "扩大检测、健康码部署、分区管控、低传播窗口复工",
    },
    hospitalLoad: {
      route: "医疗优先",
      detail: "医疗失分高通常说明救急按钮用得太晚。下一局把分级诊疗和临时收治当作前置建设，而不是红线后补锅。",
      examples: "分级诊疗网络、社区临时门诊、方舱医院建设、收治标准",
    },
    supplies: {
      route: "民生保供",
      detail: "物资低位会同时拉低信任和基层效率。下一局在库存还没见底时就铺货运和保供节点。",
      examples: "保供专线、货运微循环、社会捐助统筹、药品直送",
    },
    trust: {
      route: "公开修复",
      detail: "信任失分高说明政策执行开始变钝。下一局多用可核验说明、公开账本和复盘把强措施的代价讲清楚。",
      examples: "信息公开、财政透明台账、公开阶段复盘、投诉复盘",
    },
    economy: {
      route: "恢复财政",
      detail: "活力失分高时，不必等到后期大复工。下一局用低风险、低流量的微循环先托住城市账本。",
      examples: "线上政务、税费社保缓缴、民生网点分时复业、闭环小班",
    },
    staffFatigue: {
      route: "基层减压",
      detail: "疲劳失分高会吞掉所有行动收益。下一局把轮休和流程压缩穿插在强政策之间，而不是连续加压。",
      examples: "心理与轮休热线、志愿者调度站、基层轮换令、压缩社区台账",
    },
    publicMemory: {
      route: "创伤修复",
      detail: "创伤高会改变结局质感。下一局减少强硬余波，并在阶段节点主动修复旧伤。",
      examples: "公开复盘、重点人群药品直送、悼念与记忆事件、互助路线",
    },
    funds: {
      route: "恢复财政",
      detail: "资金失分高会锁住工程。下一局更早铺财政恢复渠道，同时避免把所有现金流押在单一大型工程上。",
      examples: "专项资金申报、社会捐助统筹、采购账期谈判、小额账款清分",
    },
  };

  const TESTING_KEYS = ["expandTesting", "campusSentinel", "deployHealthCode", "triageNetwork", "communityClinic"];
  const CONTROL_KEYS = ["zoningControl", "citywideSilence", "suppressRumorLine", "deployHealthCode"];
  const SUPPLY_KEYS = ["supplyPriority", "supplyCorridor", "volunteerDispatch", "hardWarehouse", "elasticTransit", "outsourceDelivery", "publicDonationDrive", "donationCoordination", "donationClaimList", "platformLogisticsShare", "interProvinceSupport", "closedLoopSmallShift", "essentialServicePermit", "contactlessServiceRegistry", "contactlessLivelihoodStalls", "neighborhoodPickupWindow", "neighborhoodErrandRoster", "neighborhoodCommerceLedger", "nightFreightWindow", "microFreightPermit"];
  const MEDICAL_KEYS = ["medicalExpansion", "buildShelterHospital", "triageNetwork", "communityClinic", "shelterAdmissionStandard", "interProvinceSupport", "insurancePreSettlement"];
  const REST_KEYS = ["restPolicy", "mentalHealthLine", "staffRotationOrder", "communityAutonomy", "supportTeam", "compressAdmin", "forceSimplify"];
  const REOPEN_KEYS = ["reopenPilot", "lowRiskWorkList", "factoryClosedLoop", "elasticTransit", "enterpriseExemption", "livelihoodStaggeredReopen", "closedLoopSmallShift", "essentialServicePermit", "contactlessServiceRegistry", "contactlessLivelihoodStalls", "neighborhoodPickupWindow", "onlineVendorDesk", "neighborhoodErrandRoster", "neighborhoodCommerceLedger", "onlineGovOvertime", "remoteApprovalDesk", "microEnterpriseRoster", "communityRepairWhitelist", "essentialMaintenanceRoster", "remoteWorkGovServices", "serviceVoucherPilot", "nightFreightWindow", "jobSubsidyAdvance", "microFreightPermit", "rentDeferralCoordination", "taxFeeDeferralDesk", "platformLogisticsShare"];
  const VOLUNTEER_KEYS = ["volunteerDispatch", "mentalHealthLine", "supportTeam", "communityAutonomy", "interProvinceSupport"];
  const PUBLIC_REPAIR_KEYS = ["transparency", "publicReviewBrief"];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSeed() {
    return Math.floor((Date.now() % 2147483647) + Math.random() * 1000000);
  }

  function random(state) {
    state.seed = (state.seed * 48271) % 2147483647;
    return state.seed / 2147483647;
  }

  function phaseForDay(day) {
    return clamp(Math.ceil(day / PHASE_SIZE), 1, 6);
  }

  function getStageInfo(stateOrPhase) {
    const phase = typeof stateOrPhase === "number" ? stateOrPhase : stateOrPhase.phase;
    const info = STAGE_INFO.find((item) => item.phase === phase) || STAGE_INFO[0];
    if (typeof stateOrPhase === "number") return { ...info };
    const dayInPhase = ((stateOrPhase.day - 1) % PHASE_SIZE) + 1;
    return {
      ...info,
      dayInPhase,
      phaseProgress: Math.round((dayInPhase / PHASE_SIZE) * 100),
    };
  }

  function getStageObjectives(state, options = {}) {
    const includeFocusActions = Boolean(options.includeFocusActions);
    const phase = phaseForDay(state.day);
    const specs = STAGE_OBJECTIVES[phase] || [];
    return specs.map((spec) => {
      const value = getObjectiveValue(state, spec.metric);
      const meta = getObjectiveMeta(spec.metric);
      const done = spec.op === "<=" ? value <= spec.target : value >= spec.target;
      const danger = spec.op === "<="
        ? value > spec.target + 15
        : value < spec.target - 15;
      return {
        id: spec.id,
        label: spec.label,
        detail: spec.detail,
        metric: spec.metric,
        op: spec.op,
        metricLabel: meta.label,
        metricShort: meta.short,
        value,
        target: spec.target,
        targetText: `${meta.short} ${spec.op} ${spec.target}`,
        done,
        tone: done ? "good" : danger ? "danger" : "warn",
        focusAction: includeFocusActions && !done ? getStageObjectiveFocusAction(state, spec) : null,
      };
    });
  }

  function getStageObjectiveFocusAction(state, objective) {
    if (!state || state.ended || !objective) return null;
    const rows = [];
    MAP_POINTS.forEach((pointDef) => {
      const point = getMapPoint(state, pointDef.id);
      [
        { mode: "operations", kind: "工程", items: point.operations },
        { mode: "resolutions", kind: "决议", items: point.resolutions },
      ].forEach((group) => {
        group.items
          .filter((item) => item.available)
          .forEach((item) => {
            const preview = getCityActionOutcomePreview(state, group.mode, item.id);
            const impact = preview.find((entry) => entry.metric === objective.metric);
            if (!impact) return;
            const improvement = objective.op === "<=" ? -impact.delta : impact.delta;
            if (improvement <= 0) return;
            rows.push({
              id: item.id,
              mode: group.mode,
              kind: group.kind,
              label: item.label,
              pointId: pointDef.id,
              pointLabel: pointDef.label,
              impact: `${impact.short} ${impact.delta > 0 ? "+" : ""}${impact.delta}`,
              detail: `推进阶段目标“${objective.label}”：${impact.detail}`,
              score: improvement * 20 + (objective.tone === "danger" ? 30 : 0) + (group.mode === "operations" ? 3 : 0),
            });
          });
      });
    });
    return rows
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .map(({ score, ...item }) => item)[0] || null;
  }

  function getStageReview(state) {
    if (!state) return null;
    const phase = phaseForDay(state.day);
    const info = getStageInfo(phase);
    const objectives = getStageObjectives(state);
    const completed = objectives.filter((objective) => objective.done).length;
    const dangerCount = objectives.filter((objective) => objective.tone === "danger").length;
    const reward = getStageMomentumReward(state, objectives);
    const tone = dangerCount
      ? "danger"
      : completed === objectives.length
        ? "good"
        : "warn";
    const verdict = tone === "good"
      ? "阶段目标完成良好，城市进入下一阶段时保留了较多调度余地。"
      : tone === "danger"
        ? "阶段目标留下明显缺口，下一阶段会更容易被红线和资源锁定拖住。"
        : "阶段目标部分完成，下一阶段仍需要围绕短板安排主动行动。";
    const weaknesses = buildStageWeaknesses(state, objectives);
    const nextPhase = phase < STAGE_INFO.length ? getStageInfo(phase + 1) : null;
    const nextObjectives = nextPhase
      ? (STAGE_OBJECTIVES[nextPhase.phase] || []).slice(0, 3).map((spec) => {
        const meta = getObjectiveMeta(spec.metric);
        return {
          id: spec.id,
          label: spec.label,
          targetText: `${meta.short} ${spec.op} ${spec.target}`,
          detail: spec.detail,
        };
      })
      : [];
    const detail = nextPhase
      ? `下一阶段「${nextPhase.name}」重点：${nextPhase.focus}`
      : "这是最后一次阶段复盘，结局会同时读取疫情、医疗、信任、活力、疲劳、资金和公共创伤。";

    return {
      phase,
      title: `${info.name}复盘`,
      tone,
      completed,
      total: objectives.length,
      summary: `阶段目标 ${completed}/${objectives.length} 达成。${verdict}`,
      detail,
      reward,
      objectives: objectives.map((objective) => ({
        id: objective.id,
        label: objective.label,
        metricShort: objective.metricShort,
        value: objective.value,
        targetText: objective.targetText,
        done: objective.done,
        tone: objective.tone,
      })),
      weaknesses,
      nextPhase: nextPhase ? {
        phase: nextPhase.phase,
        name: nextPhase.name,
        focus: nextPhase.focus,
        objectives: nextObjectives,
      } : null,
    };
  }

  function getStageMomentumReward(state, objectives = getStageObjectives(state)) {
    const completed = objectives.filter((objective) => objective.done).length;
    const total = objectives.length || 0;
    if (completed >= 3) {
      return {
        available: true,
        tone: "good",
        label: "阶段余裕充足",
        detail: `阶段目标 ${completed}/${total} 达成，可把调度余裕转成下一阶段小额周转和轻度执行缓冲。`,
        resources: { funds: 3 },
        effects: { trust: 1, economy: 1, staffFatigue: -1 },
        hidden: {},
      };
    }
    if (completed >= 2) {
      return {
        available: true,
        tone: "good",
        label: "阶段余裕可用",
        detail: `阶段目标 ${completed}/${total} 达成，可兑现一笔小额周转，帮助下一阶段少一点卡手。`,
        resources: { funds: 2 },
        effects: { staffFatigue: -1 },
        hidden: {},
      };
    }
    return {
      available: false,
      tone: completed ? "warn" : "danger",
      label: "阶段余裕不足",
      detail: `阶段目标 ${completed}/${total} 达成，复盘会只提供补救选择，不会额外生成奖励性余裕。`,
      resources: {},
      effects: {},
      hidden: {},
    };
  }

  function buildStageWeaknesses(state, objectives) {
    const rows = objectives
      .filter((objective) => !objective.done)
      .map((objective) => {
        const rawGap = objective.targetText.includes("<=")
          ? objective.value - objective.target
          : objective.target - objective.value;
        return {
          id: objective.id,
          tone: objective.tone,
          label: objective.label,
          detail: `${objective.metricShort} ${objective.value}，目标 ${objective.targetText}。${objective.detail}`,
          score: (objective.tone === "danger" ? 70 : 45) + Math.max(0, rawGap),
        };
      });

    const streaks = state.flags.failureStreaks || {};
    [
      { id: "medical_streak", streak: streaks.medical || 0, label: "医疗红线倒计时", detail: "医疗负载已经进入失败倒计时，优先寻找分流、方舱或诊疗网络。" },
      { id: "supply_streak", streak: streaks.supply || 0, label: "供应断裂倒计时", detail: "物资低位已经进入失败倒计时，保供和药品通道需要优先处理。" },
      { id: "trust_streak", streak: streaks.trust || 0, label: "信任崩塌倒计时", detail: "低信任已经进入失败倒计时，公开修复和可核验流程需要补位。" },
      { id: "staff_streak", streak: streaks.staff || 0, label: "执行失灵倒计时", detail: "基层疲劳已经进入失败倒计时，轮休、减压和简化流程必须进入日程。" },
    ].forEach((item) => {
      if (!item.streak) return;
      rows.push({
        id: item.id,
        tone: "danger",
        label: `${item.label} ${item.streak}/${getFailureLimit(state)}`,
        detail: item.detail,
        score: 95 + item.streak * 8,
      });
    });

    if (state.resources.funds <= 18) {
      rows.push({
        id: "funds_low_review",
        tone: "warn",
        label: "应急资金偏低",
        detail: `资金 ${state.resources.funds}，下一阶段高价工程会更容易被锁定。`,
        score: 62 - state.resources.funds,
      });
    }

    if (state.hidden.publicMemory >= 45) {
      rows.push({
        id: "memory_high_review",
        tone: "warn",
        label: "公共创伤偏高",
        detail: `创伤 ${state.hidden.publicMemory}，结局会更难进入轻盈恢复。`,
        score: state.hidden.publicMemory,
      });
    }

    return rows
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score, ...item }) => item);
  }

  function getStageSchedule(state) {
    if (!state) return [];
    ensureEventScheduleFlags(state);
    const phase = phaseForDay(state.day);
    const stageStart = (phase - 1) * PHASE_SIZE + 1;
    const stageEnd = phase * PHASE_SIZE;
    const seen = new Set(state.flags.seenEventIds || []);
    const missed = new Set((state.flags.missedScheduledEvents || []).map((item) => item.key));
    return SCHEDULED_EVENTS
      .filter((schedule) => schedule.day >= stageStart && schedule.day <= stageEnd)
      .sort((a, b) => a.day - b.day || (b.priority || 0) - (a.priority || 0))
      .map((schedule) => {
        const event = EVENTS.find((item) => item.id === schedule.eventId);
        const key = `${schedule.day}:${schedule.eventId}`;
        const isCurrent = state.currentEventId === schedule.eventId && schedule.day === state.day;
        const isSeen = seen.has(schedule.eventId);
        const isMissed = missed.has(key) || (!isSeen && schedule.day < state.day);
        const conditionOk = scheduledConditionMet(state, schedule.condition);
        const conditionHint = scheduledConditionHint(state, schedule.condition, conditionOk);
        const focusAction = getScheduledEventFocusAction(state, schedule);
        let tone = "upcoming";
        let status = schedule.day === state.day ? "今日" : `第${schedule.day}天`;
        if (isCurrent) {
          tone = "today";
          status = "今日处理";
        } else if (isSeen) {
          tone = "done";
          status = "已发生";
        } else if (isMissed) {
          tone = "missed";
          status = "未触发";
        } else if (schedule.day === state.day && conditionOk) {
          tone = "today";
          status = "今日可触发";
        } else if (!conditionOk && schedule.condition !== "always") {
          tone = "conditional";
          status = "条件观察";
        }
        return {
          id: schedule.eventId,
          day: schedule.day,
          title: event ? event.title : schedule.eventId,
          reason: schedule.reason,
          status,
          tone,
          relative: schedule.day === state.day
            ? "今天"
            : schedule.day > state.day
              ? `还有${schedule.day - state.day}天`
              : `${state.day - schedule.day}天前`,
          conditionMet: conditionOk,
          conditionLabel: conditionHint.label,
          conditionDetail: conditionHint.detail,
          conditionTone: conditionHint.tone,
          focusAction,
        };
      });
  }

  function getScheduledEventFocusAction(state, schedule) {
    if (!state || !schedule) return null;
    const candidates = [
      ...(SCHEDULE_EVENT_FOCUS_CANDIDATES[schedule.eventId] || []),
      ...(SCHEDULE_CONDITION_FOCUS_CANDIDATES[schedule.condition] || []),
    ];
    const rows = candidates
      .map(([mode, actionId]) => {
        const status = mode === "resolutions"
          ? getResolutionStatus(state, actionId)
          : getOperationStatus(state, actionId);
        if (!status) return null;
        const established = status.lockedReason === "次数已用完" || status.lockedReason === "已通过";
        return {
          mode,
          status,
          established,
        };
      })
      .filter(Boolean);
    const selected = rows.find((row) => row.status.available)
      || rows.find((row) => !row.established)
      || rows[0];
    if (!selected) return null;
    const pointId = mapPointIdForAction(selected.mode, selected.status.id, selected.status.location);
    const point = getMapPoint(state, pointId);
    const detail = selected.status.available
      ? selected.status.description
      : selected.status.lockedDetail || selected.status.lockedReason || selected.status.description;
    const statusLabel = selected.status.available
      ? "可准备"
      : selected.established
        ? "已铺垫"
        : unlockPreviewLabel(selected.status.lockedReason);
    return {
      id: selected.status.id,
      mode: selected.mode,
      pointId,
      pointLabel: point ? point.label : "",
      label: selected.status.label,
      status: statusLabel,
      detail,
      available: Boolean(selected.status.available),
      established: selected.established,
    };
  }

  function scheduledConditionHint(state, condition, conditionOk = scheduledConditionMet(state, condition)) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const operationUses = state.flags.operationUses || {};
    const resolutions = state.flags.resolutions || {};
    const actionUses = state.flags.actionUses || {};
    const noMedicalInfrastructure = !state.completedProjects.shelterHospital
      && !state.completedProjects.triageNetwork
      && !state.completedProjects.communityClinic;
    const tone = conditionOk ? "ready" : "waiting";
    const line = (label, detail) => ({ label, detail, tone });
    if (!condition || condition === "always") return line("固定节点", "按日程必定出现。");
    if (condition === "feverNightPressure") return line("门诊压力", `感染≥25或发现<45；当前感染${m.infection}、发现${h.detectedRate}。`);
    if (condition === "labSupportWindow") return line("外部实验室", `发现≤60或感染≥30；当前发现${h.detectedRate}、感染${m.infection}。`);
    if (condition === "protectiveDonationNeed") return line("防护缺口", `物资≤70或医疗≥35；当前物资${m.supplies}、医疗${m.hospitalLoad}。`);
    if (condition === "warehouseDisputePressure") return line("仓储争议", `物资≤55或信任≤55；当前物资${m.supplies}、信任${m.trust}。`);
    if (condition === "medicalTeamNeed") return line("支援需求", `医疗≥45或疲劳≥45；当前医疗${m.hospitalLoad}、疲劳${m.staffFatigue}。`);
    if (condition === "shelterNeed") return line("方舱窗口", `医疗≥50或感染≥45；当前医疗${m.hospitalLoad}、感染${m.infection}。`);
    if (condition === "transferNeed") return line("转运压力", `感染≥55或医疗≥60；当前感染${m.infection}、医疗${m.hospitalLoad}。`);
    if (condition === "plasmaResearchWindow") return line("救治探索", `医疗≥45或感染≥40；当前医疗${m.hospitalLoad}、感染${m.infection}。`);
    if (condition === "dischargeDebateWindow") return line("出舱争论", `医疗≤70且发现≥45；当前医疗${m.hospitalLoad}、发现${h.detectedRate}。`);
    if (condition === "psychSupportNeed") return line("心理援助", `疲劳≥50、创伤≥25或信任≤60；当前疲劳${m.staffFatigue}、创伤${h.publicMemory}、信任${m.trust}。`);
    if (condition === "healthCodeRisk") return line("健康码风险", `发现≥55或健康码已部署；当前发现${h.detectedRate}${state.completedProjects.healthCode ? "、已部署" : ""}。`);
    if (condition === "onlineConsultNeed") {
      return line("线上分流", `${noMedicalInfrastructure ? "未铺医疗工程时医疗≥40或感染≥35" : "有医疗工程时医疗≥72，或感染≥70且医疗≥58"}；当前医疗${m.hospitalLoad}、感染${m.infection}。`);
    }
    if (condition === "enterpriseWhiteListPressure") return line("白名单压力", `活力≤60或资金≤35；当前活力${m.economy}、资金${r.funds}。`);
    if (condition === "silentControlWindow") return line("静默窗口", `感染≥45；当前感染${m.infection}。`);
    if (condition === "massTestingNeed") return line("全员检测", `感染≥50或发现≤65；当前感染${m.infection}、发现${h.detectedRate}。`);
    if (condition === "vegetableConvoyNeed") return line("外部保供", `物资≤70或管控≥50；当前物资${m.supplies}、管控${h.policyStrictness}。`);
    if (condition === "groupBuyPressure") return line("团购压力", `物资≤60或管控≥60；当前物资${m.supplies}、管控${h.policyStrictness}。`);
    if (condition === "groupBuyOrderNeed") return line("订货表窗口", `物资≤65或疲劳≥55；当前物资${m.supplies}、疲劳${m.staffFatigue}。`);
    if (condition === "dataDelayPressure") return line("数据发布", `信任≤60、创伤≥30或医疗≥65；当前信任${m.trust}、创伤${h.publicMemory}、医疗${m.hospitalLoad}。`);
    if (condition === "feverMedicinePressure") return line("药品压力", `感染≥45或医疗≥55；当前感染${m.infection}、医疗${m.hospitalLoad}。`);
    if (condition === "procurementAuditPressure") {
      const usedLargeProject = state.completedProjects.shelterHospital
        || state.completedProjects.supplyCorridor
        || (operationUses.buildShelterHospital || 0) > 0
        || (operationUses.supplyCorridor || 0) > 0
        || (actionUses.outsourceDelivery || 0) > 0
        || Boolean(resolutions.hardWarehouse)
        || Boolean(resolutions.emergencyLevy);
      return line("采购审计", `资金≤45或有大额工程/征用记录；当前资金${r.funds}${usedLargeProject ? "、已有审计对象" : ""}。`);
    }
    if (condition === "recoveryGrantNeed") return line("恢复补助", `活力≤70或资金≤65；当前活力${m.economy}、资金${r.funds}。`);
    if (condition === "memorialPressure") return line("公共记忆", `创伤≥35、医疗≥75或医疗曾越线；当前创伤${h.publicMemory}、医疗${m.hospitalLoad}。`);
    return line("条件观察", "查看当前指标是否接近该公共节点的触发窗口。");
  }

  function getStageTransitionBrief(state) {
    if (!state || state.ended) return null;
    const info = getStageInfo(state);
    const dayInPhase = info.dayInPhase || 1;
    if (dayInPhase > 2) return null;
    const previous = info.phase > 1 ? getStageInfo(info.phase - 1) : null;
    const objectives = getStageObjectives(state).slice(0, 3);
    const phasePressure = PHASE_PRESSURE[info.phase - 1] || 1;
    const tone = phasePressure >= 4
      ? "danger"
      : phasePressure >= 3
        ? "warn"
        : "info";
    return {
      id: `stage_transition_${info.phase}`,
      phase: info.phase,
      dayInPhase,
      title: info.phase === 1 ? "开局阶段简报" : `进入${info.name}`,
      subtitle: previous ? `从“${previous.name}”转入“${info.name}”` : info.days,
      tone,
      pressureLabel: `阶段压力 +${phasePressure}`,
      focus: info.focus,
      situation: info.situation,
      objectiveText: objectives.map((item) => `${item.label}：${item.targetText}`).join(" / "),
      objectives,
      challenges: info.challenges || [],
    };
  }

  function getObjectiveValue(state, metric) {
    if (CORE_METRICS.includes(metric)) return state.metrics[metric];
    if (HIDDEN_METRICS.includes(metric)) return state.hidden[metric];
    if (RESOURCE_METRICS.includes(metric)) return state.resources[metric];
    return 0;
  }

  function getObjectiveMeta(metric) {
    return METRIC_META[metric] || RESOURCE_META[metric] || {
      label: metric,
      short: metric,
    };
  }

  function boundedMetricValue(metric, value) {
    if (CORE_METRICS.includes(metric) || HIDDEN_METRICS.includes(metric)) {
      return clamp(Math.round(value), 0, 100);
    }
    if (RESOURCE_METRICS.includes(metric)) {
      return clamp(Math.round(value), 0, 100);
    }
    return Math.round(value);
  }

  function buildOpeningValues(difficultyId = "normal", scenarioId = "standard") {
    const difficulty = difficultyId && DIFFICULTIES[difficultyId] ? difficultyId : "normal";
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const scenario = scenarioId && SCENARIOS[scenarioId] ? scenarioId : "standard";
    const scenarioDef = SCENARIOS[scenario] || SCENARIOS.standard;
    const all = { ...INITIAL_VALUES };
    Object.entries(diff.adjustments).forEach(([metric, delta]) => {
      all[metric] = boundedMetricValue(metric, all[metric] + delta);
    });
    Object.entries(scenarioDef.adjustments).forEach(([metric, delta]) => {
      all[metric] = boundedMetricValue(metric, all[metric] + delta);
    });
    return { all, difficulty, diff, scenario, scenarioDef };
  }

  function getScenarioBriefing(options = {}) {
    const opening = buildOpeningValues(options.difficulty || "normal", options.scenario || "standard");
    const baseline = buildOpeningValues(opening.difficulty, "standard");
    const changes = {};
    Object.keys(opening.all).forEach((metric) => {
      const delta = opening.all[metric] - baseline.all[metric];
      if (delta) changes[metric] = delta;
    });
    const readoutKeys = ["infection", "hospitalLoad", "supplies", "trust", "economy", "staffFatigue", "detectedRate", "funds"];
    return {
      id: opening.scenario,
      label: opening.scenarioDef.label,
      summary: opening.scenarioDef.summary,
      difficulty: opening.difficulty,
      difficultyLabel: opening.diff.label,
      changes,
      priorities: opening.scenarioDef.priorities || [],
      readouts: readoutKeys.map((metric) => {
        const meta = getObjectiveMeta(metric);
        return {
          metric,
          label: meta.label,
          short: meta.short,
          value: opening.all[metric],
          tone: getRiskBand(metric, opening.all[metric]),
          description: meta.description,
        };
      }),
    };
  }

  function createGame(options = {}) {
    const opening = buildOpeningValues(options.difficulty || "normal", options.scenario || "standard");
    const { all, difficulty, scenario } = opening;

    const state = {
      version: 2,
      difficulty,
      scenario,
      seed: options.seed || createSeed(),
      day: 1,
      phase: 1,
      metrics: Object.fromEntries(CORE_METRICS.map((key) => [key, all[key]])),
      hidden: Object.fromEntries(HIDDEN_METRICS.map((key) => [key, all[key]])),
      resources: Object.fromEntries(RESOURCE_METRICS.map((key) => [key, all[key]])),
      pendingEffects: [],
      history: [],
      alerts: [],
      news: [],
      statusEffects: [],
      selectedMapPointId: "hospital",
      completedProjects: {},
      flags: {
        silenceUses: 0,
        actionUses: {},
        lastEventIds: [],
        seenEventIds: [],
        missedScheduledEvents: [],
        operationUses: {},
        resolutions: {},
        cityActionsToday: 0,
        cityActionUndo: null,
        earnedBadgeIds: [],
        failureStreaks: {
          medical: 0,
          supply: 0,
          trust: 0,
          staff: 0,
        },
      },
      currentEventId: null,
      ended: false,
      ending: null,
      score: null,
    };

    state.news = generateNews(state);
    refreshStatusEffects(state);
    chooseNextEvent(state);
    return state;
  }

  function exportState(state) {
    return clone(state);
  }

  function importState(raw) {
    if (!raw || (raw.version !== 1 && raw.version !== 2)) return createGame();
    const state = clone(raw);
    state.version = 2;
    state.scenario = state.scenario && SCENARIOS[state.scenario] ? state.scenario : "standard";
    state.resources = state.resources || { funds: INITIAL_VALUES.funds };
    state.news = state.news || generateNews(state);
    state.statusEffects = state.statusEffects || [];
    state.selectedMapPointId = state.selectedMapPointId || "hospital";
    state.completedProjects = state.completedProjects || {};
    state.flags = state.flags || {};
    state.flags.actionUses = state.flags.actionUses || {};
    state.flags.lastEventIds = state.flags.lastEventIds || [];
    state.flags.seenEventIds = state.flags.seenEventIds || [];
    state.flags.missedScheduledEvents = state.flags.missedScheduledEvents || [];
    state.flags.operationUses = state.flags.operationUses || {};
    state.flags.resolutions = state.flags.resolutions || {};
    state.flags.cityActionsToday = state.flags.cityActionsToday || 0;
    state.flags.cityActionUndo = validCityActionUndo(state, state.flags.cityActionUndo)
      ? state.flags.cityActionUndo
      : null;
    state.flags.earnedBadgeIds = Array.isArray(state.flags.earnedBadgeIds)
      ? state.flags.earnedBadgeIds
      : getEarnedCityBadgeRows(state).map((item) => item.id);
    state.flags.failureStreaks = state.flags.failureStreaks || {
      medical: 0,
      supply: 0,
      trust: 0,
      staff: 0,
    };
    refreshStatusEffects(state);
    return state;
  }

  function getVisibleMetrics(state) {
    const accuracy = clamp(state.hidden.detectedRate, 20, 95) / 100;
    const hiddenGap = Math.round((100 - state.hidden.detectedRate) / 8);
    const blindSpotPenalty = state.hidden.detectedRate <= 35 ? 2 : 0;
    const infectionOffset = Math.round(hiddenGap * (state.metrics.infection >= 50 ? 1 : 0.5)) + blindSpotPenalty;
    return {
      ...state.metrics,
      reportedInfection: clamp(Math.round(state.metrics.infection * accuracy + infectionOffset), 0, 100),
      detectedRate: state.hidden.detectedRate,
      policyStrictness: state.hidden.policyStrictness,
      publicMemory: state.hidden.publicMemory,
    };
  }

  function getMetricTrend(state, metric, span = 6) {
    if (!state || !metric) return null;
    const meta = getObjectiveMeta(metric);
    const current = getObjectiveValue(state, metric);
    const history = Array.isArray(state.history) ? state.history.slice(0, Math.max(1, span - 1)) : [];
    let cursor = current;
    const values = [current];
    history.forEach((entry) => {
      const delta = entry && entry.changes ? entry.changes[metric] || 0 : 0;
      cursor = boundedMetricValue(metric, cursor - delta);
      values.unshift(cursor);
    });
    const start = values[0];
    const end = values[values.length - 1];
    const delta = end - start;
    const tone = delta === 0
      ? "neutral"
      : isGoodDelta(metric, delta)
        ? "good"
        : isBadDelta(metric, delta)
          ? "bad"
          : "mixed";
    return {
      metric,
      label: meta.label,
      short: meta.short,
      values,
      delta,
      tone,
      summary: values.length > 1 ? `近${values.length - 1}次 ${delta > 0 ? "+" : ""}${delta}` : "暂无走势",
      detail: values.length > 1
        ? `${meta.label}近期走势：${start} → ${end}。${tone === "good" ? "方向有利" : tone === "bad" ? "正在承压" : tone === "mixed" ? "方向需权衡" : "基本持平"}。`
        : `${meta.label}还没有足够历史记录形成走势。`,
    };
  }

  function refreshStatusEffects(state) {
    state.statusEffects = getStatusEffects(state);
    return state.statusEffects;
  }

  function getStatusEffects(state) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const effects = [];
    const add = (id, label, tone, description) => {
      const target = statusEffectActionTarget(state, id);
      const targetText = target && target.actionLabel
        ? ` 应对入口：“${target.actionLabel}”。`
        : "";
      effects.push({ id, label, tone, description: `${description}${targetText}`, ...target });
    };

    if (m.infection >= 80) add("infectionHigh", "社区扩散", "danger", "医疗负载额外承压，检测和管控相关事件更容易出现。");
    if (m.infection <= 25) add("infectionLow", "低传播窗口", "good", "复工类行动的感染反弹代价降低。");
    if (m.hospitalLoad >= 85) add("hospitalHigh", "医疗红线", "danger", "信任与公共创伤持续恶化，医疗工程资金成本上升。");
    if (m.hospitalLoad <= 35) add("hospitalLow", "医疗余裕", "good", "轮休类行动造成的短期医疗代价降低。");
    if (m.supplies >= 75) add("suppliesHigh", "库存缓冲", "good", "高管控带来的信任损失降低，保供危机事件变少；库存过高时会出现少量周转损耗。");
    if (m.supplies <= 25) add("suppliesLow", "供应低位", "danger", "信任和基层疲劳持续受损，保供行动效率降低。");
    if (m.trust >= 75) add("trustHigh", "高配合", "good", "检测、管控和轮休类行动更顺；若危机仍在台面上，过高信任也会转化为更高期待。");
    if (m.trust <= 30) add("trustLow", "低配合", "danger", "行动效率下降，谣言和拒检类事件更容易出现。");
    if (m.economy >= 75) add("economyHigh", "财政余裕", "good", "每日资金和供应恢复更稳。");
    if (m.economy <= 25) add("economyLow", "财政吃紧", "danger", "每日资金受损，医疗和保供工程效果下降。");
    if (m.staffFatigue >= 80) add("fatigueHigh", "执行透支", "danger", "行动收益打折，发现率每天磨损。");
    if (m.staffFatigue >= 86) add("fatigueFuse", "执行熔断", "danger", "基层系统会自动降速减压，疲劳不再直线上冲，但医疗、供应、活力和信任会承受转移代价。");
    if (m.staffFatigue <= 35) add("fatigueLow", "执行余裕", "good", "检测、保供、医疗和志愿者类行动获得额外收益；任务仍重时，余裕会被日常工作重新消耗。");
    if (r.funds <= 10) add("fundsLow", "财政透支", "danger", "高价工程和决议被锁定，资金事件权重上升。");
    if (r.funds >= 80) add("fundsHigh", "储备充足", "good", "一次性大型工程资金成本降低。");
    if (h.detectedRate >= 80) add("detectedHigh", "监测清晰", "good", "复工反弹更可控，但高疲劳下监测会自然衰减。");
    if (h.detectedRate <= 35) add("detectedLow", "信息盲区", "danger", "报告感染误差增加，复工更容易低估风险。");
    if (h.policyStrictness >= 80) add("policyHigh", "高压管控", "danger", "感染压制增强，但疲劳和活力代价上升。");
    if (h.policyStrictness <= 15) add("policyLow", "流动恢复", "mixed", "活力自然恢复，但感染反弹压力增加。");
    if (h.publicMemory >= 60) add("memoryHigh", "长期伤痕", "danger", "信任持续流失，结局更容易走向沉重代价。");
    if (h.publicMemory <= 15) add("memoryLow", "叙事修复", "good", "公开类行动更容易获得信任收益。");

    return effects;
  }

  function getCrisisDashboard(state) {
    if (!state || state.ended) return [];
    const m = state.metrics;
    const streaks = state.flags.failureStreaks || {};
    const limit = getFailureLimit(state);
    const definitions = [
      {
        id: "medical",
        label: "医疗挤兑",
        metric: "hospitalLoad",
        value: m.hospitalLoad,
        dangerValue: m.hospitalLoad,
        warning: 85,
        thresholdText: "医疗负载≥95",
        streak: streaks.medical || 0,
        overLine: m.hospitalLoad >= 95,
        detail: "连续越线会进入医疗挤兑结局。",
        hint: "补救：医疗扩容、分级诊疗、方舱收治。",
        focusPointId: "hospital",
        focusMode: "operations",
        focusLabel: "定位医疗补救",
      },
      {
        id: "supply",
        label: "供应断裂",
        metric: "supplies",
        value: m.supplies,
        dangerValue: 100 - m.supplies,
        warning: 75,
        thresholdText: "物资供应<15",
        streak: streaks.supply || 0,
        overLine: m.supplies < 15,
        detail: "低物资会持续拖累信任和基层疲劳。",
        hint: "补救：保供专线、捐助统筹、仓储征用。",
        focusPointId: "market",
        focusMode: "operations",
        focusLabel: "定位保供节点",
      },
      {
        id: "trust",
        label: "信任崩塌",
        metric: "trust",
        value: m.trust,
        dangerValue: 100 - m.trust,
        warning: 70,
        thresholdText: "市民信任<20",
        streak: streaks.trust || 0,
        overLine: m.trust < 20,
        detail: "低信任会让政策执行变钝并触发失败倒计时。",
        hint: "补救：信息公开、阶段复盘、药品直送。",
        focusPointId: "residents",
        focusMode: "resolutions",
        focusLabel: "定位信任修复",
      },
      {
        id: "staff",
        label: "执行失灵",
        metric: "staffFatigue",
        value: m.staffFatigue,
        dangerValue: m.staffFatigue,
        warning: 80,
        thresholdText: "基层疲劳>90",
        streak: streaks.staff || 0,
        overLine: m.staffFatigue > 90,
        detail: "疲劳高位会削弱行动收益并磨损发现率。",
        hint: "补救：轮换令、心理热线、社区自治包干。",
        focusPointId: "volunteers",
        focusMode: "resolutions",
        focusLabel: "定位基层减压",
      },
    ];

    return definitions.map((item) => {
      const tone = item.overLine || item.streak > 0
        ? "danger"
        : item.dangerValue >= item.warning
          ? "warn"
          : "good";
      const effectiveStreak = item.overLine ? Math.max(1, item.streak) : item.streak;
      const remaining = Math.max(0, limit - effectiveStreak);
      const status = effectiveStreak > 0
        ? `${effectiveStreak}/${limit}`
        : tone === "warn"
          ? "接近红线"
          : "稳定";
      const clockText = effectiveStreak > 0
        ? `倒计时已启动，仍有 ${remaining} 天补救`
        : tone === "warn"
          ? "尚未进入失败倒计时，但已接近红线"
          : "当前不在失败倒计时内";
      const reliefActions = tone === "good" ? [] : collectCrisisReliefActions(state, item.id);
      const primaryRelief = reliefActions[0] || null;
      return {
        id: item.id,
        label: item.label,
        metric: item.metric,
        metricShort: METRIC_META[item.metric].short,
        value: item.value,
        tone,
        status,
        clockText,
        limit,
        remaining,
        progress: clamp(item.dangerValue, 0, 100),
        thresholdText: item.thresholdText,
        detail: item.detail,
        hint: item.hint,
        reliefActions,
        focusPointId: primaryRelief ? primaryRelief.pointId : item.focusPointId,
        focusMode: primaryRelief ? primaryRelief.mode : item.focusMode,
        focusActionId: primaryRelief ? primaryRelief.id : "",
        focusLabel: primaryRelief ? `定位：${primaryRelief.label}` : item.focusLabel,
      };
    });
  }

  function collectCrisisReliefActions(state, crisisId) {
    const candidates = [];
    const seen = new Set();
    MAP_POINTS.forEach((pointDef) => {
      const point = getMapPoint(state, pointDef.id);
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
            const score = crisisReliefScore(crisisId, item);
            if (score <= 0) return;
            candidates.push({
              id: item.id,
              label: item.label,
              kind: group.kind,
              mode: group.mode,
              pointId: point.id,
              pointLabel: point.label,
              effectText: crisisReliefText(crisisId, item),
              score,
            });
          });
      });
    });
    return candidates
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .slice(0, 3);
  }

  function crisisReliefScore(crisisId, item) {
    const effects = item.effects || {};
    const hidden = item.hidden || {};
    if (crisisId === "medical") {
      if ((effects.hospitalLoad || 0) >= 0) return 0;
      return -(effects.hospitalLoad || 0) * 10 + Math.max(0, hidden.detectedRate || 0);
    }
    if (crisisId === "supply") {
      if ((effects.supplies || 0) <= 0) return 0;
      return (effects.supplies || 0) * 10 + Math.max(0, effects.trust || 0);
    }
    if (crisisId === "trust") {
      const trustRepair = Math.max(0, effects.trust || 0) * 10 + Math.max(0, -(hidden.publicMemory || 0)) * 3;
      const memoryCost = Math.max(0, hidden.publicMemory || 0) * 4;
      const delayedTrustCost = Math.max(0, -((item.delayed && item.delayed.effects && item.delayed.effects.trust) || 0)) * 6;
      const detectionCost = Math.max(0, -(hidden.detectedRate || 0));
      return trustRepair - memoryCost - delayedTrustCost - detectionCost;
    }
    if (crisisId === "staff") {
      if ((effects.staffFatigue || 0) >= 0) return 0;
      return -(effects.staffFatigue || 0) * 10 + Math.max(0, effects.trust || 0);
    }
    return 0;
  }

  function crisisReliefText(crisisId, item) {
    const effects = item.effects || {};
    const hidden = item.hidden || {};
    const pick = (metric, delta, meta = METRIC_META[metric]) => `${meta.short} ${delta > 0 ? "+" : ""}${delta}`;
    if (crisisId === "medical" && effects.hospitalLoad) return pick("hospitalLoad", effects.hospitalLoad);
    if (crisisId === "supply" && effects.supplies) return pick("supplies", effects.supplies);
    if (crisisId === "trust" && effects.trust) return pick("trust", effects.trust);
    if (crisisId === "trust" && hidden.publicMemory) return pick("publicMemory", hidden.publicMemory);
    if (crisisId === "staff" && effects.staffFatigue) return pick("staffFatigue", effects.staffFatigue);
    return "可缓解";
  }

  function generateNews(state) {
    const weighted = NEWS_POOL.map((item) => ({
      item,
      weight: newsWeight(item, state),
    }));
    const selected = [];
    while (selected.length < 3 && weighted.length) {
      const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = random(state) * total;
      let index = 0;
      for (; index < weighted.length; index += 1) {
        roll -= weighted[index].weight;
        if (roll <= 0) break;
      }
      selected.push(weighted.splice(Math.min(index, weighted.length - 1), 1)[0].item);
    }
    return selected;
  }

  function newsWeight(item, state) {
    const m = state.metrics;
    let weight = 8;
    if (Array.isArray(item.phases) && item.phases.length) {
      weight += item.phases.includes(state.phase) ? 8 : -4;
    }
    if (item.tags.includes("medical")) weight += m.hospitalLoad >= 75 ? 8 : 1;
    if (item.tags.includes("supply")) weight += m.supplies < 35 ? 8 : m.supplies > 75 ? 1 : 3;
    if (item.tags.includes("trust")) weight += m.trust < 40 ? 6 : 2;
    if (item.tags.includes("economy")) weight += m.economy < 45 ? 7 : 2;
    if (item.tags.includes("fatigue")) weight += m.staffFatigue > 70 ? 7 : 2;
    if (item.tags.includes("infection")) weight += m.infection > 60 ? 6 : 2;
    if (item.tags.includes("funds")) weight += state.resources.funds <= 15 ? 10 : state.resources.funds < 35 ? 5 : 1;
    if (item.tags.includes("public")) weight += state.hidden.publicMemory > 35 ? 4 : 1;
    return Math.max(1, weight);
  }

  function getEventImage(event) {
    if (event && event.image) return event.image;
    if (event && event.imageKey && EVENT_IMAGE_BY_KEY[event.imageKey]) return EVENT_IMAGE_BY_KEY[event.imageKey];
    const tags = event && event.tags ? event.tags : [];
    if (tags.includes("medical")) return "news-hospital.png";
    if (tags.includes("supply")) return "news-supply.png";
    if (tags.includes("economy")) return "news-factory.png";
    if (tags.includes("funds")) return "news-factory.png";
    if (tags.includes("infection") || tags.includes("rumor")) return "news-health-code.png";
    if (tags.includes("fatigue") || tags.includes("public")) return "news-shelter.png";
    return "news-supply.png";
  }

  function getMapSignals(state) {
    if (!state || state.ended) return [];
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const rows = [];
    const add = (id, pointId, tone, label, detail, priority, extra = {}) => {
      const point = MAP_POINTS.find((item) => item.id === pointId);
      if (!point) return;
      const target = extra.target || null;
      const targetText = target && target.actionLabel ? ` 应对入口：“${target.actionLabel}”。` : "";
      rows.push({
        id,
        pointId,
        pointLabel: point.label,
        tone,
        label,
        detail: `${detail}${targetText}`,
        priority,
        status: extra.status || signalStatusText(tone),
        mode: target && target.mode ? target.mode : extra.mode || "",
        actionId: target && target.actionId ? target.actionId : "",
        actionLabel: target && target.actionLabel ? target.actionLabel : "",
        actionPointId: target && target.pointId ? target.pointId : "",
        actionPointLabel: target && target.pointLabel ? target.pointLabel : "",
      });
    };

    if (m.hospitalLoad >= 85) add("hospital_red", "hospital", "danger", "医疗红线", "中心医院负载已进入持续伤害信任和公共创伤的区间。", 110, { mode: "operations", target: pressureActionTargetDetail(state, MEDICAL_PRESSURE_TARGETS) });
    else if (m.hospitalLoad >= 70) add("hospital_warn", "hospital", "warn", "医疗高压", "医院、急诊、床位和转运需要尽快分流。", 88, { mode: "operations", target: pressureActionTargetDetail(state, MEDICAL_PRESSURE_TARGETS) });
    if (m.infection >= 80) add("infection_spread", "school", "danger", "社区扩散", "感染压力会额外推高医疗负载，监测或管控路线需要承担主压。", 104, { mode: "operations", target: pressureActionTargetDetail(state, DETECTION_PRESSURE_TARGETS) });
    else if (m.infection >= 65) add("infection_warn", "school", "warn", "传播高位", "传播压力已经抬头，复工和流动窗口要谨慎。", 78, { mode: "operations", target: pressureActionTargetDetail(state, DETECTION_PRESSURE_TARGETS) });
    if (m.supplies <= 25) add("supply_low", "market", "danger", "物资低位", "供应不足会同时伤害信任、疲劳和医疗效率。", 101, { mode: "operations", target: pressureActionTargetDetail(state, SUPPLY_PRESSURE_TARGETS) });
    else if (m.supplies <= 40) add("supply_warn", "market", "warn", "供应偏紧", "保供链条开始限制社区执行和医疗效率。", 74, { mode: "operations", target: pressureActionTargetDetail(state, SUPPLY_PRESSURE_TARGETS) });
    if (m.trust <= 30) add("trust_low", "residents", "danger", "低配合", "低信任会削弱行动效果，并提高谣言和拒检事件权重。", 99, { mode: "resolutions", target: pressureActionTargetDetail(state, TRUST_PRESSURE_TARGETS) });
    else if (m.trust <= 45) add("trust_warn", "residents", "warn", "信任承压", "居民配合开始变脆，公开修复和可核验流程更重要。", 72, { mode: "resolutions", target: pressureActionTargetDetail(state, TRUST_PRESSURE_TARGETS) });
    if (m.staffFatigue >= 80) add("fatigue_high", "volunteers", "danger", "执行透支", "疲劳高位会削弱所有行动收益，并磨损发现率。", 103, { mode: "resolutions", target: pressureActionTargetDetail(state, FATIGUE_PRESSURE_TARGETS) });
    else if (m.staffFatigue >= 65) add("fatigue_warn", "volunteers", "warn", "排班偏紧", "基层排班继续加压会让后续政策变钝。", 76, { mode: "resolutions", target: pressureActionTargetDetail(state, FATIGUE_PRESSURE_TARGETS) });
    if (m.economy <= 30) add("economy_low", "factory", "warn", "活力低位", "城市活力低位会拖慢供应恢复、资金回补和最终结局。", 70, { mode: "operations", target: pressureActionTargetDetail(state, ECONOMY_PRESSURE_TARGETS) });
    if (r.funds <= 20) add("funds_low", "factory", r.funds <= 10 ? "danger" : "warn", "资金吃紧", "应急资金不足会锁住高价工程和部分决议。", 92 - r.funds, { mode: "operations", target: pressureActionTargetDetail(state, FUNDS_PRESSURE_TARGETS) });
    if (h.detectedRate <= 35) add("detected_low", "road", "warn", "信息盲区", "发现率偏低会扩大报告误差，并提高复工反弹代价。", 73, { mode: "operations", target: pressureActionTargetDetail(state, DETECTION_PRESSURE_TARGETS) });
    if (h.policyStrictness >= 80) add("policy_high", "road", "warn", "高压管控", "感染压制增强，但活力和基层疲劳代价上升。", 69, { mode: "resolutions", target: pressureActionTargetDetail(state, POLICY_PRESSURE_TARGETS) });
    if (h.publicMemory >= 60) add("memory_high", "residents", "danger", "长期伤痕", "公共创伤已进入结局权重区，信任恢复会变慢。", 86, { mode: "resolutions", target: pressureActionTargetDetail(state, MEMORY_PRESSURE_TARGETS) });

    const opportunities = getCityActionOpportunities(state);
    (opportunities.items || []).slice(0, 2).forEach((item, index) => {
      add(
        `opportunity_${item.mode}_${item.id}`,
        item.pointId,
        item.tone === "good" ? "good" : "info",
        `可执行：${item.label}`,
        item.reason || item.detail,
        63 - index * 4,
        {
          mode: item.mode,
          status: item.status || "可执行",
          target: {
            actionId: item.id,
            mode: item.mode,
            pointId: item.pointId,
            pointLabel: item.pointLabel,
            actionLabel: item.label,
          },
        },
      );
    });

    const byPoint = new Map();
    rows
      .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .forEach((item) => {
        if (!byPoint.has(item.pointId)) byPoint.set(item.pointId, item);
      });

    return [...byPoint.values()]
      .sort((a, b) => b.priority - a.priority || a.pointLabel.localeCompare(b.pointLabel, "zh-Hans-CN"))
      .slice(0, 3)
      .map(({ priority, ...item }) => item);
  }

  function signalStatusText(tone) {
    if (tone === "danger") return "红线";
    if (tone === "warn") return "预警";
    if (tone === "good") return "机会";
    return "观察";
  }

  function getMapPoint(state, id) {
    const point = MAP_POINTS.find((item) => item.id === id) || MAP_POINTS[0];
    return {
      ...point,
      operations: (point.operations || []).map((operationId) => getOperationStatus(state, operationId)),
      resolutions: (point.resolutions || []).map((resolutionId) => getResolutionStatus(state, resolutionId)),
    };
  }

  function getMapPointStatus(state, pointId) {
    if (!state || !pointId) return null;
    if (pointId === "stadium") {
      const pendingShelter = (state.pendingEffects || []).find((item) => item.completeProject === "shelterHospital");
      if (state.completedProjects && state.completedProjects.shelterHospital) {
        return {
          label: "方舱状态",
          short: "方舱",
          value: "启用",
          tone: "good",
          detail: "方舱已启用，医疗分流能力进入长期资产。",
        };
      }
      if (pendingShelter) {
        const gap = Math.max(0, pendingShelter.dueDay - state.day);
        return {
          label: "方舱建设",
          short: "建设",
          value: gap <= 0 ? "今日" : `${gap}日`,
          tone: "warn",
          detail: "方舱建设排期中，到期后会形成医疗分流能力。",
        };
      }
      return buildMapMetricStatus(state, "hospitalLoad", "收治", "体育馆尚未启用，医疗负载越高越需要考虑临时收治空间。");
    }
    const metricByPoint = {
      hospital: ["hospitalLoad", "医疗", "医院负载决定医疗挤兑风险。"],
      market: ["supplies", "物资", "批发市场反映保供和库存缓冲。"],
      road: ["policyStrictness", "管控", "主干道反映通行管控强度。"],
      school: ["infection", "感染", "学校片区对传播窗口和复课风险敏感。"],
      factory: ["economy", "活力", "工业园反映城市活力和财政恢复基础。"],
      residents: ["trust", "信任", "居民楼院最直接反映配合和民生情绪。"],
      volunteers: ["staffFatigue", "疲劳", "志愿者集散点反映基层执行透支。"],
    };
    const spec = metricByPoint[pointId];
    if (!spec) return null;
    return buildMapMetricStatus(state, spec[0], spec[1], spec[2]);
  }

  function buildMapMetricStatus(state, metric, short, detail) {
    const value = getObjectiveValue(state, metric);
    const meta = getObjectiveMeta(metric);
    const trend = getMetricTrend(state, metric, 4);
    const trendDelta = trend && trend.values && trend.values.length > 1 && trend.delta !== 0 ? trend.delta : 0;
    return {
      metric,
      label: meta.label,
      short,
      value,
      tone: mapStatusTone(metric, value),
      detail: trendDelta ? `${detail} ${trend.detail}` : detail,
      trend: trendDelta ? {
        delta: trendDelta,
        tone: trend.tone,
        summary: signedDelta(trendDelta),
        detail: trend.detail,
      } : null,
    };
  }

  function mapStatusTone(metric, value) {
    if (metric === "policyStrictness") {
      if (value >= 80) return "danger";
      if (value <= 15) return "warn";
      if (value >= 35 && value <= 65) return "good";
      return "warn";
    }
    return getRiskBand(metric, value);
  }

  function selectMapPoint(state, id) {
    state.selectedMapPointId = id;
    return getMapPoint(state, id);
  }

  function resolveResources(state, item) {
    return typeof item.resources === "function" ? item.resources(state) : item.resources || {};
  }

  function resolveEffects(state, item) {
    return typeof item.effects === "function" ? item.effects(state) : item.effects || {};
  }

  function resolveHidden(state, item) {
    return typeof item.hidden === "function" ? item.hidden(state) : item.hidden || {};
  }

  function isFiscalLock(state, resources = {}) {
    return state.resources.funds <= 10 && (resources.funds || 0) <= -12;
  }

  function adjustedResourcesForItem(state, itemId, resources = {}) {
    const adjusted = { ...resources };
    if ((adjusted.funds || 0) <= -12 && state.resources.funds >= 80) adjusted.funds += 2;
    if ((adjusted.funds || 0) < 0 && state.metrics.hospitalLoad >= 85 && MEDICAL_KEYS.includes(itemId)) adjusted.funds -= 2;
    return removeZeroes(adjusted);
  }

  function adjustedEffectsForItem(state, itemId, effects = {}) {
    const adjusted = { ...effects };
    const lowEconomy = state.metrics.economy <= 25;
    const lowSupplies = state.metrics.supplies <= 25;
    const lowFatigue = state.metrics.staffFatigue <= 35;
    const lowHospital = state.metrics.hospitalLoad <= 35;
    const highDetected = state.hidden.detectedRate >= 80;
    const lowDetected = state.hidden.detectedRate <= 35;
    const lowInfection = state.metrics.infection <= 25;
    const lowMemory = state.hidden.publicMemory <= 15;

    if (lowEconomy && MEDICAL_KEYS.includes(itemId) && adjusted.hospitalLoad < 0) adjusted.hospitalLoad += 1;
    if (lowEconomy && SUPPLY_KEYS.includes(itemId) && adjusted.supplies > 0) adjusted.supplies -= 1;
    if (lowSupplies && SUPPLY_KEYS.includes(itemId) && adjusted.supplies > 0) adjusted.supplies -= 1;
    if (lowFatigue && MEDICAL_KEYS.includes(itemId) && adjusted.hospitalLoad < 0) adjusted.hospitalLoad -= 1;
    if (lowFatigue && SUPPLY_KEYS.includes(itemId) && adjusted.supplies > 0) adjusted.supplies += 1;
    if (lowFatigue && VOLUNTEER_KEYS.includes(itemId) && adjusted.staffFatigue < 0) adjusted.staffFatigue -= 1;
    if (lowHospital && REST_KEYS.includes(itemId) && adjusted.hospitalLoad > 0) adjusted.hospitalLoad -= 1;
    if (REOPEN_KEYS.includes(itemId) && adjusted.infection > 0) {
      if (highDetected || lowInfection) adjusted.infection -= 1;
      if (lowDetected) adjusted.infection += 1;
      adjusted.infection = Math.max(1, adjusted.infection);
    }
    if (lowMemory && PUBLIC_REPAIR_KEYS.includes(itemId) && adjusted.trust > 0) adjusted.trust += 1;
    return removeZeroes(adjusted);
  }

  function adjustedHiddenForItem(state, itemId, hidden = {}) {
    const adjusted = { ...hidden };
    if (state.metrics.staffFatigue <= 35 && TESTING_KEYS.includes(itemId) && adjusted.detectedRate > 0) adjusted.detectedRate += 1;
    return removeZeroes(adjusted);
  }

  function getOperationStatus(state, operationId) {
    const operation = OPERATIONS[operationId];
    const uses = state.flags.operationUses[operationId] || 0;
    const maxed = operation.maxUses && uses >= operation.maxUses;
    const conditionOk = operation.condition ? operation.condition(state) : true;
    const resources = adjustedResourcesForItem(state, operationId, resolveResources(state, operation));
    const affordable = canPay(state, resources);
    const fiscalLocked = isFiscalLock(state, resources);
    const dailyLimitReached = (state.flags.cityActionsToday || 0) >= CITY_ACTIONS_PER_DAY;
    let lockedReason = "";
    if (maxed) lockedReason = "次数已用完";
    else if (!conditionOk) lockedReason = "条件未满足";
    else if (dailyLimitReached) lockedReason = "今日调度已满";
    else if (fiscalLocked) lockedReason = "财政透支";
    else if (!affordable) lockedReason = "资金不足";
    const lockedDetail = !conditionOk
      ? resolveConditionText(state, operation.conditionText)
      : lockedReason;
    const effects = adjustedEffectsForItem(state, operationId, resolveEffects(state, operation));
    const hidden = adjustedHiddenForItem(state, operationId, resolveHidden(state, operation));
    return {
      id: operationId,
      ...operation,
      resources,
      effects,
      hidden,
      available: !maxed && conditionOk && !dailyLimitReached && !fiscalLocked && affordable,
      lockedReason,
      lockedDetail,
      uses,
    };
  }

  function getResolutionStatus(state, resolutionId) {
    const resolution = RESOLUTIONS[resolutionId];
    const used = Boolean(state.flags.resolutions[resolutionId]);
    const conditionOk = resolution.condition ? resolution.condition(state) : true;
    const resources = adjustedResourcesForItem(state, resolutionId, resolveResources(state, resolution));
    const affordable = canPay(state, resources);
    const fiscalLocked = isFiscalLock(state, resources);
    const dailyLimitReached = (state.flags.cityActionsToday || 0) >= CITY_ACTIONS_PER_DAY;
    let lockedReason = "";
    if (resolution.once && used) lockedReason = "已通过";
    else if (!conditionOk) lockedReason = "条件未满足";
    else if (dailyLimitReached) lockedReason = "今日调度已满";
    else if (fiscalLocked) lockedReason = "财政透支";
    else if (!affordable) lockedReason = "资金不足";
    const lockedDetail = lockedReason === "已通过"
      ? lockedReason
      : !conditionOk
      ? resolveConditionText(state, resolution.conditionText)
      : lockedReason;
    const effects = adjustedEffectsForItem(state, resolutionId, resolveEffects(state, resolution));
    const hidden = adjustedHiddenForItem(state, resolutionId, resolveHidden(state, resolution));
    return {
      id: resolutionId,
      ...resolution,
      resources,
      effects,
      hidden,
      available: !(resolution.once && used) && conditionOk && !dailyLimitReached && !fiscalLocked && affordable,
      lockedReason,
      lockedDetail,
      used,
    };
  }

  function resolveConditionText(state, conditionText) {
    if (typeof conditionText === "function") return conditionText(state);
    return conditionText || "当前城市状态还没有达到这项行动的触发条件。";
  }

  function getAvailableOperations(state) {
    return Object.keys(OPERATIONS).map((id) => getOperationStatus(state, id));
  }

  function getAvailableResolutions(state) {
    return Object.keys(RESOLUTIONS).map((id) => getResolutionStatus(state, id));
  }

  function isBufferDay(state) {
    return state.day % PHASE_SIZE === 0;
  }

  function chooseNextEvent(state) {
    if (state.ended) return null;
    ensureEventScheduleFlags(state);
    state.phase = phaseForDay(state.day);
    if (isBufferDay(state)) {
      state.currentEventId = `buffer_${state.phase}`;
      return getCurrentEvent(state);
    }

    const scheduled = getScheduledEventForToday(state);
    if (scheduled) {
      setCurrentEvent(state, scheduled.eventId);
      return getCurrentEvent(state);
    }

    const selected = chooseWeightedRandomEvent(state);
    if (selected) {
      setCurrentEvent(state, selected.id);
    } else {
      setFallbackEvent(state);
    }
    return getCurrentEvent(state);
  }

  function ensureEventScheduleFlags(state) {
    state.flags = state.flags || {};
    state.flags.lastEventIds = state.flags.lastEventIds || [];
    state.flags.seenEventIds = state.flags.seenEventIds || [];
    state.flags.missedScheduledEvents = state.flags.missedScheduledEvents || [];
  }

  function getScheduledEventForToday(state) {
    const todaysSchedule = SCHEDULED_EVENTS
      .filter((item) => item.day === state.day)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const schedule of todaysSchedule) {
      if (state.flags.seenEventIds.includes(schedule.eventId)) continue;
      if (scheduledConditionMet(state, schedule.condition)) return schedule;
      recordMissedScheduledEvent(state, schedule);
    }
    return null;
  }

  function recordMissedScheduledEvent(state, schedule) {
    const key = `${schedule.day}:${schedule.eventId}`;
    if (state.flags.missedScheduledEvents.some((item) => item.key === key)) return;
    state.flags.missedScheduledEvents = [
      {
        key,
        day: schedule.day,
        eventId: schedule.eventId,
        condition: schedule.condition,
        reason: schedule.reason,
      },
      ...state.flags.missedScheduledEvents,
    ].slice(0, 24);
  }

  function scheduledConditionMet(state, condition) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const actionUses = state.flags.actionUses || {};
    const operationUses = state.flags.operationUses || {};
    const resolutions = state.flags.resolutions || {};

    if (!condition || condition === "always") return true;
    if (condition === "feverNightPressure") return m.infection >= 25 || h.detectedRate < 45;
    if (condition === "labSupportWindow") return h.detectedRate <= 60 || m.infection >= 30;
    if (condition === "protectiveDonationNeed") return m.supplies <= 70 || m.hospitalLoad >= 35;
    if (condition === "warehouseDisputePressure") return m.supplies <= 55 || m.trust <= 55;
    if (condition === "medicalTeamNeed") return m.hospitalLoad >= 45 || m.staffFatigue >= 45;
    if (condition === "shelterNeed") return m.hospitalLoad >= 50 || m.infection >= 45;
    if (condition === "transferNeed") return m.infection >= 55 || m.hospitalLoad >= 60;
    if (condition === "plasmaResearchWindow") return m.hospitalLoad >= 45 || m.infection >= 40;
    if (condition === "dischargeDebateWindow") return m.hospitalLoad <= 70 && h.detectedRate >= 45;
    if (condition === "psychSupportNeed") return m.staffFatigue >= 50 || h.publicMemory >= 25 || m.trust <= 60;
    if (condition === "healthCodeRisk") return h.detectedRate >= 55 || Boolean(state.completedProjects.healthCode);
    if (condition === "onlineConsultNeed") {
      const noMedicalInfrastructure = !state.completedProjects.shelterHospital
        && !state.completedProjects.triageNetwork
        && !state.completedProjects.communityClinic;
      return (noMedicalInfrastructure && (m.hospitalLoad >= 40 || m.infection >= 35))
        || m.hospitalLoad >= 72
        || (m.infection >= 70 && m.hospitalLoad >= 58);
    }
    if (condition === "enterpriseWhiteListPressure") return m.economy <= 60 || r.funds <= 35;
    if (condition === "silentControlWindow") return m.infection >= 45;
    if (condition === "massTestingNeed") return m.infection >= 50 || h.detectedRate <= 65;
    if (condition === "vegetableConvoyNeed") return m.supplies <= 70 || h.policyStrictness >= 50;
    if (condition === "groupBuyPressure") return m.supplies <= 60 || h.policyStrictness >= 60;
    if (condition === "groupBuyOrderNeed") return m.supplies <= 65 || m.staffFatigue >= 55;
    if (condition === "dataDelayPressure") return m.trust <= 60 || h.publicMemory >= 30 || m.hospitalLoad >= 65;
    if (condition === "feverMedicinePressure") return m.infection >= 45 || m.hospitalLoad >= 55;
    if (condition === "procurementAuditPressure") {
      return r.funds <= 45
        || Boolean(state.completedProjects.shelterHospital)
        || Boolean(state.completedProjects.supplyCorridor)
        || (operationUses.buildShelterHospital || 0) > 0
        || (operationUses.supplyCorridor || 0) > 0
        || (actionUses.outsourceDelivery || 0) > 0
        || Boolean(resolutions.hardWarehouse)
        || Boolean(resolutions.emergencyLevy);
    }
    if (condition === "recoveryGrantNeed") return m.economy <= 70 || r.funds <= 65;
    if (condition === "memorialPressure") return h.publicMemory >= 35 || m.hospitalLoad >= 75 || ((state.flags.failureStreaks || {}).medical || 0) > 0;
    return false;
  }

  function chooseWeightedRandomEvent(state) {
    const allCandidates = EVENTS.filter((event) => (
      event.phase.includes(state.phase)
      && !SCHEDULED_EVENT_IDS.has(event.id)
    ));
    const candidates = allCandidates.filter((event) => !state.flags.seenEventIds.includes(event.id));
    if (!candidates.length) return null;
    const weighted = candidates.map((event) => ({
      event,
      weight: eventWeight(event, state),
    })).filter((entry) => entry.weight > 0);

    if (!weighted.length) return null;

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = random(state) * total;
    let selected = weighted[0].event;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        selected = entry.event;
        break;
      }
    }

    return selected;
  }

  function setFallbackEvent(state) {
    state.currentEventId = `fallback_${state.phase}_${state.day}`;
  }

  function setCurrentEvent(state, eventId) {
    state.currentEventId = eventId;
    if (String(eventId).startsWith("buffer_") || String(eventId).startsWith("fallback_")) return;
    state.flags.lastEventIds = [eventId, ...state.flags.lastEventIds.filter((id) => id !== eventId)].slice(0, 6);
    state.flags.seenEventIds = [eventId, ...state.flags.seenEventIds.filter((id) => id !== eventId)].slice(0, EVENTS.length);
  }

  function eventWeight(event, state) {
    const m = state.metrics;
    let weight = 10;
    if (state.flags.lastEventIds.includes(event.id)) weight *= 0.2;
    const strategyKeys = eventStrategyKeys(event);

    if (event.tags.includes("infection")) weight += m.infection >= 70 ? 8 : m.infection >= 50 ? 3 : 0;
    if (event.tags.includes("medical")) weight += m.hospitalLoad >= 75 ? 9 : m.hospitalLoad <= 45 ? -4 : 2;
    if (event.tags.includes("supply")) weight += m.supplies < 30 ? 10 : m.supplies > 70 ? -3 : 2;
    if (event.tags.includes("trust") || event.tags.includes("rumor")) {
      weight += m.trust < 25 ? 12 : m.trust < 40 ? 7 : m.trust > 70 ? -2 : 2;
    }
    if (event.tags.includes("economy")) weight += m.economy < 20 ? 12 : m.economy < 30 ? 7 : m.economy > 65 ? 2 : 0;
    if (event.tags.includes("fatigue")) weight += m.staffFatigue > 85 ? 12 : m.staffFatigue > 70 ? 7 : m.staffFatigue < 45 ? -1 : 2;
    if (event.tags.includes("funds")) weight += state.resources.funds <= 10 ? 14 : state.resources.funds < 25 ? 8 : 1;
    if (event.tags.includes("public")) weight += state.hidden.publicMemory > 55 ? 8 : state.hidden.publicMemory > 35 ? 4 : 1;
    if (m.infection >= 80 && strategyKeys.some((action) => TESTING_KEYS.includes(action) || CONTROL_KEYS.includes(action) || ["testing", "hard", "quietClose", "digital"].includes(action))) weight += 5;
    if (m.trust <= 30 && (event.tags.includes("rumor") || event.id.includes("refuse"))) weight += 5;

    return Math.max(1, weight);
  }

  function eventStrategyKeys(event) {
    if (event.actions) return event.actions;
    return (event.choices || []).map((choice) => choice.strategyKey || choice.profile || choice.id);
  }

  function getChoiceRouteTag(choice = {}) {
    const key = choice.strategyKey || choice.actionKey || choice.profile || choice.id || "";
    return ROUTE_TAGS[key] || { label: "综合调度", tone: "neutral" };
  }

  function getStrategyRouteForKey(key) {
    const tag = getChoiceRouteTag({ id: key });
    return STRATEGY_ROUTES.find((route) => route.labels.includes(tag.label)) || null;
  }

  function getStrategyProfile(state) {
    const routeMap = Object.fromEntries(STRATEGY_ROUTES.map((route) => [route.id, {
      id: route.id,
      label: route.label,
      tone: route.tone,
      advice: route.advice,
      count: 0,
      percent: 0,
    }]));
    const addRoute = (key, amount = 1) => {
      const route = getStrategyRouteForKey(key);
      if (!route || !routeMap[route.id] || amount <= 0) return;
      routeMap[route.id].count += amount;
    };

    Object.entries(state.flags.actionUses || {}).forEach(([key, count]) => addRoute(key, count));
    Object.entries(state.flags.operationUses || {}).forEach(([key, count]) => addRoute(key, count));
    Object.keys(state.flags.resolutions || {}).forEach((key) => {
      if (state.flags.resolutions[key]) addRoute(key, 1);
    });
    (state.history || []).forEach((entry) => {
      if (entry.routeSource === "eventChoice" || entry.routeSource === "buffer" || entry.routeSource === "fallback") {
        addRoute(entry.routeKey, 1);
      }
    });

    const routes = Object.values(routeMap)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));
    const total = routes.reduce((sum, route) => sum + route.count, 0);
    if (!total) {
      return {
        total: 0,
        tone: "info",
      label: "尚未成型",
      detail: "本局还没有形成稳定治理路线。处理几次事件或执行城市行动后，这里会显示你的策略倾向。",
      blindSpot: null,
      inertia: null,
      debts: [],
      recommendations: getStrategyRecommendations(state, null, null),
      recentMoves: [],
      routes: [],
    };
    }

    routes.forEach((route) => {
      route.percent = Math.round((route.count / total) * 100);
    });
    const activeRoutes = routes.filter((route) => route.count > 0).length;
    const dominant = routes[0];
    if (total < 3) {
      return {
        total,
        tone: "info",
        label: "路线试探",
        detail: `本局刚开始出现${dominant.label}倾向。再处理几次事件或城市行动后，路线结构会更稳定。`,
        blindSpot: getStrategyBlindSpot(state, routeMap),
        inertia: null,
        debts: getStrategyDebts(state, dominant, routeMap),
        recommendations: getStrategyRecommendations(state, getStrategyBlindSpot(state, routeMap), dominant),
        recentMoves: getRecentStrategyMoves(state),
        routes: routes.filter((route) => route.count > 0).slice(0, 5),
      };
    }
    const dominantHeavy = dominant.percent >= 55;
    const dominantLean = dominant.percent >= 40;
    const label = dominantHeavy
      ? `${dominant.label}过重`
      : dominantLean
        ? `${dominant.label}偏重`
        : "组合调度";
    const detail = dominantHeavy
      ? `${dominant.label}已经占到 ${dominant.percent}%，路线单一会让对应代价集中爆发。${dominant.advice}`
      : dominantLean
        ? `当前明显偏向${dominant.label}，仍有调整空间。${dominant.advice}`
        : `已动用 ${activeRoutes} 条路线，策略结构较分散；继续根据红线而不是惯性选择。`;
    const blindSpot = getStrategyBlindSpot(state, routeMap);

    return {
      total,
      tone: dominantHeavy && dominant.tone === "danger" ? "danger" : dominantHeavy ? "warn" : dominant.tone,
      label,
      detail,
      blindSpot,
      inertia: getStrategyInertia(dominant),
      debts: getStrategyDebts(state, dominant, routeMap),
      recommendations: getStrategyRecommendations(state, blindSpot, dominant),
      recentMoves: getRecentStrategyMoves(state),
      routes: routes.filter((route) => route.count > 0).slice(0, 5),
    };
  }

  function getRecentStrategyMoves(state, limit = 5) {
    return (state.history || [])
      .filter((entry) => entry && entry.routeLabel && entry.routeLabel !== "综合调度")
      .slice(0, Math.max(limit * 2, 6))
      .map((entry, index) => {
        const meta = getHistoryEntryMeta(entry);
        const impact = summarizeStrategyMoveImpact(entry.changes);
        return {
          id: `strategy_move_${entry.day || 0}_${index}`,
          day: entry.day || 0,
          sourceLabel: meta.sourceLabel || "记录",
          status: meta.status || "",
          routeLabel: entry.routeLabel || "综合路线",
          routeTone: entry.routeTone || "info",
          label: entry.choice || entry.title || "未命名决策",
          title: entry.title || meta.label || "历史记录",
          detail: impact ? `${entry.title || meta.label || "历史记录"}；${impact}` : (entry.title || meta.detail || "路线记录"),
          impact,
        };
      })
      .slice(0, limit);
  }

  function summarizeStrategyMoveImpact(changes = {}) {
    const rows = Object.entries(changes || {})
      .map(([metric, delta]) => {
        const meta = METRIC_META[metric] || RESOURCE_META[metric];
        if (!meta || !delta) return null;
        const good = isGoodDelta(metric, delta);
        const bad = isBadDelta(metric, delta);
        return {
          metric,
          delta,
          label: meta.short,
          tone: good ? "收益" : bad ? "代价" : "变化",
          score: Math.abs(delta) * (bad ? 3 : good ? 2 : 1),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || Math.abs(b.delta) - Math.abs(a.delta));
    if (!rows.length) return "";
    return rows
      .slice(0, 3)
      .map((item) => `${item.tone}${item.label} ${item.delta > 0 ? "+" : ""}${item.delta}`)
      .join(" / ");
  }

  function getStrategyInertia(dominant) {
    if (!dominant || dominant.count < 3 || dominant.percent < 45) return null;
    const complement = STRATEGY_COMPLEMENTS[dominant.id];
    if (!complement) return null;
    const tone = dominant.percent >= 60 || dominant.tone === "danger" ? "danger" : "warn";
    return {
      id: `inertia_${dominant.id}`,
      dominantId: dominant.id,
      tone,
      status: dominant.percent >= 60 ? "单一路线过载" : "路线惯性提醒",
      routeLabel: dominant.label,
      percent: dominant.percent,
      complementLabel: complement.label,
      detail: `${dominant.label}已占本局路线 ${dominant.percent}%。${complement.detail}`,
    };
  }

  function getStrategyDebts(state, dominant, routeMap) {
    if (!dominant || dominant.count <= 0) return [];
    const exposure = dominant.percent || 0;
    if (exposure < 35 && dominant.count < 3) return [];
    const rules = {
      control: [
        ["trust", "高压止血会消耗政策耐心，低信任会让后续管控变钝。"],
        ["economy", "流动被压得越久，供应恢复和财政回补越慢。"],
        ["staffFatigue", "强执行会把成本转给基层排班。"],
        ["publicMemory", "强硬处置会进入长期创伤账本。"],
      ],
      recovery: [
        ["infection", "恢复财政会带回流动，感染压力会先吃到反弹。"],
        ["detectedRate", "发现率不足时，复业收益容易掩盖真实传播。"],
        ["trust", "豁免、展期和财政周转会放大公平性质疑。"],
        ["staffFatigue", "恢复窗口需要额外核验和排班，基层会被牵动。"],
      ],
      medical: [
        ["funds", "医疗扩容和分流会持续占用现金流。"],
        ["supplies", "床位、药品和防护品会同时消耗库存。"],
        ["staffFatigue", "医疗优先会把人手抽向医院端。"],
        ["publicMemory", "征用和分级收治会留下解释成本。"],
      ],
      monitoring: [
        ["staffFatigue", "监测治理依赖上报、复核和申诉，疲劳会回流。"],
        ["trust", "低信任时，健康码、筛查和登记更容易变成争议。"],
        ["funds", "检测、系统和哨点都会消耗周转资金。"],
        ["publicMemory", "误判和申诉队列会转化为长期伤痕。"],
      ],
      livelihood: [
        ["funds", "民生保供看似温和，但配送和补贴会压住现金流。"],
        ["staffFatigue", "配送、药品和热线都要基层承接。"],
        ["infection", "保供通行会带回有限流动风险。"],
        ["supplies", "优先照护会加快库存消耗。"],
      ],
      workerRelief: [
        ["hospitalLoad", "轮休和减压会让医院短期承接更多压力。"],
        ["supplies", "换班、补贴和支援需要额外防护与物资。"],
        ["funds", "外部支援和心理轮休都有预算账单。"],
        ["infection", "执行降速时，传播压制会短时变松。"],
      ],
      openRepair: [
        ["trust", "公开修复若遇到坏账，会先触发追问而不是立刻稳定。"],
        ["funds", "审计、公示和补偿会吃掉现金流。"],
        ["staffFatigue", "复盘材料和问答窗口需要人手。"],
        ["publicMemory", "公开会让旧伤浮上来，创伤要靠后续行动修复。"],
      ],
      memory: [
        ["funds", "创伤修复通常需要补偿、纪念和长期服务投入。"],
        ["economy", "复盘与修复会挤占恢复期行政窗口。"],
        ["trust", "若只做姿态不改流程，信任会反噬。"],
        ["staffFatigue", "热线、回访和复盘也会成为基层任务。"],
      ],
    };
    const candidates = (rules[dominant.id] || [])
      .map(([metric, detail]) => buildStrategyDebt(state, metric, detail, exposure, routeMap))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-Hans-CN"));
    return candidates.slice(0, 3).map(({ score, ...item }) => item);
  }

  function buildStrategyDebt(state, metric, detail, exposure, routeMap) {
    const value = getObjectiveValue(state, metric);
    const meta = getObjectiveMeta(metric);
    if (!meta) return null;
    const pressure = strategyMetricDebtPressure(metric, value);
    const score = pressure * 18 + exposure;
    if (score < 54) return null;
    const target = strategyDebtActionTarget(state, metric);
    return {
      id: `debt_${metric}`,
      metric,
      label: meta.short,
      value,
      tone: pressure >= 4 ? "danger" : pressure >= 3 ? "warn" : "info",
      detail: target && target.actionLabel ? `${detail} 应对入口：“${target.actionLabel}”。` : detail,
      percent: exposure,
      status: pressure >= 4 ? "债务高位" : pressure >= 3 ? "正在积累" : "需要盯防",
      ...target,
      score,
    };
  }

  function strategyDebtActionTarget(state, metric) {
    return pressureActionTarget(state, PENDING_PRESSURE_TARGETS[metric] || []);
  }

  function strategyMetricDebtPressure(metric, value) {
    if (metric === "infection") return value >= 80 ? 5 : value >= 65 ? 4 : value >= 52 ? 3 : value >= 42 ? 2 : 1;
    if (metric === "hospitalLoad") return value >= 85 ? 5 : value >= 70 ? 4 : value >= 55 ? 3 : value >= 42 ? 2 : 1;
    if (metric === "supplies") return value <= 25 ? 5 : value <= 40 ? 4 : value <= 55 ? 3 : value <= 66 ? 2 : 1;
    if (metric === "trust") return value <= 30 ? 5 : value <= 45 ? 4 : value <= 58 ? 3 : value <= 68 ? 2 : 1;
    if (metric === "economy") return value <= 25 ? 5 : value <= 40 ? 4 : value <= 55 ? 3 : value <= 66 ? 2 : 1;
    if (metric === "staffFatigue") return value >= 80 ? 5 : value >= 65 ? 4 : value >= 52 ? 3 : value >= 40 ? 2 : 1;
    if (metric === "funds") return value <= 15 ? 5 : value <= 30 ? 4 : value <= 45 ? 3 : value <= 60 ? 2 : 1;
    if (metric === "detectedRate") return value <= 35 ? 5 : value <= 50 ? 4 : value <= 62 ? 3 : value <= 72 ? 2 : 1;
    if (metric === "publicMemory") return value >= 60 ? 5 : value >= 45 ? 4 : value >= 30 ? 3 : value >= 18 ? 2 : 1;
    return 1;
  }

  function getStrategyBlindSpot(state, routeMap) {
    const pct = (id) => routeMap[id] ? routeMap[id].percent : 0;
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    if (m.hospitalLoad >= 70 && pct("medical") < 15) {
      return { tone: "danger", label: "医疗路线偏少", detail: "医疗负载已经高位，但医疗优先路线占比偏低，容易被连续越线击穿。" };
    }
    if (m.infection >= 70 && pct("monitoring") + pct("control") < 20) {
      return { tone: "danger", label: "传播治理偏少", detail: "感染压力高位时，监测治理或管控止血至少要有一条路线承担主压。" };
    }
    if (m.staffFatigue >= 70 && pct("workerRelief") < 15) {
      return { tone: "warn", label: "基层减压偏少", detail: "基层疲劳会削弱所有行动，减压路线不足会让后期操作越来越钝。" };
    }
    if (m.trust < 45 && pct("openRepair") + pct("memory") < 15) {
      return { tone: "warn", label: "信任修复偏少", detail: "低信任会压低政策效率，公开修复或创伤修复需要补位。" };
    }
    if (m.supplies < 35 && pct("livelihood") < 15) {
      return { tone: "warn", label: "民生保供偏少", detail: "物资低位会同时拉低信任和基层效率，保供路线不能只等随机事件。" };
    }
    if (r.funds <= 25 && pct("recovery") < 15) {
      return { tone: "warn", label: "财政恢复偏少", detail: "资金低位会锁住工程和决议，恢复财政路线需要更早布局。" };
    }
    if (h.publicMemory >= 45 && pct("memory") < 12) {
      return { tone: "warn", label: "创伤修复偏少", detail: "公共创伤已经进入结局权重区，记忆修复路线能改善恢复质感。" };
    }
    return null;
  }

  function getStrategyRecommendations(state, blindSpot, dominant) {
    if (!state || state.ended) return [];
    const targetRouteIds = strategyTargetRouteIds(state, blindSpot, dominant);
    if (!targetRouteIds.length) return [];
    const targetSet = new Set(targetRouteIds);
    const rows = [];
    const seen = new Set();
    const add = (item) => {
      if (!item || !item.routeId || !targetSet.has(item.routeId) || seen.has(item.id)) return;
      seen.add(item.id);
      rows.push(item);
    };

    const event = state.currentEventId ? getCurrentEvent(state) : null;
    (event && event.choices ? event.choices : []).forEach((choice, index) => {
      if (choice.available === false) return;
      const route = getStrategyRouteForKey(choice.strategyKey || choice.actionKey || choice.profile || choice.id);
      const routeTag = choice.routeTag || getChoiceRouteTag(choice);
      add({
        id: `choice_${choice.id}`,
        source: "choice",
        kind: "今日事件",
        label: choice.label,
        routeId: route && route.id,
        routeLabel: route ? route.label : routeTag.label,
        tone: routeTag.tone || "info",
        status: "可选择",
        detail: (choice.effectPreview || []).slice(0, 3).join(" / ") || "这项事件选项能补足当前路线结构。",
        choiceId: choice.id,
        priority: strategyRecommendationPriority(state, route, choice, "choice", index, true),
      });
    });

    MAP_POINTS.forEach((pointDef) => {
      const point = getMapPoint(state, pointDef.id);
      [
        { mode: "operations", kind: "工程", items: point.operations },
        { mode: "resolutions", kind: "决议", items: point.resolutions },
      ].forEach((group) => {
        group.items.forEach((item) => {
          const route = getStrategyRouteForKey(item.id);
          if (!route) return;
          const resolved = {
            resources: resolveResources(state, item),
            effects: resolveEffects(state, item),
            hidden: resolveHidden(state, item),
          };
          const forecast = item.available
            ? getCityActionOutcomePreview(state, group.mode, item.id).slice(0, 3).map(formatForecastEntry)
            : [];
          add({
            id: `${group.mode}_${item.id}`,
            source: group.mode,
            kind: group.kind,
            label: item.label,
            routeId: route.id,
            routeLabel: route.label,
            tone: item.available ? route.tone : "mixed",
            status: item.available ? "可执行" : unlockPreviewLabel(item.lockedReason),
            detail: item.available
              ? (forecast.length ? forecast.join(" / ") : "这项城市行动能补足当前路线结构。")
              : item.lockedDetail || item.lockedReason || "当前条件不足。",
            mode: group.mode,
            actionId: item.id,
            pointId: pointDef.id,
            pointLabel: point.label,
            locked: !item.available,
            priority: strategyRecommendationPriority(state, route, resolved, group.mode, 0, item.available)
              + (EARLY_RECOVERY_IDS.has(item.id) && state.day <= 18 ? 8 : 0)
              + (item.lockedReason === "今日调度已满" ? 4 : 0),
          });
        });
      });
    });

    return rows
      .sort((a, b) => b.priority - a.priority || a.kind.localeCompare(b.kind, "zh-Hans-CN"))
      .slice(0, 3)
      .map(({ priority, routeId, ...item }) => item);
  }

  function strategyTargetRouteIds(state, blindSpot, dominant) {
    const blindLabel = blindSpot ? blindSpot.label || "" : "";
    if (blindLabel.includes("医疗")) return ["medical"];
    if (blindLabel.includes("传播")) return ["monitoring", "control"];
    if (blindLabel.includes("基层")) return ["workerRelief"];
    if (blindLabel.includes("信任")) return ["openRepair", "memory"];
    if (blindLabel.includes("民生")) return ["livelihood"];
    if (blindLabel.includes("财政")) return ["recovery"];
    if (blindLabel.includes("创伤")) return ["memory", "openRepair"];

    if (dominant && dominant.percent >= 40) {
      const complement = STRATEGY_COMPLEMENTS[dominant.id];
      if (complement) return complement.routeIds;
    }

    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const pressureRoutes = [];
    if (m.hospitalLoad >= 65) pressureRoutes.push("medical");
    if (m.infection >= 65 || h.detectedRate <= 45) pressureRoutes.push("monitoring", "control");
    if (m.supplies <= 45) pressureRoutes.push("livelihood");
    if (m.staffFatigue >= 65) pressureRoutes.push("workerRelief");
    if (m.trust <= 45) pressureRoutes.push("openRepair", "memory");
    if (m.economy <= 48 || r.funds <= 45) pressureRoutes.push("recovery");
    if (h.publicMemory >= 45) pressureRoutes.push("memory");
    return [...new Set(pressureRoutes)].slice(0, 4);
  }

  function strategyRecommendationPriority(state, route, result = {}, source = "", index = 0, available = true) {
    if (!route) return 0;
    const routePressure = strategyRoutePressureScore(state, route.id);
    const sourceBias = source === "choice" ? 66 : 56;
    let priority = sourceBias + routePressure - index * 3;
    if (!available) priority -= 22;
    priority -= strategyRecommendationRiskPenalty(state, route.id, result);

    if (route.id === "monitoring" && state.hidden.detectedRate <= 45) priority += 14;
    if (route.id === "control" && state.metrics.infection < 65) priority -= 18;
    if (route.id === "control" && state.hidden.detectedRate <= 45 && state.metrics.infection < 65) priority -= 10;
    if (route.id === "recovery" && (state.resources.funds <= 45 || state.metrics.economy <= 55)) priority += 8;
    if (route.id === "workerRelief" && state.metrics.staffFatigue >= 70) priority += 8;
    return priority;
  }

  function strategyRoutePressureScore(state, routeId) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    if (routeId === "medical") return m.hospitalLoad >= 85 ? 34 : m.hospitalLoad >= 70 ? 24 : m.hospitalLoad >= 55 ? 12 : 4;
    if (routeId === "monitoring") return h.detectedRate <= 40 ? 34 : h.detectedRate <= 55 ? 24 : m.infection >= 65 ? 14 : 5;
    if (routeId === "control") return m.infection >= 82 ? 34 : m.infection >= 70 ? 24 : m.infection >= 60 ? 12 : 0;
    if (routeId === "livelihood") return m.supplies <= 25 ? 32 : m.supplies <= 45 ? 22 : m.trust <= 45 ? 10 : 4;
    if (routeId === "workerRelief") return m.staffFatigue >= 82 ? 32 : m.staffFatigue >= 68 ? 22 : m.staffFatigue >= 55 ? 10 : 4;
    if (routeId === "openRepair") return m.trust <= 35 ? 30 : m.trust <= 50 ? 20 : h.publicMemory >= 35 ? 12 : 5;
    if (routeId === "memory") return h.publicMemory >= 55 ? 30 : h.publicMemory >= 35 ? 18 : m.trust <= 40 ? 10 : 4;
    if (routeId === "recovery") return r.funds <= 20 ? 32 : r.funds <= 45 ? 22 : m.economy <= 40 ? 18 : m.economy <= 58 ? 10 : 4;
    return 6;
  }

  function strategyRecommendationRiskPenalty(state, routeId, result = {}) {
    let penalty = 0;
    const collect = (bucket = {}, weight = 1) => {
      Object.entries(bucket || {}).forEach(([metric, delta]) => {
        if (!delta) return;
        if (isBadDelta(metric, delta)) {
          penalty += Math.min(24, Math.abs(delta) * 3 * weight);
          if (metric === "trust" && state.metrics.trust <= 45) penalty += 5;
          if (metric === "staffFatigue" && state.metrics.staffFatigue >= 70) penalty += 5;
          if (metric === "funds" && state.resources.funds <= 30) penalty += 5;
        }
      });
    };
    collect(result.effects, 1);
    collect(result.hidden, 0.9);
    collect(result.resources, 0.7);
    if (routeId === "control" && state.metrics.infection < 70) penalty += 8;
    if (routeId === "control" && state.metrics.trust < 50) penalty += 8;
    if (routeId === "recovery" && result.hidden && result.hidden.publicMemory > 0 && state.hidden.publicMemory >= 45) penalty += 6;
    return penalty;
  }

  function formatForecastEntry(entry) {
    if (!entry || !entry.short) return "";
    return `${entry.short} ${entry.delta > 0 ? "+" : ""}${entry.delta}`;
  }

  function getChoiceCrisisImpacts(result = {}) {
    const effects = result.effects || {};
    const hidden = result.hidden || {};
    const delayed = result.delayed || null;
    const impacts = [];
    const add = (id, tone, label, detail, score) => {
      if (impacts.some((item) => item.id === id)) return;
      impacts.push({ id, tone, label, detail, score });
    };
    const addMetric = (id, metric, delta, goodWhenPositive, goodLabel, badLabel, scoreBase = 50) => {
      if (!delta) return;
      const helpful = goodWhenPositive ? delta > 0 : delta < 0;
      const meta = METRIC_META[metric];
      add(
        id,
        helpful ? "good" : "danger",
        helpful ? goodLabel : badLabel,
        `${meta.short} ${delta > 0 ? "+" : ""}${delta}`,
        scoreBase + Math.abs(delta) * (helpful ? 8 : 12),
      );
    };

    addMetric("infection", "infection", effects.infection, false, "压低传播", "传播反弹", 44);
    addMetric("medical", "hospitalLoad", effects.hospitalLoad, false, "护住医疗", "推高医疗", 70);
    addMetric("supply", "supplies", effects.supplies, true, "补强供应", "供应承压", 64);
    addMetric("trust", "trust", effects.trust, true, "修复信任", "信任受损", 66);
    addMetric("staff", "staffFatigue", effects.staffFatigue, false, "基层减压", "疲劳上升", 68);
    addMetric("memory", "publicMemory", hidden.publicMemory, false, "修复创伤", "创伤累积", 55);

    if (delayed && delayed.effects && delayed.effects.trust < 0) {
      add("delayedTrust", "danger", "后续信任反噬", `信任 ${delayed.effects.trust}`, 78 + Math.abs(delayed.effects.trust) * 8);
    }
    if (delayed && delayed.effects && delayed.effects.hospitalLoad > 0) {
      add("delayedMedical", "danger", "后续医疗承压", `医疗 ${delayed.effects.hospitalLoad > 0 ? "+" : ""}${delayed.effects.hospitalLoad}`, 74 + delayed.effects.hospitalLoad * 8);
    }

    return impacts
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score, ...impact }) => impact);
  }

  function getCurrentEvent(state) {
    if (state.ended) return null;
    if (String(state.currentEventId || "").startsWith("buffer_")) {
      return buildBufferEvent(state);
    }
    if (String(state.currentEventId || "").startsWith("fallback_")) {
      return buildFallbackEvent(state);
    }
    const event = EVENTS.find((item) => item.id === state.currentEventId) || EVENTS[0];
    const choices = event.choices
      ? ensureEventChoiceFallback(
        event.choices.map((choice) => buildCustomEventChoice(event, choice, state)),
      )
      : event.actions.map((actionKey) => buildChoiceForAction(event, actionKey, state));
    return {
      ...event,
      type: "event",
      image: getEventImage(event),
      body: event.description || event.body,
      choices,
    };
  }

  function ensureEventChoiceFallback(choices) {
    if (!choices.length || choices.some((choice) => choice.available !== false)) return choices;
    const fallbackIndex = choices.reduce((bestIndex, choice, index) => {
      const bestFunds = choices[bestIndex].eventResources ? choices[bestIndex].eventResources.funds || 0 : 0;
      const funds = choice.eventResources ? choice.eventResources.funds || 0 : 0;
      return funds > bestFunds ? index : bestIndex;
    }, 0);
    return choices.map((choice, index) => {
      if (index !== fallbackIndex) return choice;
      const eventResources = { ...(choice.eventResources || {}) };
      if (eventResources.funds < 0) delete eventResources.funds;
      return {
        ...choice,
        available: true,
        lockedReason: "",
        description: `${choice.description} 当前财政见底时会转为低成本应急版，收益仍在，但不再消耗资金。`,
        eventResources,
        effectPreview: previewEventChoiceEffects({
          resources: eventResources,
          effects: choice.eventEffects,
          hidden: choice.eventHidden,
          delayed: choice.delayed,
        }),
        crisisImpacts: getChoiceCrisisImpacts({
          effects: choice.eventEffects,
          hidden: choice.eventHidden,
          delayed: choice.delayed,
        }),
        eventNotes: [
          ...(choice.eventNotes || []),
          "财政见底：系统保留一个低成本应急选项，避免事件卡死。",
        ],
      };
    });
  }

  function buildBufferEvent(state) {
    const phase = phaseForDay(state.day);
    const review = getStageReview(state);
    const reward = review.reward || getStageMomentumReward(state);
    const worst = findWorstMetric(state);
    const sacrifice = findSacrificeMetric(state, worst.metric);
    const worstMeta = METRIC_META[worst.metric];
    const sacrificeMeta = METRIC_META[sacrifice];
    const repairDelta = worstMeta.direction === "danger" ? -8 : 8;
    const sacrificeDelta = sacrificeMeta.direction === "danger" ? 6 : -6;
    const choices = [
      ...(reward.available ? [{
        id: "claimStageMomentum",
        label: "兑现阶段余裕",
        actionKey: "dynamicMomentum",
        description: `${reward.detail} 这不是救急按钮，而是对阶段目标完成度的奖励：收益温和，但没有明显副作用。`,
        routeTag: getChoiceRouteTag({ actionKey: "dynamicMomentum" }),
        effectPreview: [
          ...previewEventChoiceEffects({ resources: reward.resources, effects: reward.effects, hidden: reward.hidden }).slice(0, 5),
          "阶段奖励",
        ],
        crisisImpacts: [
          { id: "rewardFunds", tone: "good", label: "兑现余裕", detail: `资金 +${reward.resources.funds || 0}` },
          { id: "rewardFatigue", tone: "good", label: "执行缓冲", detail: reward.effects.staffFatigue ? `疲劳 ${reward.effects.staffFatigue}` : "疲劳缓冲" },
          { id: "rewardTrust", tone: "good", label: "信任留存", detail: reward.effects.trust ? `信任 +${reward.effects.trust}` : "信任留存" },
        ],
      }] : []),
      {
        id: "repairWorst",
        label: `托底${worstMeta.label}`,
        actionKey: "dynamicRepair",
        description: `把当前最危险的短板先拉回一点：${worstMeta.label}会得到直接修复，但代价会落在仍有余量的${sacrificeMeta.label}上。`,
        routeTag: getChoiceRouteTag({ actionKey: "dynamicRepair" }),
        effectPreview: [`${worstMeta.short} ${repairDelta > 0 ? "+" : ""}${repairDelta}`, `${sacrificeMeta.short} ${sacrificeDelta > 0 ? "+" : ""}${sacrificeDelta}`, "创伤 +1"],
        crisisImpacts: [
          { id: "repair", tone: "good", label: "托底红线", detail: `${worstMeta.label} ${repairDelta > 0 ? "+" : ""}${repairDelta}` },
          { id: "cost", tone: "danger", label: "转移代价", detail: `${sacrificeMeta.label} ${sacrificeDelta > 0 ? "+" : ""}${sacrificeDelta}` },
        ],
      },
      {
        id: "releasePressure",
        label: "释放社会压力",
        actionKey: "dynamicRelease",
        description: "把阶段末的解释、轮休和恢复节奏放到台前，降低管控与疲劳，修复信任和活力，但承担轻微感染反弹。",
        routeTag: getChoiceRouteTag({ actionKey: "dynamicRelease" }),
        effectPreview: ["信任 +6", "疲劳 -6", "感染 +2"],
        crisisImpacts: [
          { id: "trust", tone: "good", label: "修复信任", detail: "信任 +6" },
          { id: "staff", tone: "good", label: "基层减压", detail: "疲劳 -6" },
          { id: "infection", tone: "danger", label: "传播反弹", detail: "感染 +2" },
        ],
      },
      {
        id: "concentrateResources",
        label: "集中防疫资源",
        actionKey: "dynamicConcentrate",
        description: "把阶段复盘转成一次更集中调度，继续压低感染和医疗压力，代价是物资、活力与基层状态会继续承压。",
        routeTag: getChoiceRouteTag({ actionKey: "dynamicConcentrate" }),
        effectPreview: ["感染 -5", "医疗负载 -4", "物资/活力/疲劳承压"],
        crisisImpacts: [
          { id: "infection", tone: "good", label: "压低传播", detail: "感染 -5" },
          { id: "medical", tone: "good", label: "护住医疗", detail: "医疗负载 -4" },
          { id: "staff", tone: "danger", label: "疲劳上升", detail: "基层承压" },
        ],
      },
    ];
    return {
      id: `buffer_${phase}`,
      type: "buffer",
      phase: [phase],
      tags: ["buffer"],
      title: `第 ${phase} 阶段复盘会`,
      body: `${review.summary} ${review.detail} 阶段总结给了城市一次缓冲窗口：可以修补最危险的短板，也可以选择更明确的恢复方向。没有免费的修复，每一项补救都会挤占另一个系统。`,
      image: "news-shelter.png",
      stageReview: review,
      choices,
    };
  }

  function buildFallbackEvent(state) {
    const profile = fallbackPressureProfile(state);
    const choiceSpecs = [
      {
        id: "fallback_livelihood",
        label: "稳住民生面",
        description: "把有限人手先投向配送、药品和居民热线，先稳住看得见的生活压力；代价是基层排班会更紧，流动接触略有增加。",
        effects: { supplies: 4, trust: 2, staffFatigue: 1, infection: 1 },
        hidden: { publicMemory: -1 },
      },
      {
        id: "fallback_control",
        label: "压低传播面",
        description: "对当前风险点做短时加压处置，压低传播窗口；代价是城市活力和信任会被挤压，一线执行负荷也会上升。",
        effects: { infection: -4, economy: -2, trust: -1, staffFatigue: 2 },
        hidden: { policyStrictness: 3 },
      },
      {
        id: "fallback_relief",
        label: "释放执行压力",
        description: "减少重复登记和非紧急任务，把人手还给基层与医院；代价是供应调度和监测清晰度会轻微下降。",
        effects: { staffFatigue: -5, hospitalLoad: 1, supplies: -2, trust: 1 },
        hidden: { detectedRate: -1 },
      },
    ];

    return {
      id: state.currentEventId || `fallback_${state.phase}_${state.day}`,
      type: "event",
      phase: [state.phase],
      tags: profile.tags,
      title: "城市滚动简报",
      body: `${profile.summary} 今日没有新的专题事件进入指挥部，但系统压力仍在累积。你可以把这次简报当成一次低强度调度窗口：收益不会很大，代价也不会被完全免除。`,
      description: `${profile.summary} 今日没有新的专题事件进入指挥部，但系统压力仍在累积。你可以把这次简报当成一次低强度调度窗口：收益不会很大，代价也不会被完全免除。`,
      sourceNote: "",
      imageKey: profile.imageKey,
      image: profile.image,
      choices: choiceSpecs.map((choice) => ({
        ...choice,
        customChoice: true,
        strategyKey: choice.id,
        actionKey: choice.id,
        routeTag: getChoiceRouteTag(choice),
        eventResources: {},
        eventEffects: choice.effects,
        eventHidden: choice.hidden,
        modifiers: {},
        delayed: null,
        eventNotes: ["候选专题事件已耗尽：使用低强度滚动简报，不记录为正式专题事件。"],
        effectPreview: previewEventChoiceEffects({
          resources: {},
          effects: choice.effects,
          hidden: choice.hidden,
          delayed: null,
        }),
        crisisImpacts: getChoiceCrisisImpacts({
          effects: choice.effects,
          hidden: choice.hidden,
          delayed: null,
        }),
        available: true,
        lockedReason: "",
      })),
    };
  }

  function fallbackPressureProfile(state) {
    const pressures = [
      {
        score: state.metrics.hospitalLoad,
        image: "news-hospital.png",
        imageKey: "hospital",
        tags: ["medical"],
        summary: "医院、急诊和分流系统仍然是今天最显眼的压力源。",
      },
      {
        score: state.metrics.infection,
        image: "news-health-code.png",
        imageKey: "notice",
        tags: ["infection"],
        summary: "传播风险还没有完全退下去，社区和交通节点仍需要盯紧。",
      },
      {
        score: 100 - state.metrics.supplies,
        image: "news-supply.png",
        imageKey: "market",
        tags: ["supply"],
        summary: "供应链和居民生活面出现缺口，保供系统需要重新排优先级。",
      },
      {
        score: 100 - state.metrics.trust,
        image: "news-health-code.png",
        imageKey: "notice",
        tags: ["trust"],
        summary: "市民信任承压，信息解释和执行口径需要补上缝隙。",
      },
      {
        score: state.metrics.staffFatigue,
        image: "news-shelter.png",
        imageKey: "community",
        tags: ["fatigue"],
        summary: "基层与志愿者排班已经偏紧，继续硬撑会影响后续执行。",
      },
      {
        score: 100 - state.resources.funds,
        image: "news-factory.png",
        imageKey: "budget",
        tags: ["funds"],
        summary: "应急资金余量收窄，今天的调度需要更克制。",
      },
    ];
    return pressures.sort((a, b) => b.score - a.score)[0];
  }

  function buildChoiceForAction(event, actionKey, state) {
    const action = ACTIONS[actionKey];
    const status = getActionStatus(state, actionKey);
    const eventMod = eventModifier(event, actionKey, state);
    const preview = previewActionEffects(state, actionKey, eventMod);
    return {
      id: `${event.id}:${actionKey}`,
      actionKey,
      label: action.label,
      description: `${action.intent}。${eventMod.text}`,
      routeTag: getChoiceRouteTag({ actionKey }),
      effectPreview: preview,
      crisisImpacts: getChoiceCrisisImpacts(eventMod),
      eventEffects: eventMod.effects,
      eventHidden: eventMod.hidden,
      eventResources: {},
      modifiers: {},
      delayed: eventMod.delayed,
      eventNotes: eventMod.notes,
      available: status.available,
      lockedReason: status.lockedReason,
    };
  }

  function buildCustomEventChoice(event, choice, state) {
    const result = computeEventChoiceResult(state, event, choice);
    let lockedReason = "";
    if (!conditionMet(state, choice.condition)) lockedReason = "条件未满足";
    else if (isFiscalLock(state, result.resources)) lockedReason = "财政透支";
    else if (!canPay(state, result.resources)) lockedReason = "资金不足";
    return {
      id: `${event.id}:${choice.id}`,
      customChoice: true,
      strategyKey: choice.strategyKey,
      actionKey: choice.strategyKey,
      label: choice.label,
      description: choice.description,
      routeTag: getChoiceRouteTag(choice),
      effectPreview: previewEventChoiceEffects(result),
      crisisImpacts: getChoiceCrisisImpacts(result),
      eventResources: result.resources,
      eventEffects: result.effects,
      eventHidden: result.hidden,
      modifiers: result.modifiers,
      delayed: result.delayed,
      eventNotes: result.notes,
      available: !lockedReason,
      lockedReason,
    };
  }

  function computeEventChoiceResult(state, event, choice) {
    const itemId = choice.strategyKey || choice.id;
    const efficiency = choice.scale === false ? 1 : actionEfficiency(state);
    const resources = adjustedResourcesForItem(state, itemId, choice.resources || {});
    const effects = scaleBeneficialEffects(
      adjustedEffectsForItem(state, itemId, choice.effects || {}),
      efficiency,
    );
    const hidden = scaleBeneficialEffects(
      adjustedHiddenForItem(state, itemId, choice.hidden || {}),
      efficiency,
    );
    return {
      resources,
      effects,
      hidden,
      modifiers: choice.modifiers || {},
      delayed: choice.delayed || null,
      notes: choice.notes || [],
      eventTitle: event.title,
    };
  }

  function previewEventChoiceEffects(result) {
    const lines = [];
    Object.entries(result.resources || {}).forEach(([metric, delta]) => {
      if (!delta) return;
      lines.push(`${RESOURCE_META[metric].short} ${delta > 0 ? "+" : ""}${delta}`);
    });
    Object.entries(result.effects || {}).forEach(([metric, delta]) => {
      if (!delta) return;
      const displayDelta = clamp(delta, -DAILY_CORE_CAP, DAILY_CORE_CAP);
      lines.push(`${METRIC_META[metric].short} ${displayDelta > 0 ? "+" : ""}${displayDelta}`);
    });
    Object.entries(result.hidden || {}).forEach(([metric, delta]) => {
      if (!delta) return;
      lines.push(`${METRIC_META[metric].short} ${delta > 0 ? "+" : ""}${delta}`);
    });
    if (result.delayed) lines.push(delayedPreviewText(result.delayed));
    return lines.slice(0, 6);
  }

  function previewActionEffects(state, actionKey, eventMod) {
    const actionResult = computeActionResult(state, actionKey);
    const lines = [];
    const mergedCore = mergeEffects(actionResult.effects, eventMod.effects);
    const mergedHidden = mergeEffects(actionResult.hidden, eventMod.hidden);
    const resources = actionResult.resources || {};

    Object.entries(resources).forEach(([metric, delta]) => {
      if (!delta) return;
      lines.push(`${RESOURCE_META[metric].short} ${delta > 0 ? "+" : ""}${delta}`);
    });

    Object.entries(mergedCore).forEach(([metric, delta]) => {
      if (!delta) return;
      const displayDelta = clamp(delta, -DAILY_CORE_CAP, DAILY_CORE_CAP);
      lines.push(`${METRIC_META[metric].short} ${displayDelta > 0 ? "+" : ""}${displayDelta}`);
    });
    Object.entries(mergedHidden).forEach(([metric, delta]) => {
      if (!delta) return;
      lines.push(`${METRIC_META[metric].short} ${delta > 0 ? "+" : ""}${delta}`);
    });
    if (eventMod.delayed) lines.push(delayedPreviewText(eventMod.delayed));
    return lines.slice(0, 5);
  }

  function getActionStatus(state, actionKey) {
    const action = ACTIONS[actionKey];
    if (!action) return { available: false, lockedReason: "行动不存在" };
    const uses = state.flags.actionUses[actionKey] || 0;
    const maxed = action.maxUses && uses >= action.maxUses;
    const conditionOk = action.condition ? action.condition(state) : true;
    const result = computeActionResult(state, actionKey);
    const affordable = canPay(state, result.resources);
    let lockedReason = "";
    if (maxed) lockedReason = "次数已用完";
    else if (!conditionOk) lockedReason = "条件未满足";
    else if (!affordable) lockedReason = "资金不足";
    return {
      available: !maxed && conditionOk && affordable,
      lockedReason,
      uses,
      resources: result.resources,
    };
  }

  function mergeEffects(a = {}, b = {}) {
    const result = { ...a };
    Object.entries(b).forEach(([key, value]) => {
      result[key] = (result[key] || 0) + value;
    });
    return result;
  }

  function eventModifier(event, actionKey, state) {
    const tags = event.tags || [];
    const effects = {};
    const hidden = {};
    const notes = [];
    let text = "情境影响较小。";
    let delayed = {
      delay: 3,
      label: "后续压力回流",
      effects: {},
      hidden: {},
    };

    function add(metric, delta) {
      effects[metric] = (effects[metric] || 0) + delta;
    }

    function addHidden(metric, delta) {
      hidden[metric] = (hidden[metric] || 0) + delta;
    }

    if (tags.includes("infection")) {
      if (["expandTesting", "zoningControl", "citywideSilence"].includes(actionKey)) {
        add("infection", -1);
        text = "这项行动正对传播风险。";
      } else if (actionKey === "reopenPilot") {
        add("infection", 1);
        text = "在传播风险事件中恢复流动会放大反弹。";
      } else if (actionKey === "forceSimplify") {
        add("infection", -1);
        addHidden("detectedRate", -1);
        text = "强行压缩流程能快一点，但会牺牲信息质量。";
      }
      delayed.effects.infection = (delayed.effects.infection || 0) + (actionKey === "reopenPilot" ? 2 : 0);
    }

    if (tags.includes("medical")) {
      if (actionKey === "medicalExpansion") {
        add("hospitalLoad", -2);
        add("supplies", -1);
        text = "医疗行动能直接缓解这次压力。";
      } else if (actionKey === "restPolicy") {
        add("staffFatigue", -1);
        add("hospitalLoad", 1);
        text = "轮休能保人，但短期容量更紧。";
      } else if (actionKey === "supportTeam") {
        add("staffFatigue", -1);
        text = "支援队能替一线挡住部分排班压力。";
      } else {
        delayed.effects.hospitalLoad = (delayed.effects.hospitalLoad || 0) + 1;
      }
      if (state.metrics.hospitalLoad >= 80) addHidden("publicMemory", 1);
    }

    if (tags.includes("supply")) {
      if (actionKey === "supplyPriority") {
        add("supplies", 2);
        add("trust", 1);
        text = "保供行动能快速稳定民生预期。";
      } else if (actionKey === "outsourceDelivery") {
        add("supplies", 2);
        add("trust", -1);
        text = "外包配送能补链条，但公平性质疑会上升。";
      } else if (["zoningControl", "citywideSilence"].includes(actionKey)) {
        add("supplies", -2);
        text = "更强管控会压住配送链条。";
      }
      delayed.effects.supplies = (delayed.effects.supplies || 0) + (actionKey === "supplyPriority" ? 1 : -1);
    }

    if (tags.includes("trust") || tags.includes("rumor")) {
      if (actionKey === "transparency") {
        add("trust", 2);
        addHidden("detectedRate", 1);
        text = "公开解释能修复这次事件的信任缺口。";
      } else if (["citywideSilence", "zoningControl"].includes(actionKey)) {
        add("trust", -1);
      } else if (["supportTeam", "compressAdmin", "outsourceDelivery", "forceSimplify", "fiscalDebt"].includes(actionKey)) {
        add("trust", -1);
        text = "这项处理能换取效率，但会消耗公众耐心。";
      }
      delayed.effects.trust = (delayed.effects.trust || 0) + (actionKey === "transparency" ? 1 : -1);
    }

    if (tags.includes("economy")) {
      if (actionKey === "reopenPilot") {
        add("economy", 2);
        text = "试点恢复能对准当前经济压力。";
      } else if (actionKey === "fiscalDebt") {
        add("economy", -1);
        text = "提前举债能缓解账面压力，但恢复期更沉。";
      } else if (["zoningControl", "citywideSilence"].includes(actionKey)) {
        add("economy", -2);
        text = "继续压低流动会加重收入压力。";
      }
      delayed.effects.economy = (delayed.effects.economy || 0) + (actionKey === "reopenPilot" ? 1 : -1);
    }

    if (tags.includes("fatigue")) {
      if (actionKey === "restPolicy") {
        add("staffFatigue", -2);
        text = "这次事件的关键是保住执行队伍。";
      } else if (["supportTeam", "compressAdmin", "forceSimplify"].includes(actionKey)) {
        add("staffFatigue", -1);
        text = "这次事件的关键是保住执行队伍。";
      } else if (actionKey === "outsourceDelivery") {
        add("staffFatigue", -1);
        add("trust", -1);
        text = "外包能减压，但也把争议带到居民面前。";
      } else {
        add("staffFatigue", 1);
      }
      delayed.effects.staffFatigue = (delayed.effects.staffFatigue || 0) + (actionKey === "restPolicy" ? -1 : 1);
    }

    if (tags.includes("funds")) {
      if (actionKey === "fiscalDebt") {
        text = "财政动作能补上资金缺口，但会透支恢复期。";
      } else if (["compressAdmin", "forceSimplify"].includes(actionKey)) {
        add("staffFatigue", -1);
        add("trust", -1);
        text = "压缩流程能省成本，也会降低可解释性。";
      }
    }

    if (tags.includes("public")) {
      if (actionKey === "transparency" || actionKey === "restPolicy") {
        addHidden("publicMemory", -1);
        add("trust", 1);
        text = "承认代价能减少长期创伤。";
      } else {
        addHidden("publicMemory", 2);
      }
      delayed.hidden.publicMemory = (delayed.hidden.publicMemory || 0) + (actionKey === "transparency" ? -1 : 1);
    }

    delayed.effects = removeZeroes(delayed.effects);
    delayed.hidden = removeZeroes(delayed.hidden);
    if (!Object.keys(delayed.effects).length && !Object.keys(delayed.hidden).length) {
      delayed = {
        delay: 2,
        label: "事件余波",
        effects: { trust: actionKey === "transparency" ? 1 : -1 },
        hidden: {},
      };
    }

    notes.push(text);
    return { effects, hidden, delayed, notes, text };
  }

  function removeZeroes(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== 0));
  }

  function computeActionResult(state, actionKey) {
    const action = ACTIONS[actionKey];
    if (!action) return { effects: {}, hidden: {}, modifiers: {}, notes: [] };
    const raw = action.compute(state);
    const efficiency = actionEfficiency(state);
    const scaledEffects = scaleBeneficialEffects(raw.effects || {}, efficiency);
    const scaledHidden = scaleBeneficialEffects(raw.hidden || {}, efficiency);
    return {
      resources: raw.resources || {},
      effects: scaledEffects,
      hidden: scaledHidden,
      modifiers: raw.modifiers || {},
      flags: raw.flags || {},
      notes: raw.notes || [],
      efficiency,
    };
  }

  function actionEfficiency(state) {
    let efficiency = 1;
    if (state.metrics.staffFatigue > 80) efficiency -= 0.2;
    if (state.metrics.trust <= 30) efficiency -= 0.2;
    return clamp(efficiency, 0.55, 1);
  }

  function scaleBeneficialEffects(effects, efficiency) {
    if (efficiency >= 0.999) return { ...effects };
    const scaled = {};
    Object.entries(effects).forEach(([metric, delta]) => {
      if (isBeneficialDelta(metric, delta)) {
        const value = Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) * efficiency));
        scaled[metric] = value;
      } else {
        scaled[metric] = delta;
      }
    });
    return scaled;
  }

  function isBeneficialDelta(metric, delta) {
    if (!delta) return false;
    const direction = METRIC_META[metric] && METRIC_META[metric].direction;
    if (direction === "good") return delta > 0;
    if (direction === "danger") return delta < 0;
    return false;
  }

  function resolveChoice(state, choiceId) {
    if (state.ended) return state;
    const event = getCurrentEvent(state);
    const choice = event.choices.find((item) => item.id === choiceId);
    if (!choice) throw new Error(`Unknown choice: ${choiceId}`);
    if (choice.available === false) return state;

    const routeKey = choice.strategyKey || choice.actionKey || choice.profile || choice.id || "";
    const routeTag = getChoiceRouteTag(choice);
    const before = snapshotValues(state);
    const dailyDelta = Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0]));
    const log = {
      day: state.day,
      phase: state.phase,
      title: event.title,
      choice: choice.label,
      routeKey,
      routeLabel: routeTag.label,
      routeTone: routeTag.tone,
      routeSource: choice.customChoice
        ? "eventChoice"
        : event.type === "buffer"
          ? "buffer"
          : event.type === "fallback"
            ? "fallback"
            : "actionChoice",
      notes: [],
      changes: {},
      breakdown: [],
    };
    const modifiers = {
      medicalRelief: 0,
      supplyRecovery: 0,
      transparencyBonus: 0,
      reopenBonus: 0,
      restPolicyBonus: 0,
      testingFocus: 0,
    };

    if (event.type === "buffer") {
      applyBufferChoice(state, choice.id, dailyDelta, log);
    } else if (choice.customChoice) {
      applyResourceEffects(state, choice.eventResources, log, "事件策略");
      applyEffects(state, choice.eventEffects, dailyDelta, log, "事件策略");
      applyHiddenEffects(state, choice.eventHidden, log, "事件策略");
      addModifiers(modifiers, choice.modifiers);
      if (choice.delayed) scheduleDelayedEffect(state, choice.delayed, event.title, choice.label);
      log.notes.push(...(choice.eventNotes || []));
    } else {
      const actionResult = computeActionResult(state, choice.actionKey);
      applyResourceEffects(state, actionResult.resources, log, "行动");
      applyEffects(state, actionResult.effects, dailyDelta, log, "行动");
      applyHiddenEffects(state, actionResult.hidden, log, "行动");
      addModifiers(modifiers, actionResult.modifiers);
      applyFlags(state, actionResult.flags);
      state.flags.actionUses[choice.actionKey] = (state.flags.actionUses[choice.actionKey] || 0) + 1;
      log.notes.push(...actionResult.notes);

      applyEffects(state, choice.eventEffects, dailyDelta, log, "事件");
      applyHiddenEffects(state, choice.eventHidden, log, "事件");
      if (choice.delayed) scheduleDelayedEffect(state, choice.delayed, event.title, choice.label);
      log.notes.push(...(choice.eventNotes || []));
    }

    applyDueDelayedEffects(state, dailyDelta, log);
    applyDailyResolution(state, dailyDelta, log, modifiers);
    applySoftDecay(state, log);
    clampAll(state);
    refreshStatusEffects(state);
    updateFailureStreaks(state);
    syncCityBadgeAchievements(state, log);

    log.changes = diffSnapshots(before, snapshotValues(state));
    compactBreakdown(log);
    state.history.unshift(log);
    state.history = state.history.slice(0, 24);

    clearCityActionUndo(state);
    checkEnding(state);
    if (!state.ended) {
      state.day += 1;
      state.news = generateNews(state);
      state.flags.cityActionsToday = 0;
      chooseNextEvent(state);
    }

    return state;
  }

  function executeOperation(state, operationId) {
    const status = getOperationStatus(state, operationId);
    if (!status.available) return state;
    const undo = createCityActionUndo(state, "operations", status);
    const before = snapshotValues(state);
    const dailyDelta = Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0]));
    const log = {
      day: state.day,
      phase: state.phase,
      title: "城市主动工程",
      choice: status.label,
      routeKey: operationId,
      routeLabel: getChoiceRouteTag({ id: operationId }).label,
      routeTone: getChoiceRouteTag({ id: operationId }).tone,
      routeSource: "operation",
      notes: [`地图节点：${getMapPoint(state, status.location).label}`, "工程即时生效，今日事件仍需处理", `今日调度额度：${(state.flags.cityActionsToday || 0) + 1}/${CITY_ACTIONS_PER_DAY}`],
      changes: {},
      breakdown: [],
    };
    const effects = status.effects || {};
    const hidden = status.hidden || {};

    applyResourceEffects(state, status.resources, log, "主动工程");
    applyEffects(state, effects, dailyDelta, log, "主动工程");
    applyHiddenEffects(state, hidden, log, "主动工程");
    state.flags.operationUses[operationId] = (state.flags.operationUses[operationId] || 0) + 1;
    state.flags.cityActionsToday = (state.flags.cityActionsToday || 0) + 1;
    state.flags.cityActionUndo = undo;
    if (status.delayed) scheduleDelayedEffect(state, status.delayed, "城市主动工程", status.label);

    clampAll(state);
    refreshStatusEffects(state);
    syncCityBadgeAchievements(state, log);
    log.changes = diffSnapshots(before, snapshotValues(state));
    compactBreakdown(log);
    state.history.unshift(log);
    state.history = state.history.slice(0, 24);
    return state;
  }

  function executeResolution(state, resolutionId) {
    const status = getResolutionStatus(state, resolutionId);
    if (!status.available) return state;
    const undo = createCityActionUndo(state, "resolutions", status);
    const before = snapshotValues(state);
    const dailyDelta = Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0]));
    const log = {
      day: state.day,
      phase: state.phase,
      title: "城市决议",
      choice: status.label,
      routeKey: resolutionId,
      routeLabel: getChoiceRouteTag({ id: resolutionId }).label,
      routeTone: getChoiceRouteTag({ id: resolutionId }).tone,
      routeSource: "resolution",
      notes: ["决议即时生效，今日事件仍需处理", `今日调度额度：${(state.flags.cityActionsToday || 0) + 1}/${CITY_ACTIONS_PER_DAY}`],
      changes: {},
      breakdown: [],
    };

    applyResourceEffects(state, status.resources, log, "城市决议");
    applyEffects(state, status.effects || {}, dailyDelta, log, "城市决议");
    applyHiddenEffects(state, status.hidden || {}, log, "城市决议");
    state.flags.resolutions[resolutionId] = true;
    state.flags.cityActionsToday = (state.flags.cityActionsToday || 0) + 1;
    state.flags.cityActionUndo = undo;
    if (status.delayed) scheduleDelayedEffect(state, status.delayed, "城市决议", status.label);

    clampAll(state);
    refreshStatusEffects(state);
    syncCityBadgeAchievements(state, log);
    log.changes = diffSnapshots(before, snapshotValues(state));
    compactBreakdown(log);
    state.history.unshift(log);
    state.history = state.history.slice(0, 24);
    return state;
  }

  function createCityActionUndo(state, mode, status) {
    const snapshot = clone(state);
    snapshot.flags = snapshot.flags || {};
    snapshot.flags.cityActionUndo = null;
    const pointId = status.location || state.selectedMapPointId || "hospital";
    const point = MAP_POINTS.find((item) => item.id === pointId) || MAP_POINTS[0];
    return {
      day: state.day,
      phase: state.phase,
      currentEventId: state.currentEventId || null,
      mode,
      actionId: status.id,
      label: status.label,
      pointId: point.id,
      pointLabel: point.label,
      snapshot,
    };
  }

  function validCityActionUndo(state, undo) {
    return Boolean(
      state
      && undo
      && undo.snapshot
      && undo.day === state.day
      && (undo.currentEventId || null) === (state.currentEventId || null)
      && (state.flags && (state.flags.cityActionsToday || 0) > 0)
      && !state.ended,
    );
  }

  function getCityActionUndo(state) {
    if (!validCityActionUndo(state, state && state.flags && state.flags.cityActionUndo)) return null;
    const undo = state.flags.cityActionUndo;
    return {
      day: undo.day,
      phase: undo.phase,
      mode: undo.mode,
      actionId: undo.actionId,
      label: undo.label,
      pointId: undo.pointId,
      pointLabel: undo.pointLabel,
      detail: `撤销“${undo.label}”，回到执行前的第 ${undo.day} 天状态。今日事件仍未处理。`,
    };
  }

  function clearCityActionUndo(state) {
    if (state && state.flags) state.flags.cityActionUndo = null;
  }

  function undoCityAction(state) {
    const undo = validCityActionUndo(state, state && state.flags && state.flags.cityActionUndo)
      ? state.flags.cityActionUndo
      : null;
    if (!undo) return false;
    const restored = clone(undo.snapshot);
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
    Object.assign(state, restored);
    state.flags = state.flags || {};
    state.flags.cityActionUndo = null;
    refreshStatusEffects(state);
    return true;
  }

  function syncCityBadgeAchievements(state, log = null) {
    if (!state || !state.flags) return [];
    const known = new Set(Array.isArray(state.flags.earnedBadgeIds) ? state.flags.earnedBadgeIds : []);
    const earned = getEarnedCityBadgeRows(state);
    const newlyEarned = earned.filter((item) => !known.has(item.id));
    state.flags.earnedBadgeIds = [...new Set([
      ...known,
      ...earned.map((item) => item.id),
    ])];
    if (log && newlyEarned.length) {
      log.cityBadges = newlyEarned.map((item) => ({
        id: item.id,
        label: item.label,
        category: item.category,
        tone: item.tone || "good",
        detail: item.detail,
      }));
      log.notes = log.notes || [];
      log.notes.push(`城市档案入档：${newlyEarned.map((item) => item.label).join("、")}`);
    }
    return newlyEarned;
  }

  function getEarnedCityBadgeRows(state) {
    return CITY_BADGE_RULES
      .filter((rule) => cityBadgeEarnedFast(rule.id, state))
      .map((rule) => ({
        id: rule.id,
        label: rule.label,
        category: rule.category,
        tone: rule.tone || "good",
        detail: rule.detail,
      }));
  }

  function cityBadgeEarnedFast(id, state) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const flags = state.flags || {};
    const operationUses = flags.operationUses || {};
    const resolutions = flags.resolutions || {};
    const completed = state.completedProjects || {};
    const history = state.history || [];
    if (id === "monitoring_net") {
      return h.detectedRate >= 70 && (completed.healthCode || (operationUses.campusSentinel || 0) > 0);
    }
    if (id === "medical_buffer") {
      return m.hospitalLoad <= 55 && (completed.shelterHospital || completed.triageNetwork || completed.communityClinic);
    }
    if (id === "supply_mesh") {
      return m.supplies >= 75
        && (completed.supplyCorridor || (operationUses.donationCoordination || 0) > 0 || (operationUses.microFreightPermit || 0) > 0);
    }
    if (id === "trusted_city") return m.trust >= 75 && h.publicMemory <= 35;
    if (id === "worker_breathing_room") return state.day >= 13 && m.staffFatigue <= 45;
    if (id === "fiscal_landing") return state.day >= 37 && m.economy >= 55 && r.funds >= 35;
    if (id === "low_spread_window") return state.day >= 13 && m.infection <= 35 && m.hospitalLoad <= 65;
    if (id === "memory_repair") {
      return state.day >= 37
        && h.publicMemory <= 18
        && (Boolean(resolutions.publicReviewBrief)
          || history.some((entry) => entry.routeLabel === "创伤修复" || entry.routeLabel === "公开修复"));
    }
    if (id === "mixed_governance") {
      const routeLabels = history.map((entry) => entry.routeLabel).filter(Boolean);
      return routeLabels.length >= 6 && new Set(routeLabels).size >= 4;
    }
    return false;
  }

  function snapshotValues(state) {
    return {
      ...state.metrics,
      ...state.hidden,
      ...state.resources,
    };
  }

  function diffSnapshots(before, after) {
    const result = {};
    Object.keys(after).forEach((key) => {
      const delta = after[key] - before[key];
      if (delta) result[key] = delta;
    });
    return result;
  }

  function recordBreakdown(log, source, metric, delta) {
    if (!log || !source || !metric || !delta) return;
    log.breakdown = log.breakdown || [];
    let row = log.breakdown.find((item) => item.source === source);
    if (!row) {
      row = { source, deltas: {}, weight: 0 };
      log.breakdown.push(row);
    }
    row.deltas[metric] = (row.deltas[metric] || 0) + delta;
    if (!row.deltas[metric]) delete row.deltas[metric];
    row.weight += Math.abs(delta) + (changeIsBad(metric, delta) ? 2 : 0);
  }

  function changeIsBad(metric, delta) {
    const meta = getObjectiveMeta(metric);
    if (!meta || !delta) return false;
    if (meta.direction === "good") return delta < 0;
    if (meta.direction === "danger") return delta > 0;
    return false;
  }

  function compactBreakdown(log) {
    if (!log || !Array.isArray(log.breakdown)) return;
    log.breakdown = log.breakdown
      .map((item) => ({
        source: item.source,
        deltas: removeZeroes(item.deltas || {}),
        weight: Math.round(item.weight || 0),
      }))
      .filter((item) => Object.keys(item.deltas).length)
      .sort((a, b) => b.weight - a.weight || a.source.localeCompare(b.source, "zh-Hans-CN"));
  }

  function getSettlementHighlights(entry) {
    if (!entry || !entry.changes) return [];
    const changes = settlementChangeRows(entry);
    const byScore = (a, b) => b.score - a.score || a.meta.short.localeCompare(b.meta.short, "zh-Hans-CN");
    const best = changes.filter((item) => !item.bad && !item.mixed).sort(byScore)[0];
    const cost = changes.filter((item) => item.bad).sort(byScore)[0];
    const hidden = changes.filter((item) => HIDDEN_METRICS.includes(item.metric)).sort(byScore)[0];
    const source = (entry.breakdown || [])[0];
    const highlights = [];
    if (entry.cityBadges && entry.cityBadges.length) {
      const badge = entry.cityBadges[0];
      highlights.push({
        id: "cityBadge",
        label: entry.cityBadges.length > 1 ? `城市入档 +${entry.cityBadges.length}` : "城市入档",
        tone: badge.tone || "good",
        detail: badge.label,
      });
    }
    if (best) {
      highlights.push({
        id: "benefit",
        label: "最大收益",
        tone: "good",
        detail: `${best.meta.short} ${signedDelta(best.delta)}`,
      });
    }
    if (cost) {
      highlights.push({
        id: "cost",
        label: "最大代价",
        tone: "warn",
        detail: `${cost.meta.short} ${signedDelta(cost.delta)}`,
      });
    }
    if (hidden && (!best || hidden.metric !== best.metric) && (!cost || hidden.metric !== cost.metric)) {
      const hiddenTone = hidden.bad ? "warn" : hidden.mixed ? "mixed" : "good";
      highlights.push({
        id: "hidden",
        label: "隐藏账",
        tone: hiddenTone,
        detail: `${hidden.meta.short} ${signedDelta(hidden.delta)}`,
      });
    }
    if (source) {
      const detail = Object.entries(source.deltas || {})
        .slice(0, 3)
        .map(([metric, delta]) => {
          const meta = getObjectiveMeta(metric);
          return `${meta.short} ${signedDelta(delta)}`;
        })
        .join("，");
      highlights.push({
        id: "source",
        label: "主要来源",
        tone: "info",
        detail: `${source.source}${detail ? `：${detail}` : ""}`,
      });
    }
    return highlights.slice(0, 4);
  }

  function settlementChangeRows(entry) {
    if (!entry || !entry.changes) return [];
    return Object.entries(entry.changes)
      .filter(([, delta]) => delta)
      .map(([metric, delta]) => {
        const meta = getObjectiveMeta(metric);
        const bad = changeIsBad(metric, delta);
        const mixed = meta.direction === "mixed";
        return {
          metric,
          delta,
          meta,
          bad,
          mixed,
          score: Math.abs(delta)
            + (bad ? 8 : 0)
            + (CORE_METRICS.includes(metric) || RESOURCE_METRICS.includes(metric) ? 3 : 0),
        };
      });
  }

  function getSettlementNarrative(entry) {
    if (!entry) return null;
    const changes = settlementChangeRows(entry);
    const byScore = (a, b) => b.score - a.score || a.meta.short.localeCompare(b.meta.short, "zh-Hans-CN");
    const best = changes.filter((item) => !item.bad && !item.mixed).sort(byScore)[0];
    const cost = changes.filter((item) => item.bad).sort(byScore)[0];
    const source = (entry.breakdown || [])
      .filter((item) => item && item.source && item.deltas && Object.keys(item.deltas).length)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    const sourceText = source ? `主要由“${source.source}”推动` : "本日结算已经完成";
    const parts = [];
    if (best) parts.push(`收益是${best.meta.short} ${signedDelta(best.delta)}`);
    if (cost) parts.push(`代价是${cost.meta.short} ${signedDelta(cost.delta)}`);
    if (!parts.length && changes[0]) parts.push(`${changes[0].meta.short} ${signedDelta(changes[0].delta)}`);
    if (!parts.length) return null;
    const tone = cost && (!best || cost.score >= best.score) ? "warn" : best ? "good" : "info";
    return {
      id: "settlementNarrative",
      tone,
      label: "结算主因",
      detail: `${sourceText}，${parts.join("，")}。`,
    };
  }

  function getSettlementReview(entry) {
    if (!entry || !entry.changes) return null;
    const changes = settlementChangeRows(entry);
    if (!changes.length) return null;
    const byScore = (a, b) => b.score - a.score || a.meta.short.localeCompare(b.meta.short, "zh-Hans-CN");
    const gains = changes.filter((item) => !item.bad && !item.mixed).sort(byScore);
    const costs = changes.filter((item) => item.bad).sort(byScore);
    const mixed = changes.filter((item) => item.mixed).sort(byScore);
    const gainScore = gains.reduce((sum, item) => sum + item.score, 0);
    const costScore = costs.reduce((sum, item) => sum + item.score, 0);
    const topGain = gains[0] || null;
    const topCost = costs[0] || null;
    const source = (entry.breakdown || [])
      .filter((item) => item && item.source && item.deltas && Object.keys(item.deltas).length)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    const relief = gains.some((item) => ["infection", "hospitalLoad"].includes(item.metric));
    const recovery = gains.some((item) => ["funds", "economy"].includes(item.metric));
    const socialCost = costs.some((item) => ["trust", "economy", "staffFatigue", "publicMemory", "funds", "supplies", "infection"].includes(item.metric));

    let label = "温和波动";
    let tone = "info";
    let detail = "今日变化较分散，继续观察下一天的压力方向。";
    if (relief && socialCost) {
      label = "短期止血";
      tone = "mixed";
      detail = `压住了${topGain ? topGain.meta.short : "关键风险"}，但代价转向${topCost ? topCost.meta.short : "其他系统"}。`;
    } else if (recovery && socialCost) {
      label = "恢复换账";
      tone = "mixed";
      detail = `恢复面有收益，但${topCost ? topCost.meta.short : "风险"}正在积累，后续需要配套承接。`;
    } else if (costScore > gainScore * 1.25 && costs.length) {
      label = "系统承压";
      tone = "danger";
      detail = `代价集中在${topCost ? topCost.meta.short : "关键指标"}，需要下一步优先修补。`;
    } else if (gainScore > costScore * 1.25 && gains.length) {
      label = "稳步改善";
      tone = "good";
      detail = `主要改善来自${topGain ? topGain.meta.short : "关键指标"}，当前没有同等规模的反向代价。`;
    } else if (gains.length && costs.length) {
      label = "风险转移";
      tone = "warn";
      detail = `改善 ${gains.length} 项、代价 ${costs.length} 项，重点盯住${topCost ? topCost.meta.short : "后续压力"}。`;
    } else if (mixed.length && !gains.length && !costs.length) {
      label = "口径调整";
      tone = "info";
      detail = `变化主要落在${mixed[0].meta.short}等双向指标上，需要结合当前目标判断好坏。`;
    }

    const items = [];
    if (topGain) {
      items.push({
        id: "gain",
        tone: "good",
        label: "主要收益",
        detail: `${topGain.meta.short} ${signedDelta(topGain.delta)}`,
      });
    }
    if (topCost) {
      items.push({
        id: "cost",
        tone: "danger",
        label: "主要代价",
        detail: `${topCost.meta.short} ${signedDelta(topCost.delta)}`,
      });
    }
    if (entry.routeLabel) {
      items.push({
        id: "route",
        tone: entry.routeTone || "info",
        label: "路线",
        detail: entry.routeLabel,
      });
    }
    if (source) {
      items.push({
        id: "source",
        tone: "info",
        label: "来源",
        detail: source.source,
      });
    }

    return {
      id: "settlementReview",
      tone,
      label,
      detail,
      items: items.slice(0, 4),
    };
  }

  function getHistoryEntryMeta(entry = {}) {
    const source = entry.routeSource || "";
    const routeLabel = entry.routeLabel || "综合路线";
    const routeTone = entry.routeTone || "info";
    if (source === "operation") {
      return {
        id: "operation",
        label: "最新行动",
        sourceLabel: "工程",
        routeLabel,
        status: "即时生效",
        tone: routeTone,
        detail: "工程已经生效，但今日事件仍未处理，日期不会因此推进。",
      };
    }
    if (source === "resolution") {
      return {
        id: "resolution",
        label: "最新行动",
        sourceLabel: "决议",
        routeLabel,
        status: "即时生效",
        tone: routeTone,
        detail: "决议已经生效，但今日事件仍未处理，日期不会因此推进。",
      };
    }
    if (source === "buffer") {
      return {
        id: "buffer",
        label: "阶段复盘",
        sourceLabel: "缓冲选择",
        routeLabel,
        status: "阶段结算",
        tone: routeTone,
        detail: "阶段缓冲选择会修补短板，同时把代价转移到另一个系统。",
      };
    }
    return {
      id: source || "event",
      label: "最新结算",
      sourceLabel: source === "fallback" ? "滚动简报" : "事件选择",
      routeLabel,
      status: "日期推进",
      tone: routeTone,
      detail: "事件选择完成当天结算，并推进到下一天。",
    };
  }

  function addModifiers(target, incoming = {}) {
    Object.entries(incoming).forEach(([key, value]) => {
      target[key] = (target[key] || 0) + value;
    });
  }

  function applyFlags(state, flags = {}) {
    if (!flags) return;
    Object.entries(flags).forEach(([key, value]) => {
      state.flags[key] = (state.flags[key] || 0) + value;
    });
  }

  function scheduleDelayedEffect(state, delayed, eventTitle, choiceLabel) {
    state.pendingEffects.push({
      dueDay: state.day + delayed.delay,
      label: delayed.label,
      eventTitle,
      choiceLabel,
      effects: delayed.effects || {},
      hidden: delayed.hidden || {},
      resources: delayed.resources || {},
      completeProject: delayed.completeProject || null,
      condition: delayed.condition || null,
    });
  }

  function applyDueDelayedEffects(state, dailyDelta, log) {
    const due = state.pendingEffects.filter((item) => item.dueDay <= state.day);
    const remaining = state.pendingEffects.filter((item) => item.dueDay > state.day);
    state.pendingEffects = remaining;
    due.forEach((item) => {
      if (!conditionMet(state, item.condition)) {
        log.notes.push(`“${item.eventTitle}”的后续风险未触发：${item.label}`);
        return;
      }
      applyEffects(state, item.effects, dailyDelta, log, `延迟：${item.label}`);
      applyHiddenEffects(state, item.hidden, log, `延迟：${item.label}`);
      applyResourceEffects(state, item.resources, log, `延迟：${item.label}`);
      if (item.completeProject) {
        state.completedProjects[item.completeProject] = true;
        log.notes.push(`项目完成：${item.label}`);
      }
      log.notes.push(`“${item.eventTitle}”的后续影响显现：${item.label}`);
    });
  }

  function conditionMet(state, condition) {
    if (!condition) return true;
    if (condition === "staffFatigueAbove80") return state.metrics.staffFatigue > 80;
    if (condition === "staffFatigueAbove75") return state.metrics.staffFatigue > 75;
    if (condition === "trustBelow40") return state.metrics.trust < 40;
    if (condition === "trustBelow45") return state.metrics.trust < 45;
    if (condition === "trustAtLeast55") return state.metrics.trust >= 55;
    if (condition === "trustAtLeast60") return state.metrics.trust >= 60;
    if (condition === "hospitalAtLeast80") return state.metrics.hospitalLoad >= 80;
    if (condition === "hospitalAbove85") return state.metrics.hospitalLoad > 85;
    if (condition === "suppliesBelow25") return state.metrics.supplies < 25;
    if (condition === "detectedBelow50") return state.hidden.detectedRate < 50;
    if (condition === "detectedAtLeast50") return state.hidden.detectedRate >= 50;
    if (condition === "fundsBelow20") return state.resources.funds < 20;
    if (condition === "economyBelow40") return state.metrics.economy < 40;
    return true;
  }

  function conditionPreviewLabel(condition) {
    const labels = {
      staffFatigueAbove80: "疲劳>80",
      staffFatigueAbove75: "疲劳>75",
      trustBelow40: "信任<40",
      trustBelow45: "信任<45",
      trustAtLeast55: "信任≥55",
      trustAtLeast60: "信任≥60",
      hospitalAtLeast80: "医疗≥80",
      hospitalAbove85: "医疗>85",
      suppliesBelow25: "物资<25",
      detectedBelow50: "发现<50",
      detectedAtLeast50: "发现≥50",
      fundsBelow20: "资金<20",
      economyBelow40: "活力<40",
    };
    return labels[condition] || "满足条件";
  }

  function delayedPreviewText(delayed) {
    const condition = delayed.condition ? `（条件：${conditionPreviewLabel(delayed.condition)}）` : "";
    return `${delayed.delay}日后：${delayed.label}${condition}`;
  }

  function applyEffects(state, effects = {}, dailyDelta, log, source) {
    Object.entries(effects || {}).forEach(([metric, delta]) => {
      if (!CORE_METRICS.includes(metric) || !delta) return;
      const remainingCap = delta > 0
        ? DAILY_CORE_CAP - dailyDelta[metric]
        : -DAILY_CORE_CAP - dailyDelta[metric];
      const cappedDelta = clamp(delta, Math.min(0, remainingCap), Math.max(0, remainingCap));
      const before = state.metrics[metric];
      const after = boundedMetricValue(metric, before + cappedDelta);
      const actual = after - before;
      state.metrics[metric] = after;
      dailyDelta[metric] += actual;
      recordBreakdown(log, source, metric, actual);
      if (actual !== delta) {
        log.notes.push(`${source}对${METRIC_META[metric].short}的影响被单日上限或边界吸收`);
      }
    });
  }

  function applyHiddenEffects(state, hidden = {}, log, source) {
    Object.entries(hidden || {}).forEach(([metric, delta]) => {
      if (!HIDDEN_METRICS.includes(metric) || !delta) return;
      const before = state.hidden[metric];
      state.hidden[metric] = boundedMetricValue(metric, before + delta);
      recordBreakdown(log, source, metric, state.hidden[metric] - before);
      if (state.hidden[metric] !== before + delta) {
        log.notes.push(`${source}对${METRIC_META[metric].short}的影响被边界吸收`);
      }
    });
  }

  function applyResourceEffects(state, resources = {}, log, source) {
    Object.entries(resources || {}).forEach(([metric, delta]) => {
      if (!RESOURCE_METRICS.includes(metric) || !delta) return;
      const before = state.resources[metric];
      state.resources[metric] = boundedMetricValue(metric, before + delta);
      recordBreakdown(log, source, metric, state.resources[metric] - before);
      if (state.resources[metric] !== before + delta) {
        log.notes.push(`${source}对${RESOURCE_META[metric].short}的影响被边界吸收`);
      }
    });
  }

  function signedDelta(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function componentTone(value, zeroTone = "info") {
    if (value > 0) return "good";
    if (value < 0) return "warn";
    return zeroTone;
  }

  function getMicroRecoveryAssets(state) {
    const operationUses = state.flags.operationUses || {};
    const completed = state.completedProjects || {};
    return [
      operationUses.essentialServicePermit && "民生服务保留名录",
      operationUses.contactlessLivelihoodStalls && "无接触民生摊点",
      operationUses.neighborhoodPickupWindow && "社区预约取货",
      operationUses.onlineVendorDesk && "线上摊位登记台",
      operationUses.neighborhoodErrandRoster && "楼栋错峰服务单",
      operationUses.neighborhoodCommerceLedger && "社区团购结算台",
      operationUses.onlineGovOvertime && "线上政务加班窗口",
      operationUses.remoteApprovalDesk && "线上预审窗口",
      operationUses.microEnterpriseRoster && "小微主体保留名册",
      operationUses.remoteWorkGovServices && "线上政务与远程办公",
      operationUses.serviceVoucherPilot && "民生服务券试点",
      operationUses.essentialMaintenanceRoster && "必要维修预约窗",
      operationUses.communityRepairWhitelist && "社区维修白名单",
      operationUses.closedLoopSmallShift && "保供工厂闭环小班",
      operationUses.contactlessServiceRegistry && "无接触商铺备案",
      operationUses.microFreightPermit && "货运微循环许可",
      completed.supplyCorridor && "保供专线",
    ].filter(Boolean);
  }

  function getContinuityCareRelief(state) {
    const m = state.metrics;
    if (getMicroRecoveryAssets(state).length < 4) return 0;
    if (m.economy < 50 || m.supplies < 50 || m.hospitalLoad < 70) return 0;
    return 1;
  }

  function calculateEconomyOutlook(state, modifiers = {}) {
    const m = state.metrics;
    const h = state.hidden;
    const components = [];
    const add = (id, label, value, detail) => {
      if (!value) return;
      components.push({ id, label, value, tone: componentTone(value), detail });
    };
    const controlledRecovery = m.infection < 45 && h.policyStrictness <= 45 && m.economy < 55 ? 1 : 0;
    const highTrustRecovery = m.trust >= 75 && m.infection < 60 && h.policyStrictness <= 55 && m.economy < 65 ? 1 : 0;
    const microRecoveryAssets = getMicroRecoveryAssets(state);
    const microRecovery = microRecoveryAssets.length >= 2
      && m.infection < 60
      && h.policyStrictness <= 65
      && m.economy < 65
      && m.staffFatigue < 78
      ? 1
      : 0;
    const microRecoveryNetwork = microRecoveryAssets.length >= 4
      && m.infection < 55
      && h.policyStrictness <= 60
      && m.economy < 60
      && m.staffFatigue < 75
      ? 1
      : 0;
    add("reopenBonus", "复工动能", modifiers.reopenBonus || 0, "今日选择或工程带来的恢复加成。");
    add("controlledRecovery", "低传播微复苏", controlledRecovery, "感染和管控都不高时，城市会自然找回少量活力。");
    add("highTrustRecovery", "高信任协作", highTrustRecovery, "信任高位时，恢复安排更容易落地。");
    add("microRecoveryAssets", "微循环资产", microRecovery, microRecoveryAssets.length ? `生效资产：${microRecoveryAssets.slice(0, 3).join("、")}。` : "低流动复业和线上政务尚未形成合力。");
    add("microRecoveryNetwork", "微循环网络", microRecoveryNetwork, microRecoveryAssets.length >= 4 ? `已有 ${microRecoveryAssets.length} 个低流动恢复节点，城市活力开始形成稳定回流。` : "微循环资产不足四个时，只能提供零散恢复。");
    add("policyDrag", "管控拖慢", -Math.round(h.policyStrictness / 25), "管控越强，物流、就业和消费越难自然恢复。");
    add("infectionDrag", "感染拖慢", m.infection >= 55 ? -1 : 0, "感染压力高位会压住复业与出行。");
    add("hospitalDrag", "医疗挤压", m.hospitalLoad >= 80 ? -1 : 0, "医疗高压会挤占城市恢复资源。");
    add("trustDrag", "低信任摩擦", m.trust < 30 ? -1 : 0, "低信任会让恢复安排产生额外执行摩擦。");
    add("hardControlDrag", "高压管控", h.policyStrictness >= 80 ? -1 : 0, "高压管控能止血，但会继续损伤活力。");
    add("openFlow", "流动恢复", h.policyStrictness <= 15 ? 1 : 0, "管控低位时，城市流动自然回升。");
    const delta = components.reduce((sum, item) => sum + item.value, 0);
    return { delta, components };
  }

  function calculateFiscalOutlook(state) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const operationUses = state.flags.operationUses || {};
    const completed = state.completedProjects || {};
    const components = [];
    const add = (id, label, value, detail) => {
      if (!value) return;
      components.push({ id, label, value, tone: componentTone(value), detail });
    };
    const fiscalBase = m.economy >= 75 && r.funds <= 65
      ? 1
      : m.economy >= 60 && r.funds <= 45
        ? 1
        : m.economy >= 50 && r.funds <= 40
          ? 1
          : 0;
    const trustPremium = m.trust >= 72 && m.economy >= 60 && r.funds <= 50 ? 1 : 0;
    const assetSources = [
      [operationUses.fiscalTransparencyLedger && m.trust >= 55 && r.funds <= 55, "财政透明台账"],
      [operationUses.emergencyGapLedger && m.trust >= 50 && r.funds <= 55, "应急缺口清单"],
      [operationUses.budgetFreezeReview && r.funds <= 52, "非急预算冻结评审"],
      [operationUses.fastGrantReport && m.trust >= 50 && r.funds <= 55, "专项资金快报"],
      [operationUses.bankCreditWindow && m.trust >= 45 && r.funds <= 55, "银行临时授信窗口"],
      [operationUses.insurancePreSettlement && m.hospitalLoad <= 82 && r.funds <= 55, "医保预结算窗口"],
      [operationUses.publicDonationDrive && m.trust >= 50 && r.funds <= 60, "公开募捐专户"],
      [operationUses.donationClaimList && m.trust >= 50 && r.funds <= 55, "捐助认领清单"],
      [operationUses.donationCoordination && m.trust >= 50 && r.funds <= 55, "社会捐助统筹"],
      [operationUses.platformLogisticsShare && m.supplies >= 55 && r.funds <= 50, "平台运力共担"],
      [operationUses.interProvinceSupport && m.supplies >= 55 && r.funds <= 55, "省际支援协调"],
      [operationUses.factoryClosedLoop && m.economy >= 58 && r.funds <= 60, "工厂闭环复工"],
      [operationUses.emergencyAccountClearing && m.trust >= 50 && r.funds <= 50, "小额账款清分"],
      [operationUses.microEnterpriseRoster && m.economy >= 52 && r.funds <= 50, "小微主体保留名册"],
      [operationUses.essentialServicePermit && m.economy >= 55 && r.funds <= 45, "民生服务保留名录"],
      [operationUses.contactlessLivelihoodStalls && m.economy >= 52 && r.funds <= 45, "无接触民生摊点"],
      [operationUses.neighborhoodPickupWindow && m.economy >= 52 && r.funds <= 45, "社区预约取货"],
      [operationUses.onlineVendorDesk && m.economy >= 52 && r.funds <= 45, "线上摊位登记台"],
      [operationUses.neighborhoodErrandRoster && m.economy >= 52 && r.funds <= 45, "楼栋错峰服务单"],
      [operationUses.neighborhoodCommerceLedger && m.economy >= 52 && r.funds <= 50, "社区团购结算台"],
      [operationUses.onlineGovOvertime && m.economy >= 52 && r.funds <= 50, "线上政务加班窗口"],
      [operationUses.remoteApprovalDesk && m.economy >= 52 && r.funds <= 50, "线上预审窗口"],
      [operationUses.essentialMaintenanceRoster && m.economy >= 52 && r.funds <= 45, "必要维修预约"],
      [operationUses.communityRepairWhitelist && m.trust >= 55 && r.funds <= 45, "社区维修白名单"],
      [operationUses.remoteWorkGovServices && m.economy >= 55 && r.funds <= 45, "线上政务与远程办公"],
      [operationUses.serviceVoucherPilot && m.economy >= 55 && r.funds <= 45, "民生服务券试点"],
      [completed.supplyCorridor && m.supplies >= 60 && r.funds <= 55, "保供专线"],
    ];
    const activeAssets = assetSources.filter(([active]) => active).map(([, label]) => label);
    const bridgeCap = activeAssets.length >= 3 && r.funds <= 30 && m.trust >= 45 ? 3 : 2;
    const assetYield = clamp(activeAssets.length, 0, bridgeCap);
    const rawGain = fiscalBase + trustPremium + assetYield;
    const cappedGain = clamp(rawGain, 0, bridgeCap);
    add("fiscalBase", "活力税基", fiscalBase, "活力足够且资金偏低时，会产生少量自然回流。");
    add("trustPremium", "信任协作", trustPremium, "高信任能降低协调成本，形成小额现金流。");
    add("assetYield", "恢复资产", assetYield, activeAssets.length ? `生效资产：${activeAssets.slice(0, 3).join("、")}。${bridgeCap > 2 ? "低资金下已形成周转网络。" : ""}` : "财政、捐助和微复苏资产尚未形成回流。");
    add("dailyCap", "每日回流上限", cappedGain - rawGain, `财政自然回流每日最多计入 ${bridgeCap} 点，避免资金滚雪球。`);
    add("economyLeak", "活力低位漏损", m.economy <= 25 ? -1 : 0, "活力过低会让财政自我修复能力下降。");
    add("hospitalLeak", "医疗高压账单", m.hospitalLoad >= 85 ? -1 : 0, "医疗红线会持续占用现金流。");
    add("controlLeak", "高压管控账单", h.policyStrictness >= 80 ? -1 : 0, "高压管控会带来额外组织成本。");
    add("trustLeak", "信任崩裂摩擦", m.trust < 25 ? -1 : 0, "低信任会让财政协作和执行成本变高。");
    add("reserveLeak", "储备占用", r.funds > 85 ? -1 : 0, "资金过高时会被未结账项和库存占用吸收。");
    const delta = components.reduce((sum, item) => sum + item.value, 0);
    return { delta, components, activeAssets };
  }

  function canPay(state, resources = {}) {
    return Object.entries(resources || {}).every(([metric, delta]) => {
      if (!RESOURCE_METRICS.includes(metric) || delta >= 0) return true;
      return state.resources[metric] + delta >= 0;
    });
  }

  function applyDailyResolution(state, dailyDelta, log, modifiers) {
    const m = state.metrics;
    const h = state.hidden;
    let phasePressure = PHASE_PRESSURE[state.phase - 1] || 1;
    if (m.infection > 85) phasePressure -= 1;

    const mobilityPressure = Math.round(m.economy / 30) - Math.round(h.policyStrictness / 25);
    const controlEffect = Math.round(h.policyStrictness / 20) + Math.round(m.trust / 35);
    let detectionEffect = h.detectedRate >= 60 ? 1 : 0;
    if (state.completedProjects.healthCode && h.detectedRate >= 55) detectionEffect += 1;
    const fatiguePenalty = m.staffFatigue >= 75 ? 2 : m.staffFatigue >= 60 ? 1 : 0;
    const trustPenalty = m.trust < 30 ? 2 : m.trust < 45 ? 1 : 0;
    const strictControlEffect = h.policyStrictness >= 80 ? 1 : 0;
    const openFlowPressure = h.policyStrictness <= 15 ? 1 : 0;
    const microFlowPressure = getMicroRecoveryAssets(state).length >= 2 && h.detectedRate < 70 && m.infection >= 45 ? 1 : 0;
    const infectionDelta = clamp(
      phasePressure + mobilityPressure - controlEffect - detectionEffect - strictControlEffect + openFlowPressure + microFlowPressure + fatiguePenalty + trustPenalty,
      -6,
      7,
    );
    applyEffects(state, { infection: infectionDelta }, dailyDelta, log, "每日疫情");

    const hospitalSurgePenalty = state.metrics.infection >= 70 && state.hidden.detectedRate < 85 ? 1 : 0;
    const hospitalDelta = Math.round(state.metrics.infection / 22)
      - modifiers.medicalRelief
      - getContinuityCareRelief(state)
      - (state.completedProjects.triageNetwork ? 1 : 0)
      - (state.completedProjects.communityClinic ? 1 : 0)
      + (state.metrics.supplies < 30 ? 1 : 0)
      + (state.metrics.staffFatigue > 75 ? 1 : 0)
      + (state.metrics.infection >= 80 ? 1 : 0)
      + hospitalSurgePenalty;
    applyEffects(state, { hospitalLoad: hospitalDelta }, dailyDelta, log, "医疗联动");

    let supplyRecovery = 1 + modifiers.supplyRecovery;
    if (state.metrics.economy < 30) supplyRecovery -= 1;
    if (state.metrics.economy >= 75) supplyRecovery += 1;
    if (state.completedProjects.supplyCorridor) supplyRecovery += 1;
    const stockRotationCost = state.metrics.supplies >= 90 ? 1 : 0;
    const suppliesDelta = supplyRecovery
      + (state.metrics.economy >= 60 ? 1 : 0)
      - Math.round(state.hidden.policyStrictness / 35)
      - (state.metrics.hospitalLoad >= 75 ? 1 : 0)
      - (state.metrics.staffFatigue >= 70 ? 1 : 0)
      - stockRotationCost;
    applyEffects(state, { supplies: suppliesDelta }, dailyDelta, log, "供应联动");

    const strictTrustCost = state.hidden.policyStrictness >= 75
      ? (state.metrics.supplies >= 75 ? 0 : 1)
      : 0;
    const supplyTrustBonus = state.metrics.supplies >= 80 && state.metrics.trust < 80 ? 1 : 0;
    const expectationCost = state.metrics.trust >= 92
      && (state.metrics.infection >= 45 || state.metrics.hospitalLoad >= 45 || state.hidden.publicMemory >= 20)
      ? 2
      : 0;
    const trustDelta = modifiers.transparencyBonus
      + supplyTrustBonus
      - (state.metrics.hospitalLoad >= 80 ? 2 : 0)
      - (state.metrics.supplies < 30 ? 2 : 0)
      - strictTrustCost
      - expectationCost
      - (state.hidden.publicMemory >= 60 ? 1 : 0);
    applyEffects(state, { trust: trustDelta }, dailyDelta, log, "信任联动");

    const economyDelta = calculateEconomyOutlook(state, modifiers).delta;
    applyEffects(state, { economy: economyDelta }, dailyDelta, log, "活力联动");

    const fatigueBase = state.metrics.staffFatigue >= 70 ? 1 : 2;
    const fatigueDelta = fatigueBase
      + Math.round(state.hidden.policyStrictness / 25)
      + (state.metrics.hospitalLoad >= 75 ? 1 : 0)
      + (state.metrics.supplies < 30 ? 1 : 0)
      + (state.hidden.policyStrictness >= 80 ? 1 : 0)
      + (state.metrics.staffFatigue <= 25 && (state.metrics.infection >= 45 || state.metrics.hospitalLoad >= 45 || state.hidden.policyStrictness >= 35) ? 1 : 0)
      - modifiers.restPolicyBonus
      - (state.metrics.trust >= 70 ? 1 : 0);
    applyEffects(state, { staffFatigue: fatigueDelta }, dailyDelta, log, "执行联动");

    if (state.metrics.staffFatigue >= 86) {
      applyEffects(state, {
        staffFatigue: -8,
        hospitalLoad: 3,
        supplies: -2,
        trust: -3,
        economy: -1,
      }, dailyDelta, log, "执行熔断");
      applyHiddenEffects(state, { publicMemory: 1 }, log, "执行熔断");
      log.notes.push("执行熔断：基层系统自动降速，疲劳得到短暂缓冲，但服务能力和公众耐心被转移消耗");
    }

    const fundsDelta = calculateFiscalOutlook(state).delta;
    applyResourceEffects(state, { funds: fundsDelta }, log, "财政联动");

    if (state.metrics.hospitalLoad >= 85) {
      applyEffects(state, { trust: -2 }, dailyDelta, log, "医疗红线");
      applyHiddenEffects(state, { publicMemory: 2 }, log, "医疗红线");
    }
    if (state.metrics.supplies < 25) {
      applyEffects(state, { trust: -2, staffFatigue: 1 }, dailyDelta, log, "供应低位");
    }

    if (state.metrics.staffFatigue >= 80 || state.metrics.supplies < 25) {
      applyHiddenEffects(state, { detectedRate: -1 }, log, "系统磨损");
    }

    if (state.hidden.detectedRate > 85 && !modifiers.testingFocus) {
      applyHiddenEffects(state, { detectedRate: -1 }, log, "检测网络维护");
    }

    log.notes.push(`疫情公式：${infectionDelta > 0 ? "+" : ""}${infectionDelta}，医疗联动：${hospitalDelta > 0 ? "+" : ""}${hospitalDelta}`);
  }

  function applySoftDecay(state, log) {
    if (state.hidden.policyStrictness > 20) {
      const decay = state.hidden.policyStrictness > 70 ? -2 : -1;
      const before = state.hidden.policyStrictness;
      state.hidden.policyStrictness = boundedMetricValue("policyStrictness", before + decay);
      recordBreakdown(log, "压力回落", "policyStrictness", state.hidden.policyStrictness - before);
    } else if (state.hidden.policyStrictness < 15) {
      const before = state.hidden.policyStrictness;
      state.hidden.policyStrictness = boundedMetricValue("policyStrictness", state.hidden.policyStrictness + 1);
      recordBreakdown(log, "流动回补", "policyStrictness", state.hidden.policyStrictness - before);
    }
    if (state.hidden.detectedRate >= 80 && state.metrics.staffFatigue >= 75 && state.metrics.staffFatigue < 80) {
      const before = state.hidden.detectedRate;
      state.hidden.detectedRate = boundedMetricValue("detectedRate", state.hidden.detectedRate - 1);
      recordBreakdown(log, "检测网络维护", "detectedRate", state.hidden.detectedRate - before);
      log.notes.push("检测网络在疲劳高位下轻微损耗");
    }
  }

  function applyBufferChoice(state, choiceId, dailyDelta, log) {
    if (choiceId === "claimStageMomentum") {
      const reward = getStageMomentumReward(state);
      applyResourceEffects(state, reward.resources, log, "阶段余裕");
      applyEffects(state, reward.effects, dailyDelta, log, "阶段余裕");
      applyHiddenEffects(state, reward.hidden, log, "阶段余裕");
      log.notes.push(reward.available ? reward.detail : "阶段余裕不足，未获得额外奖励。");
      return;
    }

    if (choiceId === "repairWorst") {
      const worst = findWorstMetric(state);
      const sacrifice = findSacrificeMetric(state, worst.metric);
      const repair = {};
      const cost = {};
      repair[worst.metric] = METRIC_META[worst.metric].direction === "danger" ? -8 : 8;
      cost[sacrifice] = METRIC_META[sacrifice].direction === "danger" ? 6 : -6;
      applyEffects(state, repair, dailyDelta, log, "阶段托底");
      applyEffects(state, cost, dailyDelta, log, "阶段托底代价");
      applyHiddenEffects(state, { publicMemory: 1 }, log, "阶段复盘");
      log.notes.push(`托底对象：${METRIC_META[worst.metric].label}；代价落在${METRIC_META[sacrifice].label}`);
      return;
    }

    if (choiceId === "releasePressure") {
      applyEffects(state, {
        trust: 5,
        staffFatigue: -5,
        economy: 2,
        infection: 3,
      }, dailyDelta, log, "释放压力");
      applyHiddenEffects(state, { policyStrictness: -8, publicMemory: -1 }, log, "释放压力");
      log.notes.push("城市用更可解释的节奏换取恢复空间");
      return;
    }

    if (choiceId === "concentrateResources") {
      applyEffects(state, {
        infection: -4,
        hospitalLoad: -3,
        supplies: -5,
        economy: -4,
        staffFatigue: 5,
      }, dailyDelta, log, "集中资源");
      applyHiddenEffects(state, { policyStrictness: 6, publicMemory: 1 }, log, "集中资源");
      log.notes.push("防疫资源重新集中，其他系统继续承压");
    }
  }

  function findWorstMetric(state) {
    const scores = CORE_METRICS.map((metric) => {
      const direction = METRIC_META[metric].direction;
      const value = state.metrics[metric];
      const danger = direction === "danger" ? value : 100 - value;
      return { metric, danger };
    });
    scores.sort((a, b) => b.danger - a.danger);
    return scores[0];
  }

  function findSacrificeMetric(state, exclude) {
    const candidates = CORE_METRICS.filter((metric) => metric !== exclude).map((metric) => {
      const direction = METRIC_META[metric].direction;
      const value = state.metrics[metric];
      const safety = direction === "danger" ? 100 - value : value;
      return { metric, safety };
    }).sort((a, b) => b.safety - a.safety);
    return candidates[0].metric;
  }

  function clampAll(state) {
    CORE_METRICS.forEach((metric) => {
      state.metrics[metric] = boundedMetricValue(metric, state.metrics[metric]);
    });
    HIDDEN_METRICS.forEach((metric) => {
      state.hidden[metric] = boundedMetricValue(metric, state.hidden[metric]);
    });
    RESOURCE_METRICS.forEach((metric) => {
      state.resources[metric] = boundedMetricValue(metric, state.resources[metric]);
    });
  }

  function updateFailureStreaks(state) {
    const limit = getFailureLimit(state);
    const streaks = state.flags.failureStreaks;
    streaks.medical = state.metrics.hospitalLoad >= 95 ? streaks.medical + 1 : 0;
    streaks.supply = state.metrics.supplies < 15 ? streaks.supply + 1 : 0;
    streaks.trust = state.metrics.trust < 20 ? streaks.trust + 1 : 0;
    streaks.staff = state.metrics.staffFatigue > 90 ? streaks.staff + 1 : 0;

    state.alerts = [];
    if (state.metrics.hospitalLoad >= 95) state.alerts.push(`医疗挤兑倒计时：${streaks.medical}/${limit}`);
    if (state.metrics.supplies < 15) state.alerts.push(`供应断裂倒计时：${streaks.supply}/${limit}`);
    if (state.metrics.trust < 20) state.alerts.push(`信任崩塌倒计时：${streaks.trust}/${limit}`);
    if (state.metrics.staffFatigue > 90) state.alerts.push(`执行失灵倒计时：${streaks.staff}/${limit}`);
    if (state.metrics.infection >= 80) state.alerts.push("社区扩散：医疗负载将额外承压");
    if (state.resources.funds <= 10) state.alerts.push("财政透支：高价工程和决议被锁定");
    if (state.hidden.detectedRate <= 35) state.alerts.push("信息盲区：报告感染压力误差扩大");
    if (state.hidden.policyStrictness >= 80) state.alerts.push("高压管控：感染压制增强，但活力和疲劳代价上升");
    if (state.hidden.publicMemory >= 60) state.alerts.push("长期伤痕：信任恢复会持续变慢");
  }

  function getFailureLimit(state) {
    return (DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal).failureLimit;
  }

  function checkEnding(state) {
    const limit = getFailureLimit(state);
    const streaks = state.flags.failureStreaks;
    if (streaks.medical >= limit) return endGame(state, "medicalCollapse");
    if (streaks.supply >= limit) return endGame(state, "supplyCollapse");
    if (streaks.trust >= limit) return endGame(state, "trustCollapse");
    if (streaks.staff >= limit) return endGame(state, "staffCollapse");
    if (state.day >= TOTAL_DAYS) {
      const score = calculateScore(state);
      state.score = score;
      if (score >= 78) return endGame(state, "hardWon");
      if (score >= 62 && state.hidden.publicMemory >= 55) return endGame(state, "silentCost");
      if (score >= 62 && state.metrics.trust >= 60) return endGame(state, "quietRecovery");
      if (score >= 45) return endGame(state, "winterScars");
      return endGame(state, "surfaceRecovery");
    }
    return null;
  }

  function endGame(state, endingId) {
    state.ended = true;
    if (state.score === null) state.score = calculateScore(state);
    state.ending = {
      id: endingId,
      ...ENDINGS[endingId],
      scoreText: `${Math.round(state.score)} / 100`,
    };
    return state.ending;
  }

  function calculateScore(state) {
    return SCORE_COMPONENTS.reduce((sum, component) => sum + scoreComponentPoints(state, component), 0);
  }

  function getScoreBreakdown(state) {
    if (!state) return [];
    return SCORE_COMPONENTS.map((component) => {
      const rawValue = scoreMetricValue(state, component);
      const value = boundedMetricValue(component.metric, rawValue);
      const points = scoreComponentPoints(state, component);
      const lost = component.max - points;
      return {
        metric: component.metric,
        label: component.label,
        short: (getObjectiveMeta(component.metric) || {}).short || component.label,
        value,
        points: roundScore(points),
        lost: roundScore(lost),
        max: component.max,
        pct: Math.round((points / component.max) * 100),
        tone: scoreTone(component.metric, value, lost, component.max),
        advice: component.advice,
      };
    });
  }

  function scoreComponentPoints(state, component) {
    const value = boundedMetricValue(component.metric, scoreMetricValue(state, component));
    return (scoreHealthyValue(component.metric, value) / 100) * component.max;
  }

  function scoreMetricValue(state, component) {
    if (component.source === "metrics") return state.metrics[component.metric];
    if (component.source === "hidden") return state.hidden[component.metric];
    if (component.source === "resources") return state.resources[component.metric];
    return 0;
  }

  function scoreHealthyValue(metric, value) {
    const meta = getObjectiveMeta(metric);
    if (meta.direction === "danger") return 100 - value;
    return Math.min(value, 100);
  }

  function scoreTone(metric, value, lost, max) {
    if (lost >= max * 0.5) return "danger";
    if (lost >= max * 0.28) return "warn";
    const band = getRiskBand(metric, value);
    return band === "danger" ? "warn" : "good";
  }

  function roundScore(value) {
    return Math.round(value * 10) / 10;
  }

  function getEndingReview(state) {
    if (!state) return null;
    const breakdown = getScoreBreakdown(state)
      .sort((a, b) => b.max - a.max || b.lost - a.lost);
    const priorities = [...breakdown]
      .sort((a, b) => b.lost - a.lost)
      .slice(0, 3)
      .map((item) => ({
        metric: item.metric,
        label: item.label,
        lost: item.lost,
        advice: item.advice,
        tone: item.tone === "good" ? "warn" : item.tone,
      }));
    return {
      score: roundScore(calculateScore(state)),
      scoreText: `${Math.round(calculateScore(state))}/100`,
      breakdown,
      priorities,
      strategyReview: getEndingStrategyReview(state),
      nextPlans: getNextRunPlans(state, priorities),
    };
  }

  function getEndingStrategyReview(state) {
    const profile = getStrategyProfile(state);
    if (!profile) return null;
    return {
      label: profile.label,
      tone: profile.tone,
      detail: profile.detail,
      blindSpot: profile.blindSpot,
      routes: (profile.routes || []).slice(0, 4),
    };
  }

  function getNextRunPlans(state, priorities) {
    const profile = getStrategyProfile(state);
    const dominantRoute = profile && profile.routes && profile.routes[0];
    const plans = [];
    priorities.forEach((priority) => {
      const plan = NEXT_RUN_ROUTE_PLANS[priority.metric];
      if (!plan) return;
      const repeated = dominantRoute && plan.route.includes(dominantRoute.label) && dominantRoute.percent >= 45;
      plans.push({
        metric: priority.metric,
        label: priority.label,
        lost: priority.lost,
        route: plan.route,
        tone: repeated ? "warn" : priority.tone,
        detail: repeated
          ? `${plan.detail} 本局已经偏向${dominantRoute.label}，下次要注意配套路线，而不是继续堆同一种按钮。`
          : plan.detail,
        examples: plan.examples,
      });
    });
    const blindSpot = profile && profile.blindSpot;
    if (blindSpot && !plans.some((item) => blindSpot.detail.includes(item.route.split(" ")[0]))) {
      plans.push({
        metric: "blindSpot",
        label: blindSpot.label,
        lost: 0,
        route: "补齐盲区",
        tone: blindSpot.tone,
        detail: blindSpot.detail,
        examples: "先按右侧恢复渠道、失败预警和阶段目标找可执行节点",
      });
    }
    return plans.slice(0, 4);
  }

  function projectedEndingId(state, score) {
    if (score >= 78) return "hardWon";
    if (score >= 62 && state.hidden.publicMemory >= 55) return "silentCost";
    if (score >= 62 && state.metrics.trust >= 60) return "quietRecovery";
    if (score >= 45) return "winterScars";
    return "surfaceRecovery";
  }

  function getEndingOutlook(state) {
    if (!state || state.ended) return null;
    const score = calculateScore(state);
    const roundedScore = Math.round(score);
    const endingId = projectedEndingId(state, score);
    const ending = ENDINGS[endingId];
    const limit = getFailureLimit(state);
    const streaks = state.flags.failureStreaks || {};
    const activeRisk = [
      { id: "medical", label: "医疗挤兑", streak: streaks.medical || 0 },
      { id: "supply", label: "供应断裂", streak: streaks.supply || 0 },
      { id: "trust", label: "信任崩塌", streak: streaks.trust || 0 },
      { id: "staff", label: "执行失灵", streak: streaks.staff || 0 },
    ].sort((a, b) => b.streak - a.streak)[0];
    const riskClocks = getEndingRiskClocks(state, limit);
    const drivers = getScoreBreakdown(state)
      .sort((a, b) => b.lost - a.lost || b.max - a.max)
      .slice(0, 3)
      .map((item) => {
        const focusAction = pressureActionTarget(state, PENDING_PRESSURE_TARGETS[item.metric] || []);
        return {
          metric: item.metric,
          label: item.short,
          value: item.value,
          lost: item.lost,
          status: `扣 ${item.lost} 分`,
          tone: item.tone,
          detail: focusAction && focusAction.actionLabel
            ? `${item.advice} 可先定位“${focusAction.actionLabel}”。`
            : item.advice,
          focusAction: focusAction && focusAction.actionId ? focusAction : null,
        };
      });

    if (activeRisk && activeRisk.streak > 0) {
      return {
        score: roundedScore,
        scoreText: `${roundedScore}/100`,
        endingId,
        tone: "danger",
        title: `${activeRisk.label} ${activeRisk.streak}/${limit}`,
        detail: "失败倒计时会覆盖所有归档评分，优先拆除已经越线的红色压力槽。",
        nextText: "先保命，再追分",
        drivers,
        riskClocks,
      };
    }

    const nextTarget = score < 45 ? 45 : score < 62 ? 62 : score < 78 ? 78 : null;
    const tone = score >= 78
      ? "good"
      : score >= 62 && (state.metrics.trust >= 60 || state.hidden.publicMemory >= 55)
        ? "good"
        : score >= 45
          ? "warn"
          : "danger";
    let detail = ending.summary;
    if (score >= 62 && state.metrics.trust < 60 && state.hidden.publicMemory < 55) {
      detail = "综合分已碰到恢复线，但信任不足会让恢复叙事失去支点，仍可能落入带伤收尾。";
    } else if (score >= 62 && state.hidden.publicMemory >= 55) {
      detail = "综合分足以过线，但公共创伤过高会把结局推向更沉重的代价叙事。";
    } else if (score < 62 && state.metrics.economy <= 35) {
      detail = "当前分数主要被城市活力和财政循环拖住，早期的小复苏动作能明显改变归档走势。";
    } else if (score < 62 && state.resources.funds <= 20) {
      detail = "资金偏低会限制后续工程选择，账款清分、专项资金、捐助统筹或账期谈判会改变回旋余地。";
    }

    let nextText = nextTarget
      ? `距 ${nextTarget} 分线还差 ${Math.max(0, Math.ceil(nextTarget - score))}`
      : "已处在最高评分线";
    if (score >= 62 && state.metrics.trust < 60 && state.hidden.publicMemory < 55) {
      nextText = `信任距 60 还差 ${60 - state.metrics.trust}`;
    } else if (score >= 62 && state.hidden.publicMemory >= 55) {
      nextText = `创伤需降到 54 以下`;
    }

    return {
      score: roundedScore,
      scoreText: `${roundedScore}/100`,
      endingId,
      tone,
      title: ending.title,
      detail,
      nextText,
      drivers,
      riskClocks,
    };
  }

  function getEndingRiskClocks(state, limit = getFailureLimit(state)) {
    const m = state.metrics;
    const streaks = state.flags.failureStreaks || {};
    const clocks = [
      {
        id: "medical",
        label: "医疗挤兑",
        value: m.hospitalLoad,
        threshold: "医疗≥95",
        streak: streaks.medical || 0,
        warn: m.hospitalLoad >= 85,
        detail: "医疗连续越线会直接失败，医疗高位也会持续推高创伤和信任损失。",
      },
      {
        id: "supply",
        label: "供应断裂",
        value: m.supplies,
        threshold: "物资<15",
        streak: streaks.supply || 0,
        warn: m.supplies <= 25,
        detail: "物资低位会同时伤害信任、疲劳和保供行动效率。",
      },
      {
        id: "trust",
        label: "信任崩塌",
        value: m.trust,
        threshold: "信任<20",
        streak: streaks.trust || 0,
        warn: m.trust <= 30,
        detail: "低信任会削弱行动效率，牺牲信任的路线会更快反噬。",
      },
      {
        id: "staff",
        label: "执行失灵",
        value: m.staffFatigue,
        threshold: "疲劳>90",
        streak: streaks.staff || 0,
        warn: m.staffFatigue >= 80,
        detail: "高疲劳会让所有行动变钝，并磨损发现率。",
      },
    ];
    return clocks
      .filter((item) => item.streak > 0 || item.warn)
      .map((item) => ({
        ...item,
        status: item.streak > 0 ? `${item.streak}/${limit}` : "临近",
        tone: item.streak > 0 ? "danger" : "warn",
      }))
      .sort((a, b) => b.streak - a.streak || (b.warn ? 1 : 0) - (a.warn ? 1 : 0))
      .slice(0, 3);
  }

  function getRiskBand(metric, value) {
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    if (!meta) return "warn";
    const direction = meta.direction;
    if (direction === "good") {
      if (value >= 65) return "good";
      if (value >= 35) return "warn";
      return "danger";
    }
    if (direction === "danger") {
      if (value <= 45) return "good";
      if (value <= 75) return "warn";
      return "danger";
    }
    if (value <= 35) return "good";
    if (value <= 70) return "warn";
    return "danger";
  }

  function makeDailyDirective(state, config) {
    const meta = getObjectiveMeta(config.metric);
    const current = getObjectiveValue(state, config.metric);
    const done = conditionByOperator(current, config.op, config.target);
    return {
      id: config.id,
      label: config.label,
      detail: config.detail,
      metric: config.metric,
      metricLabel: meta.label,
      metricShort: meta.short,
      current,
      op: config.op,
      target: config.target,
      targetText: `${meta.short} ${config.op} ${config.target}`,
      done,
      tone: done ? "good" : config.tone || "warn",
      status: done ? "已达成" : "进行中",
      priority: config.priority || 0,
    };
  }

  function conditionByOperator(value, op, target) {
    return op === "<=" ? value <= target : value >= target;
  }

  function directiveProgressScore(state, directive) {
    const value = getObjectiveValue(state, directive.metric);
    return directive.op === "<=" ? directive.target - value : value - directive.target;
  }

  function getDailyDirective(state) {
    if (!state || state.ended) return null;
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const streaks = state.flags.failureStreaks || {};
    const rows = [];
    const add = (config) => rows.push(makeDailyDirective(state, config));

    if ((streaks.medical || 0) > 0) add({ id: "escape_medical", label: "脱离医疗倒计时", metric: "hospitalLoad", op: "<=", target: 94, tone: "danger", priority: 180, detail: "医疗负载越过失败红线，今天优先把它拉回倒计时外。" });
    if ((streaks.supply || 0) > 0) add({ id: "escape_supply", label: "脱离供应倒计时", metric: "supplies", op: ">=", target: 15, tone: "danger", priority: 178, detail: "供应断裂倒计时已经开始，先让最低民生库存回到线内。" });
    if ((streaks.trust || 0) > 0) add({ id: "escape_trust", label: "脱离信任倒计时", metric: "trust", op: ">=", target: 20, tone: "danger", priority: 176, detail: "信任崩塌倒计时已经开始，今天需要任何可见修复。" });
    if ((streaks.staff || 0) > 0) add({ id: "escape_staff", label: "脱离执行倒计时", metric: "staffFatigue", op: "<=", target: 90, tone: "danger", priority: 174, detail: "基层疲劳进入失灵区，今天应优先减压或少加码。" });

    if (m.hospitalLoad >= 85) add({ id: "hospital_redline", label: "卸下医院红线", metric: "hospitalLoad", op: "<=", target: 84, tone: "danger", priority: 150, detail: "医疗负载高位会持续伤害信任并增加公共创伤。" });
    else if (m.hospitalLoad >= 75) add({ id: "hospital_pressure", label: "缓和医疗高压", metric: "hospitalLoad", op: "<=", target: 74, tone: "warn", priority: 108, detail: "医院接近红线，分流和扩容会给后续几天留空间。" });
    if (m.infection >= 80) add({ id: "infection_redline", label: "压低社区扩散", metric: "infection", op: "<=", target: 75, tone: "danger", priority: 145, detail: "感染高位会继续推高医院负载，今天需要监测或管控止血。" });
    else if (m.infection >= 70) add({ id: "infection_pressure", label: "压住传播上行", metric: "infection", op: "<=", target: 68, tone: "warn", priority: 104, detail: "感染压力偏高时，早一点压峰比等到医疗红线更便宜。" });
    if (m.supplies <= 25) add({ id: "supply_redline", label: "补回民生库存", metric: "supplies", op: ">=", target: 30, tone: "danger", priority: 140, detail: "物资低位会同时伤害信任和基层效率。" });
    else if (m.supplies <= 35) add({ id: "supply_pressure", label: "稳住供应链条", metric: "supplies", op: ">=", target: 40, tone: "warn", priority: 98, detail: "保供链条偏紧，今天可以用小收益避免后续连锁下滑。" });
    if (m.trust <= 30) add({ id: "trust_redline", label: "修复低配合", metric: "trust", op: ">=", target: 35, tone: "danger", priority: 136, detail: "低信任会削弱行动效率，让强政策也变钝。" });
    else if (m.trust <= 40) add({ id: "trust_pressure", label: "补一口信任", metric: "trust", op: ">=", target: 45, tone: "warn", priority: 92, detail: "信任承压时，公开解释和补偿流程会提高后续执行效率。" });
    if (m.staffFatigue >= 80) add({ id: "staff_redline", label: "给基层减压", metric: "staffFatigue", op: "<=", target: 75, tone: "danger", priority: 132, detail: "疲劳高位会让所有行动收益打折，并磨损发现率。" });
    else if (m.staffFatigue >= 70) add({ id: "staff_pressure", label: "降低排班压力", metric: "staffFatigue", op: "<=", target: 65, tone: "warn", priority: 88, detail: "排班偏紧时，今天少一点透支能换后期更稳定执行。" });
    if (r.funds <= 15) add({ id: "funds_redline", label: "补足现金流", metric: "funds", op: ">=", target: 20, tone: "danger", priority: 126, detail: "资金低位会锁住工程和决议，恢复渠道需要提前布局。" });
    else if (r.funds <= 25) add({ id: "funds_pressure", label: "恢复应急资金", metric: "funds", op: ">=", target: 30, tone: "warn", priority: 82, detail: "资金偏低时，工程选择会越来越窄。" });
    if (m.economy <= 30 && m.infection < 75) add({ id: "economy_redline", label: "托住城市活力", metric: "economy", op: ">=", target: 35, tone: "warn", priority: 78, detail: "活力低位会拖慢保供、财政和后期恢复。" });
    else if (m.economy <= 45 && state.day >= 8 && m.infection < 70) add({ id: "economy_window", label: "打开小复苏窗口", metric: "economy", op: ">=", target: 50, tone: "info", priority: 56, detail: "感染不高时，可以用低风险复业托住城市账本。" });
    if (h.detectedRate <= 35) add({ id: "detected_blind", label: "缩小信息盲区", metric: "detectedRate", op: ">=", target: 45, tone: "warn", priority: 76, detail: "发现率过低会放大感染误差，也会增加复工代价。" });
    else if (h.detectedRate <= 50 && state.day <= 36) add({ id: "detected_window", label: "补强监测能力", metric: "detectedRate", op: ">=", target: 55, tone: "info", priority: 48, detail: "发现率越早上来，后续复工和分区治理越可靠。" });

    const stageObjective = getStageObjectives(state).find((objective) => !objective.done);
    if (stageObjective) {
      add({
        id: `stage_${stageObjective.id}`,
        label: stageObjective.label,
        metric: stageObjective.metric,
        op: stageObjective.op,
        target: stageObjective.target,
        tone: stageObjective.tone === "danger" ? "danger" : "info",
        priority: 32,
        detail: `阶段目标：${stageObjective.detail}`,
      });
    }

    const selected = rows
      .sort((a, b) => b.priority - a.priority)
      .map(({ priority, ...item }) => item)[0];
    return selected || null;
  }

  function getChoiceDirectiveFit(state, choiceId) {
    if (!state || state.ended || !choiceId) return null;
    const event = getCurrentEvent(state);
    const choice = event && event.choices.find((item) => item.id === choiceId);
    if (!choice || choice.available === false) return null;
    const directive = getDailyDirective(state);
    if (!directive) return null;

    const beforeValue = getObjectiveValue(state, directive.metric);
    const beforeDone = conditionByOperator(beforeValue, directive.op, directive.target);
    const beforeScore = directiveProgressScore(state, directive);
    const projected = clone(state);
    resolveChoice(projected, choiceId);
    const afterValue = getObjectiveValue(projected, directive.metric);
    return buildDirectiveFit(directive, beforeValue, afterValue, beforeDone, beforeScore);
  }

  function getCityActionDirectiveFit(state, mode, actionId) {
    if (!state || state.ended || !actionId) return null;
    const normalizedMode = mode === "resolutions" ? "resolutions" : "operations";
    const status = normalizedMode === "resolutions"
      ? getResolutionStatus(state, actionId)
      : getOperationStatus(state, actionId);
    if (!status || !status.available) return null;
    const directive = getDailyDirective(state);
    if (!directive) return null;

    const beforeValue = getObjectiveValue(state, directive.metric);
    const beforeDone = conditionByOperator(beforeValue, directive.op, directive.target);
    const beforeScore = directiveProgressScore(state, directive);
    const projected = clone(state);
    if (normalizedMode === "resolutions") executeResolution(projected, actionId);
    else executeOperation(projected, actionId);
    const afterValue = getObjectiveValue(projected, directive.metric);
    const fit = buildDirectiveFit(directive, beforeValue, afterValue, beforeDone, beforeScore);
    if (!fit) return null;
    return {
      ...fit,
      detail: `${fit.detail} 主动行动即时生效，今日事件仍需另行处理。`,
    };
  }

  function getDailyDirectiveOptions(state) {
    if (!state || state.ended) return null;
    const directive = getDailyDirective(state);
    if (!directive) return null;
    const items = [];
    const add = (item) => {
      if (!item || !item.fit || item.fit.tone !== "good") return;
      items.push({
        ...item,
        tone: item.fit.tone,
        status: item.fit.label,
        detail: item.fit.detail,
        score: directiveOptionScore(item.fit, item.kind),
      });
    };

    const event = getCurrentEvent(state);
    (event && event.choices ? event.choices : []).forEach((choice) => {
      if (!choice || choice.available === false) return;
      const fit = getChoiceDirectiveFit(state, choice.id);
      const routeTag = choice.routeTag || getChoiceRouteTag(choice);
      add({
        id: `choice_${choice.id}`,
        kind: "事件选项",
        label: choice.label,
        routeLabel: routeTag ? routeTag.label : "综合路线",
        choiceId: choice.id,
        fit,
      });
    });

    [
      ["operations", "工程", getAvailableOperations(state)],
      ["resolutions", "决议", getAvailableResolutions(state)],
    ].forEach(([mode, kind, actions]) => {
      actions
        .filter((item) => item && item.available)
        .forEach((item) => {
          const fit = getCityActionDirectiveFit(state, mode, item.id);
          const point = getMapPoint(state, item.location);
          const routeTag = getChoiceRouteTag({ id: item.id });
          add({
            id: `${mode}_${item.id}`,
            kind,
            label: item.label,
            routeLabel: routeTag ? routeTag.label : "城市行动",
            mode,
            actionId: item.id,
            pointId: item.location,
            pointLabel: point ? point.label : "",
            fit,
          });
        });
    });

    const ranked = items
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .map(({ score, ...item }) => item);
    return {
      directive,
      items: ranked.slice(0, 4),
      totalCount: ranked.length,
    };
  }

  function directiveOptionScore(fit, kind) {
    const label = String(fit && fit.label ? fit.label : "");
    const progress = Number((label.match(/([+-]\d+)/) || [])[1] || 0);
    let score = kind === "事件选项" ? 12 : 8;
    if (/完成/.test(label)) score += 80;
    if (/推进/.test(label)) score += 45 + Math.max(0, progress) * 4;
    return score;
  }

  function buildDirectiveFit(directive, beforeValue, afterValue, beforeDone, beforeScore) {
    const afterDone = conditionByOperator(afterValue, directive.op, directive.target);
    const afterScore = directive.op === "<=" ? directive.target - afterValue : afterValue - directive.target;
    const progress = afterScore - beforeScore;
    if (afterDone && !beforeDone) {
      return {
        tone: "good",
        label: "完成今日目标",
        detail: `${directive.label}：${beforeValue} → ${afterValue}，预计达成 ${directive.targetText}。`,
      };
    }
    if (progress > 0) {
      return {
        tone: "good",
        label: `推进目标 ${progress > 0 ? "+" : ""}${progress}`,
        detail: `${directive.label}：${beforeValue} → ${afterValue}，正在靠近 ${directive.targetText}。`,
      };
    }
    if (progress < 0) {
      return {
        tone: Math.abs(progress) >= 4 ? "danger" : "warn",
        label: `偏离目标 ${progress}`,
        detail: `${directive.label}：${beforeValue} → ${afterValue}，会远离 ${directive.targetText}。`,
      };
    }
    if (beforeDone) {
      return {
        tone: "info",
        label: "目标已稳",
        detail: `${directive.label}已经达成，这项选择不会明显改变该目标。`,
      };
    }
    return null;
  }

  function getDailyPressureSummary(state) {
    if (!state || state.ended) return [];
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const limit = getFailureLimit(state);
    const streaks = state.flags.failureStreaks || {};
    const entries = [];
    const add = (id, tone, label, detail, score, extra = {}) => {
      if (entries.some((item) => item.id === id || item.label === label)) return;
      entries.push({ id, tone, label, detail, score, ...extra });
    };

    [
      ["medical", "医疗挤兑", streaks.medical || 0, "医疗负载已越过失败红线"],
      ["supply", "供应断裂", streaks.supply || 0, "物资供应已低于安全底线"],
      ["trust", "信任崩塌", streaks.trust || 0, "市民信任已低于执行底线"],
      ["staff", "执行失灵", streaks.staff || 0, "基层疲劳已进入失灵区"],
    ].forEach(([key, label, streak, detail]) => {
      if (streak > 0) add(`failure_${key}`, "danger", `${label} ${streak}/${limit}`, `${detail}，仍有补救窗口。`, 120 + streak);
    });

    if (m.hospitalLoad >= 85) add("metric_hospital_high", "danger", "医疗红线", "医院负载高位会持续伤害信任并推高公共创伤。", m.hospitalLoad, pressureActionTarget(state, MEDICAL_PRESSURE_TARGETS));
    else if (m.hospitalLoad >= 75) add("metric_hospital_warn", "warn", "医疗接近高压", "急救、床位和转运需要优先分流。", m.hospitalLoad, pressureActionTarget(state, MEDICAL_PRESSURE_TARGETS));
    if (m.infection >= 80) add("metric_infection_high", "danger", "社区扩散", "感染压力会额外推高医疗负载。", m.infection, pressureActionTarget(state, DETECTION_PRESSURE_TARGETS));
    else if (m.infection >= 70) add("metric_infection_warn", "warn", "传播高位", "检测和局部管控会更有价值。", m.infection, pressureActionTarget(state, DETECTION_PRESSURE_TARGETS));
    if (m.supplies <= 25) add("metric_supply_low", "danger", "物资低位", "供应不足会同时伤害信任和基层疲劳。", 100 - m.supplies, pressureActionTarget(state, SUPPLY_PRESSURE_TARGETS));
    else if (m.supplies <= 35) add("metric_supply_warn", "warn", "供应偏紧", "保供链条开始限制医疗和社区执行。", 100 - m.supplies, pressureActionTarget(state, SUPPLY_PRESSURE_TARGETS));
    if (m.trust <= 30) add("metric_trust_low", "danger", "低配合", "行动效率下降，谣言和拒检事件更容易出现。", 100 - m.trust, pressureActionTarget(state, TRUST_PRESSURE_TARGETS));
    else if (m.trust <= 40) add("metric_trust_warn", "warn", "信任承压", "公开解释和可核验流程会更重要。", 100 - m.trust, pressureActionTarget(state, TRUST_PRESSURE_TARGETS));
    if (m.staffFatigue >= 80) add("metric_fatigue_high", "danger", "执行透支", "所有行动收益打折，发现率会被疲劳磨损。", m.staffFatigue, pressureActionTarget(state, FATIGUE_PRESSURE_TARGETS));
    else if (m.staffFatigue >= 70) add("metric_fatigue_warn", "warn", "排班偏紧", "继续加压会让后续政策变钝。", m.staffFatigue, pressureActionTarget(state, FATIGUE_PRESSURE_TARGETS));
    if (m.economy <= 25) add("metric_economy_low", "warn", "财政吃紧", "活力低位会拖慢保供恢复和医疗扩容。", 100 - m.economy, pressureActionTarget(state, ECONOMY_PRESSURE_TARGETS));
    else if (m.economy <= 45 && state.day >= 8 && m.infection < 70) add("metric_economy_recovery_window", "info", "小复苏窗口", "民生网点、闭环保供和稳岗类动作可以托住活力，但仍要看发现率。", 62, pressureActionTarget(state, ECONOMY_PRESSURE_TARGETS));
    if (r.funds <= 10) add("resource_funds_low", "danger", "财政透支", "高价工程和决议会被锁定。", 105 - r.funds, pressureActionTarget(state, FUNDS_PRESSURE_TARGETS));
    else if (r.funds <= 20) add("resource_funds_warn", "warn", "资金偏低", "工程选择需要更克制。", 100 - r.funds, pressureActionTarget(state, FUNDS_PRESSURE_TARGETS));
    else if (r.funds <= 45 && state.day >= 7) add("resource_fiscal_window", "info", "财政窗口", "账款清分、专项资金、捐助统筹或举债能补缺口，但会转化为信任、活力或审计压力。", 61, pressureActionTarget(state, FUNDS_PRESSURE_TARGETS));
    if (getMicroRecoveryAssets(state).length >= 2 && h.detectedRate < 70 && m.infection >= 45) {
      add("micro_flow_pressure", "warn", "微复苏流动压力", "发现率低于 70 时，多条微循环资产会带来额外传播缝隙。", 63, pressureActionTarget(state, DETECTION_PRESSURE_TARGETS));
    }
    if (h.detectedRate <= 35) add("hidden_detected_low", "warn", "信息盲区", "报告感染压力误差扩大，复工代价更高。", 100 - h.detectedRate, pressureActionTarget(state, DETECTION_PRESSURE_TARGETS));
    if (h.policyStrictness >= 80) add("hidden_policy_high", "warn", "高压管控", "感染压制增强，但活力和疲劳代价上升。", h.policyStrictness, pressureActionTarget(state, POLICY_PRESSURE_TARGETS));
    if (h.publicMemory >= 60) add("hidden_memory_high", "danger", "长期伤痕", "信任恢复会变慢，结局更容易偏向沉重代价。", h.publicMemory, pressureActionTarget(state, MEMORY_PRESSURE_TARGETS));

    const strategyProfile = getStrategyProfile(state);
    if (strategyProfile && strategyProfile.inertia) {
      const inertia = strategyProfile.inertia;
      add(
        "strategy_inertia",
        inertia.tone === "danger" ? "danger" : "warn",
        inertia.status,
        `${inertia.routeLabel}占比 ${inertia.percent}%。${inertia.complementLabel}`,
        inertia.tone === "danger" ? 96 : 84,
        strategyInertiaActionTarget(state, strategyProfile),
      );
    }

    const dueSoon = [...(state.pendingEffects || [])]
      .filter((item) => item.dueDay <= state.day + 1)
      .sort((a, b) => a.dueDay - b.dueDay)[0];
    if (dueSoon) {
      const pendingTarget = pendingEffectActionTarget(state, dueSoon);
      add(
        "pending_due",
        "warn",
        dueSoon.dueDay <= state.day ? "今日后续影响" : "明日后续影响",
        pendingEffectSummaryDetail(state, dueSoon, pendingTarget),
        82 - Math.max(0, dueSoon.dueDay - state.day),
        pendingTarget,
      );
    }

    const undo = getCityActionUndo(state);
    if (undo) {
      add(
        "city_action_undo",
        "info",
        "行动可撤销",
        `刚执行“${undo.label}”，今日事件仍未处理；如果判断有误，可先撤销再选择别的城市行动。`,
        83,
        {
          actionId: undo.actionId,
          mode: undo.mode,
          pointId: undo.pointId,
        },
      );
    }

    const actionBudget = getCityActionBudget(state);
    if (!undo && actionBudget.remaining > 0) {
      const opportunities = getCityActionOpportunities(state);
      const bestAction = (opportunities.items || [])[0];
      if (bestAction && opportunities.availableCount > 0) {
        add(
          "city_action_window",
          bestAction.tone === "good" ? "good" : "info",
          "城市行动窗口",
          `今日调度还剩 ${actionBudget.remaining}/${actionBudget.limit}，可先执行“${bestAction.label}”，再处理今日事件。`,
          bestAction.priority >= 48 ? 79 : 57,
          {
            actionId: bestAction.id,
            mode: bestAction.mode,
            pointId: bestAction.pointId,
          },
        );
      }
    }

    const upcoming = SCHEDULED_EVENTS
      .filter((item) => (
        item.day > state.day
        && item.day <= state.day + 2
        && !(state.flags.seenEventIds || []).includes(item.eventId)
        && scheduledConditionMet(state, item.condition)
      ))
      .sort((a, b) => a.day - b.day || (b.priority || 0) - (a.priority || 0))[0];
    if (upcoming) {
      const event = EVENTS.find((item) => item.id === upcoming.eventId);
      const focusAction = getScheduledEventFocusAction(state, upcoming);
      const actionDetail = focusAction
        ? `${event ? event.title : upcoming.reason}；${focusAction.status || "准备"}：${focusAction.label}。`
        : event ? event.title : upcoming.reason;
      add(
        "scheduled_soon",
        "info",
        upcoming.day === state.day + 1 ? "明日固定事件" : `第${upcoming.day}天固定事件`,
        actionDetail,
        70 - (upcoming.day - state.day),
        focusAction ? {
          actionId: focusAction.id,
          mode: focusAction.mode,
          pointId: focusAction.pointId,
        } : {},
      );
    }

    getStatusEffects(state).forEach((effect, index) => {
      const tone = effect.tone === "danger" ? "danger" : effect.tone === "good" ? "good" : "warn";
      add(`status_${effect.id}`, tone, effect.label, effect.description, tone === "danger" ? 58 - index : 34 - index);
    });

    if (m.infection <= 25) add("good_infection_low", "good", "低传播窗口", "复工类行动的感染反弹代价降低。", 30);
    if (m.supplies >= 75) add("good_supplies_high", "good", "库存缓冲", "高管控带来的信任损失降低。", 29);
    if (m.trust >= 75) add("good_trust_high", "good", "高配合", "检测、管控和轮休收益更稳定。", 28);
    if (m.staffFatigue <= 35) add("good_fatigue_low", "good", "执行余裕", "检测、保供、医疗和志愿者类行动更有效。", 27);
    if (h.detectedRate >= 80) add("good_detected_high", "good", "监测清晰", "复工感染代价降低，城市更接近真实态势。", 26);

    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score, ...item }) => item);
  }

  function pressureActionTarget(state, candidates = []) {
    return pressureActionTargetDetail(state, candidates) || {};
  }

  function pressureActionTargetDetail(state, candidates = []) {
    const budget = getCityActionBudget(state);
    if (!budget || budget.remaining <= 0) return null;
    for (const [mode, actionId] of candidates) {
      const status = mode === "resolutions"
        ? getResolutionStatus(state, actionId)
        : getOperationStatus(state, actionId);
      if (!status || !status.available) continue;
      const point = findMapPointForCityAction(mode, actionId);
      if (!point) continue;
      return {
        actionId,
        mode,
        pointId: point.id,
        actionLabel: status.label,
        pointLabel: point.label,
      };
    }
    return null;
  }

  function pendingEffectSummaryDetail(state, pending, target = null) {
    const condition = pending.condition
      ? `（条件：${conditionPreviewLabel(pending.condition)}${conditionMet(state, pending.condition) ? "已满足" : "待观察"}）`
      : "";
    const risk = pendingEffectPrimaryRisk(state, pending);
    const riskText = risk
      ? `；风险指向${risk.label} ${signedDelta(risk.delta)}`
      : "";
    const prep = target && target.actionLabel
      ? `；可先准备“${target.actionLabel}”`
      : "";
    return `${pending.eventTitle}：${pending.label}${condition}${riskText}${prep}`;
  }

  function pendingEffectActionTarget(state, pending) {
    const risk = pendingEffectPrimaryRisk(state, pending);
    if (!risk) return {};
    return pressureActionTarget(state, PENDING_PRESSURE_TARGETS[risk.metric] || []);
  }

  function getPendingEffectReadouts(state, limit = 5) {
    if (!state || state.ended) return [];
    return [...(state.pendingEffects || [])]
      .sort((a, b) => a.dueDay - b.dueDay || String(a.label).localeCompare(String(b.label), "zh-Hans-CN"))
      .slice(0, limit)
      .map((item, index) => {
        const dayGap = item.dueDay - state.day;
        const risk = pendingEffectPrimaryRisk(state, item);
        const target = pendingEffectActionTarget(state, item);
        const conditionReady = item.condition ? conditionMet(state, item.condition) : true;
        const impactSummary = pendingEffectImpactSummary(item);
        return {
          ...item,
          id: `pending_${item.dueDay}_${index}_${String(item.label || "effect").replace(/\s+/g, "_")}`,
          dayGap,
          dueText: dayGap <= 0 ? "今日" : dayGap === 1 ? "明日" : `${dayGap}日后`,
          title: `${item.eventTitle || "后续"} · ${item.choiceLabel || item.label}`,
          conditionText: item.condition ? conditionPreviewLabel(item.condition) : "必定触发",
          conditionReady,
          impactSummary,
          risk: risk ? {
            metric: risk.metric,
            label: risk.label,
            delta: risk.delta,
            summary: `${risk.label} ${signedDelta(risk.delta)}`,
            tone: Math.abs(risk.delta) >= 5 ? "danger" : "warn",
          } : null,
          actionId: target.actionId || "",
          mode: target.mode || "",
          pointId: target.pointId || "",
          actionLabel: target.actionLabel || "",
          pointLabel: target.pointLabel || "",
        };
      });
  }

  function pendingEffectImpactSummary(item) {
    const parts = [];
    const add = (source = {}, metaMap = {}) => {
      Object.entries(source || {}).forEach(([metric, delta]) => {
        const meta = metaMap[metric];
        if (!meta || !delta) return;
        parts.push(`${meta.short} ${signedDelta(delta)}`);
      });
    };
    add(item.resources, RESOURCE_META);
    add(item.effects, METRIC_META);
    add(item.hidden, METRIC_META);
    if (item.completeProject) parts.push("项目完成");
    const prefix = item.condition ? "若触发" : "预计";
    return parts.length
      ? `${prefix}：${parts.slice(0, 5).join(" / ")}`
      : `${prefix}：仅记录后续叙事变化`;
  }

  function pendingEffectPrimaryRisk(state, pending) {
    const rows = [];
    const collect = (source = {}) => {
      Object.entries(source || {}).forEach(([metric, delta]) => {
        if (!delta) return;
        const meta = METRIC_META[metric] || RESOURCE_META[metric];
        if (!meta) return;
        const bad = isBadDelta(metric, delta) || isBadMixedPendingDelta(state, metric, delta);
        if (!bad) return;
        const urgency = pending.dueDay <= state.day ? 18 : 8;
        const metricWeight = {
          hospitalLoad: 20,
          staffFatigue: 18,
          trust: 17,
          funds: 17,
          infection: 16,
          supplies: 15,
          publicMemory: 13,
          economy: 12,
          detectedRate: 11,
          policyStrictness: 9,
        }[metric] || 8;
        rows.push({
          metric,
          label: meta.short,
          delta,
          score: Math.abs(delta) * 12 + metricWeight + urgency,
        });
      });
    };
    collect(pending.effects);
    collect(pending.hidden);
    collect(pending.resources);
    return rows.sort((a, b) => b.score - a.score || Math.abs(b.delta) - Math.abs(a.delta))[0] || null;
  }

  function isBadMixedPendingDelta(state, metric, delta) {
    if (metric !== "policyStrictness") return false;
    if (delta > 0) return state.hidden.policyStrictness >= 60 || state.metrics.economy <= 45 || state.metrics.staffFatigue >= 65;
    if (delta < 0) return state.metrics.infection >= 70 || state.hidden.detectedRate <= 45;
    return false;
  }

  function statusEffectActionTarget(state, effectId) {
    return pressureActionTarget(state, STATUS_EFFECT_TARGETS[effectId] || []);
  }

  function findMapPointForCityAction(mode, actionId) {
    const key = mode === "resolutions" ? "resolutions" : "operations";
    return MAP_POINTS.find((point) => (point[key] || []).includes(actionId)) || null;
  }

  function strategyInertiaActionTarget(state, profile) {
    const budget = getCityActionBudget(state);
    if (!budget || budget.remaining <= 0 || !profile || !profile.inertia) return {};

    const recommended = (profile.recommendations || [])
      .find((item) => item && item.actionId && item.mode && item.pointId && !item.locked)
      || (profile.recommendations || [])
        .find((item) => item && item.actionId && item.mode && item.pointId);
    if (recommended) {
      return {
        actionId: recommended.actionId,
        mode: recommended.mode,
        pointId: recommended.pointId,
      };
    }

    const complement = STRATEGY_COMPLEMENTS[profile.inertia.dominantId];
    const routeIds = new Set(complement ? complement.routeIds || [] : []);
    if (!routeIds.size) return {};
    const rows = [];
    MAP_POINTS.forEach((pointDef) => {
      const point = getMapPoint(state, pointDef.id);
      [
        { mode: "operations", items: point.operations },
        { mode: "resolutions", items: point.resolutions },
      ].forEach((group) => {
        group.items.forEach((item) => {
          const route = getStrategyRouteForKey(item.id);
          if (!route || !routeIds.has(route.id)) return;
          const established = item.lockedReason === "次数已用完" || item.lockedReason === "已通过";
          rows.push({
            actionId: item.id,
            mode: group.mode,
            pointId: pointDef.id,
            available: Boolean(item.available),
            established,
          });
        });
      });
    });
    const selected = rows.find((item) => item.available)
      || rows.find((item) => !item.established)
      || rows[0];
    return selected
      ? { actionId: selected.actionId, mode: selected.mode, pointId: selected.pointId }
      : {};
  }

  function getDailyTrendPreview(state) {
    if (!state || state.ended) return [];
    const projection = calculateProjectedDailyDeltas(state);
    const rows = [
      ...Object.entries(projection.metrics).map(([metric, delta]) => buildTrendItem(metric, delta, state.metrics[metric], projection.values.metrics[metric], "baseline", state)),
      ...Object.entries(projection.hidden).map(([metric, delta]) => buildTrendItem(metric, delta, state.hidden[metric], projection.values.hidden[metric], "baseline", state)),
      ...Object.entries(projection.resources).map(([metric, delta]) => buildTrendItem(metric, delta, state.resources[metric], projection.values.resources[metric], "baseline", state)),
    ].filter(Boolean);

    return rankTrendItems(rows);
  }

  function getChoiceOutcomePreview(state, choiceId) {
    if (!state || state.ended || !choiceId) return [];
    const event = getCurrentEvent(state);
    const choice = event && event.choices.find((item) => item.id === choiceId);
    if (!choice || choice.available === false) return [];

    const projected = clone(state);
    const before = snapshotValues(projected);
    resolveChoice(projected, choiceId);
    const after = snapshotValues(projected);
    const changes = diffSnapshots(before, after);
    const rows = Object.entries(changes)
      .map(([metric, delta]) => buildTrendItem(metric, delta, before[metric], after[metric], "choice", state))
      .filter(Boolean);

    return rankTrendItems(rows);
  }

  const FAILURE_PREVIEW_META = {
    medical: {
      label: "医疗挤兑",
      endingId: "medicalCollapse",
      detail: "医疗负载连续高位会触发失败结局。",
    },
    supply: {
      label: "供应断裂",
      endingId: "supplyCollapse",
      detail: "物资供应连续探底会触发失败结局。",
    },
    trust: {
      label: "信任崩塌",
      endingId: "trustCollapse",
      detail: "市民信任连续低位会触发失败结局。",
    },
    staff: {
      label: "执行失灵",
      endingId: "staffCollapse",
      detail: "基层疲劳连续爆表会触发失败结局。",
    },
  };

  function getChoiceRiskPreview(state, choiceId) {
    if (!state || state.ended || !choiceId) return [];
    const event = getCurrentEvent(state);
    const choice = event && event.choices.find((item) => item.id === choiceId);
    if (!choice || choice.available === false) return [];

    const limit = getFailureLimit(state);
    const beforeStreaks = { ...(state.flags.failureStreaks || {}) };
    const projected = clone(state);
    resolveChoice(projected, choiceId);
    const afterStreaks = projected.flags.failureStreaks || {};
    const rows = [];

    Object.entries(FAILURE_PREVIEW_META).forEach(([key, meta]) => {
      const before = beforeStreaks[key] || 0;
      const after = afterStreaks[key] || 0;
      const collapse = projected.ending && projected.ending.id === meta.endingId;
      if (collapse || after >= limit) {
        rows.push({
          id: key,
          tone: "danger",
          label: `${meta.label}失败`,
          detail: `${meta.detail} 这项选择预计会把倒计时推到 ${after}/${limit}。`,
          priority: 120 + after,
        });
      } else if (after > before) {
        rows.push({
          id: key,
          tone: after >= limit - 1 ? "danger" : "warn",
          label: `${meta.label} ${after}/${limit}`,
          detail: `${meta.detail} 当前选择预计会推进倒计时：${before}/${limit} → ${after}/${limit}。`,
          priority: 90 + after * 8,
        });
      } else if (before > 0 && after === 0) {
        rows.push({
          id: key,
          tone: "good",
          label: `${meta.label}脱线`,
          detail: `预计把${meta.label}倒计时从 ${before}/${limit} 拉回安全线。`,
          priority: 70 + before * 5,
        });
      }
    });

    return rows
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(({ priority, ...item }) => item);
  }

  function getChoiceFit(state, choiceId) {
    if (!state || state.ended || !choiceId) return null;
    const event = getCurrentEvent(state);
    const choice = event && event.choices.find((item) => item.id === choiceId);
    if (!choice) return null;
    if (choice.available === false) {
      return {
        tone: "danger",
        label: "暂不可用",
        detail: choice.lockedReason || "当前条件不足。",
      };
    }

    const risks = getChoiceRiskPreview(state, choiceId);
    const trends = getChoiceOutcomePreview(state, choiceId);
    const riskDanger = risks.find((item) => item.tone === "danger");
    if (riskDanger) {
      return {
        tone: "danger",
        label: "红线风险",
        detail: riskDanger.detail,
      };
    }

    const scored = trends.map((item) => ({
      ...item,
      fitScore: scoreActionDelta(state, item.metric, item.delta),
    }));
    const score = Math.round(scored.reduce((sum, item) => sum + item.fitScore, 0));
    const bestGood = scored
      .filter((item) => item.fitScore > 0)
      .sort((a, b) => b.fitScore - a.fitScore)[0];
    const worstBad = scored
      .filter((item) => item.fitScore < 0)
      .sort((a, b) => a.fitScore - b.fitScore)[0];
    const riskGood = risks.find((item) => item.tone === "good");
    const routeTag = choice.routeTag || getChoiceRouteTag(choice);
    const profile = getStrategyProfile(state);
    const dominantRoute = profile && profile.routes && profile.routes[0];
    const routeOverused = dominantRoute
      && dominantRoute.percent >= 55
      && routeTag
      && dominantRoute.label === routeTag.label;

    if (riskGood) {
      return {
        tone: "good",
        label: "补救窗口",
        detail: riskGood.detail,
      };
    }
    if (score >= 28 && bestGood) {
      return {
        tone: routeOverused ? "warn" : "good",
        label: routeOverused ? "有效但路线偏重" : "契合当前压力",
        detail: choiceFitDetail(bestGood, worstBad, routeOverused ? `本局${dominantRoute.label}已占 ${dominantRoute.percent}%，继续使用会集中对应代价。` : ""),
      };
    }
    if (score <= -18 && worstBad) {
      return {
        tone: "danger",
        label: "代价偏高",
        detail: choiceFitDetail(bestGood, worstBad, "当前局势下这项选择的代价会先于收益显形。"),
      };
    }
    if (routeOverused) {
      return {
        tone: "warn",
        label: "路线偏重",
        detail: `本局${dominantRoute.label}已占 ${dominantRoute.percent}%，继续使用会集中对应代价。`,
      };
    }
    if (choice.delayed || (choice.effectPreview || []).some((item) => String(item).includes("后"))) {
      return {
        tone: "warn",
        label: "后续账单",
        detail: choiceFitDetail(bestGood, worstBad, "这项选择包含延迟后果，今晚不一定立刻体现全部代价。"),
      };
    }
    return {
      tone: bestGood ? "info" : "warn",
      label: bestGood ? "均衡取舍" : "长期铺垫",
      detail: choiceFitDetail(bestGood, worstBad, bestGood ? "收益和代价都不极端，适合按路线偏好取舍。" : "直接数值收益较弱，更偏叙事或长期方向。"),
    };
  }

  function getChoiceComparison(state) {
    if (!state || state.ended) return null;
    const event = getCurrentEvent(state);
    const choices = event && event.choices ? event.choices : [];
    if (!choices.length) return null;
    const rows = choices.map((choice) => buildChoiceComparisonItem(state, choice));
    const ranked = rows
      .filter((item) => item.available)
      .sort((a, b) => b.score - a.score || a.order - b.order);
    ranked.forEach((item, index) => {
      item.rank = index + 1;
      item.recommended = index === 0 && item.tone !== "danger";
      if (item.recommended && item.tone === "info") {
        item.tone = "good";
        item.label = "优先考虑";
      }
    });
    const items = [
      ...ranked,
      ...rows.filter((item) => !item.available),
    ];
    const recommended = ranked.find((item) => item.recommended);
    const dangerCount = rows.filter((item) => item.tone === "danger").length;
    return {
      label: "三案对比",
      tone: dangerCount >= 2 ? "warn" : recommended ? "good" : "info",
      detail: recommended
        ? `当前最值得先看的方案是“${recommended.choiceLabel}”。`
        : "三个方案各有明显代价，先看红线和今日目标再取舍。",
      items,
    };
  }

  function buildChoiceComparisonItem(state, choice) {
    const routeTag = choice.routeTag || getChoiceRouteTag(choice);
    if (!choice || choice.available === false) {
      return {
        choiceId: choice ? choice.id : "",
        choiceLabel: choice ? choice.label : "不可用选项",
        routeLabel: routeTag ? routeTag.label : "综合路线",
        order: 99,
        score: -999,
        available: false,
        tone: "danger",
        label: "暂不可用",
        detail: choice ? choice.lockedReason || "当前条件不足。" : "当前条件不足。",
        decisionTags: [
          { id: "locked", tone: "danger", label: "锁定", detail: choice ? choice.lockedReason || "当前条件不足。" : "当前条件不足。" },
        ],
      };
    }
    const trends = getChoiceOutcomePreview(state, choice.id);
    const risks = getChoiceRiskPreview(state, choice.id);
    const directiveFit = getChoiceDirectiveFit(state, choice.id);
    const trendScore = trends.reduce((sum, item) => sum + scoreActionDelta(state, item.metric, item.delta), 0);
    const riskScore = risks.reduce((sum, item) => {
      if (item.tone === "danger") return sum - 36;
      if (item.tone === "warn") return sum - 14;
      if (item.tone === "good") return sum + 18;
      return sum;
    }, 0);
    const directiveScore = directiveFit
      ? directiveFit.tone === "good"
        ? 20
        : directiveFit.tone === "danger"
          ? -20
          : directiveFit.tone === "warn"
            ? -8
            : 5
      : 0;
    const delayedPenalty = choice.delayed || (choice.effectPreview || []).some((item) => String(item).includes("后")) ? -5 : 0;
    const score = Math.round(trendScore + riskScore + directiveScore + delayedPenalty);
    const worstRisk = risks.find((item) => item.tone === "danger") || risks.find((item) => item.tone === "warn");
    const bestTrend = trends
      .map((item) => ({ ...item, value: scoreActionDelta(state, item.metric, item.delta) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)[0];
    const worstTrend = trends
      .map((item) => ({ ...item, value: scoreActionDelta(state, item.metric, item.delta) }))
      .filter((item) => item.value < 0)
      .sort((a, b) => a.value - b.value)[0];
    let tone = "info";
    let label = "备选路线";
    if (worstRisk && worstRisk.tone === "danger") {
      tone = "danger";
      label = "红线风险";
    } else if (directiveFit && directiveFit.tone === "good") {
      tone = "good";
      label = "救今日目标";
    } else if (score >= 24 && bestTrend) {
      tone = "good";
      label = "优先考虑";
    } else if (score <= -16 || (worstRisk && worstRisk.tone === "warn")) {
      tone = "warn";
      label = "代价偏高";
    } else if (delayedPenalty) {
      tone = "warn";
      label = "后续账单";
    }
    const details = [];
    if (directiveFit) details.push(directiveFit.label);
    if (bestTrend) details.push(`${bestTrend.short} ${signedDelta(bestTrend.delta)}`);
    if (worstTrend) details.push(`代价 ${worstTrend.short} ${signedDelta(worstTrend.delta)}`);
    if (worstRisk) details.push(worstRisk.label);
    const decisionTags = buildChoiceDecisionTags(choice, {
      directiveFit,
      worstRisk,
      bestTrend,
      worstTrend,
      delayedPenalty,
      score,
    });
    return {
      choiceId: choice.id,
      choiceLabel: choice.label,
      routeLabel: routeTag ? routeTag.label : "综合路线",
      order: choicesOrderHint(choice),
      score,
      available: true,
      tone,
      label,
      detail: details.join(" / ") || "这是一条较中性的策略路线。",
      decisionTags,
    };
  }

  function buildChoiceDecisionTags(choice, context) {
    const tags = [];
    const add = (id, tone, label, detail, priority) => {
      if (!label || tags.some((item) => item.id === id || item.label === label)) return;
      tags.push({ id, tone, label, detail, priority });
    };
    const { directiveFit, worstRisk, bestTrend, worstTrend, delayedPenalty, score } = context;
    if (directiveFit) {
      add(
        "directive",
        directiveFit.tone,
        directiveFit.tone === "good" ? "贴合目标" : directiveFit.tone === "danger" ? "偏离目标" : "目标有代价",
        directiveFit.detail,
        directiveFit.tone === "good" ? 98 : 88,
      );
    }
    if (worstRisk) {
      add(
        "risk",
        worstRisk.tone,
        worstRisk.tone === "danger" ? "红线风险" : "红线承压",
        worstRisk.detail,
        worstRisk.tone === "danger" ? 100 : 90,
      );
    } else if (score >= 18) {
      add("riskStable", "good", "红线平稳", "预计不会推进失败倒计时。", 54);
    }
    if (bestTrend) {
      add(
        "gain",
        "good",
        `收益${bestTrend.short}`,
        `${bestTrend.label} ${signedDelta(bestTrend.delta)}`,
        76 + Math.max(0, bestTrend.value || 0),
      );
    }
    if (worstTrend) {
      add(
        "cost",
        worstTrend.value <= -18 ? "danger" : "warn",
        `代价${worstTrend.short}`,
        `${worstTrend.label} ${signedDelta(worstTrend.delta)}`,
        72 + Math.abs(Math.min(0, worstTrend.value || 0)),
      );
    }
    if (delayedPenalty) {
      add(
        "delayed",
        "warn",
        "有后账",
        choice.delayed && choice.delayed.label ? `后续影响：${choice.delayed.label}` : "这项选择包含延迟后果。",
        70,
      );
    }
    const routeTag = choice.routeTag || getChoiceRouteTag(choice);
    if (routeTag && routeTag.label && routeTag.label !== "综合调度") {
      add("route", routeTag.tone || "info", routeTag.label, "治理路线标签。", 42);
    }
    return tags
      .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .slice(0, 4)
      .map(({ priority, ...item }) => item);
  }

  function choicesOrderHint(choice) {
    const id = String(choice && choice.id ? choice.id : "");
    const match = id.match(/c(\d+)$/);
    return match ? Number(match[1]) : 50;
  }

  function choiceFitDetail(bestGood, worstBad, fallback) {
    const parts = [];
    if (bestGood) parts.push(`主要收益：${bestGood.label} ${bestGood.delta > 0 ? "+" : ""}${bestGood.delta}`);
    if (worstBad) parts.push(`主要代价：${worstBad.label} ${worstBad.delta > 0 ? "+" : ""}${worstBad.delta}`);
    if (fallback) parts.push(fallback);
    return parts.join("；") || fallback || "根据当前局势，这是一个中性取舍。";
  }

  function getCityActionOutcomePreview(state, mode, actionId) {
    if (!state || state.ended || !actionId) return [];
    const normalizedMode = mode === "resolutions" ? "resolutions" : "operations";
    const status = getCityActionStatusByMode(state, normalizedMode, actionId);
    if (!status || !status.available) return [];

    const projected = clone(state);
    const before = snapshotValues(projected);
    if (normalizedMode === "resolutions") executeResolution(projected, actionId);
    else executeOperation(projected, actionId);

    const settlement = calculateProjectedDailyDeltas(projected);
    const after = {
      ...settlement.values.metrics,
      ...settlement.values.hidden,
      ...settlement.values.resources,
    };
    const changes = diffSnapshots(before, after);
    const rows = Object.entries(changes)
      .map(([metric, delta]) => buildTrendItem(metric, delta, before[metric], after[metric], "action", projected))
      .filter(Boolean);

    return rankTrendItems(rows);
  }

  function getCityActionLockPreview(state, mode, actionId) {
    if (!state || state.ended || !actionId) return null;
    const normalizedMode = mode === "resolutions" ? "resolutions" : "operations";
    const status = getCityActionStatusByMode(state, normalizedMode, actionId);
    if (!status || status.available) return null;
    const reason = unlockPreviewLabel(status.lockedReason);
    const detail = status.lockedDetail || status.lockedReason || "当前条件不足。";
    const reasonTone = status.lockedReason === "今日调度已满"
      ? "mixed"
      : status.lockedReason === "已通过" || status.lockedReason === "次数已用完"
        ? "neutral"
        : "bad";
    const reasonItem = {
      id: "lock_reason",
      short: reason,
      delta: "",
      display: reason,
      tone: reasonTone,
      detail,
      priority: 120,
    };
    const impactItems = buildLockedActionImpactItems(status)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
    return {
      label: normalizedMode === "resolutions" ? "决议未解锁" : "工程未解锁",
      title: `${status.label}：${detail}`,
      actionLabel: status.label,
      lockedReason: status.lockedReason,
      lockedDetail: detail,
      items: [reasonItem, ...impactItems],
    };
  }

  function getCityActionDecisionTags(state, mode, actionId) {
    if (!state || state.ended || !actionId) return [];
    const normalizedMode = mode === "resolutions" ? "resolutions" : "operations";
    const status = getCityActionStatusByMode(state, normalizedMode, actionId);
    if (!status) return [];
    const tags = [];
    const add = (id, tone, label, detail, priority) => {
      if (!label || tags.some((item) => item.id === id || item.label === label)) return;
      tags.push({ id, tone, label, detail, priority });
    };
    const routeTag = getChoiceRouteTag({ id: actionId });

    if (!status.available) {
      const lockTone = status.lockedReason === "资金不足" || status.lockedReason === "财政透支"
        ? "warn"
        : status.lockedReason === "已通过" || status.lockedReason === "次数已用完"
          ? "good"
          : "mixed";
      add("lock", lockTone, unlockPreviewLabel(status.lockedReason), status.lockedDetail || status.lockedReason || "当前条件不足。", 100);
      const lockPreview = getCityActionLockPreview(state, normalizedMode, actionId);
      const impact = lockPreview && lockPreview.items
        ? lockPreview.items.find((item) => item.metric && item.tone === "good")
          || lockPreview.items.find((item) => item.metric)
        : null;
      if (impact) {
        add(
          "lockedImpact",
          impact.tone === "good" ? "good" : impact.tone === "bad" ? "danger" : "info",
          impact.tone === "good" ? `可得${impact.short}` : `影响${impact.short}`,
          impact.detail || impact.display || "",
          72,
        );
      }
      if (routeTag && routeTag.label && routeTag.label !== "综合调度") add("route", routeTag.tone || "info", routeTag.label, "治理路线标签。", 42);
      return tags
        .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label, "zh-Hans-CN"))
        .slice(0, 4)
        .map(({ priority, ...item }) => item);
    }

    const directiveFit = getCityActionDirectiveFit(state, normalizedMode, actionId);
    if (directiveFit) {
      add(
        "directive",
        directiveFit.tone,
        directiveFit.tone === "good" ? "贴今日目标" : directiveFit.tone === "danger" ? "偏离目标" : "目标有代价",
        directiveFit.detail,
        directiveFit.tone === "good" ? 96 : 82,
      );
    }
    const forecast = getCityActionOutcomePreview(state, normalizedMode, actionId);
    const topGood = forecast.find((item) => item.tone === "good");
    const topBad = forecast.find((item) => item.tone === "bad" || item.tone === "danger");
    if (topGood) add("gain", "good", `收益${topGood.short}`, topGood.detail, 78);
    if (topBad) add("cost", topBad.delta && Math.abs(topBad.delta) >= 5 ? "danger" : "warn", `代价${topBad.short}`, topBad.detail, 76);

    const fundsNow = (status.resources && status.resources.funds) || 0;
    const fundsLater = (status.delayed && status.delayed.resources && status.delayed.resources.funds) || 0;
    if (fundsNow < 0) add("fundsCost", "warn", `耗资金 ${Math.abs(fundsNow)}`, "执行这项行动会立即消耗应急资金。", 70 + Math.min(18, Math.abs(fundsNow)));
    else if (fundsNow > 0 || fundsLater > 0) add("fundsGain", "good", "补资金", `资金 ${signedDelta(fundsNow + Math.max(0, fundsLater))}`, 70);

    if (status.delayed) {
      add(
        "delayed",
        status.delayed.completeProject ? "good" : "warn",
        status.delayed.completeProject ? "铺资产" : "有后续",
        `${status.delayed.delay || "后续"}日后：${status.delayed.label || "后续影响"}`,
        status.delayed.completeProject ? 68 : 64,
      );
    }
    if (!status.delayed && status.maxUses === 1) add("oneShot", "info", "一次性", "每局或本节点只能执行有限次数。", 52);
    if (routeTag && routeTag.label && routeTag.label !== "综合调度") add("route", routeTag.tone || "info", routeTag.label, "治理路线标签。", 42);

    return tags
      .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .slice(0, 4)
      .map(({ priority, ...item }) => item);
  }

  function getCityActionStatusByMode(state, normalizedMode, actionId) {
    return normalizedMode === "resolutions"
      ? getResolutionStatus(state, actionId)
      : getOperationStatus(state, actionId);
  }

  function buildLockedActionImpactItems(status) {
    const rows = [];
    const add = (metric, delta, source, delay = 0) => {
      if (!delta) return;
      const meta = METRIC_META[metric] || RESOURCE_META[metric];
      if (!meta) return;
      const bad = isBadDelta(metric, delta);
      const good = isGoodDelta(metric, delta);
      const display = `${delay ? `${delay}日后` : ""}${meta.short} ${delta > 0 ? "+" : ""}${delta}`;
      rows.push({
        metric,
        short: meta.short,
        delta,
        display,
        tone: good ? "good" : bad ? "bad" : "mixed",
        detail: `${meta.label}：这是“${status.label}”解锁并执行后的${source}影响。`,
        priority: (bad ? 70 : good ? 52 : 44) + Math.abs(delta) * 6 + (delay ? -4 : 0),
      });
    };
    Object.entries(status.resources || {}).forEach(([metric, delta]) => add(metric, delta, "即时"));
    Object.entries(status.effects || {}).forEach(([metric, delta]) => add(metric, delta, "即时"));
    Object.entries(status.hidden || {}).forEach(([metric, delta]) => add(metric, delta, "即时"));
    if (status.delayed) {
      const delay = status.delayed.delay || 0;
      Object.entries(status.delayed.resources || {}).forEach(([metric, delta]) => add(metric, delta, "延迟", delay));
      Object.entries(status.delayed.effects || {}).forEach(([metric, delta]) => add(metric, delta, "延迟", delay));
      Object.entries(status.delayed.hidden || {}).forEach(([metric, delta]) => add(metric, delta, "延迟", delay));
    }
    return rows;
  }

  function rankTrendItems(rows) {
    return rows
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6)
      .map(({ priority, ...item }) => item);
  }

  function buildTrendItem(metric, delta, before, after, mode = "baseline", contextState = null) {
    if (!delta) return null;
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    if (!meta) return null;
    const bad = isBadDelta(metric, delta);
    const good = isGoodDelta(metric, delta);
    const tone = good ? "good" : bad ? "bad" : "mixed";
    const abs = Math.abs(delta);
    const baseDetail = mode === "choice"
      ? `${meta.label}：若选择该策略，本日完整结算预计 ${before} → ${after}。`
      : mode === "action"
        ? `${meta.label}：若先执行该城市行动，不含今日事件选择，今晚趋势预计 ${before} → ${after}。`
        : `${meta.label}：按当前状态且不计入即将选择的事件策略，今晚结算预计 ${before} → ${after}。`;
    const contextHint = getDeltaContextHint(contextState, metric, delta);
    return {
      metric,
      label: meta.label,
      short: meta.short,
      delta,
      tone,
      detail: contextHint ? `${baseDetail} ${contextHint}` : baseDetail,
      priority: (bad ? 80 : good ? 45 : 55) + abs * 8 + (["infection", "hospitalLoad", "staffFatigue", "funds"].includes(metric) ? 6 : 0),
    };
  }

  function getDeltaHint(state, metric, delta) {
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    if (!meta) return "";
    const context = getDeltaContextHint(state, metric, delta);
    return context ? `${meta.description} ${context}` : meta.description;
  }

  function getDeltaContextHint(state, metric, delta) {
    if (!state || !metric || !delta) return "";
    const m = state.metrics || {};
    const h = state.hidden || {};
    const r = state.resources || {};
    if (metric === "policyStrictness") {
      if (delta > 0) {
        if ((m.infection || 0) >= 70) return "当前感染较高，增加管控更像止血：能压传播，但会继续消耗活力、信任和基层。";
        if ((m.staffFatigue || 0) >= 70 || (m.economy || 100) <= 40) return "基层或活力已经吃紧，继续加管控会更快转成疲劳和经济代价。";
        return "感染未处高位时，加管控更多是提前压风险，需要确认物资、信任和基层能承受。";
      }
      if (delta < 0) {
        if ((m.infection || 0) >= 65) return "当前感染仍高，放松管控会给传播留窗口，最好有较高发现率或医疗余裕兜底。";
        if ((m.economy || 100) <= 50 || (r.funds || 100) <= 30) return "放松管控能帮助活力和资金循环恢复，但仍要盯住发现率与感染反弹。";
        return "管控下降会释放流动和活力，也会削弱后续感染压制。";
      }
    }
    if (metric === "detectedRate" && delta < 0 && (h.detectedRate || 100) <= 45) {
      return "发现率已低，继续下降会放大信息盲区，让复工和分区判断更冒险。";
    }
    if (metric === "publicMemory" && delta > 0 && (h.publicMemory || 0) >= 45) {
      return "公共创伤已接近长期伤痕区，继续累积会压低信任恢复和结局评价。";
    }
    return "";
  }

  function isGoodDelta(metric, delta) {
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    if (!meta) return false;
    if (meta.direction === "good") return delta > 0;
    if (meta.direction === "danger") return delta < 0;
    return false;
  }

  function isBadDelta(metric, delta) {
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    if (!meta) return false;
    if (meta.direction === "good") return delta < 0;
    if (meta.direction === "danger") return delta > 0;
    return false;
  }

  function calculateProjectedDailyDeltas(state, incomingModifiers = {}) {
    const modifiers = normalizeDailyModifiers(incomingModifiers);
    const projection = {
      day: state.day,
      phase: state.phase,
      difficulty: state.difficulty,
      metrics: { ...state.metrics },
      hidden: { ...state.hidden },
      resources: { ...state.resources },
      completedProjects: { ...(state.completedProjects || {}) },
      flags: clone(state.flags || {}),
      dailyDelta: Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0])),
      deltas: {
        metrics: {},
        hidden: {},
        resources: {},
      },
    };

    (state.pendingEffects || [])
      .filter((item) => item.dueDay <= state.day)
      .forEach((item) => {
        if (!conditionMet(projectedState(projection), item.condition)) return;
        applyProjectedResourceDelta(projection, item.resources || {});
        applyProjectedCoreDelta(projection, item.effects || {});
        applyProjectedHiddenDelta(projection, item.hidden || {});
        if (item.completeProject) projection.completedProjects[item.completeProject] = true;
      });

    let phasePressure = PHASE_PRESSURE[projection.phase - 1] || 1;
    if (projection.metrics.infection > 85) phasePressure -= 1;

    const mobilityPressure = Math.round(projection.metrics.economy / 30) - Math.round(projection.hidden.policyStrictness / 25);
    const controlEffect = Math.round(projection.hidden.policyStrictness / 20) + Math.round(projection.metrics.trust / 35);
    let detectionEffect = projection.hidden.detectedRate >= 60 ? 1 : 0;
    if (projection.completedProjects.healthCode && projection.hidden.detectedRate >= 55) detectionEffect += 1;
    const fatiguePenalty = projection.metrics.staffFatigue >= 75 ? 2 : projection.metrics.staffFatigue >= 60 ? 1 : 0;
    const trustPenalty = projection.metrics.trust < 30 ? 2 : projection.metrics.trust < 45 ? 1 : 0;
    const strictControlEffect = projection.hidden.policyStrictness >= 80 ? 1 : 0;
    const openFlowPressure = projection.hidden.policyStrictness <= 15 ? 1 : 0;
    const projected = projectedState(projection);
    const microFlowPressure = getMicroRecoveryAssets(projected).length >= 2 && projection.hidden.detectedRate < 70 && projection.metrics.infection >= 45 ? 1 : 0;
    const infectionDelta = clamp(
      phasePressure + mobilityPressure - controlEffect - detectionEffect - strictControlEffect + openFlowPressure + microFlowPressure + fatiguePenalty + trustPenalty,
      -6,
      7,
    );
    applyProjectedCoreDelta(projection, { infection: infectionDelta });

    const hospitalSurgePenalty = projection.metrics.infection >= 70 && projection.hidden.detectedRate < 85 ? 1 : 0;
    const hospitalDelta = Math.round(projection.metrics.infection / 22)
      - modifiers.medicalRelief
      - getContinuityCareRelief(projected)
      - (projection.completedProjects.triageNetwork ? 1 : 0)
      - (projection.completedProjects.communityClinic ? 1 : 0)
      + (projection.metrics.supplies < 30 ? 1 : 0)
      + (projection.metrics.staffFatigue > 75 ? 1 : 0)
      + (projection.metrics.infection >= 80 ? 1 : 0)
      + hospitalSurgePenalty;
    applyProjectedCoreDelta(projection, { hospitalLoad: hospitalDelta });

    let supplyRecovery = 1 + modifiers.supplyRecovery;
    if (projection.metrics.economy < 30) supplyRecovery -= 1;
    if (projection.metrics.economy >= 75) supplyRecovery += 1;
    if (projection.completedProjects.supplyCorridor) supplyRecovery += 1;
    const stockRotationCost = projection.metrics.supplies >= 90 ? 1 : 0;
    const suppliesDelta = supplyRecovery
      + (projection.metrics.economy >= 60 ? 1 : 0)
      - Math.round(projection.hidden.policyStrictness / 35)
      - (projection.metrics.hospitalLoad >= 75 ? 1 : 0)
      - (projection.metrics.staffFatigue >= 70 ? 1 : 0)
      - stockRotationCost;
    applyProjectedCoreDelta(projection, { supplies: suppliesDelta });

    const strictTrustCost = projection.hidden.policyStrictness >= 75
      ? (projection.metrics.supplies >= 75 ? 0 : 1)
      : 0;
    const supplyTrustBonus = projection.metrics.supplies >= 80 && projection.metrics.trust < 80 ? 1 : 0;
    const expectationCost = projection.metrics.trust >= 92
      && (projection.metrics.infection >= 45 || projection.metrics.hospitalLoad >= 45 || projection.hidden.publicMemory >= 20)
      ? 2
      : 0;
    const trustDelta = modifiers.transparencyBonus
      + supplyTrustBonus
      - (projection.metrics.hospitalLoad >= 80 ? 2 : 0)
      - (projection.metrics.supplies < 30 ? 2 : 0)
      - strictTrustCost
      - expectationCost
      - (projection.hidden.publicMemory >= 60 ? 1 : 0);
    applyProjectedCoreDelta(projection, { trust: trustDelta });

    const economyDelta = calculateEconomyOutlook(projection, modifiers).delta;
    applyProjectedCoreDelta(projection, { economy: economyDelta });

    const fatigueBase = projection.metrics.staffFatigue >= 70 ? 1 : 2;
    const fatigueDelta = fatigueBase
      + Math.round(projection.hidden.policyStrictness / 25)
      + (projection.metrics.hospitalLoad >= 75 ? 1 : 0)
      + (projection.metrics.supplies < 30 ? 1 : 0)
      + (projection.hidden.policyStrictness >= 80 ? 1 : 0)
      + (projection.metrics.staffFatigue <= 25 && (projection.metrics.infection >= 45 || projection.metrics.hospitalLoad >= 45 || projection.hidden.policyStrictness >= 35) ? 1 : 0)
      - modifiers.restPolicyBonus
      - (projection.metrics.trust >= 70 ? 1 : 0);
    applyProjectedCoreDelta(projection, { staffFatigue: fatigueDelta });

    if (projection.metrics.staffFatigue >= 86) {
      applyProjectedCoreDelta(projection, {
        staffFatigue: -8,
        hospitalLoad: 3,
        supplies: -2,
        trust: -3,
        economy: -1,
      });
      applyProjectedHiddenDelta(projection, { publicMemory: 1 });
    }

    const fundsDelta = calculateFiscalOutlook(projection).delta;
    applyProjectedResourceDelta(projection, { funds: fundsDelta });

    if (projection.metrics.hospitalLoad >= 85) {
      applyProjectedCoreDelta(projection, { trust: -2 });
      applyProjectedHiddenDelta(projection, { publicMemory: 2 });
    }
    if (projection.metrics.supplies < 25) {
      applyProjectedCoreDelta(projection, { trust: -2, staffFatigue: 1 });
    }
    if (projection.metrics.staffFatigue >= 80 || projection.metrics.supplies < 25) {
      applyProjectedHiddenDelta(projection, { detectedRate: -1 });
    }
    if (projection.hidden.detectedRate > 85 && !modifiers.testingFocus) {
      applyProjectedHiddenDelta(projection, { detectedRate: -1 });
    }

    return {
      metrics: projection.deltas.metrics,
      hidden: projection.deltas.hidden,
      resources: projection.deltas.resources,
      values: {
        metrics: projection.metrics,
        hidden: projection.hidden,
        resources: projection.resources,
      },
    };
  }

  function normalizeDailyModifiers(modifiers = {}) {
    return {
      medicalRelief: modifiers.medicalRelief || 0,
      supplyRecovery: modifiers.supplyRecovery || 0,
      transparencyBonus: modifiers.transparencyBonus || 0,
      reopenBonus: modifiers.reopenBonus || 0,
      restPolicyBonus: modifiers.restPolicyBonus || 0,
      testingFocus: modifiers.testingFocus || 0,
    };
  }

  function projectedState(projection) {
    return {
      day: projection.day,
      phase: projection.phase,
      difficulty: projection.difficulty,
      metrics: projection.metrics,
      hidden: projection.hidden,
      resources: projection.resources,
      completedProjects: projection.completedProjects,
      flags: projection.flags,
    };
  }

  function applyProjectedCoreDelta(projection, effects = {}) {
    Object.entries(effects || {}).forEach(([metric, delta]) => {
      if (!CORE_METRICS.includes(metric) || !delta) return;
      const remainingCap = delta > 0
        ? DAILY_CORE_CAP - projection.dailyDelta[metric]
        : -DAILY_CORE_CAP - projection.dailyDelta[metric];
      const cappedDelta = clamp(delta, Math.min(0, remainingCap), Math.max(0, remainingCap));
      const before = projection.metrics[metric];
      const after = boundedMetricValue(metric, before + cappedDelta);
      const actual = after - before;
      projection.metrics[metric] = after;
      projection.dailyDelta[metric] += actual;
      addProjectedDelta(projection.deltas.metrics, metric, actual);
    });
  }

  function applyProjectedHiddenDelta(projection, effects = {}) {
    Object.entries(effects || {}).forEach(([metric, delta]) => {
      if (!HIDDEN_METRICS.includes(metric) || !delta) return;
      const before = projection.hidden[metric];
      const after = boundedMetricValue(metric, before + delta);
      projection.hidden[metric] = after;
      addProjectedDelta(projection.deltas.hidden, metric, after - before);
    });
  }

  function applyProjectedResourceDelta(projection, effects = {}) {
    Object.entries(effects || {}).forEach(([metric, delta]) => {
      if (!RESOURCE_METRICS.includes(metric) || !delta) return;
      const before = projection.resources[metric];
      const after = boundedMetricValue(metric, before + delta);
      projection.resources[metric] = after;
      addProjectedDelta(projection.deltas.resources, metric, after - before);
    });
  }

  function addProjectedDelta(target, metric, delta) {
    if (!delta) return;
    target[metric] = (target[metric] || 0) + delta;
    if (!target[metric]) delete target[metric];
  }

  const RECOVERY_FOCUS_IDS = new Set([
    "specialFundingApplication",
    "fiscalTransparencyLedger",
    "emergencyGapLedger",
    "budgetFreezeReview",
    "fastGrantReport",
    "bankCreditWindow",
    "insurancePreSettlement",
    "publicDonationDrive",
    "donationClaimList",
    "donationCoordination",
    "platformLogisticsShare",
    "interProvinceSupport",
    "procurementCreditNegotiation",
    "supplierPaymentExtension",
    "emergencyAccountClearing",
    "microEnterpriseRoster",
    "onlineVendorDesk",
    "factoryClosedLoop",
    "livelihoodStaggeredReopen",
    "essentialServicePermit",
    "contactlessLivelihoodStalls",
    "neighborhoodPickupWindow",
    "neighborhoodErrandRoster",
    "neighborhoodCommerceLedger",
    "onlineGovOvertime",
    "remoteApprovalDesk",
    "communityRepairWhitelist",
    "essentialMaintenanceRoster",
    "closedLoopSmallShift",
    "contactlessServiceRegistry",
    "microFreightPermit",
    "rentDeferralCoordination",
    "serviceVoucherPilot",
    "taxFeeDeferralDesk",
    "remoteWorkGovServices",
    "budgetReallocationMeeting",
    "mutualAidFund",
    "temporaryTurnoverPool",
    "lowContactBusinessPermit",
    "supplyOrderPrepaySwap",
    "deferProjectPayment",
    "lowRiskWorkList",
    "elasticTransit",
    "enterpriseExemption",
    "jobSubsidyAdvance",
    "emergencyLevy",
    "specialBondQuota",
    "nightFreightWindow",
  ]);

  const EARLY_RECOVERY_IDS = new Set([
    "fiscalTransparencyLedger",
    "emergencyGapLedger",
    "budgetFreezeReview",
    "fastGrantReport",
    "bankCreditWindow",
    "insurancePreSettlement",
    "publicDonationDrive",
    "donationClaimList",
    "emergencyAccountClearing",
    "microEnterpriseRoster",
    "onlineVendorDesk",
    "essentialServicePermit",
    "contactlessLivelihoodStalls",
    "neighborhoodPickupWindow",
    "neighborhoodErrandRoster",
    "neighborhoodCommerceLedger",
    "onlineGovOvertime",
    "remoteApprovalDesk",
    "essentialMaintenanceRoster",
    "taxFeeDeferralDesk",
    "serviceVoucherPilot",
    "remoteWorkGovServices",
    "specialFundingApplication",
    "donationCoordination",
    "interProvinceSupport",
    "procurementCreditNegotiation",
    "supplierPaymentExtension",
    "mutualAidFund",
    "temporaryTurnoverPool",
    "lowContactBusinessPermit",
    "supplyOrderPrepaySwap",
    "communityRepairWhitelist",
    "contactlessServiceRegistry",
    "microFreightPermit",
  ]);

  const LAST_RESORT_RECOVERY_IDS = new Set([
    "emergencyLevy",
    "specialBondQuota",
    "deferProjectPayment",
  ]);

  const SPOTLIGHT_RECOVERY_IDS = new Set([
    "publicDonationDrive",
    "serviceVoucherPilot",
  ]);

  const FISCAL_ROADMAP_IDS = new Set([
    "fiscalTransparencyLedger",
    "emergencyGapLedger",
    "budgetFreezeReview",
    "fastGrantReport",
    "bankCreditWindow",
    "insurancePreSettlement",
    "publicDonationDrive",
    "donationClaimList",
    "donationCoordination",
    "platformLogisticsShare",
    "interProvinceSupport",
    "procurementCreditNegotiation",
    "supplierPaymentExtension",
    "emergencyAccountClearing",
    "specialFundingApplication",
    "neighborhoodCommerceLedger",
    "mutualAidFund",
    "temporaryTurnoverPool",
    "supplyOrderPrepaySwap",
  ]);

  const MICRO_ROADMAP_IDS = new Set([
    "remoteApprovalDesk",
    "onlineGovOvertime",
    "remoteWorkGovServices",
    "microEnterpriseRoster",
    "onlineVendorDesk",
    "essentialServicePermit",
    "contactlessLivelihoodStalls",
    "neighborhoodPickupWindow",
    "neighborhoodErrandRoster",
    "neighborhoodCommerceLedger",
    "essentialMaintenanceRoster",
    "communityRepairWhitelist",
    "microFreightPermit",
    "closedLoopSmallShift",
    "contactlessServiceRegistry",
    "serviceVoucherPilot",
    "livelihoodStaggeredReopen",
    "factoryClosedLoop",
    "lowContactBusinessPermit",
    "lowRiskWorkList",
    "elasticTransit",
  ]);

  const FISCAL_CHANNEL_GROUPS = [
    {
      id: "appropriation",
      label: "专项拨付",
      target: 2,
      tone: "good",
      ids: ["fiscalTransparencyLedger", "emergencyGapLedger", "fastGrantReport", "specialFundingApplication", "insurancePreSettlement", "budgetFreezeReview"],
      empty: "缺少可核验材料时，资金只能靠事件或透支救急。",
      available: "先用台账、缺口清单或专项快报把现金流做成可批复项目。",
      ready: "拨付链条已经铺开，低资金时更容易形成小额回流。",
      risk: "代价通常是填报、审计和一点活力摩擦。",
    },
    {
      id: "mutualAid",
      label: "社会协作",
      target: 2,
      tone: "good",
      ids: ["publicDonationDrive", "donationClaimList", "donationCoordination", "mutualAidFund", "interProvinceSupport", "platformLogisticsShare"],
      empty: "社会捐助和外部支援还没有被转成可调度账本。",
      available: "信任尚可时，可以把捐助、平台运力和省际支援做成公开清单。",
      ready: "社会协作已有抓手，物资、资金和人手能互相补位。",
      risk: "低信任会让登记、公示和分配争议反噬。",
    },
    {
      id: "creditBridge",
      label: "账期授信",
      target: 2,
      tone: "mixed",
      ids: ["bankCreditWindow", "procurementCreditNegotiation", "supplierPaymentExtension", "emergencyAccountClearing", "temporaryTurnoverPool"],
      empty: "短期信用桥还没打开，遇到大工程时容易现金断档。",
      available: "用授信、账期谈判和小额清分换取几天周转窗口。",
      ready: "信用桥已经形成，短期能缓冲工程支出。",
      risk: "这不是免费资金，后续会以还款、信任或供应压力回流。",
    },
    {
      id: "lowContactVitality",
      label: "低接触活力",
      target: 3,
      tone: "info",
      ids: ["microEnterpriseRoster", "remoteApprovalDesk", "onlineGovOvertime", "remoteWorkGovServices", "onlineVendorDesk", "essentialServicePermit", "contactlessLivelihoodStalls", "neighborhoodPickupWindow", "neighborhoodErrandRoster", "neighborhoodCommerceLedger", "essentialMaintenanceRoster", "communityRepairWhitelist", "serviceVoucherPilot", "lowContactBusinessPermit"],
      empty: "前期活力主要靠自然结算，缺少低流动恢复节点。",
      available: "优先铺线上预审、民生名录、预约取货或低接触许可。",
      ready: "低接触微循环已经成网，活力恢复更稳。",
      risk: "发现率不足时，微循环会把传播压力带回每日结算。",
    },
    {
      id: "productionLoop",
      label: "保供产能",
      target: 2,
      tone: "mixed",
      ids: ["supplyCorridor", "microFreightPermit", "closedLoopSmallShift", "factoryClosedLoop", "livelihoodStaggeredReopen", "supplyOrderPrepaySwap", "nightFreightWindow"],
      empty: "物流和产能还没形成闭环，供应与活力会互相拖累。",
      available: "用保供专线、货运微循环或闭环小班托住物资和产能。",
      ready: "保供产能链已经成形，供应、活力和资金能彼此支撑。",
      risk: "它比纯线上恢复更强，也更容易带来感染和排班压力。",
    },
    {
      id: "lastResort",
      label: "最后手段",
      target: 1,
      tone: "danger",
      ids: ["budgetReallocationMeeting", "specialBondQuota", "deferProjectPayment", "emergencyLevy"],
      empty: "透支类选项应留给资金红线，不适合当常规收入。",
      available: "资金见底时，可以用预算重排、专项债或摊派救急。",
      ready: "已经动用过透支工具，后续要尽快用温和渠道还账。",
      risk: "收益直接，但会转化为信任、活力、创伤或后续账单。",
    },
  ];

  const MEDICAL_PRESSURE_TARGETS = [
    ["operations", "triageNetwork"],
    ["operations", "communityClinic"],
    ["operations", "interProvinceSupport"],
    ["operations", "buildShelterHospital"],
    ["resolutions", "shelterAdmissionStandard"],
    ["resolutions", "priorityMedicineRoute"],
  ];

  const DETECTION_PRESSURE_TARGETS = [
    ["operations", "deployHealthCode"],
    ["operations", "campusSentinel"],
    ["operations", "triageNetwork"],
    ["operations", "communityClinic"],
    ["resolutions", "suppressRumorLine"],
  ];

  const SUPPLY_PRESSURE_TARGETS = [
    ["operations", "supplyCorridor"],
    ["operations", "donationCoordination"],
    ["operations", "publicDonationDrive"],
    ["operations", "donationClaimList"],
    ["operations", "platformLogisticsShare"],
    ["operations", "interProvinceSupport"],
    ["resolutions", "hardWarehouse"],
  ];

  const FATIGUE_PRESSURE_TARGETS = [
    ["operations", "mentalHealthLine"],
    ["operations", "volunteerDispatch"],
    ["operations", "interProvinceSupport"],
    ["resolutions", "staffRotationOrder"],
    ["resolutions", "communityAutonomy"],
  ];

  const TRUST_PRESSURE_TARGETS = [
    ["resolutions", "priorityMedicineRoute"],
    ["operations", "medicineRoute"],
    ["operations", "mentalHealthLine"],
    ["resolutions", "publicReviewBrief"],
    ["operations", "fiscalTransparencyLedger"],
  ];

  const MEMORY_PRESSURE_TARGETS = [
    ["resolutions", "publicReviewBrief"],
    ["resolutions", "priorityMedicineRoute"],
    ["operations", "medicineRoute"],
    ["operations", "mentalHealthLine"],
  ];

  const POLICY_PRESSURE_TARGETS = [
    ["resolutions", "nightFreightWindow"],
    ["resolutions", "elasticTransit"],
    ["resolutions", "lowContactBusinessPermit"],
    ["resolutions", "lowRiskWorkList"],
    ["operations", "microFreightPermit"],
  ];

  const ECONOMY_PRESSURE_TARGETS = [
    ["operations", "remoteApprovalDesk"],
    ["operations", "onlineVendorDesk"],
    ["operations", "microEnterpriseRoster"],
    ["operations", "essentialServicePermit"],
    ["operations", "neighborhoodPickupWindow"],
    ["resolutions", "lowContactBusinessPermit"],
    ["resolutions", "lowRiskWorkList"],
    ["resolutions", "elasticTransit"],
  ];

  const FUNDS_PRESSURE_TARGETS = [
    ["operations", "fiscalTransparencyLedger"],
    ["operations", "emergencyGapLedger"],
    ["operations", "budgetFreezeReview"],
    ["operations", "fastGrantReport"],
    ["operations", "bankCreditWindow"],
    ["operations", "insurancePreSettlement"],
    ["resolutions", "temporaryTurnoverPool"],
    ["resolutions", "emergencyLevy"],
  ];

  const PENDING_PRESSURE_TARGETS = {
    infection: DETECTION_PRESSURE_TARGETS,
    hospitalLoad: MEDICAL_PRESSURE_TARGETS,
    supplies: SUPPLY_PRESSURE_TARGETS,
    trust: TRUST_PRESSURE_TARGETS,
    economy: ECONOMY_PRESSURE_TARGETS,
    staffFatigue: FATIGUE_PRESSURE_TARGETS,
    funds: FUNDS_PRESSURE_TARGETS,
    detectedRate: DETECTION_PRESSURE_TARGETS,
    policyStrictness: POLICY_PRESSURE_TARGETS,
    publicMemory: MEMORY_PRESSURE_TARGETS,
  };

  const STATUS_EFFECT_TARGETS = {
    infectionHigh: DETECTION_PRESSURE_TARGETS,
    infectionLow: ECONOMY_PRESSURE_TARGETS,
    hospitalHigh: MEDICAL_PRESSURE_TARGETS,
    hospitalLow: FATIGUE_PRESSURE_TARGETS,
    suppliesHigh: POLICY_PRESSURE_TARGETS,
    suppliesLow: SUPPLY_PRESSURE_TARGETS,
    trustHigh: DETECTION_PRESSURE_TARGETS,
    trustLow: TRUST_PRESSURE_TARGETS,
    economyHigh: FUNDS_PRESSURE_TARGETS,
    economyLow: ECONOMY_PRESSURE_TARGETS,
    fatigueHigh: FATIGUE_PRESSURE_TARGETS,
    fatigueFuse: FATIGUE_PRESSURE_TARGETS,
    fatigueLow: MEDICAL_PRESSURE_TARGETS,
    fundsLow: FUNDS_PRESSURE_TARGETS,
    fundsHigh: MEDICAL_PRESSURE_TARGETS,
    detectedHigh: ECONOMY_PRESSURE_TARGETS,
    detectedLow: DETECTION_PRESSURE_TARGETS,
    policyHigh: POLICY_PRESSURE_TARGETS,
    policyLow: DETECTION_PRESSURE_TARGETS,
    memoryHigh: MEMORY_PRESSURE_TARGETS,
    memoryLow: TRUST_PRESSURE_TARGETS,
  };

  const ACTION_OPPORTUNITY_LOCKS = new Set(["条件未满足", "资金不足", "财政透支", "今日调度已满"]);

  function getCityActionOpportunities(state) {
    if (!state || state.ended) {
      return {
        tone: "info",
        detail: "",
        items: [],
        lockedItems: [],
        nextDayItems: [],
        queue: { tone: "info", headline: "", detail: "", steps: [], routeSpread: [] },
        availableCount: 0,
        lockedCount: 0,
        nextDayCount: 0,
        totalCount: 0,
        budget: { remaining: 0, limit: CITY_ACTIONS_PER_DAY },
      };
    }

    const seen = new Set();
    const available = [];
    const locked = [];
    MAP_POINTS.forEach((pointDef) => {
      const point = getMapPoint(state, pointDef.id);
      [
        { mode: "operations", kind: "工程", items: point.operations },
        { mode: "resolutions", kind: "决议", items: point.resolutions },
      ].forEach((group) => {
        group.items.forEach((item) => {
          const key = `${group.mode}:${item.id}`;
          if (seen.has(key)) return;
          seen.add(key);
          if (item.available) {
            available.push(buildActionOpportunity(state, pointDef, item, group, "available"));
          } else if (ACTION_OPPORTUNITY_LOCKS.has(item.lockedReason)) {
            locked.push(buildActionOpportunity(state, pointDef, item, group, "locked"));
          }
        });
      });
    });

    const sorter = (a, b) => b.priority - a.priority
      || a.kind.localeCompare(b.kind, "zh-Hans-CN")
      || a.label.localeCompare(b.label, "zh-Hans-CN");
    available.sort(sorter);
    locked.sort(sorter);
    const tomorrow = locked.filter((item) => item.lockedReason === "今日调度已满");
    const lockedPreview = locked.filter((item) => item.lockedReason !== "今日调度已满");

    const budget = getCityActionBudget(state);
    const tone = budget.exhausted
      ? "warn"
      : available.length
        ? "good"
        : locked.some((item) => item.lockedReason === "资金不足" || item.lockedReason === "财政透支")
          ? "warn"
          : "info";
    const detail = budget.exhausted
      ? `今日城市调度已满，已整理 ${tomorrow.length} 个明日可排项目。`
      : available.length
        ? `当前有 ${available.length} 个可执行城市行动，优先处理能缓解红线或补足长期资产的项目。`
        : lockedPreview.length || tomorrow.length
          ? "暂无可执行行动，但有接近解锁的工程或决议，可先补资金、条件或等待明日调度。"
          : "暂无明确城市行动窗口，先处理今日事件。";
    const queue = buildActionOpportunityQueue(available, tomorrow, lockedPreview, budget);

    return {
      tone,
      detail,
      queue,
      items: available.slice(0, (lockedPreview.length || tomorrow.length) ? 4 : 6),
      nextDayItems: tomorrow.slice(0, budget.exhausted ? 5 : 3),
      lockedItems: lockedPreview.slice(0, (available.length || tomorrow.length) ? 3 : 5),
      availableCount: available.length,
      lockedCount: lockedPreview.length,
      nextDayCount: tomorrow.length,
      totalCount: available.length + locked.length,
      budget,
    };
  }

  function buildActionOpportunityQueue(available, tomorrow, lockedPreview, budget) {
    const steps = [];
    const addStep = (item, queueLabel, tone, detailOverride = "") => {
      if (!item || steps.some((step) => step.id === item.id && step.mode === item.mode)) return;
      steps.push({
        id: item.id,
        mode: item.mode,
        pointId: item.pointId,
        kind: item.kind,
        pointLabel: item.pointLabel,
        label: item.label,
        queueLabel,
        status: item.status || "",
        route: item.routeTag && item.routeTag.label ? item.routeTag.label : "",
        tone: tone || item.tone || "info",
        detail: detailOverride || item.reason || item.impact || item.detail || "",
      });
    };

    if (!budget.exhausted && available.length) {
      addStep(available[0], "今日首选", "good");
      if (budget.remaining > 1) addStep(available[1], "同日备选", available[1] ? available[1].tone : "info");
      addStep(tomorrow[0], "明日排队", "info");
      if (steps.length < 3) addStep(lockedPreview[0], "解锁卡点", lockedPreview[0] ? lockedPreview[0].tone : "warn");
    } else if (budget.exhausted) {
      addStep(
        tomorrow[0],
        "明日首排",
        "info",
        tomorrow[0] ? `今日额度已满，明日优先处理：${tomorrow[0].reason || tomorrow[0].impact || "继续排队"}` : "",
      );
      addStep(tomorrow[1], "明日备选", "info");
      if (steps.length < 3) addStep(lockedPreview[0], "解锁卡点", lockedPreview[0] ? lockedPreview[0].tone : "warn");
    } else {
      addStep(lockedPreview[0], "先解卡点", lockedPreview[0] ? lockedPreview[0].tone : "warn");
      addStep(lockedPreview[1], "备选卡点", lockedPreview[1] ? lockedPreview[1].tone : "mixed");
      addStep(tomorrow[0], "明日排队", "info");
    }

    const primary = steps[0];
    const headline = primary
      ? `${primary.queueLabel}：${primary.label}`
      : budget.exhausted
        ? "今日额度已满，处理事件后刷新调度。"
        : "暂时没有明确行动队列。";
    const detail = primary
      ? `${primary.kind} / ${primary.pointLabel}${primary.route ? ` / ${primary.route}` : ""}。${primary.detail}`
      : "先观察今日事件和压力摘要，等新的工程或决议窗口出现。";
    return {
      tone: primary ? primary.tone : budget.exhausted ? "warn" : "info",
      headline,
      detail,
      steps: steps.slice(0, 3),
      routeSpread: summarizeActionQueueRoutes(available),
    };
  }

  function summarizeActionQueueRoutes(items) {
    const counts = new Map();
    items.slice(0, 6).forEach((item) => {
      const label = item.routeTag && item.routeTag.label ? item.routeTag.label : "";
      if (!label) return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }));
  }

  function buildActionOpportunity(state, pointDef, item, group, bucket) {
    const focusPoint = MAP_POINTS.find((point) => point.id === item.location) || pointDef;
    const forecast = item.available ? getCityActionOutcomePreview(state, group.mode, item.id).slice(0, 4) : [];
    const routeTag = getChoiceRouteTag({ id: item.id });
    const priority = actionOpportunityPriority(state, item, focusPoint.id, bucket);
    const tradeoffs = rankActionTradeoffs(state, item);
    return {
      id: item.id,
      mode: group.mode,
      kind: group.kind,
      pointId: focusPoint.id,
      pointLabel: focusPoint.label,
      label: item.label,
      routeTag,
      status: bucket === "available" ? actionOpportunityStatus(priority) : unlockPreviewLabel(item.lockedReason),
      bucket,
      tone: actionOpportunityTone(item, bucket, priority),
      reason: actionOpportunityReason(state, item, bucket, tradeoffs),
      impact: summarizeActionImpact(item, tradeoffs),
      forecast,
      lockedReason: item.lockedReason || "",
      detail: item.available ? item.description : item.lockedDetail || item.lockedReason || item.description,
      available: bucket === "available",
      priority,
    };
  }

  function actionOpportunityStatus(priority) {
    if (priority >= 48) return "优先窗口";
    if (priority >= 26) return "可执行";
    return "备选";
  }

  function actionOpportunityTone(item, bucket, priority) {
    if (bucket !== "available") {
      if (item.lockedReason === "资金不足" || item.lockedReason === "财政透支") return "warn";
      if (item.lockedReason === "今日调度已满") return "info";
      return "mixed";
    }
    if (priority >= 48) return "good";
    if (priority >= 26) return "info";
    return "mixed";
  }

  function actionOpportunityPriority(state, item, pointId, bucket) {
    let score = pointId === state.selectedMapPointId ? 2 : 0;
    const tradeoffs = rankActionTradeoffs(state, item, true);
    tradeoffs.forEach((entry) => {
      score += entry.score;
    });
    if (bucket === "locked") {
      score -= 8;
      if (item.lockedReason === "今日调度已满") score += 18;
      if (item.lockedReason === "资金不足" || item.lockedReason === "财政透支") score += state.resources.funds <= 25 ? 12 : 5;
      if (item.lockedReason === "条件未满足") score += 4;
    }
    if (item.delayed) score += 3;
    if (item.maxUses === 1 && item.uses === 0) score += 1;
    return Math.round(score);
  }

  function rankActionTradeoffs(state, item, weighted = false) {
    const changes = collectActionDeltas(item);
    return changes
      .map((entry) => {
        const score = scoreActionDelta(state, entry.metric, entry.delta) * entry.weight;
        return {
          ...entry,
          good: isGoodDelta(entry.metric, entry.delta),
          bad: isBadDelta(entry.metric, entry.delta),
          score: weighted ? score : Math.round(score),
        };
      })
      .filter((entry) => entry.delta)
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score)
        || Math.abs(b.delta) - Math.abs(a.delta)
        || actionMetricLabel(a.metric).localeCompare(actionMetricLabel(b.metric), "zh-Hans-CN"));
  }

  function collectActionDeltas(item) {
    const rows = [];
    const addMap = (map = {}, weight = 1, delayed = false) => {
      Object.entries(map || {}).forEach(([metric, delta]) => {
        if (!delta) return;
        const meta = METRIC_META[metric] || RESOURCE_META[metric];
        if (!meta) return;
        rows.push({ metric, delta, weight, delayed });
      });
    };
    addMap(item.resources, 1, false);
    addMap(item.effects, 1, false);
    addMap(item.hidden, 1, false);
    if (item.delayed) {
      addMap(item.delayed.resources, 0.55, true);
      addMap(item.delayed.effects, 0.55, true);
      addMap(item.delayed.hidden, 0.55, true);
    }
    const merged = new Map();
    rows.forEach((row) => {
      const key = `${row.delayed ? "delayed" : "now"}:${row.metric}`;
      const existing = merged.get(key);
      if (existing) existing.delta += row.delta;
      else merged.set(key, { ...row });
    });
    return [...merged.values()].filter((row) => row.delta);
  }

  function scoreActionDelta(state, metric, delta) {
    const pressure = actionMetricPressure(state, metric);
    const good = isGoodDelta(metric, delta);
    const bad = isBadDelta(metric, delta);
    if (good) return Math.abs(delta) * pressure * actionMetricWeight(metric);
    if (bad) return -Math.abs(delta) * Math.max(1, 5 - pressure) * actionMetricWeight(metric);
    return 0;
  }

  function actionMetricPressure(state, metric) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    if (metric === "infection") return m.infection >= 80 ? 5 : m.infection >= 65 ? 4 : m.infection >= 50 ? 2 : 1;
    if (metric === "hospitalLoad") return m.hospitalLoad >= 85 ? 5 : m.hospitalLoad >= 70 ? 4 : m.hospitalLoad >= 55 ? 2 : 1;
    if (metric === "supplies") return m.supplies <= 25 ? 5 : m.supplies <= 40 ? 4 : m.supplies <= 55 ? 2 : 1;
    if (metric === "trust") return m.trust <= 30 ? 5 : m.trust <= 45 ? 4 : m.trust <= 58 ? 2 : 1;
    if (metric === "economy") return m.economy <= 25 ? 5 : m.economy <= 40 ? 4 : m.economy <= 58 ? 2 : 1;
    if (metric === "staffFatigue") return m.staffFatigue >= 80 ? 5 : m.staffFatigue >= 65 ? 4 : m.staffFatigue >= 52 ? 2 : 1;
    if (metric === "detectedRate") return h.detectedRate <= 35 ? 4 : h.detectedRate <= 55 ? 2 : 1;
    if (metric === "policyStrictness") return h.policyStrictness >= 80 || h.policyStrictness <= 15 ? 2 : 1;
    if (metric === "publicMemory") return h.publicMemory >= 60 ? 5 : h.publicMemory >= 40 ? 3 : 1;
    if (metric === "funds") return r.funds <= 15 ? 5 : r.funds <= 30 ? 4 : r.funds <= 50 ? 2 : 1;
    return 1;
  }

  function actionMetricWeight(metric) {
    if (metric === "hospitalLoad") return 1.22;
    if (metric === "infection" || metric === "staffFatigue" || metric === "funds") return 1.15;
    if (metric === "supplies" || metric === "trust") return 1.08;
    return 1;
  }

  function actionOpportunityReason(state, item, bucket, tradeoffs) {
    if (bucket !== "available") {
      if (item.lockedReason === "今日调度已满") {
        const best = tradeoffs.find((entry) => entry.good && entry.score > 0);
        const worst = tradeoffs.find((entry) => entry.bad && entry.score < 0);
        if (best && worst) return `明日可排：${formatActionDelta(best)}；代价 ${formatActionDelta(worst)}。`;
        if (best) return `明日可排：${formatActionDelta(best)}。`;
      }
      return item.lockedDetail || item.lockedReason || "当前条件不足。";
    }
    const best = tradeoffs.find((entry) => entry.good && entry.score > 0);
    const worst = tradeoffs.find((entry) => entry.bad && entry.score < 0);
    if (!best) return "这项行动更偏长期铺垫，适合在红线不紧时补资产。";
    const pressure = actionPressureLabel(state, best.metric);
    const gain = formatActionDelta(best);
    if (worst) return `${pressure}：${gain}；主要代价是${formatActionDelta(worst)}。`;
    return `${pressure}：${gain}，且短期代价较轻。`;
  }

  function summarizeActionImpact(item, tradeoffs = rankActionTradeoffs({ metrics: INITIAL_VALUES, hidden: INITIAL_VALUES, resources: INITIAL_VALUES }, item)) {
    const highlights = tradeoffs
      .filter((entry) => entry.good || entry.bad)
      .slice(0, 3)
      .map((entry) => formatActionDelta(entry));
    return highlights.length ? highlights.join(" / ") : "综合调度";
  }

  function formatActionDelta(entry) {
    const suffix = entry.delayed ? "后续" : "";
    return `${suffix}${actionMetricShort(entry.metric)} ${entry.delta > 0 ? "+" : ""}${entry.delta}`;
  }

  function actionMetricShort(metric) {
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    return meta ? meta.short : metric;
  }

  function actionMetricLabel(metric) {
    const meta = METRIC_META[metric] || RESOURCE_META[metric];
    return meta ? meta.label : metric;
  }

  function actionPressureLabel(state, metric) {
    const pressure = actionMetricPressure(state, metric);
    const label = actionMetricLabel(metric);
    if (pressure >= 5) return `${label}红线`;
    if (pressure >= 4) return `${label}高压`;
    if (pressure >= 2) return `${label}窗口`;
    return `${label}铺垫`;
  }

  function unlockPreviewLabel(reason) {
    if (reason === "今日调度已满") return "明日可排";
    if (reason === "资金不足" || reason === "财政透支") return "等资金";
    if (reason === "条件未满足") return "差条件";
    return reason || "未解锁";
  }

  function getRecoveryLevers(state) {
    if (!state || state.ended) {
      return { tone: "info", detail: "", items: [], availableCount: 0, totalCount: 0 };
    }

    const rows = collectRecoveryLeverRows(state);
    const sorted = rows.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.bucket !== b.bucket) return recoveryBucketRank(a.bucket) - recoveryBucketRank(b.bucket);
      return a.label.localeCompare(b.label, "zh-Hans-CN");
    });
    const availableCount = sorted.filter((item) => item.bucket === "available").length;
    const establishedCount = sorted.filter((item) => item.bucket === "established").length;
    const pressure = Math.max(0, 55 - state.resources.funds) + Math.max(0, 58 - state.metrics.economy);
    const tone = state.resources.funds <= 15 || state.metrics.economy <= 25
      ? "danger"
      : availableCount
        ? "good"
        : pressure > 24
          ? "warn"
          : "info";
    const detail = availableCount
      ? `当前有 ${availableCount} 条资金或活力恢复渠道可执行。`
      : establishedCount
        ? `已有 ${establishedCount} 条恢复铺垫生效，等待条件或次日调度。`
        : "暂无立即可用恢复渠道，可先改善条件或处理今日事件。";

    return {
      tone,
      detail,
      items: sorted.slice(0, 7),
      availableCount,
      totalCount: sorted.length,
    };
  }

  function collectRecoveryLeverRows(state) {
    const seen = new Set();
    const rows = [];
    MAP_POINTS.forEach((pointDef) => {
      const point = getMapPoint(state, pointDef.id);
      [
        { mode: "operations", kind: "工程", items: point.operations },
        { mode: "resolutions", kind: "决议", items: point.resolutions },
      ].forEach((group) => {
        group.items.forEach((item) => {
          const key = `${group.mode}:${item.id}`;
          if (seen.has(key)) return;
          seen.add(key);
          const value = recoveryLeverValue(item);
          if (!value.relevant) return;
          const bucket = recoveryLeverBucket(item);
          const routeTag = value.routeTag || getChoiceRouteTag({ id: item.id });
          rows.push({
            id: item.id,
            mode: group.mode,
            kind: group.kind,
            pointId: pointDef.id,
            pointLabel: pointDef.label,
            label: item.label,
            route: value.route,
            routeTag,
            fundsGain: value.fundsGain,
            economyGain: value.economyGain,
            impact: recoveryLeverImpact(item),
            status: recoveryLeverStatus(item, bucket),
            detail: item.available ? item.description : item.lockedDetail || item.lockedReason || item.description,
            lockedReason: item.lockedReason || "",
            lockedDetail: item.lockedDetail || "",
            bucket,
            tone: recoveryLeverTone(item, bucket, value),
            priority: recoveryLeverPriority(state, item, bucket, value),
          });
        });
      });
    });
    return rows;
  }

  function recoveryLeverValue(item) {
    const resources = item.resources || {};
    const effects = item.effects || {};
    const delayed = item.delayed || {};
    const delayedResources = delayed.resources || {};
    const delayedEffects = delayed.effects || {};
    const immediateFunds = resources.funds || 0;
    const delayedFunds = delayedResources.funds || 0;
    const immediateEconomy = effects.economy || 0;
    const delayedEconomy = delayedEffects.economy || 0;
    const fundsGain = Math.max(0, immediateFunds) + Math.max(0, delayedFunds);
    const economyGain = Math.max(0, immediateEconomy) + Math.max(0, delayedEconomy);
    const relevant = fundsGain > 0 || economyGain > 0 || RECOVERY_FOCUS_IDS.has(item.id);
    const routeTag = getChoiceRouteTag({ id: item.id });
    let route = routeTag && routeTag.label && routeTag.label !== "综合调度"
      ? routeTag.label
      : "恢复";
    if (route === "恢复财政") {
      if (fundsGain > 0 && economyGain > 0) route = "资金+活力";
      else if (fundsGain > 0) route = "筹措资金";
      else if (economyGain > 0) route = "低接触活力";
      else if (RECOVERY_FOCUS_IDS.has(item.id)) route = "铺垫";
    }
    return { relevant, fundsGain, economyGain, route, routeTag };
  }

  function recoveryLeverBucket(item) {
    if (item.available) return "available";
    if (item.lockedReason === "次数已用完" || item.lockedReason === "已通过") return "established";
    return "locked";
  }

  function recoveryLeverTone(item, bucket, value) {
    if (bucket === "available") return value.fundsGain && value.economyGain ? "good" : "info";
    if (bucket === "established") return "good";
    if (item.lockedReason === "资金不足" || item.lockedReason === "财政透支") return "danger";
    if (item.lockedReason === "今日调度已满") return "warn";
    return "mixed";
  }

  function recoveryLeverStatus(item, bucket) {
    if (bucket === "available") return "可执行";
    if (bucket === "established") return "已铺垫";
    if (item.lockedReason === "今日调度已满") return "明日调度";
    if (item.lockedReason === "资金不足" || item.lockedReason === "财政透支") return "等资金";
    return "差条件";
  }

  function recoveryLeverImpact(item) {
    const parts = [];
    const resources = item.resources || {};
    const effects = item.effects || {};
    const delayed = item.delayed || {};
    const delayedResources = delayed.resources || {};
    const delayedEffects = delayed.effects || {};
    const add = (label, value) => {
      if (!value) return;
      parts.push(`${label} ${value > 0 ? "+" : ""}${value}`);
    };
    add("资金", resources.funds);
    add("活力", effects.economy);
    if (delayedResources.funds) add(`${delayed.delay || "后续"}日后资金`, delayedResources.funds);
    if (delayedEffects.economy) add(`${delayed.delay || "后续"}日后活力`, delayedEffects.economy);
    return parts.length ? parts.slice(0, 3).join(" / ") : "形成恢复铺垫";
  }

  function recoveryLeverPriority(state, item, bucket, value) {
    let score = 0;
    if (bucket === "available") score += 70;
    else if (bucket === "locked" && item.lockedReason === "今日调度已满") score += 54;
    else if (bucket === "established") score += 38;
    else score += 24;
    score += value.fundsGain * (state.resources.funds <= 25 ? 6 : state.resources.funds <= 45 ? 4 : 2);
    score += value.economyGain * (state.metrics.economy <= 35 ? 5 : state.metrics.economy <= 55 ? 3 : 1);
    if (EARLY_RECOVERY_IDS.has(item.id)) score += state.day <= 18 ? 18 : 8;
    if (SPOTLIGHT_RECOVERY_IDS.has(item.id)) score += state.day <= 18 ? 22 : 10;
    if (LAST_RESORT_RECOVERY_IDS.has(item.id) && state.resources.funds > 30) score -= 35;
    if (bucket === "locked" && item.lockedReason === "条件未满足") score -= 6;
    if (item.lockedReason === "资金不足" || item.lockedReason === "财政透支") score -= 8;
    if (RECOVERY_FOCUS_IDS.has(item.id)) score += 5;
    return Math.round(score);
  }

  function recoveryBucketRank(bucket) {
    if (bucket === "available") return 0;
    if (bucket === "locked") return 1;
    return 2;
  }

  function summarizeOutlookComponents(components) {
    const visible = [...(components || [])]
      .filter((item) => item.value)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .slice(0, 4);
    if (!visible.length) return "暂无明显联动。";
    return visible.map((item) => `${item.label} ${signedDelta(item.value)}`).join("；");
  }

  function deltaOutlookTone(delta, danger = false) {
    if (danger) return "danger";
    if (delta > 0) return "good";
    if (delta < 0) return "warn";
    return "info";
  }

  function getFiscalRunway(state, fiscal, economy, lockedByFunds) {
    const funds = state.resources.funds;
    const daily = fiscal.delta || 0;
    const burn = Math.max(0, -daily);
    const reserveFloor = state.metrics.hospitalLoad >= 80 || state.metrics.supplies <= 30 ? 24 : 18;
    const runwayDays = burn > 0 ? clamp(Math.floor((funds - 8) / burn), 0, 9) : null;
    const availableActions = [
      ...getAvailableOperations(state),
      ...getAvailableResolutions(state),
    ].filter((item) => item.available);
    const paidActions = availableActions
      .map((item) => ({
        label: item.label,
        cost: Math.max(0, -(item.resources && item.resources.funds ? item.resources.funds : 0)),
      }))
      .filter((item) => item.cost > 0)
      .sort((a, b) => b.cost - a.cost || a.label.localeCompare(b.label, "zh-Hans-CN"));
    const safeSpend = Math.max(0, funds - reserveFloor);
    const bridgeNeed = Math.max(0, 3 - (fiscal.activeAssets || []).length);
    const recoveryBlocked = economy.delta < 0 || state.metrics.economy <= 30 || state.hidden.policyStrictness >= 75;
    const runwayTone = funds <= 10 || (burn > 0 && runwayDays <= 1)
      ? "danger"
      : funds <= 25 || burn > 0
        ? "warn"
        : daily > 0
          ? "good"
          : "info";
    const spendingTone = safeSpend <= 0
      ? funds <= reserveFloor ? "warn" : "mixed"
      : paidActions.length && safeSpend < paidActions[0].cost
        ? "warn"
        : "good";
    const bridgeTone = recoveryBlocked
      ? "warn"
      : bridgeNeed > 0
        ? "info"
        : "good";
    const summary = burn > 0
      ? `当前账本每日净消耗 ${burn}，现金余量约 ${runwayDays} 天；花钱前建议保留 ${reserveFloor} 资金底线。`
      : daily > 0
        ? `当前账本每日回流 ${daily}，可以把一部分资金转成长期恢复资产。`
        : `当前账本接近平衡，花钱前重点看 ${reserveFloor} 资金底线和恢复资产是否成网。`;
    const spendDetail = paidActions.length
      ? `今日可执行行动中最高资金成本为 ${paidActions[0].cost}（${paidActions[0].label}）；建议保留 ${reserveFloor} 作为医疗、保供和应急底线。`
      : `今日可执行行动暂无直接资金成本；仍建议保留 ${reserveFloor} 作为应急底线。`;
    return {
      tone: runwayTone,
      summary,
      items: [
        {
          id: "runway",
          label: "现金余量",
          value: burn > 0 ? `${runwayDays}天` : daily > 0 ? "回流" : "持平",
          tone: runwayTone,
          detail: burn > 0
            ? `按当前自然账本估算，资金 ${funds}、每日净消耗 ${burn}，约 ${runwayDays} 天会逼近底线。`
            : daily > 0
              ? `按当前自然账本估算，每日资金净回流 ${daily}。`
              : "当前资金自然联动接近平衡，主要风险来自主动工程和事件选择。",
        },
        {
          id: "safeSpend",
          label: "可承受支出",
          value: safeSpend > 0 ? String(safeSpend) : "留底",
          tone: spendingTone,
          detail: spendDetail,
        },
        {
          id: "bridgeAssets",
          label: "回流资产",
          value: bridgeNeed > 0 ? `差${bridgeNeed}` : `${(fiscal.activeAssets || []).length}项`,
          tone: bridgeTone,
          detail: recoveryBlocked
            ? "感染、管控、活力或疲劳正在压住资金/活力回流，恢复资产需要先解除阻力。"
            : bridgeNeed > 0
              ? `还差 ${bridgeNeed} 个有效财政或微循环节点，低资金时才更容易形成小额回流。`
              : "恢复资产已经形成基础周转网，低资金时能提供更稳定的小额回流。",
        },
      ],
      reserveFloor,
      runwayDays,
      safeSpend,
      highestActionCost: paidActions[0] || null,
      lockedByFunds,
    };
  }

  function getRecoveryRoadmap(state) {
    const rows = collectRecoveryLeverRows(state);
    return [
      buildRecoveryRoadmapItem(state, rows.filter((item) => FISCAL_ROADMAP_IDS.has(item.id)), {
        id: "fiscalChain",
        label: "资金链",
        target: 3,
        empty: "还没有形成财政协作链，前期应先做台账、缺口清单或公开募捐。",
        ready: "资金链已经成网，低资金时更容易产生每日小额回流。",
        available: "今天可以继续铺财政节点。",
      }),
      buildRecoveryRoadmapItem(state, rows.filter((item) => MICRO_ROADMAP_IDS.has(item.id)), {
        id: "microLoop",
        label: "微循环",
        target: 4,
        empty: "城市活力仍主要靠自然结算，前期可以先铺线上预审、民生名录或预约取货。",
        ready: "低接触微循环已经成网，活力恢复会更稳，但仍受感染和管控限制。",
        available: "今天可以增加低接触活力节点。",
      }),
      buildRecoveryGateItem(state),
    ];
  }

  function getFiscalChannelPlan(state) {
    const rows = collectRecoveryLeverRows(state);
    return FISCAL_CHANNEL_GROUPS.map((config) => buildFiscalChannelPlanItem(state, rows, config));
  }

  function getFiscalChannelAdvice(state, channels = null) {
    if (!state || state.ended) return [];
    const items = (channels || getFiscalChannelPlan(state))
      .map((channel) => {
        const evaluation = evaluateFiscalChannelNeed(state, channel);
        return {
          id: channel.id,
          label: channel.label,
          tone: evaluation.tone,
          score: evaluation.score,
          reason: evaluation.reason,
          status: channel.next
            ? `${channel.next.bucket === "available" ? "可执行" : unlockPreviewLabel(channel.next.lockedReason)} · ${channel.next.label}`
            : channel.status,
          actionId: channel.next ? channel.next.id : "",
          mode: channel.next ? channel.next.mode : "",
          pointId: channel.next ? channel.next.pointId : "",
          pointLabel: channel.next ? channel.next.pointLabel : "",
          available: Boolean(channel.next && channel.next.bucket === "available"),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .slice(0, 3);
    if (items.length) return items;
    return (channels || getFiscalChannelPlan(state)).slice(0, 2).map((channel) => ({
      id: channel.id,
      label: channel.label,
      tone: channel.tone || "info",
      score: 0,
      reason: "当前资金和活力暂时没有明显缺口，保持渠道铺垫即可。",
      status: channel.next ? `${channel.next.status} · ${channel.next.label}` : channel.status,
      actionId: channel.next ? channel.next.id : "",
      mode: channel.next ? channel.next.mode : "",
      pointId: channel.next ? channel.next.pointId : "",
      pointLabel: channel.next ? channel.next.pointLabel : "",
      available: Boolean(channel.next && channel.next.bucket === "available"),
    }));
  }

  function evaluateFiscalChannelNeed(state, channel) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const available = channel.counts ? channel.counts.available || 0 : 0;
    const established = channel.counts ? channel.counts.established || 0 : 0;
    const target = channel.counts ? channel.counts.target || 1 : 1;
    let score = available ? 10 : 0;
    if (established < target) score += 4;
    let tone = channel.tone || "info";
    let reason = channel.detail || "根据当前资金和活力缺口选择渠道。";

    if (channel.id === "appropriation") {
      if (r.funds <= 55) score += 18;
      if (state.day <= 12) score += 5;
      if (m.trust >= 50) score += 4;
      reason = r.funds <= 45
        ? "现金流偏紧时，专项拨付是最温和的补资金路线，代价主要是填报和审计压力。"
        : "开局先做可核验台账，能把后续资金缺口变成可批复项目。";
      tone = "good";
    } else if (channel.id === "mutualAid") {
      if (m.trust >= 55 && (r.funds <= 60 || m.supplies <= 62 || h.publicMemory >= 8)) score += 18;
      if (m.trust < 45) score -= 14;
      reason = m.trust < 45
        ? "信任偏低时，捐助和支援容易变成分配争议，先修复公开口径再动用。"
        : "信任尚可时，社会协作能把捐助、物资和外部支援转成稳态补位。";
      tone = m.trust < 45 ? "warn" : "good";
    } else if (channel.id === "creditBridge") {
      if (r.funds <= 35) score += 22;
      if (r.funds <= 18) score += 10;
      if (m.trust < 35) score -= 8;
      reason = r.funds <= 25
        ? "资金红线前，账期和授信能争取几天窗口，但必须准备后续还账。"
        : "账期授信适合在大工程前铺垫，避免现金流突然断档。";
      tone = r.funds <= 25 ? "warn" : "mixed";
    } else if (channel.id === "lowContactVitality") {
      if (m.economy <= 65 && m.infection < 70) score += 20;
      if (h.detectedRate < 50) score -= 6;
      if (h.policyStrictness >= 70) score -= 4;
      reason = h.detectedRate < 50
        ? "低接触活力能托住早期经济，但发现率不足会放大隐匿传播风险。"
        : "感染尚未爆表时，低接触网点和线上流程是前期恢复活力的主路。";
      tone = h.detectedRate < 50 ? "warn" : "info";
    } else if (channel.id === "productionLoop") {
      if (m.supplies <= 65 || m.economy <= 55) score += 18;
      if (m.infection >= 75) score -= 16;
      if (h.detectedRate >= 60) score += 3;
      reason = m.infection >= 75
        ? "感染高位时，产能和货运闭环要谨慎推进，先补监测或医疗缓冲。"
        : "物资或活力承压时，保供产能能同时托住供应、就业和财政回款。";
      tone = m.infection >= 75 ? "warn" : "mixed";
    } else if (channel.id === "lastResort") {
      if (r.funds <= 15) score += 32;
      else if (r.funds <= 22) score += 10;
      else score -= 24;
      reason = r.funds <= 15
        ? "资金触底时才考虑最后手段；它能救急，但会把代价转成信任、活力和创伤。"
        : "最后手段不是常规收入，资金未触底时应优先温和渠道。";
      tone = r.funds <= 15 ? "danger" : "mixed";
    }

    if (!available && channel.next) score = Math.max(0, score - 5);
    return { score, tone, reason };
  }

  function buildFiscalChannelPlanItem(state, rows, config) {
    const order = new Map(config.ids.map((id, index) => [id, index]));
    const groupRows = rows
      .filter((item) => order.has(item.id))
      .sort((a, b) => {
        if (a.bucket !== b.bucket) return recoveryBucketRank(a.bucket) - recoveryBucketRank(b.bucket);
        if (b.priority !== a.priority) return b.priority - a.priority;
        return (order.get(a.id) || 0) - (order.get(b.id) || 0);
      });
    const established = groupRows.filter((item) => item.bucket === "established");
    const available = groupRows.filter((item) => item.bucket === "available");
    const locked = groupRows.filter((item) => item.bucket === "locked");
    const next = available[0] || locked[0] || null;
    const target = Math.max(1, config.target || 2);
    const progress = established.length >= target
      ? 100
      : clamp(Math.round((Math.min(established.length, target) / target) * 72 + Math.min(available.length, 3) * 7), 0, 94);
    const status = established.length >= target
      ? "已成形"
      : established.length
        ? "铺垫中"
        : available.length
          ? "可启动"
          : "待解锁";
    const tone = established.length >= target
      ? "good"
      : available.length
        ? (config.tone || "info")
        : config.id === "lastResort" && state.resources.funds > 20
          ? "mixed"
          : state.resources.funds <= 18 || state.metrics.economy <= 30
            ? "warn"
            : "mixed";
    const nextText = next
      ? `${next.bucket === "available" ? "可做" : unlockPreviewLabel(next.lockedReason)}：${next.label}`
      : "暂无下一步";
    const detail = established.length >= target
      ? config.ready
      : available.length
        ? `${config.available} ${nextText}。`
        : next
          ? `${config.empty} 下一步${nextText}。`
          : config.empty;
    const warning = config.risk || "";
    return {
      id: config.id,
      label: config.label,
      status,
      tone,
      progress,
      detail,
      warning,
      next: next ? {
        id: next.id,
        label: next.label,
        mode: next.mode,
        pointId: next.pointId,
        pointLabel: next.pointLabel,
        status: next.status,
        lockedReason: next.lockedReason,
        bucket: next.bucket,
      } : null,
      counts: {
        established: established.length,
        available: available.length,
        locked: locked.length,
        target,
      },
    };
  }

  function getRecoveryNetworkReadouts(state, fiscal, economy) {
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    const fiscalAssets = fiscal.activeAssets || [];
    const microAssets = getMicroRecoveryAssets(state);
    const fiscalBridgeActive = fiscalAssets.length >= 3 && r.funds <= 30 && m.trust >= 45;
    const fiscalAssetYield = (fiscal.components || []).find((item) => item.id === "assetYield");
    const microFlowRisk = microAssets.length >= 2 && h.detectedRate < 70 && m.infection >= 45;
    const microNetworkActive = microAssets.length >= 4
      && m.infection < 55
      && h.policyStrictness <= 60
      && m.economy < 60
      && m.staffFatigue < 75;
    const careRelief = getContinuityCareRelief(state);
    const detectionGap = Math.max(0, 70 - h.detectedRate);
    return [
      {
        id: "fiscalNetwork",
        label: "资金链",
        value: `${Math.min(fiscalAssets.length, 3)}/3`,
        tone: fiscalBridgeActive ? "good" : fiscalAssets.length >= 2 ? "info" : r.funds <= 25 ? "warn" : "mixed",
        detail: fiscalBridgeActive
          ? "资金链已经形成低位周转网，资金偏低时每日回流上限提高到 3。"
          : fiscalAssets.length
            ? `已有 ${fiscalAssets.length} 个财政/捐助节点；${fiscalAssetYield ? `当前贡献 ${signedDelta(fiscalAssetYield.value)}。` : "继续铺节点能提高低资金回流稳定性。"}`
            : "还没有财政协作节点，资金主要依赖自然账本和事件选择。",
      },
      {
        id: "microNetwork",
        label: "微循环",
        value: `${Math.min(microAssets.length, 4)}/4`,
        tone: microFlowRisk ? "warn" : microNetworkActive ? "good" : microAssets.length >= 2 ? "info" : "mixed",
        detail: microFlowRisk
          ? `已有 ${microAssets.length} 个微循环节点，但发现率距安全门槛还差 ${detectionGap}，每日传播压力会额外 +1。`
          : microNetworkActive
            ? `已有 ${microAssets.length} 个低流动节点，活力自然回流更稳定。`
            : microAssets.length
              ? `已有 ${microAssets.length} 个微循环节点；发现率达到 70 后，恢复流动的隐性反弹会更可控。`
              : "还没有微循环节点，活力恢复主要依赖自然结算或较重的复工动作。",
      },
      {
        id: "careBuffer",
        label: "照护缓冲",
        value: careRelief ? "生效" : "待成形",
        tone: careRelief ? "good" : microAssets.length >= 4 ? "info" : "mixed",
        detail: careRelief
          ? "微循环、物资和活力形成照护缓冲，医疗高压时每日医疗负载额外 -1。"
          : microAssets.length >= 4
            ? "微循环节点已足够，但还需要物资、活力和医疗高压条件同时满足，才会转化成照护缓冲。"
            : "照护缓冲需要至少 4 个微循环节点，并维持物资与活力不低于 50。",
      },
    ];
  }

  function buildRecoveryRoadmapItem(state, rows, config) {
    const established = rows.filter((item) => item.bucket === "established").length;
    const available = rows
      .filter((item) => item.bucket === "available")
      .sort((a, b) => b.priority - a.priority);
    const locked = rows
      .filter((item) => item.bucket === "locked")
      .sort((a, b) => b.priority - a.priority);
    const next = available[0] || locked[0] || null;
    const target = Math.max(1, config.target || 3);
    const progress = established >= target
      ? 100
      : clamp(Math.round((Math.min(established, target) / target) * 76 + Math.min(available.length, 2) * 8), 0, 92);
    const stage = established >= target
      ? "已成网"
      : established > 0
        ? "铺垫中"
        : available.length
          ? "可起步"
          : "待解锁";
    const tone = established >= target
      ? "good"
      : available.length
        ? "info"
        : state.resources.funds <= 18 || state.metrics.economy <= 30
          ? "warn"
          : "mixed";
    const nextText = next
      ? `${next.bucket === "available" ? "可做" : unlockPreviewLabel(next.lockedReason)}：${next.label}`
      : "暂无下一步";
    const detail = established >= target
      ? config.ready
      : available.length
        ? `${config.available} ${nextText}。`
        : next
          ? `${config.empty} 下一步${nextText}。`
          : config.empty;
    return {
      id: config.id,
      label: config.label,
      stage,
      tone,
      progress,
      detail,
      next: next ? {
        id: next.id,
        label: next.label,
        mode: next.mode,
        pointId: next.pointId,
        pointLabel: next.pointLabel,
        status: next.status,
      } : null,
      counts: {
        established,
        available: available.length,
        locked: locked.length,
        target,
      },
    };
  }

  function buildRecoveryGateItem(state) {
    const m = state.metrics;
    const h = state.hidden;
    const blockers = [];
    if (m.infection >= 65) blockers.push("感染高位会放大复业代价");
    if (h.detectedRate < 50) blockers.push("发现率不足会让微循环多带感染风险");
    if (h.policyStrictness >= 70) blockers.push("管控偏高会压住活力回流");
    if (m.trust < 45) blockers.push("低信任会削弱捐助和协作资金");
    if (m.staffFatigue >= 75) blockers.push("基层疲劳会拖慢恢复资产兑现");
    if (state.resources.funds <= 15) blockers.push("资金低位会锁住恢复工程");
    const progress = clamp(100 - blockers.length * 17, 8, 100);
    return {
      id: "recoveryGate",
      label: "恢复闸门",
      stage: blockers.length ? `${blockers.length}项阻力` : "窗口打开",
      tone: blockers.length >= 4 ? "danger" : blockers.length ? "warn" : "good",
      progress,
      detail: blockers.length
        ? blockers.slice(0, 3).join("；")
        : "感染、发现率、管控和信任暂时允许恢复渠道兑现收益。",
      next: null,
      counts: {
        established: Math.max(0, 6 - blockers.length),
        available: blockers.length ? 0 : 1,
        locked: blockers.length,
        target: 6,
      },
    };
  }

  function getFiscalPrescription(state, fiscal, economy, lockedByFunds) {
    if (!state || state.ended) {
      return { tone: "info", label: "今日处方", detail: "", steps: [] };
    }

    const rows = collectRecoveryLeverRows(state);
    const used = new Set();
    const steps = [];
    const funds = state.resources.funds;
    const activeAssetCount = (fiscal.activeAssets || []).length;
    const fiscalPressure = funds <= 25 || lockedByFunds > 0 || fiscal.delta < 0;
    const economyPressure = state.metrics.economy <= 55 || economy.delta < 0;
    const recoveryBlocked = state.metrics.infection >= 65
      || state.hidden.detectedRate < 50
      || state.hidden.policyStrictness >= 70
      || state.metrics.trust < 45
      || state.metrics.staffFatigue >= 75;

    const pick = (predicate) => selectRecoveryPrescriptionRow(rows, predicate, used);
    const add = (id, tone, label, detail, row) => {
      if (steps.some((item) => item.id === id)) return;
      const step = buildFiscalPrescriptionStep(id, tone, label, detail, row);
      steps.push(step);
      if (row) used.add(`${row.mode}:${row.id}`);
    };

    if (funds <= 18 || lockedByFunds > 0) {
      add(
        "cashflow",
        funds <= 12 ? "danger" : "warn",
        "先补现金流",
        lockedByFunds > 0
          ? `已有 ${lockedByFunds} 项行动被资金卡住，先找不扩大感染的现金入口。`
          : "资金接近底线，优先用台账、专项、捐助或账期动作争取周转。",
        selectCashflowPrescriptionRow(rows, used, funds),
      );
    }

    if (activeAssetCount < 3 && (state.day <= 30 || fiscalPressure)) {
      add(
        "fiscalChain",
        "info",
        "铺回流链",
        `回流资产还差 ${Math.max(0, 3 - activeAssetCount)} 项才成网，前期铺节点比临时举债更稳。`,
        pick((row) => FISCAL_ROADMAP_IDS.has(row.id) && !LAST_RESORT_RECOVERY_IDS.has(row.id)),
      );
    }

    if (economyPressure && state.metrics.infection < 75) {
      add(
        "microLoop",
        state.metrics.economy <= 30 ? "warn" : "info",
        "托住活力",
        state.hidden.detectedRate < 50
          ? "活力偏低，但发现率不足会放大复业感染代价，优先低接触和线上窗口。"
          : "用低接触民生、线上政务和微循环恢复城市机能，避免一上来大复工。",
        pick((row) => MICRO_ROADMAP_IDS.has(row.id)),
      );
    }

    if (!steps.length && recoveryBlocked) {
      add(
        "recoveryGate",
        "warn",
        "先解除阻力",
        buildRecoveryBlockerDetail(state),
        pick((row) => (
          row.route === "低接触活力"
          || row.route === "筹措资金"
          || row.route === "资金+活力"
        )),
      );
    }

    if (!steps.length) {
      add(
        "convertReserve",
        "good",
        "把余量变资产",
        "资金和活力暂时没有红线，可以选择一项温和恢复节点，把现金转成后续回流能力。",
        pick((row) => RECOVERY_FOCUS_IDS.has(row.id)),
      );
    }

    const tone = steps.some((item) => item.tone === "danger")
      ? "danger"
      : steps.some((item) => item.tone === "warn")
        ? "warn"
        : steps.some((item) => item.tone === "good")
          ? "good"
          : "info";
    const label = tone === "danger"
      ? "现金优先"
      : economyPressure
        ? "低接触恢复"
        : activeAssetCount < 3
          ? "铺恢复网"
          : "恢复窗口";
    const detail = steps[0]
      ? `${steps[0].label}：${steps[0].detail}`
      : "今天没有明显财政或活力短板。";

    return {
      tone,
      label,
      detail,
      steps: steps.slice(0, 3),
    };
  }

  function selectRecoveryPrescriptionRow(rows, predicate, used) {
    return rows
      .filter((row) => predicate(row) && !used.has(`${row.mode}:${row.id}`))
      .sort((a, b) => {
        if (a.bucket !== b.bucket) return recoveryBucketRank(a.bucket) - recoveryBucketRank(b.bucket);
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.label.localeCompare(b.label, "zh-Hans-CN");
      })[0] || null;
  }

  function selectCashflowPrescriptionRow(rows, used, funds) {
    const gentle = selectRecoveryPrescriptionRow(rows, (row) => (
      !LAST_RESORT_RECOVERY_IDS.has(row.id)
      && (row.route === "筹措资金" || row.route === "资金+活力" || row.fundsGain > 0)
    ), used);
    if (gentle || funds > 15) return gentle;
    return selectRecoveryPrescriptionRow(rows, (row) => LAST_RESORT_RECOVERY_IDS.has(row.id), used);
  }

  function buildFiscalPrescriptionStep(id, tone, label, detail, row) {
    if (!row) {
      return {
        id,
        tone,
        label,
        detail,
        status: "观察",
        impact: "",
        available: false,
        mode: "",
        actionId: "",
        pointId: "",
        pointLabel: "",
      };
    }
    const locked = row.bucket === "locked";
    const established = row.bucket === "established";
    const actionDetail = row.bucket === "available"
      ? `建议先看：${row.label}。`
      : established
        ? `${row.label}已经铺垫，等待它进入自然回流。`
        : `卡点：${row.detail}`;
    return {
      id,
      tone: row.bucket === "available" ? tone : established ? "good" : locked ? "mixed" : tone,
      label,
      detail: `${detail} ${actionDetail}`,
      status: row.status,
      impact: row.impact,
      available: row.bucket === "available",
      mode: row.mode,
      actionId: row.id,
      pointId: row.pointId,
      pointLabel: row.pointLabel,
    };
  }

  function buildRecoveryBlockerDetail(state) {
    const blockers = [];
    if (state.metrics.infection >= 65) blockers.push("感染高位");
    if (state.hidden.detectedRate < 50) blockers.push("发现率不足");
    if (state.hidden.policyStrictness >= 70) blockers.push("管控偏高");
    if (state.metrics.trust < 45) blockers.push("信任偏低");
    if (state.metrics.staffFatigue >= 75) blockers.push("基层疲劳偏高");
    return blockers.length
      ? `${blockers.slice(0, 3).join("、")}正在压住资金和活力兑现，先选低流动、低争议的恢复动作。`
      : "恢复闸门基本打开，选择温和恢复节点即可。";
  }

  function getFiscalOutlook(state) {
    const fiscal = calculateFiscalOutlook(state);
    const economy = calculateEconomyOutlook(state, {});
    const channels = getFiscalChannelPlan(state);
    const channelAdvice = getFiscalChannelAdvice(state, channels);
    const lockedByFunds = [
      ...getAvailableOperations(state),
      ...getAvailableResolutions(state),
    ].filter((item) => item.lockedReason === "资金不足" || item.lockedReason === "财政透支").length;
    const severe = state.resources.funds <= 10 || (state.resources.funds <= 18 && fiscal.delta < 0);
    const tone = severe
      ? "danger"
      : lockedByFunds > 0 || state.resources.funds <= 25 || economy.delta < 0
        ? "warn"
        : fiscal.delta > 0 || economy.delta > 0
          ? "good"
          : "info";
    const detail = lockedByFunds > 0
      ? `有 ${lockedByFunds} 项工程或决议受资金限制，优先寻找恢复渠道或降低现金消耗。`
      : fiscal.delta > 0
        ? "当前账本能产生少量自然回流，适合把资金转成长期资产。"
        : economy.delta < 0
          ? "活力联动偏负，继续强管控或高感染会拖慢后续资金恢复。"
          : "资金和活力暂时稳定，后续变化主要取决于今日事件与主动行动。";
    return {
      label: "财政与活力",
      tone,
      detail,
      lockedByFunds,
      activeAssets: fiscal.activeAssets || [],
      runway: getFiscalRunway(state, fiscal, economy, lockedByFunds),
      network: getRecoveryNetworkReadouts(state, fiscal, economy),
      roadmap: getRecoveryRoadmap(state),
      channels: channels.map((channel) => ({
        ...channel,
        recommended: channelAdvice.some((item) => item.id === channel.id),
      })),
      channelAdvice,
      prescription: getFiscalPrescription(state, fiscal, economy, lockedByFunds),
      items: [
        {
          id: "funds",
          label: "资金联动",
          value: signedDelta(fiscal.delta),
          delta: fiscal.delta,
          tone: deltaOutlookTone(fiscal.delta, severe),
          detail: summarizeOutlookComponents(fiscal.components),
          components: fiscal.components,
        },
        {
          id: "economy",
          label: "活力倾向",
          value: signedDelta(economy.delta),
          delta: economy.delta,
          tone: deltaOutlookTone(economy.delta),
          detail: summarizeOutlookComponents(economy.components),
          components: economy.components,
        },
        {
          id: "locks",
          label: "资金锁定",
          value: String(lockedByFunds),
          delta: lockedByFunds,
          tone: lockedByFunds > 0 ? "warn" : "good",
          detail: lockedByFunds > 0 ? "这些行动已经出现资金不足或财政透支限制。" : "当前没有行动因为资金不足被锁住。",
          components: [],
        },
      ],
    };
  }

  function getCityBadges(state) {
    const badges = CITY_BADGE_RULES.map((rule) => {
      const earned = Boolean(rule.condition(state));
      const progress = earned
        ? 100
        : clamp(Math.round(rule.progress(state) || 0), 0, 100);
      return {
        id: rule.id,
        label: rule.label,
        category: rule.category,
        tone: rule.tone || "info",
        detail: earned ? rule.detail : rule.hint,
        hint: rule.hint,
        gaps: earned ? [] : cityBadgeGaps(rule.id, state),
        focus: earned ? null : cityBadgeFocus(state, rule.id),
        progress,
        earned,
        status: earned ? "已入档" : `接近 ${progress}%`,
      };
    });
    const earned = badges.filter((item) => item.earned);
    const watch = badges
      .filter((item) => !item.earned && item.progress >= 52)
      .sort((a, b) => b.progress - a.progress || a.label.localeCompare(b.label, "zh-Hans-CN"))
      .slice(0, 4);
    const tone = earned.length >= 5
      ? "good"
      : earned.length || watch.length
        ? "info"
        : "mixed";
    const detail = earned.length
      ? `已入档 ${earned.length} 项；继续把接近完成的城市能力补成稳定资产。`
      : watch.length
        ? "已有若干能力接近入档，完成对应工程或指标即可点亮。"
        : "尚未形成稳定城市档案，先铺设监测、保供、医疗或财政节点。";
    return {
      label: "城市档案",
      tone,
      detail,
      earned,
      watch,
      total: CITY_BADGE_RULES.length,
    };
  }

  function getSystemReadouts(state) {
    const visible = getVisibleMetrics(state);
    const budget = getCityActionBudget(state);
    return [
      `报告感染压力 ${visible.reportedInfection}，真实模型显示传播${state.metrics.infection >= 70 ? "仍在高位" : state.metrics.infection <= 35 ? "进入低位" : "处于波动区间"}。`,
      `医院负载 ${state.metrics.hospitalLoad}，${state.metrics.hospitalLoad >= 85 ? "已越过红线" : state.metrics.hospitalLoad >= 70 ? "接近高压区" : "仍有调度余地"}。`,
      `物资 ${state.metrics.supplies}，信任 ${state.metrics.trust}，基层疲劳 ${state.metrics.staffFatigue}；今日城市调度 ${budget.remaining}/${budget.limit}。`,
    ];
  }

  function getEventSettlementHint(state) {
    if (!state || state.ended) return null;
    const budget = getCityActionBudget(state);
    const finalDay = state.day >= TOTAL_DAYS;
    const nextText = finalDay ? "进入结局归档" : `推进到第 ${state.day + 1} 天`;
    const undo = getCityActionUndo(state);
    if (undo) {
      return {
        id: "cityActionCommitted",
        tone: "info",
        label: "城市行动已做",
        detail: `已执行“${undo.label}”。若要更换，可先撤销；处理事件后，本日城市行动将定稿并${nextText}。`,
        nextText,
        actionId: undo.actionId,
        mode: undo.mode,
        pointId: undo.pointId,
      };
    }

    const opportunities = getCityActionOpportunities(state);
    const bestAction = opportunities && opportunities.items ? opportunities.items[0] : null;
    if (budget.remaining > 0 && bestAction) {
      return {
        id: "cityActionUnused",
        tone: "warn",
        label: "还有城市行动",
        detail: `今日还剩 ${budget.remaining}/${budget.limit} 次城市调度，可先处理“${bestAction.label}”（${bestAction.kind} · ${bestAction.pointLabel}）再选择事件；选后将${nextText}。`,
        nextText,
        actionId: bestAction.id,
        mode: bestAction.mode,
        pointId: bestAction.pointId,
      };
    }

    if (budget.remaining > 0) {
      return {
        id: "noActionWindow",
        tone: "mixed",
        label: "暂无可用行动",
        detail: `今日仍有 ${budget.remaining}/${budget.limit} 次城市调度，但当前没有可立即执行的工程或决议；选择事件后将${nextText}。`,
        nextText,
      };
    }

    return {
      id: "readyToSettle",
      tone: "good",
      label: "可以结算",
      detail: `今日城市调度已用完，处理事件后将${nextText}。`,
      nextText,
    };
  }

  function getCityActionBudget(state) {
    const used = clamp(state.flags && state.flags.cityActionsToday ? state.flags.cityActionsToday : 0, 0, CITY_ACTIONS_PER_DAY);
    const remaining = Math.max(0, CITY_ACTIONS_PER_DAY - used);
    return {
      used,
      limit: CITY_ACTIONS_PER_DAY,
      remaining,
      exhausted: remaining <= 0,
      label: "今日城市调度",
      detail: remaining > 0
        ? "工程和决议即时生效，但每天只能处理有限次城市调度。"
        : "今日城市调度已用完，处理事件进入下一天后刷新。",
    };
  }

  return {
    TOTAL_DAYS,
    PHASE_SIZE,
    CORE_METRICS,
    HIDDEN_METRICS,
    RESOURCE_METRICS,
    METRIC_META,
    RESOURCE_META,
    DIFFICULTIES,
    SCENARIOS,
    STAGE_INFO,
    ACTIONS,
    OPERATIONS,
    RESOLUTIONS,
    MAP_POINTS,
    NEWS_POOL,
    EVENTS,
    SCHEDULED_EVENTS,
    ENDINGS,
    createGame,
    importState,
    exportState,
    getCurrentEvent,
    getStatusEffects,
    getCrisisDashboard,
    getVisibleMetrics,
    getMetricTrend,
    getScenarioBriefing,
    getEventImage,
    getMapSignals,
    getMapPoint,
    getMapPointStatus,
    selectMapPoint,
    getAvailableOperations,
    getAvailableResolutions,
    getRiskBand,
    getDailyDirective,
    getDailyDirectiveOptions,
    getDailyPressureSummary,
    getDailyTrendPreview,
    getChoiceOutcomePreview,
    getChoiceRiskPreview,
    getChoiceDirectiveFit,
    getChoiceFit,
    getChoiceComparison,
    getChoiceRouteTag,
    getDeltaHint,
    getEndingOutlook,
    getCityActionOutcomePreview,
    getCityActionLockPreview,
    getCityActionDecisionTags,
    getCityActionDirectiveFit,
    getCityActionOpportunities,
    getRecoveryLevers,
    getFiscalChannelPlan,
    getFiscalChannelAdvice,
    getFiscalPrescription,
    getFiscalOutlook,
    getCityBadges,
    getSettlementHighlights,
    getSettlementNarrative,
    getSettlementReview,
    getSystemReadouts,
    getEventSettlementHint,
    getCityActionBudget,
    getCityActionUndo,
    getPendingEffectReadouts,
    undoCityAction,
    getHistoryEntryMeta,
    getStrategyProfile,
    getStageReview,
    isConditionMet: conditionMet,
    resolveChoice,
    executeOperation,
    executeResolution,
    calculateScore,
    getEndingReview,
    phaseForDay,
    getStageInfo,
    getStageObjectives,
    getStageSchedule,
    getStageTransitionBrief,
  };
});
