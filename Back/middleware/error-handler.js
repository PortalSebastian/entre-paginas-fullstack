import { AppError } from '../errors/app-error.js';

export function notFoundHandler(request, _response, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${request.method} ${request.path} was not found.`));
}

export function errorHandler(error, _request, response, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const expose = status < 500;
  response.status(status).json({
    success: false,
    error: {
      code: expose ? (error.code ?? 'REQUEST_ERROR') : 'INTERNAL_SERVER_ERROR',
      message: expose ? error.message : 'An unexpected error occurred.',
      details: expose && Array.isArray(error.details) ? error.details : [],
    },
  });
}
