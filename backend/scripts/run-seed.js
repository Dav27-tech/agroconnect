import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.resolve(__dirname, '../prisma/seed.sql');
const sql = readFileSync(seedPath, 'utf8');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  const client = await pool.connect();
  try {
    console.log('Running seed script...');
    await client.query(sql);
    console.log('Seed completed successfully');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
