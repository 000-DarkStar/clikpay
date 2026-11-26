// Configuration de l'API Backend
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://api.clikpay.fr';
const SUPABASE_URL = 'https://uhqczdodkopatfrymzle.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4nc0EFm_eepqlb3lPyxZAA_7CCKWCP3';

// Fonctions utilitaires pour l'authentification
const Auth = {
  _syncPromise: null,

  // Sauvegarder le token
  setToken(token) {
    localStorage.setItem('clikpay_token', token);
  },

  // Récupérer le token
  getToken() {
    return localStorage.getItem('clikpay_token');
  },

  // Supprimer le token
  removeToken() {
    localStorage.removeItem('clikpay_token');
  },

  // Vérifier si l'utilisateur est connecté
  isLoggedIn() {
    return !!this.getToken();
  },

  // Sauvegarder les infos utilisateur
  setUser(user) {
    localStorage.setItem('clikpay_user', JSON.stringify(user));
  },

  // Récupérer les infos utilisateur
  getUser() {
    try { return JSON.parse(localStorage.getItem('clikpay_user') || 'null'); }
    catch (_) { return null; }
  },

  // Déconnexion
  async logout() {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
      } catch (_) {}
    }
    this.removeToken();
    localStorage.removeItem('clikpay_user');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.replace('/login.html');
  },

  async syncUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const verify = await apiRequest('/auth/verify');
      if (!verify.valid) throw new Error('Session invalide');
      const profile = await apiRequest('/api/user/profile');
      this.setUser(profile.user);
      return profile.user;
    } catch (_) {
      this.removeToken();
      localStorage.removeItem('clikpay_user');
      localStorage.removeItem('user');
      return null;
    }
  },

  // Initialiser l'authentification
  async init() {
    if (!this._syncPromise) {
      this._syncPromise = this.syncUser().finally(() => { this._syncPromise = null; });
    }
    return this._syncPromise;
  },

  // Headers pour les requêtes authentifiées
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }
};

// Fonction pour faire des requêtes à l'API
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers: { ...Auth.getHeaders(), ...(options.headers || {}) }
  });
  let data;
  try { data = await response.json(); } catch (_) { data = {}; }
  if (response.status === 401 || response.status === 403) {
    if (endpoint !== '/auth/verify') {
      Auth.removeToken();
      localStorage.removeItem('clikpay_user');
      localStorage.removeItem('user');
    }
  }
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue');
  return data;
}

// Vérifier si l'utilisateur est connecté sur les pages protégées
async function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.replace('/login.html');
    return false;
  }
  const user = await Auth.init();
  if (!user) {
    window.location.replace('/login.html');
    return false;
  }
  return true;
}

// Rediriger si déjà connecté (pour login/register)
async function redirectIfLoggedIn() {
  if (await Auth.init()) window.location.replace('/dashboard/dashboard.html');
}

async function handleAuthPageNavigation() {
  if (Auth.isLoggedIn()) await redirectIfLoggedIn();
}

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    if (document.querySelector('#main, .shell')) requireAuth();
    if (document.body?.classList.contains('auth-page') || /login|register/.test(location.pathname)) handleAuthPageNavigation();
  }
});
window.addEventListener('popstate', () => {
  if (document.querySelector('#main, .shell')) requireAuth();
  if (/login|register/.test(location.pathname)) handleAuthPageNavigation();
});

// Export des fonctions
window.Auth = Auth;
window.apiRequest = apiRequest;
window.requireAuth = requireAuth;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.API_URL = API_URL;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
