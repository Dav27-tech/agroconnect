'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DRC_PROVINCES } from '../../constants/drc';
import { IconCart, IconCheck, IconPlant, IconShieldCheck, IconPhone } from '../../components/ui/Icons';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('Kinshasa');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const redirectCandidate = searchParams.get('redirect');
  const redirectPath = redirectCandidate?.startsWith('/') ? redirectCandidate : '';

  const roleOptions: Array<{ role: 'BUYER' | 'SELLER'; title: string; desc: string; icon: React.ReactNode }> = [
    {
      role: 'BUYER',
      title: 'Acheteur',
      desc: 'Parcourir les produits agricoles et commander selon vos besoins.',
      icon: <IconCart className="w-6 h-6" aria-hidden="true" />,
    },
    {
      role: 'SELLER',
      title: 'Agriculteur / Vendeur',
      desc: 'Publier et vendre directement mes récoltes.',
      icon: <IconPlant className="w-6 h-6" aria-hidden="true" />,
    },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await register({
        phoneNumber: phone,
        fullName,
        password,
        email,
        role: selectedRole,
        province,
        city,
      });

      setRegistered(true);
      setTimeout(() => {
        if (redirectPath) {
          router.push(redirectPath);
          return;
        }
        if (selectedRole === 'SELLER') {
          router.push('/vendeur/dashboard');
        } else {
          router.push('/catalogue');
        }
      }, 1500);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Erreur lors de l\'inscription. Veuillez vérifier les informations saisies.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Créer votre compte
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600">
            Créez un compte acheteur ou agriculteur avec votre adresse email.
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
                Bienvenue sur AgroConnect RDC, {fullName}. Votre profil a été enregistré avec succès. Redirection en cours...
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Link href={redirectPath || (selectedRole === 'SELLER' ? '/vendeur/dashboard' : '/catalogue')}>
                  <Button variant="primary" size="md" className="w-full">
                    {selectedRole === 'SELLER' ? 'Accéder à mon Espace Vendeur' : 'Explorer le Catalogue'}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Sélection du Profil / Rôle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Votre activité sur la plateforme *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roleOptions.map((opt) => {
                    const isSelected = selectedRole === opt.role;
                    return (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => setSelectedRole(opt.role)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-emerald-800 bg-emerald-50/60 ring-2 ring-emerald-800/20'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className={isSelected ? 'text-emerald-800' : 'text-stone-400'}>
                          {opt.icon}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-bold text-stone-900 leading-tight">{opt.title}</p>
                          <p className="text-[10px] text-stone-500 mt-1 line-clamp-2">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nom & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Adresse email *"
                  placeholder="vous@exemple.com"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Nom complet ou Coopérative *"
                  placeholder="ex: Papa Jean-Pierre Kabamba"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <Input
                  label="Numéro de Téléphone (RDC) *"
                  placeholder="+243818001122"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<IconPhone className="w-4 h-4 text-stone-400" />}
                />
              </div>

              {/* Localisation RDC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Province d&apos;activité (RDC) *
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                  >
                    {DRC_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Ville ou Territoire *"
                  placeholder="ex: Kikwit, Masina, Lubumbashi..."
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {/* Mot de passe */}
              <Input
                label="Mot de passe sécurisé *"
                type="password"
                placeholder="Au moins 10 caractères"
                minLength={10}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Conditions */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                    required
                  />
                  <span>
                    J&apos;accepte les{' '}
                    <Link href="/a-propos" className="text-emerald-800 underline font-bold">
                      Conditions d&apos;utilisation
                    </Link>{' '}
                    d&apos;AgroConnect RDC.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full cursor-pointer"
                disabled={!agreeTerms}
                isLoading={isLoading}
              >
                Créer mon compte AgroConnect
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-stone-100 text-center text-xs text-stone-500">
            <span>Vous avez déjà un compte ? </span>
            <Link href="/connexion" className="text-emerald-800 hover:text-emerald-900 font-bold">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <IconShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Session sécurisée • Acheteurs et agriculteurs</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-stone-600">
          Chargement de la page d’inscription…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
