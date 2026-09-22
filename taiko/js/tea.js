// 茶道 · 茶器並べ：桐箱打开展示一串茶器，合上后按顺序摆出来。共 5 局
import { el } from './lib.js';
import { LEVELS, STAT, grade, intro, rint } from './kit.js';

// 原作的六种茶器颜色，游戏内提示的记法是取首音：あ・ちゃ・く・き・し・み
const WARES = [
  { id: 'ao', k: '青', name: '青', c: '#3b6db3', hi: '#7fa6de' },
  { id: 'cha', k: '茶', name: '茶', c: '#8a5a34', hi: '#c08a5c' },
  { id: 'kuro', k: '黒', name: '黒', c: '#2b2623', hi: '#6a605a' },
  { id: 'ki', k: '黄', name: '黄', c: '#d6a52c', hi: '#f2d27a' },
  { id: 'shiro', k: '白', name: '白', c: '#efe9dc', hi: '#ffffff', edge: '#b8ab94' },
  { id: 'midori', k: '緑', name: '緑', c: '#4d8a4a', hi: '#8cc088' },
];
const PALETTE_ORDER = ['cha', 'shiro', 'ao', 'midori', 'kuro', 'ki']; // 原作红布上从左到右的顺序
const BY = Object.fromEntries(WARES.map(w => [w.id, w]));
const ROUNDS = 5;
const RN = ['一', '二', '三', '四', '五'];
const PRAISE = { '◎': 'お見事', '○': '惜しい', '△': '精進を', '×': '修行が足りぬ' };

// 茶碗：碗身 + 高台 + 釉面高光
function bowl(w, size = 44) {
  const edge = w.edge || 'rgba(0,0,0,.25)';
  return `<svg viewBox="0 0 48 40" width="${size}" height="${size * 40 / 48}" aria-hidden="true">
    <ellipse cx="24" cy="36" rx="9" ry="2.6" fill="rgba(0,0,0,.18)"/>
    <path d="M16 32h16l-1.2 4H17.2z" fill="${w.c}" stroke="${edge}" stroke-width=".8"/>
    <path d="M5 11h38c0 13-7.5 21.5-19 21.5S5 24 5 11z" fill="${w.c}" stroke="${edge}" stroke-width=".9"/>
    <ellipse cx="24" cy="11" rx="19" ry="4.2" fill="${w.hi}" stroke="${edge}" stroke-width=".9"/>
    <ellipse cx="24" cy="11.4" rx="15.5" ry="2.8" fill="${w.c}" opacity=".55"/>
    <path d="M10 16c1 6 4 10 8 12" stroke="${w.hi}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>
  </svg>`;
}

