import { AppError } from '../errors/app-error.js';
import { verifyAccessToken } from '../security/token-service.js';

function bearerToken(request) {
  const authorization = request.get('authorization');
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required.');
  }
  return token;
}

export function createAuthenticationMiddleware({ User, accessSecret }) {
  function authenticate({ optional = false } = {}) {
    return async function authenticationMiddleware(request, _response, next) {
      try {
        const token = bearerToken(request);
        if (!token && optional) {
          request.user = null;
          return next();
        }
        if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');

        let payload;
        try {
          payload = verifyAccessToken(token, { secret: accessSecret });
        } catch {
          throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required.');
        }
        const user = await User.findByPk(payload.sub);
        if (!user?.isActive) {
          throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required.');
        }
        request.user = user;
        return next();
      } catch (error) {
        return next(error);
      }
    };
  }

  function requireAdmin(request, _response, next) {
    if (request.user?.role !== 'ADMIN') {
      return next(new AppError(403, 'ADMIN_REQUIRED', 'Administrator permissions are required.'));
    }
    return next();
  }

  return { authenticate, requireAdmin };
}
