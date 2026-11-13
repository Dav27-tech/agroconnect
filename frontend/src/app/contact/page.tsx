'use client';

import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DRC_PROVINCES } from '../../constants/drc';
import { IconLocation, IconPhone, IconMail, IconBuilding } from '../../components/ui/Icons';

export default function ContactPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('Kinshasa');
  const [subject, setSubject] = useState('QUESTION_COMMANDE');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  const offices = [
    {
      city: 'Kinshasa (Siège Opérationnel)',
      address: 'Avenue Colonel Mondjiba, Concession Utexafrica, Ngaliema',
      phone: '+243 810 000 001 / +243 825 000 002',
      email: 'kinshasa@agroconnect.cd',
      hours: 'Lundi - Samedi : 07h30 - 18h00',
    },
    {
      city: 'Lubumbashi (Antenne Grand Katanga)',
      address: 'Avenue Sendwe, Quartier Makutano, Centre des Affaires',
      phone: '+243 970 000 003',
      email: 'katanga@agroconnect.cd',
      hours: 'Lundi - Vendredi : 08h00 - 17h00',
    },
    {
      city: 'Goma (Point Relais Kivu)',
      address: 'Avenue de la Paix, Quartier Himbi, Proche Port Public',
      phone: '+243 994 000 004',
      email: 'kivu@agroconnect.cd',
      hours: 'Lundi - Samedi : 08h00 - 16h30',
    },
  ];

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Contact & Support AgroConnect RDC"
        subtitle="Nos équipes d'assistance agronomique, commerciale et logistique sont à votre écoute pour vous accompagner dans toutes vos opérations."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Contact' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-stone-200 shadow-xs">
            <h2 className="text-2xl font-black text-stone-900 mb-2">
              Envoyez-nous un Message
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mb-8 leading-relaxed">
              Remplissez ce formulaire et notre service d&apos;assistance vous répondra sous 24 heures ouvrées.
            </p>

            {submitted ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <span className="text-4xl">✉️</span>
                <h3 className="text-lg font-bold text-emerald-950">
                  Message Transmis avec Succès !
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                  Merci {fullName}. Notre conseiller commercial pour la province de {province} a bien reçu votre demande et vous contactera au {phone}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="mt-4"
                >
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nom complet ou Raison Sociale *"
                    placeholder="Ex: Patient Kalala"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <Input
                    label="Numéro de Téléphone (RDC) *"
                    placeholder="+243 81..."
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Adresse Email"
                    type="email"
                    placeholder="contact@exemple.cd"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Province d&apos;activité (RDC) *
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl p-3 outline-none cursor-pointer"
                    >
                      {DRC_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Objet de la Demande *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl p-3 outline-none cursor-pointer"
                  >
                    <option value="QUESTION_COMMANDE">Suivi d&apos;une commande ou livraison de fret</option>
                    <option value="INSCRIPTION_VENDEUR">Devenir Producteur ou Revendeur Agréé</option>
                    <option value="ACHAT_B2B_GROS">Demande de cotation pour achat industriel (B2B)</option>
                    <option value="PARTENARIAT_TRANSPORT">Proposer un service de transport / logistique</option>
                    <option value="AUTRE">Autre renseignement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Votre Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Décrivez votre besoin en détaillant la culture, le volume ou votre question..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-xl p-3.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Envoyer le message
                </Button>
              </form>
            )}
          </div>

          {/* Offices and Support info */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-xl font-bold text-stone-900">Nos Bureaux en RDC</h2>

            {offices.map((office) => (
              <div
                key={office.city}
                className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-2.5 text-xs text-stone-600"
              >
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <IconBuilding className="w-4 h-4 text-emerald-800" />
                  {office.city}
                </h3>
                <p className="flex items-start gap-2">
                  <IconLocation className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  <span>{office.address}</span>
                </p>
                <p className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-emerald-800 shrink-0" />
                  <strong className="text-stone-800">{office.phone}</strong>
                </p>
                <p className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>{office.email}</span>
                </p>
                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                  Horaires : {office.hours}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
