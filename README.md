# 🎓 JobSensei

**Your AI-powered job hunt companion.** Mock interviews, gap analysis, learning, negotiation practice, and application tracking — all in the browser. No backend, no data collection, your API key stays on your device.

---

## ✨ Features

| Feature | What it does |
|---|---|
| 🎤 **Interview Simulator** | Roleplay with an AI hiring manager. 4 modes: HR Screen, Technical, Competency-Based, Stress. Voice input supported. |
| 🔍 **Gap Analysis** | JD vs your background → structured gap report, match score, red flag detection |
| 📚 **Learning Section** | Topic cards, AI tutor, quizzes with spaced repetition (SM-2 algorithm) |
| ⭐ **STAR Builder** | Build polished STAR answers from rough notes. Story bank to save them. |
| 💰 **Negotiation Sim** | Roleplay salary negotiation. Includes tactics reference. |
| 🛠️ **Tools** | Question Predictor, Tone Analyzer, Follow-up Email Generator, Elevator Pitch Builder |
| 📊 **Job Tracker** | Kanban board, company notes wiki, conversion stats |

---

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/jobsensei.git
cd jobsensei
npm install

# Run locally
npm run dev
```

Then open `http://localhost:5173`, go through the 3-step onboarding, and paste your API key.

---

## 🔑 API Key Setup

JobSensei works with any of these providers. You need an API key from one of them:

| Provider | Get key at | Default model |
|---|---|---|
| **DeepSeek** (recommended — cheap & great) | platform.deepseek.com | deepseek-chat |
| **OpenAI** | platform.openai.com | gpt-4o |
| **Anthropic** | console.anthropic.com | claude-sonnet-4-6 |
| **Custom** | Any OpenAI-compatible endpoint | your choice |

Your key is stored in your browser's `localStorage` only — it never leaves your device except when calling the AI provider you chose.

---

## 🌐 Deploy to GitHub Pages

```bash
npm run build
# Then deploy the /dist folder to GitHub Pages
```

Add to `vite.config.js`:
```js
base: '/jobsensei/', // replace with your repo name
```

Or deploy instantly to **Vercel** — just connect your repo, zero config needed.

---

## 📱 Mobile

Works in Chrome/Edge/Safari on mobile. Voice input is supported on Chrome and Edge.

---

## 🔐 Privacy

- **Zero backend.** No server, no database.
- **Your data lives in your browser.** localStorage only.
- **Your API key** is only ever sent to the AI provider you configure.
- **No analytics, no tracking, no cookies.**
- Tip: use a professional summary for your profile. Avoid pasting your full legal name, address, or ID numbers into the app.

---

## 🛠️ Tech Stack

- React 18 + Vite
- Tailwind CSS
- Web Speech API (voice — no cost, browser native)
- Lucide React icons
- SM-2 spaced repetition algorithm

---

## 📋 Roadmap

**v2 (coming):** PDF export, Company Research (Perplexity), multi-language (🇷🇺 🇧🇬 🇬🇧), Cover Letter Generator, browser extension for JD capture

---

## 📄 License

MIT — use it, fork it, build on it.
