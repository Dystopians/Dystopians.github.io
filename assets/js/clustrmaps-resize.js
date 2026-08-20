/**
 * MapMyVisitors（原 ClustrMaps）访客地球仪。
 *
 * 关于这个挂件的两个硬性要求，都是从他们的 globe.js 里读出来的：
 *
 * 1. script 标签的 id 必须是 mmvst_globe。它内部是 `$("#mmvst_globe")`，
 *    找不到就直接 return，什么都不做。旧的 id 叫 clstr_globe，改域名后必须一起改。
 * 2. 脚本必须在 window load 事件之前就位。显示地球仪的 set_globe() 挂在
 *    `$(window).load(...)` 上，如果等滚动到侧栏再注入，那时 load 早就过了，
 *    骨架会建出来但 .mmvst_inner 永远停在 display:none。
 *    所以这里在 DOMContentLoaded（本文件用 defer 加载）就注入，不做懒加载。
 *
 * 失败兜底：超过 LOAD_TIMEOUT 还没真正显示出来，就把容器收起来，
 * 不重试、不报错、不留空洞。移动端不加载（省 170KB）。
 */
(() => {
  const container = document.querySelector('[data-clustrmaps="globe"]');
  if (!container) return;

  const scriptSrc = container.getAttribute('data-clustrmaps-src');
  if (!scriptSrc) return;

  const SCRIPT_ID = 'mmvst_globe';
  const LOAD_TIMEOUT = 10000;
  let finished = false;

  const isDesktop = () => !window.matchMedia('(max-width: 1023px)').matches;

  // 骨架建出来不等于成功：拿到访客数据之前 .mmvst_inner 一直是 display:none
  const isVisible = () => {
    const inner = container.querySelector('.mmvst_inner');
    return Boolean(inner) && window.getComputedStyle(inner).display !== 'none';
  };

  const settle = () => {
    if (finished) return;
    finished = true;
    if (isVisible()) return;
    container.style.display = 'none';
    const script = container.querySelector('#' + SCRIPT_ID);
    if (script) script.remove();
  };

  if (!isDesktop()) return;

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = scriptSrc;
  script.addEventListener('error', settle);
  container.appendChild(script);

  const timer = window.setTimeout(settle, LOAD_TIMEOUT);

  // 地球仪显示出来就停止计时；尺寸交给挂件自己算（它按父元素宽度渲染）
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => {
      if (!isVisible()) return;
      window.clearTimeout(timer);
      finished = true;
      mo.disconnect();
    });
    mo.observe(container, { childList: true, subtree: true, attributes: true });
  }
})();
