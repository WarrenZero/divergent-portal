-- ═══════════════════════════════════════════════════════════════
-- 006_transcriptions.sql
-- AI Session Transcription — session_transcriptions +
-- practitioner_vocabulary tables
-- ═══════════════════════════════════════════════════════════════

-- ─── Session Transcriptions ──────────────────────────────────────

CREATE TABLE session_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  practitioner_id uuid REFERENCES practitioners(id),

  -- Raw capture
  raw_transcript text,
  audio_duration_seconds integer,
  speaker_segments jsonb DEFAULT '[]',

  -- Three Lenses — Claude-generated
  lens_clean_transcript text,
  lens_clinical_matrix jsonb,
  lens_client_roadmap text,

  -- Structured extractions
  verification_checklist jsonb DEFAULT '[]',
  qualitative_trendlines jsonb DEFAULT '[]',
  acoustic_metatags jsonb DEFAULT '[]',

  -- Processing state
  status text NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'processing', 'complete', 'error')),
  error_message text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE session_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners see own transcriptions"
  ON session_transcriptions FOR ALL USING (
    practitioner_id = (
      SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE INDEX idx_transcriptions_session_id    ON session_transcriptions(session_id);
CREATE INDEX idx_transcriptions_practitioner  ON session_transcriptions(practitioner_id);
CREATE INDEX idx_transcriptions_client        ON session_transcriptions(client_id);
CREATE INDEX idx_transcriptions_status        ON session_transcriptions(status);

-- ─── Auto-update updated_at ──────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_transcription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transcriptions_updated_at
  BEFORE UPDATE ON session_transcriptions
  FOR EACH ROW EXECUTE FUNCTION handle_transcription_updated_at();

-- ─── Practitioner Vocabulary ─────────────────────────────────────

CREATE TABLE practitioner_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES practitioners(id) ON DELETE CASCADE,
  term text NOT NULL,
  definition text NOT NULL,
  phonetic_variants text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE practitioner_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners manage own vocabulary"
  ON practitioner_vocabulary FOR ALL USING (
    practitioner_id = (
      SELECT id FROM practitioners WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE INDEX idx_vocabulary_practitioner ON practitioner_vocabulary(practitioner_id);
