import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types/editor';

interface ToastStackProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Workspace notifications"
      className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0"
    >
      {toasts.map((toast) => {
        const isError = toast.level === 'error';
        const isWarning = toast.level === 'warning';
        const isSuccess = toast.level === 'success';

        const borderClass = isError
          ? 'border-red-500/45 bg-[#1a1216]/95'
          : isWarning
          ? 'border-amber-500/45 bg-[#1b1710]/95'
          : isSuccess
          ? 'border-emerald-500/45 bg-[#101c16]/95'
          : 'border-[#0a84ff]/45 bg-[#111724]/95';

        const iconNode = isError ? (
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
        ) : isWarning ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        ) : isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <Info className="w-4 h-4 text-[#0a84ff] shrink-0 mt-0.5" aria-hidden="true" />
        );

        return (
          <div
            key={toast.id}
            role={isError || isWarning ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-2xl backdrop-blur-md text-slate-100 ${borderClass}`}
          >
            {iconNode}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white leading-snug">
                {toast.title}
              </div>
              {toast.message && (
                <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Dismiss ${toast.title}`}
              className="p-1 -mr-1 -mt-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
