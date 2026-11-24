// Configuration de l'API Backend
const API_URL = 'https://clikpay-backend.onrender.com';

// Fonctions utilitaires pour l'authentification
const Auth = {
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
    const user = localStorage.getItem('clikpay_user');
    return user ? JSON.parse(user) : null;
  },

  // Déconnexion
  logout() {
    this.removeToken();
    localStorage.removeItem('clikpay_user');
    window.location.href = '/login.html';
  },

  // Headers pour les requêtes authentifiées
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
};

// Fonction pour faire des requêtes à l'API
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: Auth.getHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Une erreur est survenue');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Vérifier si l'utilisateur est connecté sur les pages protégées
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login.html';
  }
}

// Rediriger si déjà connecté (pour login/register)
function redirectIfLoggedIn() {
  if (Auth.isLoggedIn()) {
    window.location.href = '/dashboard';
  }
}

// Export des fonctions
window.Auth = Auth;
window.apiRequest = apiRequest;
window.requireAuth = requireAuth;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.API_URL = API_URL;
