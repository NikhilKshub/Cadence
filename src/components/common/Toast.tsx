// Cadence — Toast notifications container

import { useToastStore, ToastType } from '../../store/toastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICON_MAP: Record<ToastType, React.FC<any>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLOR_MAP: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-purple-500',
  warning: 'text-yellow-500',
};

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type];
        const colorClass = COLOR_MAP[toast.type];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-4 py-3 shadow-xl min-w-[250px] animate-slide-in-right"
          >
            <Icon className={`w-5 h-5 shrink-0 ${colorClass}`} />
            <span className="text-sm text-white font-medium flex-1">
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#6b6b6b] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
