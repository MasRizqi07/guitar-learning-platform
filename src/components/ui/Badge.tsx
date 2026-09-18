import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'amber';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    primary: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    error: 'bg-red-500/10 text-red-400 border border-red-500/30',
    neutral: 'bg-[#20242C] text-slate-300 border border-[#2A303A]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-full font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 select-none',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
