// Patches：把棋盘切成若干矩形补丁，每块恰好盖住一个提示；提示给出面积和/或形状（正方、竖长、横长）
import { range, el, cellFromPoint } from './lib.js';

// 每个提示随机成为四种之一：面积+形状都给 / 只给面积（形状不限）/ 只给形状（面积不限）/ 都不给（“?”）。
// 有歧义时再把牵涉到的提示补全，所以最终题面里的“不限”都是推得出来的
const DIFFS = [
  { id: 'easy', label: '简单', n: 6, maxA: 6, numOnly: 0.2, shapeOnly: 0, neither: 0 },
  { id: 'medium', label: '中等', n: 7, maxA: 8, numOnly: 0.3, shapeOnly: 0.15, neither: 0.1 },
  { id: 'hard', label: '困难', n: 8, maxA: 9, numOnly: 0.3, shapeOnly: 0.2, neither: 0.2 },
];
const MIN_A = 2; // 不存在 1 格的补丁
// 色相沿色环均匀铺开，相邻补丁再用图着色错开，避免两块挨着的颜色看起来一样
const PALETTE = ['#f28b82', '#fbb45c', '#f2d64b', '#8fd16a', '#4fc2b0', '#62b0f0', '#8a96f4', '#c192f0',
  '#f08fc3', '#c9a57c'];
const SHAPE = { square: '正方形', tall: '竖长方形', wide: '横长方形' };
// 颜色编号会随题目一起缓存在本地；取模保证以后调色板改了长度，旧题也不会变成没颜色
const colorOf = k => PALETTE[((k % PALETTE.length) + PALETTE.length) % PALETTE.length];
const shapeOf = (w, h) => (w === h ? 'square' : h > w ? 'tall' : 'wide');

// ---------- 生成：按行扫描，第一个空格一定是某块的左上角，随机选一个能放下的尺寸 ----------
function tile(N, R, D) {
  const g = new Int16Array(N * N).fill(-1), rects = [];
  for (let i = 0; i < N * N; i++) {
    if (g[i] >= 0) continue;
    const r = (i / N) | 0, c = i % N;
    let maxW = 0;
    while (c + maxW < N && g[r * N + c + maxW] < 0) maxW++;
    const opts = [];
    for (let w = 1; w <= maxW; w++) {
      for (let h = 1; r + h <= N; h++) {
        let free = true;
        for (let x = 0; x < w; x++) if (g[(r + h - 1) * N + c + x] >= 0) { free = false; break; }
        if (!free) break;
        const a = w * h, asp = Math.max(w, h) / Math.min(w, h);
        if (a > D.maxA || a < MIN_A) continue;
        let wt = a === 2 ? 0.3 : a === 3 ? 0.8 : a <= 6 ? 1.7 : 1.2;
        if (asp > 3) wt *= 0.25;
        opts.push([w, h, wt]);
      }
    }
    if (!opts.length) return null; // 这一格只能单独成块：整张铺法作废重来
    let tot = opts.reduce((s, o) => s + o[2], 0), x = R.next() * tot, pick = opts[opts.length - 1];
    for (const o of opts) { x -= o[2]; if (x <= 0) { pick = o; break; } }
    const [w, h] = pick, id = rects.length;
    rects.push({ r, c, w, h });
    for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) g[(r + y) * N + c + x2] = id;
  }
  return rects;
}

