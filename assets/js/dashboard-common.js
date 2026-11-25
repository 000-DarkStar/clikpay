// Script commun pour toutes les pages du dashboard
document.addEventListener('DOMContentLoaded', async function() {
  const allowed = await requireAuth();
  if (!allowed) return;

  const user = await Auth.syncUser();
  if (!user) return;

  document.querySelectorAll('.user-pill').forEach(userPill => {
    const avatar = userPill.querySelector('.avatar');
    const name = user.pseudo || user.firstName || user.email;

    if (avatar) {
      avatar.style.backgroundImage = user.avatarUrl ? `url("${user.avatarUrl}")` : '';
      avatar.style.backgroundSize = user.avatarUrl ? 'cover' : '';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = user.avatarUrl ? '' : name.charAt(0).toUpperCase();
    }

    const textNodes = Array.from(userPill.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    if (textNodes.length) textNodes[textNodes.length - 1].textContent = ' ' + name;
    else userPill.append(document.createTextNode(' ' + name));
  });

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();
      Auth.logout();
    });
  }
});
