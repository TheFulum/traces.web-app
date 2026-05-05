const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  const observed = new WeakSet();
  const observeAll = () => {
    const nodes = document.querySelectorAll('.reveal');
    nodes.forEach((el, i) => {
      if (observed.has(el) || el.classList.contains('is-in')) return;
      el.style.setProperty('--i', String(i % 10));
      io.observe(el);
      observed.add(el);
    });
  };

  observeAll();

  const mo = new MutationObserver(() => observeAll());
  mo.observe(document.body, { childList: true, subtree: true });
} else {
  document.querySelectorAll('.reveal').forEach((el) => {
    el.classList.add('is-in');
  });
}

