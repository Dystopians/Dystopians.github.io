// 茶道 · 茶器並べ：桐箱打开展示一串茶器，合上后按顺序摆出来。共 5 局
import { el } from './lib.js';
import { LEVELS, STAT, grade, intro, rint } from './kit.js';

// 原作的六种茶器颜色，游戏内提示的记法是取首音：あ・ちゃ・く・き・し・み
// 每种颜色借一种名窑的釉色：青＝瑠璃釉、茶＝飴釉、黒＝黒楽、黄＝黄瀬戸、白＝志野、緑＝織部。主色要一眼认得出，装饰只点到为止
const WARES = [
  { id: 'ao', k: '青', top: '#6b9be0', bot: '#1d4a94', rim: '#8db5ec', in: ['#163a74', '#3c6fbe'] },
  { id: 'cha', k: '茶', top: '#c48548', bot: '#6a3a18', rim: '#d49a5e', in: ['#4e2a10', '#9a6030'] },
  { id: 'kuro', k: '黒', top: '#4a423d', bot: '#141110', rim: '#5a4e46', in: ['#0e0c0b', '#342d29'], raku: true },
  { id: 'ki', k: '黄', top: '#f0cf6a', bot: '#b88a22', rim: '#f6de8e', in: ['#9a741c', '#dcb24a'] },
  { id: 'shiro', k: '白', top: '#fbf7ee', bot: '#ddd1bb', rim: '#fffdf8', in: ['#cfc3ab', '#f3ede1'] },
  { id: 'midori', k: '緑', top: '#56a36a', bot: '#1f5a33', rim: '#7cc08e', in: ['#1a4a2a', '#3f8a55'], oribe: true },
];
const PALETTE_ORDER = ['cha', 'shiro', 'ao', 'midori', 'kuro', 'ki']; // 原作红布上从左到右的顺序
const BY = Object.fromEntries(WARES.map(w => [w.id, w]));
const ROUNDS = 5;
const RN = ['一', '二', '三', '四', '五'];
const PRAISE = { '◎': 'お見事', '○': '惜しい', '△': '精進を', '×': '修行が足りぬ' };

