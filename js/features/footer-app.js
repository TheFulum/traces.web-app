const DEFAULT_APP_DOWNLOAD_URL = 'https://traces-media-upload.lipouski-daniil.workers.dev/app/traces.apk';

function buildQrUrl(targetUrl) {
  // Use a simple hosted QR renderer to avoid extra deps.
  // QR points to the public download URL (Cloudflare Worker + R2).
  const text = encodeURIComponent(targetUrl);
  return `https://quickchart.io/qr?text=${text}&size=220&margin=1&dark=1f2a37&light=ffffff`;
}

function resolveAppDownloadUrl() {
  try {
    const w = window;
    const fromWindow = String(w.__TRACES_APP_DOWNLOAD_URL__ || '').trim();
    if (fromWindow) return fromWindow;
  } catch {
    // ignore
  }
  return DEFAULT_APP_DOWNLOAD_URL;
}

function initFooterAppBlock() {
  const link = document.getElementById('footer-app-download');
  const linkText = document.getElementById('footer-app-download-text');
  const qr = document.getElementById('footer-app-qr');
  if (!link || !qr) return;

  const url = resolveAppDownloadUrl();
  link.href = url;
  link.removeAttribute('download');
  link.setAttribute('rel', 'nofollow noopener');
  link.setAttribute('target', '_blank');

  if (linkText) {
    linkText.href = url;
    linkText.removeAttribute('download');
    linkText.setAttribute('rel', 'nofollow noopener');
    linkText.setAttribute('target', '_blank');
  }

  qr.alt = 'QR для скачивания приложения';
  qr.loading = 'lazy';
  qr.decoding = 'async';
  qr.src = buildQrUrl(url);
}

initFooterAppBlock();

