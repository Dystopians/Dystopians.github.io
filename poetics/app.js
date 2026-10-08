// 现代诗歌的诗论 · 网页版
// 正文、题目、提示、参考都来自 course.js（scripts/build-poetics.py 从 _poetics/START_HERE.md 生成）。
// 这里负责：按视图渲染；题目卡片（作答自动保存、提示与参考留痕、自评）；按课程规则推出目标状态；
// 延迟复习日期；学习记录、导出与备份。所有数据只存在这台设备的浏览器里。
import C from './course.js';

const KEY = 'poetics:v1';
const onSite = /^https?:$/.test(location.protocol) && location.hostname && !/^(localhost|127\.)/.test(location.hostname);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'readOnly' || k === 'disabled' || k === 'checked') n[k] = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

// ---------- 存档 ----------
const blank = () => ({ v: 1, tasks: {}, day0: null, day0Manual: false, notes: {}, created: Date.now() });
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1 && s.tasks) return Object.assign(blank(), s);
  } catch (e) { /* 读不出来就当新开始 */ }
  return blank();
}
let S = load();
let saveTimer = 0, saveWarned = false;
function save(now) {
  clearTimeout(saveTimer);
  const write = () => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { if (!saveWarned) { saveWarned = true; toast('浏览器不让保存（可能是无痕模式或空间满了）：请及时导出备份', 5000); } }
  };
  if (now) write(); else saveTimer = setTimeout(write, 350);
}
addEventListener('pagehide', () => save(true));
const rec = id => S.tasks[id];
const T = id => S.tasks[id] || (S.tasks[id] = { hints: {} });
const pref = (k, d) => { try { const v = JSON.parse(localStorage.getItem('poetics:' + k)); return v == null ? d : v; } catch (e) { return d; } };
const setPref = (k, v) => { try { localStorage.setItem('poetics:' + k, JSON.stringify(v)); } catch (e) { } };

