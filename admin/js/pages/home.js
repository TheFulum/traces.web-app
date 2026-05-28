import { initNav } from '../../../js/shared/nav.js';
import { db } from '../../../js/shared/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../../js/shared/utils.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';
import { initAdminImageField } from '../shared/admin-image-field.js';

initNav('../../');
bindAdminLogout();

gateAdmin(async () => {

const el = {
  heroImage: document.getElementById('hero-image'),
  homeApiEnabled: document.getElementById('home-api-enabled'),
  homeGithubUrl: document.getElementById('home-github-url'),
  heroEyebrowRu: document.getElementById('hero-eyebrow-ru'),
  heroEyebrowEn: document.getElementById('hero-eyebrow-en'),
  heroEyebrowBe: document.getElementById('hero-eyebrow-be'),
  heroTitleRu: document.getElementById('hero-title-ru'),
  heroTitleEn: document.getElementById('hero-title-en'),
  heroTitleBe: document.getElementById('hero-title-be'),
  heroSubtitleRu: document.getElementById('hero-subtitle-ru'),
  heroSubtitleEn: document.getElementById('hero-subtitle-en'),
  heroSubtitleBe: document.getElementById('hero-subtitle-be'),
  introTextRu: document.getElementById('intro-text-ru'),
  introTextEn: document.getElementById('intro-text-en'),
  introTextBe: document.getElementById('intro-text-be'),
  teaserMapImage: document.getElementById('teaser-map-image'),
  teaserGuideImage: document.getElementById('teaser-guide-image'),
  previewImg: document.getElementById('preview-img'),
  previewTitle: document.getElementById('preview-title'),
  previewSub: document.getElementById('preview-sub'),
  collections: document.getElementById('collections'),
  addCollection: document.getElementById('add-collection'),
  saveBtn: document.getElementById('save-btn')
};

let state = {
  heroImage: '',
  links: { apiEnabled: false, github: '' },
  heroEyebrow: { ru: '', en: '', be: '' },
  heroTitle: { ru: '', en: '', be: '' },
  heroSubtitle: { ru: '', en: '', be: '' },
  introText: { ru: '', en: '', be: '' },
  teasers: { mapImage: '', guideImage: '' },
  collections: []
};

await load();
wire();
render();
initImageFields();

async function load() {
  try {
    const snap = await getDoc(doc(db, 'config', 'home'));
    if (snap.exists()) {
      const d = snap.data();
      state = {
        heroImage: String(d.heroImage || ''),
        links: {
          apiEnabled: d?.links?.apiEnabled === true,
          github: String(d?.links?.github || '').trim()
        },
        heroEyebrow: normalizeLocalized(d.heroEyebrow),
        heroTitle: normalizeLocalized(d.heroTitle),
        heroSubtitle: normalizeLocalized(d.heroSubtitle),
        introText: normalizeLocalized(d.introText),
        teasers: {
          mapImage: String(d?.teasers?.mapImage || '').trim(),
          guideImage: String(d?.teasers?.guideImage || '').trim()
        },
        collections: Array.isArray(d.collections) ? d.collections.map(normalizeCollection) : []
      };
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка загрузки config/home', 'error');
  }
}

function wire() {
  const onChange = () => {
    state.heroImage = el.heroImage.value.trim();
    state.links.apiEnabled = String(el.homeApiEnabled.value) === 'true';
    state.links.github = el.homeGithubUrl.value.trim();
    state.heroEyebrow.ru = el.heroEyebrowRu.value.trim();
    state.heroEyebrow.en = el.heroEyebrowEn.value.trim();
    state.heroEyebrow.be = el.heroEyebrowBe?.value?.trim?.() || '';
    state.heroTitle.ru = el.heroTitleRu.value.trim();
    state.heroTitle.en = el.heroTitleEn.value.trim();
    state.heroTitle.be = el.heroTitleBe?.value?.trim?.() || '';
    state.heroSubtitle.ru = el.heroSubtitleRu.value.trim();
    state.heroSubtitle.en = el.heroSubtitleEn.value.trim();
    state.heroSubtitle.be = el.heroSubtitleBe?.value?.trim?.() || '';
    state.introText.ru = el.introTextRu.value.trim();
    state.introText.en = el.introTextEn.value.trim();
    state.introText.be = el.introTextBe?.value?.trim?.() || '';
    state.teasers.mapImage = el.teaserMapImage.value.trim();
    state.teasers.guideImage = el.teaserGuideImage.value.trim();
    renderPreview();
  };

  ['input', 'change'].forEach(evt => {
    el.heroImage.addEventListener(evt, onChange);
    el.homeApiEnabled.addEventListener(evt, onChange);
    el.homeGithubUrl.addEventListener(evt, onChange);
    el.heroEyebrowRu.addEventListener(evt, onChange);
    el.heroEyebrowEn.addEventListener(evt, onChange);
    el.heroEyebrowBe?.addEventListener(evt, onChange);
    el.heroTitleRu.addEventListener(evt, onChange);
    el.heroTitleEn.addEventListener(evt, onChange);
    el.heroTitleBe?.addEventListener(evt, onChange);
    el.heroSubtitleRu.addEventListener(evt, onChange);
    el.heroSubtitleEn.addEventListener(evt, onChange);
    el.heroSubtitleBe?.addEventListener(evt, onChange);
    el.introTextRu.addEventListener(evt, onChange);
    el.introTextEn.addEventListener(evt, onChange);
    el.introTextBe?.addEventListener(evt, onChange);
    el.teaserMapImage.addEventListener(evt, onChange);
    el.teaserGuideImage.addEventListener(evt, onChange);
  });

  el.addCollection.addEventListener('click', () => {
    state.collections.push(normalizeCollection({
      id: '',
      title: { ru: '', en: '', be: '' },
      description: { ru: '', en: '', be: '' },
      cover: '',
      filter: ''
    }));
    renderCollections();
  });

  el.saveBtn.addEventListener('click', save);
}

function initImageFields() {
  initAdminImageField({
    input: el.heroImage,
    onChange: () => {
      state.heroImage = el.heroImage.value.trim();
      renderPreview();
    }
  });
  initAdminImageField({
    input: el.teaserMapImage,
    onChange: () => { state.teasers.mapImage = el.teaserMapImage.value.trim(); }
  });
  initAdminImageField({
    input: el.teaserGuideImage,
    onChange: () => { state.teasers.guideImage = el.teaserGuideImage.value.trim(); }
  });
}

function initCollectionCoverFields() {
  el.collections.querySelectorAll('input[data-k="cover"]').forEach(inp => {
    initAdminImageField({ input: inp });
  });
}

function render() {
  el.heroImage.value = state.heroImage;
  el.homeApiEnabled.value = state.links.apiEnabled ? 'true' : 'false';
  el.homeGithubUrl.value = state.links.github || '';
  el.heroEyebrowRu.value = state.heroEyebrow.ru || '';
  el.heroEyebrowEn.value = state.heroEyebrow.en || '';
  if (el.heroEyebrowBe) el.heroEyebrowBe.value = state.heroEyebrow.be || '';
  el.heroTitleRu.value = state.heroTitle.ru || '';
  el.heroTitleEn.value = state.heroTitle.en || '';
  if (el.heroTitleBe) el.heroTitleBe.value = state.heroTitle.be || '';
  el.heroSubtitleRu.value = state.heroSubtitle.ru || '';
  el.heroSubtitleEn.value = state.heroSubtitle.en || '';
  if (el.heroSubtitleBe) el.heroSubtitleBe.value = state.heroSubtitle.be || '';
  el.introTextRu.value = state.introText.ru || '';
  el.introTextEn.value = state.introText.en || '';
  if (el.introTextBe) el.introTextBe.value = state.introText.be || '';
  el.teaserMapImage.value = state.teasers.mapImage || '';
  el.teaserGuideImage.value = state.teasers.guideImage || '';
  renderPreview();
  renderCollections();
}

function renderPreview() {
  if (state.heroImage) el.previewImg.style.backgroundImage = `url("${state.heroImage}")`;
  else el.previewImg.style.backgroundImage = '';

  const previewTitle = state.heroTitle.ru || state.heroTitle.en;
  const previewSubtitle = state.heroSubtitle.ru || state.heroSubtitle.en;
  el.previewTitle.innerHTML = previewTitle || '—';
  el.previewSub.textContent = previewSubtitle || '—';
}

function renderCollections() {
  el.collections.innerHTML = '';
  state.collections.forEach((c, i) => {
    const item = document.createElement('div');
    item.className = 'collection-item';
    item.innerHTML = `
      <div class="collection-head">
        <strong>Подборка ${i + 1}</strong>
        <div class="mini-actions">
          <button type="button" data-act="up">↑</button>
          <button type="button" data-act="down">↓</button>
          <button type="button" data-act="del">Удалить</button>
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label class="form-label">ID (slug)</label>
          <input class="form-control" data-k="id" value="${escAttr(c.id)}" maxlength="80" placeholder="wwii" />
        </div>
        <div class="form-group">
          <label class="form-label">Cover</label>
          <input class="form-control" data-k="cover" value="${escAttr(c.cover)}" />
        </div>
      </div>
      <div class="row">
        <div class="form-group">
          <label class="form-label">Title (RU)</label>
          <input class="form-control" data-k="titleRu" value="${escAttr(c.title.ru)}" maxlength="140" />
        </div>
        <div class="form-group">
          <label class="form-label">Title (EN)</label>
          <input class="form-control" data-k="titleEn" value="${escAttr(c.title.en)}" maxlength="140" />
        </div>
        <div class="form-group">
          <label class="form-label">Title (BE)</label>
          <input class="form-control" data-k="titleBe" value="${escAttr(c.title.be)}" maxlength="140" />
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label class="form-label">Description (RU)</label>
          <input class="form-control" data-k="descriptionRu" value="${escAttr(c.description.ru)}" maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">Description (EN)</label>
          <input class="form-control" data-k="descriptionEn" value="${escAttr(c.description.en)}" maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">Description (BE)</label>
          <input class="form-control" data-k="descriptionBe" value="${escAttr(c.description.be)}" maxlength="200" />
        </div>
      </div>
      <div class="row-1">
        <div class="form-group">
          <label class="form-label">Filter (query string)</label>
          <input class="form-control" data-k="filter" value="${escAttr(c.filter)}" placeholder="tags=ВОВ,Мемориал&has3d=true" />
        </div>
      </div>
    `;

    item.querySelectorAll('[data-k]').forEach(inp => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k;
        const value = inp.value.trim();
        if (k === 'titleRu') state.collections[i].title.ru = value;
        else if (k === 'titleEn') state.collections[i].title.en = value;
        else if (k === 'titleBe') state.collections[i].title.be = value;
        else if (k === 'descriptionRu') state.collections[i].description.ru = value;
        else if (k === 'descriptionEn') state.collections[i].description.en = value;
        else if (k === 'descriptionBe') state.collections[i].description.be = value;
        else state.collections[i][k] = value;
      });
    });

    item.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'del') {
          state.collections.splice(i, 1);
          renderCollections();
        }
        if (act === 'up' && i > 0) {
          const tmp = state.collections[i - 1];
          state.collections[i - 1] = state.collections[i];
          state.collections[i] = tmp;
          renderCollections();
        }
        if (act === 'down' && i < state.collections.length - 1) {
          const tmp = state.collections[i + 1];
          state.collections[i + 1] = state.collections[i];
          state.collections[i] = tmp;
          renderCollections();
        }
      });
    });

    el.collections.appendChild(item);
  });
  initCollectionCoverFields();
}

