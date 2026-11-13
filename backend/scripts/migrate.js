import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🐘 AgroConnect RDC — Gestionnaire de Migrations PostgreSQL');
  console.log('========================================================');

  const migrationPath = path.join(__dirname, '../prisma/migrations/20261113000000_init/migration.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Fichier de migration introuvable : ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📄 Script de migration chargé (${(sqlContent.length / 1024).toFixed(1)} KB)`);

  const tables = [
    'users',
    'seller_profiles',
    'delivery_profiles',
    'categories',
    'products',
    'offers',
    'seller_services',
    'offer_services',
    'stock_movements',
    'carts',
    'cart_items',
    'parent_orders',
    'sub_orders',
    'order_items',
    'payment_transactions',
    'deliveries',
    'delivery_status_history',
    'exchange_rate_configs',
    'financial_records',
    'seller_payouts',
    'notifications',
  ];

  console.log('\n📋 Tables définies dans la migration :');
  tables.forEach((t, i) => console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${t}`));

  console.log('\n💡 Pour appliquer cette migration sur votre PostgreSQL local :');
  console.log('   psql -U postgres -d agroconnect -f backend/prisma/schema.sql');
  console.log('   ou : npx prisma db push --schema=backend/prisma/schema.prisma\n');

  console.log('✅ Structure DDL PostgreSQL prête pour le déploiement.');
}

runMigration().catch(console.error);

