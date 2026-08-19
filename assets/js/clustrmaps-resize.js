/**
 * ClustrMaps 访客地球仪。
 *
 * 之前的写法有三个问题：页面一加载就注入脚本、失败后还会带 cache buster 再注入一次、
 * 且没有任何超时。clustrmaps.com 在部分网络下不可达时，两个请求会各自挂 70 秒以上才超时，
 * 控制台留下一串 ERR_CONNECTION_TIMED_OUT，容器最后是空的。
 *
 * 现在：滚动到侧栏才开始加载，超过 LOAD_TIMEOUT 没出现组件就安静地把容器收起来，
 * 不重试、不报错、不占位。能连上 clustrmaps 的访客照常看到地球仪。
 */
(() => {
  const container = document.querySelector('[data-clustrmaps="globe"]');
  if (!container) return;

  const scriptSrc = container.getAttribute('data-clustrmaps-src');
  if (!scriptSrc) return;

  const WIDGET_SELECTOR = 'canvas, iframe, svg, object';
  const LOAD_TIMEOUT = 8000;   // 超过这个时间还没渲染出来就放弃
  let started = false;
  let finished = false;

  const isDesktop = () => !window.matchMedia('(max-width: 1023px)').matches;
  const hasWidget = () => Boolean(container.querySelector(WIDGET_SELECTOR));

  const resizeWidget = () => {
    const size = container.clientWidth;
    if (!size) return;
    const widget = container.querySelector(WIDGET_SELECTOR);
    if (!widget) return;
    container.style.height = `${size}px`;
    widget.style.width = '100%';
    widget.style.height = '100%';
    widget.style.display = 'block';
  };

  const giveUp = () => {
    if (finished) return;
    finished = true;
    if (hasWidget()) return;
    // 连不上就当它不存在，不要留一个空洞
    container.style.display = 'none';
    const script = container.querySelector('#clstr_globe');
    if (script) script.remove();
  };

  const start = () => {
    if (started || !isDesktop()) return;
    started = true;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'clstr_globe';
    script.async = true;
    script.src = scriptSrc;
    script.addEventListener('error', giveUp);
    container.appendChild(script);

    const timer = window.setTimeout(giveUp, LOAD_TIMEOUT);

    // 组件是脚本跑完之后异步插进来的，插进来就调整尺寸并停止计时
    if (typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => {
        if (!hasWidget()) return;
        window.clearTimeout(timer);
        finished = true;
        resizeWidget();
        mo.disconnect();
      });
      mo.observe(container, { childList: true, subtree: true });
    }
  };

  // 滚动到侧栏可见时才加载；不支持 IntersectionObserver 的浏览器等 load 之后再说
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '200px' });
    io.observe(container);
  } else {
    window.addEventListener('load', start);
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resizeWidget).observe(container);
  }
  window.addEventListener('resize', () => {
    if (isDesktop()) resizeWidget();
  });
})();
