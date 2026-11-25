// Gestion de la navbar avec menu utilisateur
document.addEventListener('DOMContentLoaded', function() {
  const authButtons = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');

  if (!authButtons || !userMenu) return;

  const user = Auth.getUser();

  if (user && Auth.isLoggedIn()) {
    // Utilisateur connecté : afficher le menu utilisateur
    authButtons.style.display = 'none';
    userMenu.style.display = 'block';

    // Afficher les infos utilisateur
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarLarge = document.getElementById('userAvatarLarge');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    // Avatar : photo ou initiale
    const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
    if (user.avatarUrl) {
      userAvatar.innerHTML = `<img src="${user.avatarUrl}" alt="${user.firstName}">`;
      userAvatarLarge.innerHTML = `<img src="${user.avatarUrl}" alt="${user.firstName}">`;
    } else {
      userAvatar.textContent = initial;
      userAvatarLarge.textContent = initial;
    }

    // Nom complet
    userName.textContent = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.email;

    // Email avec @
    userEmail.textContent = user.email;

    // Gestion du toggle du menu
    const menuTrigger = document.querySelector('.user-menu-trigger');
    const dropdown = document.querySelector('.user-dropdown');

    if (menuTrigger && dropdown) {
      menuTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        menuTrigger.classList.toggle('active');
        dropdown.classList.toggle('active');
      });

      // Fermer le menu si on clique ailleurs
      document.addEventListener('click', function(e) {
        if (!userMenu.contains(e.target)) {
          menuTrigger.classList.remove('active');
          dropdown.classList.remove('active');
        }
      });
    }

    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        Auth.logout();
        window.location.href = '/login.html';
      });
    }
  } else {
    // Utilisateur non connecté : afficher les boutons de connexion
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
  }
});
