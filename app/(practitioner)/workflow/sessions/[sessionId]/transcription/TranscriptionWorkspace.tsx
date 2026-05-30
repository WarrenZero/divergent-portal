'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './TranscriptionWorkspace.module.css';
import type {
  SessionData,
  ClientData,
  TranscriptionRow,
  SpeakerSegment,
  ChecklistItem,
  Trendline,
  AcousticMetatag,
  ClinicalMatrix,
} from './page';

// ─── Browser speech API type declarations ────────────────────
// Web Speech API is not in TypeScript's default lib; declare minimally here.

declare class SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

// ─── Props ────────────────────────────────────────────────────

interface Props {
  session: SessionData;
  client: ClientData | null;
  practitionerName: string;
  existingTranscription: TranscriptionRow | null;
  clientHistory: string;
  sessionContext: string;
}

// ─── Types ────────────────────────────────────────────────────

type Phase = 'recording' | 'processing' | 'complete';
type ActiveSpeaker = 'WARREN' | 'CLIENT';
type Lens = 'transcript' | 'matrix' | 'roadmap';

const PROCESSING_STEPS = [
  'Transcribing audio…',
  'Loading client history…',
  'Generating clinical matrix…',
  'Extracting key moments…',
];

// ─── Helpers ──────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function directionArrow(dir: 'up' | 'down' | 'stable'): string {
  if (dir === 'up') return '↑';
  if (dir === 'down') return '↓';
  return '→';
}

function directionClass(dir: 'up' | 'down' | 'stable', styles: Record<string, string>): string {
  if (dir === 'up') return styles.trendUp;
  if (dir === 'down') return styles.trendDown;
  return styles.trendStable;
}

// ─── Component ────────────────────────────────────────────────

