import { writeFileSync } from 'fs';

const TS = '2026-05-21T12:00:00.000Z';

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

const places = [
  place({
    id: 'belarus_place_071',
    name: 'Костёл Преображения Господня (Ивье)',
    city: 'Ивье',
    address: 'Костёл Преображения Господня, Ивье, Гродненская область, Беларусь',
    lat: 53.7156,
    lng: 25.9475,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Преображения Господня в Ивье — один из самых узнаваемых храмов Беларуси благодаря двум стройным неоготическим башням, видным издалека на подъезде к городу. Кирпичный храм возведён на месте более ранних деревянных церквей; Ивье веками было многонациональным местечком с сильной еврейской и польской общинами. Сегодня костёл доминирует над центром, рядом сохранились следы старой застройки. Это ключевая точка маршрутов по Гродненщине между Лидой и Новогрудком.',
    tags: ['Беларусь', 'Гродненская область', 'Ивье', 'Костёл', 'Неоготика', 'XIX век'],
    i18n: mk(
      'Ивье, Гродненская область, Беларусь', 'Ивье',
      'Ivye, Grodno Region, Belarus', 'Ivye',
      'Іўе, Гродзенская вобласць, Беларусь', 'Іўе',
      {
        en: {
          name: 'Church of the Transfiguration (Ivye)',
          description:
            'The Church of the Transfiguration in Ivye is one of Belarus\'s most recognisable churches thanks to two slender neo-Gothic towers visible from afar. The brick church replaced earlier wooden ones; Ivye was for centuries a multi-ethnic town with strong Jewish and Polish communities. Today the church dominates the centre near surviving old fabric. It is a key stop on routes through Grodno Region between Lida and Novogrudok.',
          tags: ['Belarus', 'Grodno Region', 'Ivye', 'Church', 'Neo-Gothic', '19th century'],
        },
        be: {
          name: 'Касцёл Праабражэння Гасподняга (Іўе)',
          description:
            'Касцёл Праабражэння ў Іўе — адзін з самых узнавальных храмаў Беларусі дзякуючы двум неагатычным вежам. Касцёл дамінуе над цэнтрам мястэчка на маршрутах Гродзеншчыны.',
          tags: ['Беларусь', 'Гродзенская вобласць', 'Іўе', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_072',
    name: 'Любчанский замок',
    city: 'Любча',
    address: 'Любчанский замок, Любча, Гродненская область, Беларусь',
    lat: 53.4992,
    lng: 26.0594,
    display: 'XVI–XVII вв.',
    year: 1600,
    description:
      'Любчанский замок на берегу Немана — редкий для Беларуси образец ренессансного оборонного жилого комплекса, основанного князем Янушем Радзивиллом. Квадратная башня-донжон и остатки земляных валов напоминают о временах, когда Любча была полноценной резиденцией, а не только магнатской усадьбой. После пожаров и войн замок пришёл в запустение, но руины и панорама реки привлекают исследователей средневековья. Рядом — позднейший дворец и костёл, формирующие единый исторический ландшафт.',
    tags: ['Беларусь', 'Гродненская область', 'Любча', 'Замок', 'Ренессанс', 'Радзивиллы'],
    i18n: mk(
      'Любча, Гродненская область, Беларусь', 'Любча',
      'Lyubcha, Grodno Region, Belarus', 'Lyubcha',
      'Любча, Гродзенская вобласць, Беларусь', 'Любча',
      {
        en: {
          name: 'Lyubcha Castle',
          description:
            'Lyubcha Castle on the Neman is a rare Belarusian example of a Renaissance residential stronghold founded by Prince Janusz Radziwill. A square donjon tower and earth ramparts recall when Lyubcha was a full residence, not only a manor. After fires and wars the castle fell into ruin, but the remains and river panorama attract students of medieval history. A later palace and church nearby form a single historic landscape.',
          tags: ['Belarus', 'Grodno Region', 'Lyubcha', 'Castle', 'Renaissance', 'Radziwill'],
        },
        be: {
          name: 'Любчанскі замак',
          description:
            'Любчанскі замак на беразе Нёмана — рэдкі ўзор рэнесанснага абарончага комплексу, заснаванага Янушам Радзівілам. Вежа-донжон і валы нагадваюць пра мінулае мястэчка; руіны і панарама ракі прыцягваюць даследчыкаў.',
          tags: ['Беларусь', 'Гродзенская вобласць', 'Любча', 'Замак', 'Рэнесанс', 'Радзівілы'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_073',
    name: 'Костёл Святого Антония (Антополь)',
    city: 'Антополь',
    address: 'Костёл Святого Антония, Антополь, Брестская область, Беларусь',
    lat: 52.2039,
    lng: 24.7853,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Антония в Антополе — барочный фарный храм, один из крупнейших в Брестской области, возведённый в «виленском» стиле с богатым внутренним убранством. Антополь с XVII века известен как центр католического и еврейского местечка на старом тракте. Две башни и монументальный фасад задают силуэт поселка; в интерьере — уникальные алтари и лепнина. Храм пережил войны и реставрации, оставаясь духовным символом Польшанского края.',
    tags: ['Беларусь', 'Брестская область', 'Антополь', 'Костёл', 'Барокко', 'XIX век'],
    i18n: mk(
      'Антополь, Брестская область, Беларусь', 'Антополь',
      'Antopal, Brest Region, Belarus', 'Antopal',
      'Антопаль, Брэсцкая вобласць, Беларусь', 'Антопаль',
      {
        en: {
          name: 'Church of Saint Anthony (Antopal)',
          description:
            'The Church of Saint Anthony in Antopal is a Baroque parish church among the largest in Brest Region, built in the Vilnius style with rich interiors. Since the 17th century Antopal has been a Catholic and Jewish town on an old highway. Two towers and a monumental façade define the settlement; inside are notable altars and stucco. The church survived wars and restorations as a spiritual symbol of the Polesie area.',
          tags: ['Belarus', 'Brest Region', 'Antopal', 'Church', 'Baroque', '19th century'],
        },
        be: {
          name: 'Касцёл Святога Антона (Антопаль)',
          description:
            'Касцёл Святога Антона ў Антопалі — барокавы фарны храм, адзін з найбольшых у Брэсцкай вобласці, у «віленскім» стылі. Дзве вежы і манументальны фасад задаюць сілуэт мястэчка на старым тракце.',
          tags: ['Беларусь', 'Брэсцкая вобласць', 'Антопаль', 'Касцёл', 'Барока', 'XIX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_074',
    name: 'Костёл Святого Иосифа (Воложин)',
    city: 'Воложин',
    address: 'Костёл Святого Иосифа, Воложин, Минская область, Беларусь',
    lat: 54.0914,
    lng: 26.5231,
    display: 'кон. XVIII в.',
    year: 1780,
    description:
      'Костёл Святого Иосифа в Воложине — позднебарочный храм, связанный с именем короля Станислава Августа Понятовского, который даровал городу магдебургские права. Величественный фасад с колонным портиком и башней украшает исторический центр на реке Воложанке. Воложин известен также как «ворота» в Налибокскую пущу, но костёл напоминает о пане польско-литовском прошлом региона. После реставрации храм действующий, рядом — здания XIX века и памятник Тадеушу Костюшко.',
    tags: ['Беларусь', 'Минская область', 'Воложин', 'Костёл', 'Барокко', 'XVIII век'],
    i18n: mk(
      'Воложин, Минская область, Беларусь', 'Воложин',
      'Volozhin, Minsk Region, Belarus', 'Volozhin',
      'Валожын, Мінская вобласць, Беларусь', 'Валожын',
      {
        en: {
          name: 'Church of Saint Joseph (Volozhin)',
          description:
            'The Church of Saint Joseph in Volozhin is a late Baroque church linked to King Stanisław August Poniatowski, who granted the town Magdeburg rights. A grand façade with a columned portico and tower adorns the historic centre on the Volozhanka River. Volozhin is known as a gateway to Naliboki Forest, but the church recalls the Polish-Lithuanian past. After restoration it is active; nearby are 19th-century buildings and a monument to Tadeusz Kościuszko.',
          tags: ['Belarus', 'Minsk Region', 'Volozhin', 'Church', 'Baroque', '18th century'],
        },
        be: {
          name: 'Касцёл Святога Іосіфа (Валожын)',
          description:
            'Касцёл Святога Іосіфа ў Валожыне — пазнебарокавы храм, звязаны са Станіславам Аўгустам Панятоўскім. Манументальны фасад украшае цэнтр на раке Валожанцы; горад — «брама» ў Налібоцкую пушчу.',
          tags: ['Беларусь', 'Мінская вобласць', 'Валожын', 'Касцёл', 'Барока', 'XVIII стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_075',
    name: 'Костёл Святого Михаила (Молодечно)',
    city: 'Молодечно',
    address: 'Костёл Святого Михаила, Молодечно, Минская область, Беларусь',
    lat: 54.3136,
    lng: 26.8511,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Михаила в Молодечно, известный как «Белый костёл», — неоготический храм из красного кирпича с белой штукатуркой, возвышающийся над площадью имени С. М. Будённого. Город вырос как центр железнодорожного узла и мещанской культуры; храм стал архитектурной доминантой после освящения в конце XIX века. В интерьере — витражи и кованые элементы. Молодечно связывают с легендами о Витовте и мемориалом на горе Заслон, а костёл — с католическим наследием северо-западной Минщины.',
    tags: ['Беларусь', 'Минская область', 'Молодечно', 'Костёл', 'Неоготика', 'XIX век'],
    i18n: mk(
      'Молодечно, Минская область, Беларусь', 'Молодечно',
      'Molodechno, Minsk Region, Belarus', 'Molodechno',
      'Маладзечна, Мінская вобласць, Беларусь', 'Маладзечна',
      {
        en: {
          name: 'Church of Saint Michael (Molodechno)',
          description:
            'The Church of Saint Michael in Molodechno, known as the White Church, is a neo-Gothic red-brick church with white plaster rising above Budyonny Square. The town grew as a railway hub; the church became its architectural landmark after consecration in the late 19th century. Stained glass and ironwork enrich the interior. Molodechno is linked to legends of Vytautas and the Zaslon memorial; the church represents Catholic heritage of north-western Minsk Region.',
          tags: ['Belarus', 'Minsk Region', 'Molodechno', 'Church', 'Neo-Gothic', '19th century'],
        },
        be: {
          name: 'Касцёл Святога Міхаіла (Маладзечна)',
          description:
            'Касцёл Святога Міхаіла ў Маладзечне («Белы касцёл») — неагатычны храм з чырвонай цаглы, дамінанта плошчы. Горад — чыгуначны вузел; касцёл — каталіцкая спадчына паўночна-заходняй Міншчыны.',
          tags: ['Беларусь', 'Мінская вобласць', 'Маладзечна', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_076',
    name: 'Крестовоздвиженский кафедральный собор (Пинск)',
    city: 'Пинск',
    address: 'Крестовоздвиженский собор, Пинск, Брестская область, Беларусь',
    lat: 52.1142,
    lng: 26.0272,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Крестовоздвиженский кафедральный собор в Пинске — главный православный храм города на высоком берегу Пины, с характерными куполами и колокольней в духе русско-византийского стиля. Пинск — одно из древнейших городов Полесья, упоминаемое в летописях; собор напоминает о периоде, когда город вновь стал епархиальным центром. С площадки открывается вид на реку и старый район. Рядом — музей Полесья и памятники деревянного зодчества, но собор остаётся главной вертикалью панорамы.',
    tags: ['Беларусь', 'Брестская область', 'Пинск', 'Собор', 'Православие', 'XIX век'],
    i18n: mk(
      'Пинск, Брестская область, Беларусь', 'Пинск',
      'Pinsk, Brest Region, Belarus', 'Pinsk',
      'Пінск, Брэсцкая вобласць, Беларусь', 'Пінск',
      {
        en: {
          name: 'Exaltation of the Cross Cathedral (Pinsk)',
          description:
            'The Exaltation of the Cross Cathedral in Pinsk is the city\'s main Orthodox church on a high bank of the Pina, with domes and a bell tower in Russian-Byzantine style. Pinsk is among the oldest towns of Polesie, recorded in chronicles; the cathedral reflects its renewed role as an eparchial centre. Views open over the river and old district. Nearby are the Polesie Museum and wooden architecture monuments, but the cathedral remains the main vertical in the skyline.',
          tags: ['Belarus', 'Brest Region', 'Pinsk', 'Cathedral', 'Orthodox', '19th century'],
        },
        be: {
          name: 'Крыжаўздвіжэнскі кафедральны сабор (Пінск)',
          description:
            'Крыжаўздвіжэнскі сабор у Пінску — галоўны праваслаўны храм на ўзберажжы Піны з купаламі ў руска-візантыйскім стылі. Пінск — адзін з найстаражытнейших гарадоў Палесся; сабор — галоўная вертыкаль панорамы.',
          tags: ['Беларусь', 'Брэсцкая вобласць', 'Пінск', 'Сабор', 'Праваслаўе', 'XIX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_077',
    name: 'Пружанский замковый холм',
    city: 'Пружаны',
    address: 'Замковый холм, Пружаны, Брестская область, Беларусь',
    lat: 52.5583,
    lng: 24.4647,
    display: 'XVI в.',
    year: 1560,
    description:
      'Пружанский замковый холм — памятник оборонного зодчества Речи Посполитой на берегу реки Сельцы, где стояла резиденция местных магнатов. Сохранились валы, рвы и фундаменты башен; с холма виден центр Пружан с костёлами и зданиями XIX века. Город известен также Пружанским дворцом и ледником, но замковая гора переносит в эпоху готики и ренессанса. Археологические раскопки выявили культурные слои средневековья; сегодня это популярная прогулочная точка и символ местной истории.',
    tags: ['Беларусь', 'Брестская область', 'Пружаны', 'Замок', 'Городище', 'XVI век'],
    i18n: mk(
      'Пружаны, Брестская область, Беларусь', 'Пружаны',
      'Pruzhany, Brest Region, Belarus', 'Pruzhany',
      'Пружаны, Брэсцкая вобласць, Беларусь', 'Пружаны',
      {
        en: {
          name: 'Pruzhany Castle Hill',
          description:
            'Pruzhany Castle Hill is a monument of Commonwealth fortification on the Seltsa River where local magnates had their residence. Ramparts, moats and tower foundations survive; the hill overlooks Pruzhany centre with 19th-century churches. The town is also known for its palace and icehouse, but the castle hill evokes Gothic and Renaissance times. Archaeological digs revealed medieval layers; today it is a popular walk and symbol of local history.',
          tags: ['Belarus', 'Brest Region', 'Pruzhany', 'Castle', 'Hillfort', '16th century'],
        },
        be: {
          name: 'Пружанскі замкавы холм',
          description:
            'Пружанскі замкавы холм — помнік абарончага зодчва на Сельцы: валы, рвы, фундаменты веж. З холма відна цэнтр Пружан; гэта месца прагулак і сімвал сярэдневяковай гісторыі.',
          tags: ['Беларусь', 'Брэсцкая вобласць', 'Пружаны', 'Замак', 'Гарадзішча', 'XVI стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_078',
    name: 'Музейный комплекс «Дудутки»',
    city: 'Птичь',
    address: 'Музейный комплекс «Дудутки», д. Птичь, Минская область, Беларусь',
    lat: 53.5908,
    lng: 27.2867,
    display: 'XX–XXI вв.',
    year: 1993,
    description:
      'Музейный комплекс «Дудутки» под Минском — этнографический музей под открытым небом, где воссозданы мельница, кузница, гончарная, хлебопекарня и усадебные постройки. Посетители знакомятся с народными промыслами, дегустируют местные продукты и наблюдают ремёсла в действии. Комплекс активно используется для фестивалей и образовательных программ, показывая повседневную культуру белорусской деревни без музейной «стерильности». Это одна из самых посещаемых точек живого наследия в стране.',
    tags: ['Беларусь', 'Минская область', 'Дудутки', 'Музей', 'Этнография', 'Ремёсла'],
    i18n: mk(
      'д. Птичь, Минская область, Беларусь', 'Птичь',
      'Ptich village, Minsk Region, Belarus', 'Ptich',
      'в. Пціч, Мінская вобласць, Беларусь', 'Пціч',
      {
        en: {
          name: 'Dudutki Museum Complex',
          description:
            'The Dudutki museum complex near Minsk is an open-air ethnographic museum with a working mill, forge, pottery, bakery and farm buildings. Visitors explore folk crafts, taste local products and watch artisans at work. Festivals and education programmes show Belarusian village life without museum sterility. It is among the country\'s most visited living heritage sites.',
          tags: ['Belarus', 'Minsk Region', 'Dudutki', 'Museum', 'Ethnography', 'Crafts'],
        },
        be: {
          name: 'Музейны комплекс «Дудуткі»',
          description:
            '«Дудуткі» пад Мінскам — этнаграфічны музей пад адкрытым небам з мельніцай, кузняй, ганчарнай і сядзібнымі пабудовамі. Жывая спадчына вёскі, фестывалі і рамёствы.',
          tags: ['Беларусь', 'Мінская вобласць', 'Дудуткі', 'Музей', 'Этнаграфія', 'Рмяство'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_079',
    name: 'Фарный костёл Святого Франциска Ксаверия (Гродно)',
    city: 'Гродно',
    address: 'Костёл Святого Франциска Ксаверия, Гродно, Гродненская область, Беларусь',
    lat: 53.6778,
    lng: 23.8256,
    display: 'кон. XVII в.',
    year: 1680,
    description:
      'Фарный костёл Святого Франциска Ксаверия в Гродно — шедевр виленского барокко, возведённый иезуитами при короле Стефане Батории. Динамичный фасад с волнообразными фронтонами и богатейший интерьер с алтарями и фресками входят в число лучших памятников католической архитектуры Восточной Европы. Храм действующий, расположен в историческом центре рядом с другими храмами и замковым холмом. После реставрации костёл вновь стал визитной карточкой города наряду с Старым и Новым замками.',
    tags: ['Беларусь', 'Гродненская область', 'Гродно', 'Костёл', 'Барокко', 'Иезуиты'],
    i18n: mk(
      'Гродно, Гродненская область, Беларусь', 'Гродно',
      'Grodno, Grodno Region, Belarus', 'Grodno',
      'Гродна, Гродзенская вобласць, Беларусь', 'Гродна',
      {
        en: {
          name: 'Church of Saint Francis Xavier (Grodno)',
          description:
            'The Church of Saint Francis Xavier in Grodno is a masterpiece of Vilnius Baroque built by Jesuits under King Stephen Báthory. A dynamic façade with undulating pediments and rich interiors with altars and frescoes rank among the finest Catholic monuments in Eastern Europe. The active church stands in the historic centre near other temples and the castle hill. After restoration it is again a city icon alongside the Old and New castles.',
          tags: ['Belarus', 'Grodno Region', 'Grodno', 'Church', 'Baroque', 'Jesuits'],
        },
        be: {
          name: 'Фарны касцёл Святога Францыска Ксаверыя (Гродна)',
          description:
            'Фарны касцёл Святога Францыска Ксаверыя ў Гродне — шэдэўр віленскага барока езуітаў пры Стэфане Баторыі. Дынамічны фасад і багаты інтэр\'ер — адзін з лепшых помнікаў каталіцкай архітэктуры Усходняй Еўропы.',
          tags: ['Беларусь', 'Гродзенская вобласць', 'Гродна', 'Касцёл', 'Барока', 'Езуіты'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_080',
    name: 'Свято-Успенский монастырь на Святой горе (Полоцк)',
    city: 'Полоцк',
    address: 'Свято-Успенский монастырь, Святая гора, Полоцк, Витебская область, Беларусь',
    lat: 55.5222,
    lng: 28.7681,
    display: 'XII–XVIII вв.',
    year: 1200,
    description:
      'Свято-Успенский женский монастырь на Святой горе в Полоцке — духовный центр, основанный в XII веке Евфросинией Полоцкой (отдельно от её мужского монастыря в городе). Комплекс на высоком берегу Двины включает Успенский собор, колокольню и келлии; с террас открываются панорамы реки и нижнего города. Святая гора — место паломничества и символ православной традиции Полоцкой земли. Архитектурные слои отражают допетровские, барочные и классицистические переделки.',
    tags: ['Беларусь', 'Витебская область', 'Полоцк', 'Монастырь', 'Православие', 'XII век'],
    i18n: mk(
      'Святая гора, Полоцк, Витебская область, Беларусь', 'Полоцк',
      'Svyataya Gora, Polotsk, Vitebsk Region, Belarus', 'Polotsk',
      'Святая гара, Полацк, Віцебская вобласць, Беларусь', 'Полацк',
      {
        en: {
          name: 'Dormition Monastery on Svyataya Gora (Polotsk)',
          description:
            'The Dormition convent on Svyataya Gora in Polotsk is a spiritual centre founded in the 12th century by Euphrosyne of Polotsk (distinct from her male monastery in town). On a high Dvina bank the ensemble includes a cathedral, bell tower and cells; terraces offer river panoramas. Svyataya Gora is a pilgrimage site and symbol of Orthodox tradition in Polotsk land. Architectural layers show pre-Petrine, Baroque and classical phases.',
          tags: ['Belarus', 'Vitebsk Region', 'Polotsk', 'Monastery', 'Orthodox', '12th century'],
        },
        be: {
          name: 'Свята-Успенскі манастыр на Святой гары (Полацк)',
          description:
            'Свята-Успенскі жаночы манастыр на Святой гары ў Полацку заснавала ў XII ст. Еўфрасіння Полацкая. Комплекс на ўзберажжы Дзвіны — паломніцкае месца і сімвал праваслаўнай традыцыі Полацкай зямлі.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Полацк', 'Манастыр', 'Праваслаўе', 'XII стагоддзе'],
        },
      }
    ),
  }),
];

writeFileSync('places-export-batch4.json', JSON.stringify(places, null, 2) + '\n', 'utf8');
console.log('Wrote', places.length, 'places to places-export-batch4.json');
