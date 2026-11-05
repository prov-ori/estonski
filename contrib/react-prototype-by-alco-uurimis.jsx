import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  Layers,
  PenTool,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Eye,
  BookMarked,
  RotateCcw,
  Award,
  Columns,
  Smartphone,
  FileText,
  HelpCircle,
  Volume2,
  Lightbulb,
  ArrowRight,
  SlidersHorizontal,
  Check,
  Info,
  Compass,
  GraduationCap,
  MessageSquare,
  ListChecks,
  Copy,
  RefreshCw,
  Filter
} from 'lucide-react';

// ============================================================================
// БАЗА ДАННЫХ: ЧТЕНИЕ (LUGEMINE) — АУТЕНТИЧНЫЕ ТЕКСТЫ И ЗАДАНИЯ HARNO / ERR
// ============================================================================
const READING_TASKS = [
  {
    id: 'read-1',
    level: 'A2/B1',
    type: 'matching',
    category: 'Городская среда и объявления',
    source: 'По материалам муниципальных объявлений Таллинна, Тарту и Elron',
    title: 'Teated ja linnainfo: Igapäevaelu Eestis',
    subtitle: 'Прочитайте 5 официальных объявлений и ответьте на 6 тестовых вопросов справа.',
    readingTime: '6 мин',
    glossary: [
      { est: 'asendusbuss', rus: 'замещающий автобус' },
      { est: 'kehtima', rus: 'действовать (о билете/правиле)' },
      { est: 'tööpäeviti', rus: 'по рабочим дням' },
      { est: 'viivis', rus: 'пеня / штраф за просрочку' },
      { est: 'korteriühistu', rus: 'квартирное товарищество' },
      { est: 'veekatkestus', rus: 'отключение воды' },
      { est: 'registreerimine', rus: 'регистрация' }
    ],
    paragraphs: [
      {
        id: 'p1',
        label: 'TEADE A — Elroni rongiliikluse muudatus',
        sentences: [
          { id: 's1', text: 'Seoses raudtee remonttöödega Tapa–Tartu lõigul 14.–16. novembrini asendatakse osa ronge bussidega.' },
          { id: 's2', text: 'Asendusbussid väljuvad jaamade juurest märgistatud peatuskohtadest ning nende sõiduplaan erineb tavapärasest rongiplaanist kuni 25 minuti võrra.' },
          { id: 's3', text: 'Tähelepanu: asendusbussidesse ei ole võimalik võtta jalgrattaid, välja arvatud kokkupandavad tõukerattad kotis.' },
          { id: 's4', text: 'Rongipiletid kehtivad ka bussides, kuid palume koha kindlustamiseks pileti osta eelmüügist veebilehelt.' }
        ]
      },
      {
        id: 'p2',
        label: 'TEADE B — Tallinna Keskraamatukogu teade',
        sentences: [
          { id: 's5', text: 'Alates 1. oktoobrist on Tallinna Keskraamatukogu peamaja (Estonia pst 8) avatud ka pühapäeviti kella 11.00–16.00.' },
          { id: 's6', text: 'Pühapäeviti saab laenutada ja tagastada raamatuid iseteenindusautomaadis ning kasutada teise korruse vaikset lugemissaali.' },
          { id: 's7', text: 'Arvutiklassi kasutamine ja dokumentide printimine toimub ainult esmaspäevast laupäevani.' },
          { id: 's8', text: 'Iga kuu viimasel reedel on kõik raamatukogu osakonnad korrastuspäeva tõttu suletud.' }
        ]
      },
      {
        id: 'p3',
        label: 'TEADE C — Korteriühistu "Kalamaja Kodu" info',
        sentences: [
          { id: 's9', text: 'Lugupeetud majaelanikud! Teisipäeval, 19. novembril kella 09.30–14.00 toimub meie majas plaaniline külmavee katkestus veemõõtjate vahetuse tõttu.' },
          { id: 's10', text: 'Palume esimese ja teise trepikoja elanikel tagada töömeestele ligipääs korteris asuvatele veetorudele.' },
          { id: 's11', text: 'Kui te ei saa sel ajal kodus viibida, võtke hiljemalt esmaspäeva õhtuks ühendust halduriga telefonil 555 0192.' }
        ]
      },
      {
        id: 'p4',
        label: 'TEADE D — Tartu Loodusmaja perepäev',
        sentences: [
          { id: 's12', text: 'Kutsume kõiki loodusesõpru sel laupäeval kella 10–15 Tartu Loodusmajja sügisesele perepäevale "Putukate salaelu".' },
          { id: 's13', text: 'Töötubades meisterdatakse putukahotelle, vaadatakse mikroskoobiga tiibu ning kell 12 algab giidiga tuur talveaias.' },
          { id: 's14', text: 'Osalemine on täiskasvanutele 6 eurot, koolilastele 3 eurot ja eelkooliealistele lastele täiesti tasuta.' }
        ]
      },
      {
        id: 'p5',
        label: 'TEADE E — Keelekohvik Mustamäe Kultuurikeskuses',
        sentences: [
          { id: 's15', text: 'Kas soovid harjutada eesti keelt vabas ja sõbralikus õhkkonnas ilma eksamipingeta?' },
          { id: 's16', text: 'Ootame sind igal kolmapäeval kell 17.30 Mustamäe Kultuurikeskusesse Kaja, kus vestleme teetassi taga igapäevastel teemadel.' },
          { id: 's17', text: 'Üritus on tasuta, kuid kohtade arv on piiratud (kuni 16 inimest), mistõttu on vajalik eelregistreerimine hiljemalt teisipäeval.' }
        ]
      }
    ],
    questions: [
      {
        id: 'q1',
        question: '1. Mis kehtib Tapa–Tartu asendusbusside kohta 14.–16. novembrini?',
        options: [
          'Bussid sõidavad täpselt sama graafiku järgi nagu rongid.',
          'Tavalist jalgratast ei saa asendusbussi kaasa võtta.',
          'Bussis tuleb osta uus pilet isegi siis, kui rongipilet on olemas.',
          'Bussid väljuvad ainult kesklinna bussijaamast.'
        ],
        correct: 1,
        evidenceId: 's3',
        explanation: 'В предложении 3 (Teade A) прямо указано: «asendusbussidesse ei ole võimalik võtta jalgrattaid» (в замещающие автобусы нельзя брать велосипеды).'
      },
      {
        id: 'q2',
        question: '2. Mida saab teha Tallinna Keskraamatukogu peamajas pühapäeval?',
        options: [
          'Printida dokumente ja kasutada arvutiklassi.',
          'Osaleda raamatukogu korrastuspäeval.',
          'Tagastada raamatuid automaadis ja lugeda teisel korrusel.',
          'Külastada raamatukogu kella kuueni õhtul.'
        ],
        correct: 2,
        evidenceId: 's6',
        explanation: 'По воскресеньям доступны автоматы самообслуживания (iseteenindusautomaat) и тихий читальный зал на втором этаже (s6). Компьютерный класс и печать работают только с понедельника по субботу (s7).'
      },
      {
        id: 'q3',
        question: '3. Mida peavad tegema "Kalamaja Kodu" elanikud, kes on teisipäeval tööl?',
        options: [
          'Jätma korteri võtmed postkasti.',
          'Helistama haldurile hiljemalt esmaspäeva õhtuks.',
          'Vahetama veemõõtja ise nädalavahetusel ära.',
          'Maksma trahvi veekatkestuse edasilükkamise eest.'
        ],
        correct: 1,
        evidenceId: 's11',
        explanation: 'В предложении 11 сказано: если вы не можете быть дома в это время, свяжитесь с управляющим (haldur) не позднее вечера понедельника.'
      },
      {
        id: 'q4',
        question: '4. Kui palju maksab Tartu Loodusmaja perepäeva pilet 5-aastasele lapsele?',
        options: [
          '6 eurot',
          '3 eurot',
          'Sissepääs on talle tasuta',
          'Sõltub sellest, kas ta osaleb talveaia tuuril'
        ],
        correct: 2,
        evidenceId: 's14',
        explanation: '«eelkooliealistele lastele täiesti tasuta» — для дошкольников (5 лет) участие полностью бесплатное.'
      },
      {
        id: 'q5',
        question: '5. Millal on Tallinna Keskraamatukogu kõik osakonnad täielikult suletud?',
        options: [
          'Igal pühapäeval',
          'Iga kuu viimasel reedel',
          'Iga kuu esimesel esmaspäeval',
          'Riigipühadele eelneval kolmapäeval'
        ],
        correct: 1,
        evidenceId: 's8',
        explanation: 'В предложении 8 указано: «Iga kuu viimasel reedel on kõik raamatukogu osakonnad korrastuspäeva tõttu suletud» (в последнюю пятницу каждого месяца закрыты на санитарный день).'
      },
      {
        id: 'q6',
        question: '6. Mis on kohustuslik Mustamäe keelekohvikus osalemiseks?',
        options: [
          'Vähemalt B2-taseme keeletunnistuse esitamine.',
          'Oma tee ja tassi kaasavõtmine.',
          'Registreerimine hiljemalt eelneval päeval (teisipäeval).',
          '5-eurose osalustasu maksmine kohapeal.'
        ],
        correct: 2,
        evidenceId: 's17',
        explanation: 'Мероприятие бесплатное, но так как мест всего 16, необходима предварительная регистрация не позднее вторника (s17).'
      }
    ]
  },
  {
    id: 'read-2',
    level: 'B1',
    type: 'analytical',
    category: 'Журналистика и новости (ERR стиль)',
    source: 'Адаптировано по материалам новостей городского планирования Таллинна',
    title: 'Tallinna uus trammiliin ühendab sadama ja lennujaama',
    subtitle: 'Прочитайте аналитическую заметку о развитии общественного транспорта в Таллинне и ответьте на вопросы.',
    readingTime: '8 мин',
    glossary: [
      { est: 'ühendama', rus: 'соединять' },
      { est: 'ummik (ummikud)', rus: 'дорожная пробка' },
      { est: 'jalakäija', rus: 'пешеход' },
      { est: 'kaubanduskeskus', rus: 'торговый центр' },
      { est: 'säästma', rus: 'экономить / беречь' },
      { est: 'küsitlus', rus: 'опрос' },
      { est: 'eelistama', rus: 'предпочитать' }
    ],
    paragraphs: [
      {
        id: 'p1',
        label: '1. Lõik — Uus ühendus läbi südalinna',
        sentences: [
          { id: 'r2_s1', text: 'Tallinna transpordisüsteemis on viimastel aastatel toimunud suured muutused, millest kõige olulisem on Vanasadamat ja kesklinna ühendava uue trammiliini valmimine.' },
          { id: 'r2_s2', text: 'Uus trammitee võimaldab laevaga saabuvatel turistidel ja kohalikel elanikel sõita otse A- ja D-terminalist südalinna ning sealt edasi Ülemiste suunas.' },
          { id: 'r2_s3', text: 'Linnavalitsuse hinnangul vähendab see oluliselt taksode ja sõiduautode arvu sadama piirkonnas, kus varem tekkisid laevade saabumisel pikad ummikud.' }
        ]
      },
      {
        id: 'p2',
        label: '2. Lõik — Ehitustööd ja linnaruumi uuenemine',
        sentences: [
          { id: 'r2_s4', text: 'Ehitustööd kestsid peaaegu kaks aastat ning tekitasid autojuhtidele ja kesklinna äridele ajutiselt palju peavalu.' },
          { id: 'r2_s5', text: 'Mitmed kohvikud ja väikepoed kurtsid ehituse ajal klientide vähesuse üle, kuna tänavad olid üles kaevatud ja ligipääs piiratud.' },
          { id: 'r2_s6', text: 'Samas kasutati ehitust ära selleks, et uuendada ka maa-aluseid vee- ja küttetorusid ning rajada laiemad kõnniteed ja eraldatud rattarajad.' },
          { id: 'r2_s7', text: 'Lisaks istutati trammitee äärde üle saja uue puu ja tuhandeid põõsaid, et muuta kivine linnaruum rohelisemaks.' }
        ]
      },
      {
        id: 'p3',
        label: '3. Lõik — Elanike harjumused ja tulevikuplaanid',
        sentences: [
          { id: 'r2_s8', text: 'Hiljutine Tallinna Ülikooli teadlaste küsitlus näitas, et 42% tallinlastest kasutab ühistransporti iga päev tööle või kooli jõudmiseks.' },
          { id: 'r2_s9', text: 'Siiski eelistavad paljud äärelinnade, näiteks Pirita ja Kakumäe elanikud endiselt isiklikku autot, sest ümberistumine kesklinnas võtab nende sõnul liiga kaua aega.' },
          { id: 'r2_s10', text: 'Järgmise sammuna plaanib linn tellida 23 uut madalapõhjalist trammi ning pikendada liine tulevikus ka Pelguranna ja Liivalaia tänava suunas.' }
        ]
      }
    ],
    questions: [
      {
        id: 'r2_q1',
        question: '1. Mis on uue Vanasadama trammiliini peamine eesmärk linnavalitsuse hinnangul?',
        options: [
          'Asendada kõik kesklinna bussiliinid täielikult trammidega.',
          'Vähendada autoliiklust ja ummikuid sadama piirkonnas ning luua mugav otseühendus.',
          'Muuta trammipiletid turistidele poole kallimaks.',
          'Sulgeda A- ja D-terminal sõiduautodele.'
        ],
        correct: 1,
        evidenceId: 'r2_s3',
        explanation: 'В предложении r2_s3 отмечено, что линия существенно сократит количество такси и легковых машин в районе порта, где раньше возникали пробки.'
      },
      {
        id: 'r2_q2',
        question: '2. Kuidas mõjutas trammitee ehitus kesklinna kohvikuid ja väikepoode ehituse ajal?',
        options: [
          'Nende käive kasvas tänu ehitustöölistele.',
          'Kõik kesklinna poed said linnalt tasuta üüripinna.',
          'Kliendid külastasid neid vähem, sest tänavad olid üles kaevatud.',
          'Poed olid kohustatud töötama ainult öösiti.'
        ],
        correct: 2,
        evidenceId: 'r2_s5',
        explanation: 'Кафе и небольшие магазины жаловались на нехватку клиентов («kurtsid klientide vähesuse üle»), так как улицы были перекопаны и доступ ограничен.'
      },
      {
        id: 'r2_q3',
        question: '3. Mida tehti ehitustööde käigus lisaks rööbaste paigaldamisele?',
        options: [
          'Ehitati uus maa-alune parkla 500 autole.',
          'Vahetati välja maa-alused torud, ehitati rattarajad ja istutati puid.',
          'Lammutati vana raudteejaama hoone.',
          'Kaotati kõik foorid kesklinna ristmikel.'
        ],
        correct: 1,
        evidenceId: 'r2_s6',
        explanation: 'В предложениях r2_s6 и r2_s7 говорится об обновлении подземных труб, создании велодорожек и посадке более 100 деревьев.'
      },
      {
        id: 'r2_q4',
        question: '4. Miks eelistavad paljud Pirita ja Kakumäe elanikud ikka veel sõiduautot?',
        options: [
          'Sest neil ei ole õigust tasuta ühistranspordile.',
          'Sest ümberistumine kesklinnas võtab nende arvates liiga palju aega.',
          'Sest trammid ei sõida nädalavahetustel.',
          'Sest parkimine südalinnas on muutunud tasuta teenuseks.'
        ],
        correct: 1,
        evidenceId: 'r2_s9',
        explanation: 'Жители пригородов считают, что пересадка в центре отнимает слишком много времени («ümberistumine kesklinnas võtab nende sõnul liiga kaua aega»).'
      },
      {
        id: 'r2_q5',
        question: '5. Milline väide on teksti põhjal ÕIGE?',
        options: [
          '42% tallinlastest ei ole kunagi trammiga sõitnud.',
          'Trammitee ehitus kestis kõigest kolm kuud.',
          'Linn kavatseb osta 23 uut madalapõhjalist trammi.',
          'Pelguranna trammiliin valmis juba eelmisel aastal.'
        ],
        correct: 2,
        evidenceId: 'r2_s10',
        explanation: 'В последнем предложении (r2_s10) указано, что город планирует заказать 23 новых низкопольных трамвая («23 uut madalapõhjalist trammi»).'
      },
      {
        id: 'r2_q6',
        question: '6. Mida tähendab väljend "tekitasid palju peavalu" 2. lõigus?',
        options: [
          'Ehitusmüra põhjustas inimestel meditsiinilist migreeni.',
          'Tööd tõid kaasa palju muret, ebamugavusi ja probleeme.',
          'Autojuhtidel paluti kanda kaitsekiivreid.',
          'Linnavalitsus jagas apteekides tasuta ravimeid.'
        ],
        correct: 1,
        evidenceId: 'r2_s4',
        explanation: 'Идиома «peavalu tekitama» означает «доставлять головную боль / создавать много хлопот и неудобств».'
      }
    ]
  },
  {
    id: 'read-3',
    level: 'B2',
    type: 'analytical',
    category: 'Общество, карьера и ИТ',
    source: 'Аналитический лонгрид в стиле Eesti Ekspress / DigiPRO',
    title: 'Kaugtöö võlu ja valu: kas kodukontor Hiiumaal päästab läbipõlemisest?',
    subtitle: 'Глубокий текст уровня B2 о гибридной работе в эстонском ИТ-секторе, переезде за город и психологических вызовах.',
    readingTime: '10 мин',
    glossary: [
      { est: 'kaugtöö', rus: 'удалённая работа' },
      { est: 'läbipõlemine', rus: 'профессиональное выгорание' },
      { est: 'paindlikkus', rus: 'гибкость' },
      { est: 'ühtekuuluvustunne', rus: 'чувство сопричастности / командный дух' },
      { est: 'hübriidtöö', rus: 'гибридная работа' },
      { est: 'tööviljakus', rus: 'производительность труда' },
      { est: 'piiride hägustumine', rus: 'размывание границ' }
    ],
    paragraphs: [
      {
        id: 'p1',
        label: '1. Lõik — Suur kolimine linnast maale',
        sentences: [
          { id: 'r3_s1', text: 'Veel viis aastat tagasi peeti Eesti tehnoloogiasektoris enesestmõistetavaks, et edukas tarkvaraarendaja või disainer töötab Tallinna või Tartu klaasist büroohoones, kus on tasuta puuviljad ja lauatenniselaud.' },
          { id: 'r3_s2', text: 'Tänaseks on pilt kardinaalselt muutunud: üha rohkem spetsialiste on vahetanud pealinna korteri suvekodu vastu Hiiumaal, Viljandimaal või Lõuna-Eesti kuppelmaastikul.' },
          { id: 'r3_s3', text: 'Kiire internetiühendus ja pilvepõhised tööriistad võimaldavad osaleda rahvusvahelistel koosolekutel kasvõi metsatalu terrassilt.' }
        ]
      },
      {
        id: 'p2',
        label: '2. Lõik — Nähtamatu ületunnitöö ja üksildus',
        sentences: [
          { id: 'r3_s4', text: 'Esmapilgul tundub selline vabadus ideaalse lahendusena tööstressi vastu, kuid tööpsühholoogid juhivad tähelepanu varjatud ohtudele.' },
          { id: 'r3_s5', text: 'Peamiseks probleemiks on töö- ja eraelu piiride hägustumine: kui sülearvuti asub söögilaual, kipuvad tööpäevad venima hilisõhtuni ning inimene tunneb süümepiinu iga kord, kui ta koheselt sõnumile ei vasta.' },
          { id: 'r3_s6', text: 'Lisaks kannatab meeskonna ühtekuuluvustunne, sest spontaansed vestlused kohvimasina juures, kus sünnivad sageli kõige loomingulisemad ideed, jäävad videokõnedes pidamata.' },
          { id: 'r3_s7', text: 'Eriti keeruline on olukord noortel, äsja ülikooli lõpetanud töötajatel, kes vajavad kogenud kolleegide vahetut juhendamist ja sotsiaalset võrgustikku.' }
        ]
      },
      {
        id: 'p3',
        label: '3. Lõik — Kuldne kesktee: teadlik hübriidmudel',
        sentences: [
          { id: 'r3_s8', text: 'Seetõttu on paljud Eesti idufirmad ja pangad loobunud täielikust kaugtööst ning kehtestanud teadliku hübriidmudeli, kus kontoris käiakse kaks-kolm korda nädalas.' },
          { id: 'r3_s9', text: 'Kontoripäevad on mõeldud eelkõige ajurünnakuteks, tiimiüritusteks ja keerukamate probleemide lahendamiseks, samas kui süvenemist nõudvaid ülesandeid tehakse rahulikult kodus.' },
          { id: 'r3_s10', text: 'Uuringud kinnitavad, et mitte asukoht ise ei määra töötaja vaimset tervist, vaid oskus ennast juhtida ja tööandja selged kokkulepped tööaja lõppemise kohta.' }
        ]
      }
    ],
    questions: [
      {
        id: 'r3_q1',
        question: '1. Kuidas on Eesti IT-töötajate eelistused viimase viie aasta jooksul muutunud?',
        options: [
          'Enamik arendajaid on kolinud välismaale, sest Eestis puudub kiire internet.',
          'Klaasist linnakontorite asemel valitakse üha sagedamini elu- ja töökoht väljaspool suuri linnu.',
          'Ettevõtted on keelanud sülearvutite kasutamise väljaspool kontorit.',
          'Tasuta puuviljad on asendatud kohustusliku sporditreeninguga.'
        ],
        correct: 1,
        evidenceId: 'r3_s2',
        explanation: 'В предложении r3_s2 описывается переход от столичных офисов к работе из домов на Хийумаа, в Вильяндимаа и Южной Эстонии.'
      },
      {
        id: 'r3_q2',
        question: '2. Mida peavad tööpsühholoogid kodukontori üheks suurimaks ohuks?',
        options: [
          'Töötajad magavad lõunani ega täida oma tööülesandeid.',
          'Töö- ja puhkeaja piirid kaovad ning tööpäevad venivad märkamatult pikemaks.',
          'Maapiirkondades on elektrihind liiga kõrge.',
          'Videokõned kulutavad liiga palju arvuti akut.'
        ],
        correct: 1,
        evidenceId: 'r3_s5',
        explanation: '«töö- ja eraelu piiride hägustumine» — размывание границ между работой и личной жизнью, когда рабочий день растягивается до позднего вечера.'
      },
      {
        id: 'r3_q3',
        question: '3. Kelle jaoks on täielik kaugtöö teksti põhjal kõige raskem?',
        options: [
          'Kogenud tippjuhtidele, kes armastavad koosolekuid.',
          'Karjääri alustavatele noortele spetsialistidele, kes vajavad mentorlust.',
          'Pereinimestele, kellel on suur aed.',
          'Klienditeenindajatele, kes töötavad telefoni teel.'
        ],
        correct: 1,
        evidenceId: 'r3_s7',
        explanation: 'В предложении r3_s7 подчёркнуто, что особенно трудно молодым выпускникам вузов, нуждающимся в непосредственном наставничестве («vahetut juhendamist»).'
      },
      {
        id: 'r3_q4',
        question: '4. Kuidas jagatakse tööülesandeid teadliku hübriidmudeli puhul?',
        options: [
          'Esmaspäevast reedeni töötatakse kontoris ja nädalavahetusel kodus.',
          'Koostöö ja ajurünnakud tehakse kontoris, keskendumist nõudev töö aga kodus.',
          'Kodus tehakse ainult videokõnesid ja kontoris kirjutatakse e-kirju.',
          'Iga töötaja valib kord aastas, kas ta töötab ainult kodus või ainult kontoris.'
        ],
        correct: 1,
        evidenceId: 'r3_s9',
        explanation: 'Офисные дни предназначены для мозговых штурмов и командной работы («ajurünnakuteks»), а задачи, требующие глубокой концентрации («süvenemist nõudvaid ülesandeid»), выполняются дома.'
      },
      {
        id: 'r3_q5',
        question: '5. Mis määrab uuringute järgi kõige enam töötaja vaimset heaolu?',
        options: [
          'See, kui kaugel merest või metsast inimene elab.',
          'Enesejuhtimise oskus ja selged kokkulepped tööaja piiride osas.',
          'Kontorihoone korruste arv ja kohvimasina kvaliteet.',
          'Kohustuslik osalemine igapäevastel videokoosolekutel.'
        ],
        correct: 1,
        evidenceId: 'r3_s10',
        explanation: 'В финальном предложении (r3_s10) резюмируется: решающую роль играет не локация, а навык самоорганизации («oskus ennast juhtida») и чёткие договорённости о конце рабочего дня.'
      }
    ]
  },
  {
    id: 'read-4',
    level: 'B2/C1',
    type: 'gap-sentences',
    category: 'Восстановление текста (Lünktekst)',
    source: 'Формат госэкзамена B2/C1: вставьте пропущенные предложения в текст',
    title: 'Rohepööre ja Eesti energiatulevik: kuidas saavutada tasakaal?',
    subtitle: 'В тексте пропущены 5 предложений [Lünk 1] – [Lünk 5]. Подберите для каждого пропуска подходящее по смыслу и грамматике предложение из списка (одно предложение лишнее!). Выбранные предложения сразу отображаются в тексте слева.',
    readingTime: '10 мин',
    glossary: [
      { est: 'taastuvenergia', rus: 'возобновляемая энергия' },
      { est: 'põlevkivi', rus: 'горючий сланец' },
      { est: 'tuulepark', rus: 'ветропарк' },
      { est: 'salvestamine', rus: 'накопление / хранение (энергии)' },
      { est: 'varustuskindlus', rus: 'надёжность снабжения' },
      { est: 'vastuseis', rus: 'противодействие / сопротивление' }
    ],
    sentencePool: [
      { id: 'A', text: 'A. Seetõttu on teadlased ja insenerid hakanud üha tõsisemalt otsima lahendusi energia salvestamiseks suurte akupankade ja vesisalvestite abil.' },
      { id: 'B', text: 'B. Paljud kohalikud kogukonnad kardavad aga, et kõrged tuulikud rikuvad harjumuspärase maastikuvaate ja tekitavad häirivat müra.' },
      { id: 'C', text: 'C. See ajalooline otsus tähendab, et senine sõltuvus Ida-Virumaa põlevkivist peab asenduma keskkonnasõbralikumate alternatiividega.' },
      { id: 'D', text: 'D. Samal ajal saavad ka tavalised korteriühistud ja eramajade omanikud riikliku toetuse abil oma majasid soojapidavamaks renoveerida.' },
      { id: 'E', text: 'E. Kõige odavam on importida kogu vajaminev elekter Lõuna-Euroopa riikidest ilma kohalikku võrku arendamata.' },
      { id: 'F', text: 'F. Paraku sõltub nii päikese- kui ka tuuleenergia otseselt ilmastikuoludest, mis võivad meie laiuskraadil olla vägagi heitlikud.' }
    ],
    paragraphs: [
      {
        id: 'p1',
        label: '1. Lõik — Põlevkiviajastust uude ajastusse',
        sentences: [
          { id: 'r4_s1', text: 'Eesti on võtnud eesmärgiks minna lähikümnendil üle täielikult taastuvatest allikatest toodetud elektrienergiale.' },
          { id: 'r4_gap1', isGap: true, gapNumber: 1, text: '[LÜNK 1]' },
          { id: 'r4_s2', text: 'Kuigi üleminek on kliimaeesmärkide täitmiseks möödapääsmatu, nõuab see miljardite eurode suuruseid investeeringuid ja ühiskondlikku kokkulepet.' }
        ]
      },
      {
        id: 'p2',
        label: '2. Lõik — Ilmastiku kapriisid ja salvestusvajadus',
        sentences: [
          { id: 'r4_s3', text: 'Viimastel aastatel on Eestis rajatud tuhandeid päikesepaneele ja planeerimisel on mitmed suured meretuulepargid Läänemeres.' },
          { id: 'r4_gap2', isGap: true, gapNumber: 2, text: '[LÜNK 2]' },
          { id: 'r4_s4', text: 'Talvisel pakasepäeval, kui päike ei paista ja tuul on vaibunud, on elektritarbimine ometi haripunktis.' },
          { id: 'r4_gap3', isGap: true, gapNumber: 3, text: '[LÜNK 3]' }
        ]
      },
      {
        id: 'p3',
        label: '3. Lõik — Kogukondade kaasamine ja energiasääst',
        sentences: [
          { id: 'r4_s5', text: 'Lisaks tehnoloogilistele väljakutsetele põrkub uute tuuleparkide ehitamine sageli elanike vastuseisule.' },
          { id: 'r4_gap4', isGap: true, gapNumber: 4, text: '[LÜNK 4]' },
          { id: 'r4_s6', text: 'Selle mure leevendamiseks on riik loonud nn tuulikutasu mehhanismi, mis toob tuulepargi läheduses elavatele inimestele ja omavalitsustele otsest rahalist kasu.' },
          { id: 'r4_s7', text: 'Eksperdid rõhutavad siiski, et kõige puhtam ja odavam energia on see, mis jääb üldse tarbimata.' },
          { id: 'r4_gap5', isGap: true, gapNumber: 5, text: '[LÜNK 5]' }
        ]
      }
    ],
    questions: [
      {
        id: 'r4_q1',
        gapNumber: 1,
        question: 'Valige sobiv lause lünga [LÜNK 1] jaoks (1. lõik):',
        options: [
          'A. Seetõttu on teadlased ja insenerid hakanud...',
          'B. Paljud kohalikud kogukonnad kardavad aga...',
          'C. See ajalooline otsus tähendab, et senine sõltuvus Ida-Virumaa põlevkivist peab asenduma...',
          'D. Samal ajal saavad ka tavalised korteriühistud...',
          'E. Kõige odavam on importida kogu vajaminev elekter...',
          'F. Paraku sõltub nii päikese- kui ka tuuleenergia...'
        ],
        correct: 2, // C
        letter: 'C',
        evidenceId: 'r4_gap1',
        explanation: 'В первом предложении говорится о цели перейти на возобновляемую энергию. Предложение C («Это историческое решение означает, что прежняя зависимость от сланца Ида-Вирумаа должна смениться...») логически продолжает мысль, а следующее предложение подхватывает слово «üleminek» (переход).'
      },
      {
        id: 'r4_q2',
        gapNumber: 2,
        question: 'Valige sobiv lause lünga [LÜNK 2] jaoks (2. lõik):',
        options: [
          'A. Seetõttu on teadlased ja insenerid hakanud...',
          'B. Paljud kohalikud kogukonnad kardavad aga...',
          'C. See ajalooline otsus tähendab...',
          'D. Samal ajal saavad ka tavalised korteriühistud...',
          'E. Kõige odavam on importida...',
          'F. Paraku sõltub nii päikese- kui ka tuuleenergia otseselt ilmastikuoludest...'
        ],
        correct: 5, // F
        letter: 'F',
        evidenceId: 'r4_gap2',
        explanation: 'Перед пропуском упоминаются солнечные панели и ветропарки, а после пропуска — морозный зимний день без солнца и ветра. Связующим звеном служит F (зависимость от капризов погоды).'
      },
      {
        id: 'r4_q3',
        gapNumber: 3,
        question: 'Valige sobiv lause lünga [LÜNK 3] jaoks (2. lõigu lõpp):',
        options: [
          'A. Seetõttu on teadlased ja insenerid hakanud üha tõsisemalt otsima lahendusi energia salvestamiseks...',
          'B. Paljud kohalikud kogukonnad kardavad aga...',
          'C. See ajalooline otsus tähendab...',
          'D. Samal ajal saavad ka tavalised korteriühistud...',
          'E. Kõige odavam on importida...',
          'F. Paraku sõltub nii päikese- kui ka tuuleenergia...'
        ],
        correct: 0, // A
        letter: 'A',
        evidenceId: 'r4_gap3',
        explanation: 'Из-за пикового потребления в безветренные зимние дни учёные ищут способы накопления энергии (salvestamine) с помощью аккумуляторов и гидроаккумулирующих станций (A).'
      },
      {
        id: 'r4_q4',
        gapNumber: 4,
        question: 'Valige sobiv lause lünga [LÜNK 4] jaoks (3. lõik):',
        options: [
          'A. Seetõttu on teadlased ja insenerid hakanud...',
          'B. Paljud kohalikud kogukonnad kardavad aga, et kõrged tuulikud rikuvad harjumuspärase maastikuvaate...',
          'C. See ajalooline otsus tähendab...',
          'D. Samal ajal saavad ka tavalised korteriühistud...',
          'E. Kõige odavam on importida...',
          'F. Paraku sõltub nii päikese- kui ka tuuleenergia...'
        ],
        correct: 1, // B
        letter: 'B',
        evidenceId: 'r4_gap4',
        explanation: 'В предложении перед пропуском говорится о сопротивлении жителей (vastuseis), а после — о «смягчении этой тревоги» (selle mure leevendamiseks). Предложение B объясняет суть тревоги местных общин (шум и вид из окна).'
      },
      {
        id: 'r4_q5',
        gapNumber: 5,
        question: 'Valige sobiv lause lünga [LÜNK 5] jaoks (3. lõigu lõpp):',
        options: [
          'A. Seetõttu on teadlased ja insenerid hakanud...',
          'B. Paljud kohalikud kogukonnad kardavad aga...',
          'C. See ajalooline otsus tähendab...',
          'D. Samal ajal saavad ka tavalised korteriühistud ja eramajade omanikud riikliku toetuse abil oma majasid soojapidavamaks renoveerida.',
          'E. Kõige odavam on importida...',
          'F. Paraku sõltub nii päikese- kui ka tuuleenergia...'
        ],
        correct: 3, // D
        letter: 'D',
        evidenceId: 'r4_gap5',
        explanation: 'Перед пропуском тезис об энергосбережении («самая дешёвая энергия — та, которую не потребили»), и предложение D конкретизирует это через реновацию и утепление домов.'
      }
    ]
  }
];

