// 忍術 · 人物捜索：挂轴里的画像从下往上慢慢露出来（先看到衣服，最后才看到脸），在一群人里认出他。共 6 问
// 头像默认是公有领域的战国人物历史画像；也可以载入自己的头像（比如原作立绘），只存在本机浏览器里
import { el } from './lib.js';
import { LEVELS, STAT, grade, intro, pick, shuffle } from './kit.js';

// 原作：候选 3×3、4×3、4×4、5×4、5×5
const GRID = [[3, 3], [4, 3], [4, 4], [5, 4], [5, 5]];
// 越高级，干扰项里衣服颜色跟目标相近的越多——衣服最先露出来，不能光靠它提前认人
const SIMILAR = [0, 0.3, 0.5, 0.7, 0.85];
const QUESTIONS = 6;
const MAX_MISS = 3; // 原作：可以认错 3 次，第 4 次直接结束
const MIN_FACES = 9;

// ---------- 头像包 ----------
const DB = 'tk1-faces', ST = 'faces';
let pack = null; // { kind: 'default' | 'custom', faces: [{ n, g, url, c }] }
const openDb = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(ST, { autoIncrement: true });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function dbAll() {
  const db = await openDb();
  return new Promise((res, rej) => {
    const out = [], req = db.transaction(ST).objectStore(ST).openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } else res(out); };
    req.onerror = () => rej(req.error);
  });
}
async function dbPut(items) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(ST, 'readwrite'), st = tx.objectStore(ST);
    st.clear(); items.forEach(i => st.add(i));
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
function dropPack() { if (pack?.kind === 'custom') pack.faces.forEach(f => URL.revokeObjectURL(f.url)); pack = null; }
async function loadPack() {
  if (pack) return pack;
  try {
    const saved = await dbAll();
    if (saved.length >= MIN_FACES) return (pack = { kind: 'custom', faces: saved.map(s => ({ n: s.n, g: s.g, c: s.c, url: URL.createObjectURL(s.blob) })) });
  } catch (e) { /* 隐私模式等：只能用默认头像 */ }
  const man = await fetch('faces/index.json').then(r => r.json());
  return (pack = { kind: 'default', credit: man.credit, faces: man.faces.map(f => ({ n: f.n, g: '', c: f.c, url: `faces/${f.f}` })) });
}
// 载入自己的图片：缩到 320px 以内存成 JPEG，顺便算出衣服（下方 40%）的平均色；子文件夹名当分组
async function importFiles(files) {
  const out = [];
  for (const file of [...files].filter(f => /^image\//.test(f.type)).slice(0, 400)) {
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, 320 / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
      const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = cv.getContext('2d');
      g.drawImage(bmp, 0, 0, w, h); bmp.close?.();
      const px = g.getImageData(0, Math.floor(h * 0.6), w, h - Math.floor(h * 0.6)).data, c = [0, 0, 0];
      for (let i = 0; i < px.length; i += 4) { c[0] += px[i]; c[1] += px[i + 1]; c[2] += px[i + 2]; }
      const cnt = px.length / 4 || 1;
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86));
      const parts = (file.webkitRelativePath || '').split('/');
      out.push({ n: file.name.replace(/\.[^.]+$/, ''), g: parts.length > 2 ? parts[parts.length - 2] : '', c: c.map(v => Math.round(v / cnt)), blob });
    } catch (e) { /* 读不了的图片跳过 */ }
  }
  return out;
}

