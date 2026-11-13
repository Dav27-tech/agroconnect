'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCurrency } from '../../context/CurrencyContext';

export function Navbar() {
  const { currency, toggleCurrency, exchangeRate } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner DRC & Taux de change */}
      <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Place de marché agricole dédiée exclusivement à la <strong>République Démocratique du Congo</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-200">
              Taux de référence transaction : <strong>1 USD = {exchangeRate.toLocaleString('fr-FR')} FC</strong>
            </span>
            <span className="hidden md:inline text-emerald-300">|</span>
            <span className="hidden md:inline text-emerald-200">Kinshasa • Lubumbashi • Goma • Kikwit</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-2xl shadow-sm group-hover:bg-emerald-700 transition">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-emerald-900">Agro</span>
                <span className="text-2xl font-black tracking-tight text-orange-600">Connect</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded ml-1 border border-emerald-300">
                  RDC
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">Marché Agricole Numérique Congolais</p>
            </div>
          </Link>

          {/* Navigation Links Desktop */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-stone-700">
            <Link href="#catalogue" className="hover:text-emerald-800 transition">
              Catalogue Produits
            </Link>
            <Link href="#vendeurs" className="hover:text-emerald-800 transition">
              Producteurs & Revendeurs
            </Link>
            <Link href="#intrants" className="hover:text-emerald-800 transition">
              Intrants & Matériel
            </Link>
            <Link href="#suivi" className="hover:text-emerald-800 transition">
              Suivi Livraison
            </Link>
          </nav>

          {/* Right Tools (Currency Toggle & Auth CTA) */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Currency Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={toggleCurrency}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  currency === 'CDF'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Afficher les prix en Francs Congolais"
              >
                CDF (FC)
              </button>
              <button
                type="button"
                onClick={toggleCurrency}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  currency === 'USD'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Afficher les prix en Dollars Américains"
              >
                USD ($)
              </button>
            </div>

            {/* CTA Vendeur */}
            <Link
              href="#rejoindre"
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition"
            >
              Vendre ma production
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-stone-600 hover:text-stone-900"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-stone-200 flex flex-col gap-3">
            <Link href="#catalogue" className="text-sm font-semibold py-2 text-stone-700" onClick={() => setMobileMenuOpen(false)}>
              Catalogue Produits
            </Link>
            <Link href="#vendeurs" className="text-sm font-semibold py-2 text-stone-700" onClick={() => setMobileMenuOpen(false)}>
              Producteurs & Revendeurs
            </Link>
            <Link href="#intrants" className="text-sm font-semibold py-2 text-stone-700" onClick={() => setMobileMenuOpen(false)}>
              Intrants & Matériel
            </Link>
            <Link href="#suivi" className="text-sm font-semibold py-2 text-stone-700" onClick={() => setMobileMenuOpen(false)}>
              Suivi Livraison
            </Link>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-stone-600">Devise d&apos;affichage :</span>
              <button
                type="button"
                onClick={toggleCurrency}
                className="text-xs font-bold px-3 py-1 bg-emerald-800 text-white rounded"
              >
                Passer en {currency === 'CDF' ? 'USD ($)' : 'CDF (FC)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
