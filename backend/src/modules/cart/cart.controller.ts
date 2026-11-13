import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore, CartItemRecord, CartRecord, SaleType } from '../../database/store.js';
import { Money } from '../../common/money.js';
import crypto from 'node:crypto';

export interface CartItemInput {
  offerId: string;
  quantity: number;
  saleType: SaleType;
}

export class CartController {
  /**
   * Calcule un panier (groupement par vendeur, calcul des totaux en CDF et USD, vérification de stock)
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
        totals: {
          totalCdf: 0,
          totalUsd: 0,
        },
        exchangeRate: AgroStore.getActiveExchangeRate().rate,
      });
    }

    const currentRate = AgroStore.getActiveExchangeRate();
    const exchangeRate = currentRate.rate;

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
          unitPriceUsd: number;
          subtotalCdf: number;
          subtotalUsd: number;
          availableStock: number;
          isStockSufficient: boolean;
        }>;
        sellerSubtotalCdf: number;
        sellerSubtotalUsd: number;
      }
    >();

    let grandTotalCdfScaled = 0n;
    let grandTotalUsdScaled = 0n;
    let totalItemsCount = 0;
    let hasStockShortage = false;

    for (const item of items) {
      const offer = AgroStore.offers.get(item.offerId);
      if (!offer) {
        return sendError(res, `Offre '${item.offerId}' inexistante dans le panier`, 404, 'OFFER_NOT_FOUND');
      }

      const isWholesale = item.saleType === 'WHOLESALE';
      const unitPriceCdf = isWholesale ? offer.wholesalePriceCdf || offer.retailPriceCdf : offer.retailPriceCdf;
      const unitPriceUsd = isWholesale ? offer.wholesalePriceUsd || offer.retailPriceUsd : offer.retailPriceUsd;

      const unitPriceCdfScaled = Money.toScaled(unitPriceCdf);
      const unitPriceUsdScaled = Money.toScaled(unitPriceUsd);

      const itemTotalCdfScaled = Money.multiply(unitPriceCdfScaled, item.quantity);
      const itemTotalUsdScaled = Money.multiply(unitPriceUsdScaled, item.quantity);

      grandTotalCdfScaled = Money.add(grandTotalCdfScaled, itemTotalCdfScaled);
      grandTotalUsdScaled = Money.add(grandTotalUsdScaled, itemTotalUsdScaled);
      totalItemsCount += item.quantity;

      const isStockSufficient = offer.stockQuantity >= item.quantity;
      if (!isStockSufficient) {
        hasStockShortage = true;
      }

      if (!sellerGroupsMap.has(offer.sellerId)) {
        sellerGroupsMap.set(offer.sellerId, {
          sellerId: offer.sellerId,
          sellerName: offer.sellerName,
          items: [],
          sellerSubtotalCdf: 0,
          sellerSubtotalUsd: 0,
        });
      }

      const group = sellerGroupsMap.get(offer.sellerId)!;
      group.items.push({
        offerId: offer.id,
        productName: offer.productName,
        unit: offer.unit,
        quantity: item.quantity,
        saleType: item.saleType,
        unitPriceCdf,
        unitPriceUsd,
        subtotalCdf: Money.fromScaled(itemTotalCdfScaled),
        subtotalUsd: Money.fromScaled(itemTotalUsdScaled),
        availableStock: offer.stockQuantity,
        isStockSufficient,
      });

      group.sellerSubtotalCdf += Money.fromScaled(itemTotalCdfScaled);
      group.sellerSubtotalUsd += Money.fromScaled(itemTotalUsdScaled);
    }

    const sellerGroups = Array.from(sellerGroupsMap.values());

    return sendSuccess(res, {
      sellerGroups,
      distinctSellersCount: sellerGroups.length,
      totalItemsCount,
      hasStockShortage,
      exchangeRateSnapshot: exchangeRate,
      totals: {
        totalCdf: Money.fromScaled(grandTotalCdfScaled),
        totalUsd: Money.fromScaled(grandTotalUsdScaled),
      },
    });
  }

  /**
   * Récupère le panier de l'utilisateur ou de session
   */
  public static async getCart(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.userId;
    const sessionId = (req.headers['x-session-id'] as string) || 'guest-session';

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
    const sessionId = (req.headers['x-session-id'] as string) || `sess-${crypto.randomUUID().slice(0, 8)}`;

    const offer = AgroStore.offers.get(offerId);
    if (!offer) {
      return sendError(res, `Offre '${offerId}' introuvable`, 404, 'OFFER_NOT_FOUND');
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

    return sendSuccess(res, { cartId: cart.id, message: 'Article ajouté au panier avec succès' }, 'Article ajouté');
  }
}