// ============================================================================
// БАЗА ДАННЫХ: СКВОЗНЫЕ ИСТОРИИ С ПРОДОЛЖЕНИЕМ (JÄTKULOOD — СЕРИАЛ В 4 ЧАСТЯХ)
// ============================================================================
const STORY_EPISODES = [
  {
    id: 'ep-1',
    episodeNumber: 1,
    level: 'A2/B1',
    title: 'Osa 1: Korteri otsimine ja üürileping Kalamajas',
    subtitle: 'Мартин переезжает в Таллинн ради новой работы. В первой серии он переписывается с маклером и осматривает квартиру на улице Soo.',
    characterNote: 'Главные герои: Мартин Тамме (арендатор), Кадри Коппель (маклер по недвижимости).',
    glossary: [
      { est: 'üürileping', rus: 'договор аренды' },
      { est: 'tagatisraha', rus: 'залог / депозит' },
      { est: 'kommunaalkulud', rus: 'коммунальные платежи' },
      { est: 'vahendustasu', rus: 'комиссия маклера' },
      { est: 'panipaik', rus: 'кладовка' },
      { est: 'keskküte', rus: 'центральное отопление' }
    ],
    paragraphs: [
      {
        id: 'ep1_p1',
        label: 'Kuulutus kinnisvaraportaalis ja e-kiri maaklerile',
        sentences: [
          { id: 'ep1_s1', text: 'Üürile anda valgusküllane 2-toaline korter Põhja-Tallinnas, Soo tänaval (44 m², 2. korrus).' },
          { id: 'ep1_s2', text: 'Korter on täielikult möbleeritud: köögis on nõudepesumasin ja induktsioonpliit, elutoas lahtikäiv diivan ja töölaud.' },
          { id: 'ep1_s3', text: 'Majas on gaasiküte, mistõttu on kommunaalkulud mõistlikud: suvel umbes 75 eurot ja talvel kuni 160 eurot kuus.' },
          { id: 'ep1_s4', text: 'Korteri juurde kuulub lukustatav panipaik keldris ja kindel parkimiskoht kinnises hoovis.' },
          { id: 'ep1_s5', text: 'Üür on 620 eurot kuus. Lepingu sõlmimisel tuleb tasuda esimese kuu üür, tagatisraha ühe kuu üüri ulatuses ning maakleri vahendustasu (50% üürist).' },
          { id: 'ep1_s6', text: 'Lemmikloomad on lubatud ainult eelneval kokkuleppel korteri omanikuga.' }
        ]
      },
      {
        id: 'ep1_p2',
        label: 'Dialoog korteri vaatamisel',
        sentences: [
          { id: 'ep1_s7', text: 'Maakler Kadri: "Tere tulemast! Nagu näete, aknad avanevad sisehoovi poole, nii et tänavamüra siia peaaegu ei kosta."' },
          { id: 'ep1_s8', text: 'Martin: "Korter meeldib mulle väga. Mul on väike rahulik kass — kas omanik oleks sellega nõus?"' },
          { id: 'ep1_s9', text: 'Maakler Kadri: "Ma rääkisin omanikuga juba eile. Ta on kassiga nõus, kui lisame lepingusse punkti, et võimalikud kriimustused diivanil tuleb välja kolides hüvitada."' },
          { id: 'ep1_s10', text: 'Martin: "See on igati aus kokkulepe. Ma sooviksin sisse kolida 1. novembril."' }
        ]
      }
    ],
    questions: [
      {
        id: 'ep1_q1',
        question: '1. Kui palju raha peab Martin lepingu sõlmimisel kokku maksma (1. kuu üür + tagatisraha + vahendustasu)?',
        options: [
          '1240 eurot',
          '1550 eurot',
          '1860 eurot',
          '620 eurot'
        ],
        correct: 1,
        evidenceId: 'ep1_s5',
        explanation: 'Аренда за 1-й месяц (620 €) + залог в размере месячной аренды (620 €) + 50% комиссия маклера (310 €) = 1550 €.'
      },
      {
        id: 'ep1_q2',
        question: '2. Miks on korteris vaikne, kuigi Soo tänaval on tihe liiklus?',
        options: [
          'Korter asub viiendal korrusel.',
          'Korteri aknad avanevad sisehoovi poole.',
          'Soo tänav on autodele täielikult suletud.',
          'Seintel on spetsiaalsed stuudio helipaneelid.'
        ],
        correct: 1,
        evidenceId: 'ep1_s7',
        explanation: 'Маклер Кадри объясняет (ep1_s7): «aknad avanevad sisehoovi poole» (окна выходят во внутренний двор).'
      },
      {
        id: 'ep1_q3',
        question: '3. Mis tingimusel lubab omanik Martinil kassi korterisse võtta?',
        options: [
          'Martin peab maksma iga kuu 50 eurot kõrgemat üüri.',
          'Kass peab elama ainult rõdul.',
          'Lepingusse lisatakse punkt, et looma tekitatud kahju (nt kriimustused) tuleb hüvitada.',
          'Martin peab ostma korterisse oma mööbli.'
        ],
        correct: 2,
        evidenceId: 'ep1_s9',
        explanation: 'В предложении ep1_s9 указано условие: в договор вносится пункт о возмещении возможных царапин на диване при выезде.'
      }
    ]
  },
  {
    id: 'ep-2',
    episodeNumber: 2,
    level: 'B1',
    title: 'Osa 2 (Jätkulugu): Elukoha registreerimine ja linnaosa teenused',
    subtitle: 'Продолжение истории: Мартин получил ключи от квартиры на Soo tänav! Теперь ему нужно официально зарегистрировать место жительства в Рахвастикурегистре и оформить право на бесплатный проезд.',
    characterNote: 'События происходят через 3 дня после подписания договора из Части 1.',
    glossary: [
      { est: 'elukohateade', rus: 'извещение о месте жительства' },
      { est: 'rahvastikuregister', rus: 'регистр народонаселения' },
      { est: 'digiallkiri', rus: 'цифровая подпись' },
      { est: 'omaniku nõusolek', rus: 'согласие собственника' },
      { est: 'ühiskaart', rus: 'единая проездная карта (зелёная карточка)' }
    ],
    paragraphs: [
      {
        id: 'ep2_p1',
        label: 'Elukoha registreerimine e-rahvastikuregistris',
        sentences: [
          { id: 'ep2_s1', text: 'Pärast kastide lahtipakkimist istus Martin arvuti taha ja logis ID-kaardiga sisse portaali rahvastikuregister.ee, et registreerida oma uus aadress Põhja-Tallinnas.' },
          { id: 'ep2_s2', text: 'Kuna Martin ei ole korteri omanik, pidi ta elukohateatele lisama kehtiva üürilepingu koopia, mis tõendab tema õigust korterit kasutada.' },
          { id: 'ep2_s3', text: 'Kui üürilepingut ei oleks olnud, oleks korteri omanik pidanud taotluse portaalis oma digiallkirjaga kinnitama.' },
          { id: 'ep2_s4', text: 'Juba kahe tööpäeva pärast sai Martin e-kirja teatega, et tema elukoht on ametlikult registreeritud Tallinna linnas.' }
        ]
      },
      {
        id: 'ep2_p2',
        label: 'Kasu linnaelaniku staatusest',
        sentences: [
          { id: 'ep2_s5', text: 'Tallinna elanikuna sai Martin kohe isikustada oma rohelise Ühiskaardi, mis annab talle õiguse sõita linna bussides, trammides ja trollides ning linna piires ka Elroni rongides tasuta.' },
          { id: 'ep2_s6', text: 'Samuti valis ta perearstikeskuse oma uue kodu lähedal Telliskivi tänaval ning esitas digitaalse avalduse perearsti nimistusse registreerimiseks.' },
          { id: 'ep2_s7', text: 'Järgmisel esmaspäeval ootas teda ees esimene tööpäev uues IT-ettevõttes Ülemiste linnakus.' }
        ]
      }
    ],
    questions: [
      {
        id: 'ep2_q1',
        question: '1. Miks ei pidanud korteri omanik Martini elukohateadet eraldi digiallkirjaga kinnitama?',
        options: [
          'Sest Põhja-Tallinnas ei nõuta kunagi omaniku luba.',
          'Sest Martin lisas taotlusele kehtiva üürilepingu koopia.',
          'Sest maakler Kadri kinnitas taotluse omaniku eest.',
          'Sest Martin ostis korteri välja.'
        ],
        correct: 1,
        evidenceId: 'ep2_s2',
        explanation: 'Действующий договор аренды сам по себе подтверждает право пользования жильём, поэтому отдельное согласие собственника не потребовалось (ep2_s2, ep2_s3).'
      },
      {
        id: 'ep2_q2',
        question: '2. Kus saab Martin nüüd isikustatud Ühiskaardiga tasuta sõita?',
        options: [
          'Ainult trammis nr 1 ja 2.',
          'Kõikides Eesti maakonnaliinide bussides ja praamidel.',
          'Tallinna ühistranspordis ning Tallinna linna piires ka Elroni rongides.',
          'Tasuta sõit kehtib ainult nädalavahetustel.'
        ],
        correct: 2,
        evidenceId: 'ep2_s5',
        explanation: 'Жители Таллинна получают бесплатный проезд в городских автобусах, трамваях, троллейбусах и в поездах Elron в пределах города (ep2_s5).'
      },
      {
        id: 'ep2_q3',
        question: '3. Grammatika kontekstis: Miks on lauses "logis ID-kaardiga sisse portaali" sõna "ID-kaardiga" lõpus -ga?',
        options: [
          'See on kaasaütlev kääne (Kelle? Millega?), mis näitab vahendit (с помощью чего).',
          'See on osastav kääne (Mida?).',
          'See on ilmaütlev kääne (Milleta?).',
          'See näitab asukohta (Kus?).'
        ],
        correct: 0,
        evidenceId: 'ep2_s1',
        explanation: 'Падеж Kaasaütlev (-ga) здесь обозначает инструмент/средство действия: вошёл (с помощью чего?) с помощью ID-карты.'
      }
    ]
  },
  {
    id: 'ep-3',
    episodeNumber: 3,
    level: 'B1/B2',
    title: 'Osa 3 (Jätkulugu): Esimene töönädal Ülemistes ja kolleegide kirjad',
    subtitle: 'Продолжение истории: Мартин начал работать руководителем проекта в Юлемисте. Прочитайте рабочую переписку с командой и помогите Мартину разобраться в деталях.',
    characterNote: 'События разворачиваются на первой рабочей неделе Мартина.',
    glossary: [
      { est: 'katseaeg', rus: 'испытательный срок' },
      { est: 'tähtaeg', rus: 'срок сдачи / дедлайн' },
      { est: 'edasi lükkama', rus: 'откладывать / переносить' },
      { est: 'päevakord', rus: 'повестка дня' },
      { est: 'kokkuvõte', rus: 'резюме / итог' },
      { est: 'asendama', rus: 'заменять' }
    ],
    paragraphs: [
      {
        id: 'ep3_p1',
        label: 'Tiimijuhi Liisa e-kiri esmaspäeva hommikul',
        sentences: [
          { id: 'ep3_s1', text: 'Tere, Martin, ja veel kord tere tulemast meie meeskonda!' },
          { id: 'ep3_s2', text: 'Nagu lepingus kirjas, kestab sinu katseaeg neli kuud, mille jooksul on sinu mentoriks vanemarendaja Rasmus.' },
          { id: 'ep3_s3', text: 'Kahjuks peame homse kliendikohtumise Soome partneritega neljapäevale edasi lükkama, sest nende projektijuht jäi ootamatult haigeks.' },
          { id: 'ep3_s4', text: 'Palun vaata kolmapäeva lõunaks üle projekti ajakava ja saada mulle oma tähelepanekud e-posti teel.' },
          { id: 'ep3_s5', text: 'Muide, reedel kell 16.00 toimub meil kontori köögis väike tervitusüritus uutele töötajatele — tellime pitsat ja mängime lauamänge.' }
        ]
      },
      {
        id: 'ep3_p2',
        label: 'Martini vastus ja küsimus kontorireeglite kohta',
        sentences: [
          { id: 'ep3_s6', text: 'Tere, Liisa! Suur tänu sooja vastuvõtu eest, Rasmus on mind juba peamiste süsteemidega kurssi viinud.' },
          { id: 'ep3_s7', text: 'Neljapäevane aeg sobib mulle Soome kliendikohtumiseks suurepäraselt — jõuan dovol-t põhjalikumalt materjalidega tutvuda.' },
          { id: 'ep3_s8', text: 'Tahtsin veel täpsustada: kui ma soovin järgmisel kuul ühel päeval kodukontoris töötada, kas pean sellest eelmisel päeval teada andma ja märkima selle tiimi kalendrisse?' }
        ]
      }
    ],
    questions: [
      {
        id: 'ep3_q1',
        question: '1. Miks lükati teisipäevane kohtumine Soome partneritega neljapäevale?',
        options: [
          'Martin ei jõudnud esitlust valmis teha.',
          'Soome partnerite projektijuht haigestus ootamatult.',
          'Ülemiste kontoris oli elektrikatkestus.',
          'Rasmus läks puhkusele.'
        ],
        correct: 1,
        evidenceId: 'ep3_s3',
        explanation: 'Лийза пишет: «nende projektijuht jäi ootamatult haigeks» (их руководитель проекта неожиданно заболел).'
      },
      {
        id: 'ep3_q2',
        question: '2. Mis ajaks peab Martin projekti ajakava üle vaatama ja kommentaarid saatma?',
        options: [
          'Teisipäeva hommikuks',
          'Kolmapäeva lõunaks',
          'Neljapäeva õhtuks',
          'Reedel kell 16.00'
        ],
        correct: 1,
        evidenceId: 'ep3_s4',
        explanation: 'В предложении ep3_s4 указан точный срок: «kolmapäeva lõunaks» (к обеду среды).'
      },
      {
        id: 'ep3_q3',
        question: '3. Mida tähendab väljend "on mind süsteemidega kurssi viinud" (lauses ep3_s6)?',
        options: [
          'Rasmus saatis Martini tasulisele programmeerimiskursusele.',
          'Rasmus tutvustas Martinile süsteeme ja selgitas, kuidas kõik toimib.',
          'Rasmus kustutas Martini kasutajakonto kogemata ära.',
          'Rasmus vahetas valuutat panga kursiga.'
        ],
        correct: 1,
        evidenceId: 'ep3_s6',
        explanation: 'Устойчивое выражение «kurssi viima (millega)» означает «вводить в курс дела / ознакомить с чем-либо».'
      }
    ]
  },
  {
    id: 'ep-4',
    episodeNumber: 4,
    level: 'B2',
    title: 'Osa 4 (Finaal): Sügisene külmetus, perearst ja digiretsept',
    subtitle: 'Финал истории: в конце ноября Мартин простудился. Узнайте, как в Эстонии работают семейная медсестра (pereõde), больничный лист (haigusleht) и электронный рецепт (digiretsept).',
    characterNote: 'Заключительная серия сезона: медицина и социальные гарантии.',
    glossary: [
      { est: 'pereõde', rus: 'семейная медсестра' },
      { est: 'haigusleht (töövõimetusleht)', rus: 'больничный лист' },
      { est: 'digiretsept', rus: 'электронный (цифровой) рецепт' },
      { est: 'toimeaine', rus: 'действующее вещество' },
      { est: 'hüvitis', rus: 'компенсация / пособие' },
      { est: 'kõrvaltoime', rus: 'побочный эффект' }
    ],
    paragraphs: [
      {
        id: 'ep4_p1',
        label: 'Pöördumine perearstikeskusesse ja haiguslehe avamine',
        sentences: [
          { id: 'ep4_s1', text: 'Novembri lõpus ärkas Martin kõrge palaviku, tugeva köha ja kurguvaluga ning mõistis, et ei saa sel päeval tööle minna.' },
          { id: 'ep4_s2', text: 'Selle asemel et kohe erakorralise meditsiini osakonda (EMO) sõita, võttis ta e-perearstikeskuse kaudu ühendust oma Telliskivi perearstikeskusega.' },
          { id: 'ep4_s3', text: 'Pereõde helistas talle tunni aja jooksul tagasi, avas Tervisekassa süsteemis haiguslehe ning kutsus Martini samaks pärastlõunaks vereproovi andma.' },
          { id: 'ep4_s4', text: 'Eesti seaduste kohaselt ei maksta haiguslehe esimese kolme päeva eest hüvitist (kui tööandja ei ole otsustanud teisiti), 4.–8. päevani maksab hüvitist tööandja ning alates 9. päevast Tervisekassa.' }
        ]
      },
      {
        id: 'ep4_p2',
        label: 'Apteegis ja ravimi infoleht',
        sentences: [
          { id: 'ep4_s5', text: 'Analüüsid näitasid bakteriaalset põletikku, mistõttu kirjutas arst Martinile välja antibiootikumi digiretsepti.' },
          { id: 'ep4_s6', text: 'Apteegis esitas Martin proviisorile vaid oma ID-kaardi; proviisor pakkus talle sama toimeainega soodsamat ravimit ja selgitas tarvitamise reegleid.' },
          { id: 'ep4_s7', text: 'Ravimit tuleb võtta üks tablett iga 12 tunni järel pärast sööki koos klaasitäie veega seitsme päeva jooksul.' },
          { id: 'ep4_s8', text: 'Arst rõhutas, et kuuri ei tohi pooleli jätta isegi siis, kui enesetunne paraneb juba kolmandal päeval.' }
        ]
      }
    ],
    questions: [
      {
        id: 'ep4_q1',
        question: '1. Kuhu pöördus Martin esimesena, kui tal tekkisid külmetushaiguse sümptomid?',
        options: [
          'Ta sõitis taksoga otse haigla erakorralise meditsiini osakonda (EMO).',
          'Ta võttis e-perearstikeskuse kaudu ühendust oma perearstikeskusega.',
          'Ta kutsus kiirabi.',
          'Ta läks apteeki haiguslehte vormistama.'
        ],
        correct: 1,
        evidenceId: 'ep4_s2',
        explanation: 'При обычной простуде и температуре в Эстонии обращаются в центр семейного врача (perearstikeskus), а не в EMO (ep4_s2).'
      },
      {
        id: 'ep4_q2',
        question: '2. Kuidas makstakse Eestis tavapäraselt haigushüvitist 4. kuni 8. haiguspäevani?',
        options: [
          'Hüvitist maksab täies ulatuses apteek.',
          '4.–8. päevani maksab haigushüvitist tööandja.',
          'Hüvitist makstakse alles alates 15. päevast.',
          'Esimesed kolm nädalat maksab Tervisekassa.'
        ],
        correct: 1,
        evidenceId: 'ep4_s4',
        explanation: 'В предложении ep4_s4 подробно расписан порядок: первые 3 дня по закону не оплачиваются (если работодатель не делает бонус), с 4-го по 8-й день платит работодатель, с 9-го — Касса здоровья (Tervisekassa).'
      },
      {
        id: 'ep4_q3',
        question: '3. Mida ei tohi antibiootikumikuuri ajal kindlasti teha?',
        options: [
          'Juua tableti kõrvale vett.',
          'Valida apteegis sama toimeainega odavamat ravimit.',
          'Jätta ravikuuri pooleli, kui enesetunne kolmandal päeval paraneb.',
          'Võtta ravimit pärast sööki.'
        ],
        correct: 2,
        evidenceId: 'ep4_s8',
        explanation: 'В предложении ep4_s8 врач подчёркивает: «kuuri ei tohi pooleli jätta isegi siis, kui enesetunne paraneb» (курс нельзя бросать на полпути).'
      }
    ]
  }
];

