/**
 * Парсинг запроса маршрута и фильтрация мест каталога по городу / области.
 */

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\d\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const REGION_DEFS = {
  mogilev: {
    tags: ['могилевская область', 'mogilev region', 'магилеўская вобласць'],
    blockTags: ['минская область', 'minsk region', 'гомельская область', 'gomel region', 'гродненская', 'брестская', 'витебская']
  },
  minsk: {
    tags: ['минская область', 'minsk region', 'мінская вобласць'],
    blockTags: ['могилевская область', 'гомельская область']
  },
  gomel: {
    tags: ['гомельская область', 'gomel region', 'гомельская вобласць'],
    blockTags: ['могилевская область', 'минская область']
  },
  grodno: {
    tags: ['гродненская область', 'grodno region', 'гродненская вобласць'],
    blockTags: []
  },
  brest: {
    tags: ['брестская область', 'brest region', 'брестская вобласць'],
    blockTags: []
  },
  vitebsk: {
    tags: ['витебская область', 'vitebsk region', 'віцебская вобласць'],
    blockTags: []
  }
};

const CITY_ALIASES = {
  mogilev: ['могилев', 'могилёв', 'magileu', 'mogilev'],
  minsk: ['минск', 'minsk', 'менск'],
  gomel: ['гомель', 'gomel', 'гомел'],
  bobruisk: ['бобруйск', 'babruisk', 'bobruisk'],
  brest: ['брест', 'brest', 'брэст'],
  vitebsk: ['витебск', 'vitebsk', 'віцебск'],
  grodno: ['гродно', 'grodno', 'гродна']
};

const CITY_LABEL = {
  mogilev: { ru: 'Могилёв', en: 'Mogilev', be: 'Магілёў' },
  minsk: { ru: 'Минск', en: 'Minsk', be: 'Мінск' },
  gomel: { ru: 'Гомель', en: 'Gomel', be: 'Гомель' },
  bobruisk: { ru: 'Бобруйск', en: 'Bobruisk', be: 'Бабруйск' }
};

const REGION_LABEL = {
  mogilev: { ru: 'Могилёвская область', en: 'Mogilev Region', be: 'Магілёўская вобласць' },
  minsk: { ru: 'Минская область', en: 'Minsk Region', be: 'Мінская вобласць' },
  gomel: { ru: 'Гомельская область', en: 'Gomel Region', be: 'Гомельская вобласць' },
  grodno: { ru: 'Гродненская область', en: 'Grodno Region', be: 'Гродзенская вобласць' },
  brest: { ru: 'Брестская область', en: 'Brest Region', be: 'Брэсцкая вобласць' },
  vitebsk: { ru: 'Витебская область', en: 'Vitebsk Region', be: 'Віцебская вобласць' }
};

function collectTags(place, pickI18n, lang) {
  const i18n = pickI18n ? pickI18n(place, lang) : null;
  const raw = [...(place?.tags || []), ...(i18n?.tags || [])];
  return raw.map((t) => norm(t)).filter(Boolean);
}

function collectCity(place, pickI18n, lang) {
  const i18n = pickI18n ? pickI18n(place, lang) : null;
  return norm(i18n?.city || place?.city || '');
}

