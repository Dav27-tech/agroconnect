'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { IconCheck, IconEye, IconEyeOff, IconShieldCheck } from '../../components/ui/Icons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const redirectCandidate = searchParams.get('redirect');
  const redirectPath = redirectCandidate?.startsWith('/') ? redirectCandidate : '';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.mustChangePassword) {
        router.replace('/compte/mot-de-passe');
        return;
      }
      setSuccess(true);
      const destination = loggedInUser.roles.includes('SUPER_ADMIN')
        ? '/super-admin'
        : loggedInUser.roles.includes('ADMIN')
          ? '/admin'
          : loggedInUser.roles.includes('DELIVERY_PERSON')
          ? '/livreur'
          : loggedInUser.roles.includes('SELLER')
            ? '/vendeur/dashboard'
            : redirectPath || '/catalogue';
      setTimeout(() => {
        router.push(destination);
      }, 1200);
    } catch (err) {
      setErrorMessage(
        (err as Error).message || 'Échec de connexion. Vérifiez votre adresse email ou votre mot de passe.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-black tracking-tight text-stone-900">
          Connexion à votre espace
        </h1>
        <p className="mt-2 text-center text-xs text-stone-600 font-medium">
          Accédez à vos commandes ou à votre espace agriculteur
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-stone-200 shadow-lg">
          {success ? (
            <div className="p-6 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
              <span className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <IconCheck className="w-7 h-7" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-emerald-950">Connexion Réussie !</h3>
              <p className="text-xs text-emerald-800">
                Bienvenue sur AgroConnect RDC. Redirection en cours...
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              <Input
                label="Adresse email *"
                placeholder="vous@exemple.com"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div>
                <Input
                  label="Mot de passe *"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Saisissez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showPassword}
                      title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="rounded text-stone-500 hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 cursor-pointer"
                    >
                      {showPassword ? (
                        <IconEyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <IconEye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  }
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                  <input type="checkbox" className="rounded text-emerald-800 focus:ring-emerald-700" defaultChecked />
                  <span>Se souvenir de moi</span>
                </label>
                <Link href="/contact" className="text-emerald-800 hover:text-emerald-900 font-bold">
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full cursor-pointer"
                isLoading={isLoading}
              >
                Se connecter
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-stone-100 text-center text-xs text-stone-500">
            <span>Vous n&apos;avez pas encore de compte ? </span>
            <Link
              href={redirectPath ? `/inscription?redirect=${encodeURIComponent(redirectPath)}` : '/inscription'}
              className="text-orange-600 hover:text-orange-700 font-bold"
            >
              Créer un compte
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <IconShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Plateforme sécurisée • RDC République Démocratique du Congo</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-stone-600">
          Chargement de la page de connexion…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
