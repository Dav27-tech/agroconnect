import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../errors.js';

interface ClientBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, ClientBucket>();

/**
 * Limiteur de débit mémoire sans dépendances externes
 */
export function rateLimiter(
  windowMs = env.RATE_LIMIT_WINDOW_MS,
  maxRequests = env.RATE_LIMIT_MAX_REQUESTS
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Clé basée sur l'IP du client
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const client = buckets.get(ip);

    if (!client || now > client.resetAt) {
      buckets.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    client.count += 1;

    if (client.count > maxRequests) {
      const waitSeconds = Math.ceil((client.resetAt - now) / 1000);
      return next(
        new AppError(
          `Trop de requêtes. Veuillez réessayer dans ${waitSeconds} secondes.`,
          429,
          'RATE_LIMIT_EXCEEDED',
          { retryAfterSeconds: waitSeconds }
        )
      );
    }

    next();
  };
}

