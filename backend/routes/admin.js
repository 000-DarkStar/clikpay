import express from 'express';
import { supabaseAdmin, supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const db = supabaseAdmin || supabase;

router.use(authenticateToken, requireAdmin);

router.get('/stats', async (req, res) => {
  const [users, links, tickets, clicks, revenues] = await Promise.all([
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('links').select('id', { count: 'exact', head: true }),
    db.from('support_tickets').select('id', { count: 'exact', head: true }),
    db.from('clicks').select('id', { count: 'exact', head: true }),
    db.from('revenues').select('amount,status')
  ]);

  const totalRevenue = (revenues.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const validatedRevenue = (revenues.data || []).filter(row => row.status === 'validated').reduce((sum, row) => sum + Number(row.amount || 0), 0);

  res.json({
    users: users.count || 0,
    links: links.count || 0,
    tickets: tickets.count || 0,
    clicks: clicks.count || 0,
    revenue: { total: totalRevenue, validated: validatedRevenue }
  });
});

router.get('/users', async (req, res) => {
  const search = String(req.query.search || '').trim();
  let query = db.from('users').select('id,email,pseudo,avatar_url,role,suspended,created_at,last_login').order('created_at', { ascending: false }).limit(100);
  if (search) query = db.from('users').select('id,email,pseudo,avatar_url,role,suspended,created_at,last_login').or(`email.ilike.%${search}%,pseudo.ilike.%${search}%`).limit(100);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Impossible de charger les utilisateurs' });
  res.json({ users: data || [] });
});

router.put('/users/:id', async (req, res) => {
  const update = {};
  if (typeof req.body.suspended === 'boolean') update.suspended = req.body.suspended;
  if (typeof req.body.suspendedReason === 'string') update.suspended_reason = req.body.suspendedReason;
  if (req.admin.role === 'superadmin' && ['user','admin'].includes(req.body.role)) update.role = req.body.role;
  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Aucune modification valide' });

  const { data, error } = await db.from('users').update(update).eq('id', req.params.id).select('id,email,pseudo,role,suspended,suspended_reason').single();
  if (error) return res.status(404).json({ error: 'Utilisateur introuvable' });

  await db.from('admin_audit_logs').insert({
    admin_user_id: req.admin.id,
    action: 'user_updated',
    target_type: 'user',
    target_id: req.params.id,
    details: update,
    ip_address: req.ip
  });
  res.json({ user: data });
});

router.get('/links', async (req, res) => {
  const search = String(req.query.search || '').trim();
  let query = db.from('links').select('*, users(id,pseudo,email)').order('created_at', { ascending: false }).limit(100);
  if (search) query = db.from('links').select('*, users(id,pseudo,email)').or(`short_code.ilike.%${search}%,original_url.ilike.%${search}%`).limit(100);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Impossible de charger les liens' });
  res.json({ links: data || [] });
});

router.put('/links/:id', async (req, res) => {
  const update = {};
  if (['active','paused','deleted'].includes(req.body.status)) update.status = req.body.status;
  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Aucun statut valide' });

  const { data, error } = await db.from('links').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(404).json({ error: 'Lien introuvable' });
  await db.from('admin_audit_logs').insert({
    admin_user_id: req.admin.id,
    action: 'link_updated',
    target_type: 'link',
    target_id: req.params.id,
    details: update,
    ip_address: req.ip
  });
  res.json({ link: data });
});

router.delete('/links/:id', async (req, res) => {
  const { error } = await db.from('links').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Impossible de supprimer le lien' });
  await db.from('admin_audit_logs').insert({
    admin_user_id: req.admin.id,
    action: 'link_deleted',
    target_type: 'link',
    target_id: req.params.id,
    ip_address: req.ip
  });
  res.json({ message: 'Lien supprimé' });
});

export default router;
