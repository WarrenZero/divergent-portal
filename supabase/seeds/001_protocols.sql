-- Divergent Protocol Library — seed data
-- Run with: psql $DATABASE_URL -f supabase/seeds/001_protocols.sql
-- Or via Supabase CLI: supabase db execute --file supabase/seeds/001_protocols.sql

insert into protocols (name, category, phase_count, is_template, created_by)
values
  (
    'ENS Restoration Protocol — Non-Verbal Neurodivergent',
    'frequency,light,electromagnetic,manual,nutrition,neurodivergent',
    3,
    true,
    null
  ),
  (
    'ENS Signal-to-Noise Protocol — Boron MABC Loading',
    'nutrition,neurodivergent',
    4,
    true,
    null
  )
on conflict do nothing;
