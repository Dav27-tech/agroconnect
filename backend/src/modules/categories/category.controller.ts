import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { AgroStore } from '../../database/store.js';

export class CategoryController {
  public static async listCategories(_req: Request, res: Response): Promise<Response> {
    const categories = Array.from(AgroStore.categories.values()).map((cat) => {
      // Calculer le nombre de produits et d'offres réelles
      const catProducts = Array.from(AgroStore.products.values()).filter((p) => p.categoryId === cat.id);
      const productIds = new Set(catProducts.map((p) => p.id));
      const activeOffers = Array.from(AgroStore.offers.values()).filter(
        (o) => productIds.has(o.productId) && o.isAvailable
      );

      return {
        ...cat,
        productsCount: catProducts.length,
        offersCount: activeOffers.length,
        itemCount: catProducts.length + activeOffers.length,
      };
    });

    return sendSuccess(res, categories, 'Liste des catégories agricoles récupérée avec succès');
  }

  public static async getCategoryBySlug(req: Request, res: Response): Promise<Response> {
    const rawSlug = req.params.slug;
    const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || '';
    const category = Array.from(AgroStore.categories.values()).find((c) => c.slug === slug || c.id === slug);

    if (!category) {
      return sendError(res, `Catégorie agricole '${slug}' introuvable`, 404, 'CATEGORY_NOT_FOUND');
    }

    const catProducts = Array.from(AgroStore.products.values()).filter((p) => p.categoryId === category.id);

    return sendSuccess(res, {
      ...category,
      products: catProducts,
    });
  }
}
