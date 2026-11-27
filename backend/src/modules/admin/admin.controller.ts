import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { DRC_PROVINCES } from '../../config/drc.js';
import { dbManager } from '../../database/client.js';
import { Security } from '../../common/security.js';
import { disconnectRealtimeUser } from '../../common/realtime.js';

export class AdminController {
  public static async listAdmins(_req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query(
      `SELECT "id", "fullName", "email", "phoneNumber", "isActive", "mustChangePassword", "createdAt"
       FROM "users"
       WHERE "roles" @> ARRAY['ADMIN']::"UserRole"[]
         AND NOT ("roles" @> ARRAY['SUPER_ADMIN']::"UserRole"[])
       ORDER BY "createdAt" DESC`
    );
    return sendSuccess(res, result.rows, 'Comptes administrateurs récupérés');
  }

  public static async createManagedAdmin(req: Request, res: Response): Promise<Response> {
    const body = req.body as {
      fullName?: unknown;
      email?: unknown;
      phoneNumber?: unknown;
      password?: unknown;
    };
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const rawPhone = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const phoneNumber = rawPhone.startsWith('0') ? `+243${rawPhone.slice(1)}` : rawPhone;
    const password = typeof body.password === 'string' ? body.password : '';

    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !/^\+243[0-9]{9}$/.test(phoneNumber) || password.length < 12) {
      return sendError(res, 'Nom, email, téléphone RDC et mot de passe (12 caractères minimum) sont requis.', 400, 'INVALID_ADMIN_DETAILS');
    }

