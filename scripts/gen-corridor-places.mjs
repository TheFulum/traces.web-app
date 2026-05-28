import { writeFileSync } from 'fs';

const TS = '2026-05-21T18:00:00.000Z';

function createdOn(display, year) {
  return { day: null, sortKey: year * 10000, precision: 'year', display, year, month: null };
}

function place(row) {
  const {
    id, name, city, regionRu, regionEn, regionBe,
    address, lat, lng, display, year, description, tags,
    enName, enDesc, enTags, beName, beDesc, beTags,
  } = row;
  return {
    has3D: false,
    modelUrl: null,
    location: { lng, lat, address },
    createdAt: TS,
    featured: false,
    featuredOrder: null,
    updatedAt: TS,
    description,
    createdOn: createdOn(display, year),
    author: null,
    openingDate: display,
    name,
    openingAddress: '',
    i18n: {
      ru: { address: `${city}, ${regionRu}, Беларусь`, city, author: null, description, openingAddress: '', name },
      en: { address: `${city}, ${regionEn}, Belarus`, city, author: null, name: enName, description: enDesc, tags: enTags },
      be: { address: `${city}, ${regionBe}, Беларусь`, city, author: null, name: beName, description: beDesc, tags: beTags },
    },
    sketchfabUrl: null,
    photos: [],
    city,
    modelType: null,
    hasPhotos: false,
    tags,
    id,
  };
}

const places = [
  place({
    id: 'belarus_place_136',
    name: 'Костёл Успения Пресвятой Девы Марии (Глуск)',
    city: 'Глуск',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Костёл Успения, Глуск, Минская область, Беларусь',
    lat: 52.4944,
    lng: 28.6344,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения в Глуське — главный католический храм районного центра почти на прямой между Речицей и Старобином. Неоготическая башня видна издалека на фоне низкой полесской застройки. Глуск известен торфом и аграрным краем; костёл закрывает одну из самых пустых зон карты между Гомельщиной и Слуцким направлением.',
    tags: ['Беларусь', 'Минская область', 'Глуск', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Church of the Assumption (Hlusk)',
    enDesc:
      'The Assumption Church in Hlusk is the main Catholic church of a district centre almost on the line between Rechitsa and Starobin. A neo-Gothic tower stands above low Polesie fabric. Hlusk fills one of the emptiest map zones between Gomel Region and the Slutsk area.',
    enTags: ['Belarus', 'Minsk Region', 'Hlusk', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Унебаўзяцця (Глуск)',
    beDesc:
      'Касцёл Унебаўзяцця ў Глуську — галоўны каталіцкі храм раённага цэнтра на лініі Рэчыца — Старобін, кропка на самай «пустой» зоне карты.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Глуск', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  place({
    id: 'belarus_place_137',
    name: 'Свято-Успенская церковь (Погар)',
    city: 'Погар',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Свято-Успенская церковь, Погар, Гомельская область, Беларусь',
    lat: 52.553,
    lng: 28.742,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Свято-Успенская церковь в Погаре — православный храм в посёлке, лежащем почти на трассе между Речицей и Старобином. Купол и колокольня — редкий архитектурный акцент в лесистом коридоре южной Беларуси. Погар связан с окрестными болотами и речками; церковь помогает заполнить центральный «провал» на карте между Светлогорском и Глуськом.',
    tags: ['Беларусь', 'Гомельская область', 'Погар', 'Церковь', 'Православие', 'XIX век'],
    enName: 'Dormition Church (Pogar)',
    enDesc:
      'The Dormition Church in Pogar is an Orthodox church in a settlement almost on the Rechitsa–Starobin corridor. Dome and bell tower are rare architectural markers in this wooded belt. The church fills the central gap on the map between Svetlogorsk and Hlusk.',
    enTags: ['Belarus', 'Gomel Region', 'Pogar', 'Church', 'Orthodox', '19th century'],
    beName: 'Свята-Успенская царква (Погар)',
    beDesc:
      'Свята-Успенская царква ў Погары — праваслаўны храм амаль на лініі Рэчыца — Старобін, кропка ў цэнтры «пустога» калідора карты.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Погар', 'Царква', 'Праваслаўе', 'XIX стагоддзе'],
  }),
  place({
    id: 'belarus_place_138',
    name: 'Костёл Святого Антония (Копаткевичи)',
    city: 'Копаткевичи',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Костёл Святого Антония, Копаткевичи, Минская область, Беларусь',
    lat: 52.7139,
    lng: 28.8394,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Антония в Копаткевичах — кирпичный храм в районном центре на восточном фланге коридора Речица — Старобин, недалеко от Октябрьского и Любани. Башня доминирует над площадью. Копаткевичи выросли как аграрный и железнодорожный узел; костёл — главная историческая вертикаль для туристической карты в полосе 10–20 км от условной линии.',
    tags: ['Беларусь', 'Минская область', 'Копаткевичи', 'Костёл', 'XIX век'],
    enName: 'Church of Saint Anthony (Kopatkevichi)',
    enDesc:
      'The Church of Saint Anthony in Kopatkevichi is a brick church on the eastern side of the Rechitsa–Starobin corridor near Lyuban. A tower dominates the square. It is the main historic landmark filling the 10–20 km belt on the map.',
    enTags: ['Belarus', 'Minsk Region', 'Kopatkevichi', 'Church', '19th century'],
    beName: 'Касцёл Святога Антона (Капаткевічы)',
    beDesc:
      'Касцёл Святога Антона ў Капаткевічах — храм на ўсходнім фланзе калідора Рэчыца — Старобін, галоўная вертыкаль раённага цэнтра.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Капаткевічы', 'Касцёл', 'XIX стагоддзе'],
  }),
];

writeFileSync('places-export-corridor.json', JSON.stringify(places, null, 2) + '\n', 'utf8');
console.log('Wrote', places.length, '→ places-export-corridor.json');
