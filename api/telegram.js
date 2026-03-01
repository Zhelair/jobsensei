// JobSensei Telegram Bot — Vercel serverless webhook handler
// Features: Onboarding with CV, 10 Questions (with resume + JD), Resume Checker, Interview Simulator
//
// Required Supabase columns on telegram_users table:
//   telegram_id BIGINT, first_name TEXT, target_role TEXT,
//   experience TEXT, current_step TEXT, resume_text TEXT, interview_state TEXT,
//   session_data JSONB

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean)
const CHANNEL_LINK = process.env.TELEGRAM_CHANNEL_LINK || 'https://t.me/your_channel'
const APP_LINK = 'https://jobsensei.app'

const DAILY_LIMIT_MSG = `⏰ *You've used your free tool for today!*

Come back tomorrow to try another one. 🗓️

*Want unlimited access? Try the JobSensei app — 20+ AI tools:*

🎤 *Interview Simulator* — practice with an AI hiring manager (HR, technical, competency, stress modes). Full voice mode — AI speaks, you reply aloud.
🔍 *Gap Analysis* — paste any job posting → get fit score, gaps & red-flag detection
💰 *Negotiation Simulator* — practice salary negotiation before the real call
⭐ *STAR Builder* — turn rough notes into polished interview answers
📚 *AI Tutor + quizzes* — actually learn the skills you need
🛠️ *11 more tools* — resume, LinkedIn, cover letters, question predictor & more
📋 *Job Tracker* — Kanban board for every application`

// --- Telegram API helpers ---

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

const sendMessage = (chatId, text, extra = {}) =>
  tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...extra })

const sendTyping = (chatId) =>
  tg('sendChatAction', { chat_id: chatId, action: 'typing' })

const answerCbq = (id) =>
  tg('answerCallbackQuery', { callback_query_id: id })

