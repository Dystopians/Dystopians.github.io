// 弁舌 · 数即断：上面是对方的牌，下面是自己的牌，限时判断哪边的和大（或一样大）。共 7 问
import { el } from './lib.js';
import { LEVELS, STAT, grade, intro, rint } from './kit.js';

// 原作：每排 3~7 张，数值范围随等级扩大，低级只有 1~4，最高 1~9
const CFG = [
  { cards: 3, max: 4 }, { cards: 4, max: 5 }, { cards: 5, max: 6 }, { cards: 6, max: 8 }, { cards: 7, max: 9 },
];
const QUESTIONS = 7;
const BEADS = 12;

// 造一排和为 target 的牌：先随机，再逐张微调到目标和
function rowWithSum(n, max, target) {
  if (target < n || target > n * max) return null;
  const row = Array.from({ length: n }, () => rint(1, max));
  let s = row.reduce((a, b) => a + b, 0);
  for (let guard = 0; s !== target && guard < 500; guard++) {
    const i = rint(0, n - 1);
    if (s < target && row[i] < max) { row[i]++; s++; }
    else if (s > target && row[i] > 1) { row[i]--; s--; }
  }
  return s === target ? row : null;
}
function makeQuestion(L) {
  const { cards, max } = CFG[L];
  for (;;) {
    const mine = Array.from({ length: cards }, () => rint(1, max));
    const s = mine.reduce((a, b) => a + b, 0);
    // 两边的和故意靠得很近才有看头；约 14% 的题两边相等（原作里相等很少见但会出现）
    const r = Math.random();
    const d = r < 0.14 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (r < 0.6 ? rint(1, 2) : rint(3, Math.max(3, cards)));
    const theirs = rowWithSum(cards, max, s + d);
    if (theirs) return { mine, theirs, a: s, b: s + d };
  }
}

