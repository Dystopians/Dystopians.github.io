// 建築 · 木材合わせ（城的「補修」就用这个）：从左边的「建材」里自己挑一块木料，旋转后嵌进木板上的凹槽。全部凹槽的拼法只有一种
import { el } from './lib.js';
import { LEVELS, STAT, grade, intro, countdown, timeBar, pick, shuffle } from './kit.js';

const G = 15; // 原作画面里数出来是 15×15
// 原作出现过的木料（PS2 版实机画面 + 攻略图）：四格 I O T L J，五格 X U W，以及两种手性的 F 和 S/Z。
// 原作不能翻面，所以镜像算两种料。坐标 [x, y]，朝向就是原作「建材」栏里画的样子
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  L: [[0, 0], [1, 0], [2, 0], [0, 1]],
  J: [[0, 0], [1, 0], [2, 0], [2, 1]],
  X: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  U: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]],
  Z: [[2, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
  S: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  F: [[1, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  Fr: [[1, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
  W: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
};
// 每局 8 + 等级 块，而且各不相同：基本的七种一定有，其余从复杂的五种里抽
const BASE = ['I', 'O', 'T', 'L', 'J', 'X', 'U'];
const EXTRA = ['Z', 'S', 'F', 'Fr', 'W'];
// 等级越高，木料越常挨在一起，拼成大片的复合凹槽
const ATTACH = [0.45, 0.6, 0.72, 0.8, 0.86];
const PIECE = ['#e0853a', '#d9772e', '#e89346', '#d47f3a', '#e5893f', '#dc7b33'];

const norm = cells => {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const rot = cells => norm(cells.map(([x, y]) => [-y, x]));
const key = cells => cells.map(c => c.join(',')).join(';');
const ORIENTS = Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => {
  const out = [], seen = new Set();
  let c = norm(s);
  for (let r = 0; r < 4; r++) { if (!seen.has(key(c))) { seen.add(key(c)); out.push(c); } c = rot(c); }
  return [k, out];
}));
const rotate = (cells, times) => { let c = norm(cells); for (let i = 0; i < ((times % 4) + 4) % 4; i++) c = rot(c); return c; };

// 数一数有几种拼法（最多 cap 种）。行优先的第一个空凹槽，必然是盖住它那块料的第一格
function countFills(holes, bag, cap = 2) {
  const need = new Uint8Array(G * G), types = {};
  holes.forEach(i => (need[i] = 1));
  bag.forEach(t => (types[t] = (types[t] || 0) + 1));
  const names = Object.keys(types);
  let count = 0;
  const bt = () => {
    let first = -1;
    for (let i = 0; i < G * G; i++) if (need[i]) { first = i; break; }
    if (first < 0) { count++; return count >= cap; }
    const fx = first % G, fy = (first / G) | 0;
    for (const t of names) {
      if (!types[t]) continue;
      for (const o of ORIENTS[t]) {
        const [ax, ay] = o[0], cells = [];
        let ok = true;
        for (const [x, y] of o) {
          const cx = fx + x - ax, cy = fy + y - ay;
          if (cx < 0 || cy < 0 || cx >= G || cy >= G || !need[cy * G + cx]) { ok = false; break; }
          cells.push(cy * G + cx);
        }
        if (!ok) continue;
        cells.forEach(i => (need[i] = 0)); types[t]--;
        if (bt()) return true;
        cells.forEach(i => (need[i] = 1)); types[t]++;
      }
    }
    return false;
  };
  bt();
  return count;
}

function generate(L) {
  const kinds = [...BASE, ...shuffle(EXTRA.slice()).slice(0, L + 1)];
  for (let attempt = 0; attempt < 500; attempt++) {
    const owner = new Int16Array(G * G).fill(-1), pieces = [];
    let failed = false;
    for (const type of shuffle(kinds.slice())) {
      const attach = pieces.length > 0 && Math.random() < ATTACH[L];
      let placed = false;
      for (let tries = 0; tries < 300 && !placed; tries++) {
        const o = pick(ORIENTS[type]), ox = 1 + Math.floor(Math.random() * (G - 2)), oy = 1 + Math.floor(Math.random() * (G - 2));
        const cells = o.map(([x, y]) => [ox + x, oy + y]);
        if (cells.some(([x, y]) => x > G - 2 || y > G - 2 || owner[y * G + x] >= 0)) continue;
        const touches = cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => owner[(y + dy) * G + x + dx] >= 0));
        if (attach !== touches) continue; // 要么贴着已有的凹槽，要么单独一处
        cells.forEach(([x, y]) => (owner[y * G + x] = pieces.length));
        pieces.push({ type, cells: cells.map(([x, y]) => y * G + x) });
        placed = true;
      }
      if (!placed) { failed = true; break; }
    }
    if (failed) continue;
    const holes = pieces.flatMap(p => p.cells);
    if (countFills(holes, pieces.map(p => p.type)) === 1) return { pieces, holes };
  }
  throw new Error('木材合わせ 生成失败');
}

function mount(stage, ctx) {
  const L = +ctx.level, n = 8 + L;
  const total = n * (2 + Math.floor((STAT + STAT) / 40)); // 原作：料数 × (2 + ⌊(政务+知谋)/40⌋) 秒
  let puzzle = null, hole, fill, tray = [], held = -1, turns = 0, ghost = null, phase = 'play', timer = null, placedN = 0;

  const bar = timeBar();
  const board = el('div', { class: 'wd-board', style: { '--g': G } });
  const ghostLayer = el('div', { class: 'wd-ghost' });
  const trayEl = el('div', { class: 'wd-tray' });
  const msg = el('div', { class: 'msg' }, '先从「建材」里挑一块木料');
  const rl = el('button', { class: 'btn', title: '向左转（Q）', 'aria-label': '向左转' }, '↺');
  const rr = el('button', { class: 'btn', title: '向右转（E）', 'aria-label': '向右转' }, '↻');
  const drop = el('button', { class: 'btn', title: '放回建材栏（Esc）' }, '解除');
  const ok = el('button', { class: 'btn pri', title: '嵌进去（Enter）' }, '決定');
  const panel = el('div', { class: 'panel wd' }, bar.el,
    el('div', { class: 'wd-main' },
      el('div', { class: 'wd-side' }, el('div', { class: 'wd-lbl' }, '建材'), trayEl),
      el('div', { class: 'wd-work' }, board, msg, el('div', { class: 'wd-tools' }, rl, rr, drop, ok))));
  let cellEls = [];

  function build() {
    hole = new Uint8Array(G * G); fill = new Int16Array(G * G).fill(-1);
    puzzle.holes.forEach(i => (hole[i] = 1));
    tray = shuffle(puzzle.pieces.map((p, i) => ({ id: i, type: p.type, used: false })));
    // 木板每一格的木纹深浅不同
    cellEls = Array.from({ length: G * G }, () => el('div', { class: 'wd-cell', style: { '--v': (Math.random() * 0.16 - 0.08).toFixed(3) } }));
    board.replaceChildren(...cellEls, ghostLayer);
    render();
  }
  function mini(cells, size) {
    const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
    return `<svg viewBox="0 0 ${w} ${h}" width="${w * size}" height="${h * size}" aria-hidden="true">${cells.map(([x, y]) =>
      `<rect x="${x + .05}" y="${y + .05}" width=".9" height=".9" rx=".1" fill="#e0853a" stroke="#8a4a1c" stroke-width=".07"/>`).join('')}</svg>`;
  }
  function render() {
    cellEls.forEach((c, i) => {
      c.className = 'wd-cell' + (hole[i] ? (fill[i] >= 0 ? ' put' : ' hole') : '');
      if (fill[i] >= 0) c.style.setProperty('--w', PIECE[fill[i] % PIECE.length]);
    });
    trayEl.replaceChildren(...tray.map((t, k) => el('button', {
      class: 'wd-piece' + (k === held ? ' sel' : '') + (t.used ? ' used' : ''), 'data-k': k, 'aria-label': `木料 ${k + 1}`, disabled: t.used,
      html: mini(SHAPES[t.type], 12) })));
    const has = held >= 0 && phase === 'play';
    rl.disabled = rr.disabled = drop.disabled = !has;
    ok.disabled = !(has && ghost && ghost.ok);
    ghostLayer.className = 'wd-ghost' + (ghost ? (ghost.ok ? ' ok' : ' no') : '');
    ghostLayer.replaceChildren(...(has && ghost ? ghost.abs.filter(([x, y]) => x >= 0 && y >= 0 && x < G && y < G).map(([x, y]) =>
      el('i', { style: { left: `${(x / G) * 100}%`, top: `${(y / G) * 100}%` } })) : []));
  }
  const curCells = () => rotate(SHAPES[tray[held].type], turns);
  const fits = abs => abs.every(([x, y]) => x >= 0 && y >= 0 && x < G && y < G && hole[y * G + x] && fill[y * G + x] < 0);
  // (gx, gy) 这一格对准木料中心那一格
  function aim(gx, gy) {
    if (held < 0 || phase !== 'play') return;
    gx = Math.max(0, Math.min(G - 1, gx)); gy = Math.max(0, Math.min(G - 1, gy));
    const cells = curCells(), w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
    const ox = gx - Math.floor((w - 1) / 2), oy = gy - Math.floor((h - 1) / 2);
    const abs = cells.map(([x, y]) => [ox + x, oy + y]);
    ghost = { gx, gy, abs, ok: fits(abs) };
    render();
  }
  function take(k) {
    if (phase !== 'play' || tray[k].used) return;
    if (held === k) return putBack();
    held = k; turns = 0;
    msg.textContent = '移到木板上，旋转（↺ ↻ / 右键 / Q E）后点一下嵌进去';
    if (ghost) aim(ghost.gx, ghost.gy); else render();
  }
  function putBack() { if (held < 0) return; held = -1; ghost = null; msg.textContent = '放回建材栏了'; render(); }
  function turn(d) { if (held < 0 || phase !== 'play') return; turns = (turns + d + 4) % 4; if (ghost) aim(ghost.gx, ghost.gy); else render(); }
  function commit() {
    if (held < 0 || !ghost || phase !== 'play') return;
    if (!ghost.ok) {
      msg.textContent = '放不进去：木料必须整块落在空凹槽里';
      board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
      return;
    }
    const t = tray[held];
    ghost.abs.forEach(([x, y]) => (fill[y * G + x] = t.id));
    t.used = true; held = -1; ghost = null; placedN++;
    const filled = fill.reduce((s, v) => s + (v >= 0), 0);
    msg.textContent = `嵌好了 · ${filled}/${puzzle.holes.length} 格`;
    render();
    if (placedN === n) return end();
    // 剩下的木料哪儿都放不进去，就不用干等计时了（原作放下的木料不能取回）
    const stuck = tray.every(p => p.used || !ORIENTS[p.type].some(o => {
      for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (fits(o.map(([cx, cy]) => [x + cx, y + cy]))) return true;
      return false;
    }));
    if (stuck) { msg.textContent = '剩下的木料哪里都放不进去了'; phase = 'stuck'; timer?.stop(); setTimeout(end, 900); }
  }
  function end() {
    if (phase === 'done') return;
    phase = 'done'; timer?.stop(); held = -1; ghost = null; render();
    const filled = fill.reduce((s, v) => s + (v >= 0), 0), all = filled === puzzle.holes.length, left = timer ? timer.left() : 0;
    const score = all ? 80 + 20 * (left / total) : 80 * (filled / puzzle.holes.length);
    const g = grade(score);
    ctx.finish({ ...g, detail: `${all ? '全部嵌好' : `填了 ${filled}/${puzzle.holes.length} 格`} · <b>${g.score}</b> 分<br>${all ? g.note : '拼法只有一种，放错一块往往就会卡住'}` });
  }

  // ---------- 操作：鼠标悬停预览、点击嵌入；触屏拖动定位、点木料影子或「決定」嵌入 ----------
  const cellAt = (e, lift = 0) => {
    const r = board.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * G), Math.floor(((e.clientY - r.top) / r.height) * G - lift)];
  };
  let press = null;
  board.addEventListener('pointerdown', e => {
    if (e.button === 2 || held < 0) return;
    e.preventDefault();
    const [gx, gy] = cellAt(e);
    press = { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', moved: false,
      onGhost: !!ghost && ghost.abs.some(([x, y]) => x === gx && y === gy) };
    try { board.setPointerCapture(e.pointerId); } catch (_) { }
    if (!press.touch) aim(gx, gy);
  });
  board.addEventListener('pointermove', e => {
    if (held < 0) return;
    if (!press) { if (e.pointerType === 'mouse') aim(...cellAt(e)); return; }
    if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) press.moved = true;
    if (press.moved) aim(...cellAt(e, press.touch ? 1.6 : 0)); // 触屏抬高一点，别让手指挡住木料
  });
  board.addEventListener('pointerup', e => {
    if (!press) return;
    const p = press; press = null;
    if (!p.touch) { aim(...cellAt(e)); commit(); return; }
    if (!p.moved) { if (p.onGhost) commit(); else aim(...cellAt(e)); }
    else msg.textContent = ghost && ghost.ok ? '位置合适：点木料影子或「決定」嵌进去' : '这里放不进去';
  });
  board.addEventListener('pointercancel', () => { press = null; });
  board.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !press && ghost) { ghost = null; render(); } });
  board.addEventListener('contextmenu', e => { e.preventDefault(); turn(1); });
  board.addEventListener('wheel', e => { if (held < 0) return; e.preventDefault(); turn(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  trayEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) take(+b.dataset.k); });
  rl.onclick = () => turn(-1); rr.onclick = () => turn(1); drop.onclick = putBack; ok.onclick = commit;
  const onKey = e => {
    if (phase !== 'play') return;
    if (e.key === 'q' || e.key === 'Q') turn(-1);
    else if (e.key === 'e' || e.key === 'E') turn(1);
    else if (e.key === 'Escape') putBack();
    else if (/^Arrow/.test(e.key) && held >= 0) {
      e.preventDefault();
      const g = ghost || { gx: 7, gy: 7 }, d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      aim(g.gx + d[0], g.gy + d[1]);
    } else if ((e.key === 'Enter' || e.key === ' ') && held >= 0) { e.preventDefault(); commit(); }
  };
  addEventListener('keydown', onKey);

  intro(stage, {
    big: '木材合わせ', title: `${n} 块木料 · 限时 ${total} 秒`,
    lines: ['木板上浅色的格子是<b>凹槽</b>。从「建材」里<b>自己挑</b>一块木料，旋转后嵌进去。', '电脑：悬停预览、点击嵌入，右键或滚轮旋转。手机：在木板上拖动定位，再点木料影子或「決定」。', '有的凹槽由几块料拼成，全盘拼法<b>只有一种</b>；木料不能翻面，放下就不能取回。'],
    onStart() {
      try { puzzle = generate(L); } catch (err) { stage.replaceChildren(el('div', { class: 'panel intro' }, '出题失败，请重试')); return; }
      stage.replaceChildren(panel); build();
      setTimeout(() => panel.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0); // 手机上让木板、按钮、建材尽量都在一屏里
      timer = countdown(total, { onTick: (l, t) => bar.set(l, t), onEnd: end });
      timer.start();
    },
  });
  return { destroy() { phase = 'done'; timer?.stop(); removeEventListener('keydown', onKey); } };
}

