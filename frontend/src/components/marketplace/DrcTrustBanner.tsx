import React from 'react';
import Link from 'next/link';
import { IconCheck } from '../ui/Icons';

export function DrcTrustBanner() {
  return (
    <section id="rejoindre" className="py-16 bg-emerald-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-800/80 rounded-3xl p-8 sm:p-12 border border-emerald-700/80 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 bg-emerald-900/80 px-3 py-1 rounded-full border border-emerald-700">
              Rejoindre le Réseau National
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4 mb-4">
              Vous cultivez et souhaitez vendre vos produits en RDC ?
            </h2>
            <p className="text-sm text-emerald-100 leading-relaxed mb-6">
              Créez votre espace vendeur pour publier vos produits agricoles, gérer votre stock et recevoir les commandes des acheteurs.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-emerald-200">
              <span className="flex items-center gap-1.5"><IconCheck className="w-4 h-4" />Gérez vos offres et votre stock</span>
              <span className="flex items-center gap-1.5"><IconCheck className="w-4 h-4" />Prix affichés en CDF</span>
              <span className="flex items-center gap-1.5"><IconCheck className="w-4 h-4" />Accessible dans les 26 provinces</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <Link
              href="/inscription"
              className="text-center bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-8 py-4 rounded-xl shadow-md transition"
            >
              Créer mon espace vendeur
            </Link>
            <Link
              href="/catalogue"
              className="text-center bg-emerald-950/60 hover:bg-emerald-950 text-emerald-100 border border-emerald-700 font-bold text-sm px-8 py-3.5 rounded-xl transition"
            >
              Parcourir le catalogue
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

