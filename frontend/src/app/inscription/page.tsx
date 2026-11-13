'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DRC_PROVINCES } from '../../constants/drc';
import { IconCart, IconCheck, IconPlant, IconShieldCheck, IconPhone, IconTruck } from '../../components/ui/Icons';
import { UserRole } from '../../types';

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('BUYER');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Kinshasa');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const roleOptions: Array<{ role: UserRole; title: string; desc: string; icon: React.ReactNode }> = [
    {
      role: 'BUYER',
      title: 'Acheteur (Particulier ou Pro)',
      desc: 'Commander des récoltes et intrants au détail ou en gros.',
      icon: <IconCart className="w-6 h-6" aria-hidden="true" />,
    },
    {
      role: 'SELLER',
      title: 'Agriculteur / Producteur',
      desc: 'Vendre mes récoltes directes aux meilleurs prix sans intermédiaire.',
      icon: <IconPlant className="w-6 h-6" aria-hidden="true" />,
    },
    {
      role: 'DELIVERY_PROVIDER',
      title: 'Transporteur & Logistique',
      desc: 'Prendre en charge l\'acheminement et le fret urbain ou inter-provinces.',
      icon: <IconTruck className="w-6 h-6" aria-hidden="true" />,
    },
  ];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setRegistered(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
            <IconPlant className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black text-stone-900">
            Agro<span className="text-orange-600">Connect</span>
          </span>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Créer votre compte AgroConnect
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600">
            Rejoignez la première communauté agricole numérique en République Démocratique du Congo.
          </p>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-stone-200 shadow-xl">
          {registered ? (
            <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-4">
              <span className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <IconCheck className="w-8 h-8" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-black text-emerald-950">
                Compte Créé avec Succès !
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                Bienvenue sur AgroConnect RDC, {fullName}. Votre profil a été enregistré avec le numéro {phone} dans la province de {province}.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Link href="/catalogue">
                  <Button variant="primary" size="md" className="w-full">
                    Explorer le Catalogue
                  </Button>
                </Link>
                <Link href="/connexion">
                  <Button variant="outline" size="sm" className="w-full">
                    Se connecter à mon compte
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">
                  1. Votre Profil sur la Plateforme *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {roleOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.role}
                      onClick={() => setSelectedRole(opt.role)}
                      aria-pressed={selectedRole === opt.role}
                      className={`w-full text-left p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${selectedRole === opt.role
                          ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-700/20'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                        }`}
                    >
                      <div>
                        <span className="text-emerald-800 mb-1.5 block">{opt.icon}</span>
                        <h4 className="text-xs font-bold text-stone-900 leading-tight mb-1">
                          {opt.title}
                        </h4>
                        <p className="text-[10px] text-stone-500 leading-snug">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal & Business Info */}
              <div className="space-y-4 pt-4 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  2. Coordonnées en RDC
                </label>

                <Input
                  label="Nom complet ou Dénomination Commerciale *"
                  placeholder="Ex: Coopérative Agricole de Bandundu"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <Input
                  label="Numéro de Téléphone (Mobile Money) *"
                  placeholder="+243 81..."
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<IconPhone className="w-4 h-4 text-stone-400" />}
                  helperText="Sert d'identifiant de connexion et de réception des paiements"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Province RDC *
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
                  <Input
                    label="Ville ou Territoire *"
                    placeholder="Ex: Kikwit, Goma, Limete..."
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <Input
                  label="Mot de passe sécurisé *"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Au moins 6 caractères recommandés"
                />
              </div>

              {/* Agreement checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-600 leading-relaxed">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>
                    J&apos;accepte les conditions d&apos;AgroConnect et je reconnais la règle d&apos;intermédiation stricte (chaque vendeur gère souverainement ses stocks et ses prix en RDC).
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full shadow-md"
                isLoading={isLoading}
                disabled={!agreeTerms}
              >
                Créer mon compte AgroConnect
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-stone-100 text-center text-xs text-stone-500">
            <span>Vous possédez déjà un compte ? </span>
            <Link href="/connexion" className="text-emerald-800 hover:text-emerald-900 font-bold">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <IconShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Plateforme agricole vérifiée • 26 Provinces de la République Démocratique du Congo</span>
        </div>
      </div>
    </div>
  );
}
