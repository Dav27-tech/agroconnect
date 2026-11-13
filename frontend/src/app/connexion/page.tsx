'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { IconCheck, IconPhone, IconPlant, IconShieldCheck } from '../../components/ui/Icons';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('+243818001122');
  const [password, setPassword] = useState('AdminAgro2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(phone, password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/catalogue');
      }, 1200);
    } catch (err) {
      setErrorMessage(
        (err as Error).message || 'Échec de connexion. Vérifiez votre numéro de téléphone ou votre mot de passe.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
            <IconPlant className="w-7 h-7" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black text-stone-900">
            Agro<span className="text-orange-600">Connect</span>
          </span>
        </Link>
        <h1 className="text-center text-2xl font-black tracking-tight text-stone-900">
          Connexion à votre espace
        </h1>
        <p className="mt-2 text-center text-xs text-stone-600 font-medium">
          Accédez à vos commandes, vos ventes ou votre espace logistique RDC
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
              <div className="pt-2 flex flex-col gap-2">
                <Link href="/vendeur/dashboard">
                  <Button variant="primary" size="sm" className="w-full">
                    🌾 Accéder à l&apos;Espace Vendeur
                  </Button>
                </Link>
                <Link href="/catalogue">
                  <Button variant="outline" size="sm" className="w-full">
                    Voir le Catalogue Produits
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              <Input
                label="Numéro de Téléphone (RDC) *"
                placeholder="+243 81 234 5678"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<IconPhone className="w-4 h-4 text-stone-400" />}
                helperText="Format : +243 suivi de votre numéro (Vodacom, Orange, Airtel, Africell)"
              />

              <div>
                <Input
                  label="Mot de passe *"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-stone-500 hover:text-stone-800 font-medium focus:outline-none cursor-pointer"
                    >
                      {showPassword ? 'Masquer' : 'Afficher'}
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
            <Link href="/inscription" className="text-orange-600 hover:text-orange-700 font-bold">
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
