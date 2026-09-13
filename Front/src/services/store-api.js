import { api } from './api.js';

const SHIPPING_CODE_MAP = {
    estandar: 'standard',
    expreso: 'express',
    recojo: 'pickup'
};

export function buildRegistrationPayload(formData) {
    return {
        firstName: formData.nombres.trim(),
        lastName: formData.apellidos.trim(),
        email: formData.correo.trim().toLowerCase(),
        phone: formData.telefono.trim(),
        birthDate: formData.fechaNacimiento,
        password: formData.contrasena,
        readingPreference: formData.preferencia || null,
        newsletterOptIn: formData.novedades === true,
        termsAccepted: formData.terminos === true
    };
}

export function buildOrderPayload(formData, items) {
    const cardDigits = formData.numeroTarjeta.replace(/\D/g, '');
    return {
        buyer: {
            name: formData.nombre.trim(),
            document: formData.documento.trim(),
            email: formData.correo.trim().toLowerCase(),
            phone: formData.telefono.trim()
        },
        shipping: {
            address: formData.direccion.trim(),
            district: formData.distrito.trim(),
            city: formData.ciudad,
            reference: formData.referencia.trim(),
            requestedDate: formData.fechaEntrega,
            methodCode: SHIPPING_CODE_MAP[formData.envio] || formData.envio
        },
        payment: {
            brand: formData.tipoTarjeta,
            lastFour: cardDigits.slice(-4)
        },
        items: items.map((item) => ({
            productId: Number(item.id),
            quantity: item.quantity
        }))
    };
}

export const storeApi = {
    products(category = 'all') {
        const query = category === 'all' ? '' : `?category=${encodeURIComponent(category)}`;
        return api.request(`/products${query}`);
    },
    search(term) {
        return api.request(`/products/search?q=${encodeURIComponent(term)}`);
    },
    shippingMethods() {
        return api.request('/shipping-methods');
    },
    register(formData) {
        return api.request('/auth/register', { method: 'POST', body: buildRegistrationPayload(formData) });
    },
    async login(email, password) {
        const session = await api.request('/auth/login', {
            method: 'POST',
            body: { email: email.trim().toLowerCase(), password }
        });
        api.setAccessToken(session.accessToken);
        return session;
    },
    refresh() {
        return api.refreshSession();
    },
    async logout() {
        try {
            await api.request('/auth/logout', { method: 'POST' }, false);
        } finally {
            api.clearAccessToken();
        }
    },
    createOrder(formData, items) {
        return api.request('/orders', { method: 'POST', body: buildOrderPayload(formData, items) });
    }
};
