import { env } from '../config/env.js';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseStatus {
  provider: 'postgresql';
  isConnected: boolean;
  message: string;
}

/**
 * Gestionnaire du client de base de données PostgreSQL
 * Conçu pour fonctionner de manière résiliente même avant
 * le provisionnement d'une instance PostgreSQL en local.
 */
class DatabaseManager {
  private readonly pool = new Pool({ connectionString: env.DATABASE_URL });
  private isConnected = false;
  private connectionAttempted = false;

  public async connect(): Promise<boolean> {
    if (this.connectionAttempted) return this.isConnected;
    this.connectionAttempted = true;

    try {
      await this.pool.query('SELECT 1');
      this.isConnected = true;
      console.log('✅ Connexion PostgreSQL établie.');
      return true;
    } catch (error) {
      console.warn('⚠️ Base de données non connectée au démarrage :', (error as Error).message);
      this.isConnected = false;
      return false;
    }
  }

  public getStatus(): DatabaseStatus {
    return {
      provider: 'postgresql',
      isConnected: this.isConnected,
      message: this.isConnected
        ? 'Connecté à la base de données PostgreSQL'
        : 'Base de données PostgreSQL indisponible',
    };
  }

  public query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, values as never);
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async disconnect(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log('🔌 Connexion base de données clôturée.');
  }
}

export const dbManager = new DatabaseManager();

