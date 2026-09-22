import React from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import Logo from './Logo';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    try {
      localStorage.removeItem('codeguard_page');
    } catch {}
    window.location.href = '/';
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37]/[0.04] rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative glass-card-static p-8 max-w-md w-full text-center rounded-[24px] border border-white/[0.06]">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h2 className="text-xl font-black tracking-tight mb-2">Something went wrong</h2>
            <p className="text-[#777] text-[13px] leading-relaxed mb-3">
              The app hit an unexpected error — probably AI returned weird data. Your code is safe.
            </p>
            {this.state.error && (
              <div className="bg-[#0A0A0F] border border-white/[0.06] rounded-xl p-3 text-left mb-5">
                <p className="text-[11px] font-mono text-[#666] break-words">{this.state.error.message.slice(0, 300)}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={this.handleReload} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] hover:border-[#D4AF37]/20 transition-all">
                <RefreshCw size={14} /> Reload
              </button>
              <button onClick={this.handleReset} className="flex-1 btn-gold py-3 text-[13px] flex items-center justify-center gap-2 rounded-xl">
                <Home size={14} /> Go Home
              </button>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#333]">
              <Logo size={11} withBackground={false} className="w-4 h-4" /> CodeGuard AI • Error Recovery
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
