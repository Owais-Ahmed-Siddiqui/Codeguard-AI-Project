import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Workspace from './pages/Workspace';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import ErrorBoundary from './components/ErrorBoundary';
import Logo from './components/Logo';
import { Loader2 } from 'lucide-react';

type Page = 'landing' | 'auth' | 'workspace' | 'notfound' | 'profile';

const STORAGE_KEY = 'codeguard_page';
const WORKSPACE_VIEW_KEY = 'codeguard_workspace_view';

function getPageFromUrl(): Page | null {
  try {
    const path = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
    if (!path) return 'landing';
    if (['landing', 'auth', 'workspace', 'profile'].includes(path)) return path as Page;
    if (path.length > 0) return 'notfound';
  } catch {}
  return null;
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const urlPage = getPageFromUrl();
    if (urlPage) {
      if (urlPage === 'notfound') return 'notfound';
      return urlPage;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Page | null;
      if (saved && ['landing', 'auth', 'workspace', 'profile'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'landing';
  });

  const [initialWorkspaceView, setInitialWorkspaceView] = useState<'editor' | 'dashboard'>(() => {
    try {
      const v = localStorage.getItem(WORKSPACE_VIEW_KEY) as 'editor' | 'dashboard' | null;
      if (v === 'dashboard' || v === 'editor') return v;
    } catch {}
    return 'editor';
  });

  const { user, loading } = useAuth();
  const isFirstRender = useRef(true);

  useEffect(() => {
    try {
      if (currentPage !== 'notfound') {
        localStorage.setItem(STORAGE_KEY, currentPage);
      }
    } catch {}
  }, [currentPage]);

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_VIEW_KEY, initialWorkspaceView);
    } catch {}
  }, [initialWorkspaceView]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      try {
        const url = currentPage === 'landing' ? '/' : `/${currentPage}`;
        window.history.replaceState({ page: currentPage }, '', url);
      } catch {}
      return;
    }
    try {
      const url = currentPage === 'landing' ? '/' : `/${currentPage}`;
      if (window.location.pathname !== url) {
        window.history.pushState({ page: currentPage }, '', url);
      }
    } catch {}
  }, [currentPage]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      try {
        const statePage = (e.state as any)?.page as Page | undefined;
        if (statePage && ['landing', 'auth', 'workspace', 'notfound', 'profile'].includes(statePage)) {
          setCurrentPage(statePage);
          return;
        }
        const urlPage = getPageFromUrl();
        if (urlPage) setCurrentPage(urlPage);
        else setCurrentPage('landing');
      } catch {
        setCurrentPage('landing');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!loading && user && currentPage === 'auth') {
      setCurrentPage('workspace');
      setInitialWorkspaceView('dashboard');
    }
  }, [user, loading, currentPage]);

  const handleGetStarted = () => {
    setInitialWorkspaceView('editor');
    setCurrentPage('workspace');
  };

  const handleSignIn = () => {
    if (user) {
      setInitialWorkspaceView('dashboard');
      setCurrentPage('workspace');
    } else {
      setCurrentPage('auth');
    }
  };

  const handleDashboard = () => {
    setInitialWorkspaceView('dashboard');
    setCurrentPage('workspace');
  };

  const handleAuthSuccess = () => {
    setInitialWorkspaceView('dashboard');
    setCurrentPage('workspace');
  };

  const handleHome = () => setCurrentPage('landing');
  const handleProfile = () => setCurrentPage('profile');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <Logo size={24} bgClassName="w-14 h-14 rounded-2xl" />
          <div className="flex items-center gap-2 text-[#666]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading your session...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {currentPage === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <LandingPage onGetStarted={handleGetStarted} onSignIn={handleSignIn} onDashboard={handleDashboard} user={user} />
          </motion.div>
        )}
        {currentPage === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <AuthPage onBack={handleHome} onSuccess={handleAuthSuccess} />
          </motion.div>
        )}
        {currentPage === 'workspace' && (
          <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-screen overflow-hidden">
            <Workspace onAuth={() => setCurrentPage('auth')} onHome={handleHome} onProfile={handleProfile} initialView={initialWorkspaceView} />
          </motion.div>
        )}
        {currentPage === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ProfilePage onBack={handleDashboard} onHome={handleHome} />
          </motion.div>
        )}
        {currentPage === 'notfound' && (
          <motion.div key="notfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <NotFoundPage onHome={handleHome} onBack={() => window.history.back()} />
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
