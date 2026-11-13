import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';

export interface ProductCatalogItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  standardUnit: 'KG' | 'SAC_25KG' | 'SAC_50KG' | 'SAC_100KG' | 'BOTTE' | 'TONNE' | 'PIECE' | 'LITRE';
  scientificName?: string;
  offersCount: number;
}

export const demoProducts: ProductCatalogItem[] = [
  {
    id: 'prod-manioc-doux',
    name: 'Manioc Frais Doux',
    slug: 'manioc-frais-doux',
    categoryId: 'cat-tubercules',
    description: 'Racines de manioc blanc doux cultivées sans pesticides chimiques.',
    standardUnit: 'SAC_50KG',
    scientificName: 'Manihot esculenta',
    offersCount: 3,
  },
  {
    id: 'prod-mais-grain-jaune',
    name: 'Maïs Grain Jaune Séché',
    slug: 'mais-grain-jaune-seche',
    categoryId: 'cat-cereales',
    description: 'Grains de maïs séchés au soleil avec taux d\'humidité inférieur à 13%. Idéal pour minoterie et alimentation.',
    standardUnit: 'SAC_100KG',
    scientificName: 'Zea mays',
    offersCount: 4,
  },
  {
    id: 'prod-haricot-kivu',
    name: 'Haricot Rouge du Kivu',
    slug: 'haricot-rouge-kivu',
    categoryId: 'cat-legumineuses',
    description: 'Haricot sec riche en protéines, récolté sur les hauts plateaux volcaniques.',
    standardUnit: 'SAC_100KG',
    scientificName: 'Phaseolus vulgaris',
    offersCount: 2,
  },
  {
    id: 'prod-pondu-frais',
    name: 'Feuilles de Manioc (Pondu/Saka-Saka)',
    slug: 'pondu-feuilles-manioc-frais',
    categoryId: 'cat-maraichage',
    description: 'Feuilles tendres de manioc fraîches cueillies le jour même.',
    standardUnit: 'BOTTE',
    scientificName: 'Manihot esculenta folium',
    offersCount: 5,
  },
  {
    id: 'prod-semence-mais-hybride',
    name: 'Semences Certifiées Maïs Hybride',
    slug: 'semences-certifiees-mais-hybride',
    categoryId: 'cat-intrants',
    description: 'Variété certifiée à haut rendement adaptée aux climats congolais.',
    standardUnit: 'SAC_25KG',
    offersCount: 1,
  },
];

export class ProductController {
  public static async listProducts(req: Request, res: Response): Promise<Response> {
    const { categoryId, search } = req.query;

    let items = [...demoProducts];

    if (categoryId && typeof categoryId === 'string') {
      items = items.filter((p) => p.categoryId === categoryId);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    return sendSuccess(res, items, 'Catalogue des produits communs récupéré avec succès', 200, {
      total: items.length,
    });
  }

  public static async getProductById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const product = demoProducts.find((p) => p.id === id || p.slug === id);

    if (!product) {
      return sendError(res, `Produit de catalogue '${id}' introuvable`, 404, 'PRODUCT_NOT_FOUND');
    }

    return sendSuccess(res, product);
  }
}
