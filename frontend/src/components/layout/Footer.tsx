import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PAYMENT_METHODS } from '../../constants/drc';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-8 border-b border-stone-800">
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 inline-flex">
              <Image
                src="/agroconnect-logo.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
              <span className="text-2xl font-black text-white">
                Agro<span className="text-orange-500">Connect</span>
              </span>
            </Link>
            <p className="text-sm text-stone-400 mb-6 leading-relaxed max-w-sm font-normal">
              La première place de marché agricole numérique opérant exclusivement en République Démocratique du Congo.
              AgroConnect connecte directement les vendeurs agricoles aux acheteurs.
            </p>
          </div>

          {/* Navigation Rapide */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link href="/catalogue" className="hover:text-emerald-400 transition">Catalogue des Produits</Link></li>
              <li><Link href="/#vendeurs" className="hover:text-emerald-400 transition">Vendeurs et acheteurs</Link></li>
              <li><Link href="/a-propos" className="hover:text-emerald-400 transition">À Propos d&apos;AgroConnect</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition">Contact & Bureaux RDC</Link></li>
            </ul>
          </div>

          {/* Espace Utilisateur */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Espace utilisateur</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link href="/inscription" className="hover:text-emerald-400 transition">Devenir vendeur</Link></li>
              <li><Link href="/connexion" className="hover:text-emerald-400 transition">Connexion Mon Compte</Link></li>
            </ul>
          </div>

          {/* Paiements Col */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Paiements RDC</h4>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {PAYMENT_METHODS.map((pm) => (
                <span
                  key={pm.id}
                  className="text-xs bg-stone-800 text-stone-300 px-2.5 py-1 rounded border border-stone-700 font-medium"
                >
                  {pm.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center text-xs text-stone-500">
          <p>© 2026 AgroConnect RDC. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
