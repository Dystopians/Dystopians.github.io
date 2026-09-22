// 医術 · 薬調合：只操作三把杓子。先点一把杓子拿起来，再点目标——药壶（空杓舀满、有药倒回）、另一把杓子（倒到对方满或自己空）、茶碗（整杓倒进去）
import { el, svg } from './lib.js';
import { LEVELS, STAT, grade, intro, countdown, timeBar, pick, rint } from './kit.js';

// 原作画面里见过的杓子容量组合（都互质，任何 1~9 的量都能配出来）
const CAP_SETS = [[9, 5, 4], [8, 5, 4], [8, 5, 3], [7, 6, 3], [9, 7, 4], [7, 5, 3]];
// 原作：见習 2 种药 2 只碗，等级越高药和碗越多（最多 3 种 3 只）
const CFG = [
  { meds: 2, cups: 2, lo: 1, hi: 9, zero: 0 },
  { meds: 2, cups: 3, lo: 1, hi: 9, zero: 0 },
  { meds: 3, cups: 2, lo: 1, hi: 9, zero: 0.15 },
  { meds: 3, cups: 3, lo: 1, hi: 8, zero: 0.2 },
  { meds: 3, cups: 3, lo: 1, hi: 9, zero: 0.12 },
];
// 原作三种药的配色：① 赭、② 绿、③ 蓝
const MEDS = [{ n: '①', c: '#b0642a' }, { n: '②', c: '#4f7d3a' }, { n: '③', c: '#3d5f8f' }];
const CUP_NAMES = ['い', 'ろ', 'は'];

// 三个药壶：吊锅、铁瓶、带盖的壶
const POTS = [
  `<path d="M8 22h32c0 10-7 17-16 17S8 32 8 22z" fill="#2f2a26"/><ellipse cx="24" cy="22" rx="16" ry="4" fill="#4a423b"/><ellipse cx="24" cy="22" rx="12.5" ry="2.6" fill="var(--mc)"/>
   <path d="M9 21C9 8 39 8 39 21" fill="none" stroke="#2f2a26" stroke-width="2.2"/><path d="M4 22h4M40 22h4" stroke="#2f2a26" stroke-width="2.6" stroke-linecap="round"/>`,
  `<path d="M12 20q12-7 24 0c4 5 4 14-2 18q-10 5-20 0c-6-4-6-13-2-18z" fill="#2f2a26"/><path d="M35 25l8-5-1 4-5 5z" fill="#2f2a26"/>
   <path d="M15 19c0-9 18-9 18 0" fill="none" stroke="#2f2a26" stroke-width="2.2"/><ellipse cx="24" cy="18.5" rx="5" ry="1.8" fill="var(--mc)"/><circle cx="24" cy="15.5" r="1.8" fill="#4a423b"/>`,
  `<path d="M13 16h22l3 6c2 9-3 16-14 16S8 31 10 22z" fill="#2f2a26"/><path d="M11 16q13-6 26 0" fill="#4a423b"/><rect x="21" y="9" width="6" height="4" rx="2" fill="#4a423b"/>
   <path d="M6 40h36" stroke="#2f2a26" stroke-width="2.4" stroke-linecap="round"/><path d="M14 27h20" stroke="var(--mc)" stroke-width="2" opacity=".85"/>`,
];
const LADLE = '<svg class="md-icon" viewBox="0 0 40 16" aria-hidden="true"><path d="M3 5h12v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#c9a877" stroke="#8a6a3a" stroke-width="1"/><path d="M14 7l24-5" stroke="#8a6a3a" stroke-width="2.2" stroke-linecap="round"/></svg>';

