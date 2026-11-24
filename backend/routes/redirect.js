import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Route publique: Redirection + enregistrement du clic
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Récupérer le lien
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('*')
      .eq('short_code', shortCode)
      .single();

    if (linkError || !link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lien introuvable - clik.pay</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Space Grotesk', sans-serif; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .error { text-align: center; }
            h1 { font-size: 48px; margin: 0; }
            p { font-size: 18px; color: #999; }
            a { color: #0090ff; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>404</h1>
            <p>Ce lien n'existe pas ou a été supprimé.</p>
            <a href="${process.env.FRONTEND_URL}">Retour à l'accueil</a>
          </div>
        </body>
        </html>
      `);
    }

    // Vérifier si le lien est actif
    if (link.status !== 'active') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lien désactivé - clik.pay</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Space Grotesk', sans-serif; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .error { text-align: center; }
            h1 { font-size: 48px; margin: 0; }
            p { font-size: 18px; color: #999; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Lien désactivé</h1>
            <p>Ce lien a été mis en pause par son propriétaire.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Extraire les informations du visiteur
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;

    // Déterminer le type d'appareil
    let deviceType = 'unknown';
    if (userAgent) {
      if (/mobile/i.test(userAgent)) deviceType = 'mobile';
      else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';
      else if (/windows|mac|linux/i.test(userAgent)) deviceType = 'desktop';
    }

    // Vérifier si ce visiteur a déjà cliqué sur ce lien récemment (anti-spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentClick } = await supabase
      .from('clicks')
      .select('id')
      .eq('link_id', link.id)
      .eq('ip_address', ipAddress)
      .gte('clicked_at', oneHourAgo)
      .single();

    // Si pas de clic récent, enregistrer le nouveau clic
    if (!recentClick) {
      // Calculer le revenu généré (exemple: 0.005€ par clic)
      const revenuePerClick = 0.005;

      // Enregistrer le clic
      const { data: newClick, error: clickError } = await supabase
        .from('clicks')
        .insert({
          link_id: link.id,
          user_id: link.user_id,
          ip_address: ipAddress,
          user_agent: userAgent,
          referrer: referrer,
          device_type: deviceType,
          revenue_generated: revenuePerClick,
          ad_viewed: true
        })
        .select()
        .single();

      if (!clickError && newClick) {
        // Récupérer la commission de l'utilisateur
        const { data: settings } = await supabase
          .from('user_settings')
          .select('commission_rate')
          .eq('user_id', link.user_id)
          .single();

        const commissionRate = settings?.commission_rate || 70.00;
        const userAmount = (revenuePerClick * commissionRate) / 100;
        const platformAmount = revenuePerClick - userAmount;

        // Enregistrer le revenu
        await supabase
          .from('revenues')
          .insert({
            user_id: link.user_id,
            link_id: link.id,
            click_id: newClick.id,
            amount: userAmount,
            commission_rate: commissionRate,
            platform_commission: platformAmount,
            status: 'pending'
          });

        // Mettre à jour le revenu total du lien
        await supabase
          .from('links')
          .update({
            total_revenue: parseFloat(link.total_revenue) + userAmount
          })
          .eq('id', link.id);
      }
    }

    // Afficher la page interstitielle avec publicité Google AdSense
    const destinationUrl = link.original_url;

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirection en cours - clik.pay</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Space Grotesk', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .logo {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 28px;
            margin-bottom: 15px;
          }
          p {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 30px;
          }
          .timer {
            font-size: 72px;
            font-weight: 700;
            margin: 30px 0;
            color: #fff;
          }
          .ad-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
            min-height: 250px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
          }
          .skip-btn {
            background: #fff;
            color: #667eea;
            border: none;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: not-allowed;
            opacity: 0.5;
            transition: all 0.3s;
            font-family: 'Space Grotesk', sans-serif;
          }
          .skip-btn.active {
            cursor: pointer;
            opacity: 1;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }
          .skip-btn.active:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          }
          .info {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 20px;
          }
        </style>
        <!-- Google AdSense - Remplacez par votre code -->
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossorigin="anonymous"></script>
      </head>
      <body>
        <div class="container">
          <div class="logo">🔗 clik.pay</div>
          <h1>Redirection en cours...</h1>
          <p>Vous allez être redirigé vers votre destination dans quelques secondes.</p>

          <div class="timer" id="timer">5</div>

          <!-- Zone publicitaire Google AdSense -->
          <div class="ad-container">
            <!-- Remplacez par votre code AdSense -->
            <ins class="adsbygoogle"
              style="display:block"
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="XXXXXXXXXX"
              data-ad-format="auto"
              data-full-width-responsive="true"></ins>
            <script>
              (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
          </div>

          <button class="skip-btn" id="skipBtn" disabled>
            Passer la publicité (5s)
          </button>

          <p class="info">
            Ce service est gratuit et financé par la publicité.<br>
            Merci de votre soutien ! 💙
          </p>
        </div>

        <script>
          const destinationUrl = ${JSON.stringify(destinationUrl)};
          let countdown = 5;
          const timerEl = document.getElementById('timer');
          const skipBtn = document.getElementById('skipBtn');

          const interval = setInterval(() => {
            countdown--;
            timerEl.textContent = countdown;
            skipBtn.textContent = countdown > 0 ? \`Passer la publicité (\${countdown}s)\` : 'Continuer vers la destination';

            if (countdown === 0) {
              clearInterval(interval);
              skipBtn.disabled = false;
              skipBtn.classList.add('active');
            }

            if (countdown < 0) {
              window.location.href = destinationUrl;
            }
          }, 1000);

          skipBtn.addEventListener('click', () => {
            if (countdown === 0) {
              window.location.href = destinationUrl;
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Erreur lors de la redirection');
  }
});

export default router;
