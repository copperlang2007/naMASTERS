import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { PreCallScreen } from "@/components/pre-call-screen";
import { ActiveCallScreen } from "@/components/active-call-screen";
import { PostCallDebrief } from "@/components/post-call-debrief";
import type { SimulatorState, TranscriptSegment, CallScore } from "@/lib/simulator-types";

// ─────────────────────────────────────────────────────────────────────────────
// SCORING API CALL
// Sends transcript to your /api/score endpoint (Python backend)
// ─────────────────────────────────────────────────────────────────────────────
async function scoreCall(
  transcript: TranscriptSegment[],
  agentName: string
): Promise<CallScore> {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, agent_name: agentName }),
  });
  if (!res.ok) throw new Error('Scoring failed');
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATOR PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const [state, setState] = useState<SimulatorState>('pre-call');
  const [agentName, setAgentName] = useState(() => localStorage.getItem('bridge_agent_name') || '');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [callSeconds, setCallSeconds] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [anchorFlash, setAnchorFlash] = useState(false);
  const [score, setScore] = useState<CallScore | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const callStartRef = useRef(0);

  // Persist agent name
  useEffect(() => {
    if (agentName) localStorage.setItem('bridge_agent_name', agentName);
  }, [agentName]);

  // ── AUDIO PLAYBACK ──────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (!audioCtxRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const buf = audioCtxRef.current.createBuffer(1, chunk.length, 24000);
    buf.getChannelData(0).set(chunk);
    const src = audioCtxRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtxRef.current.destination);
    src.onended = playNext;
    src.start();
  }, []);

  // ── WEBSOCKET HANDLER ───────────────────────────────────────────────────
  const handleWsMessage = useCallback((event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      // Dorothy audio → queue for playback
      const pcm = new Int16Array(event.data);
      const f32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
      audioQueueRef.current.push(f32);
      if (!isPlayingRef.current) playNext();
    } else {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'transcript':
            setTranscript(prev => [...prev, {
              speaker: msg.speaker === 'Dorothy' ? 'caller' : 'agent',
              text: msg.text,
              timestamp: Date.now(),
              isFinal: true,
            }]);
            break;
          case 'turn_count':
            setTurnCount(msg.count);
            break;
          case 'anchor_injected':
            setAnchorFlash(true);
            setTimeout(() => setAnchorFlash(false), 3000);
            break;
          case 'call_ended':
            // Backend signals call ended — transcript is already in state
            break;
        }
      } catch (_) {}
    }
  }, [playNext]);

  // ── ANSWER CALL ─────────────────────────────────────────────────────────
  const handleAnswerCall = useCallback(async () => {
    setState('active');
    setTranscript([]);
    setTurnCount(0);
    setCallSeconds(0);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    callStartRef.current = Date.now();

    // Audio context for playback
    audioCtxRef.current = new AudioContext({ sampleRate: 24000 });

    // WebSocket to Python backend
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/call`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onmessage = handleWsMessage;

    ws.onopen = async () => {
      // Timer
      timerRef.current = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);

      // Microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        micCtxRef.current = new AudioContext({ sampleRate: 16000 });
        const src = micCtxRef.current.createMediaStreamSource(stream);
        const processor = micCtxRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const f = e.inputBuffer.getChannelData(0);
          const p = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) {
            p[i] = Math.max(-32768, Math.min(32767, f[i] * 32768));
          }
          ws.send(p.buffer);
        };

        src.connect(processor);
        processor.connect(micCtxRef.current.destination);
      } catch (err) {
        console.error('Microphone error:', err);
      }
    };

    ws.onclose = () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    ws.onerror = (e) => console.error('WS error:', e);
  }, [handleWsMessage]);

  // ── END CALL ────────────────────────────────────────────────────────────
  const handleEndCall = useCallback(async () => {
    const duration = Math.floor((Date.now() - callStartRef.current) / 1000);

    // Cleanup
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_call' }));
      wsRef.current.close();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    if (timerRef.current) clearInterval(timerRef.current);

    // Move to scoring state
    setState('scoring');
    setScoreError(null);

    // Score the call
    try {
      const result = await scoreCall(transcript, agentName);
      setScore(result);
      setState('debrief');
    } catch (err) {
      setScoreError('Scoring failed. Please try again.');
      setState('debrief');
    }
  }, [transcript, agentName]);

  // ── RESET ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setState('pre-call');
    setTranscript([]);
    setTurnCount(0);
    setCallSeconds(0);
    setScore(null);
    setScoreError(null);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (state === 'pre-call') {
    return (
      <PreCallScreen
        agentName={agentName}
        onAgentNameChange={setAgentName}
        onAnswerCall={handleAnswerCall}
      />
    );
  }

  if (state === 'active') {
    return (
      <ActiveCallScreen
        transcript={transcript}
        callSeconds={callSeconds}
        turnCount={turnCount}
        anchorFlash={anchorFlash}
        onEndCall={handleEndCall}
      />
    );
  }

  if (state === 'scoring') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07070a] gap-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={36} className="text-blue-400" />
        </motion.div>
        <div className="text-center space-y-1">
          <div className="text-base font-semibold" style={{ color: 'hsl(0 0% 98%)' }}>
            Analyzing your call...
          </div>
          <div className="text-sm" style={{ color: 'hsl(240 5% 64.9%)' }}>
            Reviewing discovery, compliance, and needs analysis
          </div>
        </div>
      </div>
    );
  }

  if (state === 'debrief' && score) {
    return (
      <PostCallDebrief
        score={score}
        transcript={transcript}
        agentName={agentName}
        callDuration={callSeconds}
        onStartNew={handleReset}
        onTryAgain={handleReset}
      />
    );
  }

  // Error fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07070a]">
      <div className="text-center space-y-4">
        <div className="text-red-400">{scoreError || 'Something went wrong'}</div>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(145deg, #4388f8, #2563eb)' }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
