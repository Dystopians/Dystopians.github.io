// Zip：从 1 出发，依次经过所有数字，最后停在最大的数字上，并且把每一格都走一遍
import { range, neighbors, edgeKey, el, svg, cellFromPoint } from './lib.js';

// nums：初始数字个数；minNums：最小化时最少保留几个（越少越难）；wallP：精修时用墙代替数字的概率
const DIFFS = [
  { id: 'easy', label: '简单', n: 6, nums: 8, minNums: 9, wallP: 0 },
  { id: 'medium', label: '中等', n: 7, nums: 7, minNums: 6, wallP: 0.3 },
  { id: 'hard', label: '困难', n: 8, nums: 5, minNums: 4, wallP: 0.5 },
];

// ---------- 随机哈密顿路径：从蛇形路径出发做大量 backbite 变换 ----------
function hamPath(N, R) {
  const n = N * N, path = [];
  for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) path.push(r * N + (r % 2 ? N - 1 - k : k));
  const pos = new Int32Array(n);
  path.forEach((c, i) => (pos[c] = i));
  const rev = (a, b) => { while (a < b) { const t = path[a]; path[a] = path[b]; path[b] = t; pos[path[a]] = a; pos[path[b]] = b; a++; b--; } };
  for (let m = 0; m < n * 60; m++) {
    if (R.next() < 0.5) {
      const qi = pos[R.pick(neighbors(path[0], N))];
      if (qi !== 1) rev(0, qi - 1);
    } else {
      const qi = pos[R.pick(neighbors(path[n - 1], N))];
      if (qi !== n - 2) rev(qi + 1, n - 1);
    }
  }
  return path;
}

