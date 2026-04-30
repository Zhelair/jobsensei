import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const LANGUAGE_OPTIONS = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLang: 'en-US',
    recognitionLang: 'en-US',
    voiceSearch: ['Google US English', 'Google UK English Female', 'Google UK English Male', 'Samantha', 'Microsoft Zira'],
  },
  {
    code: 'ru',
    label: 'Russian',
    nativeLabel: 'Русский',
    speechLang: 'ru-RU',
    recognitionLang: 'ru-RU',
    voiceSearch: ['Google русский'],
  },
  {
    code: 'bg',
    label: 'Bulgarian',
    nativeLabel: 'Български',
    speechLang: 'bg-BG',
    recognitionLang: 'bg-BG',
    voiceSearch: ['Bulgarian', 'bg-BG'],
    voiceNote: 'Bulgarian browser voices са често липсващи. Ако браузърът няма BG voice, JobSensei ще използва fallback и може да звучи странно.',
  },
  {
    code: 'ka',
    label: 'Georgian',
    nativeLabel: 'ქართული',
    speechLang: 'ka-GE',
    recognitionLang: 'ka-GE',
    voiceSearch: ['Georgian', 'ka-GE'],
    voiceNote: 'Georgian browser voices are often missing. If your browser has no GE voice, JobSensei will use a fallback voice and pronunciation can be rough.',
  },
  {
    code: 'es-ES',
    label: 'Spanish (Spain)',
    nativeLabel: 'Español (España)',
    speechLang: 'es-ES',
    recognitionLang: 'es-ES',
    dictionary: 'es',
    voiceSearch: ['Google español'],
  },
  {
    code: 'es-US',
    label: 'Spanish (US / LatAm)',
    nativeLabel: 'Español (EE. UU.)',
    speechLang: 'es-US',
    recognitionLang: 'es-US',
    dictionary: 'es',
    voiceSearch: ['Google español de Estados Unidos', 'Google español'],
  },
  {
    code: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    speechLang: 'it-IT',
    recognitionLang: 'it-IT',
    voiceSearch: ['Google italiano'],
  },
  {
    code: 'pl',
    label: 'Polish',
    nativeLabel: 'Polski',
    speechLang: 'pl-PL',
    recognitionLang: 'pl-PL',
    voiceSearch: ['Google polski'],
  },
  {
    code: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    speechLang: 'de-DE',
    recognitionLang: 'de-DE',
    voiceSearch: ['Google Deutsch'],
  },
]

