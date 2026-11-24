// Système de notification
function showNotification(message, duration = 2000) {
  // Créer l'élément de notification
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;

  // Styles
  notification.style.cssText = `
    position: fixed;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 32px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    transition: top 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;

  document.body.appendChild(notification);

  // Animation d'entrée
  setTimeout(() => {
    notification.style.top = '20px';
  }, 10);

  // Animation de sortie
  setTimeout(() => {
    notification.style.top = '-100px';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 400);
  }, duration);
}

// Vérifier si c'est une nouvelle connexion
const justLoggedIn = sessionStorage.getItem('just_logged_in');
if (justLoggedIn === 'true') {
  const user = JSON.parse(localStorage.getItem('clikpay_user') || '{}');
  const name = user.firstName || 'utilisateur';
  showNotification(`Bienvenue ${name} !`);
  sessionStorage.removeItem('just_logged_in');
}

// Export
window.showNotification = showNotification;
