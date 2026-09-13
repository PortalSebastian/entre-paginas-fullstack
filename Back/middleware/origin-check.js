import { AppError } from '../errors/app-error.js';

export function requireTrustedOrigin(frontendOrigin) {
  return function trustedOrigin(request, _response, next) {
    const origin = request.get('origin');
    if (origin && origin !== frontendOrigin) {
      return next(new AppError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.'));
    }
    return next();
  };
}
