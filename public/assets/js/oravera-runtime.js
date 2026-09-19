/* oxlint-disable */
window.ORAVERA_CONFIG = window.ORAVERA_CONFIG || {
  apiBase: '/api',
  mediaManifest: '/assets/data/media-manifest.json'
};

(function(){
  const marker='oravera-prod04-final-initialized';
  try{
    if(!localStorage.getItem(marker)){
      ['oravera-appointments-v53','oravera-profile-v83','oravera-auth-v84'].forEach(k=>localStorage.removeItem(k));
      localStorage.setItem(marker,'1');
    }
  }catch{}
})();

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const langCopy={
 en:{callOra:'Call Ora',bookVisit:'Book a visit',care:'Care',services:'Services',prices:'Prices & insurance',ourWork:'Our work',reviews:'Reviews',insurance:'Insurance',faq:'Questions',about:'About OraVera',location:'Location & contact',heroKicker:'ORAVERA / DENTAL CARE IN MIAMI',heroTitle:'Fast relief for your pain',heroLead:'Start with Ora. Describe what is bothering you, understand likely costs and insurance, send photos, or book the right visit without hunting through the site.',askOra:'Ask Ora',exploreServices:'Explore services',seePrices:'See price ranges',metaMiami:'Miami, Florida',metaLanguages:'4 languages',metaConnected:'Chat, voice, photos & booking',tagPain:'Describe what hurts',tagCost:'See the likely total',tagBook:'Book the next step',careFriction:'Care without the usual friction',revealSentence:'Ask one question. Ora can bring the right treatment, price range, insurance step, photos, reviews or appointment into the same conversation.',servicesHeading:'What can we help with?',servicesSub:'Choose a service or describe what is bothering you. Ora will help you understand the best next step.',pricingHeading:'Know the likely cost before treatment',pricingSub:'Prices are approximate. Your exact cost depends on the exam, treatment plan, and insurance benefits.',reviewsHeading:'Patient reviews',reviewsSub:'Read about patients’ experience with treatment, booking, and communication with the clinic.',care1Title:'Start with Ora',care1Text:'Describe pain, ask a question, or choose a quick path. The assistant can open the relevant part of the site for you.',care2Title:'Share what helps',care2Text:'Send mouth photos, insurance details, or a message before the visit so the clinic has useful context.',care3Title:'Come in prepared',care3Text:'Choose a convenient time and keep the same conversation available while you browse or call Ora.',questionsKicker:'QUESTIONS',faqHeading:'Common questions',faqSub:'Open a full answer without losing the persistent Ora input at the bottom.',faq1q:'Can I book a same-day visit?',faq2q:'Can Ora diagnose from a photo?',faq3q:'Can I check insurance before I book?',visitKicker:'VISIT US',locationHeading:'OraVera in Miami',locationSub:'OraVera serves patients in Miami, Florida. Ora can help with contact details, office hours, and directions.',locationContact:'Location & contact',footerLine:'Dental care in Miami · questions, booking, and support in one place',privacy:'Privacy',terms:'Terms',placeholder:'Ask Ora about treatment, prices, insurance or booking…'},
 ru:{callOra:'Позвонить Ora',bookVisit:'Записаться',care:'Лечение',services:'Услуги',prices:'Цены и страховка',ourWork:'Наши работы',reviews:'Отзывы',insurance:'Страховка',faq:'Вопросы',about:'Об OraVera',location:'Адрес и контакты',heroKicker:'ORAVERA / СТОМАТОЛОГИЯ В МАЙАМИ',heroTitle:'Быстро разобраться, что делать с болью',heroLead:'Начните с Ora. Опишите, что беспокоит, узнайте ориентир по стоимости и страховке, отправьте фото или запишитесь на подходящий прием без поиска по всему сайту.',askOra:'Спросить Ora',exploreServices:'Посмотреть услуги',seePrices:'Посмотреть цены',metaMiami:'Майами, Флорида',metaLanguages:'4 языка',metaConnected:'Чат, звонок, фото и запись',tagPain:'Опишите, что болит',tagCost:'Поймите общую стоимость',tagBook:'Запишитесь на следующий шаг',careFriction:'Лечение без лишних препятствий',revealSentence:'Задайте один вопрос. Ora может открыть нужное лечение, диапазон цены, проверку страховки, фото, отзывы или запись в одном разговоре.',servicesHeading:'Чем мы можем помочь?',servicesSub:'Выберите услугу или просто опишите, что беспокоит. Ora поможет понять, с чего лучше начать.',pricingHeading:'Понимайте примерную стоимость до лечения',pricingSub:'Цены указаны ориентировочно. Точная стоимость зависит от осмотра, плана лечения и условий страховки.',reviewsHeading:'Отзывы пациентов',reviewsSub:'Отзывы помогают понять, как проходит лечение, запись и общение с клиникой.',care1Title:'Начните с Ora',care1Text:'Опишите боль, задайте вопрос или выберите быстрый сценарий. Ассистент сам откроет нужный раздел сайта.',care2Title:'Поделитесь полезной информацией',care2Text:'Отправьте фото полости рта, данные страховки или сообщение до визита.',care3Title:'Приходите подготовленными',care3Text:'Выберите удобное время и сохраняйте тот же контекст, пока смотрите сайт или разговариваете с Ora.',questionsKicker:'ВОПРОСЫ',faqHeading:'Частые вопросы',faqSub:'Откройте полный ответ, не теряя постоянную строку Ora внизу.',faq1q:'Можно записаться в тот же день?',faq2q:'Может ли Ora поставить диагноз по фото?',faq3q:'Можно проверить страховку до записи?',visitKicker:'КАК НАС НАЙТИ',locationHeading:'OraVera в Майами',locationSub:'OraVera принимает пациентов в Майами, Флорида. Ora поможет уточнить контакты, часы работы и как добраться.',locationContact:'Адрес и контакты',footerLine:'Стоматология в Майами · запись, вопросы и поддержка в одном месте',privacy:'Конфиденциальность',terms:'Условия',placeholder:'Спросите Ora об услугах, ценах, страховке или записи…'},
 es:{callOra:'Llamar a Ora',bookVisit:'Reservar cita',care:'Atención',services:'Servicios',prices:'Precios y seguro',ourWork:'Nuestro trabajo',reviews:'Reseñas',insurance:'Seguro',faq:'Preguntas',about:'Sobre OraVera',location:'Ubicación y contacto',heroKicker:'ORAVERA / ATENCIÓN DENTAL EN MIAMI',heroTitle:'Alivio rápido para tu dolor',heroLead:'Empieza con Ora. Describe qué te molesta, entiende los costos y el seguro, envía fotos o reserva la visita adecuada sin buscar por todo el sitio.',askOra:'Preguntar a Ora',exploreServices:'Ver servicios',seePrices:'Ver precios',metaMiami:'Miami, Florida',metaLanguages:'4 idiomas',metaConnected:'Chat, voz, fotos y reservas',tagPain:'Describe qué te duele',tagCost:'Conoce el costo probable',tagBook:'Reserva el siguiente paso',careFriction:'Atención sin fricción innecesaria',revealSentence:'Haz una pregunta. Ora puede traer el tratamiento, rango de precio, seguro, fotos, reseñas o cita adecuados a la misma conversación.',servicesHeading:'¿Cómo podemos ayudarte?',servicesSub:'Elige un servicio o describe qué te molesta. Ora te ayudará a entender el siguiente paso.',pricingHeading:'Conoce el costo probable antes del tratamiento',pricingSub:'Los precios son aproximados. El costo final depende del examen, el plan de tratamiento y el seguro.',reviewsHeading:'Reseñas de pacientes',reviewsSub:'Conoce la experiencia de los pacientes con el tratamiento, las citas y la atención de la clínica.',care1Title:'Empieza con Ora',care1Text:'Describe dolor, pregunta o elige una ruta rápida. Ora puede abrir la parte correcta del sitio.',care2Title:'Comparte lo necesario',care2Text:'Envía fotos, datos del seguro o un mensaje antes de la visita.',care3Title:'Llega preparado',care3Text:'Elige una hora y conserva la conversación mientras navegas o llamas a Ora.',questionsKicker:'PREGUNTAS',faqHeading:'Preguntas frecuentes',faqSub:'Abre la respuesta completa sin perder el campo de Ora abajo.',faq1q:'¿Puedo reservar para hoy?',faq2q:'¿Puede Ora diagnosticar con una foto?',faq3q:'¿Puedo revisar el seguro antes de reservar?',visitKicker:'VISÍTANOS',locationHeading:'OraVera en Miami',locationSub:'OraVera atiende en Miami, Florida. Ora puede ayudarte con contactos, horarios y cómo llegar.',locationContact:'Ubicación y contacto',footerLine:'Atención dental en Miami · preguntas, citas y ayuda en un solo lugar',privacy:'Privacidad',terms:'Términos',placeholder:'Pregunta a Ora por tratamiento, precios, seguro o citas…'},
 he:{callOra:'שיחה עם Ora',bookVisit:'קביעת תור',care:'טיפול',services:'שירותים',prices:'מחירים וביטוח',ourWork:'העבודות שלנו',reviews:'ביקורות',insurance:'ביטוח',faq:'שאלות',about:'אודות OraVera',location:'מיקום ויצירת קשר',heroKicker:'ORAVERA / טיפולי שיניים במיאמי',heroTitle:'הקלה מהירה לכאב שלך',heroLead:'מתחילים עם Ora. מתארים מה מפריע, מבינים עלויות וביטוח, שולחים תמונות או קובעים את הביקור המתאים בלי לחפש בכל האתר.',askOra:'לשאול את Ora',exploreServices:'שירותים',seePrices:'טווחי מחירים',metaMiami:'מיאמי, פלורידה',metaLanguages:'4 שפות',metaConnected:'צ׳אט, קול, תמונות ותורים',tagPain:'תארו מה כואב',tagCost:'הבינו את העלות הצפויה',tagBook:'קבעו את הצעד הבא',careFriction:'טיפול בלי חיכוך מיותר',revealSentence:'שאלה אחת מספיקה. Ora יכולה לפתוח טיפול, טווח מחיר, ביטוח, תמונות, ביקורות או תור באותה שיחה.',servicesHeading:'איך אפשר לעזור?',servicesSub:'בחרו קטגוריה או תארו מה מפריע. הכרטיסים משתמשים בקרוסלה המדורגת, ושאר האתר נשאר OraVera.',pricingHeading:'להבין עלות צפויה לפני טיפול',pricingSub:'הטווחים הם נתוני אב-טיפוס להמחשה ולא מחירי OraVera מאומתים. המחיר הסופי תלוי בתוכנית הטיפול ובביטוח.',reviewsHeading:'מה מטופלים יכולים לספר',reviewsSub:'הממשק מוכן לביקורות מאומתות. כרטיסי האב-טיפוס מסומנים כדמו.',care1Title:'מתחילים עם Ora',care1Text:'מתארים כאב, שואלים שאלה או בוחרים מסלול מהיר. Ora יכולה לפתוח את החלק הרלוונטי באתר.',care2Title:'משתפים מה שעוזר',care2Text:'שלחו תמונות, פרטי ביטוח או הודעה לפני הביקור.',care3Title:'מגיעים מוכנים',care3Text:'בחרו זמן נוח ושמרו על אותה שיחה בזמן גלישה או שיחה עם Ora.',questionsKicker:'שאלות',faqHeading:'שאלות נפוצות',faqSub:'פתחו תשובה מלאה בלי לאבד את שורת Ora בתחתית.',faq1q:'אפשר לקבוע תור להיום?',faq2q:'האם Ora יכולה לאבחן מתמונה?',faq3q:'אפשר לבדוק ביטוח לפני התור?',visitKicker:'בקרו אותנו',locationHeading:'OraVera במיאמי',locationSub:'OraVera משרתת מטופלים במיאמי, פלורידה. כתובת, טלפון ושעות מדויקים צריכים להגיע ממידע מאומת לפני ההשקה.',locationContact:'מיקום ויצירת קשר',footerLine:'טיפולי שיניים במיאמי · חוויית מטופל בסיוע AI',privacy:'פרטיות',terms:'תנאים',placeholder:'שאלו את Ora על טיפול, מחירים, ביטוח או תור…'}
};

const services=[
 {key:'implant',title:{en:'Single-tooth implant',ru:'Имплант одного зуба',es:'Implante de un diente',he:'שתל לשן אחת'},short:{en:'Fixture + abutment + crown',ru:'Имплант + абатмент + коронка',es:'Implante + pilar + corona',he:'שתל + מבנה + כתר'},desc:{en:'A complete restored tooth may include the implant fixture, abutment, crown, imaging, and additional procedures when needed.',ru:'Полное восстановление зуба может включать сам имплант, абатмент, коронку, диагностику и дополнительные процедуры при необходимости.',es:'Una restauración completa puede incluir implante, pilar, corona, imágenes y procedimientos adicionales si hacen falta.',he:'שיקום מלא עשוי לכלול שתל, מבנה, כתר, הדמיה והליכים נוספים לפי הצורך.'},price:'$2,150-$3,500'},
 {key:'veneers',title:{en:'Veneers',ru:'Виниры',es:'Carillas',he:'ציפויי חרסינה'},short:{en:'Cosmetic veneer per tooth',ru:'Эстетический винир за зуб',es:'Carilla estética por diente',he:'ציפוי אסתטי לשן'},desc:{en:'A cosmetic consultation helps define smile goals, preparation needs, material, and how many teeth should be treated.',ru:'Косметическая консультация помогает определить цели, необходимость подготовки, материал и количество зубов.',es:'La consulta estética ayuda a definir objetivos, preparación, material y número de dientes.',he:'ייעוץ אסתטי עוזר להגדיר מטרות, הכנה, חומר וכמה שיניים לטפל.'},price:'$900-$1,800'},
 {key:'crown',title:{en:'Dental crown',ru:'Коронка',es:'Corona dental',he:'כתר דנטלי'},short:{en:'Restoration per tooth',ru:'Восстановление одного зуба',es:'Restauración por diente',he:'שיקום לשן'},desc:{en:'A crown restores a damaged tooth. The final plan depends on the tooth condition, material, imaging, and whether other treatment is needed.',ru:'Коронка восстанавливает поврежденный зуб. План зависит от состояния зуба, материала, диагностики и дополнительных процедур.',es:'La corona restaura un diente dañado. El plan depende del estado, material, imágenes y otros tratamientos.',he:'כתר משקם שן פגועה. התוכנית תלויה במצב השן, בחומר, בהדמיה ובטיפולים נוספים.'},price:'$900-$1,600'},
 {key:'emergency',title:{en:'Urgent dental exam',ru:'Срочный осмотр',es:'Consulta urgente',he:'בדיקה דחופה'},short:{en:'Pain, swelling, chipped tooth',ru:'Боль, отек, скол зуба',es:'Dolor, inflamación, diente roto',he:'כאב, נפיחות, שן שבורה'},desc:{en:'For pain, swelling, a chipped tooth, or another concern that should be evaluated soon. Treatment during the visit is priced separately.',ru:'При боли, отеке, сколе или другой проблеме, которую нужно оценить в ближайшее время. Лечение на приеме оплачивается отдельно.',es:'Para dolor, inflamación, diente roto u otro problema que deba evaluarse pronto. El tratamiento se cobra aparte.',he:'לכאב, נפיחות, שבר או בעיה שדורשת בדיקה מהירה. טיפול בביקור מתומחר בנפרד.'},price:'$90-$250'},
 {key:'cleaning',title:{en:'Professional cleaning',ru:'Профессиональная чистка',es:'Limpieza profesional',he:'ניקוי מקצועי'},short:{en:'Preventive hygiene visit',ru:'Профилактическая гигиена',es:'Visita de higiene preventiva',he:'ביקור היגיינה מונעת'},desc:{en:'Routine preventive cleaning and oral hygiene care. Periodontal or deep cleaning may require a different treatment plan and cost.',ru:'Плановая профилактическая чистка и гигиена. Пародонтологическая или глубокая чистка может требовать другого плана и стоимости.',es:'Limpieza preventiva rutinaria. La limpieza periodontal o profunda puede requerir otro plan y precio.',he:'ניקוי מונע שגרתי. ניקוי עמוק או חניכיים עשוי לדרוש תוכנית ועלות אחרות.'},price:'$120-$250'},
 {key:'exam',title:{en:'Exam / consultation',ru:'Осмотр / консультация',es:'Examen / consulta',he:'בדיקה / ייעוץ'},short:{en:'General dental evaluation',ru:'Общая стоматологическая оценка',es:'Evaluación dental general',he:'הערכה דנטלית כללית'},desc:{en:'A general visit to understand the problem, discuss options, and plan the appropriate next step. Imaging or treatment can be billed separately.',ru:'Общий прием, чтобы понять проблему, обсудить варианты и выбрать следующий шаг. Диагностика и лечение могут оплачиваться отдельно.',es:'Visita general para entender el problema, hablar de opciones y planear el siguiente paso. Imágenes y tratamiento pueden cobrarse aparte.',he:'ביקור כללי להבנת הבעיה, דיון באפשרויות ותכנון הצעד הבא. הדמיה או טיפול עשויים להיות נפרדים.'},price:'$75-$200'}
];
const reviews=[
 {service:'Implants',text:{en:'The price was explained in parts before I decided what to do. I knew the implant, abutment and crown were separate.',ru:'Стоимость разложили по частям до решения. Я понимала, что имплант, абатмент и коронка считаются отдельно.',es:'Me explicaron el precio por partes antes de decidir. Entendí que implante, pilar y corona eran componentes distintos.',he:'המחיר הוסבר בחלקים לפני שהחלטתי. היה ברור שהשתל, המבנה והכתר נפרדים.'}},
 {service:'Implants',text:{en:'I liked that I could ask about the total expected cost instead of seeing only a low “from” price.',ru:'Мне понравилось, что можно было спросить про ожидаемую общую стоимость, а не видеть только низкую цену «от».',es:'Me gustó poder preguntar por el costo total esperado y no ver solo un precio bajo “desde”.',he:'אהבתי שאפשר לשאול על העלות הכוללת הצפויה ולא לראות רק מחיר “החל מ-”.'}},
 {service:'Cosmetic',text:{en:'Ora helped me understand the cosmetic options and what would be discussed at the consultation.',ru:'Ora помогла понять косметические варианты и что именно будут обсуждать на консультации.',es:'Ora me ayudó a entender las opciones estéticas y qué se hablaría en la consulta.',he:'Ora עזרה לי להבין את האפשרויות האסתטיות ומה ידובר בייעוץ.'}},
 {service:'Urgent care',text:{en:'I could describe the pain, see the next step and book without searching through the site.',ru:'Я описала боль, сразу увидела следующий шаг и записалась без поиска по сайту.',es:'Pude describir el dolor, ver el siguiente paso y reservar sin buscar por todo el sitio.',he:'יכולתי לתאר את הכאב, לראות את הצעד הבא ולקבוע בלי לחפש באתר.'}},
 {service:'General',text:{en:'Insurance questions and booking stayed in one conversation.',ru:'Вопросы по страховке и запись остались в одном разговоре.',es:'Las preguntas del seguro y la reserva quedaron en una sola conversación.',he:'שאלות ביטוח וקביעת תור נשארו באותה שיחה.'}},
 {service:'General',text:{en:'The information was easy to compare and I always knew what action to take next.',ru:'Информацию было легко сравнивать, и всегда было понятно, что делать дальше.',es:'La información era fácil de comparar y siempre sabía cuál era el siguiente paso.',he:'היה קל להשוות מידע ותמיד היה ברור מה הצעד הבא.'}}
];
const uiCopy={
 en:{welcomeTitle:"Hi, I’m Ora. How can I help?",welcomeCopy:"Ask about treatment, prices, insurance, our work or reviews, send mouth photos, or book an appointment. I’ll show the relevant part of OraVera right here in our conversation.",languageTitle:"Language",callLive:"I’m here. You can keep browsing.",mute:"Mute",unmute:"Unmute",end:"End"},
 ru:{welcomeTitle:"Здравствуйте, я Ora. Чем помочь?",welcomeCopy:"Спросите про лечение, цены, страховку, наши работы или отзывы, отправьте фото полости рта или запишитесь на прием. Я покажу нужную часть OraVera прямо в этом разговоре.",languageTitle:"Язык",callLive:"Я здесь. Можно продолжать смотреть сайт.",mute:"Без звука",unmute:"Включить",end:"Завершить"},
 es:{welcomeTitle:"Hola, soy Ora. ¿Cómo puedo ayudarte?",welcomeCopy:"Pregunta por tratamientos, precios, seguro, nuestro trabajo o reseñas, envía fotos de la boca o reserva una cita. Te mostraré la parte relevante de OraVera aquí en nuestra conversación.",languageTitle:"Idioma",callLive:"Estoy aquí. Puedes seguir navegando.",mute:"Silenciar",unmute:"Activar sonido",end:"Finalizar"},
 he:{welcomeTitle:"שלום, אני Ora. איך אפשר לעזור?",welcomeCopy:"אפשר לשאול על טיפולים, מחירים, ביטוח, עבודות והמלצות, לשלוח תמונות של חלל הפה או לקבוע תור. אציג את החלק הרלוונטי של OraVera כאן בשיחה.",languageTitle:"שפה",callLive:"אני כאן. אפשר להמשיך לגלוש.",mute:"השתק",unmute:"הפעל צליל",end:"סיום"}
};
const languageMeta={en:{name:'English',short:'EN'},es:{name:'Español',short:'ES'},ru:{name:'Русский',short:'RU'},he:{name:'עברית',short:'HE'}};
const microCopy={
 en:{service:'Service',pricing:'Price',review:'Review',range:'estimated range',expand:'Expand card',drag:'drag or use arrows',previous:'Previous',next:'Next'},
 ru:{service:'Услуга',pricing:'Цена',review:'Отзыв',range:'ориентир по стоимости',expand:'Раскрыть карточку',drag:'перетащите или используйте стрелки',previous:'Назад',next:'Вперёд'},
 es:{service:'Servicio',pricing:'Precio',review:'Reseña',range:'rango estimado',expand:'Abrir tarjeta',drag:'arrastra o usa las flechas',previous:'Anterior',next:'Siguiente'},
 he:{service:'שירות',pricing:'מחיר',review:'ביקורת לדוגמה',range:'טווח משוער',expand:'פתיחת כרטיס',drag:'גררו או השתמשו בחצים',previous:'הקודם',next:'הבא'}
};
function micro(key){return microCopy[lang]?.[key]||microCopy.en[key]||key}
const reviewTopicCopy={
 'Implants':{en:'Implants',ru:'Импланты',es:'Implantes',he:'שתלים'},
 'Cosmetic':{en:'Cosmetic care',ru:'Эстетика',es:'Estética',he:'אסתטיקה'},
 'Urgent care':{en:'Urgent care',ru:'Срочная помощь',es:'Atención urgente',he:'טיפול דחוף'},
 'General':{en:'General care',ru:'Общее лечение',es:'Atención general',he:'טיפול כללי'}
};
function reviewTopic(value){return reviewTopicCopy[value]?.[lang]||value}


let lang='en', callSec=0, callTimer=null, muted=false, attachments=[];
const booking={step:1,visit:'',day:'',time:'',name:'',contact:'',payment:'',provider:'',memberId:'',confirmation:''};

function tr(key){return langCopy[lang]?.[key]||langCopy.en[key]||key}
function loc(obj){return obj?.[lang]||obj?.en||''}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function updateStaticUi(){
  const ui=uiCopy[lang]||uiCopy.en;
  const wt=document.querySelector('[data-chat-welcome-title]'); if(wt) wt.textContent=ui.welcomeTitle;
  const wc=document.querySelector('[data-chat-welcome-copy]'); if(wc) wc.textContent=ui.welcomeCopy;
  const welcomeBtns=document.querySelectorAll('.welcomeActions [data-page]');
  if(welcomeBtns[0]) welcomeBtns[0].textContent=tr('services');
  if(welcomeBtns[1]) welcomeBtns[1].textContent=tr('prices');
  if(welcomeBtns[2]) welcomeBtns[2].textContent=tr('ourWork');
  if(welcomeBtns[3]) welcomeBtns[3].textContent=tr('reviews');
  if(welcomeBtns[4]) welcomeBtns[4].textContent=tr('bookVisit');
  const langTitle=$('#languageTitle'); if(langTitle) langTitle.textContent=ui.languageTitle;
  const callLive=$('#callLive'); if(callLive && !document.body.classList.contains('calling')) callLive.textContent=ui.callLive;
  const mute=$('#muteCall'); const muteLabel=$('#muteCallLabel'); if(muteLabel) muteLabel.textContent=muted?ui.unmute:ui.mute; if(mute) mute.setAttribute('aria-label',muted?ui.unmute:ui.mute);
  const end=$('#endCall'); if(end){end.textContent=ui.end;end.setAttribute('aria-label',ui.end)};
  $$('#languagePicker [data-set-lang]').forEach(btn=>{const active=btn.dataset.setLang===lang;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false')});
}
function setLanguage(next){lang=langCopy[next]?next:'en';document.documentElement.lang=lang;document.documentElement.dir=lang==='he'?'rtl':'ltr';$$('[data-t]').forEach(el=>{const k=el.dataset.t;if(langCopy[lang]?.[k])el.textContent=langCopy[lang][k]});$('#input').placeholder=tr('placeholder');updateStaticUi();renderAllCarousels();splitRevealText();if($('#pageLayer').classList.contains('show')){const type=$('#pageLayer').dataset.page;if(type)openPage(type,$('#pageLayer').dataset.key||'',true)}}

function splitRevealText(){const el=$('#revealText');if(!el)return;const text=tr('revealSentence');el.innerHTML=text.split(/\s+/).map(w=>`<span class="rw">${escapeHtml(w)}</span>`).join(' ');bindRevealParagraph(el)}
function bindRevealParagraph(el){const words=[...el.querySelectorAll('.rw')];let raf=0;const activate=p=>{const n=Math.max(1,Math.round(words.length*p));words.forEach((w,i)=>w.classList.toggle('on',i<n))};activate(.18);el.onpointermove=e=>{if(matchMedia('(hover:hover)').matches){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=el.getBoundingClientRect();activate(Math.max(.08,Math.min(1,(e.clientX-r.left)/r.width)))})}};el.onpointerleave=()=>activate(.18);const io=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)activate(.36)},{threshold:.4});io.observe(el)}

function wordsMarkup(text){return String(text).split(/\s+/).map(w=>`<span class="word">${escapeHtml(w)}</span>`).join(' ')}
function serviceCards(mode){return services.map((s,i)=>({title:loc(s.title),badge:mode==='pricing'?micro('pricing'):micro('service'),price:mode==='pricing'?s.price:'',desc:mode==='pricing'?`${loc(s.short)}. ${loc(s.desc)}`:loc(s.desc),key:s.key,index:i}))}
function reviewCards(){return reviews.map((r,i)=>({title:reviewTopic(r.service),badge:micro('review'),price:'',desc:loc(r.text),key:'review'+i,index:i}))}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function truncateCardText(text,limit){
  const value=String(text||'').trim();
  if(value.length<=limit)return value;
  const cut=value.slice(0,limit+1);const at=cut.lastIndexOf(' ');
  return (at>Math.floor(limit*.62)?cut.slice(0,at):value.slice(0,limit)).trim()+'…';
}
function carouselMarkup(id,cards){
  const initial=cards.length>1?1:0;
  return `<div class="carouselStage" data-carousel-stage="${id}" data-active-index="${initial}" tabindex="0" aria-label="Interactive carousel">
    <div class="carouselTrack" id="${id}-track">
      ${cards.map((c,i)=>{
        const full=String(c.desc||'');
        const short=truncateCardText(full,74);
        return `<div class="carouselItem" data-carousel-item data-index="${i}">
          <article class="revealCard" data-reveal-card data-card-index="${i}" data-key="${escapeHtml(c.key)}" data-full="${escapeHtml(full)}" data-short="${escapeHtml(short)}" tabindex="0" role="button" aria-label="${escapeHtml(c.title)}">
            <div class="cardTop"><h3 class="cardTitle">${escapeHtml(c.title)}</h3><span class="cardBadge">${escapeHtml(c.badge||'')}</span></div>
            ${c.price?`<div class="cardPrice">${escapeHtml(c.price)}<small>${escapeHtml(micro('range'))}</small></div>`:''}
            <button class="cardPlus" type="button" aria-label="${escapeHtml(micro('expand'))}" data-card-select="${i}"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>
            <p class="cardDescription">${wordsMarkup(i===initial?full:short)}</p>
          </article>
        </div>`
      }).join('')}
    </div>
    <div class="carouselControls" data-carousel-controls>
      <button type="button" data-carousel-step="-1" aria-label="${escapeHtml(micro('previous'))}"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
      <button type="button" data-carousel-step="1" aria-label="${escapeHtml(micro('next'))}"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
    </div>
    <div class="carouselHint">${escapeHtml(micro('drag'))}</div>
  </div>`
}
function renderAllCarousels(){
  const s=$('#servicesCarousel'),p=$('#pricingCarousel'),r=$('#reviewsCarousel');
  if(s)s.innerHTML=carouselMarkup('services',serviceCards('services'));
  if(p)p.innerHTML=carouselMarkup('pricing',serviceCards('pricing'));
  if(r)r.innerHTML=carouselMarkup('reviews',reviewCards());
  hydrateCarousels(document)
}
function hydrateCarousels(root){
  root.querySelectorAll('[data-carousel-stage]').forEach(stage=>{
    if(stage.dataset.hydrated)return;stage.dataset.hydrated='1';
    const items=[...stage.querySelectorAll('[data-carousel-item]')];
    const cards=items.map(item=>item.querySelector('[data-reveal-card]'));
    const controls=stage.querySelector('[data-carousel-controls]');
    const prev=controls?.querySelector('[data-carousel-step="-1"]');
    const next=controls?.querySelector('[data-carousel-step="1"]');
    let active=Number(stage.dataset.activeIndex)||0;
    const initialStageWidth=Math.max(280,stage.clientWidth||700);
    active=initialStageWidth<560?0:Math.min(1,Math.max(0,items.length-1));
    stage.dataset.activeIndex=String(active);
    let dragX=0,startX=0,startY=0,dragging=false,moved=false,pointerId=null;
    let wordTimers=[];

    const clearWordTimers=()=>{wordTimers.forEach(clearTimeout);wordTimers=[]};
    const descWords=(card,text)=>{const p=card.querySelector('.cardDescription');if(!p)return[];p.innerHTML=wordsMarkup(text);return [...p.querySelectorAll('.word')]};
    const setCardCopy=(card,full,animate=false)=>{
      clearWordTimers();
      const text=full?card.dataset.full:card.dataset.short;
      const words=descWords(card,text||'');
      if(full){
        if(animate && !matchMedia('(prefers-reduced-motion: reduce)').matches){
          words.forEach(w=>w.classList.remove('on'));
          words.forEach((w,i)=>wordTimers.push(setTimeout(()=>w.classList.add('on'),Math.min(420,i*17))));
        }else words.forEach(w=>w.classList.add('on'));
      }
    };
    const metrics=()=>{
      const w=Math.max(280,stage.clientWidth||700);
      const mobile=w<560,tablet=!mobile&&w<820;
      const gap=mobile?8:10;
      const cardW=mobile?Math.min(300,Math.max(246,w-34)):(tablet?Math.min(272,Math.max(240,w*.40)):Math.min(326,Math.max(292,w*.325)));
      const cardH=mobile?348:(tablet?350:370);
      const y=[0,0,0];
      const anchorLane=mobile?0:1;
      const baseTop=mobile?4:Math.max(0,-Math.min(...y));
      const offset=mobile?6:Math.max(10,Math.min(20,w*.017));
      const stageH=baseTop+cardH+(mobile?58:52);
      return {w,mobile,tablet,gap,cardW,cardH,y,anchorLane,baseTop,offset,stageH,step:cardW+gap};
    };
    const render=(dx=0,animateActive=false)=>{
      const m=metrics();
      active=clamp(active,0,Math.max(0,items.length-1));stage.dataset.activeIndex=String(active);
      stage.style.height=m.stageH+'px';stage.style.setProperty('--carousel-base-top',m.baseTop+'px');stage.style.setProperty('--carousel-card-w',m.cardW+'px');stage.style.setProperty('--carousel-card-h',m.cardH+'px');
      const first=active-m.anchorLane;
      items.forEach((item,i)=>{
        const lane=i-first;
        const x=m.offset+lane*m.step+dx;
        const y=(lane>=0&&lane<m.y.length?m.y[lane]:0);
        item.style.transform=`translate3d(${x}px,${y}px,0)`;
        const card=cards[i],isActive=i===active;
        const wasActive=card.classList.contains('is-active');
        card.classList.toggle('is-active',isActive);card.setAttribute('aria-current',isActive?'true':'false');
        if(isActive && (!wasActive||animateActive))setCardCopy(card,true,true);
        else if(!isActive && wasActive)setCardCopy(card,false,false);
        const off=x+m.cardW<0||x>m.w;item.style.opacity=off?'.18':'1';item.style.pointerEvents=off?'none':'';
      });
      if(controls){
        const activeLane=m.anchorLane;
        const activeX=m.offset+activeLane*m.step+dx;
        const cx=m.mobile?(activeX+m.cardW-(90/2)):activeX;
        controls.style.left=clamp(cx,6,Math.max(6,m.w-(m.mobile?90:108)))+'px';
      }
      if(prev)prev.disabled=active<=0;if(next)next.disabled=active>=items.length-1;
    };
    const select=(index,animateCopy=true)=>{active=clamp(index,0,items.length-1);render(0,animateCopy)};

    cards.forEach((card,i)=>{
      const full=card.dataset.full||'',short=card.dataset.short||'';
      if(i===active)setCardCopy(card,true,false);else setCardCopy(card,false,false);
      card.addEventListener('pointerenter',()=>{
        if(i===active||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
        const words=descWords(card,full);words.forEach(w=>w.classList.remove('on'));clearWordTimers();
        words.forEach((w,wi)=>wordTimers.push(setTimeout(()=>w.classList.add('on'),Math.min(380,wi*16))));
      });
      card.addEventListener('pointerleave',()=>{if(i!==active)setCardCopy(card,false,false)});
      card.querySelector('[data-card-select]')?.addEventListener('click',e=>{e.stopPropagation();select(i,true)});
      card.addEventListener('click',e=>{
        if(moved||e.target.closest('.cardPlus'))return;
        if(i!==active){select(i,true);return}
        const key=card.dataset.key;if(services.some(s=>s.key===key))openPage('service',key);
      });
      card.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();if(i!==active)select(i,true);else{const key=card.dataset.key;if(services.some(s=>s.key===key))openPage('service',key)}}
      });
    });
    controls?.querySelectorAll('[data-carousel-step]').forEach(btn=>btn.addEventListener('click',()=>select(active+(Number(btn.dataset.carouselStep)||0),true)));
    stage.addEventListener('keydown',e=>{
      if(e.target.closest('.revealCard'))return;
      if(e.key==='ArrowLeft'){e.preventDefault();select(active-1,true)}
      if(e.key==='ArrowRight'){e.preventDefault();select(active+1,true)}
    });
    stage.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button'))return;
      pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;dragX=0;dragging=true;moved=false;
      try{stage.setPointerCapture(pointerId)}catch{};
    });
    stage.addEventListener('pointermove',e=>{
      if(!dragging||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(Math.abs(dy)>Math.abs(dx)*1.15&&Math.abs(dy)>9)return;
      dragX=dx;if(Math.abs(dx)>6)moved=true;
      stage.classList.add('is-dragging');render(dragX,false);
    });
    const endDrag=e=>{
      if(!dragging||(e.pointerId!=null&&pointerId!=null&&e.pointerId!==pointerId))return;
      const m=metrics(),threshold=Math.min(72,m.cardW*.2),dx=dragX;
      dragging=false;stage.classList.remove('is-dragging');
      try{if(pointerId!=null)stage.releasePointerCapture(pointerId)}catch{};
      pointerId=null;dragX=0;
      if(dx<=-threshold)active++;else if(dx>=threshold)active--;
      render(0,true);setTimeout(()=>{moved=false},0);
    };
    stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
    if('ResizeObserver'in window){const ro=new ResizeObserver(()=>render());ro.observe(stage);stage._carouselResizeObserver=ro}else window.addEventListener('resize',()=>render(),{passive:true});
    render(0,true);
  })
}

function showMenu(force){const next=force??!$('#menuLayer').classList.contains('show');$('#menuLayer').classList.toggle('show',next);document.body.classList.toggle('menu-open',next);$('#menuLayer').setAttribute('aria-hidden',String(!next));$('#menuBtn').setAttribute('aria-expanded',String(next))}
$('#menuBtn').onclick=()=>showMenu();$('#menuLayer').addEventListener('click',e=>{if(e.target===$('#menuLayer'))showMenu(false)});$('#careMenuToggle').onclick=()=>$('#careSub').toggleAttribute('hidden');

function pageShell(title,lead,body){return `<div class="pageHero"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(lead)}</p></div>${body}`}
function servicesPage(){return pageShell(tr('servicesHeading'),tr('servicesSub'),`<section class="carouselSection"><div>${carouselMarkup('page-services',serviceCards('services'))}</div></section><div class="infoNote">${lang==='ru'?'Рекомендации зависят от конкретной клинической ситуации. Ora помогает выбрать следующий шаг, но диагноз и план лечения подтверждает стоматолог.':'Recommendations depend on your clinical situation. Ora can guide the next step, but diagnosis and treatment are confirmed by a dentist.'}</div>`)}
function pricingPage(){return pageShell(tr('pricingHeading'),tr('pricingSub'),`<section class="carouselSection"><div>${carouselMarkup('page-pricing',serviceCards('pricing'))}</div></section><div class="infoNote"><strong>${lang==='ru'?'Важно:':'Important:'}</strong> ${lang==='ru'?'это иллюстративные диапазоны USD для интерфейса, а не подтвержденный прайс OraVera. Перед запуском их нужно заменить утвержденным прайс-листом клиники.':'These are illustrative USD ranges for the interface, not verified OraVera prices. Replace them with the clinic-approved price list before launch.'}</div>`)}
function reviewsPage(){return pageShell(tr('reviewsHeading'),tr('reviewsSub'),`<section class="carouselSection"><div>${carouselMarkup('page-reviews',reviewCards())}</div></section><div class="infoNote">${lang==='ru'?'Отзывы в этом прототипе демонстрационные. В production здесь должны быть подтвержденные отзывы и источник.':'Reviews in this prototype are demo content. Production should connect verified reviews and sources.'}</div>`)}
function worksPage(){const cards=services.slice(0,4).map((s,i)=>`<article class="docCard"><div class="eyebrow">DEMO CASE ${String(i+1).padStart(2,'0')}</div><h4>${escapeHtml(loc(s.title))}</h4><p>${escapeHtml(lang==='ru'?'Место для подтвержденных клинических фотографий «до / после». Реальные изображения и согласия пациентов должны быть подключены до запуска.':'Placeholder for verified before / after clinical media. Real images and patient permissions must be connected before launch.')}</p><div style="height:150px;margin-top:20px;border-radius:14px;background:linear-gradient(135deg,#d9e7f3,#efe3de 48%,#c7d9e7);position:relative;overflow:hidden"><span style="position:absolute;left:10px;bottom:10px;padding:5px 8px;border-radius:99px;background:#fff;font-size:8px">BEFORE</span><span style="position:absolute;right:10px;bottom:10px;padding:5px 8px;border-radius:99px;background:#fff;font-size:8px">AFTER</span></div></article>`).join('');return pageShell(lang==='ru'?'Наши работы':'Before & after',lang==='ru'?'Галерея готова для подтвержденных материалов клиники.':'The gallery is ready for verified clinic media.',`<div class="docGrid">${cards}</div>`)}
function aboutPage(){return pageShell(lang==='ru'?'Лечение начинается с разговора':'Care starts with a conversation',lang==='ru'?'Ora помогает понять варианты до приезда в клинику.':'Ora helps you understand your options before you arrive at the clinic.',`<div class="docGrid"><article class="docCard"><h4>${lang==='ru'?'О OraVera':'About OraVera'}</h4><p>${lang==='ru'?'OraVera - стоматологическая клиника в Майами с пациентским интерфейсом, построенным вокруг Ora. Пациент может узнать об услугах и ориентировочной стоимости, отправить фото, проверить страховку и записаться.':'OraVera is a Miami dental clinic experience centered on Ora. Patients can explore care and estimated costs, send photos, check insurance, and book.'}</p></article><article class="docCard"><h4>${lang==='ru'?'Что делает Ora':'What Ora does'}</h4><ul><li>${lang==='ru'?'Помогает ориентироваться в услугах и следующих шагах':'Guides services and next steps'}</li><li>${lang==='ru'?'Собирает информацию перед визитом':'Collects useful pre-visit context'}</li><li>${lang==='ru'?'Открывает нужные разделы сайта прямо из чата':'Opens relevant site sections from chat'}</li><li>${lang==='ru'?'Помогает с записью и страховкой':'Helps with booking and insurance'}</li></ul></article></div><div class="infoNote">${lang==='ru'?'Ora дает общую информацию и помогает с intake. Диагноз и решения по лечению принимает лицензированный специалист.':'Ora provides general guidance and intake support. Diagnosis and treatment decisions are made by a licensed clinician.'}</div>`)}
function faqPage(){const qa=[
 [tr('faq1q'),lang==='ru'?'Да. Если есть время на сегодня, Ora покажет его в сценарии записи. Доступность должна поступать из реальной системы расписания клиники.':'Yes. If a same-day time is available, Ora can show it during booking. Production availability must come from the clinic scheduling system.'],
 [tr('faq2q'),lang==='ru'?'Нет. Фото могут помочь с предварительной ориентировкой, но причину и лечение должен подтвердить стоматолог очно.':'No. Photos can support preliminary guidance, but a dentist needs to confirm the cause and treatment in person.'],
 [tr('faq3q'),lang==='ru'?'Да. Можно передать страховую компанию и member ID, чтобы клиника помогла проверить покрытие до лечения.':'Yes. Share your insurance company and member ID so the clinic can help verify coverage before treatment.']
];return pageShell(tr('faqHeading'),tr('faqSub'),`<div class="docGrid">${qa.map(([q,a])=>`<article class="docCard"><h4>${escapeHtml(q)}</h4><p>${escapeHtml(a)}</p></article>`).join('')}</div>`)}
function locationPage(){return pageShell(tr('locationHeading'),tr('locationSub'),`<div class="docGrid"><article class="docCard"><h4>Miami, Florida</h4><p>${lang==='ru'?'Точный адрес, телефон, email, парковка и часы работы должны быть подключены из подтвержденных данных клиники перед production-запуском.':'Exact address, phone, email, parking details and office hours should be connected from verified clinic data before production launch.'}</p><div class="locationMark">⌖</div></article><article class="docCard"><h4>${lang==='ru'?'Запись и вопросы':'Appointments & questions'}</h4><p>${lang==='ru'?'Используйте строку Ora внизу или кнопку «Позвонить Ora». Для угрожающей жизни экстренной ситуации в США звоните 911.':'Use the Ora input below or Call Ora. For a life-threatening emergency in the United States, call 911.'}</p><div class="detailActions"><button class="actionBtn primary" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article></div>`)}
function legalPage(type){const privacy=type==='privacy';return pageShell(privacy?tr('privacy'):tr('terms'),privacy?(lang==='ru'?'Как могут использоваться данные в интерфейсе Ora.':'How information may be handled in the Ora experience.'):(lang==='ru'?'Правила использования пациентского интерфейса.':'Rules for using the patient interface.'),`<div class="docGrid"><article class="docCard"><h4>${privacy?(lang==='ru'?'Информация, которой вы делитесь':'Information you may share'):(lang==='ru'?'Использование Ora':'Using Ora')}</h4><p>${privacy?(lang==='ru'?'Это могут быть контактные данные, сведения о записи, сообщения чата, описания симптомов, фотографии, страховая информация и данные звонка.':'This can include contact details, appointment data, chat messages, symptom descriptions, photos, insurance information and call data.'):(lang==='ru'?'Ora дает общую информацию и помогает подготовиться к визиту. Она не заменяет стоматолога, врача или экстренную службу.':'Ora provides general information and helps prepare for a visit. It does not replace a dentist, physician or emergency service.')}</p></article><article class="docCard"><h4>${privacy?(lang==='ru'?'Ваш выбор':'Your choices'):(lang==='ru'?'Цены и запись':'Pricing & appointments')}</h4><p>${privacy?(lang==='ru'?'Вы сами выбираете, чем делиться, и можете завершить звонок в любой момент. Production должен определить сроки хранения, права доступа и требования применимого законодательства.':'You choose what to share and may end a call at any time. Production must define retention, access controls, and applicable legal requirements.'):(lang==='ru'?'Время приема зависит от доступности и подтверждения клиникой. Ценовые диапазоны и страховые оценки информационные; итог зависит от клинической ситуации.':'Appointment times depend on clinic availability and confirmation. Price ranges and insurance estimates are informational; final amounts depend on clinical needs.')}</p></article></div><div class="infoNote">${lang==='ru'?'Текст прототипа требует юридической и privacy-проверки перед production.':'Prototype text requires healthcare/privacy legal review before production.'}</div>`)}
function insurancePage(){return pageShell(lang==='ru'?'Проверить страховку':'Check your insurance',lang==='ru'?'Введите данные страховки. Результат в этом автономном HTML демонстрационный.':'Enter insurance details. The result in this standalone HTML is a demo.',`<div class="flow"><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${lang==='ru'?'Страховая компания':'Insurance company'}</label><input id="insProvider" placeholder="e.g. Aetna"></div><div class="field"><label>Member ID</label><input id="insMember" placeholder="ID"></div></div><div class="flowActions"><button class="flowBtn primary" type="button" id="verifyInsurance">${lang==='ru'?'Проверить покрытие':'Check coverage'}</button></div><div id="insuranceResult"></div></div></div>`)}

function openPage(type,key='',preserveScroll=false){showMenu(false);$('#pageLayer').classList.add('show');$('#pageLayer').setAttribute('aria-hidden','false');$('#pageLayer').dataset.page=type;$('#pageLayer').dataset.key=key||'';let title='',html='';if(type==='services'){title=tr('services');html=servicesPage()}else if(type==='pricing'){title=tr('prices');html=pricingPage()}else if(type==='reviews'){title=tr('reviews');html=reviewsPage()}else if(type==='works'){title=tr('ourWork');html=worksPage()}else if(type==='about'){title=tr('about');html=aboutPage()}else if(type==='faq'){title=tr('faq');html=faqPage()}else if(type==='location'){title=tr('location');html=locationPage()}else if(type==='insurance'){title=tr('insurance');html=insurancePage()}else if(type==='booking'){title=tr('bookVisit');renderBooking(booking.step||1);return}else if(type==='privacy'||type==='terms'){title=type==='privacy'?tr('privacy'):tr('terms');html=legalPage(type)}else if(type==='service'){const s=services.find(x=>x.key===key)||services[0];title=loc(s.title);html=serviceDetailPage(s)}$('#pageTitle').textContent=title;$('#pageBody').innerHTML=html;hydrateCarousels($('#pageBody'));bindPageInteractions();if(!preserveScroll)$('#pageView').scrollTop=0}
function closePage(){$('#pageLayer').classList.remove('show');$('#pageLayer').setAttribute('aria-hidden','true');$('#pageLayer').dataset.page='';$('#pageLayer').dataset.key=''}
$('#pageClose').onclick=closePage;$('#brand').onclick=()=>{closePage();showMenu(false);$('#viewport').scrollTo({top:0,behavior:'smooth'})}

function serviceDetailPage(s){const implant=s.key==='implant';const breakdown=implant?`<div class="breakdown"><div class="breakRow"><span>Implant fixture</span><span>$900-$1,300</span></div><div class="breakRow"><span>Abutment</span><span>$250-$450</span></div><div class="breakRow"><span>Crown</span><span>$900-$1,500</span></div><div class="breakRow"><span>Imaging / diagnostics</span><span>$100-$250</span></div></div>`:`<div class="infoNote">${escapeHtml(loc(s.short))}</div>`;return `<div class="serviceDetail"><article class="detailCard"><div class="eyebrow">${lang==='ru'?'ОРИЕНТИРОВОЧНЫЙ ДИАПАЗОН':'ILLUSTRATIVE RANGE'}</div><h3>${escapeHtml(loc(s.title))}</h3><div class="detailRange">${escapeHtml(s.price)}</div><p>${escapeHtml(loc(s.desc))}</p>${breakdown}<div class="detailActions"><button class="actionBtn" data-page="reviews">${escapeHtml(tr('reviews'))}</button><button class="actionBtn" data-page="insurance">${escapeHtml(tr('insurance'))}</button><button class="actionBtn primary" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article><aside class="detailCard"><h3 style="font-size:24px">${lang==='ru'?'Что может изменить итог':'What can change the total'}</h3><p>${implant?(lang==='ru'?'Удаление, костная пластика, синус-лифтинг или временный зуб могут потребоваться дополнительно. Реклама «имплант от $999» иногда относится только к самому импланту, а не к полностью восстановленному зубу.':'Extraction, bone grafting, sinus lift, or a temporary tooth may be additional. An ad such as “implant from $999” can refer only to the fixture, not the complete restored tooth.'):(lang==='ru'?'Точная стоимость подтверждается после осмотра и зависит от клинической необходимости, материала и дополнительных процедур.':'Exact cost is confirmed after an exam and depends on clinical needs, materials, and any additional procedures.')}</p><div class="infoNote">${lang==='ru'?'Цены прототипа - не подтвержденный прайс клиники.':'Prototype prices are not a verified clinic price list.'}</div></aside></div>`}

function bindPageInteractions(){const v=$('#pageBody');v.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.page,b.dataset.key||''));const verify=v.querySelector('#verifyInsurance');if(verify)verify.onclick=()=>{const provider=$('#insProvider').value.trim();const result=$('#insuranceResult');if(!provider){result.innerHTML=`<div class="flowError show">${lang==='ru'?'Введите страховую компанию.':'Enter your insurance company.'}</div>`;return}verify.disabled=true;verify.textContent=lang==='ru'?'Проверяем…':'Checking…';setTimeout(()=>{verify.disabled=false;verify.textContent=lang==='ru'?'Проверить покрытие':'Check coverage';result.innerHTML=`<div class="infoNote" style="margin-top:16px"><strong>${lang==='ru'?'Проверка завершена':'Coverage check complete'}</strong><br>${lang==='ru'?'Покрытие может быть доступно. Точные льготы и расходы пациента зависят от плана и лечения; клиника должна подтвердить их перед лечением.':'Coverage may be available. Exact benefits and out-of-pocket cost depend on the plan and treatment; the clinic must confirm them before treatment.'}<div class="detailActions"><button class="actionBtn primary" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div>`;bindPageInteractions();},600)}}

function renderBooking(step=1){booking.step=step;$('#pageLayer').classList.add('show');$('#pageLayer').setAttribute('aria-hidden','false');$('#pageLayer').dataset.page='booking';$('#pageTitle').textContent=tr('bookVisit');let body='';if(step===1){body=`<div class="flow"><div class="flowTop"><div><h3>${lang==='ru'?'Выберите прием и время':'Choose visit and time'}</h3><p>${lang==='ru'?'Выберите тип визита, день и доступное время.':'Pick the visit type, day, and an available time.'}</p></div><span class="stepPill">1 / 3</span></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'Тип визита':'Visit type'}</span><div class="choiceGrid">${[['emergency',lang==='ru'?'Боль / срочно':'Tooth pain / urgent'],['exam',lang==='ru'?'Осмотр / консультация':'Exam / consultation'],['cleaning',lang==='ru'?'Чистка':'Cleaning']].map(([k,l])=>`<button class="choice ${booking.visit===k?'active':''}" type="button" data-book-choice="visit" data-value="${k}">${l}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'День':'Day'}</span><div class="choiceGrid">${[['today',lang==='ru'?'Сегодня':'Today'],['tomorrow',lang==='ru'?'Завтра':'Tomorrow'],['next',lang==='ru'?'Ближайший':'Next available']].map(([k,l])=>`<button class="choice ${booking.day===k?'active':''}" type="button" data-book-choice="day" data-value="${k}">${l}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'Время':'Time'}</span><div class="timeGrid">${['9:00 AM','10:30 AM','12:00 PM','2:30 PM','4:00 PM','5:30 PM'].map(t=>`<button class="timeBtn ${booking.time===t?'active':''}" type="button" data-book-time="${t}">${t}</button>`).join('')}</div><div class="flowActions"><button class="flowBtn primary" id="bookingNext" type="button" ${!(booking.visit&&booking.day&&booking.time)?'disabled':''}>${lang==='ru'?'Продолжить':'Continue'}</button></div></div></div>`}else if(step===2){body=`<div class="flow"><div class="flowTop"><div><h3>${lang==='ru'?'Ваши данные':'Your details'}</h3><p>${lang==='ru'?'Оставьте имя и контакт, затем выберите способ оплаты.':'Leave your name and contact information, then choose payment.'}</p></div><span class="stepPill">2 / 3</span></div><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${lang==='ru'?'Имя и фамилия':'Full name'}</label><input id="bookName" value="${escapeHtml(booking.name)}" placeholder="Patient name"></div><div class="field"><label>${lang==='ru'?'Телефон или email':'Phone or email'}</label><input id="bookContact" value="${escapeHtml(booking.contact)}" placeholder="Phone or email"></div></div></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'Страховка и оплата':'Insurance & payment'}</span><div class="choiceGrid"><button class="choice ${booking.payment==='insurance'?'active':''}" type="button" data-book-choice="payment" data-value="insurance">${lang==='ru'?'Есть страховка':'I have insurance'}</button><button class="choice ${booking.payment==='self'?'active':''}" type="button" data-book-choice="payment" data-value="self">${lang==='ru'?'Оплачу сам(а)':'Self-pay'}</button><button class="choice ${booking.payment==='unsure'?'active':''}" type="button" data-book-choice="payment" data-value="unsure">${lang==='ru'?'Пока не знаю':'Not sure yet'}</button></div>${booking.payment==='insurance'?`<div class="fieldGrid" style="margin-top:12px"><div class="field"><label>${lang==='ru'?'Страховая компания':'Insurance company'}</label><input id="bookProvider" value="${escapeHtml(booking.provider)}"></div><div class="field"><label>Member ID</label><input id="bookMember" value="${escapeHtml(booking.memberId)}"></div></div>`:''}<div class="flowError" id="bookingError">${lang==='ru'?'Введите имя, корректный контакт и выберите способ оплаты.':'Enter your name, a valid contact, and choose payment.'}</div><div class="flowActions"><button class="flowBtn" id="bookingBack" type="button">${lang==='ru'?'Назад':'Back'}</button><button class="flowBtn primary" id="bookingReview" type="button">${lang==='ru'?'Проверить запись':'Review appointment'}</button></div></div></div>`}else if(step===3){const visit={emergency:lang==='ru'?'Боль / срочно':'Tooth pain / urgent',exam:lang==='ru'?'Осмотр / консультация':'Exam / consultation',cleaning:lang==='ru'?'Чистка':'Cleaning'}[booking.visit];const day={today:lang==='ru'?'Сегодня':'Today',tomorrow:lang==='ru'?'Завтра':'Tomorrow',next:lang==='ru'?'Ближайший доступный':'Next available'}[booking.day];body=`<div class="flow"><div class="flowTop"><div><h3>${lang==='ru'?'Проверьте запись':'Review your appointment'}</h3><p>${lang==='ru'?'Проверьте детали перед подтверждением.':'Check the details before you confirm.'}</p></div><span class="stepPill">3 / 3</span></div><div class="summary"><div class="summaryRow"><span>${lang==='ru'?'Визит':'Visit'}</span><b>${escapeHtml(visit)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Когда':'When'}</span><b>${escapeHtml(day)} · ${escapeHtml(booking.time)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Пациент':'Patient'}</span><b>${escapeHtml(booking.name)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Контакт':'Contact'}</span><b>${escapeHtml(booking.contact)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Оплата':'Payment'}</span><b>${escapeHtml(booking.payment==='insurance'?(booking.provider||'Insurance'):booking.payment==='self'?'Self-pay':'Not sure yet')}</b></div></div><div class="flowActions"><button class="flowBtn" id="bookingBack" type="button">${lang==='ru'?'Назад':'Back'}</button><button class="flowBtn primary" id="bookingConfirm" type="button">${lang==='ru'?'Подтвердить запись':'Confirm appointment'}</button></div></div>`}else{body=`<div class="flow"><div class="successMark">✓</div><div class="flowTop"><div><h3>${lang==='ru'?'Запись подтверждена':'Appointment confirmed'}</h3><p>${lang==='ru'?'Запись сохранена в прототипе. Production должен подтвердить время через реальную систему расписания клиники.':'The appointment is saved in this prototype. Production must confirm time through the clinic scheduling system.'}</p></div></div><div class="summary"><div class="summaryRow"><span>Confirmation</span><b>${escapeHtml(booking.confirmation)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Место':'Location'}</span><b>OraVera · Miami, FL</b></div></div><div class="detailActions"><button class="actionBtn" type="button" data-page="services">${escapeHtml(tr('services'))}</button><button class="actionBtn primary" type="button" id="bookingDone">${lang==='ru'?'Готово':'Done'}</button></div></div>`}$('#pageBody').innerHTML=body;$('#pageView').scrollTop=0;bindBooking()}
function bindBooking(){const body=$('#pageBody');body.querySelectorAll('[data-book-choice]').forEach(b=>b.onclick=()=>{booking[b.dataset.bookChoice]=b.dataset.value;renderBooking(booking.step)});body.querySelectorAll('[data-book-time]').forEach(b=>b.onclick=()=>{booking.time=b.dataset.bookTime;renderBooking(1)});body.querySelector('#bookingNext')?.addEventListener('click',()=>renderBooking(2));body.querySelector('#bookingBack')?.addEventListener('click',()=>renderBooking(Math.max(1,booking.step-1)));body.querySelector('#bookingReview')?.addEventListener('click',()=>{booking.name=$('#bookName').value.trim();booking.contact=$('#bookContact').value.trim();booking.provider=$('#bookProvider')?.value.trim()||booking.provider;booking.memberId=$('#bookMember')?.value.trim()||booking.memberId;const ok=booking.name.length>1&&(/@/.test(booking.contact)||/\d{7,}/.test(booking.contact.replace(/\D/g,'')))&&booking.payment;if(!ok){$('#bookingError').classList.add('show');return}renderBooking(3)});body.querySelector('#bookingConfirm')?.addEventListener('click',()=>{booking.confirmation='OV-'+Math.random().toString(36).slice(2,8).toUpperCase();renderBooking(4);showToast(lang==='ru'?'Запись сохранена':'Appointment saved')});body.querySelector('#bookingDone')?.addEventListener('click',closePage);body.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.page))}

function startCall(){if(document.body.classList.contains('calling'))return;document.body.classList.add('calling');callSec=0;muted=false;updateStaticUi();$('#callTime').textContent='00:00';const phrases=lang==='ru'?['Я здесь. Можно продолжать смотреть сайт.','Скажите, что вас беспокоит.','Я могу открыть услуги, цены или запись.']:lang==='es'?['Estoy aquí. Puedes seguir navegando.','Cuéntame qué te preocupa.','Puedo abrir servicios, precios o la reserva.']:lang==='he'?['אני כאן. אפשר להמשיך לגלוש.','ספרו לי מה מפריע לכם.','אני יכולה לפתוח שירותים, מחירים או קביעת תור.']:['I’m here. You can keep browsing.','Tell me what is bothering you.','I can open services, prices, or booking.'];let i=0;$('#callLive').textContent=phrases[0];clearInterval(callTimer);callTimer=setInterval(()=>{callSec++;$('#callTime').textContent=`${String(Math.floor(callSec/60)).padStart(2,'0')}:${String(callSec%60).padStart(2,'0')}`;if(callSec%5===0)$('#callLive').textContent=phrases[++i%phrases.length]},1000);showToast(lang==='ru'?'Звонок Ora отображается в шапке. Сайт остается доступен.':lang==='es'?'La llamada con Ora aparece en la cabecera. El sitio sigue disponible.':lang==='he'?'השיחה עם Ora מוצגת בכותרת והאתר נשאר זמין.':'Ora call is now in the header. The site stays usable.')}
function stopCall(){if(!document.body.classList.contains('calling'))return;document.body.classList.remove('calling');clearInterval(callTimer);callTimer=null;updateStaticUi();showAnswer(lang==='ru'?'Звонок завершен. Можно продолжить здесь в чате или открыть нужный раздел.':lang==='es'?'La llamada terminó. Puedes seguir aquí en el chat o abrir cualquier sección.':lang==='he'?'השיחה הסתיימה. אפשר להמשיך כאן בצ׳אט או לפתוח כל חלק.':'Call ended. Continue here in chat or open any section.')}$('#headerCall').onclick=startCall;$('#composerCall').onclick=startCall;$('#endCall').onclick=stopCall;$('#muteCall').onclick=()=>{muted=!muted;updateStaticUi()}

function showAnswer(text,actions=[]){$('#answerText').textContent=text;$('#answerActions').innerHTML=actions.map(a=>`<button type="button" data-answer-page="${a.page||''}" data-answer-action="${a.action||''}">${escapeHtml(a.label)}</button>`).join('');$('#assistantAnswer').classList.add('show');$('#answerActions').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.answerPage)openPage(b.dataset.answerPage);if(b.dataset.answerAction==='call')startCall();if(b.dataset.answerAction==='focus'){$('#input').focus()}$('#assistantAnswer').classList.remove('show')});clearTimeout(showAnswer.t);showAnswer.t=setTimeout(()=>$('#assistantAnswer').classList.remove('show'),9000)}
$('#answerClose').onclick=()=>$('#assistantAnswer').classList.remove('show');function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>t.classList.remove('show'),2400)}
function detectIntent(v){v=v.toLowerCase();if(/implant|имплант|implante|שתל/.test(v))return['service','implant'];if(/veneer|винир|carilla|ציפוי/.test(v))return['service','veneers'];if(/crown|коронк|corona|כתר/.test(v))return['service','crown'];if(/cleaning|чистк|limpieza|ניקוי/.test(v))return['service','cleaning'];if(/urgent|emergency|сроч|боль|pain|urgente|דחוף|כאב/.test(v))return['service','emergency'];if(/exam|consultation|осмотр|консультац|examen|consulta|בדיקה|ייעוץ/.test(v))return['service','exam'];if(/review|testimonial|отзыв|reseñ|ביקור/.test(v))return['reviews'];if(/before|after|our work|работ|до и после|antes|עבוד/.test(v))return['works'];if(/price|pricing|cost|how much|цена|стоим|сколько|precio|cuánto|מחיר|עלות/.test(v))return['pricing'];if(/insurance|seguro|страх|ביטוח/.test(v))return['insurance'];if(/book|appointment|запис|при[её]м|cita|reserv|תור/.test(v))return['booking'];if(/faq|question|вопрос|pregunta|שאל/.test(v))return['faq'];if(/address|location|contact|phone|адрес|контакт|ubicaci|direcci|מיקום|כתובת/.test(v))return['location'];if(/about|oraVera|о клиник|о вас|sobre|אודות/.test(v))return['about'];if(/call|voice|звон|llam|קול|שיחה/.test(v))return['call'];return['generic']}
function handleText(text){const [intent,key]=detectIntent(text);if(intent==='service'){showAnswer(lang==='ru'?'Открываю нужную услугу и диапазон стоимости.':'Opening the relevant service and price range.');openPage('service',key);return}if(['services','pricing','reviews','works','insurance','booking','faq','location','about'].includes(intent)){showAnswer(lang==='ru'?'Открываю нужный раздел. Строка Ora остается доступна внизу.':'Opening the relevant section. The Ora input stays available below.');openPage(intent);return}if(intent==='call'){startCall();return}showAnswer(lang==='ru'?'Я могу открыть услуги, цены и страховку, отзывы, работы, вопросы или запись. Можно также отправить фото.':'I can open services, prices & insurance, reviews, work, questions, or booking. You can also attach mouth photos.',[{label:tr('services'),page:'services'},{label:tr('prices'),page:'pricing'},{label:tr('bookVisit'),page:'booking'}])}

const input=$('#input'),sendBtn=$('#sendBtn'),composer=$('#composer');function resizeInput(){input.style.height='auto';const max=innerWidth<=720?76:92;input.style.height=Math.min(input.scrollHeight,max)+'px';input.style.overflowY=input.scrollHeight>max?'auto':'hidden';sendBtn.disabled=!input.value.trim()&&!attachments.length}input.oninput=resizeInput;input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(input.value.trim()||attachments.length)composer.requestSubmit()}};composer.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text&&!attachments.length)return;const hadPhotos=attachments.length>0;input.value='';attachments=[];renderAttachments();resizeInput();if(hadPhotos){showAnswer(lang==='ru'?'Фото добавлены. Они могут помочь с предварительной ориентировкой, но не заменяют очный диагноз. Хотите записаться?':'Photos added. They can support preliminary guidance but do not replace an in-person diagnosis. Would you like to book?',[{label:tr('bookVisit'),page:'booking'},{label:tr('callOra'),action:'call'}]);if(!text)return}handleText(text)};
$('#attachBtn').onclick=()=>$('#attachmentInput').click();$('#attachmentInput').onchange=e=>{[...e.target.files].slice(0,6).forEach(f=>attachments.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name:f.name}));e.target.value='';renderAttachments();resizeInput()};function renderAttachments(){$('#attachmentChips').innerHTML=attachments.map(a=>`<span class="attachmentChip"><span>${escapeHtml(a.name)}</span><button type="button" data-remove="${a.id}">×</button></span>`).join('');$$('[data-remove]').forEach(b=>b.onclick=()=>{attachments=attachments.filter(a=>a.id!==b.dataset.remove);renderAttachments();resizeInput()})}

function bindGlobal(){document.addEventListener('click',e=>{const page=e.target.closest('[data-page]');if(page&&!page.closest('#pageBody')){e.preventDefault();openPage(page.dataset.page,page.dataset.key||'')}const focus=e.target.closest('[data-focus-composer]');if(focus){e.preventDefault();$('#input').focus()}const langBtn=e.target.closest('[data-set-lang]');if(langBtn){e.preventDefault();setLanguage(langBtn.dataset.setLang)}});$('#bookHeader').onclick=()=>openPage('booking');$('#menuBook').onclick=()=>openPage('booking');window.addEventListener('resize',resizeInput,{passive:true})}


/* ===== v36 chat-only architecture ===== */
let chatInstance=0;
let activeBookingRoot=null;

function chatWelcomeCopy(){
  const copy={
    en:['Hi, I’m Ora. How can I help?','Ask about treatment, prices, insurance, our work or reviews, send mouth photos, or book an appointment. I’ll show the relevant part of OraVera right here in our conversation.'],
    ru:['Здравствуйте, я Ora. Чем помочь?','Спросите про лечение, цены, страховку, наши работы или отзывы, отправьте фото полости рта или запишитесь. Нужный блок OraVera я покажу прямо здесь, в разговоре.'],
    es:['Hola, soy Ora. ¿Cómo puedo ayudarte?','Pregunta por tratamientos, precios, seguro, trabajos o reseñas, envía fotos o reserva una cita. Te mostraré la parte necesaria de OraVera aquí mismo, dentro de la conversación.'],
    he:['היי, אני Ora. איך אפשר לעזור?','אפשר לשאול על טיפולים, מחירים, ביטוח, עבודות או ביקורות, לשלוח תמונות או לקבוע תור. אציג את החלק המתאים של OraVera כאן בתוך השיחה.']
  };
  return copy[lang]||copy.en;
}
function updateWelcome(){
  const [title,copy]=chatWelcomeCopy();
  const t=$('[data-chat-welcome-title]'),p=$('[data-chat-welcome-copy]');
  if(t)t.textContent=title;if(p)p.textContent=copy;
}
function addUserMessage(text){
  const el=document.createElement('section');el.className='chatTurn userTurn';
  const bubble=document.createElement('div');bubble.className='userBubbleChat';bubble.textContent=text;el.appendChild(bubble);$('#site').appendChild(el);
  requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'end'}));return el;
}
function addOraText(text,actions=[]){
  const el=document.createElement('section');el.className='chatTurn assistantTurn';
  el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="chatBubble"><div class="chatText"></div>${actions.length?`<div class="inlineActions">${actions.map(a=>`<button type="button" class="${a.primary?'primary':''}" data-answer-page="${a.page||''}" data-answer-action="${a.action||''}">${escapeHtml(a.label)}</button>`).join('')}</div>`:''}</div></div>`;
  el.querySelector('.chatText').textContent=text;$('#site').appendChild(el);
  el.querySelectorAll('[data-answer-page],[data-answer-action]').forEach(b=>b.onclick=()=>{if(b.dataset.answerPage)openPage(b.dataset.answerPage);if(b.dataset.answerAction==='call')startCall();if(b.dataset.answerAction==='focus')$('#input').focus()});
  requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'end'}));return el;
}
function chatHeader(kicker,title,copy){return `<div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(kicker)}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div></div>`}
function faqChatMarkup(){const qa=[
 [tr('faq1q'),lang==='ru'?'Да. Если есть доступное время на сегодня, Ora покажет его в записи.':'Yes. If a same-day time is available, Ora can show it during booking.'],
 [tr('faq2q'),lang==='ru'?'Фото могут помочь с предварительной ориентировкой, но диагноз и лечение должен подтвердить стоматолог очно.':'Photos can support preliminary guidance, but a dentist needs to confirm diagnosis and treatment in person.'],
 [tr('faq3q'),lang==='ru'?'Да. Передайте страховую компанию и Member ID, чтобы проверить возможное покрытие до лечения.':'Yes. Share your insurance company and Member ID to check possible coverage before treatment.']
];return `<div class="chatFaq">${qa.map(([q,a])=>`<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('')}</div>`}
function worksChatMarkup(){const items=services.slice(0,4);return `<div class="chatGrid">${items.map((s,i)=>`<article class="chatInfoCard"><div class="chatContentKicker">${lang==='ru'?'ДО / ПОСЛЕ':'BEFORE / AFTER'}</div><h3>${escapeHtml(loc(s.title))}</h3><div class="workMiniVisual case-${i%3}"><span>Before</span><span>After</span></div><p>${escapeHtml(loc(s.short))}</p><div class="inlineActions"><button type="button" data-page="service" data-key="${s.key}">${lang==='ru'?'Подробнее':'View details'}</button></div></article>`).join('')}</div>`}
function aboutChatMarkup(){return `<div class="chatGrid"><article class="chatInfoCard"><h3>Miami</h3><p>${lang==='ru'?'Стоматологическая помощь в Майами.':'Dental care in Miami.'}</p></article><article class="chatInfoCard"><h3>${lang==='ru'?'4 языка':'4 languages'}</h3><p>English · Español · Русский · עברית</p></article><article class="chatInfoCard"><h3>${lang==='ru'?'Один разговор':'One conversation'}</h3><p>${lang==='ru'?'Вопросы, фото, страховка, голос и запись остаются в одном контексте.':'Questions, photos, insurance, voice and booking stay in one context.'}</p></article><article class="chatInfoCard"><h3>Ora</h3><p>${lang==='ru'?'ИИ-ассистент помогает ориентироваться и готовиться к визиту, но не заменяет врача.':'The AI assistant helps with navigation and visit preparation, but does not replace a clinician.'}</p></article></div>`}
function locationChatMarkup(){return `<div class="chatGrid"><article class="chatInfoCard"><h3>OraVera · Miami, Florida</h3><p>${lang==='ru'?'Точный адрес, телефон, email, часы и парковку нужно подключить из подтвержденных данных клиники перед production.':'Exact address, phone, email, hours and parking should be connected from verified clinic data before production.'}</p><div class="locationMark">⌖</div></article><article class="chatInfoCard"><h3>${lang==='ru'?'Запись и вопросы':'Appointments & questions'}</h3><p>${lang==='ru'?'Напишите Ora или позвоните. Для угрожающей жизни экстренной ситуации в США звоните 911.':'Message Ora or call. For a life-threatening emergency in the United States, call 911.'}</p><div class="inlineActions"><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article></div>`}
function insuranceChatMarkup(){return `<div class="flow"><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${lang==='ru'?'Страховая компания':'Insurance company'}</label><input class="insProvider" placeholder="e.g. Aetna"></div><div class="field"><label>Member ID</label><input class="insMember" placeholder="ID"></div></div><div class="flowActions"><button class="flowBtn primary verifyInsuranceChat" type="button">${lang==='ru'?'Проверить покрытие':'Check coverage'}</button></div><div class="insuranceResultChat"></div></div></div>`}
function legalChatMarkup(type){return `<div class="chatGrid"><article class="chatInfoCard"><h3>${type==='privacy'?(lang==='ru'?'Какие данные могут использоваться':'Information you may share'):(lang==='ru'?'Использование Ora':'Using Ora')}</h3><p>${type==='privacy'?(lang==='ru'?'Контактные данные, информация о записи, сообщения, описания симптомов, фото, страховка и данные звонка.':'Contact details, appointment information, messages, symptom descriptions, photos, insurance and call data.'):(lang==='ru'?'Ora дает общую информацию и помогает готовиться к визиту. Она не заменяет стоматолога или экстренную службу.':'Ora provides general information and helps prepare for a visit. It does not replace a dentist or emergency service.')}</p></article><article class="chatInfoCard"><h3>${lang==='ru'?'Важно':'Important'}</h3><p>${lang==='ru'?'Это текст прототипа. Перед production требуется healthcare/privacy review.':'This is prototype copy. Healthcare/privacy review is required before production.'}</p></article></div>`}
function chatMarkup(type,key=''){
  if(type==='services')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'УСЛУГИ':'SERVICES',tr('servicesHeading'),lang==='ru'?'Выберите услугу или просто опишите, что беспокоит. Карточки двигаются как в референсе: + раскрывает выбранную карточку, стрелки и свайп переключают активную.':'Choose a service or just describe what is bothering you. Cards move like the reference: + expands a card, arrows and swipe change the active card.')}<div class="chatContentBody">${carouselMarkup('chat-services-'+(++chatInstance),serviceCards('services'))}</div></div>`;
  if(type==='pricing')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ЦЕНЫ И СТРАХОВКА':'PRICES & INSURANCE',tr('pricingHeading'),tr('pricingSub'))}<div class="chatContentBody">${carouselMarkup('chat-pricing-'+(++chatInstance),serviceCards('pricing'))}<div class="inlineActions"><button type="button" data-page="insurance">${escapeHtml(tr('insurance'))}</button><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div></div>`;
  if(type==='reviews')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ОТЗЫВЫ':'REVIEWS',tr('reviewsHeading'),tr('reviewsSub'))}<div class="chatContentBody">${carouselMarkup('chat-reviews-'+(++chatInstance),reviewCards())}</div></div>`;
  if(type==='works')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'НАШИ РАБОТЫ':'OUR WORK',tr('ourWork'),lang==='ru'?'Примеры лечения должны быть заменены на проверенные клинические материалы перед запуском.':'Treatment examples should be replaced with verified clinical media before launch.')}<div class="chatContentBody">${worksChatMarkup()}</div></div>`;
  if(type==='about')return `<div class="chatContentCard">${chatHeader('ORAVERA',tr('about'),lang==='ru'?'Вся информация и действия собраны вокруг разговора с Ora.':'Information and actions are organized around the conversation with Ora.')}<div class="chatContentBody">${aboutChatMarkup()}</div></div>`;
  if(type==='faq')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ВОПРОСЫ':'QUESTIONS',tr('faqHeading'),tr('faqSub'))}<div class="chatContentBody">${faqChatMarkup()}</div></div>`;
  if(type==='location')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'КОНТАКТЫ':'LOCATION & CONTACT',tr('locationHeading'),tr('locationSub'))}<div class="chatContentBody">${locationChatMarkup()}</div></div>`;
  if(type==='insurance')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'СТРАХОВКА':'INSURANCE',lang==='ru'?'Проверить страховку':'Check your insurance',lang==='ru'?'Введите данные страховки. В автономном прототипе результат демонстрационный.':'Enter insurance details. In this standalone prototype the result is a demo.')}<div class="chatContentBody">${insuranceChatMarkup()}</div></div>`;
  if(type==='privacy'||type==='terms')return `<div class="chatContentCard">${chatHeader('ORAVERA',type==='privacy'?tr('privacy'):tr('terms'),'')}<div class="chatContentBody">${legalChatMarkup(type)}</div></div>`;
  if(type==='service'){const s=services.find(x=>x.key===key)||services[0];return `<div class="chatContentCard">${chatHeader(lang==='ru'?'УСЛУГА':'SERVICE',loc(s.title),loc(s.short))}<div class="chatContentBody">${serviceDetailPage(s)}</div></div>`}
  return '';
}
function addOraBlock(html,type='block'){
  const el=document.createElement('section');el.className='chatTurn assistantTurn contentTurn';el.dataset.chatType=type;
  el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="chatBlockHost"></div></div>`;
  el.querySelector('.chatBlockHost').innerHTML=html;$('#site').appendChild(el);hydrateCarousels(el);bindChatRoot(el);
  requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'start'}));return el;
}
function bindChatRoot(root){
  root.querySelectorAll('[data-page]').forEach(b=>{b.onclick=e=>{e.preventDefault();openPage(b.dataset.page,b.dataset.key||'')}});
  const verify=root.querySelector('.verifyInsuranceChat');if(verify)verify.onclick=()=>{const provider=root.querySelector('.insProvider')?.value.trim();const box=root.querySelector('.insuranceResultChat');if(!provider){box.innerHTML=`<div class="flowError show">${lang==='ru'?'Введите страховую компанию.':'Enter your insurance company.'}</div>`;return}verify.disabled=true;verify.textContent=lang==='ru'?'Проверяем…':'Checking…';setTimeout(()=>{verify.disabled=false;verify.textContent=lang==='ru'?'Проверить покрытие':'Check coverage';box.innerHTML=`<div class="infoNote" style="margin-top:14px"><strong>${lang==='ru'?'Проверка завершена':'Coverage check complete'}</strong><br>${lang==='ru'?'Покрытие может быть доступно. Точные льготы и расходы подтверждает клиника перед лечением.':'Coverage may be available. Exact benefits and out-of-pocket cost are confirmed by the clinic before treatment.'}<div class="inlineActions"><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div>`;bindChatRoot(root)},550)};
}

openPage=function(type,key=''){
  showMenu(false);
  if(type==='booking'){activeBookingRoot=null;booking.step=booking.step||1;renderBooking(booking.step);return}
  const html=chatMarkup(type,key);if(!html)return;addOraBlock(html,type);
};
closePage=function(){};
showAnswer=function(text,actions=[]){addOraText(text,actions)};

function bookingMarkup(step){
  if(step===1)return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${lang==='ru'?'ЗАПИСЬ':'BOOKING'}</div><h2>${lang==='ru'?'Выберите прием и время':'Choose visit and time'}</h2><p>${lang==='ru'?'Выберите тип визита, день и доступное время.':'Pick the visit type, day, and an available time.'}</p></div><span class="stepPill">1 / 3</span></div><div class="chatContentBody"><div class="flow"><div class="flowSection"><span class="flowLabel">${lang==='ru'?'Тип визита':'Visit type'}</span><div class="choiceGrid">${[['emergency',lang==='ru'?'Боль / срочно':'Tooth pain / urgent'],['exam',lang==='ru'?'Осмотр / консультация':'Exam / consultation'],['cleaning',lang==='ru'?'Чистка':'Cleaning']].map(([k,l])=>`<button class="choice ${booking.visit===k?'active':''}" type="button" data-book-choice="visit" data-value="${k}">${l}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'День':'Day'}</span><div class="choiceGrid">${[['today',lang==='ru'?'Сегодня':'Today'],['tomorrow',lang==='ru'?'Завтра':'Tomorrow'],['next',lang==='ru'?'Ближайший':'Next available']].map(([k,l])=>`<button class="choice ${booking.day===k?'active':''}" type="button" data-book-choice="day" data-value="${k}">${l}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'Время':'Time'}</span><div class="timeGrid">${['9:00 AM','10:30 AM','12:00 PM','2:30 PM','4:00 PM','5:30 PM'].map(t=>`<button class="timeBtn ${booking.time===t?'active':''}" type="button" data-book-time="${t}">${t}</button>`).join('')}</div><div class="flowActions"><button class="flowBtn primary" data-book-next type="button" ${!(booking.visit&&booking.day&&booking.time)?'disabled':''}>${lang==='ru'?'Продолжить':'Continue'}</button></div></div></div></div></div>`;
  if(step===2)return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${lang==='ru'?'ЗАПИСЬ':'BOOKING'}</div><h2>${lang==='ru'?'Ваши данные':'Your details'}</h2><p>${lang==='ru'?'Оставьте имя и контакт, затем выберите способ оплаты.':'Leave your name and contact information, then choose payment.'}</p></div><span class="stepPill">2 / 3</span></div><div class="chatContentBody"><div class="flow"><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${lang==='ru'?'Имя и фамилия':'Full name'}</label><input data-book-input="name" value="${escapeHtml(booking.name)}" placeholder="Patient name"></div><div class="field"><label>${lang==='ru'?'Телефон или email':'Phone or email'}</label><input data-book-input="contact" value="${escapeHtml(booking.contact)}" placeholder="Phone or email"></div></div></div><div class="flowSection"><span class="flowLabel">${lang==='ru'?'Страховка и оплата':'Insurance & payment'}</span><div class="choiceGrid"><button class="choice ${booking.payment==='insurance'?'active':''}" type="button" data-book-choice="payment" data-value="insurance">${lang==='ru'?'Есть страховка':'I have insurance'}</button><button class="choice ${booking.payment==='self'?'active':''}" type="button" data-book-choice="payment" data-value="self">${lang==='ru'?'Оплачу сам(а)':'Self-pay'}</button><button class="choice ${booking.payment==='unsure'?'active':''}" type="button" data-book-choice="payment" data-value="unsure">${lang==='ru'?'Пока не знаю':'Not sure yet'}</button></div>${booking.payment==='insurance'?`<div class="fieldGrid" style="margin-top:12px"><div class="field"><label>${lang==='ru'?'Страховая компания':'Insurance company'}</label><input data-book-input="provider" value="${escapeHtml(booking.provider)}"></div><div class="field"><label>Member ID</label><input data-book-input="memberId" value="${escapeHtml(booking.memberId)}"></div></div>`:''}<div class="flowError" data-book-error>${lang==='ru'?'Введите имя, корректный контакт и выберите способ оплаты.':'Enter your name, a valid contact, and choose payment.'}</div><div class="flowActions"><button class="flowBtn" data-book-back type="button">${lang==='ru'?'Назад':'Back'}</button><button class="flowBtn primary" data-book-review type="button">${lang==='ru'?'Проверить запись':'Review appointment'}</button></div></div></div></div></div>`;
  if(step===3){const visit={emergency:lang==='ru'?'Боль / срочно':'Tooth pain / urgent',exam:lang==='ru'?'Осмотр / консультация':'Exam / consultation',cleaning:lang==='ru'?'Чистка':'Cleaning'}[booking.visit];const day={today:lang==='ru'?'Сегодня':'Today',tomorrow:lang==='ru'?'Завтра':'Tomorrow',next:lang==='ru'?'Ближайший доступный':'Next available'}[booking.day];return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${lang==='ru'?'ЗАПИСЬ':'BOOKING'}</div><h2>${lang==='ru'?'Проверьте запись':'Review your appointment'}</h2><p>${lang==='ru'?'Проверьте детали перед подтверждением.':'Check the details before you confirm.'}</p></div><span class="stepPill">3 / 3</span></div><div class="chatContentBody"><div class="summary"><div class="summaryRow"><span>${lang==='ru'?'Визит':'Visit'}</span><b>${escapeHtml(visit)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Когда':'When'}</span><b>${escapeHtml(day)} · ${escapeHtml(booking.time)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Пациент':'Patient'}</span><b>${escapeHtml(booking.name)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Контакт':'Contact'}</span><b>${escapeHtml(booking.contact)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Оплата':'Payment'}</span><b>${escapeHtml(booking.payment==='insurance'?(booking.provider||'Insurance'):booking.payment==='self'?'Self-pay':'Not sure yet')}</b></div></div><div class="flowActions"><button class="flowBtn" data-book-back type="button">${lang==='ru'?'Назад':'Back'}</button><button class="flowBtn primary" data-book-confirm type="button">${lang==='ru'?'Подтвердить запись':'Confirm appointment'}</button></div></div></div>`}
  return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${lang==='ru'?'ЗАПИСЬ':'BOOKING'}</div><h2>${lang==='ru'?'Запись подтверждена':'Appointment confirmed'}</h2><p>${lang==='ru'?'Запись сохранена в прототипе. Production должен подтвердить время через систему клиники.':'The appointment is saved in this prototype. Production must confirm time through the clinic scheduling system.'}</p></div></div><div class="chatContentBody"><div class="successMark">✓</div><div class="summary"><div class="summaryRow"><span>Confirmation</span><b>${escapeHtml(booking.confirmation)}</b></div><div class="summaryRow"><span>${lang==='ru'?'Место':'Location'}</span><b>OraVera · Miami, FL</b></div></div><div class="inlineActions"><button type="button" data-page="services">${escapeHtml(tr('services'))}</button><button class="primary" type="button" data-book-done>${lang==='ru'?'Готово':'Done'}</button></div></div></div>`;
}
renderBooking=function(step=1){
  booking.step=step;
  if(!activeBookingRoot||!activeBookingRoot.isConnected){activeBookingRoot=addOraBlock('<div data-active-booking></div>','booking').querySelector('[data-active-booking]')}
  activeBookingRoot.innerHTML=bookingMarkup(step);bindChatBooking(activeBookingRoot);hydrateCarousels(activeBookingRoot);
  requestAnimationFrame(()=>activeBookingRoot.closest('.chatTurn')?.scrollIntoView({behavior:'smooth',block:'start'}));
};
function bindChatBooking(root){
  root.querySelectorAll('[data-book-input]').forEach(i=>i.oninput=()=>{booking[i.dataset.bookInput]=i.value});
  root.querySelectorAll('[data-book-choice]').forEach(b=>b.onclick=()=>{booking[b.dataset.bookChoice]=b.dataset.value;renderBooking(booking.step)});
  root.querySelectorAll('[data-book-time]').forEach(b=>b.onclick=()=>{booking.time=b.dataset.bookTime;renderBooking(1)});
  root.querySelector('[data-book-next]')?.addEventListener('click',()=>renderBooking(2));
  root.querySelector('[data-book-back]')?.addEventListener('click',()=>renderBooking(Math.max(1,booking.step-1)));
  root.querySelector('[data-book-review]')?.addEventListener('click',()=>{const ok=booking.name.trim().length>1&&(/@/.test(booking.contact)||/\d{7,}/.test(booking.contact.replace(/\D/g,'')))&&booking.payment;if(!ok){root.querySelector('[data-book-error]')?.classList.add('show');return}renderBooking(3)});
  root.querySelector('[data-book-confirm]')?.addEventListener('click',()=>{booking.confirmation='OV-'+Math.random().toString(36).slice(2,8).toUpperCase();renderBooking(4);showToast(lang==='ru'?'Запись сохранена':'Appointment saved')});
  root.querySelector('[data-book-done]')?.addEventListener('click',()=>addOraText(lang==='ru'?'Готово. Если захотите изменить время или задать вопрос, просто напишите здесь.':'Done. If you want to change the time or ask anything else, just continue here.'));
  bindChatRoot(root);
}

handleText=function(text){
  const [intent,key]=detectIntent(text);
  if(intent==='service'){openPage('service',key);return}
  if(['services','pricing','reviews','works','insurance','booking','faq','location','about'].includes(intent)){openPage(intent);return}
  if(intent==='call'){startCall();return}
  addOraText(lang==='ru'?'Я могу показать прямо здесь услуги, цены и страховку, наши работы, отзывы, вопросы или запись. Можно также приложить фото.':'I can show services, prices & insurance, our work, reviews, questions, or booking right here. You can also attach mouth photos.',[
    {label:tr('services'),page:'services'},{label:tr('prices'),page:'pricing'},{label:tr('bookVisit'),page:'booking',primary:true}
  ]);
};

composer.onsubmit=e=>{
  e.preventDefault();const text=input.value.trim();if(!text&&!attachments.length)return;
  const hadPhotos=attachments.length>0;const photoNames=attachments.map(a=>a.name);input.value='';attachments=[];renderAttachments();resizeInput();
  if(text)addUserMessage(text);else if(hadPhotos)addUserMessage((lang==='ru'?'Фото: ':'Photos: ')+photoNames.join(', '));
  if(hadPhotos){addOraText(lang==='ru'?'Фото добавлены. Они могут помочь с предварительной ориентировкой, но не заменяют очный диагноз. Хотите записаться?':'Photos added. They can support preliminary guidance but do not replace an in-person diagnosis. Would you like to book?',[{label:tr('bookVisit'),page:'booking',primary:true},{label:tr('callOra'),action:'call'}]);if(!text)return}
  handleText(text);
};


/* ===== v40 behavior: clean production copy, home/start, cancellable booking ===== */
const v40Copy={
  en:{home:'Home',homeTitle:'What would you like to do?',homeText:'Choose a section or just ask Ora a question.',you:'You',cancel:'Cancel',cancelHint:'You can stop here and ask Ora something first.',bookingCancelled:'Booking stopped',bookingCancelledText:'Nothing was submitted. You can start again whenever you are ready.',servicesIntro:'Choose a service or describe what is bothering you. Ora will help you find the right next step.',pricingIntro:'See an approximate price range before your visit. The dentist will confirm the final treatment plan and cost after an exam.',reviewsIntro:'Read about patients’ experience with treatment, booking, and communication with the clinic.',worksIntro:'Browse treatment examples and open a case to learn more.',insuranceIntro:'Enter your insurance company and Member ID to check possible coverage.',locationIntro:'OraVera is in Miami, Florida. Ora can help with contact details, office hours, and directions.',aboutIntro:'OraVera brings questions, treatment information, insurance, photos, and booking into one conversation.',faqIntro:'Open a question below or ask Ora in your own words.',step1Title:'Choose your visit and time',step1Text:'Tell us what you need, then choose a day and a convenient time.',step2Title:'Your details',step2Text:'Leave your name and contact information so the clinic can confirm your visit.',step3Title:'Review your request',step3Text:'Check the details before you send the booking request.',step4Title:'Request sent',step4Text:'We saved your selected time. The clinic will confirm the appointment using the contact you provided.',requestSent:'Booking request sent',doneHome:'Back to home',insuranceDone:'Coverage check complete',insuranceDoneText:'Coverage may be available. Exact benefits and your final out-of-pocket cost are confirmed before treatment.',photoReply:'Photos received. They can help Ora guide you to the next step, but the dentist will confirm the diagnosis in person.'},
  ru:{home:'Главная',homeTitle:'Что хотите сделать?',homeText:'Выберите раздел или просто задайте Ora вопрос.',you:'Вы',cancel:'Отменить',cancelHint:'Можно остановиться здесь и сначала что-нибудь уточнить у Ora.',bookingCancelled:'Запись отменена',bookingCancelledText:'Ничего не отправлено. Вы сможете начать запись заново, когда будете готовы.',servicesIntro:'Выберите услугу или просто опишите, что беспокоит. Ora поможет понять, с чего лучше начать.',pricingIntro:'Посмотрите ориентир по стоимости до визита. Точный план лечения и итоговую сумму врач подтвердит после осмотра.',reviewsIntro:'Почитайте, как пациенты оценивают лечение, запись и общение с клиникой.',worksIntro:'Посмотрите примеры работ и откройте интересующий случай подробнее.',insuranceIntro:'Укажите страховую компанию и Member ID, чтобы проверить возможное покрытие.',locationIntro:'OraVera находится в Майами, Флорида. Ora поможет уточнить контакты, часы работы и как добраться.',aboutIntro:'В OraVera вопросы, лечение, страховка, фото и запись собраны в одном разговоре с Ora.',faqIntro:'Откройте вопрос ниже или спросите Ora своими словами.',step1Title:'Выберите прием и время',step1Text:'Укажите, с чем хотите обратиться, затем выберите день и удобное время.',step2Title:'Ваши данные',step2Text:'Оставьте имя и контакт, чтобы клиника могла подтвердить визит.',step3Title:'Проверьте запись',step3Text:'Проверьте детали перед отправкой запроса.',step4Title:'Запрос отправлен',step4Text:'Мы сохранили выбранное время. Клиника подтвердит запись по указанному контакту.',requestSent:'Запрос на запись отправлен',doneHome:'На главную',insuranceDone:'Проверка завершена',insuranceDoneText:'Покрытие может быть доступно. Точные условия страховки и итоговые расходы подтверждаются до лечения.',photoReply:'Фото получены. Они помогут Ora подсказать следующий шаг, но точный диагноз врач подтвердит на очном осмотре.'},
  es:{home:'Inicio',homeTitle:'¿Qué quieres hacer?',homeText:'Elige una sección o pregúntale a Ora directamente.',you:'Tú',cancel:'Cancelar',cancelHint:'Puedes detenerte aquí y preguntarle algo a Ora primero.',bookingCancelled:'Reserva cancelada',bookingCancelledText:'No se envió nada. Puedes empezar de nuevo cuando quieras.',servicesIntro:'Elige un servicio o describe qué te molesta. Ora te ayudará a encontrar el siguiente paso.',pricingIntro:'Consulta un rango aproximado antes de la visita. El dentista confirmará el plan y el costo final después del examen.',reviewsIntro:'Conoce la experiencia de los pacientes con el tratamiento, las citas y la atención.',worksIntro:'Mira ejemplos de tratamiento y abre un caso para ver más detalles.',insuranceIntro:'Introduce tu aseguradora y Member ID para revisar la posible cobertura.',locationIntro:'OraVera está en Miami, Florida. Ora puede ayudarte con contactos, horarios y cómo llegar.',aboutIntro:'OraVera reúne preguntas, tratamientos, seguro, fotos y reservas en una sola conversación con Ora.',faqIntro:'Abre una pregunta o pregúntale a Ora con tus propias palabras.',step1Title:'Elige visita y hora',step1Text:'Dinos qué necesitas y elige un día y una hora conveniente.',step2Title:'Tus datos',step2Text:'Deja tu nombre y contacto para que la clínica pueda confirmar la visita.',step3Title:'Revisa la cita',step3Text:'Comprueba los datos antes de enviar la solicitud.',step4Title:'Solicitud enviada',step4Text:'Guardamos la hora elegida. La clínica confirmará la cita usando tu contacto.',requestSent:'Solicitud de cita enviada',doneHome:'Volver al inicio',insuranceDone:'Comprobación completada',insuranceDoneText:'Puede haber cobertura. Los beneficios exactos y el costo final se confirman antes del tratamiento.',photoReply:'Fotos recibidas. Pueden ayudar a Ora a orientarte, pero el dentista confirmará el diagnóstico en persona.'},
  he:{home:'ראשי',homeTitle:'מה תרצו לעשות?',homeText:'בחרו נושא או שאלו את Ora ישירות.',you:'אתם',cancel:'ביטול',cancelHint:'אפשר לעצור כאן ולשאול את Ora משהו קודם.',bookingCancelled:'התהליך בוטל',bookingCancelledText:'לא נשלח דבר. אפשר להתחיל שוב כשתהיו מוכנים.',servicesIntro:'בחרו שירות או תארו מה מפריע לכם. Ora תעזור להבין מה הצעד הבא.',pricingIntro:'ראו טווח מחיר משוער לפני הביקור. הרופא יאשר את התוכנית והמחיר הסופי לאחר בדיקה.',reviewsIntro:'קראו על חוויית המטופלים מהטיפול, קביעת התור והתקשורת עם המרפאה.',worksIntro:'ראו דוגמאות טיפול ופתחו מקרה לפרטים נוספים.',insuranceIntro:'הזינו את חברת הביטוח ו-Member ID כדי לבדוק כיסוי אפשרי.',locationIntro:'OraVera נמצאת במיאמי, פלורידה. Ora יכולה לעזור בפרטי קשר, שעות והגעה.',aboutIntro:'OraVera מרכזת שאלות, טיפול, ביטוח, תמונות וקביעת תור בשיחה אחת עם Ora.',faqIntro:'פתחו שאלה או שאלו את Ora במילים שלכם.',step1Title:'בחרו ביקור ושעה',step1Text:'ספרו מה אתם צריכים ובחרו יום ושעה נוחים.',step2Title:'הפרטים שלכם',step2Text:'השאירו שם ופרטי קשר כדי שהמרפאה תוכל לאשר את הביקור.',step3Title:'בדקו את הבקשה',step3Text:'בדקו את הפרטים לפני שליחת הבקשה.',step4Title:'הבקשה נשלחה',step4Text:'שמנו בצד את השעה שבחרתם. המרפאה תאשר את התור באמצעות פרטי הקשר.',requestSent:'בקשת התור נשלחה',doneHome:'חזרה לראשי',insuranceDone:'הבדיקה הושלמה',insuranceDoneText:'ייתכן שיש כיסוי. ההטבות והעלות הסופית יאושרו לפני הטיפול.',photoReply:'התמונות התקבלו. הן יכולות לעזור ל-Ora להכווין לצעד הבא, אך הרופא יאשר את האבחנה בבדיקה.'}
};
function v40(){return v40Copy[lang]||v40Copy.en}
function homeActions(){return [
  {label:tr('services'),page:'services'},
  {label:tr('prices'),page:'pricing'},
  {label:tr('ourWork'),page:'works'},
  {label:tr('reviews'),page:'reviews'},
  {label:tr('bookVisit'),page:'booking',primary:true}
]}
function showHomeTurn(note=''){
  showMenu(false);
  const c=v40();
  const el=document.createElement('section');el.className='chatTurn assistantTurn homeTurn';
  el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="homeBubble">${note?`<div class="welcomeEyebrow">${escapeHtml(note)}</div>`:''}<h2>${escapeHtml(c.homeTitle)}</h2><p>${escapeHtml(c.homeText)}</p><div class="welcomeActions">${homeActions().map(a=>`<button type="button" class="${a.primary?'primary':''}" data-answer-page="${a.page}">${escapeHtml(a.label)}</button>`).join('')}</div></div></div>`;
  $('#site').appendChild(el);
  el.querySelectorAll('[data-answer-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.answerPage));
  requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'end'}));
  return el;
}
function resetBookingState(){
  booking.step=1;booking.visit='';booking.day='';booking.time='';booking.name='';booking.contact='';booking.payment='';booking.provider='';booking.memberId='';booking.confirmation='';
}
function cancelBooking(){
  const c=v40();
  if(activeBookingRoot&&activeBookingRoot.isConnected){activeBookingRoot.innerHTML=`<div class="bookingCancelled"><strong>${escapeHtml(c.bookingCancelled)}</strong><p>${escapeHtml(c.bookingCancelledText)}</p></div>`}
  activeBookingRoot=null;resetBookingState();showHomeTurn(c.bookingCancelled);
}

chatWelcomeCopy=function(){
  const c=v40();
  return [lang==='ru'?'Здравствуйте, я Ora. Чем помочь?':lang==='es'?'Hola, soy Ora. ¿Cómo puedo ayudarte?':lang==='he'?'שלום, אני Ora. איך אפשר לעזור?':'Hi, I’m Ora. How can I help?',
  lang==='ru'?'Расскажите, что вас беспокоит. Я могу подсказать по услугам и стоимости, проверить страховку, показать работы и отзывы или помочь записаться.':lang==='es'?'Cuéntame qué necesitas. Puedo orientarte sobre tratamientos y precios, revisar el seguro, mostrar trabajos y reseñas o ayudarte a reservar.':lang==='he'?'ספרו לי מה אתם צריכים. אני יכולה לעזור עם טיפולים ומחירים, ביטוח, עבודות, ביקורות או קביעת תור.':'Tell me what you need. I can help with treatments and pricing, insurance, work and reviews, or booking a visit.'];
};
addUserMessage=function(text){
  const el=document.createElement('section');el.className='chatTurn userTurn';
  const wrap=document.createElement('div');wrap.className='userMessageWrap';
  const label=document.createElement('div');label.className='userLabel';label.textContent=v40().you;
  const bubble=document.createElement('div');bubble.className='userBubbleChat';bubble.textContent=text;
  wrap.append(label,bubble);el.appendChild(wrap);$('#site').appendChild(el);
  requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'end'}));return el;
};
chatHeader=function(kicker,title,copy){return `<div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(kicker)}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div><div class="chatContentHeadActions"><button type="button" class="chatHomeBtn" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div></div>`};

chatMarkup=function(type,key=''){
  const c=v40();
  if(type==='services')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ЛЕЧЕНИЕ':'CARE',tr('servicesHeading'),c.servicesIntro)}<div class="chatContentBody">${carouselMarkup('chat-services-'+(++chatInstance),serviceCards('services'))}</div></div>`;
  if(type==='pricing')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'СТОИМОСТЬ':'PRICING',tr('pricingHeading'),c.pricingIntro)}<div class="chatContentBody">${carouselMarkup('chat-pricing-'+(++chatInstance),serviceCards('pricing'))}<div class="infoNote">${escapeHtml(lang==='ru'?'Стоимость ориентировочная. Перед лечением врач подтвердит итоговый план и сумму.':'Prices are approximate. The dentist will confirm the final plan and cost before treatment.')}</div><div class="inlineActions"><button type="button" data-page="insurance">${escapeHtml(tr('insurance'))}</button><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div></div>`;
  if(type==='reviews')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ОТЗЫВЫ':'REVIEWS',tr('reviewsHeading'),c.reviewsIntro)}<div class="chatContentBody">${carouselMarkup('chat-reviews-'+(++chatInstance),reviewCards())}</div></div>`;
  if(type==='works')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'НАШИ РАБОТЫ':'OUR WORK',tr('ourWork'),c.worksIntro)}<div class="chatContentBody">${worksChatMarkup()}</div></div>`;
  if(type==='about')return `<div class="chatContentCard">${chatHeader('ORAVERA',tr('about'),c.aboutIntro)}<div class="chatContentBody">${aboutChatMarkup()}</div></div>`;
  if(type==='faq')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ВОПРОСЫ':'QUESTIONS',tr('faqHeading'),c.faqIntro)}<div class="chatContentBody">${faqChatMarkup()}</div></div>`;
  if(type==='location')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'КОНТАКТЫ':'LOCATION & CONTACT',tr('locationHeading'),c.locationIntro)}<div class="chatContentBody">${locationChatMarkup()}</div></div>`;
  if(type==='insurance')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'СТРАХОВКА':'INSURANCE',lang==='ru'?'Проверить страховку':'Check your insurance',c.insuranceIntro)}<div class="chatContentBody">${insuranceChatMarkup()}</div></div>`;
  if(type==='service'){const s=services.find(x=>x.key===key)||services[0];return `<div class="chatContentCard">${chatHeader(lang==='ru'?'УСЛУГА':'SERVICE',loc(s.title),loc(s.short))}<div class="chatContentBody">${serviceDetailPage(s)}</div></div>`}
  if(type==='privacy'||type==='terms')return `<div class="chatContentCard">${chatHeader('ORAVERA',type==='privacy'?tr('privacy'):tr('terms'),lang==='ru'?'Коротко о том, как работает сервис и как используются данные.':'A short overview of how the service works and how information is used.')}<div class="chatContentBody">${legalChatMarkup(type)}</div></div>`;
  return '';
};

locationChatMarkup=function(){const c=v40();return `<div class="chatGrid"><article class="chatInfoCard"><h3>OraVera · Miami, Florida</h3><p>${escapeHtml(c.locationIntro)}</p><div class="locationMark">⌖</div></article><article class="chatInfoCard"><h3>${escapeHtml(lang==='ru'?'Запись и вопросы':'Appointments & questions')}</h3><p>${escapeHtml(lang==='ru'?'Напишите Ora или позвоните. Если ситуация угрожает жизни, в США звоните 911.':'Message Ora or call. For a life-threatening emergency in the United States, call 911.')}</p><div class="inlineActions"><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article></div>`};
legalChatMarkup=function(type){return `<div class="chatGrid"><article class="chatInfoCard"><h3>${escapeHtml(type==='privacy'?(lang==='ru'?'Ваши данные':'Your information'):(lang==='ru'?'Как работает Ora':'Using Ora'))}</h3><p>${escapeHtml(type==='privacy'?(lang==='ru'?'Вы сами выбираете, чем делиться: контактами, сообщениями, фото, данными страховки и информацией о записи.':'You choose what to share: contact details, messages, photos, insurance information, and appointment details.'):(lang==='ru'?'Ora помогает с общей информацией, записью и подготовкой к визиту. Диагноз и лечение определяет врач.':'Ora helps with general information, booking, and visit preparation. Diagnosis and treatment decisions are made by a clinician.'))}</p></article><article class="chatInfoCard"><h3>${escapeHtml(lang==='ru'?'Экстренная помощь':'Emergency care')}</h3><p>${escapeHtml(lang==='ru'?'OraVera не является экстренной службой. Если ситуация угрожает жизни, в США звоните 911.':'OraVera is not an emergency service. For a life-threatening emergency in the United States, call 911.')}</p></article></div>`};

const _v39ServiceDetailPage=serviceDetailPage;
serviceDetailPage=function(s){
  let html=_v39ServiceDetailPage(s);
  html=html.replace(/Цены прототипа - не подтвержденный прайс клиники\./g,'Стоимость ориентировочная. Точную сумму врач подтвердит после осмотра.')
           .replace(/Prototype prices are not a verified clinic price list\./g,'Prices are approximate. The dentist will confirm the exact cost after an exam.')
           .replace(/ОРИЕНТИРОВОЧНЫЙ ДИАПАЗОН/g,'ОРИЕНТИР ПО СТОИМОСТИ')
           .replace(/ILLUSTRATIVE RANGE/g,'ESTIMATED RANGE');
  return html;
};

const _v39BindChatRoot=bindChatRoot;
bindChatRoot=function(root){
  _v39BindChatRoot(root);
  root.querySelectorAll('[data-home-chat]').forEach(b=>b.onclick=e=>{e.preventDefault();showHomeTurn()});
  const verify=root.querySelector('.verifyInsuranceChat');
  if(verify)verify.onclick=()=>{const provider=root.querySelector('.insProvider')?.value.trim();const box=root.querySelector('.insuranceResultChat');if(!provider){box.innerHTML=`<div class="flowError show">${escapeHtml(lang==='ru'?'Введите страховую компанию.':'Enter your insurance company.')}</div>`;return}verify.disabled=true;verify.textContent=lang==='ru'?'Проверяем…':'Checking…';setTimeout(()=>{verify.disabled=false;verify.textContent=lang==='ru'?'Проверить покрытие':'Check coverage';box.innerHTML=`<div class="infoNote" style="margin-top:14px"><strong>${escapeHtml(v40().insuranceDone)}</strong><br>${escapeHtml(v40().insuranceDoneText)}<div class="inlineActions"><button type="button" data-home-chat>⌂ ${escapeHtml(v40().home)}</button><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div>`;bindChatRoot(root)},550)};
};

bookingMarkup=function(step){
  const c=v40();
  const cancelRow=`<div class="flowCancelRow"><span class="flowCancelHint">${escapeHtml(c.cancelHint)}</span><button class="flowCancelBtn" data-book-cancel type="button">× ${escapeHtml(c.cancel)}</button></div>`;
  if(step===1)return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step1Title)}</h2><p>${escapeHtml(c.step1Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">1 / 4</span></div></div><div class="chatContentBody"><div class="flow"><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'Тип визита':'Visit type')}</span><div class="choiceGrid">${[['emergency',lang==='ru'?'Боль / срочно':'Tooth pain / urgent'],['exam',lang==='ru'?'Осмотр / консультация':'Exam / consultation'],['cleaning',lang==='ru'?'Чистка':'Cleaning']].map(([k,l])=>`<button class="choice ${booking.visit===k?'active':''}" type="button" data-book-choice="visit" data-value="${k}">${escapeHtml(l)}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'День':'Day')}</span><div class="choiceGrid">${[['today',lang==='ru'?'Сегодня':'Today'],['tomorrow',lang==='ru'?'Завтра':'Tomorrow'],['next',lang==='ru'?'Ближайший':'Next available']].map(([k,l])=>`<button class="choice ${booking.day===k?'active':''}" type="button" data-book-choice="day" data-value="${k}">${escapeHtml(l)}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'Время':'Time')}</span><div class="timeGrid">${['9:00 AM','10:30 AM','12:00 PM','2:30 PM','4:00 PM','5:30 PM'].map(t=>`<button class="timeBtn ${booking.time===t?'active':''}" type="button" data-book-time="${t}">${t}</button>`).join('')}</div><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn primary" data-book-next type="button" ${!(booking.visit&&booking.day&&booking.time)?'disabled':''}>${escapeHtml(lang==='ru'?'Продолжить':'Continue')}</button></div></div>${cancelRow}</div></div></div></div>`;
  if(step===2)return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step2Title)}</h2><p>${escapeHtml(c.step2Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">2 / 4</span></div></div><div class="chatContentBody"><div class="flow"><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${escapeHtml(lang==='ru'?'Имя и фамилия':'Full name')}</label><input data-book-input="name" value="${escapeHtml(booking.name)}" placeholder="${escapeHtml(lang==='ru'?'Имя пациента':'Patient name')}"></div><div class="field"><label>${escapeHtml(lang==='ru'?'Телефон или email':'Phone or email')}</label><input data-book-input="contact" value="${escapeHtml(booking.contact)}" placeholder="${escapeHtml(lang==='ru'?'Телефон или email':'Phone or email')}"></div></div></div><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'Оплата':'Payment')}</span><div class="choiceGrid"><button class="choice ${booking.payment==='insurance'?'active':''}" type="button" data-book-choice="payment" data-value="insurance">${escapeHtml(lang==='ru'?'Есть страховка':'I have insurance')}</button><button class="choice ${booking.payment==='self'?'active':''}" type="button" data-book-choice="payment" data-value="self">${escapeHtml(lang==='ru'?'Оплачу самостоятельно':'Self-pay')}</button><button class="choice ${booking.payment==='unsure'?'active':''}" type="button" data-book-choice="payment" data-value="unsure">${escapeHtml(lang==='ru'?'Пока не знаю':'Not sure yet')}</button></div>${booking.payment==='insurance'?`<div class="fieldGrid" style="margin-top:12px"><div class="field"><label>${escapeHtml(lang==='ru'?'Страховая компания':'Insurance company')}</label><input data-book-input="provider" value="${escapeHtml(booking.provider)}"></div><div class="field"><label>Member ID</label><input data-book-input="memberId" value="${escapeHtml(booking.memberId)}"></div></div>`:''}<div class="flowError" data-book-error>${escapeHtml(lang==='ru'?'Введите имя, контакт и выберите способ оплаты.':'Enter your name, contact, and payment option.')}</div><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn" data-book-back type="button">${escapeHtml(lang==='ru'?'Назад':'Back')}</button><button class="flowBtn primary" data-book-review type="button">${escapeHtml(lang==='ru'?'Дальше':'Continue')}</button></div></div>${cancelRow}</div></div></div></div>`;
  if(step===3){const visit={emergency:lang==='ru'?'Боль / срочно':'Tooth pain / urgent',exam:lang==='ru'?'Осмотр / консультация':'Exam / consultation',cleaning:lang==='ru'?'Чистка':'Cleaning'}[booking.visit];const day={today:lang==='ru'?'Сегодня':'Today',tomorrow:lang==='ru'?'Завтра':'Tomorrow',next:lang==='ru'?'Ближайший доступный':'Next available'}[booking.day];return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step3Title)}</h2><p>${escapeHtml(c.step3Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">3 / 4</span></div></div><div class="chatContentBody"><div class="summary"><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Визит':'Visit')}</span><b>${escapeHtml(visit)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Когда':'When')}</span><b>${escapeHtml(day)} · ${escapeHtml(booking.time)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Пациент':'Patient')}</span><b>${escapeHtml(booking.name)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Контакт':'Contact')}</span><b>${escapeHtml(booking.contact)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Оплата':'Payment')}</span><b>${escapeHtml(booking.payment==='insurance'?(booking.provider||'Insurance'):booking.payment==='self'?(lang==='ru'?'Самостоятельно':'Self-pay'):(lang==='ru'?'Уточню позже':'Not sure yet'))}</b></div></div><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn" data-book-back type="button">${escapeHtml(lang==='ru'?'Назад':'Back')}</button><button class="flowBtn primary" data-book-confirm type="button">${escapeHtml(lang==='ru'?'Отправить запрос':'Send request')}</button></div></div>${cancelRow}</div></div>`}
  return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step4Title)}</h2><p>${escapeHtml(c.step4Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">4 / 4</span></div></div><div class="chatContentBody"><div class="successMark">✓</div><div class="summary"><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Номер запроса':'Request')}</span><b>${escapeHtml(booking.confirmation)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Клиника':'Clinic')}</span><b>OraVera · Miami, FL</b></div></div><div class="inlineActions"><button type="button" data-home-chat>⌂ ${escapeHtml(c.doneHome)}</button><button type="button" data-page="services">${escapeHtml(tr('services'))}</button></div></div></div>`;
};

bindChatBooking=function(root){
  root.querySelectorAll('[data-book-input]').forEach(i=>i.oninput=()=>{booking[i.dataset.bookInput]=i.value});
  root.querySelectorAll('[data-book-choice]').forEach(b=>b.onclick=()=>{booking[b.dataset.bookChoice]=b.dataset.value;renderBooking(booking.step)});
  root.querySelectorAll('[data-book-time]').forEach(b=>b.onclick=()=>{booking.time=b.dataset.bookTime;renderBooking(1)});
  root.querySelector('[data-book-next]')?.addEventListener('click',()=>renderBooking(2));
  root.querySelector('[data-book-back]')?.addEventListener('click',()=>renderBooking(Math.max(1,booking.step-1)));
  root.querySelector('[data-book-review]')?.addEventListener('click',()=>{const ok=booking.name.trim().length>1&&(/@/.test(booking.contact)||/\d{7,}/.test(booking.contact.replace(/\D/g,'')))&&booking.payment;if(!ok){root.querySelector('[data-book-error]')?.classList.add('show');return}renderBooking(3)});
  root.querySelector('[data-book-confirm]')?.addEventListener('click',()=>{booking.confirmation='OV-'+Math.random().toString(36).slice(2,8).toUpperCase();renderBooking(4);showToast(v40().requestSent)});
  root.querySelector('[data-book-cancel]')?.addEventListener('click',cancelBooking);
  root.querySelectorAll('[data-home-chat]').forEach(b=>b.onclick=e=>{e.preventDefault();showHomeTurn()});
  bindChatRoot(root);
};

const _v39HandleText=handleText;
handleText=function(text){
  const value=String(text||'').trim().toLowerCase();
  if(/^(\/start|start|home|главная|домой|в начало|начать сначала|inicio|ראשי)$/.test(value)){showHomeTurn();return}
  _v39HandleText(text);
};

const _v39ComposerSubmit=composer.onsubmit;
composer.onsubmit=e=>{
  e.preventDefault();const text=input.value.trim();if(!text&&!attachments.length)return;
  const hadPhotos=attachments.length>0;const photoNames=attachments.map(a=>a.name);input.value='';attachments=[];renderAttachments();resizeInput();
  if(text)addUserMessage(text);else if(hadPhotos)addUserMessage((lang==='ru'?'Фото: ':'Photos: ')+photoNames.join(', '));
  if(hadPhotos){addOraText(v40().photoReply,[{label:tr('bookVisit'),page:'booking',primary:true},{label:tr('callOra'),action:'call'},{label:v40().home,action:'home'}]);if(!text)return}
  handleText(text);
};

const _v39AddOraText=addOraText;
addOraText=function(text,actions=[]){
  const normalized=actions.map(a=>a.action==='home'?{...a,action:'home'}:a);
  const el=_v39AddOraText(text,normalized);
  el.querySelectorAll('[data-answer-action="home"]').forEach(b=>b.onclick=()=>showHomeTurn());
  return el;
};

const _v39BindGlobal=bindGlobal;
bindGlobal=function(){
  _v39BindGlobal();
  document.addEventListener('click',e=>{const home=e.target.closest('[data-home-chat]');if(home){e.preventDefault();showHomeTurn()}});
};

$('#brand').setAttribute('title',v40().home);

/* v41: keep the patient's latest question visually connected to the answer. */
addOraBlock=function(html,type='block'){
  const el=document.createElement('section');el.className='chatTurn assistantTurn contentTurn';el.dataset.chatType=type;
  el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="chatBlockHost"></div></div>`;
  el.querySelector('.chatBlockHost').innerHTML=html;$('#site').appendChild(el);hydrateCarousels(el);bindChatRoot(el);
  const prev=el.previousElementSibling;
  requestAnimationFrame(()=>{
    if(prev?.classList.contains('userTurn')) prev.scrollIntoView({behavior:'smooth',block:'start'});
    else el.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  return el;
};
renderBooking=function(step=1){
  booking.step=step;
  const created=!activeBookingRoot||!activeBookingRoot.isConnected;
  if(created){activeBookingRoot=addOraBlock('<div data-active-booking></div>','booking').querySelector('[data-active-booking]')}
  activeBookingRoot.innerHTML=bookingMarkup(step);bindChatBooking(activeBookingRoot);hydrateCarousels(activeBookingRoot);
  if(!created){requestAnimationFrame(()=>activeBookingRoot.closest('.chatTurn')?.scrollIntoView({behavior:'smooth',block:'nearest'}))}
};

const _baseSetLanguage=setLanguage;
setLanguage=function(next){_baseSetLanguage(next);updateWelcome();const m=$('.homeMenuItem span');if(m)m.textContent=v40().home;$('#brand').setAttribute('title',v40().home)};
$('#brand').onclick=()=>showHomeTurn();


renderAllCarousels();splitRevealText();bindGlobal();setLanguage('en');resizeInput();

(function(){
  const style = `
  .headerLang{display:inline-flex;align-items:center;gap:4px;padding:4px;border:1px solid var(--line);border-radius:999px;background:#fff}
  .headerLangBtn{min-width:34px;height:36px;padding:0 8px;border:0;border-radius:999px;background:transparent;color:#5d6c80;cursor:pointer;font-size:12px;font-weight:760;letter-spacing:.04em}
  .headerLangBtn.active{background:var(--soft-blue);color:var(--blue)}
  .headerLangBtn:hover{background:#f4f8ff;color:var(--blue)}
  .menuBottom{display:none !important}
  .menuMain{gap:6px}
  .menuItem{font-size:24px;min-height:58px}
  .menuPanel{padding-bottom:30px}
  .oraLabel{font-size:11px;margin-bottom:6px}
  .chatBubble{font-size:15.5px;line-height:1.66;padding:16px 18px;border-radius:18px 18px 18px 6px}
  .userBubbleChat{font-size:17px;line-height:1.58;padding:16px 19px;max-width:min(78%,760px)}
  .welcomeBubble h1{font-size:clamp(34px,4vw,56px)}
  .welcomeBubble p{font-size:17px;line-height:1.65}
  .welcomeActions button{min-height:42px;padding:0 13px;font-size:13px}
  .chatContentHead{padding:22px 20px 16px}
  .chatContentHead h2{font-size:clamp(30px,3.2vw,42px);line-height:1.08}
  .chatContentHead p{font-size:15px;line-height:1.64}
  .chatContentBody{padding:0 16px 18px}
  .chatContentKicker{font-size:11px}
  .chatInfoCard h3{font-size:24px;line-height:1.15}
  .chatInfoCard p,.infoNote,.docCard p,.docCard li{font-size:14px;line-height:1.7}
  .cardTitle{font-size:24px;line-height:1.12}
  .cardPrice{font-size:clamp(34px,3.2vw,52px)}
  .cardPrice small,.cardBadge,.carouselHint,.carouselCounter{font-size:10px}
  .cardDescription{font-size:16px;line-height:1.5}
  .flowTop h3{font-size:clamp(40px,4.7vw,62px)}
  .flowTop p{font-size:15px;line-height:1.65}
  .stepPill{font-size:11px;padding:8px 12px}
  .flowLabel,.field label{font-size:11px}
  .choice,.timeBtn,.flowBtn,.summaryRow,.field input,.field select,.inlineActions button,.answerActions button{font-size:14px}
  .field input,.field select{height:52px}
  .choice{min-height:46px;padding:0 15px}
  .timeBtn{height:48px}
  .flowBtn{min-height:46px;padding:0 16px}
  .summaryRow{padding:15px 14px}
  .composerShell textarea{font-size:15px;line-height:1.55}
  .attachmentChip{font-size:11px}
  .homeBubble h2{font-size:34px;line-height:1.08}
  .homeBubble p{font-size:16px;line-height:1.65}
  html[lang="ru"] .chatBubble,html[lang="ru"] .chatInfoCard p,html[lang="ru"] .chatContentHead p,html[lang="ru"] .welcomeBubble p,html[lang="ru"] .homeBubble p,html[lang="ru"] .field input,html[lang="ru"] .choice,html[lang="ru"] .summaryRow{letter-spacing:0;word-break:normal}
  @media (max-width:900px){
    .headerLang{padding:3px;gap:2px}
    .headerLangBtn{min-width:28px;height:32px;padding:0 6px;font-size:11px}
    .chatBubble{font-size:14.5px}
    .userBubbleChat{font-size:16px;max-width:90%}
    .chatContentHead h2{font-size:31px}
    .chatContentHead p,.welcomeBubble p,.homeBubble p,.cardDescription,.chatInfoCard p,.infoNote{font-size:14px}
    .welcomeActions button,.choice,.timeBtn,.flowBtn,.field input,.field select,.summaryRow{font-size:13px}
  }
  @media (max-width:560px){
    .headerLang{order:4;padding:2px;gap:1px}
    .headerLangBtn{min-width:25px;height:28px;padding:0 5px;font-size:10px}
    .site.chatFeed{padding-bottom:52px}
    .oraLabel{font-size:10px}
    .chatBubble{font-size:14px;padding:13px 14px}
    .userBubbleChat{font-size:15px;padding:13px 15px}
    .welcomeBubble h1{font-size:34px}
    .welcomeBubble p,.homeBubble p{font-size:14px}
    .welcomeActions button{min-height:38px;padding:0 11px;font-size:12px}
    .chatContentHead{padding:18px 14px 13px}
    .chatContentHead h2{font-size:28px}
    .chatContentHead p{font-size:14px}
    .chatContentBody{padding:0 11px 14px}
    .chatInfoCard h3{font-size:21px}
    .cardTitle{font-size:22px}
    .cardDescription{font-size:15px}
    .choice,.timeBtn,.flowBtn,.field input,.field select,.summaryRow{font-size:13px}
    .menuItem{font-size:20px;min-height:54px}
    body.calling .headerLang{display:none}
  }`;
  document.head.insertAdjacentHTML('beforeend', `<style>${style}</style>`);

  const menuMain = document.querySelector('.menuMain');
  if(menuMain){
    menuMain.innerHTML = `
      <button class="menuItem" type="button" data-page="services" data-t="care">Лечение</button>
      <button class="menuItem" type="button" data-page="reviews" data-t="reviews">Отзывы</button>
      <button class="menuItem" type="button" data-page="insurance" data-t="insurance">Страховка</button>
      <button class="menuItem" type="button" data-page="faq" data-t="faq">Вопросы</button>
      <button class="menuItem" type="button" data-page="about" data-t="about">Об OraVera</button>
      <button class="menuItem" type="button" data-page="location" data-t="location">Адрес и контакты</button>`;
  }
  const menuBottom = document.querySelector('.menuBottom');
  if(menuBottom) menuBottom.remove();

  const header = document.querySelector('.header');
  const menuBtn = document.getElementById('menuBtn');
  if(header && menuBtn && !document.getElementById('headerLanguage')){
    const langEl = document.createElement('div');
    langEl.className = 'headerLang';
    langEl.id = 'headerLanguage';
    langEl.setAttribute('role','group');
    langEl.setAttribute('aria-label','Language');
    langEl.innerHTML = `
      <button class="headerLangBtn" type="button" data-set-lang="en">EN</button>
      <button class="headerLangBtn" type="button" data-set-lang="es">ES</button>
      <button class="headerLangBtn" type="button" data-set-lang="ru">RU</button>
      <button class="headerLangBtn" type="button" data-set-lang="he">HE</button>`;
    header.insertBefore(langEl, menuBtn);
  }

  if(window.v40Copy){
    v40Copy.ru.homeText='Выберите раздел или просто задайте Ora вопрос.';
    v40Copy.ru.insuranceIntro='Укажите страховую компанию и номер полиса - Ora поможет понять следующий шаг.';
    v40Copy.ru.locationIntro='OraVera находится в Майами. Здесь можно быстро посмотреть контакты, часы работы и как добраться.';
    v40Copy.ru.aboutIntro='OraVera помогает спокойно разобраться в лечении, стоимости, страховке и записи - всё в одном разговоре с Ora.';
    v40Copy.ru.photoReply='Фото получены. Они помогут Ora лучше сориентировать вас, а врач уточнит диагноз на приёме.';
    v40Copy.ru.step4Text='Мы приняли запрос. Администратор свяжется с вами, чтобы подтвердить запись.';
    v40Copy.ru.requestSent='Запрос отправлен';
    v40Copy.en.step4Text='We received your request. The clinic will contact you to confirm the appointment.';
  }

  if(window.langCopy && langCopy.ru){
    langCopy.ru.bookVisit='Записаться на прием';
    langCopy.ru.ourWork='Примеры работ';
    langCopy.ru.prices='Цены и страховка';
    langCopy.ru.placeholder='Спросите Ora о лечении, стоимости, страховке или записи…';
  }

  if(window.uiCopy){
    uiCopy.ru.welcomeTitle='Здравствуйте, я Ora. Чем помочь?';
    uiCopy.ru.welcomeCopy='Расскажите, что вас беспокоит. Я помогу с лечением, стоимостью, страховкой, примерами работ, отзывами или записью на прием.';
  }

  const syncLangButtons = ()=>{
    document.querySelectorAll('.headerLangBtn').forEach(btn=>{
      const active = btn.dataset.setLang === window.lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const _setLanguagePatched = window.setLanguage;
  window.setLanguage = function(next){
    _setLanguagePatched(next);
    syncLangButtons();
    const bh = document.getElementById('bookHeader');
    if(bh) bh.textContent = tr('bookVisit');
  };

  window.locationChatMarkup = function(){
    return `<div class="chatGrid"><article class="chatInfoCard"><h3>${lang==='ru'?'OraVera · Майами':'OraVera · Miami, Florida'}</h3><p>${escapeHtml(v40().locationIntro)}</p><div class="locationMark">⌖</div></article><article class="chatInfoCard"><h3>${escapeHtml(lang==='ru'?'Связаться с клиникой':'Contact the clinic')}</h3><p>${escapeHtml(lang==='ru'?'Напишите Ora или позвоните - поможем с записью, вопросами по лечению и страховке. Если ситуация угрожает жизни, в США звоните 911.':'Message Ora or call. We can help with booking, treatment questions, and insurance. For a life-threatening emergency in the United States, call 911.')}</p><div class="inlineActions"><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article></div>`;
  };

  window.legalChatMarkup = function(type){
    if(type==='privacy'){
      return `<div class="chatGrid"><article class="chatInfoCard"><h3>${lang==='ru'?'Какие данные могут понадобиться':'Information you may share'}</h3><p>${lang==='ru'?'Имя, контакт, сообщения, сведения о записи, фотографии полости рта и данные страховки помогают Ora точнее сориентировать вас перед визитом.':'Your name, contact details, appointment information, mouth photos, and insurance details help Ora guide you before the visit.'}</p></article><article class="chatInfoCard"><h3>${lang==='ru'?'Зачем это нужно':'Why it helps'}</h3><p>${lang==='ru'?'Так клиника быстрее понимает ваш вопрос и может подготовиться к вашему визиту.':'This helps the clinic understand your needs faster and prepare for your visit.'}</p></article></div>`;
    }
    return `<div class="chatGrid"><article class="chatInfoCard"><h3>${lang==='ru'?'Как помогает Ora':'How Ora helps'}</h3><p>${lang==='ru'?'Ora отвечает на общие вопросы, помогает разобраться в лечении, стоимости и записи, но не заменяет очный осмотр врача.':'Ora answers general questions and helps with treatment, pricing, and booking, but it does not replace an in-person exam.'}</p></article><article class="chatInfoCard"><h3>${lang==='ru'?'Важно':'Important'}</h3><p>${lang==='ru'?'Если у вас сильная боль, быстрое ухудшение состояния или экстренная ситуация, обратитесь за неотложной помощью.':'If you have severe pain, rapidly worsening symptoms, or an emergency, seek urgent medical care.'}</p></article></div>`;
  };

  const _chatMarkup = window.chatMarkup;
  window.chatMarkup = function(type,key=''){
    if(type==='insurance'){
      const title = lang==='ru'?'Проверить страховку':'Check your insurance';
      const text = lang==='ru'?'Укажите страховую компанию и номер полиса. Ora покажет предварительный результат и подскажет, что делать дальше.':'Enter your insurance company and member ID. Ora will show a preliminary result and suggest the next step.';
      return `<div class="chatContentCard">${chatHeader(lang==='ru'?'СТРАХОВКА':'INSURANCE',title,text)}<div class="chatContentBody">${insuranceChatMarkup()}</div></div>`;
    }
    return _chatMarkup(type,key);
  };

  window.bookingMarkup = function(step=1){
    const c=v40();
    const cancelRow=`<div class="bookingCancelRow"><button class="flowBtn" data-book-cancel type="button">${escapeHtml(c.cancel)}</button><p class="bookingCancelHint">${escapeHtml(c.cancelHint)}</p></div>`;
    if(step===1)return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step1Title)}</h2><p>${escapeHtml(c.step1Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">1 / 4</span></div></div><div class="chatContentBody"><div class="flow"><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'Повод обращения':'Visit type')}</span><div class="choiceGrid">${[['emergency',lang==='ru'?'Боль / срочно':'Tooth pain / urgent'],['exam',lang==='ru'?'Осмотр / консультация':'Exam / consultation'],['cleaning',lang==='ru'?'Чистка':'Cleaning']].map(([k,l])=>`<button class="choice ${booking.visit===k?'active':''}" type="button" data-book-choice="visit" data-value="${k}">${l}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'День':'Day')}</span><div class="choiceGrid">${[['today',lang==='ru'?'Сегодня':'Today'],['tomorrow',lang==='ru'?'Завтра':'Tomorrow'],['next',lang==='ru'?'Ближайшее время':'Next available']].map(([k,l])=>`<button class="choice ${booking.day===k?'active':''}" type="button" data-book-choice="day" data-value="${k}">${l}</button>`).join('')}</div></div><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'Время':'Time')}</span><div class="timeGrid">${['9:00 AM','10:30 AM','12:00 PM','2:30 PM','4:00 PM','5:30 PM'].map(t=>`<button class="timeBtn ${booking.time===t?'active':''}" type="button" data-book-time="${t}">${t}</button>`).join('')}</div><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn primary" data-book-next type="button" ${!(booking.visit&&booking.day&&booking.time)?'disabled':''}>${escapeHtml(lang==='ru'?'Продолжить':'Continue')}</button></div></div>${cancelRow}</div></div></div></div>`;
    if(step===2)return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step2Title)}</h2><p>${escapeHtml(c.step2Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">2 / 4</span></div></div><div class="chatContentBody"><div class="flow"><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${escapeHtml(lang==='ru'?'Имя и фамилия':'Full name')}</label><input data-book-input="name" value="${escapeHtml(booking.name)}" placeholder="${escapeHtml(lang==='ru'?'Имя пациента':'Patient name')}"></div><div class="field"><label>${escapeHtml(lang==='ru'?'Телефон или email':'Phone or email')}</label><input data-book-input="contact" value="${escapeHtml(booking.contact)}" placeholder="${escapeHtml(lang==='ru'?'Телефон или email':'Phone or email')}"></div></div></div><div class="flowSection"><span class="flowLabel">${escapeHtml(lang==='ru'?'Оплата':'Payment')}</span><div class="choiceGrid"><button class="choice ${booking.payment==='insurance'?'active':''}" type="button" data-book-choice="payment" data-value="insurance">${escapeHtml(lang==='ru'?'Есть страховка':'I have insurance')}</button><button class="choice ${booking.payment==='self'?'active':''}" type="button" data-book-choice="payment" data-value="self">${escapeHtml(lang==='ru'?'Оплачу самостоятельно':'Self-pay')}</button><button class="choice ${booking.payment==='unsure'?'active':''}" type="button" data-book-choice="payment" data-value="unsure">${escapeHtml(lang==='ru'?'Уточню позже':'Not sure yet')}</button></div>${booking.payment==='insurance'?`<div class="fieldGrid" style="margin-top:12px"><div class="field"><label>${escapeHtml(lang==='ru'?'Страховая компания':'Insurance company')}</label><input data-book-input="provider" value="${escapeHtml(booking.provider)}" placeholder="${escapeHtml(lang==='ru'?'Например, Delta Dental':'For example, Delta Dental')}"></div><div class="field"><label>${escapeHtml(lang==='ru'?'Номер полиса':'Member ID')}</label><input data-book-input="memberId" value="${escapeHtml(booking.memberId)}" placeholder="${escapeHtml(lang==='ru'?'Номер полиса':'Member ID')}"></div></div>`:''}<div class="flowError" data-book-error>${escapeHtml(lang==='ru'?'Введите имя, контакт и выберите способ оплаты.':'Enter your name, contact, and payment option.')}</div><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn" data-book-back type="button">${escapeHtml(lang==='ru'?'Назад':'Back')}</button><button class="flowBtn primary" data-book-review type="button">${escapeHtml(lang==='ru'?'Продолжить':'Continue')}</button></div></div>${cancelRow}</div></div></div></div>`;
    if(step===3){const visit={emergency:lang==='ru'?'Боль / срочно':'Tooth pain / urgent',exam:lang==='ru'?'Осмотр / консультация':'Exam / consultation',cleaning:lang==='ru'?'Чистка':'Cleaning'}[booking.visit];const day={today:lang==='ru'?'Сегодня':'Today',tomorrow:lang==='ru'?'Завтра':'Tomorrow',next:lang==='ru'?'Ближайшее время':'Next available'}[booking.day];return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step3Title)}</h2><p>${escapeHtml(c.step3Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">3 / 4</span></div></div><div class="chatContentBody"><div class="summary"><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Повод обращения':'Visit')}</span><b>${escapeHtml(visit)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Когда':'When')}</span><b>${escapeHtml(day)} · ${escapeHtml(booking.time)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Пациент':'Patient')}</span><b>${escapeHtml(booking.name)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Контакт':'Contact')}</span><b>${escapeHtml(booking.contact)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Оплата':'Payment')}</span><b>${escapeHtml(booking.payment==='insurance'?(booking.provider||(lang==='ru'?'Страховка':'Insurance')):booking.payment==='self'?(lang==='ru'?'Самостоятельно':'Self-pay'):(lang==='ru'?'Уточню позже':'Not sure yet'))}</b></div></div><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn" data-book-back type="button">${escapeHtml(lang==='ru'?'Назад':'Back')}</button><button class="flowBtn primary" data-book-confirm type="button">${escapeHtml(lang==='ru'?'Отправить запрос':'Send request')}</button></div></div>${cancelRow}</div></div>`}
    return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':'BOOKING')}</div><h2>${escapeHtml(c.step4Title)}</h2><p>${escapeHtml(c.step4Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">4 / 4</span></div></div><div class="chatContentBody"><div class="successMark">✓</div><div class="summary"><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Номер обращения':'Request')}</span><b>${escapeHtml(booking.confirmation)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Клиника':'Clinic')}</span><b>${lang==='ru'?'OraVera · Майами':'OraVera · Miami, FL'}</b></div></div><div class="inlineActions"><button type="button" data-home-chat>⌂ ${escapeHtml(c.doneHome)}</button><button type="button" data-page="services">${escapeHtml(tr('services'))}</button></div></div></div>`;
  };

  const _origShowAnswer = window.showAnswer;
  window.showAnswer = function(text,actions=[]){
    return _origShowAnswer(text, actions);
  };

  // Rebind static controls after DOM changes.
  const bookHeader=document.getElementById('bookHeader');
  if(bookHeader) bookHeader.onclick=()=>openPage('booking');
  syncLangButtons();
  setLanguage(window.lang || 'en');
})();

(function(){
  window.reviewsPage = function(){
    return pageShell(tr('reviewsHeading'), tr('reviewsSub'), `<section class="carouselSection"><div>${carouselMarkup('page-reviews-clean', reviewCards())}</div></section><div class="infoNote">${escapeHtml(lang==='ru'?'Здесь собраны отзывы пациентов о лечении, записи и общении с клиникой.':'Here you can browse patient feedback about treatment, booking, and communication with the clinic.')}</div>`);
  };
  window.worksPage = function(){
    const cards = services.slice(0,4).map((s,i)=>`<article class="docCard"><div class="eyebrow">${escapeHtml(lang==='ru'?'СЛУЧАЙ':'CASE')} ${String(i+1).padStart(2,'0')}</div><h4>${escapeHtml(loc(s.title))}</h4><p>${escapeHtml(lang==='ru'?'Пример похожего обращения: что беспокоило пациента, как проходило лечение и какого результата удалось добиться.':'An example of a similar case: what bothered the patient, how treatment was planned, and what result was achieved.')}</p><div style="height:150px;margin-top:20px;border-radius:14px;background:linear-gradient(135deg,#d9e7f3,#efe3de 48%,#c7d9e7);position:relative;overflow:hidden"><span style="position:absolute;left:10px;bottom:10px;padding:6px 9px;border-radius:99px;background:#fff;font-size:10px">${lang==='ru'?'до':'before'}</span><span style="position:absolute;right:10px;bottom:10px;padding:6px 9px;border-radius:99px;background:#fff;font-size:10px">${lang==='ru'?'после':'after'}</span></div></article>`).join('');
    return pageShell(lang==='ru'?'Примеры работ':'Before & after', lang==='ru'?'Посмотрите похожие случаи лечения и общий подход к результату.':'Explore similar treatment examples and the overall approach to care.', `<div class="docGrid">${cards}</div>`);
  };
  window.locationPage = function(){
    return pageShell(tr('locationHeading'), tr('locationSub'), `<div class="docGrid"><article class="docCard"><h4>${lang==='ru'?'Майами, Флорида':'Miami, Florida'}</h4><p>${escapeHtml(lang==='ru'?'Ora поможет быстро найти адрес, уточнить время работы и подсказать, как связаться с клиникой.':'Ora can help you quickly find the address, office hours, and the best way to contact the clinic.')}</p><div class="locationMark">⌖</div></article><article class="docCard"><h4>${lang==='ru'?'Запись и вопросы':'Appointments & questions'}</h4><p>${escapeHtml(lang==='ru'?'Используйте чат Ora внизу или кнопку «Позвонить Ora», если хотите уточнить лечение, стоимость или запись.':'Use the Ora chat below or the Call Ora button if you want to ask about treatment, pricing, or booking.')}</p><div class="detailActions"><button class="actionBtn primary" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article></div>`);
  };
  window.legalPage = function(type){
    const privacy = type === 'privacy';
    return pageShell(privacy?tr('privacy'):tr('terms'), privacy?(lang==='ru'?'Как Ora использует информацию, которой вы делитесь.':'How Ora uses the information you share.'):(lang==='ru'?'Коротко о правилах использования Ora.':'A brief overview of how to use Ora.'), `<div class="docGrid"><article class="docCard"><h4>${privacy?(lang==='ru'?'Какие данные можно указать':'Information you may share'):(lang==='ru'?'Как помогает Ora':'How Ora helps')}</h4><p>${privacy?(lang==='ru'?'Вы можете делиться контактами, данными о записи, фотографиями, симптомами и информацией о страховке - только тем, что считаете нужным.':'You may share contact details, appointment information, photos, symptoms, and insurance details - only what you are comfortable sharing.'):(lang==='ru'?'Ora помогает разобраться в вопросах по лечению, стоимости, страховке и записи, но не заменяет осмотр врача.':'Ora can help with treatment, pricing, insurance, and booking questions, but it does not replace a doctor’s exam.')}</p></article><article class="docCard"><h4>${privacy?(lang==='ru'?'Ваш выбор':'Your choice'):(lang==='ru'?'Важно':'Important')}</h4><p>${privacy?(lang==='ru'?'Вы сами решаете, что отправлять в чат, и можете остановить разговор или звонок в любой момент.':'You decide what to share in chat and can stop the conversation or call at any time.'):(lang==='ru'?'Если у вас сильная боль, быстрое ухудшение состояния или экстренная ситуация, обратитесь за неотложной помощью.':'If you have severe pain, rapidly worsening symptoms, or an emergency, seek urgent medical care.')}</p></article></div>`);
  };
  window.insurancePage = function(){
    return pageShell(lang==='ru'?'Проверить страховку':'Check your insurance', lang==='ru'?'Введите страховую компанию и номер полиса. Ora покажет предварительную проверку и подскажет следующий шаг.':'Enter your insurance company and member ID. Ora will show a preliminary coverage check and the next step.', `<div class="docCard">${insuranceFormMarkup()}</div>`);
  };
  window.setLanguage(window.lang || 'en');
})();

(function(){
  const style = `
    .langSwitcher{position:relative;display:flex;align-items:center;justify-content:center}
    .langCurrent{width:42px;height:42px;border-radius:999px;border:1px solid var(--line);background:#fff;color:#55657a;display:grid;place-items:center;font-size:11px;font-weight:800;letter-spacing:.04em;cursor:pointer;box-shadow:0 5px 16px rgba(15,22,34,.06)}
    .langCurrent:hover{color:var(--blue);border-color:rgba(53,81,232,.25)}
    .langCurrent.open{box-shadow:0 10px 26px rgba(15,22,34,.1)}
    .langMenu{position:absolute;top:calc(100% + 8px);right:0;min-width:186px;padding:8px;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 18px 44px rgba(15,22,34,.14);display:none;z-index:15}
    .langSwitcher.open .langMenu{display:block}
    .langOption{width:100%;min-height:44px;padding:0 14px;border:0;border-radius:14px;background:transparent;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;color:var(--text);font-size:14px;font-weight:650;text-align:left}
    .langOption:hover,.langOption.active{background:var(--soft-blue);color:var(--blue)}
    .langOption small{color:#8a97a8;font-size:11px;font-weight:800;letter-spacing:.05em}
    .menuBtn{flex:0 0 44px}
    .menuBtn,.headerBtn,.bookBtn,.langCurrent{min-width:42px}
    .menuBtn svg{width:18px;height:18px;flex:0 0 18px}
    .composerVoice.recording{background:#ffe8eb;color:#c53f4a;border-color:#f1c6cb;box-shadow:0 8px 24px rgba(201,63,63,.16)}
    .composerVoice.recording svg{animation:pulseMic 1.1s infinite ease-in-out}
    .voiceHint{display:none}
    .voiceHint.show{display:block}
    .callCtl.end.iconOnly{width:36px;min-width:36px;padding:0;border-radius:50%;font-size:0;display:grid;place-items:center}
    .callCtl.end.iconOnly svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2}
    @keyframes pulseMic{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
    @media (max-width:900px){
      .langCurrent{width:40px;height:40px;font-size:10.5px}
      .menuBtn{flex-basis:40px}
      .menuBtn,.headerBtn,.bookBtn,.langCurrent{min-width:40px}
    }
    @media (max-width:560px){
      .langCurrent{width:36px;height:36px;font-size:10px}
      .langMenu{right:-2px;min-width:168px;border-radius:18px}
      .langOption{min-height:40px;font-size:13px}
      body.calling .bookBtn{display:none !important}
      body.calling .headerSpacer{display:none}
      body.calling .callSession{flex:1;max-width:none;min-width:0;padding:0 4px 0 8px;gap:4px}
      body.calling .callTime{margin-left:0}
      body.calling .callCtl.end{min-width:auto}
      body.calling .menuBtn{flex:0 0 36px;min-width:36px}
      body.calling .menuBtn svg{width:17px;height:17px}
      body.calling .langSwitcher{display:none}
    }
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>${style}</style>`);

  const headerLangOld = document.getElementById('headerLanguage');
  if(headerLangOld){
    headerLangOld.outerHTML = `
      <div class="langSwitcher" id="langSwitcher">
        <button class="langCurrent" id="langCurrent" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Language">EN</button>
        <div class="langMenu" id="langMenu" role="menu" aria-label="Language menu">
          <button class="langOption" type="button" data-set-lang="en" role="menuitem"><span>English</span><small>EN</small></button>
          <button class="langOption" type="button" data-set-lang="ru" role="menuitem"><span>Русский</span><small>RU</small></button>
          <button class="langOption" type="button" data-set-lang="he" role="menuitem"><span>עברית</span><small>HE</small></button>
          <button class="langOption" type="button" data-set-lang="es" role="menuitem"><span>Español</span><small>ES</small></button>
        </div>
      </div>`;
  }

  const langSwitcher = document.getElementById('langSwitcher');
  const langCurrent = document.getElementById('langCurrent');
  const langMenu = document.getElementById('langMenu');
  const langMeta = {en:'EN', ru:'RU', he:'HE', es:'ES'};
  function closeLangMenu(){
    if(!langSwitcher) return;
    langSwitcher.classList.remove('open');
    if(langCurrent) langCurrent.classList.remove('open');
    if(langCurrent) langCurrent.setAttribute('aria-expanded','false');
  }
  function syncLangMenu(){
    const current = window.lang || 'en';
    if(langCurrent) langCurrent.textContent = langMeta[current] || current.toUpperCase();
    document.querySelectorAll('#langMenu [data-set-lang]').forEach(btn=>{
      const active = btn.dataset.setLang === current;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true':'false');
    });
  }
  if(langCurrent){
    langCurrent.onclick = (e)=>{e.stopPropagation(); langSwitcher.classList.toggle('open'); langCurrent.classList.toggle('open'); langCurrent.setAttribute('aria-expanded', String(langSwitcher.classList.contains('open')));};
  }
  if(langMenu){
    langMenu.addEventListener('click', e=>e.stopPropagation());
  }
  document.addEventListener('click', e=>{ if(langSwitcher && !langSwitcher.contains(e.target)) closeLangMenu(); });
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeLangMenu(); });

  // prevent duplicate Home turns from multiple listeners firing.
  const _showHomeTurn = window.showHomeTurn;
  let lastHomeTurnAt = 0;
  window.showHomeTurn = function(note=''){
    const now = Date.now();
    if(now - lastHomeTurnAt < 280) return document.querySelector('.homeTurn:last-child');
    lastHomeTurnAt = now;
    return _showHomeTurn(note);
  };

  // Voice input button instead of composer call button.
  const voiceBtn = document.getElementById('composerCall');
  const micSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/><path d="M8 21h8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(voiceBtn){
    voiceBtn.classList.add('composerVoice');
    voiceBtn.setAttribute('aria-label','Voice input');
    voiceBtn.innerHTML = micSvg;
  }
  let recognition = null;
  let listening = false;
  function voiceToast(){
    showToast(window.lang==='ru'?'Голосовой ввод не поддерживается в этом браузере.':window.lang==='he'?'קלט קולי אינו נתמך בדפדפן זה.':window.lang==='es'?'La entrada por voz no es compatible con este navegador.':'Voice input is not supported in this browser.');
  }
  function stopListening(){
    listening = false;
    if(voiceBtn) voiceBtn.classList.remove('recording');
    try{ recognition && recognition.stop(); }catch(_e){}
  }
  function startListening(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ voiceToast(); return; }
    if(!recognition){
      recognition = new SR();
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      recognition.onresult = (event)=>{
        let transcript = '';
        for(let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
        const input = document.getElementById('input');
        if(input){
          const prefix = input.value.trim() ? (input.value.trim() + ' ') : '';
          input.value = prefix + transcript.trim();
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
      };
      recognition.onend = ()=>{ listening = false; if(voiceBtn) voiceBtn.classList.remove('recording'); };
      recognition.onerror = ()=>{ listening = false; if(voiceBtn) voiceBtn.classList.remove('recording'); };
    }
    recognition.lang = ({en:'en-US',ru:'ru-RU',he:'he-IL',es:'es-ES'})[window.lang || 'en'] || 'en-US';
    listening = true;
    if(voiceBtn) voiceBtn.classList.add('recording');
    recognition.start();
  }
  if(voiceBtn){
    voiceBtn.onclick = ()=>{ if(listening) stopListening(); else startListening(); };
  }

  // Make call header responsive and visible on mobile.
  const endCall = document.getElementById('endCall');
  const hangupSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.6 13.2 1.8 3c.3.5.9.8 1.5.8.2 0 .4 0 .6-.1l2.6-1.1c2.1 1.1 4.5 1.1 6.6 0l2.6 1.1c.2.1.4.1.6.1.6 0 1.2-.3 1.5-.8l1.8-3c.3-.5.2-1.1-.2-1.5A14.7 14.7 0 0 0 12 8.5c-3.2 0-6.2 1.1-8.2 3.2-.4.4-.5 1-.2 1.5Z"/></svg>';
  function refreshCallHeader(){
    if(!endCall) return;
    const ui = (window.uiCopy && uiCopy[window.lang]) || (window.uiCopy && uiCopy.en) || {end:'End'};
    const mobileCall = window.innerWidth <= 560 && document.body.classList.contains('calling');
    if(mobileCall){
      endCall.classList.add('iconOnly');
      endCall.innerHTML = hangupSvg;
      endCall.setAttribute('aria-label', ui.end || 'End');
      endCall.title = ui.end || 'End';
    } else {
      endCall.classList.remove('iconOnly');
      endCall.textContent = ui.end || 'End';
      endCall.setAttribute('aria-label', ui.end || 'End');
      endCall.removeAttribute('title');
    }
  }
  new MutationObserver(refreshCallHeader).observe(document.body, {attributes:true, attributeFilter:['class']});
  window.addEventListener('resize', refreshCallHeader, {passive:true});

  // Keep dropdown label and call layout in sync when language changes.
  const _setLanguage = window.setLanguage;
  window.setLanguage = function(next){
    _setLanguage(next);
    syncLangMenu();
    closeLangMenu();
    refreshCallHeader();
  };

  // Clean top-level RU label in header and voice button tooltip.
  const _updateStaticUi = window.updateStaticUi;
  if(_updateStaticUi){
    window.updateStaticUi = function(){
      _updateStaticUi();
      if(voiceBtn){
        const label = window.lang==='ru'?'Голосовой ввод':window.lang==='he'?'קלט קולי':window.lang==='es'?'Entrada por voz':'Voice input';
        voiceBtn.setAttribute('aria-label', label);
        voiceBtn.title = label;
      }
      refreshCallHeader();
      syncLangMenu();
    };
  }

  // Reorder menu labels if needed and ensure plain menu, no extra items.
  const menuMain = document.querySelector('.menuMain');
  if(menuMain){
    const items = [...menuMain.querySelectorAll('.menuItem')];
    const allowed = ['services','reviews','insurance','faq','about','location'];
    items.forEach(item=>{
      const page = item.dataset.page;
      if(page && !allowed.includes(page)) item.remove();
    });
  }

  // Ensure language dropdown works with existing delegated click handler.
  syncLangMenu();
  refreshCallHeader();
})();

(function(){
  const style = `
    .userBubbleChat,.chatBubble,.summaryRow,.chatInfoCard p,.docCard p,.cardDescription{overflow-wrap:anywhere;word-break:break-word}
    .composerMeta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;margin-top:8px}
    .composerMeta button{min-height:30px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted);cursor:pointer;font-size:12px;font-weight:650}
    .composerMeta button:hover{color:var(--blue);border-color:rgba(53,81,232,.24)}
    .revealCard{position:relative;overflow:hidden}
    .cardGlyph{width:72px;height:72px;border-radius:22px;display:grid;place-items:center;margin:12px 0 18px;background:linear-gradient(135deg,#eef5ff,#f7fbff);border:1px solid rgba(53,81,232,.08);font-size:34px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
    .revealCard:after{content:"";position:absolute;right:-40px;bottom:-46px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at center,rgba(53,81,232,.08),rgba(53,81,232,0));pointer-events:none}
    .workCardVisual{height:168px;margin:8px 0 16px;border-radius:22px;background:linear-gradient(135deg,#edf4fb,#f9fbff 45%,#f1f5fa);border:1px solid rgba(53,81,232,.08);display:grid;place-items:center;position:relative;overflow:hidden}
    .workCardVisual:before{content:"";position:absolute;inset:auto auto -20px -12px;width:120px;height:120px;background:radial-gradient(circle,rgba(53,81,232,.10),rgba(53,81,232,0));border-radius:50%}
    .workCardVisual span{position:relative;z-index:1;font-size:52px;filter:drop-shadow(0 6px 12px rgba(32,56,99,.08))}
    .workMeta{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:12px}
    .workMeta small{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
    @media (max-width:560px){
      .composerMeta{justify-content:flex-start;padding:0 4px}
      .composerMeta button{font-size:11px;min-height:28px}
      .cardGlyph{width:62px;height:62px;font-size:30px;border-radius:18px}
      .workCardVisual{height:144px}
      .workCardVisual span{font-size:44px}
    }
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>${style}</style>`);

  // Fix language dropdown selection.
  function bindLangOptions(){
    document.querySelectorAll('#langMenu .langOption').forEach(btn=>{
      btn.onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(typeof setLanguage === 'function') setLanguage(btn.dataset.setLang);
        const switcher=document.getElementById('langSwitcher');
        const current=document.getElementById('langCurrent');
        switcher && switcher.classList.remove('open');
        current && current.classList.remove('open');
        current && current.setAttribute('aria-expanded','false');
      };
    });
  }
  bindLangOptions();

  // Add compact legal links near the input.
  const composerShell = document.querySelector('.composerShell');
  if(composerShell && !document.getElementById('composerMeta')){
    const meta=document.createElement('div');
    meta.className='composerMeta';
    meta.id='composerMeta';
    meta.innerHTML=`<button type="button" id="composerPrivacyBtn">Privacy</button><button type="button" id="composerTermsBtn">Terms</button>`;
    composerShell.appendChild(meta);
    meta.querySelector('#composerPrivacyBtn').onclick=()=>openPage('privacy');
    meta.querySelector('#composerTermsBtn').onclick=()=>openPage('terms');
  }

  const glyphs={implant:'🦷',veneers:'✨',crown:'👑',emergency:'🚑',cleaning:'🪥',exam:'🩺',review0:'💬',review1:'💬',review2:'💬',review3:'💬',review4:'💬',review5:'💬',work1:'🦷',work2:'✨',work3:'🛠️',work4:'📷'};
  const workCases=[
    {key:'work1',title:{en:'Urgent dental exam',ru:'Срочный осмотр',es:'Consulta urgente',he:'בדיקה דחופה'},desc:{en:'Pain, swelling, chipped tooth. Ora helps the patient understand what to do first and how quickly to book.',ru:'Боль, отек, скол зуба. Ora помогает быстро понять, что делать в первую очередь и как скоро записаться.',es:'Dolor, inflamación o diente roto. Ora ayuda a entender el primer paso y qué tan rápido reservar.',he:'כאב, נפיחות או שן שבורה. Ora עוזרת להבין מהו הצעד הראשון וכמה מהר לקבוע תור.'}},
    {key:'work2',title:{en:'Smile design with veneers',ru:'Планирование улыбки с винирами',es:'Diseño de sonrisa con carillas',he:'עיצוב חיוך עם ציפויים'},desc:{en:'Aesthetic planning, material choice, and a clear idea of the expected result before treatment starts.',ru:'Эстетическое планирование, выбор материала и понятное ожидание результата еще до начала лечения.',es:'Planificación estética, elección del material y una idea clara del resultado antes del tratamiento.',he:'תכנון אסתטי, בחירת חומר והבנה ברורה של התוצאה עוד לפני תחילת הטיפול.'}},
    {key:'work3',title:{en:'Tooth restoration with a crown',ru:'Восстановление зуба коронкой',es:'Restauración con corona',he:'שיקום שן עם כתר'},desc:{en:'A damaged tooth is restored with a treatment plan adapted to condition, imaging, and function.',ru:'Поврежденный зуб восстанавливается по плану, который учитывает состояние зуба, диагностику и функцию.',es:'Un diente dañado se restaura con un plan adaptado al estado, la imagen y la función.',he:'שן פגועה משוקמת לפי תוכנית המותאמת למצב, להדמיה ולתפקוד.'}},
    {key:'work4',title:{en:'Single-tooth implant',ru:'Имплант одного зуба',es:'Implante de un diente',he:'שתל לשן אחת'},desc:{en:'An implant case where the patient can understand the main steps, timing, and total structure of the treatment.',ru:'Случай с имплантацией, где пациент заранее понимает основные этапы, сроки и общую структуру лечения.',es:'Un caso de implante donde el paciente entiende con claridad las etapas, los tiempos y la estructura del tratamiento.',he:'מקרה שתל שבו המטופל מבין מראש את השלבים, הזמנים ומבנה הטיפול.'}}
  ];

  const _carouselMarkup = window.carouselMarkup;
  window.carouselMarkup = function(id,cards){
    const initial=cards.length>1?1:0;
    return `<div class="carouselStage" data-carousel-stage="${id}" data-active-index="${initial}" tabindex="0" aria-label="Interactive carousel">
      <div class="carouselTrack" id="${id}-track">
        ${cards.map((c,i)=>{
          const full=String(c.desc||'');
          const short=truncateCardText(full,74);
          const glyph = glyphs[c.key] || '🦷';
          return `<div class="carouselItem" data-carousel-item data-index="${i}">
            <article class="revealCard" data-reveal-card data-card-index="${i}" data-key="${escapeHtml(c.key)}" data-full="${escapeHtml(full)}" data-short="${escapeHtml(short)}" tabindex="0" role="button" aria-label="${escapeHtml(c.title)}">
              <div class="cardTop"><h3 class="cardTitle">${escapeHtml(c.title)}</h3><span class="cardBadge">${escapeHtml(c.badge||'')}</span></div>
              ${c.price?`<div class="cardPrice">${escapeHtml(c.price)}<small>${escapeHtml(micro('range'))}</small></div>`:''}
              <div class="cardGlyph" aria-hidden="true">${glyph}</div>
              <button class="cardPlus" type="button" aria-label="${escapeHtml(micro('expand'))}" data-card-select="${i}"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>
              <p class="cardDescription">${wordsMarkup(i===initial?full:short)}</p>
            </article>
          </div>`
        }).join('')}
      </div>
      <div class="carouselControls" data-carousel-controls>
        <button type="button" data-carousel-step="-1" aria-label="${escapeHtml(micro('previous'))}"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
        <button type="button" data-carousel-step="1" aria-label="${escapeHtml(micro('next'))}"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>
      <div class="carouselHint">${escapeHtml(micro('drag'))}</div>
    </div>`;
  };

  function workCards(){
    return workCases.map((w,i)=>({title:loc(w.title),badge:lang==='ru'?'Наши работы':'Our work',price:'',desc:loc(w.desc),key:w.key,index:i}))
  }

  window.worksPage = function(){
    return pageShell(lang==='ru'?'Наши работы':'Our work', lang==='ru'?'Похожие клинические случаи и подход к лечению.':'Similar clinical situations and the way treatment is approached.', `<section class="carouselSection"><div>${carouselMarkup('page-work-cases',workCards())}</div></section>`);
  };

  const _chatMarkup = window.chatMarkup;
  window.chatMarkup = function(type,key=''){
    if(type==='works') return `<div class="chatContentCard">${chatHeader(lang==='ru'?'НАШИ РАБОТЫ':'OUR WORK',tr('ourWork'),lang==='ru'?'Похожие случаи, чтобы было проще представить путь лечения и ожидаемый результат.':'Similar cases to help the patient imagine the treatment path and the expected result.')}<div class="chatContentBody">${carouselMarkup('chat-works-'+(++chatInstance),workCards())}</div></div>`;
    return _chatMarkup(type,key);
  };

  // Localize meta buttons and clean some header text.
  const baseUpdate = window.updateStaticUi;
  window.updateStaticUi = function(){
    baseUpdate && baseUpdate();
    const privacy = document.getElementById('composerPrivacyBtn');
    const terms = document.getElementById('composerTermsBtn');
    if(privacy) privacy.textContent = tr('privacy');
    if(terms) terms.textContent = tr('terms');
  };

  // Run initial refresh.
  if(typeof updateStaticUi==='function') updateStaticUi();
  if(typeof renderAllCarousels==='function') renderAllCarousels();
})();

(function(){
  const style=`
    .langCurrent{font-variant-numeric:tabular-nums}
    .cardGlyph{width:84px;height:84px;border-radius:24px;display:grid;place-items:center;margin:14px 0 18px;background:linear-gradient(135deg,#eef6ff,#f8fbff);border:1px solid rgba(53,81,232,.09);color:#2f7df4;box-shadow:inset 0 1px 0 rgba(255,255,255,.75)}
    .cardGlyph svg{width:50px;height:50px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
    .workVisualArt{height:164px;margin:12px 0 18px;border-radius:22px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(53,81,232,.09);background:#f7fbff}
    .workVisualSide{position:relative;display:grid;place-items:center;min-width:0;background:linear-gradient(160deg,#eff5fb,#f9fbfd)}
    .workVisualSide+ .workVisualSide{border-left:1px solid rgba(53,81,232,.08);background:linear-gradient(160deg,#f8fbff,#eef6ff)}
    .workVisualSide svg{width:58px;height:58px;stroke:#2f7df4;fill:none;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
    .workVisualSide small{position:absolute;left:8px;bottom:8px;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.92);color:#647890;font-size:9px;font-weight:750;letter-spacing:.06em;text-transform:uppercase}
    .composerMeta button{font-size:12px}
    @media(max-width:560px){.cardGlyph{width:72px;height:72px;border-radius:21px}.cardGlyph svg{width:44px;height:44px}.workVisualArt{height:146px}.workVisualSide svg{width:50px;height:50px}}
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${style}</style>`);

  if(window.langCopy){
    langCopy.en.terms='Terms of use';
    langCopy.ru.terms='Пользовательское соглашение';
    langCopy.es.terms='Condiciones de uso';
    langCopy.he.terms='תנאי שימוש';
  }

  const langCodes={en:'EN',ru:'RU',he:'HE',es:'ES'};
  const baseSetLanguage=window.setLanguage;
  window.setLanguage=function(next){
    baseSetLanguage(next);
    const current=document.getElementById('langCurrent');
    if(current) current.textContent=langCodes[next]||String(next||'en').toUpperCase();
    document.querySelectorAll('#langMenu [data-set-lang]').forEach(btn=>btn.classList.toggle('active',btn.dataset.setLang===next));
    const privacy=document.getElementById('composerPrivacyBtn');
    const terms=document.getElementById('composerTermsBtn');
    if(privacy)privacy.textContent=tr('privacy');
    if(terms)terms.textContent=tr('terms');
  };

  function toothSvg(extra=''){
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 14c4-5 10-6 14-3 4-3 10-2 14 3 5 6 2 15 0 22-2 7-4 17-8 17-4 0-3-11-6-11s-2 11-6 11c-4 0-6-10-8-17-2-7-5-16 0-22Z"/>${extra}</svg>`;
  }
  function serviceIconSvg(key){
    if(key==='implant')return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 12c4-4 9-5 12-2 4-3 9-2 12 2 4 5 2 12 0 18-2 5-3 12-6 12-3 0-3-8-6-8s-3 8-6 8c-3 0-4-7-6-12-2-6-4-13 0-18Z"/><path d="M32 35v17M26 43h12M27 48h10M29 53h6"/></svg>`;
    if(key==='veneers')return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 17c3-4 8-5 12-2 4-3 9-2 12 2 4 5 2 12 0 18-2 6-4 14-8 14-3 0-2-9-4-9s-2 9-5 9c-4 0-6-8-8-14-2-6-3-13 1-18Z"/><path d="M48 11v8M44 15h8M14 10v6M11 13h6"/></svg>`;
    if(key==='crown')return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M19 27 24 15l8 8 8-8 5 12-3 7H22l-3-7Z"/><path d="M22 34h20M24 38h16M27 42h10"/><path d="M24 38c1 8 2 13 5 13 2 0 1-8 3-8s1 8 3 8c3 0 4-5 5-13"/></svg>`;
    if(key==='emergency')return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 18c3-5 9-6 15-2 5-4 11-3 15 2 4 6 1 15-1 21-2 6-4 13-8 13-3 0-2-9-6-9s-3 9-6 9c-4 0-6-8-8-14-2-6-5-14-1-20Z"/><path d="m36 11-8 14h8l-6 13 14-17h-8l6-10"/></svg>`;
    if(key==='cleaning')return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 46 45 14M18 51 50 19"/><path d="m43 12 9 9M39 17l8 8"/><path d="M16 43 10 49l5 5 6-6"/><path d="M50 38v9M46 42h9"/></svg>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="30" cy="29" r="14"/><path d="m40 39 12 12M20 29h20M30 19v20"/><path d="M12 13h10"/></svg>`;
  }
  function workVisualSvg(key){
    const base= key==='work2'?serviceIconSvg('veneers'):key==='work3'?serviceIconSvg('crown'):key==='work4'?serviceIconSvg('implant'):serviceIconSvg('emergency');
    return base;
  }

  const originalCarouselMarkup=window.carouselMarkup;
  window.carouselMarkup=function(id,cards){
    const initial=cards.length>1?1:0;
    return `<div class="carouselStage" data-carousel-stage="${id}" data-active-index="${initial}" tabindex="0" aria-label="Interactive carousel">
      <div class="carouselTrack" id="${id}-track">
        ${cards.map((c,i)=>{
          const full=String(c.desc||'');
          const short=truncateCardText(full,74);
          const isWork=String(c.key||'').startsWith('work');
          const visual=isWork
            ? `<div class="workVisualArt" aria-hidden="true"><div class="workVisualSide">${workVisualSvg(c.key)}<small>${lang==='ru'?'до':lang==='he'?'לפני':lang==='es'?'antes':'before'}</small></div><div class="workVisualSide">${workVisualSvg(c.key)}<small>${lang==='ru'?'после':lang==='he'?'אחרי':lang==='es'?'después':'after'}</small></div></div>`
            : `<div class="cardGlyph" aria-hidden="true">${serviceIconSvg(c.key)}</div>`;
          return `<div class="carouselItem" data-carousel-item data-index="${i}">
            <article class="revealCard" data-reveal-card data-card-index="${i}" data-key="${escapeHtml(c.key)}" data-full="${escapeHtml(full)}" data-short="${escapeHtml(short)}" tabindex="0" role="button" aria-label="${escapeHtml(c.title)}">
              <div class="cardTop"><h3 class="cardTitle">${escapeHtml(c.title)}</h3><span class="cardBadge">${escapeHtml(c.badge||'')}</span></div>
              ${c.price?`<div class="cardPrice">${escapeHtml(c.price)}<small>${escapeHtml(micro('range'))}</small></div>`:''}
              ${visual}
              <button class="cardPlus" type="button" aria-label="${escapeHtml(micro('expand'))}" data-card-select="${i}"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>
              <p class="cardDescription">${wordsMarkup(i===initial?full:short)}</p>
            </article>
          </div>`
        }).join('')}
      </div>
      <div class="carouselControls" data-carousel-controls>
        <button type="button" data-carousel-step="-1" aria-label="${escapeHtml(micro('previous'))}"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
        <button type="button" data-carousel-step="1" aria-label="${escapeHtml(micro('next'))}"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>
      <div class="carouselHint">${escapeHtml(micro('drag'))}</div>
    </div>`;
  };

  const workCases=[
    {key:'work1',title:{en:'Urgent dental exam',ru:'Срочный осмотр',es:'Consulta urgente',he:'בדיקה דחופה'},desc:{en:'Pain, swelling, or a chipped tooth. Ora helps the patient understand what to do first and how quickly to book.',ru:'Боль, отек или скол зуба. Ora помогает быстро понять, что делать в первую очередь и как скоро записаться.',es:'Dolor, inflamación o diente roto. Ora ayuda a entender el primer paso y qué tan rápido reservar.',he:'כאב, נפיחות או שן שבורה. Ora עוזרת להבין מהו הצעד הראשון וכמה מהר לקבוע תור.'}},
    {key:'work2',title:{en:'Smile planning with veneers',ru:'Планирование улыбки с винирами',es:'Diseño de sonrisa con carillas',he:'עיצוב חיוך עם ציפויים'},desc:{en:'Aesthetic planning, material choice, and a clear idea of the expected result before treatment starts.',ru:'Эстетическое планирование, выбор материала и понятное ожидание результата еще до начала лечения.',es:'Planificación estética, elección del material y una idea clara del resultado antes del tratamiento.',he:'תכנון אסתטי, בחירת חומר והבנה ברורה של התוצאה עוד לפני תחילת הטיפול.'}},
    {key:'work3',title:{en:'Tooth restoration with a crown',ru:'Восстановление зуба коронкой',es:'Restauración con corona',he:'שיקום שן עם כתר'},desc:{en:'A damaged tooth is restored with a treatment plan adapted to condition, imaging, and function.',ru:'Поврежденный зуб восстанавливается по плану, который учитывает состояние зуба, диагностику и функцию.',es:'Un diente dañado se restaura con un plan adaptado al estado, la imagen y la función.',he:'שן פגועה משוקמת לפי תוכנית המותאמת למצב, להדמיה ולתפקוד.'}},
    {key:'work4',title:{en:'Single-tooth implant',ru:'Имплант одного зуба',es:'Implante de un diente',he:'שתל לשן אחת'},desc:{en:'An implant case where the patient can understand the main steps, timing, and overall treatment structure.',ru:'Случай с имплантацией, где пациент заранее понимает основные этапы, сроки и общую структуру лечения.',es:'Un caso de implante donde el paciente entiende las etapas, los tiempos y la estructura del tratamiento.',he:'מקרה שתל שבו המטופל מבין מראש את השלבים, הזמנים ומבנה הטיפול.'}}
  ];
  function workCards(){return workCases.map((w,i)=>({title:loc(w.title),badge:lang==='ru'?'Наши работы':lang==='he'?'עבודות':lang==='es'?'Trabajos':'Our work',price:'',desc:loc(w.desc),key:w.key,index:i}))}

  window.worksPage=function(){return pageShell(lang==='ru'?'Наши работы':tr('ourWork'),lang==='ru'?'Похожие случаи, чтобы было проще понять путь лечения и ожидаемый результат.':'Similar cases to help explain the treatment path and expected result.',`<section class="carouselSection"><div>${carouselMarkup('page-works-visual',workCards())}</div></section>`)};
  const baseChatMarkup=window.chatMarkup;
  window.chatMarkup=function(type,key=''){
    if(type==='works')return `<div class="chatContentCard">${chatHeader(lang==='ru'?'НАШИ РАБОТЫ':'OUR WORK',tr('ourWork'),lang==='ru'?'Похожие случаи, чтобы было проще представить путь лечения и ожидаемый результат.':'Similar cases to help explain the treatment path and expected result.')}<div class="chatContentBody">${carouselMarkup('chat-works-visual-'+(++chatInstance),workCards())}</div></div>`;
    return baseChatMarkup(type,key);
  };

  const baseUpdate=window.updateStaticUi;
  window.updateStaticUi=function(){
    baseUpdate&&baseUpdate();
    const current=document.getElementById('langCurrent');
    if(current)current.textContent={en:'EN',ru:'RU',he:'HE',es:'ES'}[lang]||String(lang).toUpperCase();
    const privacy=document.getElementById('composerPrivacyBtn');
    const terms=document.getElementById('composerTermsBtn');
    if(privacy)privacy.textContent=tr('privacy');
    if(terms)terms.textContent=tr('terms');
  };

  // Rebind language options after all wrappers are in place.
  document.querySelectorAll('#langMenu .langOption').forEach(btn=>{
    btn.onclick=(e)=>{e.preventDefault();e.stopPropagation();setLanguage(btn.dataset.setLang);const sw=document.getElementById('langSwitcher');sw&&sw.classList.remove('open');const cur=document.getElementById('langCurrent');cur&&cur.setAttribute('aria-expanded','false');};
  });

  updateStaticUi();
})();

(function(){
  if(typeof langCopy!=='undefined'){
    langCopy.en.terms='Terms of use';
    langCopy.ru.terms='Пользовательское соглашение';
    langCopy.es.terms='Condiciones de uso';
    langCopy.he.terms='תנאי שימוש';
    langCopy.en.privacy='Privacy';
    langCopy.ru.privacy='Конфиденциальность';
  }
  const prevUpdate=window.updateStaticUi;
  window.updateStaticUi=function(){
    prevUpdate&&prevUpdate();
    const current=document.getElementById('langCurrent');
    if(current)current.textContent={en:'EN',ru:'RU',he:'HE',es:'ES'}[lang]||String(lang).toUpperCase();
    const privacy=document.getElementById('composerPrivacyBtn');
    const terms=document.getElementById('composerTermsBtn');
    if(privacy)privacy.textContent=tr('privacy');
    if(terms)terms.textContent=tr('terms');
  };
  updateStaticUi();
})();

(function(){
  const style=`
    /* v48 booking scenarios + reliable chat viewport */
    .site.chatFeed{padding-bottom:130px!important}
    .chatTurn{scroll-margin-top:18px;scroll-margin-bottom:28px}
    .chatTurnBody,.chatBlockHost{max-width:100%;min-width:0}
    .chatContentCard{max-width:100%}
    .welcomeBubble,.homeBubble{width:100%!important;max-width:none!important;box-sizing:border-box}
    .welcomeBubble h1,.welcomeBubble p,.homeBubble h2,.homeBubble p{max-width:none!important}
    .scheduleIntro{margin:0 0 14px;padding:12px 14px;border-radius:14px;background:#f5f9ff;color:#4c6380;font-size:13px;line-height:1.55}
    .scheduleIntro strong{color:#173d69}
    .dateModeRow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    .dateModeBtn{min-height:40px;padding:0 13px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--text);cursor:pointer;font-size:13px;font-weight:680}
    .dateModeBtn.active{background:var(--soft-blue);border-color:rgba(47,125,244,.35);color:var(--blue)}
    .calendarGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;margin-top:8px}
    .calendarDay{min-width:0;min-height:76px;padding:10px 6px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--text);cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
    .calendarDay:hover{border-color:rgba(47,125,244,.35);background:#fbfdff}
    .calendarDay.active{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 8px 18px rgba(47,125,244,.18)}
    .calendarDay .dow{font-size:10px;font-weight:760;text-transform:uppercase;letter-spacing:.05em;opacity:.72}
    .calendarDay .dateNo{font-size:20px;font-weight:720;line-height:1}
    .calendarDay .month{font-size:10px;opacity:.72}
    .urgentDays{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    .urgentDay{min-height:58px;padding:10px 13px;border:1px solid var(--line);border-radius:14px;background:#fff;text-align:left;cursor:pointer}
    .urgentDay strong{display:block;font-size:14px;color:#1c426e}
    .urgentDay span{display:block;margin-top:3px;font-size:11px;color:var(--muted)}
    .urgentDay.active{background:#fff1f2;border-color:rgba(202,68,82,.28)}
    .urgentDay.active strong{color:#b43a49}
    .slotSection{margin-top:16px}
    .slotSection[hidden]{display:none!important}
    .slotHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
    .slotHeader strong{font-size:14px;color:#244a76}
    .slotHeader small{font-size:11px;color:var(--muted)}
    .timeGrid.scenarioTimes{grid-template-columns:repeat(4,minmax(0,1fr))}
    .timeBtn.urgentSlot{border-color:rgba(205,78,91,.18);background:#fffafa}
    .timeBtn.cleaningSlot{background:#f9fffc;border-color:rgba(52,153,111,.16)}
    .bookingScenarioIcon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;margin-right:8px;background:#eef5ff;font-size:15px;vertical-align:-7px}
    [data-carousel-stage*="works"]{height:530px!important;min-height:530px!important}
    [data-carousel-stage*="works"] .carouselTrack{height:520px!important}
    [data-carousel-stage*="works"] .revealCard{min-height:410px!important;max-height:455px!important}
    @media(max-width:800px){
      .calendarGrid{grid-template-columns:repeat(4,minmax(0,1fr))}
      .timeGrid.scenarioTimes{grid-template-columns:repeat(3,minmax(0,1fr))}
      [data-carousel-stage*="works"]{height:480px!important;min-height:480px!important}
      [data-carousel-stage*="works"] .carouselTrack{height:470px!important}
      [data-carousel-stage*="works"] .revealCard{min-height:365px!important;max-height:420px!important}
    }
    @media(max-width:560px){
      .site.chatFeed{padding-bottom:110px!important}
      .calendarGrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
      .calendarDay{min-height:68px;border-radius:12px}
      .calendarDay .dateNo{font-size:18px}
      .urgentDays{grid-template-columns:1fr}
      .timeGrid.scenarioTimes{grid-template-columns:repeat(2,minmax(0,1fr))}
      .scheduleIntro{font-size:12.5px;padding:11px 12px}
      [data-carousel-stage*="works"]{height:445px!important;min-height:445px!important}
      [data-carousel-stage*="works"] .carouselTrack{height:435px!important}
      [data-carousel-stage*="works"] .revealCard{min-height:350px!important;max-height:395px!important}
    }
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${style}</style>`);

  const localeMap={en:'en-US',ru:'ru-RU',he:'he-IL',es:'es-ES'};
  const weekdayMap={
    en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    ru:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
    es:['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    he:['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']
  };
  const monthMap={
    en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    ru:['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'],
    es:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
    he:['ינו׳','פבר׳','מרץ','אפר׳','מאי','יונ׳','יול׳','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳']
  };
  function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function parseDateKey(key){const [y,m,d]=String(key||'').split('-').map(Number);return new Date(y,m-1,d)}
  function addDays(base,n){const d=new Date(base.getFullYear(),base.getMonth(),base.getDate());d.setDate(d.getDate()+n);return d}
  function calendarDates(kind){
    const today=new Date();const out=[];let n=0;
    while(out.length<(kind==='cleaning'?9:8) && n<20){
      const d=addDays(today,n++);
      if(kind==='cleaning' && d.getDay()===0)continue;
      out.push(d);
    }
    return out;
  }
  function prettyDate(key){
    if(!key)return'';const d=parseDateKey(key);
    try{return new Intl.DateTimeFormat(localeMap[lang]||'en-US',{weekday:'short',month:'short',day:'numeric'}).format(d)}catch{return key}
  }
  function calendarMarkup(kind){
    return `<div class="calendarGrid">${calendarDates(kind).map(d=>{const key=dateKey(d);return `<button class="calendarDay ${booking.date===key?'active':''}" type="button" data-book-date="${key}"><span class="dow">${weekdayMap[lang]?.[d.getDay()]||weekdayMap.en[d.getDay()]}</span><span class="dateNo">${d.getDate()}</span><span class="month">${monthMap[lang]?.[d.getMonth()]||monthMap.en[d.getMonth()]}</span></button>`}).join('')}</div>`;
  }
  function urgentDaysMarkup(){
    const today=new Date(),tomorrow=addDays(today,1);const items=[['today',today],['tomorrow',tomorrow]];
    return `<div class="urgentDays">${items.map(([key,d])=>`<button class="urgentDay ${booking.day===key?'active':''}" type="button" data-urgent-day="${key}" data-book-date="${dateKey(d)}"><strong>${key==='today'?(lang==='ru'?'Сегодня':lang==='es'?'Hoy':lang==='he'?'היום':'Today'):(lang==='ru'?'Завтра':lang==='es'?'Mañana':lang==='he'?'מחר':'Tomorrow')}</strong><span>${prettyDate(dateKey(d))}</span></button>`).join('')}</div>`;
  }
  function timeSlotsFor(visit,date){
    const d=date?parseDateKey(date):new Date();const dow=d.getDay();
    const urgent={0:['10:20 AM','12:10 PM','3:40 PM'],1:['9:20 AM','11:10 AM','1:40 PM','4:20 PM','6:00 PM'],2:['8:50 AM','10:40 AM','12:30 PM','3:10 PM','5:40 PM'],3:['9:30 AM','11:50 AM','2:20 PM','4:50 PM'],4:['8:40 AM','10:10 AM','1:20 PM','3:50 PM','5:30 PM'],5:['9:10 AM','11:40 AM','2:10 PM','4:30 PM'],6:['9:40 AM','12:20 PM','3:30 PM']}[dow];
    const exam={0:['11:00 AM','2:00 PM','4:30 PM'],1:['10:30 AM','12:00 PM','2:30 PM','5:00 PM'],2:['9:40 AM','11:20 AM','1:50 PM','4:10 PM'],3:['10:00 AM','12:40 PM','3:00 PM','5:20 PM'],4:['9:30 AM','11:50 AM','2:20 PM','4:40 PM'],5:['10:20 AM','1:00 PM','3:30 PM'],6:['10:00 AM','12:30 PM','3:00 PM']}[dow];
    const cleaning={0:[],1:['9:00 AM','11:30 AM','1:30 PM','4:00 PM'],2:['8:30 AM','10:30 AM','1:00 PM','3:30 PM','5:00 PM'],3:['9:30 AM','12:00 PM','2:30 PM','4:30 PM'],4:['8:40 AM','11:10 AM','1:40 PM','4:10 PM'],5:['9:00 AM','11:00 AM','1:30 PM','3:30 PM'],6:['9:30 AM','12:00 PM','2:00 PM']}[dow];
    let slots=visit==='emergency'?urgent:visit==='cleaning'?cleaning:exam;
    // Same-day urgent care only shows times that are still reasonably ahead.
    if(visit==='emergency' && dateKey(d)===dateKey(new Date())){
      const now=new Date();slots=slots.filter(label=>{
        const match=label.match(/(\d+):(\d+)\s*(AM|PM)/);if(!match)return true;
        let h=Number(match[1])%12;if(match[3]==='PM')h+=12;const mins=h*60+Number(match[2]);return mins>now.getHours()*60+now.getMinutes()+45;
      });
      if(!slots.length)slots=['5:40 PM','6:20 PM'];
    }
    return slots;
  }
  function slotsMarkup(visit){
    if(!booking.date)return'';
    const slots=timeSlotsFor(visit,booking.date);
    const label=visit==='emergency'?(lang==='ru'?'Доступно для срочного приема':lang==='es'?'Disponible para urgencias':lang==='he'?'זמין לבדיקה דחופה':'Available for urgent care'):visit==='cleaning'?(lang==='ru'?'Время для чистки':lang==='es'?'Horarios de limpieza':lang==='he'?'שעות לניקוי':'Cleaning times'):(lang==='ru'?'Время консультации':lang==='es'?'Horarios de consulta':lang==='he'?'שעות לייעוץ':'Consultation times');
    return `<div class="slotSection"><div class="slotHeader"><strong>${label}</strong><small>${prettyDate(booking.date)}</small></div><div class="timeGrid scenarioTimes">${slots.map(t=>`<button class="timeBtn ${booking.time===t?'active':''} ${visit==='emergency'?'urgentSlot':visit==='cleaning'?'cleaningSlot':''}" type="button" data-book-time="${t}">${t}</button>`).join('')}</div></div>`;
  }
  function visitSelector(){
    const options=[
      ['emergency',lang==='ru'?'Боль / срочно':lang==='es'?'Dolor / urgente':lang==='he'?'כאב / דחוף':'Tooth pain / urgent','⚡'],
      ['exam',lang==='ru'?'Осмотр / консультация':lang==='es'?'Examen / consulta':lang==='he'?'בדיקה / ייעוץ':'Exam / consultation','◉'],
      ['cleaning',lang==='ru'?'Профессиональная чистка':lang==='es'?'Limpieza profesional':lang==='he'?'ניקוי מקצועי':'Professional cleaning','✦']
    ];
    return `<div class="choiceGrid">${options.map(([k,l,icon])=>`<button class="choice ${booking.visit===k?'active':''}" type="button" data-book-choice="visit" data-value="${k}"><span class="bookingScenarioIcon">${icon}</span>${l}</button>`).join('')}</div>`;
  }
  function scheduleMarkup(){
    if(!booking.visit)return `<div class="flowSection"><span class="flowLabel">${lang==='ru'?'Повод обращения':lang==='es'?'Motivo de la visita':lang==='he'?'סיבת הביקור':'Visit type'}</span>${visitSelector()}</div>`;
    let body=`<div class="flowSection"><span class="flowLabel">${lang==='ru'?'Повод обращения':lang==='es'?'Motivo de la visita':lang==='he'?'סיבת הביקור':'Visit type'}</span>${visitSelector()}</div>`;
    if(booking.visit==='emergency'){
      body+=`<div class="flowSection"><div class="scheduleIntro"><strong>${lang==='ru'?'Срочный прием':lang==='es'?'Atención urgente':lang==='he'?'בדיקה דחופה':'Urgent care'}</strong><br>${lang==='ru'?'Сегодня выбрано автоматически. Если удобнее, можно посмотреть время на завтра.':lang==='es'?'Hoy se selecciona automáticamente. También puedes ver mañana.':lang==='he'?'היום נבחר אוטומטית. אפשר גם לבדוק מחר.':'Today is selected automatically. You can also check tomorrow.'}</div>${urgentDaysMarkup()}${slotsMarkup('emergency')}</div>`;
    }else if(booking.visit==='exam'){
      body+=`<div class="flowSection"><div class="scheduleIntro"><strong>${lang==='ru'?'Осмотр и консультация':lang==='es'?'Examen y consulta':lang==='he'?'בדיקה וייעוץ':'Exam & consultation'}</strong><br>${lang==='ru'?'Сначала выберите подходящий день. После этого покажем свободное время именно на эту дату.':lang==='es'?'Primero elige el día. Después verás los horarios disponibles para esa fecha.':lang==='he'?'קודם בוחרים יום, ואז יוצגו השעות הפנויות לאותו תאריך.':'Choose a day first. Then we’ll show the available times for that date.'}</div><div class="dateModeRow"><button class="dateModeBtn ${booking.dateMode==='next'?'active':''}" type="button" data-date-mode="next">${lang==='ru'?'Ближайшее время':lang==='es'?'Próxima disponibilidad':lang==='he'?'המועד הקרוב':'Next available'}</button><button class="dateModeBtn ${booking.dateMode!=='next'?'active':''}" type="button" data-date-mode="calendar">${lang==='ru'?'Выбрать дату':lang==='es'?'Elegir fecha':lang==='he'?'בחירת תאריך':'Choose date'}</button></div>${calendarMarkup('exam')}${slotsMarkup('exam')}</div>`;
    }else{
      body+=`<div class="flowSection"><div class="scheduleIntro"><strong>${lang==='ru'?'Профессиональная чистка':lang==='es'?'Limpieza profesional':lang==='he'?'ניקוי מקצועי':'Professional cleaning'}</strong><br>${lang==='ru'?'Для чистки доступно другое расписание. Выберите удобный день, затем подходящее время.':lang==='es'?'La limpieza tiene su propio horario. Elige el día y luego la hora.':lang==='he'?'לניקוי יש לוח זמנים נפרד. בחרו יום ואז שעה.':'Cleaning has its own schedule. Choose a day, then a time.'}</div>${calendarMarkup('cleaning')}${slotsMarkup('cleaning')}</div>`;
    }
    const ready=booking.visit&&booking.date&&booking.time;
    body+=`<div class="flowSection"><div class="flowActions"><div class="flowActionGroup"><button class="flowBtn primary" data-book-next type="button" ${ready?'':'disabled'}>${lang==='ru'?'Продолжить':lang==='es'?'Continuar':lang==='he'?'המשך':'Continue'}</button></div></div><div class="bookingCancelRow"><button class="flowBtn" data-book-cancel type="button">${escapeHtml(v40().cancel)}</button><p class="bookingCancelHint">${escapeHtml(v40().cancelHint)}</p></div></div>`;
    return body;
  }

  const baseBookingMarkup=window.bookingMarkup;
  window.bookingMarkup=function(step=1){
    if(step!==1)return baseBookingMarkup(step);
    const c=v40();
    return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${lang==='ru'?'ЗАПИСЬ':lang==='es'?'CITA':lang==='he'?'קביעת תור':'BOOKING'}</div><h2>${lang==='ru'?'Выберите прием и время':lang==='es'?'Elige visita y hora':lang==='he'?'בחרו ביקור ושעה':'Choose visit and time'}</h2><p>${lang==='ru'?'Расписание меняется в зависимости от причины визита.':lang==='es'?'El horario cambia según el tipo de visita.':lang==='he'?'השעות משתנות לפי סוג הביקור.':'Availability changes depending on the type of visit.'}</p></div><div class="chatContentHeadActions"><span class="stepPill">1 / 4</span></div></div><div class="chatContentBody"><div class="flow">${scheduleMarkup()}</div></div></div>`;
  };

  const baseBindBooking=window.bindChatBooking;
  window.bindChatBooking=function(root){
    // Custom step 1 handlers; keep later steps from existing flow.
    if(booking.step!==1){baseBindBooking(root);return}
    root.querySelectorAll('[data-book-choice="visit"]').forEach(b=>b.onclick=()=>{
      booking.visit=b.dataset.value;booking.time='';booking.date='';booking.day='';booking.dateMode='calendar';
      if(booking.visit==='emergency'){
        booking.day='today';booking.date=dateKey(new Date());
      }
      renderBooking(1);
    });
    root.querySelectorAll('[data-urgent-day]').forEach(b=>b.onclick=()=>{
      booking.day=b.dataset.urgentDay;booking.date=b.dataset.bookDate;booking.time='';renderBooking(1);
    });
    root.querySelectorAll('[data-book-date]').forEach(b=>b.onclick=()=>{
      booking.date=b.dataset.bookDate;booking.time='';
      if(booking.visit==='emergency')booking.day=b.closest('[data-urgent-day]')?.dataset.urgentDay||booking.day;
      renderBooking(1);
    });
    root.querySelectorAll('[data-date-mode]').forEach(b=>b.onclick=()=>{
      booking.dateMode=b.dataset.dateMode;
      if(booking.dateMode==='next' && booking.visit==='exam'){
        const first=calendarDates('exam').find(d=>timeSlotsFor('exam',dateKey(d)).length);
        booking.date=first?dateKey(first):'';booking.time='';
      }else if(booking.dateMode==='calendar'){
        booking.time='';
      }
      renderBooking(1);
    });
    root.querySelectorAll('[data-book-time]').forEach(b=>b.onclick=()=>{booking.time=b.dataset.bookTime;renderBooking(1)});
    root.querySelector('[data-book-next]')?.addEventListener('click',()=>renderBooking(2));
    root.querySelector('[data-book-cancel]')?.addEventListener('click',cancelBooking);
    bindChatRoot(root);
  };

  // Ensure date is represented correctly on review step.
  const oldBookingMarkup=window.bookingMarkup;
  window.bookingMarkup=function(step=1){
    let html=oldBookingMarkup(step);
    if(step===3 && booking.date){
      const dayText=prettyDate(booking.date);
      html=html.replace(/(<span>Когда<\/span><b>)(.*?)(<\/b>)/,`$1${escapeHtml(dayText)} · ${escapeHtml(booking.time)}$3`)
               .replace(/(<span>When<\/span><b>)(.*?)(<\/b>)/,`$1${escapeHtml(dayText)} · ${escapeHtml(booking.time)}$3`);
    }
    return html;
  };

  // Controlled viewport scrolling: show a whole new block when it fits, otherwise start at its top.
  function scrollTurnIntoView(el,mode='auto'){
    const vp=document.getElementById('viewport');if(!vp||!el)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const vr=vp.getBoundingClientRect(),er=el.getBoundingClientRect();
      const topPad=18,bottomPad=26;const available=vp.clientHeight-topPad-bottomPad;
      let target;
      if(er.height<=available){
        target=vp.scrollTop+(er.top-vr.top)-topPad-Math.max(0,(available-er.height)/2);
      }else{
        target=vp.scrollTop+(er.top-vr.top)-topPad;
      }
      const max=Math.max(0,vp.scrollHeight-vp.clientHeight);
      vp.scrollTo({top:Math.max(0,Math.min(max,target)),behavior:mode==='instant'?'auto':'smooth'});
    }));
  }
  const priorAddOraBlock=window.addOraBlock;
  window.addOraBlock=function(html,type='block'){
    // Recreate instead of calling the previous auto-scroll version, so one scroll policy wins.
    const el=document.createElement('section');el.className='chatTurn assistantTurn contentTurn';el.dataset.chatType=type;
    el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="chatBlockHost"></div></div>`;
    el.querySelector('.chatBlockHost').innerHTML=html;document.getElementById('site').appendChild(el);hydrateCarousels(el);bindChatRoot(el);
    scrollTurnIntoView(el);return el;
  };
  window.renderBooking=function(step=1){
    booking.step=step;
    const created=!activeBookingRoot||!activeBookingRoot.isConnected;
    if(created){activeBookingRoot=addOraBlock('<div data-active-booking></div>','booking').querySelector('[data-active-booking]')}
    activeBookingRoot.innerHTML=bookingMarkup(step);bindChatBooking(activeBookingRoot);hydrateCarousels(activeBookingRoot);
    scrollTurnIntoView(activeBookingRoot.closest('.chatTurn'));
  };
  const originalShowHome=window.showHomeTurn;
  window.showHomeTurn=function(note=''){
    const el=originalShowHome(note);
    if(el)scrollTurnIntoView(el);
    return el;
  };

  // Re-render an active booking if the script was loaded while it is open.
  if(activeBookingRoot&&activeBookingRoot.isConnected)renderBooking(booking.step||1);
})();

(function(){
  const previousReset=window.resetBookingState;
  window.resetBookingState=function(){
    previousReset&&previousReset();
    booking.date='';booking.dateMode='calendar';
  };
})();

(function(){
  const style=`
    .cardPlus{overflow:visible}
    .cardPlus:after{content:attr(data-action-label);position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%) translateY(-3px);padding:6px 9px;border-radius:999px;background:#17385f;color:#fff;font-size:10px;font-weight:700;line-height:1;white-space:nowrap;opacity:0;pointer-events:none;transition:.16s ease;box-shadow:0 8px 22px rgba(23,56,95,.16)}
    .cardPlus:hover:after,.cardPlus:focus-visible:after{opacity:1;transform:translateX(-50%) translateY(0)}
    @media (hover:none),(pointer:coarse){.cardPlus:after{display:none}}
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${style}</style>`);

  function plusLabel(){
    if(window.lang==='ru')return 'Подробнее';
    if(window.lang==='he')return 'פרטים';
    if(window.lang==='es')return 'Ver detalles';
    return 'View details';
  }
  function syncPlusLabels(root=document){
    root.querySelectorAll('.cardPlus').forEach(btn=>{
      btn.dataset.actionLabel=plusLabel();
      btn.setAttribute('aria-label',plusLabel());
      btn.title=plusLabel();
    });
  }

  // The + now means exactly what it looks like: open the card's details.
  // Card body click still selects/activates a card for the carousel interaction.
  document.addEventListener('click',function(e){
    const plus=e.target.closest('.cardPlus');
    if(!plus)return;
    const card=plus.closest('[data-reveal-card]');
    if(!card)return;
    const key=card.dataset.key||'';
    if(window.services?.some?.(s=>s.key===key)){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openPage('service',key);
      return;
    }
    // For non-service cards, keep the existing carousel expansion behavior.
  },true);

  const _hydrate=window.hydrateCarousels;
  if(_hydrate){
    window.hydrateCarousels=function(root){
      _hydrate(root);
      syncPlusLabels(root||document);
    };
  }
  const _setLanguage=window.setLanguage;
  if(_setLanguage){
    window.setLanguage=function(next){
      _setLanguage(next);
      syncPlusLabels(document);
    };
  }
  syncPlusLabels(document);
})();

(function(){
  const style=`
    /* + is a details action, not carousel navigation. The only carousel navigation is the blue arrows below. */
    .chatContentCard .revealCard.is-active .cardPlus{display:grid}
    .chatContentCard .revealCard:hover .cardPlus,
    .chatContentCard .revealCard:focus-within .cardPlus{opacity:1;transform:translate(-50%,-50%) scale(1)}
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${style}</style>`);

  function detailLabel(){
    if(lang==='ru') return 'Подробнее';
    if(lang==='he') return 'פרטים';
    if(lang==='es') return 'Ver detalles';
    return 'View details';
  }

  function isServiceKey(key){
    try{return Array.isArray(services) && services.some(s=>s.key===key)}catch(_e){return false}
  }

  function normalizeCardActions(root=document){
    root.querySelectorAll('[data-carousel-stage]').forEach(stage=>{
      // Defensive cleanup: there must be exactly one navigation control per carousel.
      const controls=[...stage.querySelectorAll(':scope > .carouselControls')];
      controls.slice(1).forEach(el=>el.remove());
    });

    root.querySelectorAll('.cardPlus').forEach(btn=>{
      const card=btn.closest('[data-reveal-card]');
      const key=card?.dataset.key||'';
      if(!isServiceKey(key)){
        // Reviews/work cards are browsed with the single blue arrow control below;
        // don't show a misleading + that has no detail view.
        btn.hidden=true;
        btn.removeAttribute('data-action-label');
        btn.removeAttribute('title');
        return;
      }
      btn.hidden=false;
      const label=detailLabel();
      btn.dataset.actionLabel=label;
      btn.setAttribute('aria-label',label);
      // No native title: it duplicated our localized tooltip in Chromium.
      btn.removeAttribute('title');
    });
  }

  // Capture phase intentionally runs before the carousel's old + handler.
  document.addEventListener('click',function(e){
    const plus=e.target.closest('.cardPlus');
    if(!plus || plus.hidden) return;
    const card=plus.closest('[data-reveal-card]');
    const key=card?.dataset.key||'';
    if(!isServiceKey(key)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openPage('service',key);
  },true);

  const oldHydrate=window.hydrateCarousels;
  if(oldHydrate){
    window.hydrateCarousels=function(root){
      oldHydrate(root);
      normalizeCardActions(root||document);
    };
  }

  const oldSetLanguage=window.setLanguage;
  if(oldSetLanguage){
    window.setLanguage=function(next){
      oldSetLanguage(next);
      normalizeCardActions(document);
    };
  }

  normalizeCardActions(document);
})();

(function(){
  const copy={
    en:{range:'SELF-PAY',fixture:'Implant fixture',abutment:'Abutment',crown:'Crown',imaging:'Imaging / diagnostics',change:'What can change the total',implantExtra:'Extraction, bone grafting, sinus lift, or a temporary tooth may be needed in some cases. The final plan depends on your exam and imaging.',otherExtra:'The exact cost depends on the clinical situation, material, and any additional procedures that may be needed.',note:'The dentist will confirm the final treatment plan and cost after an exam.'},
    ru:{range:'САМОСТОЯТЕЛЬНАЯ ОПЛАТА',fixture:'Имплант',abutment:'Абатмент',crown:'Коронка',imaging:'Диагностика и снимки',change:'Что может изменить итоговую стоимость',implantExtra:'В некоторых случаях дополнительно могут понадобиться удаление зуба, костная пластика, синус-лифтинг или временная конструкция. Итоговый план зависит от осмотра и диагностики.',otherExtra:'Точная стоимость зависит от клинической ситуации, выбранного материала и дополнительных процедур, если они понадобятся.',note:'Итоговый план лечения и точную стоимость врач подтвердит после осмотра.'},
    es:{range:'PAGO DIRECTO',fixture:'Implante',abutment:'Pilar',crown:'Corona',imaging:'Imágenes y diagnóstico',change:'Qué puede cambiar el costo final',implantExtra:'En algunos casos pueden ser necesarias una extracción, un injerto óseo, una elevación de seno o una restauración temporal. El plan final depende del examen y las imágenes.',otherExtra:'El costo exacto depende de la situación clínica, el material y cualquier procedimiento adicional que pueda ser necesario.',note:'El dentista confirmará el plan final y el costo después del examen.'},
    he:{range:'תשלום עצמי',fixture:'שתל',abutment:'מבנה',crown:'כתר',imaging:'הדמיה ואבחון',change:'מה יכול לשנות את העלות הסופית',implantExtra:'במקרים מסוימים ייתכן צורך בעקירה, השתלת עצם, הרמת סינוס או שיקום זמני. התוכנית הסופית תלויה בבדיקה ובהדמיה.',otherExtra:'העלות המדויקת תלויה במצב הקליני, בחומר ובטיפולים נוספים אם יידרשו.',note:'הרופא יאשר את תוכנית הטיפול והעלות הסופית לאחר הבדיקה.'}
  };
  function d(){return copy[lang]||copy.en}
  serviceDetailPage=function(s){
    const c=d();
    const implant=s.key==='implant';
    const breakdown=implant?`<div class="breakdown"><div class="breakRow"><span>${escapeHtml(c.fixture)}</span><span>$900-$1,300</span></div><div class="breakRow"><span>${escapeHtml(c.abutment)}</span><span>$250-$450</span></div><div class="breakRow"><span>${escapeHtml(c.crown)}</span><span>$900-$1,500</span></div><div class="breakRow"><span>${escapeHtml(c.imaging)}</span><span>$100-$250</span></div></div>`:`<div class="infoNote">${escapeHtml(loc(s.short))}</div>`;
    return `<div class="serviceDetail"><article class="detailCard"><div class="eyebrow">${escapeHtml(c.range)}</div><h3>${escapeHtml(loc(s.title))}</h3><div class="detailRange">${escapeHtml(s.price)}</div><p>${escapeHtml(loc(s.desc))}</p>${breakdown}<div class="detailActions"><button class="actionBtn" data-page="reviews">${escapeHtml(tr('reviews'))}</button><button class="actionBtn" data-page="insurance">${escapeHtml(tr('insurance'))}</button><button class="actionBtn primary" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article><aside class="detailCard"><h3 style="font-size:24px">${escapeHtml(c.change)}</h3><p>${escapeHtml(implant?c.implantExtra:c.otherExtra)}</p><div class="infoNote">${escapeHtml(c.note)}</div></aside></div>`;
  };
})();

(function(){
  function bookingVisitLabel(){
    const map = {
      emergency: {ru:'Срочный осмотр', en:'Urgent exam', es:'Consulta urgente', he:'בדיקה דחופה'},
      exam: {ru:'Осмотр / консультация', en:'Exam / consultation', es:'Examen / consulta', he:'בדיקה / ייעוץ'},
      cleaning: {ru:'Профессиональная чистка', en:'Professional cleaning', es:'Limpieza profesional', he:'ניקוי מקצועי'}
    };
    const item = map[booking.visit] || map.exam;
    return item[lang] || item.en;
  }
  function bookingEstimate(){
    const map = {
      emergency: '$90-$250',
      exam: '$75-$200',
      cleaning: '$120-$250'
    };
    return map[booking.visit] || '$75-$200';
  }
  function bookingWhenLabel(){
    const dateText = booking.date ? prettyDate(booking.date) : (({today: lang==='ru'?'Сегодня':'Today', tomorrow: lang==='ru'?'Завтра':'Tomorrow', next: lang==='ru'?'Ближайшее время':'Next available'})[booking.day] || '');
    return [dateText, booking.time].filter(Boolean).join(' · ');
  }

  const prevBookingMarkup = window.bookingMarkup;
  window.bookingMarkup = function(step=1){
    if(step!==4) return prevBookingMarkup(step);
    const c = v40();
    return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':lang==='es'?'CITA':lang==='he'?'קביעת תור':'BOOKING')}</div><h2>${escapeHtml(c.step4Title)}</h2><p>${escapeHtml(c.step4Text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">4 / 4</span></div></div><div class="chatContentBody"><div class="successMark">✓</div><div class="summary"><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Услуга':'Service')}</span><b>${escapeHtml(bookingVisitLabel())}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Дата и время':'Date & time')}</span><b>${escapeHtml(bookingWhenLabel())}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Самостоятельная оплата':'Self-pay estimate')}</span><b>${escapeHtml(bookingEstimate())}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Номер обращения':'Request')}</span><b>${escapeHtml(booking.confirmation)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Клиника':'Clinic')}</span><b>${lang==='ru'?'OraVera · Майами':'OraVera · Miami, FL'}</b></div></div><div class="inlineActions"><button type="button" data-home-chat>⌂ ${escapeHtml(c.doneHome)}</button><button type="button" data-page="services">${escapeHtml(tr('services'))}</button></div></div></div>`;
  };
})();

(function(){
  const APPT_KEY='oravera-appointments-v53';
  const CHANGE_CUTOFF_HOURS=24;
  let appointments=[];
  let bookingEditId=null;
  let bookingLastAction='created';
  let appointmentsManagerRoot=null;
  let cancelCandidateId=null;
  let appointmentTab="future";

  const style=`
    .appointmentManager{display:grid;gap:14px}
    .appointmentIntro{padding:15px 16px;border-radius:16px;background:#f5f9ff;color:#526983;font-size:14px;line-height:1.55}
    .appointmentList{display:grid;gap:10px}
    .appointmentCard{padding:17px;border:1px solid var(--line);border-radius:18px;background:#fff}
    .appointmentCardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
    .appointmentPatient{font-size:18px;font-weight:760;color:#173d69}
    .appointmentStatus{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#eaf7f0;color:#24825a;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
    .appointmentDetails{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}
    .appointmentDetail{padding:11px 12px;border-radius:13px;background:#f8fbff;min-width:0}
    .appointmentDetail small{display:block;margin-bottom:4px;color:#8493a6;font-size:10px;font-weight:760;letter-spacing:.05em;text-transform:uppercase}
    .appointmentDetail strong{display:block;color:#244a76;font-size:13px;line-height:1.35;overflow-wrap:anywhere}
    .appointmentActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
    .appointmentActions button,.managerAddBtn{min-height:40px;padding:0 13px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#244a76;cursor:pointer;font-size:12px;font-weight:720}
    .appointmentActions button:hover,.managerAddBtn:hover{border-color:rgba(47,125,244,.3);color:var(--blue)}
    .managerAddBtn{background:var(--blue);border-color:var(--blue);color:#fff}
    .managerAddBtn:hover{background:var(--blue-dark);color:#fff}
    .appointmentActions button.danger{color:#b33c49;border-color:#f0ccd1;background:#fff7f8}
    .appointmentActions button:disabled{opacity:.45;cursor:not-allowed}
    .appointmentPolicy{margin-top:10px;color:#7a899d;font-size:11px;line-height:1.5}
    .cancelConfirm{margin-top:12px;padding:12px;border-radius:14px;background:#fff4f5;border:1px solid #f3d2d6}
    .cancelConfirm strong{display:block;color:#9d3340;font-size:13px}
    .cancelConfirm p{margin:5px 0 10px;color:#7d5b61;font-size:12px;line-height:1.45}
    .cancelConfirmActions{display:flex;gap:7px;flex-wrap:wrap}
    .cancelConfirmActions button{min-height:36px;padding:0 12px;border:1px solid #e6c3c8;border-radius:999px;background:#fff;cursor:pointer;font-size:11px;font-weight:720}
    .cancelConfirmActions button.confirm{background:#c84a58;border-color:#c84a58;color:#fff}
    .editModeNote{margin:0 0 12px;padding:11px 13px;border-radius:14px;background:#fff8e8;color:#7b6531;font-size:12px;line-height:1.5}
    @media(max-width:700px){
      .appointmentDetails{grid-template-columns:1fr}
      .appointmentCard{padding:14px}
      .appointmentPatient{font-size:16px}
      .appointmentIntro{font-size:13px}
    }
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${style}</style>`);

  function loadAppointments(){
    try{
      const raw=localStorage.getItem(APPT_KEY);
      appointments=raw?JSON.parse(raw):[];
      if(!Array.isArray(appointments))appointments=[];
    }catch{appointments=[]}
  }
  function saveAppointments(){
    try{localStorage.setItem(APPT_KEY,JSON.stringify(appointments))}catch{}
  }
  function uid(){return 'apt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
  function activeAppointments(){return appointments.filter(a=>a.status!=='cancelled')}
  function visitLabel(visit){
    const map={
      emergency:{ru:'Срочный осмотр',en:'Urgent exam',es:'Consulta urgente',he:'בדיקה דחופה'},
      exam:{ru:'Осмотр / консультация',en:'Exam / consultation',es:'Examen / consulta',he:'בדיקה / ייעוץ'},
      cleaning:{ru:'Профессиональная чистка',en:'Professional cleaning',es:'Limpieza profesional',he:'ניקוי מקצועי'}
    };
    return map[visit]?.[lang]||map[visit]?.en||visit||'';
  }
  function estimateFor(visit){return {emergency:'$90-$250',exam:'$75-$200',cleaning:'$120-$250'}[visit]||'$75-$200'}
  function formatDateLocal(key){
    if(!key)return'';
    const [y,m,d]=String(key).split('-').map(Number);const dt=new Date(y,m-1,d);
    const locale={ru:'ru-RU',en:'en-US',es:'es-ES',he:'he-IL'}[lang]||'en-US';
    try{return new Intl.DateTimeFormat(locale,{weekday:'short',month:'short',day:'numeric'}).format(dt)}catch{return key}
  }
  function whenLabel(a){return [formatDateLocal(a.date),a.time].filter(Boolean).join(' · ')}
  function parseAppointmentDateTime(a){
    if(!a?.date||!a?.time)return null;
    const [y,m,d]=a.date.split('-').map(Number);
    const mt=String(a.time).match(/(\d+):(\d+)\s*(AM|PM)/i);
    if(!mt)return null;
    let h=Number(mt[1])%12;if(mt[3].toUpperCase()==='PM')h+=12;
    return new Date(y,m-1,d,h,Number(mt[2]),0,0);
  }
  function hoursUntil(a){const dt=parseAppointmentDateTime(a);return dt?(dt.getTime()-Date.now())/36e5:999}
  function canModify(a){return hoursUntil(a)>=CHANGE_CUTOFF_HOURS}
  function clearBookingDraft(keepContact=false){
    const last=keepContact?activeAppointments().slice(-1)[0]:null;
    booking.step=1;booking.visit='';booking.day='';booking.date='';booking.dateMode='calendar';booking.time='';booking.name='';booking.confirmation='';
    booking.contact=last?.contact||'';booking.payment=last?.payment||'';booking.provider=last?.provider||'';booking.memberId=last?.memberId||'';
  }
  function snapshotFromBooking(existingId=null){
    const old=existingId?appointments.find(a=>a.id===existingId):null;
    return {
      id:existingId||uid(),
      confirmation:old?.confirmation||booking.confirmation||('OV-'+Math.random().toString(36).slice(2,8).toUpperCase()),
      visit:booking.visit,date:booking.date||'',day:booking.day||'',time:booking.time||'',name:booking.name||'',contact:booking.contact||'',payment:booking.payment||'',provider:booking.provider||'',memberId:booking.memberId||'',
      estimate:estimateFor(booking.visit),status:'active',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
    };
  }
  function loadBookingFromAppointment(a){
    booking.step=1;booking.visit=a.visit||'';booking.date=a.date||'';booking.day=a.day||'';booking.time=a.time||'';booking.name=a.name||'';booking.contact=a.contact||'';booking.payment=a.payment||'';booking.provider=a.provider||'';booking.memberId=a.memberId||'';booking.confirmation=a.confirmation||'';booking.dateMode='calendar';
  }

  function managerText(){
    const count=activeAppointments().length;
    if(lang==='ru')return {title:count===1?'У вас уже есть запись':'Ваши записи',text:'Можно изменить день или время, отменить запись или добавить ещё одну - например, для ребёнка или другого члена семьи.',add:'Добавить ещё одну запись',edit:'Изменить',cancel:'Отменить',service:'Услуга',when:'Дата и время',cost:'Самостоятельная оплата',status:'Записаны',policy:'Изменить или отменить запись онлайн можно не позднее чем за сутки до приёма. Позже позвоните Ora.',tooLate:'Онлайн-изменения уже недоступны. Позвоните Ora.',confirmTitle:'Отменить эту запись?',confirmText:'Запись будет отменена. При необходимости вы сможете записаться заново.',confirm:'Да, отменить',back:'Оставить запись',cancelled:'Запись отменена'};
    if(lang==='es')return {title:count===1?'Ya tienes una cita':'Tus citas',text:'Puedes cambiar el día o la hora, cancelar una cita o añadir otra para un hijo u otro familiar.',add:'Añadir otra cita',edit:'Cambiar',cancel:'Cancelar',service:'Servicio',when:'Fecha y hora',cost:'Pago directo',status:'Reservada',policy:'Puedes cambiar o cancelar en línea hasta 24 horas antes de la cita. Después, llama a Ora.',tooLate:'Los cambios en línea ya no están disponibles. Llama a Ora.',confirmTitle:'¿Cancelar esta cita?',confirmText:'La cita será cancelada. Podrás reservar otra cuando quieras.',confirm:'Sí, cancelar',back:'Mantener cita',cancelled:'Cita cancelada'};
    if(lang==='he')return {title:count===1?'כבר יש לכם תור':'התורים שלכם',text:'אפשר לשנות יום או שעה, לבטל תור או להוסיף תור נוסף לילד או לבן משפחה.',add:'הוספת תור נוסף',edit:'שינוי',cancel:'ביטול',service:'שירות',when:'תאריך ושעה',cost:'תשלום עצמי',status:'נקבע',policy:'אפשר לשנות או לבטל אונליין עד 24 שעות לפני התור. לאחר מכן התקשרו ל-Ora.',tooLate:'לא ניתן עוד לשנות אונליין. התקשרו ל-Ora.',confirmTitle:'לבטל את התור?',confirmText:'התור יבוטל. תוכלו לקבוע תור חדש בכל עת.',confirm:'כן, לבטל',back:'להשאיר את התור',cancelled:'התור בוטל'};
    return {title:count===1?'You already have an appointment':'Your appointments',text:'Change the day or time, cancel an appointment, or add another one for a child or family member.',add:'Add another appointment',edit:'Change',cancel:'Cancel',service:'Service',when:'Date & time',cost:'Self-pay estimate',status:'Booked',policy:'Online changes and cancellations are available until 24 hours before the appointment. After that, call Ora.',tooLate:'Online changes are no longer available. Call Ora.',confirmTitle:'Cancel this appointment?',confirmText:'The appointment will be cancelled. You can book again anytime.',confirm:'Yes, cancel',back:'Keep appointment',cancelled:'Appointment cancelled'};
  }
  function isPastAppointment(a){const dt=parseAppointmentDateTime(a);return !!dt&&dt.getTime()<Date.now()}
  function managerMarkup(){
    const t=managerText(),all=activeAppointments(),future=all.filter(a=>!isPastAppointment(a)),past=all.filter(isPastAppointment);
    if(appointmentTab==='future'&&!future.length&&past.length)appointmentTab='past';
    const list=appointmentTab==='past'?past:future;
    const tabFuture=lang==='ru'?'Будущие':'Upcoming',tabPast=lang==='ru'?'Прошлые':'Past';
    const empty=lang==='ru'?(appointmentTab==='past'?'Прошлых записей пока нет.':'Будущих записей пока нет.'):(appointmentTab==='past'?'No past appointments yet.':'No upcoming appointments yet.');
    return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${lang==='ru'?'ЗАПИСИ':lang==='es'?'CITAS':lang==='he'?'תורים':'APPOINTMENTS'}</div><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.text)}</p></div></div><div class="chatContentBody"><div class="appointmentManager"><div class="appointmentTabsV81"><button type="button" class="appointmentTabV81 ${appointmentTab==='future'?'active':''}" data-appt-tab="future">${escapeHtml(tabFuture)} <span class="tabCountV81">${future.length}</span></button><button type="button" class="appointmentTabV81 ${appointmentTab==='past'?'active':''}" data-appt-tab="past">${escapeHtml(tabPast)} <span class="tabCountV81">${past.length}</span></button></div>${appointmentTab==='future'?`<div class="appointmentIntro">${escapeHtml(t.policy)}</div>`:''}<div class="appointmentList appointmentPanelV81">${list.length?list.map(a=>appointmentCardMarkup(a,t,appointmentTab==='past')).join(''):`<div class="appointmentEmptyV81">${escapeHtml(empty)}</div>`}</div><div class="inlineActions"><button class="managerAddBtn" type="button" data-add-appointment>${escapeHtml(t.add)}</button><button type="button" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div></div></div></div>`;
  }
  function appointmentCardMarkup(a,t,isPast=false){
    const mod=!isPast&&canModify(a),confirming=cancelCandidateId===a.id;
    const status=isPast?(lang==='ru'?'Прошедшая':'Past'):t.status;
    return `<article class="appointmentCard ${isPast?'isPastV81':''}" data-appointment-card="${escapeHtml(a.id)}"><div class="appointmentCardTop"><div><div class="appointmentPatient">${escapeHtml(a.name||visitLabel(a.visit))}</div><div class="appointmentPolicy">${escapeHtml(a.confirmation)}</div></div><span class="appointmentStatus">${escapeHtml(status)}</span></div><div class="appointmentDetails"><div class="appointmentDetail"><small>${escapeHtml(t.service)}</small><strong>${escapeHtml(visitLabel(a.visit))}</strong></div><div class="appointmentDetail"><small>${escapeHtml(t.when)}</small><strong>${escapeHtml(whenLabel(a))}</strong></div><div class="appointmentDetail"><small>${escapeHtml(t.cost)}</small><strong>${escapeHtml(a.estimate||estimateFor(a.visit))}</strong></div></div>${isPast?'':`<div class="appointmentActions"><button type="button" data-edit-appointment="${escapeHtml(a.id)}" ${mod?'':'disabled'}>${escapeHtml(t.edit)}</button><button class="danger" type="button" data-cancel-appointment="${escapeHtml(a.id)}" ${mod?'':'disabled'}>${escapeHtml(t.cancel)}</button></div>${mod?'':`<div class="appointmentPolicy">${escapeHtml(t.tooLate)}</div>`}`}${confirming&&!isPast?`<div class="cancelConfirm"><strong>${escapeHtml(t.confirmTitle)}</strong><p>${escapeHtml(t.confirmText)}</p><div class="cancelConfirmActions"><button class="confirm" type="button" data-confirm-cancel="${escapeHtml(a.id)}">${escapeHtml(t.confirm)}</button><button type="button" data-dismiss-cancel>${escapeHtml(t.back)}</button></div></div>`:''}</article>`;
  }
  function bindManager(root){
    root.querySelectorAll('[data-appt-tab]').forEach(btn=>btn.addEventListener('click',()=>{appointmentTab=btn.dataset.apptTab;renderAppointmentsManager()}));
    root.querySelector('[data-add-appointment]')?.addEventListener('click',()=>{
      bookingEditId=null;bookingLastAction='created';clearBookingDraft(true);activeBookingRoot=null;renderBooking(1);
    });
    root.querySelectorAll('[data-edit-appointment]').forEach(btn=>btn.addEventListener('click',()=>{
      const a=appointments.find(x=>x.id===btn.dataset.editAppointment);if(!a||!canModify(a))return;
      bookingEditId=a.id;bookingLastAction='updated';loadBookingFromAppointment(a);activeBookingRoot=null;renderBooking(1);
    }));
    root.querySelectorAll('[data-cancel-appointment]').forEach(btn=>btn.addEventListener('click',()=>{
      const a=appointments.find(x=>x.id===btn.dataset.cancelAppointment);if(!a||!canModify(a))return;cancelCandidateId=a.id;renderAppointmentsManager();
    }));
    root.querySelector('[data-dismiss-cancel]')?.addEventListener('click',()=>{cancelCandidateId=null;renderAppointmentsManager()});
    root.querySelectorAll('[data-confirm-cancel]').forEach(btn=>btn.addEventListener('click',()=>{
      const a=appointments.find(x=>x.id===btn.dataset.confirmCancel);if(!a||!canModify(a))return;
      a.status='cancelled';a.cancelledAt=new Date().toISOString();saveAppointments();cancelCandidateId=null;showToast(managerText().cancelled);renderAppointmentsManager();
    }));
    root.querySelectorAll('[data-home-chat]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();showHomeTurn()}));
  }
  function renderAppointmentsManager(){
    if(!appointmentsManagerRoot||!appointmentsManagerRoot.isConnected){appointmentsManagerRoot=addOraBlock('<div data-appointments-manager></div>','appointments').querySelector('[data-appointments-manager]')}
    appointmentsManagerRoot.innerHTML=managerMarkup();bindManager(appointmentsManagerRoot);
    requestAnimationFrame(()=>appointmentsManagerRoot.closest('.chatTurn')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  loadAppointments();

  const prevOpenPage=window.openPage;
  window.openPage=function(type,key=''){
    if(type==='booking'){
      if(activeAppointments().length && !bookingEditId && booking.step!==1 && booking.step!==2 && booking.step!==3){renderAppointmentsManager();return}
      if(activeAppointments().length && !bookingEditId && booking.step===4){renderAppointmentsManager();return}
      if(activeAppointments().length && !bookingEditId && (!activeBookingRoot||!activeBookingRoot.isConnected)){renderAppointmentsManager();return}
    }
    return prevOpenPage(type,key);
  };

  const prevBookingMarkup=window.bookingMarkup;
  window.bookingMarkup=function(step=1){
    let html=prevBookingMarkup(step);
    if(bookingEditId && step===1){
      html=html.replace('<div class="chatContentBody">','<div class="chatContentBody"><div class="editModeNote">'+escapeHtml(lang==='ru'?'Вы изменяете существующую запись. Выберите новую дату или время и продолжите.':lang==='es'?'Estás cambiando una cita existente. Elige una nueva fecha u hora y continúa.':lang==='he'?'אתם משנים תור קיים. בחרו תאריך או שעה חדשים והמשיכו.':'You are changing an existing appointment. Choose a new date or time and continue.')+'</div>');
    }
    if(step===4){
      const title=bookingLastAction==='updated'?(lang==='ru'?'Запись изменена':lang==='es'?'Cita actualizada':lang==='he'?'התור עודכן':'Appointment updated'):v40().step4Title;
      const text=bookingLastAction==='updated'?(lang==='ru'?'Новые дата и время сохранены.':lang==='es'?'La nueva fecha y hora se guardaron.':lang==='he'?'התאריך והשעה החדשים נשמרו.':'The new date and time have been saved.'):v40().step4Text;
      html=html.replace(/<h2>.*?<\/h2>/,`<h2>${escapeHtml(title)}</h2>`).replace(/<p>.*?<\/p>/,`<p>${escapeHtml(text)}</p>`);
    }
    return html;
  };

  const prevBind=window.bindChatBooking;
  window.bindChatBooking=function(root){
    if(booking.step===1){prevBind(root);return}
    root.querySelectorAll('[data-book-input]').forEach(i=>i.oninput=()=>{booking[i.dataset.bookInput]=i.value});
    root.querySelectorAll('[data-book-choice]').forEach(b=>b.onclick=()=>{booking[b.dataset.bookChoice]=b.dataset.value;renderBooking(booking.step)});
    root.querySelector('[data-book-back]')?.addEventListener('click',()=>renderBooking(Math.max(1,booking.step-1)));
    root.querySelector('[data-book-review]')?.addEventListener('click',()=>{
      const ok=booking.name.trim().length>1&&(/@/.test(booking.contact)||/\d{7,}/.test(booking.contact.replace(/\D/g,'')))&&booking.payment;
      if(!ok){root.querySelector('[data-book-error]')?.classList.add('show');return}renderBooking(3);
    });
    root.querySelector('[data-book-confirm]')?.addEventListener('click',()=>{
      if(bookingEditId){
        const idx=appointments.findIndex(a=>a.id===bookingEditId);if(idx>=0){const updated=snapshotFromBooking(bookingEditId);appointments[idx]=updated;booking.confirmation=updated.confirmation;bookingLastAction='updated'}
      }else{
        booking.confirmation='OV-'+Math.random().toString(36).slice(2,8).toUpperCase();const created=snapshotFromBooking();appointments.push(created);booking.confirmation=created.confirmation;bookingLastAction='created';
      }
      saveAppointments();bookingEditId=null;renderBooking(4);showToast(bookingLastAction==='updated'?(lang==='ru'?'Запись изменена':'Appointment updated'):v40().requestSent);
    });
    root.querySelector('[data-book-cancel]')?.addEventListener('click',()=>{
      if(bookingEditId){bookingEditId=null;clearBookingDraft(false);activeBookingRoot=null;renderAppointmentsManager()}else{cancelBooking()}
    });
    root.querySelectorAll('[data-home-chat]').forEach(b=>b.onclick=e=>{e.preventDefault();showHomeTurn()});
    bindChatRoot(root);
  };

  const prevCancelBooking=window.cancelBooking;
  window.cancelBooking=function(){bookingEditId=null;return prevCancelBooking()};

  const prevSetLanguage=window.setLanguage;
  window.setLanguage=function(next){prevSetLanguage(next);if(appointmentsManagerRoot&&appointmentsManagerRoot.isConnected)renderAppointmentsManager()};
})();

(function(){
  function finalVisitLabel(){
    const map={emergency:{ru:'Срочный осмотр',en:'Urgent exam',es:'Consulta urgente',he:'בדיקה דחופה'},exam:{ru:'Осмотр / консультация',en:'Exam / consultation',es:'Examen / consulta',he:'בדיקה / ייעוץ'},cleaning:{ru:'Профессиональная чистка',en:'Professional cleaning',es:'Limpieza profesional',he:'ניקוי מקצועי'}};
    return map[booking.visit]?.[lang]||map[booking.visit]?.en||'';
  }
  function finalEstimate(){return {emergency:'$90-$250',exam:'$75-$200',cleaning:'$120-$250'}[booking.visit]||'$75-$200'}
  function finalDateText(){
    if(!booking.date)return'';
    const [y,m,d]=String(booking.date).split('-').map(Number);const dt=new Date(y,m-1,d);
    const locale={ru:'ru-RU',en:'en-US',es:'es-ES',he:'he-IL'}[lang]||'en-US';
    try{return new Intl.DateTimeFormat(locale,{weekday:'short',month:'short',day:'numeric'}).format(dt)}catch{return booking.date}
  }
  const beforeFinal=window.bookingMarkup;
  window.bookingMarkup=function(step=1){
    if(step!==4)return beforeFinal(step);
    const updated=(typeof bookingLastAction!=='undefined'&&bookingLastAction==='updated');
    const title=updated?(lang==='ru'?'Запись изменена':lang==='es'?'Cita actualizada':lang==='he'?'התור עודכן':'Appointment updated'):v40().step4Title;
    const text=updated?(lang==='ru'?'Новые дата и время сохранены.':lang==='es'?'La nueva fecha y hora se guardaron.':lang==='he'?'התאריך והשעה החדשים נשמרו.':'The new date and time have been saved.'):v40().step4Text;
    return `<div class="chatContentCard"><div class="chatContentHead"><div><div class="chatContentKicker">${escapeHtml(lang==='ru'?'ЗАПИСЬ':lang==='es'?'CITA':lang==='he'?'קביעת תור':'BOOKING')}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div><div class="chatContentHeadActions"><span class="stepPill">4 / 4</span></div></div><div class="chatContentBody"><div class="successMark">✓</div><div class="summary"><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Услуга':'Service')}</span><b>${escapeHtml(finalVisitLabel())}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Дата и время':'Date & time')}</span><b>${escapeHtml([finalDateText(),booking.time].filter(Boolean).join(' · '))}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Самостоятельная оплата':'Self-pay estimate')}</span><b>${escapeHtml(finalEstimate())}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Номер обращения':'Request')}</span><b>${escapeHtml(booking.confirmation)}</b></div><div class="summaryRow"><span>${escapeHtml(lang==='ru'?'Клиника':'Clinic')}</span><b>${lang==='ru'?'OraVera · Майами':'OraVera · Miami, FL'}</b></div></div><div class="inlineActions"><button type="button" data-home-chat>⌂ ${escapeHtml(v40().doneHome)}</button><button type="button" data-page="services">${escapeHtml(tr('services'))}</button></div></div></div>`;
  };
})();

(function(){
  const priorMarkup=window.bookingMarkup;
  window.bookingMarkup=function(step=1){
    let html=priorMarkup(step);
    if(step===1 && !html.includes('data-book-cancel')){
      const row=`<div class="flowSection"><div class="bookingCancelRow"><button class="flowBtn" data-book-cancel type="button">${escapeHtml(v40().cancel)}</button><p class="bookingCancelHint">${escapeHtml(v40().cancelHint)}</p></div></div>`;
      html=html.replace('</div></div></div>',`${row}</div></div></div>`);
    }
    return html;
  };
  const prevCancel=window.cancelBooking;
  window.cancelBooking=function(){
    bookingEditId=null;
    if(typeof clearBookingDraft==='function')clearBookingDraft(false);
    activeBookingRoot=null;
    if(typeof activeAppointments==='function' && activeAppointments().length){
      if(typeof renderAppointmentsManager==='function')renderAppointmentsManager();
      return;
    }
    return prevCancel();
  };
})();

(function(){
  const css=`
    /* v56 product cleanup */
    .menuPanel{font-family:inherit}
    .menuMain{gap:2px}
    .menuItem{min-height:48px;font-size:16px;font-weight:620;letter-spacing:-.012em}
    .menuItem:hover{color:var(--blue)}
    .topNav{gap:22px}
    .topNav button{font-size:13px;font-weight:620}
    .welcomeBubble,.homeBubble{width:100%;max-width:none}
    .welcomeBubble h1{max-width:none;text-wrap:initial}
    .welcomeHeadlineLine{display:block;white-space:nowrap}
    .welcomeHeadlineLine+.welcomeHeadlineLine{margin-top:2px}
    .welcomeEyebrow{font-size:10px;letter-spacing:.12em}
    .welcomeActions{align-items:center}
    .welcomeActions .primary{order:-2}
    .welcomeActions .callQuick{order:-1;border-color:rgba(53,81,232,.2);color:var(--blue);background:#fff}
    .choice{display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:1.25}
    .bookingCancelRow{display:flex;align-items:center;gap:8px;margin-top:14px;padding:0;background:transparent;border:0}
    .bookingCancelRow .bookingCancelHint{display:none}
    .bookingCancelRow .flowBtn{min-height:36px;padding:0 11px;font-size:12px}
    .bookingCancelRow .secondaryHome{border-color:rgba(53,81,232,.18);color:var(--blue)}
    .selfPayFlag{display:inline-flex;align-items:center;min-height:24px;padding:0 8px;border-radius:999px;background:#eef6ff;color:#315f91;font-size:10px;font-weight:700;margin-top:7px}
    .insuranceStatus{margin-top:14px;padding:15px;border:1px solid var(--line);border-radius:16px;background:#fff;font-size:14px;line-height:1.55}
    .insuranceStatus strong{display:block;margin-bottom:4px;font-size:15px}
    .insuranceStatus.accepted{background:#eff9f4;border-color:#cfe9da;color:#236448}
    .insuranceStatus.declined{background:#fff3f2;border-color:#efd5d1;color:#8f3d37}
    .insuranceStatus.review{background:#f6f8fb;color:#4b5c72}
    .insuranceNote{margin-top:8px;color:var(--muted);font-size:12px;line-height:1.5}
    @media(max-width:900px){.topNav{gap:14px}.topNav button{font-size:12px}}
    @media(max-width:560px){
      .menuItem{font-size:15px;min-height:46px}
      .welcomeHeadlineLine{white-space:normal}
      .bookingCancelRow{justify-content:flex-start;flex-wrap:wrap}
      .bookingCancelRow .flowBtn{min-height:34px;font-size:11.5px}
    }
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${css}</style>`);

  // Unified naming + separate Prices and Insurance.
  Object.assign(langCopy.en,{care:'Services',prices:'Prices'});
  Object.assign(langCopy.ru,{care:'Услуги',prices:'Цены'});
  Object.assign(langCopy.es,{care:'Servicios',prices:'Precios'});
  Object.assign(langCopy.he,{care:'שירותים',prices:'מחירים'});
  if(microCopy?.en) microCopy.en.range='self-pay';
  if(microCopy?.ru) microCopy.ru.range='при самостоятельной оплате';
  if(microCopy?.es) microCopy.es.range='pago directo';
  if(microCopy?.he) microCopy.he.range='תשלום עצמי';

  Object.assign(langCopy.en,{pricingHeading:'Self-pay prices',pricingSub:'These are approximate self-pay prices, before insurance. Final treatment cost depends on the exam and treatment plan.'});
  Object.assign(langCopy.ru,{pricingHeading:'Стоимость при самостоятельной оплате',pricingSub:'Это ориентировочная стоимость без учёта страховки. Точную сумму врач подтвердит после осмотра и плана лечения.'});
  Object.assign(langCopy.es,{pricingHeading:'Precios con pago directo',pricingSub:'Son precios aproximados sin seguro. El costo final depende del examen y del plan de tratamiento.'});
  Object.assign(langCopy.he,{pricingHeading:'מחירים בתשלום עצמי',pricingSub:'אלה מחירים משוערים ללא ביטוח. המחיר הסופי תלוי בבדיקה ובתוכנית הטיפול.'});

  // Header nav: Services / Prices / Insurance / Our work / Reviews.
  const topNav=document.querySelector('.topNav');
  if(topNav){
    topNav.innerHTML=`
      <button type="button" data-page="services" data-t="services">Services</button>
      <button type="button" data-page="pricing" data-t="prices">Prices</button>
      <button type="button" data-page="insurance" data-t="insurance">Insurance</button>
      <button type="button" data-page="works" data-t="ourWork">Our work</button>
      <button type="button" data-page="reviews" data-t="reviews">Reviews</button>`;
  }

  // Burger menu: exactly the simple site sections requested.
  const menuMain=document.querySelector('.menuMain');
  if(menuMain){
    menuMain.innerHTML=`
      <button class="menuItem" type="button" data-page="services" data-t="services">Services</button>
      <button class="menuItem" type="button" data-page="pricing" data-t="prices">Prices</button>
      <button class="menuItem" type="button" data-page="insurance" data-t="insurance">Insurance</button>
      <button class="menuItem" type="button" data-page="reviews" data-t="reviews">Reviews</button>
      <button class="menuItem" type="button" data-page="faq" data-t="faq">Questions</button>
      <button class="menuItem" type="button" data-page="about" data-t="about">About OraVera</button>
      <button class="menuItem" type="button" data-page="location" data-t="location">Location & contact</button>`;
  }

  function localizedWelcome(){
    if(lang==='ru') return {eyebrow:'ЦИФРОВОЙ АССИСТЕНТ КЛИНИКИ',l1:'Здравствуйте, я Ora.',l2:'Чем могу помочь?',copy:'Расскажите, что вас беспокоит, или выберите действие ниже.'};
    if(lang==='es') return {eyebrow:'ASISTENTE DIGITAL DE LA CLÍNICA',l1:'Hola, soy Ora.',l2:'¿Cómo puedo ayudarte?',copy:'Cuéntame qué necesitas o elige una acción.'};
    if(lang==='he') return {eyebrow:'העוזר הדיגיטלי של המרפאה',l1:'שלום, אני Ora.',l2:'איך אפשר לעזור?',copy:'ספרו לי מה אתם צריכים או בחרו פעולה.'};
    return {eyebrow:'CLINIC DIGITAL ASSISTANT',l1:'Hi, I’m Ora.',l2:'How can I help?',copy:'Tell me what you need, or choose an action below.'};
  }
  function actionLabels(){
    return {
      book:tr('bookVisit'),call:tr('callOra'),services:tr('services'),prices:tr('prices'),insurance:tr('insurance'),works:tr('ourWork'),reviews:tr('reviews')
    };
  }
  function actionsMarkup(){
    const a=actionLabels();
    return `<button type="button" class="primary" data-page="booking">${escapeHtml(a.book)}</button>
      <button type="button" class="callQuick" data-welcome-call>${escapeHtml(a.call)}</button>
      <button type="button" data-page="services">${escapeHtml(a.services)}</button>
      <button type="button" data-page="pricing">${escapeHtml(a.prices)}</button>
      <button type="button" data-page="insurance">${escapeHtml(a.insurance)}</button>
      <button type="button" data-page="works">${escapeHtml(a.works)}</button>
      <button type="button" data-page="reviews">${escapeHtml(a.reviews)}</button>`;
  }
  function bindActionRoot(root){
    root.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.page,b.dataset.key||''));
    root.querySelectorAll('[data-welcome-call]').forEach(b=>b.onclick=startCall);
  }
  function renderWelcome(){
    const w=localizedWelcome();
    const eyebrow=document.querySelector('.welcomeTurn .welcomeEyebrow');
    const title=document.querySelector('[data-chat-welcome-title]');
    const copy=document.querySelector('[data-chat-welcome-copy]');
    const actions=document.querySelector('.welcomeTurn .welcomeActions');
    if(eyebrow) eyebrow.textContent=w.eyebrow;
    if(title) title.innerHTML=`<span class="welcomeHeadlineLine">${escapeHtml(w.l1)}</span><span class="welcomeHeadlineLine">${escapeHtml(w.l2)}</span>`;
    if(copy) copy.textContent=w.copy;
    if(actions){actions.innerHTML=actionsMarkup();bindActionRoot(actions)}
  }

  let homeGuard=0;
  window.showHomeTurn=function(note=''){
    const now=Date.now();if(now-homeGuard<250)return;homeGuard=now;
    showMenu(false);
    const w=localizedWelcome();
    const title=lang==='ru'?'Что хотите сделать?':lang==='es'?'¿Qué quieres hacer?':lang==='he'?'מה תרצו לעשות?':'What would you like to do?';
    const copy=lang==='ru'?'Выберите действие или просто задайте Ora вопрос.':lang==='es'?'Elige una acción o pregúntale algo a Ora.':lang==='he'?'בחרו פעולה או שאלו את Ora ישירות.':'Choose an action or just ask Ora a question.';
    const el=document.createElement('section');el.className='chatTurn assistantTurn homeTurn';
    el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="chatBubble welcomeBubble homeBubble">${note?`<div class="welcomeEyebrow">${escapeHtml(note)}</div>`:`<div class="welcomeEyebrow">${escapeHtml(w.eyebrow)}</div>`}<h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p><div class="welcomeActions">${actionsMarkup()}</div></div></div>`;
    document.getElementById('site').appendChild(el);bindActionRoot(el);
    requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}));
    return el;
  };

  // Self-pay prices: explicit on each price card through the shared micro label.
  const previousChatMarkup=window.chatMarkup;
  function insuranceCopy(){
    if(lang==='ru') return {k:'СТРАХОВКА',title:'Работает ли OraVera с вашим планом?',text:'Укажите страховую компанию и название плана. Мы проверим только, работает ли OraVera с этим планом. Стоимость лечения по страховке здесь не рассчитывается.',provider:'Страховая компания',plan:'Название плана',button:'Проверить план',need:'Укажите страховую компанию и название плана.',accepted:'OraVera работает с этим планом',declined:'OraVera не работает с этим планом',review:'Нужно уточнить в клинике',acceptedText:'Стоимость с учётом страховки клиника уточнит отдельно.',declinedText:'Вы всё равно можете записаться и выбрать самостоятельную оплату.',reviewText:'Оставьте данные плана - клиника уточнит статус до визита.'};
    if(lang==='es') return {k:'SEGURO',title:'¿OraVera trabaja con tu plan?',text:'Indica la aseguradora y el nombre del plan. Aquí solo comprobamos si OraVera trabaja con ese plan; no calculamos el precio con seguro.',provider:'Aseguradora',plan:'Nombre del plan',button:'Comprobar plan',need:'Indica la aseguradora y el plan.',accepted:'OraVera trabaja con este plan',declined:'OraVera no trabaja con este plan',review:'Hay que confirmarlo con la clínica',acceptedText:'La clínica confirmará por separado el costo con seguro.',declinedText:'Aún puedes reservar y elegir pago directo.',reviewText:'Deja los datos del plan y la clínica confirmará el estado antes de la visita.'};
    if(lang==='he') return {k:'ביטוח',title:'האם OraVera עובדת עם התוכנית שלכם?',text:'הזינו את חברת הביטוח ואת שם התוכנית. כאן בודקים רק אם OraVera עובדת עם התוכנית; לא מחשבים מחיר לאחר ביטוח.',provider:'חברת ביטוח',plan:'שם התוכנית',button:'בדיקת תוכנית',need:'הזינו חברת ביטוח ותוכנית.',accepted:'OraVera עובדת עם התוכנית',declined:'OraVera לא עובדת עם התוכנית',review:'צריך לאשר מול המרפאה',acceptedText:'המרפאה תאשר בנפרד את העלות לאחר ביטוח.',declinedText:'אפשר עדיין לקבוע תור ולבחור בתשלום עצמי.',reviewText:'השאירו את פרטי התוכנית והמרפאה תאשר את הסטטוס לפני הביקור.'};
    return {k:'INSURANCE',title:'Does OraVera work with your plan?',text:'Enter the insurance company and plan name. This checker only tells you whether OraVera works with the plan; it does not calculate your insured price.',provider:'Insurance company',plan:'Plan name',button:'Check plan',need:'Enter the insurance company and plan name.',accepted:'OraVera works with this plan',declined:'OraVera does not work with this plan',review:'The clinic needs to confirm',acceptedText:'The clinic will confirm your insured cost separately.',declinedText:'You can still book and choose self-pay.',reviewText:'Leave the plan details and the clinic will confirm the status before your visit.'};
  }
  function insuranceMarkupV56(){
    const c=insuranceCopy();
    return `<div class="flow"><div class="flowSection"><div class="fieldGrid"><div class="field"><label>${escapeHtml(c.provider)}</label><input class="planProvider" autocomplete="organization" placeholder="e.g. Delta Dental"></div><div class="field"><label>${escapeHtml(c.plan)}</label><input class="planName" placeholder="e.g. PPO"></div></div><div class="flowActions"><button class="flowBtn primary checkPlanV56" type="button">${escapeHtml(c.button)}</button></div><div class="planResultV56"></div></div></div>`;
  }
  window.chatMarkup=function(type,key=''){
    if(type==='pricing'){
      return `<div class="chatContentCard">${chatHeader(lang==='ru'?'ЦЕНЫ':lang==='es'?'PRECIOS':lang==='he'?'מחירים':'PRICES',tr('pricingHeading'),tr('pricingSub'))}<div class="chatContentBody">${carouselMarkup('chat-pricing-v56-'+(++chatInstance),serviceCards('pricing'))}<div class="inlineActions"><button type="button" data-page="insurance">${escapeHtml(tr('insurance'))}</button><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div></div>`;
    }
    if(type==='insurance'){
      const c=insuranceCopy();
      return `<div class="chatContentCard">${chatHeader(c.k,c.title,c.text)}<div class="chatContentBody">${insuranceMarkupV56()}</div></div>`;
    }
    return previousChatMarkup(type,key);
  };

  // Configurable MVP plan directory. Unknown plans go to manual review; no invented insurance pricing.
  window.ORAVERA_INSURANCE_DIRECTORY=window.ORAVERA_INSURANCE_DIRECTORY||{accepted:[],declined:[]};
  function normalizePlan(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.checkPlanV56');if(!btn)return;
    const root=btn.closest('.chatContentCard');if(!root)return;
    const provider=root.querySelector('.planProvider')?.value.trim()||'';
    const plan=root.querySelector('.planName')?.value.trim()||'';
    const result=root.querySelector('.planResultV56');const c=insuranceCopy();
    if(!provider||!plan){result.innerHTML=`<div class="flowError show">${escapeHtml(c.need)}</div>`;return}
    const key=normalizePlan(provider+' '+plan);
    const accepted=(ORAVERA_INSURANCE_DIRECTORY.accepted||[]).map(normalizePlan).some(x=>x&&key.includes(x));
    const declined=(ORAVERA_INSURANCE_DIRECTORY.declined||[]).map(normalizePlan).some(x=>x&&key.includes(x));
    const status=accepted?'accepted':declined?'declined':'review';
    const title=status==='accepted'?c.accepted:status==='declined'?c.declined:c.review;
    const text=status==='accepted'?c.acceptedText:status==='declined'?c.declinedText:c.reviewText;
    result.innerHTML=`<div class="insuranceStatus ${status}"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}<div class="inlineActions"><button type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div>`;
    result.querySelector('[data-page]')?.addEventListener('click',()=>openPage('booking'));
  });

  // Final booking cleanup: no technical subtitle; compact Home / Cancel actions; self-pay/insurance wording.
  const oldBookingMarkup=window.bookingMarkup;
  function selfPayEstimate(){return {emergency:'$90-$250',exam:'$75-$200',cleaning:'$120-$250'}[booking.visit]||'$75-$200'}
  window.bookingMarkup=function(step=1){
    let html=oldBookingMarkup(step);
    if(step===1){
      html=html.replace(/<h2>(.*?)<\/h2><p>.*?<\/p>/s,'<h2>$1</h2>');
    }
    // Replace every large explanatory cancel area with two compact secondary actions.
    html=html.replace(/<div class="bookingCancelRow">\s*<button class="flowBtn" data-book-cancel type="button">(.*?)<\/button>\s*<p class="bookingCancelHint">.*?<\/p>\s*<\/div>/gs,`<div class="bookingCancelRow"><button class="flowBtn secondaryHome" type="button" data-home-chat>⌂ ${escapeHtml(v40().home)}</button><button class="flowBtn" data-book-cancel type="button">$1</button></div>`);
    if(step===2){
      html=html.replace(/<label>Номер полиса<\/label>/g,'<label>Название плана</label>').replace(/placeholder="Номер полиса"/g,'placeholder="Например, PPO"');
      html=html.replace(/<label>Member ID<\/label>/g,'<label>Plan name</label>').replace(/placeholder="Member ID"/g,'placeholder="e.g. PPO"');
      const anchor='<div class="flowError" data-book-error>';
      const info=booking.payment==='self'
        ? `<div class="infoNote"><strong>${escapeHtml(lang==='ru'?'Самостоятельная оплата':lang==='es'?'Pago directo':lang==='he'?'תשלום עצמי':'Self-pay')}</strong><br>${escapeHtml(lang==='ru'?'Ориентировочная стоимость выбранного приёма: ':lang==='es'?'Costo aproximado de la visita: ':lang==='he'?'עלות משוערת לביקור: ':'Estimated cost for this visit: ')}<b>${escapeHtml(selfPayEstimate())}</b></div>`
        : booking.payment==='insurance'
          ? `<div class="infoNote">${escapeHtml(lang==='ru'?'Мы проверяем только, работает ли OraVera с вашим страховым планом. Стоимость с учётом страховки клиника уточнит отдельно.':lang==='es'?'Solo comprobamos si OraVera trabaja con tu plan. La clínica confirmará por separado el costo con seguro.':lang==='he'?'בודקים רק אם OraVera עובדת עם התוכנית. המרפאה תאשר בנפרד את העלות לאחר ביטוח.':'We only check whether OraVera works with your plan. The clinic will confirm insured cost separately.')}</div>`:'';
      if(info) html=html.replace(anchor,info+anchor);
    }
    return html;
  };

  const oldBindChatBooking=window.bindChatBooking;
  window.bindChatBooking=function(root){
    oldBindChatBooking(root);
    root.querySelectorAll('[data-home-chat]').forEach(b=>b.onclick=e=>{e.preventDefault();activeBookingRoot=null;showHomeTurn()});
  };

  // Re-translate newly rebuilt navigation and welcome whenever language changes.
  const previousSetLanguage=window.setLanguage;
  window.setLanguage=function(next){
    previousSetLanguage(next);
    document.querySelectorAll('[data-t]').forEach(el=>{const k=el.dataset.t;if(langCopy[lang]?.[k])el.textContent=langCopy[lang][k]});
    renderWelcome();
  };
  renderWelcome();
  setLanguage(lang||'en');
})();

(function(){
  const demoAddress='1200 Brickell Ave, Miami, FL 33131';
  const mapsUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(demoAddress);
  function contactText(){
    if(lang==='ru')return {demo:'Демо-адрес',address:'Адрес',hours:'Часы работы',weekdays:'Пн - Пт',sat:'Суббота',sun:'Воскресенье',closed:'Закрыто',questions:'Связаться с клиникой',questionsText:'Напишите Ora или позвоните - поможем с записью, вопросами по услугам и страховке. Если ситуация угрожает жизни, в США звоните 911.',openMap:'Открыть в Google Maps'};
    if(lang==='es')return {demo:'Dirección demo',address:'Dirección',hours:'Horario',weekdays:'Lun - Vie',sat:'Sábado',sun:'Domingo',closed:'Cerrado',questions:'Contactar con la clínica',questionsText:'Escribe a Ora o llama para reservar o hacer preguntas. En una emergencia que amenace la vida, llama al 911 en EE. UU.',openMap:'Abrir en Google Maps'};
    if(lang==='he')return {demo:'כתובת לדוגמה',address:'כתובת',hours:'שעות פעילות',weekdays:'ב׳ - ו׳',sat:'שבת',sun:'ראשון',closed:'סגור',questions:'יצירת קשר עם המרפאה',questionsText:'כתבו ל-Ora או התקשרו לקבלת עזרה בקביעת תור, שירותים וביטוח. במקרה חירום מסכן חיים בארה״ב התקשרו 911.',openMap:'פתיחה ב-Google Maps'};
    return {demo:'Demo address',address:'Address',hours:'Office hours',weekdays:'Mon - Fri',sat:'Saturday',sun:'Sunday',closed:'Closed',questions:'Contact the clinic',questionsText:'Message Ora or call for help with booking, services, or insurance. For a life-threatening emergency in the U.S., call 911.',openMap:'Open in Google Maps'};
  }
  window.locationChatMarkup=function(){
    const c=contactText();
    return `<div class="chatGrid"><article class="chatInfoCard contactCardV57"><div class="contactAddressV57"><span class="contactDemoV57">${escapeHtml(c.demo)}</span><span class="contactLabelV57">${escapeHtml(c.address)}</span><a class="contactAddressLinkV57" href="${mapsUrl}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(c.openMap)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg><span>${escapeHtml(demoAddress)}</span> ↗</a></div><div><div class="contactLabelV57" style="margin-bottom:7px">${escapeHtml(c.hours)}</div><div class="hoursV57"><div class="hoursRowV57"><span>${escapeHtml(c.weekdays)}</span><strong>9:00 AM - 6:00 PM</strong></div><div class="hoursRowV57"><span>${escapeHtml(c.sat)}</span><strong>10:00 AM - 3:00 PM</strong></div><div class="hoursRowV57"><span>${escapeHtml(c.sun)}</span><strong>${escapeHtml(c.closed)}</strong></div></div></div></article><article class="chatInfoCard contactCardV57"><div><h3>${escapeHtml(c.questions)}</h3><p>${escapeHtml(c.questionsText)}</p></div><div class="contactActionsV57"><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button><button class="callQuick" type="button" data-contact-call>${escapeHtml(tr('callOra'))}</button></div></article></div>`;
  };

  // One routing handler in capture phase prevents the older delegated handlers
  // from opening the same chat block twice.
  document.addEventListener('click',function(e){
    const call=e.target.closest('[data-contact-call]');
    if(call){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      startCall();
      return;
    }
    const page=e.target.closest('[data-page]');
    if(!page || page.disabled)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openPage(page.dataset.page,page.dataset.key||'');
  },true);
})();

(function(){
  const previousAddUserMessage=window.addUserMessage;
  window.addUserMessage=function(text){
    const el=previousAddUserMessage(text);
    const value=String(text||'');
    const bubble=el?.querySelector('.userBubbleChat');
    if(bubble && value.length<=32 && !value.includes('\n')) bubble.classList.add('shortUserMessage');
    return el;
  };

  // Extra safeguard against legacy handlers trying to open the same section twice.
  const previousOpenPage=window.openPage;
  let lastOpen={type:'',key:'',time:0};
  window.openPage=function(type,key=''){
    const now=Date.now();
    const safeKey=key||'';
    if(lastOpen.type===type && lastOpen.key===safeKey && now-lastOpen.time<220) return;
    lastOpen={type,key:safeKey,time:now};
    return previousOpenPage(type,safeKey);
  };
})();

window.ORA_HERO_VARIANT='assistant';
(function(){
  const css=`
  .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(270px,360px);column-gap:26px;row-gap:10px;align-items:center}
  .welcomeBubble.heroEnhanced>.welcomeEyebrow,.welcomeBubble.heroEnhanced>h1,.welcomeBubble.heroEnhanced>p,.welcomeBubble.heroEnhanced>.welcomeActions,
  .homeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>h2,.homeBubble.heroEnhanced>p,.homeBubble.heroEnhanced>.welcomeActions{grid-column:1}
  .welcomeBubble.heroEnhanced>.heroVisualCol,.homeBubble.heroEnhanced>.heroVisualCol{grid-column:2;grid-row:1 / span 4;align-self:stretch}
  .heroVisualCol{display:flex;align-items:stretch}
  .heroDemoCard{width:100%;min-height:270px;border-radius:28px;border:1px solid rgba(53,81,232,.10);background:linear-gradient(180deg,#fff,#f5f9ff);overflow:hidden;box-shadow:0 18px 50px rgba(23,41,73,.08);position:relative}
  .heroDemoTop{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 0;color:#708096;font-size:11px}
  .heroDemoTop b{color:#173962;font-size:12px}
  .heroDemoVisual{height:190px;margin:14px 16px 0;border-radius:22px;overflow:hidden;background:#eef5ff;border:1px solid rgba(53,81,232,.08)}
  .heroDemoCaption{padding:13px 18px 17px;color:#60728a;font-size:12px;line-height:1.5}
  .heroDemoCaption strong{display:block;color:#173962;font-size:14px;margin-bottom:3px}
  .heroDemoVisual svg{display:block;width:100%;height:100%}
  .bookingUtilitySection{border:0!important;background:transparent!important;padding:14px 0 0!important;margin:0!important;width:100%!important;box-sizing:border-box!important}
  .bookingUtilitySection .bookingCancelRow{margin:0!important;padding:0 2px!important;display:flex!important;gap:10px!important;flex-wrap:wrap!important}
  .bookingUtilitySection .flowBtn{min-height:34px!important;padding:0 12px!important;font-size:11.5px!important}
  @media(max-width:900px){
    .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{grid-template-columns:1fr}
    .welcomeBubble.heroEnhanced>.heroVisualCol,.homeBubble.heroEnhanced>.heroVisualCol{grid-column:1;grid-row:auto;margin-top:8px}
    .heroDemoCard{min-height:235px}.heroDemoVisual{height:165px}
  }
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${css}</style>`);

  function visualMarkup(){
    const v=window.ORA_HERO_VARIANT;
    if(v==='pain') return `
      <div class="heroDemoCard"><div class="heroDemoTop"><b>Вариант A</b><span>Боль → облегчение</span></div>
      <div class="heroDemoVisual"><svg viewBox="0 0 360 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs><linearGradient id="aBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef5ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
        <rect width="360" height="190" rx="22" fill="url(#aBg)"/>
        <circle cx="180" cy="92" r="62" fill="#f7d6c3"/>
        <path d="M126 72c14-33 95-43 111 4-10-52-93-64-111-4Z" fill="#3b2d2b"/>
        <circle cx="158" cy="91" r="4" fill="#26364d"/><circle cx="203" cy="91" r="4" fill="#26364d"/>
        <path d="M158 119c14 15 36 16 50 0" fill="none" stroke="#bd5968" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="233" cy="111" rx="22" ry="27" fill="#efb7a9" opacity=".75"/>
        <path d="M252 70c18 15 25 42 17 62" fill="none" stroke="#7d8ca4" stroke-width="9" stroke-linecap="round" opacity=".75"/>
        <path d="M271 129l23 17" stroke="#7d8ca4" stroke-width="9" stroke-linecap="round" opacity=".75"/>
        <circle cx="302" cy="150" r="22" fill="#e9f6ef"/><path d="M293 150l7 7 13-17" fill="none" stroke="#24a66a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></div>
      <div class="heroDemoCaption"><strong>От боли к улыбке</strong>Эмоциональный визуал для главного экрана: дискомфорт, облегчение, улыбка.</div></div>`;
    if(v==='smile') return `
      <div class="heroDemoCard"><div class="heroDemoTop"><b>Вариант C</b><span>Красивая улыбка</span></div>
      <div class="heroDemoVisual"><svg viewBox="0 0 360 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs><linearGradient id="cBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6fbff"/><stop offset="1" stop-color="#eef4ff"/></linearGradient></defs>
        <rect width="360" height="190" rx="22" fill="url(#cBg)"/>
        <path d="M80 91c29-53 167-60 203 0-32 63-170 64-203 0Z" fill="#d88486"/>
        <path d="M105 91c30-31 127-34 154 0-26 36-126 38-154 0Z" fill="#fff"/>
        <path d="M115 91h135" stroke="#dce4ef" stroke-width="2"/>
        <path d="M133 64v54M157 58v66M182 56v70M207 59v65M231 66v52" stroke="#e5ebf3" stroke-width="2" opacity=".9"/>
        <circle cx="290" cy="44" r="18" fill="#fff"/><path d="M283 44l6 6 11-14" fill="none" stroke="#2f7df4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></div>
      <div class="heroDemoCaption"><strong>Фокус на результате</strong>Самый классический вариант: чистый крупный визуал красивой здоровой улыбки.</div></div>`;
    return `
      <div class="heroDemoCard"><div class="heroDemoTop"><b>Вариант B</b><span>Ora · ассистент-стоматолог</span></div>
      <div class="heroDemoVisual"><svg viewBox="0 0 360 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs><linearGradient id="bBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edf5ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
        <rect width="360" height="190" rx="22" fill="url(#bBg)"/>
        <circle cx="180" cy="78" r="48" fill="#c98d69"/>
        <path d="M137 67c5-42 81-58 91-3-20-20-66-20-91 3Z" fill="#2b2422"/>
        <circle cx="163" cy="77" r="4" fill="#26364d"/><circle cx="198" cy="77" r="4" fill="#26364d"/>
        <path d="M153 99c17 9 39 9 55 0v25h-55Z" fill="#d7eff8"/>
        <path d="M116 173c5-43 31-66 64-66s59 23 64 66" fill="#fff" stroke="#cfdbeb" stroke-width="2"/>
        <path d="M151 113l29 27 29-27" fill="none" stroke="#c8d6e8" stroke-width="3"/>
        <path d="M131 76c-18 2-24 15-22 31" fill="none" stroke="#315f91" stroke-width="4" stroke-linecap="round"/>
        <circle cx="108" cy="110" r="8" fill="#315f91"/>
        <path d="M109 119c6 10 14 13 25 13" fill="none" stroke="#315f91" stroke-width="3" stroke-linecap="round"/>
        <circle cx="139" cy="132" r="4" fill="#315f91"/>
        <rect x="250" y="40" width="78" height="34" rx="17" fill="#fff" stroke="#dbe6f5"/><circle cx="269" cy="57" r="5" fill="#2f7df4"/><text x="280" y="61" font-family="Arial" font-size="11" fill="#173962">На связи</text>
      </svg></div>
      <div class="heroDemoCaption"><strong>Ora как лицо сервиса</strong>Врач-ассистент с гарнитурой показывает, что сайт сразу готов помочь и записать пациента.</div></div>`;
  }

  function enhanceBubble(bubble){
    if(!bubble || bubble.dataset.heroEnhanced==='1') return;
    bubble.dataset.heroEnhanced='1';
    bubble.classList.add('heroEnhanced');
    const visual=document.createElement('div');visual.className='heroVisualCol';visual.innerHTML=visualMarkup();bubble.appendChild(visual);
  }
  function enhanceAll(){
    document.querySelectorAll('.welcomeTurn .welcomeBubble,.homeTurn .homeBubble').forEach(enhanceBubble);
    document.querySelectorAll('.bookingCancelRow').forEach(row=>{
      const flow=row.closest('.flow'); if(!flow) return;
      let util=row.closest('.bookingUtilitySection');
      if(!util){
        const oldSection=row.closest('.flowSection');
        util=document.createElement('div');util.className='flowSection bookingUtilitySection';
        util.appendChild(row);
        flow.appendChild(util);
        if(oldSection && oldSection!==util && oldSection.children.length===0) oldSection.remove();
      } else if(util.parentElement!==flow){ flow.appendChild(util); }
    });
  }
  enhanceAll();
  new MutationObserver(enhanceAll).observe(document.getElementById('site'),{childList:true,subtree:true});
})();

(function(){
  const css = `
    .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      position:relative!important;
      overflow:hidden!important;
      isolation:isolate!important;
      min-height:500px!important;
      padding:38px 42px 54px!important;
      border-radius:34px!important;
      background:linear-gradient(180deg,#fefefe 0%,#fbfdff 100%)!important;
      box-shadow:0 18px 54px rgba(31,54,92,.06)!important;
      border:1px solid rgba(124,153,205,.14)!important;
    }
    .welcomeBubble.heroEnhanced>.heroVisualCol,.homeBubble.heroEnhanced>.heroVisualCol{
      position:absolute!important;
      inset:0!important;
      width:auto!important;
      height:auto!important;
      display:block!important;
      z-index:0!important;
      margin:0!important;
      background-image:url('assets/images/hero/ora-assistant.webp')!important;
      background-size:cover!important;
      background-repeat:no-repeat!important;
      background-position:76% center!important;
      transform:scale(1.015)!important;
      filter:saturate(1.02) contrast(1.01)!important;
      opacity:1!important;
    }
    .welcomeBubble.heroEnhanced>.heroVisualCol .heroDemoCard,.homeBubble.heroEnhanced>.heroVisualCol .heroDemoCard{display:none!important}
    .welcomeBubble.heroEnhanced::before,.homeBubble.heroEnhanced::before{
      content:"";
      position:absolute;
      inset:0;
      z-index:1;
      background:
        radial-gradient(72% 88% at 18% 46%, rgba(255,255,255,.98) 0%, rgba(255,255,255,.95) 38%, rgba(255,255,255,.82) 56%, rgba(255,255,255,.38) 74%, rgba(255,255,255,0) 100%),
        linear-gradient(90deg, rgba(251,253,255,.97) 0%, rgba(251,253,255,.94) 28%, rgba(251,253,255,.78) 48%, rgba(251,253,255,.28) 67%, rgba(251,253,255,.04) 83%, rgba(251,253,255,0) 100%);
      pointer-events:none;
    }
    .welcomeBubble.heroEnhanced::after,.homeBubble.heroEnhanced::after{
      content:"";
      position:absolute;
      top:8%;bottom:8%;left:31%;right:26%;
      z-index:1;
      pointer-events:none;
      background:linear-gradient(90deg, rgba(240,246,255,.42), rgba(240,246,255,.06));
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      border-radius:999px;
      opacity:.85;
      mask-image:linear-gradient(90deg,rgba(0,0,0,1),rgba(0,0,0,.75) 48%,rgba(0,0,0,.18) 82%,rgba(0,0,0,0) 100%);
      -webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,1),rgba(0,0,0,.75) 48%,rgba(0,0,0,.18) 82%,rgba(0,0,0,0) 100%);
    }
    .welcomeBubble.heroEnhanced>.welcomeEyebrow,.welcomeBubble.heroEnhanced>h1,.welcomeBubble.heroEnhanced>p,.welcomeBubble.heroEnhanced>.welcomeActions,
    .homeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>h2,.homeBubble.heroEnhanced>p,.homeBubble.heroEnhanced>.welcomeActions{
      position:relative!important;
      z-index:2!important;
      max-width:min(54%, 740px)!important;
    }
    .welcomeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>.welcomeEyebrow{
      margin:0 0 20px!important;
      color:#7f91ad!important;
      letter-spacing:.12em!important;
      font-size:13px!important;
      font-weight:700!important;
    }
    .welcomeBubble.heroEnhanced h1{
      margin:0!important;
      font-size:clamp(52px,4.65vw,80px)!important;
      line-height:.93!important;
      letter-spacing:-.055em!important;
      max-width:min(53%, 730px)!important;
      text-wrap:balance!important;
      color:#163a6d!important;
    }
    .homeBubble.heroEnhanced h2{
      margin:0!important;
      font-size:clamp(40px,3.7vw,58px)!important;
      line-height:.98!important;
      letter-spacing:-.045em!important;
      color:#163a6d!important;
    }
    .welcomeBubble.heroEnhanced p,.homeBubble.heroEnhanced p{
      margin-top:18px!important;
      font-size:18px!important;
      line-height:1.58!important;
      color:#6b7e96!important;
      max-width:min(48%, 590px)!important;
    }
    .welcomeBubble.heroEnhanced .welcomeActions,.homeBubble.heroEnhanced .welcomeActions{
      display:flex!important;
      gap:12px!important;
      flex-wrap:wrap!important;
      margin-top:34px!important;
      max-width:min(52%, 700px)!important;
    }
    .welcomeBubble.heroEnhanced .welcomeActions button,.homeBubble.heroEnhanced .welcomeActions button{
      min-height:52px!important;
      padding:0 22px!important;
      font-size:15px!important;
      font-weight:700!important;
      border-radius:999px!important;
      border:1px solid rgba(114,146,204,.26)!important;
      background:rgba(255,255,255,.84)!important;
      color:#2b57d9!important;
      box-shadow:0 8px 18px rgba(24,49,92,.04)!important;
      backdrop-filter:blur(10px)!important;
      -webkit-backdrop-filter:blur(10px)!important;
      transition:transform .18s ease, box-shadow .18s ease, background .18s ease!important;
    }
    .welcomeBubble.heroEnhanced .welcomeActions button:hover,.homeBubble.heroEnhanced .welcomeActions button:hover{
      transform:translateY(-1px)!important;
      box-shadow:0 10px 24px rgba(24,49,92,.08)!important;
      background:rgba(255,255,255,.95)!important;
    }
    .welcomeBubble.heroEnhanced .welcomeActions .primary,.homeBubble.heroEnhanced .welcomeActions .primary{
      background:linear-gradient(180deg,#3b82ff 0%,#2e6ef1 100%)!important;
      border-color:rgba(46,110,241,.65)!important;
      color:#fff!important;
      box-shadow:0 18px 34px rgba(47,109,240,.18)!important;
    }
    @media (max-width: 1180px){
      .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{min-height:430px!important;padding:32px 32px 46px!important}
      .welcomeBubble.heroEnhanced>.welcomeEyebrow,.welcomeBubble.heroEnhanced>h1,.welcomeBubble.heroEnhanced>p,.welcomeBubble.heroEnhanced>.welcomeActions,
      .homeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>h2,.homeBubble.heroEnhanced>p,.homeBubble.heroEnhanced>.welcomeActions{max-width:60%!important}
      .welcomeBubble.heroEnhanced h1{font-size:clamp(46px,4.5vw,70px)!important}
      .welcomeBubble.heroEnhanced p,.homeBubble.heroEnhanced p{max-width:56%!important;font-size:17px!important}
      .welcomeBubble.heroEnhanced .welcomeActions,.homeBubble.heroEnhanced .welcomeActions{max-width:60%!important}
      .welcomeBubble.heroEnhanced::after,.homeBubble.heroEnhanced::after{left:32%;right:22%}
    }
    @media (max-width: 920px){
      .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{min-height:370px!important;padding:28px 26px 38px!important}
      .welcomeBubble.heroEnhanced>.heroVisualCol,.homeBubble.heroEnhanced>.heroVisualCol{background-position:74% center!important}
      .welcomeBubble.heroEnhanced>.welcomeEyebrow,.welcomeBubble.heroEnhanced>h1,.welcomeBubble.heroEnhanced>p,.welcomeBubble.heroEnhanced>.welcomeActions,
      .homeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>h2,.homeBubble.heroEnhanced>p,.homeBubble.heroEnhanced>.welcomeActions{max-width:100%!important}
      .welcomeBubble.heroEnhanced h1{max-width:100%!important;font-size:clamp(40px,7vw,58px)!important}
      .homeBubble.heroEnhanced h2{font-size:clamp(34px,6vw,46px)!important}
      .welcomeBubble.heroEnhanced p,.homeBubble.heroEnhanced p{max-width:76%!important;font-size:16px!important}
      .welcomeBubble.heroEnhanced .welcomeActions,.homeBubble.heroEnhanced .welcomeActions{max-width:80%!important;gap:10px!important}
      .welcomeBubble.heroEnhanced::before,.homeBubble.heroEnhanced::before{
        background:
          linear-gradient(90deg, rgba(251,253,255,.97) 0%, rgba(251,253,255,.95) 42%, rgba(251,253,255,.82) 62%, rgba(251,253,255,.48) 78%, rgba(251,253,255,.18) 92%, rgba(251,253,255,.06) 100%);
      }
      .welcomeBubble.heroEnhanced::after,.homeBubble.heroEnhanced::after{display:none}
    }
    @media (max-width: 700px){
      .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{min-height:0!important;padding:24px 18px 24px!important;border-radius:24px!important}
      .welcomeBubble.heroEnhanced>.heroVisualCol,.homeBubble.heroEnhanced>.heroVisualCol{background-position:70% center!important;opacity:.95!important}
      .welcomeBubble.heroEnhanced>.welcomeEyebrow,.welcomeBubble.heroEnhanced>h1,.welcomeBubble.heroEnhanced>p,.welcomeBubble.heroEnhanced>.welcomeActions,
      .homeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>h2,.homeBubble.heroEnhanced>p,.homeBubble.heroEnhanced>.welcomeActions{max-width:100%!important}
      .welcomeBubble.heroEnhanced::before,.homeBubble.heroEnhanced::before{background:linear-gradient(180deg, rgba(251,253,255,.88) 0%, rgba(251,253,255,.92) 38%, rgba(251,253,255,.97) 64%, rgba(251,253,255,.98) 100%)}
      .welcomeBubble.heroEnhanced h1{font-size:36px!important;line-height:.97!important}
      .welcomeBubble.heroEnhanced p,.homeBubble.heroEnhanced p{font-size:14px!important;max-width:100%!important;margin-top:14px!important}
      .welcomeBubble.heroEnhanced .welcomeActions,.homeBubble.heroEnhanced .welcomeActions{max-width:100%!important;gap:8px!important;margin-top:20px!important}
      .welcomeBubble.heroEnhanced .welcomeActions button,.homeBubble.heroEnhanced .welcomeActions button{min-height:44px!important;padding:0 16px!important;font-size:13px!important}
    }
  `;
  document.head.insertAdjacentHTML('beforeend',`<style>${css}</style>`);

  function cleanWelcomeActions(root=document){
    root.querySelectorAll('.welcomeTurn .welcomeActions [data-page="insurance"], .welcomeTurn .welcomeActions [data-page="works"], .welcomeTurn .welcomeActions [data-page="reviews"], .homeTurn .welcomeActions [data-page="insurance"], .homeTurn .welcomeActions [data-page="works"], .homeTurn .welcomeActions [data-page="reviews"]').forEach(el=>el.remove());
  }
  function ensureHero(root=document){
    root.querySelectorAll('.welcomeTurn .welcomeBubble,.homeTurn .homeBubble').forEach(b=>{
      b.classList.add('heroEnhanced');
      let visual=b.querySelector(':scope > .heroVisualCol');
      if(!visual){visual=document.createElement('div');visual.className='heroVisualCol';b.appendChild(visual);} else {visual.className='heroVisualCol';}
    });
  }
  function refresh(root=document){cleanWelcomeActions(root);ensureHero(root)}
  refresh();
  const site=document.getElementById('site');
  if(site) new MutationObserver(()=>refresh(site)).observe(site,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(()=>refresh(),0),true);
})();

(function(){
  const css = `
    :root{
      --blue:#5a6ef8;
      --blue-dark:#4657e9;
      --soft-blue:#eef3ff;
    }
    .menuBtn,.bookBtn,.welcomeActions .primary,.inlineActions .primary,.actionBtn.primary,.flowBtn.primary,.timeBtn.active,.calendarDay.active,.managerAddBtn{
      background:linear-gradient(135deg,#6f8cff 0%,#536dfe 55%,#445af0 100%)!important;
      border-color:rgba(83,109,254,.76)!important;
      color:#fff!important;
      box-shadow:0 14px 30px rgba(76,98,238,.22)!important;
    }
    .menuBtn:hover,.bookBtn:hover,.welcomeActions .primary:hover,.inlineActions .primary:hover,.actionBtn.primary:hover,.flowBtn.primary:hover,.managerAddBtn:hover{
      background:linear-gradient(135deg,#7b96ff 0%,#5a73ff 55%,#4b61f2 100%)!important;
      transform:translateY(-1px)!important;
    }
    .bookBtn,.menuBtn{box-shadow:0 12px 26px rgba(76,98,238,.18)!important}
    .welcomeActions button,.inlineActions button,.actionBtn,.flowBtn,.choice,.timeBtn,.composerMeta button,.composerSend,.composerMic{
      transition:transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease!important;
    }
    .welcomeActions button:not(.primary), .inlineActions button:not(.primary), .actionBtn:not(.primary), .flowBtn:not(.primary), .choice, .timeBtn:not(.active){
      background:rgba(255,255,255,.82)!important;
      border-color:rgba(119,137,176,.18)!important;
      box-shadow:0 8px 20px rgba(24,49,92,.045)!important;
      backdrop-filter:blur(10px)!important;
      -webkit-backdrop-filter:blur(10px)!important;
    }
    .welcomeActions button:not(.primary):hover, .inlineActions button:not(.primary):hover, .actionBtn:not(.primary):hover, .flowBtn:not(.primary):hover, .choice:hover, .timeBtn:not(.active):hover{
      border-color:rgba(83,109,254,.28)!important;
      box-shadow:0 10px 24px rgba(24,49,92,.06)!important;
      transform:translateY(-1px)!important;
    }
    .composer{
      background:rgba(255,255,255,.88)!important;
      border-color:rgba(119,137,176,.16)!important;
      box-shadow:0 18px 34px rgba(27,50,92,.07)!important;
      backdrop-filter:blur(16px)!important;
      -webkit-backdrop-filter:blur(16px)!important;
    }
    .composerSend{
      background:linear-gradient(135deg,#6f8cff 0%,#536dfe 55%,#445af0 100%)!important;
      color:#fff!important;
      box-shadow:0 10px 22px rgba(76,98,238,.18)!important;
    }
    .composerSend:disabled{background:#cfd6e6!important;box-shadow:none!important}
    @media (min-width: 921px){
      .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{
        display:block!important;
        min-height:500px!important;
        padding:40px 44px 34px!important;
      }
      .welcomeBubble.heroEnhanced>.heroVisualCol,.homeBubble.heroEnhanced>.heroVisualCol{
        background-position:77% center!important;
        background-size:cover!important;
      }
      .welcomeBubble.heroEnhanced::before,.homeBubble.heroEnhanced::before{
        background:
          radial-gradient(82% 102% at 14% 46%, rgba(255,255,255,.995) 0%, rgba(255,255,255,.98) 30%, rgba(255,255,255,.92) 48%, rgba(255,255,255,.62) 66%, rgba(255,255,255,.16) 84%, rgba(255,255,255,0) 100%),
          linear-gradient(90deg, rgba(252,253,255,.995) 0%, rgba(252,253,255,.97) 24%, rgba(252,253,255,.9) 41%, rgba(252,253,255,.62) 56%, rgba(252,253,255,.24) 72%, rgba(252,253,255,.06) 88%, rgba(252,253,255,0) 100%)!important;
      }
      .welcomeBubble.heroEnhanced::after,.homeBubble.heroEnhanced::after{
        top:10%!important;bottom:10%!important;left:29%!important;right:25%!important;
        opacity:.78!important;
      }
      .welcomeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>.welcomeEyebrow,
      .welcomeBubble.heroEnhanced>h1,.homeBubble.heroEnhanced>h2,
      .welcomeBubble.heroEnhanced>p,.homeBubble.heroEnhanced>p{
        position:relative!important;
        z-index:2!important;
        max-width:min(52%,720px)!important;
      }
      .welcomeBubble.heroEnhanced>.welcomeEyebrow,.homeBubble.heroEnhanced>.welcomeEyebrow{
        margin:4px 0 18px!important;
        font-size:13px!important;
      }
      .welcomeBubble.heroEnhanced h1{
        margin:0!important;
        max-width:min(55%, 760px)!important;
        font-size:clamp(52px,4.5vw,78px)!important;
        line-height:.94!important;
        letter-spacing:-.055em!important;
      }
      .homeBubble.heroEnhanced h2{
        font-size:clamp(40px,3.7vw,56px)!important;
        line-height:.98!important;
      }
      .welcomeBubble.heroEnhanced p,.homeBubble.heroEnhanced p{
        margin-top:24px!important;
        max-width:min(49%,590px)!important;
        font-size:18px!important;
        line-height:1.55!important;
      }
      .welcomeBubble.heroEnhanced .welcomeActions,.homeBubble.heroEnhanced .welcomeActions{
        position:absolute!important;
        left:44px!important;
        bottom:34px!important;
        right:auto!important;
        z-index:3!important;
        width:auto!important;
        max-width:min(56%,760px)!important;
        margin:0!important;
        display:flex!important;
        flex-wrap:wrap!important;
        gap:12px!important;
        align-items:center!important;
      }
      .welcomeBubble.heroEnhanced .welcomeActions button,.homeBubble.heroEnhanced .welcomeActions button{
        min-height:54px!important;
        padding:0 24px!important;
        font-size:15px!important;
        font-weight:700!important;
        border-radius:999px!important;
      }
    }
    @media (max-width: 920px){
      .welcomeBubble.heroEnhanced,.homeBubble.heroEnhanced{padding:28px 24px 28px!important}
      .welcomeBubble.heroEnhanced .welcomeActions,.homeBubble.heroEnhanced .welcomeActions{margin-top:22px!important;position:relative!important;left:auto!important;bottom:auto!important;max-width:100%!important}
    }
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  function nudgeAssistantLogic(){
    document.querySelectorAll('.welcomeTurn .welcomeBubble.heroEnhanced, .homeTurn .homeBubble.heroEnhanced').forEach(b=>{
      const p=b.querySelector('p');
      const eyebrow=b.querySelector('.welcomeEyebrow');
      if(eyebrow && /clinic digital assistant|цифровой ассистент клиники/i.test(eyebrow.textContent||'')){
        eyebrow.textContent = /[А-Яа-яЁё]/.test(b.textContent) ? 'ИИ-АССИСТЕНТ КЛИНИКИ' : 'AI CLINIC ASSISTANT';
      }
      if(p){
        const txt=p.textContent.trim();
        if(/Расскажите, что вас беспокоит, или выберите действие ниже\.?/i.test(txt)){
          p.textContent='Опишите, что вас беспокоит, задайте вопрос голосом или текстом - Ora подскажет по лечению, ценам, страховке и записи.';
        } else if(/Tell me what you need, or choose an action below\.?/i.test(txt)){
          p.textContent='Describe your concern, ask by voice or text, and Ora will guide you through treatment, pricing, insurance and booking.';
        }
      }
    });
  }
  nudgeAssistantLogic();
  const site=document.getElementById('site');
  if(site) new MutationObserver(()=>nudgeAssistantLogic()).observe(site,{childList:true,subtree:true});
})();

(function(){
  const supportState={awaiting:null,topic:null};

  function t(ru,en){return lang==='ru'?ru:en}
  function getService(key){return services.find(s=>s.key===key)||null}
  function serviceFromText(v){
    v=String(v||'').toLowerCase();
    if(/чистк|cleaning|hygiene/.test(v))return'cleaning';
    if(/имплант|implant/.test(v))return'implant';
    if(/винир|veneer/.test(v))return'veneers';
    if(/коронк|crown/.test(v))return'crown';
    if(/осмотр|консультац|exam|consult/.test(v))return'exam';
    if(/боль|болит|опух|от[её]к|скол|слом|сроч|pain|swelling|urgent|emergency|chipped/.test(v))return'emergency';
    return'';
  }
  function compactServiceMarkup(key){
    const s=getService(key);if(!s)return'';
    return `<div class="supportCompactCard"><div><div class="supportKicker">${escapeHtml(t('Подходящий следующий шаг','Suggested next step'))}</div><h3>${escapeHtml(loc(s.title))}</h3></div><div class="supportCompactPrice">${escapeHtml(s.price)}<small>${escapeHtml(t('самостоятельная оплата','self-pay range'))}</small></div><p>${escapeHtml(loc(s.short))}. ${escapeHtml(loc(s.desc))}</p><div class="supportCompactActions"><button type="button" data-page="service" data-key="${escapeHtml(s.key)}">${escapeHtml(t('Подробнее','Details'))}</button><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></div>`;
  }
  function makeActionButtons(actions=[]){
    if(!actions.length)return'';
    return `<div class="supportQuickActions">${actions.map(a=>`<button type="button" class="${a.primary?'primary':''}" ${a.message?`data-support-message="${escapeHtml(a.message)}"`:''} ${a.page?`data-page="${escapeHtml(a.page)}"`:''} ${a.action?`data-support-action="${escapeHtml(a.action)}"`:''}>${escapeHtml(a.label)}</button>`).join('')}</div>`;
  }
  function addAssistantReply(text,{blockType='',key='',compactKey='',actions=[]}={}){
    const el=document.createElement('section');el.className='chatTurn assistantTurn assistantConversationalTurn';
    let rich='';
    if(compactKey) rich=`<div class="assistantRichContent compact">${compactServiceMarkup(compactKey)}</div>`;
    else if(blockType){const markup=chatMarkup(blockType,key);if(markup)rich=`<div class="assistantRichContent">${markup}</div>`}
    el.innerHTML=`<div class="chatAvatar" aria-hidden="true"><span>O</span></div><div class="chatTurnBody"><div class="oraLabel">Ora · OraVera</div><div class="chatBubble"><p>${escapeHtml(text)}</p>${makeActionButtons(actions)}</div>${rich}</div>`;
    document.getElementById('site').appendChild(el);
    hydrateCarousels(el);bindChatRoot(el);
    el.querySelectorAll('[data-support-message]').forEach(b=>b.onclick=()=>submitSupportMessage(b.dataset.supportMessage));
    el.querySelectorAll('[data-support-action="call"]').forEach(b=>b.onclick=startCall);
    requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}));
    return el;
  }
  function submitSupportMessage(message){
    addUserMessage(message);
    respond(message);
  }

  function painResponse(text){
    const v=text.toLowerCase();supportState.topic='pain';
    const danger=/трудно дыш|трудно глот|не могу глот|быстро раст.*от[её]к|лицо сильно опух|difficulty breathing|difficulty swallowing|rapid swelling/.test(v);
    const swelling=/опух|от[её]к|swelling/.test(v);
    const fever=/температур|лихорад|fever/.test(v);
    if(danger){
      supportState.awaiting=null;
      addAssistantReply(t('Это уже не похоже на обычный вопрос для записи. Если отёк быстро растёт или трудно дышать/глотать, нужна срочная медицинская помощь; при угрозе жизни в США звоните 911.','This needs urgent medical attention rather than routine booking. If swelling is rapidly increasing or breathing/swallowing is difficult, seek emergency care; call 911 in the U.S. for a life-threatening emergency.'),{compactKey:'emergency',actions:[{label:tr('callOra'),action:'call'}]});return;
    }
    if(swelling||fever){
      supportState.awaiting='painUrgency';
      addAssistantReply(t('Поняла. Боль вместе с отёком или температурой лучше не откладывать. Скажите, отёк увеличивается и можете ли вы нормально глотать и дышать?','Pain with swelling or fever should be assessed promptly. Is the swelling increasing, and can you swallow and breathe normally?'),{compactKey:'emergency',actions:[{label:t('Дышу и глотаю нормально','Breathing/swallowing normally'),message:t('Дышу и глотаю нормально','I can breathe and swallow normally')},{label:t('Отёк растёт','Swelling is increasing'),message:t('Отёк растёт','The swelling is increasing')}]});return;
    }
    supportState.awaiting='painDetails';
    addAssistantReply(t('Поняла. Давайте быстро уточню, чтобы подсказать следующий шаг. Боль постоянная или появляется при холодном, горячем или накусывании? Есть отёк, температура, травма или скол зуба?','Got it. Let me ask a couple of quick questions so I can guide you. Is the pain constant or triggered by hot/cold or biting? Any swelling, fever, injury, or chipped tooth?'),{compactKey:'emergency',actions:[{label:t('Есть отёк','There is swelling'),message:t('Есть отёк','There is swelling')},{label:t('Без отёка, просто болит','No swelling, just pain'),message:t('Без отёка, просто болит','No swelling, just pain')}]});
  }

  function priceResponse(text){
    const key=serviceFromText(text);supportState.topic='pricing';
    if(key){const s=getService(key);addAssistantReply(t(`Для «${loc(s.title)}» ориентир при самостоятельной оплате - ${s.price}. Точную сумму врач подтверждает после осмотра, если нужен дополнительный план лечения. Хотите сразу подобрать время?`,`The self-pay range for ${loc(s.title)} is ${s.price}. The dentist confirms the final amount after the exam if additional treatment is needed. Would you like to choose a time?`),{compactKey:key,actions:[{label:tr('bookVisit'),page:'booking',primary:true}]});return}
    supportState.awaiting='priceService';
    addAssistantReply(t('Конечно. По какой услуге хотите узнать стоимость? Например: чистка, консультация, коронка, виниры или имплант.','Of course. Which service would you like a price for? For example: cleaning, consultation, crown, veneers, or implant.'),{blockType:'pricing',actions:[{label:t('Чистка','Cleaning'),message:t('Сколько стоит чистка?','How much is a cleaning?')},{label:t('Осмотр','Exam'),message:t('Сколько стоит осмотр?','How much is an exam?')}]});
  }

  function bookingResponse(text){
    const key=serviceFromText(text);supportState.topic='booking';
    if(!key){supportState.awaiting='bookingReason';addAssistantReply(t('Конечно. Сначала уточню причину визита: боль/срочно, осмотр и консультация или профессиональная чистка?','Of course. First, what is the visit for: pain/urgent care, an exam/consultation, or a professional cleaning?'),{actions:[{label:t('Боль / срочно','Pain / urgent'),message:t('Боль, нужно срочно','Pain, urgent')},{label:t('Осмотр / консультация','Exam / consultation'),message:t('Осмотр и консультация','Exam and consultation')},{label:t('Чистка','Cleaning'),message:t('Профессиональная чистка','Professional cleaning')}]});return}
    booking.visit=key==='emergency'?'emergency':key==='cleaning'?'cleaning':'exam';booking.time='';booking.date='';booking.day='';
    addAssistantReply(t(`Поняла: ${loc(getService(key).title)}. Покажу подходящее расписание. Если запись для ребёнка или другого человека, имя можно указать на следующем шаге.`,`Got it: ${loc(getService(key).title)}. I’ll show the appropriate schedule. If the appointment is for a child or someone else, you can enter their name on the next step.`));
    setTimeout(()=>renderBooking(1),80);
  }

  function insuranceResponse(){supportState.topic='insurance';supportState.awaiting='insurancePlan';addAssistantReply(t('Проверим. Напишите страховую компанию и название плана. На этапе MVP я проверяю только, работает ли OraVera с этим планом; персональную стоимость по страховке не рассчитываю.','Let’s check it. Enter the insurance company and plan name. For the MVP, I only check whether OraVera works with the plan; I do not calculate your personal insured price.'),{blockType:'insurance'});}

  function respond(raw){
    const text=String(raw||'').trim();if(!text)return;const v=text.toLowerCase();
    if(/^(\/start|start|home|главная|домой|в начало)$/.test(v)){supportState.awaiting=null;showHomeTurn();return}
    if(/^(привет|здравствуйте|добрый день|hello|hi|hey)\b/.test(v)){addAssistantReply(t('Здравствуйте! Я Ora. Расскажите, с чем помочь: что-то болит, хотите узнать стоимость, проверить страховку или записаться?','Hi! I’m Ora. How can I help: are you in pain, checking a price or insurance, or looking to book?'));return}
    if(/спасибо|благодар|thank/.test(v)){addAssistantReply(t('Пожалуйста. Если хотите, могу помочь со следующим шагом - например, подобрать запись или уточнить стоимость.','You’re welcome. I can help with the next step too, such as choosing an appointment or checking a price.'));return}

    if(supportState.awaiting==='painDetails'||supportState.awaiting==='painUrgency'){supportState.awaiting=null;painResponse(text);return}
    if(supportState.awaiting==='priceService'){supportState.awaiting=null;priceResponse(text);return}
    if(supportState.awaiting==='bookingReason'){supportState.awaiting=null;bookingResponse(text);return}

    if(/болит|боль|зуб.*ноет|опух|от[её]к|скол|сломал.*зуб|pain|toothache|swelling|chipped/.test(v)){painResponse(text);return}
    if(/цена|стоим|сколько стоит|price|cost|how much/.test(v)){priceResponse(text);return}
    if(/страх|insurance|plan/.test(v)){insuranceResponse();return}
    if(/отзыв|review|testimonial/.test(v)){addAssistantReply(t('Конечно. Ниже собрала отзывы пациентов. Если скажете, какая услуга вас интересует - например, имплант или эстетика - я помогу сузить выбор.','Of course. Here are patient reviews. If you tell me which service you’re considering, such as implants or cosmetic care, I can narrow them down.'),{blockType:'reviews'});return}
    if(/работ|до и после|before.*after|portfolio/.test(v)){addAssistantReply(t('Покажу примеры работ. Если скажете, что именно вас интересует - имплант, виниры, коронка - я открою наиболее подходящий пример.','I’ll show treatment examples. Tell me whether you’re interested in implants, veneers, crowns, or something else and I can narrow it down.'),{blockType:'works'});return}
    if(/запис|при[её]м|appointment|book|schedule/.test(v)){bookingResponse(text);return}
    if(/адрес|где вы|как добраться|часы работы|контакт|location|address|hours/.test(v)){addAssistantReply(t('Конечно. Ниже адрес, часы работы и способы связаться с клиникой. Адрес сейчас демонстрационный, чтобы показать production-сценарий.','Of course. Here are the address, office hours, and ways to contact the clinic. The address is currently a demo so you can see the production flow.'),{blockType:'location'});return}
    if(/позвон|звонок|call/.test(v)){addAssistantReply(t('Можно позвонить Ora прямо здесь - разговор не закроет сайт, и вы сможете продолжать смотреть информацию во время звонка.','You can call Ora right here. The call stays in the header so you can keep browsing while you talk.'),{actions:[{label:tr('callOra'),action:'call',primary:true}]});return}
    if(/услуг|лечен|что делаете|services|treatment/.test(v)){addAssistantReply(t('Расскажите, что вас беспокоит, и я подскажу подходящую услугу. Если удобнее, можно посмотреть все основные направления ниже.','Tell me what’s bothering you and I’ll suggest the most relevant service. Or you can browse the main services below.'),{blockType:'services'});return}

    addAssistantReply(t('Поняла. Уточните, пожалуйста, что для вас сейчас важнее: понять, что делать с симптомом, узнать цену, проверить страховку или записаться? Я могу продолжить разговор и показать нужную информацию прямо под ответом.','Got it. What would be most useful right now: help with a symptom, a price, insurance, or booking? I can keep the conversation going and show the relevant information directly under my reply.'),{actions:[{label:t('Есть симптом','I have a symptom'),message:t('У меня болит зуб','I have tooth pain')},{label:tr('prices'),message:t('Хочу узнать цену','I want to know the price')},{label:tr('bookVisit'),message:t('Хочу записаться','I want to book')}]});
  }

  const composerEl=document.getElementById('composer');
  const inputEl=document.getElementById('input');
  if(composerEl&&inputEl){
    composerEl.onsubmit=function(e){
      e.preventDefault();
      const text=inputEl.value.trim();if(!text&&!attachments.length)return;
      const hadPhotos=attachments.length>0;const names=attachments.map(a=>a.name);
      inputEl.value='';attachments=[];renderAttachments();resizeInput();
      if(text)addUserMessage(text);else if(hadPhotos)addUserMessage(t('Фото: ','Photos: ')+names.join(', '));
      if(hadPhotos){
        addAssistantReply(t('Фото получила. Они могут помочь понять контекст, но диагноз по фото я не ставлю. Расскажите, что именно вас беспокоит и как давно это началось?','I received the photos. They can help with context, but I can’t diagnose from a photo. Tell me what’s bothering you and how long it has been going on.'));
        if(!text)return;
      }
      if(text)respond(text);
    };
  }
  window.OraSupport={respond,submitSupportMessage,state:supportState};
})();

(function(){
  const hiddenHeaderLabels=new Set([
    'УСЛУГИ','ЛЕЧЕНИЕ','ЦЕНЫ','ЦЕНЫ И СТРАХОВКА','СТРАХОВКА','НАШИ РАБОТЫ',
    'SERVICES','TREATMENT','PRICES','PRICES & INSURANCE','INSURANCE','OUR WORK',
    'SERVICIOS','TRATAMIENTO','PRECIOS','SEGURO','TRABAJOS',
    'שירותים','טיפול','מחירים','ביטוח','עבודות'
  ]);
  const hiddenCardBadges=new Set([
    'УСЛУГИ','ЛЕЧЕНИЕ','ЦЕНА','ЦЕНЫ','СТРАХОВКА','НАШИ РАБОТЫ',
    'SERVICES','TREATMENT','PRICE','PRICES','INSURANCE','OUR WORK',
    'SERVICIOS','TRATAMIENTO','PRECIO','PRECIOS','SEGURO','TRABAJOS',
    'שירותים','טיפול','מחיר','מחירים','ביטוח','עבודות'
  ]);
  function cleanLabels(root=document){
    root.querySelectorAll('.chatContentHead .chatContentKicker').forEach(el=>{
      const txt=(el.textContent||'').trim().toUpperCase();
      el.classList.toggle('v67-no-kicker',hiddenHeaderLabels.has(txt));
    });
    root.querySelectorAll('.revealCard .cardBadge').forEach(el=>{
      const txt=(el.textContent||'').trim().toUpperCase();
      el.classList.toggle('v67-no-card-badge',hiddenCardBadges.has(txt));
    });
  }
  cleanLabels();
  const site=document.getElementById('site');
  if(site)new MutationObserver(()=>cleanLabels(site)).observe(site,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',()=>setTimeout(()=>cleanLabels(),0),true);
})();

(function(){
  function markCarouselOnly(root=document){
    root.querySelectorAll('.chatContentCard').forEach(card=>{
      card.classList.toggle('v68-carousel-only', !!card.querySelector('[data-carousel-stage]'));
    });
    const pageBody=document.getElementById('pageBody');
    if(pageBody){
      pageBody.classList.toggle('v68-carousel-only', !!pageBody.querySelector('[data-carousel-stage]'));
    }
  }
  markCarouselOnly();
  const site=document.getElementById('site');
  if(site) new MutationObserver(()=>markCarouselOnly(site)).observe(site,{childList:true,subtree:true});
  const pageBody=document.getElementById('pageBody');
  if(pageBody) new MutationObserver(()=>markCarouselOnly(document)).observe(pageBody,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(()=>markCarouselOnly(),0),true);
})();

(function(){
  const visuals={
    crown:'assets/images/services/crown.webp',
    implant:'assets/images/services/implant.webp',
    veneers:'assets/images/services/veneers.webp',
    emergency:'assets/images/services/emergency.webp',
    cleaning:'assets/images/services/cleaning.webp',
    exam:'assets/images/services/exam.webp'
  };
  const serviceCopy={
    crown:{
      ru:{lead:'Коронка восстанавливает форму и функцию повреждённого зуба, помогает снова комфортно жевать и защищает зуб от дальнейшего разрушения.',steps:['Осмотр и снимок для оценки зуба и корня','Подготовка зуба и цифровое сканирование или слепок','Подбор материала и оттенка','Примерка, фиксация коронки и проверка прикуса'],caption:'Визуальный пример реставрации коронкой на жевательном зубе.'},
      en:{lead:'A crown restores the shape and function of a damaged tooth, helps you chew comfortably again, and protects the tooth from further damage.',steps:['Exam and X-ray to assess the tooth and root','Tooth preparation and digital scan or impression','Material and shade selection','Crown placement and bite adjustment'],caption:'Illustrative crown restoration on a posterior tooth.'},
      es:{lead:'Una corona restaura la forma y función de un diente dañado y lo protege.',steps:['Examen y radiografía','Preparación y escaneo o impresión','Selección de material y color','Colocación y ajuste de mordida'],caption:'Ejemplo visual de una restauración con corona.'},
      he:{lead:'כתר משקם את הצורה והתפקוד של שן פגועה ומגן עליה.',steps:['בדיקה וצילום','הכנת השן וסריקה או מטבע','בחירת חומר וגוון','הדבקת הכתר ובדיקת הסגר'],caption:'המחשה של שיקום עם כתר.'}
    },
    implant:{
      ru:{lead:'Имплант помогает заменить отсутствующий зуб: в кость устанавливается имплант, а после заживления сверху фиксируется индивидуальная коронка.',steps:['Осмотр, снимки и план лечения','Установка импланта','Период заживления и подготовка коронки','Финальная фиксация и проверка прикуса'],caption:'Иллюстрация этапа изготовления и установки имплантационной реставрации.'},
      en:{lead:'An implant replaces a missing tooth with a titanium fixture and a custom crown.',steps:['Exam, imaging, and treatment planning','Implant placement','Healing period and crown design','Final restoration and bite check'],caption:'Illustrative implant-restoration workflow.'}
    },
    veneers:{
      ru:{lead:'Виниры помогают изменить форму, цвет и общий вид передних зубов, чтобы улыбка выглядела более ровной и гармоничной.',steps:['Эстетическая консультация и цели','Подбор формы и оттенка','Подготовка зубов при необходимости','Примерка и окончательная фиксация'],caption:'Иллюстрация цифрового планирования эстетической реставрации.'},
      en:{lead:'Veneers can improve the shape, shade, and overall appearance of the front teeth.',steps:['Cosmetic assessment and goals','Shape and shade planning','Preparation when needed','Try-in and final bonding'],caption:'Illustrative digital smile-planning visual.'}
    },
    emergency:{
      ru:{lead:'Срочный приём помогает быстро оценить боль, отёк, травму или скол зуба и понять, какой следующий шаг нужен.',steps:['Короткий опрос по симптомам','Осмотр проблемной области','Снимок или диагностика при необходимости','Облегчение симптомов и план дальнейших действий'],caption:'Иллюстрация диагностического этапа срочного приёма.'},
      en:{lead:'An urgent visit helps quickly assess pain, swelling, trauma, or a chipped tooth and decide the next step.',steps:['Quick symptom review','Focused exam','X-ray or diagnostics if needed','Pain relief and next-step plan'],caption:'Illustrative urgent diagnostic visual.'}
    },
    cleaning:{
      ru:{lead:'Профессиональная чистка помогает убрать налёт и камень, поддержать здоровье дёсен и сохранить зубы в хорошем состоянии.',steps:['Оценка состояния дёсен и гигиены','Удаление налёта и зубного камня','Полировка','Рекомендации по домашнему уходу'],caption:'Иллюстрация цифрового и профилактического этапа ухода.'},
      en:{lead:'Professional cleaning removes plaque and tartar and helps keep teeth and gums healthier.',steps:['Gum and hygiene assessment','Plaque and tartar removal','Polishing','Home-care guidance'],caption:'Illustrative hygiene and diagnostic visual.'}
    },
    exam:{
      ru:{lead:'Осмотр помогает врачу понять жалобу, оценить состояние зубов и дёсен и предложить подходящий следующий шаг.',steps:['Разговор о симптомах или цели визита','Клинический осмотр','Диагностика и снимки при необходимости','Рекомендации и дальнейший план'],caption:'Иллюстрация цифровой диагностики.'},
      en:{lead:'An exam helps the dentist understand your concern, assess your teeth and gums, and recommend the next step.',steps:['Discuss symptoms or goals','Clinical exam','Diagnostics or imaging if needed','Recommendations and next-step plan'],caption:'Illustrative digital diagnostic visual.'}
    }
  };
  function textFor(s){
    const item=serviceCopy[s.key]||serviceCopy.exam;
    return item[lang]||item.en;
  }
  function priceTip(){
    if(lang==='ru')return 'Точная стоимость зависит от клинической ситуации, выбранного материала и дополнительных процедур, если они понадобятся.';
    if(lang==='es')return 'El costo exacto depende de la situación clínica, el material elegido y cualquier procedimiento adicional que pueda ser necesario.';
    if(lang==='he')return 'המחיר המדויק תלוי במצב הקליני, בחומר הנבחר ובפרוצדורות נוספות אם יידרשו.';
    return 'The exact cost depends on the clinical situation, material choice, and any additional procedures that may be needed.';
  }
  function includedLabel(){return lang==='ru'?'Что обычно входит':lang==='es'?'Qué suele incluirse':lang==='he'?'מה בדרך כלל כלול':'What is usually included'}
  function visualCaptionFallback(){return lang==='ru'?'Иллюстрация этапа лечения.':'Illustrative treatment visual.'}

  window.serviceDetailPage=function(s){
    const c=textFor(s),visual=visuals[s.key]||visuals.exam;
    return `<div class="serviceDetailOuter"><div class="serviceDetailV70"><article class="servicePanelV70 serviceInfoV70"><div class="serviceTopActionsV70"><button class="serviceBackV70" type="button" data-page="services">← ${escapeHtml(tr('services'))}</button><button class="serviceHomeV70" type="button" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div><h3 class="serviceTitleV70">${escapeHtml(loc(s.title))}</h3><div class="servicePriceRowV70"><div class="servicePriceV70">${escapeHtml(s.price)}</div><button class="servicePriceInfoV70" type="button" aria-label="Info"><span>i</span><span class="servicePriceTipV70">${escapeHtml(priceTip())}</span></button></div><p class="serviceLeadV70">${escapeHtml(c.lead)}</p><section class="serviceIncludesV70"><div class="serviceIncludesLabelV70">${escapeHtml(includedLabel())}</div><ul class="serviceStepsV70">${c.steps.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><div class="serviceActionsV70"><button type="button" data-page="reviews">${escapeHtml(tr('reviews'))}</button><button type="button" data-page="insurance">${escapeHtml(tr('insurance'))}</button><button class="primary" type="button" data-page="booking">${escapeHtml(tr('bookVisit'))}</button></div></article><aside class="servicePanelV70 serviceVisualV70"><img src="${visual}" alt="${escapeHtml(loc(s.title))}"><div class="serviceVisualCaptionV70">${escapeHtml(c.caption||visualCaptionFallback())}</div></aside></div></div>`;
  };

  const previousChatMarkupV70=window.chatMarkup;
  window.chatMarkup=function(type,key=''){
    if(type==='service'){
      const s=services.find(x=>x.key===key)||services[0];
      return `<div class="chatContentCard serviceDetailShellV70"><div class="chatContentBody">${window.serviceDetailPage(s)}</div></div>`;
    }
    return previousChatMarkupV70(type,key);
  };

  const previousBookingMarkupV70=window.bookingMarkup;
  window.bookingMarkup=function(step=1){
    let out=previousBookingMarkupV70(step);
    if(step===2){
      out=out.replace(/>Оплачу сам\(а\)</g,'>Оплачу самостоятельно<')
             .replace(/>Пока не знаю</g,'>Уточню позже<');
    }
    return out;
  };

  const previousBindChatRootV70=window.bindChatRoot;
  window.bindChatRoot=function(root){
    previousBindChatRootV70(root);
    root.querySelectorAll('[data-home-chat]').forEach(b=>b.onclick=e=>{e.preventDefault();showHomeTurn()});
    root.querySelectorAll('.servicePriceInfoV70').forEach(b=>b.onclick=e=>{e.stopPropagation();b.classList.toggle('is-open')});
  };

  document.addEventListener('click',e=>{
    if(!e.target.closest('.servicePriceInfoV70')) document.querySelectorAll('.servicePriceInfoV70.is-open').forEach(x=>x.classList.remove('is-open'));
  });
})();

(function(){
  const serviceMedia={
    implant:'assets/images/services/implant.webp',veneers:'assets/images/services/veneers.webp',crown:'assets/images/services/crown.webp',emergency:'assets/images/services/emergency.webp',cleaning:'assets/images/services/cleaning.webp',exam:'assets/images/services/exam.webp'
  };
  const workMedia={work1:'assets/images/work/urgent-card.webp',work2:'assets/images/work/veneers-card.webp',work3:'assets/images/work/crown-card.webp',work4:'assets/images/work/implant-card.webp'};
  window.ORAVERA_GENERATED_MEDIA={...serviceMedia,...workMedia,hero:'assets/images/hero/ora-assistant.webp'};

  const previousCarouselMarkupV71=window.carouselMarkup;
  window.carouselMarkup=carouselMarkup=function(id,cards){
    const initial=cards.length>1?1:0;
    return `<div class="carouselStage" data-carousel-stage="${id}" data-active-index="${initial}" tabindex="0" aria-label="Interactive carousel">
      <div class="carouselTrack" id="${id}-track">
        ${cards.map((c,i)=>{
          const full=String(c.desc||'');
          const short=truncateCardText(full,74);
          const src=serviceMedia[c.key]||workMedia[c.key]||'';
          const isWork=String(c.key||'').startsWith('work');
          const photo=src?`<div class="${isWork?'workPhotoV71':'servicePhotoV71'}"><img src="${src}" alt="${escapeHtml(c.title)}" loading="lazy"></div>`:'';
          return `<div class="carouselItem" data-carousel-item data-index="${i}">
            <article class="revealCard ${src?'hasPhotoV71':''}" data-reveal-card data-card-index="${i}" data-key="${escapeHtml(c.key)}" data-full="${escapeHtml(full)}" data-short="${escapeHtml(short)}" tabindex="0" role="button" aria-label="${escapeHtml(c.title)}">
              <div class="cardTop"><h3 class="cardTitle">${escapeHtml(c.title)}</h3><span class="cardBadge">${escapeHtml(c.badge||'')}</span></div>
              ${c.price?`<div class="cardPrice">${escapeHtml(c.price)}<small>${escapeHtml(micro('range'))}</small></div>`:''}
              ${photo}
              <button class="cardPlus" type="button" aria-label="${escapeHtml(micro('expand'))}" data-card-select="${i}"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>
              <p class="cardDescription">${wordsMarkup(i===initial?full:short)}</p>
            </article>
          </div>`
        }).join('')}
      </div>
      <div class="carouselControls" data-carousel-controls>
        <button type="button" data-carousel-step="-1" aria-label="${escapeHtml(micro('previous'))}"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
        <button type="button" data-carousel-step="1" aria-label="${escapeHtml(micro('next'))}"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>
      <div class="carouselHint">${escapeHtml(micro('drag'))}</div>
    </div>`;
  };

  const previousServiceDetailV71=window.serviceDetailPage;
  window.serviceDetailPage=function(s){
    let html=previousServiceDetailV71(s);
    const src=serviceMedia[s.key];
    if(src) html=html.replace(/<img src="[^"]+"/,`<img src="${src}"`);
    return html;
  };

  // Re-render any static carousels with generated media.
  if(typeof renderAllCarousels==='function'){
    try{renderAllCarousels()}catch(e){}
  }
})();

(function(){
  const galleryData={work1:['assets/images/work/urgent-01.webp','assets/images/work/urgent-02.webp'],work2:['assets/images/work/veneers-01.webp','assets/images/work/veneers-02.webp','assets/images/work/urgent-02.webp'],work3:['assets/images/work/crown-01.webp','assets/images/work/urgent-01.webp'],work4:['assets/images/work/crown-02.webp','assets/images/work/crown-01.webp']};
  const titles={
    work1:{ru:'Срочный осмотр',en:'Urgent dental exam',es:'Consulta urgente',he:'בדיקה דחופה'},
    work2:{ru:'Планирование улыбки с винирами',en:'Smile planning with veneers',es:'Diseño de sonrisa con carillas',he:'עיצוב חיוך עם ציפויים'},
    work3:{ru:'Восстановление зуба коронкой',en:'Tooth restoration with a crown',es:'Restauración con corona',he:'שיקום שן עם כתר'},
    work4:{ru:'Имплант одного зуба',en:'Single-tooth implant',es:'Implante de un diente',he:'שתל לשן אחת'}
  };
  let currentKey='work1',currentIndex=0;

  function currentLang(){return document.documentElement.lang||'en'}
  function galleryLabel(){const l=currentLang();return l==='ru'?'Галерея работ':l==='es'?'Galería de casos':l==='he'?'גלריית עבודות':'Case gallery'}

  const modal=document.createElement('div');
  modal.className='workGalleryV72';modal.id='workGalleryV72';modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="workGalleryPanelV72" role="dialog" aria-modal="true" aria-label="Gallery">
    <div class="workGalleryHeadV72"><div class="workGalleryTitleV72"><strong></strong><span></span></div><button class="workGalleryCloseV72" type="button" aria-label="Close">×</button></div>
    <div class="workGalleryStageV72"><img class="workGalleryImageV72" alt=""><button class="workGalleryNavV72 workGalleryPrevV72" type="button" aria-label="Previous">‹</button><button class="workGalleryNavV72 workGalleryNextV72" type="button" aria-label="Next">›</button><div class="workGalleryCountV72"></div></div>
    <div class="workGalleryThumbsV72"></div>
  </div>`;
  document.body.appendChild(modal);
  const image=modal.querySelector('.workGalleryImageV72'),title=modal.querySelector('.workGalleryTitleV72 strong'),subtitle=modal.querySelector('.workGalleryTitleV72 span'),counter=modal.querySelector('.workGalleryCountV72'),thumbs=modal.querySelector('.workGalleryThumbsV72');

  function renderGallery(){
    const arr=galleryData[currentKey]||[];if(!arr.length)return;
    currentIndex=(currentIndex+arr.length)%arr.length;
    image.src=arr[currentIndex];
    const l=currentLang();title.textContent=(titles[currentKey]&&(titles[currentKey][l]||titles[currentKey].en))||'';
    subtitle.textContent=galleryLabel();counter.textContent=`${currentIndex+1} / ${arr.length}`;
    thumbs.innerHTML=arr.map((src,i)=>`<button type="button" class="workGalleryThumbV72 ${i===currentIndex?'active':''}" data-gallery-thumb="${i}"><img src="${src}" alt=""></button>`).join('');
    thumbs.querySelectorAll('[data-gallery-thumb]').forEach(b=>b.onclick=()=>{currentIndex=Number(b.dataset.galleryThumb);renderGallery()});
  }
  function openGallery(key,index=0){if(!galleryData[key])return;currentKey=key;currentIndex=index;renderGallery();modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.classList.add('gallery-open')}
  function closeGallery(){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');document.body.classList.remove('gallery-open')}
  function step(delta){currentIndex+=delta;renderGallery()}
  modal.querySelector('.workGalleryCloseV72').onclick=closeGallery;
  modal.querySelector('.workGalleryPrevV72').onclick=()=>step(-1);
  modal.querySelector('.workGalleryNextV72').onclick=()=>step(1);
  modal.addEventListener('click',e=>{if(e.target===modal)closeGallery()});
  document.addEventListener('keydown',e=>{if(!modal.classList.contains('show'))return;if(e.key==='Escape')closeGallery();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});

  function bindWorkCards(root=document){
    root.querySelectorAll('[data-reveal-card][data-key^="work"]').forEach(card=>{
      if(card.dataset.galleryBoundV72==='1')return;
      card.dataset.galleryBoundV72='1';
      card.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!modal.classList.contains('show'))openGallery(card.dataset.key,0)},true);
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openGallery(card.dataset.key,0)}},true);
    });
    root.querySelectorAll('[data-carousel-stage]').forEach(stage=>{
      if(stage.dataset.workGalleryPointerV72==='1')return;
      stage.dataset.workGalleryPointerV72='1';
      let key='',x=0,y=0;
      stage.addEventListener('pointerdown',e=>{const card=e.target.closest('[data-reveal-card][data-key^="work"]');key=card?card.dataset.key:'';x=e.clientX;y=e.clientY},true);
      stage.addEventListener('pointerup',e=>{if(key&&Math.hypot(e.clientX-x,e.clientY-y)<=8){const k=key;key='';e.preventDefault();e.stopPropagation();openGallery(k,0)}else key=''},true);
      stage.addEventListener('pointercancel',()=>{key=''},true);
    });
  }
  bindWorkCards();
  new MutationObserver(()=>bindWorkCards()).observe(document.body,{childList:true,subtree:true});

  function cleanServiceBadges(root=document){
    root.querySelectorAll('.cardBadge').forEach(b=>{const t=(b.textContent||'').trim().toLowerCase();if(['услуга','service','servicio','שירות'].includes(t))b.remove()});
  }
  cleanServiceBadges();
  new MutationObserver(()=>cleanServiceBadges()).observe(document.body,{childList:true,subtree:true});

  function iconizeEndCall(){
    const b=document.getElementById('endCall');if(!b)return;
    const l=currentLang();b.setAttribute('aria-label',l==='ru'?'Завершить звонок':l==='es'?'Finalizar llamada':l==='he'?'סיום שיחה':'End call');
    b.setAttribute('title',b.getAttribute('aria-label'));
    if(!b.querySelector('svg[data-v72-hangup]')) b.innerHTML=`<svg data-v72-hangup="1" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25A2.25 2.25 0 0 0 21.75 19.5v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.872 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>`;
  }
  iconizeEndCall();
  const oldUpdate=window.updateStaticUi;
  if(typeof oldUpdate==='function')window.updateStaticUi=function(){const r=oldUpdate.apply(this,arguments);queueMicrotask(iconizeEndCall);return r};
  const endButton=document.getElementById('endCall');
  if(endButton)new MutationObserver(()=>iconizeEndCall()).observe(endButton,{childList:true,characterData:true,subtree:true});
  new MutationObserver(()=>queueMicrotask(iconizeEndCall)).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(iconizeEndCall,0),true);

  window.OraWorkGalleryV72={open:openGallery,close:closeGallery,step};
})();

(function(){
  function decorate(root=document){
    root.querySelectorAll('[data-carousel-stage*="reviews"] [data-reveal-card]').forEach(card=>{
      if(card.dataset.reviewDecoratedV79==='1') return;
      card.dataset.reviewDecoratedV79='1';
      card.classList.add('reviewCardV79');
      const top=card.querySelector('.cardTop');
      if(top){
        top.insertAdjacentHTML('afterend','<div class="reviewStarsV79" aria-label="5 stars">★★★★★</div><div class="reviewQuoteV79" aria-hidden="true">“</div>');
      }
      card.querySelector('.cardPlus')?.remove();
      card.querySelectorAll('.cardDescription .word').forEach(w=>w.classList.add('on'));
    });
  }
  decorate();
  const site=document.getElementById('site');
  if(site) new MutationObserver(()=>decorate(site)).observe(site,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(()=>decorate(),0),true);
})();

(function(){
  function place(btn){
    const tip=btn?.querySelector('.servicePriceTipV70');
    if(!btn||!tip||innerWidth>700)return;
    const r=btn.getBoundingClientRect();
    const margin=14;
    const width=Math.min(320,innerWidth-margin*2);
    let left=r.left+r.width/2-width/2;
    left=Math.max(margin,Math.min(innerWidth-margin-width,left));
    tip.style.width=width+'px';
    tip.style.left=left+'px';
    tip.style.right='auto';
    const approxH=Math.max(96,tip.offsetHeight||96);
    let top=r.bottom+8;
    if(top+approxH>innerHeight-margin)top=Math.max(margin,r.top-approxH-8);
    tip.style.top=top+'px';
  }
  function placeOpen(){document.querySelectorAll('.servicePriceInfoV70.is-open').forEach(place)}
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.servicePriceInfoV70');
    if(btn)setTimeout(()=>place(btn),0);
  },true);
  addEventListener('resize',placeOpen,{passive:true});
  addEventListener('scroll',placeOpen,{passive:true,capture:true});
})();

(function(){
  function tx(ru,en){return lang==='ru'?ru:en}
  function readStore(){try{const x=JSON.parse(localStorage.getItem('oravera-appointments-v53')||'[]');return Array.isArray(x)?x:[]}catch{return []}}
  function apptMs(a){if(!a?.date||!a?.time)return NaN;const d=String(a.date).split('-').map(Number),m=String(a.time).match(/(\d+):(\d+)\s*(AM|PM)/i);if(d.length!==3||!m)return NaN;let h=Number(m[1])%12;if(m[3].toUpperCase()==='PM')h+=12;return new Date(d[0],d[1]-1,d[2],h,Number(m[2]),0,0).getTime()}
  function enhanceAppointments(root=document){
    root.querySelectorAll('.appointmentManager.__v81_disabled__').forEach(manager=>{
      const list=manager.querySelector('.appointmentList');if(!list)return;manager.dataset.v81Tabs='1';
      const byId=new Map(readStore().map(a=>[String(a.id),a])),future=document.createElement('div'),past=document.createElement('div');
      future.className='appointmentPanelV81 appointmentList';future.dataset.apptPanel='future';past.className='appointmentPanelV81 appointmentList';past.dataset.apptPanel='past';past.hidden=true;
      const now=Date.now();[...list.querySelectorAll('.appointmentCard')].forEach(card=>{const a=byId.get(String(card.dataset.appointmentCard)),ms=apptMs(a),isPast=Number.isFinite(ms)&&ms<now;if(isPast){card.classList.add('isPastV81');const s=card.querySelector('.appointmentStatus');if(s)s.textContent=tx('Прошедшая','Past');past.appendChild(card)}else future.appendChild(card)});
      const fc=future.querySelectorAll('.appointmentCard').length,pc=past.querySelectorAll('.appointmentCard').length;
      if(!fc)future.innerHTML=`<div class="appointmentEmptyV81">${tx('Будущих записей пока нет.','No upcoming appointments yet.')}</div>`;
      if(!pc)past.innerHTML=`<div class="appointmentEmptyV81">${tx('Прошлых записей пока нет.','No past appointments yet.')}</div>`;
      const tabs=document.createElement('div');tabs.className='appointmentTabsV81';tabs.innerHTML=`<button type="button" class="appointmentTabV81 active" data-appt-tab="future">${tx('Будущие','Upcoming')} <span class="tabCountV81">${fc}</span></button><button type="button" class="appointmentTabV81" data-appt-tab="past">${tx('Прошлые','Past')} <span class="tabCountV81">${pc}</span></button>`;
      list.replaceWith(future,past);manager.insertBefore(tabs,future);const intro=manager.querySelector('.appointmentIntro');
      function select(name){tabs.querySelectorAll('[data-appt-tab]').forEach(b=>b.classList.toggle('active',b.dataset.apptTab===name));future.hidden=name!=='future';past.hidden=name!=='past';if(intro)intro.style.display=name==='future'?'':'none'}
      tabs.querySelectorAll('[data-appt-tab]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.apptTab)));if(!fc&&pc)select('past');
    });
  }
  enhanceAppointments();const site=document.getElementById('site');if(site)new MutationObserver(()=>enhanceAppointments(site)).observe(site,{childList:true,subtree:true});

  const scoped={
    implant:{ru:['Мне заранее объяснили этапы имплантации и что коронка ставится после заживления. Было понятно, чего ждать по времени и стоимости.','Понравилось, что стоимость не сводили к одной цене «от»: отдельно объяснили имплант, коронку и возможные дополнительные процедуры.','На консультации показали снимок и спокойно разобрали варианты восстановления отсутствующего зуба.'],en:['The implant stages were explained up front, including that the crown comes after healing.','The cost was not reduced to a single “from” price; the implant, crown, and possible extras were explained separately.','The consultation used my imaging to explain the options for replacing the missing tooth.']},
    veneers:{ru:['Перед лечением обсудили форму и оттенок, поэтому результат не выглядел неожиданным.','Сначала разобрали мои цели по улыбке, а уже потом обсуждали количество виниров.','Результат выглядит естественно — именно этого я хотела.'],en:['We discussed shape and shade before treatment, so the result did not feel unexpected.','We discussed my smile goals before deciding how many veneers made sense.','The result looks natural, which was exactly what I wanted.']},
    crown:{ru:['Врач объяснил, зачем нужна коронка и чем она отличается от обычной пломбы. После фиксации прикус проверили и подкорректировали.','Мне заранее объяснили, что материал коронки влияет на итоговую стоимость.','Процесс оказался понятнее, чем я ожидала: осмотр, подготовка зуба, сканирование и затем установка коронки.'],en:['The dentist explained why I needed a crown and how it differs from a filling.','They explained in advance that crown material could affect the final price.','The process was clear: exam, tooth preparation, scan, and then crown placement.']},
    emergency:{ru:['Я написала из-за сильной боли и быстро поняла, какой визит выбрать.','Сначала уточнили про отёк и температуру, а потом предложили ближайшее время.','Не пришлось разбираться в услугах — я просто описала проблему и получила следующий шаг.'],en:['I messaged because of significant pain and quickly understood which visit to choose.','They first asked about swelling and fever before suggesting the nearest time.','I described the problem and got the next step without figuring out the service myself.']},
    cleaning:{ru:['Чистка прошла аккуратно, а после неё дали понятные рекомендации по домашнему уходу.','Перед началом объяснили, чем обычная чистка отличается от глубокой пародонтологической.','Удобно, что сразу видно ориентир по цене и можно выбрать время без звонка.'],en:['The cleaning was comfortable and I received clear home-care recommendations.','They explained the difference between routine cleaning and deeper periodontal cleaning.','It was useful to see the price range and choose a time without calling.']},
    exam:{ru:['На первом приёме врач спокойно разобрал мои жалобы и показал варианты дальнейших действий.','Сначала сделали осмотр и объяснили приоритеты, без давления на лечение.','После консультации у меня был понятный план следующих шагов и ориентир по стоимости.'],en:['At the first visit the dentist reviewed my concerns and explained the options.','The exam came first and the priorities were explained without pressure.','After the consultation I had a clear next-step plan and price range.']}
  };
  function svc(key){try{return services.find(s=>s.key===key)}catch{return null}}
  function scopedCards(key){const rows=scoped[key]?.[lang]||scoped[key]?.en||[],s=svc(key),title=s?loc(s.title):tr('reviews');return rows.map((desc,i)=>({title,badge:'',price:'',desc,key:`service-review-${key}-${i}`,index:i}))}
  if(window.serviceDetailPage){const base=window.serviceDetailPage;window.serviceDetailPage=function(s){return base(s).replace(/data-page="reviews"(?![^>]*data-key)/,`data-page="reviews" data-key="${escapeHtml(s.key)}"`)}}

  const faqRU=[
    ['Можно записаться на сегодня?','Да, если в расписании есть свободное время. Для боли или срочной проблемы выберите «Срочный осмотр» — Ora покажет ближайшие доступные варианты.'],
    ['Что входит в первый осмотр?','Врач уточнит жалобы и цели визита, проведёт клинический осмотр и при необходимости назначит снимки или другую диагностику. После этого вы получите рекомендации по следующим шагам.'],
    ['Что делать, если сильно болит зуб или появился отёк?','Напишите Ora и выберите срочный приём. Если отёк быстро увеличивается или трудно дышать или глотать, нужна срочная медицинская помощь; при угрозе жизни в США звоните 911.'],
    ['Можно отправить фото зуба до визита?','Да. Фото помогает собрать контекст и выбрать следующий шаг, но не заменяет очный осмотр и не является окончательным диагнозом.'],
    ['Как работает страховка на сайте?','Для MVP Ora проверяет только, работает ли клиника с указанной страховой компанией или планом. Персональная стоимость лечения с учётом страховки на сайте не рассчитывается.'],
    ['Что означают цены на сайте?','Это ориентировочные диапазоны при самостоятельной оплате. Точная сумма зависит от клинической ситуации, материалов и дополнительных процедур и подтверждается после осмотра.'],
    ['Можно изменить или отменить запись?','Да, онлайн запись можно изменить или отменить не позднее чем за 24 часа до приёма. Если осталось меньше суток, свяжитесь с Ora по телефону.'],
    ['Можно записать сразу несколько членов семьи?','Да. После первой записи выберите «Добавить ещё одну запись» и укажите имя другого пациента. Контактные данные можно использовать те же.'],
    ['На каких языках можно общаться с Ora?','Интерфейс поддерживает English, Español, Русский и עברית. Язык можно переключить в шапке сайта.'],
    ['Как подготовиться к визиту?','Возьмите удостоверение личности и страховую карту, если планируете использовать страховку. Если есть недавние снимки, список лекарств или важная медицинская информация, сообщите об этом клинике.']
  ];
  const faqEN=[
    ['Can I book a same-day appointment?','Yes, when a same-day time is available. For pain or an urgent concern, choose Urgent exam and Ora will show the nearest options.'],
    ['What happens at the first exam?','The dentist reviews your concerns and goals, performs a clinical exam, and may recommend X-rays or other diagnostics before explaining the next steps.'],
    ['What should I do for severe tooth pain or swelling?','Message Ora and choose urgent care. Rapidly increasing swelling or difficulty breathing or swallowing needs urgent medical attention; call 911 in the U.S. for a life-threatening emergency.'],
    ['Can I send a photo before my visit?','Yes. A photo can provide useful context, but it does not replace an in-person exam and is not a final diagnosis.'],
    ['How does insurance checking work?','For the MVP, Ora only checks whether the clinic works with the insurance company or plan you provide. The site does not calculate your personal insured price.'],
    ['What do the prices on the site mean?','They are self-pay price ranges. Final cost depends on your clinical situation, materials, and any additional procedures and is confirmed after an exam.'],
    ['Can I change or cancel an appointment?','Yes, online up to 24 hours before the visit. If less than a day remains, call Ora.'],
    ['Can I book for several family members?','Yes. After the first appointment, choose Add another appointment and enter the next patient’s name.'],
    ['Which languages does Ora support?','English, Español, Русский, and עברית. You can switch languages from the site header.'],
    ['How should I prepare for my visit?','Bring a photo ID and insurance card if you plan to use insurance. You can also share recent X-rays, medications, or other relevant medical information.']
  ];
  window.faqChatMarkup=function(){const rows=lang==='ru'?faqRU:faqEN;return `<div class="faqProductionV81">${rows.map(([q,a])=>`<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('')}</div>`};

  if(window.chatMarkup){const base=window.chatMarkup;window.chatMarkup=function(type,key=''){
    if(type==='reviews'&&key&&scoped[key]){const s=svc(key),cards=scopedCards(key),heading=tx(`Отзывы: ${s?loc(s.title):''}`,`Reviews: ${s?loc(s.title):''}`),note=tx('Отзывы ниже относятся только к этой услуге.','The reviews below relate only to this service.');return `<div class="chatContentCard"><div class="chatContentHead"><div><h2>${escapeHtml(heading)}</h2></div><div class="chatContentHeadActions"><button type="button" class="chatHomeBtn" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div></div><div class="chatContentBody"><div class="serviceReviewsNoticeV81">${escapeHtml(note)}</div>${carouselMarkup('chat-service-reviews-'+key+'-'+(++chatInstance),cards)}</div></div>`}
    if(type==='faq')return `<div class="chatContentCard"><div class="chatContentHead"><div><h2>${escapeHtml(tr('faqHeading'))}</h2></div><div class="chatContentHeadActions"><button type="button" class="chatHomeBtn" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div></div><div class="chatContentBody">${window.faqChatMarkup()}</div></div>`;
    return base(type,key)
  }}
})();

(function(){
  const APPT_KEY_V83='oravera-appointments-v53';
  const PROFILE_KEY_V83='oravera-profile-v83';
  let accountRootV83=null;
  let accountMainTabV83='appointments';
  let accountApptTabV83='future';
  let accountCancelIdV83='';

  function txV83(ru,en,es= en,he=en){return lang==='ru'?ru:lang==='es'?es:lang==='he'?he:en}
  function readAppointmentsV83(){
    if(Array.isArray(window.__ORA_TEST_APPTS)) return window.__ORA_TEST_APPTS;
    try{const v=JSON.parse(localStorage.getItem(APPT_KEY_V83)||'[]');return Array.isArray(v)?v:[]}catch{return []}
  }
  function writeAppointmentsV83(rows){
    if(Array.isArray(window.__ORA_TEST_APPTS)){window.__ORA_TEST_APPTS=rows;return}
    try{localStorage.setItem(APPT_KEY_V83,JSON.stringify(rows))}catch{}
  }
  function parseDateTimeV83(a){
    if(!a?.date||!a?.time)return null;const [y,m,d]=String(a.date).split('-').map(Number);const mt=String(a.time).match(/(\d+):(\d+)\s*(AM|PM)/i);if(!mt)return null;let h=Number(mt[1])%12;if(mt[3].toUpperCase()==='PM')h+=12;return new Date(y,m-1,d,h,Number(mt[2]),0,0)
  }
  function apptSortV83(a,b){const da=parseDateTimeV83(a),db=parseDateTimeV83(b);return (da?.getTime()||0)-(db?.getTime()||0)}
  function futureAppointmentsV83(){const now=Date.now();return readAppointmentsV83().filter(a=>a.status!=='cancelled'&&(!parseDateTimeV83(a)||parseDateTimeV83(a).getTime()>=now)).sort(apptSortV83)}
  function pastAppointmentsV83(){const now=Date.now();return readAppointmentsV83().filter(a=>a.status!=='cancelled'&&parseDateTimeV83(a)&&parseDateTimeV83(a).getTime()<now).sort((a,b)=>-apptSortV83(a,b))}
  function canModifyV83(a){const dt=parseDateTimeV83(a);return !!dt && (dt.getTime()-Date.now())>=24*36e5}
  function visitLabelV83(v){const map={emergency:{ru:'Срочный осмотр',en:'Urgent exam',es:'Consulta urgente',he:'בדיקה דחופה'},exam:{ru:'Осмотр / консультация',en:'Exam / consultation',es:'Examen / consulta',he:'בדיקה / ייעוץ'},cleaning:{ru:'Профессиональная чистка',en:'Professional cleaning',es:'Limpieza profesional',he:'ניקוי מקצועי'}};return map[v]?.[lang]||map[v]?.en||v||''}
  function formatDateV83(key){if(!key)return'';const [y,m,d]=String(key).split('-').map(Number);const dt=new Date(y,m-1,d);const locale={ru:'ru-RU',en:'en-US',es:'es-ES',he:'he-IL'}[lang]||'en-US';try{return new Intl.DateTimeFormat(locale,{weekday:'short',day:'numeric',month:'short'}).format(dt)}catch{return key}}
  function whenV83(a){return [formatDateV83(a.date),a.time].filter(Boolean).join(' · ')}
  function readProfileV83(){
    try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY_V83)||'null');if(p&&typeof p==='object')return p}catch{}
    const last=[...futureAppointmentsV83(),...pastAppointmentsV83()][0];const full=(last?.name||'').trim().split(/\s+/);return {firstName:full[0]||'',lastName:full.slice(1).join(' ')||'',contact:last?.contact||''}
  }
  function saveProfileV83(p){try{localStorage.setItem(PROFILE_KEY_V83,JSON.stringify(p))}catch{}}
  function resetBookingForNewV83(keepProfile=true){
    const p=keepProfile?readProfileV83():{firstName:'',lastName:'',contact:''};
    booking.step=1;booking.visit='';booking.day='';booking.date='';booking.dateMode='calendar';booking.time='';booking.confirmation='';booking.payment='';booking.provider='';booking.memberId='';booking.name=[p.firstName,p.lastName].filter(Boolean).join(' ');booking.contact=p.contact||'';
    try{activeBookingRoot=null}catch{}
  }
  function directNewBookingV83(){showMenu(false);resetBookingForNewV83(true);renderBooking(1)}

  function existingBookingMarkupV83(){
    const future=futureAppointmentsV83(),a=future[0];if(!a)return'';const extra=Math.max(0,future.length-1);
    return `<div class="existingBookingV83"><h2>${escapeHtml(txV83('У вас уже есть запись','You already have an appointment','Ya tienes una cita','כבר יש לכם תור'))}</h2><p>${escapeHtml(txV83('Я вижу вашу ближайшую будущую запись. Можно добавить ещё одну или управлять текущими записями в личном кабинете.','I can see your next appointment. You can add another one or manage your appointments in your account.','Veo tu próxima cita. Puedes añadir otra o gestionar tus citas en tu cuenta.','אני רואה את התור הקרוב שלכם. אפשר להוסיף תור נוסף או לנהל את התורים בחשבון.'))}</p><div class="existingBookingSummaryV83"><div><strong>${escapeHtml(visitLabelV83(a.visit))}</strong><span>${escapeHtml(whenV83(a))}${a.estimate?` · ${escapeHtml(a.estimate)}`:''}</span></div>${extra?`<div class="existingBookingCountV83">+${extra}</div>`:''}</div><div class="existingBookingActionsV83"><button class="primary" type="button" data-v83-new-booking>${escapeHtml(txV83('Добавить ещё одну запись','Add another appointment','Añadir otra cita','הוספת תור נוסף'))}</button><button type="button" data-v83-open-account>${escapeHtml(txV83('Управлять записями','Manage appointments','Gestionar citas','ניהול תורים'))}</button></div></div>`
  }
  function showExistingBookingV83(){
    const root=addOraBlock('<div data-v83-existing-booking></div>','booking-existing');const host=root.querySelector('[data-v83-existing-booking]');host.innerHTML=existingBookingMarkupV83();host.querySelector('[data-v83-new-booking]')?.addEventListener('click',directNewBookingV83);host.querySelector('[data-v83-open-account]')?.addEventListener('click',()=>openAccountV83('appointments','future'));return root
  }

  function appointmentCardV83(a,past=false){
    const mod=!past&&canModifyV83(a);const confirm=accountCancelIdV83===a.id;
    return `<article class="accountAppointmentV83 ${past?'accountPastV83':''}" data-v83-appt="${escapeHtml(a.id||'')}"><div><strong>${escapeHtml(visitLabelV83(a.visit))}</strong><span>${escapeHtml(whenV83(a))}${a.estimate?` · ${escapeHtml(a.estimate)}`:''}${a.confirmation?`<br>${escapeHtml(a.confirmation)}`:''}</span></div>${past?'':`<div class="accountAppointmentActionsV83"><button type="button" data-v83-reschedule="${escapeHtml(a.id)}" ${mod?'':'disabled'}>${escapeHtml(txV83('Перенести','Reschedule','Reprogramar','שינוי מועד'))}</button><button class="danger" type="button" data-v83-cancel="${escapeHtml(a.id)}" ${mod?'':'disabled'}>${escapeHtml(txV83('Отменить','Cancel','Cancelar','ביטול'))}</button></div>`}${!past&&!mod?`<div style="grid-column:1/-1;color:#7c8da2;font-size:10.5px">${escapeHtml(txV83('Онлайн-изменения доступны не позднее чем за 24 часа до приёма.','Online changes are available until 24 hours before the visit.','Los cambios en línea están disponibles hasta 24 horas antes.','שינויים אונליין זמינים עד 24 שעות לפני התור.'))}</div>`:''}${confirm?`<div class="accountCancelConfirmV83" style="grid-column:1/-1"><strong>${escapeHtml(txV83('Отменить эту запись?','Cancel this appointment?','¿Cancelar esta cita?','לבטל את התור?'))}</strong>${escapeHtml(txV83('Запись будет отменена. При необходимости вы сможете записаться снова.','The appointment will be cancelled. You can book again anytime.','La cita será cancelada. Puedes volver a reservar cuando quieras.','התור יבוטל. תוכלו לקבוע תור חדש בכל עת.'))}<div><button class="accountActionV83 danger" type="button" data-v83-confirm-cancel="${escapeHtml(a.id)}">${escapeHtml(txV83('Да, отменить','Yes, cancel','Sí, cancelar','כן, לבטל'))}</button><button class="accountActionV83" type="button" data-v83-dismiss-cancel>${escapeHtml(txV83('Оставить запись','Keep appointment','Mantener cita','להשאיר את התור'))}</button></div></div>`:''}</article>`
  }
  function appointmentsPanelV83(){
    const future=futureAppointmentsV83(),past=pastAppointmentsV83(),rows=accountApptTabV83==='future'?future:past;
    return `<div class="accountSubTabsV83"><button type="button" class="${accountApptTabV83==='future'?'active':''}" data-v83-appt-tab="future">${escapeHtml(txV83('Будущие','Upcoming','Próximas','עתידיים'))} (${future.length})</button><button type="button" class="${accountApptTabV83==='past'?'active':''}" data-v83-appt-tab="past">${escapeHtml(txV83('Прошлые','Past','Anteriores','קודמים'))} (${past.length})</button></div><div class="accountListV83">${rows.length?rows.map(a=>appointmentCardV83(a,accountApptTabV83==='past')).join(''):`<div class="accountEmptyV83">${escapeHtml(accountApptTabV83==='future'?txV83('Будущих записей пока нет.','No upcoming appointments yet.','Aún no tienes próximas citas.','אין עדיין תורים עתידיים.'):txV83('Прошлых записей пока нет.','No past appointments yet.','Aún no hay citas anteriores.','אין עדיין תורים קודמים.'))}${accountApptTabV83==='future'?`<br><button class="accountTopBookV83" type="button" data-v83-new-booking>${escapeHtml(txV83('Записаться','Book a visit','Reservar cita','קביעת תור'))}</button>`:''}</div>`}</div>`
  }
  function profilePanelV83(){const p=readProfileV83();return `<div class="accountDataGridV83"><div class="accountFieldV83"><label>${escapeHtml(txV83('Имя','First name','Nombre','שם פרטי'))}</label><input data-v83-profile="firstName" value="${escapeHtml(p.firstName||'')}"></div><div class="accountFieldV83"><label>${escapeHtml(txV83('Фамилия','Last name','Apellido','שם משפחה'))}</label><input data-v83-profile="lastName" value="${escapeHtml(p.lastName||'')}"></div><div class="accountFieldV83 full"><label>${escapeHtml(txV83('Телефон или email','Phone or email','Teléfono o email','טלפון או אימייל'))}</label><input data-v83-profile="contact" value="${escapeHtml(p.contact||'')}"></div></div><div class="accountDataActionsV83"><button class="accountSaveV83" type="button" data-v83-save-profile>${escapeHtml(txV83('Сохранить','Save','Guardar','שמירה'))}</button></div>`}
  function accountMarkupV83(){
    return `<div class="accountCardV83"><div class="accountHeaderV83"><div><h2>${escapeHtml(txV83('Личный кабинет','My account','Mi cuenta','החשבון שלי'))}</h2><p>${escapeHtml(txV83('Управляйте записями и основными контактными данными.','Manage appointments and basic contact details.','Gestiona tus citas y datos de contacto.','נהלו תורים ופרטי קשר בסיסיים.'))}</p></div><button class="accountTopBookV83" type="button" data-v83-new-booking>${escapeHtml(txV83('Записаться ещё','Book another','Reservar otra','לקבוע תור נוסף'))}</button></div><div class="accountMainTabsV83"><button type="button" class="${accountMainTabV83==='appointments'?'active':''}" data-v83-main-tab="appointments">${escapeHtml(txV83('Записи','Appointments','Citas','תורים'))}</button><button type="button" class="${accountMainTabV83==='profile'?'active':''}" data-v83-main-tab="profile">${escapeHtml(txV83('Мои данные','My details','Mis datos','הפרטים שלי'))}</button></div><div class="accountPanelV83">${accountMainTabV83==='appointments'?appointmentsPanelV83():profilePanelV83()}</div></div>`
  }
  function bindAccountV83(host){
    host.querySelectorAll('[data-v83-main-tab]').forEach(b=>b.addEventListener('click',()=>{accountMainTabV83=b.dataset.v83MainTab;renderAccountV83()}));
    host.querySelectorAll('[data-v83-appt-tab]').forEach(b=>b.addEventListener('click',()=>{accountApptTabV83=b.dataset.v83ApptTab;renderAccountV83()}));
    host.querySelectorAll('[data-v83-new-booking]').forEach(b=>b.addEventListener('click',directNewBookingV83));
    host.querySelectorAll('[data-v83-reschedule]').forEach(b=>b.addEventListener('click',()=>legacyEditAppointmentV83(b.dataset.v83Reschedule)));
    host.querySelectorAll('[data-v83-cancel]').forEach(b=>b.addEventListener('click',()=>{accountCancelIdV83=b.dataset.v83Cancel;renderAccountV83()}));
    host.querySelectorAll('[data-v83-dismiss-cancel]').forEach(b=>b.addEventListener('click',()=>{accountCancelIdV83='';renderAccountV83()}));
    host.querySelectorAll('[data-v83-confirm-cancel]').forEach(b=>b.addEventListener('click',()=>legacyCancelAppointmentV83(b.dataset.v83ConfirmCancel)));
    host.querySelector('[data-v83-save-profile]')?.addEventListener('click',()=>{const p={};host.querySelectorAll('[data-v83-profile]').forEach(i=>p[i.dataset.v83Profile]=i.value.trim());saveProfileV83(p);showToast(txV83('Данные сохранены','Details saved','Datos guardados','הפרטים נשמרו'));renderAccountV83()});
  }
  function renderAccountV83(){if(!accountRootV83||!accountRootV83.isConnected){accountRootV83=addOraBlock('<div data-v83-account></div>','account').querySelector('[data-v83-account]')}accountRootV83.innerHTML=accountMarkupV83();bindAccountV83(accountRootV83);requestAnimationFrame(()=>accountRootV83.closest('.chatTurn')?.scrollIntoView({behavior:'smooth',block:'start'}))}
  function openAccountV83(main='appointments',sub='future'){showMenu(false);accountMainTabV83=main;accountApptTabV83=sub;accountCancelIdV83='';renderAccountV83()}

  // Reuse the proven legacy edit/cancel handlers so CRUD stays consistent with the existing appointment store.
  const legacyOpenPageV83=window.openPage;
  function withLegacyManagerV83(callback){legacyOpenPageV83('booking');setTimeout(()=>callback(),40)}
  function cleanupLegacyManagerV83(){document.querySelectorAll('[data-appointments-manager]').forEach(x=>x.closest('.chatTurn')?.remove())}
  function legacyEditAppointmentV83(id){withLegacyManagerV83(()=>{const btn=[...document.querySelectorAll('[data-edit-appointment]')].find(b=>b.dataset.editAppointment===id);if(btn){btn.click();cleanupLegacyManagerV83()}})}
  function legacyCancelAppointmentV83(id){withLegacyManagerV83(()=>{const btn=[...document.querySelectorAll('[data-cancel-appointment]')].find(b=>b.dataset.cancelAppointment===id);if(!btn)return;btn.click();setTimeout(()=>{const confirm=[...document.querySelectorAll('[data-confirm-cancel]')].find(b=>b.dataset.confirmCancel===id);confirm?.click();cleanupLegacyManagerV83();accountCancelIdV83='';setTimeout(renderAccountV83,50)},20)})}

  // Header + menu entry for the account. Desktop gets a compact profile icon; mobile keeps the already-approved header order and uses the burger menu.
  const menuBtnV83=document.getElementById('menuBtn');
  if(menuBtnV83&&!document.getElementById('accountHeaderV83')){const b=document.createElement('button');b.id='accountHeaderV83';b.className='headerAccountV83';b.type='button';b.setAttribute('aria-label',txV83('Личный кабинет','My account','Mi cuenta','החשבון שלי'));b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></svg>';b.onclick=()=>openAccountV83();menuBtnV83.parentNode.insertBefore(b,menuBtnV83)}
  const menuMainV83=document.querySelector('#menuLayer .menuMain');
  if(menuMainV83&&!menuMainV83.querySelector('[data-v83-account-menu]')){const b=document.createElement('button');b.className='menuItem menuAccountV83';b.type='button';b.dataset.v83AccountMenu='1';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></svg><span>'+escapeHtml(txV83('Личный кабинет','My account','Mi cuenta','החשבון שלי'))+'</span>';b.onclick=()=>openAccountV83();const home=menuMainV83.querySelector('.homeMenuItem');home?.after(b)}

  // Final booking entry behavior: Book = create, Account = manage.
  window.openPage=function(type,key=''){
    if(type==='account'){openAccountV83();return}
    if(type==='booking'){
      const future=futureAppointmentsV83();
      if(!future.length){directNewBookingV83();return}
      showExistingBookingV83();return
    }
    return legacyOpenPageV83(type,key)
  };

  // Make direct header/menu booking buttons use the final behavior even if legacy handlers were assigned earlier.
  document.getElementById('bookHeader')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.openPage('booking')},true);
  document.getElementById('menuBook')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.openPage('booking')},true);

  // Keep account labels current after a language switch.
  const oldSetLanguageV83=window.setLanguage;
  if(oldSetLanguageV83)window.setLanguage=function(next){oldSetLanguageV83(next);document.getElementById('accountHeaderV83')?.setAttribute('aria-label',txV83('Личный кабинет','My account','Mi cuenta','החשבון שלי'));const m=document.querySelector('[data-v83-account-menu] span');if(m)m.textContent=txV83('Личный кабинет','My account','Mi cuenta','החשבון שלי');if(accountRootV83&&accountRootV83.isConnected)renderAccountV83()};

  window.OraAccountV83={open:openAccountV83,book:()=>window.openPage('booking'),future:futureAppointmentsV83,past:pastAppointmentsV83};
})();

(function(){
  function label(){return lang==='ru'?'Личный кабинет':lang==='es'?'Mi cuenta':lang==='he'?'החשבון שלי':'My account'}
  function icon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></svg>'}
  function ensure(){
    const menuBtn=document.getElementById('menuBtn');
    if(menuBtn&&!document.getElementById('accountHeaderV83')){const b=document.createElement('button');b.id='accountHeaderV83';b.className='headerAccountV83';b.type='button';b.setAttribute('aria-label',label());b.innerHTML=icon();b.onclick=()=>window.OraAccountV83?.open();menuBtn.parentNode.insertBefore(b,menuBtn)}
    const hb=document.getElementById('accountHeaderV83');if(hb)hb.setAttribute('aria-label',label());
    const mm=document.querySelector('#menuLayer .menuMain');
    if(mm&&!mm.querySelector('[data-v83-account-menu]')){const b=document.createElement('button');b.className='menuItem menuAccountV83';b.type='button';b.dataset.v83AccountMenu='1';b.innerHTML=icon()+'<span>'+escapeHtml(label())+'</span>';b.onclick=()=>window.OraAccountV83?.open();const home=mm.querySelector('.homeMenuItem');home?home.after(b):mm.prepend(b)}
    const mi=mm?.querySelector('[data-v83-account-menu] span');if(mi&&mi.textContent!==label())mi.textContent=label();
  }
  ensure();
  const layer=document.getElementById('menuLayer');if(layer)new MutationObserver(()=>{queueMicrotask(ensure)}).observe(layer,{childList:true,subtree:true});
  const old=window.setLanguage;if(old)window.setLanguage=function(next){old(next);setTimeout(ensure,0)};
})();

(function(){
  const reviewAvatarsProd=['assets/images/reviews/review-01.webp','assets/images/reviews/review-02.webp','assets/images/reviews/review-03.webp'];
  const reviewDataProd={
    general:[
      {key:'exam',name:{ru:'Мария К.',en:'Maria K.',es:'María K.',he:'מריה ק.'},service:{ru:'Осмотр / консультация',en:'Exam / consultation',es:'Examen / consulta',he:'בדיקה / ייעוץ'},text:{ru:'Я пришла с несколькими вопросами и переживала, что сразу начнут предлагать большое лечение. Врач сначала выслушал, сделал осмотр и спокойно объяснил, что действительно важно сейчас, а что можно отложить. После визита у меня был понятный план и ориентир по стоимости.',en:'I came in with several questions and worried that I would immediately be pushed into a large treatment plan. The dentist listened first, examined me, and clearly explained what mattered now and what could wait. I left with a clear next-step plan and an understandable cost range.',es:'Llegué con varias dudas y miedo de que me propusieran un tratamiento grande de inmediato. El dentista escuchó primero, me examinó y explicó con calma qué era prioritario y qué podía esperar. Salí con un plan claro y una referencia de costo.',he:'הגעתי עם כמה שאלות וחשש שיציעו מיד תוכנית טיפול גדולה. הרופא הקשיב קודם, בדק והסביר מה חשוב עכשיו ומה יכול לחכות. יצאתי עם תוכנית ברורה וטווח עלויות מובן.'}},
      {key:'cleaning',name:{ru:'София М.',en:'Sofia M.',es:'Sofía M.',he:'סופיה מ.'},service:{ru:'Профессиональная чистка',en:'Professional cleaning',es:'Limpieza profesional',he:'ניקוי מקצועי'},text:{ru:'Записывалась на обычную чистку после работы. Всё прошло аккуратно и без ощущения, что меня торопят. Особенно понравилось, что в конце объяснили, где у меня быстрее накапливается налёт и как немного изменить домашний уход, чтобы результат сохранялся дольше.',en:'I booked a routine cleaning after work. Everything felt careful and unhurried. I especially appreciated the explanation at the end about where buildup tends to collect for me and how to adjust my home care so the result lasts longer.',es:'Reservé una limpieza de rutina después del trabajo. Todo fue cuidadoso y sin prisas. Al final me explicaron dónde se acumula más placa en mi caso y cómo ajustar un poco mi higiene en casa para mantener el resultado.',he:'קבעתי ניקוי שגרתי אחרי העבודה. הכול נעשה בעדינות ובלי לחץ. בסוף הסבירו איפה מצטבר אצלי יותר רובד ואיך לשפר מעט את הטיפול בבית כדי לשמור על התוצאה.'}},
      {key:'crown',name:{ru:'Daniel R.',en:'Daniel R.',es:'Daniel R.',he:'דניאל ר.'},service:{ru:'Коронка',en:'Dental crown',es:'Corona dental',he:'כתר דנטלי'},text:{ru:'Мне нужна была коронка на жевательный зуб, и я больше всего хотел понимать этапы и цену заранее. Врач показал снимок, объяснил подготовку зуба, материал и почему итоговая сумма может отличаться. На установке проверили прикус и несколько раз уточнили, комфортно ли мне.',en:'I needed a crown on a back tooth and mainly wanted to understand the steps and price in advance. The dentist showed me the imaging, explained the preparation and material, and why the final amount could vary. At placement they checked my bite carefully and made sure it felt comfortable.',es:'Necesitaba una corona en un molar y quería entender los pasos y el precio con antelación. El dentista me mostró las imágenes, explicó la preparación y el material, y por qué el costo final podía variar. En la colocación revisaron bien la mordida y mi comodidad.',he:'הייתי צריך כתר על שן אחורית ורציתי להבין מראש את השלבים והמחיר. הרופא הראה את הצילום, הסביר על הכנת השן והחומר ולמה העלות הסופית יכולה להשתנות. בהדבקה בדקו היטב את הסגר והנוחות.'}},
      {key:'emergency',name:{ru:'Анна Л.',en:'Anna L.',es:'Ana L.',he:'אנה ל.'},service:{ru:'Срочный осмотр',en:'Urgent exam',es:'Consulta urgente',he:'בדיקה דחופה'},text:{ru:'Зуб начал сильно болеть вечером, и я не понимала, ждать ли до следующей недели. Через Ora я описала симптомы, ответила на вопросы про отёк и температуру и смогла выбрать ближайшее время. На приёме врач быстро объяснил причину боли и варианты, что делать дальше.',en:'My tooth started hurting badly in the evening and I did not know whether I should wait until the next week. Through Ora I described the symptoms, answered questions about swelling and fever, and chose the nearest time. At the visit the dentist quickly explained the likely cause and the next options.',es:'El diente empezó a doler mucho por la tarde y no sabía si podía esperar. Con Ora describí los síntomas, respondí preguntas sobre inflamación y fiebre y elegí la hora más cercana. En la consulta el dentista explicó rápido la causa probable y los siguientes pasos.',he:'השן התחילה לכאוב מאוד בערב ולא ידעתי אם אפשר לחכות. דרך Ora תיארתי את הסימפטומים, עניתי על שאלות לגבי נפיחות וחום ובחרתי את המועד הקרוב. בביקור הרופא הסביר במהירות את הסיבה האפשרית ואת הצעדים הבאים.'}},
      {key:'implant',name:{ru:'Michael T.',en:'Michael T.',es:'Michael T.',he:'מייקל ט.'},service:{ru:'Имплант одного зуба',en:'Single-tooth implant',es:'Implante de un diente',he:'שתל לשן אחת'},text:{ru:'Больше всего меня пугало, что имплантация будет непонятным длинным процессом. На консультации разложили всё по этапам: снимки, установка импланта, заживление и коронка. Отдельно проговорили, какие дополнительные процедуры иногда нужны и как они могут повлиять на стоимость.',en:'What worried me most was that implant treatment would feel like a long, confusing process. The consultation broke it down into clear stages: imaging, implant placement, healing, and the crown. They also explained which additional procedures might sometimes be needed and how they could affect cost.',es:'Lo que más me preocupaba era que el implante fuera un proceso largo y confuso. En la consulta lo dividieron en etapas claras: imágenes, colocación, cicatrización y corona. También explicaron qué procedimientos adicionales podrían ser necesarios y cómo afectarían el costo.',he:'החשש העיקרי שלי היה שהשתלה תהיה תהליך ארוך ולא ברור. בייעוץ חילקו הכול לשלבים ברורים: הדמיה, השתלה, החלמה וכתר. גם הסבירו אילו טיפולים נוספים לפעמים נדרשים ואיך הם יכולים להשפיע על העלות.'}},
      {key:'veneers',name:{ru:'Elena P.',en:'Elena P.',es:'Elena P.',he:'אלנה פ.'},service:{ru:'Виниры',en:'Veneers',es:'Carillas',he:'ציפויי חרסינה'},text:{ru:'Я хотела улучшить улыбку, но боялась слишком белого и неестественного результата. Сначала мы обсудили форму и оттенок, а потом уже количество зубов, которые действительно стоит делать. Мне понравилось, что решение принимали не по шаблону, а под моё лицо и мою улыбку.',en:'I wanted to improve my smile but was worried about an overly white, artificial result. We discussed shape and shade first, and only then how many teeth actually made sense to treat. I liked that the plan was designed around my face and smile rather than a template.',es:'Quería mejorar mi sonrisa, pero me preocupaba que quedara demasiado blanca y artificial. Primero hablamos de forma y tono, y después de cuántos dientes tenía sentido tratar. Me gustó que el plan se adaptara a mi cara y mi sonrisa y no a una plantilla.',he:'רציתי לשפר את החיוך אבל חששתי מתוצאה לבנה ומלאכותית מדי. קודם דיברנו על צורה וגוון ורק אחר כך על מספר השיניים שכדאי לטפל בהן. אהבתי שהתוכנית הותאמה לפנים ולחיוך שלי ולא לתבנית.'}}
    ]
  };
  function l(obj){return obj?.[lang]||obj?.en||''}
  function reviewRowsProd(key=''){const all=reviewDataProd.general;return key?all.filter(r=>r.key===key):all}
  function reviewPanelProd(key=''){
    const rows=reviewRowsProd(key);const scope=key?(lang==='ru'?'Отзывы именно об этой услуге':lang==='es'?'Reseñas de este servicio':lang==='he'?'ביקורות על השירות הזה':'Reviews for this service'):'';
    return `${scope?`<div class="reviewScopeProd">${escapeHtml(scope)}</div>`:''}<div class="reviewRailProd">${rows.map((r,i)=>`<article class="reviewCardProd"><div class="reviewHeadProd"><img class="reviewAvatarProd" src="${reviewAvatarsProd[i%reviewAvatarsProd.length]}" alt=""><div><div class="reviewNameProd">${escapeHtml(l(r.name))}</div><div class="reviewServiceProd">${escapeHtml(l(r.service))}</div></div><div class="reviewStarsProd" aria-label="5 stars">★★★★★</div></div><div class="reviewTextProd"><div class="reviewQuoteProd">“</div>${escapeHtml(l(r.text))}</div></article>`).join('')}</div>`
  }

  const aboutCopyProd={
    ru:{ey:'ORAVERA · MIAMI',title:'Стоматология, где лечение начинается с понятного разговора',lead:'OraVera соединяет работу врача и цифрового ассистента Ora: до визита можно описать проблему, посмотреть услуги и цены, уточнить страховку и выбрать время, а на приёме врач подтверждает диагноз и план лечения.',doctor:'Врач и приём',doctorText:'На приёме стоматолог начинает с того, что беспокоит именно вас. После осмотра врач объясняет находки, при необходимости показывает снимки и обсуждает варианты лечения простым языком — без необходимости разбираться в стоматологических терминах.',approach:'Подход к лечению',approachText:'Сначала — приоритеты и клиническая необходимость. Затем — варианты, этапы, материалы и ожидаемая стоимость. Цель — чтобы пациент понимал, что происходит сейчас, что можно сделать позже и почему предлагается конкретный следующий шаг.',ora:'Ora до визита',oraText:'Ora помогает собрать контекст до приёма: симптомы, фото, страховой план, удобное время и вопросы. Ассистент не ставит диагноз и не заменяет врача — он помогает быстрее дойти до нужного действия.',langs:'Общение',langsText:'Интерфейс подготовлен для English, Español, Русский и עברית. Язык можно менять в любой момент, не теряя контекст разговора.',c1:'Объяснить варианты лечения и следующий шаг',c2:'Показать ориентир по самостоятельной оплате до визита',c3:'Проверить, работает ли OraVera с вашим страховым планом',c4:'Записаться, перенести или отменить будущий визит',note:'При острой боли, травме или отёке Ora помогает выбрать срочный сценарий. Если отёк быстро увеличивается или становится трудно дышать или глотать, нужна срочная медицинская помощь.'},
    en:{ey:'ORAVERA · MIAMI',title:'Dental care that starts with a clear conversation',lead:'OraVera combines the dentist’s clinical work with Ora, a digital assistant. Before the visit you can describe the problem, explore services and pricing, check plan compatibility, and choose a time; the dentist confirms the diagnosis and treatment plan in person.',doctor:'Your dental visit',doctorText:'The dentist starts with what is bothering you. After the exam, findings are explained clearly, imaging can be reviewed when needed, and treatment options are discussed without requiring you to understand dental terminology first.',approach:'Treatment approach',approachText:'First come clinical priorities and what is actually needed. Then options, stages, materials, and expected cost are explained so you can understand what should happen now, what can wait, and why a particular next step is being recommended.',ora:'Ora before the visit',oraText:'Ora helps collect useful context before you arrive: symptoms, photos, insurance plan, preferred time, and questions. The assistant does not diagnose or replace the dentist; it helps move you to the right next action faster.',langs:'Communication',langsText:'The interface supports English, Español, Русский, and עברית. You can switch languages without losing the conversation context.',c1:'Understand treatment options and the next step',c2:'See a self-pay range before the visit',c3:'Check whether OraVera works with your insurance plan',c4:'Book, reschedule, or cancel an upcoming visit',note:'For acute pain, injury, or swelling, Ora helps route you to urgent care. Rapidly increasing swelling or difficulty breathing or swallowing needs urgent medical attention.'},
    es:{ey:'ORAVERA · MIAMI',title:'Odontología que comienza con una conversación clara',lead:'OraVera combina el trabajo clínico del dentista con Ora, un asistente digital. Antes de la visita puedes explicar el problema, ver servicios y precios, revisar el plan de seguro y elegir una hora; el dentista confirma el diagnóstico y el plan en persona.',doctor:'La visita con el dentista',doctorText:'El dentista comienza por lo que te preocupa. Después del examen explica los hallazgos, revisa imágenes si hace falta y comenta las opciones de tratamiento con un lenguaje sencillo.',approach:'Enfoque del tratamiento',approachText:'Primero se prioriza lo clínicamente necesario. Después se explican opciones, etapas, materiales y costos esperados para que entiendas qué conviene hacer ahora, qué puede esperar y por qué.',ora:'Ora antes de la visita',oraText:'Ora recoge contexto útil antes de llegar: síntomas, fotos, plan de seguro, horario y preguntas. No diagnostica ni sustituye al dentista; ayuda a llegar más rápido al siguiente paso correcto.',langs:'Comunicación',langsText:'La interfaz admite English, Español, Русский y עברית. Puedes cambiar de idioma sin perder el contexto.',c1:'Entender las opciones y el siguiente paso',c2:'Ver un rango de pago directo antes de la visita',c3:'Comprobar si OraVera trabaja con tu plan de seguro',c4:'Reservar, cambiar o cancelar una visita futura',note:'Para dolor agudo, trauma o inflamación, Ora ayuda a elegir la ruta urgente. Si la inflamación aumenta rápidamente o cuesta respirar o tragar, se necesita atención médica urgente.'},
    he:{ey:'ORAVERA · MIAMI',title:'טיפול שיניים שמתחיל בשיחה ברורה',lead:'OraVera משלבת את עבודת הרופא עם Ora, עוזר דיגיטלי. לפני הביקור אפשר לתאר את הבעיה, לבדוק שירותים ומחירים, לבדוק התאמה לביטוח ולבחור זמן; הרופא מאשר את האבחנה ותוכנית הטיפול בבדיקה.',doctor:'הביקור אצל הרופא',doctorText:'הרופא מתחיל במה שמפריע לכם. לאחר הבדיקה הוא מסביר את הממצאים, מציג הדמיה לפי הצורך ומדבר על אפשרויות הטיפול בשפה ברורה.',approach:'גישת הטיפול',approachText:'קודם מטפלים במה שחשוב קלינית. אחר כך מסבירים אפשרויות, שלבים, חומרים ועלות משוערת כדי שתבינו מה כדאי לעשות עכשיו, מה יכול לחכות ולמה.',ora:'Ora לפני הביקור',oraText:'Ora אוספת מידע שימושי מראש: תסמינים, תמונות, ביטוח, זמן מועדף ושאלות. היא לא מאבחנת ולא מחליפה רופא; היא עוזרת להגיע מהר יותר לצעד הנכון.',langs:'תקשורת',langsText:'הממשק תומך ב-English, Español, Русский ו-עברית. אפשר להחליף שפה בלי לאבד את ההקשר.',c1:'להבין את אפשרויות הטיפול והצעד הבא',c2:'לראות טווח תשלום עצמי לפני הביקור',c3:'לבדוק אם OraVera עובדת עם תוכנית הביטוח',c4:'לקבוע, לשנות או לבטל תור עתידי',note:'בכאב חריף, חבלה או נפיחות Ora עוזרת לבחור מסלול דחוף. נפיחות שמחמירה במהירות או קושי בנשימה או בליעה דורשים טיפול רפואי דחוף.'}
  };
  function aboutPanelProd(){const c=aboutCopyProd[lang]||aboutCopyProd.en;return `<div class="aboutProd"><section class="aboutHeroProd"><div class="aboutHeroCopyProd"><div class="aboutEyebrowProd">${escapeHtml(c.ey)}</div><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.lead)}</p></div><div class="aboutHeroPhotoProd"><img src="assets/images/about/doctor.webp" alt="OraVera"></div></section><div class="aboutGridProd"><article class="aboutCardProd"><h4>${escapeHtml(c.doctor)}</h4><p>${escapeHtml(c.doctorText)}</p></article><article class="aboutCardProd"><h4>${escapeHtml(c.approach)}</h4><p>${escapeHtml(c.approachText)}</p></article><article class="aboutCardProd"><h4>${escapeHtml(c.ora)}</h4><p>${escapeHtml(c.oraText)}</p></article></div><article class="aboutCardProd"><h4>${escapeHtml(c.langs)}</h4><p>${escapeHtml(c.langsText)}</p></article><div class="aboutChecklistProd"><div class="aboutCheckProd">${escapeHtml(c.c1)}</div><div class="aboutCheckProd">${escapeHtml(c.c2)}</div><div class="aboutCheckProd">${escapeHtml(c.c3)}</div><div class="aboutCheckProd">${escapeHtml(c.c4)}</div></div><div class="aboutNoteProd">${escapeHtml(c.note)}</div></div>`}

  const baseChatMarkupProd=window.chatMarkup;
  window.chatMarkup=chatMarkup=function(type,key=''){
    if(type==='reviews'){
      const title=key?(lang==='ru'?'Отзывы: ':lang==='es'?'Reseñas: ':lang==='he'?'ביקורות: ':'Reviews: ')+(services.find(s=>s.key===key)?loc(services.find(s=>s.key===key).title):'') : tr('reviewsHeading');
      return `<div class="chatContentCard"><div class="chatContentHead"><div><h2>${escapeHtml(title)}</h2></div><div class="chatContentHeadActions"><button type="button" class="chatHomeBtn" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div></div><div class="chatContentBody">${reviewPanelProd(key)}</div></div>`;
    }
    if(type==='about'){
      return `<div class="chatContentCard"><div class="chatContentHead"><div><h2>${escapeHtml(tr('about'))}</h2></div><div class="chatContentHeadActions"><button type="button" class="chatHomeBtn" data-home-chat>⌂ ${escapeHtml(v40().home)}</button></div></div><div class="chatContentBody">${aboutPanelProd()}</div></div>`;
    }
    return baseChatMarkupProd(type,key);
  };

  function bookingLabelProd(){return lang==='ru'?'Добавить запись':lang==='es'?'Añadir cita':lang==='he'?'הוספת תור':'Add appointment'}
  function normalizeAccountProd(){
    document.querySelectorAll('.accountHeaderV83>.accountTopBookV83').forEach(b=>b.remove());
    document.querySelectorAll('[data-v83-account]').forEach(host=>{
      const panel=host.querySelector('.accountPanelV83');if(!panel)return;
      const active=panel.querySelector('[data-v83-appt-tab].active')?.dataset.v83ApptTab;
      const existingRow=panel.querySelector('.accountBookRowProd');
      if(active!=='future'){existingRow?.remove();return;}
      const emptyBtn=panel.querySelector('.accountEmptyV83 [data-v83-new-booking]');
      if(emptyBtn){
        const label=bookingLabelProd();if(emptyBtn.textContent!==label)emptyBtn.textContent=label;
        existingRow?.remove();return;
      }
      if(panel.querySelector('.accountAppointmentV83')){
        if(!existingRow){
          const row=document.createElement('div');row.className='accountBookRowProd';const b=document.createElement('button');b.type='button';b.textContent=bookingLabelProd();b.onclick=()=>window.OraAccountV83?.book();row.appendChild(b);panel.appendChild(row);
        }else{
          const b=existingRow.querySelector('button');const label=bookingLabelProd();if(b&&b.textContent!==label)b.textContent=label;
        }
      }else existingRow?.remove();
    });
  }
  normalizeAccountProd();
  const siteProd=document.getElementById('site');if(siteProd)new MutationObserver(()=>queueMicrotask(normalizeAccountProd)).observe(siteProd,{childList:true,subtree:true});

  function closeTipsProd(){document.querySelectorAll('.servicePriceInfoV70.is-open').forEach(x=>x.classList.remove('is-open'))}
  closeTipsProd();
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.servicePriceInfoV70');
    if(btn){e.preventDefault();e.stopImmediatePropagation();const was=btn.classList.contains('is-open');closeTipsProd();if(!was)btn.classList.add('is-open');return}
    closeTipsProd();
  },true);
  addEventListener('pageshow',closeTipsProd);
  addEventListener('pagehide',closeTipsProd);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')closeTipsProd()});
  document.getElementById('mobileFileNotice')?.remove();
})();

(function(){
  const AUTH_KEY='oravera-auth-v84', APPT_KEY='oravera-appointments-v53', PROFILE_KEY='oravera-profile-v83';
  const rawAccountOpen=window.OraAccountV83?.open?window.OraAccountV83.open.bind(window.OraAccountV83):null;
  let authRoot=null,sentTo='';
  const tx=(ru,en,es,he)=>lang==='ru'?ru:lang==='es'?es:lang==='he'?he:en;
  const authState=()=>{try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')||{}}catch{return {}}};
  const isAuthed=()=>authState().verified===true;
  const readProfile=()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')||{}}catch{return {}}};
  const saveProfile=p=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch{}};
  const knownContact=()=>{const p=readProfile();if(p.contact)return p.contact;try{const a=JSON.parse(localStorage.getItem(APPT_KEY)||'[]');return [...a].reverse().find(x=>x?.contact)?.contact||''}catch{return ''}};

  function authMarkup(){const known=knownContact();return `<div class="authGateV84"><h2>${escapeHtml(tx('Войти в личный кабинет','Sign in to your account','Entrar en tu cuenta','כניסה לחשבון'))}</h2><p>${escapeHtml(tx('Отдельная регистрация и пароль не нужны. Укажите телефон или email, который использовали при записи, и подтвердите вход одноразовым кодом.','No separate registration or password is needed. Enter the phone or email used for booking and confirm with a one-time code.','No necesitas registro separado ni contraseña. Introduce el teléfono o email usado para reservar y confirma con un código.','אין צורך בהרשמה נפרדת או בסיסמה. הזינו טלפון או אימייל ששימשו להזמנה ואשרו בקוד חד-פעמי.'))}</p><div class="authFieldsV84"><input data-prod03-contact autocomplete="email" value="${escapeHtml(known)}" placeholder="${escapeHtml(tx('Телефон или email','Phone or email','Teléfono o email','טלפון או אימייל'))}"><button type="button" data-prod03-send>${escapeHtml(tx('Получить код','Send code','Enviar código','שליחת קוד'))}</button></div><div class="authCodeRowV84" data-prod03-code-row><input data-prod03-code inputmode="numeric" maxlength="4" placeholder="••••"><button class="authVerifyV84" type="button" data-prod03-verify>${escapeHtml(tx('Подтвердить','Verify','Confirmar','אישור'))}</button></div><div class="authDemoV84" data-prod03-demo></div><div class="authErrorV84" data-prod03-error></div></div>`}
  function bindAuth(host){const contact=host.querySelector('[data-prod03-contact]'),send=host.querySelector('[data-prod03-send]'),row=host.querySelector('[data-prod03-code-row]'),code=host.querySelector('[data-prod03-code]'),verify=host.querySelector('[data-prod03-verify]'),demo=host.querySelector('[data-prod03-demo]'),err=host.querySelector('[data-prod03-error]');
    send?.addEventListener('click',()=>{const v=(contact?.value||'').trim();if(!v){err.textContent=tx('Введите телефон или email.','Enter your phone or email.','Introduce tu teléfono o email.','הזינו טלפון או אימייל.');err.classList.add('show');return}err.classList.remove('show');sentTo=v;row.classList.add('show');demo.textContent=tx('Демо: используйте код 1234. В production сюда подключается SMS/email OTP.','Demo: use code 1234. Production connects SMS/email OTP here.','Demo: usa el código 1234. En producción se conecta OTP por SMS/email.','בדמו השתמשו בקוד 1234. בפרודקשן יתחבר OTP ב-SMS/אימייל.');code?.focus()});
    verify?.addEventListener('click',()=>{if((code?.value||'').trim()!=='1234'){err.textContent=tx('Неверный код. Для демо используйте 1234.','Wrong code. Use 1234 for the demo.','Código incorrecto. Usa 1234 para la demo.','קוד שגוי. בדמו השתמשו ב-1234.');err.classList.add('show');return}err.classList.remove('show');try{localStorage.setItem(AUTH_KEY,JSON.stringify({verified:true,contact:sentTo,verifiedAt:new Date().toISOString()}))}catch{}const p=readProfile();if(!p.contact){p.contact=sentTo;saveProfile(p)}host.closest('.chatTurn')?.remove();authRoot=null;showToast(tx('Вход подтверждён','Signed in','Acceso confirmado','הכניסה אושרה'));rawAccountOpen?.('appointments','future')})}
  function showAuth(){showMenu(false);if(authRoot?.isConnected){authRoot.closest('.chatTurn')?.scrollIntoView({behavior:'smooth',block:'start'});return}authRoot=addOraBlock('<div data-prod03-auth></div>','account-auth').querySelector('[data-prod03-auth]');authRoot.innerHTML=authMarkup();bindAuth(authRoot)}
  function openAccount(main='appointments',sub='future'){if(isAuthed())return rawAccountOpen?.(main,sub);showAuth()}
  if(window.OraAccountV83)window.OraAccountV83.open=openAccount;

  function wireAccount(){const hb=document.getElementById('accountHeaderV83');if(hb)hb.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();openAccount()};document.querySelectorAll('[data-v83-account-menu]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();openAccount()})}
  wireAccount();const menu=document.getElementById('menuLayer');if(menu)new MutationObserver(()=>queueMicrotask(wireAccount)).observe(menu,{childList:true,subtree:true});
  document.addEventListener('click',e=>{const m=e.target.closest('[data-v83-open-account]');if(m){e.preventDefault();e.stopImmediatePropagation();openAccount('appointments','future')}},true);

  /* Mobile booking CTA remains visible once the visit/date/time selection is complete. */
  function clearSticky(){document.querySelectorAll('.bookingStickyV84').forEach(x=>x.remove());document.querySelectorAll('[data-active-booking].v84-sticky-ready').forEach(x=>x.classList.remove('v84-sticky-ready'))}
  function syncSticky(step){clearSticky();if(step!==1||innerWidth>700)return;const host=document.querySelector('[data-active-booking]');if(!host)return;const source=host.querySelector('[data-book-next]');if(!source||source.disabled)return;source.closest('.flowActions')?.classList.add('v84-source-action');host.classList.add('v84-sticky-ready');const bar=document.createElement('div');bar.className='bookingStickyV84 show';bar.innerHTML=`<button type="button">${escapeHtml(tx('Продолжить','Continue','Continuar','המשך'))}</button>`;bar.querySelector('button').onclick=()=>source.click();document.body.appendChild(bar)}
  const render0=window.renderBooking;if(render0)window.renderBooking=function(step=1){const r=render0(step);requestAnimationFrame(()=>syncSticky(step));return r};
  addEventListener('resize',()=>{if(document.querySelector('[data-active-booking]'))syncSticky(Number(booking?.step||1))},{passive:true});document.addEventListener('click',e=>{if(e.target.closest('[data-home-chat],[data-book-cancel]'))clearSticky()},true);

  window.OraProductionCandidate03={auth:{state:authState,show:showAuth,signOut(){try{localStorage.removeItem(AUTH_KEY)}catch{}}},resetDemo(){try{['oravera-appointments-v53','oravera-profile-v83','oravera-auth-v84','oravera-prod04-final-initialized'].forEach(k=>localStorage.removeItem(k));location.reload()}catch{}}};
})();

(function(){
  function heroLabels(){
    const safe=(k,fallback)=>{try{return tr(k)||fallback}catch{return fallback}};
    return {book:safe('bookVisit','Book a visit'),call:safe('callOra','Call Ora'),services:safe('services','Services'),prices:safe('prices','Prices')};
  }
  function syncHeroActions(root=document){
    const labels=heroLabels();
    root.querySelectorAll('.welcomeTurn .welcomeActions,.homeTurn .welcomeActions').forEach(actions=>{
      const expected=[
        {type:'page',page:'booking',cls:'primary',text:labels.book},
        {type:'call',page:'',cls:'callQuick',text:labels.call},
        {type:'page',page:'services',cls:'',text:labels.services},
        {type:'page',page:'pricing',cls:'',text:labels.prices}
      ];
      const btns=[...actions.querySelectorAll(':scope > button')];
      const sameShape=btns.length===4 && expected.every((e,i)=>e.type==='call'?btns[i]?.hasAttribute('data-welcome-call'):btns[i]?.dataset.page===e.page);
      if(!sameShape){
        actions.innerHTML=expected.map(e=>e.type==='call'
          ? `<button type="button" class="callQuick" data-welcome-call>${escapeHtml(e.text)}</button>`
          : `<button type="button" class="${e.cls}" data-page="${e.page}">${escapeHtml(e.text)}</button>`).join('');
      }
      [...actions.querySelectorAll(':scope > button')].forEach((b,i)=>{
        const e=expected[i]; if(!e)return;
        if(b.textContent!==e.text)b.textContent=e.text;
        b.classList.toggle('primary',e.page==='booking');
        b.classList.toggle('callQuick',e.type==='call');
        if(e.type==='call'){
          b.removeAttribute('data-page');b.setAttribute('data-welcome-call','');
          b.onclick=()=>{try{startCall()}catch{document.getElementById('headerCall')?.click()}};
        }else{
          b.removeAttribute('data-welcome-call');b.dataset.page=e.page;
          b.onclick=()=>openPage(e.page);
        }
      });
    });
  }
  let queued=false;
  function queueSync(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;syncHeroActions()})}
  syncHeroActions();
  const site=document.getElementById('site');
  if(site)new MutationObserver(queueSync).observe(site,{childList:true,subtree:true,characterData:true});
  new MutationObserver(queueSync).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest('[data-welcome-call],#headerCall,#endCall'))setTimeout(syncHeroActions,0)},true);
  const setLang0=window.setLanguage;
  if(setLang0)window.setLanguage=function(next){const r=setLang0(next);setTimeout(syncHeroActions,0);return r};

  /* Keep end-call button icon-only even if legacy translation code writes text into it. */
  function enforceEndIcon(){
    const b=document.getElementById('endCall');if(!b)return;
    const label=(()=>{try{return (uiCopy[lang]||uiCopy.en).end}catch{return 'End call'}})();
    b.setAttribute('aria-label',label);
    if(!b.querySelector('svg'))b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c3.5-2.5 7.3-2.5 10.8 0l1.5-1.5c.6-.6 1.5-.7 2.2-.2l1.2.8c.8.5 1 1.6.5 2.4l-1.5 2.4c-.4.7-1.3 1-2 .7l-2.7-1.1a11.2 11.2 0 0 0-9.2 0l-2.7 1.1c-.8.3-1.6 0-2-.7l-1.5-2.4c-.5-.8-.3-1.9.5-2.4l1.2-.8c.7-.5 1.6-.4 2.2.2l1.5 1.5Z"/></svg>';
  }
  enforceEndIcon();
  const end=document.getElementById('endCall');if(end)new MutationObserver(enforceEndIcon).observe(end,{childList:true,characterData:true,subtree:true});
  window.OraProductionCandidate04={syncHeroActions,enforceEndIcon};
})();

(function(){
  const HERO={
    en:{eyebrow:'AI CLINIC ASSISTANT',l1:'Hi, I’m Ora.',l2:'How can I help?',copy:'Describe what’s bothering you or ask a question. Ora can help with treatments, prices, insurance, reviews and booking.',book:'Book a visit',call:'Call Ora',services:'Services',prices:'Prices'},
    ru:{eyebrow:'ИИ-АССИСТЕНТ КЛИНИКИ',l1:'Здравствуйте, я Ora.',l2:'Чем могу помочь?',copy:'Опишите, что вас беспокоит, или задайте вопрос. Ora поможет с услугами, ценами, страховкой, отзывами и записью.',book:'Записаться',call:'Позвонить Ora',services:'Услуги',prices:'Цены'},
    es:{eyebrow:'ASISTENTE DE IA DE LA CLÍNICA',l1:'Hola, soy Ora.',l2:'¿Cómo puedo ayudarte?',copy:'Cuéntame qué te preocupa o haz una pregunta. Ora puede ayudarte con tratamientos, precios, seguro, reseñas y citas.',book:'Reservar cita',call:'Llamar a Ora',services:'Servicios',prices:'Precios'},
    he:{eyebrow:'עוזר AI של המרפאה',l1:'שלום, אני Ora.',l2:'איך אפשר לעזור?',copy:'ספרו מה מפריע לכם או שאלו שאלה. Ora יכולה לעזור בטיפולים, מחירים, ביטוח, ביקורות וקביעת תור.',book:'קביעת תור',call:'שיחה עם Ora',services:'שירותים',prices:'מחירים'}
  };
  function currentHero(){const key=(typeof lang!=='undefined'&&HERO[lang])?lang:'en';return HERO[key]}
  function syncWelcomeHero(){
    const root=document.querySelector('.welcomeTurn .welcomeBubble');if(!root)return;
    const c=currentHero();
    const eyebrow=root.querySelector('.welcomeEyebrow');if(eyebrow)eyebrow.textContent=c.eyebrow;
    const h=root.querySelector('[data-chat-welcome-title],h1');if(h)h.innerHTML=`<span class="welcomeHeadlineLine">${escapeHtml(c.l1)}</span><span class="welcomeHeadlineLine">${escapeHtml(c.l2)}</span>`;
    const p=root.querySelector('[data-chat-welcome-copy],p');if(p)p.textContent=c.copy;
    let actions=root.querySelector('.welcomeActions');
    if(actions){
      actions.innerHTML=`<button type="button" class="primary" data-page="booking">${escapeHtml(c.book)}</button><button type="button" class="callQuick" data-welcome-call>${escapeHtml(c.call)}</button><button type="button" data-page="services">${escapeHtml(c.services)}</button><button type="button" data-page="pricing">${escapeHtml(c.prices)}</button>`;
      const book=actions.querySelector('[data-page="booking"]');if(book)book.onclick=()=>openPage('booking');
      const call=actions.querySelector('[data-welcome-call]');if(call)call.onclick=()=>startCall();
      const services=actions.querySelector('[data-page="services"]');if(services)services.onclick=()=>openPage('services');
      const prices=actions.querySelector('[data-page="pricing"]');if(prices)prices.onclick=()=>openPage('pricing');
    }
  }
  const update0=window.updateStaticUi;
  if(typeof update0==='function')window.updateStaticUi=function(){const r=update0.apply(this,arguments);syncWelcomeHero();return r};
  const lang0=window.setLanguage;
  if(typeof lang0==='function')window.setLanguage=function(next){const r=lang0.call(this,next);syncWelcomeHero();return r};
  document.addEventListener('click',e=>{if(e.target.closest('[data-welcome-call],#headerCall,#endCall'))queueMicrotask(syncWelcomeHero)},true);
  syncWelcomeHero();
  window.OraProductionCandidate05={syncWelcomeHero};
})();