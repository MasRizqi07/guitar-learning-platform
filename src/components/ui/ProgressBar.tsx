import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'amber';
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const barColors = {
    primary: 'bg-gradient-to-r from-amber-500 to-amber-400',
    amber: 'bg-amber-500',
    success: 'bg-emerald-500',
  };

  return (
    <div className={twMerge('w-full space-y-1.5', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>Progress</span>
          <span className="text-slate-200">{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={twMerge(
          'w-full bg-[#121418] border border-[#2A303A] rounded-full overflow-hidden p-0.5',
          heights[size]
        )}
      >
        <div
          className={twMerge(
            'h-full rounded-full transition-all duration-300 ease-out',
            barColors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
