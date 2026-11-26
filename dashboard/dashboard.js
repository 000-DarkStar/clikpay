document.addEventListener('DOMContentLoaded', ()=>{
  // theme (shared logic, same storage key as the public site)
  function setTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-opt').forEach(d=>d.classList.toggle('active', d.dataset.t===t));
    try{ localStorage.setItem('cp-theme', t); }catch(e){}
  }
  let saved='dark';
  try{ saved = localStorage.getItem('cp-theme') || 'dark'; }catch(e){}
  setTheme(saved);
  document.querySelectorAll('.theme-opt').forEach(d=>d.addEventListener('click', ()=>setTheme(d.dataset.t)));

  // mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const burger = document.getElementById('dashBurger');
  if(burger) burger.addEventListener('click', ()=> sidebar.classList.toggle('open'));

  // payment method selection — exactly one chosen
  document.querySelectorAll('.pm-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      document.querySelectorAll('.pm-card').forEach(c=>c.classList.remove('selected'));
      document.querySelectorAll('.config-form').forEach(f=>f.classList.remove('show'));
      card.classList.add('selected');
      const target = document.getElementById('cfg-'+card.dataset.method);
      if(target) target.classList.add('show');
    });
  });

  // generic tab bars (date range, link filters)
  document.querySelectorAll('.tab-bar').forEach(bar=>{
    bar.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        bar.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });
});
