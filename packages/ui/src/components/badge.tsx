import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        info: 'border-transparent bg-sky-100 text-sky-800',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Utility: map invoice/contract statuses to badge variants
export function statusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    ACTIVE: 'success', APPROVED: 'success', COMPLETED: 'success', PAID: 'success',
    DRAFT: 'secondary', PENDING: 'warning', PENDING_APPROVAL: 'warning', IN_PROGRESS: 'warning',
    OVERDUE: 'destructive', VOID: 'destructive', TERMINATED: 'destructive', REJECTED: 'destructive',
    SENT: 'info', PARTIALLY_PAID: 'info',
  };
  return map[status] ?? 'outline';
}