function mount(stage, ctx) {
  const L = +ctx.level, { cards } = CFG[L];
  const perQ = 4 + cards * 0.9 + (STAT + STAT) / 40; // 原作：知谋+魅力越高，时间越长
  let qi = 0, correct = 0, q = null, phase = 'idle', left = perQ, raf = 0, last = 0, marks = [], timers = [];

  const head = el('div', { class: 'db-head' }, el('span', { class: 'db-no' }, ''), el('div', { class: 'db-marks' }));
  const theirRow = el('div', { class: 'db-row db-them' });
  const beads = el('div', { class: 'db-beads' }, Array.from({ length: BEADS }, () => el('i')));
  const myRow = el('div', { class: 'db-row db-me' });
  const verdict = el('div', { class: 'db-verdict' });
  const mk = (v, jp, cn, key) => el('button', { class: 'btn db-ans', 'data-v': v, title: key }, el('b', null, jp), el('small', null, cn));
  const answers = el('div', { class: 'db-answers' }, mk(1, '相手が大', '对方大', '←'), mk(0, '同じ', '一样大', '↓'), mk(-1, '自分が大', '我方大', '→'));
  const panel = el('div', { class: 'panel db' }, head, el('div', { class: 'db-who' }, '相 手'), theirRow, beads, myRow, el('div', { class: 'db-who' }, '自 分'), verdict, answers);

  const card = (v, side) => el('div', { class: `db-card ${side}` }, el('span', null, String(v)));
  function tick(t) {
    if (phase !== 'ask') return;
    if (last) left -= Math.min(t - last, 100) / 1000; // 切到后台时动画帧会停，回来别一下子扣掉整段时间
    last = t;
    const on = Math.max(0, Math.ceil((left / perQ) * BEADS));
    [...beads.children].forEach((b, i) => b.classList.toggle('off', i >= on));
    beads.classList.toggle('low', left / perQ < 0.3);
    if (left <= 0) { resolve(null); return; }
    raf = requestAnimationFrame(tick);
  }
  function ask() {
    q = makeQuestion(L);
    qi++;
    head.firstChild.textContent = `${String(qi).padStart(2, '0')}/${String(QUESTIONS).padStart(2, '0')}問`;
    theirRow.replaceChildren(...q.theirs.map(v => card(v, 'them')));
    myRow.replaceChildren(...q.mine.map(v => card(v, 'me')));
    verdict.textContent = ''; verdict.className = 'db-verdict';
    answers.querySelectorAll('button').forEach(b => { b.disabled = false; b.classList.remove('picked', 'right'); });
    left = perQ; last = 0; phase = 'ask';
    raf = requestAnimationFrame(tick);
  }
  function resolve(v) {
    if (phase !== 'ask') return;
    phase = 'judge'; cancelAnimationFrame(raf);
    const truth = Math.sign(q.b - q.a); // 1 对方大，0 相同，-1 我方大
    const good = v === truth;
    if (good) correct++;
    marks.push(v == null ? '·' : good ? '○' : '×');
    head.lastChild.replaceChildren(...marks.map(m => el('i', { class: m === '○' ? 'ok' : m === '×' ? 'ng' : 'to' }, m)));
    answers.querySelectorAll('button').forEach(b => {
      b.disabled = true;
      if (+b.dataset.v === truth) b.classList.add('right');
      if (v != null && +b.dataset.v === v && !good) b.classList.add('picked');
    });
    verdict.className = 'db-verdict ' + (good ? 'ok' : 'ng');
    verdict.innerHTML = `${v == null ? '時間切れ' : good ? '正解！' : '不正解'}　<span>相手 ${q.b} ・ 自分 ${q.a}</span>`;
    timers.push(setTimeout(() => (qi < QUESTIONS ? ask() : end()), good ? 850 : 1500));
  }
  function end() {
    phase = 'done';
    const g = grade((correct / QUESTIONS) * 100);
    const perfect = correct === QUESTIONS;
    ctx.finish({ ...g, win: correct >= 5, stamp: perfect ? '完勝' : correct >= 5 ? '論破' : '敗北', title: perfect ? '完全勝利！' : correct >= 5 ? '辩赢了' : '被说服了',
      detail: `${QUESTIONS} 问答对 <b>${correct}</b> 问　${marks.join(' ')}` });
  }

  answers.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) resolve(+b.dataset.v); });
  const onKey = e => {
    if (phase !== 'ask') return;
    const map = { ArrowLeft: 1, 1: 1, a: 1, ArrowDown: 0, 2: 0, s: 0, ' ': 0, ArrowRight: -1, 3: -1, d: -1 };
    if (e.key in map) { e.preventDefault(); resolve(map[e.key]); }
  };
  addEventListener('keydown', onKey);

  intro(stage, {
    big: '数即断', title: `每排 ${cards} 张 · 数字 1–${CFG[L].max} · 共 ${QUESTIONS} 问`,
    lines: ['上排是<b>对方</b>的牌，下排是<b>自己</b>的牌。', '在珠子走完之前，判断哪一边的<b>总和</b>更大，或者一样大。', '键盘：← 对方大、↓ 一样大、→ 我方大。'],
    onStart() { stage.replaceChildren(panel); ask(); },
  });
  return { destroy() { phase = 'done'; cancelAnimationFrame(raf); timers.forEach(clearTimeout); removeEventListener('keydown', onKey); } };
}

export default {
  id: 'debate', kanji: '弁', name: '比大小', jp: '数即断', skill: '弁舌（辩才）', color: '#2c4a73',
  tagline: '两排数字牌，瞬间判断谁的总和大', levels: LEVELS, mount, _test: { makeQuestion },
  rules: `<ul>
    <li>上排是对方的牌，下排是自己的牌，两排张数相同。</li>
    <li>中间的珠子是限时。在珠子走完之前，比较两排的<b>总和</b>，选「相手が大（对方大）」「同じ（一样大）」或「自分が大（我方大）」。</li>
    <li>见習每排 3 张、数字 1–4；每升一级多一张、数字范围变大，極意每排 7 张、数字 1–9。</li>
    <li>共 7 问。答对 5 问以上算辩赢，7 问全对是「完全勝利」。</li>
  </ul><p class="tip">两边一样的牌可以直接抵消，只比剩下的——这是算得快的诀窍。</p>`,
};
