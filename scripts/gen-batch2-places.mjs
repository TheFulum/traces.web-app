import { writeFileSync } from 'fs';

const TS = '2026-05-21T10:00:00.000Z';

function createdOn(display, year) {
  return { day: null, sortKey: year * 10000, precision: 'year', display, year, month: null };
}

function place(p) {
  const {
    id, name, city, address, lat, lng, description, display, year,
    author = null, tags, i18n,
  } = p;
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

const places = [
  // —— Гомельская область (5) ——
  place({
    id: 'belarus_place_046',
    name: 'Костёл Святой Троицы (Гомель)',
    city: 'Гомель',
    address: 'Костёл Святой Троицы, Гомель, Гомельская область, Беларусь',
    lat: 52.4412,
    lng: 31.0145,
    display: 'XIX в.',
    year: 1860,
    description:
      'Костёл Святой Троицы в Гомеле — один из старейших католических храмов города, возведённый в XIX веке в классических формах с элементами неоромантики. Кирпичное здание с колонным портиком и лаконичным фасадом расположено в исторической части Гомеля, вдали от дворцового ансамбля на берегу Сожа. Храм пережил войны и советский период, сохранив статус духовного центра католической общины. Архитектура костёла отражает эпоху активного градостроительства Гомеля как промышленного и торгового центра юга Беларуси.',
    tags: ['Беларусь', 'Гомельская область', 'Гомель', 'Костёл', 'XIX век', 'Неоромантика', 'Сож'],
    i18n: {
      ru: { address: 'Гомель, Гомельская область, Беларусь', city: 'Гомель' },
      en: {
        name: 'Holy Trinity Church (Gomel)',
        address: 'Gomel, Gomel Region, Belarus',
        city: 'Gomel',
        author: null,
        description:
          'The Holy Trinity Church in Gomel is one of the city\'s oldest Catholic churches, built in the 19th century in classical forms with neo-Romanesque elements. The brick building with a columned portico and restrained façade stands in the historic part of Gomel, away from the palace ensemble on the Sozh. The church survived wars and the Soviet period, retaining its role as the spiritual centre of the Catholic community. Its architecture reflects the era when Gomel developed actively as an industrial and trading centre of southern Belarus.',
        tags: ['Belarus', 'Gomel Region', 'Gomel', 'Church', '19th century', 'Neo-Romanesque', 'Sozh'],
      },
      be: {
        name: 'Касцёл Святой Тройцы (Гомель)',
        address: 'Гомель, Гомельская вобласць, Беларусь',
        city: 'Гомель',
        author: null,
        description:
          'Касцёл Святой Тройцы ў Гомелі — адзін з найстаражытнейших каталіцкіх храмаў горада, узведзены ў XIX стагоддзі ў класічных формах з элементамі неарамантыкі. Цаглянае будынне з калонным порцікам і лаканічным фасадам размешчана ў гістарычнай частцы Гомеля, удалі ад палацавага ансамбля на беразе Сожу. Храм перажыў войны і савецкі перыяд, захаваўшы статус духоўнага цэнтра каталіцкай супольнасці. Архітэктура касцёла адлюстроўвае эпоху актыўнага градабудавання Гомеля як прамысловага і гандлёвага цэнтра паўдня Беларусі.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Гомель', 'Касцёл', 'XIX стагоддзе', 'Неарамантыка', 'Сож'],
      },
    },
  }),
  place({
    id: 'belarus_place_047',
    name: 'Собор Святого праведного Иоанна Кронштадтского (Мозырь)',
    city: 'Мозырь',
    address: 'Собор Святого праведного Иоанна Кронштадтского, Мозырь, Гомельская область, Беларусь',
    lat: 52.0469,
    lng: 29.2453,
    display: 'кон. XX — нач. XXI в.',
    year: 1998,
    description:
      'Собор Святого праведного Иоанна Кронштадтского в Мозыре — современная доминанта православного Мозыря, возведённая в конце XX — начале XXI века на месте исторического храмового центра города. Высокий белокаменный храм с золотыми куполами виден издалека и контрастирует с древним рельефом Подолия на берегу Припяти. Мозырь — один из древнейших городов Полесья; собор дополняет ансамбль, в котором замковая гора и старинные улицы рассказывают о княжеском прошлом. Сегодня это главная православная церковь города и точка паломничества.',
    tags: ['Беларусь', 'Гомельская область', 'Мозырь', 'Собор', 'Православие', 'XX век', 'Припять'],
    i18n: {
      ru: { address: 'Мозырь, Гомельская область, Беларусь', city: 'Мозырь' },
      en: {
        name: 'Cathedral of Saint John of Kronstadt (Mozyr)',
        address: 'Mozyr, Gomel Region, Belarus',
        city: 'Mozyr',
        author: null,
        description:
          'The Cathedral of Saint John of Kronstadt in Mozyr is a modern landmark of Orthodox Mozyr, built in the late 20th and early 21st century on the site of the city\'s historic church centre. The tall white-stone church with golden domes is visible from afar and contrasts with the ancient Polesia landscape on the Pripyat bank. Mozyr is one of the oldest towns of Polesia; the cathedral complements an ensemble where castle hill and old streets tell of princely past. Today it is the city\'s main Orthodox church and a pilgrimage site.',
        tags: ['Belarus', 'Gomel Region', 'Mozyr', 'Cathedral', 'Orthodox', '20th century', 'Pripyat'],
      },
      be: {
        name: 'Сабор Святога праведнага Іаана Кранштадскага (Мазыр)',
        address: 'Мазыр, Гомельская вобласць, Беларусь',
        city: 'Мазыр',
        author: null,
        description:
          'Сабор Святога праведнага Іаана Кранштадскага ў Мазыры — сучасная дамінанта праваслаўнага Мазыра, узведзеная ў канцы XX — пачатку XXI стагоддзя на месцы гістарычнага храмавага цэнтра горада. Высокі белакаменны храм з залатымі купаламі бачны здалёку і кантрастуе з старажытным рэльефам Палесся на беразе Прыпяці. Мазыр — адзін з найстаражытнейших гарадоў Полесся; сабор дапаўняе ансамбль, у якім замкавая гара і старыя вуліцы расказваюць пра княжое мінулае. Сёння гэта галоўная праваслаўная царква горада і кропка паломніцтва.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Мазыр', 'Сабор', 'Праваслаўе', 'XX стагоддзе', 'Прыпяць'],
      },
    },
  }),
  place({
    id: 'belarus_place_048',
    name: 'Костёл Святой Варвары (Светлогорск)',
    city: 'Светлогорск',
    address: 'Костёл Святой Варвары, Светлогорск, Гомельская область, Беларусь',
    lat: 52.6326,
    lng: 29.7386,
    display: 'кон. XIX в.',
    year: 1880,
    description:
      'Костёл Святой Варвары в Светлогорске — монументальный неоготический храм конца XIX века, возвышающийся над центром города на берегу Березины. Стрельчатые окна, контрфорсы и высокая башня создают характерный силуэт, видимый с набережной и мостов. Светлогорск (бывший Шклов-на-Березине) развивался как речной порт и промышленный узел; костёл стал архитектурным символом католического присутствия в регионе. После реставрации храм вновь действует и входит в туристические маршруты вдоль «Березинского пути».',
    tags: ['Беларусь', 'Гомельская область', 'Светлогорск', 'Костёл', 'Неоготика', 'XIX век', 'Березина'],
    i18n: {
      ru: { address: 'Светлогорск, Гомельская область, Беларусь', city: 'Светлогорск' },
      en: {
        name: 'Church of Saint Barbara (Svetlogorsk)',
        address: 'Svetlogorsk, Gomel Region, Belarus',
        city: 'Svetlogorsk',
        author: null,
        description:
          'The Church of Saint Barbara in Svetlogorsk is a monumental neo-Gothic church of the late 19th century rising above the town centre on the Berezina river. Lancet windows, buttresses and a tall tower form a distinctive silhouette visible from the embankment and bridges. Svetlogorsk (formerly Shklov-on-Berezina) developed as a river port and industrial hub; the church became an architectural symbol of Catholic presence in the region. After restoration it is active again and forms part of tourist routes along the Berezina Path.',
        tags: ['Belarus', 'Gomel Region', 'Svetlogorsk', 'Church', 'Neo-Gothic', '19th century', 'Berezina'],
      },
      be: {
        name: 'Касцёл Святой Варвары (Светлагорск)',
        address: 'Светлагорск, Гомельская вобласць, Беларусь',
        city: 'Светлагорск',
        author: null,
        description:
          'Касцёл Святой Варвары ў Светлагорску — манументальны неагатычны храм канца XIX стагоддзя, які ўзвышаецца над цэнтрам горада на беразе Бярозіны. Стральчастыя вокны, контрфорсы і высокая вежа ствараюць характэрны сілуэт, бачны з набярэжнай і мастоў. Светлагорск (колішні Шклоў-на-Бярозіне) развіваўся як рачны порт і прамысловы вузел; касцёл стаў архітэктурным сімвалам каталіцкага прысутнасці ў рэгіёне. Пасля рэстаўрацыі храм зноў дзейнічае і ўваходзіць у турыстычныя маршруты ўздоўж «Бярозінскага шляху».',
        tags: ['Беларусь', 'Гомельская вобласць', 'Светлагорск', 'Касцёл', 'Неаготыка', 'XIX стагоддзе', 'Бярозіна'],
      },
    },
  }),
  place({
    id: 'belarus_place_049',
    name: 'Костёл Воздвижения Святого Креста (Хойники)',
    city: 'Хойники',
    address: 'Костёл Воздвижения Святого Креста, Хойники, Гомельская область, Беларусь',
    lat: 51.8942,
    lng: 29.9564,
    display: '2-я пол. XIX в.',
    year: 1870,
    description:
      'Костёл Воздвижения Святого Креста в Хойниках — крупный кирпичный храм второй половины XIX века, главная католическая достопримечательность южного Полесья Гомельщины. Здание в неороманском стиле с двумя башнями фланкирует центральную площадь города, пострадавшего в годы войны и аварии на Чернобыльской АЭС. Хойники — ворота к Полесскому радиационно-экологическому заповеднику; костёл напоминает о многовековой религиозной традиции местного населения. Реставрационные работы вернули храму монументальный облик и статус действующего культового сооружения.',
    tags: ['Беларусь', 'Гомельская область', 'Хойники', 'Костёл', 'XIX век', 'Полесье', 'Неоромантика'],
    i18n: {
      ru: { address: 'Хойники, Гомельская область, Беларусь', city: 'Хойники' },
      en: {
        name: 'Church of the Exaltation of the Holy Cross (Khoiniki)',
        address: 'Khoiniki, Gomel Region, Belarus',
        city: 'Khoiniki',
        author: null,
        description:
          'The Church of the Exaltation of the Holy Cross in Khoiniki is a large brick church of the second half of the 19th century, the main Catholic landmark of southern Polesia in Gomel Region. The neo-Romanesque building with two towers flanks the town\'s central square, in a town affected by war and the Chernobyl accident. Khoiniki is a gateway to the Polesie State Radioecological Reserve; the church recalls centuries of local religious tradition. Restoration has restored its monumental appearance and status as an active place of worship.',
        tags: ['Belarus', 'Gomel Region', 'Khoiniki', 'Church', '19th century', 'Polesia', 'Neo-Romanesque'],
      },
      be: {
        name: 'Касцёл Узвышэння Святога Крыжа (Хойнікі)',
        address: 'Хойнікі, Гомельская вобласць, Беларусь',
        city: 'Хойнікі',
        author: null,
        description:
          'Касцёл Узвышэння Святога Крыжа ў Хойніках — вялікі цагляны храм другой паловы XIX стагоддзя, галоўная каталіцкая славутнасць паўднёвага Полесся Гомельшчыны. Будынне ў неарамантычным стылі з двумя вежамі фланкуе цэнтральную плошчу горада, які пакутаваў у гады вайны і аварыі на Чарнобыльскай АЭС. Хойнікі — вароты да Полескага радыяцыйна-экалагічнага запаведніка; касцёл нагадвае пра шматвяковую рэлігійную традыцыю мясцовага насельніцтва. Рэстаўрацыйныя работы вярнулі храму манументальны аблік і статус дзейнага культавага збудавання.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Хойнікі', 'Касцёл', 'XIX стагоддзе', 'Полессе', 'Неарамантыка'],
      },
    },
  }),
  place({
    id: 'belarus_place_050',
    name: 'Спасо-Преображенская церковь (Ветка)',
    city: 'Ветка',
    address: 'Спасо-Преображенская церковь, Ветка, Гомельская область, Беларусь',
    lat: 52.5592,
    lng: 31.1734,
    display: 'кон. XVIII — XIX в.',
    year: 1790,
    description:
      'Спасо-Преображенская церковь в Ветке — старинный православный храм на берегу Сожа, одна из архитектурных доминант «старообрядческой столицы» Беларуси. Каменное здание с лаконичным фасадом и колокольней дополняет ансамбль исторического центра, где соседствуют мещанские дома и музейные объекты. Ветка славится школой иконописи и уникальной культурой старообрядцев; церковь — часть этого наследия наряду с известным музеем народной традиции. С высоты набережной открывается вид на реку и заросшие дворики, создающие атмосферу провинциального Полесья XIX века.',
    tags: ['Беларусь', 'Гомельская область', 'Ветка', 'Церковь', 'Старообрядчество', 'XVIII век', 'Сож'],
    i18n: {
      ru: { address: 'Ветка, Гомельская область, Беларусь', city: 'Ветка' },
      en: {
        name: 'Transfiguration Church (Vetka)',
        address: 'Vetka, Gomel Region, Belarus',
        city: 'Vetka',
        author: null,
        description:
          'The Transfiguration Church in Vetka is an old Orthodox church on the Sozh bank, one of the architectural landmarks of the "Old Believer capital" of Belarus. The stone building with a restrained façade and bell tower complements the historic centre where burgher houses and museum sites stand side by side. Vetka is famed for its school of icon painting and unique Old Believer culture; the church is part of that heritage alongside the well-known museum of folk tradition. From the embankment there are views of the river and overgrown courtyards evoking the atmosphere of 19th-century provincial Polesia.',
        tags: ['Belarus', 'Gomel Region', 'Vetka', 'Church', 'Old Believers', '18th century', 'Sozh'],
      },
      be: {
        name: 'Спаса-Праабражэнская царква (Ветка)',
        address: 'Ветка, Гомельская вобласць, Беларусь',
        city: 'Ветка',
        author: null,
        description:
          'Спаса-Праабражэнская царква ў Ветцы — старажытны праваслаўны храм на беразе Сожу, адна з архітэктурных дамінантаў «стараабрадчацкай сталіцы» Беларусі. Каменнае будынне з лаканічным фасадам і званом дапаўняе ансамбль гістарычнага цэнтра, дзе суседзяць мяшанскія дамы і музейныя аб\'екты. Ветка славіцца школай іканапісу і ўнікальнай культурай стараабрадцаў; царква — частка гэтай спадчыны побач з вядомым музеем народнай традыцыі. З вышыні набярэжнай адкрываецца выгляд на раку і зарослыя дворыкі, якія ствараюць атмасферу правінцыйнага Полесся XIX стагоддзя.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Ветка', 'Царква', 'Стараабрадзтва', 'XVIII стагоддзе', 'Сож'],
      },
    },
  }),

  // —— Могилёвская область (5) ——
  place({
    id: 'belarus_place_051',
    name: 'Быховский замок',
    city: 'Быхов',
    address: 'Быховский замок, Быхов, Могилёвская область, Беларусь',
    lat: 53.5206,
    lng: 30.2453,
    display: 'XVI–XVII вв.',
    year: 1570,
    description:
      'Быховский замок — один из наиболее сохранившихся магнатских замков Беларуси, возведённый в XVI–XVII веках для рода Сапег и перестроенный в барочных формах. Мощные бастионные стены, угловые башни и внутренние дворы создают образ ренессансной крепости на берегу Мухавца. Замок пережил войны и смену владельцев; в разное время здесь размещались тюрьма, военные склады и музей. Сегодня проводится реставрация, открыты экспозиции по истории Сапег и средневекового зодчества; Быхов входит в приоритетные туристические маршруты Могилёвщины.',
    tags: ['Беларусь', 'Могилёвская область', 'Быхов', 'Замок', 'Сапеги', 'XVI век', 'Ренессанс'],
    i18n: {
      ru: { address: 'Быхов, Могилёвская область, Беларусь', city: 'Быхов' },
      en: {
        name: 'Bykhov Castle',
        address: 'Bykhov, Mogilev Region, Belarus',
        city: 'Bykhov',
        author: 'Сапеги',
        description:
          'Bykhov Castle is one of the best-preserved magnate castles of Belarus, built in the 16th and 17th centuries for the Sapieha family and rebuilt in Baroque forms. Massive bastion walls, corner towers and inner courtyards evoke a Renaissance fortress on the Mukhavets river. The castle survived wars and changes of ownership; at various times it housed a prison, military stores and a museum. Restoration is under way and exhibitions on the Sapiehas and medieval architecture are open; Bykhov is a priority on tourist routes of Mogilev Region.',
        tags: ['Belarus', 'Mogilev Region', 'Bykhov', 'Castle', 'Sapieha', '16th century', 'Renaissance'],
      },
      be: {
        name: 'Быхаўскі замак',
        address: 'Быхаў, Магілёўская вобласць, Беларусь',
        city: 'Быхаў',
        author: 'Сапегі',
        description:
          'Быхаўскі замак — адзін з найлепш захаваных магнатскіх замкаў Беларусі, узведзены ў XVI–XVII стагоддзях для роду Сапегаў і перабудаваны ў барочных формах. Магутныя бастыённыя сцены, вугловыя вежы і ўнутраныя дворы ствараюць вобраз рэнесанснай крэпасці на беразе Мухаўца. Замак перажыў войны і змену ўладальнікаў; у розны час тут размяшчаліся турма, ваенныя склады і музей. Сёння праводзіцца рэстаўрацыя, адкрыты экспазіцыі па гісторыі Сапегаў і сярэдневяковай архітэктуры; Быхаў уваходзіць у прыярытэтныя турыстычныя маршруты Магілёўшчыны.',
        tags: ['Беларусь', 'Магілёўская вобласць', 'Быхаў', 'Замак', 'Сапегі', 'XVI стагоддзе', 'Рэнесанс'],
      },
    },
  }),
  place({
    id: 'belarus_place_052',
    name: 'Мстиславльский замок (Замковая гора)',
    city: 'Мстиславль',
    address: 'Замковая гора, Мстиславль, Могилёвская область, Беларусь',
    lat: 54.0175,
    lng: 31.7239,
    display: 'XIII–XVI вв.',
    year: 1300,
    description:
      'Мстиславльский замок на Замковой горе — древнейшее городище и остатки княжеской крепости, с которого начинается история одного из старейших городов Восточной Беларуси. В XIII–XVI веках здесь стояли дерево-земляные и каменные укрепления, защищавшие перекрёсток торговых путей к Смоленску и Полоцку. Сохранились валы, рвы и фундаменты башен; с высоты открывается панорама на реку Вихра и старую застройку. Мстиславль славится также ратушей, монастырями и коллекцией народного зодчества; археологические раскопки на городище продолжаются, привлекая краеведов и туристов.',
    tags: ['Беларусь', 'Могилёвская область', 'Мстиславль', 'Замок', 'Городище', 'Средневековье', 'Княжество'],
    i18n: {
      ru: { address: 'Мстиславль, Могилёвская область, Беларусь', city: 'Мстиславль' },
      en: {
        name: 'Mstislavl Castle (Castle Hill)',
        address: 'Mstislavl, Mogilev Region, Belarus',
        city: 'Mstislavl',
        author: null,
        description:
          'Mstislavl Castle on Castle Hill is an ancient stronghold and remains of a princely fortress where the history of one of the oldest towns of eastern Belarus begins. In the 13th to 16th centuries timber-and-earth and stone fortifications stood here, guarding a crossroads of trade routes to Smolensk and Polotsk. Ramparts, moats and tower foundations survive; the height offers a panorama of the Vikhra river and old quarters. Mstislavl is also known for its town hall, monasteries and collection of folk architecture; archaeological digs at the site continue, drawing local historians and tourists.',
        tags: ['Belarus', 'Mogilev Region', 'Mstislavl', 'Castle', 'Stronghold', 'Middle Ages', 'Principality'],
      },
      be: {
        name: 'Мсціслаўскі замак (Замкавая гара)',
        address: 'Мсціслаў, Магілёўская вобласць, Беларусь',
        city: 'Мсціслаў',
        author: null,
        description:
          'Мсціслаўскі замак на Замкавай гары — старажытнае гарадзішча і рэшткі княжай крэпасці, з якой пачынаецца гісторыя аднаго з найстаражытнейших гарадоў усходняй Беларусі. У XIII–XVI стагоддзях тут стаялі дрэва-земляныя і каменныя ўмацаванні, якія абаранялі скрыжаванне гандлёвых шляхоў да Смаленска і Полацка. Захаваліся валы, рвы і фундаменты веж; з вышыні адкрываецца панарама на раку Віхру і старую забудову. Мсціслаў славіцца таксама ратушай, манастырамі і калекцыяй народнай архітэктуры; археалагічныя раскопкі на гарадзішчы працягваюцца, прыцягваючы краязнаўцаў і турыстаў.',
        tags: ['Беларусь', 'Магілёўская вобласць', 'Мсціслаў', 'Замак', 'Гарадзішча', 'Сярэдневечча', 'Княства'],
      },
    },
  }),
  place({
    id: 'belarus_place_053',
    name: 'Шкловский замок',
    city: 'Шклов',
    address: 'Шкловский замок, Шклов, Могилёвская область, Беларусь',
    lat: 54.2119,
    lng: 30.2936,
    display: 'XVIII в.',
    year: 1760,
    author: 'Потёмкин',
    description:
      'Шкловский замок — редкий для Беларуси образец классицистического дворцово-замкового ансамбля XVIII века на высоком берегу Днепра, связанный с именем князя Григория Потёмкина. Прямоугольные бастионы, строгие фасады и террасированный спуск к реке напоминают европейские крепости Просвещения. Шклов в XVIII веке был центром управления имениями Потёмкина на белорусских землях; замок символизировал власть и модернизацию региона. Сегодня сохранились фрагменты стен и бастионов; ансамбль охраняется как памятник архитектуры и входит в маршруты по днепровским городам Могилёвщины.',
    tags: ['Беларусь', 'Могилёвская область', 'Шклов', 'Замок', 'Классицизм', 'XVIII век', 'Потёмкин', 'Днепр'],
    i18n: {
      ru: { address: 'Шклов, Могилёвская область, Беларусь', city: 'Шклов', author: 'Потёмкин' },
      en: {
        name: 'Shklov Castle',
        address: 'Shklov, Mogilev Region, Belarus',
        city: 'Shklov',
        author: 'Potemkin',
        description:
          'Shklov Castle is a rare example in Belarus of a Classical palace-fortress ensemble of the 18th century on a high Dnieper bank, linked with Prince Grigory Potemkin. Rectangular bastions, austere façades and terraced descent to the river recall Enlightenment fortresses of Europe. In the 18th century Shklov was a centre for managing Potemkin\'s estates in Belarusian lands; the castle symbolised power and modernisation of the region. Fragments of walls and bastions survive today; the ensemble is protected as an architectural monument and features on routes along Dnieper towns of Mogilev Region.',
        tags: ['Belarus', 'Mogilev Region', 'Shklov', 'Castle', 'Classicism', '18th century', 'Potemkin', 'Dnieper'],
      },
      be: {
        name: 'Шклоўскі замак',
        address: 'Шклоў, Магілёўская вобласць, Беларусь',
        city: 'Шклоў',
        author: 'Пацёмкін',
        description:
          'Шклоўскі замак — рэдкі для Беларусі ўзор класіцыстычнага палацава-замкавага ансамбля XVIII стагоддзя на высокім беразе Дняпра, звязаны з імем князя Грыгорыя Пацёмкіна. Прамавугольныя бастыёны, строгія фасады і тэрасаваны схіл да ракі нагадваюць еўрапейскія крэпасці Прасвятлення. Шклоў у XVIII стагоддзі быў цэнтрам кіравання маёнкамі Пацёмкіна на беларускіх зямлях; замак сімвалізаваў уладу і мадэрнізацыю рэгіёна. Сёння захаваліся фрагменты сцен і бастыёнаў; ансамбль ахоўваецца як помнік архітэктуры і ўваходзіць у маршруты па дняпроўскіх гарадах Магілёўшчыны.',
        tags: ['Беларусь', 'Магілёўская вобласць', 'Шклоў', 'Замак', 'Класіцызм', 'XVIII стагоддзе', 'Пацёмкін', 'Дняпро'],
      },
    },
  }),
  place({
    id: 'belarus_place_054',
    name: 'Костёл Святого Станислава (Могилёв)',
    city: 'Могилёв',
    address: 'Костёл Святого Станислава, Могилёв, Могилёвская область, Беларусь',
    lat: 53.8967,
    lng: 30.3308,
    display: 'XVIII в.',
    year: 1740,
    description:
      'Костёл Святого Станислава в Могилёв — барочный шедевр архитектора Яна Глобуса, возведённый в середине XVIII века как костёл ордена бернардинцев. Динамичный фасад с волнообразным фронтоном, пилястрами и скульптурным декором считается одним из лучших образцов барокко на территории современной Беларуси. Внутри сохранилась традиционная базиликальная планировка и элементы исторического интерьера. Храм контрастирует с ратушей и православными соборами города, демонстрируя многоконфессиональную историю Могилёва — крупного торгового центра Речи Посполитой и имперской эпохи.',
    tags: ['Беларусь', 'Могилёвская область', 'Могилёв', 'Костёл', 'Барокко', 'XVIII век', 'Глобус'],
    i18n: {
      ru: { address: 'Могилёв, Могилёвская область, Беларусь', city: 'Могилёв' },
      en: {
        name: 'Church of Saint Stanislaus (Mogilev)',
        address: 'Mogilev, Mogilev Region, Belarus',
        city: 'Mogilev',
        author: 'Ян Глобус',
        description:
          'The Church of Saint Stanislaus in Mogilev is a Baroque masterpiece by architect Jan Globus, built in the mid-18th century as the church of the Bernardine order. The dynamic façade with a wavy pediment, pilasters and sculptural decoration is considered one of the finest examples of Baroque in modern Belarus. Inside, the traditional basilica plan and elements of historic interior survive. The church contrasts with the town hall and Orthodox cathedrals, illustrating the multi-confessional history of Mogilev — a major trading centre of the Polish-Lithuanian Commonwealth and the imperial era.',
        tags: ['Belarus', 'Mogilev Region', 'Mogilev', 'Church', 'Baroque', '18th century', 'Globus'],
      },
      be: {
        name: 'Касцёл Святога Станіслава (Магілёў)',
        address: 'Магілёў, Магілёўская вобласць, Беларусь',
        city: 'Магілёў',
        author: 'Ян Глобус',
        description:
          'Касцёл Святога Станіслава ў Магілёве — барочны шэдэўр архітэктара Яна Глобуса, узведзены ў сярэдзіне XVIII стагоддзя як касцёл ордэна бернардзінцаў. Дынамічны фасад з хвалепадобным фронтонам, пілястрамі і скульптурным дэкорам лічыцца адным з лепшых узораў барока на тэрыторыі сучаснай Беларусі. Унутры захавалася традыцыйная базілікальная планіроўка і элементы гістарычнага інтэр\'еру. Храм кантрастуе з ратушай і праваслаўнымі саборамі горада, дэманструючы шматканфесійную гісторыю Магілёва — буйнога гандлёвага цэнтра Рэчы Паспалітай і імперскай эпохі.',
        tags: ['Беларусь', 'Магілёўская вобласць', 'Магілёў', 'Касцёл', 'Барока', 'XVIII стагоддзе', 'Глобус'],
      },
    },
  }),
  place({
    id: 'belarus_place_055',
    name: 'Кличевский замок',
    city: 'Кличев',
    address: 'Кличевский замок, Кличев, Могилёвская область, Беларусь',
    lat: 53.5147,
    lng: 31.7169,
    display: 'XVI–XVII вв.',
    year: 1600,
    description:
      'Кличевский замок — памятник оборонного зодчества XVI–XVII веков на берегу реки Лан, одна из визитных карточек восточной Могилёвщины. Каменные стены с башнями и внутренний двор напоминают о временах, когда Кличев был важным пунктом на пути из Полесья к Смоленску. Замок неоднократно перестраивался и использовался под различные хозяйственные нужды; сегодня ведутся работы по консервации и обустройству территории для туристов. С площадки у крепости открываются виды на окрестные поля и луговые поймы — типичный пейзаж белорусского Полесья.',
    tags: ['Беларусь', 'Могилёвская область', 'Кличев', 'Замок', 'XVI век', 'Полесье', 'Крепость'],
    i18n: {
      ru: { address: 'Кличев, Могилёвская область, Беларусь', city: 'Кличев' },
      en: {
        name: 'Klichev Castle',
        address: 'Klichev, Mogilev Region, Belarus',
        city: 'Klichev',
        author: null,
        description:
          'Klichev Castle is a monument of defensive architecture of the 16th and 17th centuries on the Lan river bank, a landmark of eastern Mogilev Region. Stone walls with towers and an inner courtyard recall times when Klichev was an important point on the route from Polesia towards Smolensk. The castle was rebuilt several times and used for various purposes; conservation and visitor facilities are in progress. From the fortress platform there are views of surrounding fields and meadow floodplains — typical landscape of Belarusian Polesia.',
        tags: ['Belarus', 'Mogilev Region', 'Klichev', 'Castle', '16th century', 'Polesia', 'Fortress'],
      },
      be: {
        name: 'Клічаўскі замак',
        address: 'Клічаў, Магілёўская вобласць, Беларусь',
        city: 'Клічаў',
        author: null,
        description:
          'Клічаўскі замак — помнік абарончай архітэктуры XVI–XVII стагоддзяў на беразе ракі Лань, адна з візітных картак усходняй Магілёўшчыны. Каменныя сцены з вежамі і ўнутраны двор нагадваюць пра часы, калі Клічаў быў важным пунктам на шляху з Полесся да Смаленска. Замак неаднаразова перабудоўваўся і выкарыстоўваўся пад розныя гаспадарчыя патрэбы; сёння вядуцца работы па кансервацыі і аблашчэнню тэрыторыі для турыстаў. З пляцоўкі ў крэпасці адкрываюцца выды на вакольныя палі і лугавыя поймы — тыповы пейзаж беларускага Полесся.',
        tags: ['Беларусь', 'Магілёўская вобласць', 'Клічаў', 'Замак', 'XVI стагоддзе', 'Полессе', 'Крэпасць'],
      },
    },
  }),
];

writeFileSync(
  new URL('../places-export-batch2.json', import.meta.url),
  JSON.stringify(places, null, 2) + '\n',
  'utf8'
);
console.log('Wrote', places.length, 'places → places-export-batch2.json');
