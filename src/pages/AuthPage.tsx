import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

/* Same ParticleField as Home page - background only */
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

export default function AuthPage({ onBack, onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!username.trim()) throw new Error('Username is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signUp(email, password, username);
        setSuccess('Account created! Check your email for verification, then sign in.');
        setMode('signin');
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed.';
      if (msg.includes('Invalid login')) setError('Invalid email or password.');
      else if (msg.includes('already registered')) setError('This email is already registered. Try signing in.');
      else if (msg.includes('Email not confirmed')) setError('Please verify your email before signing in.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col relative overflow-hidden">
      {/* Home page background & animations - no cards */}
      <ParticleField />
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#D4AF37]/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-[#D4AF37]/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] right-[10%] w-[300px] h-[300px] bg-purple-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
      
      {/* Back button */}
      <div className="relative z-10 p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-[#666] hover:text-white transition-colors text-sm group">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-[#D4AF37]/20 transition-all">
            <ArrowLeft size={14} />
          </div>
          Back to home
        </button>
      </div>

      {/* Centered form - old simple version */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex justify-center">
              <Logo size={26} bgClassName="w-14 h-14 rounded-2xl" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Code<span className="gold-gradient-text">Guard</span> AI
            </h1>
            <p className="text-[#555] text-sm mt-1">
              {mode === 'signin' ? 'Welcome back. Sign in to continue.' : 'Create your free account.'}
            </p>
          </div>

          <div className="glass-card-static p-8">
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl mb-7">
              {(['signin', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === m
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                      : 'text-[#555] hover:text-[#888]'
                  }`}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/15 text-red-400 text-[13px] mb-5"
                >
                  <AlertCircle size={15} /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/[0.06] border border-green-500/15 text-green-400 text-[13px] mb-5"
                >
                  <CheckCircle size={15} /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[12px] font-semibold text-[#888] mb-1.5">Username</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="johndoe"
                      required
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#D4AF37]/30 transition-colors"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-[#888] mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#D4AF37]/30 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#888] mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#D4AF37]/30 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-3.5 text-sm flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> {mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <p className="text-center text-[12px] text-[#444] mt-6">
              {mode === 'signin' ? (
                <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-[#D4AF37] hover:underline">Sign up free</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); }} className="text-[#D4AF37] hover:underline">Sign in</button></>
              )}
            </p>
          </div>

          <p className="text-center text-[11px] text-[#333] mt-5">
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
