/**
 * SEED SCRIPT POUR AGROCONNECT RDC
 * Données réelles de développement et démonstration pour la base PostgreSQL
 */

import { AgroStore } from '../src/database/store.js';

export async function seedDatabase() {
  console.log('🌾 AgroConnect RDC : Initialisation des données de seed...');

  // Déclenche le seed du magasin métier
  AgroStore.seed();

  console.log(`✅ Catégories initialisées : ${AgroStore.categories.size}`);
  console.log(`✅ Produits communs catalogue : ${AgroStore.products.size}`);
  console.log(`✅ Utilisateurs créés (multi-rôles) : ${AgroStore.users.size}`);
  console.log(`✅ Profils vendeurs agréés : ${AgroStore.sellerProfiles.size}`);
  console.log(`✅ Offres vendeurs avec stock partagé : ${AgroStore.offers.size}`);
  console.log(`✅ Mouvements de stocks tracés : ${AgroStore.stockMovements.length}`);
  console.log(`✅ Commandes historiques & sous-commandes : ${AgroStore.parentOrders.size}`);
  console.log(`✅ Livraisons et jalons de traçabilité : ${AgroStore.deliveries.size}`);
  console.log(`✅ Taux de change actif : 1 USD = ${AgroStore.getActiveExchangeRate().rate} CDF`);
  console.log('🎉 Seed terminé avec succès !');
}

// Exécution si exécuté directement
if (process.argv[1]?.includes('seed')) {
  seedDatabase().catch(console.error);
}