const TRANSLATIONS = {
  en: {
    'nav.today': 'Today',
    'nav.applications': 'Applications',
    'nav.learning': 'Learning',
    'nav.settings': 'Settings',
    'nav.projects': 'Projects',
    'nav.apps': 'Apps',
    'topbar.guide': 'Guide',
    'topbar.start': 'Start',
    'topbar.aiConnected': 'AI Connected',
    'topbar.locked': 'Locked',
    'topbar.thinking': 'Thinking...',
    'topbar.sensei': 'Sensei',
    'topbar.drill': 'Drill',
    'gate.title': 'Add an application first',
    'gate.copy': '{section} works best when JobSensei knows the company, role, and job description. Create or capture one real application first, then the tools will unlock with the right context.',
    'gate.add': 'Add Application',
    'gate.back': 'Back to Today',
    'today.hello': 'Hello, {name}',
    'today.subtitle': 'One place to see the next real move in your job search.',
    'today.activeFocus': 'Active Focus',
    'today.startFirst': 'Start your first application',
    'today.startCopy': 'Add a company and role first. JobSensei will turn it into one guided workspace with research, story prep, practice, and follow-up.',
    'today.openApplications': 'Open Applications',
    'today.applications': 'Applications',
    'today.workspaceProgress': 'Workspace Progress',
    'today.pickApplication': 'Pick an application to begin',
    'today.rolesInPlay': 'Roles currently in play',
    'today.mockInterviews': 'Mock Interviews',
    'today.savedProject': 'Saved in this project',
    'today.reviewsDue': 'Reviews Due',
    'today.noReviews': 'No reviews due right now',
    'today.firstStep': 'First step',
    'today.firstStepTitle': 'Add one real application to unlock the workspace',
    'today.firstStepCopy': 'Start with the company, role, and job description. After that, Interview Prep, Prep Tools, research, follow-ups, and offer comparison all connect to that one application instead of feeling random.',
    'today.prepHubs': 'Prep Hubs',
    'today.prepHubsCopy': 'Two clear places to continue: interview practice or document/profile prep.',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage plan, AI access, resume, project data, language, and voice.',
    'settings.languageTitle': 'Language & Voice',
    'settings.languageCopy': 'Choose the interface language and the browser voice JobSensei uses for spoken answers.',
    'settings.interfaceLanguage': 'Interface language',
    'settings.voice': 'AI voice',
    'settings.voiceAuto': 'Auto voice for selected language',
    'settings.voicePreview': 'Preview voice',
    'settings.voiceExact': 'Voice match found.',
    'settings.voiceRelated': 'Using a related voice for this language.',
    'settings.voiceFallback': 'No matching voice found. JobSensei will use a fallback voice, so speech may sound weird.',
    'settings.voiceNone': 'No browser voices are available yet.',
    'settings.voiceNote': 'Voice note',
    'settings.planAccess': 'Plan And AI Access',
    'settings.resumeTitle': 'Resume / CV',
    'settings.projectData': 'Project Data',
    'settings.profile': 'Your Profile',
    'voice.placeholder': 'Type your message...',
    'voice.listening': 'Listening...',
    'voice.paused': 'Paused - tap mic to continue',
    'voice.discard': 'Discard',
    'voice.doneSend': 'Done - Send',
    'voice.speakNow': 'Speak now - words appear when recognised...',
    'voice.submitHelp': 'Done - Send to submit · Discard to cancel',
    'voice.muted': 'AI voice is muted - tap the speaker in the top bar to unmute',
    'voice.speaking': 'Speaking - tap speaker to stop',
  },
  ru: {
    'nav.today': 'Сегодня',
    'nav.applications': 'Заявки',
    'nav.learning': 'Обучение',
    'nav.settings': 'Настройки',
    'nav.projects': 'Проекты',
    'nav.apps': 'Заявки',
    'topbar.guide': 'Гид',
    'topbar.start': 'Старт',
    'topbar.aiConnected': 'AI подключен',
    'topbar.locked': 'Закрыто',
    'topbar.thinking': 'Думаю...',
    'topbar.sensei': 'Сенсей',
    'topbar.drill': 'Дрилл',
    'gate.title': 'Сначала добавьте заявку',
    'gate.copy': '{section} работает лучше, когда JobSensei знает компанию, роль и описание вакансии. Сначала создайте или захватите одну реальную заявку, затем инструменты откроются с правильным контекстом.',
    'gate.add': 'Добавить заявку',
    'gate.back': 'Назад к Сегодня',
    'today.hello': 'Привет, {name}',
    'today.subtitle': 'Одно место для следующего реального шага в поиске работы.',
    'today.activeFocus': 'Активный фокус',
    'today.startFirst': 'Начните первую заявку',
    'today.startCopy': 'Сначала добавьте компанию и роль. JobSensei превратит это в одно рабочее пространство с исследованием, подготовкой, практикой и follow-up.',
    'today.openApplications': 'Открыть заявки',
    'today.applications': 'Заявки',
    'today.workspaceProgress': 'Прогресс workspace',
    'today.pickApplication': 'Выберите заявку для начала',
    'today.rolesInPlay': 'Роли в работе',
    'today.mockInterviews': 'Мок-интервью',
    'today.savedProject': 'Сохранено в проекте',
    'today.reviewsDue': 'Повторы сегодня',
    'today.noReviews': 'Сегодня повторов нет',
    'today.firstStep': 'Первый шаг',
    'today.firstStepTitle': 'Добавьте одну реальную заявку, чтобы открыть workspace',
    'today.firstStepCopy': 'Начните с компании, роли и описания вакансии. После этого Interview Prep, Prep Tools, research, follow-up и offer comparison будут связаны с этой заявкой.',
    'today.prepHubs': 'Центры подготовки',
    'today.prepHubsCopy': 'Два пути: практика интервью или подготовка документов/профиля.',
    'settings.title': 'Настройки',
    'settings.subtitle': 'План, AI-доступ, резюме, данные проекта, язык и голос.',
    'settings.languageTitle': 'Язык и голос',
    'settings.languageCopy': 'Выберите язык интерфейса и голос браузера для озвучки ответов.',
    'settings.interfaceLanguage': 'Язык интерфейса',
    'settings.voice': 'Голос AI',
    'settings.voiceAuto': 'Авто-голос для выбранного языка',
    'settings.voicePreview': 'Проверить голос',
    'settings.voiceExact': 'Голос найден.',
    'settings.voiceRelated': 'Используется похожий голос.',
    'settings.voiceFallback': 'Подходящий голос не найден. Будет fallback, речь может звучать странно.',
    'settings.voiceNone': 'Голоса браузера пока недоступны.',
    'settings.voiceNote': 'Заметка о голосе',
    'settings.planAccess': 'План и AI-доступ',
    'settings.resumeTitle': 'Резюме / CV',
    'settings.projectData': 'Данные проекта',
    'settings.profile': 'Профиль',
    'voice.placeholder': 'Введите сообщение...',
  },
  bg: {
    'nav.today': 'Днес',
    'nav.applications': 'Кандидатури',
    'nav.learning': 'Учене',
    'nav.settings': 'Настройки',
    'nav.projects': 'Проекти',
    'nav.apps': 'Кандидатури',
    'topbar.guide': 'Гид',
    'topbar.start': 'Старт',
    'topbar.aiConnected': 'AI свързан',
    'topbar.locked': 'Заключено',
    'topbar.thinking': 'Мисля...',
    'topbar.sensei': 'Сенсей',
    'topbar.drill': 'Drill',
    'gate.title': 'Първо добави кандидатура',
    'gate.copy': '{section} работи най-добре, когато JobSensei знае компанията, ролята и описанието на позицията. Първо създай или capture-ни една реална кандидатура, после инструментите ще се отключат с правилния контекст.',
    'gate.add': 'Добави кандидатура',
    'gate.back': 'Назад към Днес',
    'today.hello': 'Здравей, {name}',
    'today.subtitle': 'Едно място за следващия реален ход в търсенето на работа.',
    'today.activeFocus': 'Активен фокус',
    'today.startFirst': 'Започни първата кандидатура',
    'today.startCopy': 'Първо добави компания и роля. JobSensei ще ги превърне в workspace с research, подготовка, практика и follow-up.',
    'today.openApplications': 'Отвори кандидатури',
    'today.applications': 'Кандидатури',
    'today.workspaceProgress': 'Прогрес в workspace',
    'today.pickApplication': 'Избери кандидатура, за да започнеш',
    'today.rolesInPlay': 'Активни роли',
    'today.mockInterviews': 'Mock интервюта',
    'today.savedProject': 'Запазено в проекта',
    'today.reviewsDue': 'Повторения днес',
    'today.noReviews': 'Няма повторения за днес',
    'today.firstStep': 'Първа стъпка',
    'today.firstStepTitle': 'Добави една реална кандидатура, за да отключиш workspace-а',
    'today.firstStepCopy': 'Започни с компания, роля и job description. После Interview Prep, Prep Tools, research, follow-up и offer comparison ще се вържат към тази кандидатура.',
    'today.prepHubs': 'Подготовка',
    'today.prepHubsCopy': 'Две ясни посоки: интервю практика или документи/профил.',
    'settings.title': 'Настройки',
    'settings.subtitle': 'Управлявай план, AI достъп, CV, проектни данни, език и глас.',
    'settings.languageTitle': 'Език и глас',
    'settings.languageCopy': 'Избери език на интерфейса и browser voice за AI отговорите.',
    'settings.interfaceLanguage': 'Език на интерфейса',
    'settings.voice': 'AI глас',
    'settings.voiceAuto': 'Автоматичен глас за езика',
    'settings.voicePreview': 'Пробвай гласа',
    'settings.voiceExact': 'Намерен е глас за езика.',
    'settings.voiceRelated': 'Използва се близък глас.',
    'settings.voiceFallback': 'Няма български voice в браузъра. JobSensei ще използва fallback и може да звучи странно.',
    'settings.voiceNone': 'Няма налични browser voices.',
    'settings.voiceNote': 'Бележка за гласа',
    'settings.planAccess': 'План и AI достъп',
    'settings.resumeTitle': 'Резюме / CV',
    'settings.projectData': 'Проектни данни',
    'settings.profile': 'Твоят профил',
    'voice.placeholder': 'Напиши съобщение...',
  },
  ka: {
    'nav.today': 'დღეს',
    'nav.applications': 'აპლიკაციები',
    'nav.learning': 'სწავლა',
    'nav.settings': 'პარამეტრები',
    'nav.projects': 'პროექტები',
    'nav.apps': 'აპები',
    'topbar.guide': 'გიდი',
    'topbar.start': 'დაწყება',
    'topbar.aiConnected': 'AI დაკავშირებულია',
    'topbar.locked': 'დაბლოკილია',
    'topbar.thinking': 'ფიქრობს...',
    'gate.title': 'ჯერ დაამატეთ აპლიკაცია',
    'gate.copy': '{section} უკეთ მუშაობს, როცა JobSensei იცნობს კომპანიას, როლს და ვაკანსიის აღწერას. ჯერ შექმენით ერთი რეალური აპლიკაცია, შემდეგ ინსტრუმენტები სწორ კონტექსტში გაიხსნება.',
    'gate.add': 'აპლიკაციის დამატება',
    'gate.back': 'უკან დღეზე',
    'today.hello': 'გამარჯობა, {name}',
    'settings.title': 'პარამეტრები',
    'settings.subtitle': 'მართეთ გეგმა, AI წვდომა, რეზიუმე, პროექტის მონაცემები, ენა და ხმა.',
    'settings.languageTitle': 'ენა და ხმა',
    'settings.languageCopy': 'აირჩიეთ ინტერფეისის ენა და ბრაუზერის ხმა AI პასუხებისთვის.',
    'settings.interfaceLanguage': 'ინტერფეისის ენა',
    'settings.voice': 'AI ხმა',
    'settings.voiceAuto': 'ავტომატური ხმა არჩეული ენისთვის',
    'settings.voicePreview': 'ხმის მოსმენა',
    'settings.voiceFallback': 'შესაფერისი ხმა ვერ მოიძებნა. გამოყენებული იქნება fallback და ჟღერადობა შეიძლება უხეში იყოს.',
    'settings.voiceNote': 'ხმის შენიშვნა',
    'voice.placeholder': 'დაწერეთ შეტყობინება...',
  },
  es: {
    'nav.today': 'Hoy',
    'nav.applications': 'Aplicaciones',
    'nav.learning': 'Aprendizaje',
    'nav.settings': 'Ajustes',
    'nav.projects': 'Proyectos',
    'nav.apps': 'Apps',
    'topbar.guide': 'Guía',
    'topbar.start': 'Inicio',
    'topbar.aiConnected': 'AI conectado',
    'topbar.locked': 'Bloqueado',
    'topbar.thinking': 'Pensando...',
    'gate.title': 'Añade una aplicación primero',
    'gate.copy': '{section} funciona mejor cuando JobSensei conoce la empresa, el rol y la descripción del puesto. Crea o captura una aplicación real primero; luego las herramientas se desbloquean con el contexto correcto.',
    'gate.add': 'Añadir aplicación',
    'gate.back': 'Volver a Hoy',
    'today.hello': 'Hola, {name}',
    'today.subtitle': 'Un lugar para ver el siguiente paso real en tu búsqueda.',
    'today.activeFocus': 'Foco activo',
    'today.startFirst': 'Empieza tu primera aplicación',
    'today.openApplications': 'Abrir aplicaciones',
    'today.applications': 'Aplicaciones',
    'today.firstStep': 'Primer paso',
    'today.firstStepTitle': 'Añade una aplicación real para desbloquear el workspace',
    'settings.title': 'Ajustes',
    'settings.subtitle': 'Gestiona plan, acceso AI, CV, datos del proyecto, idioma y voz.',
    'settings.languageTitle': 'Idioma y voz',
    'settings.languageCopy': 'Elige el idioma de la interfaz y la voz del navegador para respuestas habladas.',
    'settings.interfaceLanguage': 'Idioma de interfaz',
    'settings.voice': 'Voz AI',
    'settings.voiceAuto': 'Voz automática para el idioma',
    'settings.voicePreview': 'Probar voz',
    'settings.voiceFallback': 'No se encontró una voz compatible. JobSensei usará una voz alternativa.',
    'voice.placeholder': 'Escribe tu mensaje...',
  },
  it: {
    'nav.today': 'Oggi',
    'nav.applications': 'Candidature',
    'nav.learning': 'Studio',
    'nav.settings': 'Impostazioni',
    'nav.projects': 'Progetti',
    'nav.apps': 'App',
    'topbar.guide': 'Guida',
    'topbar.aiConnected': 'AI connessa',
    'topbar.locked': 'Bloccato',
    'gate.title': 'Aggiungi prima una candidatura',
    'gate.add': 'Aggiungi candidatura',
    'today.hello': 'Ciao, {name}',
    'settings.title': 'Impostazioni',
    'settings.subtitle': 'Gestisci piano, accesso AI, CV, dati progetto, lingua e voce.',
    'settings.languageTitle': 'Lingua e voce',
    'settings.interfaceLanguage': 'Lingua interfaccia',
    'settings.voice': 'Voce AI',
    'settings.voiceAuto': 'Voce automatica per la lingua',
    'settings.voicePreview': 'Prova voce',
    'settings.voiceFallback': 'Nessuna voce compatibile trovata. JobSensei userà una voce di fallback.',
    'voice.placeholder': 'Scrivi il tuo messaggio...',
  },
  pl: {
    'nav.today': 'Dzisiaj',
    'nav.applications': 'Aplikacje',
    'nav.learning': 'Nauka',
    'nav.settings': 'Ustawienia',
    'nav.projects': 'Projekty',
    'nav.apps': 'Aplikacje',
    'topbar.guide': 'Przewodnik',
    'topbar.aiConnected': 'AI połączone',
    'topbar.locked': 'Zablokowane',
    'gate.title': 'Najpierw dodaj aplikację',
    'gate.add': 'Dodaj aplikację',
    'today.hello': 'Cześć, {name}',
    'settings.title': 'Ustawienia',
    'settings.subtitle': 'Zarządzaj planem, dostępem AI, CV, danymi projektu, językiem i głosem.',
    'settings.languageTitle': 'Język i głos',
    'settings.interfaceLanguage': 'Język interfejsu',
    'settings.voice': 'Głos AI',
    'settings.voiceAuto': 'Automatyczny głos dla języka',
    'settings.voicePreview': 'Test głosu',
    'settings.voiceFallback': 'Nie znaleziono pasującego głosu. JobSensei użyje głosu zastępczego.',
    'voice.placeholder': 'Wpisz wiadomość...',
  },
  de: {
    'nav.today': 'Heute',
    'nav.applications': 'Bewerbungen',
    'nav.learning': 'Lernen',
    'nav.settings': 'Einstellungen',
    'nav.projects': 'Projekte',
    'nav.apps': 'Apps',
    'topbar.guide': 'Guide',
    'topbar.aiConnected': 'AI verbunden',
    'topbar.locked': 'Gesperrt',
    'gate.title': 'Zuerst eine Bewerbung hinzufügen',
    'gate.add': 'Bewerbung hinzufügen',
    'today.hello': 'Hallo, {name}',
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Plan, AI-Zugang, Lebenslauf, Projektdaten, Sprache und Stimme verwalten.',
    'settings.languageTitle': 'Sprache und Stimme',
    'settings.interfaceLanguage': 'Oberflächensprache',
    'settings.voice': 'AI-Stimme',
    'settings.voiceAuto': 'Automatische Stimme für diese Sprache',
    'settings.voicePreview': 'Stimme testen',
    'settings.voiceFallback': 'Keine passende Stimme gefunden. JobSensei nutzt eine Ersatzstimme.',
    'voice.placeholder': 'Nachricht eingeben...',
  },
}

