import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Route: Créer un nouveau lien
router.post(
  '/',
  authenticateToken,
  [
    body('originalUrl').isURL().withMessage('URL invalide'),
    body('title').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { originalUrl, title } = req.body;

    try {
      // Générer un short_code unique
      const { data: shortCodeData, error: shortCodeError } = await supabase
        .rpc('generate_short_code');

      if (shortCodeError) throw shortCodeError;
      const shortCode = shortCodeData;

      // Créer le lien
      const { data: newLink, error } = await supabase
        .from('links')
        .insert({
          user_id: req.user.id,
          original_url: originalUrl,
          short_code: shortCode,
          title: title || null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Lien créé avec succès',
        link: {
          id: newLink.id,
          originalUrl: newLink.original_url,
          shortCode: newLink.short_code,
          shortUrl: `${process.env.FRONTEND_URL}/${newLink.short_code}`,
          title: newLink.title,
          status: newLink.status,
          totalClicks: newLink.total_clicks,
          totalRevenue: parseFloat(newLink.total_revenue),
          createdAt: newLink.created_at
        }
      });
    } catch (error) {
      console.error('Create link error:', error);
      res.status(500).json({ error: 'Erreur lors de la création du lien' });
    }
  }
);

// Route: Liste des liens de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('links')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: links, error } = await query;

    if (error) throw error;

    const formattedLinks = links.map(link => ({
      id: link.id,
      originalUrl: link.original_url,
      shortCode: link.short_code,
      shortUrl: `${process.env.FRONTEND_URL}/${link.short_code}`,
      title: link.title,
      status: link.status,
      totalClicks: link.total_clicks,
      totalRevenue: parseFloat(link.total_revenue),
      createdAt: link.created_at,
      updatedAt: link.updated_at,
      lastClickAt: link.last_click_at
    }));

    res.json({ links: formattedLinks });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des liens' });
  }
});

// Route: Détails d'un lien spécifique
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: link, error } = await supabase
      .from('links')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    res.json({
      link: {
        id: link.id,
        originalUrl: link.original_url,
        shortCode: link.short_code,
        shortUrl: `${process.env.FRONTEND_URL}/${link.short_code}`,
        title: link.title,
        status: link.status,
        totalClicks: link.total_clicks,
        totalRevenue: parseFloat(link.total_revenue),
        createdAt: link.created_at,
        updatedAt: link.updated_at,
        lastClickAt: link.last_click_at
      }
    });
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du lien' });
  }
});

// Route: Mettre à jour un lien
router.put(
  '/:id',
  authenticateToken,
  [
    body('title').optional().trim(),
    body('status').optional().isIn(['active', 'paused'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, status } = req.body;

    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (status) updateData.status = status;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      const { data: updatedLink, error } = await supabase
        .from('links')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error || !updatedLink) {
        return res.status(404).json({ error: 'Lien non trouvé' });
      }

      res.json({
        message: 'Lien mis à jour avec succès',
        link: {
          id: updatedLink.id,
          originalUrl: updatedLink.original_url,
          shortCode: updatedLink.short_code,
          shortUrl: `${process.env.FRONTEND_URL}/${updatedLink.short_code}`,
          title: updatedLink.title,
          status: updatedLink.status,
          totalClicks: updatedLink.total_clicks,
          totalRevenue: parseFloat(updatedLink.total_revenue),
          createdAt: updatedLink.created_at,
          updatedAt: updatedLink.updated_at
        }
      });
    } catch (error) {
      console.error('Update link error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du lien' });
    }
  }
);

// Route: Supprimer un lien
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Lien supprimé avec succès' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du lien' });
  }
});

// Route: Statistiques d'un lien
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le lien appartient à l'utilisateur
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (linkError || !link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    // Statistiques des clics
    const { data: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('*')
      .eq('link_id', id)
      .order('clicked_at', { ascending: false });

    if (clicksError) throw clicksError;

    // Statistiques par jour (7 derniers jours)
    const { data: dailyStats, error: dailyError } = await supabase
      .from('clicks')
      .select('clicked_at, revenue_generated')
      .eq('link_id', id)
      .gte('clicked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (dailyError) throw dailyError;

    // Grouper par jour
    const statsByDay = {};
    dailyStats.forEach(click => {
      const day = new Date(click.clicked_at).toISOString().split('T')[0];
      if (!statsByDay[day]) {
        statsByDay[day] = { clicks: 0, revenue: 0 };
      }
      statsByDay[day].clicks++;
      statsByDay[day].revenue += parseFloat(click.revenue_generated);
    });

    res.json({
      link: {
        id: link.id,
        shortCode: link.short_code,
        totalClicks: link.total_clicks,
        totalRevenue: parseFloat(link.total_revenue)
      },
      recentClicks: clicks.slice(0, 10).map(c => ({
        id: c.id,
        clickedAt: c.clicked_at,
        country: c.country,
        deviceType: c.device_type,
        revenueGenerated: parseFloat(c.revenue_generated)
      })),
      dailyStats: statsByDay
    });
  } catch (error) {
    console.error('Get link stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