function mount(stage, ctx) {
  const L = +ctx.level, C = CFG[L];
  const caps = (L === 0 ? [9, 5, 4] : pick(CAP_SETS).slice()).sort((a, b) => b - a); // 原作从上到下：大、中、小
  const total = 24 + L * 4 + (STAT + STAT) / 5; // 原作：24 + 等级×4 + (知谋+魅力)/5 秒
  const cups = Array.from({ length: C.cups }, () => {
    const target = Array.from({ length: C.meds }, () => (Math.random() < C.zero ? 0 : rint(C.lo, C.hi)));
    if (target.every(v => v === 0)) target[0] = rint(C.lo, C.hi);
    // 避免整碗都是杓子容量本身那么省事
    if (target.every(v => v === 0 || caps.includes(v))) target[rint(0, C.meds - 1)] = pick([1, 2, 6, 7].filter(x => !caps.includes(x)));
    return { target, cur: Array(C.meds).fill(0), done: false };
  });
  const ladles = caps.map(cap => ({ cap, med: -1, amt: 0 }));
  let sel = -1, hover = null, phase = 'play', timer = null, moves = 0;

  const bar = timeBar();
  const potsEl = el('div', { class: 'md-col md-pots' });
  const ladlesEl = el('div', { class: 'md-col md-ladles' });
  const cupsEl = el('div', { class: 'md-col md-cups' });
  const arrows = svg('svg', { class: 'md-arrows', 'aria-hidden': 'true' });
  const table = el('div', { class: 'md-table' }, potsEl, ladlesEl, cupsEl, arrows);
  const msg = el('div', { class: 'msg' }, '先点一把杓子拿起来');
  const release = el('button', { class: 'btn' }, '杓解除');
  const emptyAll = el('button', { class: 'btn' }, '杓を空に');
  const panel = el('div', { class: 'panel md' }, bar.el, table, msg, el('div', { class: 'btns' }, release, emptyAll));

  // ---------- 规则 ----------
  const ladleTo = (a, b) => a !== b && a.amt > 0 && b.amt < b.cap && (b.med === -1 || b.med === a.med);
  function legal(dst) {
    if (sel < 0) return false;
    const l = ladles[sel];
    if (dst.t === 'pot') return l.amt === 0 || l.med === dst.i; // 空杓去舀；有药的只能倒回自己那一壶
    if (dst.t === 'ladle') return ladleTo(l, ladles[dst.i]);
    if (dst.t === 'cup') return l.amt > 0 && !cups[dst.i].done;
    return false;
  }
  function act(dst) {
    const l = ladles[sel];
    moves++;
    if (dst.t === 'pot') {
      if (l.amt === 0) { l.med = dst.i; l.amt = l.cap; return `${MEDS[dst.i].n} 舀满了 ${l.cap}`; }
      l.amt = 0; l.med = -1; return '倒回药壶了';
    }
    if (dst.t === 'ladle') {
      const b = ladles[dst.i], n = Math.min(l.amt, b.cap - b.amt);
      b.med = l.med; b.amt += n; l.amt -= n; if (!l.amt) l.med = -1;
      return `倒过去 ${n}`;
    }
    const cup = cups[dst.i], m = l.med, add = l.amt;
    cup.cur[m] += add; l.amt = 0; l.med = -1;
    // 原作：超过配方就得从头来——药已经混在一起，只能整碗倒掉
    if (cup.cur[m] > cup.target[m]) { cup.cur.fill(0); return `${CUP_NAMES[dst.i]} 的 ${MEDS[m].n} 倒多了，整碗倒掉重配`; }
    if (cup.cur.every((v, k) => v === cup.target[k])) { cup.done = true; return `${CUP_NAMES[dst.i]} 成功`; }
    return `${CUP_NAMES[dst.i]} 加了 ${add}`;
  }

  // ---------- 绘制 ----------
  const hit = (t, i, cls, label) => el('button', { class: `md-hit ${cls}` + (legal({ t, i }) ? ' tgt' : ''), 'data-t': t, 'data-i': i, 'aria-label': label });
  function render() {
    potsEl.replaceChildren(...MEDS.slice(0, C.meds).map((m, i) => {
      const b = hit('pot', i, 'md-pot', `药壶 ${m.n}`);
      b.style.setProperty('--mc', m.c);
      b.innerHTML = `<svg viewBox="0 0 48 44" aria-hidden="true">${POTS[i]}</svg><b>${m.n}</b>`;
      return b;
    }));
    ladlesEl.replaceChildren(...ladles.map((l, i) => {
      const b = hit('ladle', i, 'md-ladle' + (i === sel ? ' sel' : ''), `杓 ${l.amt}/${l.cap}`), col = l.med >= 0 ? MEDS[l.med].c : '';
      if (col) b.style.setProperty('--mc', col);
      b.innerHTML = `${LADLE}<span class="md-gauge">${Array.from({ length: l.cap }, (_, k) => `<i${k < l.amt ? ' class="f"' : ''}></i>`).join('')}</span>
        <span class="md-amt">${l.med >= 0 ? `<em>${MEDS[l.med].n}</em>` : ''}<b>${l.amt}</b>/${l.cap}</span>`;
      return b;
    }));
    cupsEl.replaceChildren(...cups.map((cup, i) => {
      const rows = cup.target.map((t, m) => {
        const ticks = Array.from({ length: t }, (_, k) => `<i${k < cup.cur[m] ? ' class="f"' : ''}></i>`).join('');
        return `<span class="md-row${cup.cur[m] === t ? ' ok' : ''}" style="--mc:${MEDS[m].c}"><span>${MEDS[m].n}</span><b>${cup.cur[m]}/${t}</b><span class="md-ticks">${ticks}</span></span>`;
      }).join('');
      const b = hit('cup', i, 'md-cup' + (cup.done ? ' done' : ''), `茶碗 ${CUP_NAMES[i]}`);
      b.innerHTML = `<span class="md-yunomi"><small>薬</small>${CUP_NAMES[i]}</span><span class="md-recipe">${rows}</span>${cup.done ? '<span class="md-seal">成功</span>' : ''}`;
      return b;
    }));
    drawArrows();
  }
  // 原作那种点点虚线箭头：从拿着的杓子指向每个能倒的地方
  function drawArrows() {
    arrows.replaceChildren();
    if (sel < 0 || phase !== 'play') return;
    const box = table.getBoundingClientRect();
    arrows.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const from = ladlesEl.children[sel].getBoundingClientRect();
    for (const t of table.querySelectorAll('.md-hit.tgt')) {
      const r = t.getBoundingClientRect();
      let x1, y1, x2, y2, mx, my;
      if (r.left >= from.right - 2 || r.right <= from.left + 2) { // 左右两列：从杓子侧边出发
        const right = r.left >= from.right - 2;
        x1 = right ? from.right : from.left; y1 = from.top + from.height / 2;
        x2 = right ? r.left : r.right; y2 = r.top + r.height / 2;
        mx = (x1 + x2) / 2; my = Math.min(y1, y2) - 12;
      } else { // 同一列的另一把杓子：从左侧绕过去
        const down = r.top > from.top;
        x1 = from.left + 10; y1 = down ? from.bottom : from.top;
        x2 = r.left + 10; y2 = down ? r.top : r.bottom;
        mx = x1 - 22; my = (y1 + y2) / 2;
      }
      [x1, x2, mx] = [x1, x2, mx].map(v => v - box.left); [y1, y2, my] = [y1, y2, my].map(v => v - box.top);
      const on = !!hover && t.dataset.t === hover.t && +t.dataset.i === hover.i;
      const a = Math.atan2(y2 - my, x2 - mx), s = 8;
      const p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
      arrows.append(
        svg('path', { class: 'md-dots' + (on ? ' on' : ''), d: `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}` }),
        svg('path', { class: 'md-head' + (on ? ' on' : ''), d: `M${x2} ${y2}L${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}Z` }));
    }
  }
  function finish(all) {
    if (phase !== 'play') return;
    phase = 'done'; timer?.stop(); arrows.replaceChildren();
    const doneN = cups.filter(c => c.done).length;
    const left = timer ? timer.left() : 0;
    // 全部配好：80 分起，剩余时间越多越高；没配完按完成的碗数给分
    const score = all ? 80 + 20 * (left / total) : 80 * (doneN / C.cups);
    const g = grade(score);
    ctx.finish({ ...g, detail: `配好 ${doneN}/${C.cups} 碗 · ${moves} 步${all ? ` · 剩 ${Math.ceil(left)} 秒` : ''} · <b>${g.score}</b> 分<br>${g.note}` });
  }

  table.addEventListener('click', e => {
    if (phase !== 'play') return;
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const dst = { t: b.dataset.t, i: +b.dataset.i };
    if (dst.t === 'ladle' && dst.i === sel) { sel = -1; msg.textContent = '放下杓子了'; render(); return; }
    if (legal(dst)) {
      msg.textContent = act(dst);
      render();
      if (cups.every(c => c.done)) finish(true);
      return;
    }
    if (dst.t === 'ladle') { // 倒不过去就改拿这一把
      sel = dst.i;
      msg.textContent = ladles[sel].amt ? '拿着杓子：点药壶倒回、点别的杓子倒过去、点茶碗倒进去' : '拿着空杓：点药壶舀满';
    } else if (sel < 0) msg.textContent = '先点一把杓子拿起来';
    else if (dst.t === 'pot') msg.textContent = `杓子里是 ${MEDS[ladles[sel].med].n}，只能倒回 ${MEDS[ladles[sel].med].n} 的药壶`;
    else if (dst.t === 'cup') msg.textContent = cups[dst.i].done ? '这碗已经配好了' : '杓子是空的，先去药壶舀';
    render();
  });
  table.addEventListener('pointerover', e => {
    const b = e.target.closest('.md-hit.tgt');
    const h = b ? { t: b.dataset.t, i: +b.dataset.i } : null;
    if ((h && h.t + h.i) !== (hover && hover.t + hover.i)) { hover = h; drawArrows(); }
  });
  table.addEventListener('pointerleave', () => { if (hover) { hover = null; drawArrows(); } });
  release.onclick = () => { if (phase !== 'play') return; sel = -1; msg.textContent = '放下杓子了'; render(); };
  emptyAll.onclick = () => { if (phase !== 'play') return; ladles.forEach(l => { l.amt = 0; l.med = -1; }); msg.textContent = '杓子都倒空了'; render(); };
  const onResize = () => drawArrows();
  addEventListener('resize', onResize);

  intro(stage, {
    big: '薬調合', title: `${C.meds} 种药 · ${C.cups} 只茶碗 · 杓子 ${caps.join(' / ')} · 限时 ${Math.round(total)} 秒`,
    lines: ['只操作<b>杓子</b>：先点一把拿起来，点点虚线会指出它能倒去哪里。', '点药壶：空杓<b>舀满</b>，有药就倒回去。点另一把杓子：倒到对方满或自己空为止。', '点茶碗：整杓倒进去。每种药都要<b>正好</b>等于配方，倒多了整碗作废重配。'],
    onStart() {
      stage.replaceChildren(panel); render();
      timer = countdown(total, { onTick: (l, t) => bar.set(l, t), onEnd: () => finish(false) });
      timer.start();
    },
  });
  return { destroy() { phase = 'done'; timer?.stop(); removeEventListener('resize', onResize); } };
}

