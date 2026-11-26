import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { supabase as publicSupabase, supabaseAdmin } from '../config/supabase.js';
import { verifyTurnstile } from '../middleware/turnstile.js';
import { revokeToken, isTokenRevoked } from '../middleware/tokenBlacklist.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabase = supabaseAdmin || publicSupabase;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.clikpay.fr').replace(/\/$/, '');

// Génération du JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      firstName: user.pseudo || user.first_name,
      lastName: user.last_name,
      pseudo: user.pseudo || user.first_name,
      role: user.role || 'user',
      jti: crypto.randomUUID()
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const formatUser = (user) => ({
  id: user.id,
  pseudo: user.pseudo || user.first_name || user.email?.split('@')[0] || 'Utilisateur',
  email: user.email,
  firstName: user.pseudo || user.first_name || user.email?.split('@')[0] || 'Utilisateur',
  lastName: user.last_name || '',
  avatarUrl: user.avatar_url || null,
  emailVerified: user.email_verified || false,
  authProvider: user.google_id ? 'google' : user.discord_id ? 'discord' : 'local',
  role: user.role || 'user',
  suspended: !!user.suspended
});

// Route: Inscription classique
router.post(
  '/register',
  verifyTurnstile,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim(),
    body('pseudo').trim().notEmpty().withMessage('Pseudo requis')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    try {
      const { data: existingUser } = await supabase
        .from('users').select('id').eq('email', email).maybeSingle();

      if (existingUser) return res.status(400).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 12);
      const pseudo = String(req.body.pseudo || firstName || '').trim();
      if (!pseudo) return res.status(400).json({ error: 'Pseudo requis' });

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: hashedPassword,
          pseudo,
          first_name: pseudo,
          last_name: '',
          email_verified: false,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const token = generateToken(newUser);
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: formatUser(newUser)
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

// Route: Connexion classique
router.post(
  '/login',
  verifyTurnstile,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Trouver l'utilisateur
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Vérifier si l'utilisateur a un mot de passe (pas uniquement OAuth)
      if (!user.password_hash) {
        return res.status(401).json({
          error: 'Veuillez vous connecter avec Google',
          loginMethod: 'google'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Vérifier si le compte est suspendu
      if (user.suspended) {
        return res.status(403).json({ error: 'Compte suspendu' });
      }

      // Mettre à jour la dernière connexion
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Générer le token
      const token = generateToken(user);

      res.json({
        message: 'Connexion réussie',
        token,
        user: formatUser(user)
      });
    } catch (error) {
      console.error('Erreur de connexion:', error);
      res.status(500).json({ error: 'Échec de la connexion' });
    }
  }
);

// Route: Authentification Google - Initier
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Route: Authentification Google - Callback
router.get(
  '/google/callback',
  (req, res) => {
    try {
      passport.authenticate('google', { session: false }, (error, user, info) => {
        if (error || !user) {
          console.error('Google callback rejected:', error || info || 'Utilisateur introuvable');
          return res.redirect(`${FRONTEND_URL}/login.html?error=google_auth_failed`);
        }

        try {
          const token = generateToken(user);
          return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
        } catch (tokenError) {
          console.error('Google token generation error:', tokenError);
          return res.redirect(`${FRONTEND_URL}/login.html?error=token_generation_failed`);
        }
      })(req, res, (middlewareError) => {
        console.error('Google callback middleware error:', middlewareError);
        return res.redirect(`${FRONTEND_URL}/login.html?error=google_auth_failed`);
      });
    } catch (callbackError) {
      console.error('Google callback exception:', callbackError);
      return res.redirect(`${FRONTEND_URL}/login.html?error=google_auth_failed`);
    }
  }
);

// Route: finaliser une connexion Discord via Supabase
router.post('/discord/session', async (req, res) => {
  const accessToken = req.body?.supabaseAccessToken;
  if (!accessToken) return res.status(400).json({ error: 'Le token Supabase Discord est requis' });

  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) return res.status(401).json({ error: 'Session Discord invalide' });

    const discordUser = data.user;
    const identity = discordUser.identities?.find(item => item.provider === 'discord');
    const metadata = discordUser.user_metadata || {};
    const email = discordUser.email;
    if (!email) return res.status(400).json({ error: 'L\'email du compte Discord est requis' });

    const discordId = String(identity?.identity_data?.provider_id || identity?.id || discordUser.id);
    const pseudo = metadata.custom_claims?.global_name || metadata.global_name || metadata.full_name || metadata.name || metadata.preferred_username || metadata.nickname || 'Utilisateur Discord';
    const avatarUrl = metadata.avatar_url || metadata.picture || null;

    let { data: user, error: findError } = await supabase
      .from('users').select('*').eq('email', email).maybeSingle();
    if (findError) throw findError;

    if (user) {
      // Vérifier si le compte est suspendu
      if (user.suspended) return res.status(403).json({ error: 'Compte suspendu' });

      const result = await supabase.from('users').update({
        pseudo,
        first_name: pseudo,
        discord_id: discordId,
        avatar_url: avatarUrl || user.avatar_url,
        email_verified: true,
        last_login: new Date().toISOString()
      }).eq('id', user.id).select().single();
      if (result.error) throw result.error;
      user = result.data;
    } else {
      const result = await supabase.from('users').insert({
        discord_id: discordId,
        pseudo,
        email,
        first_name: pseudo,
        last_name: '',
        avatar_url: avatarUrl,
        email_verified: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      }).select().single();
      if (result.error) throw result.error;
      user = result.data;
    }

    const token = generateToken(user);
    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Erreur de session Discord:', error);
    res.status(500).json({ error: 'Échec de la finalisation de la connexion Discord' });
  }
});

// Route: Vérifier le token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Aucun token fourni' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide ou expiré' });
    if (isTokenRevoked(user.jti)) return res.status(401).json({ error: 'Session révoquée' });
    res.json({ valid: true, user });
  });
});

// Route: Déconnexion
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Aucun token fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    revokeToken(decoded.jti);
  } catch (_) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }

  res.json({ message: 'Déconnexion réussie' });
});

export default router;
