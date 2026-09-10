/* Ferro & Lança — câmera manual sobre a câmera dinâmica existente.
   Scroll do mouse = zoom, pinça = zoom, duplo clique = reset.
   Câmera livre durante combate normal; cinematografia fica restrita a finishers especiais.
   preview-build: camera-free-combat-v1 */
(function(){
  const arena = document.getElementById('arena');
  if(!arena) return;

  arena.setAttribute('preserveAspectRatio','xMidYMid slice');

  let manualZoom = 1;
  let manualZoomTarget = 1;
  const MIN_ZOOM_FACTOR = 0.55; // ~182% de aproximação
  const MAX_ZOOM_FACTOR = 2.0;  // afasta até o limite da arena inteira
  let indicatorTimer = null;
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;

  const wrap = arena.closest('.arena-wrap');
  let indicator = null;
  if(wrap){
    indicator = document.createElement('div');
    indicator.id = 'camera-zoom-indicator';
    indicator.textContent = 'Zoom 100% · roda / pinça';
    wrap.appendChild(indicator);
  }

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function showIndicator(){
    if(!indicator) return;
    const pct = Math.round(100 / manualZoomTarget);
    indicator.textContent = `Zoom ${pct}% · duplo clique reseta`;
    indicator.classList.add('active');
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(()=>indicator.classList.remove('active'), 1100);
  }

  function setZoomFactor(next){
    manualZoomTarget = clamp(next, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
    showIndicator();
  }

  function distanceBetweenTouches(touches){
    const a = touches[0], b = touches[1];
    return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
  }

  arena.addEventListener('wheel', (ev)=>{
    ev.preventDefault();
    const sensitivity = ev.deltaMode===1 ? 0.035 : 0.00135;
    const factor = Math.exp(ev.deltaY * sensitivity);
    setZoomFactor(manualZoomTarget * factor);
  }, {passive:false});

  arena.addEventListener('touchstart', (ev)=>{
    if(ev.touches.length===2){
      pinchStartDistance = distanceBetweenTouches(ev.touches);
      pinchStartZoom = manualZoomTarget;
    }
  }, {passive:true});

  arena.addEventListener('touchmove', (ev)=>{
    if(ev.touches.length!==2 || !pinchStartDistance) return;
    ev.preventDefault();
    const currentDistance = distanceBetweenTouches(ev.touches);
    if(currentDistance<=0) return;
    setZoomFactor(pinchStartZoom * (pinchStartDistance/currentDistance));
  }, {passive:false});

  arena.addEventListener('touchend', (ev)=>{
    if(ev.touches.length<2) pinchStartDistance = 0;
  }, {passive:true});

  arena.addEventListener('dblclick', (ev)=>{
    ev.preventDefault();
    setZoomFactor(1);
  });

  function clampViewToArena(view){
    let w = Math.min(view.w, fullViewBox.w);
    let h = Math.min(view.h, fullViewBox.h);
    let x = view.x;
    let y = view.y;

    const maxX = fullViewBox.x + fullViewBox.w - w;
    const maxY = fullViewBox.y + fullViewBox.h - h;
    x = clamp(x, fullViewBox.x, maxX);
    y = clamp(y, fullViewBox.y, maxY);
    return {x,y,w,h};
  }

  updateCamera = function(rawDt){
    let targetX, targetY, targetW, targetH;

    if(dramaticActive){
      const u = units.find(x=>x.id===dramaticUnitId);
      if(u){
        const zoomSize = 190;
        targetW = zoomSize;
        targetH = zoomSize;
        targetX = u.rx - zoomSize/2;
        targetY = u.ry - zoomSize/2;
      } else {
        const t = computeDynamicViewTarget();
        targetX=t.x; targetY=t.y; targetW=t.w; targetH=t.h;
      }
    } else {
      const t = computeDynamicViewTarget();
      manualZoom += (manualZoomTarget-manualZoom) * Math.min(1, rawDt*0.010);
      const cx = t.x + t.w/2;
      const cy = t.y + t.h/2;
      targetW = t.w * manualZoom;
      targetH = t.h * manualZoom;
      targetX = cx - targetW/2;
      targetY = cy - targetH/2;
    }

    const safe = clampViewToArena({x:targetX,y:targetY,w:targetW,h:targetH});
    const ease = Math.min(1, rawDt*0.0038);
    camViewBox.x += (safe.x-camViewBox.x)*ease;
    camViewBox.y += (safe.y-camViewBox.y)*ease;
    camViewBox.w += (safe.w-camViewBox.w)*ease;
    camViewBox.h += (safe.h-camViewBox.h)*ease;
  };
})();

/* Remove o gatilho automático de "última unidade quase morta".
   Isso também elimina o slow motion normal, porque dramaticActive não liga nesse caso.
   Finishers continuam podendo ativar dramaticActive por conta própria. */
(function disableNormalNearDeathDrama(){
  try{
    if(typeof updateDramaticCheck!=='function') return;
    updateDramaticCheck = function(){
      if(typeof finisherActive!=='undefined' && finisherActive) return;
      if(typeof dramaticActive!=='undefined' && dramaticActive){
        dramaticActive = false;
        dramaticUnitId = null;
      }
    };
  }catch(_){ /* mantém o jogo rodando se a função não estiver disponível */ }
})();

/* Pacotes de UX/mecânica do branch de teste. */
(function loadPreviewModules(){
  const styleHref='css/mobile-responsive.css?v=mobile-ux-1';
  if(!document.querySelector('link[data-ferro-style="mobile-responsive"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=styleHref;
    link.dataset.ferroStyle='mobile-responsive';
    (document.head||document.documentElement).appendChild(link);
  }

  const modules = [
    ['combat-feedback','js/combat-feedback.js?v=combat-polish-2'],
    ['combat-polish','js/combat-polish.js?v=combat-polish-1'],
    ['biome-mechanics','js/biome-mechanics.js?v=biome-mechanics-1'],
    ['impact-surprise','js/impact-surprise.js?v=impact-surprise-1'],
    ['signature-vfx','js/signature-vfx.js?v=signature-vfx-1'],
    ['time-controls','js/time-controls.js?v=time-controls-1'],
    ['item-experience','js/item-experience.js?v=item-experience-1'],
    ['shooter-items','js/shooter-items.js?v=shooter-items-1'],
    ['rupture-endgame','js/rupture-endgame.js?v=rupture-endgame-1'],
    ['cinematic-combat','js/cinematic-combat.js?v=cinematic-combat-2'],
    ['mobile-ui','js/mobile-ui.js?v=mobile-ux-1']
  ];
  modules.forEach(([key,src])=>{
    if(document.querySelector(`script[data-ferro-module="${key}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.ferroModule = key;
    (document.head || document.documentElement).appendChild(s);
  });
})();
