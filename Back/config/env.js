function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function port(environment, name, fallback) {
  const value = Number(environment[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return value;
}

function secret(environment, name) {
  const value = required(environment, name);
  if (value.length < 32) throw new Error(`${name} must contain at least 32 characters.`);
  return value;
}

export function assertTestDatabaseName(databaseName) {
  if (!databaseName.endsWith('_test')) {
    throw new Error('Integration test database name must end in _test.');
  }
}

export function loadConfig(environment = process.env) {
  const frontendOrigin = environment.FRONTEND_ORIGIN?.trim() || 'http://localhost:5173';
  try {
    new URL(frontendOrigin);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid URL.');
  }
  const accessSecret = secret(environment, 'JWT_ACCESS_SECRET');
  const refreshSecret = secret(environment, 'JWT_REFRESH_SECRET');
  const csrfSecret = secret(environment, 'CSRF_SECRET');
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  }
  // Cada secreto protege un mecanismo distinto: reutilizar uno haria que
  // comprometer un token comprometiese tambien la proteccion CSRF.
  if (csrfSecret === accessSecret || csrfSecret === refreshSecret) {
    throw new Error('CSRF_SECRET must differ from the JWT secrets.');
  }

  return {
    nodeEnv: environment.NODE_ENV?.trim() || 'development',
    port: port(environment, 'PORT', 3000),
    frontendOrigin,
    accessSecret,
    refreshSecret,
    csrfSecret,
    refreshCookieName: environment.REFRESH_COOKIE_NAME?.trim() || 'refresh_token',
    refreshCookieMaxAge: 7 * 24 * 60 * 60 * 1000,
    database: {
      host: environment.DB_HOST?.trim() || '127.0.0.1',
      port: port(environment, 'DB_PORT', 3306),
      name: required(environment, 'DB_NAME'),
      user: required(environment, 'DB_USER'),
      password: environment.DB_PASSWORD ?? '',
      logging: environment.DB_LOGGING === 'true',
    },
  };
}
