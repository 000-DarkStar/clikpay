import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

// Import des routes
import authRoutes from './routes/auth.js';
import authDevRoutes from './routes/auth-dev.js';
import userRoutes from './routes/user.js';
import linksRoutes from './routes/links.js';
import statsRoutes from './routes/stats.js';
import redirectRoutes from './routes/redirect.js';

// Import de la configuration Passport
import './config/passport.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite à 100 requêtes par IP
});
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (interface de test)
app.use('/test', express.static('public'));

// Configuration de la session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/stats', statsRoutes);

// Route de redirection publique (doit être en dernier)
app.use('/', redirectRoutes);

// Routes de développement (sans Turnstile)
if (process.env.NODE_ENV === 'development') {
  app.use('/auth-dev', authDevRoutes);
  console.log('⚠️  DEV routes enabled at /auth-dev (NO TURNSTILE)');
}

// Route de test
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ClikPay Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error(err.stack);
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
