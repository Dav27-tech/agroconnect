'use client';

import React, { useState } from 'react';
import { ValidationError, useForm } from '@formspree/react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DRC_PROVINCES } from '../../constants/drc';
import { IconLocation, IconPhone, IconMail, IconBuilding } from '../../components/ui/Icons';

function ContactForm({ formId }: { formId: string }) {
  const [formState, handleSubmit, resetForm] = useForm(formId);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('Kinshasa');
  const [subject, setSubject] = useState('QUESTION_COMMANDE');
  const [message, setMessage] = useState('');

  return formState.succeeded ? (
    <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
      <IconMail className="w-10 h-10 mx-auto text-emerald-700" aria-hidden="true" />
      <h3 className="text-lg font-bold text-emerald-950">
        Message transmis avec succès !
      </h3>
      <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
        Merci {fullName}. Votre demande pour la province de {province} a bien été envoyée. Nous vous contacterons au {phone}.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          resetForm();
          setFullName('');
          setPhone('');
          setEmail('');
          setProvince('Kinshasa');
          setSubject('QUESTION_COMMANDE');
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
          name="fullName"
          placeholder="Ex: Patient Kalala"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Numéro de Téléphone (RDC) *"
          name="phone"
          type="tel"
          placeholder="+243 81..."
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Adresse Email"
            name="email"
            type="email"
            placeholder="contact@exemple.cd"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <ValidationError field="email" errors={formState.errors} />
        </div>
        <div>
          <label htmlFor="contact-province" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Province d&apos;activité (RDC) *
          </label>
          <select
            id="contact-province"
            name="province"
            required
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl p-3 outline-none cursor-pointer"
          >
            {DRC_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
          Objet de la Demande *
        </label>
        <select
          id="contact-subject"
          name="subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl p-3 outline-none cursor-pointer"
        >
          <option value="QUESTION_COMMANDE">Question sur une commande</option>
          <option value="INSCRIPTION_VENDEUR">Devenir Producteur ou Revendeur Agréé</option>
          <option value="QUESTION_PRODUIT">Question sur un produit ou une offre</option>
          <option value="PARTENARIAT_TRANSPORT">Proposer un service de transport / logistique</option>
          <option value="AUTRE">Autre renseignement</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
          Votre Message *
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          placeholder="Décrivez votre besoin en détaillant la culture, le volume ou votre question..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-xl p-3.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
        <ValidationError field="message" errors={formState.errors} />
      </div>

      <ValidationError errors={formState.errors} />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={formState.submitting}
      >
        Envoyer le message
      </Button>
    </form>
  );
}

export default function ContactPage() {
  const formId = process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID;

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

            {formId ? (
              <ContactForm formId={formId} />
            ) : (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Le formulaire de contact n&apos;est pas configuré. Veuillez réessayer ultérieurement ou nous contacter par téléphone.
              </p>
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
