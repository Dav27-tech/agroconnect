import React from 'react';
import Link from 'next/link';
import { PAYMENT_METHODS } from '../../constants/drc';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-stone-800">
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                🌾
              </div>
              <span className="text-2xl font-black text-white">
                Agro<span className="text-orange-500">Connect</span> RDC
              </span>
            </div>
            <p className="text-sm text-stone-400 mb-6 leading-relaxed max-w-sm">
              La première place de marché agricole numérique opérant exclusivement en République Démocratique du Congo.
              AgroConnect connecte directement les producteurs, revendeurs agréés et fournisseurs d&apos;intrants aux acheteurs finaux.
            </p>
            <div className="bg-stone-800/80 p-3.5 rounded-lg border border-stone-700 text-xs text-stone-300 leading-relaxed">
              <strong className="text-emerald-400">Règle d&apos;or du modèle d&apos;affaires :</strong> AgroConnect est strictement un intermédiaire de confiance. La plateforme n&apos;achète, ne possède, ne stocke ni ne revend aucun produit. Chaque vendeur gère ses stocks et ses prix.
            </div>
          </div>

          {/* Secteurs Col */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Acteurs du Marché</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link href="#producteurs" className="hover:text-emerald-400 transition">Agriculteurs & Coopératives</Link></li>
              <li><Link href="#revendeurs" className="hover:text-emerald-400 transition">Revendeurs & Grossistes</Link></li>
              <li><Link href="#intrants" className="hover:text-emerald-400 transition">Fournisseurs d&apos;Intrants</Link></li>
              <li><Link href="#acheteurs" className="hover:text-emerald-400 transition">Acheteurs Professionnels (B2B)</Link></li>
              <li><Link href="#transporteurs" className="hover:text-emerald-400 transition">Partenaires Transport & Fret</Link></li>
            </ul>
          </div>

          {/* Villes et Provinces Col */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Couverture Opérationnelle</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>Kinshasa & Bandundu</li>
              <li>Kongo-Central (Matadi / Boma)</li>
              <li>Grand Katanga (Lubumbashi / Kolwezi)</li>
              <li>Grand Kivu (Goma / Bukavu)</li>
              <li>Grand Kasaï (Kananga / Mbuji-Mayi)</li>
              <li>Tshopo (Kisangani)</li>
            </ul>
          </div>

          {/* Paiements Col */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Paiements RDC</h4>
            <p className="text-xs text-stone-400 mb-3">Règlement sécurisé en Francs Congolais (CDF) et Dollars (USD) :</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {PAYMENT_METHODS.map((pm) => (
                <span
                  key={pm.id}
                  className="text-xs bg-stone-800 text-stone-300 px-2.5 py-1 rounded border border-stone-700 font-medium"
                >
                  {pm.name}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-stone-400">
              Taux de transaction garanti et figé au passage de la commande.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-400 gap-4">
          <p>© 2026 AgroConnect RDC. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <span>République Démocratique du Congo</span>
            <span>Support : contact@agroconnect.cd</span>
            <span>FR (Français)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
