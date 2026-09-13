import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateOrderPayload,
  validateRegistrationPayload,
} from '../../validators/payloads.js';

test('validateRegistrationPayload normalizes a valid registration', () => {
  const result = validateRegistrationPayload({
    firstName: '  Ana ',
    lastName: ' Pérez  ',
    email: ' ANA@EXAMPLE.ORG ',
    phone: '987654321',
    birthDate: '2000-05-10',
    password: 'secreto8',
    readingPreference: 'ficcion',
    newsletterOptIn: true,
    termsAccepted: true,
  });

  assert.equal(result.firstName, 'Ana');
  assert.equal(result.lastName, 'Pérez');
  assert.equal(result.email, 'ana@example.org');
  assert.equal(result.phone, '987654321');
  assert.equal(result.termsAccepted, true);
});

test('validateRegistrationPayload rejects invalid email, password and terms together', () => {
  assert.throws(
    () => validateRegistrationPayload({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'correo-invalido',
      phone: '1234567',
      birthDate: '2000-05-10',
      password: 'short',
      termsAccepted: false,
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.deepEqual(
        error.details.map((detail) => detail.field),
        ['email', 'password', 'termsAccepted'],
      );
      return true;
    },
  );
});

test('validateOrderPayload rejects duplicate products and quantities above ten', () => {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  assert.throws(
    () => validateOrderPayload({
      buyer: {
        name: 'Ana Pérez',
        document: '12345678',
        email: 'ana@example.org',
        phone: '987654321',
      },
      shipping: {
        address: 'Calle 1',
        district: 'Centro',
        city: 'lima',
        reference: '',
        requestedDate: tomorrow,
        methodCode: 'standard',
      },
      payment: { brand: 'visa', lastFour: '4242' },
      items: [
        { productId: 1, quantity: 11 },
        { productId: 1, quantity: 1 },
      ],
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      const fields = error.details.map((detail) => detail.field);
      assert.ok(fields.includes('items[0].quantity'));
      assert.ok(fields.includes('items[1].productId'));
      return true;
    },
  );
});

test('validateOrderPayload rejects malformed identity fields and oversized address data', () => {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  assert.throws(
    () => validateOrderPayload({
      buyer: {
        name: '<script>alert(1)</script>',
        document: 'ABC-123',
        email: 'ana@example.org',
        phone: '987654321',
      },
      shipping: {
        address: 'x'.repeat(256),
        district: 'Centro',
        city: 'lima',
        reference: 'x'.repeat(256),
        requestedDate: tomorrow,
        methodCode: 'standard',
      },
      payment: { brand: 'visa', lastFour: '4242' },
      items: [{ productId: 1, quantity: 1 }],
    }),
    (error) => {
      const fields = error.details.map((detail) => detail.field);
      assert.ok(fields.includes('buyer.name'));
      assert.ok(fields.includes('buyer.document'));
      assert.ok(fields.includes('shipping.address'));
      assert.ok(fields.includes('shipping.reference'));
      return true;
    },
  );
});
