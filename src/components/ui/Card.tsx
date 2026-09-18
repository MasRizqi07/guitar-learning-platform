import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
}

export function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-2xl border transition-all duration-200';
  const variants = {
    default: 'bg-[#171A20] border-[#2A303A] text-slate-100',
    elevated: 'bg-[#20242C] border-[#2A303A] text-slate-100 shadow-xl shadow-black/40',
    interactive:
      'bg-[#171A20] border-[#2A303A] text-slate-100 hover:border-amber-500/50 hover:bg-[#1C2028] cursor-pointer active:scale-[0.99]',
  };

  return (
    <div className={twMerge(clsx(baseStyles, variants[variant], className))} {...props}>
      {children}
    </div>
  );
}
