import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { isTokenRevoked } from './tokenBlacklist.js';
import { supabaseAdmin, supabase } from '../config/supabase.js';

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    if (isTokenRevoked(user.jti)) return res.status(401).json({ error: 'Session revoked' });

    const db = supabaseAdmin || supabase;
    const { data: account } = await db.from('users').select('id,suspended').eq('id', user.id).maybeSingle();
    if (!account) return res.status(401).json({ error: 'Compte introuvable' });
    if (account.suspended) return res.status(403).json({ error: 'Compte suspendu' });

    req.user = user;
    next();
  });
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err && !isTokenRevoked(user.jti)) req.user = user;
    next();
  });
};

export const requireAdmin = async (req, res, next) => {
  try {
    const db = supabaseAdmin || supabase;
    const { data: user, error } = await db
      .from('users')
      .select('id, role, suspended')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(403).json({ error: 'Accès refusé' });
    if (user.suspended) return res.status(403).json({ error: 'Compte suspendu' });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Droits administrateur requis' });
    }

    req.admin = user;
    next();
  } catch (_) {
    res.status(500).json({ error: 'Impossible de vérifier les permissions' });
  }
};
