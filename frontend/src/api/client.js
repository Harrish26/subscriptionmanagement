/**
 * SubscriptNova API Client
 * Configured with automatic token injection, error handling, and environment-aware baseURL.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  getToken() {
    return localStorage.getItem('subscriptnova_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('subscriptnova_token', token);
    } else {
      localStorage.removeItem('subscriptnova_token');
    }
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = this.getHeaders(options.headers);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorDetail = data?.detail || data?.error || data?.message || `HTTP Error ${response.status}`;
        const error = new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      // Re-throw normalized error
      throw err;
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  // --- Core Endpoints ---

  async getHealth() {
    return this.get('/health');
  }

  async login(email, password) {
    const res = await this.post('/auth/login', { email, password });
    if (res?.data?.access_token) {
      this.setToken(res.data.access_token);
    }
    return res;
  }

  async registerCustomer(payload) {
    return this.post('/auth/register', payload);
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  logout() {
    this.setToken(null);
  }
}

export const api = new ApiClient();
export default api;