/** @returns {{ kind: 'city'|'region'|null, cityKey?: string, regionKey?: string, count: number|null, label: string }} */
export function parseRouteScope(userText, lang = 'ru') {
  const t = norm(userText);
  if (!t) return { kind: null, count: null, label: '' };

  let count = null;
  const countMatch = t.match(/\b(\d{1,2})\b/);
  if (countMatch && /(маршрут|собери|мест|точек|объект|прогулк|экскурс|посети|покаж)/.test(t)) {
    count = Math.min(20, Math.max(1, parseInt(countMatch[1], 10)));
  }

  const routeIntent = /(маршрут|собери|составь|подбери|маршрут)/.test(t);
  if (!routeIntent && count == null) return { kind: null, count: null, label: '' };

  for (const [regionKey, def] of Object.entries(REGION_DEFS)) {
    const stem = regionKey === 'mogilev' ? 'могилев' : regionKey === 'gomel' ? 'гомел' : regionKey === 'minsk' ? 'минск' : regionKey;
    if (new RegExp(`${stem}\\w*\\s+област`).test(t)) {
      const label = REGION_LABEL[regionKey]?.[lang] || REGION_LABEL[regionKey]?.ru || regionKey;
      return { kind: 'region', regionKey, count, label };
    }
  }

  for (const [cityKey, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((a) => t.includes(a))) {
      const label = CITY_LABEL[cityKey]?.[lang] || CITY_LABEL[cityKey]?.ru || cityKey;
      return { kind: 'city', cityKey, count, label };
    }
  }

  if (count != null) return { kind: null, count, label: '' };
  return { kind: null, count: null, label: '' };
}

export function placeMatchesScope(place, scope, pickI18n, lang) {
  if (!scope?.kind) return true;
  const tags = collectTags(place, pickI18n, lang);
  const city = collectCity(place, pickI18n, lang);

  if (scope.kind === 'region' && scope.regionKey) {
    const def = REGION_DEFS[scope.regionKey];
    if (!def) return false;
    if (def.blockTags.some((b) => tags.some((tag) => tag.includes(norm(b))))) return false;
    return def.tags.some((r) => tags.some((tag) => tag.includes(norm(r))));
  }

  if (scope.kind === 'city' && scope.cityKey) {
    const aliases = CITY_ALIASES[scope.cityKey] || [];
    return aliases.some((a) => city.includes(a) || city === a);
  }

  return true;
}

export function scopePromptLines(scope, catalogSize, lang = 'ru') {
  if (!scope?.kind) return [];
  const n = scope.count ?? '';
  if (lang === 'en') {
    if (scope.kind === 'city') {
      return [
        `User route request: city «${scope.label}»${n ? `, ${n} places` : ''}.`,
        `Filtered catalog has exactly ${catalogSize} place(s) in this city — use ONLY these keys, never other cities.`,
        catalogSize < (scope.count || 0)
          ? `Fewer than ${scope.count} places exist — use all ${catalogSize} and say only ${catalogSize} are in the catalog.`
          : `Pick up to ${scope.count || catalogSize} places in logical walk order.`
      ];
    }
    return [
      `User route request: «${scope.label}»${n ? `, ${n} places` : ''}.`,
      `Catalog lists ONLY sites tagged for this oblast (${catalogSize} entries). Do not use cities from other oblasts (e.g. Starobin is Minsk Region, not Mogilev).`,
      catalogSize < (scope.count || 0)
        ? `Only ${catalogSize} places in catalog — use all ${catalogSize} and tell the user honestly.`
        : `Pick up to ${scope.count || catalogSize} places.`
    ];
  }
  if (scope.kind === 'city') {
    return [
      `Запрос маршрута: город «${scope.label}»${n ? `, ${n} мест` : ''}.`,
      `В каталоге ниже только ${catalogSize} мест(а) в этом городе — используй ТОЛЬКО их, без других городов.`,
      catalogSize < (scope.count || 0)
        ? `В каталоге меньше ${scope.count} — возьми все ${catalogSize} и явно напиши, что в базе только ${catalogSize}.`
        : `Выбери до ${scope.count || catalogSize} мест в логичном порядке прогулки.`
    ];
  }
  return [
    `Запрос маршрута: «${scope.label}»${n ? `, ${n} мест` : ''}.`,
    `Ниже только объекты с тегом этой области (${catalogSize} шт.). Не добавляй другие области (Старобин — Минская, не Могилёвская).`,
    catalogSize < (scope.count || 0)
      ? `В каталоге только ${catalogSize} — собери маршрут из ${catalogSize} и честно скажи пользователю.`
      : `Выбери до ${scope.count || catalogSize} мест.`
  ];
}
