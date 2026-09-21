// Tango：6×6，每行每列太阳和月亮各 3 个；同一符号不能三个连在一起；= 两边相同，× 两边相反
import { range, el, ICON, cellFromPoint } from './lib.js';

const N = 6, SUN = 1, MOON = 2, NAME = { 1: '太阳', 2: '月亮' };
// level 1 = 只用基础推理就能解；level 2 = 需要把整行排法枚举一遍。
// minGiven：简单题故意多留几个给定格；needAdvanced：困难题必须真的用到进阶推理
const DIFFS = [
  { id: 'easy', label: '简单', level: 1, signs: 12, minGiven: 8 },
  { id: 'medium', label: '中等', level: 1, signs: 14, minGiven: 0 },
  { id: 'hard', label: '困难', level: 2, signs: 9, minGiven: 0, needAdvanced: true },
];
const LINES = [
  ...range(N).map(r => ({ cells: range(N).map(c => r * N + c), name: '行' })),
  ...range(N).map(c => ({ cells: range(N).map(r => r * N + c), name: '列' })),
];
// 一行合法的全部排法（3 太阳 3 月亮且没有三连）
const PATTERNS = [];
for (let m = 0; m < 64; m++) {
  const p = range(N).map(k => ((m >> k) & 1 ? SUN : MOON));
  if (p.filter(x => x === SUN).length !== 3) continue;
  let ok = true;
  for (let k = 0; k < N - 2; k++) if (p[k] === p[k + 1] && p[k + 1] === p[k + 2]) ok = false;
  if (ok) PATTERNS.push(p);
}

// ---------- 生成终盘 ----------
function genSolution(R) {
  const g = new Int8Array(N * N);
  const ok = (i, v) => {
    const r = (i / N) | 0, c = i % N;
    let n = 0; for (let k = 0; k < c; k++) if (g[r * N + k] === v) n++; if (n >= 3) return false;
    n = 0; for (let k = 0; k < r; k++) if (g[k * N + c] === v) n++; if (n >= 3) return false;
    if (c >= 2 && g[i - 1] === v && g[i - 2] === v) return false;
    if (r >= 2 && g[i - N] === v && g[i - 2 * N] === v) return false;
    return true;
  };
  const bt = i => {
    if (i === N * N) return true;
    for (const v of R.shuffle([SUN, MOON])) { if (!ok(i, v)) continue; g[i] = v; if (bt(i + 1)) return true; g[i] = 0; }
    return false;
  };
  bt(0);
  return g;
}

// ---------- 人类逻辑的推理步骤（同时用于出题和提示） ----------
// 基础规则：符号传递、数量补齐、两连的两端、夹心
function basicStep(g, signs) {
  for (const [a, b, t] of signs) {
    if (g[a] && !g[b]) return { i: b, v: t ? 3 - g[a] : g[a], why: t ? '× 两边必须一个太阳一个月亮' : '= 两边必须相同' };
    if (g[b] && !g[a]) return { i: a, v: t ? 3 - g[b] : g[b], why: t ? '× 两边必须一个太阳一个月亮' : '= 两边必须相同' };
  }
  for (const L of LINES) {
    const v = L.cells.map(i => g[i]);
    for (const s of [SUN, MOON]) {
      if (v.filter(x => x === s).length === 3) {
        const k = v.indexOf(0);
        if (k >= 0) return { i: L.cells[k], v: 3 - s, why: `这一${L.name}已经有 3 个${NAME[s]}了` };
      }
    }
    for (let k = 0; k < N - 1; k++) if (v[k] && v[k] === v[k + 1]) {
      if (k > 0 && !v[k - 1]) return { i: L.cells[k - 1], v: 3 - v[k], why: `两个${NAME[v[k]]}挨着，旁边不能再放第三个` };
      if (k + 2 < N && !v[k + 2]) return { i: L.cells[k + 2], v: 3 - v[k], why: `两个${NAME[v[k]]}挨着，旁边不能再放第三个` };
    }
    for (let k = 0; k < N - 2; k++) if (v[k] && v[k] === v[k + 2] && !v[k + 1]) {
      return { i: L.cells[k + 1], v: 3 - v[k], why: `夹在两个${NAME[v[k]]}中间，只能是${NAME[3 - v[k]]}` };
    }
  }
  return null;
}
// 进阶：把一整行/列所有可能的排法列出来，大家都一样的格子就是确定的
function lineSigns(L, signs) {
  const pos = new Map(L.cells.map((c, k) => [c, k])), inner = [], outer = [];
  for (const s of signs) {
    const ka = pos.get(s[0]), kb = pos.get(s[1]);
    if (ka != null && kb != null) inner.push([ka, kb, s[2]]);
    else if (ka != null) outer.push([ka, s[1], s[2]]);
    else if (kb != null) outer.push([kb, s[0], s[2]]);
  }
  return { inner, outer };
}
function advancedStep(g, signs) {
  for (const L of LINES) {
    const v = L.cells.map(i => g[i]);
    if (!v.includes(0)) continue;
    const { inner, outer } = lineSigns(L, signs);
    let common = null;
    for (const p of PATTERNS) {
      let ok = true;
      for (let k = 0; k < N && ok; k++) if (v[k] && v[k] !== p[k]) ok = false;
      for (const [a, b, t] of inner) if (ok && (p[a] === p[b]) === !!t) ok = false;
      for (const [k, j, t] of outer) if (ok && g[j] && (p[k] === g[j]) === !!t) ok = false;
      if (!ok) continue;
      if (!common) common = p.slice(); else for (let k = 0; k < N; k++) if (common[k] !== p[k]) common[k] = 0;
    }
    if (!common) return { contra: true };
    for (let k = 0; k < N; k++) if (!v[k] && common[k]) {
      return { i: L.cells[k], v: common[k], why: `把这一${L.name}能排的方式都试一遍，这一格只能是${NAME[common[k]]}` };
    }
  }
  return null;
}
function logicSolve(given, signs, level) {
  const g = Int8Array.from(given);
  for (let guard = 0; guard < 64; guard++) {
    let st = basicStep(g, signs);
    if (!st && level >= 2) st = advancedStep(g, signs);
    if (!st) break;
    if (st.contra) return null;
    g[st.i] = st.v;
  }
  return g.includes(0) ? null : g;
}

