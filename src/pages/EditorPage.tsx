import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor, { DiffEditor } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Shield, Send, Eye, EyeOff, ChevronDown, AlertTriangle,
  CheckCircle, MessageSquare, FileCode, Sparkles, ArrowLeft,
  Loader2, Bot, User, Trash2, RotateCcw, X, Zap,
  ShieldCheck, Bug, Gauge, Lightbulb, Code2, Copy, Check,
  AlertCircle, GitCompare, Wand2, Keyboard, Type, FileText
} from 'lucide-react';
import { sampleCodes, languageOptions } from '../data/sampleCodes';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../lib/api';
import type { HistoryReview } from '../lib/api';
import OnboardingTour from '../components/OnboardingTour';
import Logo from '../components/Logo';

interface EditorPageProps {
  onBack?: () => void;
  initialReview?: HistoryReview | null;
  onReviewComplete?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/* ---------- Helpers ---------- */
function detectLanguage(code: string): string | null {
  const c = code.trim();
  if (c.length < 20) return null;
  if (/^\s*package\s+\w+/m.test(c) && /func\s+\w+\s*\(/.test(c)) return 'go';
  if (/#include\s*<.*>/.test(c) && /std::|cout\s*<</.test(c)) return 'cpp';
  if (/public\s+class\s+\w+/.test(c) && /System\.out/.test(c)) return 'java';
  if (/fn\s+\w+\s*\(.*\)/.test(c) && /println!/.test(c)) return 'rust';
  if (/using\s+System;|namespace\s+\w+|Console\.Write/.test(c)) return 'csharp';
  if (/<\?php/.test(c)) return 'php';
  if (/^\s*def\s+\w+\s*\(/.test(c) && /:\s*$/.test(c.split('\n')[0]) || /if\s+__name__\s*==/.test(c)) {
    // python looks like def + colon
    if (!/function\s+\w+\s*\(/.test(c) || /print\(.*\)/.test(c)) return 'python';
  }
  if (/\binterface\s+\w+\s*{/.test(c) || /:\s*string\s*[=;{}]/.test(c)) return 'typescript';
  if (/console\.log|=>/.test(c) && /const|let|function/.test(c)) return 'javascript';
  if (/puts\s+|^\s*def\s+\w+/.test(c) && /\bend\b/.test(c)) return 'ruby';
  if (/<\?php/.test(c) || (/\$\w+\s*=/.test(c) && /echo/.test(c))) return 'php';
  return null;
}

function extractFixedCode(md: string): string | null {
  if (!md) return null;
  const fixedSection = md.split(/##.*Fixed Code/i)[1] || md;
  const match = fixedSection.match(/```(?:\w+)?\n([\s\S]*?)```/);
  if (match && match[1].trim().length > 20) return match[1].trim();
  const all = [...md.matchAll(/```(?:\w+)?\n([\s\S]*?)```/g)];
  if (!all.length) return null;
  let longest = all[0][1];
  for (const m of all) if (m[1].length > longest.length) longest = m[1];
  return longest.trim().length > 20 ? longest.trim() : null;
}

type ParsedIssue = { line: number; message: string; severity: 'error' | 'warning' | 'info' };

function parseIssues(review: string): ParsedIssue[] {
  if (!review) return [];
  const issues: ParsedIssue[] = [];
  const lines = review.split('\n');
  let currentSeverity: 'error' | 'warning' | 'info' = 'warning';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('🔴')) currentSeverity = 'error';
    else if (line.includes('🟡') || line.includes('🟠')) currentSeverity = 'warning';
    else if (line.includes('🟢')) currentSeverity = 'info';

    // Patterns like "Where: line 23" or "Line 23" or "auth.js:22"
    const m1 = line.match(/(?:Where|line|Line)\s*[:\-]?\s*(\d+)/i);
    const m2 = line.match(/\.js:(\d+)|\.py:(\d+)|\.java:(\d+)|\.cpp:(\d+)/);
    const numStr = m1?.[1] || m2?.[1] || m2?.[2] || m2?.[3] || m2?.[4];
    if (numStr) {
      const num = parseInt(numStr);
      if (!isNaN(num) && num > 0 && num < 5000) {
        let msg = line.replace(/.*(?:Where|line|Line)\s*[:\-]?\s*\d+/i, '').trim().replace(/^[-:]\s*/, '').slice(0, 120);
        if (msg.length < 8) msg = lines[i + 1]?.slice(0, 120) || `Issue at line ${num}`;
        issues.push({ line: num, message: msg, severity: currentSeverity });
      }
    }
  }
  // Deduplicate by line, keep error priority
  const map = new Map<number, ParsedIssue>();
  for (const iss of issues) {
    const existing = map.get(iss.line);
    if (!existing || (existing.severity !== 'error' && iss.severity === 'error')) {
      map.set(iss.line, iss);
    }
  }
  return Array.from(map.values()).slice(0, 20);
}

export default function EditorPage({ onBack, initialReview, onReviewComplete }: EditorPageProps) {
  const { user } = useAuth();
  const [code, setCode] = useState(initialReview?.code || '// Paste your code here or select a sample below...\n');
  const [language, setLanguage] = useState(initialReview?.language || 'javascript');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<string | null>(initialReview?.ai_feedback?.response || null);
  const [reviewId, setReviewId] = useState<string | null>(initialReview?.id || null);
  const [activeTab, setActiveTab] = useState<'review' | 'chat'>('review');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ghostMode, setGhostMode] = useState(false);
  const [credits, setCredits] = useState({ used: 0, remaining: 20, maxCredits: 20 });
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(!!initialReview?.ai_feedback?.response);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const [error, setError] = useState('');

  // New states for requested features
  const [fixedCode, setFixedCode] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [autoDetected, setAutoDetected] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const lastManualLangChange = useRef<number>(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialReview) {
      setCode(initialReview.code);
      setLanguage(initialReview.language);
      setReviewResult(initialReview.ai_feedback?.response || null);
      setReviewId(initialReview.id || null);
      setHasReviewed(!!initialReview.ai_feedback?.response);
      setChatMessages([]);
      setError('');
      return;
    }
    // Check if dashboard requested to load a sample
    try {
      const sampleToLoad = localStorage.getItem('codeguard_sample_to_load');
      if (sampleToLoad) {
        const sample = sampleCodes.find(s => s.value === sampleToLoad) || sampleCodes[0];
        setCode(sample.code);
        setLanguage(sample.value);
        localStorage.removeItem('codeguard_sample_to_load');
        setReviewResult(null);
        setReviewId(null);
        setHasReviewed(false);
        setChatMessages([]);
        setError('');
        return;
      }
    } catch {}
    setCode('// Paste your code here or select a sample below...\n');
    setLanguage('javascript');
    setReviewResult(null);
    setReviewId(null);
    setHasReviewed(false);
    setChatMessages([]);
    setError('');
  }, [initialReview]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const sampleDropdownRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;

  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

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

  const maxCredits = credits.maxCredits || 20;

  const fetchCredits = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.getCredits(token);
      setCredits({ used: data.used, remaining: data.remaining, maxCredits: data.maxCredits || 20 });
    } catch { /* silent */ }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) setShowLangDropdown(false);
      if (sampleDropdownRef.current && !sampleDropdownRef.current.contains(e.target as Node)) setShowSampleDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract fixed code when review changes
  useEffect(() => {
    if (reviewResult) {
      const fc = extractFixedCode(reviewResult);
      setFixedCode(fc);
    } else {
      setFixedCode(null);
      setShowDiff(false);
    }
  }, [reviewResult]);

  // Inline squiggles - parse issues and set markers
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) return;
    if (!reviewResult) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'codeguard', []);
      return;
    }
    const issues = parseIssues(reviewResult);
    if (issues.length === 0) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'codeguard', []);
      return;
    }
    const markers = issues.map(iss => ({
      startLineNumber: iss.line,
      endLineNumber: iss.line,
      startColumn: 1,
      endColumn: 1000,
      message: iss.message,
      severity: iss.severity === 'error' ? monacoRef.current.MarkerSeverity.Error : iss.severity === 'warning' ? monacoRef.current.MarkerSeverity.Warning : monacoRef.current.MarkerSeverity.Info,
    }));
    monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'codeguard', markers);
  }, [reviewResult]);

  // Keyboard shortcuts: Ctrl+Enter to Review, Esc to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isReviewing) handleReview();
      }
      if (e.key === 'Escape') {
        if (showDiff) {
          setShowDiff(false);
        } else if (hasReviewed && !isInput) {
          // Optional: clear only if not typing in chat
          // clearAll();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isReviewing, hasReviewed, showDiff, code, language, ghostMode]);

  // Language auto-detect with debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // @ts-ignore
    debounceRef.current = window.setTimeout(() => {
      // Don't auto-detect if user manually changed language recently (5s)
      if (Date.now() - lastManualLangChange.current < 5000) return;
      if (code.length < 50 || code.includes('Paste your code here')) {
        setAutoDetected(null);
        return;
      }
      const detected = detectLanguage(code);
      if (detected && detected !== language) {
        setAutoDetected(detected);
        // Auto-switch if high confidence and code is substantial
        if (code.length > 120) {
          setLanguage(detected);
          setAutoDetected(null);
        }
      } else {
        setAutoDetected(null);
      }
    }, 800);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [code, language]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const handleReview = useCallback(async () => {
    if (!code.trim() || code.trim() === '// Paste your code here or select a sample below...') return;
    setError('');
    setIsReviewing(true);
    setActiveTab('review');
    setReviewResult(null);
    setReviewId(null);
    setFixedCode(null);
    setShowDiff(false);
    setHasReviewed(true);
    try {
      const token = await getToken();
      const effectiveGhost = ghostMode || !isLoggedIn;
      const data = await api.review(token, code, language, effectiveGhost);
      setReviewResult(data.response);
      setReviewId(data.reviewId);
      if (data.credits) setCredits({ used: data.credits.used, remaining: data.credits.remaining, maxCredits: data.credits.maxCredits || 20 });
      if (!effectiveGhost && onReviewComplete) onReviewComplete();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setError(`Daily limit reached (${maxCredits}/day). Enable Ghost Mode for unlimited reviews.`);
      } else {
        setError(err.message || 'Analysis failed. Is the backend running? Check server logs.');
      }
      setHasReviewed(false);
    } finally {
      setIsReviewing(false);
    }
  }, [code, ghostMode, language, getToken, isLoggedIn, maxCredits, onReviewComplete]);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const currentInput = chatInput.trim();
    const userMessage: ChatMessage = { role: 'user', content: currentInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setError('');
    try {
      const token = await getToken();
      const effectiveGhost = ghostMode || !isLoggedIn;
      const data = await api.chat(token, currentInput, {
        reviewId,
        code,
        language,
        reviewResponse: reviewResult || undefined,
        ghostMode: effectiveGhost,
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }]);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Cannot connect')) setError('Cannot reach backend. Make sure server is running: cd server && npm run dev');
      else if (msg.includes('busy') || msg.includes('429')) setError('AI is busy. Wait 20 seconds and try again.');
      else if (msg.includes('No code context')) setError('Review your code first before chatting.');
      else setError(msg || 'Chat failed. Please try again.');
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, reviewId, code, language, reviewResult, ghostMode, getToken, isLoggedIn]);

  const loadSampleCode = (sample: typeof sampleCodes[0]) => {
    setCode(sample.code);
    setLanguage(sample.value);
    lastManualLangChange.current = Date.now();
    setShowSampleDropdown(false);
    setReviewResult(null);
    setChatMessages([]);
    setHasReviewed(false);
    setReviewId(null);
    setFixedCode(null);
    setShowDiff(false);
    setError('');
  };

  const clearAll = () => {
    setCode('// Paste your code here or select a sample below...\n');
    setReviewResult(null);
    setChatMessages([]);
    setHasReviewed(false);
    setReviewId(null);
    setFixedCode(null);
    setShowDiff(false);
    setActiveTab('review');
    setError('');
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'codeguard', []);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const applyFix = () => {
    if (!fixedCode) return;
    setCode(fixedCode);
    setShowDiff(false);
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'codeguard', []);
    }
  };

  const fileExt: Record<string, string> = {
    javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', typescript: 'ts',
    rust: 'rs', go: 'go', csharp: 'cs', php: 'php', ruby: 'rb',
  };

  const charCount = code.length;
  const lineCount = code.split('\n').length;
  const percent = Math.min(100, (charCount / 50000) * 100);
  const charColor = percent > 95 ? 'text-red-400' : percent > 80 ? 'text-yellow-400' : 'text-[#666]';

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Add Ctrl+Enter shortcut directly to Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleReview();
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-white overflow-hidden">
      <OnboardingTour />
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-[#08080C] border-b border-white/[0.04] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 md:hidden" />
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#666] hover:text-white transition-colors text-[13px] font-medium">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">{isLoggedIn ? 'Dashboard' : 'Home'}</span>
          </button>
          <div className="hidden md:flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-[#555]">
            <Keyboard size={12} /> <span>Ctrl+Enter Review</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={langDropdownRef}>
            <button onClick={() => { setShowLangDropdown(!showLangDropdown); setShowSampleDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] hover:border-[#D4AF37]/20 transition-all">
              <Code2 size={13} className="text-[#D4AF37]" />
              <span className="hidden sm:inline">{languageOptions.find(l => l.value === language)?.label}</span>
              <ChevronDown size={11} className={`text-[#555] transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showLangDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1.5 left-0 w-44 bg-[#0F0F15] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-60 overflow-y-auto">
                  {languageOptions.map(lang => (
                    <button key={lang.value} onClick={() => { setLanguage(lang.value); lastManualLangChange.current = Date.now(); setShowLangDropdown(false); setAutoDetected(null); }}
                      className={`w-full px-3.5 py-2 text-[13px] text-left hover:bg-white/[0.03] transition-colors ${language === lang.value ? 'text-[#D4AF37] bg-[#D4AF37]/[0.04]' : 'text-[#888]'}`}>
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative" ref={sampleDropdownRef}>
            <button onClick={() => { setShowSampleDropdown(!showSampleDropdown); setShowLangDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] hover:border-[#D4AF37]/20 transition-all">
              <Sparkles size={13} className="text-[#D4AF37]" />
              <span className="hidden sm:inline">Samples</span>
              <ChevronDown size={11} className={`text-[#555] transition-transform ${showSampleDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSampleDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1.5 right-0 w-60 bg-[#0F0F15] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  <div className="px-3.5 py-2.5 border-b border-white/[0.04]">
                    <p className="text-[11px] text-[#555] font-semibold tracking-wider uppercase">Load Buggy Sample Code</p>
                  </div>
                  {sampleCodes.map(sample => (
                    <button key={sample.value} onClick={() => loadSampleCode(sample)}
                      className="w-full px-3.5 py-3 text-[13px] text-left hover:bg-white/[0.03] transition-colors text-[#888] hover:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/[0.08] flex items-center justify-center shrink-0">
                        <AlertTriangle size={14} className="text-red-400" />
                      </div>
                      <div>
                        <div className="font-medium">{sample.language}</div>
                        <div className="text-[11px] text-[#555]">Critical vulnerabilities</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {isLoggedIn && (
            <button onClick={() => setGhostMode(!ghostMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                ghostMode ? 'bg-[#D4AF37]/[0.08] border border-[#D4AF37]/25 text-[#D4AF37]' : 'bg-white/[0.03] border border-white/[0.06] text-[#666] hover:text-white'
              }`} title="Ghost Mode: Code won't be saved">
              {ghostMode ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="hidden md:inline">{ghostMode ? 'Ghost ON' : 'Ghost'}</span>
            </button>
          )}
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12px]">
              <Shield size={12} className={credits.remaining > 0 ? 'text-[#D4AF37]' : 'text-red-400'} />
              <span className={credits.remaining > 0 ? 'text-[#888]' : 'text-red-400 font-medium'}>{credits.remaining}/{maxCredits}</span>
            </div>
          )}
          {!isLoggedIn && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/[0.06] border border-[#D4AF37]/15 rounded-xl text-[12px] text-[#D4AF37]">
              <EyeOff size={12} /> Free Mode
            </div>
          )}
          {fixedCode && (
            <>
              <button onClick={() => setShowDiff(!showDiff)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${showDiff ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/[0.03] border-white/[0.06] text-[#888] hover:text-white'}`}>
                <GitCompare size={13} /> {showDiff ? 'Hide Diff' : 'Diff'}
              </button>
              <button onClick={applyFix} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#27C93F]/10 border border-[#27C93F]/20 text-[#27C93F] hover:bg-[#27C93F]/20 transition-all">
                <Wand2 size={13} /> Apply Fix
              </button>
            </>
          )}
          {hasReviewed && (
            <button onClick={clearAll} className="p-1.5 text-[#444] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/[0.05]" title="Clear all (Esc)">
              <Trash2 size={15} />
            </button>
          )}
          <button onClick={handleReview} disabled={isReviewing || (isLoggedIn && credits.remaining <= 0 && !ghostMode)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${
              isReviewing || (isLoggedIn && credits.remaining <= 0 && !ghostMode) ? 'bg-white/[0.04] text-[#444] cursor-not-allowed' : 'btn-gold'
            }`} title="Ctrl+Enter">
            {isReviewing ? (
              <><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">Analyzing...</span></>
            ) : (isLoggedIn && credits.remaining <= 0 && !ghostMode) ? (
              <><X size={14} /><span className="hidden sm:inline">No Credits</span></>
            ) : (
              <><Sparkles size={14} /><span className="hidden sm:inline">Review Code</span></>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-500/[0.06] border-b border-red-500/15 px-5 py-2.5 flex items-center gap-2 text-[13px] text-red-400 overflow-hidden">
            <AlertCircle size={14} /><span className="flex-1">{error}</span><button onClick={() => setError('')} className="text-red-400/50 hover:text-red-400"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {autoDetected && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#D4AF37]/[0.06] border-b border-[#D4AF37]/15 px-5 py-2 flex items-center gap-2 text-[12px] text-[#D4AF37] overflow-hidden">
            <Type size={13} /><span className="flex-1">Detected <strong>{languageOptions.find(l => l.value === autoDetected)?.label}</strong>. Switched automatically.</span>
            <button onClick={() => setAutoDetected(null)} className="text-[#D4AF37]/50 hover:text-[#D4AF37]"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left: Editor + Diff */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-white/[0.04]" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0A0A0F] border-b border-white/[0.04] shrink-0">
            <div className="flex items-center gap-2.5 text-[11px] text-[#444]">
              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#FF5F56]" /><div className="w-2 h-2 rounded-full bg-[#FFBD2E]" /><div className="w-2 h-2 rounded-full bg-[#27C93F]" /></div>
              <FileCode size={11} />
              <span className="font-mono">{showDiff ? `diff: ${fileExt[language] || 'txt'} ↔ fixed` : `code-review.${fileExt[language] || 'txt'}`}</span>
              {reviewResult && !showDiff && <span className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/15 text-[10px] text-red-400"><Bug size={10} />{parseIssues(reviewResult).length} issues in editor</span>}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#444]">
              {ghostMode && <span className="flex items-center gap-1 text-[#D4AF37]"><EyeOff size={10} /> Ghost</span>}
              <span className="font-mono hidden sm:inline">{lineCount} lines</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {showDiff && fixedCode ? (
              <DiffEditor
                height="100%"
                language={language}
                original={code}
                modified={fixedCode}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  renderSideBySide: true,
                }}
              />
            ) : (
              <Editor
                height="100%"
                language={language}
                value={code}
                theme="vs-dark"
                onMount={handleEditorMount}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false }, fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineNumbers: 'on', scrollBeyondLastLine: false,
                  automaticLayout: true, tabSize: 2, wordWrap: 'on',
                  padding: { top: 16, bottom: 48 }, quickSuggestions: false,
                  renderLineHighlight: 'line',
                  scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                  overviewRulerBorder: false, hideCursorInOverviewRuler: true,
                  glyphMargin: true,
                }}
              />
            )}
          </div>

          {/* Character count + limit bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0A0A0F] border-t border-white/[0.04] shrink-0">
            <div className="flex items-center gap-4 text-[11px]">
              <span className={`flex items-center gap-1.5 ${charColor}`}>
                <FileText size={11} />
                {charCount.toLocaleString()} / 50,000 chars
              </span>
              <span className="text-[#444] hidden sm:inline">{lineCount} lines</span>
              <span className="text-[#444] hidden md:inline flex items-center gap-1"><Keyboard size={10} /> Ctrl+Enter to Review</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 sm:w-32 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, percent)}%` }} className={`h-full rounded-full transition-colors ${percent > 95 ? 'bg-red-400' : percent > 80 ? 'bg-yellow-400' : 'bg-[#D4AF37]'}`} />
              </div>
              <span className={`text-[11px] font-mono w-8 text-right ${charColor}`}>{percent.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Right: Review/Chat */}
        <div className="w-full md:w-[480px] lg:w-[540px] flex flex-col bg-[#050508] shrink-0 min-h-0">
          <div className="flex items-center border-b border-white/[0.04] shrink-0">
            {(['review', 'chat'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-[13px] font-semibold transition-all relative ${activeTab === tab ? 'text-[#D4AF37]' : 'text-[#444] hover:text-[#888]'}`}>
                {tab === 'review' ? <Shield size={14} /> : <MessageSquare size={14} />}
                {tab === 'review' ? 'Review' : 'Chat'}
                {tab === 'chat' && chatMessages.length > 0 && <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#0A0A0A] text-[10px] font-black flex items-center justify-center">{chatMessages.length}</span>}
                {activeTab === tab && <motion.div layoutId="editor-tab" className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#D4AF37] rounded-full" />}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'review' ? (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                  {isReviewing ? <LoadingStateSkeleton /> : reviewResult ? (
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.04]">
                        <Logo size={16} bgClassName="w-9 h-9 rounded-xl" />
                        <div><div className="text-[14px] font-bold text-[#D4AF37]">CodeGuard AI</div><div className="text-[11px] text-[#555]">Found {parseIssues(reviewResult).length} issues inline • Click to jump</div></div>
                        {fixedCode && <div className="ml-auto flex gap-2"><button onClick={() => setShowDiff(!showDiff)} className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] hover:border-[#D4AF37]/20 flex items-center gap-1"><GitCompare size={11} />{showDiff ? 'Editor' : 'Diff'}</button><button onClick={applyFix} className="px-3 py-1.5 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/20 text-[11px] text-[#27C93F] flex items-center gap-1"><Wand2 size={11} />Apply Fix</button></div>}
                      </div>
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          pre: ({ children, ...props }) => {
                            const getText = (node: any): string => {
                              if (!node) return '';
                              if (typeof node === 'string') return node;
                              if (Array.isArray(node)) return node.map(getText).join('');
                              if (node?.props?.children) return getText(node.props.children);
                              return '';
                            };
                            const text = getText(children);
                            return <div className="relative group"><pre {...props}>{children}</pre><button onClick={() => copyToClipboard(text, text.slice(0, 30))} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#555] hover:text-white opacity-0 group-hover:opacity-100 transition-all">{copiedBlock === text.slice(0, 30) ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}</button></div>;
                          },
                          li: ({ children, ...props }) => {
                            return <li {...props} style={{ whiteSpace: 'pre-line' }}>{children}</li>;
                          }
                        }}>{reviewResult}</ReactMarkdown>
                      </div>
                    </div>
                  ) : <EmptyState />}
                </motion.div>
              ) : (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                  {chatMessages.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-[#0A0A0F]/50 shrink-0">
                      <span className="text-[11px] text-[#555]">{chatMessages.length} messages</span>
                      <button onClick={clearChat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-[#666] hover:text-red-400 hover:border-red-400/20 transition-all">
                        <Trash2 size={11} /> Clear chat
                      </button>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4"><Bot size={26} className="text-[#D4AF37]" /></div>
                        <h3 className="text-[15px] font-bold text-white mb-1.5">AI Chat Assistant</h3>
                        <p className="text-[13px] text-[#555] max-w-xs mx-auto mb-6">{hasReviewed ? "Issues are highlighted inline. Ask me about any line!" : "Review your code first, then chat."}</p>
                      </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shrink-0 mt-0.5"><Bot size={13} className="text-[#0A0A0A]" /></div>}
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-[#D4AF37]/[0.08] border border-[#D4AF37]/15' : 'bg-white/[0.02] border border-white/[0.05]'}`}>
                          {msg.role === 'assistant' ? <div className="markdown-content text-[13px]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div> : <p className="text-[13px] text-[#E0E0E0]">{msg.content}</p>}
                        </div>
                        {msg.role === 'user' && <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5"><User size={13} className="text-[#666]" /></div>}
                      </motion.div>
                    ))}
                    {isChatLoading && <div className="flex gap-2.5"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shrink-0"><Bot size={13} className="text-[#0A0A0A]" /></div><div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 py-3"><div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 animate-bounce" /><div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 border-t border-white/[0.04] shrink-0">
                    <div className="flex items-center gap-2">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder={hasReviewed ? "Ask about inline issues..." : "Review first..."} disabled={!hasReviewed} className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#D4AF37]/25 transition-colors disabled:opacity-30" />
                      <button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatLoading || !hasReviewed} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${chatInput.trim() && !isChatLoading && hasReviewed ? 'bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20' : 'bg-white/[0.03] text-[#333]'}`}><Send size={16} /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingStateSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-2 w-48 bg-white/[0.04] rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="glass-card-static p-4 rounded-xl space-y-3">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-white/[0.06] rounded animate-pulse" />
                <div className="h-2 w-full bg-white/[0.04] rounded animate-pulse" />
                <div className="h-2 w-5/6 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-20 bg-[#08080C] rounded-xl border border-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 text-[12px] text-[#555] mt-4">
        <Loader2 size={12} className="animate-spin" /> CodeGuard analyzing... 20/day free
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/10 flex items-center justify-center mb-6"><ShieldCheck size={28} className="text-[#D4AF37]" /></div>
      <h3 className="text-lg font-bold mb-2">Ready to Review</h3>
      <p className="text-[13px] text-[#555] text-center max-w-xs mb-6">Paste code, press <span className="text-[#D4AF37] font-mono text-xs bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">Ctrl+Enter</span>. Inline squiggles will show issues.</p>
      <div className="space-y-2 w-full max-w-xs">
        {[
          { step: '1', text: 'Paste code - auto-detects language', icon: Type },
          { step: '2', text: 'Ctrl+Enter to review - see squiggles', icon: Bug },
          { step: '3', text: 'Diff + Apply Fix in one click', icon: GitCompare },
        ].map(item => (
          <div key={item.step} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/[0.06] flex items-center justify-center text-[12px] font-black text-[#D4AF37]">{item.step}</div>
            <span className="text-[13px] text-[#777]">{item.text}</span>
            <item.icon size={14} className="text-[#333] ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
