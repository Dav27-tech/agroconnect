export const openApiSpecification = {
  openapi: '3.0.3',
  info: {
    title: 'AgroConnect RDC — API REST & Spécification Métier',
    version: '1.0.0',
    description: `### Plateforme d'intermédiation agricole multi-acteurs en République Démocratique du Congo (RDC)

**Règles architecturales et contraintes métier clés :**
1. **Intermédiation stricte :** AgroConnect n'achète, ne possède, ne stocke ni ne revend aucun produit agricole. Tout le stock appartient exclusivement aux vendeurs.
2. **Stock partagé :** Pour une même offre vendeur, les ventes au détail et en gros partagent un stock physique unique afin de prévenir tout sur-stockage.
3. **Multi-rôles :** Un utilisateur peut cumuler plusieurs rôles (ex: Agriculteur et Acheteur d'intrants).
4. **Découpage de commande :** Un panier multi-vendeurs génère une commande parent pour le client et des sous-commandes isolées pour chaque vendeur.
5. **Autonomie de suivi :** Le domaine logistique de livraison est indépendant du statut de commande.
6. **Bidevise & Taux figé :** Prise en charge du Franc Congolais (CDF) et Dollar Américain (USD). Le taux de change est figé de manière immuable à la création de chaque commande.
7. **Calculs financiers exacts :** Arithmétique à virgule fixe (BigInt) pour éliminer toute imprécision d'arrondi.`,
    contact: {
      name: 'Support Technique AgroConnect RDC',
      email: 'tech@agroconnect.cd',
      url: 'https://agroconnect.cd',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API REST AgroConnect v1',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Jeton JWT HMAC-SHA256 obtenu via /api/v1/auth/login ou /api/v1/auth/register',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          meta: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          phoneNumber: { type: 'string', example: '+243818001122' },
          fullName: { type: 'string', example: 'Papa Jean-Pierre Kabamba' },
          roles: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['BUYER', 'SELLER', 'DELIVERY_PROVIDER', 'DELIVERY_PERSON', 'ADMIN'],
            },
          },
          email: { type: 'string', example: 'coopak@agroconnect.cd' },
        },
      },
      SellerProfile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          businessName: { type: 'string', example: 'Coopérative Agricole du Kwilu (COOPAK)' },
          sellerType: { type: 'string', enum: ['FARMER', 'RESELLER', 'SUPPLIER'] },
          province: { type: 'string', example: 'Kwilu' },
          city: { type: 'string', example: 'Kikwit' },
          verificationStatus: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'] },
          commissionRate: { type: 'number', example: 5.0 },
        },
      },
      Offer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sellerId: { type: 'string' },
          productId: { type: 'string' },
          productName: { type: 'string', example: 'Manioc Frais Doux' },
          stockQuantity: { type: 'number', example: 150 },
          unit: { type: 'string', example: 'Sac de 50kg' },
          retailPriceCdf: { type: 'number', example: 42000 },
          retailPriceUsd: { type: 'number', example: 14.74 },
          wholesalePriceCdf: { type: 'number', example: 38000 },
          wholesalePriceUsd: { type: 'number', example: 13.33 },
          wholesaleMinQuantity: { type: 'number', example: 10 },
          originProvince: { type: 'string', example: 'Kwilu' },
          originCity: { type: 'string', example: 'Kikwit' },
        },
      },
      StockMovement: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          offerId: { type: 'string' },
          sellerId: { type: 'string' },
          movementType: {
            type: 'string',
            enum: ['INITIAL_STOCK', 'RESTOCK', 'ORDER_RESERVATION', 'ORDER_FULFILLMENT', 'ORDER_CANCELLED_RESTORE', 'MANUAL_ADJUSTMENT', 'SPOILAGE_LOSS'],
          },
          quantityChange: { type: 'number', example: -5 },
          previousStock: { type: 'number', example: 150 },
          newStock: { type: 'number', example: 145 },
          referenceType: { type: 'string', example: 'SUB_ORDER' },
        },
      },
    },
  },
  tags: [
    { name: 'Authentification & Rôles', description: 'Gestion des comptes et support multi-rôles natif' },
    { name: 'Vendeurs', description: 'Profils vérifiés (Agriculteurs, Revendeurs, Fournisseurs d\'intrants)' },
    { name: 'Catalogue & Filières', description: 'Produits communs et catégories (0 stock intermédiaire)' },
    { name: 'Offres & Prix', description: 'Offres spécifiques par vendeur avec tarification détail & gros' },
    { name: 'Inventaire & Mouvements', description: 'Gestion du stock partagé et journal d\'audit des mouvements' },
    { name: 'Panier & Devises', description: 'Calculs bidevises CDF/USD et validation temps réel' },
    { name: 'Commandes Multi-Vendeurs', description: 'Découpage en commande parent et sous-commandes' },
    { name: 'Paiements Sécurisés', description: 'Mobile Money et vérification stricte backend' },
    { name: 'Livraison & Traçabilité', description: 'Suivi logistique indépendant et jalons géographiques' },
    { name: 'Finance & Commissions', description: 'Comptabilité des commissions (5%) et reversements vendeurs' },
    { name: 'Administration & Taux', description: 'Taux de change USD/CDF et gouvernance' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentification & Rôles'],
        summary: 'Inscription d\'un utilisateur (support multi-rôles)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phoneNumber', 'fullName', 'password'],
                properties: {
                  phoneNumber: { type: 'string', example: '+243818001122' },
                  fullName: { type: 'string', example: 'Papa Jean-Pierre Kabamba' },
                  password: { type: 'string', example: 'SecretAgro2026!' },
                  roles: {
                    type: 'array',
                    items: { type: 'string', enum: ['BUYER', 'SELLER', 'DELIVERY_PROVIDER', 'DELIVERY_PERSON', 'ADMIN'] },
                    example: ['SELLER', 'BUYER'],
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Utilisateur créé' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentification & Rôles'],
        summary: 'Connexion par numéro de téléphone congolais',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phoneNumber', 'password'],
                properties: {
                  phoneNumber: { type: 'string', example: '+243818001122' },
                  password: { type: 'string', example: 'AdminAgro2026!' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Jeton JWT généré avec rôles' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentification & Rôles'],
        summary: 'Profil de l\'utilisateur connecté et profils associés',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Profil complet' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Catalogue & Filières'],
        summary: 'Liste des filières agricoles en RDC',
        responses: { 200: { description: 'Catégories retournées' } },
      },
    },
    '/categories/{slug}': {
      get: {
        tags: ['Catalogue & Filières'],
        summary: 'Détail d\'une filière et ses produits communs',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Filière trouvée' } },
      },
    },
    '/products': {
      get: {
        tags: ['Catalogue & Filières'],
        summary: 'Produits communs du catalogue (sans stock propriétaire)',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Produits retournés' } },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Catalogue & Filières'],
        summary: 'Fiche produit avec comparateur de toutes les offres vendeurs disponibles',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Produit et offres associés' } },
      },
    },
    '/offers': {
      get: {
        tags: ['Offres & Prix'],
        summary: 'Recherche d\'offres vendeurs spécifiques',
        parameters: [
          { name: 'province', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Offres trouvées' } },
      },
      post: {
        tags: ['Offres & Prix'],
        summary: 'Création d\'une offre vendeur avec stock initial',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Offre créée' } },
      },
    },
    '/inventory/offer/{offerId}': {
      get: {
        tags: ['Inventaire & Mouvements'],
        summary: 'Consultation du stock partagé et mouvements récents d\'une offre',
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Stock partagé retourné' } },
      },
    },
    '/inventory/seller/{sellerId}': {
      get: {
        tags: ['Inventaire & Mouvements'],
        summary: 'Inventaire complet et journal de stock exclusif d\'un vendeur',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inventaire vendeur' } },
      },
    },
    '/inventory/movement': {
      post: {
        tags: ['Inventaire & Mouvements'],
        summary: 'Enregistrement d\'un mouvement de stock (réapprovisionnement, ajustement, perte)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Mouvement enregistré et stock mis à jour' } },
      },
    },
    '/cart/calculate': {
      post: {
        tags: ['Panier & Devises'],
        summary: 'Calcul du panier multi-vendeurs avec bidevise et vérification des stocks',
        responses: { 200: { description: 'Totaux et groupes vendeurs calculés' } },
      },
    },
    '/orders': {
      post: {
        tags: ['Commandes Multi-Vendeurs'],
        summary: 'Création de la commande parent et découpage en sous-commandes vendeurs',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Commande parent et sous-commandes générées' } },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Commandes Multi-Vendeurs'],
        summary: 'Détail d\'une commande parent avec l\'ensemble de ses sous-commandes',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Commande trouvée' } },
      },
    },
    '/orders/seller/{sellerId}': {
      get: {
        tags: ['Commandes Multi-Vendeurs'],
        summary: 'Sous-commandes exclusives gérées par un vendeur donné (isolation)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sous-commandes du vendeur' } },
      },
    },
    '/orders/suborder/{subOrderId}/status': {
      patch: {
        tags: ['Commandes Multi-Vendeurs'],
        summary: 'Mise à jour du statut de préparation par le vendeur (CONFIRMED, PREPARING, READY_FOR_PICKUP)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'subOrderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Statut mis à jour' } },
      },
    },
    '/payments/checkout': {
      post: {
        tags: ['Paiements Sécurisés'],
        summary: 'Initialisation du paiement centralisé (Mobile Money RDC)',
        responses: { 200: { description: 'Paiement vérifié sur le backend' } },
      },
    },
    '/deliveries/track/{code}': {
      get: {
        tags: ['Livraison & Traçabilité'],
        summary: 'Suivi public par code de tracking avec historique complet',
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Détail et historique du suivi logistique' } },
      },
    },
    '/finance/summary': {
      get: {
        tags: ['Finance & Commissions'],
        summary: 'Synthèse des volumes d\'affaires et commissions AgroConnect',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Synthèse financière' } },
      },
    },
    '/finance/seller/{sellerId}': {
      get: {
        tags: ['Finance & Commissions'],
        summary: 'Relevé des ventes, commissions prélevées et gains nets d\'un vendeur',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Relevé financier du vendeur' } },
      },
    },
    '/admin/exchange-rate': {
      get: {
        tags: ['Administration & Taux'],
        summary: 'Consultation du taux actif USD/CDF et de l\'historique des configurations',
        responses: { 200: { description: 'Taux actuel et historique' } },
      },
      post: {
        tags: ['Administration & Taux'],
        summary: 'Mise à jour du taux officiel de change (sans impacter les commandes antérieures)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Nouveau taux enregistré' } },
      },
    },
    '/admin/stats': {
      get: {
        tags: ['Administration & Taux'],
        summary: 'Tableau de bord de surveillance de la plateforme en RDC',
        responses: { 200: { description: 'Statistiques globales' } },
      },
    },
  },
};

/**
 * Génère la page HTML Swagger UI interactive autonome
 */
export function getSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation API Swagger — AgroConnect RDC</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      background: #fafaf9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .topbar {
      background-color: #166534 !important;
      padding: 12px 24px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #14532d;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-badge {
      background: rgba(255,255,255,0.2);
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title {
      color: #166534;
      font-size: 2rem;
    }
    .swagger-ui .btn.authorize {
      color: #166534;
      border-color: #166534;
    }
    .swagger-ui .btn.authorize svg {
      fill: #166534;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #166534;
      background: rgba(22, 101, 52, 0.05);
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #166534;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand-title">
      <span>🌾 AgroConnect RDC</span>
      <span class="brand-badge">OpenAPI 3.0</span>
      <span class="brand-badge">Marché Agricole RDC</span>
    </div>
    <div style="font-size: 0.85rem; opacity: 0.9;">
      Taux actif : 1 USD = 2850 CDF • 26 Provinces
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/v1/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

