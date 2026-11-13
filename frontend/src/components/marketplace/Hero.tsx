'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrency } from '../../context/CurrencyContext';
import { DRC_PROVINCES } from '../../constants/drc';

export function Hero() {
  const { currency, exchangeRate } = useCurrency();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set('q', searchTerm.trim());
    if (selectedProvince) query.set('province', selectedProvince);
    router.push(`/recherche?${query.toString()}`);
  };

  return (
    <section className="relative bg-gradient-to-b from-emerald-50/60 via-stone-50 to-white pt-12 pb-20 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Place de marché B2B & B2C en République Démocratique du Congo
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.1] mb-6">
              Connecter l&apos;agriculture congolaise,{' '}
              <span className="text-emerald-800 underline decoration-orange-500 decoration-wavy decoration-2">
                du champ à la ville.
              </span>
            </h1>

            <p className="text-lg text-stone-600 mb-8 leading-relaxed max-w-2xl font-normal">
              AgroConnect réunit producteurs ruraux, revendeurs urbains, fournisseurs d&apos;intrants et acheteurs
              à travers les 26 provinces de la RDC. Commandez en toute transparence avec des prix en{' '}
              <strong className="text-stone-900 font-semibold">Francs Congolais (CDF)</strong> et{' '}
              <strong className="text-stone-900 font-semibold">Dollars (USD)</strong>.
            </p>

            {/* Quick Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white p-2.5 rounded-2xl shadow-md border border-stone-200 flex flex-col sm:flex-row gap-2 max-w-xl mb-8"
            >
              <div className="flex-1 flex items-center px-3 gap-2">
                <span className="text-stone-400">🔍</span>
                <input
                  type="text"
                  placeholder="Manioc doux, maïs, haricot, semences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm text-stone-800 placeholder-stone-400 outline-none bg-transparent"
                />
              </div>
              <div className="h-8 w-[1px] bg-stone-200 hidden sm:block self-center" />
              <div className="flex items-center px-3 gap-2">
                <span className="text-stone-400">📍</span>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="text-sm text-stone-700 bg-transparent outline-none cursor-pointer"
                >
                  <option value="">Toutes provinces (26)</option>
                  {DRC_PROVINCES.slice(0, 10).map((p) => (
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
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Intermédiaire neutre garanti</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Stock unique partagé (Gros & Détail)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Taux de change figé par transaction</span>
              </div>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative bg-white rounded-3xl p-6 shadow-xl border border-stone-200">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
                <div>
                  <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Aperçu Réel RDC</span>
                  <h3 className="text-base font-bold text-stone-900">Manioc Frais du Kwilu (Kikwit)</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Producteur Direct
                </span>
              </div>

              {/* Realistic Info Card */}
              <div className="space-y-4 mb-6">
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-500 font-medium">Vente au Détail (Min. 1 Sac 50kg)</p>
                    <p className="text-xl font-black text-stone-900">
                      {currency === 'CDF' ? '35 000 FC' : '12,28 $'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500 font-medium">Tarif de Gros (Dès 10 Sacs)</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {currency === 'CDF' ? '28 500 FC' : '10,00 $'}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-stone-600 space-y-2">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-400">Stock physique réel :</span>
                    <span className="font-semibold text-stone-800">450 sacs disponibles</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-400">Origine :</span>
                    <span className="font-semibold text-stone-800">Kwilu, Territoire de Bulungu</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-400">Taux appliqué :</span>
                    <span className="font-semibold text-emerald-800">1 USD = {exchangeRate} CDF (Figé)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/produits/prod-manioc-doux"
                  className="flex-1 text-center bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm py-3 rounded-xl transition shadow-xs"
                >
                  Commander ce lot
                </Link>
                <Link
                  href="/vendeurs/seller-coopak-kikwit"
                  className="px-4 py-3 text-center border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition"
                >
                  Voir Vendeur
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
