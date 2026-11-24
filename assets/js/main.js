// ---- theme (applied early via inline script in <head> too, this keeps it in sync) ----
let themeTransitionTimer;
function setTheme(t){
  const root = document.documentElement;
  const bgLayer = document.querySelector('.bg-layer');
  const previousTheme = root.dataset.theme;

  if(bgLayer && previousTheme && previousTheme !== t){
    clearTimeout(themeTransitionTimer);
    bgLayer.classList.add('switching');
    themeTransitionTimer = setTimeout(()=>{
      root.setAttribute('data-theme', t);
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>bgLayer.classList.remove('switching'));
      });
    }, 180);
  }else{
    root.setAttribute('data-theme', t);
  }

  document.querySelectorAll('.theme-opt').forEach(d=>d.classList.toggle('active', d.dataset.t===t));
  try{ localStorage.setItem('cp-theme', t); }catch(e){}
}
document.addEventListener('DOMContentLoaded', ()=>{
  let saved='dark';
  try{ saved = localStorage.getItem('cp-theme') || 'dark'; }catch(e){}
  setTheme(saved);

  document.querySelectorAll('.theme-opt').forEach(d=>d.addEventListener('click', ()=>setTheme(d.dataset.t)));

  // ---- navbar opacity on scroll ----
  const navEl = document.getElementById('nav');
  if(navEl){
    window.addEventListener('scroll', ()=>{ navEl.classList.toggle('scrolled', window.scrollY>30); });
  }

  // ---- language dropdown ----
  document.querySelectorAll('.lang-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      document.querySelectorAll('.lang-menu').forEach(m=>{ if(m!==menu) m.classList.remove('open'); });
      menu.classList.toggle('open');
    });
  });
  document.addEventListener('click', ()=>{
    document.querySelectorAll('.lang-menu').forEach(m=>m.classList.remove('open'));
  });
  document.querySelectorAll('.lang-menu button').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.lang-flag').forEach(f=>f.textContent = b.dataset.flag);
      document.querySelectorAll('.lang-code').forEach(f=>f.textContent = b.dataset.code);
      document.querySelectorAll('.lang-menu').forEach(m=>m.classList.remove('open'));
    });
  });

  // ---- faq accordion ----
  document.querySelectorAll('.faq-q').forEach(q=>{
    q.addEventListener('click', ()=>{
      const item = q.parentElement;
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));
      if(!wasOpen) item.classList.add('open');
    });
  });

  // ---- scroll reveal, staggered per parent group ----
  const groups = new Map();
  document.querySelectorAll('.reveal').forEach(el=>{
    const parent = el.parentElement;
    const n = groups.get(parent) || 0;
    el.style.setProperty('--rd', (n*0.09)+'s');
    groups.set(parent, n+1);
  });
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // ---- subtle parallax on the background layer ----
  const bgLayer = document.querySelector('.bg-layer');
  if(bgLayer){
    window.addEventListener('scroll', ()=>{
      bgLayer.style.transform = 'translateY(' + (window.scrollY * 0.035) + 'px)';
    }, {passive:true});
  }
});
