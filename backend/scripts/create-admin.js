import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Pool } from 'pg';
import { Security } from '../dist/common/security.js';

const prompt = createInterface({ input: stdin, output: stdout });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const existingAdmins = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "users" WHERE "roles" @> ARRAY['ADMIN']::"UserRole"[]`
  );
  if (existingAdmins.rows[0].count > 0) {
    throw new Error('Un compte administrateur existe déjà. Utilisez l’interface admin pour gérer les rôles.');
  }

  const fullName = (await prompt.question('Nom complet de l’administrateur : ')).trim();
  const phoneNumber = (await prompt.question('Téléphone (+243...) : ')).replace(/[\s().-]/g, '');
  const emailInput = (await prompt.question('Email (facultatif) : ')).trim();
  const password = await prompt.question('Mot de passe (12 caractères minimum) : ');

  if (!fullName || password.length < 12 || !/^(\+243|0)[0-9]{9}$/.test(phoneNumber)) {
    throw new Error('Nom, téléphone RDC ou mot de passe invalide.');
  }

  const passwordHash = await Security.hashPassword(password);
  const result = await pool.query(
    `INSERT INTO "users" ("phoneNumber", "email", "passwordHash", "fullName", "roles")
     VALUES ($1, $2, $3, $4, ARRAY['ADMIN']::"UserRole"[])
     RETURNING "id", "phoneNumber", "fullName"`,
    [phoneNumber, emailInput || null, passwordHash, fullName]
  );

  console.log(`Compte administrateur créé : ${result.rows[0].phoneNumber} (${result.rows[0].id})`);
} catch (error) {
  console.error(`Création du compte administrateur impossible : ${error.message}`);
  process.exitCode = 1;
} finally {
  prompt.close();
  await pool.end();
}