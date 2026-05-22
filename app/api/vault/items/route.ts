import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'warren@divergentportal.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://divergentportal.com';

// ─── POST — add vault item ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });
  }

  let body: {
    clientId: string;
    title: string;
    contentType: 'article' | 'document' | 'protocol_resource';
    body: string | null;
    fileUrl: string | null;
    estimatedReadMinutes: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, title, contentType, body: itemBody, fileUrl, estimatedReadMinutes } = body;

  if (!clientId || !title || !contentType) {
    return NextResponse.json({ error: 'clientId, title, and contentType are required' }, { status: 400 });
  }

  // Verify practitioner owns this client
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Insert vault item
  const { data: item, error } = await supabase
    .from('vault_items')
    .insert({
      client_id: clientId,
      practitioner_id: practitioner.id,
      title,
      content_type: contentType,
      body: itemBody ?? null,
      file_url: fileUrl ?? null,
      estimated_read_minutes: estimatedReadMinutes ?? 3,
    })
    .select('id, title, content_type, body, file_url, estimated_read_minutes, is_read, is_bookmarked, created_at')
    .single();

  if (error || !item) {
    console.error('vault insert error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }

  // Send notification email (non-fatal)
  if (client.email && process.env.RESEND_API_KEY) {
    const practitionerFirst = practitioner.name.split(' ')[0] ?? 'Warren';
    const html = vaultNotificationHtml(client.first_name, practitionerFirst, title);
    try {
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `${practitionerFirst} added a new resource to your vault`,
        html,
      });
    } catch (err) {
      console.error('vault notification email error:', err);
    }
  }

  return NextResponse.json({
    id: item.id,
    title: item.title,
    contentType: item.content_type,
    body: item.body,
    fileUrl: item.file_url,
    estimatedReadMinutes: item.estimated_read_minutes,
    isRead: item.is_read,
    isBookmarked: item.is_bookmarked,
    createdAt: item.created_at,
  });
}

// ─── DELETE — remove vault item ─────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });
  }

  // Delete only if practitioner owns it
  const { error } = await supabase
    .from('vault_items')
    .delete()
    .eq('id', id)
    .eq('practitioner_id', practitioner.id);

  if (error) {
    console.error('vault delete error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ─── Email template ──────────────────────────────────────────────

function vaultNotificationHtml(
  firstName: string,
  practitionerFirst: string,
  resourceTitle: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New resource in your vault</title>
</head>
<body style="margin:0;padding:0;background:#FDFAF5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFAF5;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#FFFFFF;border:1px solid #E8DECE;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#1E3122;padding:22px 32px;text-align:center;">
            <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;
                         letter-spacing:0.12em;text-transform:uppercase;color:#80A088;">
              ✦ DIVERGENT NUTRITIONAL THERAPY
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="font-family:Georgia,serif;font-size:16px;color:#0F1F13;margin:0 0 16px;line-height:1.6;">
              Hello, ${firstName}
            </p>
            <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 16px;line-height:1.7;">
              ${practitionerFirst} has added a new resource to your vault:
            </p>
            <div style="border-left:3px solid #5A7C62;padding:12px 18px;margin:0 0 24px;
                        background:#F0E8DA;border-radius:0 8px 8px 0;">
              <p style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;
                        color:#0F1F13;margin:0;">
                ${resourceTitle}
              </p>
            </div>
            <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 24px;line-height:1.7;">
              Open your vault to read it at your own pace — it will be waiting for you whenever you're ready.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="${SITE_URL}/vault"
               style="display:inline-block;background:#2A4330;color:#FFFFFF;
                       font-family:Arial,sans-serif;font-size:12px;font-weight:700;
                       letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;
                       padding:14px 32px;border-radius:8px;">
              Open My Vault →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 28px;text-align:center;border-top:1px solid #F0E8DA;">
            <p style="font-family:Georgia,serif;font-size:12px;color:#9A8A72;
                       font-style:italic;margin:16px 0 0;line-height:1.6;">
              You are receiving this message as a client of Divergent Nutritional Therapy.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
