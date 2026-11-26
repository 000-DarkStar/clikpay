// Script commun pour toutes les pages du dashboard
document.addEventListener('DOMContentLoaded', async function() {
  const allowed = await requireAuth();
  if (!allowed) return;

  const user = Auth.getUser();
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

    const nameElement = userPill.querySelector('span') || userPill.appendChild(document.createElement('span'));
    nameElement.textContent = name;
  });

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();
      Auth.logout();
    });
  }

  const sideNav = document.querySelector('.side-nav');
  if (sideNav && !sideNav.querySelector('a[href="support.html"]')) {
    sideNav.insertAdjacentHTML('beforeend', '<a class="side-link" href="support.html"><i class="fa-solid fa-headset"></i> Support</a>');
  }
  if (sideNav && (user.role === 'admin' || user.role === 'superadmin') && !sideNav.querySelector('a[href="admin.html"]')) {
    sideNav.insertAdjacentHTML('beforeend', '<a class="side-link" href="admin.html"><i class="fa-solid fa-shield-halved"></i> Administration</a>');
  }
});
