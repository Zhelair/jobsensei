import React, { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import { GraduationCap, ChevronRight, ChevronLeft, Check, Upload, Coffee, Languages, FolderOpen } from 'lucide-react'

const ONBOARDING_COPY = {
  en: {
    welcome: 'Welcome to JobSensei',
    tagline: 'Your AI-powered job hunt companion',
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
    projectHintCopy: 'Use Projects at the bottom-left on desktop, or the Projects tab in the mobile bottom bar, to create a new job-search workspace.',
    resumeTitle: 'Upload your Resume / CV',
    resumeSubtitle: 'One upload fills Interview Prep, Gap Analysis, and all tools automatically.',
    upload: 'Upload .txt or .pdf',
    reading: 'Reading...',
    resumePlaceholder: 'Or paste your resume / CV text here...',
    resumeCaptured: 'Resume captured',
    resumeLater: 'You can skip this and upload it later in Settings.',
    activateTitle: 'Activate JobSensei AI',
    activateSubtitle: 'Choose how to power the AI features.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Verified! AI powered by JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Already a supporter? Enter your access code below.',
    accessPlaceholder: 'Enter your access code...',
    activateAccess: 'Activate Access',
    verifying: 'Verifying...',
    accessManage: 'Once active, you can manage access in Settings.',
    skip: 'Skip for now',
    back: 'Back',
    next: 'Next',
    getStarted: 'Get Started',
  },
  ru: {
    welcome: 'Добро пожаловать в JobSensei',
    tagline: 'Ваш AI-помощник для поиска работы',
    profileTitle: 'Настройте workspace',
    profileSubtitle: 'Выберите язык и добавьте базовые данные, которые JobSensei должен помнить.',
    languageLabel: 'Язык интерфейса',
    nameLabel: 'Ваше имя',
    namePlaceholder: 'Иван',
    currentRoleLabel: 'Текущая роль',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Целевая роль',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Проекты находятся в боковом меню',
    projectHintCopy: 'На desktop используйте Projects внизу слева, а на mobile вкладку Projects в нижнем меню, чтобы создать новый workspace.',
    resumeTitle: 'Загрузите резюме / CV',
    resumeSubtitle: 'Одна загрузка заполнит Interview Prep, Gap Analysis и все инструменты автоматически.',
    upload: 'Загрузить .txt или .pdf',
    reading: 'Читаю...',
    resumePlaceholder: 'Или вставьте текст резюме / CV здесь...',
    resumeCaptured: 'Резюме сохранено',
    resumeLater: 'Можно пропустить и загрузить позже в Settings.',
    activateTitle: 'Активируйте JobSensei AI',
    activateSubtitle: 'Выберите, как включить AI-функции.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Проверено! AI работает через JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Уже есть доступ? Введите код ниже.',
    accessPlaceholder: 'Введите код доступа...',
    activateAccess: 'Активировать доступ',
    verifying: 'Проверяю...',
    accessManage: 'После активации доступ можно настроить в Settings.',
    skip: 'Пропустить',
    back: 'Назад',
    next: 'Далее',
    getStarted: 'Начать',
  },
  bg: {
    welcome: 'Добре дошъл в JobSensei',
    tagline: 'Твоят AI помощник за търсене на работа',
    profileTitle: 'Настрой workspace-а',
    profileSubtitle: 'Избери език и добави основните данни, които JobSensei да помни.',
    languageLabel: 'Език на интерфейса',
    nameLabel: 'Твоето име',
    namePlaceholder: 'Иван',
    currentRoleLabel: 'Текуща роля',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Целева роля',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Проектите са в страничното меню',
    projectHintCopy: 'На desktop използвай Projects долу вляво, а на mobile Projects в долната навигация, за да създадеш нов workspace.',
    resumeTitle: 'Качи резюме / CV',
    resumeSubtitle: 'Едно качване попълва Interview Prep, Gap Analysis и всички инструменти автоматично.',
    upload: 'Качи .txt или .pdf',
    reading: 'Чета...',
    resumePlaceholder: 'Или постави текста на резюмето / CV тук...',
    resumeCaptured: 'Резюмето е запазено',
    resumeLater: 'Можеш да пропуснеш и да го качиш по-късно в Settings.',
    activateTitle: 'Активирай JobSensei AI',
    activateSubtitle: 'Избери как да захраниш AI функциите.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Потвърдено! AI работи през JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Вече имаш достъп? Въведи кода по-долу.',
    accessPlaceholder: 'Въведи код за достъп...',
    activateAccess: 'Активирай достъп',
    verifying: 'Проверявам...',
    accessManage: 'След активиране можеш да управляваш достъпа в Settings.',
    skip: 'Пропусни',
    back: 'Назад',
    next: 'Напред',
    getStarted: 'Започни',
  },
  es: {
    welcome: 'Bienvenido a JobSensei',
    tagline: 'Tu compañero AI para buscar trabajo',
    profileTitle: 'Configura tu workspace',
    profileSubtitle: 'Elige tu idioma y añade lo básico que JobSensei debe recordar.',
    languageLabel: 'Idioma de interfaz',
    nameLabel: 'Tu nombre',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Rol actual',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Rol objetivo',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Los proyectos están en la barra lateral',
    projectHintCopy: 'En desktop usa Projects abajo a la izquierda; en mobile usa Projects en la barra inferior para crear un nuevo workspace.',
    resumeTitle: 'Sube tu Resume / CV',
    resumeSubtitle: 'Una subida rellena Interview Prep, Gap Analysis y todas las herramientas automáticamente.',
    upload: 'Subir .txt o .pdf',
    reading: 'Leyendo...',
    resumePlaceholder: 'O pega aquí el texto de tu resume / CV...',
    resumeCaptured: 'Resume guardado',
    resumeLater: 'Puedes saltarlo y subirlo más tarde en Settings.',
    activateTitle: 'Activa JobSensei AI',
    activateSubtitle: 'Elige cómo activar las funciones AI.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Verificado. AI funciona con JobSensei.',
    buy: 'Buy Me a Coffee',
    already: '¿Ya tienes acceso? Introduce tu código abajo.',
    accessPlaceholder: 'Introduce tu código de acceso...',
    activateAccess: 'Activar acceso',
    verifying: 'Verificando...',
    accessManage: 'Una vez activo, puedes gestionar el acceso en Settings.',
    skip: 'Saltar por ahora',
    back: 'Atrás',
    next: 'Siguiente',
    getStarted: 'Empezar',
  },
  fr: {
    welcome: 'Bienvenue dans JobSensei',
    tagline: 'Votre compagnon AI pour la recherche d’emploi',
    profileTitle: 'Configurez votre workspace',
    profileSubtitle: 'Choisissez la langue et ajoutez les bases que JobSensei doit retenir.',
    languageLabel: 'Langue de l’interface',
    nameLabel: 'Votre nom',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Poste actuel',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Poste cible',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Les projets sont dans la barre latérale',
    projectHintCopy: 'Sur desktop, utilisez Projects en bas à gauche. Sur mobile, utilisez Projects dans la barre du bas pour créer un nouveau workspace.',
    resumeTitle: 'Téléversez votre Resume / CV',
    resumeSubtitle: 'Un seul fichier remplit automatiquement Interview Prep, Gap Analysis et tous les outils.',
    upload: 'Téléverser .txt ou .pdf',
    reading: 'Lecture...',
    resumePlaceholder: 'Ou collez le texte de votre resume / CV ici...',
    resumeCaptured: 'Resume enregistré',
    resumeLater: 'Vous pouvez ignorer cette étape et le téléverser plus tard dans Settings.',
    activateTitle: 'Activez JobSensei AI',
    activateSubtitle: 'Choisissez comment alimenter les fonctions AI.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Vérifié. AI est alimentée par JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Vous avez déjà accès ? Entrez votre code ci-dessous.',
    accessPlaceholder: 'Entrez votre code d’accès...',
    activateAccess: 'Activer l’accès',
    verifying: 'Vérification...',
    accessManage: 'Une fois actif, vous pouvez gérer l’accès dans Settings.',
    skip: 'Ignorer',
    back: 'Retour',
    next: 'Suivant',
    getStarted: 'Commencer',
  },
  it: {
    welcome: 'Benvenuto in JobSensei',
    tagline: 'Il tuo compagno AI per la ricerca di lavoro',
    profileTitle: 'Configura il workspace',
    profileSubtitle: 'Scegli la lingua e aggiungi le basi che JobSensei deve ricordare.',
    languageLabel: 'Lingua interfaccia',
    nameLabel: 'Il tuo nome',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Ruolo attuale',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Ruolo target',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'I progetti sono nella sidebar',
    projectHintCopy: 'Su desktop usa Projects in basso a sinistra; su mobile usa Projects nella barra inferiore per creare un nuovo workspace.',
    resumeTitle: 'Carica Resume / CV',
    resumeSubtitle: 'Un solo upload compila automaticamente Interview Prep, Gap Analysis e tutti gli strumenti.',
    upload: 'Carica .txt o .pdf',
    reading: 'Lettura...',
    resumePlaceholder: 'Oppure incolla qui il testo del resume / CV...',
    resumeCaptured: 'Resume salvato',
    resumeLater: 'Puoi saltare questo passaggio e caricarlo più tardi in Settings.',
    activateTitle: 'Attiva JobSensei AI',
    activateSubtitle: 'Scegli come alimentare le funzioni AI.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Verificato. AI alimentata da JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Hai già accesso? Inserisci il codice qui sotto.',
    accessPlaceholder: 'Inserisci il codice di accesso...',
    activateAccess: 'Attiva accesso',
    verifying: 'Verifica...',
    accessManage: 'Una volta attivo, puoi gestire l’accesso in Settings.',
    skip: 'Salta',
    back: 'Indietro',
    next: 'Avanti',
    getStarted: 'Inizia',
  },
  pt: {
    welcome: 'Bem-vindo ao JobSensei',
    tagline: 'O seu companheiro AI para procurar emprego',
    profileTitle: 'Configure o workspace',
    profileSubtitle: 'Escolha o idioma e adicione o básico que o JobSensei deve lembrar.',
    languageLabel: 'Idioma da interface',
    nameLabel: 'O seu nome',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Cargo atual',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Cargo alvo',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Os projetos ficam na barra lateral',
    projectHintCopy: 'No desktop use Projects no canto inferior esquerdo; no mobile use Projects na barra inferior para criar um novo workspace.',
    resumeTitle: 'Carregue o Resume / CV',
    resumeSubtitle: 'Um upload preenche automaticamente Interview Prep, Gap Analysis e todas as ferramentas.',
    upload: 'Carregar .txt ou .pdf',
    reading: 'A ler...',
    resumePlaceholder: 'Ou cole aqui o texto do seu resume / CV...',
    resumeCaptured: 'Resume guardado',
    resumeLater: 'Pode saltar isto e carregar mais tarde em Settings.',
    activateTitle: 'Ativar JobSensei AI',
    activateSubtitle: 'Escolha como alimentar as funções AI.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Verificado. AI alimentada pelo JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Já tem acesso? Introduza o código abaixo.',
    accessPlaceholder: 'Introduza o código de acesso...',
    activateAccess: 'Ativar acesso',
    verifying: 'A verificar...',
    accessManage: 'Depois de ativo, pode gerir o acesso em Settings.',
    skip: 'Saltar por agora',
    back: 'Voltar',
    next: 'Seguinte',
    getStarted: 'Começar',
  },
  pl: {
    welcome: 'Witamy w JobSensei',
    tagline: 'Twój AI pomocnik w szukaniu pracy',
    profileTitle: 'Skonfiguruj workspace',
    profileSubtitle: 'Wybierz język i dodaj podstawowe dane, które JobSensei ma pamiętać.',
    languageLabel: 'Język interfejsu',
    nameLabel: 'Twoje imię',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Obecna rola',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Rola docelowa',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Projekty są w panelu bocznym',
    projectHintCopy: 'Na desktopie użyj Projects w lewym dolnym rogu, a na mobile Projects na dolnym pasku, aby utworzyć nowy workspace.',
    resumeTitle: 'Prześlij Resume / CV',
    resumeSubtitle: 'Jeden upload automatycznie wypełnia Interview Prep, Gap Analysis i wszystkie narzędzia.',
    upload: 'Prześlij .txt lub .pdf',
    reading: 'Czytam...',
    resumePlaceholder: 'Albo wklej tutaj tekst resume / CV...',
    resumeCaptured: 'Resume zapisane',
    resumeLater: 'Możesz to pominąć i przesłać później w Settings.',
    activateTitle: 'Aktywuj JobSensei AI',
    activateSubtitle: 'Wybierz, jak zasilić funkcje AI.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Zweryfikowano. AI działa przez JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Masz już dostęp? Wpisz kod poniżej.',
    accessPlaceholder: 'Wpisz kod dostępu...',
    activateAccess: 'Aktywuj dostęp',
    verifying: 'Sprawdzam...',
    accessManage: 'Po aktywacji możesz zarządzać dostępem w Settings.',
    skip: 'Pomiń',
    back: 'Wstecz',
    next: 'Dalej',
    getStarted: 'Start',
  },
  de: {
    welcome: 'Willkommen bei JobSensei',
    tagline: 'Ihr AI-Begleiter für die Jobsuche',
    profileTitle: 'Workspace einrichten',
    profileSubtitle: 'Wählen Sie die Sprache und fügen Sie die Basisdaten hinzu, die JobSensei speichern soll.',
    languageLabel: 'Oberflächensprache',
    nameLabel: 'Ihr Name',
    namePlaceholder: 'Ivan',
    currentRoleLabel: 'Aktuelle Rolle',
    currentRolePlaceholder: 'Marketing Manager',
    targetRoleLabel: 'Zielrolle',
    targetRolePlaceholder: 'Financial Crime Analyst',
    projectHintTitle: 'Projekte sind in der Seitenleiste',
    projectHintCopy: 'Auf desktop nutzen Sie Projects unten links, auf mobile Projects in der unteren Leiste, um einen neuen workspace zu erstellen.',
    resumeTitle: 'Resume / CV hochladen',
    resumeSubtitle: 'Ein Upload füllt Interview Prep, Gap Analysis und alle Tools automatisch.',
    upload: '.txt oder .pdf hochladen',
    reading: 'Lese...',
    resumePlaceholder: 'Oder fügen Sie den Text Ihres resume / CV hier ein...',
    resumeCaptured: 'Resume gespeichert',
    resumeLater: 'Sie können dies überspringen und später in Settings hochladen.',
    activateTitle: 'JobSensei AI aktivieren',
    activateSubtitle: 'Wählen Sie, wie die AI-Funktionen betrieben werden.',
    supporter: 'Buy Me a Coffee Supporter',
    verified: 'Verifiziert. AI läuft über JobSensei.',
    buy: 'Buy Me a Coffee',
    already: 'Schon Zugriff? Geben Sie unten Ihren Code ein.',
    accessPlaceholder: 'Zugriffscode eingeben...',
    activateAccess: 'Zugriff aktivieren',
    verifying: 'Prüfe...',
    accessManage: 'Nach der Aktivierung können Sie den Zugriff in Settings verwalten.',
    skip: 'Überspringen',
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
        update('resume', fullText.trim().replace(/\s{3,}/g, '\n') || '[PDF had no readable text. Paste below.]')
      } else {
        update('resume', (await file.text()).replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'))
      }
    } catch {
      update('resume', '[Could not read file. Please paste your resume below.]')
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
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 flex items-start gap-3">
            <FolderOpen size={16} className="text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-display font-semibold mb-1">{tt('projectHintTitle')}</div>
              <p className="text-slate-400 text-xs leading-relaxed">{tt('projectHintCopy')}</p>
            </div>
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
              <Check size={13} /> {tt('resumeCaptured')} - {data.resume.length.toLocaleString()} characters
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
