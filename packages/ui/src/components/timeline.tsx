import * as React from 'react';
import { cn } from '../lib/utils';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const variantDot: Record<string, string> = {
  default: 'bg-gray-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

export function Timeline({ items, className }: TimelineProps) {
  if (!items.length) {
    return <p className="text-sm text-gray-400 text-center py-6">No history available</p>;
  }

  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, idx) => (
        <div key={item.id} className="flex gap-4">
          {/* Left: dot + line */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ring-2 ring-white shadow',
                variantDot[item.variant ?? 'default'],
              )}
            />
            {idx < items.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 my-1" />
            )}
          </div>
          {/* Right: content */}
          <div className={cn('pb-5', idx === items.length - 1 && 'pb-0')}>
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
            {item.description && (
              <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
