import {
  Category,
  ProductCatalogItem,
  SellerOfferItem,
  SellerProfile,
  SellerService,
  StockMovement,
  CartCalculationResult,
  ParentOrder,
  SubOrder,
  DeliveryInfo,
  User,
  SupportedCurrency,
  SaleType,
  StockMovementType,
  SubOrderStatus,
  DeliveryStatus,
} from '../types';

import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_OFFERS,
  MOCK_SELLERS,
  MOCK_DELIVERIES,
} from '../data/mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('agroconnect_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new ApiError(
        json?.error?.message || json?.message || `Erreur serveur (${res.status})`,
        res.status,
        json?.error?.code
      );
    }

    return (json?.data !== undefined ? json.data : json) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Si le serveur backend n'est pas joignable (ex: rendu statique Next.js hors ligne)
    console.warn(`[AgroConnect API] Impossible de joindre ${url}. Utilisation du mode résilient.`);
    throw error;
  }
}

export const api = {
  // --------------------------------------------------------------------------
  // AUTHENTIFICATION & UTILISATEURS
  // --------------------------------------------------------------------------
  auth: {
    async login(phoneNumber: string, password: string): Promise<{ user: User; token: string }> {
      try {
        return await request<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phoneNumber, password }),
        });
      } catch (err) {
        // En mode démo local si le backend n'est pas démarré
        if ((err as Error).message.includes('fetch')) {
          const mockUser: User = {
            id: 'usr-demo-local',
            phoneNumber,
            fullName: 'Utilisateur AgroConnect Démo',
            roles: ['SELLER', 'BUYER'],
            sellerId: 'seller-coopak-kikwit',
          };
          return { user: mockUser, token: 'demo-jwt-token' };
        }
        throw err;
      }
    },

    async register(data: {
      phoneNumber: string;
      fullName: string;
      password: string;
      email?: string;
      roles?: string[];
      role?: string;
    }): Promise<{ user: User; token: string }> {
      return await request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async me(): Promise<User> {
      return await request<User>('/auth/me');
    },
  },

  // --------------------------------------------------------------------------
  // CATÉGORIES & FILIÈRES AGRICOLES
  // --------------------------------------------------------------------------
  categories: {
    async list(): Promise<Category[]> {
      try {
        return await request<Category[]>('/categories');
      } catch {
        return MOCK_CATEGORIES;
      }
    },

    async getBySlug(slug: string): Promise<Category & { products?: ProductCatalogItem[] }> {
      try {
        return await request<Category & { products?: ProductCatalogItem[] }>(`/categories/${slug}`);
      } catch {
        const cat = MOCK_CATEGORIES.find((c) => c.slug === slug || c.id === slug) || MOCK_CATEGORIES[0];
        return cat;
      }
    },
  },

  // --------------------------------------------------------------------------
  // PRODUITS DU CATALOGUE COMMUN
  // --------------------------------------------------------------------------
  products: {
    async list(params?: { category?: string; search?: string }): Promise<ProductCatalogItem[]> {
      try {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.search) searchParams.set('search', params.search);
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return await request<ProductCatalogItem[]>(`/products${query}`);
      } catch {
        let list = [...MOCK_PRODUCTS];
        if (params?.category) list = list.filter((p) => p.categoryId === params.category);
        if (params?.search) list = list.filter((p) => p.name.toLowerCase().includes(params.search!.toLowerCase()));
        return list;
      }
    },

    async getBySlug(slug: string): Promise<ProductCatalogItem & { offers: SellerOfferItem[] }> {
      try {
        return await request<ProductCatalogItem & { offers: SellerOfferItem[] }>(`/products/${slug}`);
      } catch {
        const prod = MOCK_PRODUCTS.find((p) => p.slug === slug || p.id === slug) || MOCK_PRODUCTS[0];
        const offers = MOCK_OFFERS.filter((o) => o.productId === prod.id || o.productId === prod.slug);
        return {
          ...prod,
          offers: offers.length > 0 ? offers : [MOCK_OFFERS[0]],
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // OFFRES SPÉCIFIQUES DES VENDEURS
  // --------------------------------------------------------------------------
  offers: {
    async list(params?: {
      category?: string;
      province?: string;
      sellerId?: string;
      search?: string;
    }): Promise<SellerOfferItem[]> {
      try {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.province) searchParams.set('province', params.province);
        if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
        if (params?.search) searchParams.set('search', params.search);
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return await request<SellerOfferItem[]>(`/offers${query}`);
      } catch {
        return MOCK_OFFERS;
      }
    },

    async getById(id: string): Promise<SellerOfferItem & { seller?: SellerProfile }> {
      try {
        return await request<SellerOfferItem & { seller?: SellerProfile }>(`/offers/${id}`);
      } catch {
        const offer = MOCK_OFFERS.find((o) => o.id === id) || MOCK_OFFERS[0];
        const seller = MOCK_SELLERS.find((s) => s.id === offer.sellerId);
        return { ...offer, seller: seller as unknown as SellerProfile };
      }
    },

    async create(data: Partial<SellerOfferItem>): Promise<SellerOfferItem> {
      return await request<SellerOfferItem>('/offers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Partial<SellerOfferItem>): Promise<SellerOfferItem> {
      return await request<SellerOfferItem>(`/offers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // --------------------------------------------------------------------------
  // VENDEURS
  // --------------------------------------------------------------------------
  sellers: {
    async list(params?: { province?: string; type?: string }): Promise<SellerProfile[]> {
      try {
        const searchParams = new URLSearchParams();
        if (params?.province) searchParams.set('province', params.province);
        if (params?.type) searchParams.set('type', params.type);
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return await request<SellerProfile[]>(`/sellers${query}`);
      } catch {
        return MOCK_SELLERS as unknown as SellerProfile[];
      }
    },

    async getById(id: string): Promise<SellerProfile> {
      try {
        return await request<SellerProfile>(`/sellers/${id}`);
      } catch {
        const seller = MOCK_SELLERS.find((s) => s.id === id) || MOCK_SELLERS[0];
        const offers = MOCK_OFFERS.filter((o) => o.sellerId === seller.id);
        return { ...seller, offers } as unknown as SellerProfile;
      }
    },

    async createProfile(data: {
      businessName: string;
      sellerType: string;
      province: string;
      city: string;
      address?: string;
      description?: string;
    }): Promise<SellerProfile> {
      return await request<SellerProfile>('/sellers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateProfile(id: string, data: Partial<SellerProfile>): Promise<SellerProfile> {
      return await request<SellerProfile>(`/sellers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // --------------------------------------------------------------------------
  // PANIER MULTI-VENDEURS & CALCULS MONÉTAIRES
  // --------------------------------------------------------------------------
  cart: {
    async calculate(
      items: Array<{ offerId: string; quantity: number; saleType: SaleType }>
    ): Promise<CartCalculationResult> {
      return await request<CartCalculationResult>('/cart/calculate', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },
  },

  // --------------------------------------------------------------------------
  // COMMANDES & SOUS-COMMANDES
  // --------------------------------------------------------------------------
  orders: {
    async create(data: {
      items: Array<{ offerId: string; quantity: number; saleType: SaleType }>;
      currency?: SupportedCurrency;
      deliveryProvince: string;
      deliveryCity: string;
      deliveryAddress: string;
      recipientName: string;
      recipientPhone: string;
      deliveryInstructions?: string;
    }): Promise<ParentOrder> {
      return await request<ParentOrder>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getById(id: string): Promise<ParentOrder> {
      return await request<ParentOrder>(`/orders/${id}`);
    },

    async getBySeller(sellerId: string): Promise<SubOrder[]> {
      return await request<SubOrder[]>(`/orders/seller/${sellerId}`);
    },

    async updateSubOrderStatus(subOrderId: string, status: SubOrderStatus): Promise<SubOrder> {
      return await request<SubOrder>(`/orders/suborder/${subOrderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  // --------------------------------------------------------------------------
  // LIVRAISON & TRAÇABILITÉ
  // --------------------------------------------------------------------------
  deliveries: {
    async track(code: string): Promise<DeliveryInfo> {
      try {
        return await request<DeliveryInfo>(`/deliveries/track/${code}`);
      } catch {
        return MOCK_DELIVERIES as unknown as DeliveryInfo;
      }
    },

    async updateStatus(
      deliveryId: string,
      status: DeliveryStatus,
      location?: string,
      notes?: string
    ): Promise<DeliveryInfo> {
      return await request<DeliveryInfo>(`/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, location, notes }),
      });
    },
  },

  // --------------------------------------------------------------------------
  // GESTION DES STOCKS & INVENTAIRE VENDEUR
  // --------------------------------------------------------------------------
  inventory: {
    async getBySeller(sellerId: string): Promise<{
      sellerId: string;
      businessName: string;
      totalOffers: number;
      offers: Array<{
        offerId: string;
        productName: string;
        stockQuantity: number;
        unit: string;
        isAvailable: boolean;
        retailPriceCdf: number;
        wholesalePriceCdf?: number;
      }>;
      movementsLog: StockMovement[];
    }> {
      return await request(`/inventory/seller/${sellerId}`);
    },

    async recordMovement(data: {
      offerId: string;
      quantityChange: number;
      movementType: StockMovementType;
      notes?: string;
    }): Promise<{ offer: SellerOfferItem; movement: StockMovement }> {
      return await request('/inventory/movement', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // --------------------------------------------------------------------------
  // SERVICES VENDEURS
  // --------------------------------------------------------------------------
  sellerServices: {
    async list(sellerId?: string): Promise<{
      standardCatalogue: Array<{ code: string; title: string; description: string }>;
      sellerServices: SellerService[];
    }> {
      const q = sellerId ? `?sellerId=${sellerId}` : '';
      return await request(`/seller-services${q}`);
    },

    async create(data: {
      serviceType: string;
      title: string;
      description?: string;
      extraFeeCdf?: number;
      extraFeeUsd?: number;
    }): Promise<SellerService> {
      return await request('/seller-services', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // --------------------------------------------------------------------------
  // FINANCE & TAUX DE CHANGE
  // --------------------------------------------------------------------------
  finance: {
    async getSellerFinancials(sellerId: string): Promise<{
      sellerId: string;
      businessName: string;
      summary: {
        grossSalesCdf: number;
        grossSalesUsd: number;
        commissionsPaidCdf: number;
        commissionsPaidUsd: number;
        netEarningsCdf: number;
        netEarningsUsd: number;
      };
      records: Array<{
        id: string;
        subOrderId: string;
        grossAmountCdf: number;
        grossAmountUsd: number;
        commissionRate: number;
        commissionAmountCdf: number;
        commissionAmountUsd: number;
        sellerEarningsCdf: number;
        sellerEarningsUsd: number;
        status: string;
        recordedAt: string;
      }>;
    }> {
      return await request(`/finance/seller/${sellerId}`);
    },
  },

  admin: {
    async getExchangeRate(): Promise<{
      activeRate: { rate: number; effectiveFrom: string; baseCurrency: string; targetCurrency: string };
    }> {
      try {
        return await request('/admin/exchange-rate');
      } catch {
        return {
          activeRate: {
            rate: 2850,
            effectiveFrom: new Date().toISOString(),
            baseCurrency: 'USD',
            targetCurrency: 'CDF',
          },
        };
      }
    },
  },
};

