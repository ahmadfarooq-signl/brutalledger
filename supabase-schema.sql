-- Brutal Ledger Supabase Schema
-- Single-user app, no auth needed, RLS disabled on all tables

-- Tasks
CREATE TABLE IF NOT EXISTS tasks_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f26419'
);
ALTER TABLE tasks_projects DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  project_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'today',
  estimated_mins INTEGER DEFAULT 0,
  logged_secs INTEGER DEFAULT 0,
  due_date TEXT,
  completed_at TEXT
);
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Habits
CREATE TABLE IF NOT EXISTS habits_custom (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  auto BOOLEAN DEFAULT false,
  custom_habit BOOLEAN DEFAULT false
);
ALTER TABLE habits_custom DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS habit_records (
  date TEXT NOT NULL,
  habit_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  PRIMARY KEY (date, habit_id)
);
ALTER TABLE habit_records DISABLE ROW LEVEL SECURITY;

-- Sleep
CREATE TABLE IF NOT EXISTS sleep_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Main Sleep'
);
ALTER TABLE sleep_entries DISABLE ROW LEVEL SECURITY;

-- Finance
CREATE TABLE IF NOT EXISTS finance_incomes (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  note TEXT DEFAULT '',
  date TEXT NOT NULL
);
ALTER TABLE finance_incomes DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS finance_expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  note TEXT DEFAULT '',
  date TEXT NOT NULL
);
ALTER TABLE finance_expenses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS finance_savings (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  dir TEXT NOT NULL,
  reason TEXT DEFAULT '',
  date TEXT NOT NULL
);
ALTER TABLE finance_savings DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS finance_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8a8a94'
);
ALTER TABLE finance_categories DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS finance_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE finance_settings DISABLE ROW LEVEL SECURITY;

-- Outreach
CREATE TABLE IF NOT EXISTS outreach_prospects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT DEFAULT '',
  followers TEXT DEFAULT '',
  niche TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'warming',
  notes TEXT DEFAULT '',
  date_added TEXT NOT NULL,
  comment_count INTEGER DEFAULT 0
);
ALTER TABLE outreach_prospects DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS outreach_daily (
  date TEXT PRIMARY KEY,
  dms INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0
);
ALTER TABLE outreach_daily DISABLE ROW LEVEL SECURITY;

-- Content
CREATE TABLE IF NOT EXISTS content_posts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  pillar TEXT NOT NULL DEFAULT 'contrarian',
  format TEXT NOT NULL DEFAULT 'text',
  d7 INTEGER DEFAULT 0,
  d30 INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  cta TEXT DEFAULT ''
);
ALTER TABLE content_posts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS content_kb (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
);
ALTER TABLE content_kb DISABLE ROW LEVEL SECURITY;

-- Scorecard
CREATE TABLE IF NOT EXISTS scorecard_weeks (
  id TEXT PRIMARY KEY,
  range TEXT NOT NULL,
  dms INTEGER DEFAULT 0,
  posts INTEGER DEFAULT 0,
  sleep TEXT DEFAULT '0h',
  cmts INTEGER DEFAULT 0,
  savings TEXT DEFAULT 'PKR 0',
  pct INTEGER DEFAULT 0
);
ALTER TABLE scorecard_weeks DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS scorecard_metrics (
  label TEXT PRIMARY KEY,
  value NUMERIC DEFAULT 0,
  target NUMERIC DEFAULT 0,
  unit TEXT DEFAULT ''
);
ALTER TABLE scorecard_metrics DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS scorecard_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE scorecard_settings DISABLE ROW LEVEL SECURITY;

-- Calendar
CREATE TABLE IF NOT EXISTS calendar_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f26419',
  custom_cat BOOLEAN DEFAULT false
);
ALTER TABLE calendar_categories DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS calendar_blocks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT DEFAULT ''
);
ALTER TABLE calendar_blocks DISABLE ROW LEVEL SECURITY;
