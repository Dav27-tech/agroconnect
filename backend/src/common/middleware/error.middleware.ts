import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors.js';
import { sendError } from '../response.js';
import { env } from '../../config/env.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Erreur inattendue
  console.error(`💥 [${new Date().toISOString()}] Erreur non gérée (${req.method} ${req.originalUrl}):`, err);

  const message = env.NODE_ENV === 'production' 
    ? 'Une erreur interne inattendue est survenue.' 
    : err.message || 'Erreur interne du serveur';

  sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', env.NODE_ENV === 'development' ? err.stack : undefined);
}

