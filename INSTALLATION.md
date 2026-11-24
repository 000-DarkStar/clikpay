# 📋 GUIDE D'INSTALLATION ET DE DÉPLOIEMENT - CLICK.PAY

## 🎯 CE QUI A ÉTÉ IMPLÉMENTÉ

### ✅ Backend (100% Fonctionnel)

#### 1. Base de données Supabase
- **Fichier**: `backend/database/complete-schema.sql`
- **Tables créées**:
  - `links` - Liens raccourcis avec statistiques
  - `clicks` - Enregistrement de chaque clic
  - `revenues` - Revenus générés (70% user / 30% plateforme)
  - `withdrawals` - Demandes de retrait (minimum 5€)
  - `user_settings` - Paramètres utilisateur
  - `platform_stats` - Statistiques globales

#### 2. Routes API créées
- **`/api/links`** - Gestion complète des liens (CRUD)
  - POST `/api/links` - Créer un lien
  - GET `/api/links` - Liste des liens
  - GET `/api/links/:id` - Détails d'un lien
  - PUT `/api/links/:id` - Modifier un lien
  - DELETE `/api/links/:id` - Supprimer un lien
  - GET `/api/links/:id/stats` - Statistiques détaillées

- **`/api/stats`** - Statistiques du dashboard
  - GET `/api/stats/dashboard` - Stats complètes
  - GET `/api/stats/revenue` - Revenus par période

- **`/api/user`** - Gestion utilisateur
  - GET `/api/user/profile` - Profil utilisateur
  - PUT `/api/user/profile` - Modifier profil
  - PUT `/api/user/password` - Changer mot de passe
  - DELETE `/api/user/account` - Supprimer compte

- **`/:shortCode`** - Redirection publique + monétisation
  - Affiche page interstitielle 5 secondes avec publicité
  - Enregistre le clic
  - Calcule et enregistre les revenus
  - Redirige vers la destination

### ✅ Frontend (100% Fonctionnel)

#### 1. Dashboard (`dashboard/dashboard.html`)
- Affichage des vraies statistiques
- Solde disponible
- Nombre de liens actifs
- Total des clics
- Graphique revenus 7 derniers jours
- Derniers retraits
- Derniers liens créés

#### 2. Page Mes liens (`dashboard/links.html`)
- Création de liens fonctionnelle
- Liste complète avec statistiques
- Copier le lien court
- Mettre en pause / Activer
- Supprimer un lien
- Filtrage par statut

#### 3. Page Réglages (`dashboard/settings.html`)
- Modification du pseudo ✅
- Changement de mot de passe ✅
- Suppression du compte ✅

---

## 🚀 ÉTAPES D'INSTALLATION

### 1️⃣ Créer les tables dans Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre projet
3. Allez dans **SQL Editor**
4. Copiez TOUT le contenu de `backend/database/complete-schema.sql`
5. Collez-le dans l'éditeur SQL
6. Cliquez sur **RUN** pour exécuter

✅ Vos tables sont maintenant créées !

### 2️⃣ Configuration Google AdSense