export default {
  id: 'repair', kanji: '建', name: '修补', jp: '木材合わせ', skill: '建築（補修）', color: '#8a5a2c',
  tagline: '自己挑木料，旋转后严丝合缝地嵌进木板', levels: LEVELS, mount,
  rules: `<ul>
    <li>原作里城防的「補修」、增筑和造船，都要玩建築技能的这个小游戏。</li>
    <li>木板上浅色的格子是<b>凹槽</b>。从「建材」栏里<b>自己挑</b>一块木料，旋转后嵌进凹槽；「解除」把手里的木料放回去。</li>
    <li>木料是原作里的那几种：四格的一字、田字、T、L、J，五格的十字、コ字、W、F、S/Z（F 和 S/Z 各有左右两种）。每局 8 + 等级 块，各不相同。</li>
    <li>木料可以旋转，<b>不能翻面</b>。几块料挨在一起形成的复合凹槽，全盘拼法<b>只有一种</b>；放下的木料不能取回。</li>
    <li>限时 = 木料数 × (2 + ⌊(政务+知谋)÷40⌋) 秒。全部嵌好 80 分起，剩余时间越多分越高；没嵌完按填满的格数给分。</li>
  </ul><p class="tip">先放形状独一无二、只有一个位置放得下的；看不准的复合凹槽留到最后——别处用掉一块，剩下的拼法就定了。</p>`,
  _test: { generate, countFills, SHAPES, ORIENTS },
};
