// 太阁立志传 V · 技能小游戏 —— 外壳：大厅、难度、玩法、结算、战绩
import { store, el, ICON } from './lib.js';
import medicine from './medicine.js';
import debate from './debate.js';
import repair from './repair.js';
import tactics from './tactics.js';
import tea from './tea.js';
import ninja from './ninja.js';

const GAMES = [medicine, debate, repair, tactics, tea, ninja];
const BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]));
const V = 'tk1';
const app = document.getElementById('app');
const onSite = /^https?:$/.test(location.protocol) && location.hostname && !/^(localhost|127\.)/.test(location.hostname);

// 主题
let theme = store.get(`${V}:theme`, 'auto');
const mq = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => { document.documentElement.dataset.theme = theme === 'dark' || (theme === 'auto' && mq.matches) ? 'dark' : 'light'; };
mq.addEventListener('change', applyTheme); applyTheme();
const cycleTheme = () => { theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; store.set(`${V}:theme`, theme); applyTheme(); };

// 战绩
const recOf = id => store.get(`${V}:rec:${id}`, { plays: 0, wins: 0, best: {} });
function saveResult(game, level, res) {
  const r = recOf(game.id);
  r.plays++; if (res.win) r.wins++;
  const prev = r.best[level];
  const better = res.score != null && (prev == null || (game.lowerIsBetter ? res.score < prev : res.score > prev));
  if (better) r.best[level] = res.score;
  store.set(`${V}:rec:${game.id}`, r);
  return { rec: r, better: better && prev != null };
}

// 小组件
let toastEl, toastT;
function toast(msg, ms = 2200) {
  if (!toastEl) { toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
}
let modalEl = null;
function modal(content) {
  closeModal();
  modalEl = el('div', { class: 'mask', onclick: e => { if (e.target === modalEl) closeModal(); } }, el('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true' }, content));
  document.body.append(modalEl);
  setTimeout(() => (modalEl?.querySelector('.btn.pri') || modalEl?.querySelector('button'))?.focus(), 30);
}
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
function topbar() {
  return el('header', { class: 'top' },
    onSite ? el('a', { class: 'home-link', href: '/' }, '← 主站') : null,
    el('a', { class: 'brand', href: '#' }, '太阁立志传 V', el('small', null, '技能小游戏')),
    el('button', { class: 'ib', title: '切换深色/浅色', 'aria-label': '切换深色/浅色', html: ICON.theme, onclick: cycleTheme }));
}

// 大厅
function renderHub() {
  document.title = '太阁立志传 V · 技能小游戏';
  const cards = GAMES.map(g => {
    const r = recOf(g.id);
    return el('a', { class: 'scroll', href: `#${g.id}`, style: { '--c': g.color } },
      el('div', { class: 'kanji' }, g.kanji),
      el('div', null,
        el('h2', null, g.name, el('small', null, g.jp)),
        el('p', null, g.tagline),
        el('div', { class: 'rec', html: r.plays ? `已玩 ${r.plays} 局 · 胜 <b>${r.wins}</b>` : '尚未挑战' })));
  });
  app.replaceChildren(topbar(), el('main', { class: 'hub' },
    el('div', { class: 'hub-head' },
      el('div', { class: 'kicker' }, 'TAIKŌ RISSHIDEN V'),
      el('h1', null, '技能修行'),
      el('p', null, '复刻《太阁立志传 V》里修炼技能时的六个小游戏。')),
    el('div', { class: 'scrolls' }, cards),
    el('p', { class: 'hub-foot' }, '同人复刻，玩法参照原作。原作 © KOEI TECMO GAMES。', el('br'), '忍术的人物头像是公有领域的历史画像（Wikimedia Commons）。')));
  window.scrollTo(0, 0);
}

