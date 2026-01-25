(() => {
  const container = document.querySelector('[data-clustrmaps="globe"]');
  if (!container) return;

  const originalParent = container.parentElement;
  const originalNextSibling = container.nextElementSibling;
  const main = document.querySelector('#main');
  const article = main ? main.querySelector('article.page') : null;

  const scriptSrc = container.getAttribute('data-clustrmaps-src');
  const widgetSelector = 'canvas, iframe, svg, object';
  const maxReloads = 2;
  let reloads = 0;

  const injectScript = (useCacheBuster = false) => {
    if (!scriptSrc) return;
    if (container.querySelector('#clstr_globe')) return;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'clstr_globe';
    script.async = true;
    script.src = useCacheBuster ? `${scriptSrc}&t=${Date.now()}` : scriptSrc;
    script.onerror = () => {
      if (reloads >= maxReloads) return;
      reloads += 1;
      setTimeout(() => {
        script.remove();
        injectScript(true);
      }, 800);
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

  const moveToBottom = () => {
    if (!main) return;
    if (container.dataset.clustrmapsMoved === 'true') return;
    main.appendChild(container);
    container.dataset.clustrmapsMoved = 'true';
  };

  const restorePosition = () => {
    if (!originalParent) return;
    if (container.dataset.clustrmapsMoved !== 'true') return;
    if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
      originalParent.insertBefore(container, originalNextSibling);
    } else {
      originalParent.appendChild(container);
    }
    delete container.dataset.clustrmapsMoved;
  };

  const handlePlacement = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      moveToBottom();
    } else {
      restorePosition();
    }
    resizeWidget();
  };

  const ensureWidget = () => {
    const widget = container.querySelector(widgetSelector);
    if (widget) return;
    if (reloads < maxReloads) {
      const oldScript = container.querySelector('#clstr_globe');
      if (oldScript) oldScript.remove();
      reloads += 1;
      injectScript(true);
    }
  };

  injectScript();
  handlePlacement();
  ensureWidget();

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    handlePlacement();
    ensureWidget();
    if (container.querySelector(widgetSelector) || attempts > 24) {
      clearInterval(timer);
    }
  }, 250);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      handlePlacement();
      ensureWidget();
    });
    observer.observe(container);
  }

  window.addEventListener('resize', handlePlacement);
  window.addEventListener('load', () => {
    injectScript();
    handlePlacement();
    ensureWidget();
  });
})();