// ---------- 日期 ----------
const pad = n => String(n).padStart(2, '0');
const ymd = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const md = d => { d = new Date(typeof d === 'string' ? d + 'T00:00:00' : d); return `${d.getMonth() + 1}月${d.getDate()}日`; };
const hm = ts => { const d = new Date(ts); return `${md(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const stamp = ts => { const d = new Date(ts); return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };

// ---------- 题目、状态与课程规则 ----------
const KIND = {
  diag: '诊断', 'diag-r': '补课复查', predict: '预测', fill: '补全', indep: '独立', vary: '变式',
  card: '重建卡', 'unit-r': '复查', final: '验收', 'final-r': '验收复查', delay: '延迟复习', extra: '附加题',
};
const OPTIONAL = new Set(['diag-r', 'unit-r', 'final-r']);          // 原文：仅需补救时启用
const ST = { todo: '未开始', draft: '草稿', submitted: '待自评', pass: '独立达标', assisted: '借助帮助达标', redo: '需补救', done: '已完成' };
const RESULT = { pass: '关键项都达标', partial: '部分达标', fail: '未达标', done: '已对照参考' };
const HELP = { none: '没用帮助', hint: '用过提示', answer: '看过参考' };
const GOAL_ST = ['未验证', '有提示可做', '独立可做', '变式通过', '延迟检查通过'];
const DUE = { RV01: 1, RV02: 1, RV03: 7, RV04: 7, RV05: 30, RV06: 30 };
const FINALS = ['F01', 'F02', 'F03'];
const TASK_IDS = Object.keys(C.tasks);
const UNIT = Object.fromEntries(C.units.map(u => [u.id, u]));
const MAIN_UNITS = C.units.filter(u => !u.extra), EXTRA_UNITS = C.units.filter(u => u.extra);   // 附加单元不计入主线和目标

const hasDraft = t => !!t && (Array.isArray(t.draft) ? t.draft.some(x => x && x.trim()) : !!(t.draft && t.draft.trim()));
const draftText = t => !t ? '' : Array.isArray(t.draft) ? t.draft.join('') : (t.draft || '');
const charCount = s => s.replace(/\s/g, '').length;

function status(id) {
  const t = rec(id);
  if (!t) return 'todo';
  if (t.result === 'done') return 'done';
  if (t.result === 'pass') return t.help === 'none' ? 'pass' : 'assisted';
  if (t.result) return 'redo';
  if (t.submittedAt) return 'submitted';
  return hasDraft(t) ? 'draft' : 'todo';
}
const finished = s => s === 'pass' || s === 'assisted' || s === 'done';
// 这次作答用了多少帮助：先看过参考（或上一版看过）＞ 提交前打开过提示 ＞ 没用
const helpOf = t => (t.peekAt || t.seen) ? 'answer' : (t.hints && (t.hints.h1 || t.hints.h2)) ? 'hint' : 'none';
const finalsReady = () => FINALS.every(id => rec(id) && rec(id).submittedAt);

// 原文规则：独立题与变式的关键项都达标才记「变式通过」；看过解析后做对只能记「有提示可做」；
// 「复查独立通过」另作备注，不抹掉原题用过帮助的事实
function goalStatus(g) {
  const [q2, q3] = g.checks, q1 = q2.replace('Q02', 'Q01');
  const s2 = status(q2), s3 = status(q3);
  let r = 0;
  if (s2 === 'pass' && s3 === 'pass') r = 3;
  else if (s2 === 'pass' || s3 === 'pass') r = 2;
  else if ([q1, q2, q3].some(id => finished(status(id)))) r = 1;
  if (r === 3 && g.delays.some(id => status(id) === 'pass')) r = 4;
  return GOAL_ST[r];
}
const goalOfUnit = uid => C.goals.find(g => g.unit === uid);

// 补救题由哪道题触发
function triggerOf(id) {
  const k = C.tasks[id].kind;
  if (k === 'diag-r' || k === 'final-r') return [id.slice(0, 3)];
  if (k === 'unit-r') return [id.slice(0, 3) + '-Q02', id.slice(0, 3) + '-Q03'];
  return [];
}
// 触发题只要有任何一版自评没达标，复查就一直启用：原文说重做看过答案的原题不算新的证据，要用复查取得
const everRedo = id => { const t = rec(id); return !!t && [t, ...(t.attempts || [])].some(a => a.result === 'partial' || a.result === 'fail'); };
const triggered = id => triggerOf(id).some(everRedo);
function relatedOf(id) {
  const k = C.tasks[id].kind, out = [];
  if (k === 'diag') out.push(id + '-R01');
  if (k === 'indep' || k === 'vary') out.push(id.slice(0, 3) + '-R01');
  if (k === 'final') out.push(...FINALS, id + '-R01');
  return out.filter(x => C.tasks[x] && x !== id);
}

function autoDay0() {
  if (S.day0Manual) return;
  const fs = FINALS.map(rec);
  S.day0 = fs.every(t => t && t.assessedAt) ? ymd(Math.max(...fs.map(t => t.assessedAt))) : null;
}
const dueOf = id => S.day0 ? addDays(S.day0, DUE[id]) : null;
const dueNow = () => S.day0 ? Object.keys(DUE).filter(id => !finished(status(id)) && dueOf(id) <= ymd(Date.now())) : [];

// 一个单元的主线题（补救复查和附加题不算进度）
const unitMain = uid => UNIT[uid].tasks.filter(id => !OPTIONAL.has(C.tasks[id].kind) && C.tasks[id].kind !== 'extra');
const SECTION_TASKS = {
  diagnosis: ['D01', 'D02', 'D03', 'D04'], assessment: FINALS, review: Object.keys(DUE),
  ...Object.fromEntries(C.units.map(u => [u.id, unitMain(u.id)])),
};
const progressOf = sec => { const ids = SECTION_TASKS[sec] || []; return [ids.filter(id => finished(status(id))).length, ids.length]; };
const touched = sec => (SECTION_TASKS[sec] || []).some(id => status(id) !== 'todo');
const PATH = ['D01', 'D02', 'D03', 'D04', ...MAIN_UNITS.flatMap(u => unitMain(u.id)), ...FINALS];
function nextStep() {
  const due = dueNow()[0];
  if (due) return { id: due, why: '复习到期' };
  const redo = TASK_IDS.find(id => OPTIONAL.has(C.tasks[id].kind) && triggered(id) && !finished(status(id)));
  if (redo) return { id: redo, why: '按分流该做的复查' };
  const id = PATH.find(x => !finished(status(x)));
  return id ? { id, why: status(id) === 'todo' ? '下一题' : '接着做' } : null;
}
const taskHref = id => `#/${C.tasks[id].view}/${C.tasks[id].anchor}`;

// ---------- 小部件 ----------
let toastTimer = 0;
function toast(msg, ms = 2600) {
  let t = $('.toast');
  if (!t) document.body.append(t = el('div', { class: 'toast', role: 'status' }));
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
function confirmBox(title, body, ok = '确定', cancel = '取消') {
  return new Promise(res => {
    const close = v => { mask.remove(); removeEventListener('keydown', key); res(v); };
    const key = e => { if (e.key === 'Escape') close(false); };
    const okBtn = el('button', { class: 'btn pri', onclick: () => close(true) }, ok);
    const mask = el('div', { class: 'mask', onclick: e => { if (e.target === mask) close(false); } },
      el('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        el('h3', null, title), el('div', { class: 'dlg-body', html: body }),
        el('div', { class: 'dlg-acts' }, el('button', { class: 'btn', onclick: () => close(false) }, cancel), okBtn)));
    document.body.append(mask); addEventListener('keydown', key); okBtn.focus();
  });
}
const ICON = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  scroll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2 2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 9h4M12 12h4M12 15h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

// ---------- 外壳：顶栏、侧栏、诗卷 ----------
const NAV = [
  { group: '开始', items: [['home', '首页'], ['guide', '从这里开始'], ['diagnosis', '前置诊断与补课'], ['anchor', '贯穿诗 · 断章']] },
  { group: '十个能力单元', items: MAIN_UNITS.map(u => [u.id, u.short, u.no]) },
  { group: '验收与复习', items: [['assessment', '综合验收'], ['review', '延迟复习'], ['record', '学习记录'], ['sources', '来源与版本']] },
  ...(EXTRA_UNITS.length ? [{ group: '附加单元（不计入主线）', items: EXTRA_UNITS.map(u => [u.id, u.short, u.no]) }] : []),
];
const TITLES = { home: '首页', guide: '从这里开始', diagnosis: '前置诊断与补课', anchor: '贯穿诗', assessment: '综合验收', review: '延迟复习', record: '学习记录', sources: '来源与版本' };
let app, main, side, drawer;

function shell() {
  app = $('#app');
  main = el('main', { class: 'main', id: 'main', tabindex: '-1' });
  side = el('nav', { class: 'side', 'aria-label': '课程导航' });
  const top = el('header', { class: 'top' },
    el('button', { class: 'ib menu-btn', 'aria-label': '打开课程导航', html: ICON.menu, onclick: () => document.body.classList.toggle('nav-open') }),
    onSite ? el('a', { class: 'home-link', href: '/', title: '返回主站' }, '← 主站') : null,
    el('a', { class: 'brand', href: '#/' }, el('span', { class: 'seal' }, '诗'), el('span', { class: 'brand-t' }, C.title)),
    el('span', { class: 'sp' }),
    el('button', { class: 'ib txt', 'aria-label': '打开诗卷：课程里的完整诗作', title: '诗卷：随时对照原诗', onclick: () => openDrawer() }, el('span', { html: ICON.scroll }), el('span', { class: 'ib-t' }, '诗卷')),
    el('button', { class: 'ib', 'aria-label': '切换深色/浅色', title: '切换深色/浅色', html: ICON.theme, onclick: toggleTheme }));
  const scrim = el('div', { class: 'scrim', onclick: () => document.body.classList.remove('nav-open') });
  app.replaceChildren(top, el('div', { class: 'layout' }, side, scrim, main));
  renderNav();
  document.addEventListener('click', onDocClick);
  addEventListener('scroll', closePop, { passive: true });   // 来源卡片是固定定位，页面一滚就和角标错位了
  addEventListener('keydown', e => { if (e.key === 'Escape') { closePop(); closeDrawer(); document.body.classList.remove('nav-open'); } });
}

function renderNav() {
  side.replaceChildren(...NAV.map(g => el('div', { class: 'nav-g' },
    el('div', { class: 'nav-h' }, g.group),
    ...g.items.map(([id, label, no]) => {
      const [d, n] = progressOf(id);
      const ug = UNIT[id] && goalOfUnit(id), unitGoal = ug ? goalStatus(ug) : null;
      return el('a', { class: 'nav-i', href: id === 'home' ? '#/' : '#/' + id, 'data-v': id },
        no ? el('span', { class: 'nav-no' }, no.slice(1)) : null,
        el('span', { class: 'nav-t' }, label),
        n ? el('span', { class: 'nav-p' + (d === n ? ' full' : touched(id) ? ' some' : ''), title: unitGoal ? `目标状态：${unitGoal}` : null }, `${d}/${n}`) : null);
    }))),
  el('div', { class: 'nav-foot' },
    el('div', { class: 'fs' }, el('span', null, '字号'),
      el('button', { class: 'ib sm', 'aria-label': '字小一点', onclick: () => fontStep(-1) }, 'A−'),
      el('button', { class: 'ib sm', 'aria-label': '字大一点', onclick: () => fontStep(1) }, 'A＋')),
    el('p', null, '作答只保存在这台设备的浏览器里。换设备前先到「学习记录」导出备份。')));
  markNav();
}
const markNav = () => $$('.nav-i', side).forEach(a => a.classList.toggle('on', a.dataset.v === cur.view));
let navTimer = 0;
const refreshNavSoon = () => { clearTimeout(navTimer); navTimer = setTimeout(renderNav, 400); };

function toggleTheme() {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  setPref('theme', dark ? 'dark' : 'light');
}
function fontStep(d) {
  const fs = Math.max(0.9, Math.min(1.25, Math.round((pref('fs', 1) + d * 0.05) * 100) / 100));
  setPref('fs', fs); document.documentElement.style.setProperty('--fs', fs);
}

// 诗卷：课程里四首完整的诗随时对照（题目允许看本题的诗）
let POEMS = null;
function poems() {
  if (POEMS) return POEMS;
  const pick = (vid, sel, notesRe) => {
    const tpl = el('template', { html: C.views[vid] }).content;
    const figs = $$(sel, tpl);
    const out = figs.map(f => f.outerHTML).join('');
    const last = figs[figs.length - 1];
    let note = last && last.nextElementSibling;
    while (note && note.tagName === 'FIGURE') note = note.nextElementSibling;
    return out + (note && notesRe.test(note.textContent) ? `<p class="poem-note">${note.innerHTML}</p>` : '');
  };
  POEMS = [
    { id: 'dz', tab: '断章', title: '《断章》', by: '卞之琳 · 贯穿诗', html: pick('anchor', 'figure.poem', /卞之琳|长诗/) },
    { id: 'kq', tab: '再别康桥', title: '《再别康桥》', by: '徐志摩', html: pick('u02', 'figure.poem.numbered', /词义/) },
    { id: 'metro', tab: '庞德短诗', title: 'In a Station of the Metro', latin: true, by: '庞德 · 附本课程教学译文', html: pick('u03', 'figure.poem', /词义/) },
    { id: 'ss', tab: '死水', title: '《死水》', by: '闻一多 · 综合验收材料', html: pick('assessment', 'figure.poem.numbered', /词义/) },
  ];
  return POEMS;
}
function openDrawer(which) {
  closeDrawer();
  const list = poems(), sel = which || pref('poem', 'dz');
  const body = el('div', { class: 'dr-body' });
  const tabs = el('div', { class: 'dr-tabs', role: 'tablist' });
  const show = id => {
    const p = list.find(x => x.id === id) || list[0];
    setPref('poem', p.id);
    $$('button', tabs).forEach(b => b.setAttribute('aria-selected', b.dataset.p === p.id));
    body.replaceChildren(el('h3', { class: 'dr-title' + (p.latin ? ' latin' : '') }, p.title), el('div', { class: 'dr-by' }, p.by), el('div', { class: 'dr-poem', html: p.html }));
    body.scrollTop = 0;
  };
  list.forEach(p => tabs.append(el('button', { role: 'tab', 'data-p': p.id, onclick: () => show(p.id) }, p.tab)));
  drawer = el('aside', { class: 'drawer', 'aria-label': '诗卷' },
    el('div', { class: 'dr-head' }, el('b', null, '诗卷'), el('span', { class: 'dr-tip' }, '作答时可以随时对照原诗'),
      el('button', { class: 'ib', 'aria-label': '关闭诗卷', html: ICON.close, onclick: closeDrawer })),
    tabs, body);
  document.body.append(drawer);
  show(sel);
  requestAnimationFrame(() => drawer && drawer.classList.add('on'));
}
function closeDrawer() { if (drawer) { drawer.remove(); drawer = null; } }

// 来源卡片：点 S01 这类角标，就地看出处，不用跳到文末
let pop = null;
function closePop() { if (pop) { pop.remove(); pop = null; } }
function showSource(a) {
  closePop();
  const s = C.sources.find(x => 'src-' + x.id.toLowerCase() === a.dataset.src);
  if (!s) return;
  pop = el('div', { class: 'pop', role: 'dialog', 'aria-label': `来源 ${s.id}` },
    el('div', { class: 'pop-id' }, s.id), el('div', { class: 'pop-t', html: s.title }), el('div', { class: 'pop-d', html: s.desc }),
    el('div', { class: 'pop-a' },
      s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener' }, '核查来源 ↗') : null,
      el('a', { href: '#/sources/src-' + s.id.toLowerCase(), onclick: closePop }, '来源与版本说明')));
  document.body.append(pop);
  const r = a.getBoundingClientRect(), w = Math.min(360, innerWidth - 24);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
  const below = r.bottom + 8, h = pop.offsetHeight;
  pop.style.top = (below + h < innerHeight - 8 ? below : Math.max(8, r.top - h - 8)) + 'px';
}
function onDocClick(e) {
  const a = e.target.closest('a.src');
  if (a) { e.preventDefault(); showSource(a); return; }
  if (pop && !e.target.closest('.pop')) closePop();
  if (e.target.closest('.side a')) document.body.classList.remove('nav-open');
}

// ---------- 路由 ----------
let cur = { view: null, anchor: null };
function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  let [view, anchor] = h.split('/');
  if (view && !C.views[view] && view !== 'home' && C.anchors[view]) { anchor = view; view = C.anchors[view]; }  // 兼容 #u01 这类旧锚点
  return { view: view && (C.views[view] || view === 'home') ? view : 'home', anchor: anchor || null };
}
function route() {
  const r = parseHash();
  closePop();
  if (r.view === cur.view && main.childElementCount) { cur.anchor = r.anchor; scrollToAnchor(r.anchor, true); return; }
  cur = r;
  render();
  markNav();
  scrollToAnchor(r.anchor, false);
}
function scrollToAnchor(id, smooth) {
  if (!id) { scrollTo(0, 0); return; }
  const t = document.getElementById(id);
  if (!t) { scrollTo(0, 0); return; }
  t.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
}

// ---------- 视图 ----------
const CARDS = new Map();
let unitHeadRender = null, recordRender = null;
function render() {
  CARDS.clear(); unitHeadRender = recordRender = null;
  const v = cur.view;
  document.title = (v === 'home' ? '' : (UNIT[v] ? `${UNIT[v].no} ${UNIT[v].title}` : TITLES[v]) + ' · ') + C.title;
  if (v === 'home') { main.replaceChildren(home()); return; }
  const wrap = el('div', { class: `view v-${v}${UNIT[v] ? ' v-unit' : ''}`, html: C.views[v] });
  main.replaceChildren(wrap);
  hydrate(wrap, v);
}

function hydrate(root, v) {
  if (v === 'guide') guideExtras(root);
  if (v === 'review') reviewExtras(root);
  if (v === 'assessment') assessmentExtras(root);
  $$('.unit-head[data-unit]', root).forEach(h => unitHead(h, h.dataset.unit));
  $$('.task[data-task]', root).forEach(ph => ph.replaceWith(card(ph.dataset.task)));
  $$('[data-map]', root).forEach(m => m.replaceWith(courseMap()));
  $$('[data-record]', root).forEach(m => m.replaceWith(recordApp()));
  if (UNIT[v]) { stepBar(root); root.append(pager(v)); }
  else if (v !== 'record' && v !== 'sources') root.append(pager(v));
}

// 首页
function home() {
  const nx = nextStep();
  const [done, all] = [PATH.filter(id => finished(status(id))).length, PATH.length];
  const due = dueNow();
  const started = TASK_IDS.some(id => status(id) !== 'todo');
  return el('div', { class: 'view v-home' },
    el('section', { class: 'hero' },
      el('div', { class: 'eyebrow', html: C.tagline }),
      el('h1', { class: 'hero-t' }, C.title),
      el('p', { class: 'hero-sub' }, C.subtitle),
      el('div', { class: 'hero-poem' },
        el('div', null, '你站在桥上看风景，'), el('div', null, '看风景人在楼上看你。'), el('div', null, '明月装饰了你的窗子，'), el('div', null, '你装饰了别人的梦。'),
        el('a', { class: 'hero-poem-more', href: '#/anchor' }, '——卞之琳《断章》，课程从这首诗出发')),
      el('div', { class: 'hero-acts' },
        nx ? el('a', { class: 'btn pri lg', href: taskHref(nx.id) }, started ? `${nx.why}：${nx.id}` : '从前置诊断开始') : el('a', { class: 'btn pri lg', href: '#/record' }, '看学习记录'),
        el('a', { class: 'btn lg', href: '#/guide' }, '怎么学这门课'))),
    due.length ? el('a', { class: 'banner due', href: taskHref(due[0]) }, `复习到期：${due.join('、')}`, el('span', null, '去复习 →')) : null,
    el('section', { class: 'home-grid' },
      el('div', { class: 'panel' },
        el('div', { class: 'panel-h' }, '进度', el('span', { class: 'panel-n' }, `${done} / ${all} 道主线题`)),
        el('div', { class: 'bar' }, el('i', { style: { width: `${(done / all) * 100}%` } })),
        el('div', { class: 'goals' }, ...C.goals.map(g => {
          const st = goalStatus(g);
          return el('a', { class: `goal-i g${GOAL_ST.indexOf(st)}`, href: '#/' + g.unit, title: `${g.id} ${g.name}：${st}` },
            el('b', null, g.id.slice(1)), el('span', null, g.name), el('em', null, st));
        })),
        el('p', { class: 'muted small' }, '目标状态按课程规则，由你的自评和用过的帮助推出。详细见', el('a', { href: '#/record' }, '学习记录'), '。')),
      el('div', { class: 'panel' },
        el('div', { class: 'panel-h' }, '学习地图', el('span', { class: 'panel-n' }, '先学什么、后学什么')),
        courseMap())),
    el('details', { class: 'about' },
      el('summary', null, '关于这门课：假设、范围、不承诺什么、资料性质'),
      el('div', { html: C.about })));
}

// 学习地图（依赖关系）
const MAP_ROWS = [['diagnosis'], ['u01'], ['u02'], ['u03', 'u04', 'u05'], ['u06'], ['u07'], ['u08'], ['u09'], ['u10'], ['assessment'], ['review'], ...EXTRA_UNITS.map(u => [u.id])];
function courseMap() {
  return el('div', { class: 'cmap' }, ...MAP_ROWS.map(row => el('div', { class: 'cmap-row n' + row.length + (UNIT[row[0]] && UNIT[row[0]].extra ? ' extra' : '') }, ...row.map(id => {
    const [d, n] = progressOf(id), u = UNIT[id];
    const st = d === n ? 'full' : touched(id) ? 'some' : '';
    return el('a', { class: 'cmap-n ' + st, href: '#/' + id },
      el('span', { class: 'cmap-k' }, u ? u.no : { diagnosis: '诊断', assessment: '验收', review: '复习' }[id]),
      el('span', { class: 'cmap-t' }, u ? u.short : TITLES[id]),
      el('span', { class: 'cmap-p' }, `${d}/${n}`));
  }))));
}

// 单元头：编号、标题、进度、目标状态
function unitHead(h, uid) {
  const u = UNIT[uid];
  const draw = () => {
    const [d, n] = progressOf(uid), g = goalOfUnit(uid), st = g ? goalStatus(g) : null;
    const rv = status(uid.toUpperCase() + '-R01') === 'pass';
    h.replaceChildren(
      el('div', { class: 'uh-no' }, u.no),
      el('h1', { class: 'uh-t' }, u.title),
      el('p', { class: 'uh-sub' }, u.sub),
      el('div', { class: 'uh-meta' },
        g ? el('span', { class: `chip g${GOAL_ST.indexOf(st)}` }, `${g.id} ${g.name} · ${st}`) : el('span', { class: 'chip' }, '附加单元 · 不计入主线和目标状态'),
        rv ? el('span', { class: 'chip g2' }, '复查独立通过') : null,
        el('span', { class: 'chip' }, `${g ? '主线' : '本单元'} ${d}/${n}`)));
  };
  draw(); unitHeadRender = draw;
}

// 单元页的「问 建 用 变 留 补」步骤条
function stepBar(root) {
  const steps = $$('section.step', root);
  if (!steps.length) return;
  const bar = el('div', { class: 'steps', role: 'navigation', 'aria-label': '本单元步骤' },
    ...steps.map(s => el('a', { href: `#/${cur.view}/${s.id}`, 'data-s': s.id }, s.dataset.step)));
  steps[0].before(bar);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) $$('a', bar).forEach(a => a.classList.toggle('on', a.dataset.s === e.target.id));
  }, { rootMargin: '-30% 0px -60% 0px' });
  steps.forEach(s => io.observe(s));
}

