// 外壳：大厅、路由、计时、存档、统计、结算与分享
import { makeRng, dateKey, dayNumber, weekday, store, fmtTime, el, ICON } from './lib.js';
import zip from './zip.js';
import queens from './queens.js';
import tango from './tango.js';
import patches from './patches.js';
import sudoku from './sudoku.js';

const GAMES = [zip, queens, tango, patches, sudoku];
const BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]));
const V = 'pz1';
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const app = document.getElementById('app');
const onSite = /^https?:$/.test(location.protocol) && location.hostname && !/^(localhost|127\.)/.test(location.hostname);

// ---------- 设置与主题 ----------
const settings = { autoX: false, showErrors: true, ...store.get(`${V}:settings`, {}) };
let theme = store.get(`${V}:theme`, 'auto');
const darkMq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = theme === 'dark' || (theme === 'auto' && darkMq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#131216' : '#f4f2ee');
}
darkMq.addEventListener('change', applyTheme);
applyTheme();
function cycleTheme() {
  theme = { auto: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', light: 'dark', dark: 'light' }[theme];
  store.set(`${V}:theme`, theme); applyTheme();
}

// ---------- 统计 ----------
const statsOf = id => store.get(`${V}:stats:${id}`, { daily: {}, best: {}, won: 0 });
function streakOf(id) {
  const d = statsOf(id).daily, dt = new Date();
  if (!d[dateKey(dt)]) dt.setDate(dt.getDate() - 1);
  let n = 0;
  while (d[dateKey(dt)]) { n++; dt.setDate(dt.getDate() - 1); }
  return n;
}

// ---------- 题目缓存：每日题一天只算一次 ----------
function puzzleFor(game, seed, diff) {
  const k = `${V}:puz:${seed}`, hit = store.get(k, null);
  if (hit && hit.diff === diff && hit.p) return hit.p;
  const p = game.generate(makeRng(seed), diff);
  store.set(k, { diff, p, at: Date.now() });
  const keys = store.keys(`${V}:puz:`);
  if (keys.length > 40) keys.map(x => [x, store.get(x, {}).at || 0]).sort((a, b) => a[1] - b[1]).slice(0, keys.length - 40).forEach(([x]) => store.del(x));
  return p;
}

// ---------- 小组件 ----------
let toastEl = null, toastT = 0;
function toast(msg, ms = 2200) {
  if (!toastEl) { toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
}
let modalEl = null;
function modal(content, { onClose } = {}) {
  closeModal();
  const dlg = el('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true' }, content);
  modalEl = el('div', { class: 'mask', onclick: e => { if (e.target === modalEl) closeModal(); } }, dlg);
  modalEl._onClose = onClose;
  document.body.append(modalEl);
  setTimeout(() => (dlg.querySelector('.btn.pri') || dlg.querySelector('button'))?.focus(), 30);
}
function closeModal() {
  if (!modalEl) return;
  const cb = modalEl._onClose;
  modalEl.remove(); modalEl = null;
  if (cb) cb();
}
function topbar(extra) {
  return el('header', { class: 'top' },
    onSite ? el('a', { class: 'home-link', href: '/', title: '返回主站' }, '← 主站') : null,
    el('a', { class: 'brand', href: '#' }, '智力小游戏', el('small', null, 'PUZZLES')),
    extra || null,
    el('button', { class: 'ib', title: '切换深色/浅色', 'aria-label': '切换深色/浅色', html: ICON.theme, onclick: cycleTheme }));
}

// ---------- 大厅 ----------
let hubTimer = 0;
function renderHub() {
  document.title = '智力小游戏 · Puzzles';
  const today = dateKey(), wd = weekday(today);
  const count = el('span', { class: 'count' });
  const tickCount = () => {
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    count.textContent = fmtTime((next - now) / 1000);
    if (dateKey() !== today) renderHub();
  };
  tickCount();
  clearInterval(hubTimer); hubTimer = setInterval(tickCount, 1000);
  const cards = GAMES.map(g => {
    const sv = store.get(`${V}:save:${g.id}:d:${today}`, null), st = streakOf(g.id);
    const diff = g.diffs.find(d => d.id === g.dailyDiff(wd));
    const status = sv && sv.done ? el('span', { class: 'pill done' }, `✓ ${fmtTime(sv.doneTime)}`)
      : sv && sv.elapsed > 0 ? el('span', { class: 'pill go' }, `进行中 ${fmtTime(sv.elapsed)}`)
        : el('span', { class: 'pill' }, `今日 · ${diff.label}`);
    return el('a', { class: 'card', href: `#${g.id}`, style: { '--c': g.accent } },
      el('div', { class: 'ic', html: g.icon }),
      el('div', null, el('h2', null, g.name, el('small', null, g.cn)), el('p', { class: 'tl' }, g.tagline)),
      el('div', { class: 'st' }, status, st ? el('span', null, `🔥 连续 ${st} 天`) : null));
  });
  const doneN = GAMES.filter(g => (store.get(`${V}:save:${g.id}:d:${today}`, null) || {}).done).length;
  app.replaceChildren(topbar(), el('main', { class: 'hub' },
    el('div', { class: 'hub-head' },
      el('h1', null, '每日智力题'),
      el('p', null, `${+today.slice(5, 7)} 月 ${+today.slice(8)} 日 ${WEEK[wd]} · 第 ${dayNumber(today)} 期 · 今天完成 ${doneN}/${GAMES.length} · 下一期 `, count)),
    el('div', { class: 'cards' }, cards),
    el('p', { class: 'hub-foot' }, '每天零点换题，所有人拿到的是同一道。题目由程序现场生成，每道都保证有且只有一个解。', el('br'), '玩法致敬 LinkedIn 的每日小游戏。')));
  window.scrollTo(0, 0);
}

// ---------- 游戏页 ----------
let S = null; // 当前对局
const lastMode = {};
const now = () => performance.now();
const elapsedOf = s => s.elapsed + (s.runningSince != null ? (now() - s.runningSince) / 1000 : 0);

function persist() {
  if (!S || !S.ctl) return;
  store.set(S.key, { seed: S.seed, diff: S.diff, user: S.ctl.state(), elapsed: elapsedOf(S), hints: S.hints, started: S.started, done: S.done, doneTime: S.doneTime });
}
function pause() { if (S && S.runningSince != null) { S.elapsed = elapsedOf(S); S.runningSince = null; persist(); } }
function resume() { if (S && S.started && !S.done && S.runningSince == null && !document.hidden) S.runningSince = now(); }
document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
addEventListener('pagehide', pause);

function closeGame() {
  if (!S) return;
  pause(); persist();
  clearInterval(S.tick);
  S.ctl?.destroy();
  S = null;
}

function openGame(id) {
  closeGame(); clearInterval(hubTimer);
  const game = BY_ID[id];
  document.title = `${game.name} · 智力小游戏`;
  document.documentElement.style.setProperty('--accent', game.accent);
  const mode = lastMode[id] || 'daily';
  const today = dateKey(), wd = weekday(today);

  const els = {};
  els.meta = el('div', { class: 'meta' });
  els.tabs = el('div', { class: 'tabs', role: 'tablist' },
    el('button', { class: 'tab', role: 'tab', 'data-m': 'daily' }, '今日题'),
    el('button', { class: 'tab', role: 'tab', 'data-m': 'practice' }, '练习'));
  els.diffs = el('div', { class: 'diffs' }, game.diffs.map(d => el('button', { class: 'chip', 'data-d': d.id }, d.label)));
  els.timer = el('div', { class: 'timer', 'aria-label': '用时' }, el('i', { class: 'dot' }), el('span', null, '0:00'));
  els.info = el('div');
  els.banner = el('div', { class: 'banner hidden' });
  els.stage = el('div', { class: 'stage' });
  els.undo = el('button', { class: 'tool', html: `${ICON.undo}<span>撤销</span>`, title: '撤销（⌘Z）' });
  els.clear = el('button', { class: 'tool', html: `${ICON.trash}<span>清空</span>` });
  els.hint = el('button', { class: 'tool', html: `${ICON.bulb}<span>提示</span>` });
  els.fresh = el('button', { class: 'tool', html: `${ICON.refresh}<span>换一题</span>` });

  app.replaceChildren(
    topbar(),
    el('main', { class: 'game' },
      el('div', { class: 'g-head' },
        el('a', { class: 'ib', href: '#', title: '全部游戏', 'aria-label': '返回全部游戏', html: ICON.back }),
        el('div', { class: 'ic', html: game.icon }),
        el('div', null, el('h1', null, game.name, el('small', null, game.cn)), els.meta),
        el('div', { class: 'sp' }, el('button', { class: 'ib', title: '玩法', 'aria-label': '玩法说明', html: ICON.help, onclick: () => showRules(game) }))),
      els.tabs, els.diffs,
      el('div', { class: 'status' }, els.timer, els.info),
      els.banner, els.stage,
      el('div', { class: 'tools' }, els.undo, els.clear, els.hint, els.fresh)));
  window.scrollTo(0, 0);

  S = { game, mode, els, today, wd };
  els.tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b || b.dataset.m === S.mode) return;
    lastMode[id] = b.dataset.m;
    openGame(id);
  });
  els.diffs.addEventListener('click', e => {
    const b = e.target.closest('[data-d]');
    if (!b || !S || b.dataset.d === S.diff) return;
    store.set(`${V}:pdiff:${id}`, b.dataset.d);
    openGame(id);
  });
  els.undo.onclick = () => { if (S?.ctl && !S.done) { if (!S.ctl.undo()) toast('没有可以撤销的了'); } };
  els.clear.onclick = () => {
    if (!S?.ctl || S.done) return;
    if (!els.clear.classList.contains('warn')) {
      els.clear.classList.add('warn'); els.clear.lastChild.textContent = '确认清空';
      setTimeout(() => { els.clear.classList.remove('warn'); els.clear.lastChild.textContent = '清空'; }, 2400);
      return;
    }
    els.clear.classList.remove('warn'); els.clear.lastChild.textContent = '清空';
    S.ctl.clear();
  };
  els.hint.onclick = () => {
    if (!S?.ctl || S.done) return;
    const msg = S.ctl.hint();
    if (msg == null) { toast('已经没什么可提示的了'); return; }
    S.hints++; S.started = true; resume(); persist(); updateInfo();
    toast('💡 ' + msg, 3000);
  };
  els.fresh.onclick = () => {
    if (!S || S.mode !== 'practice') return;
    store.del(S.key);
    openGame(id);
  };
  load();
}

