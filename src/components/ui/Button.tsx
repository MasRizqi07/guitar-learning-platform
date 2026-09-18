import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#0E1014] disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl active:scale-[0.98] min-h-[44px]';

    const variants = {
      primary:
        'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30',
      secondary:
        'bg-[#20242C] hover:bg-[#2A303A] text-slate-100 border border-[#2A303A]',
      outline:
        'bg-transparent hover:bg-slate-800/40 text-slate-200 border border-[#2A303A] hover:border-slate-600',
      ghost:
        'bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white',
      danger:
        'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 h-9 min-h-[36px]',
      md: 'text-sm px-5 py-2.5 h-11 min-h-[44px]',
      lg: 'text-base px-6 py-3.5 h-13 min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
