import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'orange' | 'amber' | 'blue' | 'stone' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'green', size = 'sm', className = '' }: BadgeProps) {
  const variants = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    blue: 'bg-sky-100 text-sky-800 border-sky-200',
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

