import React, { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import { GraduationCap, ChevronRight, ChevronLeft, Check, Upload, Coffee, Languages } from 'lucide-react'

/* const ONBOARDING_COPY = {
  en: {
    welcome: 'Welcome to JobSensei',
    tagline: 'Your AI-powered job search companion',
    profileTitle: 'Set up your workspace',
    profileSubtitle: 'Choose your language and add the basics JobSensei should remember.',
    languageLabel: 'Interface language',
    nameLabel: 'Your name',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Current role',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Target role',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Projects live in the sidebar',
    projectHintCopy: 'Use Projects at the bottom left on desktop, or the Projects tab in the mobile bottom bar, to create a new job-search workspace.',
    resumeTitle: 'Upload your resume / CV',
    resumeSubtitle: 'One upload fills Interview Prep, Gap Analysis, and the rest of the tools automatically.',
    upload: 'Upload .txt or .pdf',
    reading: 'Reading...',
    resumePlaceholder: 'Or paste your resume / CV text here...',
    resumeCaptured: 'Resume captured',
    resumeCapturedWithCount: 'Resume captured - {count} characters',
    resumeLater: 'You can skip this and upload it later in Settings.',
    pdfNoReadableText: '[PDF had no readable text. Paste it below.]',
    resumeReadError: '[Could not read the file. Please paste your resume below.]',
    activateTitle: 'Activate JobSensei AI',
    activateSubtitle: 'Choose how you want to power the AI features.',
    supporter: 'Buy Me a Coffee supporter',
    verified: 'Verified. AI is powered by JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Already a supporter? Enter your access code below.',
    accessPlaceholder: 'Enter your access code...',
    activateAccess: 'Activate access',
    verifying: 'Verifying...',
    accessManage: 'Once active, you can manage access in Settings.',
    skip: 'Skip for now',
    back: 'Back',
    next: 'Next',
    getStarted: 'Get started',
  },
  ru: {
    welcome: 'Добро пожаловать в JobSensei',
    tagline: 'Ваш AI-помощник в поиске работы',
    profileTitle: 'Настройте рабочее пространство',
    profileSubtitle: 'Выберите язык и добавьте базовые данные, которые JobSensei должен запомнить.',
    languageLabel: 'Язык интерфейса',
    nameLabel: 'Ваше имя',
    namePlaceholder: 'Иван',
    currentRoleLabel: 'Текущая роль',
    currentRolePlaceholder: 'Менеджер по маркетингу',
    targetRoleLabel: 'Желаемая роль',
    targetRolePlaceholder: 'Аналитик по финансовым преступлениям',
    projectHintTitle: 'Проекты находятся в боковом меню',
    projectHintCopy: 'На компьютере используйте Projects внизу слева, а на телефоне вкладку Projects в нижней панели, чтобы создать новое рабочее пространство.',
    resumeTitle: 'Загрузите резюме / CV',
    resumeSubtitle: 'Одна загрузка автоматически заполнит Interview Prep, Gap Analysis и остальные инструменты.',
    upload: 'Загрузить .txt или .pdf',
    reading: 'Читаю...',
    resumePlaceholder: 'Или вставьте сюда текст резюме / CV...',
    resumeCaptured: 'Резюме сохранено',
    resumeCapturedWithCount: 'Резюме сохранено - {count} символов',
    resumeLater: 'Можно пропустить этот шаг и загрузить резюме позже в Settings.',
    pdfNoReadableText: '[В PDF не найден читаемый текст. Вставьте его ниже.]',
    resumeReadError: '[Не удалось прочитать файл. Пожалуйста, вставьте резюме ниже.]',
    activateTitle: 'Активируйте JobSensei AI',
    activateSubtitle: 'Выберите, как включить AI-функции.',
    supporter: 'Поддержка через Buy Me a Coffee',
    verified: 'Проверено. AI работает через JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Уже есть доступ? Введите код ниже.',
    accessPlaceholder: 'Введите код доступа...',
    activateAccess: 'Активировать доступ',
    verifying: 'Проверяю...',
    accessManage: 'После активации вы сможете управлять доступом в Settings.',
    skip: 'Пропустить',
    back: 'Назад',
    next: 'Далее',
    getStarted: 'Начать',
  },
  bg: {
    welcome: 'Добре дошъл в JobSensei',
    tagline: 'Твоят AI помощник за търсене на работа',
    profileTitle: 'Настрой работното си пространство',
    profileSubtitle: 'Избери език и добави основните данни, които JobSensei да запомни.',
    languageLabel: 'Език на интерфейса',
    nameLabel: 'Твоето име',
    namePlaceholder: 'Иван',
    currentRoleLabel: 'Текуща роля',
    currentRolePlaceholder: 'Маркетинг мениджър',
    targetRoleLabel: 'Целева роля',
    targetRolePlaceholder: 'Анализатор по финансови престъпления',
    projectHintTitle: 'Проектите са в страничното меню',
    projectHintCopy: 'На компютър използвай Projects долу вляво, а на телефон таба Projects в долната лента, за да създадеш ново работно пространство.',
    resumeTitle: 'Качи своето резюме / CV',
    resumeSubtitle: 'С едно качване автоматично попълваш Interview Prep, Gap Analysis и останалите инструменти.',
    upload: 'Качи .txt или .pdf',
    reading: 'Чета...',
    resumePlaceholder: 'Или постави текста на резюмето / CV-то тук...',
    resumeCaptured: 'Резюмето е запазено',
    resumeCapturedWithCount: 'Резюмето е запазено - {count} символа',
    resumeLater: 'Можеш да пропуснеш това и да качиш резюмето по-късно в Settings.',
    pdfNoReadableText: '[В PDF файла няма четим текст. Постави го по-долу.]',
    resumeReadError: '[Файлът не можа да бъде прочетен. Моля, постави резюмето си по-долу.]',
    activateTitle: 'Активирай JobSensei AI',
    activateSubtitle: 'Избери как да включиш AI функциите.',
    supporter: 'Поддръжник през Buy Me a Coffee',
    verified: 'Потвърдено. AI работи чрез JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Вече имаш достъп? Въведи кода по-долу.',
    accessPlaceholder: 'Въведи кода за достъп...',
    activateAccess: 'Активирай достъп',
    verifying: 'Проверявам...',
    accessManage: 'След активиране можеш да управляваш достъпа от Settings.',
    skip: 'Пропусни засега',
    back: 'Назад',
    next: 'Напред',
    getStarted: 'Започни',
  },
  es: {
    welcome: 'Bienvenido a JobSensei',
    tagline: 'Tu compañero con AI para la búsqueda de empleo',
    profileTitle: 'Configura tu espacio de trabajo',
    profileSubtitle: 'Elige tu idioma y añade lo básico que JobSensei debe recordar.',
    languageLabel: 'Idioma de la interfaz',
    nameLabel: 'Tu nombre',
    namePlaceholder: 'Iván',
    currentRoleLabel: 'Puesto actual',
    currentRolePlaceholder: 'Responsable de marketing',
    targetRoleLabel: 'Puesto objetivo',
    targetRolePlaceholder: 'Analista de delitos financieros',
    projectHintTitle: 'Los proyectos están en la barra lateral',
    projectHintCopy: 'En escritorio usa Projects abajo a la izquierda; en móvil usa la pestaña Projects de la barra inferior para crear un nuevo espacio de trabajo.',
    resumeTitle: 'Sube tu CV / currículum',
    resumeSubtitle: 'Una sola subida rellena automáticamente Interview Prep, Gap Analysis y el resto de las herramientas.',
    upload: 'Subir .txt o .pdf',
    reading: 'Leyendo...',
    resumePlaceholder: 'O pega aquí el texto de tu CV / currículum...',
    resumeCaptured: 'CV guardado',
    resumeCapturedWithCount: 'CV guardado - {count} caracteres',
    resumeLater: 'Puedes omitir este paso y subirlo más tarde en Settings.',
    pdfNoReadableText: '[El PDF no tenía texto legible. Pégalo abajo.]',
    resumeReadError: '[No se pudo leer el archivo. Pega tu CV abajo.]',
    activateTitle: 'Activa JobSensei AI',
    activateSubtitle: 'Elige cómo activar las funciones de AI.',
    supporter: 'Soporte por Buy Me a Coffee',
    verified: 'Verificado. La AI funciona con JobSensei.',
    buy: 'Buy Me a Coffee',
    already: '¿Ya tienes acceso? Introduce tu código abajo.',
    accessPlaceholder: 'Introduce tu código de acceso...',
    activateAccess: 'Activar acceso',
    verifying: 'Verificando...',
    accessManage: 'Cuando esté activo, podrás gestionar el acceso en Settings.',
    skip: 'Omitir por ahora',
    back: 'Atrás',
    next: 'Siguiente',
    getStarted: 'Empezar',
  },
  fr: {
    welcome: 'Bienvenue sur JobSensei',
    tagline: 'Votre compagnon AI pour la recherche d’emploi',
    profileTitle: 'Configurez votre espace de travail',
    profileSubtitle: 'Choisissez votre langue et ajoutez les informations de base que JobSensei doit retenir.',
    languageLabel: 'Langue de l’interface',
    nameLabel: 'Votre nom',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Poste actuel',
    currentRolePlaceholder: 'Responsable marketing',
    targetRoleLabel: 'Poste visé',
    targetRolePlaceholder: 'Analyste en criminalité financière',
    projectHintTitle: 'Les projets se trouvent dans la barre latérale',
    projectHintCopy: 'Sur ordinateur, utilisez Projects en bas à gauche. Sur mobile, utilisez l’onglet Projects dans la barre du bas pour créer un nouvel espace de travail.',
    resumeTitle: 'Importez votre CV / résumé',
    resumeSubtitle: 'Un seul import remplit automatiquement Interview Prep, Gap Analysis et le reste des outils.',
    upload: 'Importer .txt ou .pdf',
    reading: 'Lecture...',
    resumePlaceholder: 'Ou collez ici le texte de votre CV / résumé...',
    resumeCaptured: 'CV enregistré',
    resumeCapturedWithCount: 'CV enregistré - {count} caractères',
    resumeLater: 'Vous pouvez passer cette étape et l’importer plus tard dans Settings.',
    pdfNoReadableText: '[Le PDF ne contenait pas de texte lisible. Collez-le ci-dessous.]',
    resumeReadError: '[Impossible de lire le fichier. Veuillez coller votre CV ci-dessous.]',
    activateTitle: 'Activez JobSensei AI',
    activateSubtitle: 'Choisissez comment alimenter les fonctionnalités AI.',
    supporter: 'Soutien via Buy Me a Coffee',
    verified: 'Vérifié. L’AI fonctionne avec JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Vous avez déjà un accès ? Saisissez votre code ci-dessous.',
    accessPlaceholder: 'Saisissez votre code d’accès...',
    activateAccess: 'Activer l’accès',
    verifying: 'Vérification...',
    accessManage: 'Une fois activé, vous pourrez gérer l’accès dans Settings.',
    skip: 'Passer pour le moment',
    back: 'Retour',
    next: 'Suivant',
    getStarted: 'Commencer',
  },
  it: {
    welcome: 'Benvenuto in JobSensei',
    tagline: 'Il tuo compagno AI per la ricerca di lavoro',
    profileTitle: 'Configura il tuo spazio di lavoro',
    profileSubtitle: 'Scegli la lingua e aggiungi le informazioni di base che JobSensei deve ricordare.',
    languageLabel: 'Lingua dell’interfaccia',
    nameLabel: 'Il tuo nome',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Ruolo attuale',
    currentRolePlaceholder: 'Responsabile marketing',
    targetRoleLabel: 'Ruolo desiderato',
    targetRolePlaceholder: 'Analista di crimini finanziari',
    projectHintTitle: 'I progetti si trovano nella barra laterale',
    projectHintCopy: 'Su desktop usa Projects in basso a sinistra; su mobile usa la scheda Projects nella barra inferiore per creare un nuovo spazio di lavoro.',
    resumeTitle: 'Carica il tuo CV / resume',
    resumeSubtitle: 'Un solo caricamento compila automaticamente Interview Prep, Gap Analysis e il resto degli strumenti.',
    upload: 'Carica .txt o .pdf',
    reading: 'Lettura...',
    resumePlaceholder: 'Oppure incolla qui il testo del tuo CV / resume...',
    resumeCaptured: 'CV salvato',
    resumeCapturedWithCount: 'CV salvato - {count} caratteri',
    resumeLater: 'Puoi saltare questo passaggio e caricarlo più tardi in Settings.',
    pdfNoReadableText: '[Il PDF non conteneva testo leggibile. Incollalo qui sotto.]',
    resumeReadError: '[Impossibile leggere il file. Incolla qui sotto il tuo CV.]',
    activateTitle: 'Attiva JobSensei AI',
    activateSubtitle: 'Scegli come alimentare le funzioni AI.',
    supporter: 'Supporto tramite Buy Me a Coffee',
    verified: 'Verificato. L’AI funziona con JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Hai già accesso? Inserisci il codice qui sotto.',
    accessPlaceholder: 'Inserisci il codice di accesso...',
    activateAccess: 'Attiva accesso',
    verifying: 'Verifica in corso...',
    accessManage: 'Una volta attivo, potrai gestire l’accesso in Settings.',
    skip: 'Salta per ora',
    back: 'Indietro',
    next: 'Avanti',
    getStarted: 'Inizia',
  },
  pt: {
    welcome: 'Bem-vindo ao JobSensei',
    tagline: 'O seu companheiro com AI para a procura de emprego',
    profileTitle: 'Configure o seu espaço de trabalho',
    profileSubtitle: 'Escolha o idioma e adicione o essencial que o JobSensei deve lembrar.',
    languageLabel: 'Idioma da interface',
    nameLabel: 'O seu nome',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Cargo atual',
    currentRolePlaceholder: 'Gestor de marketing',
    targetRoleLabel: 'Cargo pretendido',
    targetRolePlaceholder: 'Analista de crimes financeiros',
    projectHintTitle: 'Os projetos ficam na barra lateral',
    projectHintCopy: 'No computador, use Projects no canto inferior esquerdo; no telemóvel, use o separador Projects na barra inferior para criar um novo espaço de trabalho.',
    resumeTitle: 'Carregue o seu CV / resume',
    resumeSubtitle: 'Um único carregamento preenche automaticamente Interview Prep, Gap Analysis e as restantes ferramentas.',
    upload: 'Carregar .txt ou .pdf',
    reading: 'A ler...',
    resumePlaceholder: 'Ou cole aqui o texto do seu CV / resume...',
    resumeCaptured: 'CV guardado',
    resumeCapturedWithCount: 'CV guardado - {count} caracteres',
    resumeLater: 'Pode ignorar este passo e carregar o ficheiro mais tarde em Settings.',
    pdfNoReadableText: '[O PDF não tinha texto legível. Cole-o abaixo.]',
    resumeReadError: '[Não foi possível ler o ficheiro. Cole o seu CV abaixo.]',
    activateTitle: 'Ativar JobSensei AI',
    activateSubtitle: 'Escolha como quer alimentar as funcionalidades de AI.',
    supporter: 'Apoio via Buy Me a Coffee',
    verified: 'Verificado. A AI funciona com o JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Já tem acesso? Introduza o código abaixo.',
    accessPlaceholder: 'Introduza o código de acesso...',
    activateAccess: 'Ativar acesso',
    verifying: 'A verificar...',
    accessManage: 'Depois de ativado, poderá gerir o acesso em Settings.',
    skip: 'Saltar por agora',
    back: 'Voltar',
    next: 'Seguinte',
    getStarted: 'Começar',
  },
  pl: {
    welcome: 'Witamy w JobSensei',
    tagline: 'Twój pomocnik AI w szukaniu pracy',
    profileTitle: 'Skonfiguruj swoje miejsce pracy',
    profileSubtitle: 'Wybierz język i dodaj podstawowe dane, które JobSensei ma zapamiętać.',
    languageLabel: 'Język interfejsu',
    nameLabel: 'Twoje imię',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Obecne stanowisko',
    currentRolePlaceholder: 'Menedżer marketingu',
    targetRoleLabel: 'Docelowe stanowisko',
    targetRolePlaceholder: 'Analityk ds. przestępczości finansowej',
    projectHintTitle: 'Projekty znajdziesz w panelu bocznym',
    projectHintCopy: 'Na komputerze użyj Projects w lewym dolnym rogu, a na telefonie karty Projects w dolnym pasku, aby utworzyć nowe miejsce pracy.',
    resumeTitle: 'Prześlij swoje CV / resume',
    resumeSubtitle: 'Jedno przesłanie automatycznie uzupełnia Interview Prep, Gap Analysis i pozostałe narzędzia.',
    upload: 'Prześlij .txt lub .pdf',
    reading: 'Czytam...',
    resumePlaceholder: 'Albo wklej tutaj tekst swojego CV / resume...',
    resumeCaptured: 'CV zapisane',
    resumeCapturedWithCount: 'CV zapisane - {count} znaków',
    resumeLater: 'Możesz pominąć ten krok i przesłać plik później w Settings.',
    pdfNoReadableText: '[PDF nie zawierał czytelnego tekstu. Wklej go poniżej.]',
    resumeReadError: '[Nie udało się odczytać pliku. Wklej swoje CV poniżej.]',
    activateTitle: 'Aktywuj JobSensei AI',
    activateSubtitle: 'Wybierz, jak chcesz uruchomić funkcje AI.',
    supporter: 'Wsparcie przez Buy Me a Coffee',
    verified: 'Zweryfikowano. AI działa przez JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Masz już dostęp? Wpisz kod poniżej.',
    accessPlaceholder: 'Wpisz kod dostępu...',
    activateAccess: 'Aktywuj dostęp',
    verifying: 'Weryfikuję...',
    accessManage: 'Po aktywacji dostępem możesz zarządzać w Settings.',
    skip: 'Pomiń na razie',
    back: 'Wstecz',
    next: 'Dalej',
    getStarted: 'Zacznij',
  },
  de: {
    welcome: 'Willkommen bei JobSensei',
    tagline: 'Ihr AI-Begleiter für die Jobsuche',
    profileTitle: 'Richten Sie Ihren Arbeitsbereich ein',
    profileSubtitle: 'Wählen Sie Ihre Sprache und ergänzen Sie die Grundlagen, die JobSensei sich merken soll.',
    languageLabel: 'Sprache der Oberfläche',
    nameLabel: 'Ihr Name',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Aktuelle Rolle',
    currentRolePlaceholder: 'Marketingmanager',
    targetRoleLabel: 'Zielrolle',
    targetRolePlaceholder: 'Analyst für Finanzkriminalität',
    projectHintTitle: 'Projekte finden Sie in der Seitenleiste',
    projectHintCopy: 'Auf dem Desktop verwenden Sie Projects unten links, auf dem Smartphone den Tab Projects in der unteren Leiste, um einen neuen Arbeitsbereich zu erstellen.',
    resumeTitle: 'Laden Sie Ihren Lebenslauf / CV hoch',
    resumeSubtitle: 'Ein Upload füllt Interview Prep, Gap Analysis und die übrigen Tools automatisch aus.',
    upload: '.txt oder .pdf hochladen',
    reading: 'Wird gelesen...',
    resumePlaceholder: 'Oder fügen Sie hier den Text Ihres Lebenslaufs / CV ein...',
    resumeCaptured: 'Lebenslauf gespeichert',
    resumeCapturedWithCount: 'Lebenslauf gespeichert - {count} Zeichen',
    resumeLater: 'Sie können diesen Schritt überspringen und die Datei später in Settings hochladen.',
    pdfNoReadableText: '[Die PDF enthielt keinen lesbaren Text. Fügen Sie ihn unten ein.]',
    resumeReadError: '[Die Datei konnte nicht gelesen werden. Bitte fügen Sie Ihren Lebenslauf unten ein.]',
    activateTitle: 'JobSensei AI aktivieren',
    activateSubtitle: 'Wählen Sie, wie Sie die AI-Funktionen aktivieren möchten.',
    supporter: 'Unterstützung über Buy Me a Coffee',
    verified: 'Verifiziert. Die AI läuft über JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Sie haben bereits Zugriff? Geben Sie unten Ihren Code ein.',
    accessPlaceholder: 'Zugangscode eingeben...',
    activateAccess: 'Zugang aktivieren',
    verifying: 'Wird geprüft...',
    accessManage: 'Nach der Aktivierung können Sie den Zugriff in Settings verwalten.',
    skip: 'Vorerst überspringen',
    back: 'Zurück',
    next: 'Weiter',
    getStarted: 'Loslegen',
  },
} */

const ONBOARDING_COPY = {
  en: {
    welcome: 'Welcome to JobSensei',
    tagline: 'Your AI-powered job search companion',
    profileTitle: 'Set up your workspace',
    profileSubtitle: 'Choose your language and add the basics JobSensei should remember.',
    languageLabel: 'Interface language',
    nameLabel: 'Your name',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Current role',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Target role',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Projects live in the sidebar',
    projectHintCopy: 'Use Projects at the bottom left on desktop, or the Projects tab in the mobile bottom bar, to create a new job-search workspace.',
    resumeTitle: 'Upload your resume / CV',
    resumeSubtitle: 'One upload fills Interview Prep, Gap Analysis, and the rest of the tools automatically.',
    upload: 'Upload .txt or .pdf',
    reading: 'Reading...',
    resumePlaceholder: 'Or paste your resume / CV text here...',
    resumeCaptured: 'Resume captured',
    resumeCapturedWithCount: 'Resume captured - {count} characters',
    resumeLater: 'You can skip this and upload it later in Settings.',
    pdfNoReadableText: '[PDF had no readable text. Paste it below.]',
    resumeReadError: '[Could not read the file. Please paste your resume below.]',
    activateTitle: 'Activate JobSensei AI',
    activateSubtitle: 'Choose how you want to power the AI features.',
    supporter: 'Buy Me a Coffee supporter',
    verified: 'Verified. AI is powered by JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Already a supporter? Enter your access code below.',
    accessPlaceholder: 'Enter your access code...',
    activateAccess: 'Activate access',
    verifying: 'Verifying...',
    accessManage: 'Once active, you can manage access in Settings.',
    skip: 'Skip for now',
    back: 'Back',
    next: 'Next',
    getStarted: 'Get started',
  },
  ru: {
    welcome: 'Добро пожаловать в JobSensei',
    tagline: 'Ваш AI-помощник в поиске работы',
    profileTitle: 'Настройте рабочее пространство',
    profileSubtitle: 'Выберите язык и добавьте основные данные, которые JobSensei должен запомнить.',
    languageLabel: 'Язык интерфейса',
    nameLabel: 'Ваше имя',
    namePlaceholder: 'Иван',
    currentRoleLabel: 'Текущая роль',
    currentRolePlaceholder: 'Менеджер по маркетингу',
    targetRoleLabel: 'Желаемая роль',
    targetRolePlaceholder: 'Аналитик по финансовым преступлениям',
    projectHintTitle: 'Проекты находятся в боковом меню',
    projectHintCopy: 'На компьютере используйте Projects внизу слева, а на телефоне вкладку Projects в нижней панели, чтобы создать новое рабочее пространство для поиска работы.',
    resumeTitle: 'Загрузите резюме / CV',
    resumeSubtitle: 'Одна загрузка автоматически заполнит Interview Prep, Gap Analysis и остальные инструменты.',
    upload: 'Загрузить .txt или .pdf',
    reading: 'Читаю...',
    resumePlaceholder: 'Или вставьте сюда текст резюме / CV...',
    resumeCaptured: 'Резюме сохранено',
    resumeCapturedWithCount: 'Резюме сохранено - {count} символов',
    resumeLater: 'Этот шаг можно пропустить и загрузить резюме позже в Settings.',
    pdfNoReadableText: '[В PDF не найден читаемый текст. Вставьте его ниже.]',
    resumeReadError: '[Не удалось прочитать файл. Пожалуйста, вставьте ваше резюме ниже.]',
    activateTitle: 'Активируйте JobSensei AI',
    activateSubtitle: 'Выберите, как включить AI-функции.',
    supporter: 'Поддержка через Buy Me a Coffee',
    verified: 'Проверено. AI работает через JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Уже есть доступ? Введите код ниже.',
    accessPlaceholder: 'Введите код доступа...',
    activateAccess: 'Активировать доступ',
    verifying: 'Проверяю...',
    accessManage: 'После активации вы сможете управлять доступом в Settings.',
    skip: 'Пропустить пока',
    back: 'Назад',
    next: 'Далее',
    getStarted: 'Начать',
  },
  bg: {
    welcome: 'Добре дошъл в JobSensei',
    tagline: 'Твоят AI помощник за търсене на работа',
    profileTitle: 'Настрой работното си пространство',
    profileSubtitle: 'Избери език и добави основните данни, които JobSensei да запомни.',
    languageLabel: 'Език на интерфейса',
    nameLabel: 'Твоето име',
    namePlaceholder: 'Иван',
    currentRoleLabel: 'Текуща роля',
    currentRolePlaceholder: 'Маркетинг мениджър',
    targetRoleLabel: 'Целева роля',
    targetRolePlaceholder: 'Анализатор по финансови престъпления',
    projectHintTitle: 'Проектите са в страничното меню',
    projectHintCopy: 'На компютър използвай Projects долу вляво, а на телефон таба Projects в долната лента, за да създадеш ново работно пространство за търсене на работа.',
    resumeTitle: 'Качи своето резюме / CV',
    resumeSubtitle: 'С едно качване автоматично попълваш Interview Prep, Gap Analysis и останалите инструменти.',
    upload: 'Качи .txt или .pdf',
    reading: 'Чета...',
    resumePlaceholder: 'Или постави текста на резюмето / CV-то тук...',
    resumeCaptured: 'Резюмето е запазено',
    resumeCapturedWithCount: 'Резюмето е запазено - {count} символа',
    resumeLater: 'Можеш да пропуснеш това и да качиш резюмето по-късно в Settings.',
    pdfNoReadableText: '[В PDF файла няма четим текст. Постави го по-долу.]',
    resumeReadError: '[Файлът не можа да бъде прочетен. Моля, постави резюмето си по-долу.]',
    activateTitle: 'Активирай JobSensei AI',
    activateSubtitle: 'Избери как да включиш AI функциите.',
    supporter: 'Поддръжник чрез Buy Me a Coffee',
    verified: 'Потвърдено. AI работи чрез JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Вече имаш достъп? Въведи кода по-долу.',
    accessPlaceholder: 'Въведи кода за достъп...',
    activateAccess: 'Активирай достъп',
    verifying: 'Проверявам...',
    accessManage: 'След активиране можеш да управляваш достъпа от Settings.',
    skip: 'Пропусни засега',
    back: 'Назад',
    next: 'Напред',
    getStarted: 'Започни',
  },
  es: {
    welcome: 'Bienvenido a JobSensei',
    tagline: 'Tu compañero con AI para la búsqueda de empleo',
    profileTitle: 'Configura tu espacio de trabajo',
    profileSubtitle: 'Elige tu idioma y añade lo básico que JobSensei debe recordar.',
    languageLabel: 'Idioma de la interfaz',
    nameLabel: 'Tu nombre',
    namePlaceholder: 'Iván',
    currentRoleLabel: 'Puesto actual',
    currentRolePlaceholder: 'Responsable de marketing',
    targetRoleLabel: 'Puesto objetivo',
    targetRolePlaceholder: 'Analista de delitos financieros',
    projectHintTitle: 'Los proyectos están en la barra lateral',
    projectHintCopy: 'En escritorio usa Projects abajo a la izquierda; en móvil usa la pestaña Projects de la barra inferior para crear un nuevo espacio de trabajo.',
    resumeTitle: 'Sube tu CV / currículum',
    resumeSubtitle: 'Una sola subida rellena automáticamente Interview Prep, Gap Analysis y el resto de las herramientas.',
    upload: 'Subir .txt o .pdf',
    reading: 'Leyendo...',
    resumePlaceholder: 'O pega aquí el texto de tu CV / currículum...',
    resumeCaptured: 'CV guardado',
    resumeCapturedWithCount: 'CV guardado - {count} caracteres',
    resumeLater: 'Puedes omitir este paso y subirlo más tarde en Settings.',
    pdfNoReadableText: '[El PDF no tenía texto legible. Pégalo abajo.]',
    resumeReadError: '[No se pudo leer el archivo. Pega tu CV abajo.]',
    activateTitle: 'Activa JobSensei AI',
    activateSubtitle: 'Elige cómo activar las funciones de AI.',
    supporter: 'Soporte por Buy Me a Coffee',
    verified: 'Verificado. La AI funciona con JobSensei.',
    buy: 'Buy Me a Coffee',
    already: '¿Ya tienes acceso? Introduce tu código abajo.',
    accessPlaceholder: 'Introduce tu código de acceso...',
    activateAccess: 'Activar acceso',
    verifying: 'Verificando...',
    accessManage: 'Cuando esté activo, podrás gestionar el acceso en Settings.',
    skip: 'Omitir por ahora',
    back: 'Atrás',
    next: 'Siguiente',
    getStarted: 'Empezar',
  },
  fr: {
    welcome: 'Bienvenue sur JobSensei',
    tagline: 'Votre compagnon AI pour la recherche d’emploi',
    profileTitle: 'Configurez votre espace de travail',
    profileSubtitle: 'Choisissez votre langue et ajoutez les informations de base que JobSensei doit retenir.',
    languageLabel: 'Langue de l’interface',
    nameLabel: 'Votre nom',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Poste actuel',
    currentRolePlaceholder: 'Responsable marketing',
    targetRoleLabel: 'Poste visé',
    targetRolePlaceholder: 'Analyste en criminalité financière',
    projectHintTitle: 'Les projets se trouvent dans la barre latérale',
    projectHintCopy: 'Sur ordinateur, utilisez Projects en bas à gauche. Sur mobile, utilisez l’onglet Projects dans la barre du bas pour créer un nouvel espace de travail.',
    resumeTitle: 'Importez votre CV / résumé',
    resumeSubtitle: 'Un seul import remplit automatiquement Interview Prep, Gap Analysis et le reste des outils.',
    upload: 'Importer .txt ou .pdf',
    reading: 'Lecture...',
    resumePlaceholder: 'Ou collez ici le texte de votre CV / résumé...',
    resumeCaptured: 'CV enregistré',
    resumeCapturedWithCount: 'CV enregistré - {count} caractères',
    resumeLater: 'Vous pouvez passer cette étape et l’importer plus tard dans Settings.',
    pdfNoReadableText: '[Le PDF ne contenait pas de texte lisible. Collez-le ci-dessous.]',
    resumeReadError: '[Impossible de lire le fichier. Veuillez coller votre CV ci-dessous.]',
    activateTitle: 'Activez JobSensei AI',
    activateSubtitle: 'Choisissez comment alimenter les fonctionnalités AI.',
    supporter: 'Soutien via Buy Me a Coffee',
    verified: 'Vérifié. L’AI fonctionne avec JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Vous avez déjà un accès ? Saisissez votre code ci-dessous.',
    accessPlaceholder: 'Saisissez votre code d’accès...',
    activateAccess: 'Activer l’accès',
    verifying: 'Vérification...',
    accessManage: 'Une fois activé, vous pourrez gérer l’accès dans Settings.',
    skip: 'Passer pour le moment',
    back: 'Retour',
    next: 'Suivant',
    getStarted: 'Commencer',
  },
  it: {
    welcome: 'Benvenuto in JobSensei',
    tagline: 'Il tuo compagno AI per la ricerca di lavoro',
    profileTitle: 'Configura il tuo spazio di lavoro',
    profileSubtitle: 'Scegli la lingua e aggiungi le informazioni di base che JobSensei deve ricordare.',
    languageLabel: 'Lingua dell’interfaccia',
    nameLabel: 'Il tuo nome',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Ruolo attuale',
    currentRolePlaceholder: 'Responsabile marketing',
    targetRoleLabel: 'Ruolo desiderato',
    targetRolePlaceholder: 'Analista di crimini finanziari',
    projectHintTitle: 'I progetti si trovano nella barra laterale',
    projectHintCopy: 'Su desktop usa Projects in basso a sinistra; su mobile usa la scheda Projects nella barra inferiore per creare un nuovo spazio di lavoro.',
    resumeTitle: 'Carica il tuo CV / resume',
    resumeSubtitle: 'Un solo caricamento compila automaticamente Interview Prep, Gap Analysis e il resto degli strumenti.',
    upload: 'Carica .txt o .pdf',
    reading: 'Lettura...',
    resumePlaceholder: 'Oppure incolla qui il testo del tuo CV / resume...',
    resumeCaptured: 'CV salvato',
    resumeCapturedWithCount: 'CV salvato - {count} caratteri',
    resumeLater: 'Puoi saltare questo passaggio e caricarlo più tardi in Settings.',
    pdfNoReadableText: '[Il PDF non conteneva testo leggibile. Incollalo qui sotto.]',
    resumeReadError: '[Impossibile leggere il file. Incolla qui sotto il tuo CV.]',
    activateTitle: 'Attiva JobSensei AI',
    activateSubtitle: 'Scegli come alimentare le funzioni AI.',
    supporter: 'Supporto tramite Buy Me a Coffee',
    verified: 'Verificato. L’AI funziona con JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Hai già accesso? Inserisci il codice qui sotto.',
    accessPlaceholder: 'Inserisci il codice di accesso...',
    activateAccess: 'Attiva accesso',
    verifying: 'Verifica in corso...',
    accessManage: 'Una volta attivo, potrai gestire l’accesso in Settings.',
    skip: 'Salta per ora',
    back: 'Indietro',
    next: 'Avanti',
    getStarted: 'Inizia',
  },
  pt: {
    welcome: 'Bem-vindo ao JobSensei',
    tagline: 'O seu companheiro com AI para a procura de emprego',
    profileTitle: 'Configure o seu espaço de trabalho',
    profileSubtitle: 'Escolha o idioma e adicione o essencial que o JobSensei deve lembrar.',
    languageLabel: 'Idioma da interface',
    nameLabel: 'O seu nome',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Cargo atual',
    currentRolePlaceholder: 'Gestor de marketing',
    targetRoleLabel: 'Cargo pretendido',
    targetRolePlaceholder: 'Analista de crimes financeiros',
    projectHintTitle: 'Os projetos ficam na barra lateral',
    projectHintCopy: 'No computador, use Projects no canto inferior esquerdo; no telemóvel, use o separador Projects na barra inferior para criar um novo espaço de trabalho.',
    resumeTitle: 'Carregue o seu CV / resume',
    resumeSubtitle: 'Um único carregamento preenche automaticamente Interview Prep, Gap Analysis e as restantes ferramentas.',
    upload: 'Carregar .txt ou .pdf',
    reading: 'A ler...',
    resumePlaceholder: 'Ou cole aqui o texto do seu CV / resume...',
    resumeCaptured: 'CV guardado',
    resumeCapturedWithCount: 'CV guardado - {count} caracteres',
    resumeLater: 'Pode ignorar este passo e carregar o ficheiro mais tarde em Settings.',
    pdfNoReadableText: '[O PDF não tinha texto legível. Cole-o abaixo.]',
    resumeReadError: '[Não foi possível ler o ficheiro. Cole o seu CV abaixo.]',
    activateTitle: 'Ativar JobSensei AI',
    activateSubtitle: 'Escolha como quer alimentar as funcionalidades de AI.',
    supporter: 'Apoio via Buy Me a Coffee',
    verified: 'Verificado. A AI funciona com o JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Já tem acesso? Introduza o código abaixo.',
    accessPlaceholder: 'Introduza o código de acesso...',
    activateAccess: 'Ativar acesso',
    verifying: 'A verificar...',
    accessManage: 'Depois de ativado, poderá gerir o acesso em Settings.',
    skip: 'Saltar por agora',
    back: 'Voltar',
    next: 'Seguinte',
    getStarted: 'Começar',
  },
  pl: {
    welcome: 'Witamy w JobSensei',
    tagline: 'Twój pomocnik AI w szukaniu pracy',
    profileTitle: 'Skonfiguruj swoje miejsce pracy',
    profileSubtitle: 'Wybierz język i dodaj podstawowe dane, które JobSensei ma zapamiętać.',
    languageLabel: 'Język interfejsu',
    nameLabel: 'Twoje imię',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Obecne stanowisko',
    currentRolePlaceholder: 'Menedżer marketingu',
    targetRoleLabel: 'Docelowe stanowisko',
    targetRolePlaceholder: 'Analityk ds. przestępczości finansowej',
    projectHintTitle: 'Projekty znajdziesz w panelu bocznym',
    projectHintCopy: 'Na komputerze użyj Projects w lewym dolnym rogu, a na telefonie karty Projects w dolnym pasku, aby utworzyć nowe miejsce pracy.',
    resumeTitle: 'Prześlij swoje CV / resume',
    resumeSubtitle: 'Jedno przesłanie automatycznie uzupełnia Interview Prep, Gap Analysis i pozostałe narzędzia.',
    upload: 'Prześlij .txt lub .pdf',
    reading: 'Czytam...',
    resumePlaceholder: 'Albo wklej tutaj tekst swojego CV / resume...',
    resumeCaptured: 'CV zapisane',
    resumeCapturedWithCount: 'CV zapisane - {count} znaków',
    resumeLater: 'Możesz pominąć ten krok i przesłać plik później w Settings.',
    pdfNoReadableText: '[PDF nie zawierał czytelnego tekstu. Wklej go poniżej.]',
    resumeReadError: '[Nie udało się odczytać pliku. Wklej swoje CV poniżej.]',
    activateTitle: 'Aktywuj JobSensei AI',
    activateSubtitle: 'Wybierz, jak chcesz uruchomić funkcje AI.',
    supporter: 'Wsparcie przez Buy Me a Coffee',
    verified: 'Zweryfikowano. AI działa przez JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Masz już dostęp? Wpisz kod poniżej.',
    accessPlaceholder: 'Wpisz kod dostępu...',
    activateAccess: 'Aktywuj dostęp',
    verifying: 'Weryfikuję...',
    accessManage: 'Po aktywacji możesz zarządzać dostępem w Settings.',
    skip: 'Pomiń na razie',
    back: 'Wstecz',
    next: 'Dalej',
    getStarted: 'Zacznij',
  },
  de: {
    welcome: 'Willkommen bei JobSensei',
    tagline: 'Ihr AI-Begleiter für die Jobsuche',
    profileTitle: 'Richten Sie Ihren Arbeitsbereich ein',
    profileSubtitle: 'Wählen Sie Ihre Sprache und ergänzen Sie die Grundlagen, die JobSensei sich merken soll.',
    languageLabel: 'Sprache der Oberfläche',
    nameLabel: 'Ihr Name',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Aktuelle Rolle',
    currentRolePlaceholder: 'Marketingmanager',
    targetRoleLabel: 'Zielrolle',
    targetRolePlaceholder: 'Analyst für Finanzkriminalität',
    projectHintTitle: 'Projekte finden Sie in der Seitenleiste',
    projectHintCopy: 'Auf dem Desktop verwenden Sie Projects unten links, auf dem Smartphone den Tab Projects in der unteren Leiste, um einen neuen Arbeitsbereich zu erstellen.',
    resumeTitle: 'Laden Sie Ihren Lebenslauf / CV hoch',
    resumeSubtitle: 'Ein Upload füllt Interview Prep, Gap Analysis und die übrigen Tools automatisch aus.',
    upload: '.txt oder .pdf hochladen',
    reading: 'Wird gelesen...',
    resumePlaceholder: 'Oder fügen Sie hier den Text Ihres Lebenslaufs / CV ein...',
    resumeCaptured: 'Lebenslauf gespeichert',
    resumeCapturedWithCount: 'Lebenslauf gespeichert - {count} Zeichen',
    resumeLater: 'Sie können diesen Schritt überspringen und die Datei später in Settings hochladen.',
    pdfNoReadableText: '[Die PDF enthielt keinen lesbaren Text. Fügen Sie ihn unten ein.]',
    resumeReadError: '[Die Datei konnte nicht gelesen werden. Bitte fügen Sie Ihren Lebenslauf unten ein.]',
    activateTitle: 'JobSensei AI aktivieren',
    activateSubtitle: 'Wählen Sie, wie Sie die AI-Funktionen aktivieren möchten.',
    supporter: 'Unterstützung über Buy Me a Coffee',
    verified: 'Verifiziert. Die AI läuft über JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Sie haben bereits Zugriff? Geben Sie unten Ihren Code ein.',
    accessPlaceholder: 'Zugangscode eingeben...',
    activateAccess: 'Zugang aktivieren',
    verifying: 'Wird geprüft...',
    accessManage: 'Nach der Aktivierung können Sie den Zugriff in Settings verwalten.',
    skip: 'Vorerst überspringen',
    back: 'Zurück',
    next: 'Weiter',
    getStarted: 'Loslegen',
  },
}

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

function getCopy(language) {
  return ONBOARDING_COPY[language] || ONBOARDING_COPY[language?.split('-')?.[0]] || ONBOARDING_COPY.en
}

export default function OnboardingWizard() {
  const { saveProfile } = useApp()
  const { saveConfig, PROVIDERS, PROVIDER_CONFIGS, verifyBmac } = useAI()
  const { updateProjectData } = useProject()
  const { language, setLanguage, languages } = useLanguage()
  const copy = getCopy(language)
  const tt = (key, vars) => interpolate(copy[key] || ONBOARDING_COPY.en[key] || key, vars)

  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: '',
    currentRole: '',
    targetRole: '',
    provider: PROVIDERS.DEEPSEEK,
    apiKey: '',
    model: PROVIDER_CONFIGS[PROVIDERS.DEEPSEEK].defaultModel,
    customBaseUrl: '',
    resume: '',
  })
  const [extractingResume, setExtractingResume] = useState(false)
  const resumeFileRef = useRef(null)
  const [bmacInput, setBmacInput] = useState('')
  const [bmacLoading, setBmacLoading] = useState(false)
  const [bmacError, setBmacError] = useState('')
  const [bmacVerified, setBmacVerified] = useState(false)

  async function handleBmacVerify() {
    if (!bmacInput.trim()) return
    setBmacLoading(true); setBmacError('')
    try {
      await verifyBmac(bmacInput.trim())
      setBmacVerified(true)
    } catch (e) {
      setBmacError(e.message)
    }
    setBmacLoading(false)
  }

  function update(k, v) { setData(d => ({ ...d, [k]: v })) }

  async function handleOnboardingResumeFile(e) {
    const file = e.target.files[0]; if (!file) return
    setExtractingResume(true)
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        update('resume', await file.text())
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map(item => item.str).join(' ') + '\n'
        }
        update('resume', fullText.trim().replace(/\s{3,}/g, '\n') || tt('pdfNoReadableText'))
      } else {
        update('resume', (await file.text()).replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'))
      }
    } catch {
      update('resume', tt('resumeReadError'))
    }
    setExtractingResume(false)
    e.target.value = ''
  }

  function finish() {
    saveProfile({
      name: data.name,
      currentRole: data.currentRole,
      targetRole: data.targetRole,
      experience: '',
      industry: '',
      targetIndustries: '',
      targetCompanies: '',
    })
    saveConfig({ provider: data.provider, apiKey: data.apiKey, model: data.model, customBaseUrl: data.customBaseUrl })
    if (data.resume?.trim()) updateProjectData('resume', data.resume)
  }

  const steps = [
    {
      title: tt('profileTitle'),
      subtitle: tt('profileSubtitle'),
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">{tt('languageLabel')}</label>
            <div className="relative">
              <Languages size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none" />
              <select className="input-field pl-11" value={language} onChange={e => setLanguage(e.target.value)}>
                {languages.map(option => (
                  <option key={option.code} value={option.code}>{option.nativeLabel}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">{tt('nameLabel')}</label>
            <input className="input-field" placeholder={tt('namePlaceholder')} value={data.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">{tt('currentRoleLabel')}</label>
            <input className="input-field" placeholder={tt('currentRolePlaceholder')} value={data.currentRole} onChange={e => update('currentRole', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">{tt('targetRoleLabel')}</label>
            <input className="input-field" placeholder={tt('targetRolePlaceholder')} value={data.targetRole} onChange={e => update('targetRole', e.target.value)} />
          </div>
        </div>
      )
    },
    {
      title: tt('resumeTitle'),
      subtitle: tt('resumeSubtitle'),
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => resumeFileRef.current?.click()}
              className="btn-secondary flex-1 justify-center"
            >
              <Upload size={14} />
              {extractingResume ? tt('reading') : tt('upload')}
            </button>
            <input
              ref={resumeFileRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,.rtf"
              className="hidden"
              onChange={handleOnboardingResumeFile}
            />
          </div>
          <textarea
            className="textarea-field h-32 text-xs"
            placeholder={tt('resumePlaceholder')}
            value={data.resume}
            onChange={e => update('resume', e.target.value)}
          />
          {data.resume?.trim() ? (
            <p className="text-teal-400 text-xs text-center flex items-center justify-center gap-1.5">
              <Check size={13} /> {tt('resumeCapturedWithCount', { count: data.resume.length.toLocaleString() })}
            </p>
          ) : (
            <p className="text-slate-500 text-xs text-center">
              {tt('resumeLater')}
            </p>
          )}
        </div>
      )
    },
    {
      title: tt('activateTitle'),
      subtitle: tt('activateSubtitle'),
      content: (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 space-y-3 ${bmacVerified ? 'border-green-500/30 bg-green-500/5' : 'border-teal-500/20'}`}>
            <div className="flex items-center gap-2">
              <Coffee size={15} className="text-yellow-400" />
              <span className="font-display font-semibold text-white text-sm">{tt('supporter')}</span>
            </div>
            {bmacVerified ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={15}/> {tt('verified')}
              </div>
            ) : (
              <>
                <a
                  href="https://buymeacoffee.com/niksales73l/e/515014"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center bg-yellow-500 hover:bg-yellow-400 text-black border-0"
                >
                  <Coffee size={14}/> {tt('buy')}
                </a>
                <p className="text-slate-400 text-xs text-center">{tt('already')}</p>
                <input
                  className="input-field text-sm"
                  type="text"
                  placeholder={tt('accessPlaceholder')}
                  value={bmacInput}
                  onChange={e => { setBmacInput(e.target.value); setBmacError('') }}
                />
                <button
                  onClick={handleBmacVerify}
                  disabled={!bmacInput.trim() || bmacLoading}
                  className="btn-primary w-full justify-center"
                >
                  <Coffee size={14}/> {bmacLoading ? tt('verifying') : tt('activateAccess')}
                </button>
                {bmacError && <p className="text-red-400 text-xs">{bmacError}</p>}
              </>
            )}
          </div>

          <p className="text-slate-600 text-xs text-center">{tt('accessManage')}</p>
        </div>
      )
    },
  ]

  return (
    <div className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="onboarding-panel bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl animate-in">
        <div className="onboarding-header p-6 border-b border-navy-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-xl">{tt('welcome')}</h2>
              <p className="text-slate-400 text-xs">{tt('tagline')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-teal-500' : 'bg-navy-600'}`} />
            ))}
          </div>
        </div>

        <div className="onboarding-body p-6">
          <h3 className="font-display font-semibold text-white text-lg mb-1">{steps[step].title}</h3>
          <p className="text-slate-400 text-sm mb-5">{steps[step].subtitle}</p>
          {steps[step].content}
        </div>

        <div className="onboarding-footer px-6 pb-6 flex items-center justify-between">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="btn-ghost"><ChevronLeft size={16} /> {tt('back')}</button>
            : <button onClick={finish} className="text-slate-500 text-sm hover:text-slate-300 transition-colors">{tt('skip')}</button>
          }
          {step < steps.length - 1
            ? <button onClick={() => setStep(s => s + 1)} className="btn-primary">{tt('next')} <ChevronRight size={16} /></button>
            : <button onClick={finish} className="btn-primary"><Check size={16} /> {tt('getStarted')}</button>
          }
        </div>
      </div>
    </div>
  )
}
