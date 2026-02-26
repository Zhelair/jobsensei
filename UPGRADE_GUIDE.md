# JobSensei v1.1 — Upgrade Guide

## How to upgrade from v1.0

1. **Download** `jobsensei-v1.1.zip` and extract it
2. **Copy your new files** into your existing GitHub repo folder (overwrite everything)
3. `git add . && git commit -m "v1.1 - Projects, Voice, Export, Resume" && git push`
4. Vercel rebuilds automatically in ~1 min ✅

> Your existing data is safe — v1.1 automatically migrates your old localStorage into a "My Job Search" default project on first load.

---

## What's new in v1.1

### 🗂 Projects System
- Named workspaces (e.g. "Revolut Application", "Startup Search")
- Each project has its own: Interview history, Gap Analysis results, Job Tracker, STAR stories, Resume, Notes
- Switch projects from the **sidebar** (bottom left)
- Create, rename, delete projects
- Export a single project or ALL projects as JSON backup
- Import projects from JSON file

### 📤 Export / Import Everywhere
- **Job Tracker**: Export to CSV (opens in Excel) or JSON
- **Job Tracker**: Import from JSON (merge with existing)
- **Gap Analysis**: Save results to project, view history, delete old analyses
- **Projects**: Full backup/restore as single JSON file

### 🎙 Voice Mode
- **Interview Simulator**: Mic button — speak your answers, see live transcript
- **Negotiation Sim**: Same voice input
- Toggle voice mode on/off per session
- Real-time interim transcript preview while speaking

### 🔊 Better TTS Voice
- Automatically picks best English voice on your device
- Prefers: Google UK English Female → Samantha → Karen → Daniel
- Better rate/pitch settings (more natural sounding)
- Strips markdown before speaking (no more "asterisk asterisk")

### 📄 Resume Upload
- Upload .txt file or paste resume text in **Settings**
- Saved per project (different resume per job search)
- Auto-fills "Your background" in: Interview Sim, Gap Analysis, Tools
- PDF tip: copy-paste from your PDF viewer for best results

### 📚 Learning — Full Topic Management
- **Add** any topic (not just FRAML — Marketing, Sales, Technical, etc.)
- **Edit** existing topics (title, category, difficulty)
- **Delete** topics
- Load starter FRAML topics or build from scratch
- Gap Analysis results now saved to project with history

### 🐛 Bug Fixes
- Job Tracker cards: stage dropdown is now more prominent
- Session data no longer lost when switching pages (all in project)
- Dashboard shows project-specific stats

---

## API Key reminder
After deploying, go to **Settings** → paste your API key → Save & Test.
Your key is stored locally in browser — never on any server.
