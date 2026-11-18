import React from 'react';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Parcourez le catalogue',
      desc: 'Découvrez les produits agricoles proposés par les vendeurs et comparez leurs offres.',
    },
    {
      num: '02',
      title: 'Composez votre panier',
      desc: 'Ajoutez les produits souhaités, même auprès de plusieurs vendeurs, dans un seul panier.',
    },
    {
      num: '03',
      title: 'Confirmez votre commande',
      desc: 'Renseignez les informations nécessaires et confirmez votre commande. Les prix sont affichés en CDF.',
    },
  ];

  return (
    <section id="fonctionnement" className="py-20 bg-stone-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
            Fonctionnement Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-4 mb-4">
            Comment fonctionne AgroConnect ?
          </h2>
          <p className="text-base text-stone-400 leading-relaxed">
            Une expérience directe, du choix des produits jusqu’à la confirmation de votre commande.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
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

