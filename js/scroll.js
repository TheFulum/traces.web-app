const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchLike = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
const disableLenis = document.body?.dataset?.noLenis === 'true';

if (!reduceMotion && !disableLenis) {
  initLenis();
}

async function initLenis() {
  try {
    const LenisCtor = await ensureLenisCtor();
    if (!LenisCtor) return;

    const lenis = new LenisCtor({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });

    if (isTouchLike) {
      // Keep default mobile behavior close to native.
      lenis.stop();
      return;
    }

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    window.lenis = lenis;
  } catch {
    // Smooth scroll is progressive enhancement.
  }
}

async function ensureLenisCtor() {
  if (window.Lenis) return window.Lenis;

  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-lenis-loader="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('lenis-load-error')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lenis@1.1.16/dist/lenis.min.js';
    script.async = true;
    script.dataset.lenisLoader = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('lenis-load-error'));
    document.head.appendChild(script);
  });

  return window.Lenis || null;
}