// 上一页 / 下一页
const ORDER = ['guide', 'diagnosis', 'anchor', ...MAIN_UNITS.map(u => u.id), 'assessment', 'review', ...EXTRA_UNITS.map(u => u.id), 'record', 'sources'];
function pager(v) {
  const i = ORDER.indexOf(v), p = ORDER[i - 1], n = ORDER[i + 1];
  const name = id => UNIT[id] ? `${UNIT[id].no} ${UNIT[id].short}` : TITLES[id];
  return el('nav', { class: 'pager' },
    p ? el('a', { href: '#/' + p }, el('small', null, '上一页'), name(p)) : el('span'),
    n ? el('a', { class: 'next', href: '#/' + n }, el('small', null, '下一页'), name(n)) : el('span'));
}

function guideExtras(root) {
  const h2 = $('h2', root);
  h2.before(el('section', { class: 'about-block' }, el('h2', null, '这门课是什么'), el('div', { html: C.about })));
  root.append(
    el('h3', null, '怎样使用提示与参考'), el('div', { html: C.feedbackNotes }),
    el('h3', null, '关于这个网页版'),
    el('p', null, '这一版重写过原来的自学包：示范和练习里那些为教学临时编的短诗，全部换成了真实诗人的作品，每首都标明作者和诗题；讲解、提示和参考也重新写过，问什么答什么。网页自己的部分是呈现方式：每道题自带作答框和折叠的提示与参考，打开过什么都会如实记下；诗作随时可以从右上角的「诗卷」调出来对照；学习记录按你的自评和用过的帮助自动整理，可以导出成 Markdown 带到别处。'),
    el('p', null, '自评仍然是你自己对照检查标准作出的判断，网页不会替你判卷，也不会把读完、展开答案算作掌握。'));
}

