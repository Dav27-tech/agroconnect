import { Request, Response } from 'express';
import { sendSuccess } from '../../common/response.js';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  itemCount: number;
}

export const demoCategories: CategoryData[] = [
  {
    id: 'cat-tubercules',
    name: 'Tubercules & Racines',
    slug: 'tubercules-racines',
    description: 'Manioc, cossettes de manioc, patates douces, ignames et taro congolais.',
    icon: '🍠',
    itemCount: 48,
  },
  {
    id: 'cat-cereales',
    name: 'Céréales & Grains',
    slug: 'cereales-grains',
    description: 'Maïs jaune, maïs blanc, riz local de Bumba, sorgho et millet.',
    icon: '🌽',
    itemCount: 62,
  },
  {
    id: 'cat-maraichage',
    name: 'Légumes & Maraîchage',
    slug: 'legumes-maraichage',
    description: 'Feuilles de manioc (Pondu), matembele, bitekuteku, tomates, piments et oignons.',
    icon: '🥬',
    itemCount: 95,
  },
  {
    id: 'cat-legumineuses',
    name: 'Légumineuses & Oléagineux',
    slug: 'legumineuses-oleagineux',
    description: 'Haricots du Kivu, arachides, graines de courge, soja et sésame.',
    icon: '🥜',
    itemCount: 39,
  },
  {
    id: 'cat-fruits',
    name: 'Fruits Tropicaux',
    slug: 'fruits-tropicaux',
    description: 'Bananes plantains, papayes, mangues, ananas et avocats de production locale.',
    icon: '🍌',
    itemCount: 54,
  },
  {
    id: 'cat-intrants',
    name: 'Intrants & Équipements',
    slug: 'intrants-equipements',
    description: 'Semences certifiées, fertilisants, motopompes, houes, machettes et outillage.',
    icon: '🚜',
    itemCount: 31,
  },
];

export class CategoryController {
  public static async listCategories(_req: Request, res: Response): Promise<Response> {
    return sendSuccess(res, demoCategories, 'Catégories agricoles récupérées avec succès');
  }
}