    try {
      const passwordHash = await Security.hashPassword(password);
      const result = await dbManager.query(
        `INSERT INTO "users" ("phoneNumber", "email", "passwordHash", "fullName", "roles", "mustChangePassword")
         VALUES ($1, $2, $3, $4, ARRAY['ADMIN']::"UserRole"[], true)
         RETURNING "id", "fullName", "email", "phoneNumber", "isActive", "mustChangePassword", "createdAt"`,
        [phoneNumber, email, passwordHash, fullName]
      );
      return sendSuccess(res, result.rows[0], 'Compte administrateur créé', 201);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        return sendError(res, 'Un compte existe déjà avec cet email ou ce numéro de téléphone.', 409, 'ADMIN_ACCOUNT_EXISTS');
      }
      throw error;
    }
  }

  public static async updateManagedAdminStatus(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.userId;
    const userId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { isActive } = req.body as { isActive?: unknown };
    if (typeof isActive !== 'boolean') {
      return sendError(res, 'Le champ isActive doit être un booléen.', 400, 'INVALID_ADMIN_STATUS');
    }

    const result = await dbManager.query(
      `UPDATE "users"
       SET "isActive" = $2, "updatedAt" = NOW()
       WHERE "id"::text = $1
         AND "roles" @> ARRAY['ADMIN']::"UserRole"[]
         AND NOT ("roles" @> ARRAY['SUPER_ADMIN']::"UserRole"[])
       RETURNING "id", "fullName", "email", "phoneNumber", "isActive", "createdAt"`,
      [userId, isActive]
    );
    if (!result.rows[0]) {
      return sendError(res, 'Compte administrateur introuvable.', 404, 'ADMIN_NOT_FOUND');
    }
    if (!isActive) disconnectRealtimeUser(userId);
    return sendSuccess(res, result.rows[0], isActive ? 'Compte administrateur activé' : 'Compte administrateur désactivé');
  }

  public static async getCommissionSettings(_req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query<{ commissionRatePercent: string }>(
      `SELECT "commissionRatePercent"::text AS "commissionRatePercent"
       FROM "platform_settings" WHERE "id" = 'singleton' LIMIT 1`
    );
    if (!result.rows[0]) return sendError(res, 'Configuration de commission introuvable', 500, 'COMMISSION_SETTINGS_MISSING');
    return sendSuccess(res, { commissionRatePercent: Number(result.rows[0].commissionRatePercent) });
  }

  public static async updateCommissionSettings(req: Request, res: Response): Promise<Response> {
    const rate = Number(req.body?.commissionRatePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate >= 100 || Math.round(rate * 100) !== rate * 100) {
      return sendError(res, 'Le taux de commission doit être compris entre 0 et 99,99 %', 400, 'INVALID_COMMISSION_RATE');
    }
    const result = await dbManager.query<{ commissionRatePercent: string }>(
      `UPDATE "platform_settings"
       SET "commissionRatePercent" = $1, "updatedByUserId" = $2, "updatedAt" = NOW()
       WHERE "id" = 'singleton'
       RETURNING "commissionRatePercent"::text AS "commissionRatePercent"`,
      [rate, req.user?.userId ?? null]
    );
    if (!result.rows[0]) return sendError(res, 'Configuration de commission introuvable', 500, 'COMMISSION_SETTINGS_MISSING');
    return sendSuccess(res, { commissionRatePercent: Number(result.rows[0].commissionRatePercent) }, 'Taux de commission mis à jour');
  }

  public static async listCouriers(_req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query(
      `SELECT dp."id", dp."userId", u."fullName", u."email", u."phoneNumber", u."isActive",
              dp."companyName", dp."vehicleType", dp."plateNumber", dp."operatingArea",
              dp."isAvailable", dp."status",
              COUNT(d."id") FILTER (WHERE d."status" NOT IN ('DELIVERED', 'FAILED', 'CANCELLED'))::int AS "activeDeliveriesCount"
       FROM "delivery_profiles" dp
       JOIN "users" u ON u."id" = dp."userId"
       LEFT JOIN "deliveries" d ON d."personnelId" = dp."id"
       GROUP BY dp."id", u."id"
       ORDER BY u."fullName"`
    );
    return sendSuccess(res, result.rows, 'Livreurs AgroConnect récupérés');
  }

  public static async createCourier(req: Request, res: Response): Promise<Response> {
    const body = req.body as {
      fullName?: unknown;
      email?: unknown;
      phoneNumber?: unknown;
      password?: unknown;
      companyName?: unknown;
      vehicleType?: unknown;
      plateNumber?: unknown;
      operatingArea?: unknown;
    };
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const rawPhone = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const phoneNumber = rawPhone.startsWith('0') ? `+243${rawPhone.slice(1)}` : rawPhone;
    const password = typeof body.password === 'string' ? body.password : '';
    const operatingArea = typeof body.operatingArea === 'string' ? body.operatingArea.trim() : '';
    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !/^\+243[0-9]{9}$/.test(phoneNumber) || password.length < 8 || operatingArea.length < 2) {
      return sendError(res, 'Nom, email, téléphone RDC, mot de passe (8 caractères minimum) et zone d’activité sont requis.', 400, 'INVALID_COURIER_DETAILS');
    }
    for (const field of ['companyName', 'vehicleType', 'plateNumber'] as const) {
      if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string') {
        return sendError(res, `Le champ ${field} doit être du texte.`, 400, 'INVALID_COURIER_DETAILS');
      }
    }
    try {
      const passwordHash = await Security.hashPassword(password);
      const courier = await dbManager.transaction(async (client) => {
        const insertedUser = await client.query<{ id: string }>(
          `INSERT INTO "users" ("phoneNumber", "email", "passwordHash", "fullName", "roles", "mustChangePassword")
           VALUES ($1, $2, $3, $4, ARRAY['DELIVERY_PERSON']::"UserRole"[], true)
           RETURNING "id"`,
          [phoneNumber, email, passwordHash, fullName]
        );
        const profile = await client.query(
          `INSERT INTO "delivery_profiles"
             ("userId", "companyName", "vehicleType", "plateNumber", "operatingArea", "isAvailable", "status")
           VALUES ($1, $2, $3, $4, $5, true, 'VERIFIED')
           RETURNING "id", "userId", "companyName", "vehicleType", "plateNumber", "operatingArea", "isAvailable", "status"`,
          [
            insertedUser.rows[0].id,
            typeof body.companyName === 'string' ? body.companyName.trim() || null : null,
            typeof body.vehicleType === 'string' ? body.vehicleType.trim() || null : null,
            typeof body.plateNumber === 'string' ? body.plateNumber.trim() || null : null,
            operatingArea,
          ]
        );
        return { ...profile.rows[0], fullName, email, phoneNumber, isActive: true, activeDeliveriesCount: 0 };
      });
      return sendSuccess(res, courier, 'Compte livreur créé', 201);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        return sendError(res, 'Un compte existe déjà avec cet email ou ce numéro de téléphone.', 409, 'COURIER_ACCOUNT_EXISTS');
      }
      throw error;
    }
  }

  public static async updateCourierAvailability(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.courierId;
    const courierId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { isAvailable } = req.body as { isAvailable?: unknown };
    if (typeof isAvailable !== 'boolean') return sendError(res, 'Le champ isAvailable doit être un booléen.', 400, 'INVALID_COURIER_STATUS');
    const result = await dbManager.query(
      `UPDATE "delivery_profiles" SET "isAvailable" = $2, "updatedAt" = NOW()
       WHERE "id"::text = $1
       RETURNING "id", "isAvailable"`,
      [courierId, isAvailable]
    );
    if (!result.rows[0]) return sendError(res, 'Profil livreur introuvable.', 404, 'COURIER_NOT_FOUND');
    return sendSuccess(res, result.rows[0], 'Disponibilité du livreur mise à jour');
  }

  public static async listSellerProfiles(req: Request, res: Response): Promise<Response> {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'PENDING';
    const validStatuses = ['ALL', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Statut de vérification invalide', 400, 'INVALID_VERIFICATION_STATUS');
    }

    const result = await dbManager.query(
      `SELECT s."id", s."userId", u."fullName", u."phoneNumber", u."email", s."sellerType",
              s."businessName", s."description", s."province", s."city", s."address",
              s."verificationStatus", s."createdAt", u."isActive"
       FROM "seller_profiles" s
       JOIN "users" u ON u."id" = s."userId"
       WHERE ($1::text = 'ALL' OR s."verificationStatus"::text = $1)
       ORDER BY s."createdAt" ASC`,
      [status]
    );

    return sendSuccess(res, result.rows, 'Profils vendeurs récupérés');
  }

  public static async updateSellerActiveStatus(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId;
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { isActive } = req.body as { isActive?: unknown };
    if (typeof isActive !== 'boolean') {
      return sendError(res, 'Le champ isActive doit être un booléen', 400, 'INVALID_SELLER_STATUS');
    }

    const sellerResult = await dbManager.query<{ userId: string; roles: string[] }>(
      `SELECT u."id" AS "userId", u."roles"::text[] AS "roles"
       FROM "seller_profiles" s
       JOIN "users" u ON u."id" = s."userId"
       WHERE s."id"::text = $1 LIMIT 1`,
      [sellerId]
    );
    const seller = sellerResult.rows[0];
    if (!seller) {
      return sendError(res, 'Profil vendeur introuvable', 404, 'SELLER_NOT_FOUND');
    }
    if (!isActive && seller.roles.includes('ADMIN')) {
      return sendError(res, 'Un compte administrateur ne peut pas être désactivé depuis la gestion des vendeurs', 409, 'ADMIN_ACCOUNT_CANNOT_BE_DISABLED');
    }

    const result = await dbManager.query<{ isActive: boolean }>(
      `UPDATE "users" SET "isActive" = $2, "updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING "isActive"`,
      [seller.userId, isActive]
    );
    if (!result.rows[0]) {
      return sendError(res, 'Compte vendeur introuvable', 404, 'SELLER_NOT_FOUND');
    }

    if (!isActive) disconnectRealtimeUser(seller.userId);
    return sendSuccess(res, { sellerId, isActive: result.rows[0].isActive }, 'Statut du compte vendeur mis à jour');
  }

  public static async updateSellerVerification(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId;
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { status } = req.body as { status?: string };
    const allowedStatuses = ['UNDER_REVIEW', 'VERIFIED', 'REJECTED'];
    if (!status || !allowedStatuses.includes(status)) {
      return sendError(res, 'Statut attendu : UNDER_REVIEW, VERIFIED ou REJECTED', 400, 'INVALID_VERIFICATION_STATUS');
    }

    const result = await dbManager.query(
      `UPDATE "seller_profiles" SET "verificationStatus" = $2::"VerificationStatus", "updatedAt" = NOW()
       WHERE "id"::text = $1
       RETURNING "id", "userId", "businessName", "verificationStatus"`,
      [sellerId, status]
    );
    if (!result.rowCount) {
      return sendError(res, 'Profil vendeur introuvable', 404, 'SELLER_NOT_FOUND');
    }

    return sendSuccess(res, result.rows[0], 'Statut du profil vendeur mis à jour');
  }

  public static async getPlatformStats(_req: Request, res: Response): Promise<Response> {
    const [users, sellers, products, offers, orders, subOrders] = await Promise.all([
      dbManager.query<{ count: string }>('SELECT COUNT(*) AS count FROM "users"'),
      dbManager.query<{ sellerType: string; count: string }>(
        `SELECT s."sellerType"::text AS "sellerType", COUNT(*) AS count
         FROM "seller_profiles" s
         JOIN "users" u ON u."id" = s."userId"
         WHERE u."isActive" = true
         GROUP BY s."sellerType"`
      ),
      dbManager.query<{ count: string }>('SELECT COUNT(*) AS count FROM "products"'),
      dbManager.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM "offers" o
         JOIN "seller_profiles" s ON s."id" = o."sellerId"
         JOIN "users" u ON u."id" = s."userId"
         WHERE o."isAvailable" = true AND u."isActive" = true`
      ),
      dbManager.query<{ count: string }>('SELECT COUNT(*) AS count FROM "parent_orders"'),
      dbManager.query<{ count: string }>('SELECT COUNT(*) AS count FROM "sub_orders"'),
    ]);
    const sellerCounts = Object.fromEntries(sellers.rows.map((seller) => [seller.sellerType, Number(seller.count)]));

    return sendSuccess(
      res,
      {
        country: 'République Démocratique du Congo (RDC)',
        supportedProvincesCount: DRC_PROVINCES.length,
        provinces: DRC_PROVINCES,
        usersCount: Number(users.rows[0]?.count ?? 0),
        activeSellersCount: sellers.rows.reduce((total, seller) => total + Number(seller.count), 0),
        sellersByType: {
          FARMER: sellerCounts.FARMER ?? 0,
          RESELLER: sellerCounts.RESELLER ?? 0,
          SUPPLIER: sellerCounts.SUPPLIER ?? 0,
        },
        catalogueProductsCount: Number(products.rows[0]?.count ?? 0),
        activeOffersCount: Number(offers.rows[0]?.count ?? 0),
        parentOrdersCount: Number(orders.rows[0]?.count ?? 0),
        subOrdersCount: Number(subOrders.rows[0]?.count ?? 0),
        marketplaceIntermediaryRule:
          'AgroConnect n\'achète, ne possède, ne stocke ni ne revend aucun produit agricole. Chaque vendeur gère ses propres stocks et sous-commandes.',
      },
      'Statistiques globales de la plateforme AgroConnect'
    );
  }

  public static async updateUserRoles(req: Request, res: Response): Promise<Response> {
    const rawUserId = req.params.userId;
    const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId) || '';
    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return sendError(res, 'Une liste de rôles non vide est requise', 400, 'INVALID_ROLES');
    }
    if (roles.some((role) => !['ADMIN', 'BUYER', 'SELLER'].includes(role))) {
      return sendError(res, 'Les rôles autorisés sont ADMIN, BUYER et SELLER.', 400, 'INVALID_ROLES');
    }

    const result = await dbManager.query<{ id: string; fullName: string; roles: string[] }>(
      `UPDATE "users" SET "roles" = $2::"UserRole"[], "updatedAt" = NOW()
       WHERE "id"::text = $1 AND NOT ("roles" @> ARRAY['SUPER_ADMIN']::"UserRole"[])
       RETURNING "id", "fullName", "roles"::text[] AS "roles"`,
      [userId, roles]
    );
    const user = result.rows[0];
    if (!user) {
      return sendError(res, `Utilisateur '${userId}' introuvable`, 404, 'USER_NOT_FOUND');
    }

    return sendSuccess(res, {
      id: user.id,
      fullName: user.fullName,
      roles: user.roles,
    }, 'Rôles utilisateur mis à jour avec succès');
  }
}
