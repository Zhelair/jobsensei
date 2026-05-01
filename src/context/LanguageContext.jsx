import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const LANGUAGE_OPTIONS = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLang: 'en-US',
    recognitionLang: 'en-US',
    voiceSearch: ['Google UK English Female', 'Google US English', 'Microsoft Zira', 'Samantha', 'Karen', 'Moira', 'Tessa'],
  },
  {
    code: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    speechLang: 'de-DE',
    recognitionLang: 'de-DE',
    voiceSearch: ['Google Deutsch', 'Microsoft Katja', 'Anna'],
  },
  {
    code: 'bg',
    label: 'Bulgarian',
    nativeLabel: 'Български',
    speechLang: 'bg-BG',
    recognitionLang: 'bg-BG',
    voiceSearch: ['Bulgarian', 'bg-BG', 'Daria'],
    voiceNote: 'Bulgarian browser voices са често липсващи. Ако браузърът няма BG voice, JobSensei ще използва fallback и може да звучи странно.',
  },
  {
    code: 'ru',
    label: 'Russian',
    nativeLabel: 'Русский',
    speechLang: 'ru-RU',
    recognitionLang: 'ru-RU',
    voiceSearch: ['Google русский', 'Microsoft Irina', 'Milena'],
  },
  {
    code: 'es-ES',
    label: 'Spanish (Spain)',
    nativeLabel: 'Español (España)',
    speechLang: 'es-ES',
    recognitionLang: 'es-ES',
    dictionary: 'es',
    voiceSearch: ['Google español', 'Microsoft Elvira', 'Monica'],
  },
  {
    code: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    speechLang: 'fr-FR',
    recognitionLang: 'fr-FR',
    voiceSearch: ['Google français', 'Microsoft Hortense', 'Amelie', 'Aurelie', 'Audrey'],
  },
  {
    code: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    speechLang: 'it-IT',
    recognitionLang: 'it-IT',
    voiceSearch: ['Google italiano', 'Microsoft Elsa', 'Alice'],
  },
  {
    code: 'pl',
    label: 'Polish',
    nativeLabel: 'Polski',
    speechLang: 'pl-PL',
    recognitionLang: 'pl-PL',
    voiceSearch: ['Google polski', 'Microsoft Paulina', 'Zosia'],
  },
  {
    code: 'pt-PT',
    label: 'Portuguese (Portugal)',
    nativeLabel: 'Português (Portugal)',
    speechLang: 'pt-PT',
    recognitionLang: 'pt-PT',
    dictionary: 'pt',
    voiceSearch: ['Google português de Portugal', 'Google português', 'Microsoft Helia', 'Joana', 'Ines'],
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
    'settings.voiceExact': 'Voz compatible encontrada.',
    'settings.voiceRelated': 'Se está usando una voz relacionada para este idioma.',
    'settings.voiceFallback': 'No se encontró una voz compatible. JobSensei usará una voz alternativa.',
    'settings.voiceNone': 'Aún no hay voces del navegador disponibles.',
    'settings.voiceNote': 'Nota sobre la voz',
    'voice.placeholder': 'Escribe tu mensaje...',
  },
  fr: {
    'nav.today': 'Aujourd’hui',
    'nav.applications': 'Candidatures',
    'nav.learning': 'Apprentissage',
    'nav.settings': 'Paramètres',
    'nav.projects': 'Projets',
    'nav.apps': 'Apps',
    'topbar.guide': 'Guide',
    'topbar.start': 'Démarrer',
    'topbar.aiConnected': 'AI connectée',
    'topbar.locked': 'Verrouillé',
    'topbar.thinking': 'Réflexion...',
    'gate.title': 'Ajoutez d’abord une candidature',
    'gate.copy': '{section} fonctionne mieux lorsque JobSensei connaît l’entreprise, le poste et la JD. Créez ou capturez d’abord une vraie candidature, puis les outils se déverrouilleront avec le bon contexte.',
    'gate.add': 'Ajouter une candidature',
    'gate.back': 'Retour à Aujourd’hui',
    'today.hello': 'Bonjour, {name}',
    'today.subtitle': 'Un seul endroit pour voir la prochaine vraie action dans votre recherche d’emploi.',
    'today.activeFocus': 'Focus actif',
    'today.startFirst': 'Commencez votre première candidature',
    'today.openApplications': 'Ouvrir les candidatures',
    'today.applications': 'Candidatures',
    'today.firstStep': 'Première étape',
    'today.firstStepTitle': 'Ajoutez une vraie candidature pour déverrouiller le workspace',
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Gérez le plan, l’accès AI, le CV, les données du projet, la langue et la voix.',
    'settings.languageTitle': 'Langue et voix',
    'settings.languageCopy': 'Choisissez la langue de l’interface et la voix du navigateur pour les réponses parlées.',
    'settings.interfaceLanguage': 'Langue de l’interface',
    'settings.voice': 'Voix AI',
    'settings.voiceAuto': 'Voix automatique pour la langue sélectionnée',
    'settings.voicePreview': 'Tester la voix',
    'settings.voiceExact': 'Voix correspondante trouvée.',
    'settings.voiceRelated': 'Une voix proche est utilisée pour cette langue.',
    'settings.voiceFallback': 'Aucune voix compatible trouvée. JobSensei utilisera une voix de secours.',
    'settings.voiceNone': 'Aucune voix de navigateur n’est encore disponible.',
    'settings.voiceNote': 'Note sur la voix',
    'voice.placeholder': 'Écrivez votre message...',
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
    'settings.voiceExact': 'Voce corrispondente trovata.',
    'settings.voiceRelated': 'Viene usata una voce correlata per questa lingua.',
    'settings.voiceFallback': 'Nessuna voce compatibile trovata. JobSensei userà una voce di fallback.',
    'settings.voiceNone': 'Nessuna voce del browser è ancora disponibile.',
    'settings.voiceNote': 'Nota sulla voce',
    'voice.placeholder': 'Scrivi il tuo messaggio...',
  },
  pt: {
    'nav.today': 'Hoje',
    'nav.applications': 'Candidaturas',
    'nav.learning': 'Aprendizagem',
    'nav.settings': 'Configurações',
    'nav.projects': 'Projetos',
    'nav.apps': 'Apps',
    'topbar.guide': 'Guia',
    'topbar.start': 'Iniciar',
    'topbar.aiConnected': 'AI conectada',
    'topbar.locked': 'Bloqueado',
    'topbar.thinking': 'Pensando...',
    'gate.title': 'Adicione uma candidatura primeiro',
    'gate.copy': '{section} funciona melhor quando o JobSensei conhece a empresa, o cargo e a JD. Crie ou capture uma candidatura real primeiro; depois, as ferramentas serão desbloqueadas com o contexto correto.',
    'gate.add': 'Adicionar candidatura',
    'gate.back': 'Voltar para Hoje',
    'today.hello': 'Olá, {name}',
    'today.subtitle': 'Um só lugar para ver o próximo passo real na sua busca por emprego.',
    'today.activeFocus': 'Foco ativo',
    'today.startFirst': 'Comece sua primeira candidatura',
    'today.openApplications': 'Abrir candidaturas',
    'today.applications': 'Candidaturas',
    'today.firstStep': 'Primeiro passo',
    'today.firstStepTitle': 'Adicione uma candidatura real para desbloquear o workspace',
    'settings.title': 'Configurações',
    'settings.subtitle': 'Gerencie plano, acesso AI, CV, dados do projeto, idioma e voz.',
    'settings.languageTitle': 'Idioma e voz',
    'settings.languageCopy': 'Escolha o idioma da interface e a voz do navegador para respostas faladas.',
    'settings.interfaceLanguage': 'Idioma da interface',
    'settings.voice': 'Voz AI',
    'settings.voiceAuto': 'Voz automática para o idioma selecionado',
    'settings.voicePreview': 'Testar voz',
    'settings.voiceExact': 'Voz correspondente encontrada.',
    'settings.voiceRelated': 'Usando uma voz relacionada para este idioma.',
    'settings.voiceFallback': 'Nenhuma voz compatível encontrada. O JobSensei usará uma voz alternativa.',
    'settings.voiceNone': 'Nenhuma voz do navegador está disponível ainda.',
    'settings.voiceNote': 'Nota sobre a voz',
    'voice.placeholder': 'Digite sua mensagem...',
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
    'settings.voiceExact': 'Znaleziono pasujący głos.',
    'settings.voiceRelated': 'Używany jest pokrewny głos dla tego języka.',
    'settings.voiceFallback': 'Nie znaleziono pasującego głosu. JobSensei użyje głosu zastępczego.',
    'settings.voiceNone': 'Głosy przeglądarki nie są jeszcze dostępne.',
    'settings.voiceNote': 'Uwaga dotycząca głosu',
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
    'settings.languageCopy': 'Wählen Sie die Oberflächensprache und die Browser-Stimme für gesprochene Antworten.',
    'settings.interfaceLanguage': 'Oberflächensprache',
    'settings.voice': 'AI-Stimme',
    'settings.voiceAuto': 'Automatische Stimme für diese Sprache',
    'settings.voicePreview': 'Stimme testen',
    'settings.voiceExact': 'Passende Stimme gefunden.',
    'settings.voiceRelated': 'Es wird eine verwandte Stimme für diese Sprache verwendet.',
    'settings.voiceFallback': 'Keine passende Stimme gefunden. JobSensei nutzt eine Ersatzstimme.',
    'settings.voiceNone': 'Noch keine Browser-Stimmen verfügbar.',
    'settings.voiceNote': 'Hinweis zur Stimme',
    'voice.placeholder': 'Nachricht eingeben...',
  },
}

