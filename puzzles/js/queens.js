// Queens：N×N 棋盘分成 N 个色块，每行、每列、每个色块恰好一个皇后，且任意两个皇后不相邻（含斜向）
import { range, neighbors, el, svg, ICON, cellFromPoint } from './lib.js';

const DIFFS = [
  { id: 'easy', label: '简单', n: 7 },
  { id: 'medium', label: '中等', n: 8 },
  { id: 'hard', label: '困难', n: 9 },
  { id: 'expert', label: '专家', n: 10 },
];
const PALETTE = ['#c9b8f2', '#f7c59f', '#a8d8f0', '#b8e0b0', '#f2a7a7', '#f6e27f',
  '#d6d3cc', '#f5b8de', '#9fded3', '#e3c79b', '#b9c6f5'];

// ---------- 生成 ----------
function randomQueens(N, R) {
  const cols = new Array(N), used = new Array(N).fill(false);
  const bt = r => {
    if (r === N) return true;
    for (const c of R.shuffle(range(N))) {
      if (used[c] || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue;
      cols[r] = c; used[c] = true;
      if (bt(r + 1)) return true;
      used[c] = false;
    }
    return false;
  };
  bt(0);
  return cols;
}

// 以每个皇后为种子按权重生长色块：权重偏斜，才能长出一大一小、形状各异的块
function growRegions(N, sol, R) {
  const reg = new Int8Array(N * N).fill(-1), weight = [];
  for (let r = 0; r < N; r++) { reg[r * N + sol[r]] = r; weight.push(0.45 + R.next() * R.next() * 2.4); }
  let left = N * N - N;
  while (left > 0) {
    const fr = range(N).map(() => []);
    for (let i = 0; i < N * N; i++) if (reg[i] < 0) for (const j of neighbors(i, N)) if (reg[j] >= 0) fr[reg[j]].push(i);
    let tot = 0;
    for (let k = 0; k < N; k++) if (fr[k].length) tot += weight[k];
    let x = R.next() * tot, k = 0;
    for (; k < N; k++) { if (!fr[k].length) continue; x -= weight[k]; if (x <= 0) break; }
    if (k >= N) { k = N - 1; while (!fr[k].length) k--; }
    reg[R.pick(fr[k])] = k;
    left--;
  }
  return reg;
}

// 逐行回溯计数，最多数到 cap 个解。regMaxRow 剪枝：某色块最下面一行都过去了还没放皇后，直接死
export function solveQueens(N, reg, cap = 2, out = null) {
  const colUsed = new Uint8Array(N), regUsed = new Uint8Array(N), pos = new Int8Array(N);
  const lastRow = new Int8Array(N).fill(-1);
  for (let i = 0; i < N * N; i++) lastRow[reg[i]] = Math.max(lastRow[reg[i]], (i / N) | 0);
  const dueAt = range(N + 1).map(() => []);
  for (let g = 0; g < N; g++) dueAt[lastRow[g] + 1].push(g);
  let count = 0;
  const bt = r => {
    for (const g of dueAt[r]) if (!regUsed[g]) return false;
    if (r === N) { count++; if (out) out.push(Array.from(pos)); return count >= cap; }
    const base = r * N;
    for (let c = 0; c < N; c++) {
      const g = reg[base + c];
      if (colUsed[c] || regUsed[g] || (r > 0 && Math.abs(pos[r - 1] - c) <= 1)) continue;
      colUsed[c] = 1; regUsed[g] = 1; pos[r] = c;
      if (bt(r + 1)) return true;
      colUsed[c] = 0; regUsed[g] = 0;
    }
    return false;
  };
  bt(0);
  return count;
}

function regionSize(reg, g) { let n = 0; for (let i = 0; i < reg.length; i++) if (reg[i] === g) n++; return n; }

function connectedWithout(N, reg, g, skip) {
  let start = -1, total = 0;
  for (let i = 0; i < N * N; i++) if (reg[i] === g && i !== skip) { total++; if (start < 0) start = i; }
  if (!total) return false;
  const seen = new Uint8Array(N * N), st = [start];
  seen[start] = 1;
  let n = 0;
  while (st.length) {
    const i = st.pop(); n++;
    for (const j of neighbors(i, N)) if (!seen[j] && j !== skip && reg[j] === g) { seen[j] = 1; st.push(j); }
  }
  return n === total;
}

function generate(R, diffId) {
  const N = (DIFFS.find(d => d.id === diffId) || DIFFS[1]).n;
  // 单格色块等于白送一个皇后：简单/中等最多允许 1 个，困难以上一个都不要
  const maxSingles = diffId === 'easy' || diffId === 'medium' ? 1 : 0;
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomQueens(N, R), reg = growRegions(N, sol, R);
    const isQueen = new Uint8Array(N * N);
    sol.forEach((c, r) => (isQueen[r * N + c] = 1));
    let sols = [], cnt = solveQueens(N, reg, 2, sols), guard = 0;
    // 找到一个“别的解”，把它的某个皇后格（不是预定解的皇后）划给相邻色块：
    // 那个解立刻失效（一个块两个皇后、另一个块没有），而预定解不受影响
    while (cnt > 1 && guard++ < 300) {
      const alt = sols.find(s => s.some((c, r) => c !== sol[r]));
      let moved = false;
      for (const x of R.shuffle(alt.map((c, r) => r * N + c).filter(i => !isQueen[i]))) {
        const from = reg[x];
        const tos = [...new Set(neighbors(x, N).map(j => reg[j]).filter(g => g !== from))];
        if (!tos.length || regionSize(reg, from) <= 2 || !connectedWithout(N, reg, from, x)) continue;
        reg[x] = R.pick(tos);
        sols = []; cnt = solveQueens(N, reg, 2, sols);
        moved = true;
        break;
      }
      if (!moved) break;
    }
    if (cnt === 1) {
      let singles = 0;
      for (let k = 0; k < N; k++) if (regionSize(reg, k) === 1) singles++;
      if (singles > maxSingles) continue;
      const colorOf = R.shuffle(range(PALETTE.length)).slice(0, N);
      return { n: N, regions: Array.from(reg), solution: sol, colors: colorOf };
    }
  }
  throw new Error('Queens 生成失败');
}

