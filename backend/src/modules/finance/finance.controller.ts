import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../../common/response.js';
import { dbManager } from '../../database/client.js';

interface FinanceSummaryRow {
  recordsCount: string;
  grossCdf: string;
  commissionCdf: string;
  sellerEarningsCdf: string;
  platformReceivedCdf: string;
  awaitingPlatformDepositCdf: string;
  awaitingSellerConfirmationCdf: string;
}

function mapFinancialRecord(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === 'string' && key.endsWith('Cdf') ? Number(value) : value,
  ]));
}

export class FinanceController {
  public static async getPlatformSummary(_req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query<FinanceSummaryRow>(
      `SELECT COUNT(fr."id")::text AS "recordsCount",
              COALESCE(SUM(fr."grossAmountCdf"), 0)::text AS "grossCdf",
              COALESCE(SUM(fr."commissionAmountCdf"), 0)::text AS "commissionCdf",
              COALESCE(SUM(fr."sellerEarningsCdf"), 0)::text AS "sellerEarningsCdf",
              COALESCE(SUM(d."platformDepositAmountCdf") FILTER (WHERE d."platformDepositReceivedAt" IS NOT NULL), 0)::text AS "platformReceivedCdf",
              COALESCE(SUM(fr."sellerEarningsCdf") FILTER (WHERE d."platformDepositReceivedAt" IS NULL), 0)::text AS "awaitingPlatformDepositCdf",
              COALESCE(SUM(fr."sellerEarningsCdf") FILTER (WHERE d."platformDepositReceivedAt" IS NOT NULL AND fr."status" <> 'COMPLETED'), 0)::text AS "awaitingSellerConfirmationCdf"
       FROM "financial_records" fr
       JOIN "sub_orders" so ON so."id" = fr."subOrderId"
       LEFT JOIN "deliveries" d ON d."subOrderId" = so."id"`
    );
    const row = result.rows[0];
    return sendSuccess(res, {
      totalRecords: Number(row.recordsCount),
      grossMarketplaceVolumeCdf: Number(row.grossCdf),
      agroConnectCommissionCdf: Number(row.commissionCdf),
      sellerEarningsCdf: Number(row.sellerEarningsCdf),
      platformReceivedCdf: Number(row.platformReceivedCdf),
      awaitingPlatformDepositCdf: Number(row.awaitingPlatformDepositCdf),
      awaitingSellerConfirmationCdf: Number(row.awaitingSellerConfirmationCdf),
    }, 'Synthèse de collecte et de règlements récupérée');
  }

  public static async getSellerFinancials(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId || (typeof req.query.sellerId === 'string' ? req.query.sellerId : '');
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const isAdmin = req.user?.roles?.includes('ADMIN') || req.user?.role === 'ADMIN';
    if (!isAdmin && req.user?.sellerId !== sellerId) {
      return sendError(res, 'Vous ne pouvez consulter que vos propres règlements.', 403, 'FORBIDDEN_FINANCE_ACCESS');
    }

    const result = await dbManager.query(
      `SELECT s."id" AS "sellerId", s."businessName", fr."subOrderId", fr."grossAmountCdf"::text AS "grossAmountCdf",
              fr."commissionRate"::text AS "commissionRate", fr."commissionAmountCdf"::text AS "commissionAmountCdf",
              fr."sellerEarningsCdf"::text AS "sellerEarningsCdf", fr."status" AS "payoutStatus",
              fr."recordedAt", fr."paidAt" AS "sellerConfirmedAt", so."subOrderNumber", so."status" AS "orderStatus",
              d."status" AS "deliveryStatus", d."platformDepositReceivedAt"
       FROM "financial_records" fr
       JOIN "seller_profiles" s ON s."id" = fr."sellerId"
       JOIN "sub_orders" so ON so."id" = fr."subOrderId"
       LEFT JOIN "deliveries" d ON d."subOrderId" = so."id"
       WHERE s."id"::text = $1
       ORDER BY fr."recordedAt" DESC`,
      [sellerId]
    );
    if (!result.rows.length) {
      const seller = await dbManager.query('SELECT "id", "businessName" FROM "seller_profiles" WHERE "id"::text = $1 LIMIT 1', [sellerId]);
      if (!seller.rows[0]) return sendError(res, `Profil vendeur '${sellerId}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    const records = result.rows.map((row) => mapFinancialRecord(row as Record<string, unknown>));
    const total = (key: 'grossAmountCdf' | 'commissionAmountCdf' | 'sellerEarningsCdf') =>
      records.reduce((sum, record) => sum + Number(record[key] ?? 0), 0);
    return sendSuccess(res, {
      sellerId,
      summary: {
        grossSalesCdf: total('grossAmountCdf'),
        commissionCdf: total('commissionAmountCdf'),
        sellerEarningsCdf: total('sellerEarningsCdf'),
      },
      records,
    }, 'Relevé de règlements vendeur récupéré');
  }
}
