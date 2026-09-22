import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Code2, Trash2,
  AlertTriangle, ChevronRight, Loader2, Sparkles,
  ShieldCheck, ArrowLeft, LogOut, ExternalLink,
  Calendar, Hash, Zap, Copy, Check, RefreshCw,
  Wifi, WifiOff, Search, Filter, ArrowUpDown, Trash, ChevronsUpDown, TrendingUp, BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import Logo from '../components/Logo';

interface DashboardProps {
  onNewReview: () => void;
  onBack: () => void;
  onViewReview: (review: HistoryReview) => void;
}

interface HistoryReview {
  id: string;
  language: string;
  created_at: string;
  code: string;
  ai_feedback: { response: string } | null;
}

interface DashStats {
  totalReviews: number;
  criticalFound: number;
  topLanguage: string;
  languagesUsed: number;
  credits: { used: number; remaining: number; maxCredits?: number };
}

const langColors: Record<string, string> = {
  javascript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  python: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  java: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cpp: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  typescript: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rust: 'bg-red-500/10 text-red-400 border-red-500/20',
  go: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  csharp: 'bg-green-500/10 text-green-400 border-green-500/20',
  php: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  ruby: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const langLabels: Record<string, string> = {
  javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++',
  typescript: 'TypeScript', rust: 'Rust', go: 'Go', csharp: 'C#',
  php: 'PHP', ruby: 'Ruby',
};

function getScore(feedback: string | null): number | null {
  if (!feedback) return null;
  const m = feedback.match(/Security Score:\s*(\d+)\/10/);
  return m ? parseInt(m[1]) : null;
}

function getSeverityLevel(feedback: string | null): number {
  if (!feedback) return 4;
  const lower = feedback.toLowerCase();
  if (feedback.includes('🔴') || /critical/.test(lower)) return 0;
  if (feedback.includes('🟠') || /high/.test(lower) && !/medium/.test(lower)) return 1;
  if (feedback.includes('🟡') || /medium/.test(lower)) return 2;
  if (feedback.includes('🟢') || /low/.test(lower)) return 3;
  if (getScore(feedback) !== null) {
    const s = getScore(feedback)!;
    if (s <= 3) return 0;
    if (s <= 5) return 1;
    if (s <= 7) return 2;
    return 3;
  }
  return 4;
}

function getSeverityLabel(level: number): { label: string; color: string; bg: string } {
  switch (level) {
    case 0: return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    case 1: return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    case 2: return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
    case 3: return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    default: return { label: 'Unknown', color: 'text-[#666]', bg: 'bg-white/[0.03] border-white/[0.06]' };
  }
}

function TrendChart({ data }: { data: { score: number; date: string }[] }) {
  if (data.length < 2) return null;
  const width = 320;
  const height = 90;
  const pad = 16;
  const max = 10, min = 0;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((d.score - min) / (max - min)) * (height - pad * 2);
    return { x, y, score: d.score };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;
  const first = data[0]?.score ?? 0;
  const last = data[data.length - 1]?.score ?? 0;
  const trend = last - first;
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-[380px] bg-[#08080C] border border-white/[0.04] rounded-xl p-4">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-[90px] overflow-visible">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 5, 10].map(v => {
            const y = height - pad - ((v - min) / (max - min)) * (height - pad * 2);
            return <line key={v} x1={pad} y1={y} x2={width - pad} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />;
          })}
          <path d={areaD} fill="url(#trendFill)" />
          <path d={pathD} fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#0A0A0A" stroke="#D4AF37" strokeWidth="2" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="800" fill={p.score <= 3 ? '#ef4444' : p.score <= 6 ? '#eab308' : '#22c55e'}>{p.score}</text>
            </g>
          ))}
        </svg>
        <div className="flex justify-between mt-2 px-1">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] text-[#555] font-mono">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px] justify-center">
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${trend >= 0 ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} /> {trend >= 0 ? '+' : ''}{trend} {trend >= 0 ? 'Improving' : 'Declining'}
        </span>
        <span className="text-[#666] text-[11px]">{first} → {last} /10 </span>
      </div>
    </div>
  );
}

