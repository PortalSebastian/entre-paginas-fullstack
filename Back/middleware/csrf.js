import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { AppError } from '../errors/app-error.js';

// Proteccion CSRF con el patron "double submit cookie firmado".
//
// El problema: el navegador adjunta las cookies de sesion a cualquier peticion
// hacia este dominio, tambien a las que origina una pagina de un tercero. La
// cookie prueba quien es el usuario, pero no prueba que el usuario haya querido
// la operacion.
//
// La solucion: exigir ademas un valor que solo puede conocer una pagina capaz
// de LEER la respuesta del servidor. La politica del mismo origen impide a un
// sitio atacante leer nuestras respuestas, asi que no puede obtener ese valor.
//
// Como funciona aqui:
//   1. el servidor da al navegador un secreto aleatorio en la cookie
//      `csrf_secret` (httpOnly: JavaScript no puede leerla);
//   2. `GET /api/v1/csrf` devuelve el token, que es HMAC(secreto_del_servidor,
//      secreto_del_navegador);
//   3. el frontend legitimo lee ese token y lo reenvia en la cabecera
//      `x-csrf-token` en cada mutacion;
//   4. el servidor recalcula el HMAC a partir de la cookie y lo compara.
//
// Por que el HMAC y no comparar la cookie consigo misma: en el double submit
// simple, cualquiera que pueda ESCRIBIR una cookie en el dominio (un subdominio
// comprometido, un proxy) puede fijar cookie y cabecera al mismo valor y pasar
// la comprobacion. Con el HMAC, un token valido solo puede haberlo emitido
// quien conoce `CSRF_SECRET`, que nunca sale del servidor.

const SECRET_COOKIE_NAME = 'csrf_secret';
const TOKEN_HEADER_NAME = 'x-csrf-token';
const SECRET_BYTES = 32;
const SECRET_HEX_LENGTH = SECRET_BYTES * 2;
const SECRET_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Los metodos seguros no cambian estado, asi que no necesitan token. Mantenerlos
// libres es lo que permite que la propia peticion que pide el token funcione.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createCsrfProtection({ csrfSecret, nodeEnv }) {
  function cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv === 'production',
      path: '/',
      maxAge: SECRET_MAX_AGE,
    };
  }

  function deriveToken(browserSecret) {
    return createHmac('sha256', csrfSecret).update(browserSecret).digest('hex');
  }

  function issueSecret(response) {
    const browserSecret = randomBytes(SECRET_BYTES).toString('hex');
    response.cookie(SECRET_COOKIE_NAME, browserSecret, cookieOptions());
    return browserSecret;
  }

  function readSecret(request) {
    const value = request.cookies?.[SECRET_COOKIE_NAME];
    return typeof value === 'string' && value.length === SECRET_HEX_LENGTH ? value : null;
  }

  function equals(provided, expected) {
    const left = Buffer.from(provided, 'utf8');
    const right = Buffer.from(expected, 'utf8');
    // timingSafeEqual exige la misma longitud, y comparar longitudes por
    // separado no filtra nada util: el token tiene tamano fijo conocido.
    return left.length === right.length && timingSafeEqual(left, right);
  }

  return {
    headerName: TOKEN_HEADER_NAME,
    secretCookieName: SECRET_COOKIE_NAME,

    // GET /api/v1/csrf - entrega el token al frontend legitimo.
    issueToken(request, response) {
      const browserSecret = readSecret(request) ?? issueSecret(response);
      response.json({ success: true, data: { csrfToken: deriveToken(browserSecret) } });
    },

    // Al iniciar sesion se renueva el secreto, de modo que un token obtenido
    // antes de autenticarse deja de servir. Es el mismo motivo por el que se
    // rota el identificador de sesion tras el login.
    rotateSecret(response) {
      issueSecret(response);
    },

    clearSecret(response) {
      response.clearCookie(SECRET_COOKIE_NAME, cookieOptions());
    },

    // Se monta sobre todo el router. Al ignorar por si mismo los metodos
    // seguros, cualquier mutacion que se anada en el futuro queda protegida sin
    // que nadie tenga que acordarse de listarla.
    protect() {
      return function csrfProtection(request, _response, next) {
        if (SAFE_METHODS.has(request.method)) return next();

        const browserSecret = readSecret(request);
        if (!browserSecret) {
          return next(new AppError(403, 'CSRF_TOKEN_MISSING', 'A valid CSRF token is required.'));
        }

        const provided = request.get(TOKEN_HEADER_NAME);
        if (!provided) {
          return next(new AppError(403, 'CSRF_TOKEN_MISSING', 'A valid CSRF token is required.'));
        }

        if (!equals(provided, deriveToken(browserSecret))) {
          return next(new AppError(403, 'CSRF_TOKEN_INVALID', 'A valid CSRF token is required.'));
        }

        return next();
      };
    },
  };
}
