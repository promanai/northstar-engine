import type { Locale } from '@/lib/locales';
// Only known public preset/demo copy. Owner-authored content remains unchanged.
export const contentMessages: Record<string, Record<Locale, string>> = {
  'OraVera dental clinic in Miami': {
    en: 'OraVera dental clinic in Miami',
    ru: 'Стоматологическая клиника OraVera в Майами',
    es: 'Clínica dental OraVera en Miami',
    he: 'מרפאת השיניים OraVera במיאמי',
  },
  'Start with an in-person dental examination': {
    en: 'Start with an in-person dental examination',
    ru: 'Очный осмотр — первый шаг',
    es: 'Empiece con una revisión dental presencial',
    he: 'מתחילים בבדיקת שיניים פנים אל פנים',
  },
  'OraVera is a dental clinic in Miami. This website is being prepared for appointment requests. The clinic has not yet published its street address, phone number, fees, dentist details or appointment availability. The assistant is an AI, not a dentist. A photo cannot replace a clinical examination. No appointment is confirmed through a chat message.':
    {
      en: 'OraVera is a dental clinic in Miami. This website is being prepared for appointment requests. The clinic has not yet published its street address, phone number, fees, dentist details or appointment availability. The assistant is an AI, not a dentist. A photo cannot replace a clinical examination. No appointment is confirmed through a chat message.',
      ru: 'OraVera — стоматологическая клиника в Майами. Сайт готовится к работе с заявками. Реальные адрес, телефон, цены, сведения о врачах и доступное время пока не опубликованы. Ассистент — ИИ, не стоматолог. Фото не заменяет очный осмотр. Сообщение в чате не подтверждает запись.',
      es: 'OraVera es una clínica dental en Miami. El sitio se está preparando para solicitudes de citas. Aún no se han publicado dirección, teléfono, tarifas reales, datos de dentistas ni disponibilidad. El asistente es una IA, no un dentista. Una foto no sustituye una revisión clínica. Un mensaje de chat no confirma una cita.',
      he: 'OraVera היא מרפאת שיניים במיאמי. האתר בהכנה לקבלת בקשות תור. כתובת, טלפון, מחירים אמיתיים, פרטי רופאים וזמינות טרם פורסמו. העוזר הוא בינה מלאכותית, לא רופא שיניים. תמונה אינה מחליפה בדיקה רפואית. הודעה בצ׳אט אינה מאשרת תור.',
    },
  'Request a dental examination': {
    en: 'Request a dental examination',
    ru: 'Запросить осмотр стоматолога',
    es: 'Solicitar una revisión dental',
    he: 'בקשת בדיקת שיניים',
  },
  'A request is the first step, not a confirmed appointment': {
    en: 'A request is the first step, not a confirmed appointment',
    ru: 'Заявка — первый шаг, а не подтверждённая запись',
    es: 'Una solicitud es el primer paso, no una cita confirmada',
    he: 'בקשה היא הצעד הראשון, לא תור מאושר',
  },
  'An in-person examination lets a dentist assess your oral health and discuss appropriate next steps. Fees, insurance arrangements, clinician availability and opening hours must be confirmed by the clinic. When appointment requests are enabled, submit only your name, contact details and preferred callback or visit times. Do not put symptoms, diagnoses, photographs or payment information in the appointment request. Wait for the clinic to confirm a date, time and dentist. Do not delay urgent care while waiting for an online reply.':
    {
      en: 'An in-person examination lets a dentist assess your oral health and discuss appropriate next steps. Fees, insurance arrangements, clinician availability and opening hours must be confirmed by the clinic. When appointment requests are enabled, submit only your name, contact details and preferred callback or visit times. Do not put symptoms, diagnoses, photographs or payment information in the appointment request. Wait for the clinic to confirm a date, time and dentist. Do not delay urgent care while waiting for an online reply.',
      ru: 'На очном осмотре стоматолог оценит состояние полости рта и обсудит дальнейшие шаги. Цены, страховки, наличие врачей и часы работы нужно уточнять в клинике. После включения заявок укажите только имя, контакты и удобное время звонка или визита. Не добавляйте симптомы, диагнозы, фотографии или платёжные данные. Дождитесь подтверждения даты, времени и врача клиникой. Не откладывайте срочную помощь в ожидании ответа онлайн.',
      es: 'Una revisión presencial permite al dentista evaluar su salud bucal y comentar los siguientes pasos. Confirme tarifas, seguros, disponibilidad y horarios con la clínica. Cuando se habiliten solicitudes, envíe solo su nombre, contacto y horarios preferidos. No incluya síntomas, diagnósticos, fotos ni datos de pago. Espere la confirmación de fecha, hora y dentista por la clínica. No retrase la atención urgente mientras espera una respuesta en línea.',
      he: 'בדיקה פנים אל פנים מאפשרת לרופא להעריך את בריאות הפה ולדון בצעדים הבאים. יש לאשר מחירים, ביטוחים, זמינות רופאים ושעות מול המרפאה. כשבקשות יופעלו, שלחו רק שם, פרטי קשר ומועדים מועדפים לשיחה או לביקור. אין לכלול תסמינים, אבחנות, תמונות או פרטי תשלום. המתינו לאישור תאריך, שעה ורופא מהמרפאה. אין לדחות טיפול דחוף בהמתנה לתשובה מקוונת.',
    },
  'Sharing an oral photo': {
    en: 'Sharing an oral photo',
    ru: 'Передача фото полости рта',
    es: 'Compartir una foto de la boca',
    he: 'שיתוף צילום חלל הפה',
  },
  'Optional supporting context, never a diagnosis': {
    en: 'Optional supporting context, never a diagnosis',
    ru: 'Необязательный материал, никогда не диагноз',
    es: 'Contexto adicional opcional, nunca un diagnóstico',
    he: 'מידע משלים לבחירה, לעולם לא אבחנה',
  },
  'Photo sharing is optional and remains disabled until the clinic approves its health-data processing arrangements. Once enabled, the selected image and your chat messages are sent to the configured AI provider after your consent. This does not send the image to a dentist or place it in a clinical record. Avoid faces, names, documents and unnecessary identifying details. Do not put sharp objects in your mouth or manipulate a painful area to take a photo. The AI cannot rule out disease or determine treatment from a photograph. A dentist must assess you. If you have trouble breathing or swallowing, call 911 or seek emergency care now; do not wait for a chat reply.':
    {
      en: 'Photo sharing is optional and remains disabled until the clinic approves its health-data processing arrangements. Once enabled, the selected image and your chat messages are sent to the configured AI provider after your consent. This does not send the image to a dentist or place it in a clinical record. Avoid faces, names, documents and unnecessary identifying details. Do not put sharp objects in your mouth or manipulate a painful area to take a photo. The AI cannot rule out disease or determine treatment from a photograph. A dentist must assess you. If you have trouble breathing or swallowing, call 911 or seek emergency care now; do not wait for a chat reply.',
      ru: 'Фото необязательно. Функция останется отключённой, пока клиника не утвердит порядок обработки медицинских данных. После включения выбранное изображение и сообщения чата отправляются настроенному провайдеру ИИ с вашего согласия. Это не отправляет фото стоматологу и не создаёт медицинскую карту. Избегайте лиц, имён, документов и лишних идентифицирующих деталей. Не вставляйте острые предметы в рот и не трогайте болезненную область ради снимка. ИИ не может исключить заболевание или определить лечение по фото — нужен осмотр стоматолога. При затруднении дыхания или глотания позвоните 911 или немедленно обратитесь за экстренной помощью; не ждите ответа в чате.',
      es: 'Compartir fotos es opcional y sigue desactivado hasta que la clínica apruebe el tratamiento de datos médicos. Una vez activado, la imagen y los mensajes se envían al proveedor de IA configurado con su consentimiento. No se envía la foto a un dentista ni se incorpora a un expediente clínico. Evite rostros, nombres, documentos y datos identificativos innecesarios. No use objetos afilados ni manipule una zona dolorosa para tomarla. La IA no puede descartar enfermedades ni determinar tratamientos por una foto. Necesita una evaluación dental. Si le cuesta respirar o tragar, llame al 911 o busque atención de emergencia ahora; no espere al chat.',
      he: 'שיתוף תמונות הוא לבחירה ונשאר כבוי עד אישור הסדרי עיבוד המידע הרפואי במרפאה. לאחר ההפעלה, התמונה וההודעות נשלחות לספק הבינה המלאכותית המוגדר בהסכמתכם. התמונה אינה נשלחת לרופא ואינה מצורפת לרשומה רפואית. הימנעו מפנים, שמות, מסמכים ופרטים מזהים מיותרים. אין להכניס חפצים חדים לפה או לגעת באזור כואב לצורך צילום. הבינה המלאכותית אינה יכולה לשלול מחלה או לקבוע טיפול מצילום. נדרשת בדיקת רופא שיניים. בקושי בנשימה או בבליעה, התקשרו ל־911 או פנו מיד לטיפול חירום; אל תחכו לתשובת צ׳אט.',
    },
  'Before sharing information': {
    en: 'Before sharing information',
    ru: 'Перед передачей информации',
    es: 'Antes de compartir información',
    he: 'לפני שיתוף מידע',
  },
  'Health-data features are not yet open for patient use': {
    en: 'Health-data features are not yet open for patient use',
    ru: 'Функции медицинских данных ещё не открыты пациентам',
    es: 'Las funciones de datos médicos aún no están abiertas a pacientes',
    he: 'תכונות מידע רפואי עדיין אינן פתוחות למטופלים',
  },
  "This is a preparation notice, not the clinic's approved privacy notice. Do not submit personal health information while the site is in preview. Where patient accounts are available, the site stores account details and appointment records in its database. This is not a clinical record, and medical photos are not stored in the account. AI chat, photo sharing and external contact forms are separate features that require review before activation; an enabled external form transmits only its stated fields to its named recipient. The clinic must publish the responsible entity, contact, processing purposes, vendors, retention and patient-rights information before collecting patient data. Consent alone does not establish compliance.":
    {
      en: "This is a preparation notice, not the clinic's approved privacy notice. Do not submit personal health information while the site is in preview. Where patient accounts are available, the site stores account details and appointment records in its database. This is not a clinical record, and medical photos are not stored in the account. AI chat, photo sharing and external contact forms are separate features that require review before activation; an enabled external form transmits only its stated fields to its named recipient. The clinic must publish the responsible entity, contact, processing purposes, vendors, retention and patient-rights information before collecting patient data. Consent alone does not establish compliance.",
      ru: 'Это предварительное уведомление, а не утверждённая политика конфиденциальности клиники. Не передавайте личные медицинские сведения в демо-режиме. Там, где доступны аккаунты пациентов, сайт хранит данные аккаунта и записи на приём в базе. Это не медицинская карта, фотографии в кабинете не хранятся. ИИ-чат, фото и внешние формы связи — отдельные функции, требующие проверки до включения; включённая внешняя форма передаёт только заявленные поля указанному получателю. До сбора данных клиника должна опубликовать ответственную организацию, контакты, цели обработки, провайдеров, сроки хранения и права пациентов. Одного согласия недостаточно для соблюдения требований.',
      es: 'Este es un aviso preliminar, no el aviso de privacidad aprobado de la clínica. No envíe información médica personal durante la vista previa. Donde hay cuentas de pacientes, el sitio guarda los datos de la cuenta y las citas en su base de datos. No es un expediente clínico y no se guardan fotos médicas en la cuenta. El chat de IA, las fotos y los formularios externos son funciones independientes que deben revisarse antes de activarlas; un formulario externo activo envía solo los campos indicados a su destinatario identificado. Antes de recopilar datos, la clínica debe publicar la entidad responsable, contacto, finalidades, proveedores, retención y derechos de pacientes. El consentimiento por sí solo no garantiza cumplimiento.',
      he: 'זו הודעת הכנה, לא הודעת הפרטיות המאושרת של המרפאה. אין לשלוח מידע רפואי אישי במצב תצוגה מקדימה. כאשר קיימים חשבונות מטופלים, האתר שומר פרטי חשבון ותורים במסד הנתונים. זו אינה רשומה רפואית, וצילומים רפואיים אינם נשמרים בחשבון. צ׳אט בינה מלאכותית, תמונות וטפסים חיצוניים הם תכונות נפרדות הדורשות בדיקה לפני הפעלה; טופס חיצוני פעיל שולח רק את השדות שצוינו לנמען שצוין. לפני איסוף מידע, על המרפאה לפרסם את הגוף האחראי, פרטי קשר, מטרות עיבוד, ספקים, תקופות שמירה וזכויות מטופלים. הסכמה לבדה אינה מבטיחה עמידה בדרישות.',
    },
  'Dental clinic in Miami. Ask about a dental examination and learn how to request a visit.':
    {
      en: 'Dental clinic in Miami. Ask about a dental examination and learn how to request a visit.',
      ru: 'Стоматологическая клиника в Майами. Узнайте об осмотре и о том, как записаться на визит.',
      es: 'Clínica dental en Miami. Consulte sobre una revisión dental y cómo solicitar una visita.',
      he: 'מרפאת שיניים במיאמי. מידע על בדיקת שיניים ועל בקשת תור.',
    },
  'DEMO · Welcome visit': {
    en: 'DEMO · Welcome visit',
    ru: 'ДЕМО · Знакомство с клиникой',
    es: 'DEMO · Visita de bienvenida',
    he: 'הדגמה · ביקור היכרות',
  },
  'DEMO ONLY · 15 min · Fictional service and price': {
    en: 'DEMO ONLY · 15 min · Fictional service and price',
    ru: 'ТОЛЬКО ДЕМО · 15 мин · Вымышленные услуга и цена',
    es: 'SOLO DEMO · 15 min · Servicio y precio ficticios',
    he: 'להדגמה בלבד · 15 דקות · שירות ומחיר דמיוניים',
  },
  'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 15 minutes. A fictional introductory appointment for testing the booking flow without payment. This zero-price demo is provided only to test booking without payment.':
    {
      en: 'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 15 minutes. A fictional introductory appointment for testing the booking flow without payment. This zero-price demo is provided only to test booking without payment.',
      ru: 'ТОЛЬКО ДЕМОНСТРАЦИЯ — не реальное предложение OraVera и не медицинская рекомендация. Врачи, цена и расписание вымышленные. Длительность: 15 мин. ДЕМО · Знакомство с клиникой. Бесплатная демо-услуга только для проверки записи без оплаты.',
      es: 'SOLO DEMOSTRACIÓN — no es una oferta real de OraVera ni consejo médico. Los profesionales, el precio y el horario son ficticios. Duración: 15 min. DEMO · Visita de bienvenida. Servicio de demostración gratuito para probar la reserva sin pago.',
      he: 'להדגמה בלבד — לא הצעה אמיתית של OraVera ולא המלצה רפואית. הרופאים, המחיר ולוח הזמנים דמיוניים. משך: 15 דקות. הדגמה · ביקור היכרות. שירות הדגמה ללא עלות לבדיקת קביעת תור ללא תשלום.',
    },
  'DEMO · Dental examination': {
    en: 'DEMO · Dental examination',
    ru: 'ДЕМО · Осмотр стоматолога',
    es: 'DEMO · Revisión dental',
    he: 'הדגמה · בדיקת שיניים',
  },
  'DEMO ONLY · 30 min · Fictional service and price': {
    en: 'DEMO ONLY · 30 min · Fictional service and price',
    ru: 'ТОЛЬКО ДЕМО · 30 мин · Вымышленные услуга и цена',
    es: 'SOLO DEMO · 30 min · Servicio y precio ficticios',
    he: 'להדגמה בלבד · 30 דקות · שירות ומחיר דמיוניים',
  },
  'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 30 minutes. A fictional dental examination service for previewing the appointment journey. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.':
    {
      en: 'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 30 minutes. A fictional dental examination service for previewing the appointment journey. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.',
      ru: 'ТОЛЬКО ДЕМОНСТРАЦИЯ — не реальное предложение OraVera и не медицинская рекомендация. Врачи, цена и расписание вымышленные. Длительность: 30 мин. ДЕМО · Осмотр стоматолога. Цена USD условная. Эта демонстрация не включает платёжного провайдера; не пытайтесь оплатить реальными деньгами.',
      es: 'SOLO DEMOSTRACIÓN — no es una oferta real de OraVera ni consejo médico. Los profesionales, el precio y el horario son ficticios. Duración: 30 min. DEMO · Revisión dental. El precio en USD es arbitrario. Esta demo no activa ningún proveedor de pagos; no intente realizar un pago real.',
      he: 'להדגמה בלבד — לא הצעה אמיתית של OraVera ולא המלצה רפואית. הרופאים, המחיר ולוח הזמנים דמיוניים. משך: 30 דקות. הדגמה · בדיקת שיניים. המחיר בדולר שרירותי. הדגמה זו אינה מפעילה ספק תשלומים; אין לבצע תשלום אמיתי.',
    },
  'DEMO · Dental cleaning': {
    en: 'DEMO · Dental cleaning',
    ru: 'ДЕМО · Гигиена полости рта',
    es: 'DEMO · Limpieza dental',
    he: 'הדגמה · ניקוי שיניים',
  },
  'DEMO ONLY · 60 min · Fictional service and price': {
    en: 'DEMO ONLY · 60 min · Fictional service and price',
    ru: 'ТОЛЬКО ДЕМО · 60 мин · Вымышленные услуга и цена',
    es: 'SOLO DEMO · 60 min · Servicio y precio ficticios',
    he: 'להדגמה בלבד · 60 דקות · שירות ומחיר דמיוניים',
  },
  'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 60 minutes. A fictional dental cleaning appointment for demonstrating the service catalog. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.':
    {
      en: 'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 60 minutes. A fictional dental cleaning appointment for demonstrating the service catalog. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.',
      ru: 'ТОЛЬКО ДЕМОНСТРАЦИЯ — не реальное предложение OraVera и не медицинская рекомендация. Врачи, цена и расписание вымышленные. Длительность: 60 мин. ДЕМО · Гигиена полости рта. Цена USD условная. Эта демонстрация не включает платёжного провайдера; не пытайтесь оплатить реальными деньгами.',
      es: 'SOLO DEMOSTRACIÓN — no es una oferta real de OraVera ni consejo médico. Los profesionales, el precio y el horario son ficticios. Duración: 60 min. DEMO · Limpieza dental. El precio en USD es arbitrario. Esta demo no activa ningún proveedor de pagos; no intente realizar un pago real.',
      he: 'להדגמה בלבד — לא הצעה אמיתית של OraVera ולא המלצה רפואית. הרופאים, המחיר ולוח הזמנים דמיוניים. משך: 60 דקות. הדגמה · ניקוי שיניים. המחיר בדולר שרירותי. הדגמה זו אינה מפעילה ספק תשלומים; אין לבצע תשלום אמיתי.',
    },
  'DEMO · Smile consultation': {
    en: 'DEMO · Smile consultation',
    ru: 'ДЕМО · Консультация об улыбке',
    es: 'DEMO · Consulta de sonrisa',
    he: 'הדגמה · ייעוץ חיוך',
  },
  'DEMO ONLY · 45 min · Fictional service and price': {
    en: 'DEMO ONLY · 45 min · Fictional service and price',
    ru: 'ТОЛЬКО ДЕМО · 45 мин · Вымышленные услуга и цена',
    es: 'SOLO DEMO · 45 min · Servicio y precio ficticios',
    he: 'להדגמה בלבד · 45 דקות · שירות ומחיר דמיוניים',
  },
  'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 45 minutes. A fictional consultation entry for exploring service selection and scheduling. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.':
    {
      en: 'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 45 minutes. A fictional consultation entry for exploring service selection and scheduling. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.',
      ru: 'ТОЛЬКО ДЕМОНСТРАЦИЯ — не реальное предложение OraVera и не медицинская рекомендация. Врачи, цена и расписание вымышленные. Длительность: 45 мин. ДЕМО · Консультация об улыбке. Цена USD условная. Эта демонстрация не включает платёжного провайдера; не пытайтесь оплатить реальными деньгами.',
      es: 'SOLO DEMOSTRACIÓN — no es una oferta real de OraVera ni consejo médico. Los profesionales, el precio y el horario son ficticios. Duración: 45 min. DEMO · Consulta de sonrisa. El precio en USD es arbitrario. Esta demo no activa ningún proveedor de pagos; no intente realizar un pago real.',
      he: 'להדגמה בלבד — לא הצעה אמיתית של OraVera ולא המלצה רפואית. הרופאים, המחיר ולוח הזמנים דמיוניים. משך: 45 דקות. הדגמה · ייעוץ חיוך. המחיר בדולר שרירותי. הדגמה זו אינה מפעילה ספק תשלומים; אין לבצע תשלום אמיתי.',
    },
  "DEMO · Children's dental visit": {
    en: "DEMO · Children's dental visit",
    ru: 'ДЕМО · Детский стоматолог',
    es: 'DEMO · Visita dental infantil',
    he: 'הדגמה · ביקור שיניים לילדים',
  },
  "DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 30 minutes. A fictional children's appointment entry. No real clinician or appointment is represented. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.":
    {
      en: "DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 30 minutes. A fictional children's appointment entry. No real clinician or appointment is represented. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.",
      ru: 'ТОЛЬКО ДЕМОНСТРАЦИЯ — не реальное предложение OraVera и не медицинская рекомендация. Врачи, цена и расписание вымышленные. Длительность: 30 мин. ДЕМО · Детский стоматолог. Цена USD условная. Эта демонстрация не включает платёжного провайдера; не пытайтесь оплатить реальными деньгами.',
      es: 'SOLO DEMOSTRACIÓN — no es una oferta real de OraVera ni consejo médico. Los profesionales, el precio y el horario son ficticios. Duración: 30 min. DEMO · Visita dental infantil. El precio en USD es arbitrario. Esta demo no activa ningún proveedor de pagos; no intente realizar un pago real.',
      he: 'להדגמה בלבד — לא הצעה אמיתית של OraVera ולא המלצה רפואית. הרופאים, המחיר ולוח הזמנים דמיוניים. משך: 30 דקות. הדגמה · ביקור שיניים לילדים. המחיר בדולר שרירותי. הדגמה זו אינה מפעילה ספק תשלומים; אין לבצע תשלום אמיתי.',
    },
  'DEMO · Follow-up visit': {
    en: 'DEMO · Follow-up visit',
    ru: 'ДЕМО · Повторный приём',
    es: 'DEMO · Visita de seguimiento',
    he: 'הדגמה · ביקור מעקב',
  },
  'DEMO ONLY · 20 min · Fictional service and price': {
    en: 'DEMO ONLY · 20 min · Fictional service and price',
    ru: 'ТОЛЬКО ДЕМО · 20 мин · Вымышленные услуга и цена',
    es: 'SOLO DEMO · 20 min · Servicio y precio ficticios',
    he: 'להדגמה בלבד · 20 דקות · שירות ומחיר דמיוניים',
  },
  'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 20 minutes. A fictional follow-up appointment for demonstrating rescheduling and cancellation. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.':
    {
      en: 'DEMONSTRATION ONLY — this is not a real OraVera offer or medical advice. The clinician names, price and schedule are fictional. Demo duration: 20 minutes. A fictional follow-up appointment for demonstrating rescheduling and cancellation. The displayed USD price is arbitrary. No payment provider is enabled by this demo; do not attempt a real payment.',
      ru: 'ТОЛЬКО ДЕМОНСТРАЦИЯ — не реальное предложение OraVera и не медицинская рекомендация. Врачи, цена и расписание вымышленные. Длительность: 20 мин. ДЕМО · Повторный приём. Цена USD условная. Эта демонстрация не включает платёжного провайдера; не пытайтесь оплатить реальными деньгами.',
      es: 'SOLO DEMOSTRACIÓN — no es una oferta real de OraVera ni consejo médico. Los profesionales, el precio y el horario son ficticios. Duración: 20 min. DEMO · Visita de seguimiento. El precio en USD es arbitrario. Esta demo no activa ningún proveedor de pagos; no intente realizar un pago real.',
      he: 'להדגמה בלבד — לא הצעה אמיתית של OraVera ולא המלצה רפואית. הרופאים, המחיר ולוח הזמנים דמיוניים. משך: 20 דקות. הדגמה · ביקור מעקב. המחיר בדולר שרירותי. הדגמה זו אינה מפעילה ספק תשלומים; אין לבצע תשלום אמיתי.',
    },
};
