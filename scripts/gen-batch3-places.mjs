import { writeFileSync } from 'fs';

const TS = '2026-05-21T10:00:00.000Z';

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
  // —— Запад от Могилёва (4) ——
  place({
    id: 'belarus_place_056',
    name: 'Костёл Святого Антония Падуанского (Белыничи)',
    city: 'Белыничи',
    address: 'Костёл Святого Антония, Белыничи, Могилёвская область, Беларусь',
    lat: 53.7836,
    lng: 29.7158,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Антония Падуанского в Белыничах — главный архитектурный памятник районного центра на полпути между Могилёвом и Бобруйском. Неоготический кирпичный храм с высокой башней доминирует над исторической застройкой, сохранившей черты местечка Речи Посполитой. Белыничи известны также усадебным наследием и связями с польско-литовской шляхтой; костёл стал духовным центром католической общины региона. После реставрации храм вновь открыт для богослужений и входит в маршруты по восточной Могилёвщине.',
    tags: ['Беларусь', 'Могилёвская область', 'Белыничи', 'Костёл', 'Неоготика', 'XIX век'],
    i18n: mk(
      'Белыничи, Могилёвская область, Беларусь', 'Белыничи',
      'Belynichi, Mogilev Region, Belarus', 'Belynichi',
      'Белынічы, Магілёўская вобласць, Беларусь', 'Белынічы',
      {
        en: {
          name: 'Church of Saint Anthony of Padua (Belynichi)',
          description:
            'The Church of Saint Anthony of Padua in Belynichi is the main architectural landmark of the district centre halfway between Mogilev and Bobruisk. The neo-Gothic brick church with a tall tower dominates the historic fabric of a town that retains the character of a Polish-Lithuanian Commonwealth settlement. Belynichi are also known for estate heritage and ties to the nobility; the church became the spiritual centre of the local Catholic community. After restoration it is open again for worship and features on routes through eastern Mogilev Region.',
          tags: ['Belarus', 'Mogilev Region', 'Belynichi', 'Church', 'Neo-Gothic', '19th century'],
        },
        be: {
          name: 'Касцёл Святога Антона Падуанскага (Белынічы)',
          description:
            'Касцёл Святога Антона Падуанскага ў Белынічах — галоўны архітэктурны помнік раённага цэнтра на паловіні шляху паміж Магілёвам і Бабруйскам. Неагатычны цагляны храм з высокай вежай дамінуе над гістарычнай забудовай мястэчка. Белынічы вядомыя сядзібнай спадчынай; касцёл стаў духоўным цэнтрам каталіцкай супольнасці рэгіёна. Пасля рэстаўрацыі храм зноў адкрыты для богаслужэнняў.',
          tags: ['Беларусь', 'Магілёўская вобласць', 'Белынічы', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_057',
    name: 'Костёл Успения Пресвятой Девы Марии (Чериков)',
    city: 'Чериков',
    address: 'Костёл Успения, Чериков, Могилёвская область, Беларусь',
    lat: 53.4581,
    lng: 30.9164,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения Пресвятой Девы Марии в Черикове — визитная карточка небольшого города на востоке Могилёвской области, известного с XV века. Монументальный кирпичный храм в неороманском стиле возвышается над площадью, рядом сохранились здания исторического центра. Чериков расположен на холмистом берегу Сожи; в окрестностях — памятники природы и следы старинных торговых путей. Костёл подчёркивает многоконфессиональную историю края и дополняет маршруты между Могилёвом и восточными районами.',
    tags: ['Беларусь', 'Могилёвская область', 'Чериков', 'Костёл', 'XIX век', 'Сож'],
    i18n: mk(
      'Чериков, Могилёвская область, Беларусь', 'Чериков',
      'Cherikov, Mogilev Region, Belarus', 'Cherikov',
      'Чэрыкаў, Магілёўская вобласць, Беларусь', 'Чэрыкаў',
      {
        en: {
          name: 'Church of the Assumption of the Blessed Virgin Mary (Cherikov)',
          description:
            'The Church of the Assumption in Cherikov is the landmark of a small town in eastern Mogilev Region, known since the 15th century. The monumental brick church in neo-Romanesque style rises above the square, near surviving buildings of the historic centre. Cherikov lies on hilly banks of the Sozh; the area has nature monuments and traces of old trade routes. The church highlights the region\'s multi-confessional history on routes between Mogilev and eastern districts.',
          tags: ['Belarus', 'Mogilev Region', 'Cherikov', 'Church', '19th century', 'Sozh'],
        },
        be: {
          name: 'Касцёл Унебаўзяцця Найсвяцейшай Дзевы Марыі (Чэрыкаў)',
          description:
            'Касцёл Унебаўзяцця ў Чэрыкаўе — візітная картка горада на ўсходзе Магілёўскай вобласці, вядомага з XV стагоддзя. Манументальны цагляны храм у неарамантычным стылі ўзвышаецца над плошчай. Чэрыкаў на ўзгорку Сожу; касцёл падкрэслівае шматканфесійную гісторыю краю.',
          tags: ['Беларусь', 'Магілёўская вобласць', 'Чэрыкаў', 'Касцёл', 'XIX стагоддзе', 'Сож'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_058',
    name: 'Музей истории и культуры Осиповичского района',
    city: 'Осиповичи',
    address: 'Музей истории и культуры, Осиповичи, Могилёвская область, Беларусь',
    lat: 53.2994,
    lng: 28.6389,
    display: 'XX в.',
    year: 1980,
    description:
      'Музей истории и культуры Осиповичского района — главный культурный центр железнодорожного города на линии Могилёв — Бобруйск. Экспозиция рассказывает о становлении Осиповичей как узла Юго-Восточной железной дороги, быте станционного посёлка и событиях XX века. Город вырос вокруг мастерских и депо; сегодня это важная транспортная точка Полесья. Музей помогает понять историю заселения и промышленного развития полосы западнее Могилёва, где на карте памятников до сих пор мало точек.',
    tags: ['Беларусь', 'Могилёвская область', 'Осиповичи', 'Музей', 'Железная дорога', 'XX век'],
    i18n: mk(
      'Осиповичи, Могилёвская область, Беларусь', 'Осиповичи',
      'Osipovichi, Mogilev Region, Belarus', 'Osipovichi',
      'Асіповічы, Магілёўская вобласць, Беларусь', 'Асіповічы',
      {
        en: {
          name: 'Osipovichi District Museum of History and Culture',
          description:
            'The Osipovichi District Museum is the main cultural centre of a railway town on the Mogilev–Bobruisk line. Exhibitions cover the rise of Osipovichi as a hub of the South-Eastern Railway, life in the station settlement and 20th-century events. The town grew around workshops and depots; today it is an important transport point in Polesia. The museum explains settlement and industrial history west of Mogilev, where few heritage sites appear on the map.',
          tags: ['Belarus', 'Mogilev Region', 'Osipovichi', 'Museum', 'Railway', '20th century'],
        },
        be: {
          name: 'Музей гісторыі і культуры Асіповіцкага раёна',
          description:
            'Музей гісторыі і культуры Асіповіцкага раёна — галоўны культурны цэнтр чыгуначнага горада на лініі Магілёў — Бабруйск. Экспазіцыя расказвае пра станаўленне Асіповічаў як вузла Паўднёва-Усходняй чыгункі і падзеі XX стагоддзя.',
          tags: ['Беларусь', 'Магілёўская вобласць', 'Асіповічы', 'Музей', 'Чыгунка', 'XX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_059',
    name: 'Памятный знак «Березина» (Березино)',
    city: 'Березино',
    address: 'Мемориальный комплекс, Березино, Минская область, Беларусь',
    lat: 54.0169,
    lng: 28.9836,
    display: 'XX в.',
    year: 1970,
    description:
      'Мемориальный комплекс у Березино посвящён форсированию Березины войсками 1812 года и военной истории края. Город на реке Березине связывают с трагическим отступлением Наполеона; в окрестностях сохранились памятные места и музейные экспозиции. Березино — старинный центр ремёсел и торговли между Минском и Могилёвом; сегодня это тихий районный город с деревянной застройкой и набережной. Комплекс — ключевая точка для тех, кто заполняет «пустую» полосу между Могилёвом и Борисовом на карте памятных мест.',
    tags: ['Беларусь', 'Минская область', 'Березино', 'Мемориал', '1812 год', 'Березина'],
    i18n: mk(
      'Березино, Минская область, Беларусь', 'Березино',
      'Berezino, Minsk Region, Belarus', 'Berezino',
      'Беразіно, Мінская вобласць, Беларусь', 'Беразіно',
      {
        en: {
          name: 'Berezina Memorial (Berezino)',
          description:
            'The memorial complex in Berezino commemorates the crossing of the Berezina in 1812 and military history of the area. The town on the Berezina river is linked with Napoleon\'s retreat; nearby are commemorative sites and museum displays. Berezino is an old centre of crafts and trade between Minsk and Mogilev; today a quiet district town with wooden buildings and an embankment. The complex is a key point for filling the gap between Mogilev and Borisov on the heritage map.',
          tags: ['Belarus', 'Minsk Region', 'Berezino', 'Memorial', '1812', 'Berezina'],
        },
        be: {
          name: 'Памятны знак «Бярозіна» (Беразіно)',
          description:
            'Мемарыяльны комплекс у Беразіно прысвечаны форсіраванню Бярозіны войскамі 1812 года і ваеннай гісторыі краю. Горад на рацэ Бярозіне — цэнтр рамёстваў і гандлю паміж Мінскам і Магілёвам.',
          tags: ['Беларусь', 'Мінская вобласць', 'Беразіно', 'Мемарыял', '1812 год', 'Бярозіна'],
        },
      }
    ),
  }),

  // —— Кольцо Солигорска (5) ——
  place({
    id: 'belarus_place_060',
    name: 'Костёл Успения Пресвятой Девы Марии (Старые Дороги)',
    city: 'Старые Дороги',
    address: 'Костёл Успения, Старые Дороги, Минская область, Беларусь',
    lat: 53.0336,
    lng: 28.2669,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения в Старых Дорогах — главный архитектурный памятник города на юге Минской области, в зоне, где на карте памятников долго оставалось пусто. Кирпичный храм в неоготических формах возвышается над центром; рядом — здания межвоенной и послевоенной застройки. Старые Дороги связаны с историей Полесья и железнодорожной линией на Солигорск; город — удобная остановка между Слуцком и Любанью. Костёл отражает католическую традицию региона и дополняет маршруты вокруг калийного Солигорска.',
    tags: ['Беларусь', 'Минская область', 'Старые Дороги', 'Костёл', 'Неоготика', 'XIX век', 'Полесье'],
    i18n: mk(
      'Старые Дороги, Минская область, Беларусь', 'Старые Дороги',
      'Staryya Darohi, Minsk Region, Belarus', 'Staryya Darohi',
      'Старыя Дарогі, Мінская вобласць, Беларусь', 'Старыя Дарогі',
      {
        en: {
          name: 'Church of the Assumption (Staryya Darohi)',
          description:
            'The Church of the Assumption in Staryya Darohi is the main architectural landmark of a town in southern Minsk Region, in an area long empty on heritage maps. The brick neo-Gothic church rises above the centre near interwar and post-war buildings. The town is linked with Polesia history and the railway to Soligorsk; a convenient stop between Slutsk and Lyuban. The church reflects the region\'s Catholic tradition around mining Soligorsk.',
          tags: ['Belarus', 'Minsk Region', 'Staryya Darohi', 'Church', 'Neo-Gothic', '19th century', 'Polesia'],
        },
        be: {
          name: 'Касцёл Унебаўзяцця (Старыя Дарогі)',
          description:
            'Касцёл Унебаўзяцця ў Старых Дарогах — галоўны архітэктурны помнік горада на поўдні Мінскай вобласці ў зоне, дзе на карце доўга была пуста. Неагатычны цагляны храм узвышаецца над цэнтрам.',
          tags: ['Беларусь', 'Мінская вобласць', 'Старыя Дарогі', 'Касцёл', 'Неаготыка', 'XIX стагоддзе', 'Полессе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_061',
    name: 'Дом-музей Максима Горького (Любань)',
    city: 'Любань',
    address: 'Дом-музей Максима Горького, Любань, Минская область, Беларусь',
    lat: 52.8164,
    lng: 28.0003,
    display: 'кон. XIX в.',
    year: 1890,
    author: 'Максим Горький',
    description:
      'Дом-музей Максима Горького в Любани — мемориальный комплекс, посвящённый годам, которые писатель провёл на станции Любань-Ободовская. Деревянный дом с мемориальной обстановкой и прилегающий парк сохраняют атмосферу провинциальной Беларуси конца XIX века. Любань — небольшой город на реке Оресса, в пределах 60–70 км от Солигорска; здесь мало других туристических точек, поэтому музей становится якорем маршрута. Экспозиция рассказывает о раннем Горьком и железнодорожной истории края.',
    tags: ['Беларусь', 'Минская область', 'Любань', 'Музей', 'Горький', 'XIX век', 'Литература'],
    i18n: mk(
      'Любань, Минская область, Беларусь', 'Любань',
      'Lyuban, Minsk Region, Belarus', 'Lyuban',
      'Любань, Мінская вобласць, Беларусь', 'Любань',
      {
        author: 'Maxim Gorky',
        authorBe: 'Максім Горкі',
        en: {
          name: 'Maxim Gorky House Museum (Lyuban)',
          description:
            'The Maxim Gorky House Museum in Lyuban commemorates the years the writer spent at Lyuban-Obodovskaya station. The wooden house with memorial interiors and a park preserve the atmosphere of late 19th-century provincial Belarus. Lyuban is a small town within 60–70 km of Soligorsk with few other tourist sites; the museum anchors local routes. Exhibitions cover early Gorky and railway history of the area.',
          tags: ['Belarus', 'Minsk Region', 'Lyuban', 'Museum', 'Gorky', '19th century', 'Literature'],
        },
        be: {
          name: 'Дом-музей Максіма Горкага (Любань)',
          description:
            'Дом-музей Максіма Горкага ў Любані прысвечаны гадам, якія пісьменнік правёў на станцыі. Драўляны дом і парк захоўваюць атмасферу правінцыйнай Беларусі канца XIX стагоддзя. Любань у 60–70 км ад Салігорска.',
          tags: ['Беларусь', 'Мінская вобласць', 'Любань', 'Музей', 'Горкі', 'XIX стагоддзе', 'Літаратура'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_062',
    name: 'Костёл Святого Иоанна Крестителя (Копыль)',
    city: 'Копыль',
    address: 'Костёл Святого Иоанна Крестителя, Копыль, Минская область, Беларусь',
    lat: 53.1506,
    lng: 27.8328,
    display: '2-я пол. XIX в.',
    year: 1870,
    description:
      'Костёл Святого Иоанна Крестителя в Копыли — доминанта исторического центра древнего города на реке Гаплевич, известного с княжеской эпохи. Монументальный кирпичный храм второй половины XIX века в неороманском стиле стоит рядом с зданиями старой застройки и памятниками краеведческого музея. Копыль связан с именем Симона Будного и традициями протестантизма в Великом Княжестве Литовском. Город лежит в «пустом» кольце вокруг Солигорска и хорошо связывает маршруты на Слуцк, Несвиж и Любань.',
    tags: ['Беларусь', 'Минская область', 'Копыль', 'Костёл', 'XIX век', 'Симон Будный'],
    i18n: mk(
      'Копыль, Минская область, Беларусь', 'Копыль',
      'Kopyl, Minsk Region, Belarus', 'Kopyl',
      'Копыль, Мінская вобласць, Беларусь', 'Копыль',
      {
        en: {
          name: 'Church of Saint John the Baptist (Kopyl)',
          description:
            'The Church of Saint John the Baptist in Kopyl dominates the historic centre of an ancient town on the Haplievich river, known since princely times. The monumental brick church of the second half of the 19th century in neo-Romanesque style stands near old buildings and the local history museum. Kopyl is linked with Symon Budny and Reformation traditions in the Grand Duchy of Lithuania. The town lies in the empty ring around Soligorsk and connects routes to Slutsk, Nesvizh and Lyuban.',
          tags: ['Belarus', 'Minsk Region', 'Kopyl', 'Church', '19th century', 'Symon Budny'],
        },
        be: {
          name: 'Касцёл Святога Іаана Хрысціціця (Копыль)',
          description:
            'Касцёл Святога Іаана Хрысціціця ў Копылі — дамінанта гістарычнага цэнтра старажытнага горада на рацэ Гаплевіч. Копыль звязаны з імем Сымона Буднага і рэфармацыйнымі традыцыямі ВКЛ.',
          tags: ['Беларусь', 'Мінская вобласць', 'Копыль', 'Касцёл', 'XIX стагоддзе', 'Сымон Будны'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_063',
    name: 'Музей народной архитектуры и быта (Узда)',
    city: 'Узда',
    address: 'Музей народной архитектуры и быта, Узда, Минская область, Беларусь',
    lat: 53.4669,
    lng: 27.1664,
    display: 'XX в.',
    year: 1980,
    description:
      'Музей народной архитектуры и быта в Узде — этнографический комплекс под открытым небом с деревянными церквами, мельницей, хатами и амбарами, перенесёнными из разных районов Беларуси. Узда — старинное местечко на реке Узда, вдали от крупных туристических трассе; музей стал главной достопримечательностью района. Экспозиция показывает традиционное жилище, ремёсла и праздники белорусской деревни. Для карты памятных мест вокруг Солигорска это одна из самых содержательных точек в радиусе 70 км.',
    tags: ['Беларусь', 'Минская область', 'Узда', 'Музей', 'Этнография', 'Деревянная архитектура', 'XX век'],
    i18n: mk(
      'Узда, Минская область, Беларусь', 'Узда',
      'Uzda, Minsk Region, Belarus', 'Uzda',
      'Узда, Мінская вобласць, Беларусь', 'Узда',
      {
        en: {
          name: 'Museum of Folk Architecture and Life (Uzda)',
          description:
            'The Museum of Folk Architecture and Life in Uzda is an open-air ethnographic complex with wooden churches, a mill, houses and barns brought from across Belarus. Uzda is an old town on the Uzda river; the museum is the district\'s main attraction. Exhibitions show traditional housing, crafts and village festivals. For heritage maps around Soligorsk it is one of the richest sites within 70 km.',
          tags: ['Belarus', 'Minsk Region', 'Uzda', 'Museum', 'Ethnography', 'Wooden architecture', '20th century'],
        },
        be: {
          name: 'Музей народнай архітэктуры і быту (Узда)',
          description:
            'Музей народнай архітэктуры і быту ў Узде — этнаграфічны комплекс пад адкрытым небам з драўлянымі царквамі, мельніцай і хатамі. Узда — старажытнае мястэчка; музей — галоўная славутнасць раёна. Для карты вакол Салігорска гэта адна з найбольш змеслівых кропак у радыусе 70 км.',
          tags: ['Беларусь', 'Мінская вобласць', 'Узда', 'Музей', 'Этнаграфія', 'Драўляная архітэктура', 'XX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_064',
    name: 'Усадебно-парковый ансамбль в Дукоре',
    city: 'Дукора',
    address: 'Усадебно-парковый ансамбль, Дукора, Пуховичский район, Минская область, Беларусь',
    lat: 53.6831,
    lng: 27.8506,
    display: 'XIX в.',
    year: 1850,
    description:
      'Усадебно-парковый ансамбль в Дукоре — живописный дворцово-парковый комплекс в Пуховичском районе, один из немногих сохранившихся усадеб в «солигорском» пустом поясе. Парк с прудами, аллеями и редкими деревьями окружает усадебный дом в стиле классицизма и эклектики. Дукора известна также Ильинским днем народного единства и культурными фестивалями. Ансамбль привлекает любителей архитектуры и семейный отдых недалеко от Минска и Солигорска, заполняя пробел на карте между Пуховичами и Марьиной Горкой.',
    tags: ['Беларусь', 'Минская область', 'Дукора', 'Усадьба', 'Парк', 'XIX век', 'Пуховичи'],
    i18n: mk(
      'Дукора, Пуховичский район, Минская область, Беларусь', 'Дукора',
      'Dukora, Pukhovichi District, Minsk Region, Belarus', 'Dukora',
      'Дукора, Пухавіцкі раён, Мінская вобласць, Беларусь', 'Дукора',
      {
        en: {
          name: 'Estate and Park Ensemble in Dukora',
          description:
            'The estate and park ensemble in Dukora is a picturesque palace-and-park complex in Pukhovichi District, one of few surviving estates in the empty belt around Soligorsk. A park with ponds, alleys and rare trees surrounds a manor in Classicism and eclectic style. Dukora is known for folk festivals. The ensemble attracts architecture enthusiasts and families near Minsk and Soligorsk, filling the gap between Pukhovichi and Maryina Horka.',
          tags: ['Belarus', 'Minsk Region', 'Dukora', 'Estate', 'Park', '19th century', 'Pukhovichi'],
        },
        be: {
          name: 'Сядзібна-паркавы ансамбль у Дукоре',
          description:
            'Сядзібна-паркавы ансамбль у Дукоре — маляўнічы палацава-паркавы комплекс у Пухавіцкім раёне, адзін з немногіх сядзіб у «салігорскім» пустым поясе. Парк з сажалкамі і аллей атачае сядзібны дом.',
          tags: ['Беларусь', 'Мінская вобласць', 'Дукора', 'Сядзіба', 'Парк', 'XIX стагоддзе', 'Пухавічы'],
        },
      }
    ),
  }),

  // —— Вокруг Чашников (6) ——
  place({
    id: 'belarus_place_065',
    name: 'Костёл Успения Пресвятой Девы Марии (Чашники)',
    city: 'Чашники',
    address: 'Костёл Успения, Чашники, Витебская область, Беларусь',
    lat: 54.8669,
    lng: 29.1503,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Успения в Чашниках — архитектурная доминанта районного центра на юге Витебской области, в центре «пустого» сектора между Полоцком, Витебском и Борисовом. Высокий кирпичный храм в неоготическом стиле виден издалека; рядом — историческая застройка и краеведческий музей. Чашники стоят на холмах среди озёр; регион богат лесами и рыболовными традициями. Костёл — естественный центр маршрута для заполнения карты в радиусе 100–150 км от города.',
    tags: ['Беларусь', 'Витебская область', 'Чашники', 'Костёл', 'Неоготика', 'XIX век', 'Озёра'],
    i18n: mk(
      'Чашники, Витебская область, Беларусь', 'Чашники',
      'Chashniki, Vitebsk Region, Belarus', 'Chashniki',
      'Чашнікі, Віцебская вобласць, Беларусь', 'Чашнікі',
      {
        en: {
          name: 'Church of the Assumption (Chashniki)',
          description:
            'The Church of the Assumption in Chashniki is the architectural landmark of a district centre in southern Vitebsk Region, in the empty sector between Polotsk, Vitebsk and Borisov. The tall neo-Gothic brick church is visible from afar; nearby are historic buildings and a local museum. Chashniki stand among hills and lakes; the region is rich in forests and fishing traditions. The church is a natural hub for routes within 100–150 km.',
          tags: ['Belarus', 'Vitebsk Region', 'Chashniki', 'Church', 'Neo-Gothic', '19th century', 'Lakes'],
        },
        be: {
          name: 'Касцёл Унебаўзяцця (Чашнікі)',
          description:
            'Касцёл Унебаўзяцця ў Чашніках — архітэктурная дамінанта раённага цэнтра на поўдні Віцебшчыны, у цэнтры «пустога» сектара паміж Полацкам, Віцебскам і Барысаўам. Высокі неагатычны храм бачны здалёку.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Чашнікі', 'Касцёл', 'Неаготыка', 'XIX стагоддзе', 'Азёры'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_066',
    name: 'Замковая гора (Лепель)',
    city: 'Лепель',
    address: 'Замковая гора, Лепель, Витебская область, Беларусь',
    lat: 54.8836,
    lng: 28.7008,
    display: 'XI–XVII вв.',
    year: 1100,
    description:
      'Замковая гора в Лепеле — древнее городище и остатки замка на берегу озера Лепель, одна из главных достопримечательностей «озёрного края» Витебщины. С площадки открывается панорама на водную гладь и город, известный рыболовством и отдыхом. Лепель — старинный торговый пункт на пути из Полоцка на восток; археологи находили здесь слои XI–XVII веков. Сегодня холм благоустроен для прогулок и входит в туристические маршруты, закрывающие пустоту вокруг Чашников и Браславских озёр.',
    tags: ['Беларусь', 'Витебская область', 'Лепель', 'Замок', 'Городище', 'Озёра', 'Средневековье'],
    i18n: mk(
      'Лепель, Витебская область, Беларусь', 'Лепель',
      'Lepel, Vitebsk Region, Belarus', 'Lepel',
      'Лепель, Віцебская вобласць, Беларусь', 'Лепель',
      {
        en: {
          name: 'Castle Hill (Lepel)',
          description:
            'Castle Hill in Lepel is an ancient stronghold and castle remains on Lake Lepel, a main sight of the lake country of Vitebsk Region. The site offers panoramas of the water and the town known for fishing and recreation. Lepel was an old trading point from Polotsk eastward; archaeologists found layers from the 11th to 17th centuries. Today the hill is landscaped for walks and routes filling the gap around Chashniki and Braslav lakes.',
          tags: ['Belarus', 'Vitebsk Region', 'Lepel', 'Castle', 'Stronghold', 'Lakes', 'Middle Ages'],
        },
        be: {
          name: 'Замкавая гара (Лепель)',
          description:
            'Замкавая гара ў Лепелі — старажытнае гарадзішча і рэшткі замка на беразе возера Лепель. Лепель — старажытны гандлёвы пункт; археолагі знаходзілі тут пласты XI–XVII стагоддзяў.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Лепель', 'Замак', 'Гарадзішча', 'Азёры', 'Сярэдневечча'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_067',
    name: 'Спасо-Преображенская церковь (Сенно)',
    city: 'Сенно',
    address: 'Спасо-Преображенская церковь, Сенно, Витебская область, Беларусь',
    lat: 54.8167,
    lng: 29.7167,
    display: 'XIX в.',
    year: 1860,
    description:
      'Спасо-Преображенская церковь в Сенно — православный храм XIX века в центре города на берегу реки Ушача, известного своими озёрами и лесами. Сенно — старинное местечко, связанное с торговлей льном и лесом; сохранились здания исторической застройки. Церковь с характерным куполом и колокольней формирует силуэт панорамы города. Сенно удобно включать в кольцевые маршруты между Витебском, Полоцком и Чашниками, заполняя редкие точки на карте северо-восточной Беларуси.',
    tags: ['Беларусь', 'Витебская область', 'Сенно', 'Церковь', 'XIX век', 'Ушача'],
    i18n: mk(
      'Сенно, Витебская область, Беларусь', 'Сенно',
      'Senno, Vitebsk Region, Belarus', 'Senno',
      'Сянно, Віцебская вобласць, Беларусь', 'Сянно',
      {
        en: {
          name: 'Transfiguration Church (Senno)',
          description:
            'The Transfiguration Church in Senno is a 19th-century Orthodox church in the town centre on the Ushacha river, in an area known for lakes and forests. Senno is an old settlement linked with flax and timber trade; historic buildings survive. The church with its dome and bell tower shapes the town skyline. Senno fits ring routes between Vitebsk, Polotsk and Chashniki, filling rare points on the map of north-eastern Belarus.',
          tags: ['Belarus', 'Vitebsk Region', 'Senno', 'Church', '19th century', 'Ushacha'],
        },
        be: {
          name: 'Спаса-Праабражэнская царква (Сянно)',
          description:
            'Спаса-Праабражэнская царква ў Сянно — праваслаўны храм XIX стагоддзя ў цэнтры горада на беразе Ушачы. Сянно — старажытнае мястэчка, звязанае з гандлём льном і лесам.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Сянно', 'Царква', 'XIX стагоддзе', 'Ушача'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_068',
    name: 'Костёл Святого Антония (Толочин)',
    city: 'Толочин',
    address: 'Костёл Святого Антония, Толочин, Витебская область, Беларусь',
    lat: 54.4169,
    lng: 29.7003,
    display: 'кон. XIX в.',
    year: 1890,
    description:
      'Костёл Святого Антония в Толочине — крупный неоготический храм в городе на пересечении дорог Витебск — Орша — Минск. Толочин известен авиационным музеем и историей текстильной промышленности; костёл остаётся главным памятником архитектуры XIX века. Кирпичное здание с высокими окнами-ключами и башней украшает центральную площадь. Город лежит восточнее Чашников и помогает связать цепочку памятников через Сенно и Лепель на туристической карте.',
    tags: ['Беларусь', 'Витебская область', 'Толочин', 'Костёл', 'Неоготика', 'XIX век'],
    i18n: mk(
      'Толочин, Витебская область, Беларусь', 'Толочин',
      'Tolochin, Vitebsk Region, Belarus', 'Tolochin',
      'Талачын, Віцебская вобласць, Беларусь', 'Талачын',
      {
        en: {
          name: 'Church of Saint Anthony (Tolochin)',
          description:
            'The Church of Saint Anthony in Tolochin is a large neo-Gothic church in a town at the crossroads of Vitebsk, Orsha and Minsk routes. Tolochin is known for its aviation museum and textile history; the church remains the main 19th-century architectural monument. Brick with lancet windows and a tower adorns the central square. The town lies east of Chashniki and links a chain of sites through Senno and Lepel on the heritage map.',
          tags: ['Belarus', 'Vitebsk Region', 'Tolochin', 'Church', 'Neo-Gothic', '19th century'],
        },
        be: {
          name: 'Касцёл Святога Антона (Талачын)',
          description:
            'Касцёл Святога Антона ў Талачыне — вялікі неагатычны храм у горадзе на скрыжаванні дарог Віцебск — Орша — Мінск. Талачын вядомы авіямузеем; касцёл — галоўны помнік архітэктуры XIX стагоддзя.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Талачын', 'Касцёл', 'Неаготыка', 'XIX стагоддзе'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_069',
    name: 'Озеро Черное и Череомское болото (Ушачи)',
    city: 'Ушачи',
    address: 'Озеро Черное, Ушачи, Витебская область, Беларусь',
    lat: 55.1836,
    lng: 28.6164,
    display: 'природный памятник',
    year: 1900,
    description:
      'Озеро Черное и прилегающее Череомское болото в Ушачах — один из самых живописных природных комплексов северо-востока Беларуси, часто называемый «белорусской Швейцарией». Глубокое ледниковое озеро с прозрачной водой окружено холмами, сосновыми лесами и переходными болотами с редкими видами растений. Ушачи — центр района озёр и этнографических традиций; рядом музей и церковная архитектура. Природный памятник заполняет северный сектор вокруг Чашников, где на карте почти не было культурных и природных точек.',
    tags: ['Беларусь', 'Витебская область', 'Ушачи', 'Озеро', 'Природа', 'Памятник природы', 'Болото'],
    i18n: mk(
      'Ушачи, Витебская область, Беларусь', 'Ушачи',
      'Ushachi, Vitebsk Region, Belarus', 'Ushachi',
      'Ушачы, Віцебская вобласць, Беларусь', 'Ушачы',
      {
        en: {
          name: 'Black Lake and Chereomskoye Bog (Ushachi)',
          description:
            'Black Lake and the adjacent Chereomskoye bog in Ushachi are among the most scenic natural complexes of north-eastern Belarus, often called "Belarusian Switzerland". The deep glacial lake with clear water is surrounded by hills, pine forests and transitional bogs with rare plants. Ushachi is a centre of lake districts and ethnography; museums and churches are nearby. The nature monument fills the northern sector around Chashniki where few points appeared on the map.',
          tags: ['Belarus', 'Vitebsk Region', 'Ushachi', 'Lake', 'Nature', 'Nature monument', 'Bog'],
        },
        be: {
          name: 'Возера Чорнае і Чаромскае балота (Ушачы)',
          description:
            'Возера Чорнае і Чаромскае балота ў Ушачах — адзін з наймаляўнічых прыродных комплексаў паўночна-усходу Беларусі, «беларуская Швейцарыя». Глыбокае ледніковае возера атачанае лесамі і балотамі з рэдкімі відамі раслін.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Ушачы', 'Возера', 'Прырода', 'Помнік прыроды', 'Балота'],
        },
      }
    ),
  }),
  place({
    id: 'belarus_place_070',
    name: 'Свято-Успенский собор (Глубокое)',
    city: 'Глубокое',
    address: 'Свято-Успенский собор, Глубокое, Витебская область, Беларусь',
    lat: 55.1336,
    lng: 27.6836,
    display: 'XVIII–XIX вв.',
    year: 1790,
    description:
      'Свято-Успенский собор в Глубоком — барочно-классический храм на главной площади города, одного из старинных центров северо-западной Беларуси. Глубокое известно Бенедиктинскому монастырю (памятник в другой части города), еврейской истории и торговлей на пути из Полоцка. Собор с двумя башнями и богатым фасадом доминирует над окрестностью и виден из разных точек города. Включение Глубокого в маршрут замыкает кольцо 100–150 км вокруг Чашников, связывая Полоцкую землю с Браславским и Лепельским регионами.',
    tags: ['Беларусь', 'Витебская область', 'Глубокое', 'Собор', 'Барокко', 'XVIII век', 'Полоцчина'],
    i18n: mk(
      'Глубокое, Витебская область, Беларусь', 'Глубокое',
      'Glubokoe, Vitebsk Region, Belarus', 'Glubokoe',
      'Глыбокае, Віцебская вобласць, Беларусь', 'Глыбокае',
      {
        en: {
          name: 'Dormition Cathedral (Glubokoe)',
          description:
            'The Dormition Cathedral in Glubokoe is a Baroque-Classical church on the main square of a historic centre of north-western Belarus. Glubokoe is known for its Benedictine monastery, Jewish heritage and trade on routes from Polotsk. The cathedral with two towers and a rich façade dominates the town. Including Glubokoe closes a 100–150 km ring around Chashniki, linking Polotsk land with Braslav and Lepel regions.',
          tags: ['Belarus', 'Vitebsk Region', 'Glubokoe', 'Cathedral', 'Baroque', '18th century', 'Polotsk land'],
        },
        be: {
          name: 'Свята-Успенскі сабор (Глыбокае)',
          description:
            'Свята-Успенскі сабор у Глыбокім — барокава-класіцыстычны храм на галоўнай плошчы старажытнага цэнтра паўночна-заходняй Беларусі. Глыбокае вядомае бенедыкцінскім манастырам і гісторыяй гандлю з Полацка. Сабор з двумя вежамі дамінуе над горадам.',
          tags: ['Беларусь', 'Віцебская вобласць', 'Глыбокае', 'Сабор', 'Барока', 'XVIII стагоддзе', 'Полацччына'],
        },
      }
    ),
  }),
];

writeFileSync(
  new URL('../places-export-batch3.json', import.meta.url),
  JSON.stringify(places, null, 2) + '\n',
  'utf8'
);
console.log('Wrote', places.length, 'places → places-export-batch3.json');
