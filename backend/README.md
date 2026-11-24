# ClikPay Backend

Backend Node.js/Express pour ClikPay avec authentification Google OAuth, Cloudflare Turnstile, et intégration Supabase.

## 🚀 Fonctionnalités

- ✅ Authentification classique (email/mot de passe)
- ✅ Authentification Google OAuth 2.0
- ✅ Protection Cloudflare Turnstile sur login/register
- ✅ Tokens JWT pour l'authentification
- ✅ Intégration complète avec Supabase
- ✅ Rate limiting
- ✅ Sécurité avec Helmet
- ✅ Validation des données
- ✅ Gestion du profil utilisateur

## 📋 Prérequis

- Node.js 18+ 
- npm ou yarn
- Compte Supabase
- Clés Google OAuth configurées
- Clés Cloudflare Turnstile

## 🛠️ Installation

1. **Installer les dépendances :**
```bash
cd backend
npm install
```

2. **Configurer les variables d'environnement :**

Remplissez le fichier `.env` avec vos clés :
- `SUPABASE_ANON_KEY` : Obtenez-la depuis votre projet Supabase > Settings > API
- `JWT_SECRET` : Générez une clé aléatoire sécurisée (min 32 caractères)
- `SESSION_SECRET` : Générez une clé aléatoire sécurisée (min 32 caractères)

3. **Créer la base de données Supabase :**

Allez dans votre projet Supabase > SQL Editor et exécutez le script :
```bash
database/schema.sql
```

4. **Configurer Google OAuth Redirect URI :**

Dans Google Cloud Console, ajoutez l'URI de redirection :
```
http://localhost:3001/auth/google/callback
```

Pour la production, ajoutez également :
```
https://votre-domaine.com/auth/google/callback
```

## 🚀 Lancement

**Mode développement (avec nodemon) :**
```bash
npm run dev
```

**Mode production :**
```bash
npm start
```

Le serveur démarre sur `http://localhost:3001`

## 📡 Endpoints API

### Authentification

#### `POST /auth/register`
Inscription avec email/mot de passe

**Body :**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "turnstileToken": "token_from_cloudflare"
}
```

**Réponse :**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": null,
    "emailVerified": false
  }
}
```

#### `POST /auth/login`
Connexion avec email/mot de passe

**Body :**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "turnstileToken": "token_from_cloudflare"
}
```

#### `GET /auth/google`
Redirection vers Google OAuth

#### `GET /auth/google/callback`
Callback Google OAuth (ne pas appeler directement)

#### `GET /auth/verify`
Vérifier la validité d'un token JWT

**Headers :**
```
Authorization: Bearer <token>
```

#### `POST /auth/logout`
Déconnexion

### Utilisateur

#### `GET /user/profile`
Obtenir le profil de l'utilisateur connecté

**Headers :**
```
Authorization: Bearer <token>
```

#### `PUT /user/profile`
Mettre à jour le profil

**Headers :**
```
Authorization: Bearer <token>
```

**Body :**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

#### `DELETE /user/account`
Supprimer le compte utilisateur

**Headers :**
```
Authorization: Bearer <token>
```

### Health Check

#### `GET /health`
Vérifier l'état du serveur

## 🔒 Sécurité

- **Helmet** : Protection contre les vulnérabilités web courantes
- **Rate Limiting** : 100 requêtes par 15 minutes par IP
- **CORS** : Configuré pour accepter uniquement le frontend
- **JWT** : Tokens signés avec expiration
- **Bcrypt** : Hash sécurisé des mots de passe (12 rounds)
- **Cloudflare Turnstile** : Protection contre les bots
- **Validation** : express-validator sur toutes les entrées

## 📁 Structure du Projet

```
backend/
├── config/
│   ├── passport.js         # Configuration Passport Google OAuth
│   └── supabase.js          # Client Supabase
├── database/
│   └── schema.sql           # Schéma de la base de données
├── middleware/
│   ├── auth.js              # Middleware d'authentification JWT
│   └── turnstile.js         # Middleware Cloudflare Turnstile
├── routes/
│   ├── auth.js              # Routes d'authentification
│   └── user.js              # Routes utilisateur
├── .env                     # Variables d'environnement
├── package.json
├── README.md
└── server.js                # Point d'entrée de l'application
```

## 🔄 Flux d'Authentification

### Authentification classique
1. L'utilisateur soumet email/password + turnstileToken
2. Le backend vérifie le token Turnstile
3. Le backend hash le mot de passe et crée l'utilisateur dans Supabase
4. Le backend génère un JWT et le retourne

### Authentification Google OAuth
1. L'utilisateur clique sur "Se connecter avec Google"
2. Redirection vers `/auth/google`
3. Google authentifie l'utilisateur
4. Callback vers `/auth/google/callback`
5. Le backend crée/met à jour l'utilisateur dans Supabase
6. Redirection vers le frontend avec le JWT dans l'URL

## 🌐 Intégration Frontend

Le frontend doit :

1. **Inclure Cloudflare Turnstile** sur les pages login/register
2. **Capturer le token Turnstile** et l'envoyer avec les requêtes
3. **Gérer le callback OAuth** à `/auth/callback?token=...`
4. **Stocker le JWT** (localStorage ou cookie sécurisé)
5. **Envoyer le JWT** dans les headers : `Authorization: Bearer <token>`

Exemple React :
```javascript
// Envoyer le token dans les requêtes
const response = await fetch('http://localhost:3001/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🐛 Dépannage

### Erreur "Missing Supabase environment variables"
- Vérifiez que `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont dans `.env`
- Obtenez la clé anonyme depuis Supabase > Settings > API

### Erreur "Invalid or expired token"
- Le JWT a expiré (7 jours par défaut)
- L'utilisateur doit se reconnecter

### Erreur "Turnstile verification failed"
- Le token Turnstile est invalide ou expiré
- Vérifiez que la clé secrète est correcte dans `.env`
- Les tokens Turnstile ne sont valables qu'une fois

### Erreur Google OAuth
- Vérifiez que l'URI de redirection est configurée dans Google Cloud Console
- Vérifiez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env`

## 📝 TODO / Améliorations Futures

- [ ] Vérification d'email
- [ ] Réinitialisation de mot de passe
- [ ] Refresh tokens
- [ ] Rate limiting plus granulaire par utilisateur
- [ ] Logs structurés
- [ ] Tests unitaires et d'intégration
- [ ] Documentation API avec Swagger
- [ ] Support multi-langue
- [ ] Authentification 2FA

## 📄 Licence

MIT
