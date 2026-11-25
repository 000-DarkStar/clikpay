async function startOAuth(provider) {
  if (!window.supabase) {
    alert('Impossible de charger Supabase. Rechargez la page.');
    return;
  }

  const client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: 'https://www.clikpay.fr/auth/callback.html'
    }
  });

  if (error) alert(error.message);
}

function setupOAuthButtons(page) {
  const container = document.querySelector('.oauth');
  if (!container) return;

  container.innerHTML = `
    <button type="button" id="oauthGoogle"><i class="fa-brands fa-google"></i> Google</button>
    <button type="button" id="oauthDiscord"><i class="fa-brands fa-discord"></i> Discord</button>
  `;

  const google = document.getElementById('oauthGoogle');
  const discord = document.getElementById('oauthDiscord');

  google.addEventListener('click', () => {
    if (page === 'register' && !document.getElementById('tos')?.checked) {
      alert('Veuillez accepter les conditions d’utilisation.');
      return;
    }
    window.location.href = 'https://api.clikpay.fr/auth/google';
  });

  discord.addEventListener('click', async () => {
    if (page === 'register' && !document.getElementById('tos')?.checked) {
      alert('Veuillez accepter les conditions d’utilisation.');
      return;
    }
    await startOAuth('discord');
  });

  const update = () => {
    const turnstileReady = page === 'register'
      ? !!window.registerTurnstileToken
      : !!document.querySelector('[name="cf-turnstile-response"]')?.value;

    const ready = turnstileReady && (page !== 'register' || document.getElementById('tos')?.checked);
    google.disabled = !ready;
    discord.disabled = !ready;
  };

  document.addEventListener('change', update);
  document.addEventListener('input', update);
  setInterval(update, 300);
  update();
}

window.setupOAuthButtons = setupOAuthButtons;
