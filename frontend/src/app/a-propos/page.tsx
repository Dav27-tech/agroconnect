import Link from 'next/link';
import { PageHeader } from '../../components/layout/PageHeader';
import { IconPlant } from '../../components/ui/Icons';

const steps = [
  {
    number: '01',
    title: 'Les vendeurs publient leurs offres',
    description: 'Les producteurs et vendeurs présentent leurs produits, leurs prix et les quantités disponibles.',
  },
  {
    number: '02',
    title: 'Les acheteurs choisissent',
    description: 'Le catalogue permet de consulter les offres et de passer une commande selon ses besoins.',
  },
  {
    number: '03',
    title: 'La commande est remise',
    description: 'Les modalités de livraison sont précisées pour la commande. Le règlement se fait au livreur, en CDF.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title="À propos d’AgroConnect"
        subtitle="Une plateforme numérique pour consulter des offres agricoles et faciliter les échanges entre vendeurs et acheteurs."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'À propos' },
        ]}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="grid overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs lg:grid-cols-[1.4fr_0.8fr]">
          <div className="p-6 sm:p-9 lg:p-11">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              Le rôle de la plateforme
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-black leading-tight tracking-tight text-stone-900 sm:text-3xl">
              Mettre en relation les offres agricoles et les besoins des acheteurs.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              AgroConnect sert d’intermédiaire numérique : les vendeurs publient leurs produits et les acheteurs
              peuvent les parcourir puis commander. Les produits, leur disponibilité et leurs prix restent sous
              la responsabilité des vendeurs qui les proposent.
            </p>
            <Link
              href="/catalogue"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              Parcourir le catalogue
            </Link>
          </div>

          <div className="flex min-h-56 flex-col items-center justify-center bg-emerald-50 px-6 py-8 text-center lg:min-h-full">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-xs">
              <IconPlant className="h-9 w-9" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-bold text-emerald-950">Une place de marché agricole</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-emerald-900/75">
              Des offres publiées par des vendeurs indépendants, consultables par les acheteurs.
            </p>
          </div>
        </section>

        <section aria-labelledby="fonctionnement-title">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Fonctionnement</p>
            <h2 id="fonctionnement-title" className="mt-2 text-xl font-black tracking-tight text-stone-900 sm:text-2xl">
              De l’offre à la commande
            </h2>
          </div>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.number} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <span className="text-xs font-black tracking-wider text-emerald-800">{step.number}</span>
                <h3 className="mt-3 text-sm font-bold text-stone-900">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-stone-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7" aria-labelledby="informations-title">
          <h2 id="informations-title" className="text-base font-black text-stone-900">À savoir</h2>
          <div className="mt-4 grid gap-4 text-xs leading-5 text-stone-600 sm:grid-cols-3">
            <p><strong className="text-stone-900">Disponibilité :</strong> elle dépend des offres actives et des quantités indiquées par les vendeurs.</p>
            <p><strong className="text-stone-900">Zone :</strong> la livraison dépend de l’adresse et des modalités disponibles pour chaque commande.</p>
            <p><strong className="text-stone-900">Règlement :</strong> le paiement est effectué directement au livreur en francs congolais (CDF), pas en ligne sur la plateforme.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
