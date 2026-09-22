// 軍学 · 四角陣崩し：带重力的四川省。颜色和数字都相同的两本兵书，能用拐弯不超过两次的线连起来就消掉
import { el, svg } from './lib.js';
import { LEVELS, STAT, grade, intro, countdown, timeBar, shuffle } from './kit.js';

// 原作各级的书数：30 / 36 / 42 / 56 / 64；种类数随能力变化，这里按等级给
const CFG = [
  { w: 6, h: 5, nums: 2 }, { w: 6, h: 6, nums: 2 }, { w: 7, h: 6, nums: 3 }, { w: 8, h: 7, nums: 3 }, { w: 8, h: 8, nums: 4 },
];
// 原作配色：足轻黄、骑马蓝、铁炮红、大筒绿，浅色书面 + 深色描边
const UNITS = [
  { k: '足軽', c: '#f3de8a', d: '#c9a23a' }, { k: '騎馬', c: '#7cc2e2', d: '#3a86b4' },
  { k: '鉄砲', c: '#ec7d85', d: '#bb414b' }, { k: '大筒', c: '#acdb8e', d: '#62a446' },
];
const NUMS = ['一', '二', '三', '四'];
const RING = 0.5; // 外圈（连线可以绕行的空位）画窄一点，把地方让给兵书
const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h11.5a2 2 0 0 1 2 2V19H7a2 2 0 0 0-2 2z" fill="#c9b27a" stroke="#6b5530" stroke-width="1.3"/><path d="M5 21a2 2 0 0 1 2-2h11.5v2.5H7A2 2 0 0 1 5 21z" fill="#f6efdc" stroke="#6b5530" stroke-width="1.1"/><rect x="11" y="6" width="4" height="8" fill="#fbf7ee" stroke="#6b5530" stroke-width=".8"/></svg>';

// ---------- 连线：0、1、2 个拐点（纯函数，方便单独测试） ----------
export function linker(grid, PW, PH) {
  const at = (x, y) => (x < 0 || y < 0 || x >= PW || y >= PH ? null : grid[y][x]);
  const clearH = (y, x1, x2) => { const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1]; for (let x = a + 1; x < b; x++) if (at(x, y)) return false; return true; };
  const clearV = (x, y1, y2) => { const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1]; for (let y = a + 1; y < b; y++) if (at(x, y)) return false; return true; };
  const empty = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH && !grid[y][x];
  return function link(a, b) {
    if (a.y === b.y && clearH(a.y, a.x, b.x)) return [a, b];
    if (a.x === b.x && clearV(a.x, a.y, b.y)) return [a, b];
    // 一个拐点
    if (empty(b.x, a.y) && clearH(a.y, a.x, b.x) && clearV(b.x, a.y, b.y)) return [a, { x: b.x, y: a.y }, b];
    if (empty(a.x, b.y) && clearV(a.x, a.y, b.y) && clearH(b.y, a.x, b.x)) return [a, { x: a.x, y: b.y }, b];
    // 两个拐点：找一条和 a、b 都直通的中转线
    for (let x = 0; x < PW; x++) {
      if (x === a.x || x === b.x || !empty(x, a.y) || !empty(x, b.y)) continue;
      if (clearH(a.y, a.x, x) && clearV(x, a.y, b.y) && clearH(b.y, x, b.x)) return [a, { x, y: a.y }, { x, y: b.y }, b];
    }
    for (let y = 0; y < PH; y++) {
      if (y === a.y || y === b.y || !empty(a.x, y) || !empty(b.x, y)) continue;
      if (clearV(a.x, a.y, y) && clearH(y, a.x, b.x) && clearV(b.x, y, b.y)) return [a, { x: a.x, y }, { x: b.x, y }, b];
    }
    return null;
  };
}

