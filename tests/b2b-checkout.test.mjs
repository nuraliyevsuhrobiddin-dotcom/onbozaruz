import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, createContext } from 'node:vm';

async function checkout({ profile = null, address = '  Amir Temur ko‘chasi, 12-uy  ', registerError } = {}) {
  const source = await readFile(new URL('../src/components/b2b/B2BCheckoutView.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const handleSubmit =');
  const end = source.indexOf('  const inputCls', start);
  const calls = { registrations: [], orders: [], errors: [], routes: [], busy: [] };
  const context = createContext({
    Error,
    form: { storeName: 'Do‘kon', phone: '+998901234567', region: 'Toshkent', district: 'Yunusobod', address, note: '' },
    businessProfile: profile, currentUser: { name: 'Xaridor' }, isSubmitting: false,
    paymentMethod: 'cash', applicableCashback: 0,
    setError: error => calls.errors.push(error), setIsSubmitting: busy => calls.busy.push(busy),
    registerBusinessBuyer: async input => {
      calls.registrations.push(input);
      if (registerError) throw new Error(registerError);
      if (!input.address?.trim()) throw new Error('To‘liq manzil majburiy');
    },
    checkoutB2BCart: async delivery => { calls.orders.push(delivery); return { failed: [], succeededSupplierIds: ['supplier'] }; },
    showToast() {}, setB2BRoute: route => calls.routes.push(route),
  });
  const module = new SourceTextModule(stripTypeScriptTypes(`${source.slice(start, end)}\nexport { handleSubmit };`), { context });
  await module.link(() => { throw Error('Unexpected import'); });
  await module.evaluate();
  await module.namespace.handleSubmit({ preventDefault() {} });
  return calls;
}

test('new buyer sends the full trimmed address to registration and checkout', async () => {
  const calls = await checkout();
  assert.equal(calls.registrations[0].address, 'Amir Temur ko‘chasi, 12-uy');
  assert.equal(calls.orders[0].address, calls.registrations[0].address);
  assert.equal(calls.routes[0].view, 'orders');
  assert.equal(calls.errors.filter(Boolean).length, 0);
});

test('existing buyer orders without registering again', async () => {
  const calls = await checkout({ profile: { id: 'business' } });
  assert.equal(calls.registrations.length, 0);
  assert.equal(calls.orders.length, 1);
});

test('blank address is still rejected before registration or checkout', async () => {
  const calls = await checkout({ address: '  ' });
  assert.equal(calls.registrations.length, 0);
  assert.equal(calls.orders.length, 0);
  assert.equal(calls.errors.filter(Boolean).length, 1);
});

test('registration failure prevents order submission and releases the busy state', async () => {
  const calls = await checkout({ registerError: 'Server unavailable' });
  assert.equal(calls.orders.length, 0);
  assert.equal(calls.errors.at(-1), 'Server unavailable');
  assert.deepEqual(calls.busy, [true, false]);
});
