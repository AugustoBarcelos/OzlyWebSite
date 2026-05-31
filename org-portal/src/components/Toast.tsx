import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, AlertIcon, InfoIcon } from '@/components/Icons';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: 'border-brand-200 bg-brand-50 text-brand-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-navy-100 bg-white text-navy-700',
};

const KIND_ICON: Record<ToastKind, ReactNode> = {
  success: <CheckIcon />,
  error: <AlertIcon />,
  info: <InfoIcon />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Monotonic counter for guaranteed-unique ids (previous Date.now()+Math.random()
  // had a non-zero chance of float collision and triggers React key warnings).
  const idCounterRef = useRef(0);
  // Track pending dismiss timers so we can clear them on unmount — prevents
  // setState-after-unmount warnings + leaks in dev StrictMode.
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    idCounterRef.current += 1;
    const id = idCounterRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    timersRef.current.add(timer);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg ${KIND_STYLE[t.kind]}`}
          >
            <span className="mt-0.5 shrink-0">{KIND_ICON[t.kind]}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
