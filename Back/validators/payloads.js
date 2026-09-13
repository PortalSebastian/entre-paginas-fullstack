import { validationError } from '../errors/app-error.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;
const PHONE_PATTERN = /^\d{7,15}$/;
const DOCUMENT_PATTERN = /^\d{6,20}$/;
const CARD_BRANDS = new Set(['visa', 'mastercard', 'amex', 'diners']);
const CITIES = new Set(['lima', 'arequipa', 'cusco', 'trujillo', 'otra']);
const SHIPPING_CODES = new Set(['standard', 'express', 'pickup']);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function throwDetails(details) {
  if (details.length > 0) throw validationError(details);
}

export function validateRegistrationPayload(payload = {}) {
  const normalized = {
    firstName: text(payload.firstName),
    lastName: text(payload.lastName),
    email: text(payload.email).toLowerCase(),
    phone: text(payload.phone),
    birthDate: text(payload.birthDate),
    password: typeof payload.password === 'string' ? payload.password : '',
    readingPreference: text(payload.readingPreference) || null,
    newsletterOptIn: payload.newsletterOptIn === true,
    termsAccepted: payload.termsAccepted === true,
  };
  const details = [];

  if (!NAME_PATTERN.test(normalized.firstName) || normalized.firstName.length > 100) {
    details.push({ field: 'firstName', message: 'Enter a valid first name.' });
  }
  if (!NAME_PATTERN.test(normalized.lastName) || normalized.lastName.length > 100) {
    details.push({ field: 'lastName', message: 'Enter a valid last name.' });
  }
  if (!EMAIL_PATTERN.test(normalized.email) || normalized.email.length > 254) {
    details.push({ field: 'email', message: 'Enter a valid email.' });
  }
  if (!PHONE_PATTERN.test(normalized.phone)) {
    details.push({ field: 'phone', message: 'Phone must contain 7 to 15 digits.' });
  }
  if (!isIsoDate(normalized.birthDate) || normalized.birthDate >= todayIso()) {
    details.push({ field: 'birthDate', message: 'Enter a past birth date.' });
  }
  if (normalized.password.length < 8) {
    details.push({ field: 'password', message: 'Password must contain at least 8 characters.' });
  }
  if (normalized.readingPreference?.length > 50) {
    details.push({ field: 'readingPreference', message: 'Reading preference is too long.' });
  }
  if (!normalized.termsAccepted) {
    details.push({ field: 'termsAccepted', message: 'Terms must be accepted.' });
  }

  throwDetails(details);
  return normalized;
}

export function validateOrderPayload(payload = {}) {
  const buyer = payload.buyer ?? {};
  const shipping = payload.shipping ?? {};
  const payment = payload.payment ?? {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const normalized = {
    buyer: {
      name: text(buyer.name),
      document: text(buyer.document),
      email: text(buyer.email).toLowerCase(),
      phone: text(buyer.phone),
    },
    shipping: {
      address: text(shipping.address),
      district: text(shipping.district),
      city: text(shipping.city).toLowerCase(),
      reference: text(shipping.reference) || null,
      requestedDate: text(shipping.requestedDate),
      methodCode: text(shipping.methodCode).toLowerCase(),
    },
    payment: {
      brand: text(payment.brand).toLowerCase(),
      lastFour: text(payment.lastFour),
    },
    items: items.map((item) => ({
      productId: Number(item?.productId),
      quantity: Number(item?.quantity),
    })),
  };
  const details = [];

  if (!NAME_PATTERN.test(normalized.buyer.name) || normalized.buyer.name.length > 200) {
    details.push({ field: 'buyer.name', message: 'Enter a valid buyer name.' });
  }
  if (!DOCUMENT_PATTERN.test(normalized.buyer.document)) {
    details.push({ field: 'buyer.document', message: 'Document must contain 6 to 20 digits.' });
  }
  if (!EMAIL_PATTERN.test(normalized.buyer.email) || normalized.buyer.email.length > 254) {
    details.push({ field: 'buyer.email', message: 'Enter a valid email.' });
  }
  if (!PHONE_PATTERN.test(normalized.buyer.phone)) details.push({ field: 'buyer.phone', message: 'Phone must contain 7 to 15 digits.' });
  if (!normalized.shipping.address || normalized.shipping.address.length > 255) {
    details.push({ field: 'shipping.address', message: 'Address is required and must not exceed 255 characters.' });
  }
  if (!normalized.shipping.district || normalized.shipping.district.length > 100) {
    details.push({ field: 'shipping.district', message: 'District is required and must not exceed 100 characters.' });
  }
  if (normalized.shipping.reference?.length > 255) {
    details.push({ field: 'shipping.reference', message: 'Reference must not exceed 255 characters.' });
  }
  if (!CITIES.has(normalized.shipping.city)) details.push({ field: 'shipping.city', message: 'Select a valid city.' });
  if (!isIsoDate(normalized.shipping.requestedDate) || normalized.shipping.requestedDate <= todayIso()) {
    details.push({ field: 'shipping.requestedDate', message: 'Delivery date must be in the future.' });
  }
  if (!SHIPPING_CODES.has(normalized.shipping.methodCode)) details.push({ field: 'shipping.methodCode', message: 'Select a valid shipping method.' });
  if (!CARD_BRANDS.has(normalized.payment.brand)) details.push({ field: 'payment.brand', message: 'Select a valid card brand.' });
  if (!/^\d{4}$/.test(normalized.payment.lastFour)) details.push({ field: 'payment.lastFour', message: 'Provide the last four card digits.' });
  if (normalized.items.length === 0) details.push({ field: 'items', message: 'Add at least one product.' });

  const seenProductIds = new Set();
  normalized.items.forEach((item, index) => {
    if (!Number.isSafeInteger(item.productId) || item.productId <= 0) {
      details.push({ field: `items[${index}].productId`, message: 'Product id must be a positive integer.' });
    } else if (seenProductIds.has(item.productId)) {
      details.push({ field: `items[${index}].productId`, message: 'Products cannot be duplicated.' });
    }
    seenProductIds.add(item.productId);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      details.push({ field: `items[${index}].quantity`, message: 'Quantity must be between 1 and 10.' });
    }
  });

  throwDetails(details);
  return normalized;
}