const LanguageContext = createContext(null)
const SUPPORTED_LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map(option => option.code))
const LEGACY_LANGUAGE_MAP = {
  'es-US': 'es-ES',
  'pt-BR': 'pt-PT',
}
const FEMALE_VOICE_HINTS = [
  'female', 'woman', 'zira', 'samantha', 'karen', 'moira', 'tessa', 'victoria', 'fiona',
  'serena', 'susan', 'joanna', 'jenny', 'aria', 'ana', 'maria', 'monica', 'elvira',
  'hortense', 'amelie', 'aurelie', 'audrey', 'elsa', 'alice', 'paulina', 'zosia',
  'helia', 'joana', 'ines', 'irina', 'milena', 'katja', 'anna', 'daria',
]
const MALE_VOICE_HINTS = [
  'male', 'man', 'david', 'daniel', 'mark', 'george', 'jorge', 'diego', 'thomas',
  'paul', 'yuri', 'fred', 'joris', 'stefan', 'pavel',
]

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

  const nameIncludes = (voice, hint) => voice.name?.toLowerCase().includes(hint.toLowerCase())
  const hasFemaleHint = voice => FEMALE_VOICE_HINTS.some(hint => nameIncludes(voice, hint))
  const hasMaleHint = voice => MALE_VOICE_HINTS.some(hint => nameIncludes(voice, hint))
  const pickBest = (pool) => {
    if (!pool.length) return null
    for (const name of searchNames) {
      const match = pool.find(voice => voice.name === name || nameIncludes(voice, name))
      if (match) return match
    }
    return pool.find(hasFemaleHint)
      || pool.find(voice => !hasMaleHint(voice))
      || pool[0]
  }

  const exactLang = voices.filter(voice => voice.lang === lang)
  const relatedLang = voices.filter(voice => voice.lang?.toLowerCase().startsWith(`${baseLang}-`))
  const englishFallback = voices.filter(voice => voice.lang?.startsWith('en'))

  return pickBest(exactLang)
    || pickBest(relatedLang)
    || pickBest(englishFallback)
    || pickBest(voices)
}