function reviewExtras(root) {
  const first = $('.task[data-task]', root);
  const box = el('div', { class: 'banner info' });
  if (S.day0) {
    const due = dueNow();
    box.append(`第 0 天：${md(S.day0)}（${S.day0Manual ? '手动设定' : '最后完成综合验收的那天'}）。`,
      due.length ? el('b', null, `已到期：${due.join('、')}`) : '还没有到期的复习。');
  } else {
    box.append('还没完成综合验收：三道验收题都自评之后，网页会以那天为第 0 天算出复习日。也可以在', el('a', { href: '#/record/delays' }, '学习记录'), '里手动设定第 0 天。');
  }
  first.before(box);
  for (const [id, day] of [['RV01', 1], ['RV03', 7], ['RV05', 30]]) {
    const ph = $(`.task[data-task="${id}"]`, root);
    ph.before(el('h3', { class: 'day-h' }, `第 ${day} 天`, S.day0 ? el('span', null, md(addDays(S.day0, day))) : null));
  }
}

function assessmentExtras(root) {
  const f1 = $('.task[data-task="F01"]', root);
  f1.before(el('div', { class: 'banner info' }, '按原文规则：三道验收题都提交初稿之后，参考才会一起打开，免得 F01 的解析提前帮到 F02。用了提示也照样可以继续，只是这次不记为独立验收。'));
}

