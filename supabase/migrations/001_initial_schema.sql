-- ═══════════════════════════════════════════════════════════════
-- Divergent Nutritional Therapy — Initial Schema
-- Migration: 001_initial_schema.sql
-- Source of truth: CLAUDE.md § DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ───────────────────────────────────────────────
-- gen_random_uuid() is available via pgcrypto in Supabase
create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════

-- ─── PRACTITIONERS ────────────────────────────────────────────
create table practitioners (
  id                uuid        primary key default gen_random_uuid(),
  clerk_user_id     text        unique not null,
  name              text        not null,
  email             text        unique not null,
  ntp_credential    text,
  practice_name     text,
  practice_location text,
  created_at        timestamptz default now()
);

-- ─── CLIENTS ──────────────────────────────────────────────────
create table clients (
  id                   uuid    primary key default gen_random_uuid(),
  practitioner_id      uuid    references practitioners(id) on delete cascade,
  clerk_user_id        text    unique,
  first_name           text    not null,
  last_name            text    not null,
  email                text,
  date_of_birth        date,
  primary_concern      text,
  current_protocol_id  uuid,   -- FK added after protocols table exists (see below)
  wellness_score       integer default 0,
  created_at           timestamptz default now()
);

-- ─── NAQ RESPONSES ────────────────────────────────────────────
create table naq_responses (
  id             uuid    primary key default gen_random_uuid(),
  client_id      uuid    references clients(id) on delete cascade,
  domain         text    not null,
  question_id    text    not null,
  response_value integer,
  response_text  text,
  ai_flag        boolean default false,
  responded_at   timestamptz default now()
);

-- ─── DAILY PULSE ──────────────────────────────────────────────
create table daily_pulse (
  id               uuid    primary key default gen_random_uuid(),
  client_id        uuid    references clients(id) on delete cascade,
  digestion_score  integer check (digestion_score between 1 and 10),
  sleep_score      integer check (sleep_score between 1 and 10),
  stress_score     integer check (stress_score between 1 and 10),
  logged_at        timestamptz default now()
);

-- ─── LAB RESULTS ──────────────────────────────────────────────
create table lab_results (
  id                uuid    primary key default gen_random_uuid(),
  client_id         uuid    references clients(id) on delete cascade,
  file_name         text,
  file_url          text,
  parsed_markers    jsonb,
  functional_flags  jsonb,
  uploaded_at       timestamptz default now()
);

-- ─── PROTOCOLS ────────────────────────────────────────────────
create table protocols (
  id            uuid    primary key default gen_random_uuid(),
  name          text    not null,
  category      text,
  phase_count   integer default 1,
  content_html  text,
  is_template   boolean default false,
  created_by    uuid    references practitioners(id),
  created_at    timestamptz default now()
);

-- Wire the deferred FK on clients.current_protocol_id
alter table clients
  add constraint clients_current_protocol_id_fkey
  foreign key (current_protocol_id)
  references protocols(id)
  on delete set null;

-- ─── CLIENT PROTOCOLS (assignment) ────────────────────────────
create table client_protocols (
  id            uuid    primary key default gen_random_uuid(),
  client_id     uuid    references clients(id) on delete cascade,
  protocol_id   uuid    references protocols(id),
  start_date    date,
  current_phase integer default 1,
  assigned_by   uuid    references practitioners(id),
  is_active     boolean default true,
  assigned_at   timestamptz default now()
);

-- ─── FOOD JOURNAL ─────────────────────────────────────────────
create table journal_entries (
  id            uuid    primary key default gen_random_uuid(),
  client_id     uuid    references clients(id) on delete cascade,
  meal_time     text,
  foods_eaten   text,
  mood_before   integer,
  mood_after    integer,
  symptoms      text,
  bowel_rating  integer,
  notes         text,
  logged_at     timestamptz default now()
);

-- ─── SUPPLEMENTS ──────────────────────────────────────────────
create table supplements (
  id         uuid    primary key default gen_random_uuid(),
  client_id  uuid    references clients(id) on delete cascade,
  name       text    not null,
  brand      text,
  dose       text,
  timing     text,
  notes      text,
  is_active  boolean default true,
  added_at   timestamptz default now()
);

-- ─── SESSIONS (telehealth) ────────────────────────────────────
create table sessions (
  id                uuid    primary key default gen_random_uuid(),
  practitioner_id   uuid    references practitioners(id),
  client_id         uuid    references clients(id),
  scheduled_at      timestamptz,
  duration_minutes  integer default 60,
  session_type      text    default 'telehealth',
  video_room_url    text,
  transcript_url    text,
  soap_note         text,
  status            text    default 'scheduled',
  created_at        timestamptz default now()
);

-- ─── SECURE MESSAGES ──────────────────────────────────────────
create table messages (
  id           uuid    primary key default gen_random_uuid(),
  from_user_id text    not null,
  to_user_id   text    not null,
  client_id    uuid    references clients(id),
  body         text    not null,
  is_read      boolean default false,
  sent_at      timestamptz default now()
);