function getVoiceSupport(option, voice, voices) {
  if (!voices.length) return 'none'
  if (!voice) return 'none'
  if (voice.lang === option.speechLang) return 'exact'
  if (voice.lang?.split('-')[0] === option.speechLang.split('-')[0]) return 'related'
  return 'fallback'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('js_language')
    if (LEGACY_LANGUAGE_MAP[saved]) return LEGACY_LANGUAGE_MAP[saved]
    return SUPPORTED_LANGUAGE_CODES.has(saved) ? saved : 'en'
  })
  const [voiceName, setVoiceNameState] = useState('')
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
    () => findVoiceForLanguage(languageOption, voices),
    [languageOption, voices],
  )
  const voiceSupport = getVoiceSupport(languageOption, activeVoice, voices)

  useEffect(() => {
    document.documentElement.lang = languageOption.speechLang || languageOption.code || 'en'
    localStorage.removeItem('js_voice_name')
  }, [languageOption])

  const t = (key, vars) => {
    const value = TRANSLATIONS[dictKey]?.[key] || TRANSLATIONS.en[key] || key
    return interpolate(value, vars)
  }

  function setLanguage(nextLanguage) {
    const safeLanguage = SUPPORTED_LANGUAGE_CODES.has(nextLanguage) ? nextLanguage : 'en'
    setLanguageState(safeLanguage)
    setVoiceNameState('')
    localStorage.setItem('js_language', safeLanguage)
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
