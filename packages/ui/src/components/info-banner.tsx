import * as React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

type BannerVariant = 'info' | 'success' | 'warning' | 'error';

interface InfoBannerProps {
  variant?: BannerVariant;
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<BannerVariant, { wrapper: string; icon: React.ReactNode }> = {
  info: {
    wrapper: 'bg-sky-50 border-sky-200 text-sky-800',
    icon: <Info className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />,
  },
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />,
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />,
  },
};

export function InfoBanner({ variant = 'info', title, message, onDismiss, className }: InfoBannerProps) {
  const { wrapper, icon } = styles[variant];
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', wrapper, className)}>
      {icon}
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p>{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