function load() {
  const { game, mode, els, today, wd } = S;
  let diff, seed, key;
  if (mode === 'daily') {
    diff = game.dailyDiff(wd);
    seed = `daily:${game.id}:${today}`;
    key = `${V}:save:${game.id}:d:${today}`;
  } else {
    diff = store.get(`${V}:pdiff:${game.id}`, game.diffs[1] ? game.diffs[1].id : game.diffs[0].id);
    if (!game.diffs.some(d => d.id === diff)) diff = game.diffs[0].id;
    key = `${V}:save:${game.id}:p:${diff}`;
    const sv = store.get(key, null);
    seed = sv && sv.seed ? sv.seed : `practice:${game.id}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }
  const saved = store.get(key, null);
  const valid = saved && saved.seed === seed ? saved : null;
  Object.assign(S, { diff, seed, key, hints: valid ? valid.hints || 0 : 0, elapsed: valid ? valid.elapsed || 0 : 0,
    started: valid ? !!valid.started : false, done: valid ? !!valid.done : false, doneTime: valid ? valid.doneTime : null, runningSince: null });

  [...els.tabs.children].forEach(b => b.classList.toggle('on', b.dataset.m === mode));
  els.diffs.classList.toggle('hidden', mode !== 'practice');
  [...els.diffs.children].forEach(b => b.classList.toggle('on', b.dataset.d === diff));
  els.fresh.classList.toggle('hidden', mode !== 'practice');
  const dLabel = game.diffs.find(d => d.id === diff).label;
  els.meta.textContent = mode === 'daily' ? `今日 #${dayNumber(today)} · ${WEEK[wd]} · ${dLabel}` : `练习 · ${dLabel}`;
  els.stage.replaceChildren(el('div', { class: 'loading' }, el('div', null, el('div', { class: 'spin' }), '出题中…')));

  const token = S;
  // 让“出题中”先画出来，再在主线程生成（最慢的 8×8 Zip 约几百毫秒）
  setTimeout(() => {
    if (S !== token) return;
    let puzzle;
    try { puzzle = puzzleFor(game, seed, diff); } catch (err) {
      console.error(err);
      els.stage.replaceChildren(el('div', { class: 'loading' }, el('div', null, '出题失败了 ', el('button', { class: 'chip on', onclick: () => load() }, '重试'))));
      return;
    }
    S.puzzle = puzzle;
    els.stage.replaceChildren();
    const ctx = {
      settings,
      changed() {
        if (!S || S !== token || S.done) return;
        if (!S.started) { S.started = true; }
        resume(); persist(); updateInfo();
      },
      won() { if (S === token) finish(); },
      toast,
    };
    S.ctl = game.mount(els.stage, puzzle, valid ? valid.user : null, ctx);
    persist(); // 立即落盘：练习题刷新后仍是同一道
    els.info.textContent = game.sizeLabel(puzzle);
    updateInfo();
    if (S.done) showDone(false); else resume();
    S.tick = setInterval(renderTimer, 500);
    renderTimer();
  }, 30);
}

function renderTimer() {
  if (!S) return;
  const t = S.done ? S.doneTime : elapsedOf(S);
  S.els.timer.lastChild.textContent = fmtTime(t);
  S.els.timer.classList.toggle('run', S.runningSince != null);
}
function updateInfo() {
  if (!S || !S.puzzle) return;
  S.els.info.textContent = `${S.game.sizeLabel(S.puzzle)}${S.hints ? ` · 提示 ${S.hints} 次` : ''}`;
  [S.els.undo, S.els.clear, S.els.hint].forEach(b => (b.disabled = S.done));
}

function finish() {
  if (!S || S.done) return;
  S.doneTime = elapsedOf(S);
  S.elapsed = S.doneTime; S.runningSince = null; S.done = true;
  persist(); renderTimer(); updateInfo();
  const { game, mode, today, diff } = S;
  const st = statsOf(game.id);
  st.won = (st.won || 0) + 1;
  const prevBest = st.best[diff];
  const record = !S.hints && (prevBest == null || S.doneTime < prevBest);
  if (record) st.best[diff] = S.doneTime;
  if (mode === 'daily') st.daily[today] = { t: Math.round(S.doneTime), h: S.hints, d: diff };
  store.set(`${V}:stats:${game.id}`, st);
  S.record = record; S.prevBest = prevBest;
  const board = S.els.stage.querySelector('.board');
  board && board.classList.add('won');
  setTimeout(() => showDone(true), 520);
}

function shareText() {
  const { game, mode, today, diff, doneTime, hints, puzzle } = S;
  const dl = game.diffs.find(d => d.id === diff).label;
  return [`${game.name} ${mode === 'daily' ? `#${dayNumber(today)}` : '练习'} · ${dl} ${game.sizeLabel(puzzle)}`,
    `⏱ ${fmtTime(doneTime)}${hints ? `  💡×${hints}` : '  零提示'}${mode === 'daily' && streakOf(game.id) > 1 ? `  🔥${streakOf(game.id)}` : ''}`,
    onSite ? `${location.origin}/puzzles/#${game.id}` : ''].filter(Boolean).join('\n');
}
async function share() {
  const text = shareText();
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    toast('成绩已复制，粘贴给朋友吧');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    toast('复制失败，请手动截图');
  }
}
function nextGame() {
  const today = dateKey();
  const order = GAMES.map(g => g.id), i = order.indexOf(S.game.id);
  for (let k = 1; k < order.length; k++) {
    const g = BY_ID[order[(i + k) % order.length]];
    if (!(store.get(`${V}:save:${g.id}:d:${today}`, null) || {}).done) return g;
  }
  return null;
}
function showDone(fresh) {
  if (!S) return;
  const { game, mode } = S;
  const board = S.els.stage.querySelector('.board');
  board && board.classList.add('won');
  const st = statsOf(game.id), streak = streakOf(game.id), best = st.best[S.diff];
  const nx = mode === 'daily' ? nextGame() : null;
  S.els.banner.classList.remove('hidden');
  S.els.banner.replaceChildren(
    el('span', null, `✓ ${mode === 'daily' ? '今日已完成' : '完成'} · ${fmtTime(S.doneTime)}${S.hints ? ` · 提示 ${S.hints} 次` : ''}`),
    el('button', { onclick: share }, '分享'));
  if (!fresh) return;
  modal(el('div', { class: 'win' },
    el('div', { class: 'check', html: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.2 4.2L19 7"/></svg>' }),
    el('h3', null, S.record && S.prevBest != null ? '新纪录！' : '完成！'),
    el('div', { class: 'sub' }, `${game.name} · ${mode === 'daily' ? `今日 #${dayNumber(S.today)}` : '练习'} · ${game.diffs.find(d => d.id === S.diff).label} ${game.sizeLabel(S.puzzle)}`),
    el('div', { class: 'nums' },
      el('div', { class: S.record ? 'rec' : '' }, el('b', null, fmtTime(S.doneTime)), el('span', null, '用时')),
      el('div', null, el('b', null, String(S.hints)), el('span', null, '提示')),
      el('div', null, el('b', null, best != null ? fmtTime(best) : '—'), el('span', null, '最佳（零提示）'))),
    mode === 'daily' && streak ? el('div', { class: 'streak' }, '连续打卡 ', el('b', null, `${streak} 天`)) : null,
    el('div', { class: 'acts' },
      el('button', { class: 'btn', onclick: share }, '分享成绩'),
      nx ? el('button', { class: 'btn pri', onclick: () => { closeModal(); location.hash = nx.id; } }, `下一个：${nx.name}`)
        : el('button', { class: 'btn pri', onclick: () => { closeModal(); lastMode[game.id] = 'practice'; store.del(`${V}:save:${game.id}:p:${store.get(`${V}:pdiff:${game.id}`, 'medium')}`); openGame(game.id); } }, '再来一局'))));
}

function showRules(game) {
  const rows = (game.settings || []).map(s => {
    const sw = el('button', { class: 'sw' + (settings[s.key] ? ' on' : ''), role: 'switch', 'aria-checked': String(!!settings[s.key]), 'aria-label': s.label });
    sw.onclick = () => {
      settings[s.key] = !settings[s.key];
      sw.classList.toggle('on', settings[s.key]); sw.setAttribute('aria-checked', String(settings[s.key]));
      store.set(`${V}:settings`, settings);
      S?.ctl?.refresh();
    };
    return el('div', { class: 'row' }, el('span', null, s.label), sw);
  });
  modal(el('div', null,
    el('h3', null, el('span', { class: 'ic', html: game.icon }), `${game.name} 怎么玩`),
    el('div', { html: game.rules }),
    ...rows,
    el('div', { class: 'acts' }, el('button', { class: 'btn pri', onclick: closeModal }, '知道了'))));
}

// ---------- 路由与全局键 ----------
function route() {
  closeModal();
  const id = location.hash.slice(1).split(/[/?]/)[0];
  if (BY_ID[id]) {
    openGame(id);
    if (!store.get(`${V}:seen:${id}`, false)) { store.set(`${V}:seen:${id}`, true); setTimeout(() => showRules(BY_ID[id]), 400); }
  } else { closeGame(); renderHub(); }
}
addEventListener('hashchange', route);
addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalEl) { closeModal(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && S?.ctl && !S.done && !modalEl) { e.preventDefault(); S.ctl.undo(); }
});
route();
