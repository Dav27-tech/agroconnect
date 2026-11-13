import React from 'react';
import Link from 'next/link';
import { PAYMENT_METHODS } from '../../constants/drc';
import { IconPlant } from '../ui/Icons';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-stone-800">
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 inline-flex">
              <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <IconPlant className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-2xl font-black text-white">
                Agro<span className="text-orange-500">Connect</span> RDC
              </span>
            </Link>
            <p className="text-sm text-stone-400 mb-6 leading-relaxed max-w-sm font-normal">
              La première place de marché agricole numérique opérant exclusivement en République Démocratique du Congo.
              AgroConnect connecte directement les producteurs, revendeurs agréés et fournisseurs d&apos;intrants aux acheteurs finaux.
            </p>
            <div className="bg-stone-800/80 p-3.5 rounded-xl border border-stone-700 text-xs text-stone-300 leading-relaxed">
              <strong className="text-emerald-400 font-bold">Règle d&apos;or d&apos;intermédiation :</strong> AgroConnect n&apos;achète, ne possède, ne stocke ni ne revend aucun produit agricole. Chaque vendeur gère ses stocks et ses prix.
            </div>
          </div>

          {/* Navigation Rapide */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link href="/catalogue" className="hover:text-emerald-400 transition">Catalogue des Produits</Link></li>
              <li><Link href="/#vendeurs" className="hover:text-emerald-400 transition">Acteurs du Marché</Link></li>
              <li><Link href="/a-propos" className="hover:text-emerald-400 transition">À Propos d&apos;AgroConnect</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition">Contact & Bureaux RDC</Link></li>
              <li><Link href="/recherche" className="hover:text-emerald-400 transition">Moteur de Recherche</Link></li>
            </ul>
          </div>

          {/* Espace Utilisateur */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Espace Professionnel</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link href="/inscription" className="hover:text-emerald-400 transition">Devenir Vendeur Agréé</Link></li>
              <li><Link href="/connexion" className="hover:text-emerald-400 transition">Connexion Mon Compte</Link></li>
              <li><Link href="/inscription" className="hover:text-emerald-400 transition">Transporteurs & Fret</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition">Demande d&apos;achat en Gros B2B</Link></li>
            </ul>
          </div>

          {/* Paiements Col */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Paiements RDC</h4>
            <p className="text-xs text-stone-400 mb-3">Règlement certifié en Francs Congolais (CDF) et Dollars (USD) :</p>
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
            <p className="text-[11px] text-stone-500">
              Taux de transaction garanti et figé au passage de chaque commande.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-500 gap-4">
          <p>© 2026 AgroConnect RDC. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <span>26 Provinces de la RDC</span>
            <Link href="/contact" className="hover:text-stone-300 transition">contact@agroconnect.cd</Link>
            <span>Français (FR)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
