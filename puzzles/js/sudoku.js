// Mini Sudoku：6×6，宫格是 2 行 × 3 列；每行、每列、每宫 1–6 各出现一次
import { range, el, svg, cellFromPoint, ICON } from './lib.js';

const N = 6, BR = 2, BC = 3;
const DIFFS = [
  { id: 'easy', label: '简单', minGiven: 18 },
  { id: 'medium', label: '中等', minGiven: 13 },
  { id: 'hard', label: '困难', minGiven: 0 },
];
const box = i => (((i / N) | 0) / BR | 0) * (N / BC) + ((i % N) / BC | 0);
const PEERS = range(N * N).map(i => range(N * N).filter(j => j !== i &&
  (((j / N) | 0) === ((i / N) | 0) || j % N === i % N || box(j) === box(i))));
const UNITS = [
  ...range(N).map(r => ({ cells: range(N).map(c => r * N + c), name: '行' })),
  ...range(N).map(c => ({ cells: range(N).map(r => r * N + c), name: '列' })),
  ...range(N).map(b => ({ cells: range(N * N).filter(i => box(i) === b), name: '宫' })),
];

function genSolution(R) {
  const g = new Int8Array(N * N);
  const bt = i => {
    if (i === N * N) return true;
    for (const v of R.shuffle([1, 2, 3, 4, 5, 6])) {
      if (PEERS[i].some(j => g[j] === v)) continue;
      g[i] = v; if (bt(i + 1)) return true; g[i] = 0;
    }
    return false;
  };
  bt(0);
  return g;
}

function cands(g, i) {
  if (g[i]) return [];
  const used = new Set(PEERS[i].map(j => g[j]));
  return [1, 2, 3, 4, 5, 6].filter(v => !used.has(v));
}
// 唯余法 + 摒除法：6×6 靠这两招就能解开的题，人做起来才顺
function step(g) {
  for (let i = 0; i < N * N; i++) if (!g[i]) {
    const c = cands(g, i);
    if (c.length === 0) return { contra: true };
    if (c.length === 1) return { i, v: c[0], why: `这一格所在的行、列、宫已经用掉了其他数字，只能填 ${c[0]}` };
  }
  for (const U of UNITS) for (let v = 1; v <= N; v++) {
    if (U.cells.some(i => g[i] === v)) continue;
    const spots = U.cells.filter(i => !g[i] && cands(g, i).includes(v));
    if (spots.length === 0) return { contra: true };
    if (spots.length === 1) return { i: spots[0], v, why: `这一${U.name}里 ${v} 只能放在这一格` };
  }
  return null;
}
function logicSolve(given) {
  const g = Int8Array.from(given);
  for (let guard = 0; guard < 64; guard++) {
    const st = step(g);
    if (!st) break;
    if (st.contra) return null;
    g[st.i] = st.v;
  }
  return g.includes(0) ? null : g;
}

function generate(R, diffId) {
  const D = DIFFS.find(d => d.id === diffId) || DIFFS[1];
  const sol = genSolution(R), given = Int8Array.from(sol);
  let left = N * N;
  // 中心对称地成对挖空，盘面更好看
  for (const i of R.shuffle(range(N * N / 2))) {
    const j = N * N - 1 - i;
    if (left - 2 < D.minGiven) break;
    const a = given[i], b = given[j];
    given[i] = 0; given[j] = 0;
    if (logicSolve(given)) left -= 2; else { given[i] = a; given[j] = b; }
  }
  return { n: N, givens: range(N * N).filter(i => given[i]).map(i => [i, given[i]]), solution: Array.from(sol) };
}

function conflicts(g) {
  const bad = new Set();
  for (let i = 0; i < N * N; i++) if (g[i]) for (const j of PEERS[i]) if (g[j] === g[i]) { bad.add(i); bad.add(j); }
  return bad;
}

