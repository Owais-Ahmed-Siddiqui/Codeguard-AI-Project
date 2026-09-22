import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';
import Logo from '../components/Logo';

interface NotFoundPageProps {
  onHome: () => void;
  onBack?: () => void;
}

export default function NotFoundPage({ onHome, onBack }: NotFoundPageProps) {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Same background as home */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#D4AF37]/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-[#D4AF37]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <div className="glass-card-static p-10 rounded-[28px] border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#A68B2A]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#D4AF37]/10">
            <FileQuestion size={32} className="text-[#D4AF37]" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#666] mb-4">
            <Search size={11} /> 404 • Page not found
          </div>

          <h1 className="text-[48px] font-black tracking-tight leading-none mb-3">
            4<span className="gold-gradient-text">0</span>4
          </h1>
          <h2 className="text-xl font-bold tracking-tight mb-2">Lost in the code?</h2>
          <p className="text-[#777] text-[14px] leading-relaxed mb-8 max-w-[320px] mx-auto">
            The page you’re looking for doesn’t exist. Maybe it was moved, or you typed a wrong URL. Let’s get you back to shipping secure code.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onHome} className="flex-1 btn-gold py-3 text-[13px] flex items-center justify-center gap-2 rounded-xl">
              <Home size={14} /> Go to Home
            </button>
            {onBack && (
              <button onClick={onBack} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.05] border border-white/[0.06] text-[13px] hover:border-[#D4AF37]/20 hover:text-white transition-all">
                <ArrowLeft size={14} /> Go Back
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-center gap-3 text-[11px] text-[#333]">
            <div className="flex items-center gap-1.5">
              <Logo size={10} bgClassName="w-5 h-5 rounded-lg" />
              <span>CodeGuard AI</span>
            </div>
            <span className="w-1 h-1 bg-white/10 rounded-full" />
            <span>20 reviews/day free</span>
          </div>
        </div>

        <p className="text-[11px] text-[#333] mt-4">If you think this is a bug, report on GitHub</p>
      </motion.div>
    </div>
  );
}
