# Resend Email Patterns — Divergent Portal

## Setup

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
```

From address: use a verified domain address (e.g. `warren@divergentnt.com` or `hello@divergentnt.com`).

## Existing Email Routes

| Route | Trigger | Purpose |
|---|---|---|
| `POST /api/emails` | Client onboarding | Welcome email with self-guided PDF attachment |
| `POST /api/emails/weekly-accountability` | Weekly cron / engagement | Weekly accountability email with AI insights |

## Email Template Pattern

Resend accepts React components or raw HTML. For this project, use inline HTML strings for simplicity unless a React Email template is set up:

```typescript
const { data, error } = await resend.emails.send({
  from: 'Divergent Nutritional Therapy <hello@divergentnt.com>',
  to: [clientEmail],
  subject: 'Welcome to Divergent — Your Nutrition Journey Begins',
  html: generateWelcomeHtml({ clientName, practitionerName }),
  attachments: [
    {
      filename: 'divergent-member-guide.pdf',
      content: pdfBuffer.toString('base64'),
    }
  ]
});
if (error) throw new Error(error.message);
```

## HTML Template Guidelines

Follow the design system in all email HTML:
- Background: `#FDFAF5` (--bone-50)
- Card surface: `#F8F2E8` (--bone-100)
- Primary text: `#5A4C38` (--bone-800)
- Accent / CTA button: `#C07848` (--copper-500)
- Font stack: `Georgia, 'Times New Roman', serif` (Lora fallback for email clients)
- Header font: `Arial, Helvetica, sans-serif` (Syne fallback)
- Include ✦ brand mark in header
- FDA disclaimer required on any public-facing email

## Email Types in the System

### Welcome Email
- Triggered: when a new client is onboarded (practitioner action or self-signup)
- Includes: self-guided member guide PDF attachment
- Content: personal intro from Warren, what to expect, portal access link
- File: `app/api/emails/route.ts`

### Weekly Accountability Email
- Triggered: weekly cron job or engagement loop
- Includes: AI-generated weekly insights summary, protocol check-in nudge, streak data
- Content: past-week summary, upcoming week encouragement
- File: `app/api/emails/weekly-accountability/route.ts`

### Engagement Trigger Emails (future)
- Missed check-in reminder (Day 3 of no pulse entry)
- Protocol phase transition notification
- Lab results ready notification
- Session reminder (24hr before)

## PDF Attachments

PDF buffers come from:
1. Public assets in `public/` (e.g. member guide) — read with `fs.readFileSync`
2. Dynamically generated (e.g. physician reports) — use `@react-pdf/renderer`

```typescript
import fs from 'fs';
import path from 'path';
const pdfBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'member-guide.pdf'));
```

## Brand & Compliance in Emails

**Language rules apply in emails too:**
- Use: "may support," "foundational nutrition," "restoration"
- Never use: "heal," "cure," "treat," "diagnose"

**FDA disclaimer** — include in footer of any client-facing email:
> Statements regarding nutritional support have not been evaluated by the Food and Drug Administration. Foundational nutrition is intended to support the body's natural systems and is not intended to diagnose, treat, cure, or prevent any disease.

## Error Handling

Always check for Resend errors and log them server-side. Never expose raw Resend errors to the client. Email failures should not block the primary action (e.g. client creation should succeed even if welcome email fails — log the error separately).
