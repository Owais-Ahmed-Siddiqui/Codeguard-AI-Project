import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, Sparkles, MessageSquare, X, ChevronRight, Shield, Code2, Zap } from 'lucide-react';

const STORAGE_KEY = 'codeguard_onboarding_seen';

const steps = [
  {
    icon: FileCode,
    title: '1. Paste your code',
    desc: 'Paste any code in 15+ languages — JavaScript, Python, Java, C++ and more. Auto-detects language. Or load a vulnerable sample to try.',
    color: 'from-[#D4AF37]/20 to-[#D4AF37]/5',
    iconBg: 'bg-[#D4AF37]/10',
    iconColor: 'text-[#D4AF37]',
    detail: 'Tip: Drag & drop or Ctrl+V. Supports up to 50,000 chars.',
  },
  {
    icon: Sparkles,
    title: '2. Click Review',
    desc: 'CodeGuard scans every line as Lead Architect & Security Engineer. See inline red squiggles, security score, and fixed code with Diff view.',
    color: 'from-blue-500/20 to-blue-500/5',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    detail: '20 free reviews/day • 0.8s avg • Ghost Mode for privacy',
  },
  {
    icon: MessageSquare,
    title: '3. Chat for fix',
    desc: 'Ask about any line, get simple beginner-friendly explanations. One-click Apply Fix, copy, and iterate. Clear chat anytime.',
    color: 'from-green-500/20 to-green-500/5',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    detail: 'Try: “Explain this SQLi in simple words” or “Make it more secure”',
  },
];

interface OnboardingTourProps {
  onClose?: () => void;
}

export default function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Delay to let editor load
        const t = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    setIsOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const current = steps[step];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#050508]/70 backdrop-blur-[2px]"
            onClick={handleSkip}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[91] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[440px]"
          >
            <div className="glass-card-static rounded-[24px] border border-white/[0.08] bg-[#0F0F14]/90 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Header progress */}
              <div className="px-6 pt-5 pb-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center">
                    <Shield size={14} className="text-[#0A0A0A]" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold tracking-wide">Quick Tour</div>
                    <div className="text-[11px] text-[#666]">20/day free</div>
                  </div>
                </div>
                <button onClick={handleSkip} className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#666] hover:text-white hover:border-white/[0.1] transition-all">
                  <X size={14} />
                </button>
              </div>

              {/* Progress dots */}
              <div className="px-6 pt-4 flex gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#D4AF37]' : i < step ? 'w-4 bg-[#D4AF37]/40' : 'w-4 bg-white/[0.08]'}`} />
                ))}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center mb-5 border border-white/[0.04]`}>
                  <current.icon size={26} className={current.iconColor} />
                </div>

                <h3 className="text-[18px] font-black tracking-tight mb-2">{current.title}</h3>
                <p className="text-[13px] text-[#999] leading-relaxed mb-3">{current.desc}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#666]">
                  <Zap size={10} className="text-[#D4AF37]" /> {current.detail}
                </div>

                {/* Visual hint */}
                <div className="mt-6 p-3 rounded-xl bg-[#08080C] border border-white/[0.04] flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#FF5F56]/60" />
                    <div className="w-2 h-2 rounded-full bg-[#FFBD2E]/60" />
                    <div className="w-2 h-2 rounded-full bg-[#27C93F]/60" />
                  </div>
                  <div className="flex-1 flex items-center gap-2 text-[11px] font-mono text-[#555]">
                    {step === 0 && <><Code2 size={11} /> Paste code here → auto-detects</>}
                    {step === 1 && <><Sparkles size={11} className="text-[#D4AF37]" /> Click Review → inline squiggles + score</>}
                    {step === 2 && <><MessageSquare size={11} className="text-green-400" /> Chat → Apply Fix in 1 click</>}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex items-center justify-between">
                <button onClick={handleSkip} className="text-[13px] text-[#666] hover:text-white transition-colors">Skip tour</button>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#444]">{step + 1} / {steps.length}</span>
                  <button onClick={handleNext} className="btn-gold px-5 py-2.5 text-[13px] flex items-center gap-1.5 rounded-xl">
                    {step === steps.length - 1 ? 'Got it — Start coding' : 'Next'} <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Subtle gold glow */}
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#D4AF37]/[0.06] rounded-full blur-[50px] pointer-events-none" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