function mount(stage, ctx) {
  const L = +ctx.level, n = 3 + L;
  const showMs = (0.9 + n * 0.5 + STAT / 100) * 1000; // 原作：魅力越高，箱子开得越久
  let round = 0, total = 0, marks = [], seq = [], answer = [], phase = 'idle', timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const tracker = el('div', { class: 'tea-track' }, RN.map((r, i) => el('div', { class: 'tea-r' }, el('span', null, r), el('b', null, ''))));
  const boxes = el('div', { class: 'tea-boxes', style: { '--n': n } });
  const slots = el('div', { class: 'tea-slots' });
  const cloth = el('div', { class: 'tea-cloth' });
  const msg = el('div', { class: 'msg' });
  const fix = el('button', { class: 'btn', disabled: true }, '訂正');
  const ok = el('button', { class: 'btn pri', disabled: true }, '決定');
  const next = el('button', { class: 'btn pri hidden' }, '次の局へ');
  const panel = el('div', { class: 'panel tea' }, tracker, boxes, el('div', { class: 'tea-label' }, '答え'), slots, cloth, msg,
    el('div', { class: 'btns' }, fix, ok, next));

  for (const id of PALETTE_ORDER) {
    const w = BY[id];
    cloth.append(el('button', { class: 'tea-ware', 'data-id': id, 'aria-label': w.k, html: `${bowl(w, 40)}<span>${w.k}</span>` }));
  }

  function drawBoxes(open, show) {
    boxes.replaceChildren(...seq.map((id, i) => el('div', { class: 'tea-box' + (open ? ' open' : '') },
      el('div', { class: 'tea-inside', html: show ? bowl(BY[id], 38) : '' }),
      el('div', { class: 'tea-lid' }))));
  }
  function drawSlots(result) {
    slots.replaceChildren(...Array.from({ length: 7 }, (_, i) => {
      const on = i < n, id = answer[i];
      const s = el('button', { class: 'tea-slot' + (on ? '' : ' off') + (result ? (id === seq[i] ? ' good' : ' bad') : ''), disabled: !on || phase !== 'answer' || !id, 'data-i': i,
        html: id ? bowl(BY[id], 34) : '' });
      return s;
    }));
    fix.disabled = phase !== 'answer' || !answer.length;
    ok.disabled = phase !== 'answer' || answer.filter(Boolean).length < n;
    cloth.querySelectorAll('button').forEach(b => (b.disabled = phase !== 'answer'));
  }

  function startRound() {
    round++;
    seq = Array.from({ length: n }, () => WARES[rint(0, WARES.length - 1)].id); // 原作允许同一颜色重复出现
    answer = [];
    phase = 'show';
    next.classList.add('hidden'); fix.classList.remove('hidden'); ok.classList.remove('hidden');
    drawBoxes(false, true); drawSlots();
    msg.textContent = `第${RN[round - 1]}局 · 看好了`;
    later(() => drawBoxes(true, true), 450);
    later(() => { drawBoxes(false, true); msg.textContent = '按刚才的顺序摆好茶器'; }, 450 + showMs);
    later(() => { phase = 'answer'; drawBoxes(false, false); drawSlots(); }, 450 + showMs + 380);
  }
  function put(id) {
    if (phase !== 'answer') return;
    const i = answer.findIndex((x, k) => k < n && !x);
    const at = i >= 0 ? i : answer.length;
    if (at >= n) return;
    answer[at] = id; drawSlots();
  }
  function score() {
    const wrong = seq.filter((id, i) => answer[i] !== id).length, right = n - wrong;
    // 原作判定：◎ 全对 20；○ 错 1 个（见習~中級）或错 1~2 个且不超过三分之一（上級·極意）12；△ 至少对 1 个 8；× 全错 0
    const okOne = L <= 2 ? wrong === 1 : wrong >= 1 && wrong <= 2 && wrong <= n / 3;
    if (wrong === 0) return ['◎', 20];
    if (okOne) return ['○', 12];
    if (right >= 1) return ['△', 8];
    return ['×', 0];
  }
  function submit() {
    if (phase !== 'answer' || answer.filter(Boolean).length < n) return;
    phase = 'result';
    const [mark, pts] = score();
    total += pts; marks.push(mark);
    tracker.children[round - 1].lastChild.textContent = mark;
    tracker.children[round - 1].classList.add('m' + ['◎', '○', '△', '×'].indexOf(mark));
    drawBoxes(true, true); drawSlots(true);
    msg.innerHTML = `<b class="tea-mark">${mark}</b> ${PRAISE[mark]} · +${pts}`;
    fix.classList.add('hidden'); ok.classList.add('hidden');
    if (round < ROUNDS) { next.classList.remove('hidden'); next.focus(); }
    else later(end, 900);
  }
  function end() {
    phase = 'done';
    const g = grade(total);
    ctx.finish({ ...g, detail: `五局 ${marks.join(' ')} · 合计 <b>${g.score}</b> 分<br>${g.note}` });
  }

  cloth.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) put(b.dataset.id); });
  slots.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (!b || phase !== 'answer') return;
    answer[+b.dataset.i] = undefined; drawSlots(); // 点已摆的茶器可以拿掉
  });
  fix.onclick = () => {
    if (phase !== 'answer') return;
    for (let i = n - 1; i >= 0; i--) if (answer[i]) { answer[i] = undefined; break; }
    drawSlots();
  };
  ok.onclick = submit;
  next.onclick = startRound;
  const onKey = e => {
    if (phase === 'answer') {
      const k = +e.key;
      if (k >= 1 && k <= 6) { put(PALETTE_ORDER[k - 1]); e.preventDefault(); }
      else if (e.key === 'Backspace') { fix.onclick(); e.preventDefault(); }
      else if (e.key === 'Enter') { submit(); e.preventDefault(); }
    } else if (phase === 'result' && e.key === 'Enter' && round < ROUNDS) { startRound(); e.preventDefault(); }
  };
  addEventListener('keydown', onKey);

  intro(stage, {
    big: '茶器並べ', title: `${n} 件茶器 · 五局`,
    lines: ['桐箱会打开片刻，记住里面茶器的<b>颜色和顺序</b>。', '箱子合上后，从下方红布上依次挑出同样的茶器。', '回答不限时，可以用「訂正」改；键盘 1–6 选茶器。'],
    onStart() { stage.replaceChildren(panel); startRound(); },
  });
  return { destroy() { timers.forEach(clearTimeout); removeEventListener('keydown', onKey); } };
}

export default {
  id: 'tea', kanji: '茶', name: '茶道', jp: '茶器並べ', skill: '茶道', color: '#3f6b4a',
  tagline: '记住桐箱里茶器的顺序，照样摆出来', levels: LEVELS, mount,
  rules: `<ul>
    <li>桐箱会打开片刻，展示一排茶器（见習 3 件，每升一级多 1 件，極意 7 件）。同一种颜色可能出现不止一次。</li>
    <li>箱子合上后，从红布上按顺序挑出同样的茶器，按「決定」。回答不限时，可以「訂正」。</li>
    <li>每局判定：<b>◎</b> 全对 20 分；<b>○</b> 错 1 件（上級起错 1–2 件且不超过三分之一）12 分；<b>△</b> 至少对 1 件 8 分；<b>×</b> 全错 0 分。</li>
    <li>共五局，满分 100；<b>81 分以上为「上出来」</b>。</li>
  </ul><p class="tip">原作里给的记法：六种颜色取首音「あ・ちゃ・く・き・し・み」——青、茶、黒、黄、白、緑。</p>`,
};