export default function TranscriptionWorkspace({
  session,
  client,
  practitionerName,
  existingTranscription,
  clientHistory,
  sessionContext,
}: Props) {
  const router = useRouter();
  const clientName = client
    ? `${client.first_name} ${client.last_name}`
    : 'No client';
  const clientFirstName = client?.first_name ?? 'Client';

  // ── Phase state ───────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>(() => {
    if (!existingTranscription) return 'recording';
    if (existingTranscription.status === 'complete') return 'complete';
    if (existingTranscription.status === 'processing') return 'processing';
    return 'recording';
  });

  // ── Recording state ───────────────────────────────────────────

  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeaker>('WARREN');
  const [liveSegments, setLiveSegments] = useState<SpeakerSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  // Refs for audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  // ── Processing state ──────────────────────────────────────────

  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // ── Complete state ────────────────────────────────────────────

  const [transcription, setTranscription] = useState<TranscriptionRow | null>(
    existingTranscription?.status === 'complete' ? existingTranscription : null,
  );
  const [activeLens, setActiveLens] = useState<Lens>('transcript');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    existingTranscription?.verification_checklist ?? [],
  );
  const [allVerified, setAllVerified] = useState(false);
  const [noteSaved, setNoteSaved] = useState(existingTranscription?.status === 'complete');
  const [sendingToClient, setSendingToClient] = useState(false);
  const [sentToClient, setSentToClient] = useState(false);

  // ── Timer ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // ── Waveform canvas ───────────────────────────────────────────

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const barWidth = (W / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * H;
      const alpha = 0.5 + (dataArray[i] / 255) * 0.5;
      ctx.fillStyle = `rgba(90, 124, 98, ${alpha})`; // pine-400
      ctx.fillRect(x, H - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // ── Start recording ───────────────────────────────────────────

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      drawWaveform();

      // MediaRecorder
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(1000); // collect in 1s chunks
      setIsRecording(true);
      setTimer(0);

      // Web Speech API live preview
      startSpeechRecognition();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setMicError(msg);
    }
  }

  function getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }

  function startSpeechRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR: (new () => SpeechRecognition) | undefined = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            setLiveSegments((prev) => {
              const lastSeg = prev[prev.length - 1];
              if (lastSeg && lastSeg.speaker === activeSpeaker) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastSeg, text: lastSeg.text + ' ' + text },
                ];
              }
              return [...prev, { speaker: activeSpeaker, text }];
            });
            setCurrentInterim('');

            // Auto-scroll
            setTimeout(() => {
              transcriptScrollRef.current?.scrollTo({
                top: transcriptScrollRef.current.scrollHeight,
                behavior: 'smooth',
              });
            }, 50);
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setCurrentInterim(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('SpeechRecognition error:', event.error);
    };

    recognition.onend = () => {
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // ignore restart errors
        }
      }
    };

    recognition.start();
  }

  // ── Stop recording → kick off processing ──────────────────────

  async function endSession() {
    setIsRecording(false);

    // Stop all audio
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    setPhase('processing');
    setProcessingStep(0);

    await runProcessingPipeline();
  }

  // ── Processing pipeline ───────────────────────────────────────

  async function runProcessingPipeline() {
    try {
      // Step 1: Upload audio / get transcript
      setProcessingStep(1);
      let rawTranscript: string;
      let speakerSegments: SpeakerSegment[];
      let acousticMetatags: AcousticMetatag[] = [];
      let audioDurationSeconds: number | null = timer;

      const audioBlob = new Blob(audioChunksRef.current, { type: getSupportedMimeType() || 'audio/webm' });

      if (audioBlob.size > 1000) {
        // Try AssemblyAI
        const assemblyResult = await uploadToAssemblyAI(audioBlob);
        if (assemblyResult) {
          rawTranscript = assemblyResult.rawTranscript;
          speakerSegments = assemblyResult.speakerSegments;
          acousticMetatags = assemblyResult.acousticMetatags ?? [];
          audioDurationSeconds = assemblyResult.audioDurationSeconds ?? timer;
        } else {
          // Fallback to Web Speech transcript
          const fallback = buildFallbackTranscript();
          rawTranscript = fallback.rawTranscript;
          speakerSegments = fallback.segments;
        }
      } else {
        // Very short / no audio — use Web Speech transcript
        const fallback = buildFallbackTranscript();
        rawTranscript = fallback.rawTranscript;
        speakerSegments = fallback.segments;
      }

      // Step 2: Load client history (already compiled server-side, just advance step)
      setProcessingStep(2);
      await sleep(400);

      // Step 3: Create DB record + run Claude
      setProcessingStep(3);

      // Create the transcription record in 'processing' status
      const createRes = await fetch('/api/transcriptions/process', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // We need to create the record first — do that via a separate action
          // For now we pass a sentinel and let the server create + process
          transcriptionId: await createTranscriptionRecord(),
          rawTranscript,
          clientHistory,
          sessionContext,
          practitionerName,
          clientName,
          speakerSegments,
          acousticMetatags,
          audioDurationSeconds,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error ?? 'Processing failed');
      }

      // Step 4: Extracting key moments
      setProcessingStep(4);
      const { transcription: result } = await createRes.json();

      setTranscription(result as TranscriptionRow);
      setChecklist((result as TranscriptionRow).verification_checklist ?? []);
      setPhase('complete');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setProcessingError(msg);
    }
  }

  async function createTranscriptionRecord(): Promise<string> {
    const res = await fetch('/api/transcriptions/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        clientId: session.client_id,
      }),
    });
    if (!res.ok) throw new Error('Failed to create transcription record');
    const { id } = await res.json();
    return id;
  }

  async function uploadToAssemblyAI(audioBlob: Blob): Promise<{
    rawTranscript: string;
    speakerSegments: SpeakerSegment[];
    acousticMetatags: AcousticMetatag[];
    audioDurationSeconds: number | null;
  } | null> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'session.webm');

      const uploadRes = await fetch('/api/transcriptions/assemblyai/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) return null;
      const uploadData = await uploadRes.json();

      // No AssemblyAI key configured
      if (uploadData.fallback) return null;

      const { transcriptId } = uploadData;

      // Poll for completion (max 3 minutes)
      const maxAttempts = 36;
      for (let i = 0; i < maxAttempts; i++) {
        await sleep(5000);
        const statusRes = await fetch(
          `/api/transcriptions/assemblyai/status?id=${transcriptId}`,
        );
        if (!statusRes.ok) continue;

        const statusData = await statusRes.json();
        if (statusData.status === 'completed') {
          return {
            rawTranscript: statusData.rawTranscript,
            speakerSegments: statusData.speakerSegments,
            acousticMetatags: statusData.acousticMetatags ?? [],
            audioDurationSeconds: statusData.audioDurationSeconds,
          };
        }
        if (statusData.status === 'error') return null;
      }
      return null;
    } catch {
      return null;
    }
  }

  function buildFallbackTranscript(): {
    rawTranscript: string;
    segments: SpeakerSegment[];
  } {
    const segments = liveSegments.length > 0
      ? liveSegments
      : [{ speaker: 'WARREN' as const, text: '(No transcript captured — session notes recorded manually)' }];

    const rawTranscript = segments
      .map((s) => `${s.speaker}: ${s.text}`)
      .join('\n\n');

    return { rawTranscript, segments };
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Verification checklist ────────────────────────────────────

  function toggleChecklist(id: string) {
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, confirmed: !item.confirmed } : item,
      );
      setAllVerified(updated.every((i) => i.confirmed));
      return updated;
    });
  }

  const confirmedCount = checklist.filter((i) => i.confirmed).length;

  // ── Send roadmap to client vault ──────────────────────────────

  async function sendToClient() {
    if (!transcription || !client) return;
    setSendingToClient(true);
    try {
      await fetch('/api/vault/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: `Session Roadmap — ${new Date(session.scheduled_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          content: transcription.lens_client_roadmap,
          contentType: 'protocol_resource',
          estimatedReadMinutes: 2,
        }),
      });
      setSentToClient(true);
    } catch {
      // silent
    } finally {
      setSendingToClient(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER — Phase 1: Recording
  // ─────────────────────────────────────────────────────────────

  if (phase === 'recording') {
    return (
      <div className={styles.recordingOverlay}>

        {/* Top bar */}
        <div className={styles.recTopBar}>
          <button
            className={styles.recBackBtn}
            onClick={() => router.back()}
            aria-label="Back to sessions"
          >
            ← Sessions
          </button>
          <div className={styles.recClientName}>{clientName}</div>
          <div className={styles.recSessionType}>{session.session_type}</div>
        </div>

        {/* Center stage */}
        <div className={styles.recStage}>

          {/* Pulsing glyph */}
          {isRecording ? (
            <div className={styles.recGlyphWrap}>
              <span className={styles.recGlyph}>✦</span>
              <span className={styles.recRing} />
            </div>
          ) : (
            <div className={styles.recGlyphWrap}>
              <span className={styles.recGlyphIdle}>✦</span>
            </div>
          )}

          {/* Timer */}
          <div className={styles.recTimer}>
            {isRecording ? formatDuration(timer) : '00:00'}
          </div>

          {/* Waveform canvas */}
          <canvas
            ref={canvasRef}
            className={styles.recWaveform}
            width={480}
            height={80}
            aria-hidden
          />

          {/* Speaker toggle */}
          {isRecording && (
            <div className={styles.speakerToggle}>
              <span className={styles.speakerLabel}>Speaking:</span>
              <button
                className={`${styles.speakerBtn} ${activeSpeaker === 'WARREN' ? styles.speakerBtnActive : ''}`}
                onClick={() => setActiveSpeaker('WARREN')}
              >
                {practitionerName.split(' ')[0]}
              </button>
              <button
                className={`${styles.speakerBtn} ${activeSpeaker === 'CLIENT' ? styles.speakerBtnActive : ''}`}
                onClick={() => setActiveSpeaker('CLIENT')}
              >
                {clientFirstName}
              </button>
            </div>
          )}

          {/* Mic error */}
          {micError && (
            <div className={styles.recError}>
              <strong>Microphone error:</strong> {micError}
            </div>
          )}

          {/* CTA buttons */}
          {!isRecording ? (
            <button className={styles.recStartBtn} onClick={startRecording}>
              ✦ Start Recording
            </button>
          ) : (
            <button className={styles.recEndBtn} onClick={endSession}>
              End Session &amp; Process
            </button>
          )}
        </div>

        {/* Live transcript panel */}
        {isRecording && (liveSegments.length > 0 || currentInterim) && (
          <div className={styles.liveTranscriptPanel}>
            <div className={styles.liveTranscriptLabel}>Live Preview</div>
            <div className={styles.liveTranscriptScroll} ref={transcriptScrollRef}>
              {liveSegments.map((seg, i) => (
                <div key={i} className={styles.liveSegment}>
                  <span className={styles.liveSegmentSpeaker}>{seg.speaker}:</span>
                  <span className={styles.liveSegmentText}>{seg.text}</span>
                </div>
              ))}
              {currentInterim && (
                <div className={styles.liveSegment}>
                  <span className={styles.liveSegmentSpeaker}>{activeSpeaker}:</span>
                  <span className={styles.liveSegmentInterim}>{currentInterim}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AssemblyAI notice */}
        {!process.env.NEXT_PUBLIC_HAS_ASSEMBLYAI && (
          <div className={styles.recNotice}>
            For speaker labels &amp; acoustic analysis, enable AssemblyAI in Settings
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER — Phase 2: Processing
  // ─────────────────────────────────────────────────────────────

  if (phase === 'processing') {
    return (
      <div className={styles.processingOverlay}>
        <div className={styles.procGlyph}>✦</div>
        <h2 className={styles.procTitle}>Processing your session with AI…</h2>
        <div className={styles.procSteps}>
          {PROCESSING_STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isDone = processingStep > stepNum;
            const isActive = processingStep === stepNum;
            return (
              <div
                key={i}
                className={`${styles.procStep} ${isDone ? styles.procStepDone : ''} ${isActive ? styles.procStepActive : ''}`}
              >
                <span className={styles.procStepIndicator}>
                  {isDone ? '✓' : isActive ? '◌' : '○'}
                </span>
                <span className={styles.procStepLabel}>{step}</span>
              </div>
            );
          })}
        </div>

        {processingError && (
          <div className={styles.procError}>
            <strong>Error:</strong> {processingError}
            <button
              className={styles.procRetryBtn}
              onClick={() => {
                setProcessingError(null);
                setProcessingStep(0);
                runProcessingPipeline();
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER — Phase 3: Three-Lens View
  // ─────────────────────────────────────────────────────────────

  if (!transcription) return null;

  const matrix = transcription.lens_clinical_matrix as ClinicalMatrix | null;
  const trendlines = transcription.qualitative_trendlines as Trendline[];

  return (
    <div className={styles.lensPage}>

      {/* ── Page header ── */}
      <div className={styles.lensHeader}>
        <div className={styles.lensHeaderLeft}>
          <button
            className={styles.lensBackBtn}
            onClick={() => router.back()}
          >
            ← Sessions
          </button>
          <div>
            <h1 className={styles.lensTitle}>Session Transcription</h1>
            <p className={styles.lensSubtitle}>
              {clientName} &middot;{' '}
              {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {transcription.audio_duration_seconds
                ? ` · ${Math.round(transcription.audio_duration_seconds / 60)} min`
                : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Verification checklist banner ── */}
      {checklist.length > 0 && !allVerified && (
        <div className={styles.verifyBanner}>
          <div className={styles.verifyBannerHeader}>
            <span className={styles.verifyBannerTitle}>
              Confirm these key details before saving
            </span>
            <span className={styles.verifyProgress}>
              {confirmedCount} of {checklist.length} confirmed
            </span>
          </div>
          <div className={styles.verifyItems}>
            {checklist.map((item) => (
              <label key={item.id} className={styles.verifyItem}>
                <input
                  type="checkbox"
                  className={styles.verifyCheckbox}
                  checked={item.confirmed}
                  onChange={() => toggleChecklist(item.id)}
                />
                <span className={styles.verifyItemContent}>
                  <span className={styles.verifyItemLabel}>{item.item}:</span>
                  <span className={styles.verifyItemValue}>{item.value}</span>
                  {item.priority === 'high' && (
                    <span className={styles.verifyPriorityHigh}>High priority</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── All-verified banner ── */}
      {allVerified && !noteSaved && (
        <div className={styles.verifyComplete}>
          <span className={styles.verifyCompleteIcon}>✓</span>
          <span>All confirmed — session saved to {clientFirstName}&apos;s notes</span>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className={styles.lensLayout}>

        {/* ── Left: lens content ── */}
        <div className={styles.lensMain}>

          {/* Lens tabs */}
          <div className={styles.lensTabs}>
            {(['transcript', 'matrix', 'roadmap'] as Lens[]).map((lens) => (
              <button
                key={lens}
                className={`${styles.lensTab} ${activeLens === lens ? styles.lensTabActive : ''}`}
                onClick={() => setActiveLens(lens)}
              >
                {lens === 'transcript' ? 'Transcript' : lens === 'matrix' ? 'Clinical Matrix' : 'Client Roadmap'}
              </button>
            ))}
          </div>

          {/* ── LENS 1: Transcript ── */}
          {activeLens === 'transcript' && (
            <TranscriptLens transcription={transcription} styles={styles} />
          )}

          {/* ── LENS 2: Clinical Matrix ── */}
          {activeLens === 'matrix' && matrix && (
            <ClinicalMatrixLens matrix={matrix} styles={styles} />
          )}

          {/* ── LENS 3: Client Roadmap ── */}
          {activeLens === 'roadmap' && (
            <ClientRoadmapLens
              roadmap={transcription.lens_client_roadmap ?? ''}
              clientFirstName={clientFirstName}
              onSend={sendToClient}
              sending={sendingToClient}
              sent={sentToClient}
              styles={styles}
            />
          )}
        </div>

        {/* ── Right: trendline sidebar ── */}
        {trendlines.length > 0 && (
          <div className={styles.trendSidebar}>
            <div className={styles.trendSidebarTitle}>Qualitative Trendlines</div>
            <div className={styles.trendList}>
              {trendlines.map((t, i) => (
                <div key={i} className={`${styles.trendItem} ${directionClass(t.direction, styles)}`}>
                  <div className={styles.trendItemHeader}>
                    <span className={styles.trendArrow}>{directionArrow(t.direction)}</span>
                    <span className={styles.trendSymptom}>{t.symptom}</span>
                  </div>
                  <blockquote className={styles.trendQuote}>
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className={styles.trendConfidence}>
                    Confidence: {Math.round(t.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lens sub-components ──────────────────────────────────────

function TranscriptLens({
  transcription,
  styles,
}: {
  transcription: TranscriptionRow;
  styles: Record<string, string>;
}) {
  const [showAllWords, setShowAllWords] = useState(false);
  const raw = transcription.lens_clean_transcript ?? transcription.raw_transcript ?? '';
  const metatags = transcription.acoustic_metatags as AcousticMetatag[];

  const lines = raw.split('\n').filter((l) => l.trim());

  return (
    <div className={styles.transcriptLens}>
      <div className={styles.transcriptControls}>
        <label className={styles.transcriptToggle}>
          <input
            type="checkbox"
            checked={showAllWords}
            onChange={(e) => setShowAllWords(e.target.checked)}
          />
          Show all words (including fillers)
        </label>
        {metatags.length > 0 && (
          <span className={styles.transcriptMetaNote}>
            ◉ Acoustic tags shown inline
          </span>
        )}
      </div>

      <div className={styles.transcriptBody}>
        {lines.map((line, i) => {
          const colonIdx = line.indexOf(':');
          const speaker = colonIdx > -1 ? line.slice(0, colonIdx).trim() : '';
          const text = colonIdx > -1 ? line.slice(colonIdx + 1).trim() : line;

          // Find any acoustic metatag whose text appears in this line
          const matchedTag = metatags.find((tag) =>
            line.toLowerCase().includes(tag.text.toLowerCase()),
          );

          return (
            <div key={i} className={`${styles.transcriptLine} ${speaker === 'WARREN' ? styles.transcriptWarren : speaker === 'CLIENT' ? styles.transcriptClient : ''}`}>
              {speaker && (
                <span className={styles.transcriptSpeaker}>{speaker}</span>
              )}
              <span className={styles.transcriptText}>{text}</span>
              {matchedTag && (
                <span className={styles.acousticChip}>{matchedTag.tone}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClinicalMatrixLens({
  matrix,
  styles,
}: {
  matrix: ClinicalMatrix;
  styles: Record<string, string>;
}) {
  const sections: Array<{ key: keyof ClinicalMatrix; label: string }> = [
    { key: 'presenting_concerns', label: 'Presenting Concerns Today' },
    { key: 'root_cause_observations', label: 'Root Cause Observations' },
    { key: 'htma_patterns', label: 'HTMA Patterns Discussed' },
    { key: 'protocol_updates', label: 'Protocol Updates' },
    { key: 'objective_metrics', label: 'Objective Metrics' },
    { key: 'timeline_markers', label: 'Timeline Markers' },
    { key: 'trajectory_summary', label: 'Trajectory Summary' },
  ];

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['presenting_concerns', 'protocol_updates', 'trajectory_summary']),
  );

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={styles.matrixLens}>
      {sections.map(({ key, label }) => {
        const content = matrix[key];
        if (!content || content === 'Not discussed this session') {
          return null;
        }
        const isOpen = openSections.has(key);
        return (
          <div key={key} className={styles.matrixSection}>
            <button
              className={styles.matrixSectionHeader}
              onClick={() => toggleSection(key)}
              aria-expanded={isOpen}
            >
              <span className={styles.matrixArrow}>{isOpen ? '▾' : '▸'}</span>
              <span className={styles.matrixSectionTitle}>{label}</span>
            </button>
            {isOpen && (
              <div className={styles.matrixSectionBody}>
                {/* Highlight dosages in copper */}
                <p
                  dangerouslySetInnerHTML={{
                    __html: content
                      .replace(
                        /\[DOSAGE\](.*?)\[\/DOSAGE\]/g,
                        '<strong class="dosage">$1</strong>',
                      )
                      .replace(
                        /\[VERIFY\]/g,
                        '<span class="verify-flag">[VERIFY]</span>',
                      )
                      .replace(/\n/g, '<br/>'),
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClientRoadmapLens({
  roadmap,
  clientFirstName,
  onSend,
  sending,
  sent,
  styles,
}: {
  roadmap: string;
  clientFirstName: string;
  onSend: () => void;
  sending: boolean;
  sent: boolean;
  styles: Record<string, string>;
}) {
  // Parse the roadmap string into labeled sections
  const sectionMap: Record<string, string> = {};
  const sectionKeys = [
    'What we talked about today:',
    'Your focus for this week:',
    'Watch for these changes:',
    'Your next appointment:',
    'A note from Warren:',
  ];

  let remaining = roadmap;
  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    const nextKey = sectionKeys[i + 1];
    const startIdx = remaining.indexOf(key);
    if (startIdx === -1) continue;
    const contentStart = startIdx + key.length;
    const endIdx = nextKey ? remaining.indexOf(nextKey, contentStart) : remaining.length;
    sectionMap[key] = remaining.slice(contentStart, endIdx === -1 ? undefined : endIdx).trim();
  }

  return (
    <div className={styles.roadmapLens}>
      <div className={styles.roadmapCard}>
        {sectionKeys.map((key) => {
          const content = sectionMap[key];
          if (!content) return null;
          return (
            <div key={key} className={styles.roadmapSection}>
              <h3 className={styles.roadmapSectionTitle}>{key}</h3>
              <div className={styles.roadmapSectionContent}>
                {content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                  if (isBullet) {
                    return (
                      <div key={i} className={styles.roadmapBullet}>
                        <span className={styles.roadmapBulletDot}>•</span>
                        <span>{trimmed.replace(/^[•\-]\s*/, '')}</span>
                      </div>
                    );
                  }
                  return <p key={i} className={styles.roadmapPara}>{trimmed}</p>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.roadmapActions}>
        {!sent ? (
          <button
            className={styles.roadmapSendBtn}
            onClick={onSend}
            disabled={sending}
          >
            {sending ? 'Sending…' : `Send to ${clientFirstName}`}
          </button>
        ) : (
          <div className={styles.roadmapSentConfirm}>
            ✓ Added to {clientFirstName}&apos;s Vault
          </div>
        )}
      </div>
    </div>
  );
}