-- ─── COPILOT CONVERSATIONS ────────────────────────────────────
create table copilot_messages (
  id               uuid    primary key default gen_random_uuid(),
  practitioner_id  uuid    references practitioners(id),
  client_id        uuid    references clients(id),
  role             text    check (role in ('user', 'assistant')),
  content          text    not null,
  tokens_used      integer,
  sent_at          timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- (Not in CLAUDE.md schema — added for query performance)
-- ═══════════════════════════════════════════════════════════════

-- Practitioners
create index idx_practitioners_clerk_user_id on practitioners(clerk_user_id);

-- Clients
create index idx_clients_practitioner_id on clients(practitioner_id);
create index idx_clients_clerk_user_id    on clients(clerk_user_id);

-- NAQ responses — common lookup: all responses for a client in a domain
create index idx_naq_responses_client_id  on naq_responses(client_id);
create index idx_naq_responses_domain     on naq_responses(client_id, domain);

-- Daily pulse — time-series queries per client
create index idx_daily_pulse_client_logged on daily_pulse(client_id, logged_at desc);

-- Lab results
create index idx_lab_results_client_id on lab_results(client_id);

-- Client protocols — active protocol lookup
create index idx_client_protocols_client_active on client_protocols(client_id, is_active);

-- Journal entries — time-series per client
create index idx_journal_entries_client_logged on journal_entries(client_id, logged_at desc);

-- Supplements — active supplements per client
create index idx_supplements_client_active on supplements(client_id, is_active);

-- Sessions — upcoming sessions per practitioner/client
create index idx_sessions_practitioner on sessions(practitioner_id, scheduled_at);
create index idx_sessions_client       on sessions(client_id, scheduled_at);

-- Messages — inbox queries
create index idx_messages_to_user   on messages(to_user_id, sent_at desc);
create index idx_messages_client_id on messages(client_id);

-- Co-Pilot — conversation history per practitioner/client pair
create index idx_copilot_practitioner_client on copilot_messages(practitioner_id, client_id, sent_at);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — enable on every table
-- ═══════════════════════════════════════════════════════════════

alter table practitioners     enable row level security;
alter table clients           enable row level security;
alter table naq_responses     enable row level security;
alter table daily_pulse       enable row level security;
alter table lab_results       enable row level security;
alter table protocols         enable row level security;
alter table client_protocols  enable row level security;
alter table journal_entries   enable row level security;
alter table supplements       enable row level security;
alter table sessions          enable row level security;
alter table messages          enable row level security;
alter table copilot_messages  enable row level security;

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- Convention:
--   auth.jwt() ->> 'sub'   → Clerk user ID (set via Supabase JWT template)
--   Practitioners own their row and all rows joined through practitioner_id
--   Clients own their row and all rows joined through client_id
-- ═══════════════════════════════════════════════════════════════

-- ─── PRACTITIONERS ────────────────────────────────────────────
create policy "Practitioners: own record only"
  on practitioners for all
  using (clerk_user_id = auth.jwt() ->> 'sub');

-- ─── CLIENTS ──────────────────────────────────────────────────
-- Practitioner sees their own clients
create policy "Practitioners: see own clients"
  on clients for all
  using (
    practitioner_id = (
      select id from practitioners
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Client sees their own record
create policy "Clients: own record only"
  on clients for select
  using (clerk_user_id = auth.jwt() ->> 'sub');

-- ─── NAQ RESPONSES ────────────────────────────────────────────
create policy "Practitioners: naq via own clients"
  on naq_responses for all
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

create policy "Clients: own naq responses"
  on naq_responses for all
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── DAILY PULSE ──────────────────────────────────────────────
create policy "Practitioners: pulse via own clients"
  on daily_pulse for all
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

create policy "Clients: own pulse"
  on daily_pulse for all
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── LAB RESULTS ──────────────────────────────────────────────
create policy "Practitioners: labs via own clients"
  on lab_results for all
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

create policy "Clients: own lab results"
  on lab_results for select
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── PROTOCOLS ────────────────────────────────────────────────
-- Practitioners can manage protocols they created; clients can read assigned ones
create policy "Practitioners: own protocols"
  on protocols for all
  using (
    created_by = (
      select id from practitioners
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Practitioners: read template protocols"
  on protocols for select
  using (is_template = true);

create policy "Clients: read assigned protocols"
  on protocols for select
  using (
    id in (
      select protocol_id from client_protocols
      where client_id = (
        select id from clients
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
      and is_active = true
    )
  );

-- ─── CLIENT PROTOCOLS ─────────────────────────────────────────
create policy "Practitioners: client protocols via own clients"
  on client_protocols for all
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

create policy "Clients: own protocol assignments"
  on client_protocols for select
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── JOURNAL ENTRIES ──────────────────────────────────────────
create policy "Practitioners: journal via own clients"
  on journal_entries for all
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

create policy "Clients: own journal entries"
  on journal_entries for all
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── SUPPLEMENTS ──────────────────────────────────────────────
create policy "Practitioners: supplements via own clients"
  on supplements for all
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

create policy "Clients: own supplements"
  on supplements for all
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── SESSIONS ─────────────────────────────────────────────────
create policy "Practitioners: own sessions"
  on sessions for all
  using (
    practitioner_id = (
      select id from practitioners
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Clients: own sessions"
  on sessions for select
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── MESSAGES ─────────────────────────────────────────────────
-- Users can read messages addressed to them; send messages from themselves
create policy "Users: receive own messages"
  on messages for select
  using (to_user_id = auth.jwt() ->> 'sub');

create policy "Users: send own messages"
  on messages for insert
  with check (from_user_id = auth.jwt() ->> 'sub');

create policy "Users: mark own messages read"
  on messages for update
  using (to_user_id = auth.jwt() ->> 'sub');

-- ─── COPILOT MESSAGES ─────────────────────────────────────────
create policy "Practitioners: own copilot conversations"
  on copilot_messages for all
  using (
    practitioner_id = (
      select id from practitioners
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
