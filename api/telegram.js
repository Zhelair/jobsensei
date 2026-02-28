// JobSensei Telegram Bot — Vercel serverless webhook handler
// Handles user onboarding, tool access (15 Questions for now), and rate limiting
// State is stored in Supabase. Admin users bypass daily limits.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean)
const CHANNEL_LINK = process.env.TELEGRAM_CHANNEL_LINK || 'https://t.me/your_channel'
const APP_LINK = 'https://jobsensei.vercel.app'

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

// --- Keyboards ---

const MAIN_MENU = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📝 15 Interview Questions', callback_data: 'tool_questions' }],
      [{ text: '📄 Resume Checker', callback_data: 'tool_resume' }],
      [{ text: '🎤 Interview Simulator', callback_data: 'tool_interview' }],
    ],
  },
}

const CTA_BUTTONS = {
  reply_markup: {
    inline_keyboard: [[
      { text: '🚀 Try Full App', url: APP_LINK },
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

async function hasUsedToolToday(telegramId, tool) {
  if (ADMIN_IDS.includes(telegramId)) return false

  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('tool_usage')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('tool', tool)
    .eq('used_date', today)
    .maybeSingle()

  return !!data
}

async function recordUsage(telegramId, tool) {
  if (ADMIN_IDS.includes(telegramId)) return

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

// --- Tool: 15 Interview Questions ---

async function handleQuestions(chatId, userId, user) {
  if (await hasUsedToolToday(userId, 'questions')) {
    return sendMessage(
      chatId,
      `⏰ *Daily limit reached!*\n\nYou've already used the Questions Generator today.\n\nCome back tomorrow for another free session — or unlock unlimited access on the app! 🚀`,
      CTA_BUTTONS
    )
  }

  await sendTyping(chatId)
  await sendMessage(chatId, `⏳ Generating 15 tailored questions for *${user.target_role}*...`)

  const questions = await callDeepSeek(
    `You are an expert interview coach. Generate exactly 15 interview questions tailored to the role and experience level provided. Mix behavioral, technical, and situational questions. Format as a numbered list. Be specific and practical.`,
    `Role: ${user.target_role}\nExperience: ${user.experience}\n\nGenerate 15 interview questions.`
  )

  await recordUsage(userId, 'questions')
  await sendMessage(chatId, `🎯 *15 Interview Questions — ${user.target_role}*\n\n${questions}`)
  await sendMessage(
    chatId,
    `✅ *That's your free session for today!*\n\nWant voice coaching, AI feedback & unlimited practice?`,
    CTA_BUTTONS
  )
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

    // Onboarding step 2: experience level selected
    if (data.startsWith('exp_')) {
      const experience = EXP_LABELS[data]
      await updateUser(userId, { experience, current_step: null })
      return sendMessage(
        chatId,
        `✅ All set! *${experience} ${user.target_role}* — let's get you interview-ready!\n\nChoose a tool to practice 👇`,
        MAIN_MENU
      )
    }

    if (data === 'tool_questions') {
      if (!user.target_role) return sendMessage(chatId, `Please run /start first to set up your profile.`)
      return handleQuestions(chatId, userId, user)
    }

    if (data === 'tool_resume' || data === 'tool_interview') {
      return sendMessage(
        chatId,
        `🚧 *Coming soon on the bot!*\n\nThis tool is available right now on the full JobSensei app 👇`,
        CTA_BUTTONS
      )
    }

    return
  }

  // Regular text message
  const msg = update.message
  if (!msg) return

  const chatId = msg.chat.id
  const userId = msg.from.id
  const firstName = msg.from.first_name || 'there'
  const text = (msg.text || '').trim()
  const user = await getOrCreateUser(userId, firstName)

  if (text === '/start') {
    await updateUser(userId, { current_step: 'awaiting_role' })
    return sendMessage(
      chatId,
      `👋 Hey ${firstName}! Welcome to *JobSensei* 🚀\n\nI'll help you crush your next interview with AI-powered practice.\n\nFirst — *what role are you targeting?*\n\n_e.g. Software Engineer, Product Manager, Data Analyst_`
    )
  }

  if (text === '/menu') {
    if (!user.target_role) return sendMessage(chatId, `Please run /start first to set up your profile.`)
    return sendMessage(chatId, `What would you like to practice today, ${firstName}? 👇`, MAIN_MENU)
  }

  if (text === '/help') {
    return sendMessage(
      chatId,
      `*JobSensei Bot — Help* 🤖\n\n/start — Set up your profile\n/menu — Open practice tools\n/help — This message\n\n_Each tool is free once per day. Upgrade for unlimited access._`,
      CTA_BUTTONS
    )
  }

  // Onboarding step 1: waiting for role name
  if (user.current_step === 'awaiting_role') {
    if (text.length < 2) return sendMessage(chatId, `Please enter a valid job role (e.g. Software Engineer).`)
    await updateUser(userId, { target_role: text, current_step: 'awaiting_experience' })
    return sendMessage(
      chatId,
      `Great! *${text}* — got it! 🎯\n\nNow, what's your experience level?`,
      EXPERIENCE_BUTTONS
    )
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

  // Always return 200 — Telegram retries on non-200 responses
  return res.status(200).json({ ok: true })
}