// ---------- 求解：精确覆盖。每格优先挑可选方案最少的来试 ----------
function enumerate(N, clues, maxA) {
  const at = new Int16Array(N * N).fill(-1);
  clues.forEach((k, i) => (at[k.cell] = i));
  return clues.map((k, ci) => {
    const list = [], cr = (k.cell / N) | 0, cc = k.cell % N;
    for (let h = 1; h <= N; h++) for (let w = 1; w <= N; w++) {
      const a = w * h;
      if (a < MIN_A || (k.area ? a !== k.area : a > maxA)) continue;
      if (k.shape && shapeOf(w, h) !== k.shape) continue;
      for (let r0 = cr - h + 1; r0 <= cr; r0++) for (let c0 = cc - w + 1; c0 <= cc; c0++) {
        if (r0 < 0 || c0 < 0 || r0 + h > N || c0 + w > N) continue;
        let lo = 0, hi = 0, ok = true;
        for (let y = 0; y < h && ok; y++) for (let x = 0; x < w; x++) {
          const j = (r0 + y) * N + c0 + x;
          if (at[j] >= 0 && at[j] !== ci) { ok = false; break; }
          if (j < 32) lo |= 1 << j; else hi |= 1 << (j - 32);
        }
        if (ok) list.push({ r: r0, c: c0, w, h, lo, hi });
      }
    }
    return list;
  });
}
export function solvePatches(N, clues, maxA, cap = 2, out = null) {
  const n = N * N, cands = enumerate(N, clues, maxA);
  const cellCands = range(n).map(() => []);
  cands.forEach((list, ci) => list.forEach((rc, ri) => {
    for (let y = 0; y < rc.h; y++) for (let x = 0; x < rc.w; x++) cellCands[(rc.r + y) * N + rc.c + x].push(ci, ri);
  }));
  let lo = 0, hi = 0, count = 0;
  const used = new Uint8Array(clues.length), choice = new Int32Array(clues.length);
  const covered = j => (j < 32 ? (lo >>> j) & 1 : (hi >>> (j - 32)) & 1);
  const bt = () => {
    let best = null;
    for (let j = 0; j < n; j++) {
      if (covered(j)) continue;
      const cc = cellCands[j], opts = [];
      for (let k = 0; k < cc.length; k += 2) {
        const ci = cc[k], rc = cands[ci][cc[k + 1]];
        if (!used[ci] && !(rc.lo & lo) && !(rc.hi & hi)) opts.push(ci, cc[k + 1]);
      }
      if (!opts.length) return false;
      if (!best || opts.length < best.length) { best = opts; if (opts.length === 2) break; }
    }
    if (!best) { count++; if (out) out.push(Array.from(choice).map((ri, ci) => cands[ci][ri])); return count >= cap; }
    for (let k = 0; k < best.length; k += 2) {
      const ci = best[k], rc = cands[ci][best[k + 1]];
      lo |= rc.lo; hi |= rc.hi; used[ci] = 1; choice[ci] = best[k + 1];
      if (bt()) return true;
      lo &= ~rc.lo; hi &= ~rc.hi; used[ci] = 0;
    }
    return false;
  };
  bt();
  return count;
}

function colorRects(rects, N, R) {
  // 相邻的补丁尽量不同色：贪心图着色
  const owner = new Int16Array(N * N);
  rects.forEach((rc, i) => { for (let y = 0; y < rc.h; y++) for (let x = 0; x < rc.w; x++) owner[(rc.r + y) * N + rc.c + x] = i; });
  const adj = rects.map(() => new Set());
  for (let i = 0; i < N * N; i++) {
    if (i % N < N - 1 && owner[i] !== owner[i + 1]) { adj[owner[i]].add(owner[i + 1]); adj[owner[i + 1]].add(owner[i]); }
    if (i + N < N * N && owner[i] !== owner[i + N]) { adj[owner[i]].add(owner[i + N]); adj[owner[i + N]].add(owner[i]); }
  }
  // 在邻居没用过的颜色里挑“目前用得最少”的，整盘颜色才会铺开，而不是反复用同两三种
  const col = new Array(rects.length).fill(-1), used = new Array(PALETTE.length).fill(0);
  for (const i of R.shuffle(range(rects.length))) {
    const taken = new Set([...adj[i]].map(j => col[j]));
    const free = R.shuffle(range(PALETTE.length).filter(c => !taken.has(c)));
    const pick = free.length ? free.reduce((a, b) => (used[b] < used[a] ? b : a)) : R.int(PALETTE.length);
    col[i] = pick; used[pick]++;
  }
  return col;
}

function generate(R, diffId) {
  const D = DIFFS.find(d => d.id === diffId) || DIFFS[1], N = D.n;
  for (let attempt = 0; attempt < 400; attempt++) {
    const rects = tile(N, R, D);
    if (!rects) continue;
    const clues = rects.map(rc => {
      const cell = (rc.r + R.int(rc.h)) * N + rc.c + R.int(rc.w);
      const k = { cell, area: rc.w * rc.h, shape: shapeOf(rc.w, rc.h) };
      const roll = R.next();
      if (roll < D.numOnly) k.shape = '';
      else if (roll < D.numOnly + D.shapeOnly) k.area = 0;
      else if (roll < D.numOnly + D.shapeOnly + D.neither) { k.area = 0; k.shape = ''; }
      return k;
    });
    let sols = [], cnt = solvePatches(N, clues, D.maxA, 2, sols), guard = 0;
    // 有歧义：先把牵涉其中的提示补全；都补全了还不行，就把提示挪到块里别的格子再试
    while (cnt > 1 && guard++ < 24) {
      const alt = sols.find(s => s.some((rc, ci) => rc.r !== rects[ci].r || rc.c !== rects[ci].c || rc.w !== rects[ci].w || rc.h !== rects[ci].h));
      const diff = range(clues.length).filter(ci => { const a = alt[ci], b = rects[ci]; return a.r !== b.r || a.c !== b.c || a.w !== b.w || a.h !== b.h; });
      const partial = diff.filter(ci => !clues[ci].area || !clues[ci].shape);
      if (partial.length) {
        // 一次只补一项：“?”先补面积或形状之一，尽量保留不限的提示
        const ci = R.pick(partial), rc = rects[ci], k = clues[ci];
        if (!k.area && (k.shape || R.next() < 0.5)) k.area = rc.w * rc.h; else k.shape = shapeOf(rc.w, rc.h);
      } else {
        const ci = R.pick(diff), rc = rects[ci];
        clues[ci].cell = (rc.r + R.int(rc.h)) * N + rc.c + R.int(rc.w);
      }
      sols = []; cnt = solvePatches(N, clues, D.maxA, 2, sols);
    }
    if (cnt !== 1) continue;
    const colors = colorRects(rects, N, R);
    return { n: N, maxA: D.maxA, clues: clues.map((k, i) => ({ ...k, color: colors[i] })), solution: rects };
  }
  throw new Error('Patches 生成失败');
}

