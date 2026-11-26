// Script pour le dashboard - Chargement des vraies données
document.addEventListener('DOMContentLoaded', async function() {
  const allowed = await requireAuth();
  if (!allowed) return;

  // Charger les statistiques du dashboard
  await loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    // Afficher un état de chargement
    showLoading();

    // Récupérer les stats depuis l'API
    const response = await fetch(`${API_URL}/api/stats/dashboard`, {
      method: 'GET',
      headers: Auth.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des statistiques');
    }

    const data = await response.json();

    // Mettre à jour les KPI
    updateKPIs(data);

    // Mettre à jour les revenus 7 derniers jours
    updateRevenueChart(data.revenue7Days);

    // Mettre à jour les derniers retraits
    updateWithdrawals(data.recentWithdrawals);

    // Mettre à jour les derniers liens
    updateRecentLinks(data.recentLinks);

    hideLoading();
  } catch (error) {
    console.error('Erreur:', error);
    hideLoading();
    showError('Impossible de charger les statistiques');
  }
}

function updateKPIs(data) {
  // Solde disponible
  const balanceKPI = document.querySelector('.kpi:nth-child(1) .val');
  const balanceDelta = document.querySelector('.kpi:nth-child(1) .delta');
  if (balanceKPI) {
    balanceKPI.textContent = `${data.balance.toFixed(2)} €`;
  }
  if (balanceDelta) {
    balanceDelta.textContent = data.balance >= 5
      ? '✓ Retrait possible'
      : `Minimum 5€ requis (${(5 - data.balance).toFixed(2)}€ restants)`;
  }

  // Liens actifs
  const linksKPI = document.querySelector('.kpi:nth-child(2) .val');
  const linksDelta = document.querySelector('.kpi:nth-child(2) .delta');
  if (linksKPI) {
    linksKPI.textContent = data.linksActive;
  }
  if (linksDelta) {
    linksDelta.textContent = data.linksActive === 0
      ? 'Aucun lien créé'
      : `${data.linksActive} lien${data.linksActive > 1 ? 's' : ''} actif${data.linksActive > 1 ? 's' : ''}`;
  }

  // Clics totaux
  const clicksKPI = document.querySelector('.kpi:nth-child(3) .val');
  const clicksDelta = document.querySelector('.kpi:nth-child(3) .delta');
  if (clicksKPI) {
    clicksKPI.textContent = data.totalClicks;
  }
  if (clicksDelta) {
    clicksDelta.textContent = data.totalClicks === 0
      ? 'Aucun clic enregistré'
      : `${data.totalClicks} clic${data.totalClicks > 1 ? 's' : ''} total${data.totalClicks > 1 ? 'aux' : ''}`;
  }

  // Déblocages validés
  const unlocksKPI = document.querySelector('.kpi:nth-child(4) .val');
  const unlocksDelta = document.querySelector('.kpi:nth-child(4) .delta');
  if (unlocksKPI) {
    unlocksKPI.textContent = data.validatedUnlocks;
  }
  if (unlocksDelta) {
    const rate = data.totalClicks > 0
      ? ((data.validatedUnlocks / data.totalClicks) * 100).toFixed(2)
      : 0;
    unlocksDelta.textContent = `taux de ${rate} %`;
  }
}

function updateRevenueChart(revenue7Days) {
  const panel = document.querySelector('.grid-2 .panel:first-child');
  const header = panel.querySelector('.panel-head .row-link');

  if (header) {
    header.textContent = `Total : ${revenue7Days.total.toFixed(2)} €`;
  }

  const emptyState = panel.querySelector('.empty-state');

  if (revenue7Days.total === 0) {
    // Afficher l'état vide
    if (!emptyState) {
      panel.innerHTML = `
        <div class="panel-head"><h3>Revenus — 7 derniers jours</h3><span class="row-link">Total : 0,00 €</span></div>
        <div class="empty-state">
          <i class="fa-solid fa-chart-line"></i>
          <p>Aucune donnée pour cette période.</p>
        </div>
      `;
    }
  } else {
    // Afficher un graphique simple en ASCII ou remplacer par une vraie lib
    const days = Object.keys(revenue7Days.byDay).sort();
    let chartHTML = '<div class="revenue-chart" style="padding:20px;">';

    days.forEach(day => {
      const amount = revenue7Days.byDay[day];
      const date = new Date(day);
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      const barWidth = Math.min((amount / revenue7Days.total) * 100, 100);

      chartHTML += `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
            <span>${dayName}</span>
            <span style="font-weight:600;">${amount.toFixed(4)} €</span>
          </div>
          <div style="background:rgba(0,144,255,0.2);border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:#0090ff;height:100%;width:${barWidth}%;transition:width 0.3s;"></div>
          </div>
        </div>
      `;
    });

    chartHTML += '</div>';

    panel.innerHTML = `
      <div class="panel-head"><h3>Revenus — 7 derniers jours</h3><span class="row-link">Total : ${revenue7Days.total.toFixed(2)} €</span></div>
      ${chartHTML}
    `;
  }
}

function updateWithdrawals(withdrawals) {
  const panel = document.querySelector('.grid-2 .panel:nth-child(2)');

  if (withdrawals.length === 0) {
    panel.innerHTML = `
      <div class="panel-head"><h3>Derniers retraits</h3></div>
      <div class="empty-state">
        <i class="fa-solid fa-wallet"></i>
        <p>Aucun retrait effectué pour le moment.</p>
      </div>
    `;
  } else {
    let listHTML = '<div class="panel-head"><h3>Derniers retraits</h3></div><div style="padding:0 20px 20px;">';

    withdrawals.forEach(w => {
      const statusColor = w.status === 'completed' ? '#30a46c' : w.status === 'rejected' ? '#e5484d' : '#f76b15';
      const statusText = w.status === 'completed' ? 'Complété' : w.status === 'rejected' ? 'Rejeté' : 'En attente';
      const date = new Date(w.requestedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

      listHTML += `
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:600;">${w.amount.toFixed(2)} €</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${date}</div>
          </div>
          <div style="text-align:right;">
            <div style="color:${statusColor};font-size:13px;font-weight:600;">${statusText}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;text-transform:capitalize;">${w.paymentMethod.replace('_', ' ')}</div>
          </div>
        </div>
      `;
    });

    listHTML += '</div>';
    panel.innerHTML = listHTML;
  }
}

function updateRecentLinks(links) {
  const panel = document.querySelector('.panel:last-child');

  if (links.length === 0) {
    panel.innerHTML = `
      <div class="panel-head">
        <h3>Derniers liens</h3>
        <a class="btn btn-sm" href="links.html">Voir tout</a>
      </div>
      <div class="empty-state">
        <i class="fa-solid fa-link"></i>
        <p>Tu n'as encore créé aucun lien.</p>
        <a class="btn btn-solid btn-sm" href="links.html"><i class="fa-solid fa-plus"></i> Créer mon premier lien</a>
      </div>
    `;
  } else {
    let listHTML = `
      <div class="panel-head">
        <h3>Derniers liens</h3>
        <a class="btn btn-sm" href="links.html">Voir tout</a>
      </div>
      <div style="padding:0 20px 20px;">
    `;

    links.forEach(link => {
      const shortUrl = link.shortUrl;
      const title = link.title || link.originalUrl.substring(0, 50) + '...';
      const date = new Date(link.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

      listHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</div>
            <div style="font-size:13px;color:#0090ff;margin-bottom:4px;">
              <a href="${shortUrl}" target="_blank" style="color:#0090ff;text-decoration:none;">${shortUrl}</a>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);">Créé le ${date}</div>
          </div>
          <div style="text-align:right;margin-left:20px;">
            <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${link.totalClicks}</div>
            <div style="font-size:12px;color:var(--text-secondary);">clics</div>
          </div>
        </div>
      `;
    });

    listHTML += '</div>';
    panel.innerHTML = listHTML;
  }
}

function showLoading() {
  // Optionnel: afficher un loader
  const loader = document.createElement('div');
  loader.id = 'dashboard-loader';
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  loader.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:48px;color:#fff;"></i>';
  document.body.appendChild(loader);
}

function hideLoading() {
  const loader = document.getElementById('dashboard-loader');
  if (loader) {
    loader.remove();
  }
}

function showError(message) {
  alert(message);
}
