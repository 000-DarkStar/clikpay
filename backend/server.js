import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

// Import des routes
import authRoutes from './routes/auth.js';
import authDevRoutes from './routes/auth-dev.js';
import userRoutes from './routes/user.js';
import linksRoutes from './routes/links.js';
import statsRoutes from './routes/stats.js';
import redirectRoutes from './routes/redirect.js';
import supportRoutes from './routes/support.js';
import adminRoutes from './routes/admin.js';

// Import de la configuration Passport
import './config/passport.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de sécurité
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://clikpay.fr',
  'https://www.clikpay.fr',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  credentials: true
}));

// Render se trouve derrière un proxy HTTPS : utiliser l'adresse IP client.
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite à 100 requêtes par IP
  skip: (req) => {
    // Exclure les routes de santé et d'authentification OAuth du limiteur
    return req.path === '/health' || req.path.startsWith('/auth/google');
  }
});
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (interface de test)
if (process.env.NODE_ENV !== 'production') {
  app.use('/test', express.static('public'));
}

// Initialisation de Passport
app.use(passport.initialize());

// Routes techniques avant la redirection publique des liens courts
app.get('/', (req, res) => {
  res.json({
    name: 'ClikPay Backend API',
    status: 'ok',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ClikPay Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);

// Route de redirection publique (doit être en dernier)
app.use('/', redirectRoutes);

// Routes de développement (sans Turnstile)
if (process.env.NODE_ENV === 'development') {
  app.use('/auth-dev', authDevRoutes);
  console.log('⚠️  DEV routes enabled at /auth-dev (NO TURNSTILE)');
}

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/auth/google/callback')) {
    return res.redirect(`${process.env.FRONTEND_URL || 'https://www.clikpay.fr'}/login.html?error=google_auth_failed`);
  }
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
});
