'use server';

import { Resend } from 'resend';
import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'warren@divergentportal.com';
const SITE_URL = 'https://divergentportal.com';

// ─── Types ────────────────────────────────────────────────────

export interface SessionFormData {
  clientId: string;
  scheduledAt: string; // ISO string
  durationMinutes: number;
  sessionType: string;
  soapNote?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function revalidateAll() {
  revalidatePath('/workflow/sessions');
  revalidatePath('/dashboard');
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSessionTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Email HTML builders ──────────────────────────────────────

function buildConfirmationHtml(opts: {
  firstName: string;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: number;
  sessionType: string;
}): string {
  const { firstName, sessionDate, sessionTime, durationMinutes, sessionType } = opts;
  const typeDisplay = sessionType === 'telehealth' ? 'Telehealth Session' : sessionType;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Session Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#FDFAF5;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFAF5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#1E3122;border-radius:16px 16px 0 0;padding:28px 36px 24px;">
              <div style="font-family:'Arial',sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
                ✦ Divergent
              </div>
              <div style="font-family:'Arial',sans-serif;font-size:11px;font-weight:600;color:#80A088;letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;">
                Nutritional Therapy
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #E8DECE;border-right:1px solid #E8DECE;">

              <p style="font-family:'Arial',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C07848;margin:0 0 20px;">
                Session Confirmed
              </p>

              <p style="font-size:17px;color:#0F1F13;margin:0 0 24px;line-height:1.5;">
                Hi <strong>${firstName}</strong>,
              </p>

              <p style="font-size:15px;color:#5A4C38;margin:0 0 28px;line-height:1.65;">
                Your session with Divergent Nutritional Therapy has been scheduled.
                Here are your details:
              </p>

              <!-- Session details card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#FDFAF5;border:1px solid #E8DECE;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:14px;border-bottom:1px solid #E8DECE;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Date</div>
                          <div style="font-size:15px;color:#0F1F13;font-weight:bold;">${sessionDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0;border-bottom:1px solid #E8DECE;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Time</div>
                          <div style="font-size:15px;color:#0F1F13;font-weight:bold;">${sessionTime}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0;border-bottom:1px solid #E8DECE;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Session Type</div>
                          <div style="font-size:15px;color:#0F1F13;">${typeDisplay}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Duration</div>
                          <div style="font-size:15px;color:#0F1F13;">${durationMinutes} minutes</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:15px;color:#5A4C38;margin:0 0 8px;line-height:1.65;">
                Your practitioner <strong>Warren Hennon, NTP</strong> looks forward to seeing you.
                If you need to reschedule, please reach out in advance.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8F2E8;border:1px solid #E8DECE;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;">
              <p style="font-family:'Arial',sans-serif;font-size:11px;color:#9A8A72;margin:0 0 4px;">
                Warren Hennon, NTP · Divergent Nutritional Therapy
              </p>
              <p style="font-family:'Arial',sans-serif;font-size:11px;color:#9A8A72;margin:0;">
                <a href="${SITE_URL}" style="color:#C07848;text-decoration:none;">${SITE_URL}</a>
                &nbsp;·&nbsp;
                Tumwater, WA
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCancellationHtml(opts: {
  firstName: string;
  sessionDate: string;
  sessionTime: string;
  sessionType: string;
}): string {
  const { firstName, sessionDate, sessionTime, sessionType } = opts;
  const typeDisplay = sessionType === 'telehealth' ? 'Telehealth Session' : sessionType;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Session Cancelled</title>
</head>
<body style="margin:0;padding:0;background:#FDFAF5;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFAF5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#1E3122;border-radius:16px 16px 0 0;padding:28px 36px 24px;">
              <div style="font-family:'Arial',sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
                ✦ Divergent
              </div>
              <div style="font-family:'Arial',sans-serif;font-size:11px;font-weight:600;color:#80A088;letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;">
                Nutritional Therapy
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #E8DECE;border-right:1px solid #E8DECE;">

              <p style="font-family:'Arial',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A5028;margin:0 0 20px;">
                Session Cancelled
              </p>

              <p style="font-size:17px;color:#0F1F13;margin:0 0 24px;line-height:1.5;">
                Hi <strong>${firstName}</strong>,
              </p>

              <p style="font-size:15px;color:#5A4C38;margin:0 0 28px;line-height:1.65;">
                Your upcoming session has been cancelled. Here are the details of the
                cancelled appointment:
              </p>

              <!-- Session details card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#FDFAF5;border:1px solid #E8DECE;border-radius:12px;margin-bottom:28px;opacity:0.8;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:14px;border-bottom:1px solid #E8DECE;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Date</div>
                          <div style="font-size:15px;color:#7A6A52;text-decoration:line-through;">${sessionDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0;border-bottom:1px solid #E8DECE;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Time</div>
                          <div style="font-size:15px;color:#7A6A52;text-decoration:line-through;">${sessionTime}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-family:'Arial',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin-bottom:5px;">Session Type</div>
                          <div style="font-size:15px;color:#7A6A52;">${typeDisplay}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:15px;color:#5A4C38;margin:0 0 8px;line-height:1.65;">
                To schedule a new session, please reach out to your practitioner directly.
                <strong>Warren Hennon, NTP</strong> looks forward to continuing your
                nutritional therapy journey.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8F2E8;border:1px solid #E8DECE;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;">
              <p style="font-family:'Arial',sans-serif;font-size:11px;color:#9A8A72;margin:0 0 4px;">
                Warren Hennon, NTP · Divergent Nutritional Therapy
              </p>
              <p style="font-family:'Arial',sans-serif;font-size:11px;color:#9A8A72;margin:0;">
                <a href="${SITE_URL}" style="color:#C07848;text-decoration:none;">${SITE_URL}</a>
                &nbsp;·&nbsp;
                Tumwater, WA
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Email sender (non-fatal) ─────────────────────────────────

async function sendSessionEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sessions/email] RESEND_API_KEY not set — skipping email');
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error('[sessions/email] Resend error:', error);
    }
  } catch (err) {
    console.error('[sessions/email] Unexpected error:', err);
  }
}

// ─── Actions ──────────────────────────────────────────────────

export async function scheduleSession(
  data: SessionFormData,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const supabase = await createClient();

  const { error } = await supabase.from('sessions').insert({
    practitioner_id: practitioner.id,
    client_id: data.clientId || null,
    scheduled_at: data.scheduledAt,
    duration_minutes: data.durationMinutes,
    session_type: data.sessionType,
    soap_note: data.soapNote || null,
    status: 'scheduled',
  });

  if (error) return { error: error.message };
  revalidateAll();

  // Send confirmation email (non-fatal)
  if (data.clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, email')
      .eq('id', data.clientId)
      .single();

    if (client?.email) {
      await sendSessionEmail({
        to: client.email,
        subject: 'Your session is confirmed — Divergent Nutritional Therapy',
        html: buildConfirmationHtml({
          firstName: client.first_name,
          sessionDate: formatSessionDate(data.scheduledAt),
          sessionTime: formatSessionTime(data.scheduledAt),
          durationMinutes: data.durationMinutes,
          sessionType: data.sessionType,
        }),
      });
    }
  }

  return {};
}

export async function editSessionDetails(
  sessionId: string,
  data: SessionFormData,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const { error } = await (await createClient())
    .from('sessions')
    .update({
      client_id: data.clientId || null,
      scheduled_at: data.scheduledAt,
      duration_minutes: data.durationMinutes,
      session_type: data.sessionType,
      soap_note: data.soapNote || null,
    })
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id);

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'completed' | 'cancelled',
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const supabase = await createClient();

  // Fetch session + client before updating (need details for cancellation email)
  const { data: session } = status === 'cancelled'
    ? await supabase
        .from('sessions')
        .select('client_id, scheduled_at, duration_minutes, session_type')
        .eq('id', sessionId)
        .eq('practitioner_id', practitioner.id)
        .single()
    : { data: null };

  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id);

  if (error) return { error: error.message };
  revalidateAll();

  // Send cancellation email (non-fatal)
  if (status === 'cancelled' && session?.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, email')
      .eq('id', session.client_id)
      .single();

    if (client?.email) {
      await sendSessionEmail({
        to: client.email,
        subject: 'Your session has been cancelled — Divergent Nutritional Therapy',
        html: buildCancellationHtml({
          firstName: client.first_name,
          sessionDate: formatSessionDate(session.scheduled_at),
          sessionTime: formatSessionTime(session.scheduled_at),
          sessionType: session.session_type,
        }),
      });
    }
  }

  return {};
}
