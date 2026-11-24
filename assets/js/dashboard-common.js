// Script commun pour toutes les pages du dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Protection de la page
  requireAuth();

  // Charger les données utilisateur
  const user = Auth.getUser();
  if (user) {
    // Mettre à jour tous les avatars et noms dans la page
    document.querySelectorAll('.user-pill').forEach(userPill => {
      const avatar = userPill.querySelector('.avatar');
      const nameSpan = userPill.childNodes[1];

      if (avatar) {
        if (user.avatarUrl) {
          // Afficher la photo de profil Google
          avatar.style.backgroundImage = `url(${user.avatarUrl})`;
          avatar.style.backgroundSize = 'cover';
          avatar.style.backgroundPosition = 'center';
          avatar.textContent = '';
        } else if (user.firstName) {
          // Afficher l'initiale
          avatar.textContent = user.firstName.charAt(0).toUpperCase();
        }
      }
      if (nameSpan && user.firstName) {
        nameSpan.textContent = ' ' + user.firstName;
      }
    });
  }

  // Gérer la déconnexion
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();
      Auth.logout();
    });
  }
});
