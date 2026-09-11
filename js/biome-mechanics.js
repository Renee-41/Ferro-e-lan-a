/* Ferro & Lança — biomas com efeito mecânico real.
   Campo Verde: regeneração leve e universal a cada 5s.
   Terreno Corrompido: veios instáveis determinísticos causam dano periódico.
   Tudo vale para os dois lados para manter a regra simétrica.
*/
(function(){
  if(window.__ferroBiomeMechanicsV1) return;
  window.__ferroBiomeMechanicsV1 = true;

  const arena = document.getElementById('arena');
  const wrap = arena && arena.closest('.arena-wrap');
  if(!arena || !wrap) return;
  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const NS='http://www.w3.org/2000/svg';
  const layer=document.createElementNS(NS,'svg');
  layer.id='biome-mechanics-overlay';
  layer.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio')||'xMidYMid slice');
  Object.assign(layer.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'9',overflow:'hidden'});
  wrap.appendChild(layer);

  const chip=document.createElement('div');
  chip.id='biome-mechanics-chip';
  Object.assign(chip.style,{
    position:'absolute',left:'10px',top:'27px',zIndex:'10',pointerEvents:'none',
    padding:'5px 8px',borderRadius:'999px',background:'rgba(10,12,14,.72)',
    border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 4px 14px rgba(0,0,0,.22)',
    color:'#c9c1b7',fontFamily:'JetBrains Mono, monospace',fontSize:'9px',letterSpacing:'.02em',
    opacity:'.86',backdropFilter:'blur(3px)'
  });
  wrap.appendChild(chip);

  let greenElapsed=0;
  let corruptElapsed=0;
  let lastBiome=null;
  let lastDraw=0;

  function safeHexNoise(q,r,salt){
    try{ if(typeof hexNoise==='function') return hexNoise(q,r,salt); }catch(_){ /* fallback */ }
    let h=(q*374761393+r*668265263+salt*2246822519)|0;
    h=(h^(h>>>13))*1274126177;
    h=h^(h>>>16);
    return ((h>>>0)%1000)/1000;
  }
  function unstableHex(h){ return safeHexNoise(h.q,h.r,177)>.80; }
  function isBlockedForBiome(h){
    try{
      const k=hexKey(h);
      return obstacleHexes.has(k)||voidHexes.has(k)||hazardHexes.has(k);
    }catch(_){ return false; }
  }
  function currentUnits(){
    try{ return Array.isArray(units)?units.filter(u=>u&&u.alive):[]; }
    catch(_){ return []; }
  }
  function biome(){
    try{ return currentBiome; }
    catch(_){ return null; }
  }

  function updateChip(){
    const b=biome();
    if(b==='grama'){
      chip.textContent='🌿 Campo Verde · regenera 1,5% da vida a cada 5s';
      chip.style.borderColor='rgba(94,154,92,.24)';
      chip.style.color='#9fc89d';
      chip.style.display='block';
    }else if(b==='rachadura'){
      chip.textContent='✦ Terreno Corrompido · veios pulsantes causam 2,5% de dano';
      chip.style.borderColor='rgba(185,140,240,.28)';
      chip.style.color='#c6a6ec';
      chip.style.display='block';
    }else chip.style.display='none';
  }

  function runGreen(dt){
    greenElapsed+=Math.max(0,Number(dt)||0);
    if(greenElapsed<5000) return;
    greenElapsed%=5000;
    currentUnits().forEach(u=>{
      if(u.hp>=u.maxhp || isBlockedForBiome(u)) return;
      const heal=Math.max(1,Math.round(u.maxhp*.015));
      u.hp=Math.min(u.maxhp,u.hp+heal);
      try{ spawnFloatText(u.rx,u.ry-27,'+'+heal,'#7fd58a'); }catch(_){ /* noop */ }
      try{ spawnCastEffect(u.rx,u.ry,'#5f9b62'); }catch(_){ /* noop */ }
    });
  }

  function runCorrupted(dt){
    corruptElapsed+=Math.max(0,Number(dt)||0);
    if(corruptElapsed<3500) return;
    corruptElapsed%=3500;
    currentUnits().forEach(u=>{
      if(!unstableHex(u) || isBlockedForBiome(u)) return;
      const dmg=Math.max(2,Math.round(u.maxhp*.025));
      try{
        if(typeof applyDamage==='function'){
          applyDamage({element:'corrupted',team:'environment',champId:'biome_corrompido',name:'Terreno Corrompido',range:2},u,dmg,'✦',true);
        }else{
          u.hp-=dmg;
          spawnFloatText(u.rx,u.ry-27,'✦ '+dmg,'#c6a6ec');
        }
      }catch(_){ /* preserva combate caso algo esteja indisponível */ }
    });
  }

  function runMechanics(dt){
    let active=false;
    try{ active=!!battleActive; }catch(_){ active=false; }
    if(!active) return;
    try{ if(finisherActive) return; }catch(_){ /* noop */ }
    const b=biome();
    if(b!==lastBiome){
      lastBiome=b;
      // Mantém o primeiro pulso ~1,8s depois da entrada no bioma, mas agora em tempo de batalha.
      greenElapsed=3200;
      corruptElapsed=1700;
      updateChip();
    }
    if(b==='grama') runGreen(dt);
    else if(b==='rachadura') runCorrupted(dt);
  }

  try{
    if(typeof updateBattleLogic==='function'){
      const originalUpdateBattleLogic=updateBattleLogic;
      updateBattleLogic=function(dt){
        const result=originalUpdateBattleLogic(dt);
        runMechanics(dt);
        return result;
      };
    }
  }catch(_){ /* mantém jogo original se não puder envelopar */ }

  function syncViewBox(){
    const vb=arena.getAttribute('viewBox');
    if(vb) layer.setAttribute('viewBox',vb);
    else{
      try{ layer.setAttribute('viewBox',`${camViewBox.x} ${camViewBox.y} ${camViewBox.w} ${camViewBox.h}`); }catch(_){ /* noop */ }
    }
    layer.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio')||'xMidYMid slice');
  }

  function drawCorrupted(now){
    if(biome()!=='rachadura') return;
    let active=false;
    try{ active=!!battleActive; }catch(_){ active=false; }
    if(!active) return;
    let hexes=[];
    try{ hexes=Array.isArray(allHexes)?allHexes:[]; }catch(_){ return; }
    const pulse=.34+.24*Math.sin(now/260);
    hexes.forEach(h=>{
      if(!unstableHex(h)||isBlockedForBiome(h)) return;
      try{
        const p=hexToPixel(h.q,h.r);
        const poly=document.createElementNS(NS,'polygon');
        poly.setAttribute('points',hexPoints(p.x,p.y));
        poly.setAttribute('fill','rgba(133,72,173,.055)');
        poly.setAttribute('stroke','#c49af3');
        poly.setAttribute('stroke-width','1.4');
        poly.setAttribute('stroke-dasharray','3 4');
        poly.setAttribute('stroke-opacity',pulse.toFixed(2));
        poly.setAttribute('vector-effect','non-scaling-stroke');
        layer.appendChild(poly);
        const core=document.createElementNS(NS,'circle');
        core.setAttribute('cx',p.x);core.setAttribute('cy',p.y);core.setAttribute('r',(2.4+pulse*2.5).toFixed(1));
        core.setAttribute('fill','#b98cf0');core.setAttribute('opacity',(.18+pulse*.35).toFixed(2));
        layer.appendChild(core);
      }catch(_){ /* noop */ }
    });
  }

  function frame(now){
    syncViewBox();
    if(now-lastDraw>70){
      lastDraw=now;
      layer.replaceChildren();
      drawCorrupted(now);
      updateChip();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();