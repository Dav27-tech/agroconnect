export const openApiSpecification = {
  openapi: '3.0.3',
  info: {
    title: 'AgroConnect RDC — API REST & Spécification Métier',
    version: '1.0.0',
    description: `API AgroConnect connectée à PostgreSQL. Le client règle le livreur à la livraison; le livreur déclare la collecte et l’administration confirme la remise des fonds à la plateforme.

  ### Plateforme d'intermédiation agricole multi-acteurs en République Démocratique du Congo (RDC)

**Règles architecturales et contraintes métier clés :**
1. **Intermédiation stricte :** AgroConnect n'achète, ne possède, ne stocke ni ne revend aucun produit agricole. Tout le stock appartient exclusivement aux vendeurs.
2. **Stock partagé :** Pour une même offre vendeur, toutes les commandes partagent un stock physique unique afin de prévenir tout sur-stockage.
3. **Comptes :** Les acheteurs et vendeurs s'inscrivent et se connectent avec une adresse e-mail; les rôles publics sont limités à acheteur et vendeur-agriculteur, en plus de l'administrateur.
4. **Découpage de commande :** Un panier multi-vendeurs génère une commande parent pour le client et des sous-commandes isolées pour chaque vendeur.
5. **Devise :** Tous les prix et totaux de la plateforme sont en Franc Congolais (CDF), sans conversion ni taux de change.
6. **Session :** Les sessions JWT expirent après sept jours.
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
              enum: ['ADMIN', 'BUYER', 'SELLER'],
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
          commissionRate: { type: 'number', example: 10 },
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
    { name: 'Authentification & Rôles', description: 'Comptes acheteur, vendeur, livreur, administrateur et super administrateur avec connexion par email' },
    { name: 'Vendeurs', description: 'Profils de vendeurs et statut de vérification' },
    { name: 'Catalogue & Filières', description: 'Produits communs et catégories (0 stock intermédiaire)' },
    { name: 'Offres & Prix', description: 'Offres spécifiques par vendeur avec tarification détail & gros' },
    { name: 'Inventaire & Mouvements', description: 'Gestion du stock partagé et journal d\'audit des mouvements' },
    { name: 'Panier & Devise', description: 'Calculs en CDF uniquement et validation temps réel' },
    { name: 'Commandes Multi-Vendeurs', description: 'Découpage en commande parent et sous-commandes' },
    { name: 'Livraisons & Collectes', description: 'Affectation des livreurs, confirmation manuelle de la collecte et remise à AgroConnect' },
    { name: 'Finance & Commissions', description: 'Commission configurable et confirmations de règlement hors plateforme' },
    { name: 'Administration', description: 'Gouvernance et pilotage de la plateforme' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentification & Rôles'],
        summary: 'Inscription d\'un acheteur ou vendeur-agriculteur avec email obligatoire',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phoneNumber', 'fullName', 'password', 'email'],
                properties: {
                  phoneNumber: { type: 'string', example: '+243818001122' },
                  fullName: { type: 'string', example: 'Papa Jean-Pierre Kabamba' },
                  password: { type: 'string', example: 'SecretAgro2026!' },
                  email: { type: 'string', format: 'email', example: 'acheteur@example.cd' },
                  role: { type: 'string', enum: ['BUYER', 'SELLER'], default: 'BUYER' },
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
        summary: 'Connexion par adresse e-mail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'utilisateur@example.cd' },
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
    '/auth/change-password': {
      post: {
        tags: ['Authentification & Rôles'],
        summary: 'Modifier son mot de passe',
        description: 'Requis à la première connexion pour les administrateurs et livreurs créés par la gestion de la plateforme.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 10 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Mot de passe modifié' },
          400: { description: 'Mot de passe actuel incorrect ou nouveau mot de passe invalide' },
          403: { description: 'Compte désactivé ou accès protégé par le changement initial du mot de passe' },
        },
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
    '/offers/{id}': {
      put: {
        tags: ['Offres & Prix'],
        summary: 'Mise à jour d’une offre appartenant au vendeur connecté',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Offre mise à jour' }, 403: { description: 'Accès interdit' } },
      },
      delete: {
        tags: ['Offres & Prix'],
        summary: 'Retrait de l’offre du catalogue en conservant son historique',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Offre retirée du catalogue' },
          403: { description: 'Accès interdit' },
          404: { description: 'Offre introuvable' },
        },
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
        tags: ['Panier & Devise'],
        summary: 'Calcul du panier multi-vendeurs en CDF, vérification des stocks et aperçu de la TVA à 16 %',
        responses: { 200: { description: 'Sous-totaux, TVA et totaux à payer calculés par vendeur' } },
      },
    },
    '/orders': {
      post: {
        tags: ['Commandes Multi-Vendeurs'],
        summary: 'Création de la commande parent avec TVA à 16 % et découpage en sous-commandes vendeurs',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128 } }],
        responses: { 201: { description: 'Commande parent et sous-commandes générées' } },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Commandes Multi-Vendeurs'],
        summary: 'Détail d\'une commande parent avec l\'ensemble de ses sous-commandes',
        security: [{ BearerAuth: [] }],
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
    '/deliveries/mine': {
      get: {
        tags: ['Livraisons & Collectes'],
        summary: 'Lister les livraisons attribuées au livreur connecté',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Livraisons et informations nécessaires à la remise en main propre' } },
      },
    },
    '/deliveries/operations': {
      get: {
        tags: ['Livraisons & Collectes'],
        summary: 'Lister les commandes prêtes, les collectes et les remises à rapprocher',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Tableau opérationnel réservé à l’administration' } },
      },
    },
    '/deliveries/{id}/status': {
      patch: {
        tags: ['Livraisons & Collectes'],
        summary: 'Mettre à jour un jalon de livraison (livreur assigné)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Jalon de livraison enregistré en base' }, 409: { description: 'Transition interdite' } },
      },
    },
    '/deliveries/{id}/assign': {
      post: {
        tags: ['Livraisons & Collectes'],
        summary: 'Affecter un livreur à une commande prête au retrait',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Transporteur affecté' } },
      },
    },
    '/deliveries/{id}/collection': {
      post: {
        tags: ['Livraisons & Collectes'],
        summary: 'Confirmer la livraison et la collecte en espèces ou Mobile Money direct',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Livraison et montant exact collecté enregistrés' }, 409: { description: 'Montant ou étape invalide' } },
      },
    },
    '/deliveries/{id}/platform-deposit': {
      post: {
        tags: ['Livraisons & Collectes'],
        summary: 'Confirmer que le livreur a remis les fonds à AgroConnect',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Remise rapprochée et règlement vendeur disponible' }, 409: { description: 'Montant ou collecte invalide' } },
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
        summary: 'Relevé des ventes, commissions et règlements confirmés par le vendeur',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Relevé financier du vendeur' } },
      },
    },
    '/admin/commission-settings': {
      get: {
        tags: ['Administration'],
        summary: 'Consulter le taux de commission initialement fixé à 10 %',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Taux de commission en vigueur' } },
      },
      patch: {
        tags: ['Administration'],
        summary: 'Modifier le taux appliqué aux nouvelles commandes',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Taux mis à jour' } },
      },
    },
    '/admin/couriers': {
      get: {
        tags: ['Administration'],
        summary: 'Lister les livreurs gérés par AgroConnect',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Livreurs et disponibilité' } },
      },
      post: {
        tags: ['Administration'],
        summary: 'Créer un compte livreur géré par AgroConnect',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Compte et profil livreur créés' } },
      },
    },
    '/admin/admins': {
      get: {
        tags: ['Super administration'],
        summary: 'Lister les comptes administrateurs hors super administrateurs',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Comptes administrateurs et leur statut actif' } },
      },
      post: {
        tags: ['Super administration'],
        summary: 'Créer un compte administrateur actif',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'phoneNumber', 'password'],
                properties: {
                  fullName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phoneNumber: { type: 'string', example: '+243812345678' },
                  password: { type: 'string', minLength: 12 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Compte administrateur créé' }, 409: { description: 'Email ou téléphone déjà utilisé' } },
      },
    },
    '/admin/admins/{userId}/status': {
      patch: {
        tags: ['Super administration'],
        summary: 'Activer ou désactiver un compte administrateur',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: { isActive: { type: 'boolean' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Statut administrateur mis à jour' }, 404: { description: 'Compte administrateur introuvable' } },
      },
    },
    '/admin/stats': {
      get: {
        tags: ['Administration'],
        summary: 'Tableau de bord de surveillance de la plateforme en RDC',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Statistiques globales' } },
      },
    },
    '/admin/seller-profiles': {
      get: {
        tags: ['Administration'],
        summary: 'Lister les profils vendeurs pour validation ou gestion des comptes',
        security: [{ BearerAuth: [] }],
        parameters: [{
          name: 'status',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['ALL', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
        }],
        responses: { 200: { description: 'Liste des profils vendeurs et statut actif du compte' } },
      },
    },
    '/admin/seller-profiles/{sellerId}/verification': {
      patch: {
        tags: ['Administration'],
        summary: 'Mettre à jour le statut de vérification d’un profil vendeur',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Statut de vérification mis à jour' } },
      },
    },
    '/admin/seller-profiles/{sellerId}/status': {
      patch: {
        tags: ['Administration'],
        summary: 'Activer ou désactiver le compte d’un vendeur',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: { isActive: { type: 'boolean', example: false } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Statut du compte vendeur mis à jour' },
          403: { description: 'Accès réservé à un administrateur' },
          404: { description: 'Profil vendeur introuvable' },
        },
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
      Devise : CDF • 26 Provinces
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