export default function DashboardPage({ onNewReview, onBack, onViewReview }: DashboardProps) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<HistoryReview[]>([]);
  const [stats, setStats] = useState<DashStats>({
    totalReviews: 0, criticalFound: 0, topLanguage: '—',
    languagesUsed: 0, credits: { used: 0, remaining: 20, maxCredits: 20 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendInfo, setBackendInfo] = useState<{ model?: string; gemini: boolean; supabase: boolean } | null>(null);

  // New: Filter, Search, Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'score'>('severity');
  const [showLangFilter, setShowLangFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const getToken = useCallback(async (): Promise<string> => {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    throw new Error('Not authenticated — please sign in again.');
  }, []);

  useEffect(() => { checkBackend(); }, []);

  const checkBackend = async () => {
    setBackendStatus('checking');
    try {
      const data = await api.health();
      setBackendStatus('connected');
      setBackendInfo({ model: data.model, gemini: data.gemini, supabase: data.supabase });
    } catch {
      setBackendStatus('disconnected');
      setBackendInfo(null);
    }
  };

  useEffect(() => {
    if (backendStatus === 'connected') fetchHistory();
    else if (backendStatus === 'disconnected') {
      setLoading(false);
      setError('Cannot connect to backend server. Start it with: cd server && npm run dev');
    }
  }, [backendStatus]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const data = await api.getHistory(token);
      setReviews(data.reviews || []);
      if (data.stats) {
        setStats({ ...data.stats, credits: { ...data.stats.credits, maxCredits: data.stats.credits.maxCredits || 20 } });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      const token = await getToken();
      await api.deleteReview(token, id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({ ...prev, totalReviews: Math.max(0, prev.totalReviews - 1) }));
      setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      showToast('Review deleted', 'success');
    } catch (err: any) {
      showToast('Delete failed: ' + err.message, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${filteredAndSorted.length} filtered reviews? This cannot be undone.`)) return;
    setIsDeletingAll(true);
    try {
      const token = await getToken();
      // Delete in parallel batches of 5 to avoid rate limit
      const batchSize = 5;
      for (let i = 0; i < filteredAndSorted.length; i += batchSize) {
        const batch = filteredAndSorted.slice(i, i + batchSize);
        await Promise.all(batch.map(r => api.deleteReview(token, r.id).catch(() => {})));
      }
      setReviews(prev => prev.filter(r => !filteredAndSorted.some(f => f.id === r.id)));
      setExpandedIds(new Set());
      showToast(`Deleted ${filteredAndSorted.length} reviews`, 'success');
    } catch (err: any) {
      showToast('Delete all failed: ' + err.message, 'error');
    } finally {
      setIsDeletingAll(false);
      fetchHistory();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandedIds.size === filteredAndSorted.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredAndSorted.map(r => r.id)));
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    try {
      localStorage.setItem('codeguard_page', 'landing');
      localStorage.setItem('codeguard_workspace_view', 'editor');
    } catch {}
    onBack();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const getCodePreview = (code: string) => code.split('\n').filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 80);

  // Derived: unique languages for filter
  const availableLangs = useMemo(() => {
    const set = new Set(reviews.map(r => r.language));
    return ['All', ...Array.from(set)];
  }, [reviews]);

  // Filter + Search + Sort
  const filteredAndSorted = useMemo(() => {
    let filtered = reviews.filter(r => {
      const matchesSearch = !searchQuery || r.code.toLowerCase().includes(searchQuery.toLowerCase()) || r.language.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang = filterLang === 'All' || r.language === filterLang;
      return matchesSearch && matchesLang;
    });

    if (sortBy === 'severity') {
      filtered = [...filtered].sort((a, b) => {
        const sevA = getSeverityLevel(a.ai_feedback?.response || null);
        const sevB = getSeverityLevel(b.ai_feedback?.response || null);
        if (sevA !== sevB) return sevA - sevB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortBy === 'score') {
      filtered = [...filtered].sort((a, b) => {
        const sa = getScore(a.ai_feedback?.response || null) ?? 10;
        const sb = getScore(b.ai_feedback?.response || null) ?? 10;
        return sa - sb; // low score (more critical) first
      });
    } else {
      filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [reviews, searchQuery, filterLang, sortBy]);

  // Trend data: last 5 reviews with scores, chronological order
  const trendData = useMemo(() => {
    const withScores = reviews
      .map(r => ({ score: getScore(r.ai_feedback?.response || null), date: r.created_at }))
      .filter((x): x is { score: number; date: string } => x.score !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-5);
    return withScores;
  }, [reviews]);

  const username = user?.email?.split('@')[0] || 'Developer';
  const maxCredits = stats.credits.maxCredits || 20;

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <div className="border-b border-white/[0.04] bg-[#08080C]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-[#666] hover:text-white transition-colors"><ArrowLeft size={18} /></button>
            <div className="w-px h-5 bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <Logo size={13} bgClassName="w-7 h-7 rounded-lg" />
              <span className="font-extrabold text-sm">Code<span className="gold-gradient-text">Guard</span> AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            
            <button onClick={onNewReview} className="btn-gold px-5 py-2 text-[13px] flex items-center gap-2"><Plus size={14} /> New Review</button>
            <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12px] text-[#666] hover:text-red-400"><LogOut size={13} /><span className="hidden sm:inline max-w-[100px] truncate">{user?.email}</span></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Welcome back, <span className="gold-gradient-text">{username}</span></h1>
          <p className="text-[#666] text-[15px]">Here's your code review dashboard — 20 free reviews/day with CodeGuard.</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Code2, label: 'Total Reviews', value: stats.totalReviews, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', border: 'border-[#D4AF37]/20' },
            { icon: AlertTriangle, label: 'Critical Issues Found', value: stats.criticalFound, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { icon: Hash, label: 'Languages Used', value: stats.languagesUsed, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { icon: Shield, label: 'Credits Remaining', value: `${stats.credits.remaining}/${maxCredits}`, color: stats.credits.remaining > 0 ? 'text-green-400' : 'text-red-400', bg: stats.credits.remaining > 0 ? 'bg-green-500/10' : 'bg-red-500/10', border: stats.credits.remaining > 0 ? 'border-green-500/20' : 'border-red-500/20' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className={`glass-card-static p-5 border ${card.border}`}>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}><card.icon size={18} className={card.color} /></div>
              <div className="text-2xl font-black">{card.value}</div>
              <div className="text-[12px] text-[#666] mt-0.5">{card.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trend Chart */}
        {trendData.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static p-5 mb-8 border border-[#D4AF37]/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center"><BarChart3 size={16} className="text-[#D4AF37]" /></div>
              <div>
                <div className="text-[14px] font-bold flex items-center gap-2">Security Score Trend <span className="text-[11px] font-normal text-[#666]">Last {trendData.length} reviews</span></div>
                <div className="text-[11px] text-[#666]">Shows growth, senior-level insight</div>
              </div>
            </div>
            <TrendChart data={trendData} />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button onClick={onNewReview} className="glass-card p-5 flex items-center gap-4 group text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center"><Sparkles size={22} className="text-[#D4AF37]" /></div>
            <div className="flex-1"><div className="text-[15px] font-bold mb-0.5">New Code Review</div><div className="text-[12px] text-[#666]">20/day free</div></div>
            <ChevronRight size={18} className="text-[#333] group-hover:text-[#D4AF37]" />
          </button>
          <div className="glass-card-static p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center"><ShieldCheck size={22} className="text-green-400" /></div>
            <div><div className="text-[15px] font-bold mb-0.5">Top Language</div><div className="text-[12px] text-[#666]">{langLabels[stats.topLanguage] || stats.topLanguage || '—'}</div></div>
          </div>
          <div className="glass-card-static p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center"><Zap size={22} className="text-purple-400" /></div>
            <div><div className="text-[15px] font-bold mb-0.5">Today's Credits</div><div className="text-[12px] text-[#666]">{stats.credits.used} used • {stats.credits.remaining} remaining of {maxCredits}</div></div>
          </div>
        </motion.div>

        {/* Filters + Search + Sort + Bulk actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-static p-4 mb-5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by code snippet or language..." className="w-full bg-[#08080C] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/30" />
            </div>
            <div className="flex gap-2">
              {/* Language Filter */}
              <div className="relative">
                <button onClick={() => { setShowLangFilter(!showLangFilter); setShowSort(false); }} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#08080C] border border-white/[0.06] rounded-xl text-[13px] text-[#888] hover:border-[#D4AF37]/20">
                  <Filter size={13} /> {filterLang === 'All' ? 'All Languages' : langLabels[filterLang] || filterLang} <ChevronRight size={12} className={`transition-transform ${showLangFilter ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {showLangFilter && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute top-full mt-1.5 left-0 w-44 bg-[#0F0F15] border border-white/[0.06] rounded-xl shadow-2xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                      {availableLangs.map(l => (
                        <button key={l} onClick={() => { setFilterLang(l); setShowLangFilter(false); }} className={`w-full text-left px-3.5 py-2 text-[13px] hover:bg-white/[0.03] ${filterLang === l ? 'text-[#D4AF37] bg-[#D4AF37]/[0.04]' : 'text-[#888]'}`}>{l === 'All' ? 'All Languages' : langLabels[l] || l}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Sort */}
              <div className="relative">
                <button onClick={() => { setShowSort(!showSort); setShowLangFilter(false); }} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#08080C] border border-white/[0.06] rounded-xl text-[13px] text-[#888] hover:border-[#D4AF37]/20">
                  <ArrowUpDown size={13} /> {sortBy === 'severity' ? 'Critical First' : sortBy === 'score' ? 'Low Score First' : 'Newest'} <ChevronRight size={12} className={`transition-transform ${showSort ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {showSort && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute top-full mt-1.5 right-0 w-44 bg-[#0F0F15] border border-white/[0.06] rounded-xl shadow-2xl z-20 overflow-hidden">
                      {[
                        { id: 'severity', label: 'Critical First' },
                        { id: 'score', label: 'Low Score First' },
                        { id: 'date', label: 'Newest First' },
                      ].map(o => (
                        <button key={o.id} onClick={() => { setSortBy(o.id as any); setShowSort(false); }} className={`w-full text-left px-3.5 py-2 text-[13px] hover:bg-white/[0.03] ${sortBy === o.id ? 'text-[#D4AF37] bg-[#D4AF37]/[0.04]' : 'text-[#888]'}`}>{o.label}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-2 lg:ml-auto">
              <button onClick={handleExpandAll} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] text-[#666] hover:text-white hover:border-white/[0.1]">
                <ChevronsUpDown size={13} /> {expandedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0 ? 'Collapse All' : 'Expand All'}
              </button>
              <button onClick={handleDeleteAll} disabled={filteredAndSorted.length === 0 || isDeletingAll} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-500/[0.06] border border-red-500/15 rounded-xl text-[13px] text-red-400 hover:bg-red-500/[0.1] disabled:opacity-40">
                {isDeletingAll ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />} Delete All ({filteredAndSorted.length})
              </button>
            </div>
          </div>
          {(searchQuery || filterLang !== 'All') && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#666]">
              <span>Showing {filteredAndSorted.length} of {reviews.length}</span>
              {(searchQuery || filterLang !== 'All') && <button onClick={() => { setSearchQuery(''); setFilterLang('All'); }} className="text-[#D4AF37] hover:underline">Clear filters</button>}
            </div>
          )}
        </motion.div>

        {/* Reviews List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 size={18} className="text-[#D4AF37]" />Review History</h2>
            <span className="text-[12px] text-[#555]">{filteredAndSorted.length} review{filteredAndSorted.length !== 1 ? 's' : ''} • Sorted by {sortBy === 'severity' ? 'Critical First' : sortBy}</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="glass-card-static p-4 rounded-xl animate-pulse">
                  <div className="flex gap-3"><div className="w-12 h-6 bg-white/[0.06] rounded" /><div className="flex-1 h-4 bg-white/[0.04] rounded" /><div className="w-16 h-4 bg-white/[0.04] rounded" /></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="glass-card-static p-8 text-center"><AlertTriangle size={24} className="text-red-400 mx-auto mb-3" /><p className="text-[#888] text-sm mb-2">{error}</p><button onClick={fetchHistory} className="btn-outline-gold px-4 py-2 text-sm">Retry</button></div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="glass-card-static p-8 md:p-12 text-center overflow-hidden relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D4AF37]/[0.04] rounded-full blur-[60px] pointer-events-none" />
              <div className="relative z-10">
                {reviews.length === 0 ? (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }} className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#D4AF37]/20 to-[#A68B2A]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#D4AF37]/10">
                      <Shield size={32} className="text-[#D4AF37]" />
                    </motion.div>
                    <h3 className="text-xl font-black tracking-tight mb-2">No Reviews Yet</h3>
                    <p className="text-[#777] text-[14px] mb-8 max-w-md mx-auto leading-relaxed">Start your first AI review with CodeGuard. 20 free reviews per day. Or try a vulnerable sample to see how it works.</p>
                    
                    {/* Illustration - sample vulnerable code */}
                    <div className="max-w-[520px] mx-auto mb-8 grid md:grid-cols-[1.1fr_0.9fr] gap-3 text-left">
                      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3">
                        <div className="flex items-center gap-1.5 mb-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" /><span className="text-[10px] font-bold tracking-wider text-red-400">VULNERABLE SAMPLE</span><span className="ml-auto text-[10px] text-[#555]">auth.js:22</span></div>
                        <div className="font-mono text-[11px] leading-6 text-[#999]">
                          <span className="text-[#666]">const query =</span> <span className="text-[#CE9178]">`SELECT * WHERE id = '${'{'}user{'}'}'`</span>
                        </div>
                        <div className="mt-2 flex gap-1.5"><span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/15 text-[9px] text-red-400 font-bold">SQLi • Critical</span><span className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/15 text-[9px] text-orange-400">Line 22</span></div>
                      </div>
                      <div className="rounded-xl border border-[#27C93F]/15 bg-[#27C93F]/[0.03] p-3">
                        <div className="flex items-center gap-1.5 mb-2"><div className="w-1.5 h-1.5 bg-[#27C93F] rounded-full" /><span className="text-[10px] font-bold tracking-wider text-[#27C93F]">FIXED BY CODEGUARD</span></div>
                        <div className="font-mono text-[11px] leading-6 text-[#999]">
                          <span className="text-[#777]">db.query(</span><span className="text-[#CE9178]">"SELECT * WHERE id = ?"</span><span className="text-[#777]">, [id])</span> <span className="text-[#6A9955]">// ✅ safe</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#27C93F]"><Check size={10} className="text-[#27C93F]" /><span>Score 98/100 • Secure</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button onClick={onNewReview} className="btn-gold px-6 py-3 text-sm inline-flex items-center justify-center gap-2 rounded-xl"><Plus size={15} /> Start Your First Review — 20/day Free</button>
                      <button onClick={() => { try { localStorage.setItem('codeguard_sample_to_load', 'javascript'); } catch {} onNewReview(); }} className="btn-outline-gold px-6 py-3 text-sm inline-flex items-center justify-center gap-2 rounded-xl"><Code2 size={15} /> Load Sample Vulnerable Code</button>
                    </div>
                    <p className="text-[11px] text-[#444] mt-4 flex items-center justify-center gap-2"><Zap size={11} className="text-[#D4AF37]" /> CodeGuard • 0.8s avg • Ghost Mode available • No credit card</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5"><Search size={28} className="text-[#555]" /></div>
                    <h3 className="text-lg font-bold mb-2">No matches</h3>
                    <p className="text-[#666] text-sm mb-6 max-w-sm mx-auto">{`No reviews match "${searchQuery}" in ${filterLang}. Try clearing filters.`}</p>
                    <button onClick={() => { setSearchQuery(''); setFilterLang('All'); }} className="btn-outline-gold px-5 py-2.5 text-sm">Clear Filters</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredAndSorted.map((review, i) => {
                  const score = getScore(review.ai_feedback?.response || null);
                  const sevLevel = getSeverityLevel(review.ai_feedback?.response || null);
                  const sev = getSeverityLabel(sevLevel);
                  const isExpanded = expandedIds.has(review.id);
                  return (
                    <motion.div key={review.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, delay: i * 0.02 }} className="glass-card-static overflow-hidden border border-white/[0.04] hover:border-[#D4AF37]/10 transition-colors">
                      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01]" onClick={() => toggleExpand(review.id)}>
                        <div className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono ${langColors[review.language] || 'bg-white/5 text-[#888] border-white/10'}`}>{langLabels[review.language] || review.language}</div>
                        <div className={`hidden md:flex shrink-0 px-2 py-1 rounded-full border text-[10px] font-bold ${sev.bg} ${sev.color}`}>{sev.label}</div>
                        <div className="flex-1 min-w-0 hidden sm:block"><code className="text-[12px] text-[#555] font-mono truncate block">{getCodePreview(review.code)}</code></div>
                        {score !== null && <div className={`text-sm font-bold ${score <= 3 ? 'text-red-400' : score <= 6 ? 'text-yellow-400' : 'text-green-400'} shrink-0`}>{score}/10</div>}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#555] shrink-0"><Calendar size={11} />{formatDate(review.created_at)}</div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); onViewReview(review); }} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#555] hover:text-[#D4AF37]"><ExternalLink size={13} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(review.id); }} disabled={deleteId === review.id} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#555] hover:text-red-400 disabled:opacity-40">{deleteId === review.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}</button>
                          <ChevronRight size={14} className={`text-[#444] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="px-5 pb-5 pt-2 border-t border-white/[0.04]">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Code</span><button onClick={() => copyCode(review.code, review.id)} className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#D4AF37]">{copiedId === review.id ? <><Check size={11} className="text-green-400" /> Copied</> : <><Copy size={11} /> Copy</>}</button></div>
                                  <pre className="bg-[#08080C] border border-white/[0.04] rounded-xl p-4 font-mono text-[12px] text-[#888] max-h-[200px] overflow-auto whitespace-pre-wrap leading-relaxed">{review.code}</pre>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2"><span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">AI Analysis</span>{score !== null && <span className={`text-[11px] font-bold ${score <= 3 ? 'text-red-400' : score <= 6 ? 'text-yellow-400' : 'text-green-400'}`}>Score: {score}/10 • {sev.label}</span>}</div>
                                  <div className="bg-[#08080C] border border-white/[0.04] rounded-xl p-4 text-[12px] text-[#888] max-h-[200px] overflow-auto leading-relaxed whitespace-pre-wrap">{review.ai_feedback?.response?.slice(0, 800) || 'No feedback'}...</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