// ---------- 出题 ----------
const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
function gridFor(L, count) { // 头像不够时退回小一号的格子
  for (let l = L; l >= 0; l--) if (GRID[l][0] * GRID[l][1] <= count) return GRID[l];
  return null;
}
function makeRound(L, faces, avoid = new Set()) {
  const [cols, rows] = gridFor(L, faces.length), need = cols * rows - 1;
  const fresh = faces.filter(f => !avoid.has(f));
  const target = pick(fresh.length ? fresh : faces);
  const others = faces.filter(f => f !== target);
  const chosen = new Set();
  // 原作：候选基本都是同一职业的人。自己的头像按子文件夹分组，同组的先放进来
  if (target.g) for (const f of shuffle(others.filter(f => f.g === target.g))) { if (chosen.size >= need) break; chosen.add(f); }
  const nSim = Math.round(need * SIMILAR[L]);
  for (const f of others.slice().sort((a, b) => dist(a.c, target.c) - dist(b.c, target.c))) { if (chosen.size >= nSim) break; chosen.add(f); }
  for (const f of shuffle(others.slice())) { if (chosen.size >= need) break; chosen.add(f); }
  return { target, cands: shuffle([target, ...chosen]), cols, rows };
}
const decoded = new Map();
// 等图片下载完再出题；不用 img.decode()——页面在后台时它可能一直不返回。另加 3 秒兜底，坏图也不会卡住
const preload = url => {
  if (!decoded.has(url)) {
    const im = new Image();
    decoded.set(url, new Promise(res => { im.onload = im.onerror = res; setTimeout(res, 3000); }));
    im.src = url;
  }
  return decoded.get(url);
};

