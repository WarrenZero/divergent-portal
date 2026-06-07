import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { getCurrentPractitioner, getCurrentClient } from '@/lib/clerk';
import { createServiceClient } from '@/lib/supabase/server';
import styles from './Portal.module.css';

export const metadata = { title: 'Divergent' };

/**
 * Role dispatcher — every login/signup lands here.
 *
 * Order of checks:
 * 1. Practitioner by clerk_user_id → /dashboard
 * 2. Client by clerk_user_id       → /checkin  (returning client)
 * 3. Client by email               → link + send welcome email + /checkin
 * 4. Neither                       → "not set up yet" screen
 */

// ─── Email helpers ────────────────────────────────────────────────

function selfGuidedWelcomeHtml(firstName: string, portalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Divergent</title>
</head>
<body style="margin:0;padding:0;background:#F8F2E8;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2E8;">
<tr><td align="center" style="padding:32px 20px 48px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header bar -->
  <tr><td style="background:#0F1F13;border-radius:10px 10px 0 0;padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:Georgia,serif;font-size:20px;color:#C07848;">✦</td>
        <td style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#B0C8B4;text-align:right;">
          DIVERGENT NUTRITIONAL THERAPY
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Copper rule -->
  <tr><td style="background:#C07848;height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Body -->
  <tr><td style="background:#FDFAF5;padding:36px 32px 28px;border-radius:0 0 10px 10px;border:1px solid #E8DECE;border-top:none;">

    <!-- Greeting -->
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#0F1F13;margin:0 0 20px;">
      Hi ${firstName},
    </p>

    <!-- Opening -->
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 16px;">
      Welcome. I'm glad you're here — and I mean that specifically, not as a formality. The decision to start paying attention to your body, on your own terms, before a crisis forces the conversation, is one of the most intelligent things a person can do for their long-term health.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 28px;">
      That's what the Self-Guided Portal is designed to support. Not a quick fix. Not a rigid program. A structure for developing the attention your body has been asking for.
    </p>

    <!-- Section: What This Portal Is -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      What This Portal Is
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 12px;">
      The Divergent Self-Guided Portal gives you clinical-grade tools — the same Health Assessment, food journal, meal planning, and AI wellness insights I use with my direct clients — in a format you can work through at your own pace, without sessions.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 28px;">
      After 3 days of food logging, the portal begins generating personalized weekly insights based on your data. After 7 days, you'll have your first wellness picture. After 30 days, you'll understand your body in ways that may surprise you.
    </p>

    <!-- Section: Daily Workflow -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      Your Daily Workflow — Keep It Simple
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 12px;">
      Your daily practice has one non-negotiable and two recommended actions:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="padding:12px 16px;background:#0F1F13;border-radius:8px;border-left:3px solid #C07848;">
        <p style="font-family:'Syne',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C07848;margin:0 0 6px;">NON-NEGOTIABLE (15 seconds)</p>
        <p style="font-family:Georgia,serif;font-size:14px;color:#DDE8DE;line-height:1.65;margin:0;">
          ✦ Open the portal and tap your daily check-in emoji — how are you feeling today? Do this every morning. Same time if possible. This is the data that makes everything else meaningful.
        </p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="padding:12px 16px;background:#F0E8DA;border-radius:8px;border-left:3px solid #D08C5C;">
        <p style="font-family:'Syne',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A4810;margin:0 0 6px;">RECOMMENDED (3–5 minutes)</p>
        <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.65;margin:0;">
          ✦ Log at least one meal in your Food + Mood Journal. You don't need to log every meal — one honest entry per day is enough to build useful patterns.
        </p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:12px 16px;background:#DDE8DE;border-radius:8px;border-left:3px solid #3A5C42;">
        <p style="font-family:'Syne',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#2A4330;margin:0 0 6px;">WHEN YOU HAVE 10 MINUTES</p>
        <p style="font-family:Georgia,serif;font-size:14px;color:#2A4330;line-height:1.65;margin:0;">
          ✦ Read one article in your Foundation Library. Start with the foundation that scored highest on your Health Assessment — that's where your body needs the most support right now.
        </p>
      </td></tr>
    </table>

    <!-- Section: Weekly Rhythm -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      Your Weekly Rhythm
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 12px;">
      Each week has a natural structure:
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.75;margin:0 0 6px;">
      <strong style="font-family:'Syne',Arial,sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#3A5C42;">Sunday evening</strong> — Your weekly summary email arrives: a brief review of your check-ins, food patterns, and consistency score.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.75;margin:0 0 6px;">
      <strong style="font-family:'Syne',Arial,sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#3A5C42;">Monday morning</strong> — Your weekly AI wellness insight is ready in the portal. A personalized observation about patterns in your data — written specifically about you.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.75;margin:0 0 16px;">
      <strong style="font-family:'Syne',Arial,sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#3A5C42;">Throughout the week</strong> — Daily check-in every morning. One food journal entry when you can. One foundation article when you have time.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:14px 18px;background:#F0E8DA;border-radius:8px;border-top:2px solid #C07848;">
        <p style="font-family:Georgia,serif;font-style:italic;font-size:15px;color:#5A4C38;line-height:1.65;margin:0 0 4px;">
          "What pattern did I notice this week that I hadn't noticed before?"
        </p>
        <p style="font-family:Georgia,serif;font-size:12px;color:#9A8A72;margin:0;">
          Ask this every week. This portal is designed to support that question.
        </p>
      </td></tr>
    </table>

    <!-- Section: First Three Steps -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#C07848;margin:0 0 14px;padding-top:4px;border-top:1px solid #E8DECE;">
      Your First Three Steps
    </p>

    <!-- Step 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td width="32" valign="top" style="font-family:'Syne',Arial,sans-serif;font-size:18px;font-weight:800;color:#C07848;padding-top:2px;">1.</td>
        <td style="padding-left:8px;">
          <p style="font-family:'Syne',Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;margin:0 0 4px;">Complete your Health Assessment</p>
          <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.65;margin:0 0 8px;">10 minutes. Opens your personalized learning path and generates your first wellness score.</p>
          <a href="${portalUrl}/naq" style="display:inline-block;padding:9px 20px;background:#C07848;color:#fff;font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-decoration:none;border-radius:6px;">Complete My Assessment →</a>
        </td>
      </tr>
    </table>

    <!-- Step 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td width="32" valign="top" style="font-family:'Syne',Arial,sans-serif;font-size:18px;font-weight:800;color:#C07848;padding-top:2px;">2.</td>
        <td style="padding-left:8px;">
          <p style="font-family:'Syne',Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;margin:0 0 4px;">Log your first daily check-in</p>
          <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.65;margin:0 0 8px;">Tap one emoji. Takes 15 seconds. Do it now if you haven't already.</p>
          <a href="${portalUrl}/checkin" style="display:inline-block;padding:9px 20px;background:#C07848;color:#fff;font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-decoration:none;border-radius:6px;">Open My Portal →</a>
        </td>
      </tr>
    </table>

    <!-- Step 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="32" valign="top" style="font-family:'Syne',Arial,sans-serif;font-size:18px;font-weight:800;color:#C07848;padding-top:2px;">3.</td>
        <td style="padding-left:8px;">
          <p style="font-family:'Syne',Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;margin:0 0 4px;">Read your member guide</p>
          <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.65;margin:0;">Everything you need to know about how this portal works and what to expect is in the attached PDF. Open it. Keep it somewhere you can find it.</p>
        </td>
      </tr>
    </table>

    <!-- Closing -->
    <p style="font-family:Georgia,serif;font-style:italic;font-size:15px;color:#C07848;line-height:1.75;margin:0 0 16px;padding-top:24px;border-top:1px solid #E8DECE;">
      Your body has answers. This portal helps you hear them.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 20px;">
      I'll be watching your data — not you personally, but the patterns your consistency generates. The more honestly you log, the more useful your weekly insights will be.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 28px;">
      Start today. Not perfectly. Just start.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;margin:0 0 4px;">— Warren Hennon, NTP</p>
    <p style="font-family:Georgia,serif;font-size:13px;color:#9A8A72;margin:0;">Divergent Nutritional Therapy</p>

    <!-- Footer -->
    <p style="font-family:Georgia,serif;font-size:11px;color:#9A8A72;margin:32px 0 0;padding-top:16px;border-top:1px solid #E8DECE;line-height:1.6;">
      You're receiving this because you created a Divergent Self-Guided account.
      Questions? <a href="mailto:warren@divergentnt.com" style="color:#C07848;">warren@divergentnt.com</a>
    </p>

  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function programWelcomeHtml(firstName: string, portalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F1F13;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1F13;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:36px;color:#D08C5C;">✦</span>
  </td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FDFAF5;padding-bottom:8px;">
    Hello, ${firstName}.
  </td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:16px;color:#FDFAF5;line-height:1.65;padding-bottom:20px;">
    Your private wellness portal is ready. Warren has reviewed your intake and your protocol is waiting.
  </td></tr>
  <tr><td style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#B0C8B4;line-height:1.65;padding-bottom:28px;">
    Your first session will set everything in motion. Until then, take 10 minutes to complete your Health Assessment — it's the foundation Warren will use to guide your protocol.
  </td></tr>
  <tr><td align="center" style="padding-bottom:20px;">
    <a href="${portalUrl}/checkin" style="display:inline-block;padding:16px 36px;background:#C07848;color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">
      Open My Portal →
    </a>
  </td></tr>
  <tr><td align="center" style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#D08C5C;padding-bottom:32px;">
    Your body has answers. We help you hear them.
  </td></tr>
  <tr><td align="center" style="font-family:monospace;font-size:10px;color:#3A5C42;letter-spacing:0.06em;text-transform:uppercase;">
    Warren Hennon, NTP · 1,226 hours · NTA Tumwater · Honors
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function simpleWelcomeHtml(firstName: string, portalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F1F13;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1F13;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:20px;"><span style="font-size:32px;color:#D08C5C;">✦</span></td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#FDFAF5;padding-bottom:12px;">Hello, ${firstName}.</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:15px;color:#DDE8DE;line-height:1.65;padding-bottom:24px;">
    Your Divergent portal is ready. Start by completing your Health Assessment — it takes 10 minutes and generates your personalized wellness picture.
  </td></tr>
  <tr><td align="center" style="padding-bottom:20px;">
    <a href="${portalUrl}/checkin" style="display:inline-block;padding:14px 32px;background:#C07848;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Open My Portal →</a>
  </td></tr>
  <tr><td align="center" style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#D08C5C;">
    Your body has answers. We help you hear them.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendFirstLoginEmail(
  firstName: string,
  email: string,
  tier: string,
  portalUrl: string,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const { Resend } = await import('resend');
  const resend = new Resend(resendKey);

  if (tier === 'self_guided') {
    // Try to attach the self-guided guide PDF
    type ResendAttachment = { filename: string; content: string; contentType: string };
    const attachments: ResendAttachment[] = [];
    try {
      const pdfPath = path.join(process.cwd(), 'public', 'documents', 'self-guided-guide.pdf');
      if (fs.existsSync(pdfPath)) {
        const pdfBuffer = fs.readFileSync(pdfPath);
        attachments.push({
          filename: 'Divergent-Self-Guided-Guide.pdf',
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        });
      }
    } catch {
      // Non-fatal — send without attachment if file isn't there yet
    }

    await resend.emails.send({
      from: 'Warren Hennon, NTP <warren@divergentnt.com>',
      to: email,
      subject: `Welcome to Divergent, ${firstName} — here's everything you need to begin ✦`,
      html: selfGuidedWelcomeHtml(firstName, portalUrl),
      ...(attachments.length > 0 && { attachments }),
    });
  } else if (['community', 'vip', 'program_90day'].includes(tier)) {
    await resend.emails.send({
      from: 'Warren Hennon, NTP <warren@divergentnt.com>',
      to: email,
      subject: `Your portal is ready, ${firstName} ✦`,
      html: programWelcomeHtml(firstName, portalUrl),
    });
  } else {
    // none or unknown tier
    await resend.emails.send({
      from: 'Warren Hennon, NTP <warren@divergentnt.com>',
      to: email,
      subject: `Welcome to Divergent, ${firstName} ✦`,
      html: simpleWelcomeHtml(firstName, portalUrl),
    });
  }
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function PortalPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // ── 1. Practitioner ────────────────────────────────────────────
  const practitioner = await getCurrentPractitioner();
  if (practitioner) redirect('/dashboard');

  // ── 2. Client (returning — already linked) ─────────────────────
  const client = await getCurrentClient();
  if (client) redirect('/checkin');

  // ── 3. Client (first login after invite — link by email) ────────
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? null;

  if (email) {
    const supabase = await createServiceClient();
    const { data: match } = await supabase
      .from('clients')
      .select('id, first_name, email, subscription_tier, first_login_email_sent')
      .eq('email', email)
      .is('clerk_user_id', null)
      .maybeSingle();

    if (match) {
      // Link the Clerk account
      await supabase
        .from('clients')
        .update({ clerk_user_id: userId })
        .eq('id', match.id);

      // Send welcome email if not already sent
      if (!match.first_login_email_sent && match.email) {
        const portalUrl =
          process.env.NEXT_PUBLIC_APP_URL ??
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://divergentportal.com');

        try {
          await sendFirstLoginEmail(
            match.first_name,
            match.email,
            match.subscription_tier ?? 'none',
            portalUrl,
          );
        } catch {
          // Non-fatal — don't block login if email fails
        }

        await supabase
          .from('clients')
          .update({ first_login_email_sent: true })
          .eq('id', match.id);
      }

      redirect('/checkin');
    }
  }

  // ── 4. Not set up ───────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.glyph}>✦</div>
        <h1 className={styles.title}>You&rsquo;re almost there</h1>
        <p className={styles.body}>
          Your practitioner hasn&rsquo;t linked your account yet. Once they add your
          email to their client list and send you an invitation, you&rsquo;ll have
          full access to your wellness portal.
        </p>
        {email && (
          <p className={styles.email}>
            Signed in as <strong>{email}</strong>
          </p>
        )}
        <p className={styles.hint}>
          If you believe this is an error, reach out to your practitioner directly.
        </p>
        <Link href="/login" className={styles.back}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
