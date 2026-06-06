import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProtocolCard from './ProtocolCard';

export const metadata = { title: 'My Protocol · Divergent' };

export default async function ProtocolPage() {
  const client = await getCurrentClient();
  if (!client) redirect('/login');

  const supabase = await createClient();

  // Check if client has an assigned protocol
  const { data: activeProtocol } = await supabase
    .from('client_protocols')
    .select('current_phase, start_date, protocols(id, name, category, phase_count)')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .maybeSingle();

  // Fetch available public protocols (templates)
  const { data: availableProtocols } = await supabase
    .from('protocols')
    .select('id, name, category, phase_count, content_html')
    .eq('is_template', true)
    .order('name');

  if (activeProtocol) {
    // Show active protocol view
    const protocolRecord = Array.isArray(activeProtocol.protocols)
      ? activeProtocol.protocols[0]
      : activeProtocol.protocols;

    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--copper-500)', marginBottom: 8 }}>
          ✦ Your Protocol
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 4px' }}>
          {protocolRecord?.name ?? 'Active Protocol'}
        </h1>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
          Phase {activeProtocol.current_phase} of {protocolRecord?.phase_count ?? 1} · Started {activeProtocol.start_date ? new Date(activeProtocol.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'recently'}
        </div>
        <div style={{ background: 'var(--pine-100)', border: '1px solid var(--pine-200)', borderRadius: 10, padding: '16px 18px', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--pine-600)', lineHeight: 1.6 }}>
          Warren has assigned this protocol specifically for you. Check in daily and log your meals — he reviews this data before every session.
        </div>
      </div>
    );
  }

  // No assigned protocol — show browse view for self-guided clients
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--copper-500)', marginBottom: 8 }}>
        ✦ Protocol Browser
      </div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
        Explore Protocols
      </h1>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6 }}>
        Warren hasn&rsquo;t assigned a protocol yet. Browse the available options below and request one — Warren will review and assign it for you.
      </p>

      {(availableProtocols ?? []).length === 0 ? (
        <div style={{ background: 'var(--pine-100)', border: '1px solid var(--pine-200)', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--pine-600)', lineHeight: 1.6 }}>
            Warren will assign your protocol during your first session.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(availableProtocols ?? []).map((p) => (
            <ProtocolCard key={p.id} protocol={p} clientId={client.id} />
          ))}
        </div>
      )}
    </div>
  );
}
