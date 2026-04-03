(() => {
  const container = document.querySelector('[data-clustrmaps="globe"]');
  if (!container) return;

  const scriptSrc = container.getAttribute('data-clustrmaps-src');
  const widgetSelector = 'canvas, iframe, svg, object';
  let scriptInjected = false;

  const isDesktop = () => !window.matchMedia('(max-width: 1023px)').matches;
  const hasWidget = () => Boolean(container.querySelector(widgetSelector));

  const injectScript = () => {
    if (!scriptSrc || scriptInjected || hasWidget()) return;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'clstr_globe';
    script.async = true;
    script.src = scriptSrc;
    scriptInjected = true;
    script.addEventListener('load', () => {
      // ClustrMaps injects its widget asynchronously after the loader script runs.
      requestAnimationFrame(resizeWidget);
    };
    container.appendChild(script);
  };

  const resizeWidget = () => {
    const size = container.clientWidth;
    if (!size) return;
    container.style.height = `${size}px`;
    const widget = container.querySelector(widgetSelector);
    if (widget) {
      widget.style.width = '100%';
      widget.style.height = '100%';
      widget.style.display = 'block';
    }
  };

  const ensureWidget = () => {
    if (!isDesktop()) return;
    resizeWidget();
    injectScript();
  };

  ensureWidget();

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      resizeWidget();
    });
    observer.observe(container);
  }

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      resizeWidget();
    });
    observer.observe(container, { childList: true, subtree: true });
  }

  window.addEventListener('resize', ensureWidget);
  window.addEventListener('load', () => {
    ensureWidget();
    resizeWidget();
  });
})();
