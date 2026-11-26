document.addEventListener('DOMContentLoaded', async () => {
  const allowed = await requireAuth();
  if (!allowed) return;

  const list = document.getElementById('ticketList');
  const createBtn = document.getElementById('createTicketBtn');

  let currentTickets = [];

  async function loadTickets() {
    try {
      const result = await apiRequest('/api/support/tickets');
      const tickets = result.tickets || [];
      currentTickets = tickets;
      if (!tickets.length) {
        list.className = 'empty-state';
        list.innerHTML = '<i class="fa-solid fa-headset"></i><p>Aucun ticket pour le moment.</p>';
        return;
      }
      list.className = '';
      list.innerHTML = tickets.map(ticket => `
        <article style="padding:16px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;gap:12px"><strong>${ticket.number}</strong><span>${ticket.status}</span></div>
          <div style="margin-top:8px;font-weight:600">${escapeHTML(ticket.subject)}</div>
          <div style="margin-top:6px;color:var(--text-dim)">${escapeHTML(ticket.category)}</div>
          <button class="btn btn-sm" style="margin-top:10px" onclick="openSupportTicket('${ticket.id}')">Ouvrir</button>
        </article>`).join('');
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><p>${escapeHTML(error.message)}</p></div>`;
    }
  }

  createBtn.addEventListener('click', async () => {
    try {
      createBtn.disabled = true;
      await apiRequest('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: document.getElementById('ticketCategory').value,
          subject: document.getElementById('ticketSubject').value,
          message: document.getElementById('ticketMessage').value,
          priority: 'normal'
        })
      });
      document.getElementById('ticketSubject').value = '';
      document.getElementById('ticketMessage').value = '';
      await loadTickets();
    } catch (error) {
      alert(error.message);
    } finally {
      createBtn.disabled = false;
    }
  });

  window.openSupportTicket = async (ticketId) => {
    const ticket = currentTickets.find(item => item.id === ticketId);
    if (!ticket) return;
    const messages = ticket.support_messages || [];
    list.innerHTML = `
      <article style="padding:16px">
        <button class="btn btn-sm" onclick="loadSupportTickets()"><i class="fa-solid fa-arrow-left"></i> Retour</button>
        <h3 style="margin-top:16px">${escapeHTML(ticket.number)} — ${escapeHTML(ticket.subject)}</h3>
        <div style="color:var(--text-dim);margin-top:6px">Statut : ${escapeHTML(ticket.status)}</div>
        <div style="margin-top:16px">${messages.map(message => `<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px"><small>${escapeHTML(message.author_role)}</small><p style="margin-top:6px">${escapeHTML(message.message)}</p></div>`).join('')}</div>
        ${ticket.status === 'closed' ? '' : `<textarea id="ticketReply" rows="5" style="width:100%;margin-top:12px" placeholder="Votre réponse"></textarea><button class="btn btn-solid" style="margin-top:10px" onclick="sendSupportReply('${ticket.id}')">Répondre</button>`}
      </article>`;
  };

  window.loadSupportTickets = () => loadTickets();
  window.sendSupportReply = async (ticketId) => {
    const reply = document.getElementById('ticketReply');
    if (!reply || !reply.value.trim()) return;
    try {
      await apiRequest(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.value })
      });
      await loadTickets();
      window.openSupportTicket(ticketId);
    } catch (error) {
      alert(error.message);
    }
  };

  function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }

  await loadTickets();
});