function mount(stage, ctx) {
  const L = +ctx.level, { w: W, h: H, nums } = CFG[L];
  const tiles = W * H, PW = W + 2, PH = H + 2; // 四周留一圈空格，连线可以从外面绕
  const total = tiles * 2 - L * 5 + (STAT + STAT) / 8; // 原作：书数×2 − 等级×5 + (统率+知谋)/8 秒
  let grid, cells, sel = null, phase = 'setup', timer = null, busy = false, removed = 0, idSeq = 0;

  function deal() {
    const types = [];
    for (let i = 0; i < tiles / 2; i++) { const t = i % (4 * nums); types.push(t, t); } // 每种都成对出现
    shuffle(types);
    grid = Array.from({ length: PH }, () => Array(PW).fill(null));
    let k = 0;
    for (let y = 1; y <= H; y++) for (let x = 1; x <= W; x++) grid[y][x] = { id: ++idSeq, t: types[k++] };
  }
  const link = (a, b) => linker(grid, PW, PH)(a, b);
  function anyMove() {
    const list = [];
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (grid[y][x]) list.push({ x, y, t: grid[y][x].t });
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (list[i].t === list[j].t && link(list[i], list[j])) return [list[i], list[j]];
    return null;
  }
  function gravity() { // 上面的书往下掉；列不左右挪
    for (let x = 1; x <= W; x++) {
      const col = [];
      for (let y = H; y >= 1; y--) if (grid[y][x]) col.push(grid[y][x]);
      for (let y = H, k = 0; y >= 1; y--, k++) grid[y][x] = col[k] || null;
    }
  }

  // ---------- 界面 ----------
  const bar = timeBar();
  const counter = el('b', null, '');
  const hud = el('div', { class: 'hud sq-hud' }, el('span', { class: 'sq-count' }, el('i', { html: BOOK }), counter, el('small', null, ` / ${tiles} 冊`)));
  // 左边「軍学」栏：四种兵书，下面的数字条里没用到的灰掉（原作画面）
  const side = el('aside', { class: 'sq-side' }, el('div', { class: 'sq-side-t' }, '軍学'),
    el('div', { class: 'sq-books' }, UNITS.map(u => el('div', { class: 'sq-book', style: { '--u': u.c, '--ud': u.d } },
      el('div', { class: 'sq-cover' }, el('span', { class: 'sq-title' }, u.k)),
      el('div', { class: 'sq-strip' }, NUMS.map((nm, i) => el('i', { class: i < nums ? 'on' : '' }, nm)))))));
  const BW = W + 2 * RING, BH = H + 2 * RING;
  const board = el('div', { class: 'sq-board', style: { '--bw': BW, '--bh': BH } });
  const art = svg('svg', { class: 'sq-art', viewBox: `0 0 ${BW} ${BH}`, preserveAspectRatio: 'none' });
  const ask = el('div', { class: 'sq-ask' }, 'この並びで始めるかな？');
  board.append(art, ask);
  const msg = el('div', { class: 'msg' });
  const again = el('button', { class: 'btn' }, '並べ直す');
  const go = el('button', { class: 'btn pri' }, 'この並びで始める');
  const quit = el('button', { class: 'btn hidden' }, '終了');
  const panel = el('div', { class: 'panel sq' }, bar.el, hud, el('div', { class: 'sq-main' }, side, board), msg, el('div', { class: 'btns' }, again, go, quit));
  // 格子坐标 → 棋盘上的位置（外圈只有半格宽）
  const cx = x => (x === 0 ? RING / 2 : x === PW - 1 ? RING + W + RING / 2 : RING + x - 0.5);
  const cy = y => (y === 0 ? RING / 2 : y === PH - 1 ? RING + H + RING / 2 : RING + y - 0.5);
  const nodes = new Map(); // id -> element（保留元素，重力下落时才有动画）

  function render() {
    const alive = new Set();
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const t = grid[y][x];
      if (!t) continue;
      alive.add(t.id);
      let n = nodes.get(t.id);
      if (!n) {
        const u = UNITS[t.t % 4];
        n = el('button', { class: 'sq-tile', style: { '--u': u.c, '--ud': u.d }, 'aria-label': `${u.k}${NUMS[(t.t / 4) | 0]}` },
          el('span', { class: 'sq-num' }, NUMS[(t.t / 4) | 0]));
        n.dataset.id = t.id;
        nodes.set(t.id, n); board.append(n);
      }
      n.style.left = `${((cx(x) - 0.5) / BW) * 100}%`; n.style.top = `${((cy(y) - 0.5) / BH) * 100}%`;
      n.dataset.x = x; n.dataset.y = y;
      n.classList.toggle('sel', !!sel && sel.x === x && sel.y === y);
    }
    for (const [id, n] of nodes) if (!alive.has(id)) { n.remove(); nodes.delete(id); }
    counter.textContent = tiles - removed;
  }
  function drawLink(path) {
    const pts = path.map(p => `${cx(p.x)},${cy(p.y)}`).join(' ');
    art.replaceChildren(svg('polyline', { class: 'sq-line-bg', points: pts }), svg('polyline', { class: 'sq-line', points: pts }));
  }
  function tap(x, y) {
    if (phase !== 'play' || busy) return;
    const t = grid[y][x];
    if (!t) return;
    if (!sel) { sel = { x, y }; render(); return; }
    if (sel.x === x && sel.y === y) { sel = null; render(); return; }
    const a = sel, ta = grid[a.y][a.x];
    if (ta.t !== t.t) { sel = { x, y }; msg.textContent = '要颜色和数字都一样'; render(); return; }
    const path = link(a, { x, y });
    if (!path) { sel = { x, y }; msg.textContent = '连不过去（拐弯超过两次或被挡住）'; render(); return; }
    busy = true; msg.textContent = '';
    drawLink(path);
    nodes.get(ta.id)?.classList.add('gone'); nodes.get(t.id)?.classList.add('gone');
    setTimeout(() => {
      grid[a.y][a.x] = null; grid[y][x] = null; removed += 2; sel = null;
      art.replaceChildren(); gravity(); render(); busy = false;
      if (removed === tiles) return end(true);
      if (!anyMove()) { msg.textContent = '没有能消的了'; setTimeout(() => end(false), 700); }
    }, 260);
  }
  function end(all) {
    if (phase === 'done') return;
    phase = 'done'; timer?.stop();
    const left = timer ? timer.left() : 0;
    const score = all ? 80 + 20 * (left / total) : 80 * (removed / tiles);
    const g = grade(score);
    ctx.finish({ ...g, detail: `${all ? '全部消完' : `还剩 ${tiles - removed} 冊`} · <b>${g.score}</b> 分<br>${g.note}` });
  }

  board.addEventListener('click', e => { const b = e.target.closest('.sq-tile'); if (b) tap(+b.dataset.x, +b.dataset.y); });
  again.onclick = () => { if (phase !== 'setup') return; nodes.forEach(n => n.remove()); nodes.clear(); deal(); render(); };
  go.onclick = () => {
    if (phase !== 'setup') return;
    phase = 'play'; again.classList.add('hidden'); go.classList.add('hidden'); quit.classList.remove('hidden'); ask.remove();
    msg.textContent = '点两本一样的兵书';
    timer = countdown(total, { onTick: (l, t) => bar.set(l, t), onEnd: () => end(false) });
    timer.start();
  };
  quit.onclick = () => {
    if (phase !== 'play') return;
    timer.pause();
    if (confirm('就此结束？')) end(false); else timer.resume();
  };

  intro(stage, {
    big: '四角陣崩し', title: `${tiles} 冊 · 限时 ${Math.round(total)} 秒`,
    lines: ['兵书按兵种分四种颜色，各有数字。<b>颜色和数字都一样</b>的两本才能配对。', '两本之间要能用一条<b>拐弯不超过两次</b>的线连起来，线只能走空格（可以绕到外面）。', '消掉后上面的书会往下掉。开始前可以无限次「並べ直す」换一种排列。'],
    onStart() {
      stage.replaceChildren(panel); deal(); render(); bar.set(total, total);
      msg.textContent = '不满意可以一直「並べ直す」，开始后才计时';
    },
  });
  return { destroy() { phase = 'done'; timer?.stop(); } };
}

export default {
  id: 'tactics', kanji: '軍', name: '军学', jp: '四角陣崩し', skill: '軍学', color: '#6b4a2a',
  tagline: '带重力的四川省：连线消掉成对的兵书', levels: LEVELS, mount,
  rules: `<ul>
    <li>兵书有四个兵种颜色：足轻（黄）、骑马（蓝）、铁炮（红）、大筒（绿），上面写着数字。<b>颜色和数字都相同</b>的两本才能配对。</li>
    <li>两本书之间能用一条<b>拐弯不超过两次</b>的线连起来（线只能穿过空格，可以绕到兵书阵外面）就能消掉。</li>
    <li>消掉之后，上面的书会直接往下掉；已经清空的列不会合并。</li>
    <li>开始前可以无限次「並べ直す」重新排列，确认后才开始计时。限时 = 书数×2 − 等级×5 + (统率+知谋)÷8 秒。</li>
    <li>全部消完 80 分起，剩余时间越多分越高；中途卡死或时间到，按消掉的比例给分。</li>
  </ul><p class="tip">因为有重力，先消下面的书会让上面整列掉下来、打乱布局；通常从上层开始消更好控制。</p>`,
};
