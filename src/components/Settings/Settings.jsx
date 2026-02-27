import React, { useState, useRef } from 'react'
import { useAI } from '../../context/AIContext'
import { useApp } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { Zap, Check, Trash2, Eye, EyeOff, GraduationCap, FileText, Upload, Download, X, Image } from 'lucide-react'
import DeepSeekGuide from './DeepSeekGuide'

export default function Settings() {
  const { provider, model, apiKey, customBaseUrl, saveConfig, PROVIDERS, PROVIDER_CONFIGS, callAI } = useAI()
  const { profile, saveProfile, setShowOnboarding } = useApp()
  const { activeProject, getProjectData, updateProjectData, exportProject, exportAll, importProjects } = useProject()

  const [form, setForm] = useState({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)

  // Resume state
  const resume = getProjectData('resume')
  const [resumeText, setResumeText] = useState(resume || '')
  const [resumeSaved, setResumeSaved] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef(null)
  const imageRef = useRef(null)
  const importRef = useRef(null)
  const [importMsg, setImportMsg] = useState('')
  const [imageAnalysis, setImageAnalysis] = useState('')
  const [analyzingImage, setAnalyzingImage] = useState(false)

  function update(k, v) {
    if (k === 'provider') {
      setForm(f => ({ ...f, provider: v, model: PROVIDER_CONFIGS[v].defaultModel }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  async function testConnection() {
    setTesting(true); setTestResult(null)
    const cfg = PROVIDER_CONFIGS[form.provider]
    const baseUrl = form.provider === PROVIDERS.CUSTOM ? form.customBaseUrl : cfg.baseUrl
    try {
      const isAnthropic = form.provider === PROVIDERS.ANTHROPIC
      const res = await fetch(
        isAnthropic ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: isAnthropic
            ? { 'Content-Type': 'application/json', 'x-api-key': form.apiKey, 'anthropic-version': '2023-06-01' }
            : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${form.apiKey}` },
          body: JSON.stringify(isAnthropic
            ? { model: form.model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
            : { model: form.model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
          ),
        }
      )
      setTestResult(res.ok ? 'success' : 'error')
    } catch { setTestResult('error') }
    setTesting(false)
  }

  function save() { saveConfig(form); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  function saveResume() {
    updateProjectData('resume', resumeText)
    setResumeSaved(true); setTimeout(() => setResumeSaved(false), 2000)
  }

  function clearResume() { setResumeText(''); updateProjectData('resume', '') }

  async function handleResumeFile(e) {
    const file = e.target.files[0]; if (!file) return
    setExtracting(true)
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        const text = await file.text()
        setResumeText(text)
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        // Use pdfjs-dist for real client-side PDF text extraction
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items.map(item => item.str).join(' ')
          fullText += pageText + '\n'
        }
        const cleaned = fullText.trim().replace(/\s{3,}/g, '\n')
        setResumeText(cleaned || '[PDF had no readable text. Please paste your resume below.]')
      } else {
        // Try to read as text anyway (for .doc plain text, .rtf, etc)
        const text = await file.text()
        setResumeText(text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'))
      }
    } catch (err) {
      console.error('Resume parse error:', err)
      setResumeText('[Could not read file. Please paste your resume text below.]')
    }
    setExtracting(false)
    e.target.value = ''
  }

  async function handleImageFile(e) {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) return
    setAnalyzingImage(true); setImageAnalysis('')
    try {
      // Convert to base64
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type

      const prompt = 'Analyze this resume/CV image. Describe: (1) Overall visual layout and structure, (2) Color scheme and use of color, (3) Font choices, sizes, and readability, (4) Use of white space and visual hierarchy, (5) Professional impression and any design red flags, (6) Specific improvements to the visual design. Be constructive and specific.'

      const userContent = provider === PROVIDERS.ANTHROPIC
        ? [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }, { type: 'text', text: prompt }]
        : [{ type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } }, { type: 'text', text: prompt }]

      const result = await callAI({
        systemPrompt: 'You are an expert resume designer and career coach. Analyze resume images for visual design quality, layout, and professional impact.',
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.5,
      })
      setImageAnalysis(result)
    } catch (err) {
      setImageAnalysis('⚠️ Image analysis requires a vision-capable model (OpenAI gpt-4o or Anthropic Claude). DeepSeek does not support image input.')
    }
    setAnalyzingImage(false)
    e.target.value = ''
  }

  async function handleImportProject(e) {
    const file = e.target.files[0]; if (!file) return
    try {
      const count = await importProjects(file)
      setImportMsg(`✅ Imported ${count} project${count > 1 ? 's' : ''}`)
    } catch { setImportMsg('❌ Invalid file format') }
    setTimeout(() => setImportMsg(''), 3000)
    e.target.value = ''
  }

  function clearAllData() {
    if (confirm('This will clear ALL JobSensei data. Are you sure?')) {
      ['js_profile','js_stats','js_ai_config','js_onboarding_done','js_projects','js_active_project',
       'js_interview_sessions','js_topics','js_applications','js_star_stories','js_company_notes'].forEach(k => localStorage.removeItem(k))
      window.location.reload()
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-in space-y-4">
      <h2 className="section-title mb-1">Settings</h2>
      <p className="section-sub">Configure AI, resume, and project settings.</p>

      {/* Guide — full width */}
      <DeepSeekGuide />

      {/* 2-col grid: AI config left, resume+project+profile right */}
      <div className="grid md:grid-cols-2 gap-4 items-start">

        {/* Left: AI Config */}
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><Zap size={16} className="text-teal-400"/> AI Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Provider</label>
              <select className="input-field" value={form.provider} onChange={e => update('provider', e.target.value)}>
                {Object.entries(PROVIDER_CONFIGS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">API Key</label>
              <div className="relative">
                <input className="input-field pr-10 font-mono text-xs" type={showKey ? 'text' : 'password'} placeholder="Enter your API key..." value={form.apiKey} onChange={e => update('apiKey', e.target.value)} />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showKey ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              <p className="text-slate-600 text-xs mt-1">Stored locally only. Never sent to our servers.</p>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Model</label>
              <input className="input-field font-mono text-xs" placeholder="e.g. deepseek-chat" value={form.model} onChange={e => update('model', e.target.value)} />
            </div>
            {form.provider === PROVIDERS.CUSTOM && (
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Custom Base URL</label>
                <input className="input-field font-mono text-xs" placeholder="https://..." value={form.customBaseUrl} onChange={e => update('customBaseUrl', e.target.value)} />
              </div>
            )}
            <div className="bg-navy-900 rounded-xl p-3 text-xs text-slate-500 space-y-1">
              <div><span className="text-slate-400">DeepSeek:</span> deepseek-chat / deepseek-reasoner</div>
              <div><span className="text-slate-400">OpenAI:</span> gpt-4o / gpt-4o-mini</div>
              <div><span className="text-slate-400">Anthropic:</span> claude-sonnet-4-6 / claude-haiku-4-5-20251001</div>
            </div>
            <div className="flex gap-2">
              <button onClick={testConnection} disabled={!form.apiKey || testing} className="btn-secondary flex-1 justify-center">
                <Zap size={14}/> {testing ? 'Testing...' : 'Test'}
              </button>
              <button onClick={save} className={`btn-primary flex-1 justify-center ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
                {saved ? <><Check size={14}/> Saved!</> : 'Save Config'}
              </button>
            </div>
            {testResult === 'success' && <p className="text-green-400 text-sm text-center">✅ Connected!</p>}
            {testResult === 'error' && <p className="text-red-400 text-sm text-center">❌ Failed. Check key and model name.</p>}
          </div>
        </div>

        {/* Right: Resume, Project, Profile stacked */}
        <div className="space-y-4">
          {/* Resume Upload */}
          <div className="card">
            <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2"><FileText size={16} className="text-teal-400"/> Resume / CV</h3>
            <p className="text-slate-400 text-xs mb-3">Saved per project. Auto-fills background fields in Interview, Gap Analysis, and Tools.</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs flex-1 justify-center">
                <Upload size={13}/> {extracting ? 'Reading...' : 'Upload (.txt, .pdf)'}
              </button>
              <button onClick={() => imageRef.current?.click()} className="btn-secondary text-xs flex-1 justify-center">
                <Image size={13}/> {analyzingImage ? 'Analyzing...' : 'Visual Review'}
              </button>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.rtf" className="hidden" onChange={handleResumeFile} />
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              {resumeText && <button onClick={clearResume} className="btn-ghost text-xs text-red-400 hover:text-red-300 px-2"><X size={14}/></button>}
            </div>
            <textarea
              className="textarea-field h-28 text-xs mb-3"
              placeholder="Or paste your resume/CV text here directly..."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
            <button onClick={saveResume} className={`btn-primary text-sm ${resumeSaved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
              {resumeSaved ? <><Check size={14}/> Saved!</> : 'Save Resume to Project'}
            </button>
            <p className="text-slate-600 text-xs mt-2">💡 PDF/text uploads extract the text. Photo upload uses AI vision (requires OpenAI or Anthropic).</p>
            {imageAnalysis && (
              <div className="mt-3 card border-indigo-500/20 bg-indigo-500/5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-display font-semibold text-white text-sm">📸 Visual Resume Analysis</h4>
                  <button onClick={() => setImageAnalysis('')} className="text-slate-500 hover:text-slate-300"><X size={13}/></button>
                </div>
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{imageAnalysis}</div>
              </div>
            )}
          </div>

          {/* Project management */}
          <div className="card">
            <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
              <GraduationCap size={16} className="text-teal-400"/> Project: {activeProject?.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => activeProject && exportProject(activeProject.id)} className="btn-secondary text-xs">
                <Download size={13}/> Export This
              </button>
              <button onClick={exportAll} className="btn-secondary text-xs">
                <Download size={13}/> Export All
              </button>
              <button onClick={() => importRef.current?.click()} className="btn-secondary text-xs">
                <Upload size={13}/> Import
              </button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportProject} />
            </div>
            {importMsg && <p className="text-xs mt-2">{importMsg}</p>}
            <p className="text-slate-600 text-xs mt-2">Use the project switcher in the sidebar to create, rename, or switch projects.</p>
          </div>

          {/* Profile */}
          <div className="card">
            <h3 className="font-display font-semibold text-white mb-3">Your Profile</h3>
            {profile ? (
              <div className="space-y-1 text-sm mb-3">
                <div><span className="text-slate-400">Name:</span> <span className="text-white">{profile.name || '—'}</span></div>
                <div><span className="text-slate-400">Role:</span> <span className="text-white">{profile.currentRole || '—'}</span></div>
                <div><span className="text-slate-400">Target:</span> <span className="text-white">{profile.targetRole || '—'}</span></div>
              </div>
            ) : <p className="text-slate-500 text-sm mb-3">No profile set.</p>}
            <button onClick={() => setShowOnboarding(true)} className="btn-secondary text-sm">{profile ? 'Edit Profile' : 'Set Up Profile'}</button>
          </div>
        </div>
      </div>

      {/* Full-width: danger + footer */}
      <div className="card border-red-500/20">
        <h3 className="font-display font-semibold text-white mb-2">Data Management</h3>
        <p className="text-slate-400 text-sm mb-3">All data is local. Export backups from the project switcher anytime.</p>
        <button onClick={clearAllData} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 size={14}/> Clear All Data
        </button>
      </div>

      <div className="card text-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center mx-auto mb-2">
          <GraduationCap size={20} className="text-white"/>
        </div>
        <div className="font-display font-bold text-white mb-1">JobSensei v1.1</div>
        <p className="text-slate-500 text-xs">Projects · Voice · Export/Import · Resume Upload</p>
      </div>
    </div>
  )
}
