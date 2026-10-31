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

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }

  // --- Auth & Diagnostics ---

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

  async getUsers(role = null) {
    const query = role ? `?role=${role}` : '';
    return this.get(`/users/${query}`);
  }

  logout() {
    this.setToken(null);
  }

  // --- Products & Multi-Attribute Variants ---

  async getProducts(activeOnly = true) {
    return this.get(`/products/?active_only=${activeOnly}`);
  }

  async createProduct(payload) {
    return this.post('/products/', payload);
  }

  async updateProduct(id, payload) {
    return this.put(`/products/${id}`, payload);
  }

  async deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  async addVariant(productId, payload) {
    return this.post(`/products/${productId}/variants`, payload);
  }

  async deleteVariant(variantId) {
    return this.delete(`/products/variants/${variantId}`);
  }

  // --- Subscription Plans ---

  async getPlans(activeOnly = true) {
    return this.get(`/plans/?active_only=${activeOnly}`);
  }

  async createPlan(payload) {
    return this.post('/plans/', payload);
  }

  async updatePlan(id, payload) {
    return this.put(`/plans/${id}`, payload);
  }

  async deletePlan(id) {
    return this.delete(`/plans/${id}`);
  }

  // --- Quotation Templates & Quotations ---

  async getQuotationTemplates() {
    return this.get('/quotations/templates');
  }

  async createQuotationTemplate(payload) {
    return this.post('/quotations/templates', payload);
  }

  async deleteQuotationTemplate(id) {
    return this.delete(`/quotations/templates/${id}`);
  }

  async getQuotations() {
    return this.get('/quotations/');
  }

  async createQuotation(payload) {
    return this.post('/quotations/', payload);
  }

  async createQuotationFromTemplate(payload) {
    return this.post('/quotations/from-template', payload);
  }

  async updateQuotationStatus(id, status) {
    return this.put(`/quotations/${id}`, { status });
  }

  // --- Subscriptions (Phase 3) ---

  async getSubscriptions() {
    return this.get('/subscriptions/');
  }

  async createSubscriptionFromQuotation(payload) {
    return this.post('/subscriptions/from-quotation', payload);
  }

  async createSubscription(payload) {
    return this.post('/subscriptions/', payload);
  }

  async transitionSubscription(id, action, notes = '') {
    return this.post(`/subscriptions/${id}/transition`, { action, notes });
  }

  // --- Invoices (Phase 3) ---

  async getInvoices(subscriptionId = null) {
    const query = subscriptionId ? `?subscription_id=${subscriptionId}` : '';
    return this.get(`/invoices/${query}`);
  }

  async getInvoice(id) {
    return this.get(`/invoices/${id}`);
  }

  async updateInvoiceStatus(id, status) {
    return this.put(`/invoices/${id}/status`, { status });
  }

  // --- Billing Simulator (Phase 3) ---

  async getSimulatorStatus() {
    return this.get('/simulator/status');
  }

  async advanceTime(days) {
    return this.post('/simulator/advance', { days });
  }

  async resetSimulator() {
    return this.post('/simulator/reset', {});
  }

  // --- Taxes (Phase 4) ---

  async getTaxes(activeOnly = false) {
    return this.get(`/taxes/?active_only=${activeOnly}`);
  }

  async createTax(payload) {
    return this.post('/taxes/', payload);
  }

  async updateTax(id, payload) {
    return this.put(`/taxes/${id}`, payload);
  }

  async deleteTax(id) {
    return this.delete(`/taxes/${id}`);
  }

  // --- Discounts (Phase 4) ---

  async getDiscounts(activeOnly = false) {
    return this.get(`/discounts/?active_only=${activeOnly}`);
  }

  async createDiscount(payload) {
    return this.post('/discounts/', payload);
  }

  async validateDiscount(payload) {
    return this.post('/discounts/validate', payload);
  }

  async updateDiscount(id, payload) {
    return this.put(`/discounts/${id}`, payload);
  }

  async deleteDiscount(id) {
    return this.delete(`/discounts/${id}`);
  }

  // --- Payments & Reminders (Phase 4) ---

  async getPayments(invoiceId = null) {
    const query = invoiceId ? `?invoice_id=${invoiceId}` : '';
    return this.get(`/payments/${query}`);
  }

  async recordPayment(payload) {
    return this.post('/payments/', payload);
  }

  async getPayment(id) {
    return this.get(`/payments/${id}`);
  }

  async sendPaymentReminder(payload) {
    return this.post('/payments/reminders', payload);
  }

  async getPaymentReminders(invoiceId = null) {
    const query = invoiceId ? `?invoice_id=${invoiceId}` : '';
    return this.get(`/payments/reminders/list${query}`);
  }

  // --- Finance Dashboard (Phase 4) ---

  async getFinanceDashboard() {
    return this.get('/finance/dashboard');
  }

  async scanOverdueInvoices() {
    return this.post('/finance/scan-overdue', {});
  }
}

export const api = new ApiClient();
export default api;