function mount(stage, ctx) {
  const L = +ctx.level;
  const thirds = 12 + (STAT + STAT) / 5;       // 原作：12 + (武力+知谋)/5，单位是 1/3 秒
  const limit = Math.floor(thirds) / 3;         // 秒
  const reveal = limit * 0.72;                  // 画像在这段时间里从下往上完全露出
  let qi = 0, pts = 0, miss = 0, marks = [], round = null, t0 = 0, held = 0, holdUntil = 0, raf = 0, phase = 'idle', timers = [], dead = false;
  const asked = new Set();

  const no = el('b', { class: 'nj-no' });
  const gourds = el('span', { class: 'nj-gourds', title: '还能认错几次' });
  const bar = el('div', { class: 'bar' }, el('i'));
  const face = el('div', { class: 'nj-face' });
  const scroll = el('div', { class: 'nj-scroll' }, el('div', { class: 'nj-rod' }), el('div', { class: 'nj-paper' }, face), el('div', { class: 'nj-rod b' }));
  const note = el('div', { class: 'nj-note' });
  const grid = el('div', { class: 'nj-grid' });
  const panel = el('div', { class: 'panel nj' },
    el('div', { class: 'hud' }, no, gourds), el('div', { class: 'nj-bar' }, bar),
    el('div', { class: 'nj-main' }, el('div', { class: 'nj-left' }, scroll, note), grid));

  const img = url => el('img', { src: url, alt: '', draggable: 'false' });
  const drawGourds = () => { gourds.innerHTML = Array.from({ length: MAX_MISS }, (_, i) => `<i class="${i < MAX_MISS - miss ? '' : 'gone'}"><svg viewBox="0 0 20 24"><circle cx="10" cy="17" r="6.5"/><circle cx="10" cy="8" r="4.2"/><path d="M10 1v3" stroke-width="2"/></svg></i>`).join(''); };
  async function ask() {
    round = makeRound(L, pack.faces, asked); asked.add(round.target); qi++;
    phase = 'load';
    await Promise.all(round.cands.map(f => preload(f.url)));
    if (dead) return;
    no.textContent = `${String(qi).padStart(2, '0')}/${String(QUESTIONS).padStart(2, '0')}問`;
    face.replaceChildren(img(round.target.url)); face.style.clipPath = 'inset(100% 0 0 0)';
    grid.style.setProperty('--cols', round.cols);
    grid.replaceChildren(...round.cands.map((p, i) => el('button', { class: 'nj-cand', 'data-i': i, 'aria-label': `候选 ${i + 1}` }, img(p.url))));
    note.textContent = '仔细看……'; note.className = 'nj-note';
    t0 = performance.now(); held = 0; holdUntil = 0; phase = 'ask';
    raf = requestAnimationFrame(tick);
  }
  const elapsed = now => (now - t0 - held) / 1000;
  // 认错后的停顿到点了就解除（停顿的 1.2 秒不计时）
  function releaseHold(now) {
    if (!holdUntil || now < holdUntil) return !holdUntil;
    held += 1200; holdUntil = 0; note.textContent = ''; note.className = 'nj-note';
    return true;
  }
  function tick(now) {
    if (phase !== 'ask') return;
    if (!releaseHold(now)) { raf = requestAnimationFrame(tick); return; }
    const e = elapsed(now);
    face.style.clipPath = `inset(${(1 - Math.min(1, e / reveal)) * 100}% 0 0 0)`;
    bar.firstChild.style.width = `${Math.max(0, 100 - (e / limit) * 100)}%`;
    bar.firstChild.classList.toggle('low', e > limit * 0.6);
    if (e >= limit) { settle('×', 10 / 3, '時間切れ'); return; }
    raf = requestAnimationFrame(tick);
  }
  function settle(mark, p, text) {
    phase = 'judge'; cancelAnimationFrame(raf);
    pts += p; marks.push(mark);
    face.style.clipPath = 'none';
    grid.children[round.cands.indexOf(round.target)].classList.add('answer');
    note.className = 'nj-note ' + (mark === '×' ? 'ng' : 'ok');
    note.replaceChildren(`${text} · ${mark}`, el('br'), el('small', null, round.target.n)); // 名字可能来自用户的文件名，不走 innerHTML
    timers.push(setTimeout(() => (qi < QUESTIONS ? ask() : end()), mark === '×' ? 1700 : 1100));
  }
  function choose(i) {
    if (phase !== 'ask' || !releaseHold(performance.now())) return;
    const e = elapsed(performance.now());
    if (e >= limit) { settle('×', 10 / 3, '時間切れ'); return; } // 动画帧没来得及结算时，以点击时刻为准
    if (round.cands[i] === round.target) {
      // 原作：大约在时限的 60% 以内答对为 ◎（50/3 分），之后答对为 ○（10 分）
      if (e <= limit * 0.6) settle('◎', 50 / 3, '早期発見'); else settle('○', 10, '発見');
      return;
    }
    miss++; drawGourds();
    grid.children[i].classList.add('wrong'); grid.children[i].disabled = true;
    if (miss > MAX_MISS) { phase = 'done'; cancelAnimationFrame(raf); note.className = 'nj-note ng'; note.textContent = '认错太多次了'; timers.push(setTimeout(end, 1100)); return; }
    // 认错时画像停住一会儿（原作玩家会故意利用这一下多看两眼）
    holdUntil = performance.now() + 1200;
    note.className = 'nj-note ng'; note.textContent = '人違いだったか…';
  }
  function end() {
    phase = 'done';
    while (marks.length < QUESTIONS) marks.push('—');
    const g = grade(pts);
    ctx.finish({ ...g, detail: `${marks.join(' ')} · 认错 ${Math.min(miss, MAX_MISS + 1)} 次 · <b>${g.score}</b> 分<br>${g.note}` });
  }
  grid.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && !b.disabled) choose(+b.dataset.i); });
  // 切到别的标签页时停表：回来后把离开的时间扣掉
  let hiddenAt = 0;
  const onVis = () => {
    if (document.hidden) hiddenAt = performance.now();
    else if (hiddenAt) { const gap = performance.now() - hiddenAt; hiddenAt = 0; if (phase === 'ask') { held += gap; if (holdUntil) holdUntil += gap; } }
  };
  document.addEventListener('visibilitychange', onVis);

  // ---------- 开场：头像包 ----------
  const info = el('div', { class: 'nj-pack-info' }, '头像载入中…');
  const pickFiles = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const pickDir = el('input', { type: 'file', multiple: true, hidden: true });
  const canDir = 'webkitdirectory' in pickDir;
  if (canDir) pickDir.webkitdirectory = true;
  const bFiles = el('button', { class: 'btn' }, '载入图片…');
  const bDir = canDir ? el('button', { class: 'btn' }, '载入文件夹…') : null;
  const bReset = el('button', { class: 'btn hidden' }, '恢复默认');
  const packBox = el('div', { class: 'nj-pack' }, info, el('div', { class: 'btns' }, bFiles, bDir, bReset, pickFiles, pickDir),
    el('p', { class: 'nj-pack-note' }, '想用原作立绘，可以载入你自己从游戏里导出的头像（至少 9 张）。图片只保存在这个浏览器里，不会上传；放在子文件夹里会按文件夹分组出题。'));
  let go = null;
  function showPack() {
    if (!pack) return;
    const n = pack.faces.length;
    info.innerHTML = pack.kind === 'default'
      ? `头像：<b>战国人物历史画像 ${n} 人</b><br><small>${pack.credit}</small>`
      : `头像：<b>自己载入的 ${n} 张</b>`;
    bReset.classList.toggle('hidden', pack.kind !== 'custom');
    if (go) go.disabled = n < MIN_FACES;
  }
  async function useFiles(files) {
    if (!files || !files.length) return;
    info.textContent = '处理中…'; if (go) go.disabled = true;
    const items = await importFiles(files);
    if (dead) return;
    if (items.length < MIN_FACES) { ctx.toast(`至少要 ${MIN_FACES} 张图片，这次只读到 ${items.length} 张`); showPack(); return; }
    let saved = true;
    try { await dbPut(items); } catch (e) { saved = false; }
    dropPack();
    pack = { kind: 'custom', faces: items.map(s => ({ n: s.n, g: s.g, c: s.c, url: URL.createObjectURL(s.blob) })) };
    ctx.toast(saved ? `载入了 ${items.length} 张头像` : `载入了 ${items.length} 张（浏览器不让保存，刷新后会恢复默认）`, 3200);
    showPack();
  }
  bFiles.onclick = () => pickFiles.click();
  if (bDir) bDir.onclick = () => pickDir.click();
  pickFiles.onchange = () => { useFiles(pickFiles.files); pickFiles.value = ''; };
  pickDir.onchange = () => { useFiles(pickDir.files); pickDir.value = ''; };
  bReset.onclick = async () => { try { await dbPut([]); } catch (e) { } dropPack(); await loadPack(); if (!dead) { showPack(); ctx.toast('已恢复默认头像'); } };

  const [c, r] = GRID[L];
  const box = intro(stage, {
    big: '人物捜索', title: `${c}×${r} 人中找一个 · 共 ${QUESTIONS} 问`,
    lines: ['左边挂轴里的画像会<b>从下往上</b>慢慢露出来：先看到衣服，最后才看到脸。', '在右边的人群里点出同一个人。越早认出越好——时限 60% 以内答对是 ◎。', `认错会让画像停一下，但最多只能错 ${MAX_MISS} 次。`],
    extra: packBox,
    onStart() { stage.replaceChildren(panel); drawGourds(); setTimeout(() => panel.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0); ask(); },
  });
  go = box.querySelector('.intro-go');
  go.disabled = true;
  loadPack().then(p => { if (dead) return; showPack(); p.faces.forEach(f => preload(f.url)); })
    .catch(() => { info.textContent = '头像载入失败，请刷新重试'; });
  return { destroy() { dead = true; phase = 'done'; cancelAnimationFrame(raf); timers.forEach(clearTimeout); document.removeEventListener('visibilitychange', onVis); } };
}

