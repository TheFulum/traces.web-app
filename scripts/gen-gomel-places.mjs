import { writeFileSync } from 'fs';

const TS = '2026-05-21T10:00:00.000Z';

function createdOn(display, year) {
  return {
    day: null,
    sortKey: year * 10000,
    precision: 'year',
    display,
    year,
    month: null,
  };
}

function place({
  id,
  name,
  city,
  address,
  lat,
  lng,
  description,
  display,
  year,
  author = null,
  tags,
  i18n,
}) {
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
  place({
    id: 'belarus_place_036',
    name: 'Костёл Непорочного Зачатия Пресвятой Девы Марии (Кричев)',
    city: 'Кричев',
    address: 'Костёл Непорочного Зачатия, Кричев, Гомельская область, Беларусь',
    lat: 53.2742,
    lng: 31.7144,
    display: 'кон. XIX в.',
    year: 1890,
    author: null,
    description:
      'Костёл Непорочного Зачатия в Кричеве — одна из главных архитектурных доминант северо-востока Гомельщины, возведённая в конце XIX века в неоготическом стиле. Высокий кирпичный храм с узкими стрельчатыми окнами, контрфорсами и стройной башней-шпилем хорошо читается издалека на фоне днепровских холмов. Внутри сохранилась традиционная трёхнефная планировка и элементы исторического убранства. Кричев — древний торговый центр Полесья, известный с княжеской эпохи; костёл органично дополняет городской силуэт рядом с другими памятниками местной истории.',
    tags: ['Беларусь', 'Гомельская область', 'Кричев', 'Костёл', 'Неоготика', 'XIX век', 'Полесье'],
    i18n: {
      ru: { address: 'Кричев, Гомельская область, Беларусь', city: 'Кричев' },
      en: {
        name: 'Church of the Immaculate Conception (Krichev)',
        address: 'Krichev, Gomel Region, Belarus',
        city: 'Krichev',
        author: null,
        description:
          'The Church of the Immaculate Conception in Krichev is one of the main architectural landmarks of north-eastern Gomel Region, built in the late 19th century in neo-Gothic style. The tall brick church with narrow pointed windows, buttresses and a slender spire is visible from afar against the Dnieper hills. Inside, the traditional three-aisle layout and elements of historic furnishings have been preserved. Krichev is an ancient trading centre of Polesia, known since princely times; the church complements the town skyline alongside other monuments of local history.',
        tags: ['Belarus', 'Gomel Region', 'Krichev', 'Church', 'Neo-Gothic', '19th century', 'Polesia'],
      },
      be: {
        name: 'Касцёл Непарычнага Зачатця Найсвяцейшай Дзевы Марыі (Крычаў)',
        address: 'Крычаў, Гомельская вобласць, Беларусь',
        city: 'Крычаў',
        author: null,
        description:
          'Касцёл Непарычнага Зачатця ў Крычаўе — адна з галоўных архітэктурных дамінантаў паўночна-усходу Гомельшчыны, узведзеная ў канцы XIX стагоддзя ў стылі неаготыкі. Высокі цагляны храм з вузкімі стральчастымі вокнамі, контрфорсамі і стройнай вежачкай-шпілем добра чытаецца здалёку на фоне дняпроўскіх узгоркаў. Унутры захавалася традыцыйная трохнефная планіроўка і элементы гістарычнага ўбранства. Крычаў — старажытны гандлёвы цэнтр Полесся, вядомы з княжой эпохі; касцёл арганічна дапаўняе гарадскі сілуэт побач з іншымі помнікамі мясцовай гісторыі.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Крычаў', 'Касцёл', 'Неаготыка', 'XIX стагоддзе', 'Полессе'],
      },
    },
  }),
  place({
    id: 'belarus_place_037',
    name: 'Дворец Паскевичей в Добруше',
    city: 'Добруш',
    address: 'Дворцово-парковый ансамбль, Добруш, Гомельская область, Беларусь',
    lat: 52.4089,
    lng: 31.3256,
    display: 'кон. XIX — нач. XX в.',
    year: 1890,
    author: 'Паскевичи',
    description:
      'Дворцово-парковый ансамбль в Добруше — ветвь усадебной традиции рода Паскевичей на Гомельщине, оформленная в конце XIX — начале XX века. Двухэтажный дворец в духе неоклассицизма с лепным декором и парадным фасадом стоял в центре обширного пейзажного парка с прудами и редкими породами деревьев. Добруш в XIX веке развивался как промышленный и культурный центр Полесья; дворец отражал статус местной элиты. Сегодня ансамбль — важный объект историко-культурного наследия региона, вокруг которого формируется туристический маршрут по «паскевичевским» усадьбам юго-востока Беларуси.',
    tags: ['Беларусь', 'Гомельская область', 'Добруш', 'Дворец', 'Парк', 'XIX век', 'Паскевичи'],
    i18n: {
      ru: { address: 'Добруш, Гомельская область, Беларусь', city: 'Добруш', author: 'Паскевичи' },
      en: {
        name: 'Paskevich Palace in Dobrush',
        address: 'Dobrush, Gomel Region, Belarus',
        city: 'Dobrush',
        author: 'Paskevich family',
        description:
          'The palace-and-park ensemble in Dobrush is a branch of the Paskevich estate tradition in Gomel Region, laid out in the late 19th and early 20th century. The two-storey palace in the spirit of Neoclassicism with stucco decoration and a ceremonial façade stood at the heart of an extensive landscape park with ponds and rare tree species. In the 19th century Dobrush developed as an industrial and cultural centre of Polesia; the palace reflected the status of the local elite. Today the ensemble is an important object of the region\'s historical and cultural heritage and forms part of tourist routes linking Paskevich estates in south-eastern Belarus.',
        tags: ['Belarus', 'Gomel Region', 'Dobrush', 'Palace', 'Park', '19th century', 'Paskevich'],
      },
      be: {
        name: 'Палац Паскевічаў у Добрушы',
        address: 'Добруш, Гомельская вобласць, Беларусь',
        city: 'Добруш',
        author: 'Паскевічы',
        description:
          'Палацава-паркавы ансамбль у Добрушы — галіна сядзібнай традыцыі роду Паскевічаў на Гомельшчыне, аформленая ў канцы XIX — пачатку XX стагоддзя. Двухпавярховы палац у духу неакласіцызму з лепным дэкорам і парадным фасадам стаяў у цэнтры шырокага пейзажнага парка з сажалкамі і рэдкімі пародамі дрэў. Добруш у XIX стагоддзі развіваўся як прамысловы і культурны цэнтр Полесся; палац адлюстроўваў статус мясцовай эліты. Сёння ансамбль — важны аб\'ект гісторыка-культурнай спадчыны рэгіёна, вакол якога фарміруецца турыстычны маршрут па «паскевіцкіх» сядзібах паўднёва-усходу Беларусі.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Добруш', 'Палац', 'Парк', 'XIX стагоддзе', 'Паскевічы'],
      },
    },
  }),
  place({
    id: 'belarus_place_038',
    name: 'Костёл Святого Станислава (Речица)',
    city: 'Речица',
    address: 'Костёл Святого Станислава, Речица, Гомельская область, Беларусь',
    lat: 52.3617,
    lng: 30.3917,
    display: '2-я пол. XIX в.',
    year: 1860,
    author: null,
    description:
      'Костёл Святого Станислава в Речице — крупнейший католический храм на юге Гомельской области, построенный во второй половине XIX века в формах неоромантики. Монументальное кирпичное здание с полукруглой апсидой и выразительным фасадом возвышается над историческим центром города на берегу Днепра. Речица — один из старейших городов Беларуси, известный с княжеского времени и эпохи Речи Посполитой; храм стал символом возрождения католической общины после пожаров и войн. Сегодня костёл — архитектурная доминанта набережной и важная точка культурного маршрута по Днепровскому Полесью.',
    tags: ['Беларусь', 'Гомельская область', 'Речица', 'Костёл', 'Неоромантика', 'XIX век', 'Днепр'],
    i18n: {
      ru: { address: 'Речица, Гомельская область, Беларусь', city: 'Речица' },
      en: {
        name: 'Church of Saint Stanislaus (Rechytsa)',
        address: 'Rechytsa, Gomel Region, Belarus',
        city: 'Rechytsa',
        author: null,
        description:
          'The Church of Saint Stanislaus in Rechytsa is the largest Catholic church in the south of Gomel Region, built in the second half of the 19th century in neo-Romanesque forms. The monumental brick building with a semicircular apse and expressive façade rises above the historic centre on the Dnieper bank. Rechytsa is one of the oldest towns in Belarus, known since princely times and the Polish-Lithuanian Commonwealth; the church became a symbol of the revival of the Catholic community after fires and wars. Today it is an architectural landmark of the embankment and a key stop on cultural routes through Dnieper Polesia.',
        tags: ['Belarus', 'Gomel Region', 'Rechytsa', 'Church', 'Neo-Romanesque', '19th century', 'Dnieper'],
      },
      be: {
        name: 'Касцёл Святога Станіслава (Рэчыца)',
        address: 'Рэчыца, Гомельская вобласць, Беларусь',
        city: 'Рэчыца',
        author: null,
        description:
          'Касцёл Святога Станіслава ў Рэчыцы — найбольшы каталіцкі храм на поўдні Гомельскай вобласці, пабудаваны ў другой палове XIX стагоддзя ў формах неарамантыкі. Манументальнае цаглянае будынне з паўкруглай апсидай і выразным фасадам узвышаецца над гістарычным цэнтрам горада на беразе Дняпра. Рэчыца — адзін з найстаражытнейших гарадоў Беларусі, вядомы з княжой эпохі і часоў Рэчы Паспалітай; храм стаў сімвалам адраджэння каталіцкай супольнасці пасля пажараў і войнаў. Сёння касцёл — архітэктурная дамінанта набярэжнай і важная кропка культурнага маршруту па Дняпроўскім Полессі.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Рэчыца', 'Касцёл', 'Неарамантыка', 'XIX стагоддзе', 'Дняпро'],
      },
    },
  }),
  place({
    id: 'belarus_place_039',
    name: 'Замковая гора в Чечерске',
    city: 'Чечерск',
    address: 'Замковая гора, Чечерск, Гомельская область, Беларусь',
    lat: 52.9139,
    lng: 30.9172,
    display: 'XVI–XVII вв.',
    year: 1600,
    author: null,
    description:
      'Замковая гора в Чечерске — памятник средневековой оборонительной архитектуры на высоком берегу реки Ипуть, одна из визитных карточек восточной Гомельщины. Здесь в XVI–XVII веках стоял дерево-земляный замок, защищавший перекрёсток торговых путей Полесья; сохранились валы, рвы и фундаменты башен. С площадки открывается панорама на старый город и окрестные поля. Чечерск известен богатой историей магдебургского права и шляхетских родов; археологические исследования городища продолжаются, а территория благоустраивается для туристов и краеведов.',
    tags: ['Беларусь', 'Гомельская область', 'Чечерск', 'Замок', 'Городище', 'XVI век', 'Средневековье'],
    i18n: {
      ru: { address: 'Чечерск, Гомельская область, Беларусь', city: 'Чечерск' },
      en: {
        name: 'Castle Hill in Chechersk',
        address: 'Chechersk, Gomel Region, Belarus',
        city: 'Chechersk',
        author: null,
        description:
          'Castle Hill in Chechersk is a monument of medieval defensive architecture on a high bank of the Iput river, one of the landmarks of eastern Gomel Region. In the 16th and 17th centuries a timber-and-earth castle stood here, guarding a crossroads of trade routes in Polesia; ramparts, moats and tower foundations survive. The site offers a panorama of the old town and surrounding fields. Chechersk is known for its rich history of Magdeburg law and noble families; archaeological research at the stronghold continues and the area is being improved for tourists and local historians.',
        tags: ['Belarus', 'Gomel Region', 'Chechersk', 'Castle', 'Stronghold', '16th century', 'Middle Ages'],
      },
      be: {
        name: 'Замкавая гара ў Чачэрску',
        address: 'Чачэрск, Гомельская вобласць, Беларусь',
        city: 'Чачэрск',
        author: null,
        description:
          'Замкавая гара ў Чачэрску — помнік сярэдневяковай абарончай архітэктуры на высокім беразе ракі Іпуць, адна з візітных картак усходу Гомельшчыны. Тут у XVI–XVII стагоддзях стаяў дрэва-земляны замак, які абараняў скрыжаванне гандлёвых шляхоў Полесся; захаваліся валы, рвы і фундаменты веж. З пляцоўкі адкрываецца панарама на стары горад і вакольныя палі. Чачэрск вядомы багатай гісторыяй магдэбургскага права і шляхецкіх родаў; археалагічныя даследаванні гарадзішча працягваюцца, а тэрыторыя благоустраиваецца для турыстаў і краязнаўцаў.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Чачэрск', 'Замак', 'Гарадзішча', 'XVI стагоддзе', 'Сярэдневечча'],
      },
    },
  }),
  place({
    id: 'belarus_place_040',
    name: 'Спасо-Преображенская церковь (Лоев)',
    city: 'Лоев',
    address: 'Спасо-Преображенская церковь, Лоев, Гомельская область, Беларусь',
    lat: 51.945,
    lng: 30.7953,
    display: 'XIX в.',
    year: 1860,
    author: null,
    description:
      'Спасо-Преображенская церковь в Лоеве — православный храм XIX века на живописном холме над Днепром, в одном из древнейших городов южной Гомельщины. Лоев известен с княжеской эпохи как пограничный пункт между Полесьем и степью; название связывают с легендой о князе Льве. Каменная церковь с характерным куполом и колокольней формирует силуэт исторического центра. Рядом — памятные места, связанные с переправами через Днепр и событиями Великой Отечественной войны. Сегодня Лоев привлекает путешественников панорамами реки и маршрутами в сторону Полесского радиационно-экологического заповедника.',
    tags: ['Беларусь', 'Гомельская область', 'Лоев', 'Церковь', 'XIX век', 'Днепр', 'Полесье'],
    i18n: {
      ru: { address: 'Лоев, Гомельская область, Беларусь', city: 'Лоев' },
      en: {
        name: 'Transfiguration Church (Loyew)',
        address: 'Loyew, Gomel Region, Belarus',
        city: 'Loyew',
        author: null,
        description:
          'The Transfiguration Church in Loyew is a 19th-century Orthodox church on a scenic hill above the Dnieper, in one of the oldest towns of southern Gomel Region. Loyew has been known since princely times as a border point between Polesia and the steppe; its name is linked with the legend of Prince Lev. The stone church with its characteristic dome and bell tower shapes the skyline of the historic centre. Nearby are sites associated with Dnieper crossings and the Second World War. Today Loyew attracts travellers with river panoramas and routes towards the Polesie State Radioecological Reserve.',
        tags: ['Belarus', 'Gomel Region', 'Loyew', 'Church', '19th century', 'Dnieper', 'Polesia'],
      },
      be: {
        name: 'Спаса-Праабражэнская царква (Лоев)',
        address: 'Лоев, Гомельская вобласць, Беларусь',
        city: 'Лоев',
        author: null,
        description:
          'Спаса-Праабражэнская царква ў Лоеве — праваслаўны храм XIX стагоддзя на маляўнічым узгорку над Дняпром, у адным з найстаражытнейших гарадоў паўднёвай Гомельшчыны. Лоев вядомы з княжой эпохі як пагранічны пункт паміж Полессям і стэпам; назву звязваюць з легендай пра князя Льва. Каменная царква з характэрным купалам і званом фармуе сілуэт гістарычнага цэнтра. Побач — памятныя месцы, звязаныя з паромамі праз Дняпро і падзеямі Вялікай Айчыннай вайны. Сёння Лоев прыцягвае падарожнікаў панарамамі ракі і маршрутамі ў бок Полескага радыяцыйна-экалагічнага запаведніка.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Лоев', 'Царква', 'XIX стагоддзе', 'Дняпро', 'Полессе'],
      },
    },
  }),
  place({
    id: 'belarus_place_041',
    name: 'Костёл Рождества Пресвятой Девы Марии (Житковичи)',
    city: 'Житковичи',
    address: 'Костёл Рождества Пресвятой Девы Марии, Житковичи, Гомельская область, Беларусь',
    lat: 52.1936,
    lng: 27.8569,
    display: 'нач. XX в.',
    year: 1910,
    author: null,
    description:
      'Костёл Рождества Пресвятой Девы Марии в Житковичах — яркий образец кирпичной неоготики начала XX века в Полесском районе Гомельской области. Стройный храм с высокими окнами-ключами и декоративными пинаклями доминирует над застройкой города на реке Случь. Житковичи — ворота в Полесский радиационно-экологический заповедник и исторический центр лесного и речного промысла. Костёл был духовным центром местной католической общины в межвоенный период; после реставрации вновь открыт для богослужений. Архитектура храма хорошо сочетается с деревянными и кирпичными постройками старого Полесья.',
    tags: ['Беларусь', 'Гомельская область', 'Житковичи', 'Костёл', 'Неоготика', 'XX век', 'Полесье'],
    i18n: {
      ru: { address: 'Житковичи, Гомельская область, Беларусь', city: 'Житковичи' },
      en: {
        name: 'Church of the Nativity of the Blessed Virgin Mary (Zhitkovichi)',
        address: 'Zhitkovichi, Gomel Region, Belarus',
        city: 'Zhitkovichi',
        author: null,
        description:
          'The Church of the Nativity of the Blessed Virgin Mary in Zhitkovichi is a striking example of brick neo-Gothic of the early 20th century in Polesie District, Gomel Region. The slender church with tall lancet windows and decorative pinnacles dominates the town on the Sluch river. Zhitkovichi is the gateway to the Polesie State Radioecological Reserve and a historic centre of timber and river trades. The church was the spiritual centre of the local Catholic community in the interwar period; after restoration it is open again for worship. The architecture harmonises with wooden and brick buildings typical of old Polesia.',
        tags: ['Belarus', 'Gomel Region', 'Zhitkovichi', 'Church', 'Neo-Gothic', '20th century', 'Polesia'],
      },
      be: {
        name: 'Касцёл Нараджэння Найсвяцейшай Дзевы Марыі (Жыткавічы)',
        address: 'Жыткавічы, Гомельская вобласць, Беларусь',
        city: 'Жыткавічы',
        author: null,
        description:
          'Касцёл Нараджэння Найсвяцейшай Дзевы Марыі ў Жыткавічах — яркі ўзор цагляной неаготыкі пачатку XX стагоддзя ў Палескім раёне Гомельскай вобласці. Стройны храм з высокімі вокнамі-ключамі і дэкаратыўнымі пінаклямі дамінуе над забудовай горада на рацэ Случ. Жыткавічы — вароты ў Полескі радыяцыйна-экалагічны запаведнік і гістарычны цэнтр ляснога і рачнога промыслу. Касцёл быў духоўным цэнтрам мясцовай каталіцкай супольнасці ў міжваенны перыяд; пасля рэстаўрацыі зноў адкрыты для богаслужэнняў. Архітэктура храма добра спалучаецца з драўлянымі і цаглянымі пабудовамі стараго Полесся.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Жыткавічы', 'Касцёл', 'Неаготыка', 'XX стагоддзе', 'Полессе'],
      },
    },
  }),
  place({
    id: 'belarus_place_042',
    name: 'Музей «Петриковская роспись» (Петриков)',
    city: 'Петриков',
    address: 'Музей народного творчества «Петриковская роспись», Петриков, Гомельская область, Беларусь',
    lat: 52.1289,
    lng: 28.4919,
    display: 'XX–XXI вв.',
    year: 1960,
    author: null,
    description:
      'Музей «Петриковская роспись» в Петрикове — главный центр сохранения и популяризации уникального народного промысла Гомельщины, внесённого в список нематериального культурного наследия ЮНЕСКО. Экспозиция рассказывает об истории росписи по дереву и ткани с характерными плавными орнаментами, золотисто-красной гаммой и мотивами полесской природы. Мастера демонстрируют технику кистью из кошачьей шерсти и тростниковым тростником. Петриков ежегодно принимает фестивали и ярмарки ремёсел; музей — обязательная остановка для знакомства с живой традицией, которая продолжает развиваться в XXI веке.',
    tags: ['Беларусь', 'Гомельская область', 'Петриков', 'Музей', 'Народное творчество', 'ЮНЕСКО', 'Полесье'],
    i18n: {
      ru: { address: 'Петриков, Гомельская область, Беларусь', city: 'Петриков' },
      en: {
        name: 'Petrikov Painting Museum (Petrikov)',
        address: 'Petrikov, Gomel Region, Belarus',
        city: 'Petrikov',
        author: null,
        description:
          'The Petrikov Painting Museum is the main centre for preserving and promoting a unique folk craft of Gomel Region, inscribed on the UNESCO Intangible Cultural Heritage list. The exhibition tells the history of painting on wood and fabric with characteristic flowing ornaments, golden-red palette and motifs of Polesia nature. Masters demonstrate technique using brushes of cat hair and reed pens. Petrikov hosts annual craft festivals and fairs; the museum is an essential stop to discover a living tradition that continues to develop in the 21st century.',
        tags: ['Belarus', 'Gomel Region', 'Petrikov', 'Museum', 'Folk art', 'UNESCO', 'Polesia'],
      },
      be: {
        name: 'Музей «Петрыкаўская роспіс» (Петрыкаў)',
        address: 'Петрыкаў, Гомельская вобласць, Беларусь',
        city: 'Петрыкаў',
        author: null,
        description:
          'Музей «Петрыкаўская роспіс» у Петрыкаўе — галоўны цэнтр захавання і папулярызацыі ўнікальнага народнага промыслу Гомельшчыны, унесенага ў спіс нематэрыяльнай культурнай спадчыны ЮНЕСКА. Экспазіцыя расказвае пра гісторыю роспісу па дрэве і тканіне з характэрнымі плыўнымі арнаментамі, залатысна-чырвонай гамай і матывамі палескай прыроды. Майстры дэманструюць тэхніку пэндзлем з кошачай шэрсці і трыснёвым трыснёвікам. Петрыкаў штогод прымае фестывалі і кірмашы рамёстваў; музей — абавязковая спынка для знаёмства з жывой традыцыяй, якая працягвае развівацца ў XXI стагоддзі.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Петрыкаў', 'Музей', 'Народная творчасць', 'ЮНЕСКА', 'Полессе'],
      },
    },
  }),
  place({
    id: 'belarus_place_043',
    name: 'Усадебно-парковый ансамбль в Паричах',
    city: 'Паричи',
    address: 'Усадебно-парковый ансамбль, Паричи, Светлогорский район, Гомельская область, Беларусь',
    lat: 52.7836,
    lng: 28.5164,
    display: 'кон. XIX — нач. XX в.',
    year: 1890,
    author: 'Богуслав-Репнины',
    description:
      'Усадебно-парковый ансамбль в Паричах — один из крупнейших дворцово-парковых комплексов Гомельщины, созданный в конце XIX — начале XX века для рода Богуслав-Репниных. Парадный дворец в стиле эклектики, флигели, оранжереи и обширный пейзажный парк с прудами и редкими деревьями образуют единое пространство на берегу реки Бобр. В советское время здесь разместился знаменитый санаторий; архитектура и парк сохранились как памятник эпохи «белорусского Бадена». Сегодня Паричи популярны у туристов, любителей архитектуры и тех, кто ищет спокойный отдых в окружении исторических аллей.',
    tags: ['Беларусь', 'Гомельская область', 'Паричи', 'Усадьба', 'Парк', 'XIX век', 'Санаторий'],
    i18n: {
      ru: { address: 'Паричи, Светлогорский район, Гомельская область, Беларусь', city: 'Паричи', author: 'Богуслав-Репнины' },
      en: {
        name: 'Estate and Park Ensemble in Parichi',
        address: 'Parichi, Svetlogorsk District, Gomel Region, Belarus',
        city: 'Parichi',
        author: 'Boguslav-Repnin family',
        description:
          'The estate and park ensemble in Parichi is one of the largest palace-and-park complexes in Gomel Region, created in the late 19th and early 20th century for the Boguslav-Repnin family. The ceremonial palace in eclectic style, outbuildings, orangery and extensive landscape park with ponds and rare trees form a single space on the Bobr river. In Soviet times the famous sanatorium was housed here; the architecture and park survived as a monument to the era of the "Belarusian Baden". Today Parichi are popular with tourists, architecture enthusiasts and those seeking quiet rest among historic avenues.',
        tags: ['Belarus', 'Gomel Region', 'Parichi', 'Estate', 'Park', '19th century', 'Sanatorium'],
      },
      be: {
        name: 'Сядзібна-паркавы ансамбль у Парычах',
        address: 'Парычы, Светлагорскі раён, Гомельская вобласць, Беларусь',
        city: 'Парычы',
        author: 'Богуслаў-Рэпніны',
        description:
          'Сядзібна-паркавы ансамбль у Парычах — адзін з найбольшых палацава-паркавых комплексаў Гомельшчыны, створаны ў канцы XIX — пачатку XX стагоддзя для роду Богуслаў-Рэпніных. Парадны палац у стылі эклектыкі, флігелі, аранжарэі і шырокі пейзажны парк з сажалкамі і рэдкімі дрэвамі ўтвараюць адзінае прастору на беразе ракі Бобр. У савецкі час тут размясціўся вядомы санаторый; архітэктура і парк захаваліся як помнік эпохі «беларускага Бадэна». Сёння Парычы папулярныя ў турыстаў, аматараў архітэктуры і тых, хто шукае спакойны адпачынак сярод гістарычных аллей.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Парычы', 'Сядзіба', 'Парк', 'XIX стагоддзе', 'Санаторый'],
      },
    },
  }),
  place({
    id: 'belarus_place_044',
    name: 'Спасо-Преображенская церковь (Брагин)',
    city: 'Брагин',
    address: 'Спасо-Преображенская церковь, Брагин, Гомельская область, Беларусь',
    lat: 51.8011,
    lng: 30.2678,
    display: 'кон. XVIII в.',
    year: 1790,
    author: null,
    description:
      'Спасо-Преображенская церковь в Брагине — памятник деревянной и кирпичной архитектуры конца XVIII века, вокруг которого сложился историко-краеведческий музей района. Брагин — древний город Полесья, неоднократно страдавший от войн и пожаров; храм стал символом сохранения местной идентичности. В музее представлены находки с городищ, предметы быта и экспозиции о традициях южного Полесья. С площадки у церкви открываются виды на окрестные луга и поймы Припяти. Брагинский район входит в зону Полесского заповедника и привлекает исследователей природы и истории.',
    tags: ['Беларусь', 'Гомельская область', 'Брагин', 'Церковь', 'Музей', 'XVIII век', 'Полесье'],
    i18n: {
      ru: { address: 'Брагин, Гомельская область, Беларусь', city: 'Брагин' },
      en: {
        name: 'Transfiguration Church (Bragin)',
        address: 'Bragin, Gomel Region, Belarus',
        city: 'Bragin',
        author: null,
        description:
          'The Transfiguration Church in Bragin is a monument of wooden and brick architecture of the late 18th century around which the district local history museum was established. Bragin is an ancient town of Polesia that suffered repeatedly from wars and fires; the church became a symbol of preserving local identity. The museum displays finds from strongholds, everyday objects and exhibitions on the traditions of southern Polesia. From the churchyard there are views of meadows and Pripyat floodplains. Bragin District lies within the Polesie reserve area and attracts researchers of nature and history.',
        tags: ['Belarus', 'Gomel Region', 'Bragin', 'Church', 'Museum', '18th century', 'Polesia'],
      },
      be: {
        name: 'Спаса-Праабражэнская царква (Брагін)',
        address: 'Брагін, Гомельская вобласць, Беларусь',
        city: 'Брагін',
        author: null,
        description:
          'Спаса-Праабражэнская царква ў Брагіне — помнік драўляной і цагляной архітэктуры канца XVIII стагоддзя, вакол якога сфармаваўся гісторыка-краязнаўчы музей раёна. Брагін — старажытны горад Полесся, неаднаразова пакутаваў ад войнаў і пажараў; храм стаў сімвалам захавання мясцовай ідэнтычнасці. У музеі прадстаўлены знаходкі з гарадзішчаў, прадметы быту і экспазіцыі пра традыцыі паўднёвага Полесся. З пляцоўкі ў царквы адкрываюцца выды на вакольныя лугі і поймы Прыпяці. Брагінскі раён уваходзіць у зону Полескага запаведніка і прыцягвае даследчыкаў прыроды і гісторыі.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Брагін', 'Царква', 'Музей', 'XVIII стагоддзе', 'Полессе'],
      },
    },
  }),
  place({
    id: 'belarus_place_045',
    name: 'Костёл Успения Пресвятой Девы Марии (Наровля)',
    city: 'Наровля',
    address: 'Костёл Успения Пресвятой Девы Марии, Наровля, Гомельская область, Беларусь',
    lat: 51.7964,
    lng: 29.5014,
    display: 'кон. XIX в.',
    year: 1890,
    author: null,
    description:
      'Костёл Успения Пресвятой Девы Марии в Наровле — крупный неоготический храм на берегу Припяти, архитектурная доминанта юго-восточной Гомельщины. Возведённый в конце XIX века, он украшал застройку города, известного с XIV века как торгово-ремесленный центр Полесья. Высокие стрельчатые окна, контрфорсы и башня придают зданию монументальность. Наровля — отправная точка для путешествий в Полесский радиационно-экологический заповедник и по маршрутам древних городищ. Костёл остаётся важным символом многонациональной и многоконфессиональной истории региона.',
    tags: ['Беларусь', 'Гомельская область', 'Наровля', 'Костёл', 'Неоготика', 'XIX век', 'Припять'],
    i18n: {
      ru: { address: 'Наровля, Гомельская область, Беларусь', city: 'Наровля' },
      en: {
        name: 'Church of the Assumption of the Blessed Virgin Mary (Narowlya)',
        address: 'Narowlya, Gomel Region, Belarus',
        city: 'Narowlya',
        author: null,
        description:
          'The Church of the Assumption of the Blessed Virgin Mary in Narowlya is a large neo-Gothic church on the Pripyat bank, an architectural landmark of south-eastern Gomel Region. Built in the late 19th century, it adorned the town known since the 14th century as a trade and craft centre of Polesia. Tall lancet windows, buttresses and a tower give the building monumentality. Narowlya is a starting point for trips to the Polesie State Radioecological Reserve and routes to ancient strongholds. The church remains an important symbol of the region\'s multi-ethnic and multi-confessional history.',
        tags: ['Belarus', 'Gomel Region', 'Narowlya', 'Church', 'Neo-Gothic', '19th century', 'Pripyat'],
      },
      be: {
        name: 'Касцёл Унебаўзяцця Найсвяцейшай Дзевы Марыі (Нароўля)',
        address: 'Нароўля, Гомельская вобласць, Беларусь',
        city: 'Нароўля',
        author: null,
        description:
          'Касцёл Унебаўзяцця Найсвяцейшай Дзевы Марыі ў Нароўлі — вялікі неагатычны храм на беразе Прыпяці, архітэктурная дамінанта паўднёва-усходу Гомельшчыны. Узведзены ў канцы XIX стагоддзя, ён украшаў забудову горада, вядомага з XIV стагоддзя як гандлёва-рамесленны цэнтр Полесся. Высокія стральчастыя вокны, контрфорсы і вежа надаюць будынку манументальнасць. Нароўля — адправная кропка для падарожжаў у Полескі радыяцыйна-экалагічны запаведнік і па маршрутах старажытных гарадзішчаў. Касцёл застаецца важным сімвалам шматнацыянальнай і шматканфесійнай гісторыі рэгіёна.',
        tags: ['Беларусь', 'Гомельская вобласць', 'Нароўля', 'Касцёл', 'Неаготыка', 'XIX стагоддзе', 'Прыпяць'],
      },
    },
  }),
];

writeFileSync(
  new URL('../places-export-gomel.json', import.meta.url),
  JSON.stringify(places, null, 2) + '\n',
  'utf8'
);
console.log('Wrote', places.length, 'places to places-export-gomel.json');
