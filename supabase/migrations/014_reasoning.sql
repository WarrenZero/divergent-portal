-- 014_reasoning.sql
-- Divergent AI — standalone reasoning subscription product

-- Practitioner reasoning subscription
CREATE TABLE IF NOT EXISTS reasoning_subscriptions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) on delete cascade,
  email text not null,
  status text default 'trial' check (status in ('trial','active','past_due','cancelled')),
  trial_started_at timestamptz default now(),
  trial_ends_at timestamptz default (now() + interval '7 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text default 'reasoning' check (tier in ('reasoning','full_portal')),
  created_at timestamptz default now()
);

-- Practitioner clinical profile (from onboarding assessment)
CREATE TABLE IF NOT EXISTS practitioner_profiles (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) on delete cascade unique,
  full_name text,
  credentials text[],
  certifying_body text,
  training_hours integer,
  years_in_practice integer,
  year_certified integer,
  active_client_count text,
  primary_client_types text[],
  primary_conditions text[],
  age_ranges_served text[],
  average_protocol_length text,
  labs_ordered text[],
  lab_interpretation_approach text,
  preferred_lab_companies text[],
  primary_frameworks text[],
  dietary_approaches text[],
  supplement_philosophy text,
  protocol_building_approach text,
  htma_first_look text,
  challenging_patterns text,
  information_style text check (information_style in ('brief','balanced','detailed')),
  additional_context text,
  intelligence_level text default 'intermediate' check (intelligence_level in ('student','emerging','intermediate','advanced','expert')),
  onboarding_complete boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reasoning conversations
CREATE TABLE IF NOT EXISTS reasoning_conversations (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) on delete cascade,
  title text default 'New conversation',
  client_reference text,
  conversation_type text default 'general' check (conversation_type in ('htma_review','lab_interpretation','protocol_building','case_review','research','general')),
  message_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
CREATE TABLE IF NOT EXISTS reasoning_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references reasoning_conversations(id) on delete cascade,
  role text check (role in ('user','assistant')),
  content text,
  attached_files jsonb default '[]',
  created_at timestamptz default now()
);

-- Attached files
CREATE TABLE IF NOT EXISTS reasoning_files (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) on delete cascade,
  conversation_id uuid references reasoning_conversations(id) on delete set null,
  file_name text,
  file_type text,
  file_size integer,
  storage_path text,
  content_extracted text,
  file_category text default 'general' check (file_category in ('htma_report','lab_result','client_note','research','image','recording','general')),
  client_reference text,
  entry_date date default current_date,
  notes text,
  tags text[],
  created_at timestamptz default now()
);

-- Clinical notes
CREATE TABLE IF NOT EXISTS reasoning_notes (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) on delete cascade,
  conversation_id uuid references reasoning_conversations(id) on delete set null,
  title text,
  content text,
  client_reference text,
  entry_date date default current_date,
  entry_time time,
  note_type text default 'general' check (note_type in ('session_summary','clinical_observation','protocol_note','research_note','client_update','general')),
  is_pinned boolean default false,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE reasoning_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
CREATE POLICY "own_subscription" ON reasoning_subscriptions FOR ALL USING (
  practitioner_id = (SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt()->>'sub')
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "own_profile" ON practitioner_profiles FOR ALL USING (
  practitioner_id = (SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt()->>'sub')
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "own_conversations" ON reasoning_conversations FOR ALL USING (
  practitioner_id = (SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt()->>'sub')
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "own_messages" ON reasoning_messages FOR ALL USING (
  conversation_id IN (
    SELECT id FROM reasoning_conversations
    WHERE practitioner_id = (SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt()->>'sub')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "own_files" ON reasoning_files FOR ALL USING (
  practitioner_id = (SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt()->>'sub')
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "own_notes" ON reasoning_notes FOR ALL USING (
  practitioner_id = (SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt()->>'sub')
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
