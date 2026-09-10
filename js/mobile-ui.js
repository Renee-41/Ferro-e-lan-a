/* Ferro & Lança — Mobile UX helpers v1
   - detecta vertical/horizontal sem alterar regras de jogo
   - transforma o log/análise da batalha em bottom sheet no retrato
   - aumenta a área tocável dos Stack Users no posicionamento
   - preserva pinch/drag existentes
*/
(function(){
  if(window.__ferroMobileUiLoaded) return;
  window.__ferroMobileUiLoaded=true;

  const root=document.documentElement;
  const body=document.body;
  if(!body) return;

  // Safe-area do iPhone sem bloquear zoom de acessibilidade do navegador.
  try{
    let viewport=document.querySelector('meta[name="viewport"]');
    if(!viewport){
      viewport=document.createElement('meta');
      viewport.name='viewport';
      document.head.appendChild(viewport);
    }
    const current=viewport.getAttribute('content')||'';
    const parts=current.split(',').map(x=>x.trim()).filter(Boolean).filter(x=>!/^viewport-fit=/i.test(x));
    if(!parts.some(x=>/^width=/i.test(x))) parts.unshift('width=device-width');
    if(!parts.some(x=>/^initial-scale=/i.test(x))) parts.push('initial-scale=1');
    parts.push('viewport-fit=cover');
    viewport.setAttribute('content',parts.join(','));
  }catch(_){ }

  const coarse=()=>{
    try{return matchMedia('(pointer:coarse)').matches;}catch(_){return false;}
  };
  const portrait=()=>innerHeight>=innerWidth;
  const mobileSize=()=>innerWidth<=900 || innerHeight<=600;

  function syncLayoutClass(){
    const isMobile=mobileSize()||coarse();
    body.classList.toggle('mobile-touch-ui',isMobile);
    body.dataset.mobileLayout=!isMobile?'desktop':(portrait()?'portrait':'landscape');
    root.style.setProperty('--ferro-vh',(innerHeight*.01)+'px');
  }
  syncLayoutClass();
  addEventListener('resize',syncLayoutClass,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(syncLayoutClass,80),{passive:true});

  /* -------- painel de análise da batalha -------- */
  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  const log=document.getElementById('log');
  const battlePanel=log&&log.closest('.panel');
  let toggle=null;

  if(wrap&&battlePanel){
    battlePanel.classList.add('mobile-battle-drawer');
    toggle=document.createElement('button');
    toggle.id='mobile-battle-panel-toggle';
    toggle.type='button';
    toggle.textContent='ANÁLISE';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls',battlePanel.id||'log');
    toggle.title='Abrir log e análise da batalha';
    wrap.appendChild(toggle);

    const setOpen=(open)=>{
      battlePanel.classList.toggle('open',!!open);
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.textContent=open?'FECHAR':'ANÁLISE';
    };
    toggle.addEventListener('click',ev=>{
      ev.preventDefault();ev.stopPropagation();
      setOpen(!battlePanel.classList.contains('open'));
    });

    document.addEventListener('pointerdown',ev=>{
      if(body.dataset.mobileLayout!=='portrait'||!battlePanel.classList.contains('open')) return;
      if(battlePanel.contains(ev.target)||toggle.contains(ev.target)) return;
      setOpen(false);
    },{passive:true});

    // Ao sair da batalha, não deixa o bottom sheet aberto por cima de outra tela.
    try{
      const battleScreen=document.getElementById('screen-battle');
      if(battleScreen){
        new MutationObserver(()=>{if(!battleScreen.classList.contains('active')) setOpen(false);})
          .observe(battleScreen,{attributes:true,attributeFilter:['class']});
      }
    }catch(_){ }
  }

  /* -------- posicionamento: hitbox maior para o dedo -------- */
  function enlargePositionHitboxes(){
    const svg=document.getElementById('position-arena');
    if(!svg) return;
    svg.querySelectorAll('g[data-champ-id]').forEach(g=>{
      if(g.querySelector('.mobile-touch-hitbox')) return;
      const base=g.querySelector('circle');
      if(!base) return;
      const hit=document.createElementNS('http://www.w3.org/2000/svg','circle');
      hit.setAttribute('class','mobile-touch-hitbox');
      hit.setAttribute('cx',base.getAttribute('cx'));
      hit.setAttribute('cy',base.getAttribute('cy'));
      hit.setAttribute('r','24');
      hit.setAttribute('fill','transparent');
      hit.setAttribute('stroke','none');
      hit.setAttribute('pointer-events','all');
      g.insertBefore(hit,g.firstChild);
    });
  }

  try{
    if(typeof renderPositionScreen==='function'){
      const baseRenderPosition=renderPositionScreen;
      renderPositionScreen=function(){
        const out=baseRenderPosition.apply(this,arguments);
        if(coarse()||mobileSize()) enlargePositionHitboxes();
        return out;
      };
    }
  }catch(_){ }

  // Garante hitbox também se a tela já estava renderizada antes do módulo carregar.
  if(coarse()||mobileSize()) enlargePositionHitboxes();

  /* -------- pequenos ajustes de rolagem -------- */
  document.addEventListener('click',ev=>{
    const nav=ev.target.closest&&ev.target.closest('.nav-btn');
    if(!nav||!mobileSize()) return;
    // Ao trocar de tela no celular, evita cair no meio do conteúdo da tela anterior.
    requestAnimationFrame(()=>{
      try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(_){ window.scrollTo(0,0); }
    });
  });

  window.FerroMobileUI={
    layout:()=>body.dataset.mobileLayout||'desktop',
    isTouch:()=>coarse(),
    closeBattlePanel:()=>{if(battlePanel&&toggle){battlePanel.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='ANÁLISE';}}
  };
})();