function mount(host, p, saved, ctx) {
  const locked = new Uint8Array(N * N), base = new Int8Array(N * N);
  p.givens.forEach(([i, v]) => { locked[i] = 1; base[i] = v; });
  let g = saved && saved.g && saved.g.length === N * N ? Int8Array.from(saved.g) : Int8Array.from(base);
  let notes = saved && saved.notes ? saved.notes.map(x => new Set(x)) : range(N * N).map(() => new Set());
  p.givens.forEach(([i, v]) => (g[i] = v));
  let sel = saved && saved.sel != null ? saved.sel : -1, noteMode = false, flash = new Set();
  const hist = [];
  const snap = () => ({ g: Int8Array.from(g), notes: notes.map(s => new Set(s)) });

  const board = el('div', { class: 'board s-board', style: { '--n': N }, tabindex: 0, role: 'grid', 'aria-label': 'Mini Sudoku 6×6' });
  const cells = range(N * N).map(i => el('div', { class: 's-cell' + (locked[i] ? ' locked' : ''), role: 'gridcell' }));
  // 宫线用 SVG 叠在上面画，粗细不受格子间隙影响
  const lines = svg('svg', { class: 's-lines', viewBox: `0 0 ${N} ${N}`, preserveAspectRatio: 'none' },
    svg('path', { d: `M${BC} 0V${N}M0 ${BR}H${N}M0 ${BR * 2}H${N}` }),
    svg('rect', { x: 0, y: 0, width: N, height: N, rx: 0.2 }));
  board.append(el('div', { class: 'grid' }, cells), lines);
  const noteBtn = el('button', { class: 'pad-key pad-note', type: 'button', title: '笔记模式（N）', html: `${ICON.pencil}<span>笔记</span>` });
  const pad = el('div', { class: 's-pad' },
    ...[1, 2, 3, 4, 5, 6].map(v => el('button', { class: 'pad-key', type: 'button', 'data-v': v }, String(v))),
    el('button', { class: 'pad-key', type: 'button', 'data-v': 0, title: '擦除', html: ICON.erase }),
    noteBtn);
  host.append(board, pad);

  function render() {
    const bad = conflicts(g), sv = sel >= 0 ? g[sel] : 0;
    for (let i = 0; i < N * N; i++) {
      const c = cells[i], v = g[i];
      c.classList.toggle('sel', i === sel);
      c.classList.toggle('peer', sel >= 0 && i !== sel && PEERS[sel].includes(i));
      c.classList.toggle('same', !!sv && v === sv && i !== sel);
      c.classList.toggle('bad', bad.has(i));
      c.classList.toggle('flash', flash.has(i));
      if (v) c.innerHTML = `<span class="s-num">${v}</span>`;
      else if (notes[i].size) c.innerHTML = `<span class="s-notes">${[1, 2, 3, 4, 5, 6].map(n => `<i>${notes[i].has(n) ? n : ''}</i>`).join('')}</span>`;
      else c.innerHTML = '';
      c.setAttribute('aria-label', `第${((i / N) | 0) + 1}行第${(i % N) + 1}列，${v || '空'}${locked[i] ? '（题目给定）' : ''}`);
    }
    noteBtn.classList.toggle('on', noteMode);
    pad.querySelectorAll('[data-v]').forEach(b => {
      const v = +b.dataset.v;
      b.classList.toggle('done', v > 0 && g.filter(x => x === v).length >= N);
    });
  }
  const solved = () => !g.includes(0) && conflicts(g).size === 0;
  function input(v) {
    if (sel < 0 || locked[sel]) return;
    const before = snap();
    if (noteMode && v) {
      if (g[sel]) return;
      notes[sel].has(v) ? notes[sel].delete(v) : notes[sel].add(v);
    } else {
      g[sel] = g[sel] === v ? 0 : v;
      notes[sel].clear();
      if (v) for (const j of PEERS[sel]) notes[j].delete(v); // 填了数，同行同列同宫的笔记自动划掉
    }
    hist.push(before); if (hist.length > 300) hist.shift();
    render(); ctx.changed();
    if (solved()) ctx.won();
  }

  board.addEventListener('pointerdown', e => {
    if (e.button) return;
    const i = cellFromPoint(board, N, e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault(); board.focus({ preventScroll: true });
    sel = i; render();
  });
  pad.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b === noteBtn) { noteMode = !noteMode; render(); return; }
    input(+b.dataset.v);
  });
  board.addEventListener('keydown', e => {
    const k = e.key;
    const mv = { ArrowUp: -N, ArrowDown: N, ArrowLeft: -1, ArrowRight: 1 }[k];
    if (mv) {
      e.preventDefault();
      if (sel < 0) sel = 0;
      else { const r = (sel / N) | 0, c = sel % N;
        const nr = Math.min(N - 1, Math.max(0, r + (mv === N ? 1 : mv === -N ? -1 : 0)));
        const nc = Math.min(N - 1, Math.max(0, c + (mv === 1 ? 1 : mv === -1 ? -1 : 0)));
        sel = nr * N + nc; }
      render(); return;
    }
    if (/^[1-6]$/.test(k)) { e.preventDefault(); input(+k); }
    else if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); input(0); }
    else if (k === 'n' || k === 'N') { noteMode = !noteMode; render(); }
  });

  render();
  return {
    get solved() { return solved(); },
    state: () => ({ g: Array.from(g), notes: notes.map(s => [...s]), sel }),
    undo() { if (!hist.length) return false; const s = hist.pop(); g = s.g; notes = s.notes; render(); ctx.changed(); return true; },
    clear() { hist.push(snap()); g = Int8Array.from(base); notes = range(N * N).map(() => new Set()); render(); ctx.changed(); },
    hint() {
      const wrong = range(N * N).filter(i => g[i] && !locked[i] && g[i] !== p.solution[i]);
      if (wrong.length) {
        flash = new Set(wrong); render();
        setTimeout(() => { flash = new Set(); render(); }, 1600);
        return '闪烁的格子填错了';
      }
      const st = step(g);
      const i = st && !st.contra ? st.i : range(N * N).find(j => !g[j]);
      if (i == null) return null;
      const before = snap();
      g[i] = p.solution[i]; notes[i].clear();
      for (const j of PEERS[i]) notes[j].delete(g[i]);
      hist.push(before);
      sel = i; flash = new Set([i]);
      setTimeout(() => { flash = new Set(); render(); }, 1800);
      render(); ctx.changed();
      if (solved()) ctx.won();
      return st && !st.contra ? st.why : `这一格是 ${p.solution[i]}`;
    },
    refresh: render,
    destroy() { board.remove(); pad.remove(); },
  };
}

export default {
  id: 'sudoku', name: 'Mini Sudoku', cn: '迷你数独', tagline: '6×6 的轻量数独', accent: '#3d7be0',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="1.6" d="M12 3v18M3 9h18M3 15h18"/></svg>',
  diffs: DIFFS,
  dailyDiff: wd => ['hard', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard'][wd],
  sizeLabel: () => '6×6',
  rules: `<ul>
    <li>在每个空格里填 <b>1–6</b>。</li>
    <li>每一<b>行</b>、每一<b>列</b>、每个粗线围出的 <b>2×3 宫</b>里，1–6 都各出现一次。</li>
    <li>点格子选中，再点下面的数字。打开「笔记」可以记下候选数。</li>
  </ul><p class="tip">每道题都只用「这格只剩一个数」和「这个数在这一行/列/宫只剩一个位置」两招就能解开。</p>`,
  settings: [],
  generate, mount,
  _test: { logicSolve },
};
