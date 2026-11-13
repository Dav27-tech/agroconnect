import React from 'react';

export function RoleHighlights() {
  const roles = [
    {
      title: 'Agriculteurs & Producteurs',
      icon: '🌱',
      tag: 'Vente Directe',
      color: 'border-emerald-200 bg-emerald-50/50',
      description:
        'Publiez vos récoltes sans intermédiaire prédateur. Définissez librement vos prix de gros et de détail et vos unités de vente.',
      features: ['Fixation libre des prix', 'Stock unique synchronisé', 'Paiement direct sécurisé'],
    },
    {
      title: 'Revendeurs & Grossistes',
      icon: '🏪',
      tag: 'Distribution & Services',
      color: 'border-amber-200 bg-amber-50/50',
      description:
        'Achetez en gros et revendez aux particuliers et professionnels en offrant des services à valeur ajoutée (tri, lavage, livraison express).',
      features: ['Gestion de stock autonome', 'Services de conditionnement', 'Marge commerciale maîtrisée'],
    },
    {
      title: 'Fournisseurs d\'Intrants',
      icon: '🚜',
      tag: 'Intrants & Outillage',
      color: 'border-sky-200 bg-sky-50/50',
      description:
        'Distribuez semences certifiées, fertilisants, engrais et matériel agricole aux agriculteurs et coopératives à travers le pays.',
      features: ['Catalogue outillage & semences', 'Commandes institutionnelles', 'Conseils agronomiques'],
    },
    {
      title: 'Acheteurs B2B & Ménages',
      icon: '🛒',
      tag: 'Consommation & Transformation',
      color: 'border-stone-200 bg-stone-50',
      description:
        'Commandez auprès de plusieurs vendeurs en un seul panier unifié. Suivez vos sous-commandes et livraisons en temps réel.',
      features: ['Paiement centralisé', 'Paiement Mobile Money', 'Traçabilité province par province'],
    },
  ];

  return (
    <section id="vendeurs" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            L&apos;Écosystème AgroConnect
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 mt-4 mb-4">
            Une place de marché équitable pour chaque maillon agricole
          </h2>
          <p className="text-base text-stone-600">
            AgroConnect n&apos;achète ni ne revend de produits. Notre rôle est de fournir l&apos;infrastructure technologique,
            bancaire et logistique permettant à chacun de prospérer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {roles.map((role) => (
            <div
              key={role.title}
              className={`rounded-2xl p-6 border ${role.color} flex flex-col justify-between hover:shadow-lg transition`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{role.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                    {role.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">{role.title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-6">{role.description}</p>
              </div>

              <div className="border-t border-stone-200/60 pt-4">
                <ul className="space-y-2">
                  {role.features.map((f) => (
                    <li key={f} className="text-xs text-stone-700 font-medium flex items-center gap-1.5">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

