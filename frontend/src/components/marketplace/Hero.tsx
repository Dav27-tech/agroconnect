'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DRC_PROVINCES } from '../../constants/drc';
import { IconCheck, IconLocation, IconSearch } from '../ui/Icons';

export function Hero() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set('search', searchTerm.trim());
    if (selectedProvince) query.set('province', selectedProvince);
    const queryString = query.toString();
    router.push(queryString ? `/catalogue?${queryString}` : '/catalogue');
  };

  return (
    <section className="relative isolate min-h-[620px] overflow-hidden border-b border-stone-200 bg-emerald-950 sm:min-h-[660px]">
      <Image
        src="https://images.unsplash.com/photo-1687422809617-a7d97879b3b0?auto=format&fit=crop&w=2400&q=85"
        alt="Vendeur devant son étal de fruits sur un marché africain"
        fill
        priority
        sizes="100vw"
        className="z-0 object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="ac-home-hero-overlay absolute inset-0 z-10"
      />
      <div
        className="relative flex min-h-[620px] items-center py-12 sm:min-h-[660px] sm:py-16"
        style={{ zIndex: 20 }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.1] mb-6">
              Connecter l&apos;agriculture congolaise,{' '}
              <span className="text-emerald-800">
                du champ à la ville.
              </span>
            </h1>

            <p className="text-lg text-stone-600 mb-8 leading-relaxed max-w-2xl font-normal">
              AgroConnect relie les agriculteurs vendeurs aux acheteurs à travers les 26 provinces de la RDC.
              Consultez le catalogue et les prix en francs congolais.
            </p>

            {/* Quick Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white p-2 rounded-2xl shadow-md border border-stone-200 flex flex-col sm:flex-row gap-2 max-w-xl mb-8"
            >
              <div className="flex-1 flex items-center px-3 gap-2 min-h-11">
                <IconSearch className="w-5 h-5 text-stone-400 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Manioc doux, maïs, haricot, semences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm text-stone-800 placeholder-stone-400 outline-none bg-transparent"
                />
              </div>
              <div className="h-8 w-[1px] bg-stone-200 hidden sm:block self-center" />
              <div className="flex items-center px-3 gap-2 min-h-11">
                <IconLocation className="w-5 h-5 text-stone-400 shrink-0" aria-hidden="true" />
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="text-sm text-stone-700 bg-transparent outline-none cursor-pointer"
                >
                  <option value="">Toutes provinces (26)</option>
                  {DRC_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition cursor-pointer"
              >
                Rechercher
              </button>
            </form>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-stone-600 font-medium">
              <div className="flex items-center gap-2">
                <IconCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Intermédiaire neutre garanti</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Stock unique et prix par quantité</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Prix affichés en CDF</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
