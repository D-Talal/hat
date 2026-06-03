import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const TONES = {
  success: { bg: '#ecfdf5', border: '#86efac', text: '#15803d', icon: '✓',  bar: '#10b981' },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', icon: '✕',  bar: '#ef4444' },
  warning: { bg: '#fffbeb', border: '#fde047', text: '#92400e', icon: '⚠',  bar: '#f59e0b' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: 'ℹ',  bar: '#3b82f6' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, tone = 'info', opts = {}) => {
    const id = ++idRef.current;
    const duration = opts.duration ?? (tone === 'error' ? 6000 : 4000);
    setToasts((list) => [...list, { id, message, tone, leaving: false }]);
    if (duration > 0) {
      setTimeout(() => {
        // trigger leave animation, then remove
        setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => remove(id), 280);
      }, duration);
    }
    return id;
  }, [remove]);

  const api = {
    toast:   (msg, opts) => push(msg, 'info', opts),
    success: (msg, opts) => push(msg, 'success', opts),
    error:   (msg, opts) => push(msg, 'error', opts),
    warning: (msg, opts) => push(msg, 'warning', opts),
    info:    (msg, opts) => push(msg, 'info', opts),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 380, pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          return (
            <div key={t.id}
              onClick={() => { setToasts((l) => l.map(x => x.id === t.id ? { ...x, leaving: true } : x)); setTimeout(() => remove(t.id), 280); }}
              style={{
                pointerEvents: 'auto', cursor: 'pointer',
                background: tone.bg, border: `1px solid ${tone.border}`,
                borderRadius: 12, padding: '13px 16px 13px 14px',
                boxShadow: '0 8px 28px rgba(15,17,40,0.12), 0 2px 6px rgba(15,17,40,0.06)',
                display: 'flex', alignItems: 'flex-start', gap: 11,
                fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden',
                animation: t.leaving ? 'toast-out 0.28s ease forwards' : 'toast-in 0.32s cubic-bezier(.21,1.02,.73,1) forwards',
              }}>
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                background: tone.bar, color: '#fff', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>{tone.icon}</span>
              <span style={{ fontSize: 14, color: tone.text, lineHeight: 1.4, fontWeight: 500, flex: 1 }}>
                {t.message}
              </span>
              <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: '100%', background: tone.bar, opacity: 0.25 }} />
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          0%   { opacity: 0; transform: translateX(40px) scale(0.96); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toast-out {
          0%   { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(40px) scale(0.96); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback so the app never crashes if provider is missing
    return {
      toast: (m) => console.log('[toast]', m),
      success: (m) => console.log('[toast:success]', m),
      error: (m) => console.error('[toast:error]', m),
      warning: (m) => console.warn('[toast:warning]', m),
      info: (m) => console.log('[toast:info]', m),
    };
  }
  return ctx;
}
