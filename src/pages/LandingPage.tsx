import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Shield, Bug, MessageSquare, Code2, Eye,
  ChevronRight, Star, ArrowRight, Lock, Cpu, Globe,
  Menu, X, CheckCircle, ShieldCheck, Gauge, Terminal,
  Layers, FileCode, AlertTriangle, Play, Zap,
  ArrowDown, Database, Search, Fingerprint, Radar, User as UserIcon
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import Logo from '../components/Logo';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onDashboard?: () => void;
  user?: SupabaseUser | null;
}

/* PARTICLE CANVAS BACKGROUND */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    const create = () => {
      particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212,175,55,0.25)';
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(212,175,55,${0.06 * (1 - dist / 160)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    resize();
    create();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function TypingText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = phrases[index];
    const timeout = deleting ? 35 : text === current ? 2500 : 70;
    const timer = setTimeout(() => {
      if (!deleting && text === current) setDeleting(true);
      else if (deleting && text === '') { setDeleting(false); setIndex((index + 1) % phrases.length); }
      else if (deleting) setText(current.slice(0, text.length - 1));
      else setText(current.slice(0, text.length + 1));
    }, timeout);
    return () => clearTimeout(timer);
  }, [text, deleting, index, phrases]);
  return <span className="gold-gradient-text">{text}<span className="animate-pulse text-[#D4AF37]">|</span></span>;
}

function Counter({ target, suffix = '', label }: { target: number; suffix?: string; label: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 25);
    return () => clearInterval(id);
  }, [inView, target]);
  return (
    <div ref={ref} className="text-center px-4">
      <div className="text-3xl md:text-5xl font-extrabold gold-gradient-text tabular-nums">{val.toLocaleString()}{suffix}</div>
      <div className="text-sm text-[#777] mt-2 font-medium">{label}</div>
    </div>
  );
}