// ---------- 题目卡片 ----------
const expanded = new Set();
function foldText(id) {
  const src = triggerOf(id);
  return `仅在 ${src.join(' 或 ')} 自评没达标时做。`;
}
function card(id) {
  const task = C.tasks[id];
  const root = el('article', { class: 'tc', id: task.anchor, 'data-id': id });
  const draw = () => {
    const t = rec(id) || { hints: {} }, st = status(id);
    const opt = OPTIONAL.has(task.kind), trig = opt && triggered(id);
    root.className = `tc k-${task.kind} s-${st}${trig ? ' trig' : ''}`;
    const kids = [el('header', { class: 'tc-head' },
      el('span', { class: 'tc-id' }, id), el('span', { class: 'tc-kind' }, KIND[task.kind]),
      el('span', { class: 'tc-st' }, ST[st]),
      el('h3', { class: 'tc-title' }, task.title))];
    if (opt && !trig && !expanded.has(id) && st === 'todo') {
      kids.push(el('div', { class: 'tc-fold' }, el('span', null, foldText(id)),
        el('button', { class: 'btn sm', onclick: () => { expanded.add(id); draw(); } }, '展开这道题')));
      root.replaceChildren(...kids); return;
    }
    if (trig && !finished(st)) kids.push(el('div', { class: 'tc-trig' }, `${triggerOf(id).filter(everRedo).join('、')} 自评没达标过，按分流做这道复查。复查时不看提示和参考；允许看题目给出的诗。`));
    kids.push(el('div', { class: 'tc-prompt', html: task.prompt }));
    kids.push(work(id, task, t, draw));
    const fb = feedback(id, task, t, draw);
    if (fb) kids.push(fb);
    kids.push(trail(id, t));
    root.replaceChildren(...kids);
    setTimeout(() => $$('textarea', root).forEach(grow), 0);
  };
  CARDS.set(id, draw);
  draw();
  return root;
}
const grow = ta => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight + 2, 0) + 'px'; };

function rangeText(task, n) {
  if (task.ranges.length !== 1) return { text: `${n} 字`, cls: '' };
  const [a, b] = task.ranges[0];
  const cls = n === 0 ? '' : n < a ? 'short' : n > b ? 'long' : 'ok';
  return { text: a ? `${n} 字 · 题目要求 ${a}–${b} 字` : `${n} 字 · 不超过 ${b} 字`, cls };
}

function work(id, task, t, draw) {
  const locked = !!t.submittedAt;
  const box = el('div', { class: 'tc-work' + (locked ? ' locked' : '') });
  const count = el('span', { class: 'tc-count' });
  const saved = el('span', { class: 'tc-saved' });
  const submit = el('button', { class: 'btn pri', disabled: !hasDraft(t), onclick: () => onSubmit(id, draw) },
    task.kind === 'final' ? '提交这份初稿' : '提交初稿，核对参考');
  const upd = () => {
    const r = rec(id), r2 = rangeText(task, charCount(draftText(r)));
    count.textContent = r2.text; count.className = 'tc-count ' + r2.cls;
    submit.disabled = !hasDraft(r);
  };
  let savedTimer = 0;
  const onInput = (ta, k) => {
    const r = T(id), now = Date.now();
    if (task.fields) { if (!Array.isArray(r.draft)) r.draft = task.fields.map(() => ''); r.draft[k] = ta.value; }
    else r.draft = ta.value;
    r.firstAt = r.firstAt || now; r.editedAt = now;
    save(); upd(); grow(ta);
    saved.textContent = '已自动保存'; clearTimeout(savedTimer); savedTimer = setTimeout(() => (saved.textContent = ''), 1600);
    const chip = $('.tc-st', box.parentNode); if (chip) chip.textContent = ST[status(id)];
    box.parentNode && (box.parentNode.className = box.parentNode.className.replace(/\bs-\w+/, 's-' + status(id)));
    refreshNavSoon();
  };
  const label = el('div', { class: 'tc-label' }, el('b', null, locked ? '我的初稿（已提交）' : '我的作答'), count, saved);
  box.append(label);
  if (task.fields) {
    const vals = Array.isArray(t.draft) ? t.draft : [];
    box.append(el('div', { class: 'tc-fields' }, ...task.fields.map((f, k) => el('label', { class: 'tc-field' },
      el('span', null, f),
      el('textarea', { rows: locked ? 1 : 2, value: vals[k] || '', readOnly: locked, oninput: e => onInput(e.target, k) })))));
  } else {
    box.append(el('textarea', { class: 'tc-ta', rows: locked ? 1 : 5, value: typeof t.draft === 'string' ? t.draft : '', readOnly: locked,
      placeholder: locked ? '' : (task.kind === 'predict' ? '先写下 2–3 句判断。预测不按猜中计分。' : '先写下自己的判断和依据，再看提示或参考。'),
      'aria-label': `${id} 我的作答`, oninput: e => onInput(e.target, 0) }));
  }
  upd();
  if (locked) return box;
  // 提示：先 1 后 2；提交前打开的才算「用过提示」
  const hints = el('div', { class: 'tc-hints' });
  const acts = el('div', { class: 'tc-acts' });
  for (const k of [1, 2]) {
    const h = task['hint' + k];
    if (!h) continue;
    const opened = t.hints && t.hints['h' + k];
    if (opened) hints.append(el('div', { class: 'hint' }, el('b', null, k === 1 ? '提示 1｜先指方向' : '提示 2｜关键关系或局部步骤'), el('div', { html: h })));
    else acts.append(el('button', {
      class: 'btn sm', disabled: k === 2 && !(t.hints && t.hints.h1),
      title: k === 2 && !(t.hints && t.hints.h1) ? '先看提示 1' : null,
      onclick: () => { const r = T(id); r.hints = r.hints || {}; r.hints['h' + k] = Date.now(); save(true); draw(); refreshNavSoon(); },
    }, k === 1 ? '看提示 1' : '看提示 2'));
  }
  acts.append(el('span', { class: 'sp' }));
  if (!t.peekAt) acts.append(el('button', { class: 'btn link', onclick: () => onPeek(id, draw) }, '先看参考'));
  acts.append(submit);
  box.append(hints, acts);
  return box;
}

async function onPeek(id, draw) {
  const ok = await confirmBox('还没提交初稿', '现在打开参考，这道题这一次即使写对，也只能记为<b>借助帮助达标</b>（原文：看过解析后做对原题，只能记录“有提示可做”）。<br><br>卡住了可以先看提示，它的影响小一些。', '仍然打开参考', '再想想');
  if (!ok) return;
  const r = T(id); r.peekAt = Date.now(); save(true); draw(); refreshNavSoon();
}

