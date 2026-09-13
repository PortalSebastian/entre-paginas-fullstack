const DEFAULT_API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
    constructor(status, payload = {}) {
        super(payload.message || 'No se pudo completar la solicitud.');
        this.name = 'ApiError';
        this.status = status;
        this.code = payload.code || 'API_ERROR';
        this.details = Array.isArray(payload.details) ? payload.details : [];
    }
}

// Metodos que no cambian estado y por tanto no llevan token CSRF.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';
const CSRF_ERROR_CODES = new Set(['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID']);

export function createApiClient({ baseUrl = DEFAULT_API_URL, fetchImpl = fetch } = {}) {
    let accessToken = null;
    let sessionListener = null;
    let refreshPromise = null;
    let csrfToken = null;
    let csrfPromise = null;
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

    async function readResponse(response) {
        if (response.status === 204) return null;
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new ApiError(response.status, payload.error);
        return payload.data;
    }

    async function refreshSession() {
        if (!refreshPromise) {
            refreshPromise = fetchImpl(`${normalizedBaseUrl}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { Accept: 'application/json' }
            })
                .then(readResponse)
                .then((session) => {
                    accessToken = session.accessToken;
                    sessionListener?.(session);
                    return session;
                })
                .finally(() => {
                    refreshPromise = null;
                });
        }
        return refreshPromise;
    }

    // El token CSRF se pide una vez y se reutiliza. El servidor lo deriva de
    // una cookie httpOnly que este codigo no puede leer: eso es justo lo que
    // impide que una pagina de otro origen lo obtenga.
    async function fetchCsrfToken() {
        if (!csrfPromise) {
            csrfPromise = fetchImpl(`${normalizedBaseUrl}/csrf`, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' }
            })
                .then(readResponse)
                .then((data) => {
                    csrfToken = data.csrfToken;
                    return csrfToken;
                })
                .finally(() => {
                    csrfPromise = null;
                });
        }
        return csrfPromise;
    }

    async function request(path, options = {}, allowRefresh = true, allowCsrfRetry = true) {
        const headers = {
            Accept: 'application/json',
            ...(options.headers || {})
        };
        let body = options.body;
        if (body !== undefined && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const method = (options.method || 'GET').toUpperCase();
        if (!SAFE_METHODS.has(method)) {
            headers[CSRF_HEADER] = csrfToken ?? (await fetchCsrfToken());
        }

        const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
            ...options,
            body,
            headers,
            credentials: 'include'
        });

        // El servidor rota el secreto CSRF al iniciar sesion, asi que un token
        // cacheado puede quedar obsoleto. Se pide uno nuevo y se reintenta una
        // sola vez.
        if (response.status === 403 && allowCsrfRetry && !SAFE_METHODS.has(method)) {
            const payload = await response.clone().json().catch(() => ({}));
            if (CSRF_ERROR_CODES.has(payload.error?.code)) {
                csrfToken = null;
                await fetchCsrfToken();
                return request(path, options, allowRefresh, false);
            }
        }

        if (response.status === 401 && allowRefresh && !path.startsWith('/auth/')) {
            try {
                await refreshSession();
                return request(path, options, false, allowCsrfRetry);
            } catch {
                accessToken = null;
                sessionListener?.(null);
            }
        }
        return readResponse(response);
    }

    return {
        request,
        refreshSession,
        setAccessToken(token) {
            accessToken = token || null;
        },
        clearAccessToken() {
            accessToken = null;
            csrfToken = null;
        },
        fetchCsrfToken,
        setSessionListener(listener) {
            sessionListener = listener;
        }
    };
}

export const api = createApiClient();
