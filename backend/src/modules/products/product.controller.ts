import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore } from '../../database/store.js';

export class ProductController {
  public static async listProducts(req: Request, res: Response): Promise<Response> {
    const { category, search } = req.query;

    let products = Array.from(AgroStore.products.values());

    if (category && typeof category === 'string') {
      products = products.filter((p) => p.categoryId === category || p.slug === category);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.scientificName && p.scientificName.toLowerCase().includes(q))
      );
    }

    // Enrichir chaque produit commun avec les offres des vendeurs
    const enriched = products.map((prod) => {
      const category = AgroStore.categories.get(prod.categoryId);
      const productOffers = Array.from(AgroStore.offers.values()).filter(
        (o) => (o.productId === prod.id || o.productId === prod.slug) && o.isAvailable
      );

      const pricesCdf = productOffers.map((o) => o.retailPriceCdf);
      const pricesUsd = productOffers.map((o) => o.retailPriceUsd);

      return {
        ...prod,
        categoryName: category?.name || 'Filière Agricole',
        offersCount: productOffers.length,
        minPriceCdf: pricesCdf.length > 0 ? Math.min(...pricesCdf) : null,
        maxPriceCdf: pricesCdf.length > 0 ? Math.max(...pricesCdf) : null,
        minPriceUsd: pricesUsd.length > 0 ? Math.min(...pricesUsd) : null,
        maxPriceUsd: pricesUsd.length > 0 ? Math.max(...pricesUsd) : null,
        businessRuleNotice: 'AgroConnect est strict intermédiaire : aucun stock n\'est détenu par la plateforme.',
      };
    });

    return sendSuccess(res, enriched, 'Catalogue des produits communs récupéré avec succès', 200, {
      total: enriched.length,
      strictIntermediary: true,
    });
  }

  public static async getProductBySlug(req: Request, res: Response): Promise<Response> {
    const rawSlug = req.params.slug;
    const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || '';

    const product = Array.from(AgroStore.products.values()).find(
      (p) => p.slug === slug || p.id === slug
    );

    if (!product) {
      return sendError(res, `Produit agricole '${slug}' introuvable au catalogue`, 404, 'PRODUCT_NOT_FOUND');
    }

    const category = AgroStore.categories.get(product.categoryId);

    // Récupérer toutes les offres des vendeurs pour ce produit
    const offers = Array.from(AgroStore.offers.values()).filter(
      (o) => (o.productId === product.id || o.productId === product.slug) && o.isAvailable
    );

    return sendSuccess(res, {
      ...product,
      categoryName: category?.name || 'Filière Agricole',
      categorySlug: category?.slug,
      offers,
    });
  }
}
