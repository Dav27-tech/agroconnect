import { createApp } from './app.js';
import { env } from './config/env.js';
import { dbManager } from './database/client.js';

async function bootstrap() {
  // Initialisation de la base de données
  await dbManager.connect();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log('====================================================');
    console.log(`🌾 Serveur AgroConnect Backend démarré avec succès !`);
    console.log(`📍 Port d'écoute : http://localhost:${env.PORT}`);
    console.log(`🇨🇩 Périmètre : République Démocratique du Congo (RDC)`);
    console.log(`💱 Devises : CDF / USD (Taux configuré : 1 USD = ${env.DEFAULT_EXCHANGE_RATE} CDF)`);
    console.log(`🩺 Health check : http://localhost:${env.PORT}/api/health`);
    console.log(`📦 API Base : http://localhost:${env.PORT}/api/v1`);
    console.log('====================================================');
  });

  // Gestion de l'arrêt gracieux
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Signal ${signal} reçu. Fermeture gracieuse du serveur...`);
    server.close(async () => {
      await dbManager.disconnect();
      console.log('✅ Serveur AgroConnect arrêté proprement.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('❌ Échec critique lors du démarrage du serveur :', error);
  process.exit(1);
});

