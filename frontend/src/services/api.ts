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
  User,
  SupportedCurrency,
  SaleType,
  StockMovementType,
  SubOrderStatus,
  CourierAccount,
  CourierDelivery,
  DeliveryOperation,
  DeliveryStatus,
  ManualCollectionMethod,
  AdminAccount,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const API_ORIGIN = new URL(API_BASE_URL).origin;

function normalizeOfferImage<T extends { imageUrl?: string | null }>(offer: T): T {
  if (!offer.imageUrl) return offer;

  const imageUrl = new URL(offer.imageUrl, API_ORIGIN);
  if (!imageUrl.pathname.startsWith('/uploads/')) return offer;

  return { ...offer, imageUrl: imageUrl.pathname };
}

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

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
      const details = json?.error?.details;
      const detailMessages = Array.isArray(details)
        ? details.flatMap((detail: unknown) => {
            if (typeof detail !== 'object' || detail === null || !('message' in detail)) return [];
            const message = detail.message;
            const path = 'path' in detail && typeof detail.path === 'string' ? detail.path : '';
            return typeof message === 'string' ? [`${path ? `${path}: ` : ''}${message}`] : [];
          })
        : [];
      const errorMessage = json?.error?.message || json?.message || `Erreur serveur (${res.status})`;
      throw new ApiError(
        detailMessages.length ? `${errorMessage} : ${detailMessages.join(', ')}` : errorMessage,
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
    async login(email: string, password: string): Promise<{ user: User; token: string }> {
      return await request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    async register(data: {
      phoneNumber: string;
      fullName: string;
      password: string;
      email: string;
      role: 'BUYER' | 'SELLER';
      province?: string;
      city?: string;
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
      return await request<Category[]>('/categories');
    },

    async getBySlug(slug: string): Promise<Category & { products?: ProductCatalogItem[] }> {
      return await request<Category & { products?: ProductCatalogItem[] }>(`/categories/${slug}`);
    },
  },

  // --------------------------------------------------------------------------
  // PRODUITS DU CATALOGUE COMMUN
  // --------------------------------------------------------------------------
  products: {
    async list(params?: { category?: string; search?: string }): Promise<ProductCatalogItem[]> {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await request<ProductCatalogItem[]>(`/products${query}`);
    },

    async getBySlug(slug: string): Promise<ProductCatalogItem & { offers: SellerOfferItem[] }> {
      const product = await request<ProductCatalogItem & { offers: SellerOfferItem[] }>(`/products/${slug}`);
      return { ...product, offers: product.offers.map(normalizeOfferImage) };
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
      featured?: boolean;
    }): Promise<SellerOfferItem[]> {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.province) searchParams.set('province', params.province);
      if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.featured) searchParams.set('featured', 'true');
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const offers = await request<SellerOfferItem[]>(`/offers${query}`);
      return offers.map(normalizeOfferImage);
    },

    async getById(id: string): Promise<SellerOfferItem & { seller?: SellerProfile }> {
      return normalizeOfferImage(await request<SellerOfferItem & { seller?: SellerProfile }>(`/offers/${id}`));
    },

    async create(data: Partial<SellerOfferItem>): Promise<SellerOfferItem> {
      return await request<SellerOfferItem>('/offers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async uploadImage(file: File): Promise<string> {
      const body = new FormData();
      body.append('image', file);
      const result = await request<{ imageUrl: string }>('/offers/image', {
        method: 'POST',
        body,
      });
      return new URL(result.imageUrl, new URL(API_BASE_URL).origin).toString();
    },

    async update(id: string, data: Partial<SellerOfferItem>): Promise<SellerOfferItem> {
      return normalizeOfferImage(await request<SellerOfferItem>(`/offers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }));
    },

    async remove(id: string): Promise<void> {
      await request<void>(`/offers/${id}`, { method: 'DELETE' });
    },
  },

  // --------------------------------------------------------------------------
  // VENDEURS
  // --------------------------------------------------------------------------
  sellers: {
    async list(params?: { province?: string; type?: string }): Promise<SellerProfile[]> {
      const searchParams = new URLSearchParams();
      if (params?.province) searchParams.set('province', params.province);
      if (params?.type) searchParams.set('type', params.type);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await request<SellerProfile[]>(`/sellers${query}`);
    },

    async getById(id: string): Promise<SellerProfile> {
      return await request<SellerProfile>(`/sellers/${id}`);
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
    async getMine(): Promise<ParentOrder[]> {
      return await request<ParentOrder[]>('/orders/mine');
    },

    async create(data: {
      items: Array<{ offerId: string; quantity: number; saleType: SaleType }>;
      currency?: SupportedCurrency;
      deliveryProvince: string;
      deliveryCity: string;
      deliveryAddress: string;
      recipientName: string;
      recipientPhone: string;
      deliveryInstructions?: string;
    }, idempotencyKey: string): Promise<ParentOrder> {
      return await request<ParentOrder>('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
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

    async confirmSellerPayout(subOrderId: string): Promise<{ subOrderId: string; payoutStatus: string; sellerConfirmedAt: string }> {
      return await request(`/orders/suborder/${subOrderId}/confirm-payout`, { method: 'POST' });
    },
  },

  // --------------------------------------------------------------------------
  // LIVRAISON & COLLECTE MANUELLE
  // --------------------------------------------------------------------------
  deliveries: {
    async listMine(): Promise<CourierDelivery[]> {
      return await request<CourierDelivery[]>('/deliveries/mine');
    },

    async listOperations(): Promise<DeliveryOperation[]> {
      return await request<DeliveryOperation[]>('/deliveries/operations');
    },

    async assign(deliveryId: string, personnelId: string): Promise<{ deliveryId: string; courierId: string; status: string }> {
      return await request(`/deliveries/${deliveryId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ personnelId }),
      });
    },

    async updateStatus(deliveryId: string, status: Extract<DeliveryStatus, 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED'>): Promise<{ id: string; status: DeliveryStatus }> {
      return await request(`/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    async recordCollection(deliveryId: string, data: {
      method: ManualCollectionMethod;
      amountCdf: number;
      reference?: string;
    }): Promise<{ deliveryId: string; status: DeliveryStatus; amountCdf: number; collectionMethod?: ManualCollectionMethod }> {
      return await request(`/deliveries/${deliveryId}/collection`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async confirmPlatformDeposit(deliveryId: string, amountCdf: number): Promise<{ deliveryId: string; amountCdf: number; receivedAt: string }> {
      return await request(`/deliveries/${deliveryId}/platform-deposit`, {
        method: 'POST',
        body: JSON.stringify({ amountCdf }),
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
    }): Promise<{
      offer: Pick<SellerOfferItem, 'id' | 'sellerId' | 'productName' | 'stockQuantity' | 'unit' | 'isAvailable'>;
      movement: StockMovement;
    }> {
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
    }): Promise<SellerService> {
      return await request('/seller-services', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // --------------------------------------------------------------------------
  // FINANCE
  // --------------------------------------------------------------------------
  finance: {
    async getPlatformSummary(): Promise<{
      totalRecords: number;
      grossMarketplaceVolumeCdf: number;
      agroConnectCommissionCdf: number;
      sellerEarningsCdf: number;
      platformReceivedCdf: number;
      awaitingPlatformDepositCdf: number;
      awaitingSellerConfirmationCdf: number;
    }> {
      return await request('/finance/summary');
    },

    async getSellerFinancials(sellerId: string): Promise<{
      sellerId: string;
      summary: {
        grossSalesCdf: number;
        commissionCdf: number;
        sellerEarningsCdf: number;
      };
      records: Array<{
        subOrderId: string;
        grossAmountCdf: number;
        commissionRate: number;
        commissionAmountCdf: number;
        sellerEarningsCdf: number;
        payoutStatus: string;
        deliveryStatus: DeliveryStatus | null;
        platformDepositReceivedAt: string | null;
        sellerConfirmedAt: string | null;
        recordedAt: string;
      }>;
    }> {
      return await request(`/finance/seller/${sellerId}`);
    },
  },

  admin: {
    async getCommissionSettings(): Promise<{ commissionRatePercent: number }> {
      return await request('/admin/commission-settings');
    },

    async updateCommissionSettings(commissionRatePercent: number): Promise<{ commissionRatePercent: number }> {
      return await request('/admin/commission-settings', {
        method: 'PATCH',
        body: JSON.stringify({ commissionRatePercent }),
      });
    },

    async listCouriers(): Promise<CourierAccount[]> {
      return await request<CourierAccount[]>('/admin/couriers');
    },

    async createCourier(data: {
      fullName: string;
      email: string;
      phoneNumber: string;
      password: string;
      companyName?: string;
      vehicleType?: string;
      plateNumber?: string;
      operatingArea: string;
    }): Promise<CourierAccount> {
      return await request<CourierAccount>('/admin/couriers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateCourierAvailability(courierId: string, isAvailable: boolean): Promise<{ id: string; isAvailable: boolean }> {
      return await request(`/admin/couriers/${courierId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      });
    },

    async getStats(): Promise<{
      usersCount: number;
      activeSellersCount: number;
      catalogueProductsCount: number;
      activeOffersCount: number;
      parentOrdersCount: number;
      subOrdersCount: number;
    }> {
      return await request('/admin/stats');
    },

    async listSellerProfiles(status = 'PENDING'): Promise<Array<{
      id: string;
      fullName: string;
      phoneNumber: string;
      email?: string | null;
      sellerType: string;
      businessName: string;
      province: string;
      city: string;
      address?: string | null;
      verificationStatus: string;
      isActive: boolean;
    }>> {
      return await request(`/admin/seller-profiles?status=${encodeURIComponent(status)}`);
    },

    async updateSellerVerification(sellerId: string, status: 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED') {
      return await request(`/admin/seller-profiles/${sellerId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    async updateSellerActiveStatus(sellerId: string, isActive: boolean) {
      return await request<{ sellerId: string; isActive: boolean }>(`/admin/seller-profiles/${sellerId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },

  },

  superAdmin: {
    async listAdmins(): Promise<AdminAccount[]> {
      return await request<AdminAccount[]>('/admin/admins');
    },

    async createAdmin(data: {
      fullName: string;
      email: string;
      phoneNumber: string;
      password: string;
    }): Promise<AdminAccount> {
      return await request<AdminAccount>('/admin/admins', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateAdminStatus(userId: string, isActive: boolean): Promise<AdminAccount> {
      return await request<AdminAccount>(`/admin/admins/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },
  },
};

