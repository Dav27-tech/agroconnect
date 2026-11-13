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

        {/* Live Delivery Tracker Simulation */}
        <div className="mt-16 bg-stone-800 p-6 sm:p-8 rounded-3xl border border-stone-700 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-700 gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-stone-400">Simulation Suivi de Fret RDC</span>
              <h4 className="text-lg font-bold text-white">Bordereau #AGC-TRK-784910</h4>
              <p className="text-xs text-stone-400">Kikwit (Kwilu) → Limete Résidentiel (Kinshasa)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              <span className="text-xs font-bold px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                Statut : EN TRANSIT (RN1)
              </span>
            </div>
          </div>

          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-700/50">
              <span className="text-stone-400 block mb-1">01. Enregistrement</span>
              <span className="text-emerald-400 font-bold">✓ Confirmé</span>
            </div>
            <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-700/50">
              <span className="text-stone-400 block mb-1">02. Transporteur</span>
              <span className="text-emerald-400 font-bold">✓ Assigné</span>
            </div>
            <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-700/50">
              <span className="text-stone-400 block mb-1">03. Enlèvement</span>
              <span className="text-emerald-400 font-bold">✓ Dépôt Kikwit</span>
            </div>
            <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-700/60">
              <span className="text-emerald-300 block mb-1">04. En route RN1</span>
              <span className="text-white font-bold">Passage Kenge</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

