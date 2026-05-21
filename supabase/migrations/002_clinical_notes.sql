-- ─── Clinical Notes ───────────────────────────────────────────
-- Stores both Co-Pilot auto-summaries and manual practitioner notes.
-- client_id is nullable so notes from un-scoped Co-Pilot sessions are preserved.

CREATE TABLE clinical_notes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid        REFERENCES clients(id) ON DELETE CASCADE,
  practitioner_id uuid       REFERENCES practitioners(id),
  note_type      text        CHECK (note_type IN ('copilot_summary', 'manual')),
  content        text        NOT NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_clinical_notes_client     ON clinical_notes(client_id, created_at DESC);
CREATE INDEX idx_clinical_notes_practitioner ON clinical_notes(practitioner_id, created_at DESC);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners see own client notes"
  ON clinical_notes FOR ALL
  USING (
    practitioner_id = (
      SELECT id FROM practitioners
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
