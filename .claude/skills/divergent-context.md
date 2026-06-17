# Divergent Nutritional Therapy Portal — Full Context

## The Business

**Product:** Divergent Nutritional Therapy Portal
**Owner:** Warren Hennon, NTP
**Credentials:** Successfully completed the 1,226-hour Nutritional Therapy Practitioner Program through the Nutritional Therapy Association in Tumwater, Washington — graduating with Honors.
**Location:** Tumwater, WA
**Philosophy:** Humane AI Wellness Product. Parasympathetic-first design. Every color, interaction, and moment is engineered to calm the nervous system.

## Platform Status

- v11 static HTML prototype exists at `divergent-v11.html` (466 KB, source of truth for design/UX)
- Next.js App Router production app is being built at this repo
- Phase 1 in progress — porting v11 to production-grade HIPAA-compliant platform

## Two User Types

### Practitioners (Warren + future NTPs)
Access via `(practitioner)` route group. See all their clients. Use the full clinical toolkit.

**Practitioner features:**
- Client dashboard with wellness scores and protocol status
- Dynamic NAQ (AI-adaptive 10-domain Nutritional Assessment Questionnaire)
- Lab Parser — PDF parsing, functional vs standard ranges
- Spider/radar chart — canvas symptom burden visualization
- Meal Plan Generator — 360k+ recipe filter, protocol/allergen tags, 7-day grid
- AI Clinical Co-Pilot — floating ✦ FAB, streaming chat with HTMA reasoning
- Protocol Library — ENS Restoration Protocol, ENS Signal-to-Noise Protocol
- Clinical Notes / SOAP notes
- Engagement Loop — trigger-based client engagement automation
- Symptom Maps
- Workflow (booking/protocols/meals/billing)
- Session management + Calendly integration
- Secure messaging
- Form Builder
- AI Co-Pilot Config

### Clients
Access via `(client)` route group. See only their own data.

**Client features:**
- Daily Pulse Check-In — 3 sliders (digestion/sleep/stress 1-10)
- My Journey — progress timeline, wellness score
- My Protocol — current protocol with phase tracking, mastery map
- Food + Mood Journal — daily logging, accordion history, AI pattern notes
- The Vault — secure document storage
- Supplements — active supplement stack
- Session Booking — Calendly embed, session gating
- NAQ — client-side assessment
- Meals — 7-day meal plan view
- Welcome — onboarding flow

## Service Tiers

**Self-Guided Tier:**
- No practitioner sessions
- AI weekly insights
- Weekly summary email
- Foundation library + books (12 curated books, seeded)
- Protocol activation
- Progress celebrations
- Welcome email with PDF attachment

**Guided/Full Program:**
- All self-guided features
- 90-day program card
- Practitioner session booking
- NAQ review tab
- Session gating (book only after NAQ)
- Personalized protocol assignment

## Clinical Framework

**HTMA (Hair Tissue Mineral Analysis)** is the primary analytical framework.
Key concepts the AI must understand:
- Oxidation rates: Fast (sympathetic/humoral) vs Slow (parasympathetic/cellular)
- Critical mineral ratios: Ca/Mg (thyroid), Na/K (adrenal), Zn/Cu, Zn/Cd
- Somatopsychic links: mineral imbalances → emotional/psychological symptoms
- Specific Dynamic Action (SDA): macro ratios by metabolic type

**Protocols in the system:**
1. ENS Restoration Protocol — digestive system restoration
2. ENS Signal-to-Noise Protocol — nervous system noise reduction
Both have full dual practitioner/client views, medication toggles, mastery maps, 30-day onboarding.

## Brand & Compliance Rules

**Language rules (non-negotiable):**
- Use: "may support," "foundational nutrition," "restoration," "recalibration," "sustainable"
- Never use: "heal," "cure," "treat," "diagnose," "permanent" (outcome), "ensures" (outcome promise)

**Required on all public pages:**
> Statements regarding nutritional support have not been evaluated by the Food and Drug Administration. Foundational nutrition is intended to support the body's natural systems and is not intended to diagnose, treat, cure, or prevent any disease.

**Required when Warren is named professionally:**
> Warren Hennon successfully completed the 1,226-hour Nutritional Therapy Practitioner Program through the Nutritional Therapy Association in Tumwater, Washington — graduating with Honors.

**Medication context blocks** → labeled `[MEDICATION CONTEXT]`, always observational-only
**Referral items** → flagged `[REFERRAL NOTE]` in amber

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14+ App Router | SSR speed, server components for DB |
| Database | Supabase (Postgres + RLS) | HIPAA BAA, built-in auth, realtime |
| Auth | Clerk | HIPAA tier with BAA, MFA, separate scopes |
| Telehealth | Daily.co | Embedded React, HIPAA-compliant |
| Payments | Stripe | HSA/FSA support |
| SMS | Twilio | HIPAA-compatible |
| Email | Resend | Modern DX |
| LLM | Anthropic Claude API | claude-sonnet-4-6 default |
| Mobile (future) | Expo React Native | Port React components |
| Wearables (future) | Terra API | Oura, Whoop, Apple Health, Garmin |
| Transcription (future) | Deepgram | Real-time, cheaper than Whisper |

## Deployment

```
Production:  divergentnt.com
Staging:     staging.divergentnt.com
Dev:         localhost:3000
Hosting:     Vercel (HIPAA tier with BAA signed)
```

## Mock Client (dev only — remove before production)

```
Name: Sarah Morgenstern
Age: 34
Primary concern: GI burden (85% symptom load)
Protocol: GI Repair & Restoration
Protocol week: 1 of 8
Practitioner: Dr. Rivera, NTP
```

## Phase 1 Completion Criteria

- [ ] Next.js app scaffolded with App Router ✓ (in progress)
- [ ] All Supabase tables created with RLS policies active
- [ ] Clerk auth working: practitioner login, client login, separate permission scopes
- [ ] v11 portal HTML ported to React components
- [ ] Daily Pulse form writes to `daily_pulse` table
- [ ] Food Journal form writes to `journal_entries` table
- [ ] Clinical Co-Pilot routes to Claude API with system prompt injected
- [ ] Practitioner dashboard reads real client data
- [ ] All PHI encrypted at rest
- [ ] BAA signed with: Supabase, Clerk, Vercel
- [ ] HelloSign HIPAA consent form sent and signed before any client session
- [ ] HIPAA data inventory document written and saved
- [ ] Zero client data stored in JavaScript variables

## What NOT To Do

- Do not change color tokens. Forest Pine, Warm Bone, Muted Copper are locked.
- Do not swap Syne/Lora for any other font pair.
- Do not add sidebar sections without checking for duplication.
- Do not add features requiring prescribing, diagnosing, or treating diseases.
- Do not store PHI in localStorage, sessionStorage, or unencrypted client-side stores.
- Do not deploy without BAAs signed for all PHI-handling vendors.
- Do not use `any` TypeScript types in clinical data models.
- Do not skip RLS policies. A practitioner must never see another practitioner's clients.
