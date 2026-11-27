import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, CartItemRecord, CartRecord, SaleType } from '../../database/store.js';
import { Money } from '../../common/money.js';
import { dbManager } from '../../database/client.js';
import { getSellerAccountActiveStatus } from '../../common/seller-status.js';
import { VAT_RATE_PERCENT } from '../../config/drc.js';
import crypto from 'node:crypto';

export interface CartItemInput {
  offerId: string;
  quantity: number;
  saleType: SaleType;
}

export class CartController {
  /**
   * Calcule un panier en CDF, groupé par vendeur et vérifie le stock.
   */
  public static async calculateCart(
    req: Request<unknown, unknown, { items: CartItemInput[] }>,
    res: Response
  ): Promise<Response> {
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendSuccess(res, {
        sellerGroups: [],
        totalItemsCount: 0,
        vatRatePercent: VAT_RATE_PERCENT,
        totals: { totalCdf: 0, vatAmountCdf: 0, totalWithVatCdf: 0 },
      });
    }

    if (items.some((item) =>
      !item
      || typeof item.offerId !== 'string'
      || !item.offerId
      || !Number.isInteger(item.quantity)
      || item.quantity <= 0
      || !['RETAIL', 'WHOLESALE'].includes(item.saleType)
    )) {
      return sendError(res, 'Un ou plusieurs articles du panier sont invalides.', 400, 'INVALID_CART_ITEM');
    }

    const offers = await dbManager.query<{
      offerId: string;
      ordinal: number;
      databaseOfferId: string | null;
      sellerId: string | null;
      sellerName: string | null;
      sellerActive: boolean;
      productName: string | null;
      unit: string | null;
      isAvailable: boolean | null;
      stockQuantity: number | null;
      retailPriceCdf: string | null;
      wholesalePriceCdf: string | null;
    }>(
      `WITH requested AS (
         SELECT * FROM unnest($1::text[], $2::integer[], $3::text[])
         WITH ORDINALITY AS requested("offerId", quantity, "saleType", ordinal)
       )
       SELECT requested."offerId", requested.ordinal::integer AS ordinal,
              o."id"::text AS "databaseOfferId", o."sellerId"::text AS "sellerId",
              s."businessName" AS "sellerName", COALESCE(u."isActive", false) AS "sellerActive",
              p."name" AS "productName", o."unit", o."isAvailable", o."stockQuantity",
              o."retailPriceCdf"::text AS "retailPriceCdf",
              o."wholesalePriceCdf"::text AS "wholesalePriceCdf"
       FROM requested
       LEFT JOIN "offers" o ON o."id"::text = requested."offerId"
       LEFT JOIN "seller_profiles" s ON s."id" = o."sellerId"
       LEFT JOIN "users" u ON u."id" = s."userId"
       LEFT JOIN "products" p ON p."id" = o."productId"
       ORDER BY requested.ordinal`,
      [
        items.map((item) => item.offerId),
        items.map((item) => item.quantity),
        items.map((item) => item.saleType),
      ]
    );

