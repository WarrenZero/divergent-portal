'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────

export interface PulsePrep {
  client_id: string;
  digestion_score: number;
  sleep_score: number;
  stress_score: number;
  logged_at: string;
}

export interface JournalPrep {
  client_id: string;
  meal_time: string | null;
  foods_eaten: string | null;
  notes: string | null;
  logged_at: string;
}

export interface SessionForPrep {
  id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
}

export interface ClientForPrep {
  id: string;
  first_name: string;
  last_name: string;
  wellness_score: number;
  primary_concern: string | null;
}

interface Props {
  sessions: SessionForPrep[];
  clientsById: Record<string, ClientForPrep>;
  prepData: Record<string, { pulses: PulsePrep[]; lastJournal: JournalPrep | null }>;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function avgPulseScore(pulse: PulsePrep): number {
  return Math.round((pulse.digestion_score + pulse.sleep_score + (11 - pulse.stress_score)) / 3);
}

function pulseDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreColor(score: number): string {
  if (score >= 7) return '#3A5C42';
  if (score >= 4) return '#D97706';
  return '#DC2626';
}

// ─── Component ────────────────────────────────────────────────

export default function SessionPrepPanel({ sessions, clientsById, prepData }: Props) {
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  if (sessions.length === 0) return null;

  const openSession = sessions.find((s) => s.id === openSessionId);
  const openClient = openSession ? clientsById[openSession.client_id] : null;
  const openPrep = openSession ? prepData[openSession.client_id] : null;

  return (
    <>
      {/* ── Today's Sessions prep cards ─── */}
      <div style={{
        background: '#F8F2E8',
        border: '1px solid #E8DECE',
        borderLeft: '3px solid #C07848',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: '#C07848',
          marginBottom: 12,
        }}>
          Today&rsquo;s Sessions
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {sessions.map((session) => {
            const client = clientsById[session.client_id];
            return (
              <div key={session.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#fff',
                border: '1px solid #E8DECE',
                borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: '#0F1F13' }}>
                    {client ? `${client.first_name} ${client.last_name}` : 'Unknown client'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9A8A72', marginTop: 2 }}>
                    {formatTime(session.scheduled_at)} · {session.duration_minutes} min ·{' '}
                    {session.session_type === 'telehealth' ? 'Telehealth' : session.session_type}
                  </div>
                </div>
                <button
                  onClick={() => setOpenSessionId(session.id)}
                  style={{
                    background: '#0F1F13',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  Prepare →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Slide-over ─── */}
      {openSession && openClient && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpenSessionId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,31,19,0.4)',
              zIndex: 900,
            }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            background: '#FDFAF5',
            borderLeft: '1px solid #E8DECE',
            zIndex: 901,
            overflowY: 'auto' as const,
            padding: '28px 24px',
          }}>
            <button
              onClick={() => setOpenSessionId(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9A8A72' }}
            >
              ✕
            </button>

            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: '#0F1F13', marginBottom: 4 }}>
              {openClient.first_name} {openClient.last_name}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, color: '#9A8A72', letterSpacing: '0.08em', marginBottom: 20 }}>
              SESSION BRIEF
            </div>

            {/* Wellness Score */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#9A8A72', marginBottom: 6 }}>
                Wellness Score
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#0F1F13' }}>
                {openClient.wellness_score}
                <span style={{ fontSize: 14, color: '#9A8A72', fontWeight: 600 }}> / 100</span>
              </div>
            </div>

            {/* Recent Check-ins */}
            {openPrep && openPrep.pulses.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#9A8A72', marginBottom: 8 }}>
                  Recent Check-ins
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {openPrep.pulses.map((p, i) => {
                    const avg = avgPulseScore(p);
                    return (
                      <div key={i} style={{
                        background: '#F8F2E8',
                        border: `1px solid ${scoreColor(avg)}`,
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontFamily: "'Syne', sans-serif",
                        color: '#0F1F13',
                        textAlign: 'center' as const,
                      }}>
                        <div style={{ color: scoreColor(avg), fontWeight: 700 }}>{avg}/10</div>
                        <div style={{ color: '#9A8A72', fontSize: 10 }}>{pulseDate(p.logged_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last Journal Entry */}
            {openPrep?.lastJournal && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#9A8A72', marginBottom: 6 }}>
                  Last Journal Entry
                </div>
                <div style={{ background: '#F8F2E8', borderRadius: 8, padding: '10px 12px' }}>
                  {openPrep.lastJournal.meal_time && (
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, color: '#C07848', fontWeight: 700, marginBottom: 4 }}>
                      {openPrep.lastJournal.meal_time}
                    </div>
                  )}
                  {openPrep.lastJournal.foods_eaten && (
                    <div style={{ fontSize: 12, color: '#0F1F13', lineHeight: 1.5, fontFamily: "'Lora', Georgia, serif" }}>
                      {openPrep.lastJournal.foods_eaten.slice(0, 120)}
                      {(openPrep.lastJournal.foods_eaten.length ?? 0) > 120 ? '…' : ''}
                    </div>
                  )}
                  {openPrep.lastJournal.notes && (
                    <div style={{ fontSize: 11, color: '#9A8A72', marginTop: 4, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
                      {openPrep.lastJournal.notes}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 24 }}>
              <Link
                href={`/clients/${openClient.id}`}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  background: '#0F1F13',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  textAlign: 'center' as const,
                  letterSpacing: '0.04em',
                }}
              >
                Open Full Profile →
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
