'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { IconCheck, IconMail, IconPhone, IconShieldCheck, IconUser } from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AdminAccount } from '../../types';

const fieldClassName = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100';

export default function SuperAdminPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingAdminId, setUpdatingAdminId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', password: '' });

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSuperAdmin) {
      router.replace('/connexion?redirect=%2Fsuper-admin');
      return;
    }

    let active = true;
    api.superAdmin.listAdmins()
      .then((result) => {
        if (active) setAdmins(result);
      })
      .catch((error) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les administrateurs.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthLoading, isSuperAdmin, router]);

  const createAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const admin = await api.superAdmin.createAdmin(form);
      setAdmins((current) => [admin, ...current]);
      setForm({ fullName: '', email: '', phoneNumber: '', password: '' });
      setSuccessMessage('Le compte administrateur a été créé et activé.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de créer ce compte administrateur.');
    } finally {
      setIsCreating(false);
    }
  };

  const updateAdminStatus = async (admin: AdminAccount) => {
    setUpdatingAdminId(admin.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const updated = await api.superAdmin.updateAdminStatus(admin.id, !admin.isActive);
      setAdmins((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccessMessage(updated.isActive ? 'Compte administrateur activé.' : 'Compte administrateur désactivé.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier ce compte administrateur.');
    } finally {
      setUpdatingAdminId(null);
    }
  };

  if (isAuthLoading || (!isSuperAdmin && isLoading)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm font-medium text-stone-500">Vérification des accès…</div>;
  }
  if (!isSuperAdmin) return null;

  return (
    <main className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title="Espace Super Admin"
        subtitle="Créez les comptes administrateurs et contrôlez leur accès à la plateforme."
        badge={
          <span className="rounded-full bg-amber-100 p-2 text-amber-800">
            <IconShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
        }
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
        <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Nouvel accès</p>
            <h2 className="mt-1 text-xl font-black text-stone-900">Créer un administrateur</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Le compte sera actif dès sa création. L’administrateur se connectera avec son adresse email.</p>
          </div>

          <form onSubmit={createAdmin} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">Nom complet</span>
              <span className="relative block">
                <IconUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <input className={`${fieldClassName} pl-10`} required minLength={2} autoComplete="name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">Adresse email</span>
              <span className="relative block">
                <IconMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <input className={`${fieldClassName} pl-10`} type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">Téléphone RDC</span>
              <span className="relative block">
                <IconPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <input className={`${fieldClassName} pl-10`} type="tel" required placeholder="+243…" autoComplete="tel" value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">Mot de passe temporaire</span>
              <input className={fieldClassName} type="password" required minLength={12} autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              <span className="block text-[11px] text-stone-500">12 caractères minimum. Transmettez-le au nouvel administrateur de façon sécurisée.</span>
            </label>
            <Button type="submit" variant="primary" isLoading={isCreating} className="w-full">
              Créer le compte
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Accès existants</p>
              <h2 className="mt-1 text-xl font-black text-stone-900">Administrateurs</h2>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">{admins.length} compte(s)</span>
          </div>

          {errorMessage && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</div>
          )}
          {successMessage && (
            <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <IconCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <p className="py-12 text-center text-sm text-stone-500">Chargement des comptes…</p>
          ) : admins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 px-4 py-12 text-center">
              <IconUser className="mx-auto h-8 w-8 text-stone-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-stone-800">Aucun administrateur secondaire</p>
              <p className="mt-1 text-xs text-stone-500">Le premier compte peut être créé avec le formulaire.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {admins.map((admin) => (
                <li key={admin.id} className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-stone-900">{admin.fullName}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${admin.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                        {admin.isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-stone-600">{admin.email || 'Aucune adresse email'}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{admin.phoneNumber}</p>
                  </div>
                  <Button
                    type="button"
                    variant={admin.isActive ? 'secondary' : 'primary'}
                    size="sm"
                    isLoading={updatingAdminId === admin.id}
                    disabled={updatingAdminId !== null}
                    onClick={() => void updateAdminStatus(admin)}
                  >
                    {admin.isActive ? 'Désactiver' : 'Activer'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