// ---------- 茶碗 ----------
// 渐变只定义一次，放在页面里一个隐藏的 <svg> 里，所有茶碗共用
function ensureDefs() {
  if (document.getElementById('tkg-defs')) return;
  const grads = WARES.map(w => `
    <linearGradient id="tkg-${w.id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w.top}"/><stop offset="1" stop-color="${w.bot}"/></linearGradient>
    <linearGradient id="tkg-${w.id}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w.rim}"/><stop offset="1" stop-color="${w.top}"/></linearGradient>
    <radialGradient id="tkg-${w.id}-i" cx=".5" cy=".75" r=".75"><stop offset="0" stop-color="${w.in[0]}"/><stop offset="1" stop-color="${w.in[1]}"/></radialGradient>`).join('');
  const defs = `<svg id="tkg-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${grads}
    <linearGradient id="tkg-clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b48a"/><stop offset="1" stop-color="#a47a50"/></linearGradient>
    <linearGradient id="tkg-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a322d"/><stop offset="1" stop-color="#1a1614"/></linearGradient>
    <radialGradient id="tkg-hi" cx=".3" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="tkg-std"><path d="M5 15C5 31 15 44 32 44S59 31 59 15z"/></clipPath>
  </defs></svg>`;
  document.body.insertAdjacentHTML('beforeend', defs);
}
function bowl(w, size = 48) {
  const id = w.id, raku = !!w.raku;
  // 楽茶碗口沿直一些、身子高一些；其余是标准的碗形
  const ry = raku ? 12 : 15, rx = raku ? 24 : 27;
  const body = raku ? 'M8 12C7 29 13 44 32 44S57 29 56 12z' : 'M5 15C5 31 15 44 32 44S59 31 59 15z';
  let deco = '';
  if (id === 'cha') deco = '<g stroke="#4a2410" stroke-opacity=".28" stroke-width="1.4" stroke-linecap="round"><path d="M17 24l2 12M26 22l1 15M38 22l-1 15M47 24l-2 12"/></g>'; // 飴釉的流纹
  if (id === 'ki') deco = '<path d="M9 25q23 6 46 0" stroke="#8a6414" stroke-opacity=".45" stroke-width="1" fill="none"/><circle cx="22" cy="31" r="2.6" fill="#5f9a52" opacity=".85"/><circle cx="41" cy="28" r="1.8" fill="#5f9a52" opacity=".7"/>'; // 线刻和胆矾绿斑
  if (id === 'shiro') deco = '<ellipse cx="22" cy="30" rx="6" ry="4" fill="#e89a72" opacity=".32"/><ellipse cx="43" cy="26" rx="4.5" ry="3" fill="#e89a72" opacity=".26"/><g fill="#b8a888" opacity=".5"><circle cx="30" cy="24" r=".7"/><circle cx="36" cy="32" r=".6"/><circle cx="16" cy="22" r=".6"/></g>'; // 志野的火色和针孔
  if (id === 'kuro') deco = '<path d="M14 18q3 14 12 22" stroke="#8a7462" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>'; // 黑乐的柔光
  if (w.oribe) deco = '<g clip-path="url(#tkg-std)"><path d="M41 10L64 10 64 50 33 50C38 40 37 24 41 10z" fill="#efe6cf"/><path d="M45 25q3.5-4 7 0M45 31q3.5-4 7 0" stroke="#6b4222" stroke-width="1.3" stroke-linecap="round" fill="none"/></g>'; // 织部：一侧施绿釉，另一侧白地上两笔铁绘
  const clay = raku ? '' : '<path d="M17 39.5C22 42.6 42 42.6 47 39.5C43.5 43 38.5 44 32 44S20.5 43 17 39.5z" fill="url(#tkg-clay)"/>'; // 碗底一圈露胎
  return `<svg viewBox="0 0 64 54" width="${size}" height="${Math.round(size * 54 / 64)}" aria-hidden="true">
    <ellipse cx="32" cy="50" rx="17" ry="3.2" fill="#000" opacity=".2"/>
    <path d="M24.5 43.6h15l-1.3 5.4H25.8z" fill="url(#tkg-${raku ? 'dark' : 'clay'})"/>
    <path d="${body}" fill="url(#tkg-${id}-b)"/>${deco}${clay}
    <path d="${body}" fill="url(#tkg-hi)"/>
    <ellipse cx="32" cy="${ry}" rx="${rx}" ry="6.2" fill="url(#tkg-${id}-r)"/>
    <ellipse cx="32" cy="${ry + 0.7}" rx="${rx - 3.4}" ry="4.4" fill="url(#tkg-${id}-i)"/>
    <path d="M${raku ? 12 : 10} ${ry + 6}c1.5 9 5.5 16 11.5 20" stroke="#fff" stroke-opacity=".5" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="${raku ? 15 : 13}" cy="${ry + 4}" r="1.3" fill="#fff" opacity=".7"/>
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

  ensureDefs();
  for (const id of PALETTE_ORDER) {
    const w = BY[id];
    cloth.append(el('button', { class: 'tea-ware', 'data-id': id, 'aria-label': w.k, html: `${bowl(w, 52)}<span>${w.k}</span>` }));
  }

  function drawBoxes(open, show) {
    boxes.replaceChildren(...seq.map((id, i) => el('div', { class: 'tea-box' + (open ? ' open' : '') },
      el('div', { class: 'tea-inside', html: show ? bowl(BY[id], 60) : '' }),
      el('div', { class: 'tea-lid' }, el('span', { class: 'tea-tag' }, '茶碗')))));
  }
  function drawSlots(result) {
    slots.replaceChildren(...Array.from({ length: 7 }, (_, i) => {
      const on = i < n, id = answer[i];
      const s = el('button', { class: 'tea-slot' + (on ? '' : ' off') + (result ? (id === seq[i] ? ' good' : ' bad') : ''), disabled: !on || phase !== 'answer' || !id, 'data-i': i,
        html: id ? bowl(BY[id], 56) : '' });
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
