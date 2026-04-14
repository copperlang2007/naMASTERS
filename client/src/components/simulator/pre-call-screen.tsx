import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreCallScreenProps {
  agentName: string;
  onAgentNameChange: (name: string) => void;
  onAnswerCall: () => void;
}

export function PreCallScreen({ agentName, onAgentNameChange, onAnswerCall }: PreCallScreenProps) {
  const [isRinging, setIsRinging] = useState(true);

  const handleAnswer = () => {
    setIsRinging(false);
    setTimeout(onAnswerCall, 300);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07070a] relative overflow-hidden">

      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* theBRIDGE wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-8 left-8 flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(145deg, #4388f8 0%, #2563eb 100%)', boxShadow: '3px 3px 8px rgba(37,99,235,0.3)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 12h16M4 12c0-4 4-8 8-8M4 12c0 4 4 8 8 8M20 12c0-4-4-8-8-8M20 12c0 4-4 8-8 8"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ color: 'hsl(240 5% 64.9%)', fontWeight: 600, fontSize: 14 }}>the</span>
          <span style={{
            background: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))',
            display: 'block',
            marginTop: -2
          }}>BRIDGE</span>
        </div>
      </motion.div>

      {/* Training mode badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{
          background: 'linear-gradient(145deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
          border: '1px solid rgba(59,130,246,0.2)',
          color: '#60a5fa',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Training Mode
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col items-center gap-10 z-10"
      >

        {/* Incoming call indicator */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ opacity: isRinging ? [0.5, 1, 0.5] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: '#10b981', letterSpacing: '0.2em' }}
          >
            ● Incoming Call
          </motion.div>
          <div className="text-lg font-medium" style={{ color: 'hsl(240 5% 64.9%)' }}>
            Medicare Helpline
          </div>
        </div>

        {/* Pulsing phone button */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse rings */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-emerald-500/20"
              animate={{
                scale: [1, 1 + i * 0.35],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeOut',
              }}
              style={{ width: 100, height: 100 }}
            />
          ))}

          {/* Answer button */}
          <motion.button
            onClick={handleAnswer}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, #34d399 0%, #059669 100%)',
              boxShadow: '0 0 40px rgba(16,185,129,0.4), 4px 4px 16px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Phone size={36} className="text-white fill-white" />
          </motion.button>
        </div>

        {/* Instruction */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium" style={{ color: 'hsl(0 0% 88%)' }}>
            Click to answer
          </p>
          <p className="text-xs" style={{ color: 'hsl(240 5% 64.9%)' }}>
            You have no information about this caller
          </p>
        </div>

        {/* Agent name input */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(240 5% 64.9%)' }}>
            Your Name
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => onAgentNameChange(e.target.value)}
            placeholder="Enter your name before answering"
            className="w-64 px-4 py-2.5 rounded-xl text-sm text-center outline-none"
            style={{
              background: 'linear-gradient(145deg, rgba(0,0,0,0.15), rgba(255,255,255,0.01)), hsl(240 6% 5.5%)',
              boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -2px -2px 6px rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
              color: 'hsl(0 0% 98%)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(59,130,246,0.3)';
              e.target.style.boxShadow = 'inset 2px 2px 6px rgba(0,0,0,0.35), 0 0 0 2px rgba(59,130,246,0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.04)';
              e.target.style.boxShadow = 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -2px -2px 6px rgba(255,255,255,0.015)';
            }}
          />
        </div>

      </motion.div>

      {/* Compliance reminder — bottom, subtle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6"
      >
        {[
          { icon: '🟡', text: 'Introduce yourself & company first' },
          { icon: '🟡', text: 'SOA required before plan discussion' },
          { icon: '🔴', text: 'Never ask for SSN — use Medicare ID + DOB' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(240 5% 64.9%)' }}>
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </motion.div>

    </div>
  );
}
