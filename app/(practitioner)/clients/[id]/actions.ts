'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';

export async function assignProtocol(
  clientId: string,
  protocolId: string,
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createServiceClient();

  // Resolve practitioner
  const { data: practitioner, error: practErr } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (practErr || !practitioner) return { error: 'Practitioner not found' };

  // Verify client ownership
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (clientErr || !client) return { error: 'Client not found' };

  // Deactivate any existing active protocol
  await supabase
    .from('client_protocols')
    .update({ is_active: false })
    .eq('client_id', clientId)
    .eq('is_active', true);

  // Assign the new protocol
  const today = new Date().toISOString().split('T')[0];
  const { error: insertErr } = await supabase.from('client_protocols').insert({
    client_id: clientId,
    protocol_id: protocolId,
    start_date: today,
    current_phase: 1,
    assigned_by: practitioner.id,
    is_active: true,
  });

  if (insertErr) return { error: insertErr.message };
  return {};
}

// ─── Add Supplement ───────────────────────────────────────────

export interface SupplementFields {
  name: string;
  brand: string;
  dose: string;
  timing: string;
  notes: string;
}

export async function addSupplement(
  clientId: string,
  fields: SupplementFields,
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  if (!fields.name.trim()) return { error: 'Supplement name is required' };

  const supabase = await createServiceClient();

  // Resolve practitioner and verify client ownership in one join
  const { data: practitioner, error: practErr } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (practErr || !practitioner) return { error: 'Practitioner not found' };

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (clientErr || !client) return { error: 'Client not found' };

  const { error: insertErr } = await supabase.from('supplements').insert({
    client_id: clientId,
    name: fields.name.trim(),
    brand: fields.brand.trim() || null,
    dose: fields.dose.trim() || null,
    timing: fields.timing || null,
    notes: fields.notes.trim() || null,
    is_active: true,
  });

  if (insertErr) return { error: insertErr.message };
  return {};
}

// ─── Invite Client ────────────────────────────────────────────

export async function inviteClient(
  clientId: string,
  email: string,
): Promise<{ error?: string; sent?: boolean }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createServiceClient();

  // Verify practitioner owns this client
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) return { error: 'Practitioner not found' };

  const { data: client } = await supabase
    .from('clients')
    .select('id, clerk_user_id, first_name')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) return { error: 'Client not found' };
  if (client.clerk_user_id) return { error: 'Client already has an active account' };

  const firstName = (client as { first_name?: string }).first_name ?? 'there';

  // Resolve app URL from request headers
  const headersList = await headers();
  const host = headersList.get('host') ?? 'divergentportal.com';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUrl = `${protocol}://${host}/signup`;

  try {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl,
      ignoreExisting: true,
      publicMetadata: { role: 'client', clientId },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send invitation';
    return { error: msg };
  }

  // Send branded welcome email via Resend (in addition to Clerk's invite link email)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'Warren Hennon, NTP <warren@divergentnt.com>',
        to: email,
        subject: 'Your Divergent portal is ready, ' + firstName,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Divergent Portal</title>
</head>
<body style="margin:0;padding:0;background:#0F1F13;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1F13;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Glyph -->
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:36px;color:#D08C5C;">✦</span>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FDFAF5;padding-bottom:8px;">
          Hello, ${firstName}.
        </td></tr>

        <!-- Companion line -->
        <tr><td style="font-family:Georgia,serif;font-style:italic;font-size:15px;color:#B0C8B4;line-height:1.65;padding-bottom:16px;">
          This is your personal wellness companion — it takes less than 2 minutes a day and helps Warren give you better care between every session.
        </td></tr>

        <!-- Body -->
        <tr><td style="font-family:Georgia,serif;font-size:15px;color:#DDE8DE;line-height:1.7;padding-bottom:28px;">
          Your portal is ready. Click below to create your account and get started.
        </td></tr>

        <!-- Button -->
        <tr><td align="center" style="padding-bottom:20px;">
          <a href="${redirectUrl}" style="display:inline-block;padding:16px 36px;background:#C07848;color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">
            Open My Portal →
          </a>
        </td></tr>

        <!-- Slogan -->
        <tr><td align="center" style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#D08C5C;padding-bottom:32px;">
          Your body has answers. We help you hear them.
        </td></tr>

        <!-- Credential footer -->
        <tr><td align="center" style="font-family:monospace;font-size:10px;color:#3A5C42;letter-spacing:0.06em;text-transform:uppercase;">
          Warren Hennon, NTP · 1,226 hours · NTA Tumwater · Honors
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    } catch {
      // Non-fatal: Clerk invite was sent successfully; Resend welcome email failed silently
    }
  }

  return { sent: true };
}