// ---------- 求解器：数一数有几条合法路线（最多 cap 条） ----------
// 剪枝：
// ① 奇偶：格子按黑白棋盘染色，路线黑白交替，所以剩下的黑白格数必须和两端颜色对得上（O(1)）
// ② 除终点外，每个未走的格子至少要有两个可用邻居，否则它只能当端点
// ③ 未走的格子必须连成一片
// ④ 下一个数字必须能在不踩到其他数字的前提下走到
export function solveZip(N, num, walls, cap = 2, out = null, nodeLimit = 400000) {
  const n = N * N;
  const adj = range(n).map(i => neighbors(i, N).filter(j => !walls.has(edgeKey(i, j))));
  let K = 0, start = -1, end = -1;
  const cellOf = new Int32Array(n + 2).fill(-1);
  for (let i = 0; i < n; i++) if (num[i]) { cellOf[num[i]] = i; if (num[i] === 1) start = i; if (num[i] > K) { K = num[i]; end = i; } }
  const color = i => (((i / N) | 0) + (i % N)) & 1;
  const vis = new Uint8Array(n), path = [start], seen = new Uint8Array(n), stack = new Int32Array(n);
  vis[start] = 1;
  const left = [0, 0]; // 未走格子里白/黑各多少
  for (let i = 0; i < n; i++) if (!vis[i]) left[color(i)]++;
  let count = 0, nodes = 0, aborted = false;
  const parityOk = cur => {
    const b = left[1] + (color(cur) === 1), w = left[0] + (color(cur) === 0);
    if (color(cur) === color(end)) return color(cur) === 1 ? b - w === 1 : w - b === 1;
    return b === w;
  };
  const nextReachable = (cur, next) => {
    const target = cellOf[next];
    if (target < 0) return true;
    seen.fill(0);
    let sp = 0;
    stack[sp++] = cur; seen[cur] = 1;
    while (sp) {
      const i = stack[--sp];
      for (const j of adj[i]) {
        if (seen[j] || vis[j]) continue;
        if (j === target) return true;
        if (num[j]) continue;
        seen[j] = 1; stack[sp++] = j;
      }
    }
    return false;
  };
  const feasible = (cur, next) => {
    if (!parityOk(cur)) return false;
    let unv = 0, first = -1;
    for (let i = 0; i < n; i++) {
      if (vis[i]) continue;
      unv++; if (first < 0) first = i;
      if (i === end) continue;
      let d = 0;
      for (const j of adj[i]) if (!vis[j] || j === cur) d++;
      if (d < 2) return false;
    }
    if (!unv) return true;
    seen.fill(0);
    let sp = 0, got = 0;
    stack[sp++] = first; seen[first] = 1;
    while (sp) {
      const i = stack[--sp]; got++;
      for (const j of adj[i]) if (!vis[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; }
    }
    if (got !== unv) return false;
    let exit = false;
    for (const j of adj[cur]) if (!vis[j]) { exit = true; break; }
    return exit && nextReachable(cur, next);
  };
  const dfs = (cur, next, depth) => {
    if (++nodes > nodeLimit) { aborted = true; return true; }
    if (depth === n) { if (cur === end) { count++; if (out) out.push(path.slice()); } return count >= cap; }
    for (const j of adj[cur]) {
      if (vis[j]) continue;
      const v = num[j];
      if (v && v !== next) continue;
      if (j === end && depth + 1 < n) continue;
      vis[j] = 1; path.push(j); left[color(j)]--;
      const nx = v ? next + 1 : next;
      if (feasible(j, nx) && dfs(j, nx, depth + 1)) return true;
      vis[j] = 0; path.pop(); left[color(j)]++;
    }
    return false;
  };
  dfs(start, 2, 1);
  return aborted ? -1 : count;
}

function numsFrom(path, wp, n) {
  const num = new Int16Array(n);
  [...wp].sort((a, b) => a - b).forEach((idx, k) => (num[path[idx]] = k + 1));
  return num;
}
// alt 这条路线是否仍然按顺序经过这些数字
function stillConsistent(alt, path, wp) {
  const order = [...wp].sort((a, b) => a - b).map(i => path[i]);
  const rank = new Map(order.map((c, k) => [c, k]));
  let k = 0;
  for (const c of alt) { const r = rank.get(c); if (r == null) continue; if (r !== k) return false; k++; }
  return true;
}

// 唯一之后再做减法：逐个试着拿掉数字和墙，拿掉仍唯一就真拿掉。
// 精修阶段为了杀掉歧义往往加多了，满屏数字的题既难看又没挑战
function minimize(R, D, N, path, wp, walls) {
  const n = N * N, unique = () => solveZip(N, numsFrom(path, wp, n), walls, 2, null, 250000) === 1;
  for (const k of R.shuffle([...walls])) {
    walls.delete(k);
    if (!unique()) walls.add(k);
  }
  for (const i of R.shuffle([...wp].filter(i => i !== 0 && i !== n - 1))) {
    if (wp.size <= D.minNums) break;
    wp.delete(i);
    if (!unique()) wp.add(i);
  }
}

function generate(R, diffId) {
  const D = DIFFS.find(d => d.id === diffId) || DIFFS[1];
  const N = D.n, n = N * N;
  for (let attempt = 0; attempt < 40; attempt++) {
    const path = hamPath(N, R), idx = new Int32Array(n);
    path.forEach((c, i) => (idx[c] = i));
    const wp = new Set([0, n - 1]), inner = D.nums - 2;
    for (let k = 1; k <= inner; k++) {
      const base = Math.round((k * (n - 1)) / (inner + 1)) + R.int(5) - 2;
      wp.add(Math.min(n - 2, Math.max(1, base)));
    }
    const walls = new Set();
    for (let guard = 0; guard < 60; guard++) {
      const sols = [], cnt = solveZip(N, numsFrom(path, wp, n), walls, 8, sols);
      if (cnt < 0) break; // 搜索太深，换一条路径重来
      if (cnt === 1) {
        minimize(R, D, N, path, wp, walls);
        return {
          n: N,
          nums: [...wp].sort((a, b) => a - b).map((i, k) => [path[i], k + 1]),
          walls: [...walls].map(k => [Math.floor(k / 1000), k % 1000]),
          solution: path,
        };
      }
      const alts = sols.filter(s => s.some((c, i) => c !== path[i]));
      const alt = alts[0];
      let d = 0;
      while (alt[d] === path[d]) d++;
      // 在分岔点加墙：分岔处那条边原路线一定没用，所以必杀 alt 且不伤原解
      if (D.wallP && R.next() < D.wallP) { walls.add(edgeKey(path[d - 1], alt[d])); continue; }
      // 否则加一个数字：挑能同时让最多条别的路线顺序出错的格子，同分取离分岔点近的
      let best = -1, bestKill = 0, bestDist = 1e9;
      for (let c = 1; c < n - 1; c++) {
        if (wp.has(c)) continue;
        wp.add(c);
        let kill = 0;
        for (const a of alts) if (!stillConsistent(a, path, wp)) kill++;
        wp.delete(c);
        const dist = Math.abs(c - d);
        if (kill > bestKill || (kill === bestKill && kill > 0 && dist < bestDist)) { best = c; bestKill = kill; bestDist = dist; }
      }
      if (best >= 0) { wp.add(best); continue; }
      // 实在不行：把两条路线分岔的两个格子都标上数字，它们在两条路线里先后相反，alt 必死
      wp.add(d);
      wp.add(idx[alt[d]]);
    }
  }
  throw new Error('Zip 生成失败');
}

// ---------- 界面 ----------
function mount(host, p, saved, ctx) {
  const N = p.n, n = N * N;
  const num = new Int16Array(n);
  p.nums.forEach(([c, k]) => (num[c] = k));
  const K = p.nums.length, start = p.nums[0][0], end = p.nums[K - 1][0];
  const walls = new Set(p.walls.map(([a, b]) => edgeKey(a, b)));
  let path = saved && Array.isArray(saved.path) ? saved.path.slice() : [start];
  if (path[0] !== start) path = [start];
  const hist = [];
  let flash = new Set(), shake = -1;

  const board = el('div', { class: 'board z-board', style: { '--n': N }, tabindex: 0, role: 'application', 'aria-label': `Zip ${N}×${N}，从 1 连到 ${K}` });
  const cells = range(n).map(() => el('div', { class: 'z-cell' }));
  const art = svg('svg', { class: 'z-art', viewBox: `0 0 ${N} ${N}` });
  const line = svg('polyline', { class: 'z-path' });
  const head = svg('circle', { class: 'z-head', r: 0.2, cx: 0, cy: 0 });
  const wallPath = [];
  for (const k of walls) {
    const a = Math.floor(k / 1000), b = k % 1000, ra = (a / N) | 0, ca = a % N;
    wallPath.push(b === a + 1 ? `M${ca + 1} ${ra}V${ra + 1}` : `M${ca} ${ra + 1}H${ca + 1}`);
  }
  art.append(line, head, svg('path', { class: 'z-wall', d: wallPath.join('') }));
  const dots = p.nums.map(([c, k]) => el('div', {
    class: 'z-num', style: { left: `${((c % N) + 0.5) / N * 100}%`, top: `${(((c / N) | 0) + 0.5) / N * 100}%` },
  }, String(k)));
  board.append(el('div', { class: 'grid' }, cells), art, ...dots);
  const status = el('div', { class: 'z-status', 'aria-live': 'polite' });
  host.append(board, status);

  const nextNum = () => { let k = 1; for (const c of path) if (num[c]) k = num[c] + 1; return k; };
  const adjacent = (a, b) => neighbors(a, N).includes(b) && !walls.has(edgeKey(a, b));
  function render() {
    line.setAttribute('points', path.map(c => `${(c % N) + 0.5},${((c / N) | 0) + 0.5}`).join(' '));
    const last = path[path.length - 1];
    head.style.transform = `translate(${(last % N) + 0.5}px, ${((last / N) | 0) + 0.5}px)`;
    const onPath = new Set(path);
    cells.forEach((c, i) => { c.classList.toggle('on', onPath.has(i)); c.classList.toggle('flash', flash.has(i)); });
    const nx = nextNum();
    dots.forEach((d, k) => {
      const c = p.nums[k][0];
      d.classList.toggle('done', onPath.has(c));
      d.classList.toggle('next', k + 1 === nx);
      d.classList.toggle('shake', c === shake);
    });
    const left = n - path.length;
    status.textContent = path[path.length - 1] === end && left > 0 ? `已经到 ${K} 了，但还有 ${left} 格没走到` : left ? `还剩 ${left} 格` : '';
  }
  const solved = () => path.length === n && path[n - 1] === end;
  function reject(i) {
    shake = i; render();
    setTimeout(() => { shake = -1; render(); }, 380);
  }
  // 走到 i：相邻就前进，退回上一格就后撤，踩到自己走过的路就截断到那里
  function stepTo(i, quiet) {
    const last = path[path.length - 1];
    if (path.length >= 2 && i === path[path.length - 2]) { path.pop(); return true; }
    const at = path.indexOf(i);
    if (at >= 0) { path.length = at + 1; return true; }
    if (!adjacent(last, i) || last === end) return false;
    if (num[i] && num[i] !== nextNum()) { if (!quiet) reject(i); return false; }
    path.push(i);
    return true;
  }
  // 斜着穿过格角时，手指没在中间格停留：试着经由两个拐角格之一走过去
  function viaCorner(i, px, py) {
    const last = path[path.length - 1], rl = (last / N) | 0, cl = last % N, ri = (i / N) | 0, ci = i % N;
    if (Math.abs(rl - ri) !== 1 || Math.abs(cl - ci) !== 1) return false;
    const r = board.getBoundingClientRect(), fx = ((px - r.left) / r.width) * N, fy = ((py - r.top) / r.height) * N;
    const a = rl * N + ci, b = ri * N + cl; // 先横后竖 / 先竖后横
    // 手指实际划过哪个拐角格就先试哪个；正好穿过角点时再看离谁近
    let first = g && g.raw === a ? a : g && g.raw === b ? b : -1;
    if (first < 0) {
      const da = Math.hypot(fx - (ci + 0.5), fy - (rl + 0.5)), db = Math.hypot(fx - (cl + 0.5), fy - (ri + 0.5));
      first = da <= db ? a : b;
    }
    for (const m of first === a ? [a, b] : [b, a]) {
      if (path.includes(m)) continue;
      const keep = path.length;
      if (stepTo(m, true) && stepTo(i, true)) return true;
      path.length = keep;
    }
    return false;
  }
  // 手指划得快会跳格：同一行/列时把中间的格子补上
  function travel(i) {
    const last = path[path.length - 1];
    const r0 = (last / N) | 0, c0 = last % N, r1 = (i / N) | 0, c1 = i % N;
    if (r0 !== r1 && c0 !== c1) return stepTo(i);
    const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
    let r = r0, c = c0, moved = false;
    while (r !== r1 || c !== c1) { r += dr; c += dc; if (!stepTo(r * N + c)) break; moved = true; }
    return moved;
  }
  function commit(before) {
    if (before.length !== path.length || before.some((c, k) => c !== path[k])) { hist.push(before); if (hist.length > 300) hist.shift(); }
    render(); ctx.changed();
    if (solved()) ctx.won();
  }

  // 手指所在格；inner=true 时落在格子边缘一圈（死区）返回 -2，防止在两格交界处来回抖
  function cellAt(x, y, inner) {
    const r = board.getBoundingClientRect();
    const fx = ((x - r.left) / r.width) * N, fy = ((y - r.top) / r.height) * N;
    const c = Math.floor(fx), rr = Math.floor(fy);
    if (c < 0 || rr < 0 || c >= N || rr >= N) return -1;
    if (inner && (Math.abs(fx - c - 0.5) > 0.4 || Math.abs(fy - rr - 0.5) > 0.4)) return -2;
    return rr * N + c;
  }
  function advance(i, px, py) {
    const last = path[path.length - 1];
    if (i === last) return false;
    const r0 = (last / N) | 0, c0 = last % N, r1 = (i / N) | 0, c1 = i % N;
    if (path.includes(i) || Math.abs(r0 - r1) + Math.abs(c0 - c1) === 1) return stepTo(i);
    if (viaCorner(i, px, py)) return true;
    return travel(i);
  }
  // 两次事件之间按 0.2 格插值：划得再快也不会漏格
  function feed(x, y) {
    const r = board.getBoundingClientRect(), stepPx = (r.width / N) * 0.2;
    const dx = x - g.x, dy = y - g.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / stepPx));
    let moved = false;
    for (let k = 1; k <= n; k++) {
      const px = g.x + (dx * k) / n, py = g.y + (dy * k) / n, i = cellAt(px, py, true);
      if (i === -2) { // 落在格子边缘的死区：不走，但记下手指经过了哪格，供斜穿格角时判断
        const raw = cellAt(px, py, false);
        if (raw >= 0 && raw !== g.last) g.raw = raw;
        continue;
      }
      if (i < 0 || i === g.last) continue;
      g.last = i;
      if (advance(i, px, py)) moved = true;
      g.raw = -1;
    }
    g.x = x; g.y = y;
    return moved;
  }

  let g = null;
  board.addEventListener('pointerdown', e => {
    if (e.button) return;
    const i = cellAt(e.clientX, e.clientY, false);
    if (i < 0) return;
    e.preventDefault(); board.focus({ preventScroll: true });
    try { board.setPointerCapture(e.pointerId); } catch (_) { /* 指针已失效时会抛错，不影响后续逻辑 */ }
    const before = path.slice(), at = path.indexOf(i);
    if (at >= 0) path.length = at + 1;
    else if (!advance(i, e.clientX, e.clientY)) { render(); return; }
    g = { before, last: i, x: e.clientX, y: e.clientY };
    render();
  });
  board.addEventListener('pointermove', e => {
    if (!g) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    let moved = false;
    for (const pe of evs.length ? evs : [e]) if (feed(pe.clientX, pe.clientY)) moved = true;
    if (moved) render();
  });
  const up = () => { if (!g) return; const b = g.before; g = null; commit(b); };
  board.addEventListener('pointerup', up);
  board.addEventListener('pointercancel', up);

  board.addEventListener('keydown', e => {
    const mv = { ArrowUp: -N, ArrowDown: N, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    const before = path.slice();
    if (mv) {
      e.preventDefault();
      const last = path[path.length - 1], c = last % N;
      if ((mv === 1 && c === N - 1) || (mv === -1 && c === 0)) return;
      const i = last + mv;
      if (i < 0 || i >= n) return;
      stepTo(i); commit(before);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (path.length > 1) { path.pop(); commit(before); }
    }
  });

  render();
  return {
    get solved() { return solved(); },
    state: () => ({ path: path.slice() }),
    undo() { if (!hist.length) return false; path = hist.pop(); render(); ctx.changed(); return true; },
    clear() { const b = path.slice(); path = [start]; commit(b); },
    hint() {
      let k = 0;
      while (k < path.length && path[k] === p.solution[k]) k++;
      const before = path.slice();
      if (k < path.length) {
        path.length = Math.max(1, k);
        flash = new Set(before.slice(k));
        setTimeout(() => { flash = new Set(); render(); }, 900);
        commit(before);
        return '从第一步走错的地方截断了';
      }
      if (solved()) return null;
      // 沿正确路线往前走，直到下一个数字（至少 1 步、最多 6 步）
      const added = [];
      for (let s = 0; s < 6 && path.length < n; s++) {
        const c = p.solution[path.length];
        path.push(c); added.push(c);
        if (num[c]) break;
      }
      flash = new Set(added);
      setTimeout(() => { flash = new Set(); render(); }, 1400);
      commit(before);
      return `往前走了 ${added.length} 步`;
    },
    refresh: render,
    destroy() { board.remove(); status.remove(); },
  };
}

export default {
  id: 'zip', name: 'Zip', cn: '一笔连', tagline: '一笔走遍每一格', accent: '#ef6a3a',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M5 5h14v7H5v7h14"/><circle cx="5" cy="5" r="2.6" fill="currentColor"/><circle cx="19" cy="19" r="2.6" fill="currentColor"/></svg>',
  diffs: DIFFS,
  dailyDiff: wd => ['hard', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard'][wd],
  sizeLabel: p => `${p.n}×${p.n}`,
  rules: `<ul>
    <li>从 <b>1</b> 出发，按 <b>1 → 2 → 3 …</b> 的顺序经过所有数字，最后停在最大的数字上。</li>
    <li>路线要<b>走遍每一格</b>，每格只能走一次，只能上下左右移动。</li>
    <li>粗黑线是<b>墙</b>，不能穿过。</li>
    <li>按住拖动画线；往回拖就是擦掉；点一下路线上的格子可以从那里重新开始。</li>
  </ul><p class="tip">角落和靠墙的格子只有一两个出口，通常最先确定下来。</p>`,
  settings: [],
  generate, mount,
};
