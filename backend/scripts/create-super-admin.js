import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Pool } from 'pg';
import { Security } from '../dist/common/security.js';

const prompt = createInterface({ input: stdin, output: stdout });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function readHiddenPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Exécutez cette commande depuis un terminal interactif pour saisir le mot de passe sans l’afficher.');
  }

  stdout.write('Mot de passe (12 caractères minimum) : ');
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let password = '';
    const finish = (error) => {
      stdin.setRawMode(false);
      stdin.removeListener('data', onData);
      stdout.write('\n');
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (keyBuffer) => {
      const key = keyBuffer.toString('utf8');
      if (key === '\u0003') return finish(new Error('Saisie annulée.'));
      if (key === '\r' || key === '\n') return finish();
      if (key === '\u007f' || key === '\b') {
        password = password.slice(0, -1);
        return;
      }
      if (key >= ' ') password += key;
    };
    stdin.on('data', onData);
  });
}

try {
  const existingSuperAdmin = await pool.query(
    `SELECT 1 FROM "users" WHERE "roles" @> ARRAY['SUPER_ADMIN']::"UserRole"[] LIMIT 1`
  );
  if (existingSuperAdmin.rowCount > 0) {
    throw new Error('Un compte super administrateur existe déjà.');
  }

  const fullName = (await prompt.question('Nom complet du super administrateur : ')).trim();
  const email = (await prompt.question('Email : ')).trim().toLowerCase();
  const rawPhone = (await prompt.question('Téléphone (+243...) : ')).trim().replace(/[\s().-]/g, '');
  const phoneNumber = rawPhone.startsWith('0') ? `+243${rawPhone.slice(1)}` : rawPhone;
  prompt.close();

  const password = await readHiddenPassword();
  if (
    fullName.length < 2
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !/^\+243[0-9]{9}$/.test(phoneNumber)
    || password.length < 12
  ) {
    throw new Error('Nom, email, téléphone RDC ou mot de passe invalide.');
  }

  const passwordHash = await Security.hashPassword(password);
  const result = await pool.query(
    `INSERT INTO "users" ("phoneNumber", "email", "passwordHash", "fullName", "roles")
     VALUES ($1, $2, $3, $4, ARRAY['SUPER_ADMIN', 'ADMIN']::"UserRole"[])
     RETURNING "id", "email", "fullName"`,
    [phoneNumber, email, passwordHash, fullName]
  );
  console.log(`Super administrateur créé : ${result.rows[0].email} (${result.rows[0].id})`);
} catch (error) {
  console.error(`Création du super administrateur impossible : ${error.message}`);
  process.exitCode = 1;
} finally {
  prompt.close();
  await pool.end();
}
