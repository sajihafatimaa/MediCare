(function () {
  const BASE_URL = (window.MEDICARE_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
  const TOKEN_KEY = "medicare_api_token";

  class ApiError extends Error {
    constructor(message, status, payload) { super(message); this.status = status; this.payload = payload; }
  }

  // Backend errors look like {success:false, message, errors:{field:[msg]}} (admin API)
  // or {error:"..."} / {field:[msg]} (login API). Turn them into readable text.
  function errorText(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    const lines = [];
    const walk = (value, label) => {
      if (value === null || value === undefined) return;
      if (typeof value === "string") { lines.push(label && !["non_field_errors", "detail", "error", "message"].includes(label) ? `${label.replace(/_/g, " ")}: ${value}` : value); return; }
      if (Array.isArray(value)) { value.forEach(v => walk(v, label)); return; }
      if (typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, k));
    };
    if (payload.errors) walk(payload.errors);
    if (!lines.length) walk(payload.detail || payload.error || payload.message);
    if (!lines.length && typeof payload === "object") Object.entries(payload).forEach(([k, v]) => { if (!["success", "message"].includes(k)) walk(v, k); });
    return lines.join(" ");
  }

  async function request(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !options.skipAuth) headers.Authorization = `Token ${token}`;
    let response;
    try {
      response = await fetch(`${BASE_URL}${path}`, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    } catch (_) {
      throw new ApiError(`Could not reach the hospital server at ${BASE_URL}. Check that Django is running and the frontend origin is allowed by CORS.`);
    }
    let payload;
    try { payload = await response.json(); } catch (_) { payload = null; }
    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && !options.skipAuth) {
        localStorage.removeItem(TOKEN_KEY);
        if (!/\/pages\//.test(location.pathname)) {
          const loginPage = /\/doctor\//.test(location.pathname)
            ? "../pages/doctor-login.html"
            : /\/portal\//.test(location.pathname) ? "../pages/login.html" : "pages/login.html";
          location.href = `${loginPage}?expired=1`;
        }
      }
      throw new ApiError(errorText(payload) || `Request failed (${response.status} ${response.statusText}).`, response.status, payload);
    }
    return payload;
  }

  window.MediCareAPI = {
    baseUrl: BASE_URL,
    tokenKey: TOKEN_KEY,
    request,
    async login(username, password) {
      const result = await request("/auth/login/", { method: "POST", body: { username, password }, skipAuth: true });
      if (!result || !result.token) throw new ApiError("Login succeeded but the server did not return a token.");
      localStorage.setItem(TOKEN_KEY, result.token);
      return result;
    },
    async logout() {
      try { await request("/auth/logout/", { method: "POST" }); }
      finally { localStorage.removeItem(TOKEN_KEY); }
    },
    async currentUser() { return request("/auth/me/"); },
    get(path) { return request(path); },
    post(path, body) { return request(path, { method: "POST", body: body === undefined ? {} : body }); },
    patch(path, body) { return request(path, { method: "PATCH", body }); },
    remove(path) { return request(path, { method: "DELETE" }); },
    isLoggedIn() { return !!localStorage.getItem(TOKEN_KEY); },
    records(result) {
      const data = result && result.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      if (data && typeof data === "object") return [data];
      return [];
    },
    ApiError
  };
}());
