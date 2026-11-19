import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { dbManager } from '../../database/client.js';
import { isValidDRCProvince } from '../../config/drc.js';

export class SellerController {
  public static async listSellers(req: Request, res: Response): Promise<Response> {
    const { type, province } = req.query;

    const result = await dbManager.query(
      `SELECT s."id", s."userId", s."sellerType", s."businessName", s."description", s."province", s."city",
              s."address", s."verificationStatus", s."commissionRate",
              COUNT(o."id")::int AS "offersCount"
       FROM "seller_profiles" s
       JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
       LEFT JOIN "offers" o ON o."sellerId" = s."id" AND o."isAvailable"
       WHERE ($1::text IS NULL OR s."sellerType"::text = UPPER($1))
         AND ($2::text IS NULL OR LOWER(s."province") = LOWER($2))
       GROUP BY s."id"
       ORDER BY s."businessName"`,
      [typeof type === 'string' ? type : null, typeof province === 'string' ? province : null]
    );

    return sendSuccess(res, result.rows, 'Liste des vendeurs récupérée avec succès', 200, {
      total: result.rows.length,
      country: 'RDC',
    });
  }

  public static async getSellerById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const result = await dbManager.query(
      `SELECT s."id", s."userId", s."sellerType", s."businessName", s."description", s."province", s."city",
              s."address", s."verificationStatus", s."commissionRate"
      FROM "seller_profiles" s
      JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
      WHERE s."id" = $1 LIMIT 1`,
      [id]
    );
    const seller = result.rows[0];

    if (!seller) {
      return sendError(res, `Vendeur avec l'identifiant '${id}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    const services = await dbManager.query(
      'SELECT "id", "sellerId", "serviceType", "title", "description", "extraFeeCdf", "isActive" FROM "seller_services" WHERE "sellerId" = $1 AND "isActive" ORDER BY "title"',
      [seller.id]
    );

    return sendSuccess(res, {
      id: seller.id,
      sellerType: seller.sellerType,
      businessName: seller.businessName,
      description: seller.description,
      province: seller.province,
      city: seller.city,
      verificationStatus: seller.verificationStatus,
      services: services.rows,
    });
  }

  public static async createSellerProfile(req: Request, res: Response): Promise<Response> {
    const { businessName, sellerType, province, city, address, description } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    if (!businessName || !sellerType || !province || !city) {
      return sendError(res, 'Champs obligatoires manquants (businessName, sellerType, province, city)', 400, 'VALIDATION_ERROR');
    }
    if (sellerType !== 'FARMER') {
      return sendError(res, 'AgroConnect accepte uniquement les profils d’agriculteur vendeur.', 400, 'INVALID_SELLER_TYPE');
    }

    if (!isValidDRCProvince(province)) {
      return sendError(res, `La province '${province}' n'est pas reconnue en RDC`, 422, 'INVALID_DRC_PROVINCE');
    }

    // Vérifier si l'utilisateur a déjà un profil vendeur
    const existing = await dbManager.query('SELECT "id" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1', [req.user.userId]);
    if (existing.rowCount) {
      return sendError(res, 'Cet utilisateur dispose déjà d\'un profil vendeur', 409, 'SELLER_EXISTS');
    }

    const created = await dbManager.query(
      `INSERT INTO "seller_profiles" ("userId", "businessName", "sellerType", "province", "city", "address", "description")
       VALUES ($1, $2, $3::"SellerType", $4, $5, $6, $7)
       RETURNING "id", "userId", "businessName", "sellerType", "province", "city", "address", "description", "verificationStatus", "commissionRate"`,
      [req.user.userId, businessName, sellerType, province, city, address ?? null, description ?? null]
    );

    await dbManager.query(
      `UPDATE "users"
       SET "roles" = CASE
         WHEN 'SELLER' = ANY("roles") THEN "roles"
         ELSE "roles" || ARRAY['SELLER']::"UserRole"[]
       END,
       "updatedAt" = NOW()
       WHERE "id" = $1`,
      [req.user.userId]
    );

    return sendSuccess(res, created.rows[0], 'Profil vendeur créé avec succès', 201);
  }

  public static async updateSellerProfile(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const existing = await dbManager.query<{ id: string; userId: string }>(
      'SELECT "id", "userId" FROM "seller_profiles" WHERE "id" = $1 LIMIT 1',
      [id]
    );
    const seller = existing.rows[0];

    if (!seller) {
      return sendError(res, `Profil vendeur '${id}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    const { businessName, description, province, city, address, phoneNumber } = req.body;

    if (province && !isValidDRCProvince(province)) {
      return sendError(res, `Province '${province}' invalide en RDC`, 422, 'INVALID_DRC_PROVINCE');
    }
    if (phoneNumber !== undefined && (typeof phoneNumber !== 'string' || !/^(\+243|0)[0-9]{9}$/.test(phoneNumber))) {
      return sendError(res, 'Le numéro de téléphone doit être un numéro RDC valide', 400, 'INVALID_PHONE_NUMBER');
    }

    if (typeof phoneNumber === 'string') {
      const duplicatePhone = await dbManager.query(
        'SELECT "id" FROM "users" WHERE "phoneNumber" = $1 AND "id" <> $2 LIMIT 1',
        [phoneNumber, seller.userId]
      );
      if (duplicatePhone.rowCount) {
        return sendError(res, 'Ce numéro de téléphone est déjà associé à un compte', 409, 'PHONE_NUMBER_ALREADY_EXISTS');
      }
    }

    const updated = await dbManager.transaction(async (client) => {
      const profile = await client.query(
        `UPDATE "seller_profiles"
         SET "businessName" = COALESCE($2, "businessName"),
             "description" = COALESCE($3, "description"),
             "province" = COALESCE($4, "province"),
             "city" = COALESCE($5, "city"),
             "address" = COALESCE($6, "address"),
             "updatedAt" = NOW()
         WHERE "id" = $1
         RETURNING "id", "userId", "businessName", "sellerType", "province", "city", "address",
                   "description", "verificationStatus", "commissionRate"`,
        [id, businessName ?? null, description ?? null, province ?? null, city ?? null, address ?? null]
      );
      if (typeof phoneNumber === 'string') {
        await client.query(
          'UPDATE "users" SET "phoneNumber" = $2, "updatedAt" = NOW() WHERE "id" = $1',
          [seller.userId, phoneNumber]
        );
      }
      return profile;
    });

    return sendSuccess(res, {
      ...updated.rows[0],
      ...(typeof phoneNumber === 'string' ? { phoneNumber } : {}),
    }, 'Profil vendeur mis à jour avec succès');
  }
}
