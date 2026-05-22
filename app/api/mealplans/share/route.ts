import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'warren@divergentportal.com';

function buildShareEmailHtml(opts: {
  clientFirstName: string;
  recipeTitle: string;
  practitionerNote: string;
  siteUrl: string;
}): string {
  const { clientFirstName, recipeTitle, practitionerNote, siteUrl } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A recipe has been shared with you</title>
</head>
<body style="margin:0;padding:0;background:#FDFAF5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFAF5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border:1px solid #E8DECE;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#1E3122;padding:24px 32px;text-align:center;">
              <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;
                           letter-spacing:0.12em;text-transform:uppercase;color:#80A088;">
                ✦ DIVERGENT NUTRITIONAL THERAPY
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;border-bottom:1px solid #F0E8DA;">
              <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;
                         letter-spacing:0.08em;text-transform:uppercase;color:#9A8A72;margin:0 0 12px;">
                NEW RECIPE SHARED WITH YOU
              </p>
              <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;
                          color:#0F1F13;margin:0 0 8px;line-height:1.3;">
                Hello, ${clientFirstName}
              </h1>
              <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;
                         margin:0;line-height:1.6;">
                Warren has shared a recipe with you:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px;background:#F8F2E8;border-bottom:1px solid #E8DECE;">
              <h2 style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;
                          color:#0F1F13;margin:0 0 10px;">
                ${recipeTitle}
              </h2>
              ${practitionerNote ? `
              <div style="border-left:3px solid #C07848;padding:10px 16px;margin-top:14px;
                           background:#FDFAF5;border-radius:0 6px 6px 0;">
                <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;
                            color:#8A4810;margin:0;line-height:1.5;">
                  "${practitionerNote}"
                </p>
                <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:600;
                            color:#C07848;margin:8px 0 0;letter-spacing:0.03em;">
                  — Warren Hennon, NTP
                </p>
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <a href="${siteUrl}/meals"
                 style="display:inline-block;background:#C07848;color:#FFFFFF;
                         font-family:Arial,sans-serif;font-size:12px;font-weight:700;
                         letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;
                         padding:14px 32px;border-radius:8px;">
                View Recipe →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="font-family:Georgia,serif;font-size:12px;color:#9A8A72;
                         font-style:italic;margin:0;line-height:1.6;">
                You are receiving this because you are a client of Divergent Nutritional Therapy.
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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Must be a practitioner
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });
  }

  let body: { clientId: string; recipeId: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, recipeId, note } = body;
  if (!clientId || !recipeId) {
    return NextResponse.json({ error: 'clientId and recipeId required' }, { status: 400 });
  }

  // Verify practitioner owns this client
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, email')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Fetch recipe for email
  const { data: recipe } = await supabase
    .from('recipes')
    .select('title')
    .eq('id', recipeId)
    .single();

  // Insert share record
  const { error: shareError } = await supabase.from('practitioner_recipe_shares').insert({
    practitioner_id: practitioner.id,
    client_id: clientId,
    recipe_id: recipeId,
    note: note ?? null,
    is_read: false,
  });

  if (shareError) {
    return NextResponse.json({ error: shareError.message }, { status: 500 });
  }

  // Send email (non-fatal — share already saved above)
  if (client.email && recipe && process.env.RESEND_API_KEY) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://divergentportal.com';
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `Warren shared a recipe with you: ${recipe.title}`,
        html: buildShareEmailHtml({
          clientFirstName: client.first_name,
          recipeTitle: recipe.title,
          practitionerNote: note ?? '',
          siteUrl,
        }),
      });
    } catch (emailErr) {
      console.error('recipe share email error:', emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
