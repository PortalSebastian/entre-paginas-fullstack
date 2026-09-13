import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError, createApiClient } from '../src/services/api.js';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('API client renews an expired access token once and retries the request', async () => {
  const calls = [];
  const responses = [
    jsonResponse(401, { success: false, error: { code: 'INVALID_ACCESS_TOKEN', message: 'Expired.' } }),
    jsonResponse(200, { success: true, data: { accessToken: 'new-token', user: { id: 1 } } }),
    jsonResponse(200, { success: true, data: [{ id: 101, title: '1984' }] }),
  ];
  const client = createApiClient({
    baseUrl: 'http://localhost:3000/api/v1',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });
  client.setAccessToken('old-token');

  const products = await client.request('/products');

  assert.equal(products[0].id, 101);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer old-token');
  assert.equal(calls[1].url, 'http://localhost:3000/api/v1/auth/refresh');
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(calls[2].options.headers.Authorization, 'Bearer new-token');
});

test('API client exposes the backend error code and validation details', async () => {
  const client = createApiClient({
    baseUrl: 'http://localhost:3000/api/v1',
    fetchImpl: async () => jsonResponse(422, {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid data.', details: [{ field: 'email' }] },
    }),
  });

  await assert.rejects(
    () => client.request('/auth/register', { method: 'POST', body: { email: 'bad' } }),
    (error) => error instanceof ApiError
      && error.status === 422
      && error.code === 'VALIDATION_ERROR'
      && error.details[0].field === 'email',
  );
});

// --- Transporte del token CSRF ---------------------------------------------

test('API client requests a CSRF token once and attaches it only to mutations', async () => {
    const calls = [];
    const client = createApiClient({
        baseUrl: 'http://localhost:3000/api/v1',
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            if (url.endsWith('/csrf')) {
                return jsonResponse(200, { success: true, data: { csrfToken: 'token-abc' } });
            }
            return jsonResponse(200, { success: true, data: { ok: true } });
        }
    });

    await client.request('/products');
    await client.request('/orders', { method: 'POST', body: { items: [] } });
    await client.request('/orders', { method: 'POST', body: { items: [] } });

    // La lectura no pide ni envia token.
    assert.equal(calls[0].url, 'http://localhost:3000/api/v1/products');
    assert.equal(calls[0].options.headers['x-csrf-token'], undefined);

    // La primera mutacion lo pide; la segunda reutiliza el que ya tiene.
    assert.equal(calls[1].url, 'http://localhost:3000/api/v1/csrf');
    assert.equal(calls[2].options.headers['x-csrf-token'], 'token-abc');
    assert.equal(calls[3].options.headers['x-csrf-token'], 'token-abc');
    assert.equal(calls.length, 4);
    assert.equal(calls[2].options.credentials, 'include');
});

test('API client renews a stale CSRF token once and retries the mutation', async () => {
    const calls = [];
    let issued = 0;
    const client = createApiClient({
        baseUrl: 'http://localhost:3000/api/v1',
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            if (url.endsWith('/csrf')) {
                issued += 1;
                return jsonResponse(200, { success: true, data: { csrfToken: `token-${issued}` } });
            }
            // El servidor rechaza el primer token, como tras rotarlo en login.
            if (options.headers['x-csrf-token'] === 'token-1') {
                return jsonResponse(403, {
                    success: false,
                    error: { code: 'CSRF_TOKEN_INVALID', message: 'A valid CSRF token is required.' }
                });
            }
            return jsonResponse(200, { success: true, data: { ok: true } });
        }
    });

    const result = await client.request('/orders', { method: 'POST', body: {} });

    assert.equal(result.ok, true);
    assert.equal(issued, 2, 'the client must ask for a fresh token');
    assert.equal(calls.at(-1).options.headers['x-csrf-token'], 'token-2');
});

test('API client surfaces a CSRF rejection that persists after one retry', async () => {
    const client = createApiClient({
        baseUrl: 'http://localhost:3000/api/v1',
        fetchImpl: async (url) => {
            if (url.endsWith('/csrf')) {
                return jsonResponse(200, { success: true, data: { csrfToken: 'token-abc' } });
            }
            return jsonResponse(403, {
                success: false,
                error: { code: 'CSRF_TOKEN_INVALID', message: 'A valid CSRF token is required.' }
            });
        }
    });

    await assert.rejects(
        () => client.request('/orders', { method: 'POST', body: {} }),
        (error) => error instanceof ApiError && error.status === 403 && error.code === 'CSRF_TOKEN_INVALID'
    );
});
