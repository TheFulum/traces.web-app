const apkPath = '/download/traces.apk';

function buildQrUrl(targetUrl) {
  // Use a simple hosted QR renderer to avoid extra deps.
  // QR points to same-origin download URL.
  const text = encodeURIComponent(targetUrl);
  return `https://quickchart.io/qr?text=${text}&size=220&margin=1&dark=1f2a37&light=ffffff`;
}

function initFooterAppBlock() {
  const link = document.getElementById('footer-app-download');
  const qr = document.getElementById('footer-app-qr');
  if (!link || !qr) return;

  const url = `${location.origin}${apkPath}`;
  link.href = apkPath;
  link.setAttribute('download', 'traces.apk');
  link.setAttribute('rel', 'nofollow');

  qr.alt = 'QR для скачивания приложения';
  qr.loading = 'lazy';
  qr.decoding = 'async';
  qr.src = buildQrUrl(url);
}

initFooterAppBlock();

