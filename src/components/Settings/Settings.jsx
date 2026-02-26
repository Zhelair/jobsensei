import React, { useState } from 'react'
import { useAI } from '../../context/AIContext'
import { useApp } from '../../context/AppContext'
import { Zap, Check, Trash2, Eye, EyeOff, GraduationCap } from 'lucide-react'

export default function Settings() {
  const { provider, model, apiKey, customBaseUrl, isConnected, saveConfig, PROVIDERS, PROVIDER_CONFIGS, callAI } = useAI()
  const { profile, saveProfile, setShowOnboarding } = useApp()

  const [form, setForm] = useState({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)

  function update(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'provider') {
      setForm(f => ({ ...f, provider: v, model: PROVIDER_CONFIGS[v].defaultModel }))
    }
  }

  async function testConnection() {
    setTesting(true); setTestResult(null)
    // Temporarily apply form values
    const tempCfg = { ...form }
    const cfg = PROVIDER_CONFIGS[tempCfg.provider]
    const baseUrl = tempCfg.provider === PROVIDERS.CUSTOM ? tempCfg.customBaseUrl : cfg.baseUrl

    try {
      const isAnthropic = tempCfg.provider === PROVIDERS.ANTHROPIC
      const endpoint = isAnthropic ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`
      const headers = isAnthropic
        ? { 'Content-Type': 'application/json', 'x-api-key': tempCfg.apiKey, 'anthropic-version': '2023-06-01' }
        : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempCfg.apiKey}` }
      const body = isAnthropic
        ? { model: tempCfg.model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
        : { model: tempCfg.model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
      setTestResult(res.ok ? 'success' : 'error')
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }

  function save() {
    saveConfig(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function clearAllData() {
    if (confirm('This will clear ALL JobSensei data (sessions, topics, applications, notes). Are you sure?')) {
      const keys = ['js_profile', 'js_stats', 'js_ai_config', 'js_onboarding_done', 'js_interview_sessions', 'js_topics', 'js_applications', 'js_company_notes', 'js_star_stories']
      keys.forEach(k => localStorage.removeItem(k))
      window.location.reload()
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <h2 className="section-title mb-1">Settings</h2>
      <p className="section-sub mb-6">Configure your AI provider and preferences.</p>

      {/* AI Config */}
      <div className="card mb-4">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-teal-400" /> AI Configuration
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Provider</label>
            <select className="input-field" value={form.provider} onChange={e => update('provider', e.target.value)}>
              {Object.entries(PROVIDER_CONFIGS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">API Key</label>
            <div className="relative">
              <input
                className="input-field pr-10 font-mono text-xs"
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your API key..."
                value={form.apiKey}
                onChange={e => update('apiKey', e.target.value)}
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
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

          {/* Provider hints */}
          <div className="bg-navy-900 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <div><span className="text-slate-400">DeepSeek:</span> deepseek-chat / deepseek-reasoner</div>
            <div><span className="text-slate-400">OpenAI:</span> gpt-4o / gpt-4o-mini / gpt-4-turbo</div>
            <div><span className="text-slate-400">Anthropic:</span> claude-sonnet-4-6 / claude-haiku-4-5-20251001</div>
          </div>

          <div className="flex gap-2">
            <button onClick={testConnection} disabled={!form.apiKey || testing} className="btn-secondary flex-1 justify-center">
              <Zap size={14} /> {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button onClick={save} className={`btn-primary flex-1 justify-center ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
              {saved ? <><Check size={14} /> Saved!</> : 'Save Config'}
            </button>
          </div>

          {testResult === 'success' && <p className="text-green-400 text-sm text-center">✅ Connection successful!</p>}
          {testResult === 'error' && <p className="text-red-400 text-sm text-center">❌ Failed. Check your API key and model name.</p>}
        </div>
      </div>

      {/* Profile */}
      <div className="card mb-4">
        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
          <GraduationCap size={16} className="text-teal-400" /> Your Profile
        </h3>
        {profile ? (
          <div className="space-y-1 text-sm mb-3">
            <div><span className="text-slate-400">Name:</span> <span className="text-white">{profile.name || '—'}</span></div>
            <div><span className="text-slate-400">Role:</span> <span className="text-white">{profile.currentRole || '—'}</span></div>
            <div><span className="text-slate-400">Target:</span> <span className="text-white">{profile.targetRole || '—'}</span></div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm mb-3">No profile set up yet.</p>
        )}
        <button onClick={() => setShowOnboarding(true)} className="btn-secondary text-sm">
          {profile ? 'Edit Profile' : 'Set Up Profile'}
        </button>
      </div>

      {/* Data */}
      <div className="card border-red-500/20">
        <h3 className="font-display font-semibold text-white mb-3">Data Management</h3>
        <p className="text-slate-400 text-sm mb-3">All data is stored locally in your browser. Export a backup anytime from Job Tracker.</p>
        <button onClick={clearAllData} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 size={14} /> Clear All Data
        </button>
      </div>

      {/* About */}
      <div className="card mt-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center mx-auto mb-2">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div className="font-display font-bold text-white mb-1">JobSensei v1.0</div>
        <p className="text-slate-500 text-xs">Open source · No backend · Your data stays yours</p>
        <p className="text-slate-600 text-xs mt-1">Built with React + Vite + Tailwind</p>
      </div>
    </div>
  )
}
