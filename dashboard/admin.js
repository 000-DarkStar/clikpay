document.addEventListener('DOMContentLoaded', async () => {
  const allowed = await requireAuth();
  if (!allowed) return;

  try {
    const stats = await apiRequest('/api/admin/stats');
    document.getElementById('adminStats').innerHTML = `
      <div class="kpi"><div class="lbl">Utilisateurs</div><div class="val">${stats.users}</div></div>
      <div class="kpi"><div class="lbl">Liens</div><div class="val">${stats.links}</div></div>
      <div class="kpi"><div class="lbl">Clics</div><div class="val">${stats.clicks}</div></div>
      <div class="kpi"><div class="lbl">Tickets</div><div class="val">${stats.tickets}</div></div>`;
    await loadUsers();
    await loadLinks();
    await loadTickets();
  } catch (error) {
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminDenied').style.display = 'block';
  }

  async function loadUsers(search = '') {
    const result = await apiRequest(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    document.getElementById('adminUsers').innerHTML = (result.users || []).map(user => `
      <div style="padding:12px 16px;border-top:1px solid var(--border)"><strong>${escapeHTML(user.pseudo || user.email)}</strong><div style="color:var(--text-dim);font-size:.82rem">${escapeHTML(user.email)}</div>
      <button class="btn btn-sm" style="margin-top:8px" onclick="toggleUser('${user.id}', ${!user.suspended})">${user.suspended ? 'Réactiver' : 'Suspendre'}</button></div>`).join('') || '<div class="empty-state"><p>Aucun utilisateur.</p></div>';
  }

  async function loadLinks(search = '') {
    const result = await apiRequest(`/api/admin/links${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    document.getElementById('adminLinks').innerHTML = (result.links || []).map(link => `
      <div style="padding:12px 16px;border-top:1px solid var(--border)"><strong>${escapeHTML(link.short_code)}</strong><div style="font-size:.82rem;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis">${escapeHTML(link.original_url)}</div>
      <button class="btn btn-sm" style="margin-top:8px" onclick="toggleLink('${link.id}', '${link.status === 'active' ? 'paused' : 'active'}')">${link.status === 'active' ? 'Désactiver' : 'Réactiver'}</button></div>`).join('') || '<div class="empty-state"><p>Aucun lien.</p></div>';
  }

  async function loadTickets() {
    const result = await apiRequest('/api/support/admin/tickets');
    document.getElementById('adminTickets').innerHTML = (result.tickets || []).map(ticket => `
      <div style="padding:14px 16px;border-top:1px solid var(--border)"><strong>${escapeHTML(ticket.number)}</strong> — ${escapeHTML(ticket.subject)}<div style="font-size:.82rem;color:var(--text-dim)">${escapeHTML(ticket.status)} · ${escapeHTML(ticket.category)}</div>
      <button class="btn btn-sm" style="margin-top:8px" onclick="closeTicket('${ticket.id}')">Résoudre / fermer</button></div>`).join('') || '<div class="empty-state"><p>Aucun ticket.</p></div>';
  }

  document.getElementById('adminUserSearch').addEventListener('input', e => loadUsers(e.target.value));
  document.getElementById('adminLinkSearch').addEventListener('input', e => loadLinks(e.target.value));

  window.toggleUser = async (id, suspended) => {
    await apiRequest(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ suspended }) });
    await loadUsers(document.getElementById('adminUserSearch').value);
  };
  window.toggleLink = async (id, status) => {
    await apiRequest(`/api/admin/links/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    await loadLinks(document.getElementById('adminLinkSearch').value);
  };
  window.closeTicket = async id => {
    await apiRequest(`/api/support/admin/tickets/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) });
    await loadTickets();
  };

  function escapeHTML(value) {
    const div = document.createElement('div'); div.textContent = String(value || ''); return div.innerHTML;
  }
});
