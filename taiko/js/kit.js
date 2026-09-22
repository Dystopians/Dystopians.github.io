// 六个技能小游戏共用的部件
import { el } from './lib.js';

// 原作的时间公式里都带角色能力值；这里统一按五项能力都是 60 计算
export const STAT = 60;
// 原作难度 = 技能等级 0–4（★ 视同 4）
export const LEVELS = [
  { id: '0', label: '見習' }, { id: '1', label: '初級' }, { id: '2', label: '中級' },
  { id: '3', label: '上級' }, { id: '4', label: '極意' },
];

// 倒计时：切到后台自动暂停，回来继续
export function countdown(seconds, { onTick, onEnd } = {}) {
  let left = seconds * 1000, last = null, raf = 0, running = false, dead = false;
  const frame = t => {
    if (!running || dead) return;
    if (last != null) left -= t - last;
    last = t;
    if (left <= 0) { left = 0; running = false; onTick && onTick(0, seconds); onEnd && onEnd(); return; }
    onTick && onTick(left / 1000, seconds);
    raf = requestAnimationFrame(frame);
  };
  const vis = () => { if (document.hidden) api.pause(); else if (api._auto) api.resume(); };
  document.addEventListener('visibilitychange', vis);
  const api = {
    total: seconds, _auto: false,
    start() { if (dead) return; running = true; api._auto = true; last = null; raf = requestAnimationFrame(frame); },
    pause() { running = false; last = null; cancelAnimationFrame(raf); },
    resume() { if (dead || running || left <= 0) return; running = true; last = null; raf = requestAnimationFrame(frame); },
    hold(ms) { api.pause(); api._auto = false; setTimeout(() => { if (!dead) { api._auto = true; api.resume(); } }, ms); },
    stop() { dead = true; running = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); },
    left: () => left / 1000,
    get running() { return running; },
  };
  return api;
}

// 开场画面：大字标题 + 规则要点 + 开始按钮
export function intro(stage, { big, title, lines = [], button = '開始', onStart, extra }) {
  const box = el('div', { class: 'panel intro' },
    el('div', { class: 'big' }, big),
    title ? el('div', { class: 'intro-title' }, title) : null,
    el('ul', { class: 'intro-list' }, lines.map(l => el('li', { html: l }))),
    extra || null,
    el('div', { class: 'btns' }, el('button', { class: 'btn pri intro-go', onclick: () => { box.remove(); onStart(); } }, button)));
  stage.replaceChildren(box);
  setTimeout(() => box.querySelector('.btn.pri')?.focus(), 50);
  return box;
}

// 原作内部分数 81 以上显示「上出来」，80 以上能拿到技能卡
export function grade(score) {
  score = Math.max(0, Math.min(100, Math.round(score)));
  if (score >= 81) return { score, win: true, stamp: '上出来', title: '上出来！', note: '达到原作「上出来」标准（81 分以上）' };
  if (score >= 60) return { score, win: true, stamp: '及第', title: '及第', note: '合格，但离「上出来」还差一点' };
  return { score, win: false, stamp: '未熟', title: '修行不足', note: '再接再厉' };
}

// 计时条
export function timeBar() {
  const fill = el('i');
  const txt = el('b', null, '');
  const bar = el('div', { class: 'tbar' }, el('div', { class: 'bar' }, fill), txt);
  return {
    el: bar,
    set(left, total) {
      fill.style.width = `${Math.max(0, (left / total) * 100)}%`;
      fill.classList.toggle('low', left / total < 0.25);
      txt.textContent = `${Math.ceil(left)}″`;
    },
  };
}

export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
