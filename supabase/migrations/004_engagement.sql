-- ─── Engagement Nudge Log ─────────────────────────────────────────
-- Tracks every nudge/digest email sent to clients

create table if not exists nudge_log (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  nudge_type text not null check (nudge_type in ('pulse', 'journal', 'milestone', 'digest')),
  message text,
  sent_at timestamptz default now()
);

create index if not exists idx_nudge_log_client       on nudge_log(client_id);
create index if not exists idx_nudge_log_practitioner on nudge_log(practitioner_id);
create index if not exists idx_nudge_log_sent_at      on nudge_log(sent_at desc);

alter table nudge_log enable row level security;

create policy "Practitioners manage own nudge logs"
  on nudge_log for all using (
    practitioner_id = (
      select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
