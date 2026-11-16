import React from 'react';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Panier Multi-Vendeurs Centralisé',
      desc: 'Sélectionnez des récoltes ou intrants chez plusieurs agriculteurs et revendeurs différents dans un panier unique.',
    },
    {
      num: '02',
      title: 'Commande Parent & Sous-Commandes',
      desc: 'Le système crée une commande globale pour l\'acheteur et des sous-commandes distinctes pour chaque vendeur concerné.',
    },
    {
      num: '03',
      title: 'Paiement Sécurisé & Taux Figé',
      desc: 'Réglez en Mobile Money ou devises. Le taux de change est gravé dans l\'historique de la transaction sans variation ultérieure.',
    },
    {
      num: '04',
      title: 'Suivi de Livraison Indépendant',
      desc: 'Chaque sous-commande dispose de son propre cycle d\'acheminement avec statut horodaté (En préparation, En transit, Livré).',
    },
  ];

  return (
    <section id="suivi" className="py-20 bg-stone-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
            Fonctionnement Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-4 mb-4">
            Comment fonctionne AgroConnect ?
          </h2>
          <p className="text-base text-stone-400 leading-relaxed">
            Une architecture métier conçue pour éliminer les litiges commerciaux et garantir la fluidité des approvisionnements en RDC.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div key={s.num} className="bg-stone-800/60 p-6 rounded-2xl border border-stone-700/80 relative">
              <span className="text-3xl font-black text-emerald-400/80 mb-3 block">{s.num}</span>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-xs text-stone-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