// ============================================================================
// БАЗА ДАННЫХ: ГРАММАТИКА И СТРУКТУРА ЯЗЫКА (KEELESTRUKTUUR) — СПРАВОЧНИК СЛЕВА, ПРАКТИКА СПРАВА
// ============================================================================
const GRAMMAR_MODULES = [
  {
    id: 'gram-1',
    level: 'A2–B2',
    title: 'Rektsioon: Verbid ja käänded (Управление глаголов)',
    subtitle: 'В эстонском языке многие глаголы требуют совершенно другого падежа, чем в русском. Изучите шпаргалку слева и выполните 8 заданий справа.',
    theoryBlocks: [
      {
        id: 'th-1',
        title: '1. SEESTÜTLEV (-st) — О ком? От чего? В чём?',
        rule: 'Используется с глаголами мышления, речи, зависимости, интереса и участия:',
        examples: [
          { verb: 'huvituma millest?', est: 'Ma huvitun Eesti ajaloost.', rus: 'Я интересуюсь историей Эстонии.' },
          { verb: 'osa võtma millest?', est: 'Kas sa võtad koosolekust osa?', rus: 'Ты примешь участие в собрании?' },
          { verb: 'sõltuma millest?', est: 'Kõik sõltub ilmast.', rus: 'Всё зависит от погоды.' },
          { verb: 'aru saama millest?', est: 'Ma saan sinust väga hästi aru.', rus: 'Я тебя очень хорошо понимаю.' },
          { verb: 'loobuma millest?', est: 'Ta loobus magusast kohvist.', rus: 'Он отказался от сладкого кофе.' },
          { verb: 'puudust tundma millest?', est: 'Tunnen puudust päikesest.', rus: 'Мне не хватает солнца (скучаю по солнцу).' }
        ]
      },
      {
        id: 'th-2',
        title: '2. SISSEÜTLEV (-sse / lühike vorm) — В кого? Во что?',
        rule: 'Внимание! Глаголы отношения, веры, влюблённости, заражения и влияния требуют падежа КУДА (-sse):',
        examples: [
          { verb: 'suhtuma kellesse/millesse?', est: 'Kuidas te suhtute sellesse ettepanekusse?', rus: 'Как вы относитесь к этому предложению?' },
          { verb: 'uskuma kellesse/millesse?', est: 'Me usume sinu edusse.', rus: 'Мы верим в твой успех.' },
          { verb: 'nakatuma millesse?', est: 'Paljud nakatusid sügisel viirusesse.', rus: 'Многие заразились осенью вирусом.' },
          { verb: 'armuma kellesse?', est: 'Ta armus oma uude kolleegi.', rus: 'Он влюбился в свою новую коллегу.' },
          { verb: 'puutuma kellesse/millesse?', est: 'See küsimus ei puutu minusse.', rus: 'Этот вопрос меня не касается.' }
        ]
      },
      {
        id: 'th-3',
        title: '3. KAASAÜTLEV (-ga) — С чем? С кем?',
        rule: 'Глаголы привыкания, знакомства, согласия, учёта и справления с задачей требуют окончания -ga:',
        examples: [
          { verb: 'harjuma millega?', est: 'Olen juba pimedate sügisõhtutega harjunud.', rus: 'Я уже привык к тёмным осенним вечерам.' },
          { verb: 'tutvuma kellega/millega?', est: 'Palun tutvuge lepingu tingimustega.', rus: 'Пожалуйста, ознакомьтесь с условиями договора.' },
          { verb: 'nõustuma kellega/millega?', est: 'Ma ei nõustu selle otsusega.', rus: 'Я не согласен с этим решением.' },
          { verb: 'arvestama kellega/millega?', est: 'Tuleb arvestada teiste inimestega.', rus: 'Нужно считаться с другими людьми.' },
          { verb: 'hakkama saama millega?', est: 'Sa saad selle ülesandega kindlasti hakkama!', rus: 'Ты точно справишься с этим заданием!' }
        ]
      },
      {
        id: 'th-4',
        title: '4. ALALEÜTLEV (-le) & OSASTAV (keda/mida)',
        rule: 'Коварные глаголы, где русский и эстонский падежи расходятся:',
        examples: [
          { verb: 'vastama millele? (на вопрос -> вопросу)', est: 'Palun vastake minu kirjale.', rus: 'Пожалуйста, ответьте на моё письмо.' },
          { verb: 'keskenduma millele?', est: 'Me peame keskenduma kvaliteedile.', rus: 'Мы должны сосредоточиться на качестве.' },
          { verb: 'segama keda/mida? (кому -> кого)', est: 'Vabandust, kas ma segan sind?', rus: 'Извини, я тебе мешаю?' },
          { verb: 'aitama keda?', est: 'Kas sa saad mind aidata?', rus: 'Ты можешь мне помочь?' },
          { verb: 'õnnitlema keda?', est: 'Õnnitleme sind sünnipäeva puhul!', rus: 'Поздравляем тебя с днём рождения!' }
        ]
      }
    ],
    questions: [
      {
        id: 'g1_q1',
        question: '1. Kas te jõudsite juba uue töökorralduse___ tutvuda?',
        options: ['uue töökorraldusega', 'uuest töökorraldusest', 'uuele töökorraldusele', 'uut töökorraldust'],
        correct: 0,
        evidenceId: 'th-3',
        explanation: 'Глагол «tutvuma» (знакомиться / ознакомиться) всегда требует падежа Kaasaütlev (-ga): tutvuma uue töökorraldusega.'
      },
      {
        id: 'g1_q2',
        question: '2. Kahjuks ei saanud pooled töötajad eilsest koolituse___ osa võtta.',
        options: ['koolitusel', 'koolitusest', 'koolitusega', 'koolitusele'],
        correct: 1,
        evidenceId: 'th-1',
        explanation: 'Выражение «osa võtma» (принимать участие в чём-л.) управляет падежом Seestütlev (-st): koolitusest osa võtta.'
      },
      {
        id: 'g1_q3',
        question: '3. Kuidas teie ettevõtte juhtkond suhtub neljapäevasesse töönädala___?',
        options: ['töönädalale', 'töönädalast', 'töönädalasse', 'töönädalaga'],
        correct: 2,
        evidenceId: 'th-2',
        explanation: 'Глагол «suhtuma» (относиться к чему-л.) требует падежа Sisseütlev (-sse): neljapäevasesse töönädalasse.'
      },
      {
        id: 'g1_q4',
        question: '4. Vabandage, et ma ___ segan, aga mul on üks kiire küsimus.',
        options: ['teile', 'teid', 'teiega', 'teist'],
        correct: 1,
        evidenceId: 'th-4',
        explanation: 'Глагол «segama» (мешать) в эстонском переходный и требует падежа Osastav (кого? что?): segan teid (а не teile!).'
      },
      {
        id: 'g1_q5',
        question: '5. Alguses oli raske, kuid nüüd olen ma juba varajase ärkamise___ täiesti harjunud.',
        options: ['varajase ärkamisega', 'varajasele ärkamisele', 'varajasest ärkamisest', 'varajast ärkamist'],
        correct: 0,
        evidenceId: 'th-3',
        explanation: 'Глагол «harjuma» (привыкать к чему-л.) требует окончания -ga: harjunud varajase ärkamisega.'
      },
      {
        id: 'g1_q6',
        question: '6. Ma ei saanud tema viimasest lause___ kahjuks üldse aru.',
        options: ['lauset', 'lausele', 'lausest', 'lausega'],
        correct: 2,
        evidenceId: 'th-1',
        explanation: '«aru saama» (понимать что-либо / кого-либо) управляет падежом Seestütlev (-st): ei saanud lausest aru.'
      },
      {
        id: 'g1_q7',
        question: '7. Palun vastake kliendi päringu___ hiljemalt homseks.',
        options: ['päringusse', 'päringule', 'päringut', 'päringuga'],
        correct: 1,
        evidenceId: 'th-4',
        explanation: '«vastama» (отвечать на что-л.) требует падежа Alaleütlev (-le): vastake päringule.'
      },
      {
        id: 'g1_q8',
        question: '8. Projekti lõpptulemus sõltub suuresti kogu meeskonna koostöö___.',
        options: ['koostööst', 'koostööle', 'koostööga', 'koostöösse'],
        correct: 0,
        evidenceId: 'th-1',
        explanation: '«sõltuma» (зависеть от чего-л.) требует падежа Seestütlev (-st): sõltub koostööst.'
      }
    ]
  },
  {
    id: 'gram-2',
    level: 'B1–C1',
    title: 'Sihitis: Omastav, Osastav või Nimetav? (Выбор падежа прямого дополнения)',
    subtitle: 'Одна из самых важных тем на экзаменах B1 и B2: когда дополнение ставится в генитив (Omastav), когда в партитив (Osastav), а когда в именительный (Nimetav).',
    theoryBlocks: [
      {
        id: 'th2-1',
        title: '1. ПРАВИЛО ОТРИЦАНИЯ (Eitus = ALATI OSASTAV!)',
        rule: 'Если глагол стоит в отрицательной форме (ei ... / ära ...), прямое дополнение ВСЕГДА стоит в падеже Osastav (3-я форма слова), даже если речь идёт о целом предмете:',
        examples: [
          { verb: 'Jaatus vs Eitus', est: 'Ma ostsin uue auto (Omastav) -> Ma EI ostnud uut autot (Osastav).', rus: 'Я купил новую машину -> Я НЕ купил новую машину.' },
          { verb: 'Käskiv kõneviis', est: 'Ava aken! (Nimetav) -> Ära ava akent! (Osastav).', rus: 'Открой окно! -> Не открывай окно!' }
        ]
      },
      {
        id: 'th2-2',
        title: '2. ПРОЦЕСС vs РЕЗУЛЬТАТ (Tegevus pooleli vs Lõpetatud tegevus)',
        rule: 'Если действие незавершённое, длится прямо сейчас или направлено на часть объекта — выбираем OSASTAV. Если действие доведено до конца и объект целый (в единственном числе) — выбираем OMASTAV:',
        examples: [
          { verb: 'Процесс (Osastav)', est: 'Ma loen praegu huvitavat raamatut.', rus: 'Я сейчас читаю (в процессе) интересную книгу.' },
          { verb: 'Результат (Omastav)', est: 'Ma lugesin selle raamatu läbi.', rus: 'Я прочитал (до конца!) эту книгу.' },
          { verb: 'Результат в будущем', est: 'Ma saadan sulle homme lepingu.', rus: 'Я пришлю (результативно) тебе завтра договор.' }
        ]
      },
      {
        id: 'th2-3',
        title: '3. ПОВЕЛИТЕЛЬНОЕ НАКЛОНЕНИЕ и -DA ИНФИНИТИВ (Nimetav!)',
        rule: 'В утвердительном повелительном наклонении (Võta! Loe!) и в конструкциях "On vaja / Tuleb + -da инфинитив" целый объект в ед. числе ставится в ИМЕНИТЕЛЬНЫЙ падеж (Nimetav, 1-я форма):',
        examples: [
          { verb: 'Käsk (Повелительное)', est: 'Pane uks kinni ja võta võti kaasa!', rus: 'Закрой дверь и возьми ключ с собой!' },
          { verb: 'Tuleb / On vaja teha', est: 'Enne reisi tuleb osta rongipilet.', rus: 'Перед поездкой нужно купить билет на поезд.' }
        ]
      },
      {
        id: 'th2-4',
        title: '4. ГЛАГОЛЫ ЧУВСТВ И ВОСПРИЯТИЯ (Tundeverbid = Osastav)',
        rule: 'Глаголы armastama (любить), ootama (ждать), otsima (искать), kartma (бояться), vaatama (смотреть), kuulama (слушать) почти всегда требуют OSASTAV:',
        examples: [
          { verb: 'ootama / otsima', est: 'Ma ootan bussi ja otsin vaba istekohta.', rus: 'Я жду автобус и ищу свободное место.' }
        ]
      }
    ],
    questions: [
      {
        id: 'g2_q1',
        question: '1. Ma kirjutasin eile õhtul aruande lõpuks valmis ja saatsin ___ juhatajale ära.',
        options: ['seda aruannet (Osastav)', 'selle aruande (Omastav)', 'see aruanne (Nimetav)', 'selles aruandes'],
        correct: 1,
        evidenceId: 'th2-2',
        explanation: 'Действие полностью завершено (saatsin ära — отправил), предложение утвердительное, поэтому целый объект в ед. ч. ставится в Omastav: selle aruande.'
      },
      {
        id: 'g2_q2',
        question: '2. Kahjuks ei leidnud ma oma postkastist ___ .',
        options: ['tellitud ajakiri (Nimetav)', 'tellitud ajakirja (Omastav)', 'tellitud ajakirja (Osastav — 3. välde)', 'tellitud ajakirjale'],
        correct: 2,
        evidenceId: 'th2-1',
        explanation: 'При отрицании («ei leidnud») дополнение всегда стоит в падеже Osastav! Для проверочного местоимения: ei leidnud SEDA tellitud ajakirja.'
      },
      {
        id: 'g2_q3',
        question: '3. Palun pane toast lahkudes ___ kinni!',
        options: ['aken (Nimetav)', 'akna (Omastav)', 'akent (Osastav)', 'aknale'],
        correct: 0,
        evidenceId: 'th2-3',
        explanation: 'Утвердительное повелительное наклонение (pane kinni — закрой целиком) требует 1-й формы слова (Nimetav): pane aken kinni!'
      },
      {
        id: 'g2_q4',
        question: '4. Ära unusta enne koosolekut ___ välja printida, aga ära ava veel ___!',
        options: [
          'päevakorda ... ümbrik',
          'päevakord ... ümbrikku (Osastav)',
          'päevakorra ... ümbriku',
          'päevakorrale ... ümbrikust'
        ],
        correct: 1,
        evidenceId: 'th2-1',
        explanation: 'Во второй части отрицательный приказ «ära ava» (не открывай) строго требует Osastav: ümbrikku.'
      },
      {
        id: 'g2_q5',
        question: '5. Me ootasime vihma käes ___ peaaegu kakskümmend minutit.',
        options: ['järgmine tramm (Nimetav)', 'järgmise trammi (Omastav)', 'järgmist trammi (Osastav)', 'järgmisel trammil'],
        correct: 2,
        evidenceId: 'th2-4',
        explanation: 'Глагол «ootama» (ждать) обозначает длящийся процесс и всегда управляет падежом Osastav: ootasime järgmist trammi.'
      },
      {
        id: 'g2_q6',
        question: '6. Teil tuleb enne reedet esitada maksuametile ___ .',
        options: ['uus taotlus (Nimetav)', 'uue taotluse (Omastav)', 'uut taotlust (Osastav)', 'uuele taotlusele'],
        correct: 0,
        evidenceId: 'th2-3',
        explanation: 'В безличной конструкции «tuleb esitada» (нужно подать — результативно) объект в единственном числе ставится в Nimetav: uus taotlus.'
      }
    ]
  },
  {
    id: 'gram-3',
    level: 'A2–B2',
    title: '-MA või -DA tegevusnimi? (Два инфинитива в эстонском языке)',
    subtitle: 'Чёткая система выбора между -ma и -da инфинитивами. Используйте интерактивную таблицу слева при решении теста.',
    theoryBlocks: [
      {
        id: 'th3-1',
        title: '1. КОГДА ВСЕГДА ВЫБИРАЕМ -MA ИНФИНИТИВ?',
        rule: 'Инфинитив на -ma показывает движение к действию, обязанность или начало действия:',
        examples: [
          { verb: 'peab / pidi (должен)', est: 'Ma pean täna kauem töötama.', rus: 'Я должен сегодня дольше работать.' },
          { verb: 'hakkama / asuma (начинать)', est: 'Hakkame kohe eesti keelt õppima!', rus: 'Начнём сразу учить эстонский язык!' },
          { verb: 'minema / tulema / sõitma (движение)', est: 'Lähen kööki kohvi keetma.', rus: 'Иду на кухню варить кофе.' },
          { verb: 'õppima / õpetama / harjuma', est: 'Laps õpib ujuma.', rus: 'Ребёнок учится плавать.' },
          { verb: 'kutsuma / jätma / jääma', est: 'Ta jäi koju puhkama.', rus: 'Он остался дома отдыхать.' }
        ]
      },
      {
        id: 'th3-2',
        title: '2. КОГДА ВСЕГДА ВЫБИРАЕМ -DA ИНФИНИТИВ?',
        rule: 'Инфинитив на -da (-ta / -a) используется после модальных глаголов возможности, желания, умения, разрешения и в конструкциях оценки:',
        examples: [
          { verb: 'saama / võima / tohtima (мочь / сметь)', est: 'Kas ma võin akna avada?', rus: 'Могу ли я открыть окно?' },
          { verb: 'tahtma / soovima / püüdma (хотеть / стараться)', est: 'Soovin broneerida laua kahele.', rus: 'Желаю забронировать столик на двоих.' },
          { verb: 'oskama / suutma (уметь / быть в силах)', est: 'Ta oskab suurepäraselt malet mängida.', rus: 'Он отлично умеет играть в шахматы.' },
          { verb: 'paluma / lubama / käskima', est: 'Lubage mul selgitada!', rus: 'Позвольте мне объяснить!' },
          { verb: 'on vaja / tuleb / on tore / on raske', est: 'Siin on väga mõnus jalutada.', rus: 'Здесь очень приятно гулять.' }
        ]
      }
    ],
    questions: [
      {
        id: 'g3_q1',
        question: '1. Kahjuks pean ma täna õhtul lennujaama külalisi vastu ___ .',
        options: ['võtma (-ma)', 'võtta (-da)', 'võtmas', 'võtnud'],
        correct: 0,
        evidenceId: 'th3-1',
        explanation: 'Глагол «pidama» (pean — я должен) всегда требует -ma инфинитива: pean vastu võtma.'
      },
      {
        id: 'g3_q2',
        question: '2. Kas te saaksite mind selle raske kasti tõstmisel ___ ?',
        options: ['aitama (-ma)', 'aidata (-da)', 'aitamas', 'aidanud'],
        correct: 1,
        evidenceId: 'th3-2',
        explanation: 'После глагола «saama» (saaksite — могли бы вы) всегда используется -da инфинитив: saaksite aidata.'
      },
      {
        id: 'g3_q3',
        question: '3. Pärast ülikooli lõpetamist asus ta ___ kohalikus haiglas.',
        options: ['töötama (-ma)', 'töötada (-da)', 'töötamas', 'töötanud'],
        correct: 0,
        evidenceId: 'th3-1',
        explanation: 'Глагол «asuma» (приступать к чему-л.) наравне с «hakkama» требует -ma инфинитива: asus töötama.'
      },
      {
        id: 'g3_q4',
        question: '4. Vanalinna kitsastel tänavatel on talvel üsna keeruline autoga ___ .',
        options: ['parkima (-ma)', 'parkida (-da)', 'parkimas', 'pargitud'],
        correct: 1,
        evidenceId: 'th3-2',
        explanation: 'В безличных оценочных конструкциях «on keeruline / on lihtne / on vaja» используется -da инфинитив: on keeruline parkida.'
      },
      {
        id: 'g3_q5',
        question: '5. Sõbrad kutsusid meid nädalavahetusel Pärnusse kontserdile ___ .',
        options: ['sõitma (-ma)', 'sõita (-da)', 'sõitmas', 'sõites'],
        correct: 0,
        evidenceId: 'th3-1',
        explanation: 'Глагол «kutsuma» (приглашать/звать делать что-то) всегда требует -ma инфинитива: kutsusid sõitma.'
      },
      {
        id: 'g3_q6',
        question: '6. Ma püüdsin talle olukorda rahulikult ___ , kuid ta ei kuulanud.',
        options: ['selgitama (-ma)', 'selgitada (-da)', 'selgitamas', 'selgitanud'],
        correct: 1,
        evidenceId: 'th3-2',
        explanation: 'Глагол «püüdma» (стараться / пытаться) требует -da инфинитива: püüdsin selgitada.'
      }
    ]
  }
];

