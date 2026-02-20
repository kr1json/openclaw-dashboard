var API_BASE = window.location.pathname.replace(/\/+$/, '');
var TOKEN_KEY = 'dashboardToken';
var TOKEN_EXPIRY_KEY = 'dashboardTokenExpiry';
var TOKEN_LIFETIME = 24 * 60 * 60 * 1000;
var REMEMBER_ME_LIFETIME = 7 * 24 * 60 * 60 * 1000;
window.API_BASE = API_BASE;

window.getStoredToken = function getStoredToken() {
  let token = sessionStorage.getItem(TOKEN_KEY);
  let expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) {
    token = localStorage.getItem(TOKEN_KEY);
    expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  }

  if (token && expiry) {
    if (Date.now() < parseInt(expiry)) {
      return token;
    }
    clearStoredToken();
  }
  return null;
};

window.setStoredToken = function setStoredToken(token, rememberMe = false) {
  if (rememberMe) {
    const expiry = Date.now() + REMEMBER_ME_LIFETIME;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + TOKEN_LIFETIME).toString());
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
};

window.clearStoredToken = function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
};

window.authFetch = function authFetch(url, options = {}) {
  const token = getStoredToken();
  if (!token) {
    showLogin();
    throw new Error('Not authenticated');
  }

  options.headers = options.headers || {};
  options.headers['Authorization'] = `Bearer ${token}`;
  if (typeof options.cache === 'undefined') {
    options.cache = 'no-store';
  }

  return fetch(url, options).then(res => {
    if (res.status === 401) {
      clearStoredToken();
      showLogin();
      throw new Error('Session expired');
    }
    return res;
  });
};
