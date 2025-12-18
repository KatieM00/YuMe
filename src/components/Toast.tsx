import { useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <X className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-green-500/90 border-green-400/50 text-white',
    error: 'bg-red-500/90 border-red-400/50 text-white',
    info: 'bg-blue-500/90 border-blue-400/50 text-white',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center space-x-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl animate-slide-up ${styles[type]}`}
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 hover:opacity-70 transition"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
