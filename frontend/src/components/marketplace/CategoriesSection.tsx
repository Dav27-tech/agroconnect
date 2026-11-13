import React from 'react';
import Link from 'next/link';

export function CategoriesSection() {
  const categories = [
    {
      id: 'cat-tubercules',
      name: 'Tubercules & Racines',
      desc: 'Manioc frais, cossettes séchées, igname, patate douce',
      icon: '🍠',
      count: '48 offres actives',
    },
    {
      id: 'cat-cereales',
      name: 'Céréales & Grains',
      desc: 'Maïs jaune/blanc, riz local de Bumba, sorgho',
      icon: '🌽',
      count: '62 offres actives',
    },
    {
      id: 'cat-maraichage',
      name: 'Légumes & Maraîchage',
      desc: 'Feuilles de manioc (Pondu), tomates, matembele, piments',
      icon: '🥬',
      count: '95 offres actives',
    },
    {
      id: 'cat-legumineuses',
      name: 'Légumineuses & Protéagineux',
      desc: 'Haricots du Kivu, arachides du Bandundu, graines de courge',
      icon: '🥜',
      count: '39 offres actives',
    },
    {
      id: 'cat-fruits',
      name: 'Fruits Tropicaux',
      desc: 'Bananes plantains, papayes, mangues, ananas',
      icon: '🍌',
      count: '54 offres actives',
    },
    {
      id: 'cat-intrants',
      name: 'Intrants & Équipements',
      desc: 'Semences certifiées, fertilisants NPK, pulvérisateurs, houes',
      icon: '🚜',
      count: '31 offres actives',
    },
  ];

  return (
    <section id="catalogue" className="py-20 bg-stone-50 border-y border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
              Catalogue Commun
            </span>
            <h2 className="text-3xl font-black text-stone-900 mt-3">
              Filières agricoles de la RDC
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-xl">
              Chaque produit réunit les offres indépendantes de multiples producteurs et revendeurs avec leurs conditions spécifiques.
            </p>
          </div>
          <Link
            href="#catalogue"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-700 flex items-center gap-1 self-start md:self-auto"
          >
            <span>Explorer l&apos;intégralité du catalogue (260+ références)</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl p-3 bg-stone-50 rounded-xl group-hover:bg-emerald-50 transition">
                  {cat.icon}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {cat.count}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1 group-hover:text-emerald-800 transition">
                {cat.name}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed mb-4">{cat.desc}</p>
              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Comparer les vendeurs</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

