import test from 'node:test';
import assert from 'node:assert/strict';

import { validDocument, validEmail, validPhone } from '../src/utils/validations.js';

test('validEmail accepts ordinary domains and rejects malformed addresses', () => {
    assert.equal(validEmail('reader@example.org'), true);
    assert.equal(validEmail('reader@books.co.uk'), true);
    assert.equal(validEmail('reader @example.org'), false);
    assert.equal(validEmail('reader@example'), false);
});

test('validPhone accepts only 7 to 15 digits', () => {
    assert.equal(validPhone('1234567'), true);
    assert.equal(validPhone('123456789012345'), true);
    assert.equal(validPhone('1234567890123456'), false);
    assert.equal(validPhone('123-4567'), false);
});

test('validDocument accepts only 6 to 20 digits', () => {
    assert.equal(validDocument('123456'), true);
    assert.equal(validDocument('12345678901234567890'), true);
    assert.equal(validDocument('12345'), false);
    assert.equal(validDocument('ABC123'), false);
});
