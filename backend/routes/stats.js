import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route: Statistiques du dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Calculer le solde disponible
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_user_balance', { p_user_id: userId });

    if (balanceError) throw balanceError;

    // Nombre de liens actifs
    const { count: linksCount, error: linksError } = await supabase
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (linksError) throw linksError;

    // Total des clics
    const { data: clicksData, error: clicksError } = await supabase
      .from('links')
      .select('total_clicks')
      .eq('user_id', userId);

    if (clicksError) throw clicksError;

    const totalClicks = clicksData.reduce((sum, link) => sum + link.total_clicks, 0);

    // Déblocages validés (revenus validés)
    const { count: validatedCount, error: validatedError } = await supabase
      .from('revenues')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'validated');

    if (validatedError) throw validatedError;

    // Revenus des 7 derniers jours
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentRevenues, error: recentError } = await supabase
      .from('revenues')
      .select('amount, generated_at')
      .eq('user_id', userId)
      .gte('generated_at', sevenDaysAgo)
      .order('generated_at', { ascending: true });

    if (recentError) throw recentError;

    // Grouper par jour
    const revenueByDay = {};
    recentRevenues.forEach(rev => {
      const day = new Date(rev.generated_at).toISOString().split('T')[0];
      if (!revenueByDay[day]) {
        revenueByDay[day] = 0;
      }
      revenueByDay[day] += parseFloat(rev.amount);
    });

    const totalRevenue7Days = recentRevenues.reduce((sum, rev) => sum + parseFloat(rev.amount), 0);

    // Derniers retraits
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(5);

    if (withdrawalsError) throw withdrawalsError;

    // Derniers liens créés
    const { data: recentLinks, error: recentLinksError } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentLinksError) throw recentLinksError;

    res.json({
      balance: parseFloat(balanceData) || 0,
      linksActive: linksCount || 0,
      totalClicks: totalClicks || 0,
      validatedUnlocks: validatedCount || 0,
      revenue7Days: {
        total: totalRevenue7Days,
        byDay: revenueByDay
      },
      recentWithdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: parseFloat(w.amount),
        status: w.status,
        paymentMethod: w.payment_method,
        requestedAt: w.requested_at,
        completedAt: w.completed_at
      })),
      recentLinks: recentLinks.map(link => ({
        id: link.id,
        shortCode: link.short_code,
        shortUrl: `${process.env.FRONTEND_URL}/${link.short_code}`,
        title: link.title,
        totalClicks: link.total_clicks,
        totalRevenue: parseFloat(link.total_revenue),
        createdAt: link.created_at
      }))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Route: Revenus par période
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '7d' } = req.query;

    let startDate;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data: revenues, error } = await supabase
      .from('revenues')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', startDate.toISOString())
      .order('generated_at', { ascending: true });

    if (error) throw error;

    // Grouper par jour
    const revenueByDay = {};
    revenues.forEach(rev => {
      const day = new Date(rev.generated_at).toISOString().split('T')[0];
      if (!revenueByDay[day]) {
        revenueByDay[day] = { total: 0, count: 0, validated: 0, pending: 0 };
      }
      revenueByDay[day].total += parseFloat(rev.amount);
      revenueByDay[day].count++;
      if (rev.status === 'validated') {
        revenueByDay[day].validated += parseFloat(rev.amount);
      } else if (rev.status === 'pending') {
        revenueByDay[day].pending += parseFloat(rev.amount);
      }
    });

    const totalRevenue = revenues.reduce((sum, rev) => sum + parseFloat(rev.amount), 0);
    const validatedRevenue = revenues
      .filter(r => r.status === 'validated')
      .reduce((sum, rev) => sum + parseFloat(rev.amount), 0);
    const pendingRevenue = revenues
      .filter(r => r.status === 'pending')
      .reduce((sum, rev) => sum + parseFloat(rev.amount), 0);

    res.json({
      period,
      total: totalRevenue,
      validated: validatedRevenue,
      pending: pendingRevenue,
      byDay: revenueByDay
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des revenus' });
  }
});

export default router;