const LanguageContext = createContext(null)

function dictionaryKey(option) {
  return option?.dictionary || option?.code || 'en'
}

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

export function findVoiceForLanguage(option, voices, preferredVoiceName = '') {
  if (!Array.isArray(voices) || voices.length === 0) return null
  if (preferredVoiceName) {
    const selected = voices.find(voice => voice.name === preferredVoiceName)
    if (selected) return selected
  }

  const lang = option?.speechLang || 'en-US'
  const baseLang = lang.split('-')[0]
  const searchNames = option?.voiceSearch || []
  for (const name of searchNames) {
    const match = voices.find(voice => voice.name === name || voice.name.toLowerCase().includes(name.toLowerCase()))
    if (match) return match
  }
  return voices.find(voice => voice.lang === lang)
    || voices.find(voice => voice.lang?.toLowerCase().startsWith(`${baseLang}-`))
    || voices.find(voice => voice.lang?.startsWith('en'))
    || voices[0]
}

function getVoiceSupport(option, voice, voices) {
  if (!voices.length) return 'none'
  if (!voice) return 'none'
  if (voice.lang === option.speechLang) return 'exact'
  if (voice.lang?.split('-')[0] === option.speechLang.split('-')[0]) return 'related'
  return 'fallback'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem('js_language') || 'en')
  const [voiceName, setVoiceNameState] = useState(() => localStorage.getItem('js_voice_name') || '')
  const [voices, setVoices] = useState([])

  useEffect(() => {
    if (!window.speechSynthesis) return
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices() || [])
    loadVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices)
  }, [])

  const languageOption = LANGUAGE_OPTIONS.find(option => option.code === language) || LANGUAGE_OPTIONS[0]
  const dictKey = dictionaryKey(languageOption)
  const activeVoice = useMemo(
    () => findVoiceForLanguage(languageOption, voices, voiceName),
    [languageOption, voices, voiceName],
  )
  const voiceSupport = getVoiceSupport(languageOption, activeVoice, voices)

  useEffect(() => {
    document.documentElement.lang = languageOption.speechLang || languageOption.code || 'en'
  }, [languageOption])

  const t = (key, vars) => {
    const value = TRANSLATIONS[dictKey]?.[key] || TRANSLATIONS.en[key] || key
    return interpolate(value, vars)
  }

  function setLanguage(nextLanguage) {
    setLanguageState(nextLanguage)
    setVoiceNameState('')
    localStorage.setItem('js_language', nextLanguage)
    localStorage.removeItem('js_voice_name')
  }

  function setVoiceName(nextVoiceName) {
    setVoiceNameState(nextVoiceName)
    if (nextVoiceName) localStorage.setItem('js_voice_name', nextVoiceName)
    else localStorage.removeItem('js_voice_name')
  }

  const value = {
    language,
    setLanguage,
    languageOption,
    languages: LANGUAGE_OPTIONS,
    t,
    voices,
    voiceName,
    setVoiceName,
    activeVoice,
    voiceSupport,
    speechLang: languageOption.speechLang,
    recognitionLang: languageOption.recognitionLang,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