// ---------- 界面 ----------
const sameRect = (a, b) => a.r === b.r && a.c === b.c && a.w === b.w && a.h === b.h;
function shapeGlyph(s) {
  if (s === 'square') return '<i class="p-g sq"></i>';
  if (s === 'tall') return '<i class="p-g tall"></i>';
  if (s === 'wide') return '<i class="p-g wide"></i>';
  return '';
}
function mount(host, p, saved, ctx) {
  const N = p.n, clueAt = new Int16Array(N * N).fill(-1);
  p.clues.forEach((k, i) => (clueAt[k.cell] = i));
  let patches = saved && Array.isArray(saved.patches) ? saved.patches.map(x => ({ ...x })) : [];
  const hist = [];
  let flash = null;

  const board = el('div', { class: 'board p-board', style: { '--n': N }, tabindex: 0, role: 'application', 'aria-label': `Patches ${N}×${N}` });
  const layer = el('div', { class: 'p-layer' });
  const preview = el('div', { class: 'p-preview', hidden: true }, el('span', { class: 'p-size' }));
  const clueEls = p.clues.map(k => {
    const r = (k.cell / N) | 0, c = k.cell % N;
    return el('div', {
      class: 'p-clue', style: { left: `${(c / N) * 100}%`, top: `${(r / N) * 100}%`, '--c': colorOf(k.color) },
      title: `${k.area ? `面积 ${k.area}` : '面积不限'}，${k.shape ? SHAPE[k.shape] : '形状不限'}`,
      html: `<span class="p-tag">${shapeGlyph(k.shape)}${k.area ? `<b>${k.area}</b>` : ''}${!k.area && !k.shape ? '<b>?</b>' : ''}</span>`,
    });
  });
  board.append(el('div', { class: 'grid' }, range(N * N).map(() => el('div', { class: 'p-cell' }))), layer, ...clueEls, preview);
  host.append(board);

  const inside = rc => p.clues.map((k, i) => i).filter(i => {
    const r = (p.clues[i].cell / N) | 0, c = p.clues[i].cell % N;
    return r >= rc.r && r < rc.r + rc.h && c >= rc.c && c < rc.c + rc.w;
  });
  const validOf = rc => {
    const ks = inside(rc);
    if (ks.length !== 1 || rc.w * rc.h < MIN_A) return -1;
    const k = p.clues[ks[0]];
    if (k.area && k.area !== rc.w * rc.h) return -1;
    if (k.shape && k.shape !== shapeOf(rc.w, rc.h)) return -1;
    return ks[0];
  };
  const overlaps = (a, b) => a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;
  function render() {
    layer.innerHTML = '';
    const good = new Set();
    for (const rc of patches) {
      const ci = validOf(rc), ks = inside(rc);
      const color = ci >= 0 ? colorOf(p.clues[ci].color) : ks.length === 1 ? colorOf(p.clues[ks[0]].color) : null;
      if (ci >= 0) good.add(ci);
      layer.append(el('div', {
        class: 'p-patch' + (ci < 0 ? ' bad' : '') + (flash && sameRect(flash, rc) ? ' flash' : ''),
        style: { left: `${(rc.c / N) * 100}%`, top: `${(rc.r / N) * 100}%`, width: `${(rc.w / N) * 100}%`, height: `${(rc.h / N) * 100}%`, '--c': color || '#9a9aa0' },
      }));
    }
    clueEls.forEach((e2, i) => e2.classList.toggle('ok', good.has(i)));
  }
  const solved = () => {
    let area = 0;
    for (const rc of patches) { if (validOf(rc) < 0) return false; area += rc.w * rc.h; }
    return area === N * N;
  };
  function commit(before) {
    hist.push(before); if (hist.length > 300) hist.shift();
    render(); ctx.changed();
    if (solved()) ctx.won();
  }
  const rectOf = (a, b) => {
    const r0 = Math.min((a / N) | 0, (b / N) | 0), r1 = Math.max((a / N) | 0, (b / N) | 0);
    const c0 = Math.min(a % N, b % N), c1 = Math.max(a % N, b % N);
    return { r: r0, c: c0, w: c1 - c0 + 1, h: r1 - r0 + 1 };
  };
  function showPreview(rc) {
    preview.hidden = false;
    Object.assign(preview.style, { left: `${(rc.c / N) * 100}%`, top: `${(rc.r / N) * 100}%`, width: `${(rc.w / N) * 100}%`, height: `${(rc.h / N) * 100}%` });
    preview.classList.toggle('ok', validOf(rc) >= 0);
    preview.firstChild.textContent = `${rc.w}×${rc.h}`;
  }

  let g = null;
  board.addEventListener('pointerdown', e => {
    if (e.button) return;
    const i = cellFromPoint(board, N, e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault(); board.focus({ preventScroll: true });
    try { board.setPointerCapture(e.pointerId); } catch (_) { /* 指针已失效时会抛错，不影响后续逻辑 */ }
    g = { s: i, e: i };
    showPreview(rectOf(i, i));
  });
  board.addEventListener('pointermove', e => {
    if (!g) return;
    const i = cellFromPoint(board, N, e.clientX, e.clientY);
    if (i < 0 || i === g.e) return;
    g.e = i; showPreview(rectOf(g.s, g.e));
  });
  const up = () => {
    if (!g) return;
    const { s, e: t } = g; g = null; preview.hidden = true;
    const before = patches.map(x => ({ ...x }));
    const rc = rectOf(s, t);
    if (s === t) {
      // 点一下：点在补丁上就删掉它；补丁至少 2 格，所以点空格不做任何事
      const at = patches.findIndex(x => overlaps(x, rc));
      if (at >= 0) { patches.splice(at, 1); commit(before); }
      else render();
      return;
    }
    patches = patches.filter(x => !overlaps(x, rc));
    patches.push(rc);
    commit(before);
  };
  board.addEventListener('pointerup', up);
  board.addEventListener('pointercancel', () => { g = null; preview.hidden = true; });

  render();
  return {
    get solved() { return solved(); },
    state: () => ({ patches: patches.map(x => ({ ...x })) }),
    undo() { if (!hist.length) return false; patches = hist.pop(); render(); ctx.changed(); return true; },
    clear() { const b = patches.map(x => ({ ...x })); patches = []; commit(b); },
    hint() {
      const done = new Set(patches.map(validOf).filter(ci => ci >= 0 && sameRect(patches.find(x => validOf(x) === ci), p.solution[ci])));
      const todo = range(p.clues.length).filter(ci => !patches.some(x => sameRect(x, p.solution[ci])));
      if (!todo.length) return null;
      // 优先提示面积最小的——小块通常最好推
      todo.sort((a, b) => p.solution[a].w * p.solution[a].h - p.solution[b].w * p.solution[b].h);
      const rc = { ...p.solution[todo[0]] };
      const before = patches.map(x => ({ ...x }));
      patches = patches.filter(x => !overlaps(x, rc));
      patches.push(rc);
      flash = rc;
      setTimeout(() => { flash = null; render(); }, 1500);
      commit(before);
      return done.size ? '放好了一块，它周围的补丁要跟着让位' : '先放好了一块';
    },
    refresh: render,
    destroy() { board.remove(); },
  };
}

export default {
  id: 'patches', name: 'Patches', cn: '拼布', tagline: '切成矩形，一块一个提示', accent: '#1fa58f',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="11" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="5" rx="2" fill="currentColor" opacity=".6"/><rect x="13" y="10" width="8" height="11" rx="2" fill="currentColor" opacity=".8"/><rect x="3" y="16" width="8" height="5" rx="2" fill="currentColor" opacity=".45"/></svg>',
  diffs: DIFFS,
  dailyDiff: wd => ['hard', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard'][wd],
  sizeLabel: p => `${p.n}×${p.n}`,
  rules: `<ul>
    <li>把整个棋盘切成若干<b>矩形补丁</b>，不重叠、不留空。</li>
    <li>每块补丁<b>恰好盖住一个</b>彩色提示。</li>
    <li>提示上的数字是这块补丁的<b>格子数</b>；图标是它的<b>形状</b>：<i class="p-g sq"></i> 正方形、<i class="p-g tall"></i> 竖长、<i class="p-g wide"></i> 横长。</li>
    <li>没有数字表示面积不限，没有图标表示形状不限；显示 <b>?</b> 的两样都不限。每块补丁<b>至少 2 格</b>。</li>
    <li>按住从一个角拖到对角放一块补丁；点一下补丁可以删掉它。</li>
  </ul><p class="tip">从数字大、又被边角挤着的提示下手，它能摆的位置最少。</p>`,
  settings: [],
  generate, mount,
};
