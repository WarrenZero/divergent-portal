-- ═══════════════════════════════════════════════════════════════
-- 007_daily_pulse_energy.sql
-- Add energy_score (emoji check-in) to daily_pulse table
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE daily_pulse
  ADD COLUMN IF NOT EXISTS energy_score integer
    CHECK (energy_score BETWEEN 1 AND 5);

-- Make the three detail scores nullable (they now come from the
-- expanded slider section, which is optional after the emoji update)
ALTER TABLE daily_pulse
  ALTER COLUMN digestion_score DROP NOT NULL,
  ALTER COLUMN sleep_score     DROP NOT NULL,
  ALTER COLUMN stress_score    DROP NOT NULL;