    const sellerGroupsMap = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        items: Array<{
          offerId: string;
          productName: string;
          unit: string;
          quantity: number;
          saleType: SaleType;
          unitPriceCdf: number;
          subtotalCdf: number;
          availableStock: number;
          isStockSufficient: boolean;
        }>;
        sellerSubtotalCdf: number;
      }
    >();

    let grandTotalCdfScaled = 0n;
    let totalItemsCount = 0;
    let hasStockShortage = false;
    const sellerSubtotalsScaled = new Map<string, bigint>();

    for (const offerRow of offers.rows) {
      const item = items[offerRow.ordinal - 1];
      if (!item) throw new Error('La réponse de calcul du panier ne correspond pas aux articles envoyés.');
      if (!offerRow.databaseOfferId) {
        return sendError(res, `Offre '${item.offerId}' inexistante dans le panier`, 404, 'OFFER_NOT_FOUND');
      }
      if (!offerRow.isAvailable) {
        return sendError(res, 'Cette offre n’est plus disponible.', 404, 'OFFER_NOT_AVAILABLE');
      }
      if (!offerRow.sellerActive || !offerRow.sellerId || !offerRow.sellerName) {
        return sendError(res, 'Cette offre n’est plus disponible car le compte vendeur est désactivé.', 403, 'SELLER_DISABLED');
      }
      if (req.user?.sellerId && req.user.sellerId === offerRow.sellerId) {
        return sendError(res, 'Vous ne pouvez pas acheter votre propre marchandise.', 403, 'OWN_OFFER_PURCHASE');
      }
      if (!offerRow.productName || !offerRow.unit || offerRow.stockQuantity === null || offerRow.retailPriceCdf === null) {
        throw new Error(`L’offre '${item.offerId}' ne contient pas les données nécessaires au calcul.`);
      }

      const isWholesale = item.saleType === 'WHOLESALE';
      const unitPriceCdf = isWholesale && offerRow.wholesalePriceCdf !== null
        ? Number(offerRow.wholesalePriceCdf)
        : Number(offerRow.retailPriceCdf);

      const unitPriceCdfScaled = Money.toScaled(unitPriceCdf);

      const itemTotalCdfScaled = Money.multiply(unitPriceCdfScaled, item.quantity);

      grandTotalCdfScaled = Money.add(grandTotalCdfScaled, itemTotalCdfScaled);
      totalItemsCount += item.quantity;

      const stockQuantity = Number(offerRow.stockQuantity);
      const isStockSufficient = stockQuantity >= item.quantity;
      if (!isStockSufficient) {
        hasStockShortage = true;
      }

      if (!sellerGroupsMap.has(offerRow.sellerId)) {
        sellerGroupsMap.set(offerRow.sellerId, {
          sellerId: offerRow.sellerId,
          sellerName: offerRow.sellerName,
          items: [],
          sellerSubtotalCdf: 0,
        });
      }

      const group = sellerGroupsMap.get(offerRow.sellerId)!;
      group.items.push({
        offerId: offerRow.databaseOfferId,
        productName: offerRow.productName,
        unit: offerRow.unit,
        quantity: item.quantity,
        saleType: item.saleType,
        unitPriceCdf,
        subtotalCdf: Money.fromScaled(itemTotalCdfScaled),
        availableStock: stockQuantity,
        isStockSufficient,
      });

      group.sellerSubtotalCdf += Money.fromScaled(itemTotalCdfScaled);
      sellerSubtotalsScaled.set(
        offerRow.sellerId,
        Money.add(sellerSubtotalsScaled.get(offerRow.sellerId) ?? 0n, itemTotalCdfScaled)
      );
    }

    let vatAmountCdfScaled = 0n;
    const sellerGroups = Array.from(sellerGroupsMap.values()).map((group) => {
      const vatAmount = Money.calculatePercentage(sellerSubtotalsScaled.get(group.sellerId) ?? 0n, VAT_RATE_PERCENT);
      vatAmountCdfScaled = Money.add(vatAmountCdfScaled, vatAmount);
      return {
        ...group,
        vatAmountCdf: Money.fromScaled(vatAmount),
        totalWithVatCdf: Money.fromScaled(Money.add(sellerSubtotalsScaled.get(group.sellerId) ?? 0n, vatAmount)),
      };
    });
    const totalWithVatCdfScaled = Money.add(grandTotalCdfScaled, vatAmountCdfScaled);

    return sendSuccess(res, {
      sellerGroups,
      distinctSellersCount: sellerGroups.length,
      totalItemsCount,
      hasStockShortage,
      vatRatePercent: VAT_RATE_PERCENT,
      totals: {
        totalCdf: Money.fromScaled(grandTotalCdfScaled),
        vatAmountCdf: Money.fromScaled(vatAmountCdfScaled),
        totalWithVatCdf: Money.fromScaled(totalWithVatCdfScaled),
      },
    });
  }

  /**
   * Récupère le panier de l'utilisateur ou de session
   */
  public static async getCart(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string | undefined;

    if (!userId && !sessionId) {
      return sendSuccess(res, { items: [], total: 0 });
    }

    const cart = Array.from(AgroStore.carts.values()).find(
      (c) => (userId && c.userId === userId) || (!userId && c.sessionId === sessionId)
    );

    if (!cart) {
      return sendSuccess(res, { items: [], total: 0 });
    }

    const items = Array.from(AgroStore.cartItems.values()).filter((i) => i.cartId === cart.id);
    return sendSuccess(res, { cart, items });
  }

  /**
   * Ajoute un article au panier persistant
   */
  public static async addItem(req: Request, res: Response): Promise<Response> {
    const { offerId, quantity = 1, saleType = 'RETAIL' } = req.body;
    const userId = req.user?.userId;
    const sessionId = (req.headers['x-session-id'] as string) || `sess-${crypto.randomUUID()}`;

    const offer = AgroStore.offers.get(offerId);
    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }
    if (!offer.isAvailable) {
      return sendError(res, 'Cette offre n’est plus disponible.', 404, 'OFFER_NOT_AVAILABLE');
    }
    if (req.user?.sellerId && req.user.sellerId === offer.sellerId) {
      return sendError(res, 'Vous ne pouvez pas acheter votre propre marchandise.', 403, 'OWN_OFFER_PURCHASE');
    }
    if (await getSellerAccountActiveStatus(offer.sellerId) === false) {
      return sendError(res, 'Cette offre n’est plus disponible car le compte vendeur est désactivé.', 403, 'SELLER_DISABLED');
    }

    let cart = Array.from(AgroStore.carts.values()).find(
      (c) => (userId && c.userId === userId) || (!userId && c.sessionId === sessionId)
    );

    if (!cart) {
      cart = {
        id: `cart-${crypto.randomUUID().slice(0, 8)}`,
        userId,
        sessionId: userId ? undefined : sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      AgroStore.carts.set(cart.id, cart);
    }

    const existingItem = Array.from(AgroStore.cartItems.values()).find(
      (i) => i.cartId === cart!.id && i.offerId === offerId && i.saleType === saleType
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity);
      existingItem.updatedAt = new Date();
    } else {
      const newItem: CartItemRecord = {
        id: `citem-${crypto.randomUUID().slice(0, 8)}`,
        cartId: cart.id,
        offerId,
        saleType: saleType as SaleType,
        quantity: Number(quantity),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      AgroStore.cartItems.set(newItem.id, newItem);
    }

    return sendSuccess(res, {
      cartId: cart.id,
      sessionId: userId ? undefined : sessionId,
      message: 'Article ajouté au panier avec succès',
    }, 'Article ajouté');
  }
}
