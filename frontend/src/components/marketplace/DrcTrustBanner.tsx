import React from 'react';
import Link from 'next/link';

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
              Vous produisez, transformez ou distribuez en RDC ?
            </h2>
            <p className="text-sm text-emerald-100 leading-relaxed mb-6">
              Ouvrez votre boutique en ligne sur AgroConnect. Conservez 100% de la propriété de vos stocks,
              définissez librement vos prix et bénéficiez de notre système de règlement sécurisé par Mobile Money.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-emerald-200">
              <span className="flex items-center gap-1.5">✓ Aucun frais d&apos;inscription initial</span>
              <span className="flex items-center gap-1.5">✓ Paiements rapides certifiés</span>
              <span className="flex items-center gap-1.5">✓ Déploiement dans les 26 provinces</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <Link
              href="#vendeurs"
              className="text-center bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-8 py-4 rounded-xl shadow-md transition"
            >
              Créer mon espace producteur / revendeur
            </Link>
            <Link
              href="#catalogue"
              className="text-center bg-emerald-950/60 hover:bg-emerald-950 text-emerald-100 border border-emerald-700 font-bold text-sm px-8 py-3.5 rounded-xl transition"
            >
              Consulter les demandes d&apos;achat B2B
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