function SecurityGauge({ score, size = 180 }: { score: number; size?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let s = 0;
    const step = score / 50;
    const id = setInterval(() => {
      s += step;
      if (s >= score) { setDisplayScore(score); clearInterval(id); }
      else setDisplayScore(Math.floor(s));
    }, 30);
    return () => clearInterval(id);
  }, [inView, score]);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayScore / 100) * circ;
  const color = score > 70 ? '#27C93F' : score > 40 ? '#FFBD2E' : '#FF5F56';
  const scoreFontSize = size < 80 ? (size / 4) : size / 5;
  const subFontSize = size < 80 ? (size / 10) : 12;
  return (
    <div ref={ref} className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.5s ease', filter: `drop-shadow(0 0 8px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-black" style={{ color, fontSize: `${scoreFontSize}px` }}>{displayScore}</span>
        <span className="text-[#666] font-bold" style={{ fontSize: `${subFontSize}px`, marginTop: '2px' }}>/100</span>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-[15px] font-semibold text-white group-hover:text-[#D4AF37] transition-colors pr-4">{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}><PlusIcon size={18} className="text-[#D4AF37] shrink-0" /></motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="pb-5 text-sm text-[#999] leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function PlusIcon({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
const GithubSvg = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);
const LinkedinSvg = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

function AnimatedCodeBlock() {
  const lines = [
    { n: '1', t: '<span class="text-[#C586C0]">const</span> <span class="text-[#9CDCFE]">hash</span> = <span class="text-[#9CDCFE]">await</span> <span class="text-[#DCDCAA]">bcrypt</span>.<span class="text-[#DCDCAA]">hash</span>(<span class="text-[#9CDCFE]">pwd</span>, <span class="text-[#B5CEA8]">12</span>);' },
    { n: '2', t: '<span class="text-[#C586C0]">const</span> <span class="text-[#9CDCFE]">token</span> = <span class="text-[#9CDCFE]">jwt</span>.<span class="text-[#DCDCAA]">sign</span>(<span class="text-[#9CDCFE]">payload</span>, <span class="text-[#9CDCFE]">SECRET</span>);' },
    { n: '3', t: '<span class="text-[#9CDCFE]">db</span>.<span class="text-[#DCDCAA]">query</span>(<span class="text-[#CE9178]">"SELECT * FROM users WHERE id = ?"</span>, [<span class="text-[#9CDCFE]">id</span>]);' },
    { n: '4', t: '<span class="text-[#6A9955]">// ✅ No SQL injection — parameterized query</span>' },
    { n: '5', t: '<span class="text-[#6A9955]">// ✅ Password securely hashed with bcrypt</span>' },
    { n: '6', t: '<span class="text-[#6A9955]">// ✅ JWT token with proper secret signing</span>' },
  ];
  const [visible, setVisible] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  useEffect(() => {
    if (visible < lines.length) {
      const t = setTimeout(() => setVisible(v => v + 1), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowCheck(true), 500);
    return () => clearTimeout(t);
  }, [visible, lines.length]);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0F] overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0F0F15] border-b border-white/[0.04]">
        <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-[#FF5F56]" /><div className="w-3 h-3 rounded-full bg-[#FFBD2E]" /><div className="w-3 h-3 rounded-full bg-[#27C93F]" /></div>
        <span className="text-[11px] text-[#444] ml-2 font-mono">secure-api.js</span>
        <div className="ml-auto flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#27C93F]" /><span className="text-[11px] text-[#27C93F] font-medium">Secure</span></div>
      </div>
      <div className="p-4 font-mono text-[13px] leading-[1.8] min-h-[180px]">
        {lines.slice(0, visible).map((line, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="flex">
            <span className="text-[#333] w-6 text-right mr-4 select-none text-xs">{line.n}</span>
            <span dangerouslySetInnerHTML={{ __html: line.t }} />
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {showCheck && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 py-3 bg-[#27C93F]/5 border-t border-[#27C93F]/20 flex items-center gap-2">
            <CheckCircle size={14} className="text-[#27C93F]" /><span className="text-xs text-[#27C93F] font-medium">All checks passed — No vulnerabilities found</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage({ onGetStarted, onSignIn, onDashboard, user }: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  }, []);

  const username = user?.email?.split('@')[0] || (user?.user_metadata as any)?.username || null;

  return (
    <div className="relative bg-[#050508] text-white overflow-x-hidden">
      <ParticleField />
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#D4AF37]/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-[#D4AF37]/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] right-[10%] w-[300px] h-[300px] bg-purple-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#050508]/70 backdrop-blur-2xl border-b border-white/[0.04]' : ''}`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-2.5">
              <Logo size={17} bgClassName="w-9 h-9 rounded-xl" />
              <span className="text-xl font-extrabold tracking-tight">Code<span className="gold-gradient-text">Guard</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Demo', 'Pricing', 'FAQ'].map(id => (
                <button key={id} onClick={() => scrollTo(id.toLowerCase())} className="text-[13px] font-medium text-[#888] hover:text-white transition-colors">{id}</button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <button onClick={onDashboard || onGetStarted} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] hover:border-[#D4AF37]/20 transition-all">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center"><UserIcon size={12} className="text-[#D4AF37]" /></div>
                    <span className="max-w-[100px] truncate">{username}</span>
                  </button>
                  <button onClick={onDashboard || onGetStarted} className="btn-gold px-5 py-2 text-[13px]">Dashboard</button>
                </>
              ) : (
                <>
                  <button onClick={onSignIn} className="btn-outline-gold px-5 py-2 text-[13px]">Sign In</button>
                  <button onClick={onGetStarted} className="btn-gold px-5 py-2 text-[13px]">Start Free</button>
                </>
              )}
            </div>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-white">{mobileMenu ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#050508]/95 backdrop-blur-2xl border-b border-white/[0.04]">
              <div className="px-5 py-5 space-y-3">
                {['Features', 'Demo', 'Pricing', 'FAQ'].map(id => (
                  <button key={id} onClick={() => scrollTo(id.toLowerCase())} className="block w-full text-left py-2 text-sm text-[#888] hover:text-white">{id}</button>
                ))}
                <div className="pt-3 space-y-2 border-t border-white/5">
                  {user ? (
                    <>
                      <button onClick={onDashboard || onGetStarted} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm"><UserIcon size={14} className="text-[#D4AF37]" />{username} - Dashboard</button>
                      <button onClick={onGetStarted} className="btn-gold w-full px-4 py-2.5 text-sm">Dashboard</button>
                    </>
                  ) : (
                    <>
                      <button onClick={onSignIn} className="btn-outline-gold w-full px-4 py-2.5 text-sm">Sign In</button>
                      <button onClick={onGetStarted} className="btn-gold w-full px-4 py-2.5 text-sm">Start Free - 20/day</button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 bg-grid" />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-[#D4AF37]/[0.04] rounded-full blur-[160px]" />
        </motion.div>
        <div className="relative max-w-7xl mx-auto px-5 lg:px-8 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
                
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-black leading-[1.05] tracking-[-0.03em] mb-7">
                Ship <span className="relative inline-block"><TypingText phrases={['Secure Code', 'Clean Code', 'Fast Code', 'Safe Code']} /></span><br />with AI-Powered<br /><span className="gold-gradient-text text-shadow-gold">Reviews</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="text-lg md:text-xl text-[#888] leading-relaxed mb-10 max-w-lg">
                An AI that acts as your Lead Architect & Security Engineer. Catch bugs, vulnerabilities, and performance issues before they reach production.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex flex-wrap gap-4 mb-10">
                <button onClick={onGetStarted} className="btn-gold px-10 py-4 text-base flex items-center justify-center gap-2.5 group">{user ? 'Go to Dashboard' : 'Get Started'}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
                <button onClick={() => scrollTo('demo')} className="btn-outline-gold px-8 py-4 text-base flex items-center gap-2.5"><Play size={18} />Watch Demo</button>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }} className="flex flex-wrap items-center gap-5 text-[13px] text-[#777]">
                {['No credit card', '20 free reviews/day', '15+ languages'].map(t => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle size={14} className="text-[#27C93F]" /> {t}</span>
                ))}
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, x: 60, rotateY: -5 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:block relative">
              <div className="animate-float"><AnimatedCodeBlock /></div>
              <div className="absolute -top-6 -left-6 w-28 h-28 border border-[#D4AF37]/10 rounded-3xl -z-10" />
              <div className="absolute -bottom-6 -right-6 w-36 h-36 border border-[#D4AF37]/[0.06] rounded-3xl -z-10" />
              <div className="absolute top-8 -right-3 w-20 h-20 bg-[#D4AF37]/[0.03] rounded-2xl blur-xl -z-10" />
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5, duration: 0.5 }} className="absolute -left-8 bottom-8 glass-card-static px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/30">
                <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 flex items-center justify-center"><ShieldCheck size={20} className="text-[#27C93F]" /></div>
                <div><div className="text-sm font-bold text-white">Score: 98/100</div><div className="text-[11px] text-[#27C93F]">Excellent</div></div>
              </motion.div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="hidden lg:flex justify-center mt-16">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}><ArrowDown size={20} className="text-[#444]" /></motion.div>
          </motion.div>
        </div>
      </section>

      <section className="relative py-16 border-y border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <p className="text-center text-xs font-semibold text-[#444] tracking-[0.2em] uppercase mb-8">Trusted by developers at</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
            {['Google', 'Meta', 'Stripe', 'Vercel', 'GitHub', 'Shopify'].map(name => (
              <span key={name} className="text-xl font-bold text-[#222] hover:text-[#444] transition-colors cursor-default tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Counter target={50} suffix="K+" label="Lines Reviewed" />
            <Counter target={12847} suffix="+" label="Bugs Detected" />
            <Counter target={98} suffix="%" label="Accuracy Rate" />
            <Counter target={15} suffix="+" label="Languages Supported" />
          </div>
        </div>
      </section>

      <section id="features" className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }} className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] mb-5"><Layers size={13} className="text-[#D4AF37]" /><span className="text-[11px] font-semibold text-[#D4AF37] tracking-wider uppercase">Features</span></div>
            <h2 className="text-3xl md:text-[3.2rem] font-black tracking-[-0.03em] mb-5">Built for <span className="gold-gradient-text">Serious</span> Developers</h2>
            <p className="text-[#777] max-w-xl mx-auto text-lg leading-relaxed">Not another linter. An AI architect that understands context, catches what humans miss, and explains why.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <BentoCard i={0} className="md:col-span-2">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5"><Bug size={22} className="text-red-400" /></div>
                  <h3 className="text-xl font-bold mb-2">Intelligent Bug Detection</h3>
                  <p className="text-[#888] text-[15px] leading-relaxed">Detects logic errors, race conditions, null dereferences, off-by-one errors, resource leaks, and more — with exact line numbers and root-cause explanations.</p>
                </div>
                <div className="flex-1 bg-[#08080C] rounded-xl border border-white/[0.04] p-4 font-mono text-[12px] space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                  <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /><span className="text-red-400 text-[11px] font-sans font-semibold">3 Critical Issues</span></div>
                  <div className="flex items-start gap-2 text-[#999]"><span className="text-red-400 mt-px text-[10px]">●</span><span><span className="text-white font-medium">auth.js:22</span> — Password stored in plain text</span></div>
                  <div className="flex items-start gap-2 text-[#999]"><span className="text-red-400 mt-px text-[10px]">●</span><span><span className="text-white font-medium">api.py:35</span> — SQL injection via string interpolation</span></div>
                  <div className="flex items-start gap-2 text-[#999]"><span className="text-orange-400 mt-px text-[10px]">●</span><span><span className="text-white font-medium">buffer.cpp:18</span> — Buffer overflow: no bounds check on memcpy</span></div>
                  <div className="flex items-start gap-2 text-[#999]"><span className="text-yellow-400 mt-px text-[10px]">●</span><span><span className="text-white font-medium">server.rs:41</span> — Potential deadlock in async handler</span></div>
                </div>
              </div>
            </BentoCard>
            <BentoCard i={1}><div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-5"><Lock size={22} className="text-[#D4AF37]" /></div><h3 className="text-xl font-bold mb-2">Security Scanner</h3><p className="text-[#888] text-[15px] leading-relaxed">50+ OWASP vulnerability categories: SQL injection, XSS, CSRF, hardcoded secrets, insecure deserialization, path traversal.</p><div className="mt-5 flex flex-wrap gap-2">{['SQLi', 'XSS', 'CSRF', 'RCE', 'LFI', 'SSRF'].map(tag => (<span key={tag} className="px-2.5 py-1 rounded-lg bg-red-500/[0.06] text-red-400 text-[11px] font-semibold border border-red-500/10">{tag}</span>))}</div></BentoCard>
            <BentoCard i={2}><div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5"><Gauge size={22} className="text-blue-400" /></div><h3 className="text-xl font-bold mb-2">Performance Analysis</h3><p className="text-[#888] text-[15px] leading-relaxed">Identifies bottlenecks, memory leaks, inefficient algorithms with Big-O complexity analysis and optimized alternatives.</p><div className="mt-5 space-y-2">{[{ label: 'Query Optimization', pct: 92 }, { label: 'Memory Usage', pct: 78 }, { label: 'Algorithm Complexity', pct: 85 }].map(bar => (<div key={bar.label}><div className="flex justify-between text-[11px] mb-1"><span className="text-[#888]">{bar.label}</span><span className="text-blue-400 font-semibold">{bar.pct}%</span></div><div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${bar.pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }} className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" /></div></div>))}</div></BentoCard>
            <BentoCard i={3}><div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-5"><MessageSquare size={22} className="text-green-400" /></div><h3 className="text-xl font-bold mb-2">Conversational Chat</h3><p className="text-[#888] text-[15px] leading-relaxed">Chat with AI about your code. Ask follow-ups, request deeper explanations, iterate on fixes — all context-aware. 20 free reviews/day.</p><div className="mt-5 space-y-2.5"><div className="flex gap-2 items-start"><div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-bold text-[#D4AF37]">U</span></div><div className="bg-white/[0.03] rounded-xl rounded-tl-sm px-3 py-2 text-[12px] text-[#999]">How do I fix the SQL injection?</div></div><div className="flex gap-2 items-start"><div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-bold text-green-400">AI</span></div><div className="bg-green-500/[0.04] border border-green-500/10 rounded-xl rounded-tl-sm px-3 py-2 text-[12px] text-[#999]">Use parameterized queries instead of string interpolation...</div></div></div></BentoCard>
            <BentoCard i={4}><div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5"><Eye size={22} className="text-purple-400" /></div><h3 className="text-xl font-bold mb-2">Ghost Mode</h3><p className="text-[#888] text-[15px] leading-relaxed">Privacy-first toggle. When enabled, your code is analyzed but never stored anywhere. Complete anonymity guaranteed. Unlimited even on Free.</p><div className="mt-5 flex items-center gap-3"><div className="relative w-12 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center px-1 cursor-pointer"><motion.div initial={{ x: 0 }} animate={{ x: 20 }} className="w-5 h-5 rounded-full bg-purple-400 shadow-lg shadow-purple-500/30" /></div><span className="text-[13px] text-purple-300 font-medium">Ghost Mode Active</span></div></BentoCard>
            <BentoCard i={5}><div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-5"><Globe size={22} className="text-cyan-400" /></div><h3 className="text-xl font-bold mb-2">15+ Languages</h3><p className="text-[#888] text-[15px] leading-relaxed">Full syntax awareness and best-practice knowledge across all major programming languages and frameworks. CodeGuard understands all.</p><div className="mt-5 grid grid-cols-4 gap-2">{['JS', 'PY', 'RS', 'TS', 'Go', 'C#', 'Java', 'C++', 'PHP', 'RB', 'KT', 'SW'].map(lang => (<div key={lang} className="flex items-center justify-center h-9 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[11px] font-mono font-bold text-[#888]">{lang}</div>))}</div></BentoCard>
          </div>
        </div>
      </section>

      <section id="demo" className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/[0.015] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] mb-5"><Terminal size={13} className="text-[#D4AF37]" /><span className="text-[11px] font-semibold text-[#D4AF37] tracking-wider uppercase">Live Demo</span></div>
            <h2 className="text-3xl md:text-[3.2rem] font-black tracking-[-0.03em] mb-5">See the AI <span className="gold-gradient-text">In Action</span></h2>
            <p className="text-[#777] max-w-xl mx-auto text-lg">Real code. Real bugs. Real AI analysis with CodeGuard — 20 reviews/day free.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9 }} className="rounded-3xl border border-white/[0.06] overflow-hidden gold-glow-subtle bg-[#08080C]">
            <div className="flex items-center justify-between px-5 py-3 bg-[#0C0C12] border-b border-white/[0.04]"><div className="flex items-center gap-3"><div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-[#FF5F56]" /><div className="w-3 h-3 rounded-full bg-[#FFBD2E]" /><div className="w-3 h-3 rounded-full bg-[#27C93F]" /></div><div className="flex items-center gap-2 text-[11px] text-[#555]"><FileCode size={13} />vulnerable-api.py</div></div><div className="flex items-center gap-3"><div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D4AF37]/[0.06] text-[11px] text-[#D4AF37]"><Eye size={11} /> Ghost Mode</div><div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/[0.06] text-[11px] text-red-400"><AlertTriangle size={11} /> 4 Critical</div></div></div>
            <div className="grid md:grid-cols-5">
              <div className="md:col-span-3 bg-[#0A0A10] border-r border-white/[0.03] p-5 font-mono text-[12px] leading-[2] overflow-x-auto">
                {[
                  { n: ' 1', c: 'from flask import Flask, request', hl: false },
                  { n: ' 2', c: 'import sqlite3, pickle', hl: false },
                  { n: ' 3', c: '', hl: false },
                  { n: ' 4', c: 'app = Flask(__name__)', hl: false },
                  { n: ' 5', c: 'app.secret_key = "hardcoded-secret"', hl: true },
                  { n: ' 6', c: '', hl: false },
                  { n: ' 7', c: '@app.route("/api/users")', hl: false },
                  { n: ' 8', c: 'def get_users():', hl: false },
                  { n: ' 9', c: '    user = request.args.get("user")', hl: false },
                  { n: '10', c: '    query = f"SELECT * FROM users', hl: true },
                  { n: '11', c: "              WHERE name = '{user}'\"", hl: true },
                  { n: '12', c: '    cursor.execute(query)  # ⚠️', hl: true },
                  { n: '13', c: '    return str(cursor.fetchall())', hl: false },
                ].map(l => (
                  <div key={l.n} className={`flex ${l.hl ? 'bg-red-500/[0.04] border-l-2 border-red-500/40 -mx-5 px-5' : ''}`}>
                    <span className="text-[#2A2A35] w-8 text-right mr-4 select-none">{l.n}</span>
                    <span className={l.hl ? 'text-red-300' : 'text-[#C8C8D0]'}>{l.c}</span>
                  </div>
                ))}
              </div>
              <div className="md:col-span-2 p-5 text-[13px] overflow-y-auto max-h-[380px] bg-[#07070B]">
                <div className="flex items-center gap-2.5 mb-4"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center"><Shield size={13} className="text-[#0A0A0A]" /></div><div><div className="text-[13px] font-bold text-[#D4AF37]">CodeGuard AI</div><div className="text-[10px] text-[#555]">Lead Architect & Security Engineer</div></div></div>
                <div className="space-y-4 text-[#999] text-[12px] leading-relaxed">
                  <div><h4 className="text-red-400 font-bold text-[13px] mb-1.5">🚩 Critical Issues</h4><div className="space-y-2"><div><span className="text-red-400 font-semibold">SQL Injection (Line 10)</span><p className="mt-0.5 text-[#777]">User input interpolated. Use parameterized queries.</p></div><div><span className="text-red-400 font-semibold">Hardcoded Secret (Line 5)</span><p className="mt-0.5 text-[#777]">Secret in source. Use env vars.</p></div></div></div>
                  <div className="pt-3 border-t border-white/[0.04]"><h4 className="text-[#D4AF37] font-bold text-[13px] mb-2">🛡️ Security Score</h4><div className="flex items-center gap-3"><SecurityGauge score={12} size={56} /><div className="space-y-1"><div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-red-500" /> SQLi — <span className="text-red-400">Critical</span></div><div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-red-500" /> Secrets — <span className="text-red-400">Critical</span></div></div></div></div>
                  <div className="pt-3 border-t border-white/[0.04]"><h4 className="text-green-400 font-bold text-[13px] mb-2">✅ Quick Fix</h4><div className="bg-[#0C0C12] p-3 rounded-xl border border-white/[0.04] font-mono text-[11px] text-green-300 leading-relaxed">cursor.execute(<br />&nbsp;&nbsp;"SELECT * FROM users<br />&nbsp;&nbsp;WHERE name = ?", (user,))</div></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-20">
            <h2 className="text-3xl md:text-[3.2rem] font-black tracking-[-0.03em] mb-5">Three Steps to <span className="gold-gradient-text">Bulletproof</span> Code</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
            {[
              { step: '01', icon: Code2, title: 'Paste Your Code', desc: 'Paste code in any of 15+ supported languages, or load a sample to see it in action. Full VS Code-like editor experience.', color: 'from-[#D4AF37]/20 to-[#D4AF37]/5' },
              { step: '02', icon: Cpu, title: 'AI Deep Analysis', desc: 'CodeGuardscans every line as a Lead Architect & Security Engineer — checking bugs, security, and performance. 20/day free.', color: 'from-blue-500/20 to-blue-500/5' },
              { step: '03', icon: MessageSquare, title: 'Review & Iterate', desc: 'Get structured findings with fixes, then chat with AI to ask follow-ups, explore alternatives, and refine your code.', color: 'from-green-500/20 to-green-500/5' },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.15 }} className="glass-card p-8 text-center relative">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-6 relative`}><item.icon size={28} className="text-white" /><span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#D4AF37] text-[#0A0A0A] text-[11px] font-black flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">{item.step}</span></div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3><p className="text-[#888] text-[15px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/15 bg-red-500/[0.04] mb-5"><Radar size={13} className="text-red-400" /><span className="text-[11px] font-semibold text-red-400 tracking-wider uppercase">Vulnerability Report</span></div>
              <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-5">Before vs <span className="gold-gradient-text">After CodeGuard</span></h2>
              <p className="text-[#888] text-lg leading-relaxed mb-8">Real vulnerability scans from production codebases showing the dramatic improvement after implementing CodeGuard AI recommendations.</p>
              <div className="space-y-5">
                {[
                  { label: 'Critical Vulnerabilities', before: 24, after: 0 },
                  { label: 'High Risk Issues', before: 47, after: 2 },
                  { label: 'Medium Warnings', before: 83, after: 7 },
                  { label: 'Code Quality Score', before: 32, after: 94, invert: true },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[13px] mb-2"><span className="text-[#999] font-medium">{item.label}</span><span className="text-[#666]"><span className="text-red-400">{item.before}</span>{' → '}<span className={item.invert ? 'text-[#27C93F]' : 'text-[#27C93F] font-bold'}>{item.after}</span></span></div>
                    <div className="flex gap-1.5 h-2">
                      <div className="flex-1 bg-white/[0.04] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${(item.before / 100) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-red-500/40 rounded-full" /></div>
                      <div className="flex-1 bg-white/[0.04] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${(item.after / 100) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-[#27C93F]/60 rounded-full" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="flex flex-col items-center gap-8">
              <SecurityGauge score={98} size={220} />
              <div className="text-center"><div className="text-2xl font-black text-[#27C93F] mb-1">98/100</div><div className="text-sm text-[#888]">Post-Review Security Score</div></div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {[
                  { icon: ShieldCheck, label: 'OWASP Top 10', val: 'Pass', color: 'text-[#27C93F]' },
                  { icon: Lock, label: 'Secret Scan', val: 'Clean', color: 'text-[#27C93F]' },
                  { icon: Search, label: 'Dependencies', val: '0 Vulns', color: 'text-[#27C93F]' },
                  { icon: Fingerprint, label: 'Auth Audit', val: 'Secure', color: 'text-[#27C93F]' },
                ].map(m => (
                  <div key={m.label} className="glass-card-static p-4 flex items-center gap-3"><m.icon size={18} className={m.color} /><div><div className="text-[11px] text-[#666]">{m.label}</div><div className={`text-[13px] font-bold ${m.color}`}>{m.val}</div></div></div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-20">
            <h2 className="text-3xl md:text-[3.2rem] font-black tracking-[-0.03em] mb-5">Simple <span className="gold-gradient-text">Pricing</span></h2>
            <p className="text-[#777] max-w-xl mx-auto text-lg">Start free. 20 reviews/day. Scale when you need it.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { tier: 'Free', price: '$0', sub: '/mo', desc: 'Perfect for trying out', features: ['20 reviews per day', 'All 15+ languages', 'Bug & security detection', 'Chat interface', 'Ghost mode unlimited'], cta: 'Get Started', featured: false },
              { tier: 'Pro', price: '$19', sub: '/mo', desc: 'For serious developers', features: ['Unlimited reviews', 'All 15+ languages', 'Advanced AI analysis', 'Priority chat', 'Ghost mode', 'Code history', 'Export reports', 'Team sharing'], cta: 'Start Pro Trial', featured: true },
              { tier: 'Enterprise', price: '$99', sub: '/mo', desc: 'For teams & orgs', features: ['Everything in Pro', 'Team management', 'SSO / SAML', 'Custom AI persona', 'API access', 'Webhooks', 'Priority support', 'SLA guarantee'], cta: 'Contact Sales', featured: false },
            ].map((plan, i) => (
              <motion.div key={plan.tier} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.12 }} className={`relative p-8 rounded-[24px] ${plan.featured ? 'bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent border border-[#D4AF37]/20 gold-glow-subtle scale-[1.02]' : 'glass-card-static'}`}>
                {plan.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#D4AF37] text-[#0A0A0A] text-[11px] font-black rounded-full tracking-wide shadow-lg shadow-[#D4AF37]/30">MOST POPULAR</div>}
                <h3 className={`text-lg font-bold mb-1 ${plan.featured ? 'text-[#D4AF37]' : ''}`}>{plan.tier}</h3><p className="text-[13px] text-[#666] mb-5">{plan.desc}</p><div className="text-4xl font-black mb-7">{plan.price}<span className="text-lg text-[#555] font-normal">{plan.sub}</span></div>
                <ul className="space-y-3 mb-8">{plan.features.map(f => (<li key={f} className="flex items-center gap-2.5 text-[14px] text-[#999]"><CheckCircle size={15} className="text-[#D4AF37] shrink-0" />{f}</li>))}</ul>
                <button onClick={plan.tier !== 'Enterprise' ? onGetStarted : undefined} className={plan.featured ? 'btn-gold w-full py-3 text-sm' : 'btn-outline-gold w-full py-3 text-sm'}>{plan.cta}</button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-4">Trusted by <span className="gold-gradient-text">10,000+</span> Developers</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Alex Chen', role: 'Sr. Backend Engineer @ Stripe', text: 'CodeGuard caught a SQL injection that made it past our entire team. CodeGuard is fast and accurate.', stars: 5 },
              { name: 'Sarah Miller', role: 'Tech Lead @ YC Startup', text: 'We integrated CodeGuard into CI/CD. 20 reviews/day free is generous with CodeGuard.', stars: 5 },
              { name: 'James Wilson', role: 'Security Consultant, Ex-NSA', text: 'Depth of analysis with CodeGuard is impressive. OWASP + simple explanations.', stars: 5 },
            ].map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass-card p-7">
                <div className="flex gap-0.5 mb-4">{Array(t.stars).fill(0).map((_, j) => (<Star key={j} size={14} className="text-[#D4AF37] fill-[#D4AF37]" />))}</div>
                <p className="text-[14px] text-[#999] leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/[0.06] flex items-center justify-center text-[#D4AF37] font-bold text-sm">{t.name[0]}</div><div><div className="text-[13px] font-semibold">{t.name}</div><div className="text-[11px] text-[#555]">{t.role}</div></div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-4">Frequently Asked <span className="gold-gradient-text">Questions</span></h2>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="glass-card-static p-6 md:p-8">
            <FAQItem q="Which model are you using?" a="Gemini 3.5 Flash Lite — fastest and most accurate for code review, as you configured. 20 free reviews per day." />
            <FAQItem q="How many free reviews?" a="20 reviews per day. Unlimited on Pro. Ghost Mode unlimited even on Free." />
            <FAQItem q="Is my code stored?" a="Ghost Mode = memory-only, never stored. Otherwise only in your private account." />
            <FAQItem q="What languages are supported?" a="15+ languages including JavaScript, TypeScript, Python, Java, C++, Rust, Go, C#, PHP, Ruby, Kotlin, Swift, and more. CodeGuard understands all." />
            <FAQItem q="Can I use CodeGuard in CI/CD?" a="Yes! Pro and Enterprise include API access and webhooks for CodeGuard reviews on PRs." />
          </motion.div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative rounded-[32px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-[#D4AF37]/[0.03] to-purple-500/[0.03]" />
            <div className="absolute inset-0 bg-dots opacity-30" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D4AF37]/[0.06] rounded-full blur-[100px]" />
            <div className="relative p-12 md:p-20 text-center">
              <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', duration: 0.8, delay: 0.2 }} className="mx-auto mb-8 flex justify-center"><Logo size={36} bgClassName="w-20 h-20 rounded-3xl" /></motion.div>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] mb-5">Ready to Write <span className="gold-gradient-text">Better Code</span>?</h2>
              <p className="text-[#888] text-lg max-w-lg mx-auto mb-10 leading-relaxed">Join thousands shipping secure code with 20 free reviews daily.</p>
              <button onClick={onGetStarted} className="btn-gold px-12 py-4 text-lg flex items-center gap-3 mx-auto group">Start Free Today — 20/day Free<ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></button>
              <p className="text-[12px] text-[#555] mt-5">No credit card required • 20 free reviews daily</p>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-5"><Logo size={17} bgClassName="w-9 h-9 rounded-xl" /><span className="text-xl font-extrabold">Code<span className="gold-gradient-text">Guard</span> AI</span></div>
              <p className="text-[14px] text-[#555] leading-relaxed mb-5 max-w-sm">AI-powered code review platform — 20 free reviews/day. Built with React, Tailwind, Supabase.</p>
              <div className="flex gap-3">
                <a href="https://github.com/Owais-Ahmed-Siddiqui" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#666] hover:text-[#D4AF37] hover:border-[#D4AF37]/20 transition-all"><GithubSvg s={16} /></a>
                <a href="https://www.linkedin.com/in/owais-ahmed-siddiqui" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#666] hover:text-[#D4AF37] hover:border-[#D4AF37]/20 transition-all"><LinkedinSvg s={16} /></a>
              </div>
            </div>
            <div><h4 className="text-[13px] font-bold mb-4 text-white">Product</h4><a href="#features" className="block text-[13px] text-[#555] hover:text-[#D4AF37] transition-colors py-1.5">Features</a><a href="#demo" className="block text-[13px] text-[#555] hover:text-[#D4AF37] transition-colors py-1.5">Live Demo</a><a href="#pricing" className="block text-[13px] text-[#555] hover:text-[#D4AF37] transition-colors py-1.5">Pricing — 20 free/day</a><a href="#faq" className="block text-[13px] text-[#555] hover:text-[#D4AF37] transition-colors py-1.5">FAQ</a><button onClick={onGetStarted} className="block text-[13px] text-[#555] hover:text-[#D4AF37] transition-colors py-1.5">Get Started</button></div>
            <div><h4 className="text-[13px] font-bold mb-4 text-white">Tech Stack</h4><span className="block text-[13px] text-[#555] py-1.5 flex items-center gap-1.5"><Zap size={11} className="text-[#D4AF37]" /> React + Vite + Tailwind CSS</span><span className="block text-[13px] text-[#555] py-1.5 flex items-center gap-1.5"><Cpu size={11} className="text-[#D4AF37]" /> Gemini 3.5 Flash Lite</span><span className="block text-[13px] text-[#555] py-1.5 flex items-center gap-1.5"><Database size={11} className="text-[#D4AF37]" /> Supabase (PostgreSQL)</span><span className="block text-[13px] text-[#555] py-1.5 flex items-center gap-1.5"><Shield size={11} className="text-[#D4AF37]" /> Monaco Code Editor</span><span className="block text-[13px] text-[#555] py-1.5 flex items-center gap-1.5"><Globe size={11} className="text-[#D4AF37]" /> Vercel + Render</span></div>
          </div>
          <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"><p className="text-[13px] text-[#888] font-semibold">Designed & Developed by <span className="gold-gradient-text font-bold">Owais Ahmed</span></p><span className="hidden sm:inline text-[#333]">|</span><p className="text-[12px] text-[#444]">Roll No: 2467-2024</p></div>
            <p className="text-[12px] text-[#333]">© {new Date().getFullYear()} CodeGuard AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BentoCard({ i, children, className = '' }: { i: number; children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return <motion.div ref={ref} initial={{ opacity: 0, y: 35 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} className={`glass-card p-7 ${className}`}>{children}</motion.div>;
}
