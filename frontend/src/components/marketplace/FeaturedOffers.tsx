'use client';

import React from 'react';
import Link from 'next/link';
import { MOCK_OFFERS } from '../../data/mockData';
import { useCurrency } from '../../context/CurrencyContext';
import { ProductCard } from './ProductCard';
import { IconChevronRight } from '../ui/Icons';

export function FeaturedOffers() {
  const { currency } = useCurrency();
  const offers = MOCK_OFFERS.slice(0, 4);

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
          <div>
            <span className="ac-eyebrow">Offres vendeurs en direct</span>
            <h2 className="text-3xl font-black text-stone-900 mt-3">
              Des récoltes disponibles près de chez vous
            </h2>
            <p className="text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
              Comparez les conditions de vente au détail et en gros, avec des prix en Francs Congolais ou en dollars.
            </p>
          </div>
          <div className="text-xs text-stone-600 bg-stone-50 px-3.5 py-2.5 rounded-xl border border-stone-200 self-start md:self-auto">
            Devise affichée : <strong className="text-emerald-800">{currency === 'CDF' ? 'Franc Congolais (CDF)' : 'Dollar américain (USD)'}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {offers.map((offer) => (
            <ProductCard key={offer.id} offer={offer} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:text-emerald-700"
          >
            Voir toutes les offres
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
