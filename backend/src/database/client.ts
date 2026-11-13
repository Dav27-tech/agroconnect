import { env } from '../config/env.js';

export interface DatabaseStatus {
  provider: 'postgresql';
  configuredUrl: string;
  isConnected: boolean;
  message: string;
}

/**
 * Gestionnaire du client de base de données PostgreSQL
 * Conçu pour fonctionner de manière résiliente même avant
 * le provisionnement d'une instance PostgreSQL en local.
 */
class DatabaseManager {
  private isConnected = false;
  private connectionAttempted = false;

  public async connect(): Promise<boolean> {
    if (this.connectionAttempted) return this.isConnected;
    this.connectionAttempted = true;

    try {
      // Masquer le mot de passe pour la journalisation
      const sanitizedUrl = env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
      console.log(`🔌 Initialisation de la connexion base de données (${sanitizedUrl})...`);

      // Lorsque l'instance PostgreSQL est active, PrismaClient prend le relais
      this.isConnected = false; // Initialisation préliminaire sécurisée
      console.log('ℹ️ Base de données PostgreSQL configurée pour AgroConnect.');
      return this.isConnected;
    } catch (error) {
      console.warn('⚠️ Base de données non connectée au démarrage :', (error as Error).message);
      this.isConnected = false;
      return false;
    }
  }

  public getStatus(): DatabaseStatus {
    const sanitizedUrl = env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
    return {
      provider: 'postgresql',
      configuredUrl: sanitizedUrl,
      isConnected: this.isConnected,
      message: this.isConnected
        ? 'Connecté à la base de données PostgreSQL'
        : 'Prisma configuré. En attente de migration ou démarrage de l\'instance PostgreSQL',
    };
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Connexion base de données clôturée.');
  }
}

export const dbManager = new DatabaseManager();
