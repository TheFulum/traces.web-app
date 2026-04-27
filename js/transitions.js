const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion) {
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    if (anchor.getAttribute('href')?.startsWith('#')) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!document.startViewTransition) return;

    const targetUrl = new URL(anchor.href, location.href);
    if (targetUrl.origin !== location.origin) return;
    if (targetUrl.pathname === location.pathname && targetUrl.search === location.search && targetUrl.hash === location.hash) return;

    event.preventDefault();
    document.startViewTransition(() => {
      location.href = targetUrl.toString();
    });
  });
}
