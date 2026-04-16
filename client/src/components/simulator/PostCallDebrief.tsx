import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, RotateCcw, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Star, Headphones, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CallScore,
  TranscriptSegment,
  DiscoveryChecklist,
} from "@/components/simulator/types";
import {
  DOROTHY_GROUND_TRUTH,
  CHECKLIST_LABELS,
  DIMENSION_LABELS,
} from "@/components/simulator/types";

interface PostCallDebriefProps {
  score: CallScore;
  transcript: TranscriptSegment[];
  agentName: string;
  callDuration: number;
  onStartNew: () => void;
  onTryAgain: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const glow = score >= 80
    ? '0 0 40px rgba(16,185,129,0.3)'
    : score >= 60
    ? '0 0 40px rgba(245,158,11,0.3)'
    : '0 0 40px rgba(239,68,68,0.3)';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ boxShadow: glow, borderRadius: '50%' }}>
        <motion.span
          className="text-4xl font-bold font-display"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function DimensionCard({
  dimensionKey,
  data,
  index,
}: {
  dimensionKey: string;
  data: { score: number; what_agent_did: string; what_was_missed: string; perfect_response: string };
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  const meta = DIMENSION_LABELS[dimensionKey as keyof typeof DIMENSION_LABELS];
  const color = data.score >= 80 ? '#10b981' : data.score >= 60 ? '#f59e0b' : '#ef4444';
  const bgColor = data.score >= 80
    ? 'rgba(16,185,129,0.08)'
    : data.score >= 60
    ? 'rgba(245,158,11,0.08)'
    : 'rgba(239,68,68,0.08)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 7%)',
        boxShadow: '6px 6px 16px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left cursor-pointer bg-transparent border-none outline-none"
      >
        {/* Score bubble */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold font-display"
          style={{ background: bgColor, color, border: `1px solid ${color}30` }}
        >
          {data.score}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: 'hsl(0 0% 98%)' }}>
              {meta?.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'hsl(240 5% 64.9%)' }}>
              {meta?.weight}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${data.score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.07 + 0.2 }}
            />
          </div>
        </div>

        <div style={{ color: 'hsl(240 5% 64.9%)' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>

              {/* What agent did */}
              <div className="pt-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  What you did
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 88%)' }}>
                  {data.what_agent_did || 'No data captured for this dimension.'}
                </p>
              </div>

              {/* What was missed */}
              {data.what_was_missed && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'linear-gradient(145deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">What you missed</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(251,191,36,0.9)' }}>
                    {data.what_was_missed}
                  </p>
                </div>
              )}

              {/* Perfect response */}
              {data.perfect_response && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'linear-gradient(145deg, rgba(59,130,246,0.08), rgba(59,130,246,0.03))',
                    border: '1px solid rgba(59,130,246,0.15)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={13} className="text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Expert agent would have said</span>
                  </div>
                  <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(147,197,253,0.9)' }}>
                    "{data.perfect_response}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PostCallDebrief({
  score,
  transcript,
  agentName,
  callDuration,
  onStartNew,
  onTryAgain,
}: PostCallDebriefProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const checklist = score.discovery_checklist;
  const discovered = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length;

  const overallColor = score.overall_score >= 80
    ? '#10b981'
    : score.overall_score >= 60
    ? '#f59e0b'
    : '#ef4444';

  const overallLabel = score.overall_score >= 80
    ? 'Strong Performance'
    : score.overall_score >= 60
    ? 'Developing'
    : 'Needs Work';

  const dimensionEntries = Object.entries(DIMENSION_LABELS).map(([key, meta]) => ({
    key,
    meta,
    data: score[key as keyof typeof DIMENSION_LABELS] as {
      score: number;
      what_agent_did: string;
      what_was_missed: string;
      perfect_response: string;
    },
  }));

  return (
    <div className="min-h-screen bg-[#07070a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(7,7,10,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #4388f8 0%, #2563eb 100%)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 12h16M4 12c0-4 4-8 8-8M4 12c0 4 4 8 8 8M20 12c0-4-4-8-8-8M20 12c0 4-4 8-8 8"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: 'hsl(0 0% 98%)' }}>
            Call Debrief
          </span>
          <span style={{ color: 'hsl(240 5% 64.9%)', fontSize: 13 }}>
            {agentName} · {formatTime(callDuration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={onTryAgain}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 9%)',
              boxShadow: '4px 4px 10px rgba(0,0,0,0.5), -4px -4px 10px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'hsl(0 0% 98%)',
            }}
          >
            <RotateCcw size={14} />
            Try Again
          </motion.button>

          <motion.button
            onClick={onStartNew}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, #4388f8 0%, #2563eb 50%, #1d4ed8 100%)',
              boxShadow: '4px 4px 12px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            New Call
          </motion.button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── SECTION 1: OVERALL SCORE ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 7%)',
            boxShadow: '6px 6px 16px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <ScoreCircle score={score.overall_score} />

          <div className="flex-1 space-y-4">
            <div>
              <div className="text-2xl font-bold font-display" style={{ color: overallColor }}>
                {overallLabel}
              </div>
              <div className="text-sm mt-1" style={{ color: 'hsl(240 5% 64.9%)' }}>
                {discovered} of {total} items discovered
              </div>
            </div>

            {/* Strength */}
            {score.top_strength && (
              <div className="rounded-xl p-4" style={{
                background: 'linear-gradient(145deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">Top Strength</div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(52,211,153,0.9)' }}>{score.top_strength}</p>
              </div>
            )}

            {/* Improvement */}
            {score.top_improvement && (
              <div className="rounded-xl p-4" style={{
                background: 'linear-gradient(145deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
                border: '1px solid rgba(245,158,11,0.15)',
              }}>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">#1 Thing to Fix</div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(251,191,36,0.9)' }}>{score.top_improvement}</p>
              </div>
            )}

            {/* Compliance flags */}
            {score.compliance_flags.length > 0 && (
              <div className="rounded-xl p-4" style={{
                background: 'linear-gradient(145deg, rgba(239,68,68,0.1), rgba(239,68,68,0.04))',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-red-400" />
                  <div className="text-xs font-bold uppercase tracking-wider text-red-400">Compliance Flags</div>
                </div>
                <ul className="space-y-1">
                  {score.compliance_flags.map((flag, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'rgba(252,165,165,0.9)' }}>
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── SECTION 2: DISCOVERY CHECKLIST + REVEAL ────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 7%)',
            boxShadow: '6px 6px 16px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {/* Section header */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="text-base font-bold font-display" style={{ color: 'hsl(0 0% 98%)' }}>
              What You Uncovered
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'hsl(240 5% 64.9%)' }}>
              {discovered} of {total} items discovered through needs analysis
            </div>
          </div>

          {/* Checklist grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-2">
            {(Object.entries(checklist) as [keyof DiscoveryChecklist, boolean][]).map(([key, found]) => (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: found
                    ? 'linear-gradient(145deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))'
                    : 'linear-gradient(145deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))',
                  border: found
                    ? '1px solid rgba(16,185,129,0.12)'
                    : '1px solid rgba(239,68,68,0.12)',
                }}
              >
                {found
                  ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  : <XCircle size={15} className="text-red-400 flex-shrink-0" />
                }
                <span className="text-sm" style={{ color: found ? 'rgba(52,211,153,0.9)' : 'rgba(252,165,165,0.9)' }}>
                  {CHECKLIST_LABELS[key]}
                </span>
              </div>
            ))}
          </div>

          {/* Dorothy reveal */}
          <div
            className="mx-6 mb-6 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.01) 100%), hsl(240 6% 5%)',
              boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.02)',
            }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                  Dorothy's Actual Profile — Revealed Post-Call
                </span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: 'Full Name', val: DOROTHY_GROUND_TRUTH.name },
                { label: 'Date of Birth', val: DOROTHY_GROUND_TRUTH.dob },
                { label: 'Address', val: DOROTHY_GROUND_TRUTH.address },
                { label: 'Phone', val: DOROTHY_GROUND_TRUTH.phone },
                { label: 'Medicare ID', val: DOROTHY_GROUND_TRUTH.medicare_id },
                { label: 'Current Plan', val: DOROTHY_GROUND_TRUTH.current_plan },
                { label: 'Primary Doctor', val: DOROTHY_GROUND_TRUTH.pcp },
                { label: 'Cardiologist', val: DOROTHY_GROUND_TRUTH.cardiologist },
                { label: 'Medications', val: DOROTHY_GROUND_TRUTH.medications },
                { label: 'Pharmacy', val: DOROTHY_GROUND_TRUTH.pharmacy },
                { label: 'LIS / Extra Help', val: DOROTHY_GROUND_TRUTH.lis },
                { label: 'Reason for Call', val: DOROTHY_GROUND_TRUTH.reason_for_call },
                { label: 'Priority 1', val: DOROTHY_GROUND_TRUTH.priority_1 },
                { label: 'Priority 2', val: DOROTHY_GROUND_TRUTH.priority_2 },
                { label: 'Priority 3', val: DOROTHY_GROUND_TRUTH.priority_3 },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {label}
                  </div>
                  <div className="text-sm" style={{ color: 'hsl(0 0% 88%)' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 3: DIMENSION SCORES ────────────────────────── */}
        <div>
          <div className="text-base font-bold font-display mb-4" style={{ color: 'hsl(0 0% 98%)' }}>
            Performance by Dimension
          </div>
          <div className="space-y-3">
            {dimensionEntries.map(({ key, data }, i) => (
              <DimensionCard
                key={key}
                dimensionKey={key}
                data={data}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* ── SECTION 4: FULL TRANSCRIPT ─────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 7%)',
            boxShadow: '6px 6px 16px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <button
            onClick={() => setTranscriptOpen(!transcriptOpen)}
            className="w-full flex items-center justify-between px-6 py-4 bg-transparent border-none outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: 'hsl(0 0% 98%)' }}>
                Full Call Transcript
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'hsl(240 5% 64.9%)' }}>
                {transcript.filter(s => s.isFinal).length} exchanges
              </span>
            </div>
            <div style={{ color: 'hsl(240 5% 64.9%)' }}>
              {transcriptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {transcriptOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-6 pb-6 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="pt-4 space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {transcript.filter(s => s.isFinal).map((seg, i) => {
                      const isCaller = seg.speaker === 'caller';
                      const time = new Date(seg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      });
                      return (
                        <div key={i} className="flex gap-3">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: isCaller
                                ? 'linear-gradient(145deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))'
                                : 'linear-gradient(145deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                              border: isCaller ? '1px solid rgba(245,158,11,0.12)' : '1px solid rgba(59,130,246,0.12)',
                              color: isCaller ? '#f59e0b' : '#60a5fa',
                            }}
                          >
                            {isCaller ? <User size={12} /> : <Headphones size={12} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {/* Post-call: reveal Dorothy's name */}
                              <span className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: isCaller ? 'rgba(245,158,11,0.7)' : 'rgba(96,165,250,0.7)' }}>
                                {isCaller ? 'Caller (Dorothy Miller)' : `Agent (${agentName})`}
                              </span>
                              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{time}</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 88%)' }}>{seg.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECTION 5: ACTION BUTTONS ──────────────────────────── */}
        <div className="flex items-center gap-4 pb-8">
          <motion.button
            onClick={onTryAgain}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 9%)',
              boxShadow: '4px 4px 10px rgba(0,0,0,0.5), -4px -4px 10px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'hsl(0 0% 98%)',
            }}
          >
            <RotateCcw size={15} />
            Try Again — Same Scenario
          </motion.button>

          <motion.button
            onClick={onStartNew}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, #4388f8 0%, #2563eb 50%, #1d4ed8 100%)',
              boxShadow: '4px 4px 12px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            Start New Call
          </motion.button>

          <motion.button
            onClick={() => window.open('/sunfire-mock.html', '_blank')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.1) 100%), hsl(240 6% 9%)',
              boxShadow: '4px 4px 10px rgba(0,0,0,0.5), -4px -4px 10px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: '#60a5fa',
            }}
          >
            <ExternalLink size={14} />
            View Mock Sunfire
          </motion.button>
        </div>

      </div>
    </div>
  );
}
