import { writeFileSync } from 'fs';

const TS = '2026-05-21T18:30:00.000Z';

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
    id: 'belarus_place_139',
    name: 'Костёл Святого Михаила (Василевичи)',
    city: 'Василевичи',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Костёл Святого Михаила, Василевичи, Гомельская область, Беларусь',
    lat: 52.2458,
    lng: 29.8278,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Михаила в Василевичах — фарный храм в городе на восточном конце коридора Василевичи — Ивацевичи. Кирпичная башня доминирует над центром железнодорожного узла. Василевичи известны промышленностью и связью с Березиной; костёл — стартовая точка для заполнения «пустой» полосы карты на юго-востоке Полесья.',
    tags: ['Беларусь', 'Гомельская область', 'Василевичи', 'Костёл', 'XIX век'],
    enName: 'Church of Saint Michael (Vasilevichi)',
    enDesc:
      'The Church of Saint Michael in Vasilevichi is a parish church at the eastern end of the Vasilevichi–Ivatsevichi corridor. A brick tower dominates the railway junction centre. It anchors map coverage of south-eastern Polesie.',
    enTags: ['Belarus', 'Gomel Region', 'Vasilevichi', 'Church', '19th century'],
    beName: 'Касцёл Святога Міхаіла (Васілевічы)',
    beDesc:
      'Касцёл Святога Міхаіла ў Васілевічах — фарны храм на ўсходнім канцы калідора Васілевічы — Івацэвічы, стартавая кропка на карце.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Васілевічы', 'Касцёл', 'XIX стагоддзе'],
  }),
  place({
    id: 'belarus_place_140',
    name: 'Костёл Успения Пресвятой Девы Марии (Микашевичи)',
    city: 'Микашевичи',
    regionRu: 'Брестская область',
    regionEn: 'Brest Region',
    regionBe: 'Брэсцкая вобласць',
    address: 'Костёл Успения, Микашевичи, Брестская область, Беларусь',
    lat: 52.2333,
    lng: 29.475,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения в Микашевичах — храм в посёлке у крупнейших в Европе залежей калийных солей. Неоготическая башня контрастирует с промышленным ландшафтом. Микашевичи выросли вокруг рудников; костёл сохраняет память о дореволюционном местечке в начале трассы на запад.',
    tags: ['Беларусь', 'Брестская область', 'Микашевичи', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Church of the Assumption (Mikashevichi)',
    enDesc:
      'The Assumption Church in Mikashevichi stands near major potassium salt deposits. A neo-Gothic tower contrasts with industrial landscape. The church marks the start of the westward corridor on the map.',
    enTags: ['Belarus', 'Brest Region', 'Mikashevichi', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Унебаўзяцця (Мікашэвічы)',
    beDesc:
      'Касцёл Унебаўзяцця ў Мікашэвічах — храм каля залежаў калійных соляў, кропка на пачатку калідора на захад.',
    beTags: ['Беларусь', 'Брэсцкая вобласць', 'Мікашэвічы', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  place({
    id: 'belarus_place_141',
    name: 'Костёл Святого Антония (Лельчицы)',
    city: 'Лельчицы',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Костёл Святого Антония, Лельчицы, Гомельская область, Беларусь',
    lat: 52.355,
    lng: 29.815,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Антония в Лельчицах — кирпичный храм районного центра в лесистом крае у самой линии Василевичи — Ивацевичи. Башня украшает площадь небольшого города. Лельчицы связаны с торфом и лесозаготовкой; костёл — редкий архитектурный ориентир в зоне, где на карте почти нет точек.',
    tags: ['Беларусь', 'Гомельская область', 'Лельчицы', 'Костёл', 'XIX век'],
    enName: 'Church of Saint Anthony (Lelchitsy)',
    enDesc:
      'The Church of Saint Anthony in Lelchitsy is a brick church in a forested district centre on the Vasilevichi–Ivatsevichi line. A tower adorns the square. It is a rare landmark in an empty map belt.',
    enTags: ['Belarus', 'Gomel Region', 'Lelchitsy', 'Church', '19th century'],
    beName: 'Касцёл Святога Антона (Лельчыцы)',
    beDesc:
      'Касцёл Святога Антона ў Лельчыцах — храм раённага цэнтра на лініі Васілевічы — Івацэвічы ў лясістым краі.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Лельчыцы', 'Касцёл', 'XIX стагоддзе'],
  }),
  place({
    id: 'belarus_place_142',
    name: 'Собор Рождества Пресвятой Богородицы (Белоозёрск)',
    city: 'Белоозёрск',
    regionRu: 'Брестская область',
    regionEn: 'Brest Region',
    regionBe: 'Брэсцкая вобласць',
    address: 'Собор Рождества, Белоозёрск, Брестская область, Беларусь',
    lat: 52.6608,
    lng: 25.8642,
    display: 'XX в.',
    year: 1960,
    description:
      'Собор Рождества в Белоозёрске — православный храм молодого города нефтехимиков и строителей водохранилища на реке Горынь. Купола видны издалека на подъезде с трассы. Белоозёрск лежит почти на прямой между Василевичами и Ивацевичами; собор — главная вертикаль поселка в «пустом» коридоре.',
    tags: ['Беларусь', 'Брестская область', 'Белоозёрск', 'Собор', 'Православие', 'XX век'],
    enName: 'Nativity Cathedral (Beloozersk)',
    enDesc:
      'The Nativity Cathedral in Beloozersk is the main Orthodox church of a town built for petrochemical workers near the Gorin reservoir. Domes are visible from the highway. The town lies on the Vasilevichi–Ivatsevichi line and fills a gap on the map.',
    enTags: ['Belarus', 'Brest Region', 'Beloozersk', 'Cathedral', 'Orthodox', '20th century'],
    beName: 'Сабор Нараджэння (Белаязерск)',
    beDesc:
      'Сабор Нараджэння ў Белаязерску — праваслаўны храм на лініі Васілевічы — Івацэвічы, галоўная вертыкаль горада на Гарыні.',
    beTags: ['Беларусь', 'Брэсцкая вобласць', 'Белаязерск', 'Сабор', 'Праваслаўе', 'XX стагоддзе'],
  }),
  place({
    id: 'belarus_place_143',
    name: 'Болото «Споровское» (Спорово)',
    city: 'Спорово',
    regionRu: 'Брестская область',
    regionEn: 'Brest Region',
    regionBe: 'Брэсцкая вобласць',
    address: 'Болотный массив Споровское, Спорово, Брестская область, Беларусь',
    lat: 52.7003,
    lng: 25.4986,
    display: 'XX в.',
    year: 1980,
    description:
      'Болото «Споровское» у посёлка Спорово — крупнейший в Беларуси массив переходных болот, Ramsar-сайт с уникальными сообществами мхов и клюквой. Экотропы и наблюдение за птицами привлекают натуралистов. Спорово лежит на линии Василевичи — Ивацевичи; объект даёт природную «точку» в коридоре, где мало культурных памятников.',
    tags: ['Беларусь', 'Брестская область', 'Спорово', 'Природа', 'Болото', 'Ramsar'],
    enName: 'Sporovo Fenland (Sporovo)',
    enDesc:
      'The Sporovo fen near Sporovo village is Belarus\'s largest transitional bog, a Ramsar site with unique moss and cranberry communities. Boardwalks and birdwatching attract naturalists. It adds a nature landmark on the Vasilevichi–Ivatsevichi corridor.',
    enTags: ['Belarus', 'Brest Region', 'Sporovo', 'Nature', 'Wetland', 'Ramsar'],
    beName: 'Балота «Спораўскае» (Спорава)',
    beDesc:
      'Балота «Спораўскае» каля Спорава — найбольшы пераходны балотны масіў Беларусі, Ramsar-сайт, прыродная кропка на калідоры Васілевічы — Івацэвічы.',
    beTags: ['Беларусь', 'Брэсцкая вобласць', 'Спорава', 'Прырода', 'Балота', 'Ramsar'],
  }),
  place({
    id: 'belarus_place_144',
    name: 'Костёл Святого Симеона (Ганцевичи)',
    city: 'Ганцевичи',
    regionRu: 'Брестская область',
    regionEn: 'Brest Region',
    regionBe: 'Брэсцкая вобласць',
    address: 'Костёл Святого Симеона, Ганцевичи, Брестская область, Беларусь',
    lat: 52.7594,
    lng: 26.4272,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Симеона в Ганцевичах — кирпичный храм в районном центре на западном фланге коридора, недалеко от Ивацевичей. Башня и неоготические детали украшают центр. Ганцевичи — ворота к Полесью с севера; костёл заполняет карту между Белоозёрском и пущей.',
    tags: ['Беларусь', 'Брестская область', 'Ганцевичи', 'Костёл', 'XIX век'],
    enName: 'Church of Saint Simeon (Hantsavichy)',
    enDesc:
      'The Church of Saint Simeon in Hantsavichy is a brick church on the western side of the corridor near Ivatsevichi. A tower adorns the district centre. It fills the map between Beloozersk and the forest.',
    enTags: ['Belarus', 'Brest Region', 'Hantsavichy', 'Church', '19th century'],
    beName: 'Касцёл Святога Сімяона (Ганцавічы)',
    beDesc:
      'Касцёл Святога Сімяона ў Ганцавічах — храм раённага цэнтра на захаднім фланцы калідора Васілевічы — Івацэвічы.',
    beTags: ['Беларусь', 'Брэсцкая вобласць', 'Ганцавічы', 'Касцёл', 'XIX стагоддзе'],
  }),
  place({
    id: 'belarus_place_145',
    name: 'Костёл Святого Александра Невского (Лахва)',
    city: 'Лахва',
    regionRu: 'Брестская область',
    regionEn: 'Brest Region',
    regionBe: 'Брэсцкая вобласць',
    address: 'Костёл Святого Александра Невского, Лахва, Брестская область, Беларусь',
    lat: 52.2603,
    lng: 27.3467,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Александра Невского в Лахве — храм в посёлке на полпути по коридору между Василевичами и Ивацевичами. Кирпичная архитектура напоминает о польско-католическом наследии центрального Полесья. Лахва связана с лесной промышленностью; костёл — заметная точка в полосе 20–30 км от линии.',
    tags: ['Беларусь', 'Брестская область', 'Лахва', 'Костёл', 'Полесье', 'XIX век'],
    enName: 'Church of Saint Alexander Nevsky (Lakhva)',
    enDesc:
      'The Church of Saint Alexander Nevsky in Lakhva stands midway along the Vasilevichi–Ivatsevichi corridor. Brick architecture reflects Catholic heritage of central Polesie. It is a visible point within the 20–30 km belt on the map.',
    enTags: ['Belarus', 'Brest Region', 'Lakhva', 'Church', 'Polesie', '19th century'],
    beName: 'Касцёл Святога Аляксандра Неўскага (Лахва)',
    beDesc:
      'Касцёл Святога Аляксандра Неўскага ў Лахве — храм на паловіні калідора Васілевічы — Івацэвічы ў цэнтральным Палессі.',
    beTags: ['Беларусь', 'Брэсцкая вобласць', 'Лахва', 'Касцёл', 'Палессе', 'XIX стагоддзе'],
  }),
];

writeFileSync('places-export-corridor-vi.json', JSON.stringify(places, null, 2) + '\n', 'utf8');
console.log('Wrote', places.length, '→ places-export-corridor-vi.json');