export default {
  id: 'ninja', kanji: '忍', name: '忍术', jp: '人物捜索', skill: '忍術', color: '#34364a',
  tagline: '画像从下往上慢慢露出，在人群里认出他', levels: LEVELS, mount,
  rules: `<ul>
    <li>左边挂轴里的画像会<b>从下往上</b>慢慢露出来：先是衣服，最后才是脸。在右边的人群里点出这个人。</li>
    <li>候选人数随等级变多：3×3、4×3、4×4、5×4、5×5。等级越高，衣服颜色相近的人越多，得等脸露出来才分得清。</li>
    <li>每问：时限 60% 以内答对 <b>◎</b>（50/3 分），之后答对 <b>○</b>（10 分），超时 <b>×</b>（10/3 分）。共 6 问，81 分以上为「上出来」。</li>
    <li>可以认错 3 次，第 4 次直接结束。认错时画像会停一下。限时 = (12 + (武力+知谋)÷5) × ⅓ 秒。</li>
    <li>默认头像是公有领域的战国人物历史画像（Wikimedia Commons）。原作用的是游戏里的人物立绘；想要原汁原味，可以在开始前载入你自己从游戏里导出的头像，只存在本机浏览器里。</li>
  </ul><p class="tip">先扫一眼右边所有人的衣服颜色，画像露出衣服时缩小范围；高等级时同色的人多，等脸露出来再下手。</p>`,
  _test: { makeRound, gridFor },
};
