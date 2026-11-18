import React from 'react';
import { IconCart, IconCheck, IconPlant } from '../ui/Icons';

export function RoleHighlights() {
  const roles = [
    {
      title: 'Vendeurs agricoles',
      icon: <IconPlant className="w-6 h-6" aria-hidden="true" />,
      tag: 'Vendez vos produits',
      color: 'border-emerald-200 bg-emerald-50/50',
      description:
        'Publiez vos produits, gérez votre stock et fixez vos prix en CDF. Les acheteurs commandent directement depuis le catalogue.',
      features: ['Publication de vos offres', 'Gestion du stock', 'Visibilité dans le catalogue'],
    },
    {
      title: 'Acheteurs',
      icon: <IconCart className="w-6 h-6" aria-hidden="true" />,
      tag: 'Achats directs',
      color: 'border-stone-200 bg-stone-50',
      description:
        'Parcourez les offres agricoles, comparez les vendeurs et commandez les produits dont vous avez besoin.',
      features: ['Catalogue multi-vendeurs', 'Panier unique', 'Prix affichés en CDF'],
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
            Une place de marché pour vendeurs et acheteurs
          </h2>
          <p className="text-base text-stone-600">
            AgroConnect ne revend aucun produit. Les vendeurs publient leurs offres et les acheteurs commandent directement depuis le catalogue.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {roles.map((role) => (
            <div
              key={role.title}
              className={`rounded-2xl p-6 border ${role.color} flex flex-col justify-between hover:shadow-lg transition`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-3 bg-white text-emerald-800 rounded-xl border border-stone-200">{role.icon}</span>
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
                      <IconCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
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
