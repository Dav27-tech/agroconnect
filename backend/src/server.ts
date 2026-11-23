import { createApp } from './app.js';
import { env } from './config/env.js';
import { dbManager } from './database/client.js';
import { createServer } from 'node:http';
import { closeRealtime, initializeRealtime } from './common/realtime.js';

async function bootstrap() {
  // Initialisation de la base de données
  const databaseConnected = await dbManager.connect();
  if (!databaseConnected) {
    throw new Error('Le démarrage du backend nécessite une connexion PostgreSQL');
  }

  const app = createApp();
  const server = createServer(app);
  initializeRealtime(server);
  server.listen(env.PORT, () => {
    console.log('====================================================');
    console.log(`🌾 Serveur AgroConnect Backend démarré avec succès !`);
    console.log(`📍 Port d'écoute : http://localhost:${env.PORT}`);
    console.log(`🇨🇩 Périmètre : République Démocratique du Congo (RDC)`);
    console.log('💱 Devise de la plateforme : CDF');
    console.log(`🩺 Health check : http://localhost:${env.PORT}/api/health`);
    console.log(`📦 API Base : http://localhost:${env.PORT}/api/v1`);
    console.log('====================================================');
  });

  // Gestion de l'arrêt gracieux
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Signal ${signal} reçu. Fermeture gracieuse du serveur...`);
    await closeRealtime();
    await dbManager.disconnect();
    console.log('✅ Serveur AgroConnect arrêté proprement.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('❌ Échec critique lors du démarrage du serveur :', error);
  process.exit(1);
});

