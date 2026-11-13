import { Request, Response, NextFunction } from 'express';
import { Security, TokenPayload, UserRoleType } from '../security.js';
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
 * Middleware optionnel : peuple req.user si un token valide est fourni, sinon continue sans bloquer
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      const payload = Security.verifyToken(token);
      if (payload) {
        req.user = payload;
      }
    }
  }
  next();
}

/**
 * Vérifie si l'utilisateur possède un rôle donné parmi ses rôles assignés
 */
export function userHasRole(user: TokenPayload | undefined, role: UserRoleType): boolean {
  if (!user) return false;
  if (user.roles && user.roles.includes(role)) return true;
  return user.role === role;
}

/**
 * Middleware autorisant uniquement certains rôles (support multi-rôles natif)
 */
export function requireRole(allowedRoles: UserRoleType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Utilisateur non authentifié'));
      return;
    }

    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const hasPermission = userRoles.some((r) => allowedRoles.includes(r));

    if (!hasPermission) {
      next(
        new ForbiddenError(
          `Accès réservé aux rôles : [${allowedRoles.join(', ')}]. Vos rôles actuels sont : [${userRoles.join(', ')}]`
        )
      );
      return;
    }

    next();
  };
}

/**
 * Middleware de vérification d'appartenance vendeur (Ownership check)
 * Un vendeur ne peut modifier que ses propres ressources (offres, stocks, sous-commandes).
 * Les administrateurs disposent d'un droit de supervision global.
 */
export function requireSellerOwnership(sellerIdExtractor: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Utilisateur non authentifié'));
      return;
    }

    // Un administrateur passe toujours
    if (userHasRole(req.user, 'ADMIN')) {
      return next();
    }

    // L'utilisateur doit avoir le rôle SELLER
    if (!userHasRole(req.user, 'SELLER')) {
      next(new ForbiddenError('Opération réservée aux vendeurs enregistrés'));
      return;
    }

    const targetSellerId = sellerIdExtractor(req);
    if (!targetSellerId) {
      next(new ForbiddenError('Identifiant vendeur manquant'));
      return;
    }

    // Si le token contient le sellerId associé
    if (req.user.sellerId && req.user.sellerId !== targetSellerId) {
      next(
        new ForbiddenError('Accès interdit : vous ne pouvez gérer que les ressources de votre propre profil vendeur')
      );
      return;
    }

    next();
  };
}
