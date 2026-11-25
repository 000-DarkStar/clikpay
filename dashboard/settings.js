// Gestion de la page Réglages
document.addEventListener('DOMContentLoaded', async function() {
  // Synchroniser les réglages depuis le backend
  let user;
  try {
    const response = await apiRequest('/api/user/profile');
    user = response.user;
  } catch (error) {
    showNotification(error.message, 'error');
    return;
  }

  // Charger les données utilisateur dans les champs
  if (user) {
    const pseudoInput = document.querySelector('input[type="text"]');
    const emailInput = document.querySelector('input[type="email"]');

    if (pseudoInput) {
      pseudoInput.value = user.pseudo || '';
    }
    if (emailInput) {
      emailInput.value = user.email || '';
    }
  }

  // Bouton "Enregistrer les modifications" du profil
  const saveProfileBtn = document.querySelector('.panel:nth-of-type(1) .btn-solid');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async function() {
      const pseudoInput = document.querySelector('input[type="text"]');
      const emailInput = document.querySelector('input[type="email"]');

      const pseudo = pseudoInput.value.trim();
      const email = emailInput.value.trim();

      if (!pseudo) {
        showNotification('Le pseudo ne peut pas être vide', 'error');
        return;
      }

      try {
        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enregistrement...';

        const data = await apiRequest('/api/user/profile', {
          method: 'PUT',
          body: JSON.stringify({ pseudo })
        });

        const updatedUser = data.user;
        Auth.setUser(updatedUser);

        showNotification('Profil mis à jour avec succès', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (error) {
        console.error('Erreur:', error);
        showNotification(error.message, 'error');
      } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = 'Enregistrer les modifications';
      }
    });
  }

  // Bouton "Changer le mot de passe"
  const changePasswordBtn = document.querySelector('.panel:nth-of-type(2) .btn-solid');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', async function() {
      const currentPasswordInput = document.querySelector('.panel:nth-of-type(2) input[type="password"]:nth-of-type(1)');
      const newPasswordInput = document.querySelector('.panel:nth-of-type(2) input[type="password"]:nth-of-type(2)');

      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;

      if (!currentPassword) {
        showNotification('Le mot de passe actuel est requis', 'error');
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        showNotification('Le nouveau mot de passe doit contenir au moins 6 caractères', 'error');
        return;
      }

      try {
        changePasswordBtn.disabled = true;
        changePasswordBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Changement...';

        const response = await fetch(`${API_URL}/api/user/password`, {
          method: 'PUT',
          headers: Auth.getHeaders(),
          body: JSON.stringify({
            currentPassword: currentPassword,
            newPassword: newPassword
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors du changement de mot de passe');
        }

        showNotification('Mot de passe changé avec succès', 'success');

        // Vider les champs
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
      } catch (error) {
        console.error('Erreur:', error);
        showNotification(error.message, 'error');
      } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.innerHTML = 'Changer le mot de passe';
      }
    });
  }

  // Bouton "Supprimer mon compte"
  const deleteAccountBtn = document.querySelector('.btn-danger');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async function() {
      const confirmed = confirm(
        '⚠️ ATTENTION : Cette action est irréversible !\n\n' +
        'En supprimant ton compte, tu perdras :\n' +
        '• Tous tes liens raccourcis\n' +
        '• Toutes tes statistiques\n' +
        '• Ton solde disponible\n\n' +
        'Es-tu vraiment sûr(e) de vouloir continuer ?'
      );

      if (!confirmed) return;

      const doubleConfirmed = confirm(
        'Dernière confirmation : tape OK pour supprimer définitivement ton compte.'
      );

      if (!doubleConfirmed) return;

      try {
        deleteAccountBtn.disabled = true;
        deleteAccountBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Suppression...';

        const response = await fetch(`${API_URL}/api/user/account`, {
          method: 'DELETE',
          headers: Auth.getHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la suppression');
        }

        showNotification('Compte supprimé. Redirection...', 'success');

        // Déconnexion et redirection
        setTimeout(() => {
          Auth.logout();
        }, 1500);
      } catch (error) {
        console.error('Erreur:', error);
        showNotification(error.message, 'error');
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Supprimer mon compte';
      }
    });
  }
});

// Fonction pour afficher les notifications
function showNotification(message, type = 'info') {
  // Créer l'élément de notification
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

  // Retirer après 4 secondes
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}
