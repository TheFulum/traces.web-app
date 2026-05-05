// Cloudinary config — api secret is NEVER used on the client.
// All uploads go through an unsigned upload preset.
/** Override without editing bundle: `window.__TRACES_MEDIA_WORKER_URL__ = 'https://…'` */
const MEDIA_WORKER_URL =
  (typeof window !== 'undefined' && window.__TRACES_MEDIA_WORKER_URL__)
    ? String(window.__TRACES_MEDIA_WORKER_URL__).trim().replace(/\/+$/, '')
    : 'https://traces-media-upload.lipouski-daniil.workers.dev';

const CLOUDINARY_CLOUD_NAME =
  (typeof window !== 'undefined' && window.__TRACES_CLOUDINARY__?.cloudName)
    ? String(window.__TRACES_CLOUDINARY__.cloudName).trim()
    : "dsfmj1rgd";
const CLOUDINARY_UPLOAD_PRESET =
  (typeof window !== 'undefined' && window.__TRACES_CLOUDINARY__?.uploadPreset)
    ? String(window.__TRACES_CLOUDINARY__.uploadPreset).trim()
    : "traces_upload";

const CLOUDINARY_FOLDERS =
  (typeof window !== 'undefined' && window.__TRACES_CLOUDINARY__?.folders && typeof window.__TRACES_CLOUDINARY__.folders === 'object')
    ? window.__TRACES_CLOUDINARY__.folders
    : { photos: 'traces/photos', models: 'traces/models' };
// images
const CLOUDINARY_IMAGE_URL     = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
// .glb/.gltf must use /raw/upload endpoint
const CLOUDINARY_RAW_URL       = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;

// ── images ────────────────────────────────────────────────────────────────

export async function uploadImage(file, onProgress) {
  return _upload(CLOUDINARY_IMAGE_URL, file, String(CLOUDINARY_FOLDERS.photos || 'traces/photos'), onProgress);
}

export async function uploadImages(files, onProgress) {
  const fileArray = Array.from(files).slice(0, 10);
  const urls = [];
  for (let i = 0; i < fileArray.length; i++) {
    const { url } = await uploadImage(fileArray[i], (pct) => {
      if (onProgress) {
        const overall = Math.round(((i + pct / 100) / fileArray.length) * 100);
        onProgress(i, pct, overall);
      }
    });
    urls.push(url);
  }
  return urls;
}

// ── 3D models ─────────────────────────────────────────────────────────────

/**
 * Upload a .glb or .gltf file via Cloudinary /raw/upload.
 * Preset must allow these extensions in Cloudinary settings.
 * @param {File} file
 * @param {function(number):void} [onProgress]
 * @returns {Promise<string>} secure URL
 */
export async function uploadModel(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['glb', 'gltf'].includes(ext)) {
    throw new Error('Поддерживаются только .glb и .gltf файлы');
  }
  if (MEDIA_WORKER_URL) {
    return await uploadViaMediaWorker('model', file, onProgress);
  }
  try {
    const { url } = await _upload(CLOUDINARY_RAW_URL, file, String(CLOUDINARY_FOLDERS.models || 'traces/models'), onProgress);
    return url;
  } catch (e) {
    const msg = String(e?.message || '');
    // Cloudinary preset max_file_size (commonly 10MB) blocks .glb uploads.
    if (msg.toLowerCase().includes('file size too large') || msg.includes('10485760')) {
      throw new Error(
        'Файл модели слишком большой для Cloudinary preset. ' +
        `Увеличьте Max file size в upload preset «${CLOUDINARY_UPLOAD_PRESET}» (Settings → Upload → Upload presets) ` +
        'или загрузите более лёгкую .glb (оптимизация/сжатие).'
      );
    }
    throw e;
  }
}

async function uploadViaMediaWorker(kind, file, onProgress) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { auth } = await import('./firebase-init.js');
    const user = auth?.currentUser || null;
    if (user && typeof user.getIdToken === 'function') {
      const token = await user.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  } catch {}

  const signRes = await fetch(`${MEDIA_WORKER_URL}/api/media/sign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      kind,
      filename: file?.name || '',
      contentType: file?.type || ''
    })
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    throw new Error(signData?.error || `Upload sign error: ${signRes.status}`);
  }
  const putUrl = String(signData?.putUrl || '');
  const publicUrl = String(signData?.publicUrl || '');
  const putHeaders = signData?.putHeaders && typeof signData.putHeaders === 'object' ? signData.putHeaders : {};
  if (!putUrl || !publicUrl) throw new Error('Invalid sign response');

  await putFile(putUrl, file, putHeaders, onProgress);
  return publicUrl;
}

function putFile(url, file, extraHeaders, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (extraHeaders && typeof extraHeaders === 'object') {
      Object.entries(extraHeaders).forEach(([k, v]) => {
        try { xhr.setRequestHeader(String(k), String(v)); } catch {}
      });
    }
    if (file?.type) {
      try { xhr.setRequestHeader('Content-Type', file.type); } catch {}
    }
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => {
      // R2 presigned PUT usually returns 200.
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке файла'));
    xhr.send(file);
  });
}

// ── internal ──────────────────────────────────────────────────────────────

function _upload(endpoint, file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (onProgress) {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, publicId: data.public_id });
      } else {
        let msg = null;
        try { msg = JSON.parse(xhr.responseText)?.error?.message; } catch {}
        reject(new Error(msg || `Cloudinary error: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке файла'));
    xhr.send(formData);
  });
}