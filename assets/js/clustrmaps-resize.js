(() => {
  const container = document.querySelector('[data-clustrmaps="globe"]');
  if (!container) return;

  const resizeWidget = () => {
    const size = container.clientWidth;
    if (!size) return;
    container.style.height = `${size}px`;
    const widget = container.querySelector('canvas, iframe, svg, object');
    if (widget) {
      widget.style.width = '100%';
      widget.style.height = '100%';
      widget.style.display = 'block';
    }
  };

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    resizeWidget();
    if (container.querySelector('canvas, iframe, svg, object') || attempts > 20) {
      clearInterval(timer);
    }
  }, 250);

  window.addEventListener('resize', resizeWidget);
  window.addEventListener('load', resizeWidget);
  resizeWidget();
})();