// ============================================================================
// БАЗА ДАННЫХ: ПИСЬМО (KIRJUTAMINE — ТРЕНАЖЁР ГОСЭКЗАМЕНА B1 И B2)
// ============================================================================
const WRITING_PROMPTS = [
  {
    id: 'write-b1',
    level: 'B1',
    type: 'Poolametlik kiri / Avaldus (Полуофициальное письмо)',
    minWords: 100,
    maxWords: 150,
    title: 'Kiri korteriühistu juhatusele: jalgrattamaja ja hoovi korrastamine',
    promptEst: 'Te elate kortermajas ning olete märganud, et trepikodades hoitakse palju jalgrattaid ja lapsevankreid, mis takistavad liikumist. Kirjutage e-kiri oma korteriühistu juhatusele.',
    promptRus: 'Вы живёте в многоквартирном доме и заметили, что в подъездах хранится много велосипедов и детских колясок, которые мешают проходу. Напишите электронное письмо правлению вашего квартирного товарищества.',
    bulletPoints: [
      'Kirjeldage probleemi täpsemalt (miks praegune olukord on ohtlik või ebamugav).',
      'Tehke ettepanek ehitada hoovi lukustatav jalgrattamaja või varjualune.',
      'Põhjendage, kuidas see tõstab maja väärtust ja elanike turvalisust.',
      'Uurige, millal toimub järgmine üldkoosolek, et teemat arutada.'
    ],
    phrases: [
      { label: 'Приветствие (Офиц.)', text: 'Lugupeetud korteriühistu juhatus!\n\n' },
      { label: 'Цель письма', text: 'Pöördun Teie poole seoses probleemiga, mis puudutab meie maja trepikodade turvalisust ja heakorda. ' },
      { label: 'Описание проблемы', text: 'Viimasel ajal on teise ja kolmanda korruse vahekäikudesse kogunenud palju jalgrattaid, mis takistavad igapäevast liikumist. ' },
      { label: 'Предложение решения', text: 'Soovin teha ettepaneku rajada meie sisehoovi lukustatav jalgrattamaja. ' },
      { label: 'Аргументация', text: 'See lahendus muudaks trepikojad puhtamaks ning kaitseks elanike vara varguste ja vihma eest. ' },
      { label: 'Вопрос о собрании', text: 'Palun andke teada, kas seda punkti oleks võimalik lisada järgmise üldkoosoleku päevakorda.\n\n' },
      { label: 'Подпись', text: 'Lugupidamisega\n[Teie Nimi], korter 14' }
    ],
    sampleAnswer: `Lugupeetud korteriühistu juhatus!

Pöördun Teie poole seoses murega, mis puudutab meie esimest ja teist trepikoda. Viimastel kuudel on koridoridesse jäetud väga palju jalgrattaid ja tõukerattaid. See muudab liikumise kitsaks, määrib seinu ning on päästeameti nõuete järgi ohtlik, sest väljapääs peab olema alati vaba.

Saan aru, et keldriboksid on väikesed, ning seetõttu soovin teha ettepaneku ehitada meie maja tagahoovi kaasaegne lukustatav jalgrattamaja. Nägin sarnast lahendust naabermaja juures ja elanikud on sellega väga rahul. Korralik rattamaja tõstaks kogu meie kinnisvara väärtust ja hoiaks trepikojad puhtana.

Kas seda ideed oleks võimalik arutada kevadisel üldkoosolekul? Olen hea meelega valmis aitama hinnapakkumiste võtmisel.

Vastust ootama jäädes ja lugupidamisega
Martin Tamm, korter 8`
  },
  {
    id: 'write-b2',
    level: 'B2',
    type: 'Arvamuslugu / Essee (Аргументированное эссе)',
    minWords: 160,
    maxWords: 240,
    title: 'Arvamuslugu: Kas tehisintellekt ja e-õpe asendavad traditsioonilise kooli?',
    promptEst: 'Üha rohkem koole ja ülikoole kasutab digitaalseid õppeplatvorme ning tehisintellekti tööriistu. Kirjutage arvamusartikkel, milles analüüsite e-õppe ja uute tehnoloogiate eeliseid ning ohte hariduses.',
    promptRus: 'Всё больше школ и университетов используют цифровые учебные платформы и инструменты искусственного интеллекта. Напишите статью-мнение, в которой проанализируете преимущества и риски электронного обучения и новых технологий в образовании.',
    bulletPoints: [
      'Sissejuhatus: tutvustage teema aktuaalsust tänapäeva Eesti ühiskonnas.',
      'Pooltargumendid: milliseid uusi võimalusi pakuvad e-õpe ja nutikad rakendused (paindlikkus, individuaalne tempo)?',
      'Vastuargumendid ja ohud: sotsiaalsete oskuste vähenemine, ekraaniaeg ja kriitilise mõtlemise kadumine.',
      'Kokkuvõte: teie isiklik seisukoht ja tulevikuprognoos.'
    ],
    phrases: [
      { label: 'Вступление', text: 'Viimastel aastatel on Eesti haridusmaastikul palju vaieldud selle üle, kui suurt rolli peaksid koolis mängima digiseadmed ja tehisintellekt. ' },
      { label: 'С одной стороны', text: 'Ühest küljest ei saa eitada, et kaasaegsed tehnoloogiad muudavad õppimise paindlikumaks ja kättesaadavamaks. ' },
      { label: 'Пример', text: 'Näiteks saavad maapiirkondade õpilased osaleda tipptasemel veebikursustel ilma kodust lahkumata. ' },
      { label: 'С другой стороны', text: 'Teisest küljest kaasnevad liigse digitaliseerimisega tõsised ohud, mida ei tohi tähelepanuta jätta. ' },
      { label: 'Проблема мышления', text: 'Kui õpilane laseb tehisintellektil oma kirjandi valmis kirjutada, ei arene tema analüüsivõime ega eneseväljendusoskus. ' },
      { label: 'Заключение', text: 'Kokkuvõtteks võib öelda, et tehnoloogia on suurepärane abivahend, kuid see ei suuda kunagi täielikult asendada inspireerivat õpetajat ja elavat arutelu klassiruumis.' }
    ],
    sampleAnswer: `Viimastel aastatel on Eesti haridusmaastikul tuliseks aruteluteemaks tõusnud tehisintellekti ja e-õppe roll koolides. Kui varem peeti digipööret üksnes edulooks, siis nüüd küsivad nii lapsevanemad kui ka teadlased üha sagedamini, kas ekraanipõhine õpe ei ole läinud liiga kaugele.

Ühest küljest pakuvad digitaalsed õppeplatvormid ja tehisaru enneolematuid võimalusi. Iga õpilane saab omandada teadmisi talle sobivas tempos: see, kes vajab matemaatika valemi mõistmiseks rohkem aega, saab tehisintellektilt küsida lisaselgitusi, samas kui võimekamad noored saavad lahendada keerukamaid ülesandeid. Lisaks on distantsõpe asendamatu haiguse ajal või kaugetes maapiirkondades elavatele noortele.

Teisest küljest ei tohi me silmi kinni pigistada tõsiste ohtude ees. Kool ei ole pelgalt faktide tuupimise koht, vaid sotsiaalne keskkond, kus õpitakse koostööd, empaatiat ja avalikku esinemist. Kui noor veedab suurema osa päevast ekraani taga ning laseb tehisarul oma esseed valmis kirjutada, kängub tema kriitiline mõtlemine ja funktsionaalne lugemisoskus.

Kokkuvõtteks leian, et tehisintellekt ja e-õpe ei asenda traditsioonilist kooli, küll aga muudavad nad õpetaja rolli. Tulevikukool peab ühendama nutika tehnoloogia ja vahetu inimliku suhtluse, sest ükski algoritm ei suuda asendada toetavat õpetajat ja elavat vaidlust klassiruumis.`
  }
];

