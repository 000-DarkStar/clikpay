import express from 'express';
import { supabase as publicSupabase, supabaseAdmin } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { revokeToken } from '../middleware/tokenBlacklist.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const supabase = supabaseAdmin || publicSupabase;

// Route: Obtenir le profil de l'utilisateur connecté
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, pseudo, first_name, last_name, avatar_url, email_verified, google_id, discord_id, role, suspended, created_at, last_login')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user.id,
        pseudo: user.pseudo || user.first_name,
        email: user.email,
        firstName: user.pseudo || user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        authProvider: user.google_id ? 'google' : user.discord_id ? 'discord' : 'local',
        role: user.role || 'user',
        suspended: !!user.suspended,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Route: Mettre à jour le profil
router.put(
  '/profile',
  authenticateToken,
  [
    body('pseudo').optional().trim().notEmpty(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('avatarUrl').optional().isURL()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { pseudo, firstName, lastName, avatarUrl } = req.body;

    try {
      const updateData = {};
      if (pseudo || firstName) {
        const profileName = pseudo || firstName;
        updateData.pseudo = profileName;
        updateData.first_name = profileName;
      }
      if (lastName !== undefined) updateData.last_name = lastName;
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', req.user.id)
        .select('id, pseudo, email, first_name, last_name, avatar_url, email_verified, google_id, discord_id, role, suspended')
        .single();

      if (error) throw error;

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          pseudo: updatedUser.pseudo || updatedUser.first_name,
          email: updatedUser.email,
          firstName: updatedUser.pseudo || updatedUser.first_name,
          lastName: updatedUser.last_name,
          avatarUrl: updatedUser.avatar_url,
          emailVerified: updatedUser.email_verified,
          authProvider: updatedUser.google_id ? 'google' : updatedUser.discord_id ? 'discord' : 'local',
          role: updatedUser.role || 'user',
          suspended: !!updatedUser.suspended
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Route: Changer le mot de passe
router.put(
  '/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      // Récupérer l'utilisateur avec son mot de passe
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', req.user.id)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Vérifier si l'utilisateur a un mot de passe (pas OAuth uniquement)
      if (!user.password_hash) {
        return res.status(400).json({
          error: 'Impossible de changer le mot de passe pour un compte OAuth'
        });
      }

      // Vérifier le mot de passe actuel
      const bcrypt = (await import('bcryptjs')).default;
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', req.user.id);

      if (updateError) throw updateError;

      res.json({ message: 'Mot de passe changé avec succès' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
    }
  }
);

// Route: Supprimer le compte
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.user.id);

    if (error) throw error;

    // Révoquer le token de l'utilisateur
    revokeToken(req.user.jti);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Route: Changer l’adresse email
router.put('/email', authenticateToken, [
  body('email').isEmail().normalizeEmail(),
  body('currentPassword').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { data: user, error } = await supabase
    .from('users').select('id,email,password_hash,google_id,discord_id').eq('id', req.user.id).single();
  if (error || !user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (user.password_hash) {
    if (!req.body.currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' });
    const bcrypt = (await import('bcryptjs')).default;
    const valid = await bcrypt.compare(req.body.currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const normalizedEmail = req.body.email;
  const existing = await supabase.from('users').select('id').eq('email', normalizedEmail).neq('id', req.user.id).maybeSingle();
  if (existing.data) return res.status(409).json({ error: 'Cette adresse email est déjà utilisée' });

  const { data: updated, error: updateError } = await supabase
    .from('users').update({ email: normalizedEmail, email_verified: false }).eq('id', req.user.id)
    .select('id,pseudo,email,first_name,last_name,avatar_url,email_verified,google_id,discord_id,role,suspended').single();
  if (updateError) return res.status(500).json({ error: 'Impossible de modifier l’adresse email' });

  res.json({
    message: 'Adresse email mise à jour',
    user: {
      id: updated.id,
      pseudo: updated.pseudo || updated.first_name,
      email: updated.email,
      firstName: updated.pseudo || updated.first_name,
      lastName: updated.last_name,
      avatarUrl: updated.avatar_url,
      emailVerified: updated.email_verified,
      authProvider: updated.google_id ? 'google' : updated.discord_id ? 'discord' : 'local',
      role: updated.role || 'user',
      suspended: !!updated.suspended
    }
  });
});

export default router;
