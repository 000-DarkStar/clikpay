import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// CORS pour communiquer avec le backend
app.use(cors());

// Servir tous les fichiers statiques (HTML, CSS, JS, images)
app.use(express.static(__dirname));

// Routes spécifiques pour les pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, 'faq.html'));
});

app.get('/auth/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth', 'callback.html'));
});

// Rediriger /dashboard vers le dossier dashboard
// Pages privées : aucune mise en cache navigateur côté serveur
app.use('/dashboard', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
}, express.static(path.join(__dirname, 'dashboard')));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎨 Frontend ClikPay en ligne !`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`\n📄 Pages disponibles :`);
  console.log(`   - http://localhost:${PORT}/ (Accueil)`);
  console.log(`   - http://localhost:${PORT}/login.html (Connexion)`);
  console.log(`   - http://localhost:${PORT}/register.html (Inscription)`);
  console.log(`   - http://localhost:${PORT}/dashboard (Dashboard)`);
  console.log(`   - http://localhost:${PORT}/faq.html (FAQ)`);
  console.log(`\n🔗 Backend API : http://localhost:3001`);
  console.log(`\n✨ Prêt à tester !\n`);
});
