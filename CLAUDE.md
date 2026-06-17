# CLAUDE.md — Divergent Portal (Production App)

## Skills — Read These First

Before any build task, read the relevant skill files in `.claude/skills/`:

- **design-system.md** — Colors, typography, components, Divergent design tokens
- **supabase.md** — Database patterns, RLS, auth, migrations, storage
- **nextjs.md** — App Router patterns, server vs client components, API routes
- **resend.md** — Email templates, attachments, all email types
- **claude-api.md** — AI integration, guardrail, HTMA prompts, streaming
- **divergent-context.md** — Full platform context, business model, all features

---

## Quick Reference

- **Master context:** See parent `CLAUDE.md` at `/Users/tayblack/Desktop/Claude Agent/CLAUDE.md`
- **Design source of truth:** `divergent-v11.html` (466 KB static prototype)
- **Stack:** Next.js 14 App Router · Supabase · Clerk · Anthropic · Resend · Stripe · Twilio
- **Model default:** `claude-sonnet-4-6`
- **Dev server:** `npm run dev` → localhost:3000

## Non-Negotiable Rules

1. Color tokens are locked — never deviate from Pine/Bone/Copper palette
2. Fonts are locked — Syne (display), Lora (body), JetBrains Mono (code)
3. No `any` TypeScript types in clinical data models
4. No PHI in localStorage, sessionStorage, or JS variables
5. RLS must be active on all PHI tables — a practitioner must never see another's clients
6. Language rules: never use "heal," "cure," "treat," "diagnose" as outcome claims
7. The ✦ glyph (U+2726) is the brand mark — never remove or replace it
