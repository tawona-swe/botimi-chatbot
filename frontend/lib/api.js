const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * API client for botimi backend.
 * Manages JWT token storage and all API calls.
 */
class ApiClient {
  constructor() {
    this.token = null;

    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("botimi_token");
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("botimi_token", token);
      } else {
        localStorage.removeItem("botimi_token");
      }
    }
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.token;
  }

  async request(method, path, body = null, isFormData = false) {
    const url = `${API_BASE}${path}`;
    const headers = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const options = { method, headers };

    if (body && method !== "GET") {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        const err = new Error(data.error || `Request failed: ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      if (err.status === 401 && typeof window !== "undefined") {
        // Token expired — clear it
        this.setToken(null);
      }
      throw err;
    }
  }

  // Auth
  signup(email, password, companyName, name, industry) {
    return this.request("POST", "/auth/signup", { email, password, companyName, name, industry });
  }

  login(email, password) {
    return this.request("POST", "/auth/login", { email, password });
  }

  logout() {
    return this.request("POST", "/auth/logout");
  }

  googleSignIn(idToken) {
    return this.request("POST", "/auth/google", { idToken });
  }

  getMe() {
    return this.request("GET", "/auth/me");
  }

  // Bots
  getBots() {
    return this.request("GET", "/bots");
  }

  getBot(id) {
    return this.request("GET", `/bots/${id}`);
  }

  deleteBot(id) {
    return this.request("DELETE", `/bots/${id}`);
  }

  updateBot(id, data) {
    return this.request("PATCH", `/bots/${id}`, data);
  }

  crawlBot(id, url) {
    return this.request("POST", `/bots/${id}/crawl`, { url });
  }

  getBotSources(id) {
    return this.request("GET", `/bots/${id}/sources`);
  }

  getBotTraining(id) {
    return this.request("GET", `/bots/${id}/training`);
  }

  uploadBotDocument(id, file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("POST", `/bots/${id}/upload`, formData, true);
  }

  recrawlSource(id, sourceId) {
    return this.request("POST", `/bots/${id}/recrawl/${sourceId}`);
  }

  deleteSource(botId, sourceId) {
    return this.request("DELETE", `/bots/${botId}/sources/${sourceId}`);
  }

  testBot(id, question) {
    return this.request("POST", `/bots/${id}/test`, { question });
  }

  getBotEmbed(id) {
    return this.request("GET", `/bots/${id}/embed`);
  }

  createBot(name, websiteUrl) {
    return this.request("POST", "/bots", { name, websiteUrl });
  }

  verifyBotInstall(id, websiteUrl) {
    return this.request("POST", `/bots/${id}/verify-install`, { websiteUrl });
  }

  // Chat (public widget)
  sendMessage(apiKey, message, conversationId, visitorId, visitorName) {
    return this.request("POST", "/chat/message", { apiKey, message, conversationId, visitorId, visitorName });
  }

  escalateChat(conversationId, name, email, description) {
    return this.request("POST", "/chat/escalate", { conversationId, name, email, description });
  }

  // Conversations
  getConversations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", `/conversations${qs ? "?" + qs : ""}`);
  }

  getConversation(id) {
    return this.request("GET", `/conversations/${id}`);
  }

  updateConversation(id, data) {
    return this.request("PATCH", `/conversations/${id}`, data);
  }

  // Analytics
  getAnalytics() {
    return this.request("GET", "/analytics/overview");
  }

  getTicketAnalytics() {
    return this.request("GET", "/analytics/tickets");
  }

  // Tickets
  getTickets(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", `/tickets${qs ? "?" + qs : ""}`);
  }

  getTicket(id) {
    return this.request("GET", `/tickets/${id}`);
  }

  updateTicket(id, data) {
    return this.request("PATCH", `/tickets/${id}`, data);
  }

  replyToTicket(id, body, isInternalNote = false) {
    return this.request("POST", `/tickets/${id}/reply`, { body, isInternalNote });
  }

  assignTicket(id, agentName) {
    return this.request("POST", `/tickets/${id}/assign`, { agentName });
  }

  // Vendor
  getProfile() {
    return this.request("GET", "/vendor/profile");
  }

  updateProfile(data) {
    return this.request("PATCH", "/vendor/profile", data);
  }

  createCheckout(planId, ticketAddon) {
    return this.request("POST", "/vendor/checkout", { planId, ticketAddon });
  }

  getBillingPortal() {
    return this.request("POST", "/vendor/billing-portal");
  }

  // Super Admin
  getAdminOverview() {
    return this.request("GET", "/admin/overview");
  }

  getAdminVendors(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", `/admin/vendors${qs ? "?" + qs : ""}`);
  }

  updateAdminVendor(id, data) {
    return this.request("PATCH", `/admin/vendors/${id}`, data);
  }

  getAdminFlaggedMessages(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", `/admin/flagged-messages${qs ? "?" + qs : ""}`);
  }

  dismissAdminFlag(id) {
    return this.request("PATCH", `/admin/flagged-messages/${id}`);
  }

  impersonateVendor(vendorId) {
    return this.request("GET", `/admin/impersonate/${vendorId}`);
  }
}

// Singleton
const api = new ApiClient();

export default api;
export { ApiClient };
