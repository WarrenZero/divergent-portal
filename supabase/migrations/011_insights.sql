-- client_insights table
CREATE TABLE IF NOT EXISTS client_insights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  insight_text text not null,
  insight_type text default 'weekly',
  week_start date,
  generated_at timestamptz default now(),
  is_read boolean default false
);

CREATE INDEX IF NOT EXISTS idx_insights_client
  ON client_insights(client_id, generated_at DESC);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS last_insight_generated_at timestamptz;

ALTER TABLE vault_items
  ALTER COLUMN content_type TYPE text;

-- Allow book_recommendation content type
-- RLS
ALTER TABLE client_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own insights"
  ON client_insights FOR SELECT USING (
    client_id = (
      SELECT id FROM clients WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Service role manages insights"
  ON client_insights FOR ALL USING (true);