async function save() {
  el.saveBtn.disabled = true;
  const prev = el.saveBtn.textContent;
  el.saveBtn.textContent = 'Сохранение…';

  try {
    const payload = {
      heroImage: state.heroImage,
      links: {
        apiEnabled: !!state.links.apiEnabled,
        github: String(state.links.github || '').trim()
      },
      heroEyebrow: state.heroEyebrow,
      heroTitle: state.heroTitle,
      heroSubtitle: state.heroSubtitle,
      introText: state.introText,
      teasers: {
        mapImage: String(state.teasers.mapImage || '').trim(),
        guideImage: String(state.teasers.guideImage || '').trim()
      },
      collections: (state.collections || []).map(normalizeCollection)
    };

    await setDoc(doc(db, 'config', 'home'), payload, { merge: true });
    showToast('Главная сохранена');
  } catch (err) {
    console.error(err);
    showToast('Ошибка сохранения', 'error');
  } finally {
    el.saveBtn.disabled = false;
    el.saveBtn.textContent = prev;
  }
}

function normalizeCollection(c) {
  return {
    id: String(c?.id || '').trim(),
    title: normalizeLocalized(c?.title),
    description: normalizeLocalized(c?.description),
    cover: String(c?.cover || ''),
    filter: String(c?.filter || '').replace(/^\?/, '')
  };
}

}); // gateAdmin

function normalizeLocalized(value) {
  if (value && typeof value === 'object') {
    return {
      ru: String(value.ru || '').trim(),
      en: String(value.en || '').trim(),
      be: String(value.be || '').trim()
    };
  }
  const str = String(value || '').trim();
  return { ru: str, en: '', be: '' };
}

function escAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
