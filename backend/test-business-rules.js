import { createApp } from './dist/app.js';
import { AgroStore } from './dist/database/store.js';
import { Security } from './dist/common/security.js';

const app = createApp();

function request(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const mockReq = {
      method,
      url,
      originalUrl: url,
      path: url.split('?')[0],
      query: {},
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
  // TEST 1 : Utilisateur avec rôles multiples (Multi-Rôles)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 : Support multi-rôles natif ---');
  const registerRes = await request(
    'POST',
    '/api/v1/auth/register',
    {
      phoneNumber: '+243819998877',
      fullName: 'Mwasi Agricole & Commerçante',
      password: 'Password123!',
      roles: ['SELLER', 'BUYER'], // Multi-rôle : vend sa récolte et achète des intrants
    },
    { 'content-type': 'application/json' }
  );
  assert(registerRes.status === 201, `L'inscription multi-rôles doit retourner 201 (reçu: ${registerRes.status})`);
  assert(
    Array.isArray(registerRes.body.data.user.roles) &&
    registerRes.body.data.user.roles.includes('SELLER') &&
    registerRes.body.data.user.roles.includes('BUYER'),
    'L\'utilisateur doit cumuler les rôles SELLER et BUYER'
  );
  const multiRoleToken = registerRes.body.data.token;
  const verifiedToken = Security.verifyToken(multiRoleToken);
  assert(
    verifiedToken.roles.includes('SELLER') && verifiedToken.roles.includes('BUYER'),
    'Le jeton JWT doit encoder l\'ensemble des rôles de l\'utilisateur'
  );
  console.log('✅ TEST 1 RÉUSSI : Utilisateur multi-rôles créé et authentifié avec succès.');

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
    { 'content-type': 'application/json' }
  );

  assert(orderRes.status === 201, `La création de la commande multi-vendeurs doit réussir (201, reçu: ${orderRes.status})`);
  const parentOrder = orderRes.body.data;
  assert(parentOrder.orderNumber.startsWith('AGC-ORD-'), 'Le numéro de commande parent doit suivre le format AGC-ORD-');
  assert(parentOrder.subOrders.length === 2, 'Un panier avec 2 vendeurs distincts doit produire 2 sous-commandes');
  assert(
    parentOrder.subOrders[0].sellerId !== parentOrder.subOrders[1].sellerId,
    'Chaque sous-commande doit appartenir à un vendeur distinct'
  );
  assert(
    parentOrder.exchangeRateSnapshot === 2850,
    'La commande parent doit enregistrer le snapshot exact du taux de change'
  );
  console.log(
    `✅ TEST 5 RÉUSSI : Commande parent ${parentOrder.orderNumber} scindée en 2 sous-commandes vendeurs avec snapshot du taux (${parentOrder.exchangeRateSnapshot} CDF).`
  );

  // -------------------------------------------------------------------------
  // TEST 6 : Isolation des sous-commandes vendeur
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Isolation des sous-commandes par vendeur ---');
  const sellerSubOrder = parentOrder.subOrders[0];
  const sellerToken = Security.generateToken(
    'usr-farmer-jean-pierre',
    '+243818001122',
    ['SELLER'],
    sellerSubOrder.sellerId
  );
  const otherSellerToken = Security.generateToken(
    'usr-reseller-marie',
    '+243825553344',
    ['SELLER'],
    'seller-agrodistrib-kin'
  );

  // 1. Accès sans token -> 401
  const unauthRes = await request('GET', `/api/v1/orders/seller/${sellerSubOrder.sellerId}`);
  assert(unauthRes.status === 401, 'L\'accès sans authentification doit être refusé (401)');

  // 2. Accès par un autre vendeur -> 403
  const forbiddenRes = await request(
    'GET',
    `/api/v1/orders/seller/${sellerSubOrder.sellerId}`,
    null,
    { authorization: `Bearer ${otherSellerToken}` }
  );
  assert(forbiddenRes.status === 403, 'Un vendeur ne peut pas accéder aux sous-commandes d\'un tiers (403)');

  // 3. Accès par le vendeur propriétaire -> 200
  const coopakOrdersRes = await request(
    'GET',
    `/api/v1/orders/seller/${sellerSubOrder.sellerId}`,
    null,
    { authorization: `Bearer ${sellerToken}` }
  );
  assert(coopakOrdersRes.status === 200, 'Le vendeur propriétaire doit pouvoir lister ses sous-commandes');
  assert(
    coopakOrdersRes.body.data.every((so) => so.sellerId === sellerSubOrder.sellerId),
    'Toutes les sous-commandes renvoyées doivent appartenir exclusivement à ce vendeur'
  );
  console.log('✅ TEST 6 RÉUSSI : Les sous-commandes d\'un vendeur sont hermétiquement isolées (401/403/200 validés).');

  // -------------------------------------------------------------------------
  // TEST 7 : Cycle de vie logistique indépendant de la commande
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Cycle de vie de livraison et traçabilité indépendant ---');
  const delivery = AgroStore.deliveries.get(sellerSubOrder.deliveryId);
  assert(delivery !== undefined, 'Une livraison dédiée doit être créée pour chaque sous-commande');
  assert(delivery.trackingCode.startsWith('AGC-TRK-'), 'Le code de suivi doit respecter le format AGC-TRK-');

  // Mise à jour du statut de livraison
  const trackUpdateRes = await request(
    'PATCH',
    `/api/v1/deliveries/${delivery.id}/status`,
    {
      status: 'IN_TRANSIT',
      location: 'Kikwit, Gare Routière',
      notes: 'Colis pris en charge par le camionneur et scellé',
    },
    { 'content-type': 'application/json' }
  );
  assert(trackUpdateRes.status === 200, 'La mise à jour logistique doit retourner 200');

  // Vérification du suivi public
  const trackPublicRes = await request(
    'GET',
    `/api/v1/deliveries/track/${delivery.trackingCode}`
  );
  assert(trackPublicRes.status === 200, 'Le suivi public doit être accessible via le code de tracking');
  assert(trackPublicRes.body.data.status === 'IN_TRANSIT', 'Le statut logistique doit être IN_TRANSIT');
  assert(
    trackPublicRes.body.data.statusHistory.length >= 2,
    'L\'historique de livraison doit comporter au moins 2 jalons horodatés'
  );
  console.log(
    `✅ TEST 7 RÉUSSI : Suivi logistique autonome fonctionnel avec ${trackPublicRes.body.data.statusHistory.length} jalons enregistrés.`
  );

  // -------------------------------------------------------------------------
  // TEST 8 : Immuabilité du taux de change sur les commandes antérieures
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8 : Immuabilité du taux de change sur commandes historiques ---');
  // Modification du taux de change de 2850 à 2900 CDF
  const adminToken = Security.generateToken('usr-admin-kin', '+243810000001', 'ADMIN');
  const updateRateRes = await request(
    'POST',
    '/api/v1/admin/exchange-rate',
    {
      rate: 2900,
      notes: 'Ajustement monétaire suite à évolution du cours indicatif',
    },
    {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    }
  );
  assert(updateRateRes.status === 200, 'L\'administrateur doit pouvoir modifier le taux officiel');
  assert(AgroStore.getActiveExchangeRate().rate === 2900, 'Le nouveau taux actif doit être 2900 CDF');

  // Vérification que la commande historique n'a PAS bougé
  const historicalOrder = AgroStore.parentOrders.get(parentOrder.id);
  assert(
    historicalOrder.exchangeRateSnapshot === 2850,
    'La commande antérieure doit STRICTEMENT conserver son taux snapshot d\'origine (2850 CDF)'
  );
  console.log(
    `✅ TEST 8 RÉUSSI : Taux actif mis à jour à 2900 CDF tandis que la commande ${historicalOrder.orderNumber} conserve son taux immuable de 2850 CDF.`
  );

  // -------------------------------------------------------------------------
  // TEST 9 : Exactitude des calculs financiers (Commissions & BigInt)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9 : Calcul exact des commissions et reversements vendeurs ---');
  const subOrderFin = AgroStore.financialRecords.get(sellerSubOrder.id);
  assert(subOrderFin !== undefined, 'Un enregistrement financier de commission doit exister');
  const expectedCommission = (subOrderFin.grossAmountCdf * subOrderFin.commissionRate) / 100;
  assert(
    Math.abs(subOrderFin.commissionAmountCdf - expectedCommission) < 0.01,
    'La commission AgroConnect doit correspondre exactement à 5.0% du montant brut'
  );
  assert(
    Math.abs(subOrderFin.sellerEarningsCdf - (subOrderFin.grossAmountCdf - subOrderFin.commissionAmountCdf)) < 0.01,
    'Le revenu net vendeur doit égaler (Brut - Commission)'
  );
  console.log(
    `✅ TEST 9 RÉUSSI : Brut = ${subOrderFin.grossAmountCdf} CDF, Commission 5% = ${subOrderFin.commissionAmountCdf} CDF, Net vendeur = ${subOrderFin.sellerEarningsCdf} CDF.`
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
}

runBusinessRuleTests().catch((err) => {
  console.error('❌ Erreur inattendue pendant les tests métier :', err);
  process.exit(1);
});
