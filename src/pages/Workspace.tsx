import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Trash2, LogOut, User,
  Settings, Loader2, Menu, X, Zap, RefreshCw, WifiOff, LogIn
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, type HistoryReview } from '../lib/api';
import EditorPage from './EditorPage';
import DashboardPage from './DashboardPage';
import Logo from '../components/Logo';

interface WorkspaceProps {
  onAuth: () => void;
  onHome: () => void;
  onProfile?: () => void;
  initialView?: 'editor' | 'dashboard';
}

export default function Workspace({ onAuth, onHome, onProfile, initialView = 'editor' }: WorkspaceProps) {
  const { user, signOut } = useAuth();
  const isLoggedIn = !!user;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setReviews] = useState<HistoryReview[]>([]);
  const [activeReview, setActiveReview] = useState<HistoryReview | null>(null);
  const [view, setView] = useState<'editor' | 'dashboard'>(initialView);
  const [loading, setLoading] = useState(isLoggedIn);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Update view when initialView changes (e.g., coming from landing dashboard button)
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.getHistory(token);
      setReviews(data.reviews || []);
      setBackendStatus('connected');
    } catch { setBackendStatus('offline'); }
    finally { setLoading(false); }
  }, [user, getToken]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleNewReview = () => {
    setActiveReview(null);
    setView('editor');
    try { localStorage.setItem('codeguard_workspace_view', 'editor'); } catch {}
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const selectReview = (review: HistoryReview) => {
    setActiveReview({ ...review });
    setView('editor');
    try { localStorage.setItem('codeguard_workspace_view', 'editor'); } catch {}
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDashboardView = () => {
    setView('dashboard');
    try { localStorage.setItem('codeguard_workspace_view', 'dashboard'); } catch {}
  };

  const deleteReview = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this review?')) return;
    try {
      const token = await getToken();
      if (!token) return;
      await api.deleteReview(token, id);
      setReviews(prev => prev.filter(r => r.id !== id));
      if (activeReview?.id === id) { setActiveReview(null); setView('editor'); }
      fetchHistory();
    } catch { /* ignore */ }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    setUserMenuOpen(false);
    setReviews([]);
    setActiveReview(null);
    try { 
      localStorage.setItem('codeguard_page', 'landing');
      localStorage.setItem('codeguard_workspace_view', 'editor');
    } catch {}
    onHome();
  };

  const username = user?.email?.split('@')[0] || 'User';

  return (
    <div className="h-screen flex bg-[#050508] text-white overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="bg-[#08080C] border-r border-white/[0.04] flex flex-col overflow-hidden relative z-40"
      >
        <div className="p-4 flex flex-col h-full w-[280px]">
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <Logo size={18} bgClassName="w-8 h-8 rounded-lg" />
              <span className="font-extrabold text-lg tracking-tight">CodeGuard <span className="text-[#D4AF37]">AI</span></span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#444] hover:text-white"><X size={18} /></button>
          </div>

          <button onClick={handleNewReview}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all mb-6 group">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center group-hover:bg-[#D4AF37]/20">
              <Plus size={18} className="text-[#D4AF37]" />
            </div>
            <span className="text-sm font-semibold">New Review</span>
            {isLoggedIn && (
              <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-[#444]">
                <Zap size={10} /> 20 Free
              </div>
            )}
          </button>

          {!isLoggedIn && (
            <div className="mb-6 p-4 rounded-2xl bg-[#D4AF37]/[0.04] border border-[#D4AF37]/10">
              <p className="text-[12px] text-[#888] mb-3 leading-relaxed">
                You're using CodeGuard <strong className="text-white">without an account</strong>. Reviews work but <strong className="text-white">won't be saved</strong>.
              </p>
              <button onClick={onAuth}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-gold text-[13px]">
                <LogIn size={14} /> Sign in to Save History
              </button>
            </div>
          )}

          {isLoggedIn && (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1">
              <div className="px-2 mb-2">
                <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Recent Reviews</span>
              </div>
              {loading ? (
                <div className="py-8 flex flex-col items-center gap-2 opacity-50">
                  <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
                  <span className="text-[10px]">Loading...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 px-2 text-center">
                  <p className="text-[11px] text-[#444]">No saved reviews yet.<br />Your reviews will appear here.</p>
                </div>
              ) : (
                history.map(item => (
                  <button key={item.id} onClick={() => selectReview(item)}
                    className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-left transition-all group ${
                      activeReview?.id === item.id && view === 'editor' ? 'bg-[#D4AF37]/[0.08] text-[#D4AF37]' : 'hover:bg-white/[0.03] text-[#888] hover:text-[#CCC]'
                    }`}>
                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">
                        {item.code.trim().split('\n')[0].substring(0, 28) || 'Untitled'}
                      </div>
                      <div className="text-[10px] opacity-40 uppercase font-bold">{item.language}</div>
                    </div>
                    <button onClick={(e) => deleteReview(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </button>
                ))
              )}
            </div>
          )}

          {!isLoggedIn && <div className="flex-1" />}

          <div className="mt-auto pt-4 border-t border-white/[0.04]">
            {isLoggedIn ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/[0.03] transition-all">
                  <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <User size={18} className="text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[13px] font-bold truncate">{username}</div>
                    <div className="text-[10px] text-[#444] truncate">{user?.email}</div>
                  </div>
                  <Settings size={14} className={`text-[#333] transition-transform ${userMenuOpen ? 'rotate-90 text-[#D4AF37]' : ''}`} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 w-full mb-2 bg-[#0F0F15] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden p-1 z-50">
                      <button onClick={() => { handleDashboardView(); setUserMenuOpen(false); }}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/[0.03] text-[13px] text-[#888] hover:text-white">
                        📊 Dashboard
                      </button>
                      {onProfile && (
                        <button onClick={() => { onProfile(); setUserMenuOpen(false); }}
                          className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/[0.03] text-[13px] text-[#888] hover:text-white">
                          👤 Profile
                        </button>
                      )}
                      <button onClick={onHome}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/[0.03] text-[13px] text-[#888] hover:text-white">
                        🏠 Home
                      </button>
                      <button onClick={handleSignOut}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-red-500/[0.05] text-[13px] text-[#888] hover:text-red-400">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={onAuth}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/[0.03] transition-all text-left">
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <LogIn size={16} className="text-[#666]" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-[#888]">Sign In</div>
                  <div className="text-[10px] text-[#444]">Save your review history</div>
                </div>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-30 p-2 rounded-lg bg-[#08080C] border border-white/[0.04] text-[#666] hover:text-white">
            <Menu size={20} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {view === 'dashboard' && isLoggedIn ? (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full overflow-y-auto no-scrollbar">
              <DashboardPage onNewReview={handleNewReview} onBack={() => setView('editor')} onViewReview={selectReview} />
            </motion.div>
          ) : (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <EditorPage 
                onBack={isLoggedIn ? () => setView('dashboard') : () => onHome()} 
                initialReview={activeReview}
                onReviewComplete={fetchHistory} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {backendStatus === 'offline' && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <WifiOff size={14} /> Offline <button onClick={fetchHistory} className="hover:underline"><RefreshCw size={10} /></button>
          </div>
        )}
      </main>
    </div>
  );
}
