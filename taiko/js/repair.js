// 建築 · 木材合わせ（城的「補修」就用这个）：从左边的「建材」里自己挑一块木料，旋转后嵌进木板上的凹槽。全部凹槽的拼法只有一种
import { el } from './lib.js';
import { LEVELS, STAT, grade, intro, countdown, timeBar, pick, shuffle, rulesHTML } from './kit.js';

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
const TOUCH = matchMedia('(pointer: coarse)').matches; // 手机、平板：点按操作，提示也不提右键和键盘
// 玩法要点：开场卡片和「玩法」弹窗共用
const HOW = [
  ['目标', '把木料全部嵌进木板上浅色的<b>凹槽</b>，一格不剩。'],
  ['操作', TOUCH ? '点一块建材，再点凹槽放下（会自动吸附）；再点一下这块建材就旋转。' : '挑一块建材，移到木板上点击嵌入；右键、滚轮或 Q / E 旋转。'],
  ['注意', '木料<b>不能翻面</b>，放下就取不回；全盘拼法只有一种。'],
];

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

  const HINT = TOUCH
    ? { start: '点一块建材，再点木板上的凹槽', held: '点凹槽放下（会自动吸附）；再点一下这块建材可以旋转', ready: '位置合适：再点一下影子或「決定」嵌进去' }
    : { start: '先从「建材」里挑一块木料', held: '移到木板上点击嵌入；右键、滚轮或 Q / E 旋转', ready: '位置合适：点击嵌入' };
  const bar = timeBar();
  const board = el('div', { class: 'wd-board', style: { '--g': G } });
  const ghostLayer = el('div', { class: 'wd-ghost' });
  const trayEl = el('div', { class: 'wd-tray' });
  const msg = el('div', { class: 'msg' }, HINT.start);
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
    ghostLayer.className = 'wd-ghost' + (ghost ? (ghost.ok ? ' ok' : ghost.idle ? ' idle' : ' no') : '');
    ghostLayer.replaceChildren(...(has && ghost ? ghost.abs.filter(([x, y]) => x >= 0 && y >= 0 && x < G && y < G).map(([x, y]) =>
      el('i', { style: { left: `${(x / G) * 100}%`, top: `${(y / G) * 100}%` } })) : []));
  }
  const curCells = () => rotate(SHAPES[tray[held].type], turns);
  const fits = abs => abs.every(([x, y]) => x >= 0 && y >= 0 && x < G && y < G && hole[y * G + x] && fill[y * G + x] < 0);
  // (gx, gy) 这一格对准木料中心那一格。触屏上 2 格以内有能整块放下的位置就吸过去（手指点不准也能放）；
  // 鼠标一点就嵌入，不吸附，免得嵌到没瞄准的地方。idle：还没往木板上点过，影子只是给人看形状，放不下也不标红
  function aim(gx, gy, snap = TOUCH ? 2 : 0, idle = false) {
    if (held < 0 || phase !== 'play') return;
    gx = Math.max(0, Math.min(G - 1, gx)); gy = Math.max(0, Math.min(G - 1, gy));
    const cells = curCells(), w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
    const at = (cx, cy) => cells.map(([x, y]) => [cx - Math.floor((w - 1) / 2) + x, cy - Math.floor((h - 1) / 2) + y]);
    let best = null;
    for (let dy = -snap; dy <= snap; dy++) for (let dx = -snap; dx <= snap; dx++) {
      const abs = at(gx + dx, gy + dy);
      if (fits(abs) && (!best || dx * dx + dy * dy < best.d)) best = { d: dx * dx + dy * dy, abs, cx: gx + dx, cy: gy + dy };
    }
    ghost = best ? { gx: best.cx, gy: best.cy, abs: best.abs, ok: true } : { gx, gy, abs: at(gx, gy), ok: false, idle };
    render();
  }
  const reaim = () => (ghost ? aim(ghost.gx, ghost.gy, ghost.idle ? 0 : undefined, ghost.idle) : render());
  function take(k) {
    if (phase !== 'play' || tray[k].used) return;
    if (held === k) return turn(1); // 再点一下已选中的木料：顺时针转 90°
    held = k; turns = 0;
    msg.textContent = HINT.held;
    if (ghost) reaim();
    else if (TOUCH) aim(7, 7, 0, true); // 触屏上先把影子放在木板中间，看得见木料的形状和大小
    else render();
  }
  function putBack() { if (held < 0) return; held = -1; ghost = null; msg.textContent = '放回建材栏了'; render(); }
  function turn(d) { if (held < 0 || phase !== 'play') return; turns = (turns + d + 4) % 4; reaim(); }
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
      onGhost: !!ghost && ghost.ok && ghost.abs.some(([x, y]) => x === gx && y === gy) }; // 只有点在放得下的影子上才算嵌入
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
    if (!p.moved && p.onGhost) { commit(); return; }
    if (!p.moved) aim(...cellAt(e));
    msg.textContent = ghost && ghost.ok ? HINT.ready : '这里放不进去，换个地方或旋转一下';
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
      aim(g.gx + d[0], g.gy + d[1], 0); // 方向键一格一格走，不吸附，否则会被吸回原处走不动
    } else if ((e.key === 'Enter' || e.key === ' ') && held >= 0) { e.preventDefault(); commit(); }
  };
  addEventListener('keydown', onKey);

  intro(stage, {
    big: '木材合わせ', title: `${n} 块木料 · 限时 ${total} 秒`,
    lines: HOW,
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
  rules: rulesHTML([...HOW, ['计分', '全部嵌好 80 分起，剩的时间越多分越高；没嵌完按填了多少格算。']],
    '先放只有一个地方放得下的木料；几块料连成的大凹槽留到最后，那时剩下的料已经不多了。'),
  _test: { generate, countFills, SHAPES, ORIENTS },
};
