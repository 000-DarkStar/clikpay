// Gestion de la page Mes liens
document.addEventListener('DOMContentLoaded', async function() {
  requireAuth();

  // Charger les liens
  await loadLinks();

  // Gérer la création de lien
  const createBtn = document.getElementById('createLinkBtn');
  const linkInput = document.getElementById('newLinkInput');

  if (createBtn && linkInput) {
    createBtn.addEventListener('click', async () => {
      await createLink();
    });

    linkInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await createLink();
      }
    });
  }

  // Gérer les filtres
  const tabBtns = document.querySelectorAll('.tab-bar .tab-btn');
  tabBtns.forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      const filters = ['all', 'active', 'paused'];
      await loadLinks(filters[index]);
    });
  });
});

let currentLinks = [];

async function createLink() {
  const input = document.getElementById('newLinkInput');
  const btn = document.getElementById('createLinkBtn');

  const url = input.value.trim();

  if (!url) {
    showNotification('Veuillez entrer une URL', 'error');
    return;
  }

  // Validation basique de l'URL
  try {
    new URL(url);
  } catch (e) {
    showNotification('URL invalide. Exemple: https://exemple.com/fichier', 'error');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Création...';

    const response = await fetch(`${API_URL}/api/links`, {
      method: 'POST',
      headers: Auth.getHeaders(),
      body: JSON.stringify({ originalUrl: url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la création');
    }

    showNotification('Lien créé avec succès !', 'success');
    input.value = '';

    // Recharger la liste
    await loadLinks();

  } catch (error) {
    console.error('Erreur:', error);
    showNotification(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Créer le lien';
  }
}

async function loadLinks(status = 'all') {
  try {
    showLoadingState();

    const url = status === 'all'
      ? `${API_URL}/api/links`
      : `${API_URL}/api/links?status=${status}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: Auth.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des liens');
    }

    const data = await response.json();
    currentLinks = data.links;

    // Mettre à jour les compteurs dans les tabs
    updateTabCounts(currentLinks);

    // Afficher les liens
    displayLinks(currentLinks);

  } catch (error) {
    console.error('Erreur:', error);
    showNotification('Impossible de charger les liens', 'error');
  }
}

function updateTabCounts(links) {
  const allCount = links.length;
  const activeCount = links.filter(l => l.status === 'active').length;
  const pausedCount = links.filter(l => l.status === 'paused').length;

  const tabs = document.querySelectorAll('.tab-bar .tab-btn');
  if (tabs[0]) tabs[0].textContent = `Tous (${allCount})`;
  if (tabs[1]) tabs[1].textContent = `Actifs (${activeCount})`;
  if (tabs[2]) tabs[2].textContent = `Pausés (${pausedCount})`;
}

function displayLinks(links) {
  const container = document.querySelector('.panel:last-child');

  if (links.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-link"></i>
        <p>Aucun lien pour le moment. Crée ton premier lien ci-dessus pour commencer à suivre tes clics et tes gains.</p>
      </div>
    `;
    return;
  }

  let html = '<div style="padding:20px;">';

  links.forEach(link => {
    const statusColor = link.status === 'active' ? '#30a46c' : '#f76b15';
    const statusText = link.status === 'active' ? 'Actif' : 'Pausé';
    const date = new Date(link.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

    html += `
      <div class="link-card" data-link-id="${link.id}" style="background:var(--panel-bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor};"></span>
              <span style="font-size:12px;color:${statusColor};font-weight:600;text-transform:uppercase;">${statusText}</span>
              <span style="font-size:12px;color:var(--text-secondary);">• ${date}</span>
            </div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${link.originalUrl}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="text" value="${link.shortUrl}" readonly style="flex:1;padding:8px 12px;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:monospace;color:#0090ff;">
              <button class="btn btn-sm copy-btn" data-url="${link.shortUrl}">
                <i class="fa-solid fa-copy"></i> Copier
              </button>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:24px;padding:16px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:16px;">
          <div>
            <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${link.totalClicks}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Clics</div>
          </div>
          <div>
            <div style="font-size:24px;font-weight:700;color:#30a46c;">${link.totalRevenue.toFixed(4)} €</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Revenus</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;">
          ${link.status === 'active'
            ? `<button class="btn btn-sm pause-btn" data-link-id="${link.id}"><i class="fa-solid fa-pause"></i> Mettre en pause</button>`
            : `<button class="btn btn-sm activate-btn" data-link-id="${link.id}"><i class="fa-solid fa-play"></i> Activer</button>`
          }
          <button class="btn btn-sm" onclick="window.open('${link.shortUrl}', '_blank')">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Tester
          </button>
          <button class="btn btn-sm btn-danger delete-btn" data-link-id="${link.id}" style="margin-left:auto;">
            <i class="fa-solid fa-trash"></i> Supprimer
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  // Attacher les événements
  attachLinkEvents();
}

function attachLinkEvents() {
  // Bouton copier
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url');
      try {
        await navigator.clipboard.writeText(url);
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copier';
        }, 2000);
      } catch (e) {
        showNotification('Impossible de copier', 'error');
      }
    });
  });

  // Bouton pause
  document.querySelectorAll('.pause-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const linkId = btn.getAttribute('data-link-id');
      await updateLinkStatus(linkId, 'paused');
    });
  });

  // Bouton activer
  document.querySelectorAll('.activate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const linkId = btn.getAttribute('data-link-id');
      await updateLinkStatus(linkId, 'active');
    });
  });

  // Bouton supprimer
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const linkId = btn.getAttribute('data-link-id');
      if (confirm('Es-tu sûr(e) de vouloir supprimer ce lien ? Cette action est irréversible.')) {
        await deleteLink(linkId);
      }
    });
  });
}

async function updateLinkStatus(linkId, status) {
  try {
    const response = await fetch(`${API_URL}/api/links/${linkId}`, {
      method: 'PUT',
      headers: Auth.getHeaders(),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour');
    }

    showNotification(`Lien ${status === 'active' ? 'activé' : 'mis en pause'}`, 'success');
    await loadLinks();

  } catch (error) {
    console.error('Erreur:', error);
    showNotification(error.message, 'error');
  }
}

async function deleteLink(linkId) {
  try {
    const response = await fetch(`${API_URL}/api/links/${linkId}`, {
      method: 'DELETE',
      headers: Auth.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression');
    }

    showNotification('Lien supprimé avec succès', 'success');
    await loadLinks();

  } catch (error) {
    console.error('Erreur:', error);
    showNotification(error.message, 'error');
  }
}

function showLoadingState() {
  const container = document.querySelector('.panel:last-child');
  container.innerHTML = `
    <div style="padding:60px;text-align:center;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:48px;color:var(--text-secondary);"></i>
      <p style="margin-top:20px;color:var(--text-secondary);">Chargement...</p>
    </div>
  `;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    background: ${type === 'success' ? '#30a46c' : type === 'error' ? '#e5484d' : '#0090ff'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}
