(() => {
  const container = document.querySelector('[data-clustrmaps="globe"]');
  if (!container) return;

  const scriptSrc = container.getAttribute('data-clustrmaps-src');
  const widgetSelector = 'canvas, iframe, svg, object';
  let scriptInjected = false;
  let retryScheduled = false;
  let retryCount = 0;
  const maxRetries = 1;

  const isDesktop = () => !window.matchMedia('(max-width: 1023px)').matches;
  const hasWidget = () => Boolean(container.querySelector(widgetSelector));

  const injectScript = (useCacheBuster = false) => {
    if (!scriptSrc || scriptInjected || hasWidget()) return;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'clstr_globe';
    script.async = true;
    script.src = useCacheBuster ? `${scriptSrc}&t=${Date.now()}` : scriptSrc;
    scriptInjected = true;
    script.addEventListener('load', () => {
      // ClustrMaps injects its widget asynchronously after the loader script runs.
      requestAnimationFrame(resizeWidget);
      scheduleRetry();
    });
    script.addEventListener('error', () => {
      scriptInjected = false;
      script.remove();
      scheduleRetry(true);
    });
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

  const scheduleRetry = (immediate = false) => {
    if (retryScheduled || retryCount >= maxRetries) return;
    retryScheduled = true;
    window.setTimeout(() => {
      retryScheduled = false;
      if (hasWidget() || !isDesktop()) return;
      const oldScript = container.querySelector('#clstr_globe');
      if (oldScript) oldScript.remove();
      scriptInjected = false;
      retryCount += 1;
      injectScript(true);
    }, immediate ? 250 : 2200);
  };

  const ensureWidget = () => {
    if (!isDesktop()) return;
    resizeWidget();
    if (!hasWidget()) {
      injectScript();
      scheduleRetry();
    }
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