function onSubmit(id, draw) {
  const r = T(id);
  if (!hasDraft(r)) return;
  r.submittedAt = Date.now();
  save(true);
  if (C.tasks[id].kind === 'final') {
    if (finalsReady()) { FINALS.forEach(x => CARDS.get(x) && CARDS.get(x)()); toast('三份初稿都交了：参考已经打开'); }
    else toast(`已提交。还差 ${FINALS.filter(x => !(rec(x) && rec(x).submittedAt)).join('、')} 的初稿`);
  }
  draw(); refreshNavSoon();
  const fb = $(`#${C.tasks[id].anchor} .tc-fb`);
  if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function feedback(id, task, t, draw) {
  const gated = task.kind === 'final' && !t.peekAt && !finalsReady();
  if (!t.submittedAt && !t.peekAt) return null;
  if (gated) return el('div', { class: 'tc-wait' }, `初稿已提交。等 ${FINALS.filter(x => !(rec(x) && rec(x).submittedAt)).join('、')} 也提交之后，三题的参考一起打开。`);
  const box = el('div', { class: 'tc-fb' });
  if (t.submittedAt && (task.hint1 || task.hint2)) {
    box.append(el('details', { class: 'fb-hints' }, el('summary', null, '两级提示'),
      task.hint1 ? el('div', { class: 'hint' }, el('b', null, '提示 1｜先指方向'), el('div', { html: task.hint1 })) : null,
      task.hint2 ? el('div', { class: 'hint' }, el('b', null, '提示 2｜关键关系或局部步骤'), el('div', { html: task.hint2 })) : null));
  }
  box.append(
    el('section', { class: 'fb-ans' }, el('h4', null, '参考解析／可接受表现'), el('div', { html: task.answer })),
    el('section', { class: 'fb-std' }, el('h4', null, '检查标准与分流'), el('div', { html: task.standard })));
  if (!t.submittedAt) {
    box.append(el('p', { class: 'tc-note' }, '你先看了参考：写完后照样提交初稿并自评，记录会注明这次看过参考。'));
    return box;
  }
  if (!t.result) {
    const pick = res => {
      const r = T(id); r.result = res; r.assessedAt = Date.now(); r.help = helpOf(r);
      autoDay0(); save(true); draw(); relatedOf(id).forEach(x => CARDS.get(x) && CARDS.get(x)());
      unitHeadRender && unitHeadRender(); recordRender && recordRender(); renderNav();
    };
    if (task.kind === 'predict') {
      box.append(el('div', { class: 'assess' }, el('span', null, '预测不按猜中计分：对照参考后，把这次判断留作记录。'),
        el('div', { class: 'assess-b' }, el('button', { class: 'btn pri', onclick: () => pick('done') }, '已对照，记为完成'))));
    } else {
      box.append(el('div', { class: 'assess' },
        el('span', null, '对照上面的检查标准，只看你提交的这份初稿：'),
        el('div', { class: 'assess-b' },
          el('button', { class: 'btn pri', onclick: () => pick('pass') }, '关键项都达标'),
          el('button', { class: 'btn', onclick: () => pick('partial') }, '部分达标'),
          el('button', { class: 'btn', onclick: () => pick('fail') }, '没有达到')),
        el('small', null, '按原文规则：不能用总分抵消关键错误，缺一个关键项就算没达标；结论和参考不同不算错。')));
    }
    return box;
  }
  box.append(outcome(id, task, t, draw));
  return box;
}

// 自评之后：结果、补救去向、改自评 / 再写一版
function outcome(id, task, t, draw) {
  const st = status(id), k = task.kind;
  const box = el('div', { class: 'outcome o-' + st });
  box.append(el('div', { class: 'oc-h' }, el('b', null, ST[st]),
    k === 'predict' ? null : el('span', null, `自评：${RESULT[t.result]} · ${HELP[t.help]}`)));
  if (st === 'assisted') box.append(el('p', null, t.help === 'answer' ? '这次看过参考，按课程规则只能记为借助帮助完成。以后用复查题或延迟题取得新的独立证据。' : '提交前用过提示：记为借助帮助完成，不算独立通过。'));
  if (st === 'redo') {
    const go = [];
    const u = C.tasks[id].view;
    if (k === 'diag') go.push(['读 ' + id.replace('D', 'B'), `#/diagnosis/${id.replace('D', 'b').toLowerCase()}`], [`做 ${id}-R01`, taskHref(id + '-R01')]);
    else if (k === 'indep' || k === 'vary') go.push(['看本单元「补救与复查入口」', `#/${u}/${u}-repair`], [`做 ${u.toUpperCase()}-R01`, taskHref(u.toUpperCase() + '-R01')]);
    else if (k === 'final') go.push(['看「验收失败后的具体回退」', '#/assessment/exam-repair'], [`做 ${id}-R01`, taskHref(id + '-R01')]);
    else if (k === 'unit-r') go.push(['回到本单元「建」与完整示范', `#/${u}/${u}-build`]);
    else if (k === 'fill' || k === 'card' || k === 'extra') go.push(['回看本单元讲解', `#/${u}/${u}-build`]);
    box.append(el('p', null, k === 'unit-r' || k === 'diag-r' || k === 'final-r'
      ? '复查再次没过：回到讲解与示范，对照解析重建一次；不要当天反复刷同一题，改用延迟复习作后续证据。'
      : '按检查标准里的分流去补：'),
    el('div', { class: 'oc-go' }, ...go.map(([txt, href]) => el('a', { class: 'btn sm', href }, txt + ' →'))));
  }
  box.append(el('div', { class: 'oc-acts' },
    el('button', { class: 'btn link', onclick: () => { const r = T(id); r.result = r.assessedAt = r.help = null; autoDay0(); save(true); draw(); relatedOf(id).forEach(x => CARDS.get(x) && CARDS.get(x)()); unitHeadRender && unitHeadRender(); renderNav(); } }, '改自评'),
    k === 'predict' ? null : el('button', { class: 'btn link', onclick: () => retry(id, draw) }, '再写一版')));
  return box;
}

async function retry(id, draw) {
  const ok = await confirmBox('再写一版', '当前这版连同自评会存进记录。因为已经看过参考，新的一版按原文只能算「重新提取」，即使做对也记为借助帮助达标；要取得新的独立证据，请用对应的复查题或延迟复习。', '开始新的一版');
  if (!ok) return;
  const r = T(id);
  (r.attempts = r.attempts || []).push({ draft: r.draft, firstAt: r.firstAt, hints: r.hints, peekAt: r.peekAt, submittedAt: r.submittedAt, result: r.result, help: r.help, assessedAt: r.assessedAt });
  Object.assign(r, { seen: true, hints: {}, peekAt: null, submittedAt: null, result: null, help: null, assessedAt: null, firstAt: Date.now() });
  autoDay0(); save(true); draw(); relatedOf(id).forEach(x => CARDS.get(x) && CARDS.get(x)()); unitHeadRender && unitHeadRender(); renderNav();
}

// 卡片底部的留痕
function trail(id, t) {
  const bits = [];
  if (t.firstAt) bits.push(`${hm(t.firstAt)} 落笔`);
  if (t.hints && t.hints.h1) bits.push(`看提示 1（${hm(t.hints.h1)}）`);
  if (t.hints && t.hints.h2) bits.push(`看提示 2（${hm(t.hints.h2)}）`);
  if (t.peekAt) bits.push(`提交前看参考（${hm(t.peekAt)}）`);
  if (t.submittedAt) bits.push(`${hm(t.submittedAt)} 提交`);
  if (t.assessedAt) bits.push(`自评${RESULT[t.result]}`);
  const n = (t.attempts || []).length;
  if (n) bits.push(`第 ${n + 1} 版（前 ${n} 版已存档）`);
  return el('div', { class: 'tc-trail' }, bits.length ? '留痕：' + bits.join(' · ') : '还没有留痕。写下的内容会自动保存在这台设备上。');
}

// ---------- 学习记录 ----------
function recordApp() {
  const box = el('div', { class: 'record' });
  const draw = () => {
    box.replaceChildren(goalsTable(), delaysBlock(), journal(), allTasks(), reflection(), dataBlock());
  };
  draw(); recordRender = draw;
  return box;
}

function goalsTable() {
  const chip = id => el('a', { class: 'tchip s-' + status(id), href: taskHref(id), title: `${id}：${ST[status(id)]}` }, id.replace(/^U\d\d-/, ''));
  return el('section', { class: 'rec-sec' }, el('h3', null, '目标状态'),
    el('div', { class: 'tbl' }, el('table', null,
      el('thead', null, el('tr', null, ...['目标', '状态', '独立检验＋变式', '综合任务', '延迟入口', '备注'].map(h => el('th', null, h)))),
      el('tbody', null, ...C.goals.map(g => {
        const st = goalStatus(g), help = [...g.checks, g.checks[0].replace('Q02', 'Q01')].filter(x => rec(x) && rec(x).help && rec(x).help !== 'none');
        const notes = [];
        if (status(g.unit.toUpperCase() + '-R01') === 'pass') notes.push('复查独立通过');
        if (help.length) notes.push(`${help.join('、')} 用过帮助`);
        return el('tr', null,
          el('td', null, el('a', { href: '#/' + g.unit }, `${g.id} ${g.name}`), el('div', { class: 'muted small' }, g.desc)),
          el('td', null, el('span', { class: `chip g${GOAL_ST.indexOf(st)}` }, st)),
          el('td', null, ...g.checks.map(chip)), el('td', null, ...g.finals.map(chip)), el('td', null, ...g.delays.map(chip)),
          el('td', { class: 'small' }, notes.join('；')));
      })))),
    el('div', { class: 'muted small', html: C.coverageNotes }));
}

function delaysBlock() {
  const input = el('input', { type: 'date', value: S.day0 || '', 'aria-label': '第 0 天',
    onchange: e => { S.day0 = e.target.value || null; S.day0Manual = !!e.target.value; if (!S.day0Manual) autoDay0(); save(true); recordRender && recordRender(); renderNav(); } });
  return el('section', { class: 'rec-sec', id: 'delays' }, el('h3', null, '延迟检查'),
    el('p', { class: 'small' }, '第 0 天：', input,
      S.day0Manual ? el('button', { class: 'btn link', onclick: () => { S.day0Manual = false; autoDay0(); save(true); recordRender(); renderNav(); } }, '改回自动') : null,
      el('span', { class: 'muted' }, S.day0 ? (S.day0Manual ? '（手动设定）' : '（最后完成综合验收的那天）') : '（三道验收题都自评后自动填上）')),
    el('div', { class: 'tbl' }, el('table', null,
      el('thead', null, el('tr', null, ...['检查', '计划日期', '实际日期', '状态'].map(h => el('th', null, h)))),
      el('tbody', null, ...[['RV01', 'RV02', 1], ['RV03', 'RV04', 7], ['RV05', 'RV06', 30]].map(([a, b, d]) => el('tr', null,
        el('td', null, `第 ${d} 天 `, el('a', { href: taskHref(a) }, a), '–', el('a', { href: taskHref(b) }, b)),
        el('td', null, S.day0 ? md(addDays(S.day0, d)) : '—'),
        el('td', null, [a, b].map(x => rec(x) && rec(x).assessedAt ? `${x} ${md(rec(x).assessedAt)}` : '').filter(Boolean).join('；') || '—'),
        el('td', null, `${a} ${ST[status(a)]} · ${b} ${ST[status(b)]}`)))))));
}

// 学习日志：按日期列出每道题发生了什么
function journal() {
  const days = {};
  const add = (ts, id, what) => { if (!ts) return; (days[ymd(ts)] = days[ymd(ts)] || []).push({ ts, id, what }); };
  for (const [id, t] of Object.entries(S.tasks)) {
    if (!C.tasks[id]) continue;
    for (const a of [...(t.attempts || []), t]) {
      if (a.hints && a.hints.h1) add(a.hints.h1, id, '看提示 1');
      if (a.hints && a.hints.h2) add(a.hints.h2, id, '看提示 2');
      add(a.peekAt, id, '提交前看参考');
      add(a.submittedAt, id, '提交初稿');
      if (a.assessedAt) add(a.assessedAt, id, `自评：${RESULT[a.result]}${a.help && a.help !== 'none' ? `（${HELP[a.help]}）` : ''}`);
    }
  }
  const keys = Object.keys(days).sort().reverse();
  return el('section', { class: 'rec-sec' }, el('h3', null, '学习日志'),
    keys.length ? el('div', { class: 'journal' }, ...keys.map(k => el('div', { class: 'jd' },
      el('div', { class: 'jd-h' }, md(k)),
      el('ul', null, ...days[k].sort((a, b) => a.ts - b.ts).map(e => el('li', null,
        el('span', { class: 'muted' }, hm(e.ts).split(' ')[1]), ' ', el('a', { href: taskHref(e.id) }, e.id), ' ', e.what)))))) :
      el('p', { class: 'muted' }, '还没有记录。提交初稿、打开提示或参考、自评，都会记在这里。'));
}

function allTasks() {
  const groups = [['前置诊断与补课', 'diagnosis'], ...MAIN_UNITS.map(u => [`${u.no} ${u.short}`, u.id]), ['综合验收', 'assessment'], ['延迟复习', 'review'], ...EXTRA_UNITS.map(u => [`${u.no} ${u.short}（附加单元）`, u.id])];
  return el('section', { class: 'rec-sec' }, el('h3', null, '全题号留痕'),
    el('p', { class: 'muted small' }, '复查题只在相应分流触发时启用；附加题和附加单元不计入主线。这张表用来避免把“读过”记成“会做”。'),
    el('div', { class: 'tbl' }, el('table', { class: 'tasks-t' },
      el('thead', null, el('tr', null, ...['题号', '任务', '状态', '帮助', '版本'].map(h => el('th', null, h)))),
      el('tbody', null, ...groups.flatMap(([name, view]) => [
        el('tr', { class: 'grp' }, el('td', { colspan: 5 }, name)),
        ...TASK_IDS.filter(id => C.tasks[id].view === view).map(id => {
          const t = rec(id), st = status(id);
          return el('tr', null, el('td', null, el('a', { href: taskHref(id) }, id)), el('td', null, C.tasks[id].title),
            el('td', null, el('span', { class: 'tchip s-' + st }, ST[st])),
            el('td', { class: 'small' }, t && t.help ? HELP[t.help] : t && (t.peekAt || (t.hints && t.hints.h1)) ? (t.peekAt ? '看过参考' : '看过提示') : ''),
            el('td', { class: 'small' }, t && t.attempts && t.attempts.length ? `${t.attempts.length + 1}` : ''));
        })])))));
}

// 单次回顾：原文的填空句，改成可以直接写的输入框
const REFLECT = [['relations', '我能独立解释的关系是'], ['needHelp', '我仍要借助提示的环节是'], ['evidence', '我的证据是这几道题里我自己写下的答案'], ['nextOpen', '下次先打开哪里']];
function reflection() {
  return el('section', { class: 'rec-sec' }, el('h3', null, '单次回顾'),
    el('p', { class: 'muted small' }, '只按真实情况写，网页不替你填写。'),
    ...REFLECT.map(([k, label]) => el('label', { class: 'tc-field' }, el('span', null, label),
      el('textarea', { rows: 2, value: S.notes[k] || '', oninput: e => { S.notes[k] = e.target.value; save(); grow(e.target); } }))));
}

function dataBlock() {
  const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: e => importJSON(e.target.files[0]) });
  return el('section', { class: 'rec-sec' }, el('h3', null, '导出与备份'),
    el('p', { class: 'small' }, '学习记录可以导出成 Markdown：目标状态、延迟检查、全题号留痕和你每道题的原始作答都在里面，方便带到新的对话或交给老师看。备份文件用来换设备或清理浏览器之后恢复。'),
    el('div', { class: 'row' },
      el('button', { class: 'btn pri', onclick: exportMD }, '导出学习记录（Markdown）'),
      el('button', { class: 'btn', onclick: exportJSON }, '导出备份'),
      el('button', { class: 'btn', onclick: () => file.click() }, '导入备份'), file,
      el('span', { class: 'sp' }),
      el('button', { class: 'btn danger', onclick: wipe }, '清空本机记录')));
}

