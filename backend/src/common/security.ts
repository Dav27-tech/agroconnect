import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  phoneNumber: string;
  role: 'BUYER' | 'SELLER' | 'DELIVERY_PROVIDER' | 'DELIVERY_PERSON' | 'ADMIN';
  exp: number; // Timestamp d'expiration en secondes
  iat: number; // Timestamp d'émission en secondes
}

export class Security {
  /**
   * Hache un mot de passe avec l'algorithme scrypt (OWASP recommandé)
   */
  public static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Vérifie un mot de passe en temps constant contre les attaques temporelles
   */
  public static async verifyPassword(password: string, combinedHash: string): Promise<boolean> {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;

    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        const keyBuffer = Buffer.from(key, 'hex');
        try {
          const match = crypto.timingSafeEqual(derivedKey, keyBuffer);
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    });
  }

  /**
   * Génère un jeton d'authentification HMAC-SHA256 sécurisé
   */
  public static generateToken(
    userId: string,
    phoneNumber: string,
    role: TokenPayload['role'],
    expiresInDays = 7
  ): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const exp = now + expiresInDays * 24 * 60 * 60;

    const payload: TokenPayload = {
      userId,
      phoneNumber,
      role,
      iat: now,
      exp,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${header}.${encodedPayload}`)
      .digest('base64url');

    return `${header}.${encodedPayload}.${signature}`;
  }

  /**
   * Valide un jeton d'authentification et renvoie sa charge utile
   */
  public static verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      if (!header || !payload || !signature) return null;

      const expectedSignature = crypto
        .createHmac('sha256', env.JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      const expectedBuffer = Buffer.from(expectedSignature);
      const signatureBuffer = Buffer.from(signature);

      if (expectedBuffer.length !== signatureBuffer.length) return null;
      if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenPayload;
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp < now) return null; // Jeton expiré

      return decoded;
    } catch {
      return null;
    }
  }
}
