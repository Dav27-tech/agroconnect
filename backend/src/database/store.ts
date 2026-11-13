import { SupportedCurrency, DRC_EXCHANGE_RATE, DRC_PROVINCES } from '../config/drc.js';
import { Money } from '../common/money.js';

export type UserRole = 'BUYER' | 'SELLER' | 'DELIVERY_PROVIDER' | 'DELIVERY_PERSON' | 'ADMIN';
export type SellerType = 'FARMER' | 'RESELLER' | 'SUPPLIER';
export type VerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
export type SaleType = 'RETAIL' | 'WHOLESALE';
export type StockMovementType =
  | 'INITIAL_STOCK'
  | 'RESTOCK'
  | 'ORDER_RESERVATION'
  | 'ORDER_FULFILLMENT'
  | 'ORDER_CANCELLED_RESTORE'
  | 'MANUAL_ADJUSTMENT'
  | 'SPOILAGE_LOSS';

export type ParentOrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED';
export type SubOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_DELIVERY' | 'DELIVERED' | 'REJECTED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface UserRecord {
  id: string;
  phoneNumber: string;
  email?: string;
  passwordHash: string;
  fullName: string;
  roles: UserRole[]; // Support multi-rôles natif
  isActive: boolean;
  preferredLang: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerProfileRecord {
  id: string;
  userId: string;
  sellerType: SellerType;
  businessName: string;
  description?: string;
  province: string;
  city: string;
  address?: string;
  verificationStatus: VerificationStatus;
  commissionRate: number; // ex: 5.0%
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryProfileRecord {
  id: string;
  userId: string;
  companyName?: string;
  vehicleType?: string;
  plateNumber?: string;
  operatingArea: string;
  isAvailable: boolean;
  status: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  standardUnit: string;
  scientificName?: string;
  imageUrl?: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferRecord {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  productId: string;
  productName: string;
  categoryName: string;
  // Stock unique et partagé entre la vente au détail et en gros
  stockQuantity: number;
  unit: string;
  isAvailable: boolean;
  retailPriceCdf: number;
  retailPriceUsd: number;
  retailMinQuantity: number;
  wholesalePriceCdf?: number;
  wholesalePriceUsd?: number;
  wholesaleMinQuantity?: number;
  originProvince: string;
  originCity?: string;
  qualityGrade?: string;
  imageUrl?: string;
  servicesOffered: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerServiceRecord {
  id: string;
  sellerId: string;
  serviceType: string;
  title: string;
  description?: string;
  extraFeeCdf: number;
  extraFeeUsd: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovementRecord {
  id: string;
  offerId: string;
  sellerId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdByUserId?: string;
  createdAt: Date;
}

export interface CartItemRecord {
  id: string;
  cartId: string;
  offerId: string;
  saleType: SaleType;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartRecord {
  id: string;
  userId?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentOrderRecord {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: ParentOrderStatus;
  exchangeRateSnapshot: number; // Figé à la seconde précise de création
  currency: SupportedCurrency;
  totalItemsCdf: number;
  totalItemsUsd: number;
  deliveryFeeCdf: number;
  deliveryFeeUsd: number;
  totalAmountCdf: number;
  totalAmountUsd: number;
  deliveryProvince: string;
  deliveryCity: string;
  deliveryCommune?: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubOrderRecord {
  id: string;
  subOrderNumber: string;
  parentOrderId: string;
  sellerId: string;
  sellerName: string;
  status: SubOrderStatus;
  subtotalCdf: number;
  subtotalUsd: number;
  commissionRate: number; // %
  commissionAmountCdf: number;
  commissionAmountUsd: number;
  payoutAmountCdf: number;
  payoutAmountUsd: number;
  payoutStatus: PayoutStatus;
  deliveryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemRecord {
  id: string;
  subOrderId: string;
  offerId: string;
  productName: string;
  saleType: SaleType;
  quantity: number;
  unitPriceCdf: number;
  unitPriceUsd: number;
  subtotalCdf: number;
  subtotalUsd: number;
  createdAt: Date;
}

export interface PaymentRecord {
  id: string;
  parentOrderId: string;
  provider: string;
  providerTransactionId?: string;
  idempotencyKey: string;
  amountCdf: number;
  amountUsd: number;
  currency: SupportedCurrency;
  status: PaymentStatus;
  verifiedAt?: Date;
  rawResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRecord {
  id: string;
  subOrderId: string;
  trackingCode: string;
  personnelId?: string;
  status: DeliveryStatus;
  pickupProvince: string;
  pickupCity: string;
  pickupAddress: string;
  dropoffProvince: string;
  dropoffCity: string;
  dropoffAddress: string;
  estimatedDeliveryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryStatusHistoryRecord {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  notes?: string;
  location?: string;
  recordedBy?: string;
  createdAt: Date;
}

export interface ExchangeRateConfigRecord {
  id: string;
  baseCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
  rate: number;
  isActive: boolean;
  source: string;
  effectiveFrom: Date;
  configuredByUserId?: string;
  configuredByName?: string;
  notes?: string;
  createdAt: Date;
}

export interface FinancialRecordItem {
  id: string;
  subOrderId: string;
  sellerId: string;
  parentOrderId: string;
  grossAmountCdf: number;
  grossAmountUsd: number;
  commissionRate: number;
  commissionAmountCdf: number;
  commissionAmountUsd: number;
  sellerEarningsCdf: number;
  sellerEarningsUsd: number;
  exchangeRateApplied: number;
  status: PayoutStatus;
  recordedAt: Date;
  payoutRef?: string;
  paidAt?: Date;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

/**
 * AgroConnect Data Store Singleton
 * Implémente l'ensemble des règles métier et assure l'intégrité relationnelle
 */
export class AgroStore {
  public static users = new Map<string, UserRecord>();
  public static sellerProfiles = new Map<string, SellerProfileRecord>();
  public static deliveryProfiles = new Map<string, DeliveryProfileRecord>();
  public static categories = new Map<string, CategoryRecord>();
  public static products = new Map<string, ProductRecord>();
  public static offers = new Map<string, OfferRecord>();
  public static sellerServices = new Map<string, SellerServiceRecord>();
  public static stockMovements: StockMovementRecord[] = [];
  public static carts = new Map<string, CartRecord>();
  public static cartItems = new Map<string, CartItemRecord>();
  public static parentOrders = new Map<string, ParentOrderRecord>();
  public static subOrders = new Map<string, SubOrderRecord>();
  public static orderItems: OrderItemRecord[] = [];
  public static payments = new Map<string, PaymentRecord>();
  public static deliveries = new Map<string, DeliveryRecord>();
  public static deliveryHistories: DeliveryStatusHistoryRecord[] = [];
  public static exchangeRates: ExchangeRateConfigRecord[] = [];
  public static financialRecords = new Map<string, FinancialRecordItem>();
  public static notifications: NotificationRecord[] = [];

  private static initialized = false;

  /**
   * Initialise les données de référence et de démonstration conformes à la RDC
   */
  public static seed(): void {
    if (this.initialized) return;
    this.initialized = true;

    const now = new Date();

    // 1. Taux de change initial configurable RDC
    this.exchangeRates.push({
      id: 'rate-cfg-2026',
      baseCurrency: 'USD',
      targetCurrency: 'CDF',
      rate: DRC_EXCHANGE_RATE.defaultRate, // 2850 CDF
      isActive: true,
      source: 'MANUAL_CONFIG',
      effectiveFrom: now,
      configuredByName: 'Administrateur National AgroConnect RDC',
      notes: 'Taux indicatif officiel de référence pour les transactions agricoles en RDC',
      createdAt: now,
    });

    // 2. Filières & Catégories Agricoles Congolaises
    const seedCategories: CategoryRecord[] = [
      {
        id: 'cat-tubercules',
        name: 'Tubercules & Racines',
        slug: 'tubercules-racines',
        description: 'Manioc doux, cossettes de manioc, patates douces, ignames et taro.',
        icon: '🍠',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-cereales',
        name: 'Céréales & Grains',
        slug: 'cereales-grains',
        description: 'Maïs jaune pour provenderie, maïs blanc, riz de Bumba et sorgho.',
        icon: '🌽',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-maraichage',
        name: 'Légumes & Maraîchage',
        slug: 'legumes-maraichage',
        description: 'Feuilles de manioc (Pondu / Saka-Saka), matembele, tomates et piments frais.',
        icon: '🥬',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-legumineuses',
        name: 'Légumineuses & Protéagineux',
        slug: 'legumineuses-proteagineux',
        description: 'Haricots rouges et noirs du Kivu, arachides de Bandundu et soja.',
        icon: '🥜',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-fruits',
        name: 'Fruits & Vergers',
        slug: 'fruits-vergers',
        description: 'Bananes plantains, papayes, avocats du Kivu, ananas et mangues.',
        icon: '🍌',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-intrants',
        name: 'Intrants & Équipements Agricoles',
        slug: 'intrants-equipements',
        description: 'Semences certifiées ONASEN, fertilisants NPK, pulvérisateurs et outillage.',
        icon: '🌱',
        createdAt: now,
        updatedAt: now,
      },
    ];
    seedCategories.forEach((c) => this.categories.set(c.id, c));

    // 3. Produits Communs du Catalogue (AgroConnect n'en possède aucun stock !)
    const seedProducts: ProductRecord[] = [
      {
        id: 'prod-manioc-doux',
        name: 'Manioc Frais Doux',
        slug: 'manioc-frais-doux',
        description: 'Racines fraîches de manioc blanc à chair ferme et douce pour le fufu ou chikwangue.',
        standardUnit: 'Sac de 50kg',
        scientificName: 'Manihot esculenta',
        categoryId: 'cat-tubercules',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-mais-grain-jaune',
        name: 'Maïs Grain Jaune Séché',
        slug: 'mais-grain-jaune-seche',
        description: 'Grains entiers de maïs jaune séchés au soleil avec taux d\'humidité < 12.5%.',
        standardUnit: 'Sac de 100kg',
        scientificName: 'Zea mays',
        categoryId: 'cat-cereales',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-haricot-rouge-kivu',
        name: 'Haricot Rouge des Plateaux du Kivu',
        slug: 'haricot-rouge-kivu',
        description: 'Haricots secs réputés pour leur cuisson rapide et leur teneur élevée en protéines.',
        standardUnit: 'Sac de 100kg',
        scientificName: 'Phaseolus vulgaris',
        categoryId: 'cat-legumineuses',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-pondu-frais',
        name: 'Feuilles de Manioc (Pondu / Saka-Saka)',
        slug: 'pondu-feuilles-manioc-frais',
        description: 'Jeunes feuilles tendres de manioc fraîches, cueillies à l\'aube.',
        standardUnit: 'Grande Botte',
        scientificName: 'Manihot esculenta folium',
        categoryId: 'cat-maraichage',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-arachides-bandundu',
        name: 'Arachides Décortiquées de Bandundu',
        slug: 'arachides-decortiquees-bandundu',
        description: 'Arachides de première qualité pour pâte d\'arachide locale ou consommation directe.',
        standardUnit: 'Sac de 50kg',
        scientificName: 'Arachis hypogaea',
        categoryId: 'cat-legumineuses',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-engrais-npk',
        name: 'Fertilisant Minéral NPK 17-17-17',
        slug: 'fertilisant-npk-17-17-17',
        description: 'Engrais granulé complet adapté aux cultures maraîchères et vivrières de RDC.',
        standardUnit: 'Sac de 50kg',
        scientificName: 'NPK 17-17-17 Compound',
        categoryId: 'cat-intrants',
        createdAt: now,
        updatedAt: now,
      },
    ];
    seedProducts.forEach((p) => this.products.set(p.id, p));

    // 4. Utilisateurs avec Support Multi-Rôles
    const seedUsers: UserRecord[] = [
      {
        id: 'usr-farmer-jean-pierre',
        phoneNumber: '+243818001122',
        email: 'coopak.kikwit@agroconnect.cd',
        passwordHash: 'scrypt:demo-salt:demo-hash',
        fullName: 'Papa Jean-Pierre Kabamba',
        roles: ['SELLER', 'BUYER'], // Double rôle : producteur vendeur et acheteur d'intrants
        isActive: true,
        preferredLang: 'fr',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-reseller-marie',
        phoneNumber: '+243825553344',
        email: 'agrodistrib.kin@agroconnect.cd',
        passwordHash: 'scrypt:demo-salt:demo-hash',
        fullName: 'Maman Marie Mbuyi',
        roles: ['SELLER', 'BUYER'], // Double rôle : revendeur urbain et acheteur en gros
        isActive: true,
        preferredLang: 'fr',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-supplier-katanga',
        phoneNumber: '+243970009988',
        email: 'katanga.agrotech@agroconnect.cd',
        passwordHash: 'scrypt:demo-salt:demo-hash',
        fullName: 'Ir. Dieudonné Katanga',
        roles: ['SELLER'],
        isActive: true,
        preferredLang: 'fr',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-buyer-patrick',
        phoneNumber: '+243890001122',
        email: 'patrick.mwamba@gmail.cd',
        passwordHash: 'scrypt:demo-salt:demo-hash',
        fullName: 'Patrick Mwamba (Grossiste Kinshasa)',
        roles: ['BUYER'],
        isActive: true,
        preferredLang: 'fr',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-delivery-express',
        phoneNumber: '+243991122334',
        email: 'transcongo.livraison@agroconnect.cd',
        passwordHash: 'scrypt:demo-salt:demo-hash',
        fullName: 'Célestin Ilunga (TransCongo Express)',
        roles: ['DELIVERY_PERSON', 'DELIVERY_PROVIDER'],
        isActive: true,
        preferredLang: 'fr',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-admin-kin',
        phoneNumber: '+243810000001',
        email: 'admin.rdc@agroconnect.cd',
        passwordHash: 'scrypt:demo-salt:demo-hash',
        fullName: 'Superviseur National AgroConnect RDC',
        roles: ['ADMIN'],
        isActive: true,
        preferredLang: 'fr',
        createdAt: now,
        updatedAt: now,
      },
    ];
    seedUsers.forEach((u) => this.users.set(u.id, u));

    // 5. Profils Vendeurs Distincts (Agriculteur, Revendeur, Fournisseur)
    const seedSellers: SellerProfileRecord[] = [
      {
        id: 'seller-coopak-kikwit',
        userId: 'usr-farmer-jean-pierre',
        sellerType: 'FARMER',
        businessName: 'Coopérative Agricole du Kwilu (COOPAK)',
        description: 'Union paysanne de 180 producteurs de manioc et de maïs dans le territoire de Bulungu (Kwilu).',
        province: 'Kwilu',
        city: 'Kikwit',
        address: 'Route Nationale 1, Quartier Commercial',
        verificationStatus: 'VERIFIED',
        commissionRate: 5.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seller-agrodistrib-kin',
        userId: 'usr-reseller-marie',
        sellerType: 'RESELLER',
        businessName: 'AgroDistrib Kinshasa Express',
        description: 'Centrale de redistribution maraîchère urbaine. Triage, lavage et livraison rapide.',
        province: 'Kinshasa',
        city: 'Kinshasa',
        address: 'Marché de la Liberté, Pavillon Agricole 4, Masina',
        verificationStatus: 'VERIFIED',
        commissionRate: 5.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seller-katanga-agrotech',
        userId: 'usr-supplier-katanga',
        sellerType: 'SUPPLIER',
        businessName: 'Katanga Agro-Tech & Intrants',
        description: 'Fournisseur d\'intrants certifiés et engrais minéraux pour le Grand Katanga.',
        province: 'Haut-Katanga',
        city: 'Lubumbashi',
        address: 'Avenue Kapenda, Proche Gare SNCC',
        verificationStatus: 'VERIFIED',
        commissionRate: 5.0,
        createdAt: now,
        updatedAt: now,
      },
    ];
    seedSellers.forEach((s) => this.sellerProfiles.set(s.id, s));

    // 6. Profils de Livraison
    const seedDeliveryProfiles: DeliveryProfileRecord[] = [
      {
        id: 'del-prof-transcongo',
        userId: 'usr-delivery-express',
        companyName: 'TransCongo Express Logistique',
        vehicleType: 'Camionnette Isuzu 3.5T',
        plateNumber: 'KN-8492-BG',
        operatingArea: 'Kinshasa (Gombe, Limete, Masina, Kasa-Vubu)',
        isAvailable: true,
        status: 'VERIFIED',
        createdAt: now,
        updatedAt: now,
      },
    ];
    seedDeliveryProfiles.forEach((d) => this.deliveryProfiles.set(d.id, d));

    // 7. Services proposés par les vendeurs
    const seedServices: SellerServiceRecord[] = [
      {
        id: 'srv-lavage-kin',
        sellerId: 'seller-agrodistrib-kin',
        serviceType: 'LAVAGE_EPLUCHAGE',
        title: 'Lavage et épluchage à l\'eau potable',
        description: 'Préparation et assainissement des légumes et tubercules avant conditionnement.',
        extraFeeCdf: 3000,
        extraFeeUsd: 1.05,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'srv-livraison-express',
        sellerId: 'seller-agrodistrib-kin',
        serviceType: 'LIVRAISON_EXPRESS',
        title: 'Livraison express en moins de 24h à Kinshasa',
        description: 'Acheminement direct par motocycliste ou camionnette réfrigérée.',
        extraFeeCdf: 15000,
        extraFeeUsd: 5.26,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'srv-tri-coopak',
        sellerId: 'seller-coopak-kikwit',
        serviceType: 'CALIBRAGE_TRI',
        title: 'Calibrage et dépoussiérage mécanique',
        description: 'Garantie de grains entiers sans impuretés pour minoterie.',
        extraFeeCdf: 5000,
        extraFeeUsd: 1.75,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    seedServices.forEach((s) => this.sellerServices.set(s.id, s));

    // 8. Offres Vendeurs Spécifiques avec Stock Partagé (Règle Vente Gros & Détail)
    const seedOffers: OfferRecord[] = [
      {
        id: 'off-manioc-coopak',
        sellerId: 'seller-coopak-kikwit',
        sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
        sellerType: 'FARMER',
        productId: 'prod-manioc-doux',
        productName: 'Manioc Frais Doux',
        categoryName: 'Tubercules & Racines',
        stockQuantity: 150, // Stock partagé entre détail et gros
        unit: 'Sac de 50kg',
        isAvailable: true,
        retailPriceCdf: 42000,
        retailPriceUsd: 14.74,
        retailMinQuantity: 1,
        wholesalePriceCdf: 38000,
        wholesalePriceUsd: 13.33,
        wholesaleMinQuantity: 10,
        originProvince: 'Kwilu',
        originCity: 'Kikwit',
        qualityGrade: 'Extra Frais',
        imageUrl: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=800',
        servicesOffered: ['Tri calibré au champ', 'Paiement mobile sécurisé'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'off-manioc-agrodistrib',
        sellerId: 'seller-agrodistrib-kin',
        sellerName: 'AgroDistrib Kinshasa Express',
        sellerType: 'RESELLER',
        productId: 'prod-manioc-doux',
        productName: 'Manioc Frais Doux',
        categoryName: 'Tubercules & Racines',
        stockQuantity: 65, // Stock propre au revendeur
        unit: 'Sac de 50kg',
        isAvailable: true,
        retailPriceCdf: 48000,
        retailPriceUsd: 16.84,
        retailMinQuantity: 1,
        wholesalePriceCdf: 44000,
        wholesalePriceUsd: 15.44,
        wholesaleMinQuantity: 5,
        originProvince: 'Kinshasa',
        originCity: 'Kinshasa',
        qualityGrade: 'Lavé & Conditionné',
        imageUrl: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=800',
        servicesOffered: ['Lavage à l\'eau potable', 'Livraison Express Kinshasa'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'off-mais-coopak',
        sellerId: 'seller-coopak-kikwit',
        sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
        sellerType: 'FARMER',
        productId: 'prod-mais-grain-jaune',
        productName: 'Maïs Grain Jaune Séché',
        categoryName: 'Céréales & Grains',
        stockQuantity: 240, // Stock partagé
        unit: 'Sac de 100kg',
        isAvailable: true,
        retailPriceCdf: 95000,
        retailPriceUsd: 33.33,
        retailMinQuantity: 1,
        wholesalePriceCdf: 88000,
        wholesalePriceUsd: 30.88,
        wholesaleMinQuantity: 5,
        originProvince: 'Kwilu',
        originCity: 'Bulungu',
        qualityGrade: 'Grade 1 Séché Soleil',
        imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800',
        servicesOffered: ['Conditionnement étanche', 'Contrôle humidité'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'off-pondu-agrodistrib',
        sellerId: 'seller-agrodistrib-kin',
        sellerName: 'AgroDistrib Kinshasa Express',
        sellerType: 'RESELLER',
        productId: 'prod-pondu-frais',
        productName: 'Feuilles de Manioc (Pondu / Saka-Saka)',
        categoryName: 'Légumes & Maraîchage',
        stockQuantity: 500,
        unit: 'Grande Botte',
        isAvailable: true,
        retailPriceCdf: 2500,
        retailPriceUsd: 0.88,
        retailMinQuantity: 2,
        wholesalePriceCdf: 2000,
        wholesalePriceUsd: 0.7,
        wholesaleMinQuantity: 20,
        originProvince: 'Kongo-Central',
        originCity: 'Madimba',
        qualityGrade: 'Cueillette Fraîche',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800',
        servicesOffered: ['Équeutage manuel', 'Livraison matinale'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'off-engrais-katanga',
        sellerId: 'seller-katanga-agrotech',
        sellerName: 'Katanga Agro-Tech & Intrants',
        sellerType: 'SUPPLIER',
        productId: 'prod-engrais-npk',
        productName: 'Fertilisant Minéral NPK 17-17-17',
        categoryName: 'Intrants & Équipements Agricoles',
        stockQuantity: 80,
        unit: 'Sac de 50kg',
        isAvailable: true,
        retailPriceCdf: 110000,
        retailPriceUsd: 38.6,
        retailMinQuantity: 1,
        wholesalePriceCdf: 102000,
        wholesalePriceUsd: 35.79,
        wholesaleMinQuantity: 10,
        originProvince: 'Haut-Katanga',
        originCity: 'Lubumbashi',
        qualityGrade: 'Homologué MinAgri',
        imageUrl: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800',
        servicesOffered: ['Conseil agronomique', 'Fiche technique'],
        createdAt: now,
        updatedAt: now,
      },
    ];

    seedOffers.forEach((o) => {
      this.offers.set(o.id, o);

      // Traçabilité du mouvement de stock initial
      this.stockMovements.push({
        id: `mvt-init-${o.id}`,
        offerId: o.id,
        sellerId: o.sellerId,
        movementType: 'INITIAL_STOCK',
        quantityChange: o.stockQuantity,
        previousStock: 0,
        newStock: o.stockQuantity,
        referenceType: 'INVENTORY_INITIALIZATION',
        referenceId: o.id,
        notes: `Inventaire initial déclaré par le vendeur pour ${o.productName}`,
        createdAt: now,
      });
    });

    // 9. Commande Historique Démonstrative Multi-Vendeurs
    const demoRate = 2850;
    const parentOrderId = 'ord-demo-202611-001';
    const orderNumber = 'AGC-ORD-202611-1001';

    const parentOrder: ParentOrderRecord = {
      id: parentOrderId,
      orderNumber,
      buyerId: 'usr-buyer-patrick',
      status: 'CONFIRMED',
      exchangeRateSnapshot: demoRate,
      currency: 'CDF',
      totalItemsCdf: 1970000,
      totalItemsUsd: 691.23,
      deliveryFeeCdf: 30000,
      deliveryFeeUsd: 10.53,
      totalAmountCdf: 2000000,
      totalAmountUsd: 701.75,
      deliveryProvince: 'Kinshasa',
      deliveryCity: 'Kinshasa',
      deliveryCommune: 'Gombe',
      deliveryAddress: 'Avenue Colonel Mondjiba, n° 34',
      recipientName: 'Patrick Mwamba',
      recipientPhone: '+243890001122',
      deliveryInstructions: 'Déposer à l\'entrepôt central AgroCommerce',
      createdAt: now,
      updatedAt: now,
    };
    this.parentOrders.set(parentOrder.id, parentOrder);

    // Sous-commande 1 : Vendeur COOPAK (Kwilu)
    const subOrder1: SubOrderRecord = {
      id: 'sub-demo-001-A',
      subOrderNumber: `${orderNumber}-A`,
      parentOrderId,
      sellerId: 'seller-coopak-kikwit',
      sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
      status: 'PREPARING',
      subtotalCdf: 1760000,
      subtotalUsd: 617.54,
      commissionRate: 5.0,
      commissionAmountCdf: 88000,
      commissionAmountUsd: 30.88,
      payoutAmountCdf: 1672000,
      payoutAmountUsd: 586.67,
      payoutStatus: 'PENDING',
      deliveryId: 'del-demo-001-A',
      createdAt: now,
      updatedAt: now,
    };
    this.subOrders.set(subOrder1.id, subOrder1);

    this.orderItems.push({
      id: 'item-001',
      subOrderId: subOrder1.id,
      offerId: 'off-mais-coopak',
      productName: 'Maïs Grain Jaune Séché',
      saleType: 'WHOLESALE',
      quantity: 20,
      unitPriceCdf: 88000,
      unitPriceUsd: 30.88,
      subtotalCdf: 1760000,
      subtotalUsd: 617.54,
      createdAt: now,
    });

    // Enregistrement financier de la commission AgroConnect pour la sous-commande 1
    this.financialRecords.set(subOrder1.id, {
      id: 'fin-sub-001-A',
      subOrderId: subOrder1.id,
      sellerId: subOrder1.sellerId,
      parentOrderId,
      grossAmountCdf: subOrder1.subtotalCdf,
      grossAmountUsd: subOrder1.subtotalUsd,
      commissionRate: subOrder1.commissionRate,
      commissionAmountCdf: subOrder1.commissionAmountCdf,
      commissionAmountUsd: subOrder1.commissionAmountUsd,
      sellerEarningsCdf: subOrder1.payoutAmountCdf,
      sellerEarningsUsd: subOrder1.payoutAmountUsd,
      exchangeRateApplied: demoRate,
      status: 'PENDING',
      recordedAt: now,
    });

    // Livraison associée à la sous-commande 1
    const delivery1: DeliveryRecord = {
      id: 'del-demo-001-A',
      subOrderId: subOrder1.id,
      trackingCode: 'AGC-TRK-784910',
      personnelId: 'del-prof-transcongo',
      status: 'IN_TRANSIT',
      pickupProvince: 'Kwilu',
      pickupCity: 'Kikwit',
      pickupAddress: 'Dépôt Coopératif COOPAK, Route Nationale 1',
      dropoffProvince: 'Kinshasa',
      dropoffCity: 'Kinshasa',
      dropoffAddress: 'Avenue Colonel Mondjiba n° 34, Gombe',
      createdAt: now,
      updatedAt: now,
    };
    this.deliveries.set(delivery1.id, delivery1);

    this.deliveryHistories.push(
      {
        id: 'hist-1',
        deliveryId: delivery1.id,
        status: 'PENDING',
        notes: 'Commande confirmée et sous-commande transmise au vendeur pour conditionnement',
        recordedBy: 'SYSTÈME',
        createdAt: new Date(now.getTime() - 86400000),
      },
      {
        id: 'hist-2',
        deliveryId: delivery1.id,
        status: 'ASSIGNED',
        notes: 'Chauffeur TransCongo Express assigné pour l\'acheminement',
        recordedBy: 'DISPATCH_LOGISTIQUE',
        createdAt: new Date(now.getTime() - 72000000),
      },
      {
        id: 'hist-3',
        deliveryId: delivery1.id,
        status: 'PICKED_UP',
        notes: 'Chargement effectué à Kikwit. Convoi en route vers Kinshasa via la RN1',
        location: 'Kikwit, Kwilu',
        recordedBy: 'Célestin Ilunga (Chauffeur)',
        createdAt: new Date(now.getTime() - 43200000),
      },
      {
        id: 'hist-4',
        deliveryId: delivery1.id,
        status: 'IN_TRANSIT',
        notes: 'Passage du poste de contrôle de Kenge. Arrivée estimée à Masina sous 6 heures',
        location: 'Kenge, Kwango',
        recordedBy: 'Célestin Ilunga (Chauffeur)',
        createdAt: new Date(now.getTime() - 10800000),
      }
    );

    // Sous-commande 2 : Vendeur AgroDistrib (Kinshasa)
    const subOrder2: SubOrderRecord = {
      id: 'sub-demo-001-B',
      subOrderNumber: `${orderNumber}-B`,
      parentOrderId,
      sellerId: 'seller-agrodistrib-kin',
      sellerName: 'AgroDistrib Kinshasa Express',
      status: 'PREPARING',
      subtotalCdf: 210000,
      subtotalUsd: 73.68,
      commissionRate: 5.0,
      commissionAmountCdf: 10500,
      commissionAmountUsd: 3.68,
      payoutAmountCdf: 199500,
      payoutAmountUsd: 70.0,
      payoutStatus: 'PENDING',
      deliveryId: 'del-demo-001-B',
      createdAt: now,
      updatedAt: now,
    };
    this.subOrders.set(subOrder2.id, subOrder2);

    this.orderItems.push({
      id: 'item-002',
      subOrderId: subOrder2.id,
      offerId: 'off-pondu-agrodistrib',
      productName: 'Feuilles de Manioc (Pondu / Saka-Saka)',
      saleType: 'WHOLESALE',
      quantity: 105,
      unitPriceCdf: 2000,
      unitPriceUsd: 0.7,
      subtotalCdf: 210000,
      subtotalUsd: 73.68,
      createdAt: now,
    });

    this.financialRecords.set(subOrder2.id, {
      id: 'fin-sub-001-B',
      subOrderId: subOrder2.id,
      sellerId: subOrder2.sellerId,
      parentOrderId,
      grossAmountCdf: subOrder2.subtotalCdf,
      grossAmountUsd: subOrder2.subtotalUsd,
      commissionRate: subOrder2.commissionRate,
      commissionAmountCdf: subOrder2.commissionAmountCdf,
      commissionAmountUsd: subOrder2.commissionAmountUsd,
      sellerEarningsCdf: subOrder2.payoutAmountCdf,
      sellerEarningsUsd: subOrder2.payoutAmountUsd,
      exchangeRateApplied: demoRate,
      status: 'PENDING',
      recordedAt: now,
    });

    // Paiement centralisé de la commande parent
    this.payments.set(parentOrderId, {
      id: 'pay-tx-202611-001',
      parentOrderId,
      provider: 'ORANGE_MONEY',
      providerTransactionId: 'OM-RDC-9948210384',
      idempotencyKey: 'idemp-ord-demo-001-om',
      amountCdf: parentOrder.totalAmountCdf,
      amountUsd: parentOrder.totalAmountUsd,
      currency: 'CDF',
      status: 'SUCCEEDED',
      verifiedAt: now,
      rawResponse: JSON.stringify({ code: '200', message: 'Transaction Orange Money RDC validée avec succès' }),
      createdAt: now,
      updatedAt: now,
    });
  }

  // --------------------------------------------------------------------------
  // LOGIQUE MÉTIER D'INVENTAIRE : STOCK PARTAGÉ & ISOLATION PAR VENDEUR
  // --------------------------------------------------------------------------

  /**
   * Enregistre un mouvement de stock avec audit complet et vérification d'appartenance
   */
  public static recordStockMovement(
    offerId: string,
    sellerId: string,
    movementType: StockMovementType,
    quantityChange: number,
    referenceType?: string,
    referenceId?: string,
    notes?: string,
    createdByUserId?: string
  ): { success: boolean; error?: string; offer?: OfferRecord; movement?: StockMovementRecord } {
    const offer = this.offers.get(offerId);
    if (!offer) {
      return { success: false, error: `Offre '${offerId}' introuvable` };
    }

    // Règle stricte d'isolation : Seul le propriétaire peut modifier son propre stock
    if (offer.sellerId !== sellerId) {
      return {
        success: false,
        error: `Accès interdit : l'offre '${offerId}' appartient au vendeur '${offer.sellerId}' et non à '${sellerId}'`,
      };
    }

    const previousStock = offer.stockQuantity;
    const newStock = previousStock + quantityChange;

    // Règle de prévention de sur-stockage / stock négatif
    if (newStock < 0) {
      return {
        success: false,
        error: `Stock insuffisant pour '${offer.productName}'. Stock actuel : ${previousStock} ${offer.unit}, changement demandé : ${quantityChange}`,
      };
    }

    offer.stockQuantity = newStock;
    offer.isAvailable = newStock > 0;
    offer.updatedAt = new Date();

    const movement: StockMovementRecord = {
      id: `mvt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      offerId,
      sellerId,
      movementType,
      quantityChange,
      previousStock,
      newStock,
      referenceType,
      referenceId,
      notes,
      createdByUserId,
      createdAt: new Date(),
    };

    this.stockMovements.push(movement);
    return { success: true, offer, movement };
  }

  /**
   * Calcule le taux de change actif USD -> CDF
   */
  public static getActiveExchangeRate(): ExchangeRateConfigRecord {
    const active = this.exchangeRates.find((r) => r.isActive);
    if (active) return active;
    return {
      id: 'default-rate',
      baseCurrency: 'USD',
      targetCurrency: 'CDF',
      rate: DRC_EXCHANGE_RATE.defaultRate,
      isActive: true,
      source: 'FALLBACK',
      effectiveFrom: new Date(),
      createdAt: new Date(),
    };
  }
}

// Initialise le référentiel métier dès le chargement
AgroStore.seed();