// ============================================================================
// ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// ============================================================================
export default function App() {
  // Основная навигация по разделам
  const [activeSection, setActiveSection] = useState('reading'); // 'reading' | 'stories' | 'grammar' | 'writing' | 'mistakes'
  
  // Выбранные элементы в каждом разделе
  const [selectedReadingId, setSelectedReadingId] = useState(READING_TASKS[0].id);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(STORY_EPISODES[0].id);
  const [selectedGrammarId, setSelectedGrammarId] = useState(GRAMMAR_MODULES[0].id);
  const [selectedWritingId, setSelectedWritingId] = useState(WRITING_PROMPTS[0].id);

  // Фильтр уровня
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL' | 'A2/B1' | 'B1' | 'B2' | 'B2/C1'

  // Настройки чтения и рабочей области (Split-Screen & Mobile Modes)
  const [mobileViewMode, setMobileViewMode] = useState('split'); // 'split' (Верх/Низ) | 'text' (Только текст) | 'questions' (Вопросы)
  const [showMobileTextDrawer, setShowMobileTextDrawer] = useState(false);
  const [fontSize, setFontSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const [showGlossary, setShowGlossary] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState('instant'); // 'instant' (сразу объяснять) | 'exam' (после нажатия Проверить)

  // Подсветка доказательств в левой панели текста
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState(null);

  // Состояние ответов пользователя: { [questionId]: selectedOptionIndex }
  const [userAnswers, setUserAnswers] = useState({});
  // Для режима экзамена: какие задания уже отправлены на проверку
  const [submittedTasks, setSubmittedTasks] = useState({});
  // Банк ошибок для раздела "Работа над ошибками"
  const [mistakesLog, setMistakesLog] = useState([]);

  // Состояние для тренажёра письма
  const [essayTexts, setEssayTexts] = useState({
    'write-b1': '',
    'write-b2': ''
  });
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [checkedCriteria, setCheckedCriteria] = useState({});

  const textPaneRef = useRef(null);
  const textareaRef = useRef(null);

  // Активные объекты данных
  const currentReading = useMemo(
    () => READING_TASKS.find((t) => t.id === selectedReadingId) || READING_TASKS[0],
    [selectedReadingId]
  );
  const currentEpisode = useMemo(
    () => STORY_EPISODES.find((e) => e.id === selectedEpisodeId) || STORY_EPISODES[0],
    [selectedEpisodeId]
  );
  const currentGrammar = useMemo(
    () => GRAMMAR_MODULES.find((g) => g.id === selectedGrammarId) || GRAMMAR_MODULES[0],
    [selectedGrammarId]
  );
  const currentWriting = useMemo(
    () => WRITING_PROMPTS.find((w) => w.id === selectedWritingId) || WRITING_PROMPTS[0],
    [selectedWritingId]
  );

  // Сброс подсветки при смене задания
  useEffect(() => {
    setHighlightedEvidenceId(null);
  }, [activeSection, selectedReadingId, selectedEpisodeId, selectedGrammarId]);

  // Функция плавной прокрутки к предложению-доказательству в левой колонке
  const locateInText = (evidenceId) => {
    if (!evidenceId) return;
    setHighlightedEvidenceId(evidenceId);

    // Если на мобильном включён режим "Только вопросы", переключаем в "Сплит" или открываем текст
    if (window.innerWidth < 1024 && mobileViewMode === 'questions') {
      setMobileViewMode('split');
    }

    setTimeout(() => {
      const el = document.getElementById(`evidence-${evidenceId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  // Обработка ответа на вопрос
  const handleSelectAnswer = (taskObj, questionObj, optionIndex) => {
    const qId = questionObj.id;
    setUserAnswers((prev) => ({ ...prev, [qId]: optionIndex }));

    const isCorrect = optionIndex === questionObj.correct;

    if (feedbackMode === 'instant') {
      if (questionObj.evidenceId) {
        setHighlightedEvidenceId(questionObj.evidenceId);
      }
      if (!isCorrect) {
        // Записываем ошибку в журнал ошибок (без дубликатов)
        setMistakesLog((prev) => {
          const exists = prev.some((m) => m.questionId === qId);
          const newEntry = {
            questionId: qId,
            taskTitle: taskObj.title,
            section: activeSection,
            questionText: questionObj.question,
            chosenOption: questionObj.options[optionIndex],
            correctOption: questionObj.options[questionObj.correct],
            explanation: questionObj.explanation,
            options: questionObj.options,
            correctIndex: questionObj.correct
          };
          if (exists) {
            return prev.map((m) => (m.questionId === qId ? newEntry : m));
          }
          return [newEntry, ...prev];
        });
      }
    }
  };

  // Сброс ответов текущего задания
  const resetCurrentTask = (questionsList, taskId) => {
    const updated = { ...userAnswers };
    questionsList.forEach((q) => {
      delete updated[q.id];
    });
    setUserAnswers(updated);
    setSubmittedTasks((prev) => ({ ...prev, [taskId]: false }));
    setHighlightedEvidenceId(null);
  };

  // Подсчёт общей статистики
  const totalQuestionsCount = useMemo(() => {
    const rCount = READING_TASKS.reduce((acc, t) => acc + t.questions.length, 0);
    const sCount = STORY_EPISODES.reduce((acc, e) => acc + e.questions.length, 0);
    const gCount = GRAMMAR_MODULES.reduce((acc, g) => acc + g.questions.length, 0);
    return rCount + sCount + gCount;
  }, []);

  const answeredStats = useMemo(() => {
    const allQuestions = [
      ...READING_TASKS.flatMap((t) => t.questions),
      ...STORY_EPISODES.flatMap((e) => e.questions),
      ...GRAMMAR_MODULES.flatMap((g) => g.questions)
    ];
    let answered = 0;
    let correct = 0;
    allQuestions.forEach((q) => {
      if (userAnswers[q.id] !== undefined) {
        answered += 1;
        if (userAnswers[q.id] === q.correct) {
          correct += 1;
        }
      }
    });
    return { answered, correct };
  }, [userAnswers]);

  // Классы размера шрифта для панели чтения
  const fontSizeClass = {
    small: 'text-sm leading-relaxed',
    medium: 'text-base leading-relaxed',
    large: 'text-lg leading-loose'
  }[fontSize];

  // Вставка спецсимвола или фразы в редактор письма
  const insertIntoEssay = (textToInsert) => {
    const currentText = essayTexts[selectedWritingId] || '';
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updated = currentText.substring(0, start) + textToInsert + currentText.substring(end);
      setEssayTexts((prev) => ({ ...prev, [selectedWritingId]: updated }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 20);
    } else {
      setEssayTexts((prev) => ({ ...prev, [selectedWritingId]: currentText + textToInsert }));
    }
  };

  // Подсчёт слов в письме
  const currentWordCount = useMemo(() => {
    const raw = (essayTexts[selectedWritingId] || '').trim();
    if (!raw) return 0;
    return raw.split(/\s+/).length;
  }, [essayTexts, selectedWritingId]);

  // ============================================================================
  // РЕНДЕР: ПАНЕЛЬ ИСХОДНОГО ТЕКСТА (ЛЕВАЯ КОЛОНКА ДЛЯ ЧТЕНИЯ И ИСТОРИЙ)
  // ============================================================================
  const renderReadingTextPane = (taskData) => {
    return (
      <div
        ref={textPaneRef}
        className="bg-[#FCFBF7] dark:bg-slate-900 border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col"
      >
        {/* Верхняя панель инструментов чтения */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
              {taskData.level}
            </span>
            <span className="text-xs font-medium text-slate-600 truncate max-w-[200px] sm:max-w-xs">
              {taskData.category || `Серия ${taskData.episodeNumber}/4`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Переключатель словаря */}
            <button
              onClick={() => setShowGlossary(!showGlossary)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                showGlossary
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
              title="Показать/скрыть мини-словарь к тексту"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Словарь ({taskData.glossary?.length || 0})</span>
            </button>

            {/* Размер шрифта */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              {[
                { id: 'small', label: 'A-' },
                { id: 'medium', label: 'A' },
                { id: 'large', label: 'A+' }
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => setFontSize(sz.id)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                    fontSize === sz.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Заголовок статьи/текста */}
        <div className="p-5 sm:p-6 border-b border-slate-200/70 bg-gradient-to-b from-amber-50/40 to-transparent">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Исходный текст (Tekst)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {taskData.title}
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">{taskData.subtitle}</p>
          {taskData.characterNote && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{taskData.characterNote}</span>
            </div>
          )}
        </div>

        {/* Если это задание Lünktekst (восстановление пропущенных предложений) — показываем банк предложений */}
        {taskData.type === 'gap-sentences' && taskData.sentencePool && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-700" />
              <span>Банк предложений для вставки (1 предложение лишнее):</span>
            </h4>
            <div className="space-y-1.5">
              {taskData.sentencePool.map((item) => (
                <div
                  key={item.id}
                  className="text-xs sm:text-sm bg-white/90 px-3 py-2 rounded-lg border border-blue-100 text-slate-800 leading-relaxed"
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Основное тело текста с интерактивными предложениями */}
        <div className={`p-5 sm:p-6 space-y-5 text-slate-800 ${fontSizeClass}`}>
          {taskData.paragraphs.map((para) => (
            <div key={para.id} className="space-y-2">
              {para.label && (
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-l-2 border-blue-600 pl-2.5">
                  {para.label}
                </h3>
              )}
              <p className="text-slate-800 leading-relaxed">
                {para.sentences.map((sent) => {
                  const isHighlighted = highlightedEvidenceId === sent.id;

                  // Если это пропуск [LÜNK X] в задании на восстановление текста
                  if (sent.isGap) {
                    const relatedQ = taskData.questions.find((q) => q.gapNumber === sent.gapNumber);
                    const userChoiceIndex = relatedQ ? userAnswers[relatedQ.id] : undefined;
                    const chosenPoolItem =
                      userChoiceIndex !== undefined && taskData.sentencePool[userChoiceIndex]
                        ? taskData.sentencePool[userChoiceIndex]
                        : null;

                    return (
                      <span
                        key={sent.id}
                        id={`evidence-${sent.id}`}
                        className={`inline-block mx-1 my-1 px-2.5 py-1 rounded-lg font-medium border transition-all duration-300 ${
                          isHighlighted
                            ? 'bg-amber-200 border-amber-500 text-slate-900 ring-2 ring-amber-400'
                            : chosenPoolItem
                            ? 'bg-blue-100 border-blue-300 text-blue-950'
                            : 'bg-slate-200/70 border-dashed border-slate-400 text-slate-700'
                        }`}
                      >
                        <strong className="text-blue-700 mr-1">[{sent.gapNumber}]</strong>
                        {chosenPoolItem ? chosenPoolItem.text : '___ (Выберите предложение справа) ___'}
                      </span>
                    );
                  }

                  return (
                    <span
                      key={sent.id}
                      id={`evidence-${sent.id}`}
                      onClick={() =>
                        setHighlightedEvidenceId(isHighlighted ? null : sent.id)
                      }
                      className={`inline transition-all duration-300 rounded px-1 py-0.5 cursor-pointer ${
                        isHighlighted
                          ? 'bg-amber-200/90 text-slate-950 font-medium ring-2 ring-amber-400 shadow-sm'
                          : 'hover:bg-amber-100/50'
                      }`}
                      title="Нажмите, чтобы выделить предложение"
                    >
                      {sent.text}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          ))}
        </div>

        {/* Встроенный мини-словарь к тексту */}
        {showGlossary && taskData.glossary && (
          <div className="bg-slate-100/80 border-t border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-blue-600" />
                <span>Ключевая лексика из текста (Sõnavara)</span>
              </h4>
              <span className="text-[11px] text-slate-500">Нажмите на любое предложение выше для подсветки</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {taskData.glossary.map((g, idx) => (
                <div
                  key={idx}
                  className="bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 flex items-baseline justify-between gap-2 text-xs"
                >
                  <span className="font-bold text-slate-900">{g.est}</span>
                  <span className="text-slate-600 text-right">{g.rus}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // РЕНДЕР: ПАНЕЛЬ ТЕОРИИ ГРАММАТИКИ (ЛЕВАЯ КОЛОНКА В РАЗДЕЛЕ KEELESTRUKTUUR)
  // ============================================================================
  const renderGrammarTheoryPane = (grammarData) => {
    return (
      <div className="bg-[#FCFBF7] border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
              {grammarData.level}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Грамматический справочник с примерами
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">Шпаргалка всегда перед глазами</span>
        </div>

        <div className="p-5 sm:p-6 border-b border-slate-200/70 bg-gradient-to-b from-indigo-50/40 to-transparent">
          <h2 className="text-xl font-bold text-slate-900">{grammarData.title}</h2>
          <p className="text-sm text-slate-600 mt-1">{grammarData.subtitle}</p>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {grammarData.theoryBlocks.map((block) => {
            const isHighlighted = highlightedEvidenceId === block.id;
            return (
              <div
                key={block.id}
                id={`evidence-${block.id}`}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-md'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <h3 className="text-sm font-bold text-indigo-950 mb-1 flex items-center justify-between">
                  <span>{block.title}</span>
                  {isHighlighted && (
                    <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                      Правило к вопросу
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 mb-3">{block.rule}</p>
                <div className="space-y-2">
                  {block.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs space-y-0.5"
                    >
                      <div className="font-bold text-indigo-700">{ex.verb}</div>
                      <div className="font-medium text-slate-900">{ex.est}</div>
                      <div className="text-slate-500">{ex.rus}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // РЕНДЕР: ПАНЕЛЬ ВОПРОСОВ И ТЕСТОВ (ПРАВАЯ КОЛОНКА)
  // ============================================================================
  const renderQuestionsPane = (taskData) => {
    const questions = taskData.questions || [];
    const isTaskSubmitted = submittedTasks[taskData.id];

    // Сколько отвечено в текущем задании
    const localAnswered = questions.filter((q) => userAnswers[q.id] !== undefined).length;
    const localCorrect = questions.filter((q) => userAnswers[q.id] === q.correct).length;

    return (
      <div className="space-y-4">
        {/* Шапка блока вопросов с прогрессом и режимом проверки */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Задания к тексту ({localAnswered}/{questions.length})
              </h3>
              {localAnswered === questions.length && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Результат: {localCorrect} из {questions.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {feedbackMode === 'instant'
                ? 'Мгновенная проверка: выберите ответ, чтобы сразу увидеть объяснение и место в тексте.'
                : 'Режим экзамена: ответьте на все вопросы и нажмите «Проверить ответы» внизу.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Переключатель Мгновенно / Экзамен */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-medium">
              <button
                onClick={() => setFeedbackMode('instant')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  feedbackMode === 'instant'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Обучение
              </button>
              <button
                onClick={() => setFeedbackMode('exam')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  feedbackMode === 'exam'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Экзамен
              </button>
            </div>

            {localAnswered > 0 && (
              <button
                onClick={() => resetCurrentTask(questions, taskData.id)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                title="Сбросить ответы этого задания"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Список карточек вопросов */}
        <div className="space-y-4">
          {questions.map((q) => {
            const selectedIdx = userAnswers[q.id];
            const isAnswered = selectedIdx !== undefined;
            const showFeedback =
              (feedbackMode === 'instant' && isAnswered) ||
              (feedbackMode === 'exam' && isTaskSubmitted && isAnswered);
            const isCorrect = selectedIdx === q.correct;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
                  showFeedback
                    ? isCorrect
                      ? 'border-emerald-300 bg-emerald-50/10'
                      : 'border-rose-300 bg-rose-50/10'
                    : isAnswered
                    ? 'border-blue-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {q.question}
                  </h4>
                  {q.evidenceId && (
                    <button
                      onClick={() => locateInText(q.evidenceId)}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
                      title="Подсветить соответствующее место в тексте слева"
                    >
                      <Search className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">Найти в тексте</span>
                    </button>
                  )}
                </div>

                {/* Варианты ответа */}
                <div className="space-y-2">
                  {q.options.map((opt, idx) => {
                    const isThisSelected = selectedIdx === idx;
                    const isThisCorrect = idx === q.correct;

                    let optionStyle =
                      'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800';

                    if (showFeedback) {
                      if (isThisCorrect) {
                        optionStyle =
                          'bg-emerald-50 border-emerald-400 text-emerald-950 font-medium ring-1 ring-emerald-400';
                      } else if (isThisSelected && !isThisCorrect) {
                        optionStyle =
                          'bg-rose-50 border-rose-300 text-rose-900 line-through decoration-rose-400';
                      } else {
                        optionStyle = 'bg-slate-50/40 border-slate-200/60 text-slate-500';
                      }
                    } else if (isThisSelected) {
                      optionStyle =
                        'bg-blue-50 border-blue-500 text-blue-950 font-medium ring-1 ring-blue-500';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(taskData, q, idx)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 transition-all ${optionStyle}`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        <span className="shrink-0 mt-0.5">
                          {showFeedback && isThisCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                          {showFeedback && isThisSelected && !isThisCorrect && (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Блок подробного разбора ответа */}
                {showFeedback && (
                  <div
                    className={`mt-3.5 p-3.5 rounded-xl text-xs sm:text-sm border flex items-start gap-2.5 ${
                      isCorrect
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/90 border-amber-200 text-slate-900'
                    }`}
                  >
                    <Lightbulb
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isCorrect ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    />
                    <div className="space-y-1 flex-1">
                      <div className="font-bold">
                        {isCorrect ? 'Suurepärane! Правильный ответ.' : 'Обратите внимание:'}
                      </div>
                      <p className="leading-relaxed text-slate-700">{q.explanation}</p>
                      {q.evidenceId && (
                        <button
                          onClick={() => locateInText(q.evidenceId)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          <span>Показать доказательство в левой колонке</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Кнопка завершения в режиме Экзамена */}
        {feedbackMode === 'exam' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Отвечено: <strong>{localAnswered}</strong> из {questions.length}
            </span>
            <button
              onClick={() => setSubmittedTasks((prev) => ({ ...prev, [taskData.id]: true }))}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              Проверить ответы
            </button>
          </div>
        )}

        {/* Если мы в разделе Сквозных историй — удобная кнопка перехода к следующей серии */}
        {activeSection === 'stories' && (
          <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                Сквозной сюжет • Эпизод {currentEpisode.episodeNumber} из 4
              </div>
              <h4 className="text-base font-bold mt-0.5">
                Готовы узнать, что случилось с Мартином дальше?
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {currentEpisode.episodeNumber > 1 && (
                <button
                  onClick={() =>
                    setSelectedEpisodeId(`ep-${currentEpisode.episodeNumber - 1}`)
                  }
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Предыдущая серия</span>
                </button>
              )}
              {currentEpisode.episodeNumber < 4 && (
                <button
                  onClick={() =>
                    setSelectedEpisodeId(`ep-${currentEpisode.episodeNumber + 1}`)
                  }
                  className="px-4 py-2 rounded-xl bg-white text-indigo-950 hover:bg-blue-50 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Следующая серия (Osa {currentEpisode.episodeNumber + 1})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // РЕНДЕР: УНИВЕРСАЛЬНЫЙ SPLIT-SCREEN КОНТЕЙНЕР (ДЛЯ ПК И МОБИЛЬНЫХ УСТРОЙСТВ)
  // ============================================================================
  const renderSplitWorkspace = (leftPaneContent, rightPaneContent, taskTitle) => {
    return (
      <div className="relative">
        {/* МОБИЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ ОТОБРАЖЕНИЯ (< 1024px) */}
        <div className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white px-3 py-2.5 rounded-xl mb-4 shadow-md flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Вид:</span>
          </span>
          <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg flex-1 max-w-xs">
            <button
              onClick={() => setMobileViewMode('split')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-colors ${
                mobileViewMode === 'split'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Сплит 50/50
            </button>
            <button
              onClick={() => setMobileViewMode('text')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-colors ${
                mobileViewMode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              📖 Текст
            </button>
            <button
              onClick={() => setMobileViewMode('questions')}
              className={`py-1 px-2 rounded text-[11px] font-bold transition-colors ${
                mobileViewMode === 'questions'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ❓ Вопросы
            </button>
          </div>
        </div>

        {/* ДЕСКТОПНЫЙ ДВУХКОЛОНОЧНЫЙ LAYOUT (>= 1024px): ТЕКСТ СЛЕВА (sticky), ВОПРОСЫ СПРАВА */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 items-start">
          <div className="lg:col-span-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 custom-scrollbar">
            {leftPaneContent}
          </div>
          <div className="lg:col-span-6 min-w-0">
            {rightPaneContent}
          </div>
        </div>

        {/* МОБИЛЬНЫЙ АДАПТИВНЫЙ LAYOUT (< 1024px) */}
        <div className="lg:hidden">
          {mobileViewMode === 'split' && (
            <div className="space-y-4">
              <div className="max-h-[42vh] overflow-y-auto rounded-2xl border-2 border-blue-200 shadow-inner">
                {leftPaneContent}
              </div>
              <div>{rightPaneContent}</div>
            </div>
          )}

          {mobileViewMode === 'text' && (
            <div className="space-y-4">
              {leftPaneContent}
              <button
                onClick={() => setMobileViewMode('questions')}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span>Перейти к вопросам</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {mobileViewMode === 'questions' && (
            <div className="space-y-4 pb-16">
              {rightPaneContent}
              {/* Плавающая кнопка быстрого открытия исходного текста */}
              <button
                onClick={() => setShowMobileTextDrawer(true)}
                className="fixed bottom-4 right-4 z-30 px-4 py-3 rounded-full bg-slate-900 text-white font-bold text-xs shadow-xl border border-slate-700 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Открыть исходный текст</span>
              </button>
            </div>
          )}
        </div>

        {/* Модальное окно текста на мобильном при режиме "Вопросы" */}
        {showMobileTextDrawer && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end lg:hidden">
            <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold truncate">{taskTitle}</span>
                <button
                  onClick={() => setShowMobileTextDrawer(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold"
                >
                  Закрыть ✕
                </button>
              </div>
              <div className="overflow-y-auto p-3">{leftPaneContent}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // РЕНДЕР: РАЗДЕЛ ПИСЬМА (KIRJUTAMINE) — СЛЕВА ЗАДАНИЕ И КЛИШЕ, СПРАВА РЕДАКТОР
  // ============================================================================
  const renderWritingWorkspace = () => {
    const promptLeft = (
      <div className="bg-[#FCFBF7] border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
            Экзамен {currentWriting.level}
          </span>
          <span className="text-xs font-medium text-slate-600">
            Рекомендуемый объём: {currentWriting.minWords}–{currentWriting.maxWords} слов
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
              {currentWriting.type}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{currentWriting.title}</h2>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
            <p className="text-sm font-medium text-slate-900 leading-relaxed">
              {currentWriting.promptEst}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">{currentWriting.promptRus}</p>
          </div>

          {/* Обязательные пункты плана */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Обязательные пункты содержания (Sisu punktid):
            </h4>
            <ul className="space-y-1.5">
              {currentWriting.bulletPoints.map((bp, i) => (
                <li
                  key={i}
                  className="text-xs sm:text-sm text-slate-800 flex items-start gap-2 bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-200/70"
                >
                  <span className="font-bold text-amber-800">{i + 1}.</span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Интерактивные речевые клише */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Нажмите на фразу, чтобы вставить её в редактор справа:</span>
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {currentWriting.phrases.map((ph, idx) => (
                <button
                  key={idx}
                  onClick={() => insertIntoEssay(ph.text)}
                  className="text-left p-2.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 mb-0.5">
                    <span>{ph.label}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      + Вставить в текст
                    </span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium">{ph.text.trim()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Образец на максимальный балл */}
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => setShowSampleAnswer(!showSampleAnswer)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>
                {showSampleAnswer
                  ? 'Скрыть эталонный образец текста'
                  : 'Показать образец на высший балл (Näidistekst)'}
              </span>
            </button>
            {showSampleAnswer && (
              <div className="mt-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                <div className="font-bold text-emerald-900 mb-2">
                  Образец выполнения ({currentWriting.level}):
                </div>
                {currentWriting.sampleAnswer}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    const editorRight = (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Редактор письменной работы</h3>
            <p className="text-xs text-slate-500">
              Используйте панель эстонских букв и клише слева для построения текста
            </p>
          </div>

          {/* Счётчик слов */}
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              currentWordCount >= currentWriting.minWords &&
              currentWordCount <= currentWriting.maxWords
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : currentWordCount > currentWriting.maxWords
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Слов: {currentWordCount} / {currentWriting.minWords}–{currentWriting.maxWords}
          </div>
        </div>

        {/* Клавиатура спецсимволов эстонского алфавита */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 mr-1 px-1">Eesti tähed:</span>
          {['õ', 'ä', 'ö', 'ü', 'š', 'ž', 'Õ', 'Ä', 'Ö', 'Ü'].map((char) => (
            <button
              key={char}
              onClick={() => insertIntoEssay(char)}
              className="w-8 h-8 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 font-bold text-sm text-slate-800 shadow-2xs transition-colors"
            >
              {char}
            </button>
          ))}
          <button
            onClick={() =>
              setEssayTexts((prev) => ({ ...prev, [selectedWritingId]: '' }))
            }
            className="ml-auto px-2.5 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium"
          >
            Очистить
          </button>
        </div>

        {/* Текстовое поле */}
        <textarea
          ref={textareaRef}
          rows={12}
          value={essayTexts[selectedWritingId] || ''}
          onChange={(e) =>
            setEssayTexts((prev) => ({ ...prev, [selectedWritingId]: e.target.value }))
          }
          placeholder="Alustage kirjutamist siin... (Начните писать ваш текст на эстонском языке или нажмите на готовые фразы слева)"
          className="w-full p-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm sm:text-base text-slate-900 leading-relaxed resize-y font-sans"
        />

        {/* Чек-лист самопроверки по критериям Harno */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-blue-600" />
            <span>Чек-лист самопроверки перед сдачей (Hindamiskriteeriumid):</span>
          </h4>
          {[
            'Раскрыты все 4 содержательных пункта из задания слева',
            'Соблюдено вежливое обращение в начале и корректная подпись в конце',
            'Использованы связующие слова (Esiteks, Samuti, Seetõttu, Kokkuvõtteks)',
            'Проверен порядок слов (глагол на 2-м месте в главном предложении)',
            'Проверены окончания падежей после глаголов (rektsioon)'
          ].map((crit, idx) => {
            const key = `${selectedWritingId}-crit-${idx}`;
            const isChecked = !!checkedCriteria[key];
            return (
              <label
                key={key}
                className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() =>
                    setCheckedCriteria((prev) => ({ ...prev, [key]: !isChecked }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className={isChecked ? 'line-through text-slate-400' : ''}>{crit}</span>
              </label>
            );
          })}
        </div>
      </div>
    );

    return renderSplitWorkspace(promptLeft, editorRight, currentWriting.title);
  };

  // ============================================================================
  // ОСНОВНАЯ РАЗМЕТКА СТРАНИЦЫ
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* ВЕРХНЯЯ НАВИГАЦИОННАЯ ПАНЕЛЬ */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Логотип */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-lg shadow-inner border border-white/20">
              EE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight">ESTONSKI</h1>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  A2 • B1 • B2 • C1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Интерактивный тренажёр эстонского языка • Split-Screen издание
              </p>
            </div>
          </div>

          {/* Статистика сессии */}
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>
                Решено: <strong>{answeredStats.answered}</strong> / {totalQuestionsCount}
              </span>
              {answeredStats.answered > 0 && (
                <span className="text-emerald-400 font-bold">
                  ({Math.round((answeredStats.correct / answeredStats.answered) * 100)}% верно)
                </span>
              )}
            </div>

            <button
              onClick={() => setActiveSection('mistakes')}
              className={`px-3 py-1.5 rounded-xl font-semibold border transition-colors flex items-center gap-1.5 ${
                mistakesLog.length > 0
                  ? 'bg-rose-500/20 border-rose-400/40 text-rose-200 hover:bg-rose-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Ошибки ({mistakesLog.length})</span>
            </button>
          </div>
        </div>

        {/* Главное меню разделов */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-2">
          {[
            {
              id: 'reading',
              label: 'Чтение (Lugemine)',
              badge: `${READING_TASKS.length} текста`,
              icon: BookOpen
            },
            {
              id: 'stories',
              label: 'Сквозные истории (Jätkulood)',
              badge: 'Сериал 1–4',
              icon: Compass
            },
            {
              id: 'grammar',
              label: 'Грамматика (Keelestruktuur)',
              badge: 'Теория + Тест',
              icon: Layers
            },
            {
              id: 'writing',
              label: 'Письмо (Kirjutamine)',
              badge: 'B1/B2',
              icon: PenTool
            },
            {
              id: 'mistakes',
              label: 'Разбор ошибок',
              badge: mistakesLog.length,
              icon: CheckCircle2
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 border-blue-600'
                    : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ПОДМЕНЮ ВЫБОРА КОНКРЕТНОГО ТЕКСТА / СЕРИИ / ТЕМЫ */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {activeSection === 'reading' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {READING_TASKS.filter(
                  (t) => levelFilter === 'ALL' || t.level.includes(levelFilter)
                ).map((task) => {
                  const isSelected = task.id === selectedReadingId;
                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedReadingId(task.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {task.level}
                      </span>
                      <span>{task.title.split(':')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Фильтр по уровню */}
              <div className="flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                {['ALL', 'A2', 'B1', 'B2'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      levelFilter === lvl
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Все' : lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'stories' && (
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 mr-2 shrink-0">
                Сюжет «Жизнь в Таллинне»:
              </span>
              {STORY_EPISODES.map((ep) => {
                const isSelected = ep.id === selectedEpisodeId;
                return (
                  <button
                    key={ep.id}
                    onClick={() => setSelectedEpisodeId(ep.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px]">
                      Часть {ep.episodeNumber} ({ep.level})
                    </span>
                    <span>{ep.title.replace(/^Osa \d+.*?: /, '')}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeSection === 'grammar' && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {GRAMMAR_MODULES.map((gm) => {
                const isSelected = gm.id === selectedGrammarId;
                return (
                  <button
                    key={gm.id}
                    onClick={() => setSelectedGrammarId(gm.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px]">
                      {gm.level}
                    </span>
                    <span>{gm.title.split('(')[0]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeSection === 'writing' && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {WRITING_PROMPTS.map((wp) => {
                const isSelected = wp.id === selectedWritingId;
                return (
                  <button
                    key={wp.id}
                    onClick={() => {
                      setSelectedWritingId(wp.id);
                      setShowSampleAnswer(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px]">
                      {wp.level}
                    </span>
                    <span>{wp.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {activeSection === 'reading' &&
          renderSplitWorkspace(
            renderReadingTextPane(currentReading),
            renderQuestionsPane(currentReading),
            currentReading.title
          )}

        {activeSection === 'stories' &&
          renderSplitWorkspace(
            renderReadingTextPane(currentEpisode),
            renderQuestionsPane(currentEpisode),
            currentEpisode.title
          )}

        {activeSection === 'grammar' &&
          renderSplitWorkspace(
            renderGrammarTheoryPane(currentGrammar),
            renderQuestionsPane(currentGrammar),
            currentGrammar.title
          )}

        {activeSection === 'writing' && renderWritingWorkspace()}

        {activeSection === 'mistakes' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Журнал ошибок и самопроверка (Vigade parandus)
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Все вопросы, в которых была допущена ошибка во время тренировки, собираются здесь с подробным разбором.
                </p>
              </div>
              {mistakesLog.length > 0 && (
                <button
                  onClick={() => setMistakesLog([])}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Очистить список
                </button>
              )}
            </div>

            {mistakesLog.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  У вас пока нет зафиксированных ошибок!
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Решайте задания в разделах «Чтение», «Сквозные истории» и «Грамматика». Если вы ошибётесь, карточка с правилом автоматически появится здесь.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {mistakesLog.map((m, idx) => (
                  <div
                    key={m.questionId || idx}
                    className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-blue-700">{m.taskTitle}</span>
                      <button
                        onClick={() =>
                          setMistakesLog((prev) =>
                            prev.filter((item) => item.questionId !== m.questionId)
                          )
                        }
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        ✓ Я разобрался, удалить из списка
                      </button>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{m.questionText}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                        <div className="font-bold text-[11px] uppercase text-rose-600 mb-0.5">
                          Ваш ответ:
                        </div>
                        {m.chosenOption}
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                        <div className="font-bold text-[11px] uppercase text-emerald-700 mb-0.5">
                          Правильный ответ:
                        </div>
                        {m.correctOption}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm text-slate-800">
                      <strong>Разбор правила: </strong>
                      {m.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}