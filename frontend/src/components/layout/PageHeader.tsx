import React from 'react';
import Link from 'next/link';
import { IconChevronRight } from '../ui/Icons';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [{ label: 'Accueil', href: '/' }],
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-stone-50 border-b border-stone-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-4 flex-wrap">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <IconChevronRight className="w-3.5 h-3.5 text-stone-400" />}
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-emerald-800 transition">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="text-stone-900 font-semibold">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-stone-600 max-w-2xl font-normal leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

