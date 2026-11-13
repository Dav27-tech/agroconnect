import { Request, Response, NextFunction } from 'express';
import { Security, TokenPayload } from '../security.js';
import { UnauthorizedError, ForbiddenError } from '../errors.js';

// Extension de l'interface Request Express pour injecter l'utilisateur authentifié
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware vérifiant la présence et la validité d'un token Bearer
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Accès refusé. Jeton d\'authentification manquant'));
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next(new UnauthorizedError('Jeton d\'authentification malformé'));
    return;
  }

  const payload = Security.verifyToken(token);
  if (!payload) {
    next(new UnauthorizedError('Jeton invalide ou expiré'));
    return;
  }

  req.user = payload;
  next();
}

/**
 * Middleware autorisant uniquement certains rôles
 */
export function requireRole(allowedRoles: TokenPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Utilisateur non authentifié'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Accès réservé aux rôles : [${allowedRoles.join(', ')}]. Votre rôle actuel est : '${req.user.role}'`
        )
      );
      return;
    }

    next();
  };
}
