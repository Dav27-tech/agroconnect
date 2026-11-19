import assert from 'node:assert/strict';

process.env.GOFRESHPAY_MERCHANT_ID = 'test-merchant';
process.env.GOFRESHPAY_MERCHANT_SECRET = 'test-secret';

const requests = [];
const responses = [
  {
    Status: 'Pending',
    Reference: 'order_test_001',
    Transaction_id: 'gateway_tx_001',
    Amount: '5000',
    Currency: 'CDF',
  },
  {
    Status: 'Success',
    Trans_Status: 'Success',
    Reference: 'order_test_001',
    Transaction_id: 'gateway_tx_001',
    Amount: '5000',
    Currency: 'CDF',
  },
];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => {
  requests.push(JSON.parse(options.body));
  const body = responses.shift();
  assert(body, 'Unexpected GoFreshPay request');
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  };
};

try {
  const { GoFreshPayGatewayProvider } = await import('./dist/integrations/payment/GoFreshPayGatewayProvider.js');
  const gateway = new GoFreshPayGatewayProvider();
  const initiated = await gateway.initiateTransaction({
    action: 'debit',
    amountCdf: 5000,
    phone: '+243 970 000 000',
    provider: 'M_PESA',
    reference: 'order_test_001',
  });
  assert.equal(initiated.status, 'PENDING');
  assert.equal(initiated.transactionId, 'gateway_tx_001');
  assert.equal(requests[0].action, 'debit');
  assert.equal(requests[0].method, 'mpesa');
  assert.equal(requests[0].customer_number, '243970000000');
  assert.equal(requests[0].amount, '5000');
  assert.equal(requests[0].currency, 'CDF');
  assert.equal(requests[0].merchant_secrete, 'test-secret');

  const verified = await gateway.verifyTransaction('order_test_001');
  assert.equal(verified.status, 'SUCCEEDED');
  assert.equal(requests[1].action, 'verify');
  assert.equal(requests[1].reference, 'order_test_001');
  assert.equal(responses.length, 0);

  console.log('✅ GoFreshPay Gateway debit/verify contract validated with mocked responses.');
} finally {
  globalThis.fetch = originalFetch;
}
