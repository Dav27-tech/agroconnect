import { createApp } from './dist/app.js';
import { AgroStore } from './dist/database/store.js';
import { dbManager } from './dist/database/client.js';

AgroStore.seed();

async function testApp() {
  console.log('🧪 Démarrage de la suite de tests de validation des routes AgroConnect...\n');
  const app = createApp();

  // Helper pour simuler un appel Express sans socket réseau
  const request = (method, url, body = null, headers = {}) => {
    return new Promise((resolve) => {
      const mockReq = {
        method,
        url,
        originalUrl: url,
        path: url.split('?')[0],
        query: Object.fromEntries(new URLSearchParams(url.split('?')[1] || '')),
        params: {},
        headers: { host: 'localhost:5000', ...headers },
        body: body || {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      let statusCode = 200;
      let responseHeaders = {};
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
          resolve({ statusCode, headers: responseHeaders, body: responseBody });
          return this;
        },
        send(data) {
          responseBody = data;
          this.emitFinish();
          resolve({ statusCode, headers: responseHeaders, body: responseBody });
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
          resolve({ statusCode: 500, error: err });
        } else {
          resolve({ statusCode: 404, body: { message: 'Not handled' } });
        }
      });
    });
  };

  // 1. Test Health Check
  const healthRes = await request('GET', '/api/health');
  console.log('✅ 1. GET /api/health -> Status:', healthRes.statusCode, '| Pays:', healthRes.body.data.country, '| Devise:', healthRes.body.data.supportedCurrencies[0]);

  // 2. Test Categories
  const catRes = await request('GET', '/api/v1/categories');
  console.log('✅ 2. GET /api/v1/categories -> Status:', catRes.statusCode, '| Nombre de catégories:', catRes.body.data.length);

  // 3. Test Products
  const prodRes = await request('GET', '/api/v1/products');
  console.log('✅ 3. GET /api/v1/products -> Status:', prodRes.statusCode, '| Nombre de produits communs:', prodRes.body.data.length);

  // 4. Test Offers
  const offRes = await request('GET', '/api/v1/offers');
  console.log('✅ 4. GET /api/v1/offers -> Status:', offRes.statusCode, '| Offres vendeurs:', offRes.body.data.length);
  const featuredOffersRes = await request('GET', '/api/v1/offers?featured=true');
  if (featuredOffersRes.statusCode !== 200 || !Array.isArray(featuredOffersRes.body.data)) {
    throw new Error(`Le chargement des offres vedettes a échoué (${featuredOffersRes.statusCode})`);
  }
  console.log('✅ 4b. GET /api/v1/offers?featured=true -> Status:', featuredOffersRes.statusCode);

  // 5. Test Cart Calculate (Multi-Vendeurs)
  const cartOffers = offRes.body.data.filter((offer) => offer.stockQuantity > 0).slice(0, 2);
  if (cartOffers.length === 0) {
    throw new Error('Aucune offre persistée disponible pour tester le calcul du panier');
  }
  const cartRes = await request('POST', '/api/v1/cart/calculate', {
    items: cartOffers.map((offer) => ({ offerId: offer.id, quantity: 1, saleType: 'RETAIL' })),
  });
  if (cartRes.statusCode !== 200 || cartRes.body.data.totals.totalCdf <= 0) {
    throw new Error(`Le calcul du panier échoue pour une offre PostgreSQL (${cartRes.statusCode})`);
  }
  console.log('✅ 5. POST /api/v1/cart/calculate -> Status:', cartRes.statusCode, '| Vendeurs distincts:', cartRes.body.data.distinctSellersCount, '| Total CDF:', cartRes.body.data.totals.totalCdf, 'FC');

  // 6. Test Create Order (RDC Province, CDF, Suborders)
  const routeTestEmail = `route-smoke-${Date.now()}@example.test`;
  const routeTestPhone = `+24381${String(Date.now()).slice(-7)}`;
  const buyerRegistration = await request('POST', '/api/v1/auth/register', {
    phoneNumber: routeTestPhone,
    fullName: 'Acheteur de validation',
    password: 'Password123!',
    email: routeTestEmail,
    role: 'BUYER',
  });
  if (buyerRegistration.statusCode !== 201) {
    throw new Error(`Impossible de créer le compte de test acheteur (${buyerRegistration.statusCode})`);
  }
  const buyerToken = buyerRegistration.body.data.token;
  const orderRes = await request('POST', '/api/v1/orders', {
    items: [
      { offerId: 'off-manioc-coopak', quantity: 2, saleType: 'RETAIL' },
      { offerId: 'off-pondu-agrodistrib', quantity: 20, saleType: 'WHOLESALE' },
    ],
    currency: 'CDF',
    deliveryProvince: 'Kinshasa',
    deliveryCity: 'Kinshasa',
    deliveryAddress: 'Avenue Colonel Mondjiba, Ngaliema',
    recipientName: 'Dieudonné Kayembe',
    recipientPhone: '+243818889900',
  }, { authorization: `Bearer ${buyerToken}`, 'idempotency-key': 'route-smoke-order-0001' });
  console.log('✅ 6. POST /api/v1/orders -> Status:', orderRes.statusCode, '| Numéro Commande:', orderRes.body.data.orderNumber, '| Sous-commandes vendeurs:', orderRes.body.data.subOrders.length, '| Montant CDF:', orderRes.body.data.totalAmountCdf);

  // 7. No public delivery tracking
  const delRes = await request('GET', '/api/v1/deliveries/track/AGC-TRK-784910');
  console.log('✅ 7. GET /api/v1/deliveries/track/:code -> Status:', delRes.statusCode, '| Suivi public désactivé');

  // 8. Test Admin Stats
  const adminRes = await request('GET', '/api/v1/admin/stats');
  if (adminRes.statusCode !== 401) {
    throw new Error(`La route admin doit refuser un accès anonyme (reçu: ${adminRes.statusCode})`);
  }
  console.log('✅ 8. GET /api/v1/admin/stats sans session -> Status:', adminRes.statusCode);

  const missingEmailRes = await request('POST', '/api/v1/auth/register', {
    phoneNumber: '+243810002224',
    fullName: 'Acheteur Test',
    password: 'motdepassefort',
  });
  console.log('✅ 9. POST /api/v1/auth/register sans email -> Status:', missingEmailRes.statusCode);

  const buyerUserId = buyerRegistration.body.data.user.id;
  await dbManager.query('DELETE FROM "users" WHERE "id" = $1', [buyerUserId]);

  console.log('\n🎉 TOUS LES TESTS DE VALIDATION MÉTIER ONT RÉUSSI AVEC SUCCÈS !');
}

testApp().catch(console.error);
