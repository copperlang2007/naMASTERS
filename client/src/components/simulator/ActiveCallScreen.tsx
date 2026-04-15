import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Headphones, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/components/simulator/types";

interface ActiveCallScreenProps {
  transcript: TranscriptSegment[];
  callSeconds: number;
  turnCount: number;
  anchorFlash: boolean;
  onEndCall: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function ActiveCallScreen({
  transcript,
  callSeconds,
  turnCount,
  anchorFlash,
  onEndCall,
}: ActiveCallScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a]">

      {/* ── TOP BAR ────────────────────────────────────────────────── */}
      <div
        className="h-14 flex items-center justify-between px-6 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #4388f8 0%, #2563eb 100%)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 12h16M4 12c0-4 4-8 8-8M4 12c0 4 4 8 8 8M20 12c0-4-4-8-8-8M20 12c0 4-4 8-8 8"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16 }}>
            <span style={{ color: 'hsl(240 5% 64.9%)', fontWeight: 600, fontSize: 12 }}>the</span>
            <span style={{ background: 'linear-gradient(135deg, #93c5fd, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BRIDGE</span>
          </div>
        </div>

        {/* Center — live status + timer */}
        <div className="flex items-center gap-4">
          {/* Live pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'linear-gradient(145deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#34d399',
            }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live
          </div>

          {/* Timer */}
          <div className="px-3 py-1.5 rounded-lg text-sm font-semibold tabular-nums"
            style={{
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              background: 'linear-gradient(145deg, rgba(0,0,0,0.15), rgba(255,255,255,0.01)), hsl(240 6% 5%)',
              boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.02)',
              color: 'hsl(0 0% 98%)',
              letterSpacing: '0.05em',
            }}>
            {formatTime(callSeconds)}
          </div>

          {/* Turn counter */}
          <div className="text-xs" style={{ color: 'hsl(240 5% 64.9%)' }}>
            Turn <span style={{ color: 'hsl(0 0% 88%)', fontWeight: 600 }}>{turnCount}</span>
          </div>

          {/* Anchor flash */}
          <AnimatePresence>
            {anchorFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-xs font-semibold px-2 py-1 rounded-md"
                style={{
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  color: '#60a5fa',
                }}
              >
                ✦ Anchored
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* End call button */}
        <motion.button
          onClick={onEndCall}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white border-none outline-none cursor-pointer"
          style={{
            background: 'linear-gradient(145deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
            boxShadow: '4px 4px 12px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <PhoneOff size={15} />
          End Call
        </motion.button>
      </div>

      {/* ── TRANSCRIPT ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Panel header */}
        <div className="px-6 py-3 flex items-center gap-2 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.4))' }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span className="text-sm font-semibold" style={{ color: 'hsl(0 0% 98%)' }}>Live Transcript</span>
          <span className="text-xs ml-auto" style={{ color: 'hsl(240 5% 64.9%)' }}>
            {transcript.filter(s => s.isFinal).length} exchanges
          </span>
        </div>

        {/* Transcript body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {transcript.filter(s => s.isFinal).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ color: 'rgba(255,255,255,0.1)' }}>
                  <path d="M3 18v-6a9 9 0 0118 0v6"/>
                  <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
                </svg>
              </motion.div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Waiting for conversation to begin...
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {transcript.filter(s => s.isFinal).map((seg, i) => {
                const isCaller = seg.speaker === 'caller';
                const time = new Date(seg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit', second: '2-digit'
                });

                return (
                  <motion.div
                    key={`${seg.timestamp}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3"
                  >
                    {/* Icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: isCaller
                          ? 'linear-gradient(145deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))'
                          : 'linear-gradient(145deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                        border: isCaller
                          ? '1px solid rgba(245,158,11,0.12)'
                          : '1px solid rgba(59,130,246,0.12)',
                        boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.2)',
                        color: isCaller ? '#f59e0b' : '#60a5fa',
                      }}
                    >
                      {isCaller
                        ? <User size={12} />
                        : <Headphones size={12} />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: isCaller ? 'rgba(245,158,11,0.7)' : 'rgba(96,165,250,0.7)' }}
                        >
                          {/* NEVER reveal it's "Dorothy" during the call */}
                          {isCaller ? 'Caller' : 'You (Agent)'}
                        </span>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {time}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 88%)' }}>
                        {seg.text}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* ── COMPLIANCE BAR ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-8 px-6 py-3"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.03)',
        }}
      >
        {[
          { color: '#fbbf24', text: 'Introduce yourself & company first' },
          { color: '#fbbf24', text: 'SOA required before plan discussion' },
          { color: '#ef4444', text: 'Never ask for SSN — use Medicare ID + DOB' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
            {item.text}
          </div>
        ))}
      </div>

    </div>
  );
}