function generate(R, diffId) {
  const D = DIFFS.find(d => d.id === diffId) || DIFFS[1];
  for (let attempt = 0; attempt < 60; attempt++) {
    const sol = genSolution(R);
    const edges = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c;
      if (c < N - 1) edges.push([i, i + 1, sol[i] === sol[i + 1] ? 0 : 1]);
      if (r < N - 1) edges.push([i, i + N, sol[i] === sol[i + N] ? 0 : 1]);
    }
    let signs = R.shuffle(edges).slice(0, D.signs);
    const given = Int8Array.from(sol);
    // 先删给定格、再删符号：删完还能用人类逻辑解出来才真删。
    // 能靠纯逻辑解开也就自动保证了唯一解
    let left = N * N;
    for (const i of R.shuffle(range(N * N))) {
      if (left <= D.minGiven) break;
      const keep = given[i]; given[i] = 0;
      if (!logicSolve(given, signs, D.level)) given[i] = keep; else left--;
    }
    for (const s of R.shuffle(signs.slice())) {
      const rest = signs.filter(x => x !== s);
      if (logicSolve(given, rest, D.level)) signs = rest;
    }
    const nGiven = given.filter(Boolean).length;
    if (nGiven < 2 || signs.length < 3) continue; // 太光秃的题不好看
    if (D.needAdvanced && logicSolve(given, signs, 1)) continue; // 基础推理就能解，不配叫困难
    return {
      n: N,
      givens: range(N * N).filter(i => given[i]).map(i => [i, given[i]]),
      signs, solution: Array.from(sol),
    };
  }
  throw new Error('Tango 生成失败');
}

// ---------- 规则判定 ----------
function errors(p, g) {
  const bad = new Set(), badSigns = new Set();
  for (const L of LINES) {
    const v = L.cells.map(i => g[i]);
    for (const s of [SUN, MOON]) if (v.filter(x => x === s).length > 3) L.cells.forEach(i => { if (g[i] === s) bad.add(i); });
    for (let k = 0; k < N - 2; k++) if (v[k] && v[k] === v[k + 1] && v[k + 1] === v[k + 2]) [0, 1, 2].forEach(d => bad.add(L.cells[k + d]));
  }
  p.signs.forEach(([a, b, t], k) => {
    if (g[a] && g[b] && (g[a] === g[b]) === !!t) { badSigns.add(k); bad.add(a); bad.add(b); }
  });
  return { bad, badSigns };
}

