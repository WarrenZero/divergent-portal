# Supabase Patterns — Divergent Portal

## Client Setup

**Server-side (Server Components, API Routes, Server Actions):**
```typescript
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```
This injects the Clerk JWT via the "supabase" JWT template so RLS policies fire correctly.

**Browser-side (Client Components only):**
```typescript
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

**Service role (admin ops only — bypasses RLS):**
```typescript
import { createServiceClient } from '@/lib/supabase/server';
const supabase = await createServiceClient();
```
Use for: creating practitioner records on first sign-up, sending system emails, seeding. Never expose to browser.

## Auth Integration (Clerk → Supabase)

Clerk must have a JWT template named **"supabase"** configured in the Clerk dashboard (Authentication → JWT Templates → New → Supabase). That template passes the Clerk user ID as `sub`, which RLS policies key off via `auth.jwt() ->> 'sub'`.

The server client in `lib/supabase/server.ts` calls `getToken({ template: 'supabase' })` and injects it as `Authorization: Bearer <token>`.

## RLS Policy Pattern

Every table that contains PHI has RLS enabled. The standard patterns:

```sql
-- Practitioner sees their own record
create policy "Practitioners see own record"
  on practitioners for all
  using (clerk_user_id = auth.jwt() ->> 'sub');

-- Practitioner sees their clients
create policy "Practitioners see own clients"
  on clients for all
  using (
    practitioner_id = (
      select id from practitioners
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Client sees their own PHI (e.g. daily_pulse, journal_entries)
create policy "Clients see own data"
  on daily_pulse for all
  using (
    client_id = (
      select id from clients
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
```

**A practitioner must NEVER see another practitioner's clients.** RLS is the enforcement mechanism — never rely solely on application-layer filtering.

## Core Schema Tables

| Table | Purpose |
|---|---|
| `practitioners` | Warren + future NTPs. Keyed by `clerk_user_id`. |
| `clients` | Client records, linked to practitioner. |
| `naq_responses` | AI-adaptive 10-domain assessment answers. |
| `daily_pulse` | Daily 3-slider check-in (digestion/sleep/stress). |
| `lab_results` | Uploaded lab PDFs + parsed functional markers. |
| `protocols` | Protocol templates + client-assigned protocols. |
| `client_protocols` | Protocol assignment (client ↔ protocol). |
| `journal_entries` | Food + mood journal entries. |
| `supplements` | Client supplement stack. |
| `sessions` | Telehealth session records. |
| `messages` | Secure practitioner ↔ client messages. |
| `copilot_messages` | Co-Pilot conversation history. |
| `clinical_notes` | SOAP notes and clinical notes. |
| `meal_plans` | AI-generated meal plans. |
| `vault` | Secure document storage metadata. |
| `transcriptions` | Session transcription records. |
| `book_recommendations` | Foundation library book records. |

## Migrations

Migrations live in `supabase/migrations/`. Current migrations:
- `001_initial_schema.sql` — core tables
- `002_clinical_notes.sql`
- `003_meal_plans.sql`
- `004_engagement.sql`
- `005_vault.sql`
- `006_transcriptions.sql`
- `007_daily_pulse_energy.sql`
- `008_journal_symptom_notes.sql`
- `009_scalability.sql`
- `010_booking.sql`
- `011_insights.sql`
- `012_book_seeds.sql`

New migrations: `013_<description>.sql`, etc. Always use `supabase db push` or `supabase migration new`.

## Common Query Patterns

**Fetch practitioner record from Clerk user:**
```typescript
const { userId } = await auth(); // Clerk
const { data: practitioner } = await supabase
  .from('practitioners')
  .select('*')
  .eq('clerk_user_id', userId)
  .single();
```

**Fetch clients for a practitioner:**
```typescript
const { data: clients } = await supabase
  .from('clients')
  .select('id, first_name, last_name, primary_concern, wellness_score')
  .order('created_at', { ascending: false });
// RLS filters automatically by practitioner_id
```

**Insert with error handling:**
```typescript
const { data, error } = await supabase
  .from('daily_pulse')
  .insert({ client_id, digestion_score, sleep_score, stress_score })
  .select()
  .single();
if (error) throw new Error(error.message);
```

## Storage

PHI files (lab PDFs, session recordings) go in private Supabase Storage buckets with signed URLs. Never store PHI in public buckets.

## PHI Rules
- All PHI encrypted at rest (Supabase default — verify in project settings).
- Never store PHI in localStorage, sessionStorage, or JS variables.
- BAA must be signed with Supabase before production.
