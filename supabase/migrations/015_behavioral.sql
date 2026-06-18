-- 015_behavioral.sql
-- Post-Appointment Compliance Cliff behavioral features
-- Tables: compliance_logs
-- Columns added: clients.behavioral_baseline, clients.last_psychological_state, clients.shame_signal_active

-- ─── compliance_logs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_logs (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid references clients(id) on delete cascade,
  log_date                date default current_date,
  supplement_compliance   integer check (supplement_compliance between 0 and 100),
  protocol_compliance     integer check (protocol_compliance between 0 and 100),
  friction_level          integer check (friction_level between 1 and 5),
  friction_reasons        text[],
  psychological_state     text check (psychological_state in (
                            'motivated','steady','struggling','overwhelmed','avoidant','ashamed'
                          )),
  identity_statement_shown boolean default false,
  client_note             text,
  created_at              timestamptz default now()
);

-- ─── Client behavioral columns ───────────────────────────────────────────────

ALTER TABLE clients ADD COLUMN IF NOT EXISTS behavioral_baseline  jsonb default '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_psychological_state text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS shame_signal_active  boolean default false;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE compliance_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Clients insert own compliance log"
    ON compliance_logs FOR INSERT
    WITH CHECK (
      client_id = (
        SELECT id FROM clients WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Clients read own compliance log"
    ON compliance_logs FOR SELECT
    USING (
      client_id = (
        SELECT id FROM clients WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Practitioners read client compliance logs"
    ON compliance_logs FOR SELECT
    USING (
      client_id IN (
        SELECT id FROM clients
        WHERE practitioner_id = (
          SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
