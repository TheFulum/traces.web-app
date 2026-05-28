import { writeFileSync } from 'fs';

const TS = '2026-05-21T14:00:00.000Z';

function createdOn(display, year) {
  return { day: null, sortKey: year * 10000, precision: 'year', display, year, month: null };
}

function place(p) {
  const { id, name, city, address, lat, lng, description, display, year, author = null, tags, i18n } = p;
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
    author,
    openingDate: display,
    name,
    openingAddress: '',
    i18n: {
      ru: {
        address: i18n.ru.address,
        city: i18n.ru.city,
        author: i18n.ru.author ?? author,
        description: i18n.ru.description ?? description,
        openingAddress: '',
        name: i18n.ru.name ?? name,
      },
      en: i18n.en,
      be: i18n.be,
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

function mk(ruAddr, ruCity, enAddr, enCity, beAddr, beCity, extra = {}) {
  return {
    ru: { address: ruAddr, city: ruCity, ...extra.ru },
    en: { address: enAddr, city: enCity, author: extra.author ?? null, ...extra.en },
    be: { address: beAddr, city: beCity, author: extra.authorBe ?? extra.author ?? null, ...extra.be },
  };
}

/** @param {object} p */
function ch(p) {
  const { id, name, city, address, lat, lng, display, year, description, tags, enName, enDesc, enTags, beName, beDesc, beTags } = p;
  return place({
    id,
    name,
    city,
    address,
    lat,
    lng,
    display,
    year,
    description,
    tags,
    i18n: mk(
      `${city}, ${p.regionRu}, Беларусь`,
      city,
      `${city}, ${p.regionEn}, Belarus`,
      city,
      `${city}, ${p.regionBe}, Беларусь`,
      city,
      {
        en: { name: enName, description: enDesc, tags: enTags },
        be: { name: beName, description: beDesc, tags: beTags },
      }
    ),
  });
}

const places = [
  // ── Юг: под Минском к границе (10) ──
  ch({
    id: 'belarus_place_081',
    name: 'Музей «Слуцкий пояс» (Слуцк)',
    city: 'Слуцк',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Музей «Слуцкий пояс», Слуцк, Минская область, Беларусь',
    lat: 53.0278,
    lng: 27.5498,
    display: 'XX в.',
    year: 1980,
    description:
      'Музей «Слуцкий пояс» в Слуцке посвящён знаменитому народному промыслу — ткачеству шёлковых поясов с характерным геометрическим орнаментом. Экспозиция рассказывает о мануфактурах, мастерах и судьбе слуцких ткачей, а также о городе как центре Полесья. Слуцк — древний город с богатой историей Речи Посполитой; музей дополняет маршруты южнее Минска, где на карте мало памятных точек между Несвижем и Бобруйском.',
    tags: ['Беларусь', 'Минская область', 'Слуцк', 'Музей', 'Ремёсла', 'XX век'],
    enName: 'Slutsk Sash Museum (Slutsk)',
    enDesc:
      'The Slutsk Sash Museum celebrates Belarus\'s famous craft of woven silk belts with geometric patterns. Exhibits cover manufactories, artisans and the town\'s role in Polesie. Slutsk is an ancient centre of the Commonwealth era; the museum fills a gap on routes south of Minsk between Nesvizh and Bobruisk.',
    enTags: ['Belarus', 'Minsk Region', 'Slutsk', 'Museum', 'Crafts', '20th century'],
    beName: 'Музей «Слуцкі пояс» (Слуцк)',
    beDesc:
      'Музей «Слуцкі пояс» у Слуцку прысвечаны знакамітаму народнаму прамыслу — ткацтву шаўковых паясаў. Экспазіцыя пра мануфактуры і гісторыю горада на Палессі.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Слуцк', 'Музей', 'Рмяство', 'XX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_082',
    name: 'Старобинские соляные копи (Старобин)',
    city: 'Старобин',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Соляные копи, Старобин, Минская область, Беларусь',
    lat: 52.7239,
    lng: 27.4606,
    display: 'XX в.',
    year: 1950,
    description:
      'Старобинские соляные копи — уникальный промышленно-туристический объект на юге Минской области, где веками добывали «белую соль» для всей региона. Подземные галереи и озёра-отстойники образуют необычный ландшафт, популярный у экскурсантов. Старобин связывают с соляным промыслом ещё со времён Великого княжества Литовского. Сегодня это одна из немногих «точек» на карте между Слуцком и Солигорском.',
    tags: ['Беларусь', 'Минская область', 'Старобин', 'Промысел', 'Соль', 'XX век'],
    enName: 'Starobin Salt Mines (Starobin)',
    enDesc:
      'The Starobin salt mines are a unique industrial and tourist site in southern Minsk Region where «white salt» was extracted for centuries. Underground galleries and brine lakes form a striking landscape. Starobin\'s salt trade dates to the Grand Duchy; today it is a rare landmark between Slutsk and Soligorsk.',
    enTags: ['Belarus', 'Minsk Region', 'Starobin', 'Industry', 'Salt', '20th century'],
    beName: 'Старобінскія соляныя капальні (Старобін)',
    beDesc:
      'Старобінскія соляныя капальні — унікальны прамысловы і турыстычны аб\'ект на поўдні Міншчыны з падземнымі галерэямі і солянымі азёрамі.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Старобін', 'Прамысел', 'Соль', 'XX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_083',
    name: 'Собор Рождества Пресвятой Богородицы (Солигорск)',
    city: 'Солигорск',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Собор Рождества Пресвятой Богородицы, Солигорск, Минская область, Беларусь',
    lat: 52.7878,
    lng: 27.5333,
    display: 'XX в.',
    year: 1958,
    description:
      'Собор Рождества Пресвятой Богородицы в Солигорске — главный православный храм молодого города калийной промышленности. Купола и колокольня видны издалека на фоне терриконов и соляных отвалов. Солигорск вырос в послевоенные годы вокруг месторождений соли и калия; собор стал духовным центром для горняков и строителей. Архитектура сочетает неовизантийские мотивы с монументальностью советского градостроительства.',
    tags: ['Беларусь', 'Минская область', 'Солигорск', 'Собор', 'Православие', 'XX век'],
    enName: 'Nativity of the Virgin Cathedral (Soligorsk)',
    enDesc:
      'The Nativity Cathedral in Soligorsk is the main Orthodox church of a town built on potassium and salt mining. Domes are visible above slag heaps and salt waste. Soligorsk grew after World War II; the cathedral became the spiritual centre for miners. Architecture mixes neo-Byzantine motifs with Soviet monumentality.',
    enTags: ['Belarus', 'Minsk Region', 'Soligorsk', 'Cathedral', 'Orthodox', '20th century'],
    beName: 'Сабор Нараджэння Найсвяцейшай Багародзіцы (Салігорск)',
    beDesc:
      'Сабор Нараджэння ў Салігорску — галоўны праваслаўны храм горада калійнай прамысловасці, бачны на фоне тэрыконаў і соляных адвалаў.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Салігорск', 'Сабор', 'Праваслаўе', 'XX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_084',
    name: 'Костёл Успения Пресвятой Девы Марии (Лунинец)',
    city: 'Лунинец',
    regionRu: 'Брестская область',
    regionEn: 'Brest Region',
    regionBe: 'Брэсцкая вобласць',
    address: 'Костёл Успения, Лунинец, Брестская область, Беларусь',
    lat: 52.2472,
    lng: 26.8047,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения Пресвятой Девы Марии в Лунинце — крупный неоготический храм железнодорожного города на Полесье, в узле линий к Пинску и Бресту. Высокие контрфорсы и стрельчатые окна задают силуэт центра. Лунинец развивался как станция и мастерские; костёл стал символом католической общины южного региона. Он заполняет «пустоту» на карте между Любанью и Брестской областью.',
    tags: ['Беларусь', 'Брестская область', 'Лунинец', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Church of the Assumption (Luninets)',
    enDesc:
      'The Assumption Church in Luninets is a large neo-Gothic church in a railway town of Polesie at junctions to Pinsk and Brest. Buttresses and pointed arches define the centre. Luninets grew as a depot; the church symbolises the Catholic community of the south. It fills the map gap between Lyuban and southern Brest Region.',
    enTags: ['Belarus', 'Brest Region', 'Luninets', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Унебаўзяцця (Лунінец)',
    beDesc:
      'Касцёл Унебаўзяцця ў Лунінцы — неагатычны храм чыгуначнага горада на Палессі, сімвал каталіцкай супольнасці поўдня.',
    beTags: ['Беларусь', 'Брэсцкая вобласць', 'Лунінец', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_085',
    name: 'Костёл Святого Станислава (Житковичи)',
    city: 'Житковичи',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Костёл Святого Станислава, Житковичи, Гомельская область, Беларусь',
    lat: 52.4456,
    lng: 27.8558,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Станислава в Житковичах — фарный храм на окраине Полесья, недалеко от зоны Припятского радиационно-экологического заповедника. Кирпичная базилика с башней напоминает о польско-литовском наследии района. Житковичи — ворота к Полесскому государственному радиационно-экологическому заповеднику; город сохранил деревянную и кирпичную застройку. Костёл — главная историческая вертикаль на карте между Речицей и южной границей.',
    tags: ['Беларусь', 'Гомельская область', 'Житковичи', 'Костёл', 'Полесье', 'XIX век'],
    enName: 'Church of Saint Stanislaus (Zhitkovichi)',
    enDesc:
      'The Church of Saint Stanislaus in Zhitkovichi is a parish church on the edge of Polesie near the Pripyat reserve. A brick basilica with a tower reflects Polish-Lithuanian heritage. Zhitkovichi gateway to the Pripyat reserve retains historic fabric. The church is the main landmark between Rechitsa and the southern border.',
    enTags: ['Belarus', 'Gomel Region', 'Zhitkovichi', 'Church', 'Polesie', '19th century'],
    beName: 'Касцёл Святога Станіслава (Жыткавічы)',
    beDesc:
      'Касцёл Святога Станіслава ў Жыткавічах — фарны храм на ўскрайку Палесся каля Прыпяцкага запаведніка, галоўная гістарычная вертыкаль раёна.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Жыткавічы', 'Касцёл', 'Палессе', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_086',
    name: 'Костёл Непорочного Зачатия (Калинковичи)',
    city: 'Калинковичи',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Костёл Непорочного Зачатия, Калинковичи, Гомельская область, Беларусь',
    lat: 52.1303,
    lng: 29.3267,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Непорочного Зачатия Пресвятой Девы Марии в Калинковичах — монументальный храм в центре города на Соже, важного узла на пути к Мозырю и Украине. Неороманские формы и высокая башня доминируют над набережной. Калинковичи известны лесной и деревоперерабатывающей промышленностью, но исторический центр сохраняет черты местечка. Костёл закрывает пробел на карте юго-восточного Полесья.',
    tags: ['Беларусь', 'Гомельская область', 'Калинковичи', 'Костёл', 'Сож', 'XIX век'],
    enName: 'Immaculate Conception Church (Kalinkovichi)',
    enDesc:
      'The Immaculate Conception Church in Kalinkovichi is a monumental church on the Sozh, a hub towards Mozyr and Ukraine. Neo-Romanesque forms and a tall tower dominate the embankment. The town is known for timber industry yet retains historic centre character. The church fills a gap in south-eastern Polesie.',
    enTags: ['Belarus', 'Gomel Region', 'Kalinkovichi', 'Church', 'Sozh', '19th century'],
    beName: 'Касцёл Непахрыўнага Зачаття (Калінкавічы)',
    beDesc:
      'Касцёл Непахрыўнага Зачатця ў Калінкавічах — манументальны храм у цэнтры горада на Сожы, дамінанта гістарычнай забудовы.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Калінкавічы', 'Касцёл', 'Сож', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_087',
    name: 'Церковь Успения Пресвятой Богородицы (Ельск)',
    city: 'Ельск',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Церковь Успения, Ельск, Гомельская область, Беларусь',
    lat: 51.8136,
    lng: 29.6292,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Церковь Успения Пресвятой Богородицы в Ельске — православный храм в глубинном полесском городе недалеко от границы с Украиной. Пятиглавие и колокольня выделяются на фоне низкой застройки. Ельск — центр района с развитой аграрной экономикой; церковь напоминает о русско-православной традиции этих земель. Это редкая «точка» на карте у самой южной оконечности Гомельщины.',
    tags: ['Беларусь', 'Гомельская область', 'Ельск', 'Церковь', 'Православие', 'XIX век'],
    enName: 'Dormition Church (Yelsk)',
    enDesc:
      'The Dormition Church in Yelsk is an Orthodox church in a remote Polesie town near the Ukrainian border. Five domes and a bell tower stand above low-rise fabric. Yelsk is a district centre with agriculture; the church reflects Orthodox tradition. It is a rare landmark at the southern tip of Gomel Region.',
    enTags: ['Belarus', 'Gomel Region', 'Yelsk', 'Church', 'Orthodox', '19th century'],
    beName: 'Царква Унебаўзяцця (Ельск)',
    beDesc:
      'Царква Унебаўзяцця ў Ельску — праваслаўны храм у глыбінным палескім горадзе каля ўкраінскай мяжы, рэдкая кропка на карце паўднёвай Гомельшчыны.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Ельск', 'Царква', 'Праваслаўе', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_088',
    name: 'Свято-Троицкая церковь (Наровля)',
    city: 'Наровля',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Свято-Троицкая церковь, Наровля, Гомельская область, Беларусь',
    lat: 51.7961,
    lng: 29.4972,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Свято-Троицкая церковь в Наровле — деревянный православный храм на берегу Припяти, в городе-порте близ украинской границы. Силуэт шатровых глав контрастирует с пойменным ландшафтом. Наровля связана с речной торговлей и рыболовством; церковь — один из старейших архитектурных акцентов посёлка, ставшего городом. Место важно для маршрутов по южному Полесью и Припятскому краю.',
    tags: ['Беларусь', 'Гомельская область', 'Наровля', 'Церковь', 'Деревянное зодчество', 'Припять'],
    enName: 'Holy Trinity Church (Narowlya)',
    enDesc:
      'The Holy Trinity Church in Narowlya is a wooden Orthodox church on the Pripyat in a river port near Ukraine. Tent roofs contrast with floodplain landscape. Narowlya is linked to river trade; the church is among the oldest architectural accents of the settlement. It anchors routes through southern Polesie.',
    enTags: ['Belarus', 'Gomel Region', 'Narowlya', 'Church', 'Wooden architecture', 'Pripyat'],
    beName: 'Троіцкая царква (Нароўля)',
    beDesc:
      'Троіцкая царква ў Нароўлі — драўляны праваслаўны храм на беразе Прыпяці, стары архітэктурны акцэнт горада-порта.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Нароўля', 'Царква', 'Драўлянае зодчва', 'Прыпяць'],
  }),
  ch({
    id: 'belarus_place_089',
    name: 'Мемориальный комплекс «Прорыв» (Столбцы)',
    city: 'Столбцы',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Мемориал «Прорыв», Столбцы, Минская область, Беларусь',
    lat: 53.4833,
    lng: 26.7333,
    display: 'XX в.',
    year: 1975,
    description:
      'Мемориальный комплекс «Прорыв» под Столбцами отмечает героизм воинов, прорвавших оборону противника в 1944 году на пути освобождения Беларуси. Монумент и аллея памяти расположены в пригородном лесу; сюда приходят жители и гости города 8 мая и в День Победы. Столбцы — старый город на реке Неман с костёлами и сутинцем; мемориал дополняет исторический маршрут юго-западнее Минска в «пустой» зоне карты.',
    tags: ['Беларусь', 'Минская область', 'Столбцы', 'Мемориал', 'ВОВ', 'XX век'],
    enName: 'Breakthrough Memorial Complex (Stolbtsy)',
    enDesc:
      'The Breakthrough memorial near Stolbtsy honours soldiers who pierced enemy defences in 1944 during Belarus\'s liberation. A monument and alley stand in suburban forest; ceremonies mark Victory Day. Stolbtsy is an old Neman town with churches; the memorial adds a point south-west of Minsk where the map was sparse.',
    enTags: ['Belarus', 'Minsk Region', 'Stolbtsy', 'Memorial', 'WWII', '20th century'],
    beName: 'Мемарыяльны комплекс «Прорыў» (Стоўбцы)',
    beDesc:
      'Мемарыяльны комплекс «Прорыў» пад Стоўбцамі — помнік воінам, якія прарвалі абарону ў 1944 годзе, важная кропка памяці на паўднёвым захадзе Міншчыны.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Стоўбцы', 'Мемарыял', 'ВОВ', 'XX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_090',
    name: 'Костёл Святого Иосифа (Брагин)',
    city: 'Брагин',
    regionRu: 'Гомельская область',
    regionEn: 'Gomel Region',
    regionBe: 'Гомельская вобласць',
    address: 'Костёл Святого Иосифа, Брагин, Гомельская область, Беларусь',
    lat: 51.8011,
    lng: 30.2678,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Иосифа в Брагине — кирпичный храм в районном центре на Днепре, в зоне, пострадавшей от аварии на ЧАЭС. Башня и неоготические детали сохранились как символ довоенного и послевоенного местечка. Брагин — ворота к Чернобыльской зоне отчуждения с белорусской стороны; город пережил переселение, но костёл остаётся ориентиром. Точка закрывает южную «дыру» на карте между Речицей и границей.',
    tags: ['Беларусь', 'Гомельская область', 'Брагин', 'Костёл', 'Днепр', 'XIX век'],
    enName: 'Church of Saint Joseph (Bragin)',
    enDesc:
      'The Church of Saint Joseph in Bragin is a brick church in a district centre on the Dnieper in the area affected by Chernobyl. A tower and neo-Gothic details symbolise the pre-war town. Bragin gates the exclusion zone from Belarus; the church remains a landmark filling the southern map gap.',
    enTags: ['Belarus', 'Gomel Region', 'Bragin', 'Church', 'Dnieper', '19th century'],
    beName: 'Касцёл Святога Іосіфа (Брагін)',
    beDesc:
      'Касцёл Святога Іосіфа ў Брагіне — цагляны храм у раённым цэнтры на Дняпрэ, арыенцір гістарычнага мястэчка ў паўднёвай Гомельшчыне.',
    beTags: ['Беларусь', 'Гомельская вобласць', 'Брагін', 'Касцёл', 'Дняпро', 'XIX стагоддзе'],
  }),

  // ── Северо-восток от Минска, полоса к Могилёву, Бегомль (10) ──
  ch({
    id: 'belarus_place_091',
    name: 'Костёл Рождества Пресвятой Девы Марии (Бегомль)',
    city: 'Бегомль',
    regionRu: 'Витебская область',
    regionEn: 'Vitebsk Region',
    regionBe: 'Віцебская вобласць',
    address: 'Костёл Рождества Пресвятой Девы Марии, Бегомль, Витебская область, Беларусь',
    lat: 54.7342,
    lng: 28.0597,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Рождества Пресвятой Девы Марии в Бегомле — главный памятник посёлка на трассе Минск — Витебск, в «пустом» клине между Борисовом и Лепелем. Кирпичный неоготический храм с высокой башней виден с дороги. Бегомль вырос как торгово-ремесленный пункт; сегодня это остановка для путешественников, исследующих северо-восток Минской области. Костёл — якорная точка для заполнения карты вокруг Бегомля.',
    tags: ['Беларусь', 'Витебская область', 'Бегомль', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Nativity of the Virgin Church (Begoml)',
    enDesc:
      'The Nativity Church in Begoml is the main monument of a town on the Minsk–Vitebsk highway in a gap between Borisov and Lepel. A brick neo-Gothic church with a tall tower is visible from the road. Begoml grew as a crafts and trade point; today it anchors map coverage around Begoml.',
    enTags: ['Belarus', 'Vitebsk Region', 'Begoml', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Нараджэння Найсвяцейшай Багародзіцы (Бегомль)',
    beDesc:
      'Касцёл Нараджэння ў Бегомлі — галоўны помнік пасёлка на трассе Мінск — Віцебск, якорная кропка для карты паміж Барысаў і Лепелем.',
    beTags: ['Беларусь', 'Віцебская вобласць', 'Бегомль', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_092',
    name: 'Костёл Воскресения Христова (Докшицы)',
    city: 'Докшицы',
    regionRu: 'Витебская область',
    regionEn: 'Vitebsk Region',
    regionBe: 'Віцебская вобласць',
    address: 'Костёл Воскресения Христова, Докшицы, Витебская область, Беларусь',
    lat: 54.8917,
    lng: 27.7667,
    display: 'кон. XVIII в.',
    year: 1780,
    description:
      'Костёл Воскресения Христова в Докшицах — барочный фарный храм в районном центре на севере Витебщины, недалеко от Бегомля и Лепеля. Активный фасад с волютами и внутреннее убранство относят к виленской школе. Докшицы известны также еврейским наследием и памятниками ВОВ; костёл доминирует над центральной площадью. Важная точка для северного сектора карты между Полоцком и Минском.',
    tags: ['Беларусь', 'Витебская область', 'Докшицы', 'Костёл', 'Барокко', 'XVIII век'],
    enName: 'Church of the Resurrection (Dokshitsy)',
    enDesc:
      'The Resurrection Church in Dokshitsy is a Baroque parish church in a northern district centre near Begoml and Lepel. A dynamic façade belongs to the Vilnius school. Dokshitsy also has Jewish heritage and WWII memorials; the church dominates the square. It fills the northern sector between Polotsk and Minsk.',
    enTags: ['Belarus', 'Vitebsk Region', 'Dokshitsy', 'Church', 'Baroque', '18th century'],
    beName: 'Касцёл Уваскрасення Хрыста (Докшыцы)',
    beDesc:
      'Касцёл Уваскрасення ў Докшыцах — барокавы фарны храм у раённым цэнтры на поўначы Віцебшчыны, дамінанта плошчы.',
    beTags: ['Беларусь', 'Віцебская вобласць', 'Докшыцы', 'Касцёл', 'Барока', 'XVIII стагоддзе'],
  }),
  ch({
    id: 'belarus_place_093',
    name: 'Костёл святого Антония (Поставы)',
    city: 'Поставы',
    regionRu: 'Витебская область',
    regionEn: 'Vitebsk Region',
    regionBe: 'Віцебская вобласць',
    address: 'Костёл святого Антония, Поставы, Витебская область, Беларусь',
    lat: 55.1167,
    lng: 26.8333,
    display: 'кон. XVIII в.',
    year: 1780,
    description:
      'Костёл святого Антония в Поставах — один из выдающихся памятников виленского барокко на севере Беларуси, с двумя башнями и богатым интерьером. Поставы — старый город на реке Миорке, центр озёрного края. Храм действующий, привлекает паломников и любителей архитектуры. Вместе с окрестными костёлами и усадьбами формирует кластер, закрывающий «белое пятно» северо-западнее Бегомля.',
    tags: ['Беларусь', 'Витебская область', 'Поставы', 'Костёл', 'Барокко', 'XVIII век'],
    enName: 'Church of Saint Anthony (Postavy)',
    enDesc:
      'The Church of Saint Anthony in Postavy is among the finest Vilnius Baroque monuments in northern Belarus, with two towers and rich interiors. Postavy is an old town on the Myoryanka river in lake country. The active church draws pilgrims and architecture lovers, filling the map north-west of Begoml.',
    enTags: ['Belarus', 'Vitebsk Region', 'Postavy', 'Church', 'Baroque', '18th century'],
    beName: 'Касцёл святога Антона (Паставы)',
    beDesc:
      'Касцёл святога Антона ў Паставах — выбітны помнік віленскага барока на поўначы Беларусі з дзвюма вежамі, цэнтр азёрнага краю.',
    beTags: ['Беларусь', 'Віцебская вобласць', 'Паставы', 'Касцёл', 'Барока', 'XVIII стагоддзе'],
  }),
  ch({
    id: 'belarus_place_094',
    name: 'Костёл Преображения Господня (Видзы)',
    city: 'Видзы',
    regionRu: 'Витебская область',
    regionEn: 'Vitebsk Region',
    regionBe: 'Віцебская вобласць',
    address: 'Костёл Преображения Господня, Видзы, Витебская область, Беларусь',
    lat: 55.3944,
    lng: 26.6111,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Преображения Господня в Видзах — крупный неоготический храм на границе с Литвой, в историческом регионе Браславщины. Две башни и стрельчатые окна видны издалека на фоне холмистого рельефа. Видзы — центр сельского района с смешанным населением; костёл стал символом католического наследия пограничья. Точка дополняет кластер Постав — Браслав — Бегомль на карте.',
    tags: ['Беларусь', 'Витебская область', 'Видзы', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Church of the Transfiguration (Vidzy)',
    enDesc:
      'The Transfiguration Church in Vidzy is a large neo-Gothic church on the Lithuanian border in Braslav region. Two towers are visible on hilly terrain. Vidzy is a rural district centre; the church symbolises Catholic heritage of the frontier. It complements the Postavy–Braslav–Begoml cluster on the map.',
    enTags: ['Belarus', 'Vitebsk Region', 'Vidzy', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Праабражэння (Відзы)',
    beDesc:
      'Касцёл Праабражэння ў Відзах — неагатычны храм на мяжы з Літвой у Браслаўшчыне, сімвал каталіцкай спадчыны пагранічча.',
    beTags: ['Беларусь', 'Віцебская вобласць', 'Відзы', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_095',
    name: 'Свято-Борисо-Глебская церковь (Борисов)',
    city: 'Борисов',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Свято-Борисо-Глебская церковь, Борисов, Минская область, Беларусь',
    lat: 54.2244,
    lng: 28.5100,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Свято-Борисо-Глебская церковь в Борисове — православный храм в городе на Березине, ключевом узле между Минском и Могилёвом. Купола и колокольня украшают исторический центр рядом с мемориалами и застройкой XIX–XX веков. Борисов известен спортивной историей и промышленностью, но церковь напоминает о древней традиции имени Бориса и Глеба. Закрывает пробел на карте в полосе 30–50 км северо-восточнее Минска.',
    tags: ['Беларусь', 'Минская область', 'Борисов', 'Церковь', 'Православие', 'XIX век'],
    enName: 'Saints Boris and Gleb Church (Borisov)',
    enDesc:
      'The Saints Boris and Gleb Church in Borisov is an Orthodox church on the Berezina between Minsk and Mogilev. Domes adorn the historic centre near 19th–20th-century fabric. Borisov is known for industry and sport; the church recalls ancient patron saints. It fills the 30–50 km strip north-east of Minsk.',
    enTags: ['Belarus', 'Minsk Region', 'Borisov', 'Church', 'Orthodox', '19th century'],
    beName: 'Свята-Барыса-Глебская царква (Барысаў)',
    beDesc:
      'Свята-Барыса-Глебская царква ў Барысаўе — праваслаўны храм на Бярозіне ў пасе Мінск — Магілёў, важная кропка на карце паўночна-усход ад Мінска.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Барысаў', 'Царква', 'Праваслаўе', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_096',
    name: 'Костёл Успения Пресвятой Девы Марии (Смолевичи)',
    city: 'Смолевичи',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Костёл Успения, Смолевичи, Минская область, Беларусь',
    lat: 54.0258,
    lng: 28.0897,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения Пресвятой Девы Марии в Смолевичах — неоготический храм в городе у «Белорусской Макеевки» и аэропорта Минск. Высокая башня видна с трассы Минск — Москва. Смолевичи выросли как железнодорожная станция; костёл сохранил роль духовного центра для местной общины. Точка на карте между Минском и Борисовом, в запрошенной полосе к Могилёву.',
    tags: ['Беларусь', 'Минская область', 'Смолевичи', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Church of the Assumption (Smolevichi)',
    enDesc:
      'The Assumption Church in Smolevichi is a neo-Gothic church near Belarusian Makiivka and Minsk airport. A tall tower is seen from the Minsk–Moscow highway. Smolevichi grew as a railway station; the church remains a spiritual centre between Minsk and Borisov on the corridor to Mogilev.',
    enTags: ['Belarus', 'Minsk Region', 'Smolevichi', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Унебаўзяцця (Смалявічы)',
    beDesc:
      'Касцёл Унебаўзяцця ў Смалявічах — неагатычны храм каля аэрапорта Мінск, важная кропка на карце паміж Мінскам і Барысаў.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Смалявічы', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_097',
    name: 'Костёл Успения Пресвятой Девы Марии (Червень)',
    city: 'Червень',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Костёл Успения, Червень, Минская область, Беларусь',
    lat: 53.6428,
    lng: 28.4331,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения Пресвятой Девы Марии в Червене — монументальный кирпичный храм в городе на реке Усадзе, восточнее Минска по старой Борисовской дороге. Неороманский стиль и центральное положение делают его доминантой площади. Червень известен с XVI века; сохранились фрагменты исторической застройки. Костёл заполняет карту в «коридоре» Минск — Могилёв, где мало точек между Смолевичами и Бобруйском.',
    tags: ['Беларусь', 'Минская область', 'Червень', 'Костёл', 'XIX век', 'Усада'],
    enName: 'Church of the Assumption (Cherven)',
    enDesc:
      'The Assumption Church in Cherven is a monumental brick church on the Usada east of Minsk on the old Borisov road. Neo-Romanesque forms dominate the square. Cherven is known since the 16th century; the church fills the Minsk–Mogilev corridor between Smolevichi and Bobruisk.',
    enTags: ['Belarus', 'Minsk Region', 'Cherven', 'Church', '19th century', 'Usada'],
    beName: 'Касцёл Унебаўзяцця (Чэрвень)',
    beDesc:
      'Касцёл Унебаўзяцця ў Чэрвені — манументальны храм на раке Усада ў «калідоры» Мінск — Магілёў, дамінанта плошчы.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Чэрвень', 'Касцёл', 'XIX стагоддзе', 'Усада'],
  }),
  ch({
    id: 'belarus_place_098',
    name: 'Костёл Святого Иоанна Крестителя (Крупки)',
    city: 'Крупки',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Костёл Святого Иоанна Крестителя, Крупки, Минская область, Беларусь',
    lat: 54.3167,
    lng: 29.1333,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Иоанна Крестителя в Крупках — кирпичный храм в городе на севере Минской области, между Борисовом и Могилёвом. Башня и стрельчатые окна выделяют центр поселения, выросшего вокруг железнодорожного узла. Крупки связаны с партизанским движением и мемориалами ВОВ; костёл напоминает о довоенном облике местечка. Важная точка для заполнения северо-восточного сектора карты.',
    tags: ['Беларусь', 'Минская область', 'Крупки', 'Костёл', 'XIX век', 'Железная дорога'],
    enName: 'Church of Saint John the Baptist (Krupki)',
    enDesc:
      'The Church of Saint John the Baptist in Krupki is a brick church north of Minsk Region between Borisov and Mogilev. A tower marks the centre of a railway junction town. Krupki is linked to partisan history; the church recalls the pre-war townscape and fills the north-east map sector.',
    enTags: ['Belarus', 'Minsk Region', 'Krupki', 'Church', '19th century', 'Railway'],
    beName: 'Касцёл Святога Іаана Хрысціціця (Крупкі)',
    beDesc:
      'Касцёл Святога Іаана Хрысціціця ў Крупках — храм у чыгуначным вузле паміж Барысаў і Магілёв, кропка на паўночна-усходнім сектары карты.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Крупкі', 'Касцёл', 'XIX стагоддзе', 'Чыгунка'],
  }),
  ch({
    id: 'belarus_place_099',
    name: 'Костёл Святого Николая (Пуховичи)',
    city: 'Пуховичи',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Костёл Святого Николая, Пуховичи, Минская область, Беларусь',
    lat: 53.5286,
    lng: 28.6278,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Николая в Пуховичах — неоготический храм в районном центре на реке Птичь, по направлению к Могилёву от Минска. Высокие контрфорсы и острые арки украшают главную улицу. Пуховичи окружены лесами и аграрными угодьями; город служит транспортным узлом юго-восточного направления от столицы. Костёл — редкий архитектурный акцент в полосе, где на карте почти нет других объектов.',
    tags: ['Беларусь', 'Минская область', 'Пуховичи', 'Костёл', 'Неоготика', 'XIX век'],
    enName: 'Church of Saint Nicholas (Pukhovichi)',
    enDesc:
      'The Church of Saint Nicholas in Pukhovichi is a neo-Gothic church on the Ptich river towards Mogilev from Minsk. Buttresses line the main street. Pukhovichi is surrounded by forests and farms; the church is a rare architectural point in a sparse map strip.',
    enTags: ['Belarus', 'Minsk Region', 'Pukhovichi', 'Church', 'Neo-Gothic', '19th century'],
    beName: 'Касцёл Святога Мікалая (Пухавічы)',
    beDesc:
      'Касцёл Святога Мікалая ў Пухавічах — неагатычны храм на Пцічы ў пасе Мінск — Магілёў, рэдкі архітэктурны акцэнт раёна.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Пухавічы', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
  }),
  ch({
    id: 'belarus_place_100',
    name: 'Музей Нарочанского края (Мядель)',
    city: 'Мядель',
    regionRu: 'Минская область',
    regionEn: 'Minsk Region',
    regionBe: 'Мінская вобласць',
    address: 'Музей Нарочанского края, Мядель, Минская область, Беларусь',
    lat: 54.8778,
    lng: 27.0344,
    display: 'XX в.',
    year: 1986,
    description:
      'Музей Нарочанского края в Мяделе — краеведческий центр озёрного края, рассказывающий о природе, рыболовстве, этнографии и истории сёл вокруг Нарочи. Мядель — ворота к национальному парку, но музей даёт контекст без необходимости ограничиваться только природным маршрутом. Экспозиции включают археологию, быт и события XX века. Точка заполняет северный сектор карты между Вилейкой и Бегомлем, где мало культурных объектов.',
    tags: ['Беларусь', 'Минская область', 'Мядель', 'Музей', 'Нарочь', 'XX век'],
    enName: 'Naroch Region Museum (Myadel)',
    enDesc:
      'The Naroch Region Museum in Myadel is a local history centre of lake country covering nature, fishing, ethnography and village history around Lake Naroch. Myadel gates the national park; the museum adds cultural context. Exhibits span archaeology, daily life and the 20th century, filling the northern sector between Vileika and Begoml.',
    enTags: ['Belarus', 'Minsk Region', 'Myadel', 'Museum', 'Naroch', '20th century'],
    beName: 'Музей Нарачанскага края (Мядзел)',
    beDesc:
      'Музей Нарачанскага края ў Мядзеле — краязнаўчы цэнтр азёрнага краю, кропка на карце паміж Вілейкай і Бегамлем.',
    beTags: ['Беларусь', 'Мінская вобласць', 'Мядзел', 'Музей', 'Нароч', 'XX стагоддзе'],
  }),
];

writeFileSync('places-export-batch5.json', JSON.stringify(places, null, 2) + '\n', 'utf8');
console.log('Wrote', places.length, 'places to places-export-batch5.json');
