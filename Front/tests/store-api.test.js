import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOrderPayload, buildRegistrationPayload } from '../src/services/store-api.js';

test('buildOrderPayload sends product ids and no sensitive card fields', () => {
    const payload = buildOrderPayload({
        nombre: 'Ana Pérez', documento: '12345678', correo: 'ANA@EXAMPLE.ORG', telefono: '987654321',
        direccion: 'Calle 1', distrito: 'Centro', ciudad: 'lima', referencia: '',
        fechaEntrega: '2026-09-05', envio: 'estandar', tipoTarjeta: 'visa',
        numeroTarjeta: '4111111111114242', vencimiento: '2030-01', codigo: '123', titular: 'Ana Pérez'
    }, [{ id: '101', quantity: 2, price: 999 }]);

    assert.deepEqual(payload.items, [{ productId: 101, quantity: 2 }]);
    assert.equal(payload.shipping.methodCode, 'standard');
    assert.deepEqual(payload.payment, { brand: 'visa', lastFour: '4242' });
    const serialized = JSON.stringify(payload);
    assert.equal(serialized.includes('4111111111114242'), false);
    assert.equal(serialized.includes('2030-01'), false);
    assert.equal(serialized.includes('123"'), false);
    assert.equal(serialized.includes('999'), false);
});

test('buildRegistrationPayload maps every approved registration field', () => {
    const payload = buildRegistrationPayload({
        nombres: 'Ana', apellidos: 'Pérez', correo: 'ANA@EXAMPLE.ORG', telefono: '987654321',
        fechaNacimiento: '2000-05-10', contrasena: 'secreto8', preferencia: 'ficcion',
        novedades: true, terminos: true
    });

    assert.deepEqual(payload, {
        firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.org', phone: '987654321',
        birthDate: '2000-05-10', password: 'secreto8', readingPreference: 'ficcion',
        newsletterOptIn: true, termsAccepted: true
    });
});

test('buildOrderPayload accepts shipping codes returned by the API', () => {
    const payload = buildOrderPayload({
        nombre: 'Ana Pérez', documento: '12345678', correo: 'ana@example.org', telefono: '987654321',
        direccion: 'Calle 1', distrito: 'Centro', ciudad: 'lima', referencia: '',
        fechaEntrega: '2026-09-05', envio: 'pickup', tipoTarjeta: 'visa',
        numeroTarjeta: '4111111111114242'
    }, [{ id: 101, quantity: 1 }]);

    assert.equal(payload.shipping.methodCode, 'pickup');
});