export default {
  id: 'medicine', kanji: '医', name: '药物调制', jp: '薬調合', skill: '医術', color: '#8a3b2a',
  tagline: '拿起杓子倒来倒去，按配方精确配药', levels: LEVELS, mount,
  rules: `<ul>
    <li>左边是药壶，中间是三把容量不同的杓子，右边是茶碗和配方。只能操作<b>杓子</b>：先点一把拿起来，点点虚线会指出它能倒去的地方。</li>
    <li><b>杓子 → 药壶</b>：空杓舀满；有药就倒回原来的壶。<b>杓子 → 杓子</b>：倒到对方满、或自己倒空为止。<b>杓子 → 茶碗</b>：整杓倒进去。</li>
    <li>拿着杓子时点别的杓子：能倒就倒过去，倒不了就改拿那一把。「杓解除」放下杓子，「杓を空に」把三把杓子全部倒空。</li>
    <li>每只碗每种药都要<b>正好</b>等于配方才算「成功」；倒多了，整碗倒掉重配。</li>
    <li>限时 = 24 + 等级×4 + (知谋+魅力)÷5 秒。全部配好 80 分起，剩余时间越多分越高，81 分以上为「上出来」。</li>
  </ul><p class="tip">原作攻略的例子：杓子是 8/5/3 时想要 1——拿 3 舀满倒进 5，再舀满倒进 5，3 里就剩下 1。</p>`,
};
