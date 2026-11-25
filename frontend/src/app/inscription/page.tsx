'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DRC_PROVINCES } from '../../constants/drc';
import {
  IconAlert,
  IconCart,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLeaf,
  IconLocation,
  IconPhone,
  IconPlant,
  IconShieldCheck,
} from '../../components/ui/Icons';

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
  const [showPassword, setShowPassword] = useState(false);
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
      desc: 'Découvrir les produits locaux et passer commande.',
      icon: <IconCart className="h-5 w-5" aria-hidden="true" />,
    },
    {
      role: 'SELLER',
      title: 'Agriculteur / vendeur',
      desc: 'Présenter mes récoltes et vendre directement.',
      icon: <IconPlant className="h-5 w-5" aria-hidden="true" />,
    },
  ];

  const destination = redirectPath || (selectedRole === 'SELLER' ? '/vendeur/dashboard' : '/catalogue');

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!agreeTerms) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await register({
        phoneNumber: phone.trim(),
        fullName: fullName.trim(),
        password,
        email: email.trim(),
        role: selectedRole,
        province,
        city: city.trim(),
      });

      setRegistered(true);
      setTimeout(() => router.push(destination), 1500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de l’inscription. Veuillez vérifier les informations saisies.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#f5f7f2] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-12 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 transition hover:text-emerald-800">
            <span aria-hidden="true">←</span>
            Retour à l’accueil
          </Link>
          <span className="hidden items-center gap-2 text-[11px] font-semibold text-stone-500 sm:inline-flex">
            <IconShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            Inscription sécurisée
          </span>
        </div>

        <div className="grid overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(28,54,38,0.28)] lg:min-h-[690px] lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="relative isolate overflow-hidden bg-emerald-950 px-6 py-8 text-white sm:px-9 sm:py-10 lg:flex lg:flex-col lg:justify-between lg:px-11 lg:py-12">
            <div aria-hidden="true" className="absolute -right-28 -top-24 -z-10 h-80 w-80 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -right-14 -top-10 -z-10 h-52 w-52 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-16 -z-10 h-72 w-72 rounded-full bg-emerald-800/50 blur-2xl" />

            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                <IconLeaf className="h-4 w-4" aria-hidden="true" />
                Le marché agricole congolais
              </span>
              <h1 className="mt-7 max-w-md text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                Connectons les récoltes aux bonnes opportunités.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-emerald-100/85">
                Un espace simple pour acheter auprès des producteurs ou faire connaître vos produits partout en RDC.
              </p>
            </div>

            <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-2 lg:mt-12 lg:grid-cols-1">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-100">
                  <IconLocation className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold">Ancré dans vos régions</p>
                  <p className="mt-1 text-[11px] leading-5 text-emerald-100/75">
                    Situez votre activité et vos produits en RDC.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-100">
                  <IconShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold">Un profil adapté à votre rôle</p>
                  <p className="mt-1 text-[11px] leading-5 text-emerald-100/75">
                    Choisissez votre espace : acheteur ou agriculteur.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 hidden items-center gap-3 border-t border-white/10 pt-5 sm:flex lg:mt-10">
              <div aria-hidden="true" className="flex h-1.5 w-14 overflow-hidden rounded-full">
                <span className="flex-1 bg-[#007fff]" />
                <span className="flex-1 bg-[#f7d618]" />
                <span className="flex-1 bg-[#ce1021]" />
              </div>
              <p className="text-[10px] font-medium tracking-wide text-emerald-100/70">
                Pensé pour les acteurs agricoles de la RDC
              </p>
            </div>
          </aside>

          <div className="px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
            {registered ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 ring-8 ring-emerald-50">
                  <IconCheck className="h-8 w-8" aria-hidden="true" />
                </span>
                <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                  Inscription terminée
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
                  Bienvenue, {fullName}.
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-stone-500">
                  Votre compte {selectedRole === 'SELLER' ? 'agriculteur' : 'acheteur'} est prêt. Vous allez être redirigé vers votre espace.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="mt-7 min-w-56"
                  onClick={() => router.push(destination)}
                >
                  {selectedRole === 'SELLER' ? 'Accéder à mon espace vendeur' : 'Explorer le catalogue'}
                </Button>
                <p className="mt-3 text-xs text-stone-400">Redirection en cours…</p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                    Rejoindre AgroConnect
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
                    Créez votre compte
                  </h2>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  {errorMessage && (
                    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800">
                      <IconAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  <fieldset>
                    <legend className="mb-2.5 text-xs font-bold text-stone-800">
                      Comment allez-vous utiliser AgroConnect ?
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {roleOptions.map((option) => {
                        const isSelected = selectedRole === option.role;
                        return (
                          <button
                            key={option.role}
                            type="button"
                            onClick={() => setSelectedRole(option.role)}
                            aria-pressed={isSelected}
                            className={`group relative flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                              isSelected
                                ? 'border-emerald-700 bg-emerald-50/70 shadow-sm'
                                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isSelected ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-500 group-hover:text-emerald-800'
                            }`}>
                              {option.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-stone-900">{option.title}</span>
                              <span className="mt-1 block text-[11px] leading-4 text-stone-500">{option.desc}</span>
                            </span>
                            {isSelected && (
                              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white">
                                <IconCheck className="h-3 w-3" aria-hidden="true" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <h3 className="mb-3 text-xs font-bold text-stone-800">Vos informations</h3>
                    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                      <Input
                        label="Adresse e-mail *"
                        placeholder="vous@exemple.com"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        helperText="Utilisée pour vous connecter."
                        className="py-3"
                      />
                      <Input
                        label={selectedRole === 'SELLER' ? 'Nom complet ou coopérative *' : 'Nom complet *'}
                        placeholder={selectedRole === 'SELLER' ? 'Ex. Coopérative du Kivu' : 'Ex. Jean-Pierre Kabamba'}
                        autoComplete="name"
                        autoCapitalize="words"
                        required
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="py-3"
                      />
                      <Input
                        label="Téléphone (RDC) *"
                        placeholder="+243 810 000 000"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        leftIcon={<IconPhone className="h-4 w-4 text-stone-400" aria-hidden="true" />}
                        className="py-3"
                      />
                      <Input
                        label="Ville ou territoire *"
                        placeholder="Ex. Goma, Kikwit, Masina"
                        autoComplete="address-level2"
                        required
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        leftIcon={<IconLocation className="h-4 w-4 text-stone-400" aria-hidden="true" />}
                        className="py-3"
                      />
                      <div>
                        <label htmlFor="registration-province" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                          Province d&apos;activité *
                        </label>
                        <select
                          id="registration-province"
                          value={province}
                          onChange={(event) => setProvince(event.target.value)}
                          autoComplete="address-level1"
                          required
                          className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm font-medium text-stone-800 shadow-xs transition focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                        >
                          {DRC_PROVINCES.map((provinceName) => (
                            <option key={provinceName} value={provinceName}>{provinceName}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Mot de passe *"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Au moins 10 caractères"
                        autoComplete="new-password"
                        minLength={10}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        helperText="Choisissez un mot de passe difficile à deviner."
                        className="py-3"
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            aria-pressed={showPassword}
                            className="rounded text-stone-500 transition hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                          >
                            {showPassword
                              ? <IconEyeOff className="h-5 w-5" aria-hidden="true" />
                              : <IconEye className="h-5 w-5" aria-hidden="true" />}
                          </button>
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-stone-100 pt-4">
                    <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-stone-600">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(event) => setAgreeTerms(event.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
                        required
                      />
                      <span>
                        J&apos;accepte les{' '}
                        <Link href="/a-propos" className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
                          conditions d&apos;utilisation
                        </Link>{' '}
                        d&apos;AgroConnect.
                      </span>
                    </label>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={!agreeTerms}
                      isLoading={isLoading}
                    >
                      Créer mon compte
                    </Button>
                  </div>
                </form>

                <div className="mt-6 border-t border-stone-100 pt-5 text-center text-xs text-stone-500">
                  <span>Vous avez déjà un compte ? </span>
                  <Link
                    href={redirectPath ? `/connexion?redirect=${encodeURIComponent(redirectPath)}` : '/connexion'}
                    className="font-bold text-emerald-800 transition hover:text-emerald-950"
                  >
                    Se connecter
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-stone-500">
          <IconShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          Vos informations sont utilisées pour créer et gérer votre compte AgroConnect.
        </p>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-stone-50 text-sm text-stone-600">
          Chargement de la page d’inscription…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
