import { uploadImage } from '../../../js/shared/media-upload.js';
import { uploadFilenameNeedsFix, uploadFilenameUserHint } from '../../../js/shared/upload-filename.js';
import { showToast } from '../../../js/shared/utils.js';

/**
 * URL input + drag-and-drop file upload (R2 via media worker).
 * @param {{ input: HTMLInputElement, onChange?: () => void }} opts
 */
export function initAdminImageField({ input, onChange }) {
  if (!input || input.dataset.adminImageField === '1') return;
  input.dataset.adminImageField = '1';

  const status = document.createElement('p');
  status.className = 'admin-media-progress';
  status.hidden = true;

  const area = document.createElement(
    'div'
  );
  area.className = 'admin-media-upload admin-media-upload--inline';
  area.setAttribute('role', 'button');
  area.tabIndex = 0;
  area.innerHTML =
    '<p>Перетащите изображение или нажмите для выбора</p><small>JPEG, PNG, WEBP · до 10 МБ</small>';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp,image/*';
  fileInput.hidden = true;

  input.insertAdjacentElement('afterend', area);
  area.insertAdjacentElement('afterend', status);
  status.insertAdjacentElement('afterend', fileInput);

  area.addEventListener('click', () => {
    if (!area.dataset.busy) fileInput.click();
  });
  area.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!area.dataset.busy) fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) upload(file);
  });
  area.addEventListener('dragover', e => {
    e.preventDefault();
    area.classList.add('drag');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag');
    const file = e.dataTransfer?.files?.[0];
    if (file) upload(file);
  });

  async function upload(file) {
    if (uploadFilenameNeedsFix(file.name)) {
      showToast(uploadFilenameUserHint(file.name));
    }
    area.dataset.busy = '1';
    status.hidden = false;
    status.textContent = 'Загрузка…';
    try {
      const url = await uploadImage(file, pct => {
        status.textContent = `Загрузка… ${pct}%`;
      });
      input.value = url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      onChange?.();
      showToast('Изображение загружено');
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Ошибка загрузки', 'error');
    } finally {
      delete area.dataset.busy;
      status.hidden = true;
      status.textContent = '';
    }
  }
}
