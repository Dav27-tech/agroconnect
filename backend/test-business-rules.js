import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './dist/app.js';
import { AgroStore } from './dist/database/store.js';
import { Security } from './dist/common/security.js';
import { dbManager } from './dist/database/client.js';

AgroStore.seed();
const app = createApp();
const createdTestUserIds = [];
const createdTestProductIds = [];
const createdTestCategoryIds = [];
const createdTestOrderIds = [];

function request(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const mockReq = {
      method,
      url,
      originalUrl: url,
      path: url.split('?')[0],
      query: Object.fromEntries(new URL(url, 'http://localhost').searchParams.entries()),
      params: {},
      headers: { host: 'localhost:5000', ...headers },
      body: body || {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(k, v) {
        responseHeaders[k] = v;
        return this;
      },
      getHeader(k) {
        return responseHeaders[k];
      },
      removeHeader(k) {
        delete responseHeaders[k];
        return this;
      },
      json(data) {
        responseBody = data;
        this.emitFinish();
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
        return this;
      },
      send(data) {
        responseBody = data;
        this.emitFinish();
        resolve({
          status: statusCode,
          headers: responseHeaders,
          body: responseBody,
          text: typeof data === 'string' ? data : JSON.stringify(data),
        });
        return this;
      },
      finishCallbacks: [],
      on(event, cb) {
        if (event === 'finish') this.finishCallbacks.push(cb);
      },
      emitFinish() {
        this.finishCallbacks.forEach((cb) => cb());
      },
    };

    app.handle(mockReq, mockRes, (err) => {
      if (err) {
        resolve({ status: 500, error: err });
      } else {
        resolve({ status: 404, body: { message: 'Not handled' } });
      }
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    process.exit(1);
  }
}

async function runBusinessRuleTests() {
  console.log('🌾 =================================================================');
  console.log('🌾 SUITE DE TESTS : RÈGLES MÉTIER ET CONTRAINTES AGROCONNECT RDC');
  console.log('🌾 =================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1 : Rôles d'inscription limités et connexion par email
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 : Inscription par rôle et connexion par email ---');
  const testEmail = `buyer-${Date.now()}@example.test`;
  const testPhone = `+243819${String(Date.now()).slice(-6)}`;
  const registerRes = await request(
    'POST',
    '/api/v1/auth/register',
    {
      phoneNumber: testPhone,
      fullName: 'Acheteuse de test',
      password: 'Password123!',
      email: testEmail,
      role: 'BUYER',
    },
    { 'content-type': 'application/json' }
  );
  assert(registerRes.status === 201, `L'inscription acheteur doit retourner 201 (reçu: ${registerRes.status})`);
  assert(
    Array.isArray(registerRes.body.data.user.roles) &&
    registerRes.body.data.user.roles.length === 1 &&
    registerRes.body.data.user.roles[0] === 'BUYER',
    'L\'inscription acheteur ne doit accorder que le rôle BUYER'
  );
  const buyerToken = registerRes.body.data.token;
  createdTestUserIds.push(registerRes.body.data.user.id);
  const verifiedToken = Security.verifyToken(buyerToken);
  assert(
    verifiedToken.roles.length === 1 && verifiedToken.roles[0] === 'BUYER',
    'Le jeton JWT doit contenir le rôle acheteur'
  );
  const loginRes = await request(
    'POST',
    '/api/v1/auth/login',
    { email: testEmail, password: 'Password123!' },
    { 'content-type': 'application/json' }
  );
  assert(loginRes.status === 200, `La connexion doit retourner 200 (reçu: ${loginRes.status})`);
  assert(loginRes.body.data.user.id === registerRes.body.data.user.id, 'La connexion doit retourner le compte inscrit');
  console.log('✅ TEST 1 RÉUSSI : Inscription par rôle et connexion par email validées.');

  const privilegeEscalationRes = await request('POST', '/api/v1/auth/register', {
    phoneNumber: '+243819998876',
    fullName: 'Compte non autorisé',
    password: 'Password123!',
    email: `admin-attempt-${Date.now()}@example.test`,
    role: 'ADMIN',
  });
  assert(privilegeEscalationRes.status === 400, 'L’inscription publique ne doit pas permettre le rôle ADMIN');

  const weakPasswordRes = await request('POST', '/api/v1/auth/register', {
    phoneNumber: '+243819998875',
    fullName: 'Mot de passe faible',
    password: 'short123',
    email: `weak-password-${Date.now()}@example.test`,
  });
  assert(weakPasswordRes.status === 400, 'L’inscription doit refuser un mot de passe de moins de 10 caractères');

  const deliveryProviderRes = await request('POST', '/api/v1/auth/register', {
    phoneNumber: '+243819998874',
    fullName: 'Transporteur AgroConnect',
    password: 'Password123!',
    email: `delivery-provider-${Date.now()}@example.test`,
    role: 'DELIVERY_PROVIDER',
  });
  assert(deliveryProviderRes.status === 400, 'L’inscription publique doit refuser les rôles hors acheteur/vendeur');

  // -------------------------------------------------------------------------
  // TEST 2 : Règle de stock partagé (Vente au détail et Vente en gros)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2 : Stock unique partagé entre vente au détail et en gros ---');
  const initialOffer = AgroStore.offers.get('off-manioc-coopak');
  const initialStock = initialOffer.stockQuantity;
  assert(initialStock > 20, 'L\'offre de test doit avoir au moins 20 unités en stock');

  // Mouvement 1 : Achat en gros de 10 unités
  const wholesaleMove = AgroStore.recordStockMovement(
    'off-manioc-coopak',
    'seller-coopak-kikwit',
    'ORDER_RESERVATION',
    -10,
    'SUB_ORDER',
    'sub-test-01',
    'Achat en gros de 10 sacs'
  );
  assert(wholesaleMove.success, 'La réservation de gros doit réussir');
  assert(
    initialOffer.stockQuantity === initialStock - 10,
    `Le stock disponible doit avoir diminué de 10 (actuel: ${initialOffer.stockQuantity})`
  );

  // Mouvement 2 : Achat au détail de 2 unités sur la MÊME offre
  const retailMove = AgroStore.recordStockMovement(
    'off-manioc-coopak',
    'seller-coopak-kikwit',
    'ORDER_RESERVATION',
    -2,
    'SUB_ORDER',
    'sub-test-02',
    'Achat au détail de 2 sacs'
  );
  assert(retailMove.success, 'La réservation au détail doit réussir');
  assert(
    initialOffer.stockQuantity === initialStock - 12,
    `Le stock disponible doit avoir diminué de 2 de plus (actuel: ${initialOffer.stockQuantity})`
  );
  console.log(
    `✅ TEST 2 RÉUSSI : Vente au détail et en gros partagent le même stock physique (${initialStock} -> ${initialOffer.stockQuantity}).`
  );

  // -------------------------------------------------------------------------
  // TEST 3 : Isolation de propriété d'inventaire (Vendeur A vs Vendeur B)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3 : Isolation stricte de propriété de stock par vendeur ---');
  // Le revendeur 'seller-agrodistrib-kin' tente de modifier le stock de la coopérative 'seller-coopak-kikwit'
  const unauthorizedMove = AgroStore.recordStockMovement(
    'off-manioc-coopak',
    'seller-agrodistrib-kin', // Mauvais vendeur
    'RESTOCK',
    50,
    'MANUAL',
    'ref-fraud',
    'Tentative de modification non autorisée'
  );
  assert(
    unauthorizedMove.success === false,
    'Un vendeur ne doit JAMAIS pouvoir modifier le stock d\'un autre vendeur'
  );
  console.log('✅ TEST 3 RÉUSSI : La tentative de modification du stock d\'un tiers a été strictement rejetée.');

  // -------------------------------------------------------------------------
  // TEST 4 : Prévention de sur-vente (Stock insuffisant)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4 : Prévention de sur-vente et de stock négatif ---');
  const excessiveOrderMove = AgroStore.recordStockMovement(
    'off-manioc-coopak',
    'seller-coopak-kikwit',
    'ORDER_RESERVATION',
    -999999, // Quantité largement supérieure au stock
    'SUB_ORDER',
    'sub-test-excess',
    'Achat dépassant la capacité'
  );
  assert(excessiveOrderMove.success === false, 'Une commande dépassant le stock disponible doit échouer');
  console.log('✅ TEST 4 RÉUSSI : Rejet automatique de sur-vente avec message d\'erreur explicite.');

  // -------------------------------------------------------------------------
  // TEST 5 : Découpage de commande multi-vendeurs (1 Commande Parent -> N Sous-Commandes)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Découpage de commande multi-vendeurs ---');
  const orderRes = await request(
    'POST',
    '/api/v1/orders',
    {
      items: [
        { offerId: 'off-manioc-coopak', quantity: 2, saleType: 'RETAIL' },
        { offerId: 'off-pondu-agrodistrib', quantity: 10, saleType: 'RETAIL' },
      ],
      currency: 'CDF',
      deliveryProvince: 'Kinshasa',
      deliveryCity: 'Kinshasa',
      deliveryAddress: 'Avenue de la Paix, Gombe',
      recipientName: 'Mbuyi Kalala',
      recipientPhone: '+243810001122',
    },
    { 'content-type': 'application/json', authorization: `Bearer ${buyerToken}`, 'idempotency-key': 'business-order-0001' }
  );

  assert(orderRes.status === 201, `La création de la commande multi-vendeurs doit réussir (201, reçu: ${orderRes.status})`);
  const parentOrder = orderRes.body.data;
  assert(parentOrder.orderNumber.startsWith('AGC-ORD-'), 'Le numéro de commande parent doit suivre le format AGC-ORD-');
  assert(parentOrder.subOrders.length === 2, 'Un panier avec 2 vendeurs distincts doit produire 2 sous-commandes');
  assert(
    parentOrder.subOrders[0].sellerId !== parentOrder.subOrders[1].sellerId,
    'Chaque sous-commande doit appartenir à un vendeur distinct'
  );
  assert(parentOrder.currency === 'CDF', 'La commande doit être enregistrée uniquement en CDF');
  assert(!('exchangeRateSnapshot' in orderRes.body.data), 'Aucun taux de change ne doit être exposé dans la commande');
  assert(!('totalAmountUsd' in orderRes.body.data), 'La commande publique ne doit exposer que les montants CDF');
  assert(!('subtotalUsd' in parentOrder.subOrders[0]), 'Les sous-commandes publiques ne doivent exposer que les montants CDF');

  const stockAfterFirstOrder = AgroStore.offers.get('off-manioc-coopak').stockQuantity;
  const replayOrderRes = await request('POST', '/api/v1/orders', {
    items: [
      { offerId: 'off-manioc-coopak', quantity: 2, saleType: 'RETAIL' },
      { offerId: 'off-pondu-agrodistrib', quantity: 10, saleType: 'RETAIL' },
    ],
    currency: 'CDF',
    deliveryProvince: 'Kinshasa',
    deliveryCity: 'Kinshasa',
    deliveryAddress: 'Avenue de la Paix, Gombe',
    recipientName: 'Mbuyi Kalala',
    recipientPhone: '+243810001122',
  }, { authorization: `Bearer ${buyerToken}`, 'idempotency-key': 'business-order-0001' });
  assert(replayOrderRes.status === 200, 'La répétition de la même clé doit retourner la commande initiale');
  assert(replayOrderRes.body.data.id === parentOrder.id, 'Une répétition ne doit pas créer une nouvelle commande');
  assert(
    AgroStore.offers.get('off-manioc-coopak').stockQuantity === stockAfterFirstOrder,
    'Une répétition idempotente ne doit pas déduire le stock une seconde fois'
  );
  const reusedKeyRes = await request('POST', '/api/v1/orders', {
    items: [{ offerId: 'off-manioc-coopak', quantity: 3, saleType: 'RETAIL' }],
    currency: 'CDF',
    deliveryProvince: 'Kinshasa',
    deliveryCity: 'Kinshasa',
    deliveryAddress: 'Avenue de la Paix, Gombe',
    recipientName: 'Mbuyi Kalala',
    recipientPhone: '+243810001122',
  }, { authorization: `Bearer ${buyerToken}`, 'idempotency-key': 'business-order-0001' });
  assert(reusedKeyRes.status === 409, 'Une clé idempotente réutilisée avec un autre panier doit être refusée');
  console.log(
    `✅ TEST 5 RÉUSSI : Commande parent ${parentOrder.orderNumber} scindée en 2 sous-commandes vendeurs, montants en CDF.`
  );

  const stockBeforeDuplicateLines = AgroStore.offers.get('off-manioc-coopak').stockQuantity;
  const duplicateOfferRes = await request('POST', '/api/v1/orders', {
    items: [
      { offerId: 'off-manioc-coopak', quantity: 70, saleType: 'RETAIL' },
      { offerId: 'off-manioc-coopak', quantity: 70, saleType: 'WHOLESALE' },
    ],
    currency: 'CDF',
    deliveryProvince: 'Kinshasa',
    deliveryCity: 'Kinshasa',
    deliveryAddress: 'Avenue de la Paix, Gombe',
    recipientName: 'Mbuyi Kalala',
    recipientPhone: '+243810001122',
  }, { 'content-type': 'application/json', authorization: `Bearer ${buyerToken}`, 'idempotency-key': 'business-order-overstock-0001' });
  assert(duplicateOfferRes.status === 422, 'Les lignes dupliquées doivent être agrégées pour vérifier le stock partagé');
  assert(
    AgroStore.offers.get('off-manioc-coopak').stockQuantity === stockBeforeDuplicateLines,
    'Une commande refusée ne doit modifier aucun stock'
  );

  // -------------------------------------------------------------------------
  // TEST 5B : Paiement mock non confirmé et tentative idempotente
  // -------------------------------------------------------------------------
  const paymentRequest = {
    parentOrderId: parentOrder.id,
    provider: 'M_PESA',
    customerPhoneNumber: '+243810001123',
  };
  const paymentHeaders = { 'content-type': 'application/json', authorization: `Bearer ${buyerToken}` };
  const firstPaymentRes = await request('POST', '/api/v1/payments/checkout', paymentRequest, paymentHeaders);
  assert(firstPaymentRes.status === 200, 'Le simulateur doit accepter la demande de paiement');
  assert(firstPaymentRes.body.data.status === 'PENDING', 'Le simulateur ne doit jamais confirmer un paiement');
  assert(parentOrder.status === 'PENDING', 'Une réponse simulée ne doit pas confirmer la commande');

  const retryPaymentRes = await request('POST', '/api/v1/payments/checkout', paymentRequest, paymentHeaders);
  assert(
    retryPaymentRes.body.data.transactionId === firstPaymentRes.body.data.transactionId,
    'Une nouvelle tentative doit réutiliser la transaction existante pour la commande'
  );
  console.log('✅ TEST 5B RÉUSSI : Le paiement simulé reste en attente et les tentatives sont idempotentes.');

  // -------------------------------------------------------------------------
  // TEST 6 : Isolation des sous-commandes vendeur
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Isolation des sous-commandes par vendeur ---');
  const sellerSubOrder = AgroStore.subOrders.get(parentOrder.subOrders[0].id);
  async function registerSellerForAccessTest(name) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const result = await request('POST', '/api/v1/auth/register', {
      phoneNumber: `+24382${String(Date.now()).slice(-7)}`,
      fullName: name,
      password: 'Password123!',
      email: `seller-${suffix}@example.test`,
      role: 'SELLER',
      province: 'Kwilu',
      city: 'Kikwit',
    });
    assert(
      result.status === 201,
      `Le compte vendeur de test doit être créé (reçu: ${result.status}, ${JSON.stringify(result.body)})`
    );
    const { user, token } = result.body.data;
    createdTestUserIds.push(user.id);
    AgroStore.sellerProfiles.set(user.sellerId, {
      id: user.sellerId,
      userId: user.id,
      sellerType: 'FARMER',
      businessName: user.fullName,
      province: 'Kwilu',
      city: 'Kikwit',
      verificationStatus: 'PENDING',
      commissionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { token, sellerId: user.sellerId };
  }
  const sellerAccount = await registerSellerForAccessTest('Vendeur de test A');
  const otherSellerAccount = await registerSellerForAccessTest('Vendeur de test B');
  const sellerSession = await request(
    'GET',
    '/api/v1/auth/me',
    null,
    { authorization: `Bearer ${sellerAccount.token}` }
  );
  assert(sellerSession.status === 200, 'La session vendeur active doit rester accessible');
  assert(
    sellerSession.body.data.sellerId === sellerAccount.sellerId,
    'Le profil vendeur doit être renvoyé au niveau supérieur de /auth/me pour le tableau de bord'
  );
  assert(sellerSubOrder, 'Une sous-commande doit exister pour valider les transitions vendeur');
  const workflowSubOrderId = `seller-workflow-${Date.now()}`;
  const cachedSellerProfile = AgroStore.sellerProfiles.get(sellerAccount.sellerId);
  assert(cachedSellerProfile, 'Le profil vendeur de test doit être mis en cache');
  AgroStore.subOrders.set(workflowSubOrderId, {
    ...sellerSubOrder,
    id: workflowSubOrderId,
    sellerId: sellerAccount.sellerId,
    status: 'PENDING',
  });
  AgroStore.sellerProfiles.delete(sellerAccount.sellerId);
  try {
    const ownSellerOrdersRes = await request(
      'GET',
      `/api/v1/orders/seller/${sellerAccount.sellerId}`,
      null,
      { authorization: `Bearer ${sellerAccount.token}` }
    );
    assert(
      ownSellerOrdersRes.status === 200 &&
      ownSellerOrdersRes.body.data.some((order) => order.id === workflowSubOrderId),
      'Le vendeur doit accéder à ses commandes même si son profil n’est pas chargé dans le cache mémoire'
    );
    const confirmSubOrderRes = await request(
      'PATCH',
      `/api/v1/orders/suborder/${workflowSubOrderId}/status`,
      { status: 'CONFIRMED' },
      { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
    );
    assert(
      confirmSubOrderRes.status === 200 && confirmSubOrderRes.body.data.status === 'CONFIRMED',
      'Un vendeur doit pouvoir confirmer une nouvelle sous-commande'
    );
  } finally {
    AgroStore.sellerProfiles.set(sellerAccount.sellerId, cachedSellerProfile);
    AgroStore.subOrders.delete(workflowSubOrderId);
  }
  const sampleOffer = AgroStore.offers.values().next().value;
  assert(sampleOffer, 'Une offre de référence doit être disponible pour tester les achats vendeur');
  const ownOfferId = `own-offer-${Date.now()}`;
  AgroStore.offers.set(ownOfferId, {
    ...sampleOffer,
    id: ownOfferId,
    sellerId: sellerAccount.sellerId,
    sellerName: 'Vendeur de test A',
  });
  try {
    await dbManager.query(
      `UPDATE "users" SET "roles" = ARRAY['BUYER', 'SELLER']::"UserRole"[] WHERE "id" = $1`,
      [sellerSession.body.data.id]
    );
    const ownOrderRes = await request(
      'POST',
      '/api/v1/orders',
      {
        items: [{ offerId: ownOfferId, quantity: 1, saleType: 'RETAIL' }],
        deliveryProvince: 'Kwilu',
        deliveryCity: 'Kikwit',
        deliveryAddress: 'Adresse de test',
        recipientName: 'Vendeur de test A',
        recipientPhone: '+243820000001',
      },
      {
        authorization: `Bearer ${sellerAccount.token}`,
        'content-type': 'application/json',
        'idempotency-key': `own-offer-${Date.now()}`,
      }
    );
    assert(
      ownOrderRes.status === 403 && ownOrderRes.body.error.code === 'OWN_OFFER_PURCHASE',
      `La création de commande doit aussi refuser l’achat de sa propre offre (reçu: ${ownOrderRes.status}, ${JSON.stringify(ownOrderRes.body)})`
    );
    await dbManager.query(
      `UPDATE "users" SET "roles" = ARRAY['SELLER']::"UserRole"[] WHERE "id" = $1`,
      [sellerSession.body.data.id]
    );
  } finally {
    AgroStore.offers.delete(ownOfferId);
  }

  // -------------------------------------------------------------------------
  // TEST 6A : Publication d'offre et désactivation vendeur par l'administration
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6A : Publication et contrôle des vendeurs ---');
  assert(existsSync(fileURLToPath(new URL('./uploads/', import.meta.url))), 'Le dossier local de téléversement doit être créé au démarrage');
  await dbManager.query(
    `UPDATE "seller_profiles" SET "verificationStatus" = 'VERIFIED'::"VerificationStatus" WHERE "id"::text = $1`,
    [sellerAccount.sellerId]
  );
  const testSubscriptionReference = `TEST-SUB-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  await dbManager.query(
    `WITH payment AS (
       INSERT INTO "platform_payments"
         ("purpose", "reference", "idempotencyKey", "sellerId", "amountCdf", "currency",
          "payerPhone", "provider", "status", "verifiedAt")
       VALUES ('SUBSCRIPTION', $2, $3, $1, 500, 'CDF', '+243820000001', 'M_PESA', 'SUCCEEDED', NOW())
       RETURNING "id"
     )
     INSERT INTO "seller_subscriptions" ("sellerId", "platformPaymentId", "amountCdf", "startsAt", "expiresAt")
     SELECT $1, "id", 500, NOW(), NOW() + INTERVAL '1 month' FROM payment`,
    [
      sellerAccount.sellerId,
      testSubscriptionReference,
      `${testSubscriptionReference}-idempotency`,
    ]
  );
  const featuredCreateRes = await request(
    'POST',
    '/api/v1/offers',
    { isFeatured: true },
    { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(
    featuredCreateRes.status === 403 && featuredCreateRes.body.error.code === 'PROMOTION_PAYMENT_REQUIRED',
    'La création d’une offre ne doit pas permettre de contourner l’abonnement de mise en avant'
  );

  const offerSuffix = Date.now();
  const testProductName = `Produit de test ${offerSuffix}`;
  const publishRes = await request(
    'POST',
    '/api/v1/offers',
    {
      productName: testProductName,
      categoryName: `Catégorie de test ${offerSuffix}`,
      stockQuantity: 12,
      unit: 'KG',
      retailPriceCdf: 1200,
      retailMinQuantity: 1,
      originProvince: 'Kwilu',
      originCity: 'Kikwit',
      imageUrl: `http://localhost:5000/uploads/01234567-89ab-cdef-0123-456789abcdef.jpg`,
    },
    { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(publishRes.status === 201, `La publication doit retourner 201 (reçu: ${publishRes.status}, ${JSON.stringify(publishRes.body)})`);
  const publishedOfferId = publishRes.body.data.id;
  const ownCartRes = await request(
    'POST',
    '/api/v1/cart/calculate',
    { items: [{ offerId: publishedOfferId, quantity: 1, saleType: 'RETAIL' }] },
    { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(
    ownCartRes.status === 403 && ownCartRes.body.error.code === 'OWN_OFFER_PURCHASE',
    'Un vendeur ne doit pas pouvoir ajouter sa propre offre à une commande'
  );
  const cartCalculationRes = await request(
    'POST',
    '/api/v1/cart/calculate',
    { items: [{ offerId: publishedOfferId, quantity: 2, saleType: 'RETAIL' }] }
  );
  assert(
    cartCalculationRes.status === 200 && cartCalculationRes.body.data.totals.totalCdf === 2400,
    `Le panier doit calculer les offres PostgreSQL avec le prix courant (reçu: ${JSON.stringify(cartCalculationRes.body)})`
  );
  const featuredUpdateRes = await request(
    'PUT',
    `/api/v1/offers/${publishedOfferId}`,
    { isFeatured: true },
    { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(
    featuredUpdateRes.status === 403 && featuredUpdateRes.body.error.code === 'PROMOTION_PAYMENT_REQUIRED',
    'Un vendeur ne doit pas pouvoir activer la mise en avant sans abonnement'
  );
  const listedPublishedOffer = await request(
    'GET',
    `/api/v1/offers?search=${encodeURIComponent(testProductName)}`
  );
  assert(
    listedPublishedOffer.body.data.some((offer) => offer.id === publishedOfferId && !offer.isFeatured),
    'L’offre publiée doit apparaître dans le catalogue sans mise en avant non autorisée'
  );
  await dbManager.query(
    `UPDATE "seller_subscriptions"
     SET "startsAt" = NOW() - INTERVAL '2 days',
         "expiresAt" = NOW() - INTERVAL '1 day'
     WHERE "sellerId" = $1`,
    [sellerAccount.sellerId]
  );
  const expiredSubscriptionPublishRes = await request(
    'POST',
    '/api/v1/offers',
    {
      productName: `Nouvelle offre bloquée ${Date.now()}`,
      categoryName: 'Tubercules & Racines',
      stockQuantity: 3,
      unit: 'KG',
      retailPriceCdf: 1200,
      originProvince: 'Kwilu',
      imageUrl: 'http://localhost:5000/uploads/01234567-89ab-cdef-0123-456789abcdef.jpg',
    },
    { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(
    expiredSubscriptionPublishRes.status === 403 && expiredSubscriptionPublishRes.body.error.code === 'SUBSCRIPTION_REQUIRED',
    'Un vendeur dont l’abonnement a expiré ne doit pas publier de nouvelle offre'
  );
  const existingOfferAfterExpiry = await request('GET', `/api/v1/offers/${publishedOfferId}`);
  assert(existingOfferAfterExpiry.status === 200, 'Les offres déjà publiées doivent rester visibles après expiration');
  const createdProduct = await dbManager.query(
    'SELECT "id", "categoryId" FROM "products" WHERE "name" = $1 LIMIT 1',
    [testProductName]
  );
  assert(createdProduct.rows[0], 'La publication doit créer la fiche produit associée');
  createdTestProductIds.push(createdProduct.rows[0].id);
  createdTestCategoryIds.push(createdProduct.rows[0].categoryId);

  const inventoryRes = await request(
    'GET',
    `/api/v1/inventory/seller/${sellerAccount.sellerId}`,
    null,
    { authorization: `Bearer ${sellerAccount.token}` }
  );
  assert(inventoryRes.status === 200, `Le vendeur doit pouvoir charger son inventaire (reçu: ${inventoryRes.status})`);
  assert(
    inventoryRes.body.data.movementsLog.some(
      (movement) => movement.offerId === publishedOfferId && movement.movementType === 'INITIAL_STOCK'
    ),
    'Le journal vendeur doit inclure le mouvement de stock initial de l’offre publiée'
  );
  const stockMovementRes = await request(
    'POST',
    '/api/v1/inventory/movement',
    {
      offerId: publishedOfferId,
      quantityChange: 3,
      movementType: 'RESTOCK',
      notes: 'Réapprovisionnement de test',
    },
    { authorization: `Bearer ${sellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(
    stockMovementRes.status === 200 &&
    stockMovementRes.body.data.offer.stockQuantity === 15 &&
    stockMovementRes.body.data.movement.previousStock === 12 &&
    stockMovementRes.body.data.movement.newStock === 15,
    `Le réapprovisionnement doit mettre à jour le stock et son journal (reçu: ${JSON.stringify(stockMovementRes.body)})`
  );
  const persistedStock = await dbManager.query(
    'SELECT "stockQuantity" FROM "offers" WHERE "id" = $1',
    [publishedOfferId]
  );
  assert(Number(persistedStock.rows[0].stockQuantity) === 15, 'Le nouveau stock doit être persisté dans PostgreSQL');
  const forbiddenStockMovement = await request(
    'POST',
    '/api/v1/inventory/movement',
    { offerId: publishedOfferId, quantityChange: 1, movementType: 'RESTOCK' },
    { authorization: `Bearer ${otherSellerAccount.token}`, 'content-type': 'application/json' }
  );
  assert(
    forbiddenStockMovement.status === 403,
    'Un vendeur ne doit pas pouvoir modifier le stock d’un autre vendeur'
  );
  console.log('✅ TEST 6A.1 RÉUSSI : Inventaire, mouvements et stock sont persistés et isolés par vendeur.');

  const adminRegistration = await request('POST', '/api/v1/auth/register', {
    phoneNumber: `+24381${String(Date.now()).slice(-7)}`,
    fullName: 'Administrateur de test',
    password: 'Password123!',
    email: `admin-${Date.now()}@example.test`,
    role: 'BUYER',
  });
  assert(adminRegistration.status === 201, 'Le compte d’administration de test doit pouvoir être créé');
  const adminUser = adminRegistration.body.data.user;
  createdTestUserIds.push(adminUser.id);
  const adminToken = adminRegistration.body.data.token;
  await dbManager.query(
    `UPDATE "users" SET "roles" = ARRAY['ADMIN']::"UserRole"[] WHERE "id" = $1`,
    [adminUser.id]
  );

  const disableSellerRes = await request(
    'PATCH',
    `/api/v1/admin/seller-profiles/${sellerAccount.sellerId}/status`,
    { isActive: false },
    { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' }
  );
  assert(disableSellerRes.status === 200, `L'administration doit désactiver le vendeur (reçu: ${disableSellerRes.status})`);
  assert(disableSellerRes.body.data.isActive === false, 'La désactivation doit être confirmée par l’API');
  const hiddenOffers = await request(
    'GET',
    `/api/v1/offers?search=${encodeURIComponent(testProductName)}`
  );
  assert(hiddenOffers.body.data.length === 0, 'Les offres d’un vendeur désactivé doivent être retirées du catalogue');
  const hiddenOfferDetail = await request('GET', `/api/v1/offers/${publishedOfferId}`);
  assert(hiddenOfferDetail.status === 404, 'Une offre d’un vendeur désactivé ne doit plus être consultable directement');
  const disabledSellerSession = await request(
    'GET',
    '/api/v1/auth/me',
    null,
    { authorization: `Bearer ${sellerAccount.token}` }
  );
  assert(disabledSellerSession.status === 401, 'La session existante du vendeur désactivé doit être refusée');
  const allSellerProfiles = await request(
    'GET',
    '/api/v1/admin/seller-profiles?status=ALL',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  const disabledProfile = allSellerProfiles.body.data.find((profile) => profile.id === sellerAccount.sellerId);
  assert(disabledProfile?.isActive === false, 'La liste de gestion doit exposer le statut désactivé du vendeur');
  const reactivateSellerRes = await request(
    'PATCH',
    `/api/v1/admin/seller-profiles/${sellerAccount.sellerId}/status`,
    { isActive: true },
    { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' }
  );
  assert(reactivateSellerRes.status === 200, 'L’administration doit pouvoir réactiver le vendeur');
  const persistedOrderRes = await request(
    'POST',
    '/api/v1/orders',
    {
      items: [{ offerId: publishedOfferId, quantity: 1, saleType: 'RETAIL' }],
      currency: 'CDF',
      deliveryProvince: 'Kwilu',
      deliveryCity: 'Kikwit',
      deliveryAddress: 'Adresse de commande persistée',
      recipientName: 'Acheteur de test',
      recipientPhone: '+243820000001',
    },
    {
      authorization: `Bearer ${buyerToken}`,
      'content-type': 'application/json',
      'idempotency-key': `persisted-order-${Date.now()}`,
    }
  );
  assert(
    persistedOrderRes.status === 201 && persistedOrderRes.body.data.subOrders.length === 1,
    `Une offre PostgreSQL doit créer une commande persistée (reçu: ${JSON.stringify(persistedOrderRes.body)})`
  );
  createdTestOrderIds.push(persistedOrderRes.body.data.id);
  const persistedOrderRow = await dbManager.query(
    'SELECT "id" FROM "parent_orders" WHERE "id" = $1 AND "buyerId" = $2',
    [persistedOrderRes.body.data.id, registerRes.body.data.user.id]
  );
  assert(persistedOrderRow.rows[0], 'La commande créée doit être durable dans PostgreSQL');
  const deleteOfferRes = await request(
    'DELETE',
    `/api/v1/offers/${publishedOfferId}`,
    null,
    { authorization: `Bearer ${sellerAccount.token}` }
  );
  assert(deleteOfferRes.status === 200, 'Le vendeur doit pouvoir supprimer sa propre offre');
  const deletedOfferList = await request(
    'GET',
    `/api/v1/offers?search=${encodeURIComponent(testProductName)}`
  );
  assert(deletedOfferList.body.data.length === 0, 'Une offre supprimée ne doit plus apparaître au catalogue');
  const deletedOfferDetail = await request('GET', `/api/v1/offers/${publishedOfferId}`);
  assert(deletedOfferDetail.status === 404, 'Une offre supprimée ne doit plus être consultable directement');
  console.log('✅ TEST 6A RÉUSSI : Offre publiée et compte vendeur désactivé avec révocation immédiate de sa session.');

  // 1. Accès sans token -> 401
  const unauthRes = await request('GET', `/api/v1/orders/seller/${sellerSubOrder.sellerId}`);
  assert(unauthRes.status === 401, 'L\'accès sans authentification doit être refusé (401)');

  // 2. Accès par un autre vendeur -> 403
  const forbiddenRes = await request(
    'GET',
    `/api/v1/orders/seller/${sellerSubOrder.sellerId}`,
    null,
    { authorization: `Bearer ${otherSellerAccount.token}` }
  );
  assert(forbiddenRes.status === 403, 'Un vendeur ne peut pas accéder aux sous-commandes d\'un tiers (403)');

  // 3. Accès par le vendeur propriétaire -> 200
  const coopakOrdersRes = await request(
    'GET',
    `/api/v1/orders/seller/${sellerAccount.sellerId}`,
    null,
    { authorization: `Bearer ${sellerAccount.token}` }
  );
  assert(coopakOrdersRes.status === 200, 'Le vendeur propriétaire doit pouvoir lister ses sous-commandes');
  assert(
    coopakOrdersRes.body.data.every((so) => so.sellerId === sellerAccount.sellerId),
    'Toutes les sous-commandes renvoyées doivent appartenir exclusivement à ce vendeur'
  );
  console.log('✅ TEST 6 RÉUSSI : Les sous-commandes d\'un vendeur sont hermétiquement isolées (401/403/200 validés).');

  // -------------------------------------------------------------------------
  // TEST 7 : Cycle de vie logistique indépendant de la commande
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Opérations internes et absence de suivi public ---');
  const delivery = AgroStore.deliveries.get(sellerSubOrder.deliveryId);
  assert(delivery !== undefined, 'Une livraison dédiée doit être créée pour chaque sous-commande');

  const unauthorizedStatusRes = await request(
    'PATCH',
    `/api/v1/deliveries/${delivery.id}/status`,
    { status: 'ASSIGNED' }
  );
  assert(unauthorizedStatusRes.status === 401, 'Les jalons logistiques internes doivent rester protégés');

  // Vérification que le suivi public est désactivé
  const trackPublicRes = await request(
    'GET',
    `/api/v1/deliveries/track/${delivery.trackingCode}`
  );
  assert(trackPublicRes.status === 404, 'Le suivi public des livraisons doit être désactivé');
  console.log('✅ TEST 7 RÉUSSI : Le suivi public des livraisons est désactivé.');

  // -------------------------------------------------------------------------
  // TEST 8 : Pas de configuration de taux de change
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8 : Configuration de taux de change désactivée ---');
  const rateEndpointRes = await request('GET', '/api/v1/admin/exchange-rate');
  assert(rateEndpointRes.status === 404, 'La configuration du taux de change doit être retirée');
  assert(!('totalAmountUsd' in parentOrder), 'Les commandes publiques ne doivent pas exposer de montant USD');
  console.log('✅ TEST 8 RÉUSSI : Aucun taux ni montant USD n’est exposé par le parcours de commande.');

  // -------------------------------------------------------------------------
  // TEST 9 : Revenu vendeur sans commission de commande
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9 : Revenu vendeur sans commission de commande ---');
  const subOrderFin = AgroStore.financialRecords.get(sellerSubOrder.id);
  assert(subOrderFin !== undefined, 'Un enregistrement financier vendeur doit exister');
  const expectedCommission = (subOrderFin.grossAmountCdf * subOrderFin.commissionRate) / 100;
  assert(
    Math.abs(subOrderFin.commissionAmountCdf - expectedCommission) < 0.01,
    'Aucune commission ne doit être prélevée sur une commande'
  );
  assert(
    Math.abs(subOrderFin.sellerEarningsCdf - (subOrderFin.grossAmountCdf - subOrderFin.commissionAmountCdf)) < 0.01,
    'Le revenu net vendeur doit égaler (Brut - Commission)'
  );
  console.log(
    `✅ TEST 9 RÉUSSI : Brut = ${subOrderFin.grossAmountCdf} CDF, Commission = ${subOrderFin.commissionAmountCdf} CDF, Net vendeur = ${subOrderFin.sellerEarningsCdf} CDF.`
  );

  // -------------------------------------------------------------------------
  // TEST 10 : Spécification OpenAPI 3.0 & Swagger UI
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10 : Documentation OpenAPI 3.0 et Swagger UI ---');
  const openApiRes = await request('GET', '/api/v1/openapi.json');
  assert(openApiRes.status === 200, 'L\'endpoint OpenAPI JSON doit retourner 200');
  assert(openApiRes.body.openapi === '3.0.3', 'La version OpenAPI doit être 3.0.3');
  assert(openApiRes.body.paths['/orders'] !== undefined, 'La spécification doit documenter /orders');

  const docsRes = await request('GET', '/api/v1/docs');
  assert(docsRes.status === 200, 'L\'interface Swagger UI HTML doit retourner 200');
  assert(docsRes.text.includes('AgroConnect RDC'), 'La page HTML doit contenir le titre AgroConnect');
  console.log('✅ TEST 10 RÉUSSI : Spécification OpenAPI 3.0.3 et interface Swagger UI validées.');

  console.log('\n🎉 =================================================================');
  console.log('🎉 TOUTES LES 10 RÈGLES MÉTIER ET CONTRAINTES SONT VALIDÉES À 100% !');
  console.log('🎉 =================================================================\n');

  for (const orderId of createdTestOrderIds) {
    await dbManager.query('DELETE FROM "parent_orders" WHERE "id" = $1', [orderId]);
  }
  for (const productId of createdTestProductIds) {
    await dbManager.query(
      'DELETE FROM "stock_movements" WHERE "offerId" IN (SELECT "id" FROM "offers" WHERE "productId" = $1)',
      [productId]
    );
    await dbManager.query('DELETE FROM "offers" WHERE "productId" = $1', [productId]);
    await dbManager.query('DELETE FROM "products" WHERE "id" = $1', [productId]);
  }
  for (const categoryId of createdTestCategoryIds) {
    await dbManager.query('DELETE FROM "categories" WHERE "id" = $1', [categoryId]);
  }
  for (const userId of createdTestUserIds) {
    await dbManager.query('DELETE FROM "seller_profiles" WHERE "userId" = $1', [userId]);
    await dbManager.query('DELETE FROM "users" WHERE "id" = $1', [userId]);
  }
}

runBusinessRuleTests().catch((err) => {
  console.error('❌ Erreur inattendue pendant les tests métier :', err);
  process.exit(1);
});
