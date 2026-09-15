const API_BASE = '/api';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)bdd\.csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  // Envia o token CSRF para todas as mutações (double-submit cookie)
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // envia cookies HttpOnly (bdd.auth) automaticamente
  });

  if (resp.status === 401) {
    // Sessão expirada: limpa estado local e vai pro login
    localStorage.removeItem('bdd.user');
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Não autenticado');
  }

  const contentType = resp.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await resp.json() : await resp.text();

  if (!resp.ok) {
    const message = (body && body.error) || `Erro ${resp.status}`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body || {}) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default api;