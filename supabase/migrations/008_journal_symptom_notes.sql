-- Add per-direction symptom note fields to journal_entries.
-- The existing `symptoms` column is preserved for historical data.

alter table journal_entries
  add column if not exists symptom_before_note text,
  add column if not exists symptom_after_note  text;
