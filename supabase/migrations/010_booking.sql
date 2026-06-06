-- ─── Migration 010: Booking & Subscription Tier ──────────────

-- Subscription tier on clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'none'
  CHECK (subscription_tier IN ('none', 'self_guided', 'community', 'vip', 'program_90day'));

-- Track whether the post-signup welcome email was sent
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_login_email_sent boolean DEFAULT false;

-- sessions_completed: denormalized counter (updated by trigger or server action)
-- Derived from SELECT count(*) WHERE status = 'completed', no extra column needed.

-- RLS: subscription_tier is readable by the client themselves and their practitioner
-- (existing "Practitioners see own clients" and "Clients see own data" policies cover this)
