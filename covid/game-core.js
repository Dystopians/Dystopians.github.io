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

  const ACTIONS = {
    expandTesting: {
      label: "扩大检测",
      icon: "search",
      intent: "提高发现率，提前看见风险",
      summary: "发现率上升，消耗物资并增加基层疲劳。",
      compute(state) {
        const m = state.metrics;
        const hidden = { detectedRate: m.trust < 35 ? 5 : 8 };
        if (m.staffFatigue < 45) hidden.detectedRate += 1;
        return {
          effects: { supplies: -4, staffFatigue: 4 },
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
        const highTrustBuffer = m.trust > 70;
        return {
          effects: {
            infection: m.trust >= 65 ? -4 : -3,
            economy: highTrustBuffer ? -3 : -4,
            staffFatigue: highTrustBuffer ? 4 : 5,
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
        if (m.staffFatigue < 45) supplyGain += 1;
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
        if (m.staffFatigue < 45) relief -= 1;
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
        return {
          effects: {
            trust: m.hospitalLoad > 85 ? 5 : 7,
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
        return {
          effects: {
            economy: 8,
            infection: h.detectedRate < 50 ? 5 : 3,
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
        return {
          effects: {
            staffFatigue: m.trust >= 60 ? -12 : -10,
            hospitalLoad: 2,
            supplies: -2,
          },
          hidden: {},
          modifiers: { restPolicyBonus: 2 },
          notes: [m.trust >= 60 ? "居民理解让轮休更顺利" : "轮休缓解透支，但接替成本较高"],
        };
      },
    },
  };

  const EVENTS = [
    {
      id: "p1_fever_queue",
      phase: [1],
      tags: ["infection", "medical", "trust"],
      title: "发热门诊外排起长队",
      body: "几家医院报告发热门诊等候时间明显拉长。公开数据仍不完整，市民已经开始在社交平台互相转发截图。",
      actions: ["expandTesting", "medicalExpansion", "transparency"],
    },
    {
      id: "p1_school_absence",
      phase: [1],
      tags: ["infection", "trust", "economy"],
      title: "学校出现异常缺勤",
      body: "两个城区的学校报告流感样缺勤上升。教育部门希望尽快拿出统一口径，以免家长各自行动。",
      actions: ["expandTesting", "zoningControl", "transparency"],
    },
    {
      id: "p1_market_rumor",
      phase: [1],
      tags: ["supply", "trust", "rumor"],
      title: "市场传出抢购消息",
      body: "批发市场有商户提前囤货，几家超市货架开始空缺。实际库存尚可，但恐慌比缺货跑得更快。",
      actions: ["supplyPriority", "transparency", "zoningControl"],
    },
    {
      id: "p1_ppe_warning",
      phase: [1],
      tags: ["medical", "supply", "fatigue"],
      title: "防护物资告急预警",
      body: "医院后勤部门提醒，防护服和口罩库存下降快于预期。是否优先给医疗机构集中配发成为争议。",
      actions: ["supplyPriority", "medicalExpansion", "expandTesting"],
    },
    {
      id: "p1_first_notice",
      phase: [1],
      tags: ["trust", "infection", "rumor"],
      title: "是否发布第一号通告",
      body: "疾控简报认为存在社区传播风险。通告越早，越能争取配合；越具体，也越可能引发短期恐慌。",
      actions: ["transparency", "expandTesting", "zoningControl"],
    },
    {
      id: "p2_testing_sites",
      phase: [2],
      tags: ["infection", "fatigue", "trust"],
      title: "核酸点开始拥堵",
      body: "临时采样点外出现长队，部分居民抱怨排队本身带来风险。检测速度与秩序都需要重新组织。",
      actions: ["expandTesting", "restPolicy", "zoningControl"],
    },
    {
      id: "p2_transfer_dispute",
      phase: [2],
      tags: ["trust", "medical", "fatigue"],
      title: "密接转运引发争议",
      body: "一批密接人员转运时间过长，社区和转运组互相催促。家属要求解释标准，基层人员要求减压。",
      actions: ["transparency", "medicalExpansion", "restPolicy"],
    },
    {
      id: "p2_truck_delay",
      phase: [2],
      tags: ["supply", "economy", "trust"],
      title: "外地货车滞留高速口",
      body: "蔬菜和药品运输车因查验流程滞留，司机担心无法离城，商超担心次日配送断档。",
      actions: ["supplyPriority", "reopenPilot", "transparency"],
    },
    {
      id: "p2_volunteers",
      phase: [2],
      tags: ["fatigue", "supply", "trust"],
      title: "社区志愿者报名上升",
      body: "一些居民主动报名配送和秩序维护，但社区担心组织能力跟不上，反而增加管理负担。",
      actions: ["supplyPriority", "restPolicy", "transparency"],
    },
    {
      id: "p2_online_rumor",
      phase: [2],
      tags: ["rumor", "trust", "infection"],
      title: "网络谣言扩散",
      body: "多条未经证实的消息在群聊中流传，有人开始拒绝配合流调，也有人要求公布更完整数据。",
      actions: ["transparency", "expandTesting", "zoningControl"],
    },
    {
      id: "p3_elder_medicine",
      phase: [3],
      tags: ["supply", "trust", "fatigue"],
      title: "独居老人断药",
      body: "几个封控小区反映慢病药物不足。药房能调到部分药品，但配送人手和登记流程都很紧。",
      actions: ["supplyPriority", "restPolicy", "transparency"],
    },
    {
      id: "p3_group_buy",
      phase: [3],
      tags: ["supply", "trust", "economy"],
      title: "团购物资腐坏",
      body: "一批蔬菜到达时已经腐坏，居民质疑采购渠道。供应链承压让每个环节都更容易出错。",
      actions: ["supplyPriority", "transparency", "reopenPilot"],
    },
    {
      id: "p3_building_conflict",
      phase: [3],
      tags: ["trust", "fatigue", "infection"],
      title: "封控小区发生冲突",
      body: "某小区因出入规则临时变化出现争执。网格员请求明确授权，也有人提醒不要进一步激化。",
      actions: ["transparency", "zoningControl", "restPolicy"],
    },
    {
      id: "p3_doctor_shift",
      phase: [3],
      tags: ["medical", "fatigue", "supply"],
      title: "医护连续值守超时",
      body: "几名医护已连续多日无法回家。医院还能勉强维持排班，但差错风险正在上升。",
      actions: ["restPolicy", "medicalExpansion", "supplyPriority"],
    },
    {
      id: "p3_pregnancy_access",
      phase: [3],
      tags: ["medical", "trust", "public"],
      title: "孕妇就医通道被堵",
      body: "一名孕妇转诊等待时间过长，事件开始发酵。医院、社区和交通卡口都在等待统一协调。",
      actions: ["medicalExpansion", "transparency", "supplyPriority"],
    },
    {
      id: "p4_stadium_shelter",
      phase: [4],
      tags: ["medical", "supply", "fatigue"],
      title: "体育馆改造方舱",
      body: "改造方案能够缓解床位压力，但需要大量物资、转运车辆和医护支援。施工越快，代价越集中。",
      actions: ["medicalExpansion", "supplyPriority", "citywideSilence"],
    },
    {
      id: "p4_icu_triage",
      phase: [4],
      tags: ["medical", "trust", "public"],
      title: "ICU 床位排序",
      body: "重症床位接近满负荷。医院请求明确转诊与分级标准，否则一线只能在混乱中临场判断。",
      actions: ["medicalExpansion", "transparency", "restPolicy"],
    },
    {
      id: "p4_non_covid_delay",
      phase: [4],
      tags: ["medical", "trust", "economy"],
      title: "非疫情患者延误",
      body: "透析、肿瘤和急诊患者的正常就医被挤压。城市不能只看一个数字，但资源确实不够。",
      actions: ["medicalExpansion", "reopenPilot", "transparency"],
    },
    {
      id: "p4_nurse_infection",
      phase: [4],
      tags: ["medical", "fatigue", "infection"],
      title: "护士感染导致排班缺口",
      body: "一家定点医院出现医护感染，排班表被打乱。继续硬撑会维持容量，但风险会积累。",
      actions: ["restPolicy", "medicalExpansion", "expandTesting"],
    },
    {
      id: "p4_oxygen_shortage",
      phase: [4],
      tags: ["medical", "supply", "economy"],
      title: "氧气瓶供应吃紧",
      body: "供氧企业表示运输与人手都到达极限。医院要求优先保障，工业端则担心停产扩大影响。",
      actions: ["supplyPriority", "medicalExpansion", "reopenPilot"],
    },
    {
      id: "p5_wage_pressure",
      phase: [5],
      tags: ["economy", "trust", "supply"],
      title: "企业停薪压力上升",
      body: "多家小企业表示现金流只能再撑一周。居民收入的不确定性开始反过来影响配合意愿。",
      actions: ["reopenPilot", "supplyPriority", "transparency"],
    },
    {
      id: "p5_refuse_test",
      phase: [5],
      tags: ["trust", "infection", "fatigue"],
      title: "部分居民拒绝检测",
      body: "反复检测让一些居民失去耐心，社区担心强制推进会让关系进一步恶化。",
      actions: ["transparency", "expandTesting", "restPolicy"],
    },
    {
      id: "p5_staff_resign",
      phase: [5],
      tags: ["fatigue", "supply", "trust"],
      title: "基层人员提出请辞",
      body: "连续高压后，几名社区工作人员提出辞职。留下的人更少，任务却没有减少。",
      actions: ["restPolicy", "supplyPriority", "transparency"],
    },
    {
      id: "p5_false_negative",
      phase: [5],
      tags: ["infection", "trust", "medical"],
      title: "假阴性争议",
      body: "一名多次阴性的居民后续确诊，相关小区要求解释检测质量。系统需要承认不确定性。",
      actions: ["expandTesting", "transparency", "zoningControl"],
    },
    {
      id: "p5_partial_open",
      phase: [5],
      tags: ["economy", "infection", "trust"],
      title: "是否开放部分区域",
      body: "低风险片区要求恢复通勤。继续收紧能减少反弹，过慢恢复则会拖垮城市活力。",
      actions: ["reopenPilot", "zoningControl", "transparency"],
    },
    {
      id: "p6_school_return",
      phase: [6],
      tags: ["economy", "trust", "infection"],
      title: "复课安排被推到台前",
      body: "家长、学校和企业都在等待复课时间表。教育秩序恢复越快，防疫冗余越薄。",
      actions: ["reopenPilot", "expandTesting", "transparency"],
    },
    {
      id: "p6_accountability",
      phase: [6],
      tags: ["trust", "public", "fatigue"],
      title: "追责呼声出现",
      body: "市民开始追问早期信息、转运流程和供应分配。复盘越具体，越可能牵动组织压力。",
      actions: ["transparency", "restPolicy", "zoningControl"],
    },
    {
      id: "p6_memorial",
      phase: [6],
      tags: ["public", "trust", "medical"],
      title: "纪念名单",
      body: "媒体和家属希望为逝者、医护和志愿者留下公开记录。城市恢复不应只靠遗忘。",
      actions: ["transparency", "restPolicy", "medicalExpansion"],
    },
    {
      id: "p6_budget_gap",
      phase: [6],
      tags: ["economy", "supply", "medical"],
      title: "财政缺口浮出水面",
      body: "临时医院、保供补贴和检测费用需要结算。账单不会马上压垮城市，但会影响恢复路径。",
      actions: ["reopenPilot", "supplyPriority", "medicalExpansion"],
    },
    {
      id: "p6_full_review",
      phase: [6],
      tags: ["trust", "public", "economy"],
      title: "是否公开完整复盘报告",
      body: "内部复盘已经形成。公开能修复长期信任，也会让过去 72 天的伤痕重新被看见。",
      actions: ["transparency", "reopenPilot", "restPolicy"],
    },
  ];

  const NEWS_POOL = [
    {
      id: "news_hospital_queue",
      title: "急诊入口排队时间延长",
      body: "医院建议轻症居民先联系社区医生，避免集中前往发热门诊。",
      image: "news-hospital.png",
      tags: ["medical", "infection"],
    },
    {
      id: "news_supply_boxes",
      title: "社区保供箱开始分批入户",
      body: "低楼层志愿者负责搬运，高楼层仍需补充人手和电梯排班。",
      image: "news-supply.png",
      tags: ["supply", "trust"],
    },
    {
      id: "news_health_code",
      title: "数字通行方案进入小范围测试",
      body: "扫码通行能提高流调效率，也让部分居民担心误判和申诉渠道。",
      image: "news-health-code.png",
      tags: ["trust", "infection", "economy"],
    },
    {
      id: "news_shelter_build",
      title: "体育馆临时床位完成首轮布置",
      body: "施工队和医护正在抢时间调试分区、供氧和转运流程。",
      image: "news-shelter.png",
      tags: ["medical", "fatigue"],
    },
    {
      id: "news_factory_shift",
      title: "工业园试行错峰复工",
      body: "物流车辆从专用通道进出，厂区承诺每日上报人员健康状态。",
      image: "news-factory.png",
      tags: ["economy", "supply"],
    },
    {
      id: "news_volunteer_line",
      title: "志愿者热线接入更多求助",
      body: "买药、就医、独居老人探访成为今天最集中的三类诉求。",
      image: "news-supply.png",
      tags: ["fatigue", "trust", "public"],
    },
    {
      id: "news_checkpoint",
      title: "主干道卡口车辆排队缩短",
      body: "通行证和货运白名单开始发挥作用，但执行口径仍需统一。",
      image: "news-health-code.png",
      tags: ["economy", "supply", "trust"],
    },
    {
      id: "news_stadium_night",
      title: "方舱照明测试持续到深夜",
      body: "临时设施越快启用，越需要给医护和转运组留出休整空间。",
      image: "news-shelter.png",
      tags: ["medical", "fatigue", "public"],
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
      operations: ["triageNetwork", "communityClinic"],
      resolutions: ["shelterAdmissionStandard", "priorityMedicineRoute"],
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
      operations: ["supplyCorridor"],
      resolutions: ["priorityMedicineRoute"],
    },
    {
      id: "road",
      type: "road",
      label: "主干道卡口",
      x: 78,
      y: 70,
      description: "道路通行决定物资和复工效率。健康码和货运白名单都会在这里体现代价。",
      operations: ["deployHealthCode", "supplyCorridor"],
      resolutions: ["elasticTransit", "lowRiskWorkList"],
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
      operations: ["factoryClosedLoop"],
      resolutions: ["lowRiskWorkList", "elasticTransit"],
    },
    {
      id: "residents",
      type: "people",
      label: "居民楼院",
      x: 30,
      y: 24,
      description: "居民信任、药品配送和基层疲劳最容易在这里体现。",
      operations: ["medicineRoute", "mentalHealthLine"],
      resolutions: ["priorityMedicineRoute", "publicReviewBrief"],
    },
    {
      id: "volunteers",
      type: "people",
      label: "志愿者集散点",
      x: 64,
      y: 66,
      description: "志愿者能托住保供和社区秩序，但持续高压会转化成执行风险。",
      operations: ["volunteerDispatch", "mentalHealthLine"],
      resolutions: ["staffRotationOrder"],
    },
  ];

  const OPERATIONS = {
    buildShelterHospital: {
      label: "方舱医院建设",
      location: "stadium",
      description: "征用体育馆建设临时收治空间，4 天后启用。强力缓解医疗负载，但会消耗资金、物资和基层力量。",
      resources: { funds: -18 },
      effects: { supplies: -8, economy: -3, staffFatigue: 7 },
      hidden: { publicMemory: 2, policyStrictness: 2 },
      delayed: {
        delay: 4,
        label: "方舱启用",
        effects: { hospitalLoad: -18, trust: 2 },
        hidden: { publicMemory: 1 },
        completeProject: "shelterHospital",
      },
      maxUses: 1,
      condition(state) {
        return !state.completedProjects.shelterHospital;
      },
    },
    deployHealthCode: {
      label: "健康码部署",
      location: "road",
      description: "部署数字通行与申诉系统，3 天后提高发现率和分区治理能力。会带来短期信任争议和活力损耗。",
      resources: { funds: -12 },
      effects: { trust: -2, economy: -3, staffFatigue: 3 },
      hidden: { detectedRate: 4, policyStrictness: 4 },
      delayed: {
        delay: 3,
        label: "健康码试运行",
        effects: { infection: -3, trust: 1 },
        hidden: { detectedRate: 12 },
        completeProject: "healthCode",
      },
      maxUses: 1,
      condition(state) {
        return !state.completedProjects.healthCode;
      },
    },
    supplyCorridor: {
      label: "保供专线招标",
      location: "market",
      description: "用资金换取货运白名单和稳定配送线路。能补物资和活力，但增加短期流动风险。",
      resources: { funds: -14 },
      effects: { supplies: 12, economy: 4, trust: 2, infection: 1, staffFatigue: 2 },
      hidden: { policyStrictness: -2 },
      delayed: {
        delay: 2,
        label: "保供专线稳定",
        effects: { supplies: 5, trust: 2 },
        hidden: {},
        completeProject: "supplyCorridor",
      },
      maxUses: 2,
    },
    triageNetwork: {
      label: "分级诊疗网络",
      location: "hospital",
      description: "建立社区转诊与分级分流。降低医院负载，但需要医护培训和信息沟通。",
      resources: { funds: -10 },
      effects: { hospitalLoad: -7, trust: 2, staffFatigue: 4, supplies: -3 },
      hidden: { detectedRate: 3 },
      delayed: {
        delay: 2,
        label: "分诊流程磨合",
        effects: { hospitalLoad: -4, staffFatigue: -1 },
        hidden: {},
        completeProject: "triageNetwork",
      },
      maxUses: 2,
    },
    medicineRoute: {
      label: "慢病药品直送",
      location: "residents",
      description: "面向独居老人和慢病患者建立药品配送清单。提升信任、降低创伤，但消耗物资和配送人手。",
      resources: { funds: -7 },
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
      description: "为基层、医护和居民开通减压热线与轮换支持。不能直接压感染，但能保住执行系统。",
      resources: { funds: -8 },
      effects: { staffFatigue: -9, trust: 3, hospitalLoad: 1 },
      hidden: { publicMemory: -2 },
      delayed: {
        delay: 2,
        label: "减压机制生效",
        effects: { staffFatigue: -4, trust: 1 },
        hidden: {},
      },
      maxUses: 3,
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
      maxUses: 2,
    },
    factoryClosedLoop: {
      label: "工厂闭环复工",
      location: "factory",
      description: "以闭环通勤和厂区检测恢复部分产能。恢复活力和资金，但若发现率不足会推高感染。",
      resources: { funds: -6 },
      effects(state) {
        return {
          economy: 10,
          infection: state.hidden.detectedRate < 55 ? 4 : 2,
          trust: 1,
          staffFatigue: 3,
        };
      },
      hidden: { policyStrictness: 2 },
      delayed: {
        delay: 2,
        label: "产能恢复",
        resources: { funds: 8 },
        effects: { economy: 4, supplies: 2 },
        hidden: {},
      },
      maxUses: 3,
    },
    volunteerDispatch: {
      label: "志愿者调度站",
      location: "volunteers",
      description: "把志愿者纳入统一排班和物资登记。改善保供和信任，但需要资金和组织成本。",
      resources: { funds: -6 },
      effects: { supplies: 6, trust: 4, staffFatigue: 2 },
      hidden: { publicMemory: -1 },
      delayed: {
        delay: 2,
        label: "志愿者排班稳定",
        effects: { staffFatigue: -3, supplies: 2 },
        hidden: {},
      },
      maxUses: 3,
    },
    communityClinic: {
      label: "社区临时门诊",
      location: "hospital",
      description: "把轻症咨询和慢病续方前移到社区。能降低医院压力，也会增加保供和基层负担。",
      resources: { funds: -11 },
      effects: { hospitalLoad: -8, supplies: -4, staffFatigue: 5, trust: 3 },
      hidden: { detectedRate: 2 },
      delayed: {
        delay: 3,
        label: "社区门诊分流",
        effects: { hospitalLoad: -5, trust: 1 },
        hidden: {},
        completeProject: "communityClinic",
      },
      maxUses: 1,
      condition(state) {
        return !state.completedProjects.communityClinic;
      },
    },
  };

  const RESOLUTIONS = {
    shelterAdmissionStandard: {
      label: "启动方舱收治标准",
      description: "统一轻症转运、分区和出舱标准。需要方舱已启用或医疗负载越过高压线。",
      resources: { funds: -5 },
      effects: { hospitalLoad: -10, trust: -2, staffFatigue: 3 },
      hidden: { publicMemory: 2 },
      once: true,
      condition(state) {
        return state.completedProjects.shelterHospital || state.metrics.hospitalLoad >= 78;
      },
    },
    lowRiskWorkList: {
      label: "低风险片区白名单复工",
      description: "在发现率足够时恢复低风险片区通勤。恢复活力，但承担小幅反弹风险。",
      resources: { funds: -4 },
      effects: { economy: 12, infection: 2, trust: 3, staffFatigue: 2 },
      hidden: { policyStrictness: -6 },
      once: false,
      condition(state) {
        return state.hidden.detectedRate >= 60 && state.metrics.infection < 62;
      },
    },
    publicReviewBrief: {
      label: "公开阶段复盘简报",
      description: "公开误差、延误与改进清单。修复长期信任，但短期会把压力重新带到台前。",
      resources: { funds: -3 },
      effects: { trust: 8, economy: -2, staffFatigue: 2 },
      hidden: { publicMemory: -5, detectedRate: 2 },
      once: true,
      condition(state) {
        return state.day >= 18 || state.metrics.trust < 40 || state.hidden.publicMemory > 30;
      },
    },
    staffRotationOrder: {
      label: "基层轮换令",
      description: "强制把一线排班从硬撑改成轮换。疲劳显著下降，但医疗和保供短期变紧。",
      resources: { funds: -8 },
      effects: { staffFatigue: -14, hospitalLoad: 2, supplies: -3, trust: 2 },
      hidden: {},
      once: false,
      condition(state) {
        return state.metrics.staffFatigue >= 62;
      },
    },
    priorityMedicineRoute: {
      label: "重点人群药品直送",
      description: "把有限药品优先发给高风险人群。能明显修复信任和创伤，但会消耗库存。",
      resources: { funds: -6 },
      effects: { supplies: -8, trust: 8, staffFatigue: 3 },
      hidden: { publicMemory: -4 },
      once: false,
      condition(state) {
        return state.metrics.supplies >= 32;
      },
    },
    elasticTransit: {
      label: "全市弹性交通",
      description: "用错峰通勤和货运通道恢复城市流动。适合经济低迷时使用，感染会承压。",
      resources: { funds: -5 },
      effects: { economy: 9, supplies: 3, infection: 2, trust: 1 },
      hidden: { policyStrictness: -5 },
      once: false,
      condition(state) {
        return state.metrics.economy < 55 && state.metrics.infection < 70;
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

  function boundedMetricValue(metric, value) {
    if (CORE_METRICS.includes(metric) || HIDDEN_METRICS.includes(metric)) {
      return clamp(Math.round(value), 0, 100);
    }
    if (RESOURCE_METRICS.includes(metric)) {
      return clamp(Math.round(value), 0, 120);
    }
    return Math.round(value);
  }

  function createGame(options = {}) {
    const difficulty = options.difficulty || "normal";
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const all = { ...INITIAL_VALUES };
    Object.entries(diff.adjustments).forEach(([metric, delta]) => {
      all[metric] = boundedMetricValue(metric, all[metric] + delta);
    });

    const state = {
      version: 2,
      difficulty,
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
      selectedMapPointId: "hospital",
      completedProjects: {},
      flags: {
        silenceUses: 0,
        lastEventIds: [],
        operationUses: {},
        resolutions: {},
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
    state.resources = state.resources || { funds: INITIAL_VALUES.funds };
    state.news = state.news || generateNews(state);
    state.selectedMapPointId = state.selectedMapPointId || "hospital";
    state.completedProjects = state.completedProjects || {};
    state.flags.operationUses = state.flags.operationUses || {};
    state.flags.resolutions = state.flags.resolutions || {};
    return state;
  }

  function getVisibleMetrics(state) {
    const accuracy = clamp(state.hidden.detectedRate, 20, 95) / 100;
    const hiddenGap = Math.round((100 - state.hidden.detectedRate) / 8);
    const infectionOffset = Math.round(hiddenGap * (state.metrics.infection >= 50 ? 1 : 0.5));
    return {
      ...state.metrics,
      reportedInfection: clamp(Math.round(state.metrics.infection * accuracy + infectionOffset), 0, 100),
      detectedRate: state.hidden.detectedRate,
      policyStrictness: state.hidden.policyStrictness,
      publicMemory: state.hidden.publicMemory,
    };
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
    if (item.tags.includes("medical")) weight += m.hospitalLoad >= 75 ? 8 : 1;
    if (item.tags.includes("supply")) weight += m.supplies < 35 ? 8 : m.supplies > 75 ? 1 : 3;
    if (item.tags.includes("trust")) weight += m.trust < 40 ? 6 : 2;
    if (item.tags.includes("economy")) weight += m.economy < 45 ? 7 : 2;
    if (item.tags.includes("fatigue")) weight += m.staffFatigue > 70 ? 7 : 2;
    if (item.tags.includes("infection")) weight += m.infection > 60 ? 6 : 2;
    if (item.tags.includes("public")) weight += state.hidden.publicMemory > 35 ? 4 : 1;
    return weight;
  }

  function getEventImage(event) {
    const tags = event && event.tags ? event.tags : [];
    if (tags.includes("medical")) return "news-hospital.png";
    if (tags.includes("supply")) return "news-supply.png";
    if (tags.includes("economy")) return "news-factory.png";
    if (tags.includes("infection") || tags.includes("rumor")) return "news-health-code.png";
    if (tags.includes("fatigue") || tags.includes("public")) return "news-shelter.png";
    return "news-supply.png";
  }

  function getMapPoint(state, id) {
    const point = MAP_POINTS.find((item) => item.id === id) || MAP_POINTS[0];
    return {
      ...point,
      operations: (point.operations || []).map((operationId) => getOperationStatus(state, operationId)),
      resolutions: (point.resolutions || []).map((resolutionId) => getResolutionStatus(state, resolutionId)),
    };
  }

  function selectMapPoint(state, id) {
    state.selectedMapPointId = id;
    return getMapPoint(state, id);
  }

  function getOperationStatus(state, operationId) {
    const operation = OPERATIONS[operationId];
    const uses = state.flags.operationUses[operationId] || 0;
    const maxed = operation.maxUses && uses >= operation.maxUses;
    const conditionOk = operation.condition ? operation.condition(state) : true;
    const resources = typeof operation.resources === "function" ? operation.resources(state) : operation.resources;
    const affordable = canPay(state, resources);
    let lockedReason = "";
    if (maxed) lockedReason = "次数已用完";
    else if (!conditionOk) lockedReason = "条件未满足";
    else if (!affordable) lockedReason = "资金不足";
    return {
      id: operationId,
      ...operation,
      resources,
      available: !maxed && conditionOk && affordable,
      lockedReason,
      uses,
    };
  }

  function getResolutionStatus(state, resolutionId) {
    const resolution = RESOLUTIONS[resolutionId];
    const used = Boolean(state.flags.resolutions[resolutionId]);
    const conditionOk = resolution.condition ? resolution.condition(state) : true;
    const affordable = canPay(state, resolution.resources);
    let lockedReason = "";
    if (resolution.once && used) lockedReason = "已通过";
    else if (!conditionOk) lockedReason = "条件未满足";
    else if (!affordable) lockedReason = "资金不足";
    return {
      id: resolutionId,
      ...resolution,
      available: !(resolution.once && used) && conditionOk && affordable,
      lockedReason,
      used,
    };
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
    state.phase = phaseForDay(state.day);
    if (isBufferDay(state)) {
      state.currentEventId = `buffer_${state.phase}`;
      return getCurrentEvent(state);
    }

    const candidates = EVENTS.filter((event) => event.phase.includes(state.phase));
    const weighted = candidates.map((event) => ({
      event,
      weight: eventWeight(event, state),
    })).filter((entry) => entry.weight > 0);

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

    state.currentEventId = selected.id;
    state.flags.lastEventIds = [selected.id, ...state.flags.lastEventIds.filter((id) => id !== selected.id)].slice(0, 6);
    return getCurrentEvent(state);
  }

  function eventWeight(event, state) {
    const m = state.metrics;
    let weight = 10;
    if (state.flags.lastEventIds.includes(event.id)) weight *= 0.2;

    if (event.tags.includes("infection")) weight += m.infection >= 70 ? 8 : m.infection >= 50 ? 3 : 0;
    if (event.tags.includes("medical")) weight += m.hospitalLoad >= 75 ? 9 : m.hospitalLoad <= 45 ? -4 : 2;
    if (event.tags.includes("supply")) weight += m.supplies < 30 ? 10 : m.supplies > 70 ? -3 : 2;
    if (event.tags.includes("trust") || event.tags.includes("rumor")) {
      weight += m.trust < 25 ? 12 : m.trust < 40 ? 7 : m.trust > 70 ? -2 : 2;
    }
    if (event.tags.includes("economy")) weight += m.economy < 20 ? 12 : m.economy < 30 ? 7 : m.economy > 65 ? 2 : 0;
    if (event.tags.includes("fatigue")) weight += m.staffFatigue > 85 ? 12 : m.staffFatigue > 70 ? 7 : m.staffFatigue < 45 ? -1 : 2;
    if (event.tags.includes("public")) weight += state.hidden.publicMemory > 55 ? 8 : state.hidden.publicMemory > 35 ? 4 : 1;

    return Math.max(1, weight);
  }

  function getCurrentEvent(state) {
    if (state.ended) return null;
    if (String(state.currentEventId || "").startsWith("buffer_")) {
      return buildBufferEvent(state);
    }
    const event = EVENTS.find((item) => item.id === state.currentEventId) || EVENTS[0];
    return {
      ...event,
      type: "event",
      image: getEventImage(event),
      choices: event.actions.map((actionKey) => buildChoiceForAction(event, actionKey, state)),
    };
  }

  function buildBufferEvent(state) {
    const phase = phaseForDay(state.day);
    return {
      id: `buffer_${phase}`,
      type: "buffer",
      phase: [phase],
      tags: ["buffer"],
      title: `第 ${phase} 阶段复盘会`,
      body: "阶段总结给了城市一次缓冲窗口：可以修补最危险的短板，也可以选择更明确的恢复方向。没有免费的修复，每一项补救都会挤占另一个系统。",
      image: "news-shelter.png",
      choices: [
        {
          id: "repairWorst",
          label: "托底最危险短板",
          actionKey: "dynamicRepair",
          description: "修复当前最接近崩溃的指标，同时牺牲一个仍有余量的系统。",
          effectPreview: ["最差指标 +10/-10", "次要系统付出代价", "公共创伤 +1"],
        },
        {
          id: "releasePressure",
          label: "释放社会压力",
          actionKey: "dynamicRelease",
          description: "降低管控与疲劳，修复信任和活力，但承担轻微感染反弹。",
          effectPreview: ["信任 +6", "疲劳 -6", "感染 +2"],
        },
        {
          id: "concentrateResources",
          label: "集中防疫资源",
          actionKey: "dynamicConcentrate",
          description: "继续压低感染和医疗压力，消耗物资、活力与基层状态。",
          effectPreview: ["感染 -5", "医疗负载 -4", "物资/活力/疲劳承压"],
        },
      ],
    };
  }

  function buildChoiceForAction(event, actionKey, state) {
    const action = ACTIONS[actionKey];
    const eventMod = eventModifier(event, actionKey, state);
    const preview = previewActionEffects(state, actionKey, eventMod);
    return {
      id: `${event.id}:${actionKey}`,
      actionKey,
      label: action.label,
      description: `${action.intent}。${eventMod.text}`,
      effectPreview: preview,
      eventEffects: eventMod.effects,
      eventHidden: eventMod.hidden,
      delayed: eventMod.delayed,
      eventNotes: eventMod.notes,
    };
  }

  function previewActionEffects(state, actionKey, eventMod) {
    const actionResult = computeActionResult(state, actionKey);
    const lines = [];
    const mergedCore = mergeEffects(actionResult.effects, eventMod.effects);
    const mergedHidden = mergeEffects(actionResult.hidden, eventMod.hidden);

    Object.entries(mergedCore).forEach(([metric, delta]) => {
      if (!delta) return;
      lines.push(`${METRIC_META[metric].short} ${delta > 0 ? "+" : ""}${delta}`);
    });
    Object.entries(mergedHidden).forEach(([metric, delta]) => {
      if (!delta) return;
      lines.push(`${METRIC_META[metric].short} ${delta > 0 ? "+" : ""}${delta}`);
    });
    if (eventMod.delayed) lines.push(`${eventMod.delayed.delay}日后：${eventMod.delayed.label}`);
    return lines.slice(0, 5);
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
      }
      delayed.effects.trust = (delayed.effects.trust || 0) + (actionKey === "transparency" ? 1 : -1);
    }

    if (tags.includes("economy")) {
      if (actionKey === "reopenPilot") {
        add("economy", 2);
        text = "试点恢复能对准当前经济压力。";
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
      } else {
        add("staffFatigue", 1);
      }
      delayed.effects.staffFatigue = (delayed.effects.staffFatigue || 0) + (actionKey === "restPolicy" ? -1 : 1);
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
    return {
      effects: scaleBeneficialEffects(raw.effects || {}, efficiency),
      hidden: scaleBeneficialEffects(raw.hidden || {}, efficiency),
      modifiers: raw.modifiers || {},
      flags: raw.flags || {},
      notes: raw.notes || [],
      efficiency,
    };
  }

  function actionEfficiency(state) {
    let efficiency = 1;
    if (state.metrics.staffFatigue > 80) efficiency -= 0.2;
    if (state.metrics.trust < 35) efficiency -= 0.2;
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

    const before = snapshotValues(state);
    const dailyDelta = Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0]));
    const log = {
      day: state.day,
      phase: state.phase,
      title: event.title,
      choice: choice.label,
      notes: [],
      changes: {},
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
    } else {
      const actionResult = computeActionResult(state, choice.actionKey);
      applyEffects(state, actionResult.effects, dailyDelta, log, "行动");
      applyHiddenEffects(state, actionResult.hidden, log, "行动");
      addModifiers(modifiers, actionResult.modifiers);
      applyFlags(state, actionResult.flags);
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
    updateFailureStreaks(state);

    log.changes = diffSnapshots(before, snapshotValues(state));
    state.history.unshift(log);
    state.history = state.history.slice(0, 24);

    checkEnding(state);
    if (!state.ended) {
      state.day += 1;
      state.news = generateNews(state);
      chooseNextEvent(state);
    }

    return state;
  }

  function executeOperation(state, operationId) {
    const status = getOperationStatus(state, operationId);
    if (!status.available) return state;
    const before = snapshotValues(state);
    const dailyDelta = Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0]));
    const log = {
      day: state.day,
      phase: state.phase,
      title: "城市主动工程",
      choice: status.label,
      notes: [`地图节点：${getMapPoint(state, status.location).label}`],
      changes: {},
    };
    const modifiers = {
      medicalRelief: 0,
      supplyRecovery: 0,
      transparencyBonus: 0,
      reopenBonus: 0,
      restPolicyBonus: 0,
      testingFocus: 0,
    };
    const effects = typeof status.effects === "function" ? status.effects(state) : status.effects;
    const hidden = typeof status.hidden === "function" ? status.hidden(state) : status.hidden;

    applyResourceEffects(state, status.resources, log, "主动工程");
    applyEffects(state, effects, dailyDelta, log, "主动工程");
    applyHiddenEffects(state, hidden, log, "主动工程");
    state.flags.operationUses[operationId] = (state.flags.operationUses[operationId] || 0) + 1;
    if (status.delayed) scheduleDelayedEffect(state, status.delayed, "城市主动工程", status.label);

    applyDueDelayedEffects(state, dailyDelta, log);
    applyDailyResolution(state, dailyDelta, log, modifiers);
    applySoftDecay(state, log);
    clampAll(state);
    updateFailureStreaks(state);
    log.changes = diffSnapshots(before, snapshotValues(state));
    state.history.unshift(log);
    state.history = state.history.slice(0, 24);
    checkEnding(state);
    if (!state.ended) {
      state.day += 1;
      state.news = generateNews(state);
      chooseNextEvent(state);
    }
    return state;
  }

  function executeResolution(state, resolutionId) {
    const status = getResolutionStatus(state, resolutionId);
    if (!status.available) return state;
    const before = snapshotValues(state);
    const dailyDelta = Object.fromEntries(CORE_METRICS.map((metric) => [metric, 0]));
    const log = {
      day: state.day,
      phase: state.phase,
      title: "城市决议",
      choice: status.label,
      notes: ["决议通过并进入当日结算"],
      changes: {},
    };
    const modifiers = {
      medicalRelief: 0,
      supplyRecovery: 0,
      transparencyBonus: 0,
      reopenBonus: 0,
      restPolicyBonus: 0,
      testingFocus: 0,
    };

    applyResourceEffects(state, status.resources, log, "城市决议");
    applyEffects(state, status.effects, dailyDelta, log, "城市决议");
    applyHiddenEffects(state, status.hidden, log, "城市决议");
    state.flags.resolutions[resolutionId] = true;

    applyDueDelayedEffects(state, dailyDelta, log);
    applyDailyResolution(state, dailyDelta, log, modifiers);
    applySoftDecay(state, log);
    clampAll(state);
    updateFailureStreaks(state);
    log.changes = diffSnapshots(before, snapshotValues(state));
    state.history.unshift(log);
    state.history = state.history.slice(0, 24);
    checkEnding(state);
    if (!state.ended) {
      state.day += 1;
      state.news = generateNews(state);
      chooseNextEvent(state);
    }
    return state;
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
    const due = state.pendingEffects.filter((item) => item.dueDay <= state.day && conditionMet(state, item.condition));
    const remaining = state.pendingEffects.filter((item) => item.dueDay > state.day || !conditionMet(state, item.condition));
    state.pendingEffects = remaining;
    due.forEach((item) => {
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
    if (condition === "trustBelow40") return state.metrics.trust < 40;
    if (condition === "hospitalAbove85") return state.metrics.hospitalLoad > 85;
    if (condition === "suppliesBelow25") return state.metrics.supplies < 25;
    return true;
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
      if (state.resources[metric] !== before + delta) {
        log.notes.push(`${source}对${RESOURCE_META[metric].short}的影响被边界吸收`);
      }
    });
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
    const infectionDelta = clamp(
      phasePressure + mobilityPressure - controlEffect - detectionEffect + fatiguePenalty + trustPenalty,
      -6,
      7,
    );
    applyEffects(state, { infection: infectionDelta }, dailyDelta, log, "每日疫情");

    const hospitalDelta = Math.round(state.metrics.infection / 22)
      - modifiers.medicalRelief
      - (state.completedProjects.triageNetwork ? 1 : 0)
      - (state.completedProjects.communityClinic ? 1 : 0)
      + (state.metrics.supplies < 30 ? 1 : 0)
      + (state.metrics.staffFatigue > 75 ? 1 : 0);
    applyEffects(state, { hospitalLoad: hospitalDelta }, dailyDelta, log, "医疗联动");

    let supplyRecovery = 1 + modifiers.supplyRecovery;
    if (state.metrics.economy < 30) supplyRecovery -= 1;
    if (state.metrics.economy > 75) supplyRecovery += 1;
    if (state.completedProjects.supplyCorridor) supplyRecovery += 1;
    const suppliesDelta = supplyRecovery
      + (state.metrics.economy >= 60 ? 1 : 0)
      - Math.round(state.hidden.policyStrictness / 35)
      - (state.metrics.hospitalLoad >= 75 ? 1 : 0)
      - (state.metrics.staffFatigue >= 70 ? 1 : 0);
    applyEffects(state, { supplies: suppliesDelta }, dailyDelta, log, "供应联动");

    const strictTrustCost = state.hidden.policyStrictness >= 75
      ? (state.metrics.supplies > 70 ? 0 : 1)
      : 0;
    const trustDelta = modifiers.transparencyBonus
      + (state.metrics.supplies >= 70 ? 1 : 0)
      - (state.metrics.hospitalLoad >= 80 ? 2 : 0)
      - (state.metrics.supplies < 30 ? 2 : 0)
      - strictTrustCost
      - (state.hidden.publicMemory >= 60 ? 1 : 0);
    applyEffects(state, { trust: trustDelta }, dailyDelta, log, "信任联动");

    const economyDelta = modifiers.reopenBonus
      - Math.round(state.hidden.policyStrictness / 25)
      - (state.metrics.infection >= 55 ? 1 : 0)
      - (state.metrics.hospitalLoad >= 80 ? 1 : 0)
      - (state.metrics.trust < 30 ? 1 : 0);
    applyEffects(state, { economy: economyDelta }, dailyDelta, log, "活力联动");

    const fatigueDelta = 1
      + Math.round(state.hidden.policyStrictness / 25)
      + (state.metrics.hospitalLoad >= 75 ? 1 : 0)
      + (state.metrics.supplies < 30 ? 1 : 0)
      - modifiers.restPolicyBonus
      - (state.metrics.trust >= 70 ? 1 : 0);
    applyEffects(state, { staffFatigue: fatigueDelta }, dailyDelta, log, "执行联动");

    const fundsDelta = (state.metrics.economy >= 65 ? 2 : state.metrics.economy >= 40 ? 1 : 0)
      - (state.metrics.hospitalLoad >= 85 ? 1 : 0)
      - (state.hidden.policyStrictness >= 80 ? 1 : 0);
    applyResourceEffects(state, { funds: fundsDelta }, log, "财政联动");

    if (state.metrics.hospitalLoad >= 85) {
      applyEffects(state, { trust: -2 }, dailyDelta, log, "医疗红线");
      applyHiddenEffects(state, { publicMemory: 2 }, log, "医疗红线");
    }
    if (state.metrics.supplies < 25) {
      applyEffects(state, { trust: -2, staffFatigue: 1 }, dailyDelta, log, "供应低位");
    }

    if (state.metrics.staffFatigue > 85 || state.metrics.supplies < 25) {
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
    } else if (state.hidden.policyStrictness < 15) {
      state.hidden.policyStrictness = boundedMetricValue("policyStrictness", state.hidden.policyStrictness + 1);
    }
    if (state.hidden.detectedRate > 70 && state.metrics.staffFatigue > 75) {
      state.hidden.detectedRate = boundedMetricValue("detectedRate", state.hidden.detectedRate - 1);
      log.notes.push("检测网络在疲劳高位下轻微损耗");
    }
  }

  function applyBufferChoice(state, choiceId, dailyDelta, log) {
    if (choiceId === "repairWorst") {
      const worst = findWorstMetric(state);
      const sacrifice = findSacrificeMetric(state, worst.metric);
      const repair = {};
      const cost = {};
      repair[worst.metric] = METRIC_META[worst.metric].direction === "danger" ? -10 : 10;
      cost[sacrifice] = METRIC_META[sacrifice].direction === "danger" ? 5 : -5;
      applyEffects(state, repair, dailyDelta, log, "阶段托底");
      applyEffects(state, cost, dailyDelta, log, "阶段托底代价");
      applyHiddenEffects(state, { publicMemory: 1 }, log, "阶段复盘");
      log.notes.push(`托底对象：${METRIC_META[worst.metric].label}；代价落在${METRIC_META[sacrifice].label}`);
      return;
    }

    if (choiceId === "releasePressure") {
      applyEffects(state, {
        trust: 6,
        staffFatigue: -6,
        economy: 2,
        infection: 2,
      }, dailyDelta, log, "释放压力");
      applyHiddenEffects(state, { policyStrictness: -8, publicMemory: -1 }, log, "释放压力");
      log.notes.push("城市用更可解释的节奏换取恢复空间");
      return;
    }

    if (choiceId === "concentrateResources") {
      applyEffects(state, {
        infection: -5,
        hospitalLoad: -4,
        supplies: -5,
        economy: -4,
        staffFatigue: 4,
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
      if (score >= 62 && state.metrics.trust >= 60) return endGame(state, "quietRecovery");
      if (score >= 62 && state.hidden.publicMemory >= 55) return endGame(state, "silentCost");
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
    const m = state.metrics;
    const h = state.hidden;
    const r = state.resources;
    return (
      (100 - m.infection) * 0.17
      + (100 - m.hospitalLoad) * 0.17
      + m.supplies * 0.13
      + m.trust * 0.17
      + m.economy * 0.13
      + (100 - m.staffFatigue) * 0.11
      + (100 - h.publicMemory) * 0.05
      + Math.min(r.funds, 100) * 0.07
    );
  }

  function getRiskBand(metric, value) {
    const direction = METRIC_META[metric].direction;
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

  function getSystemReadouts(state) {
    const visible = getVisibleMetrics(state);
    return [
      `报告感染压力 ${visible.reportedInfection}，真实模型显示传播${state.metrics.infection >= 70 ? "仍在高位" : state.metrics.infection <= 35 ? "进入低位" : "处于波动区间"}。`,
      `医院负载 ${state.metrics.hospitalLoad}，${state.metrics.hospitalLoad >= 85 ? "已越过红线" : state.metrics.hospitalLoad >= 70 ? "接近高压区" : "仍有调度余地"}。`,
      `物资 ${state.metrics.supplies}，信任 ${state.metrics.trust}，基层疲劳 ${state.metrics.staffFatigue}。`,
    ];
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
    STAGE_INFO,
    ACTIONS,
    OPERATIONS,
    RESOLUTIONS,
    MAP_POINTS,
    NEWS_POOL,
    EVENTS,
    ENDINGS,
    createGame,
    importState,
    exportState,
    getCurrentEvent,
    getVisibleMetrics,
    getEventImage,
    getMapPoint,
    selectMapPoint,
    getAvailableOperations,
    getAvailableResolutions,
    getRiskBand,
    getSystemReadouts,
    resolveChoice,
    executeOperation,
    executeResolution,
    calculateScore,
    phaseForDay,
    getStageInfo,
  };
});
