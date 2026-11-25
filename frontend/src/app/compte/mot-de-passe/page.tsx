'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { IconCheck, IconEye, IconEyeOff, IconShieldCheck } from '../../../components/ui/Icons';

function getUserHome(roles: string[]): string {
  if (roles.includes('SUPER_ADMIN')) return '/super-admin';
  if (roles.includes('ADMIN')) return '/admin';
  if (roles.includes('DELIVERY_PERSON')) return '/livreur';
  if (roles.includes('SELLER')) return '/vendeur/dashboard';
  return '/catalogue';
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/connexion?redirect=%2Fcompte%2Fmot-de-passe');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    if (newPassword !== confirmPassword) {
      setErrorMessage('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 10) {
      setErrorMessage('Le nouveau mot de passe doit comporter au moins 10 caractères.');
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setIsComplete(true);
      window.setTimeout(() => router.replace(getUserHome(user?.roles ?? [])), 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier le mot de passe.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !isAuthenticated || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-stone-50 px-4">
        <p role="status" className="text-sm font-medium text-stone-600">Vérification de votre session…</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-stone-50 px-4 py-12 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />

      <section className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_24px_70px_-35px_rgba(28,54,38,0.3)] sm:p-9">
        {isComplete ? (
          <div className="py-7 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <IconCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-black tracking-tight text-stone-900">Mot de passe modifié</h1>
            <p className="mt-2 text-sm text-stone-500">Votre compte est sécurisé. Redirection vers votre espace…</p>
          </div>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <IconShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
              Sécurité du compte
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Modifier le mot de passe
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {user.mustChangePassword
                ? 'Pour protéger votre compte, choisissez un nouveau mot de passe avant de continuer.'
                : 'Utilisez un mot de passe unique d’au moins 10 caractères.'}
            </p>
            <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
              {errorMessage && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {errorMessage}
                </div>
              )}
              <Input
                label="Mot de passe actuel *"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <Input
                label="Nouveau mot de passe *"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={10}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                helperText="10 caractères minimum."
              />
              <Input
                label="Confirmer le nouveau mot de passe *"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPasswords((visible) => !visible)}
                    aria-label={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                    aria-pressed={showPasswords}
                    className="rounded text-stone-500 hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                  >
                    {showPasswords
                      ? <IconEyeOff className="h-5 w-5" aria-hidden="true" />
                      : <IconEye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                }
              />
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSaving}>
                Enregistrer le nouveau mot de passe
              </Button>
            </form>

            {!user.mustChangePassword && (
              <div className="mt-5 text-center">
                <Link href={getUserHome(user.roles)} className="text-xs font-bold text-emerald-800 hover:underline">
                  Annuler et retourner à mon espace
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