// ---------- 界面 ----------
function mount(host, p, saved, ctx) {
  const locked = new Uint8Array(N * N), base = new Int8Array(N * N);
  p.givens.forEach(([i, v]) => { locked[i] = 1; base[i] = v; });
  let g = saved && saved.g && saved.g.length === N * N ? Int8Array.from(saved.g) : Int8Array.from(base);
  p.givens.forEach(([i, v]) => (g[i] = v));
  const hist = [];
  let cursor = -1, flash = new Set();

  const board = el('div', { class: 'board t-board', style: { '--n': N }, tabindex: 0, role: 'grid', 'aria-label': 'Tango 6×6' });
  const cells = range(N * N).map(i => el('div', { class: 't-cell' + (locked[i] ? ' locked' : ''), role: 'gridcell' }));
  const signEls = p.signs.map(([a, b, t]) => {
    const r = (a / N) | 0, c = a % N, horiz = b === a + 1;
    const x = horiz ? (c + 1) / N : (c + 0.5) / N, y = horiz ? (r + 0.5) / N : (r + 1) / N;
    return el('div', { class: 't-sign', style: { left: `${x * 100}%`, top: `${y * 100}%` }, 'aria-hidden': 'true' }, t ? '×' : '=');
  });
  board.append(el('div', { class: 'grid' }, cells), ...signEls);
  host.append(board);

  function render() {
    const { bad, badSigns } = ctx.settings.showErrors === false ? { bad: new Set(), badSigns: new Set() } : errors(p, g);
    for (let i = 0; i < N * N; i++) {
      const c = cells[i], v = g[i];
      const want = v === SUN ? 's' : v === MOON ? 'm' : '';
      if (c.dataset.v !== want) {
        c.dataset.v = want;
        c.innerHTML = v === SUN ? `<span class="t-sun">${ICON.sun}</span>` : v === MOON ? `<span class="t-moon">${ICON.moon}</span>` : '';
      }
      c.classList.toggle('bad', bad.has(i));
      c.classList.toggle('flash', flash.has(i));
      c.classList.toggle('cursor', i === cursor);
      c.setAttribute('aria-label', `第${((i / N) | 0) + 1}行第${(i % N) + 1}列，${v ? NAME[v] : '空'}${locked[i] ? '（题目给定）' : ''}`);
    }
    signEls.forEach((s, k) => s.classList.toggle('bad', badSigns.has(k)));
  }
  const solved = () => !g.includes(0) && errors(p, g).bad.size === 0;
  function set(i, v) {
    if (locked[i] || g[i] === v) return;
    hist.push(Int8Array.from(g)); if (hist.length > 300) hist.shift();
    g[i] = v; render(); ctx.changed();
    if (solved()) ctx.won();
  }

  board.addEventListener('pointerdown', e => {
    if (e.button) return;
    const i = cellFromPoint(board, N, e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault(); board.focus({ preventScroll: true });
    cursor = -1;
    set(i, (g[i] + 1) % 3);
  });
  board.addEventListener('keydown', e => {
    const k = e.key;
    if (cursor < 0 && /^Arrow|^[ 012smSM]$|Enter|Backspace|Delete/.test(k)) cursor = 0;
    const r = (cursor / N) | 0, c = cursor % N;
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) { e.preventDefault(); cursor = Math.min(N - 1, Math.max(0, r + mv[0])) * N + Math.min(N - 1, Math.max(0, c + mv[1])); render(); return; }
    const map = { ' ': (g[cursor] + 1) % 3, Enter: (g[cursor] + 1) % 3, 1: SUN, s: SUN, S: SUN, 2: MOON, m: MOON, M: MOON, 0: 0, Backspace: 0, Delete: 0 };
    if (!(k in map)) return;
    e.preventDefault(); set(cursor, map[k]);
  });

  render();
  return {
    get solved() { return solved(); },
    state: () => ({ g: Array.from(g) }),
    undo() { if (!hist.length) return false; g = hist.pop(); render(); ctx.changed(); return true; },
    clear() { hist.push(Int8Array.from(g)); g = Int8Array.from(base); render(); ctx.changed(); },
    hint() {
      const wrong = range(N * N).filter(i => g[i] && g[i] !== p.solution[i]);
      if (wrong.length) {
        flash = new Set(wrong); render();
        setTimeout(() => { flash = new Set(); render(); }, 1600);
        return '闪烁的格子和答案不符，先把它们改掉';
      }
      // 优先给出“下一步能推出来的格子”并说明理由，而不是随便翻一格
      const st = basicStep(g, p.signs) || advancedStep(g, p.signs);
      const i = st && !st.contra ? st.i : range(N * N).find(j => !g[j]);
      if (i == null) return null;
      flash = new Set([i]);
      setTimeout(() => { flash = new Set(); render(); }, 1800);
      set(i, p.solution[i]);
      return st && !st.contra ? st.why : '这一格是' + NAME[p.solution[i]];
    },
    refresh: render,
    destroy() { board.remove(); },
  };
}

export default {
  id: 'tango', name: 'Tango', cn: '日月', tagline: '日月各半，不许三连', accent: '#e8932b', icon: ICON.sun,
  diffs: DIFFS,
  dailyDiff: wd => ['hard', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard'][wd],
  sizeLabel: () => '6×6',
  rules: `<ul>
    <li>每一行、每一列都要有 <b>3 个太阳</b>和 <b>3 个月亮</b>。</li>
    <li>同一种符号<b>不能三个连在一起</b>（横竖都算）。</li>
    <li>格子之间的 <b>=</b> 表示两边相同，<b>×</b> 表示两边相反。</li>
    <li>点一下放太阳，再点一下换成月亮，再点一下清空。</li>
  </ul><p class="tip">每道题都能纯靠推理解开，不需要猜。卡住时点「提示」，会告诉你下一步能推出哪一格、为什么。</p>`,
  settings: [{ key: 'showErrors', label: '实时标出违反规则的格子', def: true }],
  generate, mount,
  _test: { logicSolve, PATTERNS },
};
