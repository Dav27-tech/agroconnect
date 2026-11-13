'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { IconPlant, IconSearch, IconUser, IconShoppingBag } from '../ui/Icons';

export function Navbar() {
  const { currency, toggleCurrency, exchangeRate } = useCurrency();
  const { user, isAuthenticated, isSeller, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner DRC & Taux de change */}
      <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Place de marché agricole dédiée exclusivement à la <strong>République Démocratique du Congo</strong>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-200">
              Taux officiel RDC : <strong>1 USD = {exchangeRate.toLocaleString('fr-FR')} FC</strong>
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
            <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700 transition">
              <IconPlant className="w-6 h-6" aria-hidden="true" />
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
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-stone-700">
            <Link href="/catalogue" className="hover:text-emerald-800 transition">
              Catalogue Produits
            </Link>
            <Link href="/recherche" className="hover:text-emerald-800 transition flex items-center gap-1">
              <IconSearch className="w-4 h-4 text-stone-500" />
              <span>Rechercher</span>
            </Link>
            <Link href="/a-propos" className="hover:text-emerald-800 transition">
              À Propos
            </Link>
            <Link href="/contact" className="hover:text-emerald-800 transition">
              Contact & Agences
            </Link>
            {isSeller && (
              <Link
                href="/vendeur/dashboard"
                className="text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition font-bold"
              >
                🌾 Espace Vendeur
              </Link>
            )}
          </nav>

          {/* Right Tools (Currency, Cart & Auth) */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Currency Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={toggleCurrency}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${currency === 'CDF'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                  }`}
                title="Afficher les prix en Francs Congolais (FC)"
              >
                CDF (FC)
              </button>
              <button
                type="button"
                onClick={toggleCurrency}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${currency === 'USD'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                  }`}
                title="Afficher les prix en Dollars Américains ($)"
              >
                USD ($)
              </button>
            </div>

            {/* Shopping Cart Icon with Badge */}
            <Link
              href="/panier"
              className="relative p-2.5 rounded-xl border border-stone-200 text-stone-700 hover:text-emerald-800 hover:bg-stone-50 transition"
              title="Mon Panier Multi-Vendeurs"
            >
              <IconShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            {/* User Session Dropdown or Login Link */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 transition text-xs font-bold text-stone-800 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px]">
                    {user?.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.fullName.split(' ')[0]}</span>
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900 truncate">{user?.fullName}</p>
                      <p className="text-[11px] text-stone-500">{user?.phoneNumber}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user?.roles?.map((r) => (
                          <span
                            key={r}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase"
                          >
                            {r === 'SELLER' ? 'Vendeur' : r === 'BUYER' ? 'Acheteur' : r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isSeller && (
                      <Link
                        href="/vendeur/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
                      >
                        🌾 Tableau de bord Vendeur
                      </Link>
                    )}

                    <Link
                      href="/mes-commandes"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                    >
                      📦 Mes Commandes & Suivis
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer border-t border-stone-100 mt-1"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/connexion"
                  className="text-xs font-bold text-stone-700 hover:text-emerald-800 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition flex items-center gap-1.5"
                >
                  <IconUser className="w-4 h-4 text-stone-500" />
                  <span>Connexion</span>
                </Link>

                <Link
                  href="/inscription"
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition"
                >
                  S&apos;inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/panier" className="relative p-2 text-stone-700">
              <IconShoppingBag className="w-6 h-6" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-600 hover:text-stone-900"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-stone-200 flex flex-col gap-3">
            <Link
              href="/catalogue"
              className="text-sm font-semibold py-2 text-stone-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Catalogue Produits
            </Link>
            <Link
              href="/recherche"
              className="text-sm font-semibold py-2 text-stone-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Rechercher un produit
            </Link>
            {isSeller && (
              <Link
                href="/vendeur/dashboard"
                className="text-sm font-bold py-2 text-emerald-800 bg-emerald-50 px-3 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                🌾 Espace Vendeur
              </Link>
            )}
            <Link
              href="/panier"
              className="text-sm font-semibold py-2 text-stone-700 flex items-center justify-between"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Mon Panier</span>
              {totalItemsCount > 0 && (
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItemsCount}
                </span>
              )}
            </Link>
            {isAuthenticated && (
              <Link
                href="/mes-commandes"
                className="text-sm font-semibold py-2 text-stone-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Mes Commandes
              </Link>
            )}
            <Link
              href="/a-propos"
              className="text-sm font-semibold py-2 text-stone-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              À Propos
            </Link>
            <Link
              href="/contact"
              className="text-sm font-semibold py-2 text-stone-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact & Support
            </Link>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-600">Devise :</span>
              <button
                type="button"
                onClick={toggleCurrency}
                className="text-xs font-bold px-3 py-1 bg-emerald-800 text-white rounded cursor-pointer"
              >
                Passer en {currency === 'CDF' ? 'USD ($)' : 'CDF (FC)'}
              </button>
            </div>

            <div className="pt-2 flex gap-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-center py-2 text-xs font-bold bg-red-50 text-red-700 rounded-lg"
                >
                  Déconnexion ({user?.fullName.split(' ')[0]})
                </button>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 text-xs font-bold bg-stone-100 text-stone-800 rounded-lg"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/inscription"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 text-xs font-bold bg-orange-600 text-white rounded-lg"
                  >
                    S&apos;inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