function download(name, text, type) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportJSON() { download(`诗论学习备份-${ymd(Date.now())}.json`, JSON.stringify({ app: 'poetics', ...S }, null, 1), 'application/json'); }
function importJSON(f) {
  if (!f) return;
  const rd = new FileReader();
  rd.onload = async () => {
    let d;
    try { d = JSON.parse(rd.result); } catch (e) { toast('这个文件读不出来'); return; }
    if (!d || d.app !== 'poetics' || d.v !== 1 || !d.tasks) { toast('这不是本课程导出的备份'); return; }
    const ok = await confirmBox('导入备份', `备份里有 ${Object.keys(d.tasks).length} 道题的记录。导入会<b>覆盖</b>这台设备上现有的全部记录。`, '覆盖并导入');
    if (!ok) return;
    delete d.app; S = Object.assign(blank(), d); save(true); toast('已导入'); renderNav(); render();
  };
  rd.readAsText(f);
}
async function wipe() {
  const ok = await confirmBox('清空本机记录', '这会删除这台设备上的全部作答、留痕和自评，无法撤销。需要的话先导出备份。', '清空');
  if (!ok) return;
  S = blank(); save(true); toast('已清空'); renderNav(); render();
}

function exportMD() {
  const L = [], esc = s => String(s || '').replace(/\|/g, '｜').replace(/\n/g, ' ');
  const plain = h => el('div', { html: h }).textContent.trim();
  L.push(`# ${C.title}｜学习记录`, '', `导出时间：${stamp(Date.now())}　·　来源：${location.origin}${location.pathname}`, '',
    '状态由自评和用过的帮助按课程规则推出：未验证／有提示可做／独立可做／变式通过／延迟检查通过。', '');
  L.push('## 目标状态', '', '|目标|状态|独立检验＋变式|综合任务|延迟入口|备注|', '|---|---|---|---|---|---|');
  for (const g of C.goals) {
    const f = id => `${id}（${ST[status(id)]}）`;
    L.push(`|${g.id} ${g.name}|${goalStatus(g)}|${g.checks.map(f).join('、')}|${g.finals.map(f).join('、')}|${g.delays.map(f).join('、')}|${status(g.unit.toUpperCase() + '-R01') === 'pass' ? '复查独立通过' : ''}|`);
  }
  L.push('', '## 延迟检查', '', `第 0 天：${S.day0 || '（尚未完成综合验收）'}`, '', '|检查|计划日期|状态|', '|---|---|---|');
  for (const [a, b, d] of [['RV01', 'RV02', 1], ['RV03', 'RV04', 7], ['RV05', 'RV06', 30]])
    L.push(`|第 ${d} 天 ${a}–${b}|${S.day0 ? addDays(S.day0, d) : ''}|${a} ${ST[status(a)]}；${b} ${ST[status(b)]}|`);
  L.push('', '## 全题号留痕', '', '|题号|任务|状态|是否用帮助|版本|', '|---|---|---|---|---|');
  for (const id of TASK_IDS) {
    const t = rec(id);
    L.push(`|${id}|${esc(C.tasks[id].title)}|${ST[status(id)]}|${t && t.help ? HELP[t.help] : ''}|${t && t.attempts && t.attempts.length ? t.attempts.length + 1 : ''}|`);
  }
  L.push('', '## 单次回顾', '');
  for (const [k, label] of REFLECT) L.push(`${label}：${S.notes[k] ? S.notes[k].trim() : '________'}`, '');
  L.push('## 我的作答', '');
  for (const id of TASK_IDS) {
    const t = rec(id);
    if (!t || !(hasDraft(t) || (t.attempts && t.attempts.length))) continue;
    L.push(`### ${id}｜${C.tasks[id].title}`, '', `题目：${plain(C.tasks[id].prompt).replace(/\s+/g, ' ')}`, '');
    const one = (a, label) => {
      const meta = [label, a.submittedAt ? `提交 ${stamp(a.submittedAt)}` : '未提交', a.result ? `自评：${RESULT[a.result]}` : '', a.help ? HELP[a.help] : (a.peekAt ? '提交前看过参考' : a.hints && (a.hints.h1 || a.hints.h2) ? '看过提示' : '')].filter(Boolean);
      L.push(`- ${meta.join(' · ')}`, '');
      if (Array.isArray(a.draft)) C.tasks[id].fields.forEach((f, k) => L.push(`> **${f}** ${(a.draft[k] || '').trim()}`, '>'));
      else L.push(...(a.draft || '').trim().split('\n').map(x => '> ' + x));
      L.push('');
    };
    (t.attempts || []).forEach((a, k) => one(a, `第 ${k + 1} 版`));
    if (hasDraft(t)) one(t, t.attempts && t.attempts.length ? `第 ${t.attempts.length + 1} 版（当前）` : '初稿');
  }
  download(`诗论学习记录-${ymd(Date.now())}.md`, L.join('\n'), 'text/markdown;charset=utf-8');
}

// ---------- 启动 ----------
shell();
addEventListener('hashchange', route);
route();
