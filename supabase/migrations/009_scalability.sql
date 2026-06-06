-- ─── Migration 009: Scalability & Multi-NTP Platform ──────────
-- Adds: clinical note flagging, practitioner practice settings,
--       protocol week focus content, lab marker history tracking,
--       and onboarding tracking.

-- Flag important clinical notes
ALTER TABLE clinical_notes
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;

-- Practitioner practice settings (multi-NTP branding)
ALTER TABLE practitioners
ADD COLUMN IF NOT EXISTS practice_name text,
ADD COLUMN IF NOT EXISTS practice_tagline text,
ADD COLUMN IF NOT EXISTS brand_color text DEFAULT 'pine',
ADD COLUMN IF NOT EXISTS practitioner_bio text,
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Protocol week-specific focus content
CREATE TABLE IF NOT EXISTS protocol_week_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES protocols(id) ON DELETE CASCADE,
  phase integer NOT NULL,
  week_number integer NOT NULL,
  focus_1 text,
  focus_2 text,
  focus_3 text,
  UNIQUE(protocol_id, phase, week_number)
);

-- Enable RLS on protocol_week_focus
ALTER TABLE protocol_week_focus ENABLE ROW LEVEL SECURITY;

-- RLS: practitioners can read all protocol week focus (it's shared content)
CREATE POLICY "Practitioners read protocol week focus"
  ON protocol_week_focus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM practitioners
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS: clients can read protocol week focus
CREATE POLICY "Clients read protocol week focus"
  ON protocol_week_focus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Lab marker history (tracks individual marker values over time)
CREATE TABLE IF NOT EXISTS lab_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  lab_result_id uuid REFERENCES lab_results(id) ON DELETE SET NULL,
  marker_name text NOT NULL,
  value numeric,
  unit text,
  functional_status text, -- 'optimal', 'low', 'high', 'critical_low', 'critical_high'
  parsed_at timestamptz DEFAULT now()
);

-- Enable RLS on lab_markers
ALTER TABLE lab_markers ENABLE ROW LEVEL SECURITY;

-- RLS: practitioners see markers for their clients
CREATE POLICY "Practitioners see client lab markers"
  ON lab_markers FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE practitioner_id = (
        SELECT id FROM practitioners
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- RLS: clients see their own lab markers
CREATE POLICY "Clients see own lab markers"
  ON lab_markers FOR SELECT
  USING (
    client_id = (
      SELECT id FROM clients
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Index for efficient marker history queries
CREATE INDEX IF NOT EXISTS lab_markers_client_marker
  ON lab_markers (client_id, marker_name, parsed_at DESC);
