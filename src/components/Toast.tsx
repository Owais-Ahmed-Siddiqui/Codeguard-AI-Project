import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`pointer-events-auto min-w-[300px] max-w-[400px] p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${
                toast.type === 'success' ? 'bg-[#0A1A0A] border-[#27C93F]/20 text-[#27C93F]' :
                toast.type === 'error' ? 'bg-[#1A0A0A] border-red-500/20 text-red-400' :
                'bg-[#0F0F15] border-white/[0.08] text-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                toast.type === 'success' ? 'bg-[#27C93F]/15' :
                toast.type === 'error' ? 'bg-red-500/15' : 'bg-white/[0.05]'
              }`}>
                {toast.type === 'success' ? <CheckCircle size={16} /> : toast.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium leading-relaxed">{toast.message}</p>
                <p className="text-[11px] opacity-60 mt-0.5">{new Date().toLocaleTimeString()}</p>
              </div>
              <button onClick={() => removeToast(toast.id)} className="p-1 rounded-lg hover:bg-white/[0.05] text-[#666] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
