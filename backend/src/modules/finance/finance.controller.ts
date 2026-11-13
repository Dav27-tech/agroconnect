import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore } from '../../database/store.js';
import { Money } from '../../common/money.js';

export class FinanceController {
  /**
   * Synthèse financière globale pour l'administration AgroConnect
   */
  public static async getPlatformSummary(_req: Request, res: Response): Promise<Response> {
    const records = Array.from(AgroStore.financialRecords.values());
    const activeRate = AgroStore.getActiveExchangeRate();

    let totalGrossCdfScaled = 0n;
    let totalGrossUsdScaled = 0n;
    let totalCommissionsCdfScaled = 0n;
    let totalCommissionsUsdScaled = 0n;
    let totalSellerEarningsCdfScaled = 0n;
    let totalSellerEarningsUsdScaled = 0n;

    for (const record of records) {
      totalGrossCdfScaled = Money.add(totalGrossCdfScaled, Money.toScaled(record.grossAmountCdf));
      totalGrossUsdScaled = Money.add(totalGrossUsdScaled, Money.toScaled(record.grossAmountUsd));
      totalCommissionsCdfScaled = Money.add(
        totalCommissionsCdfScaled,
        Money.toScaled(record.commissionAmountCdf)
      );
      totalCommissionsUsdScaled = Money.add(
        totalCommissionsUsdScaled,
        Money.toScaled(record.commissionAmountUsd)
      );
      totalSellerEarningsCdfScaled = Money.add(
        totalSellerEarningsCdfScaled,
        Money.toScaled(record.sellerEarningsCdf)
      );
      totalSellerEarningsUsdScaled = Money.add(
        totalSellerEarningsUsdScaled,
        Money.toScaled(record.sellerEarningsUsd)
      );
    }

    return sendSuccess(res, {
      totalRecords: records.length,
      currentExchangeRate: activeRate.rate,
      grossMarketplaceVolume: {
        totalCdf: Money.fromScaled(totalGrossCdfScaled),
        totalUsd: Money.fromScaled(totalGrossUsdScaled),
      },
      agroConnectCommissions: {
        totalCdf: Money.fromScaled(totalCommissionsCdfScaled),
        totalUsd: Money.fromScaled(totalCommissionsUsdScaled),
        standardRatePercent: 5.0,
      },
      sellerPayoutObligations: {
        totalCdf: Money.fromScaled(totalSellerEarningsCdfScaled),
        totalUsd: Money.fromScaled(totalSellerEarningsUsdScaled),
      },
      strictIntermediaryRule:
        'AgroConnect n\'achète, ne possède ni ne revend de produits. Les flux de commissions représentent uniquement la rémunération d\'intermédiation.',
    });
  }

  /**
   * Relevé financier d'un vendeur (chiffre d'affaires brut, commissions prélevées, gains nets)
   */
  public static async getSellerFinancials(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.sellerId || (typeof req.query.sellerId === 'string' ? req.query.sellerId : '');
    const sellerId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';

    const seller = AgroStore.sellerProfiles.get(sellerId);
    if (!seller) {
      return sendError(res, `Profil vendeur '${sellerId}' introuvable`, 404, 'SELLER_NOT_FOUND');
    }

    // Vérification d'appartenance
    if (req.user && !req.user.roles?.includes('ADMIN') && req.user.role !== 'ADMIN') {
      const userSeller = Array.from(AgroStore.sellerProfiles.values()).find((s) => s.userId === req.user!.userId);
      if (!userSeller || userSeller.id !== sellerId) {
        return sendError(
          res,
          'Accès interdit : vous ne pouvez consulter que vos propres relevés financiers',
          403,
          'FORBIDDEN_FINANCE_ACCESS'
        );
      }
    }

    const sellerRecords = Array.from(AgroStore.financialRecords.values()).filter((r) => r.sellerId === sellerId);

    let grossCdfScaled = 0n;
    let grossUsdScaled = 0n;
    let commCdfScaled = 0n;
    let commUsdScaled = 0n;
    let earningsCdfScaled = 0n;
    let earningsUsdScaled = 0n;

    for (const r of sellerRecords) {
      grossCdfScaled = Money.add(grossCdfScaled, Money.toScaled(r.grossAmountCdf));
      grossUsdScaled = Money.add(grossUsdScaled, Money.toScaled(r.grossAmountUsd));
      commCdfScaled = Money.add(commCdfScaled, Money.toScaled(r.commissionAmountCdf));
      commUsdScaled = Money.add(commUsdScaled, Money.toScaled(r.commissionAmountUsd));
      earningsCdfScaled = Money.add(earningsCdfScaled, Money.toScaled(r.sellerEarningsCdf));
      earningsUsdScaled = Money.add(earningsUsdScaled, Money.toScaled(r.sellerEarningsUsd));
    }

    return sendSuccess(res, {
      sellerId: seller.id,
      businessName: seller.businessName,
      summary: {
        grossSalesCdf: Money.fromScaled(grossCdfScaled),
        grossSalesUsd: Money.fromScaled(grossUsdScaled),
        commissionsPaidCdf: Money.fromScaled(commCdfScaled),
        commissionsPaidUsd: Money.fromScaled(commUsdScaled),
        netEarningsCdf: Money.fromScaled(earningsCdfScaled),
        netEarningsUsd: Money.fromScaled(earningsUsdScaled),
      },
      records: sellerRecords,
    });
  }

  /**
   * Traitement et validation d'un versement vendeur
   */
  public static async processPayout(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.subOrderId;
    const subOrderId = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const { reference } = req.body;

    const record = AgroStore.financialRecords.get(subOrderId);
    if (!record) {
      return sendError(res, `Dossier financier pour la sous-commande '${subOrderId}' introuvable`, 404, 'RECORD_NOT_FOUND');
    }

    record.status = 'COMPLETED';
    record.paidAt = new Date();
    record.payoutRef = reference || `PAYOUT-${Date.now()}`;

    const subOrder = AgroStore.subOrders.get(subOrderId);
    if (subOrder) {
      subOrder.payoutStatus = 'COMPLETED';
      subOrder.updatedAt = new Date();
    }

    return sendSuccess(res, record, 'Reversement vendeur validé avec succès');
  }

  public static async getCommissionRates(_req: Request, res: Response): Promise<Response> {
    const rateSnapshot = AgroStore.getActiveExchangeRate();

    return sendSuccess(res, {
      platformCommissionPercent: 5.0,
      description:
        'Commission prélevée sur chaque sous-commande vendeur pour financer la plateforme et la sécurisation des transactions.',
      currentExchangeRateSnapshot: {
        rate: rateSnapshot.rate,
        currencyPair: 'USD/CDF',
        date: rateSnapshot.effectiveFrom,
      },
      payoutRule:
        'Les reversements aux vendeurs sont débloqués après validation de la livraison ou confirmation de bonne réception.',
    });
  }
}
