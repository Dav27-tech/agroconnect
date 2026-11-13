import React from 'react';
import Link from 'next/link';
import { Category } from '../../types';

export interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/catalogue?category=${category.slug}`}
      className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-emerald-400 hover:shadow-md transition duration-200 group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl p-2.5 bg-stone-50 rounded-xl group-hover:bg-emerald-50 transition">
            {category.icon}
          </span>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
            {category.itemCount} offres
          </span>
        </div>
        <h4 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition mb-1">
          {category.name}
        </h4>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
          {category.description}
        </p>
      </div>

      <div className="pt-4 flex items-center text-xs font-bold text-emerald-700 gap-1 group-hover:translate-x-1 transition-transform">
        <span>Parcourir</span>
        <span>→</span>
      </div>
    </Link>
  );
}

