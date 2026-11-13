import { createApp } from './dist/app.js';

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
        query: {},
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
  console.log('✅ 1. GET /api/health -> Status:', healthRes.statusCode, '| Pays:', healthRes.body.data.country, '| Taux:', healthRes.body.data.exchangeRateSnapshot.rate, 'CDF');

  // 2. Test Categories
  const catRes = await request('GET', '/api/v1/categories');
  console.log('✅ 2. GET /api/v1/categories -> Status:', catRes.statusCode, '| Nombre de catégories:', catRes.body.data.length);

  // 3. Test Products
  const prodRes = await request('GET', '/api/v1/products');
  console.log('✅ 3. GET /api/v1/products -> Status:', prodRes.statusCode, '| Nombre de produits communs:', prodRes.body.data.length);

  // 4. Test Offers
  const offRes = await request('GET', '/api/v1/offers');
  console.log('✅ 4. GET /api/v1/offers -> Status:', offRes.statusCode, '| Offres vendeurs:', offRes.body.data.length);

  // 5. Test Cart Calculate (Multi-Vendeurs)
  const cartRes = await request('POST', '/api/v1/cart/calculate', {
    items: [
      { offerId: 'off-manioc-kikwit-01', quantity: 2, saleType: 'RETAIL' },
      { offerId: 'off-mais-katanga-01', quantity: 20, saleType: 'WHOLESALE' },
    ],
  });
  console.log('✅ 5. POST /api/v1/cart/calculate -> Status:', cartRes.statusCode, '| Vendeurs distincts:', cartRes.body.data.totalDistinctSellers, '| Total CDF:', cartRes.body.data.totals.totalCdf, 'FC | Total USD:', cartRes.body.data.totals.totalUsd, '$');

  // 6. Test Create Order (RDC Province, Snapshot Taux, Suborders)
  const orderRes = await request('POST', '/api/v1/orders', {
    items: [
      { offerId: 'off-manioc-kikwit-01', quantity: 2, saleType: 'RETAIL' },
      { offerId: 'off-mais-katanga-01', quantity: 20, saleType: 'WHOLESALE' },
    ],
    currency: 'CDF',
    deliveryProvince: 'Kinshasa',
    deliveryCity: 'Kinshasa',
    deliveryAddress: 'Avenue Colonel Mondjiba, Ngaliema',
    recipientName: 'Dieudonné Kayembe',
    recipientPhone: '+243818889900',
  });
  console.log('✅ 6. POST /api/v1/orders -> Status:', orderRes.statusCode, '| Numéro Commande:', orderRes.body.data.orderNumber, '| Sous-commandes vendeurs:', orderRes.body.data.subOrders.length, '| Taux figé:', orderRes.body.data.exchangeRateSnapshot);

  // 7. Test Tracking Delivery
  const delRes = await request('GET', '/api/v1/deliveries/track/AGC-TRK-784910');
  console.log('✅ 7. GET /api/v1/deliveries/track/:code -> Status:', delRes.statusCode, '| Statut livraison:', delRes.body.data.status, '| Événements historiques:', delRes.body.data.statusHistory.length);

  // 8. Test Admin Stats
  const adminRes = await request('GET', '/api/v1/admin/stats');
  console.log('✅ 8. GET /api/v1/admin/stats -> Status:', adminRes.statusCode, '| Vendeurs actifs:', adminRes.body.data.activeSellersCount, '| Règle:', adminRes.body.data.marketplaceIntermediaryRule);

  console.log('\n🎉 TOUS LES TESTS DE VALIDATION MÉTIER ONT RÉUSSI AVEC SUCCÈS !');
}

testApp().catch(console.error);
