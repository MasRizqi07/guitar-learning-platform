'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
}

export function Logo({
  size = 'md',
  showText = true,
  subtitle,
  href = '/',
  className = '',
}: LogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  const content = (
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* Brand Icon SVG Badge */}
      <div
        style={{ width: iconSize, height: iconSize }}
        className="rounded-lg bg-[#171A20] border border-[#2A303A] group-hover:border-amber-500/50 flex items-center justify-center p-1 transition-colors shadow-inner"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-amber-500 transform group-hover:scale-105 transition-transform"
        >
          {/* Fretboard grid */}
          <line x1="4" y1="9" x2="28" y2="9" stroke="#2A303A" strokeWidth="1.5" />
          <line x1="4" y1="16" x2="28" y2="16" stroke="#2A303A" strokeWidth="1.5" />
          <line x1="4" y1="23" x2="28" y2="23" stroke="#2A303A" strokeWidth="1.5" />
          {/* Vertical Strings (Amber active) */}
          <line x1="11" y1="5" x2="11" y2="27" stroke="#F59E0B" strokeWidth="1.5" />
          <line x1="21" y1="5" x2="21" y2="27" stroke="#3A4250" strokeWidth="1.5" />
          {/* Fretted Note Dots */}
          <circle cx="11" cy="16" r="3.5" fill="#F59E0B" />
          <circle cx="21" cy="9" r="3" fill="#22C55E" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${textSize} font-extrabold tracking-tight text-[#F8FAFC]`}>
            Fret<span className="text-amber-500">Flow</span>
          </span>
          <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase mt-0.5">
            {subtitle || (size !== 'sm' ? 'Precision Academy' : '')}
          </span>
        </div>
      )}
    </div>
  );


  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