// ---------- 规则判定 ----------
function conflicts(p, marks) {
  const N = p.n, qs = [];
  for (let i = 0; i < N * N; i++) if (marks[i] === 2) qs.push(i);
  const bad = new Set();
  for (let a = 0; a < qs.length; a++) for (let b = a + 1; b < qs.length; b++) {
    const i = qs[a], j = qs[b], ri = (i / N) | 0, ci = i % N, rj = (j / N) | 0, cj = j % N;
    if (ri === rj || ci === cj || p.regions[i] === p.regions[j] || (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)) { bad.add(i); bad.add(j); }
  }
  return { qs, bad };
}
function blockedBy(p, marks) { // 已放皇后排除掉的格子（“自动标 ×”只作显示，不写进存档）
  const N = p.n, out = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    if (marks[i] !== 2) continue;
    const r = (i / N) | 0, c = i % N;
    for (let j = 0; j < N * N; j++) {
      if (j === i) continue;
      const rj = (j / N) | 0, cj = j % N;
      if (rj === r || cj === c || p.regions[j] === p.regions[i] || (Math.abs(rj - r) <= 1 && Math.abs(cj - c) <= 1)) out[j] = 1;
    }
  }
  return out;
}

// ---------- 界面 ----------
function mount(host, p, saved, ctx) {
  const N = p.n;
  let marks = saved && saved.marks && saved.marks.length === N * N ? Uint8Array.from(saved.marks) : new Uint8Array(N * N);
  const hist = [];
  let cursor = -1, flashSet = new Set();

  const board = el('div', { class: 'board q-board', style: { '--n': N }, tabindex: 0, role: 'grid', 'aria-label': `Queens ${N}×${N}` });
  const cells = range(N * N).map(i => {
    const color = PALETTE[p.colors[p.regions[i]] % PALETTE.length]; // 取模：缓存的旧题不受调色板长度变化影响
    return el('div', { class: 'q-cell', style: { '--c': color }, role: 'gridcell' });
  });
  const grid = el('div', { class: 'grid' }, cells);
  // 色块边界用 SVG 画：粗线勾出每块轮廓，色弱也能分清
  const lines = svg('svg', { class: 'q-lines', viewBox: `0 0 ${N} ${N}`, preserveAspectRatio: 'none' });
  const path = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c;
    if (c < N - 1 && p.regions[i] !== p.regions[i + 1]) path.push(`M${c + 1} ${r}V${r + 1}`);
    if (r < N - 1 && p.regions[i] !== p.regions[i + N]) path.push(`M${c} ${r + 1}H${c + 1}`);
  }
  lines.append(svg('path', { d: path.join(''), class: 'q-edge' }), svg('rect', { x: 0, y: 0, width: N, height: N, class: 'q-outline' }));
  board.append(grid, lines);
  host.append(board);

  function render() {
    const { bad } = conflicts(p, marks);
    const blk = ctx.settings.autoX ? blockedBy(p, marks) : null;
    for (let i = 0; i < N * N; i++) {
      const m = marks[i], c = cells[i];
      c.classList.toggle('bad', bad.has(i));
      c.classList.toggle('flash', flashSet.has(i));
      c.classList.toggle('cursor', i === cursor);
      c.classList.toggle('auto', !!(blk && blk[i] && m === 0));
      const want = m === 2 ? 'q' : m === 1 ? 'x' : '';
      if (c.dataset.m !== want) {
        c.dataset.m = want;
        c.innerHTML = m === 2 ? `<span class="q-queen">${ICON.crown}</span>` : m === 1 ? `<span class="q-x">${ICON.x}</span>` : '';
      }
      c.setAttribute('aria-label', `第${((i / N) | 0) + 1}行第${(i % N) + 1}列${m === 2 ? '，皇后' : m === 1 ? '，已排除' : ''}`);
    }
  }
  const solved = () => { const { qs, bad } = conflicts(p, marks); return qs.length === N && bad.size === 0; };
  function commit(before) {
    if (before && before.some((v, i) => v !== marks[i])) { hist.push(before); if (hist.length > 300) hist.shift(); }
    render(); ctx.changed();
    if (solved()) ctx.won();
  }

  // 点一下 ×，再点一下皇后，再点清空；从空格拖动是批量打 ×，从 × 拖动是批量擦掉
  let g = null;
  board.addEventListener('pointerdown', e => {
    if (e.button) return;
    const i = cellFromPoint(board, N, e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault(); board.focus({ preventScroll: true });
    try { board.setPointerCapture(e.pointerId); } catch (_) { /* 指针已失效时会抛错，不影响后续逻辑 */ }
    cursor = -1;
    g = { start: i, last: i, moved: false, before: Uint8Array.from(marks), paint: marks[i] === 0 ? 1 : marks[i] === 1 ? 0 : -1 };
  });
  board.addEventListener('pointermove', e => {
    if (!g) return;
    const i = cellFromPoint(board, N, e.clientX, e.clientY);
    if (i < 0 || i === g.last) return;
    g.last = i;
    if (g.paint < 0) return;
    if (!g.moved) { g.moved = true; if (marks[g.start] !== 2) marks[g.start] = g.paint; }
    if (marks[i] !== 2 && (g.paint === 1 ? marks[i] === 0 : marks[i] === 1)) marks[i] = g.paint;
    render();
  });
  const end = () => {
    if (!g) return;
    if (!g.moved) marks[g.start] = (marks[g.start] + 1) % 3;
    const before = g.before; g = null;
    commit(before);
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);

  board.addEventListener('keydown', e => {
    const k = e.key;
    if (cursor < 0 && /^Arrow|^[ xq]$|Enter|Backspace|Delete/.test(k)) cursor = 0;
    const r = (cursor / N) | 0, c = cursor % N;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[k]) {
      e.preventDefault();
      const [dr, dc] = moves[k];
      cursor = Math.min(N - 1, Math.max(0, r + dr)) * N + Math.min(N - 1, Math.max(0, c + dc));
      render(); return;
    }
    const before = Uint8Array.from(marks);
    if (k === ' ' || k === 'Enter') marks[cursor] = (marks[cursor] + 1) % 3;
    else if (k === 'q') marks[cursor] = marks[cursor] === 2 ? 0 : 2;
    else if (k === 'x') marks[cursor] = marks[cursor] === 1 ? 0 : 1;
    else if (k === 'Backspace' || k === 'Delete') marks[cursor] = 0;
    else return;
    e.preventDefault();
    commit(before);
  });

  render();
  return {
    get solved() { return solved(); },
    state: () => ({ marks: Array.from(marks) }),
    undo() { if (!hist.length) return false; marks = hist.pop(); render(); ctx.changed(); return true; },
    clear() { const b = Uint8Array.from(marks); marks.fill(0); commit(b); },
    hint() {
      const wrong = [];
      for (let i = 0; i < N * N; i++) if (marks[i] === 2 && p.solution[(i / N) | 0] !== i % N) wrong.push(i);
      if (wrong.length) {
        flashSet = new Set(wrong); render();
        setTimeout(() => { flashSet = new Set(); render(); }, 1600);
        return wrong.length > 1 ? '闪烁的几个皇后放错了' : '闪烁的这个皇后放错了';
      }
      const todo = range(N).filter(r => marks[r * N + p.solution[r]] !== 2);
      if (!todo.length) return null;
      const r = todo[Math.floor(Math.random() * todo.length)], i = r * N + p.solution[r];
      const b = Uint8Array.from(marks);
      marks[i] = 2; flashSet = new Set([i]);
      setTimeout(() => { flashSet = new Set(); render(); }, 1600);
      commit(b);
      return `第 ${r + 1} 行的皇后在这里`;
    },
    refresh: render,
    destroy() { board.remove(); },
  };
}

export default {
  id: 'queens', name: 'Queens', cn: '皇后', tagline: '每行每列每色一后', accent: '#7c5cd6', icon: ICON.crown,
  diffs: DIFFS,
  dailyDiff: wd => ['hard', 'easy', 'easy', 'medium', 'medium', 'hard', 'hard'][wd],
  sizeLabel: p => `${p.n}×${p.n}`,
  rules: `<ul>
    <li>每一<b>行</b>、每一<b>列</b>、每一个<b>色块</b>里恰好放一个皇后。</li>
    <li>任意两个皇后<b>不能相邻</b>，斜对角挨着也不行。</li>
    <li>点一下标 ×，再点一下放皇后，再点一下清空。按住拖动可以连续打 ×。</li>
  </ul><p class="tip">思路：先看最小的色块，它能放皇后的位置最少；一整行或一整列都落在同一色块里时，这个色块的其他格都能排除。</p>`,
  settings: [{ key: 'autoX', label: '自动显示被排除的格子', def: false }],
  generate, mount,
};
