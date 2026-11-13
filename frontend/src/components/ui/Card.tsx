import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'white' | 'neutral' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  variant = 'white',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const variants = {
    white: 'bg-white border border-stone-200 shadow-xs hover:shadow-md transition',
    neutral: 'bg-stone-50 border border-stone-200/80',
    bordered: 'bg-transparent border border-stone-300',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