// Download a Telegram file and return its text content
async function downloadTelegramFile(fileId) {
  const res = await tg('getFile', { file_id: fileId })
  if (!res.ok) return null
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${res.result.file_path}`
  const fileRes = await fetch(url)
  return fileRes.text()
}

// --- Keyboards ---

const MAIN_MENU = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📝 10 Interview Questions', callback_data: 'tool_questions' }],
      [{ text: '📄 Resume Checker', callback_data: 'tool_resume' }],
      [{ text: '🎤 Interview Simulator', callback_data: 'tool_interview' }],
      [{ text: '🔄 Update My CV/Resume', callback_data: 'update_resume' }],
    ],
  },
}

const CTA_BUTTONS = {
  reply_markup: {
    inline_keyboard: [[
      { text: '🚀 Open JobSensei', url: APP_LINK },
      { text: '📲 Join Channel', url: CHANNEL_LINK },
    ]],
  },
}

const EXPERIENCE_BUTTONS = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔰 Fresher (0-1 yr)', callback_data: 'exp_fresher' }],
      [{ text: '🌱 Junior (1-3 yrs)', callback_data: 'exp_junior' }],
      [{ text: '🌿 Mid-level (3-7 yrs)', callback_data: 'exp_mid' }],
      [{ text: '🌳 Senior (7+ yrs)', callback_data: 'exp_senior' }],
    ],
  },
}

const SKIP_RESUME_BUTTON = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '⏭️ Skip for now', callback_data: 'skip_resume' }],
    ],
  },
}

const SKIP_JD_BUTTON = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '⏭️ Skip — generate without JD', callback_data: 'skip_jd' }],
    ],
  },
}

const STOP_INTERVIEW_BUTTON = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🛑 Stop Interview', callback_data: 'stop_interview' }],
    ],
  },
}

const EXP_LABELS = {
  exp_fresher: 'Fresher (0-1 yr)',
  exp_junior: 'Junior (1-3 yrs)',
  exp_mid: 'Mid-level (3-7 yrs)',
  exp_senior: 'Senior (7+ yrs)',
}

// --- Supabase helpers ---

async function getOrCreateUser(telegramId, firstName) {
  const { data: existing } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (existing) return existing

  const { data } = await supabase
    .from('telegram_users')
    .insert({ telegram_id: telegramId, first_name: firstName })
    .select()
    .single()

  return data
}

async function updateUser(telegramId, updates) {
  await supabase
    .from('telegram_users')
    .update(updates)
    .eq('telegram_id', telegramId)
}

// Returns true if this user is an admin NOT in test mode (exempt from daily limits)
function isAdminExempt(telegramId, user) {
  if (!ADMIN_IDS.includes(telegramId)) return false
  return !user?.session_data?.test_mode
}

// Option A: one tool total per day — returns true if ANY tool was used today
async function hasUsedAnyToolToday(telegramId, user) {
  if (isAdminExempt(telegramId, user)) return false

  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('tool_usage')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('used_date', today)
    .limit(1)

  return data && data.length > 0
}

async function recordUsage(telegramId, tool, user) {
  if (isAdminExempt(telegramId, user)) return

  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('tool_usage')
    .upsert(
      { telegram_id: telegramId, tool, used_date: today },
      { onConflict: 'telegram_id,tool,used_date' }
    )
}

// --- DeepSeek helper ---

async function callDeepSeek(systemPrompt, userMessage) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content
}

// --- Shared: ask for resume ---

function askForResume(chatId) {
  return sendMessage(
    chatId,
    `📄 *Add Your Resume/CV* _(optional but recommended!)_\n\nPersonalizes your questions and analysis.\n\n*How to add it:*\n• 📋 Paste your CV text directly here\n• 📎 Upload a *.txt* file\n\n_Have a PDF? Open it → select all → copy → paste here._`,
    SKIP_RESUME_BUTTON
  )
}

// --- Tool: 10 Interview Questions ---

async function handleQuestions(chatId, userId, user) {
  if (await hasUsedAnyToolToday(userId, user)) {
    return sendMessage(chatId, DAILY_LIMIT_MSG, CTA_BUTTONS)
  }

  // Ask for optional job description before generating
  await updateUser(userId, { current_step: 'awaiting_jd' })
  return sendMessage(
    chatId,
    `📋 *Optional: Paste a Job Description*\n\nI'll tailor the 10 questions specifically to the job you're applying for.\n\n_Or skip to generate based on your role & experience._`,
    SKIP_JD_BUTTON
  )
}

async function generateQuestions(chatId, userId, user, jobDescription) {
  await sendTyping(chatId)
  await sendMessage(chatId, `⏳ Generating 10 tailored questions for *${user.target_role}*...`)

  const resumeSection = user.resume_text
    ? `\n\nCandidate Resume:\n${user.resume_text.slice(0, 1500)}`
    : ''
  const jdSection = jobDescription
    ? `\n\nJob Description:\n${jobDescription.slice(0, 1000)}`
    : ''

  const questions = await callDeepSeek(
    `You are an expert interview coach. Generate exactly 10 interview questions tailored to the information provided. Mix behavioral, technical, and situational questions. Format as a numbered list. Be specific and practical.`,
    `Role: ${user.target_role}\nExperience: ${user.experience}${resumeSection}${jdSection}\n\nGenerate 10 interview questions.`
  )

  await recordUsage(userId, 'questions', user)
  await sendMessage(chatId, `🎯 *10 Interview Questions — ${user.target_role}*\n\n${questions}`)
  await sendMessage(
    chatId,
    `✅ *Free session done!*\n\nWant voice coaching, AI feedback & unlimited practice?`,
    CTA_BUTTONS
  )
}

// --- Tool: Resume Checker ---

async function handleResumeChecker(chatId, userId, user) {
  if (await hasUsedAnyToolToday(userId, user)) {
    return sendMessage(chatId, DAILY_LIMIT_MSG, CTA_BUTTONS)
  }

  if (!user.resume_text) {
    await updateUser(userId, { current_step: 'awaiting_resume_for_check' })
    return sendMessage(
      chatId,
      `📄 *Resume Checker*\n\nYou haven't added your CV yet!\n\nPaste your resume/CV text below and I'll analyze it right away.\n\n_Tip: Copy text from your PDF/Word doc and paste here._`
    )
  }

  return analyzeResume(chatId, userId, user, user.resume_text)
}

async function analyzeResume(chatId, userId, user, resumeText) {
  await sendTyping(chatId)
  await sendMessage(chatId, `🔍 Analyzing your resume for *${user.target_role}*...`)

  const feedback = await callDeepSeek(
    `You are a senior HR expert and career coach. Analyze the resume and give structured, actionable feedback. Be honest but constructive. Format with clear sections using emojis.`,
    `Target Role: ${user.target_role}\nExperience Level: ${user.experience || 'Not specified'}\n\nResume:\n${resumeText.slice(0, 3000)}\n\nProvide feedback in these sections:\n1. ✅ Strengths (3-5 bullet points)\n2. ⚠️ Areas to Improve (3-5 bullet points)\n3. 💡 Specific Suggestions (3-5 actionable tips)\n4. 🎯 ATS Score Estimate (X/10) with brief reason`
  )

  await recordUsage(userId, 'resume_check', user)
  await sendMessage(chatId, `📊 *Resume Analysis — ${user.target_role}*\n\n${feedback}`)
  await sendMessage(
    chatId,
    `✅ *Analysis complete!*\n\nWant a full rewrite, ATS optimization & more on the app?`,
    CTA_BUTTONS
  )
}

// --- Tool: Interview Simulator ---

async function handleInterviewStart(chatId, userId, user) {
  if (await hasUsedAnyToolToday(userId, user)) {
    return sendMessage(chatId, DAILY_LIMIT_MSG, CTA_BUTTONS)
  }

  await sendTyping(chatId)
  await sendMessage(chatId, `⏳ Preparing your interview for *${user.target_role}*...`)

  const resumeSection = user.resume_text
    ? `\n\nCandidate Resume:\n${user.resume_text.slice(0, 1000)}`
    : ''

  const questionsRaw = await callDeepSeek(
    `You are an expert interviewer. Generate exactly 5 interview questions for the role provided. Mix technical, behavioral, and situational. Return ONLY the questions, one per line, numbered 1-5. No extra commentary.`,
    `Role: ${user.target_role}\nExperience: ${user.experience}${resumeSection}\n\nGenerate 5 interview questions.`
  )

  const questions = questionsRaw
    .split('\n')
    .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(l => l.length > 10)
    .slice(0, 5)

  if (questions.length < 3) {
    return sendMessage(chatId, `❌ Failed to generate questions. Please try again.`)
  }

  const interviewState = JSON.stringify({
    active: true,
    questions,
    answers: [],
    feedbacks: [],
    current: 0,
  })

  await updateUser(userId, { current_step: 'interview_active', interview_state: interviewState })

  await sendMessage(
    chatId,
    `🎤 *Interview Simulator Started!*\n\nI'll ask you *${questions.length} questions* — answer each like you're in a real interview.\n\nType your answer and send it. Good luck! 💪`,
    STOP_INTERVIEW_BUTTON
  )
  await sendMessage(chatId, `*Question 1 of ${questions.length}:*\n\n${questions[0]}`)
}

async function handleInterviewAnswer(chatId, userId, user, answerText) {
  let state
  try {
    state = JSON.parse(user.interview_state || '{}')
  } catch {
    await updateUser(userId, { current_step: null, interview_state: null })
    return sendMessage(chatId, `Something went wrong. Use /menu to restart.`, MAIN_MENU)
  }

  if (!state.active || state.current >= state.questions.length) {
    await updateUser(userId, { current_step: null, interview_state: null })
    return sendMessage(chatId, `Interview session ended. Use /menu to start again.`, MAIN_MENU)
  }

  const currentQuestion = state.questions[state.current]
  state.answers.push(answerText)

  await sendTyping(chatId)

  const feedback = await callDeepSeek(
    `You are an expert interview coach giving brief, constructive feedback on interview answers. Be specific and practical. Keep it to 3-4 sentences.`,
    `Role: ${user.target_role}\nQuestion: ${currentQuestion}\nAnswer: ${answerText}\n\nGive brief feedback on this answer.`
  )

  state.feedbacks.push(feedback)
  state.current += 1

  await sendMessage(chatId, `💬 *Feedback:*\n\n${feedback}`)

  if (state.current >= state.questions.length) {
    // All done — overall assessment
    await updateUser(userId, { current_step: null, interview_state: null })
    await recordUsage(userId, 'interview', user)

    await sendTyping(chatId)
    const qa = state.questions
      .map((q, i) => `Q: ${q}\nA: ${state.answers[i] || '(no answer)'}`)
      .join('\n\n')

    const assessment = await callDeepSeek(
      `You are an expert interview coach. Based on the full interview performance, give an overall assessment. Include: overall rating (X/10), top 2 strengths, top 2 areas to improve, and one key actionable tip.`,
      `Role: ${user.target_role}\nExperience: ${user.experience}\n\nInterview Q&A:\n${qa}`
    )

    await sendMessage(chatId, `🏁 *Interview Complete!*\n\n*Overall Assessment:*\n\n${assessment}`)
    await sendMessage(
      chatId,
      `✅ *Great practice session!*\n\nWant real-time voice coaching, deeper feedback & unlimited mock interviews?`,
      CTA_BUTTONS
    )
  } else {
    // Next question
    await updateUser(userId, { interview_state: JSON.stringify(state) })
    await sendMessage(
      chatId,
      `*Question ${state.current + 1} of ${state.questions.length}:*\n\n${state.questions[state.current]}`,
      STOP_INTERVIEW_BUTTON
    )
  }
}

// --- Main update handler ---

async function handleUpdate(update) {
  // Button press (callback query)
  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message.chat.id
    const userId = cq.from.id
    const data = cq.data

    await answerCbq(cq.id)
    const user = await getOrCreateUser(userId, cq.from.first_name)

    // Experience level selected → ask for resume
    if (data.startsWith('exp_')) {
      const experience = EXP_LABELS[data]
      await updateUser(userId, { experience, current_step: 'awaiting_resume' })
      await sendMessage(chatId, `✅ *${experience} ${user.target_role}* — noted! 🎯`)
      return askForResume(chatId)
    }

    if (data === 'skip_resume') {
      await updateUser(userId, { current_step: null })
      return sendMessage(
        chatId,
        `No problem! You can add your CV anytime using "Update My CV/Resume" in the menu.\n\nLet's get you interview-ready! 👇`,
        MAIN_MENU
      )
    }

    if (data === 'update_resume') {
      await updateUser(userId, { current_step: 'awaiting_resume' })
      return askForResume(chatId)
    }

    if (data === 'skip_jd') {
      await updateUser(userId, { current_step: null })
      // Re-fetch user to get latest resume_text
      const freshUser = await getOrCreateUser(userId, cq.from.first_name)
      return generateQuestions(chatId, userId, freshUser, null)
    }

    if (data === 'stop_interview') {
      await updateUser(userId, { current_step: null, interview_state: null })
      return sendMessage(
        chatId,
        `🛑 Interview stopped.\n\nUse /menu to access tools whenever you're ready.`,
        MAIN_MENU
      )
    }

    if (data === 'tool_questions') {
      if (!user.target_role) return sendMessage(chatId, `Please run /start first to set up your profile.`)
      return handleQuestions(chatId, userId, user)
    }

    if (data === 'tool_resume') {
      if (!user.target_role) return sendMessage(chatId, `Please run /start first to set up your profile.`)
      return handleResumeChecker(chatId, userId, user)
    }

    if (data === 'tool_interview') {
      if (!user.target_role) return sendMessage(chatId, `Please run /start first to set up your profile.`)
      return handleInterviewStart(chatId, userId, user)
    }

    return
  }

  // Regular message
  const msg = update.message
  if (!msg) return

  const chatId = msg.chat.id
  const userId = msg.from.id
  const firstName = msg.from.first_name || 'there'
  const text = (msg.text || '').trim()
  const user = await getOrCreateUser(userId, firstName)

  // File/document upload (for resume)
  if (msg.document) {
    const isResumeStep =
      user.current_step === 'awaiting_resume' ||
      user.current_step === 'awaiting_resume_for_check'

    if (!isResumeStep) {
      return sendMessage(chatId, `Use /menu to access tools.`, MAIN_MENU)
    }

    const fileName = msg.document.file_name || ''
    if (!fileName.toLowerCase().endsWith('.txt')) {
      return sendMessage(
        chatId,
        `⚠️ I can only read *.txt* files right now.\n\n_Have a PDF? Open it, select all text (Ctrl+A), copy, and paste here._`,
        SKIP_RESUME_BUTTON
      )
    }

    await sendTyping(chatId)
    const fileContent = await downloadTelegramFile(msg.document.file_id)

    if (!fileContent || fileContent.trim().length < 50) {
      return sendMessage(chatId, `❌ The file seems empty or too short. Please paste your CV text directly.`)
    }

    const resumeText = fileContent.trim().slice(0, 8000)
    const isOnboarding = user.current_step === 'awaiting_resume'
    await updateUser(userId, { resume_text: resumeText, current_step: null })

    if (isOnboarding) {
      return sendMessage(
        chatId,
        `✅ *CV saved!* (${resumeText.length} chars)\n\nYour tools are now personalized. Let's go! 👇`,
        MAIN_MENU
      )
    } else {
      return analyzeResume(chatId, userId, { ...user, resume_text: resumeText }, resumeText)
    }
  }

  // --- Commands ---

  if (text === '/start') {
    if (user.current_step === 'interview_active') {
      await updateUser(userId, { interview_state: null })
    }
    await updateUser(userId, { current_step: 'awaiting_role' })
    return sendMessage(
      chatId,
      `👋 Hey ${firstName}! Welcome to *JobSensei* 🚀\n\nI'll help you crush your next interview with AI-powered practice.\n\nFirst — *what role are you targeting?*\n\n_e.g. Software Engineer, Product Manager, Data Analyst_`
    )
  }

  if (text === '/menu') {
    if (!user.target_role) return sendMessage(chatId, `Please run /start first to set up your profile.`)
    if (user.current_step) await updateUser(userId, { current_step: null, interview_state: null })
    const isTestMode = ADMIN_IDS.includes(userId) && user?.session_data?.test_mode === true
    const menuText = isTestMode
      ? `🧪 *Test Mode Active* — daily limits apply\n\nWhat would you like to practice today, ${firstName}? 👇`
      : `What would you like to practice today, ${firstName}? 👇`
    return sendMessage(chatId, menuText, MAIN_MENU)
  }

  if (text === '/testmode') {
    if (!ADMIN_IDS.includes(userId)) return
    const currentTestMode = user?.session_data?.test_mode === true
    const newTestMode = !currentTestMode
    await updateUser(userId, {
      session_data: { ...(user.session_data || {}), test_mode: newTestMode },
    })
    if (newTestMode) {
      return sendMessage(
        chatId,
        `🧪 *Test Mode ON*\n\nYou are now treated as a regular user — daily limits apply and usage is recorded.\n\nSend /testmode again to switch back to admin mode.`
      )
    } else {
      return sendMessage(
        chatId,
        `🔓 *Admin Mode ON*\n\nUnlimited access restored. Daily limits do not apply.\n\nSend /testmode to switch back to test mode.`
      )
    }
  }

  if (text === '/help') {
    const adminNote = ADMIN_IDS.includes(userId)
      ? `\n/testmode — Toggle between admin and test user mode`
      : ''
    return sendMessage(
      chatId,
      `*JobSensei Bot — Help* 🤖\n\n/start — Set up your profile\n/menu — Open practice tools\n/help — This message${adminNote}\n\n_Each tool is free once per day. Upgrade for unlimited access._`,
      CTA_BUTTONS
    )
  }

  // --- State-based message routing ---

  if (user.current_step === 'awaiting_role') {
    if (text.length < 2) return sendMessage(chatId, `Please enter a valid job role (e.g. Software Engineer).`)
    await updateUser(userId, { target_role: text, current_step: 'awaiting_experience' })
    return sendMessage(
      chatId,
      `Great! *${text}* — got it! 🎯\n\nNow, what's your experience level?`,
      EXPERIENCE_BUTTONS
    )
  }

  if (user.current_step === 'awaiting_experience') {
    return sendMessage(chatId, `Please select your experience level using the buttons above.\n\nOr /start to restart.`, EXPERIENCE_BUTTONS)
  }

  if (user.current_step === 'awaiting_resume') {
    if (text.length < 50) {
      return sendMessage(
        chatId,
        `That seems too short for a resume. Please paste more content, or tap Skip.`,
        SKIP_RESUME_BUTTON
      )
    }
    const resumeText = text.slice(0, 8000)
    await updateUser(userId, { resume_text: resumeText, current_step: null })
    return sendMessage(
      chatId,
      `✅ *CV saved!* (${resumeText.length} chars)\n\nYour tools are now personalized to your experience. Let's go! 👇`,
      MAIN_MENU
    )
  }

  if (user.current_step === 'awaiting_resume_for_check') {
    if (text.length < 50) {
      return sendMessage(chatId, `That seems too short. Please paste your full CV text.`)
    }
    const resumeText = text.slice(0, 8000)
    await updateUser(userId, { resume_text: resumeText, current_step: null })
    return analyzeResume(chatId, userId, { ...user, resume_text: resumeText }, resumeText)
  }

  if (user.current_step === 'awaiting_jd') {
    await updateUser(userId, { current_step: null })
    return generateQuestions(chatId, userId, user, text)
  }

  if (user.current_step === 'interview_active') {
    if (text.length < 5) {
      return sendMessage(chatId, `Please give a proper answer (at least a sentence or two).`)
    }
    return handleInterviewAnswer(chatId, userId, user, text)
  }

  // Catch-all
  return sendMessage(
    chatId,
    user.target_role
      ? `Use /menu to access the tools, or /start to update your profile.`
      : `Send /start to get set up!`
  )
}

// --- Vercel handler ---

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  try {
    await handleUpdate(req.body)
  } catch (err) {
    console.error('Telegram bot error:', err)
  }

  // Always 200 — Telegram retries on non-200
  return res.status(200).json({ ok: true })
}
