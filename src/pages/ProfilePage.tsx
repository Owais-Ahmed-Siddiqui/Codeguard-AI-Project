import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Code2, LogOut, Edit3, X, Zap, Award, Clock, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import Logo from '../components/Logo';

interface ProfilePageProps {
  onBack: () => void;
  onHome: () => void;
}

export default function ProfilePage({ onBack, onHome }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [email, setEmail] = useState('');
  const [joinDate, setJoinDate] = useState<string>('');
  const [totalReviews, setTotalReviews] = useState(0);
  const [credits, setCredits] = useState({ used: 0, remaining: 20, maxCredits: 20 });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async () => {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        // Get user profile from users table
        const { supabase } = await import('../lib/supabase');
        const { data: userRow } = await supabase.from('users').select('username, email, created_at, daily_count, last_review_date').eq('id', user?.id).single();
        
        if (userRow) {
          setUsername(userRow.username || user?.email?.split('@')[0] || '');
          setOriginalUsername(userRow.username || '');
          setEmail(userRow.email || user?.email || '');
          setJoinDate(userRow.created_at || user?.created_at || new Date().toISOString());
        } else {
          setUsername(user?.email?.split('@')[0] || '');
          setOriginalUsername(user?.email?.split('@')[0] || '');
          setEmail(user?.email || '');
          setJoinDate(user?.created_at || new Date().toISOString());
        }

        // Get stats
        try {
          const data = await api.getHistory(token);
          setTotalReviews(data.stats.totalReviews || 0);
          setCredits({ ...data.stats.credits, maxCredits: data.stats.credits.maxCredits || 20 });
        } catch {}
      } catch (e) {
        console.error('[Profile] fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [user, getToken]);

  const handleSaveUsername = async () => {
    if (!username.trim() || username === originalUsername) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('users').update({ username: username.trim() }).eq('id', user?.id);
      if (error) throw error;
      setOriginalUsername(username.trim());
      setIsEditing(false);
      showToast(`Username updated to ${username.trim()}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update username', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut({ scope: 'global' } as any);
    } catch {}
    try {
      await signOut();
    } catch {}
    try {
      localStorage.removeItem('codeguard_page');
      localStorage.removeItem('codeguard_workspace_view');
    } catch {}
    showToast('Signed out from all devices', 'success');
    setTimeout(() => onHome(), 500);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return '—'; }
  };

  const daysSinceJoin = (() => {
    try {
      const diff = Date.now() - new Date(joinDate).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch { return 0; }
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 border-b border-white/[0.04] bg-[#08080C]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-[#666] hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Logo size={13} bgClassName="w-7 h-7 rounded-lg" />
            <span className="font-extrabold text-sm">Profile</span>
          </div>
          <button onClick={onHome} className="text-[#666] hover:text-white text-sm">Home</button>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Your Profile</h1>
          <p className="text-[#666] text-[14px]">Manage your account, 20 free reviews/day with CodeGuard AI</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          {/* Main profile card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-static p-7 rounded-[20px]">
            <div className="flex items-start gap-5 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#A68B2A]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black text-2xl shadow-lg shadow-[#D4AF37]/10">
                {(username[0] || email[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{username}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-bold text-[#D4AF37]">Free • 20/day</span>
                </div>
                <p className="text-[#666] text-[13px] mt-1 flex items-center gap-1.5"><Mail size={12} /> {email}</p>
                <p className="text-[#555] text-[11px] mt-1 flex items-center gap-1.5"><Calendar size={11} /> Joined {formatDate(joinDate)} • {daysSinceJoin} days ago</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-[#666] tracking-wider uppercase mb-2">Username (editable)</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} disabled={!isEditing} placeholder="johndoe" className={`w-full bg-[#0A0A0F] border rounded-xl pl-10 pr-4 py-3 text-[13px] text-white placeholder-[#333] focus:outline-none transition-all ${isEditing ? 'border-[#D4AF37]/30 bg-[#0F0F14]' : 'border-white/[0.06] opacity-80'}`} />
                  </div>
                  {isEditing ? (
                    <>
                      <button onClick={handleSaveUsername} disabled={saving || !username.trim()} className="px-4 py-3 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 text-[#27C93F] hover:bg-[#27C93F]/20 flex items-center gap-1.5 text-[13px] disabled:opacity-40">
                        {saving ? <div className="w-4 h-4 border-2 border-[#27C93F]/20 border-t-[#27C93F] rounded-full animate-spin" /> : <Save size={14} />} Save
                      </button>
                      <button onClick={() => { setUsername(originalUsername); setIsEditing(false); }} className="px-3 py-3 rounded-xl bg-white/[0.05] border border-white/[0.06] text-[#666] hover:text-white"><X size={14} /></button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.06] text-[#888] hover:text-white hover:border-[#D4AF37]/20 flex items-center gap-1.5 text-[13px]"><Edit3 size={14} /> Edit</button>
                  )}
                </div>
                <p className="text-[11px] text-[#444] mt-2">Username is public in shared reviews. 3-20 characters, letters/numbers only.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#666] tracking-wider uppercase mb-2">Email (read-only)</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" />
                  <input type="text" value={email} disabled className="w-full bg-[#0A0A0F]/50 border border-white/[0.04] rounded-xl pl-10 pr-4 py-3 text-[13px] text-[#666] cursor-not-allowed" />
                </div>
                <p className="text-[11px] text-[#444] mt-2">Email cannot be changed. Contact support if needed.</p>
              </div>

              <div className="pt-4 border-t border-white/[0.04]">
                <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2"><Clock size={14} className="text-[#D4AF37]" /> Account Timeline</h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-[#666]">Member since</span><span className="text-white">{formatDate(joinDate)}</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">Days active</span><span className="text-white">{daysSinceJoin} days</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">Plan</span><span className="text-[#D4AF37] font-bold">Free • 20/day</span></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats + actions */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card-static p-6 rounded-[20px]">
              <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2"><BarChart3Icon /> Your Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0A0A0F] border border-white/[0.04] rounded-xl p-4 text-center">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-2"><Code2 size={16} className="text-[#D4AF37]" /></div>
                  <div className="text-xl font-black">{totalReviews}</div>
                  <div className="text-[11px] text-[#666]">Total Reviews</div>
                </div>
                <div className="bg-[#0A0A0F] border border-white/[0.04] rounded-xl p-4 text-center">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2"><Zap size={16} className="text-green-400" /></div>
                  <div className="text-xl font-black">{credits.remaining}/{credits.maxCredits || 20}</div>
                  <div className="text-[11px] text-[#666]">Credits Left Today</div>
                </div>
                <div className="bg-[#0A0A0F] border border-white/[0.04] rounded-xl p-4 text-center col-span-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-2"><Award size={16} className="text-purple-400" /></div>
                  <div className="text-[13px] font-bold">CodeGuard • Fast & Secure</div>
                  <div className="text-[11px] text-[#666] mt-1">{credits.used} used today • 20 free/day • Ghost Mode unlimited</div>
                  <div className="mt-2 w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${((credits.maxCredits || 20) - credits.remaining) / (credits.maxCredits || 20) * 100}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static p-6 rounded-[20px] border border-red-500/10">
              <h3 className="text-[13px] font-bold mb-3 text-red-300 flex items-center gap-2"><LogOut size={14} /> Session & Security</h3>
              <p className="text-[12px] text-[#666] leading-relaxed mb-4">Logout everywhere will sign you out from all devices and clear saved sessions. Your reviews stay saved.</p>
              <div className="space-y-2">
                <button onClick={async () => { try { const { supabase } = await import('../lib/supabase'); await supabase.auth.signOut(); } catch {} localStorage.clear(); showToast('Signed out locally', 'success'); setTimeout(() => onHome(), 600); }} className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] text-[#888] hover:text-white hover:border-white/[0.1]">Logout from this device</button>
                <button onClick={handleSignOutEverywhere} className="w-full py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/15 text-[13px] text-red-400 hover:bg-red-500/[0.12] flex items-center justify-center gap-2"><LogOut size={14} /> Logout Everywhere</button>
              </div>
              <p className="text-[10px] text-[#444] mt-3 text-center">Powered by Supabase Auth</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart3Icon() {
  return (
    <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 6-6" /></svg>
    </div>
  );
}
