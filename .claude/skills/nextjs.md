# Next.js App Router Patterns — Divergent Portal

## Project Structure

```
app/
  (auth)/               # Auth route group — login, signup
    layout.tsx
    login/
    signup/
  (practitioner)/       # Practitioner portal — requires practitioner auth
    layout.tsx
    dashboard/
    clients/
    naq/
    labs/
    protocols/
    protocol-library/
    meal-plans/
    engagement/
    symptom-maps/
    settings/
    workflow/
    onboarding/
    journal/            # Practitioner-side journal review
  (client)/             # Client portal — requires client auth
    layout.tsx
    checkin/
    journey/
    protocol/
    journal/
    vault/
    sessions/
    naq/
    meals/
    welcome/
  api/                  # API routes (all server-side)
    copilot/route.ts
    emails/route.ts
    emails/weekly-accountability/route.ts
    clinical-notes/
    copilot/
    documents/
    engagement/
    insights/
    labs/
    mealplans/
    transcriptions/
    vault/
    vocabulary/
  portal/               # Legacy/static portal routes if needed
  layout.tsx            # Root layout (fonts, Clerk provider)
  globals.css
  page.tsx              # Landing page

components/
  practitioner/         # Practitioner-specific components
    PractitionerShell.tsx/.module.css
    PractitionerSidebar.tsx/.module.css
    PractitionerTopNav.tsx/.module.css
    CopilotPanel.tsx/.module.css
    MacroBar.tsx/.module.css
  client/               # Client-specific components
  shared/               # Used by both portals
  ui/                   # Generic UI primitives

lib/
  supabase/
    server.ts           # Server client (Clerk JWT injected)
    client.ts           # Browser client
    middleware.ts       # Supabase middleware helper
  anthropic/
    client.ts           # Anthropic SDK instance
    systemPrompt.ts     # Co-Pilot system prompt (verbatim)
  clerk/
    clerkAppearance.ts  # Clerk UI theme matching design system
  validations/          # Zod schemas for form inputs
  naqWarnings.ts        # NAQ domain warning logic
  unsplash.ts           # Unsplash integration helper

supabase/
  migrations/           # SQL migration files
  seeds/                # Seed data
  config.toml
```

## Route Groups

- `(auth)` — unauthenticated routes, Clerk sign-in/sign-up
- `(practitioner)` — protected; layout.tsx wraps in practitioner auth check
- `(client)` — protected; layout.tsx wraps in client auth check

## Server vs Client Components

**Default: Server Components.** Only add `'use client'` when needed.

Use `'use client'` for:
- Components with `useState`, `useEffect`, `useRef`
- Event handlers (onClick, onChange, onSubmit)
- Browser APIs (localStorage, window, canvas)
- Real-time subscriptions

Keep Server Components for:
- Data fetching (direct Supabase queries)
- Auth checks
- Static content
- Layout wrappers

## Auth Pattern (Clerk)

**In Server Components / API Routes:**
```typescript
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();
if (!userId) redirect('/login');
```

**In Client Components:**
```typescript
import { useAuth, useUser } from '@clerk/nextjs';
const { userId, isLoaded } = useAuth();
```

**Root layout must wrap with ClerkProvider:**
```typescript
import { ClerkProvider } from '@clerk/nextjs';
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  );
}
```

## API Route Pattern

```typescript
// app/api/some-route/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();
  // ... query and return
  return NextResponse.json({ data });
}
```

## Streaming API Routes (SSE)

The copilot API streams via Server-Sent Events:
```typescript
export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // stream chunks via controller.enqueue(...)
      controller.close();
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

## TypeScript Rules

- **No `any` types in clinical data models.** Define explicit interfaces.
- Use Supabase's generated types when available.
- Zod schemas live in `lib/validations/` for all user inputs.

## Middleware

`middleware.ts` at root handles Clerk auth + Supabase session refresh. Keep it minimal — auth routing logic belongs in layouts.

## Dependencies (from package.json)
- `next: ^16.2.6` with App Router
- `@clerk/nextjs: ^7.3.5`
- `@supabase/ssr: ^0.10.3` + `@supabase/supabase-js: ^2.105.4`
- `@anthropic-ai/sdk: ^0.96.0`
- `resend: ^6.12.3`
- `stripe: ^22.1.1`
- `twilio: ^6.0.2`
