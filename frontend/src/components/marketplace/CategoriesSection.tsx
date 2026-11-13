import React from 'react';
import Link from 'next/link';
import { MOCK_CATEGORIES } from '../../data/mockData';
import { IconCategory, IconChevronRight } from '../ui/Icons';

export function CategoriesSection() {
  return (
    <section id="catalogue" className="py-16 sm:py-20 bg-stone-50 border-y border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
          <div>
            <span className="ac-eyebrow">Catalogue commun</span>
            <h2 className="text-3xl font-black text-stone-900 mt-3">
              Filières agricoles de la RDC
            </h2>
            <p className="text-sm text-stone-600 mt-2 max-w-xl leading-relaxed">
              Comparez les offres indépendantes des producteurs et revendeurs, avec leurs conditions de vente.
            </p>
          </div>
          <Link
            href="/catalogue"
            className="text-sm font-bold text-emerald-800 hover:text-emerald-700 inline-flex items-center gap-1 self-start md:self-auto"
          >
            Explorer le catalogue
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {MOCK_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/catalogue?category=${category.slug}`}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="p-3 bg-emerald-50 text-emerald-800 rounded-xl group-hover:bg-emerald-100 transition">
                  <IconCategory name={category.icon} className="w-6 h-6" />
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {category.itemCount} offres
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1 group-hover:text-emerald-800 transition">
                {category.name}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed mb-4">{category.description}</p>
              <span className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Comparer les offres
                <IconChevronRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
