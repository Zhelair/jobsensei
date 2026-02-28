-- JobSensei Telegram Bot — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Table 1: Telegram users (profile + conversation state)
CREATE TABLE IF NOT EXISTS telegram_users (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id   bigint UNIQUE NOT NULL,
  first_name    text,
  target_role   text,
  experience    text,
  current_step  text,              -- onboarding state: awaiting_role | awaiting_experience | null
  session_data  jsonb DEFAULT '{}', -- reserved for interview simulator state
  created_at    timestamptz DEFAULT now()
);

-- Table 2: Daily tool usage (rate limiting — 1 free use per tool per day)
CREATE TABLE IF NOT EXISTS tool_usage (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id bigint NOT NULL,
  tool        text NOT NULL,       -- questions | resume | interview
  used_date   date DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now()
);

-- Unique constraint: one row per user + tool + day
CREATE UNIQUE INDEX IF NOT EXISTS tool_usage_daily
  ON tool_usage (telegram_id, tool, used_date);
