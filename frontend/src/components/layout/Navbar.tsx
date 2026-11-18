'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { IconUser, IconShoppingBag, IconPlant, IconShieldCheck } from '../ui/Icons';

export function Navbar() {
  const { user, isAuthenticated, isSeller, isAdmin, isLoading: isAuthLoading, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Bandeau tricolore */}
      <div aria-hidden="true" className="flex h-1 w-full">
        <span className="flex-1 bg-[#007fff]" />
        <span className="flex-1 bg-[#f7d618]" />
        <span className="flex-1 bg-[#ce1021]" />
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/agroconnect-logo.png"
              alt="AgroConnect"
              width={48}
              height={48}
              priority
              className="h-12 w-12 object-contain transition group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-emerald-900">Agro</span>
                <span className="text-2xl font-black tracking-tight text-orange-600">Connect</span>
              </div>
            </div>
          </Link>

          {/* Navigation Links Desktop */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-stone-700">
            <Link href="/catalogue" className="hover:text-emerald-800 transition">
              Catalogue Produits
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
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-800 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
              >
                <IconPlant className="h-4 w-4" aria-hidden="true" />
                <span>Tableau Vendeur</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
              >
                <IconShieldCheck className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>Tableau Admin</span>
              </Link>
            )}
          </nav>

          {/* Right Tools (Currency, Cart & Auth) */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Shopping Cart Icon with Badge */}
            {!isAdmin && !isAuthLoading && (
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
            )}

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
                        className="mx-2 my-1 flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-900"
                      >
                        <IconPlant className="h-4 w-4" aria-hidden="true" />
                        Tableau Vendeur
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="mx-2 my-1 flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-stone-800"
                      >
                        <IconShieldCheck className="h-4 w-4 text-amber-300" aria-hidden="true" />
                        Tableau Admin
                      </Link>
                    )}

                    {!isAdmin && !isAuthLoading && (
                      <Link
                        href="/mes-commandes"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                      >
                        Mes Commandes
                      </Link>
                    )}

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
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            {!isAdmin && !isAuthLoading && (
              <Link href="/panier" className="relative p-2 text-stone-700">
                <IconShoppingBag className="w-6 h-6" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItemsCount}
                  </span>
                )}
              </Link>
            )}

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
            {isSeller && (
              <Link
                href="/vendeur/dashboard"
                className="flex items-center gap-3 rounded-xl border border-emerald-800 bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconPlant className="h-5 w-5" aria-hidden="true" />
                <span>Tableau Vendeur</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconShieldCheck className="h-5 w-5 text-amber-300" aria-hidden="true" />
                <span>Tableau Admin</span>
              </Link>
            )}
            {!isAdmin && !isAuthLoading && (
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
            )}
            {isAuthenticated && !isAdmin && (
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