// 游戏页
let cur = null;
function openGame(id, level) {
  closeGame();
  const g = BY_ID[id];
  document.title = `${g.name} · 太阁立志传 V`;
  level = level || store.get(`${V}:lv:${id}`, g.levels[0].id);
  if (!g.levels.some(l => l.id === level)) level = g.levels[0].id;
  const stage = el('div', { class: 'stage', style: { '--c': g.color } });
  const levels = el('div', { class: 'levels' }, g.levels.map(l => el('button', { class: 'lv' + (l.id === level ? ' on' : ''), style: { '--c': g.color }, 'data-l': l.id }, l.label)));
  levels.addEventListener('click', e => {
    const b = e.target.closest('[data-l]');
    if (!b || b.dataset.l === level) return;
    store.set(`${V}:lv:${id}`, b.dataset.l);
    openGame(id, b.dataset.l);
  });
  app.replaceChildren(topbar(), el('main', { class: 'game', style: { '--c': g.color } },
    el('div', { class: 'g-head' },
      el('a', { class: 'ib', href: '#', title: '返回', 'aria-label': '返回全部小游戏', html: ICON.back }),
      el('div', { class: 'kanji', style: { '--c': g.color } }, g.kanji),
      el('div', null, el('h1', null, g.name, el('small', null, g.jp)), el('div', { class: 'meta' }, `技能：${g.skill}`)),
      el('div', { class: 'sp' }, el('button', { class: 'ib', title: '玩法', 'aria-label': '玩法说明', html: ICON.help, onclick: () => showRules(g) }))),
    levels, stage));
  window.scrollTo(0, 0);
  const lvLabel = g.levels.find(l => l.id === level).label;
  cur = { g, level };
  const ctx = {
    level, levelLabel: lvLabel, toast,
    finish(res) {
      if (!cur || cur.g !== g) return;
      const { rec, better } = saveResult(g, level, res);
      setTimeout(() => showResult(g, level, res, rec, better), res.delay ?? 500);
    },
  };
  cur.ctl = g.mount(stage, ctx);
  if (!store.get(`${V}:seen:${id}`, false)) { store.set(`${V}:seen:${id}`, true); setTimeout(() => showRules(g), 350); }
}
function closeGame() { if (cur) { cur.ctl?.destroy?.(); cur = null; } }

function showRules(g) {
  modal(el('div', null,
    el('h3', null, el('span', { class: 'seal', style: { background: g.color } }, g.kanji), `${g.name}（${g.jp}）`),
    el('div', { html: g.rules }),
    el('div', { class: 'acts' }, el('button', { class: 'btn pri', style: { background: g.color }, onclick: closeModal }, '明白了'))));
}
function showResult(g, level, res, rec, better) {
  modal(el('div', { class: 'result' },
    el('div', { class: 'stamp' + (res.win ? '' : ' lose') + ((res.stamp || '').length > 1 ? ' small' : ''), style: res.win ? { background: g.color } : null }, res.stamp || (res.win ? '勝' : '負')),
    el('h3', null, res.title || (res.win ? '修行成功' : '修行未成')),
    el('div', { class: 'sub', html: res.detail || '' }),
    better ? el('div', { class: 'sub', style: { color: 'var(--kin)', marginTop: '6px', fontWeight: 700 } }, '刷新了本难度的最佳成绩') : null,
    el('div', { class: 'sub', style: { marginTop: '10px' } }, `累计 ${rec.plays} 局 · 胜 ${rec.wins}`),
    el('div', { class: 'acts' },
      el('button', { class: 'btn', onclick: () => { closeModal(); location.hash = ''; } }, '返回'),
      el('button', { class: 'btn pri', style: { background: g.color }, onclick: () => { closeModal(); openGame(g.id, level); } }, '再来一局'))));
}

function route() {
  closeModal();
  const id = location.hash.slice(1).split(/[/?]/)[0];
  if (BY_ID[id]) openGame(id); else { closeGame(); renderHub(); }
}
addEventListener('hashchange', route);
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
route();
