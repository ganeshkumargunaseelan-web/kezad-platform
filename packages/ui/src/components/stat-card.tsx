import * as React from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  iconClass?: string;
}

const variantConfig = {
  default:  { iconClass: 'icon-teal',   border: 'border-gray-100/80',    accent: '#006B6B' },
  success:  { iconClass: 'icon-green',  border: 'border-emerald-100/80', accent: '#059669' },
  warning:  { iconClass: 'icon-amber',  border: 'border-amber-100/80',   accent: '#D97706' },
  danger:   { iconClass: 'icon-red',    border: 'border-red-100/80',     accent: '#DC2626' },
  info:     { iconClass: 'icon-blue',   border: 'border-blue-100/80',    accent: '#1D4ED8' },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  variant = 'default',
  iconClass,
}: StatCardProps) {
  const cfg = variantConfig[variant];

  return (
    <div className={cn('kezad-stat-card', cfg.border, className)}>
      <div className="flex items-start justify-between gap-3">
        {/* Value + labels */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 leading-none tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.value >= 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="font-normal text-gray-400 ml-0.5">{trend.label}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
            'shadow-lg transition-transform duration-300 group-hover:scale-110',
            iconClass ?? cfg.iconClass,
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
