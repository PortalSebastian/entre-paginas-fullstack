import { AppError, validationError } from '../errors/app-error.js';
import { validateRegistrationPayload } from '../validators/payloads.js';

function validateLogin(payload = {}) {
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const details = [];
  if (!email) details.push({ field: 'email', message: 'Email is required.' });
  if (!password) details.push({ field: 'password', message: 'Password is required.' });
  if (details.length) throw validationError(details);
  return { email, password };
}

function cookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: config.refreshCookieMaxAge,
    path: '/api/v1/auth',
  };
}

export function createAuthController(service, config, csrf) {
  return {
    async register(request, response) {
      const user = await service.register(validateRegistrationPayload(request.body));
      response.status(201).json({ success: true, data: user });
    },
    async login(request, response) {
      const credentials = validateLogin(request.body);
      const session = await service.login(credentials.email, credentials.password);
      response.cookie(config.refreshCookieName, session.refreshToken, cookieOptions(config));
      // Cambia la identidad, luego cambia el secreto CSRF: un token emitido
      // antes de este login ya no vale.
      csrf.rotateSecret(response);
      response.json({ success: true, data: { user: session.user, accessToken: session.accessToken } });
    },
    async refresh(request, response) {
      const token = request.cookies[config.refreshCookieName];
      if (!token) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The session cannot be renewed.');
      const session = await service.refresh(token);
      response.cookie(config.refreshCookieName, session.refreshToken, cookieOptions(config));
      response.json({ success: true, data: { user: session.user, accessToken: session.accessToken } });
    },
    async logout(request, response) {
      await service.logout(request.cookies[config.refreshCookieName]);
      response.clearCookie(config.refreshCookieName, cookieOptions(config));
      csrf.clearSecret(response);
      response.status(204).end();
    },
    async me(request, response) {
      response.json({ success: true, data: service.publicUser(request.user) });
    },
  };
}
