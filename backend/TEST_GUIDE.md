# Guide de Test - ClikPay Backend API

Ce guide vous montre comment tester toutes les fonctionnalités du backend.

## 🛠️ Outils de Test

### Option 1 : Postman (Recommandé)
1. Téléchargez [Postman](https://www.postman.com/downloads/)
2. Importez la collection ci-dessous

### Option 2 : Thunder Client (VS Code)
1. Installez l'extension "Thunder Client" dans VS Code
2. Utilisez les exemples ci-dessous

### Option 3 : cURL (Terminal)
Utilisez les commandes cURL ci-dessous

---

## 📝 Tests Pas à Pas

### 1. Vérifier que le serveur fonctionne

**URL:** `http://localhost:3001/health`

**cURL:**
```bash
curl http://localhost:3001/health
```

**Réponse attendue:**
```json
{
  "status": "ok",
  "message": "ClikPay Backend API is running",
  "timestamp": "2026-11-24T..."
}
```

---

### 2. Créer un compte (Register)

⚠️ **Important:** Vous devez d'abord obtenir un token Turnstile depuis votre frontend. Pour les tests, vous pouvez temporairement désactiver Turnstile (voir section "Tests sans Turnstile" en bas).

**URL:** `POST http://localhost:3001/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "motdepasse123",
  "firstName": "Jean",
  "lastName": "Dupont",
  "turnstileToken": "FAKE_TOKEN_FOR_TESTING"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"motdepasse123\",\"firstName\":\"Jean\",\"lastName\":\"Dupont\",\"turnstileToken\":\"FAKE_TOKEN\"}"
```

**Réponse attendue:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "avatarUrl": null,
    "emailVerified": false
  }
}
```

**📌 Copiez le `token` - vous en aurez besoin pour les tests suivants !**

---

### 3. Se connecter (Login)

**URL:** `POST http://localhost:3001/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "motdepasse123",
  "turnstileToken": "FAKE_TOKEN_FOR_TESTING"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"motdepasse123\",\"turnstileToken\":\"FAKE_TOKEN\"}"
```

---

### 4. Vérifier un token JWT

**URL:** `GET http://localhost:3001/auth/verify`

**Headers:**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**cURL:**
```bash
curl http://localhost:3001/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Réponse attendue:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}
```

---

### 5. Obtenir le profil utilisateur

**URL:** `GET http://localhost:3001/user/profile`

**Headers:**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**cURL:**
```bash
curl http://localhost:3001/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Réponse attendue:**
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "avatarUrl": null,
    "emailVerified": false,
    "createdAt": "2026-11-24T...",
    "lastLogin": "2026-11-24T..."
  }
}
```

---

### 6. Mettre à jour le profil

**URL:** `PUT http://localhost:3001/user/profile`

**Headers:**
```
Authorization: Bearer VOTRE_TOKEN_ICI
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "firstName": "Jean-Claude",
  "lastName": "Van Damme"
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3001/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Jean-Claude\",\"lastName\":\"Van Damme\"}"
```

---

### 7. Tester Google OAuth

**Dans votre navigateur:**
```
http://localhost:3001/auth/google
```

Vous serez redirigé vers Google pour vous connecter, puis de retour vers votre frontend avec un token.

---

## 🧪 Tests sans Turnstile (Pour le développement)

Pour tester sans avoir à gérer Turnstile à chaque fois, créez une route de test :

**Créer le fichier:** `backend/routes/auth-dev.js`

```javascript
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Route de test sans Turnstile
router.post('/register-dev', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        email_verified: false,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered (DEV MODE)',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login-dev', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful (DEV MODE)',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Puis ajoutez dans server.js:**
```javascript
// Après les autres imports
import authDevRoutes from './routes/auth-dev.js';

// Après les autres routes (seulement en développement)
if (process.env.NODE_ENV === 'development') {
  app.use('/auth-dev', authDevRoutes);
  console.log('⚠️  DEV routes enabled at /auth-dev');
}
```

**Utilisez maintenant:**
- `POST http://localhost:3001/auth-dev/register-dev` (sans turnstileToken)
- `POST http://localhost:3001/auth-dev/login-dev` (sans turnstileToken)

---

## 📦 Collection Postman

Importez ce JSON dans Postman :

```json
{
  "info": {
    "name": "ClikPay Backend API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Register (DEV)",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth-dev/register-dev",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"motdepasse123\",\n  \"firstName\": \"Jean\",\n  \"lastName\": \"Dupont\"\n}"
        }
      }
    },
    {
      "name": "Login (DEV)",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth-dev/login-dev",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"motdepasse123\"\n}"
        }
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/user/profile",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}]
      }
    }
  ]
}
```

---

## 🎯 Scénario de Test Complet

1. **Health check** → Serveur OK ✅
2. **Register** → Créer compte + récupérer token 🎫
3. **Verify** → Vérifier que le token est valide ✅
4. **Profile** → Voir les infos utilisateur 👤
5. **Update Profile** → Changer le nom ✏️
6. **Profile** → Vérifier les changements ✅
7. **Logout** → Se déconnecter 👋

---

## 🔍 Vérifier dans Supabase

1. Allez dans votre dashboard Supabase
2. Table Editor > users
3. Vous devriez voir votre utilisateur créé avec tous les champs

---

## ❌ Erreurs Courantes

### "Invalid or expired token"
→ Le token JWT a expiré ou est invalide. Reconnectez-vous.

### "Turnstile verification failed"
→ Utilisez les routes `/auth-dev/*` pour tester sans Turnstile.

### "Email already registered"
→ Cet email existe déjà. Utilisez un autre ou supprimez-le de Supabase.

### "Missing Supabase environment variables"
→ Vérifiez votre fichier `.env`.