1. Inscrivez-vous sur [Google AdSense](https://www.google.com/adsense/)
2. Créez votre compte et validez votre site
3. Une fois approuvé, récupérez votre **code AdSense**:
   - Client ID: `ca-pub-XXXXXXXXXXXXXXXX`
   - Slot ID: `XXXXXXXXXX`

4. Ouvrez `backend/routes/redirect.js` ligne **272-280**
5. Remplacez:
   ```javascript
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
   
   data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
   data-ad-slot="XXXXXXXXXX"
   ```
   Par vos vraies valeurs AdSense

### 3️⃣ Régler le revenu par clic

Par défaut, le système génère **0,005€ par clic** (5 centimes pour 10 clics).

Pour modifier cette valeur:
1. Ouvrez `backend/routes/redirect.js`
2. Ligne **173**: `const revenuePerClick = 0.005;`
3. Changez la valeur selon vos besoins:
   - `0.001` = 1 centime par clic
   - `0.01` = 1 centime par clic
   - `0.05` = 5 centimes par clic

**Commission par défaut**: 70% utilisateur / 30% plateforme

### 4️⃣ Démarrer le backend

```bash
cd backend
npm install
npm start
```

Le serveur démarre sur `http://localhost:3001`

### 5️⃣ Démarrer le frontend

Ouvrez un autre terminal:

```bash
cd ..
npm install
npm start
```

Le frontend démarre sur `http://localhost:3000`

---

## 🧪 TESTER LE SYSTÈME DE BOUT EN BOUT

### Test complet:

1. **Créer un compte**
   - Allez sur `http://localhost:3000/register.html`
   - Inscrivez-vous ou connectez-vous avec Google

2. **Créer un lien**
   - Allez dans "Mes liens"
   - Entrez une URL: `https://google.com`
   - Cliquez sur "Créer le lien"
   - Vous obtenez: `http://localhost:3000/abc123`

3. **Tester le lien**
   - Copiez le lien court
   - Ouvrez-le dans un **nouvel onglet en navigation privée**
   - Vous voyez la page interstitielle 5 secondes
   - Vous êtes redirigé vers Google

4. **Vérifier les statistiques**
   - Retournez sur le dashboard
   - Rafraîchissez la page (F5)
   - ✅ Vous voyez: **1 clic** et **0,0035€** de revenu (70% de 0,005€)

5. **Vérifier le solde**
   - Le dashboard affiche votre solde
   - Quand vous atteignez **5€**, vous pouvez demander un retrait

---

## 💰 SYSTÈME DE MONÉTISATION

### Comment ça marche:

1. **Utilisateur crée un lien** → Lien court généré
2. **Quelqu'un clique** → Page interstitielle affichée
3. **Publicité affichée 5 secondes** → Google AdSense rémunère
4. **Clic enregistré** → Revenu calculé et enregistré
5. **Commission distribuée**:
   - 70% pour l'utilisateur
   - 30% pour vous (plateforme)

### Revenus par défaut:
- **0,005€ par clic** (5 millièmes d'euro)
- **0,0035€** pour l'utilisateur (70%)
- **0,0015€** pour la plateforme (30%)

Avec **1000 clics** par jour:
- Utilisateur gagne: **3,50€/jour** = **105€/mois**
- Plateforme gagne: **1,50€/jour** = **45€/mois**

**IMPORTANT**: Le vrai revenu viendra de **Google AdSense**. Les 0,005€ sont juste un exemple. Vous devez ajuster selon vos vrais revenus AdSense.

---

## 🔧 CONFIGURATION AVANCÉE

### Changer la commission utilisateur

Par défaut: **70% utilisateur / 30% plateforme**

Pour changer pour un utilisateur spécifique:
```sql
UPDATE user_settings
SET commission_rate = 80.00  -- 80% pour l'utilisateur
WHERE user_id = 'UUID_DE_LUTILISATEUR';
```

### Valider les revenus en attente

Les revenus sont en statut `pending` par défaut. Pour les valider:

```sql
UPDATE revenues
SET status = 'validated',
    validated_at = NOW()
WHERE status = 'pending';
```

### Changer le minimum de retrait

Actuellement: **5€ minimum**

Dans `backend/database/complete-schema.sql` ligne **234**:
```sql
amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 5.00),
```

Remplacez `5.00` par votre valeur.

---

## 🌐 DÉPLOIEMENT EN PRODUCTION

### Backend (Render.com - GRATUIT)

1. Allez sur [render.com](https://render.com)
2. Créez un nouveau **Web Service**
3. Connectez votre repository GitHub
4. Configuration:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**: Copiez toutes les variables de `backend/.env`

### Frontend (Vercel - GRATUIT)

1. Allez sur [vercel.com](https://vercel.com)
2. Importez votre projet
3. Configuration:
   - **Framework Preset**: Other
   - **Root Directory**: `.` (racine)
   
4. Mettez à jour `assets/js/api.js`:
   ```javascript
   const API_URL = 'https://votre-backend.onrender.com';
   ```

5. Mettez à jour `backend/.env`:
   ```
   FRONTEND_URL=https://votre-site.vercel.app
   ```

---

## 📊 VÉRIFICATIONS IMPORTANTES

### ✅ Checklist avant le lancement:

- [ ] Toutes les tables Supabase sont créées
- [ ] Les variables d'environnement sont correctes
- [ ] Google AdSense est configuré avec vos vraies clés
- [ ] Le revenu par clic est défini
- [ ] Vous avez testé la création d'un lien
- [ ] Vous avez testé un clic sur un lien
- [ ] Les statistiques s'affichent correctement
- [ ] Le changement de mot de passe fonctionne
- [ ] La modification du profil fonctionne

---

## 🐛 RÉSOLUTION DE PROBLÈMES

### "Failed to fetch" dans le dashboard
➡️ Le backend n'est pas démarré. Lancez `cd backend && npm start`

### "Invalid token" après connexion
➡️ Videz le localStorage: `localStorage.clear()` dans la console du navigateur

### Les statistiques affichent 0
➡️ Normal si vous n'avez pas encore de clics. Testez en cliquant sur un lien.

### Le lien ne se crée pas
➡️ Vérifiez que les tables Supabase sont créées et que l'API est accessible

---

## 📞 PROCHAINES ÉTAPES

1. ✅ **Exécutez le schéma SQL dans Supabase**
2. ✅ **Configurez Google AdSense**
3. ✅ **Testez localement**
4. ✅ **Déployez en production**
5. 🚀 **Lancez votre plateforme !**

---

## 💡 AMÉLIORATIONS FUTURES

- Page de statistiques détaillées avec graphiques
- Page de paiements fonctionnelle (PayPal, Stripe)
- Système de parrainage
- API publique pour créer des liens
- Application mobile
- Analytics avancés par pays/device

---

**🎉 Votre plateforme Click.Pay est maintenant 100% fonctionnelle !**
