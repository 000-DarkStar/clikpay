import express from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin, supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const db = supabaseAdmin || supabase;

router.get('/tickets', authenticateToken, async (req, res) => {
  const { data, error } = await db
    .from('support_tickets')
    .select('*, support_messages(id, message, author_role, created_at)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Impossible de charger les tickets' });
  res.json({ tickets: data || [] });
});

router.post('/tickets', authenticateToken, [
  body('category').isIn(['technical','account','login','link','revenue','payment','report','other']),
  body('subject').trim().isLength({ min: 3, max: 160 }),
  body('message').trim().isLength({ min: 10, max: 5000 }),
  body('priority').optional().isIn(['low','normal','high','urgent'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const number = `CP-${crypto.randomInt(100000, 999999)}`;
  const ticketResult = await db.from('support_tickets').insert({
    number,
    user_id: req.user.id,
    category: req.body.category,
    subject: req.body.subject,
    priority: req.body.priority || 'normal',
    status: 'open'
  }).select().single();

  if (ticketResult.error) return res.status(500).json({ error: 'Impossible de créer le ticket' });

  const messageResult = await db.from('support_messages').insert({
    ticket_id: ticketResult.data.id,
    author_user_id: req.user.id,
    author_role: 'user',
    message: req.body.message
  });

  if (messageResult.error) return res.status(500).json({ error: 'Ticket créé, mais le message a échoué' });
  res.status(201).json({ ticket: ticketResult.data });
});

router.post('/tickets/:id/messages', authenticateToken, [
  body('message').trim().isLength({ min: 1, max: 5000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const ticketLookup = await db.from('support_tickets')
    .select('id,status,user_id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (ticketLookup.error || !ticketLookup.data) return res.status(404).json({ error: 'Ticket introuvable' });
  if (ticketLookup.data.status === 'closed') return res.status(400).json({ error: 'Ce ticket est fermé' });

  const { data, error } = await db.from('support_messages').insert({
    ticket_id: ticketLookup.data.id,
    author_user_id: req.user.id,
    author_role: 'user',
    message: req.body.message
  }).select().single();

  if (error) return res.status(500).json({ error: 'Impossible d’envoyer la réponse' });
  res.status(201).json({ message: data });
});

router.get('/admin/tickets', authenticateToken, requireAdmin, async (req, res) => {
  const { data, error } = await db
    .from('support_tickets')
    .select('*, users(id,pseudo,email), support_messages(id,message,author_role,created_at)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Impossible de charger les tickets' });
  res.json({ tickets: data || [] });
});

router.put('/admin/tickets/:id', authenticateToken, requireAdmin, async (req, res) => {
  const allowedStatus = ['open','in_progress','waiting','resolved','closed'];
  const allowedCategory = ['technical','account','login','link','revenue','payment','report','other'];
  const update = {};
  if (allowedStatus.includes(req.body.status)) update.status = req.body.status;
  if (allowedCategory.includes(req.body.category)) update.category = req.body.category;
  if (req.body.assignedAdminId) update.assigned_admin_id = req.body.assignedAdminId;
  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Aucune modification valide' });
  if (update.status === 'closed') update.closed_at = new Date().toISOString();
  update.updated_at = new Date().toISOString();

  const { data, error } = await db.from('support_tickets').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(404).json({ error: 'Ticket introuvable' });
  await db.from('admin_audit_logs').insert({
    admin_user_id: req.admin.id,
    action: 'support_ticket_updated',
    target_type: 'ticket',
    target_id: req.params.id,
    details: update,
    ip_address: req.ip
  });
  res.json({ ticket: data });
});

router.post('/admin/tickets/:id/messages', authenticateToken, requireAdmin, [
  body('message').trim().isLength({ min: 1, max: 5000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const ticket = await db.from('support_tickets').select('id').eq('id', req.params.id).single();
  if (ticket.error || !ticket.data) return res.status(404).json({ error: 'Ticket introuvable' });

  const { data, error } = await db.from('support_messages').insert({
    ticket_id: ticket.data.id,
    author_user_id: req.admin.id,
    author_role: 'admin',
    message: req.body.message
  }).select().single();
  if (error) return res.status(500).json({ error: 'Impossible d’envoyer la réponse' });
  res.status(201).json({ message: data });
});

export default router;
