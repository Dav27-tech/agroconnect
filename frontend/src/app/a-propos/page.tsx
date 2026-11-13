'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { IconShieldCheck, IconLocation, IconTruck } from '../../components/ui/Icons';
import { DRC_PROVINCES } from '../../constants/drc';

export default function AboutPage() {
  const pillars = [
    {
      title: 'Intermédiation Neutre & Transparente',
      icon: '⚖️',
      description:
        'AgroConnect n\'achète, ne possède, ne stocke ni ne revend aucun produit agricole. Chaque agriculteur ou revendeur reste propriétaire exclusif de son stock et fixe souverainement ses prix.',
    },
    {
      title: 'Éradication des Pertes Post-Récolte',
      icon: '🌱',
      description:
        'En connectant directement les bassins de production ruraux aux acheteurs urbains et industriels par précommandes fermes, nous réduisons le gaspillage alimentaire de nos terroirs.',
    },
    {
      title: 'Sécurisation Monétaire Bi-Devise',
      icon: '💵',
      description:
        'Gestion transparente du Franc Congolais (CDF) et du Dollar Américain (USD). Le taux de change est gravé et figé au moment de la transaction, protégeant vendeurs et acheteurs.',
    },
    {
      title: 'Inclusion des Petits Producteurs',
      icon: '🤝',
      description:
        'Paiements certifiés via Mobile Money (M-Pesa, Orange Money, Airtel Money, Afrimoney), accessibles même dans les zones rurales reculées sans compte bancaire classique.',
    },
  ];

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="À Propos d'AgroConnect"
        subtitle="L'infrastructure numérique au service de la souveraineté alimentaire et de la valorisation paysanne en République Démocratique du Congo."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'À Propos' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
              Notre Mission en RDC
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
              Bâtir un pont équitable entre la terre congolaise et les centres de consommation.
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal">
              La République Démocratique du Congo possède un potentiel agricole colossal capable de nourrir l&apos;Afrique entière. Pourtant, le cloisonnement des provinces, l&apos;absence de données fiables sur les stocks et la multiplication des intermédiaires informels ont longtemps fragilisé les paysans et renchéri le coût du panier de la ménagère à Kinshasa, Lubumbashi ou Goma.
            </p>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal">
              <strong>AgroConnect</strong> est né pour briser ces barrières géographiques et économiques en fournissant une plateforme transactionnelle neutre, sécurisée et adaptée aux réalités congolaises.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-96 w-full rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              <Image
                src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800"
                alt="Agriculteurs congolais au travail"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="pt-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-2xl font-black text-stone-900 mb-3">Nos Principes Fondateurs</h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Chaque ligne de code et chaque processus opérationnel d&apos;AgroConnect répondent à ces quatre engagements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p) => (
              <div key={p.title} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-3xl p-3 bg-stone-50 rounded-xl inline-block mb-4">{p.icon}</span>
                  <h4 className="text-base font-bold text-stone-900 mb-2">{p.title}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage 26 Provinces */}
        <div className="bg-emerald-950 text-white rounded-3xl p-8 sm:p-12 border border-emerald-900">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Présence Nationale</span>
            <h3 className="text-3xl font-black mt-2 mb-3">Couverture des 26 Provinces de la RDC</h3>
            <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
              AgroConnect connecte l&apos;ensemble des bassins fluviaux, ferroviaires et routiers de la République Démocratique du Congo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {DRC_PROVINCES.map((prov) => (
              <span
                key={prov}
                className="bg-emerald-900/60 text-emerald-200 border border-emerald-800/80 px-3 py-1.5 rounded-lg font-medium"
              >
                📍 {prov}
              </span>
            ))}
          </div>
        </div>

        {/* CTA Join */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-stone-200 text-center max-w-3xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-black text-stone-900 mb-4">
            Rejoignez la Révolution Agricole Congolaise
          </h3>
          <p className="text-sm text-stone-600 mb-8 max-w-xl mx-auto leading-relaxed">
            Que vous soyez agriculteur à Kikwit, grossiste à Matadi, meunier à Lubumbashi ou distributeur à Kinshasa, AgroConnect est votre outil commercial.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/inscription">
              <Button variant="accent" size="lg">
                Créer un compte professionnel
              </Button>
            </Link>
            <Link href="/catalogue">
              <Button variant="outline" size="lg">
                Consulter les offres
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

