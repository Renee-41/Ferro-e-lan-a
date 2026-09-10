/* Ferro & Lança — feedback visual de combate.
   1) destaca movimento/alcance/alvo ao apontar ou selecionar uma unidade
   2) mostra previsão aproximada do próximo ataque
   3) reforça animação de ataque (projétil/rastro ou corte/impacto)
   4) substitui números básicos por floaters mais legíveis de dano/cura
*/
(function(){
  if(window.__ferroCombatFeedbackV1) return;
  window.__ferroCombatFeedbackV1 = true;

  const arena = document.getElementById('arena');
  const wrap = arena && arena.closest('.arena-wrap');
  if(!arena || !wrap) return;

  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const NS = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(NS, 'svg');
  overlay.id = 'combat-feedback-overlay';
  overlay.setAttribute('preserveAspectRatio', arena.getAttribute('preserveAspectRatio') || 'xMidYMid slice');
  Object.assign(overlay.style, {
    position:'absolute', inset:'0', width:'100%', height:'100%',
    pointerEvents:'none', zIndex:'12', overflow:'visible'
  });
  wrap.appendChild(overlay);

  const tooltip = document.createElement('div');
  tooltip.id = 'combat-feedback-tooltip';
  Object.assign(tooltip.style, {
    position:'absolute', display:'none', zIndex:'13', pointerEvents:'none',
    minWidth:'170px', maxWidth:'230px', padding:'8px 10px', borderRadius:'8px',
    border:'1px solid rgba(232,194,80,.65)', background:'rgba(12,13,16,.93)',
    boxShadow:'0 8px 24px rgba(0,0,0,.38)', color:'#e8e0d4',
    fontFamily:'JetBrains Mono, monospace', fontSize:'11px', lineHeight:'1.35'
  });
  wrap.appendChild(tooltip);

  let hoveredUnitId = null;
  let selectedUnitId = null;
  let pointerDown = null;
  let attackFx = [];
  let combatFloaters = [];
  let pendingCriticalUntil = 0;
  const seenAttackStarts = new Map();

  function el(name, attrs){
    const node = document.createElementNS(NS, name);
    Object.entries(attrs||{}).forEach(([k,v])=> node.setAttribute(k, String(v)));
    return node;
  }

  function worldPointFromEvent(ev){
    try{
      const pt = arena.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const m = arena.getScreenCTM();
      if(!m) return null;
      return pt.matrixTransform(m.inverse());
    }catch(_){ return null; }
  }

  function livingUnits(){
    try{ return Array.isArray(units) ? units.filter(u=>u && u.alive) : []; }
    catch(_){ return []; }
  }

  function pickUnitAt(worldPt){
    if(!worldPt) return null;
    let best = null, bestDist = Infinity;
    livingUnits().forEach(u=>{
      const d = Math.hypot(worldPt.x-u.rx, worldPt.y-u.ry);
      const radius = u.isBoss ? 26 : 21;
      if(d <= radius && d < bestDist){ best = u; bestDist = d; }
    });
    return best;
  }

  arena.addEventListener('pointerdown', ev=>{
    if(ev.button!==0) return;
    pointerDown = {x:ev.clientX, y:ev.clientY};
  }, {passive:true});

  arena.addEventListener('pointermove', ev=>{
    const p = worldPointFromEvent(ev);
    const hit = pickUnitAt(p);
    hoveredUnitId = hit ? hit.id : null;
    arena.style.cursor = hit ? 'pointer' : '';
  }, {passive:true});

  arena.addEventListener('pointerleave', ()=>{
    hoveredUnitId = null;
    arena.style.cursor = '';
  }, {passive:true});

  arena.addEventListener('pointerup', ev=>{
    if(ev.button!==0 || !pointerDown) return;
    const moved = Math.hypot(ev.clientX-pointerDown.x, ev.clientY-pointerDown.y);
    pointerDown = null;
    if(moved > 7) return;
    const hit = pickUnitAt(worldPointFromEvent(ev));
    selectedUnitId = hit ? (selectedUnitId===hit.id ? null : hit.id) : null;
  }, {passive:true});

  function safeCountItem(u,id){
    try{ return typeof countItem==='function' ? countItem(u,id) : 0; }
    catch(_){ return 0; }
  }
  function safePassiveAmp(u){
    try{ return typeof passiveAmp==='function' ? passiveAmp(u) : 1; }
    catch(_){ return 1; }
  }
  function safeAuraMult(u){
    try{ return typeof jedegarAuraMultiplier==='function' ? jedegarAuraMultiplier(u) : 1; }
    catch(_){ return 1; }
  }
  function safeElemMult(a,b){
    try{ return typeof elemMultiplier==='function' ? elemMultiplier(a,b) : 1; }
    catch(_){ return 1; }
  }
  function safeHexDistance(a,b){
    try{ return typeof hexDistance==='function' ? hexDistance(a,b) : 999; }
    catch(_){ return 999; }
  }

  function predictedTarget(u){
    try{
      if(typeof nearestEnemy==='function') return nearestEnemy(u);
    }catch(_){ /* fallback abaixo */ }
    const enemies = livingUnits().filter(o=>o.team!==u.team);
    enemies.sort((a,b)=>safeHexDistance(u,a)-safeHexDistance(u,b));
    return enemies[0] || null;
  }

  function isImmuneNow(target, now){
    return !!(
      (target.frenzyUntil && now < target.frenzyUntil) ||
      (target.barrierUntil && now < target.barrierUntil) ||
      (target.ghostUntil && now < target.ghostUntil) ||
      (target.champId==='raio' && target.comboActive) ||
      (target.voltraDetonateUntil && now < target.voltraDetonateUntil)
    );
  }

  function predictAttack(u,target){
    if(!u || !target) return null;
    const now = performance.now();
    const dist = safeHexDistance(u,target);
    let base = Number(u.atk)||0;
    let ignoreDefense = false;
    let hits = 1;
    let proc = '';

    if(u.range>1) base = Math.round(base * (1 + Math.max(0,dist-1)*0.08));
    if(u.champId==='shecry'){
      const missingFrac = 1 - (u.hp/u.maxhp);
      base = Math.round(base*(1 + missingFrac*1.2));
    }

    const nextHit = (u.hitCount||0)+1;
    if(u.special==='lanca' && nextHit%3===0){ base=Math.round(base*1.8); proc='Lança reforçada'; }
    if(u.special==='perfuro' && nextHit%4===0){ base=Math.round(base*1.6); ignoreDefense=true; proc='Perfuração'; }
    if(u.special==='rajada' && nextHit%3===0){ hits=2; proc='Rajada dupla'; }
    if(u.special==='furia'){
      const missing = 1-(u.hp/u.maxhp);
      base = Math.round(base*(1+missing*0.8));
      const inFrenzy = u.frenzyUntil && now<u.frenzyUntil;
      if(inFrenzy) base = Math.round(base*(1.5 + 0.10*((u.stars||1)-1)));
      if(nextHit%4===0){ base=Math.round(base*1.6); proc='Golpe flamejante'; }
    }
    if(u.special==='couraca' && nextHit%4===0){ base=Math.round(base*1.5); proc='Tremor'; }
    if(u.special==='ima' && nextHit%4===0 && (u.imaUsesLeft||0)>0){ base=Math.round(base*1.5); proc='Ímã'; }
    if(u.special==='congelamento'){
      const interval = u.champId==='frosk' ? 4 : 5;
      if(nextHit%interval===0){
        if(u.champId==='frosk') base=Math.round(base*1.3);
        proc='Congelamento';
      }
    }

    let mult = safeElemMult(u.element,target.element);
    let dmg = Math.round(base * mult * safeAuraMult(u) *
      (u.jedegarDeathBuffUntil && now<u.jedegarDeathBuffUntil ? 1.25 : 1) *
      (u.shavaSecretBonus ? 1.15 : 1) *
      (u.shavaWeakenUntil && now<u.shavaWeakenUntil ? 0.75 : 1));

    if(u.champId==='gelida' && u.gelidaDmgBuffUntil && now<u.gelidaDmgBuffUntil) dmg=Math.round(dmg*2);
    if(target.vulnerableUntil && now<target.vulnerableUntil) dmg=Math.round(dmg*1.15);

    if(!ignoreDefense){
      let reduction = target.dmgReduction || 0;
      if(target.barrierUntil && now<target.barrierUntil) reduction=Math.min(.9,reduction+0.15*(target.stars||1)*safePassiveAmp(target));
      if(target.element==='metal'){
        try{
          const aura = units.find(o=>o.alive && o.team===target.team && o.champId==='ima' && o.id!==target.id && safeHexDistance(o,target)<=1);
          if(aura) reduction += 0.08*safePassiveAmp(aura);
        }catch(_){ /* nada */ }
      }
      if(target.champId==='shecry') reduction += (target.hp/target.maxhp)*0.35;
      if(target.crateShieldUntil && now<target.crateShieldUntil) reduction += 0.10;
      if(target.special==='couraca') dmg=Math.round(dmg*0.8);
      let armorPen = 0;
      const serra = safeCountItem(u,'punho_serra');
      if(serra>0) armorPen=Math.max(armorPen,0.15*serra);
      if(safeCountItem(u,'carniceiro')>0) armorPen=Math.max(armorPen,0.25);
      if(safeCountItem(u,'fio_mortal')>0) armorPen=Math.max(armorPen,0.25);
      if(armorPen>0) reduction = reduction*(1-Math.min(1,armorPen));
      try{ if(typeof jedegarEnemyDefenseDebuff==='function' && jedegarEnemyDefenseDebuff(target)) reduction=Math.max(0,reduction-0.30); }catch(_){ /* nada */ }
      if(target.jedegarShieldUntil && now<target.jedegarShieldUntil) reduction=Math.min(.9,reduction+0.20);
      if(target.champId==='frosk') reduction=Math.min(.9,reduction+0.15);
      if(target.shavaArmorDebuffUntil && now<target.shavaArmorDebuffUntil) reduction=Math.max(0,reduction-0.20);
      if(reduction) dmg=Math.round(dmg*(1-reduction));
    }

    if(isImmuneNow(target,now)) dmg=0;
    let shieldAbsorb = 0;
    if(target.shecryShield>0 && dmg>0){
      shieldAbsorb=Math.min(dmg,target.shecryShield);
      dmg-=shieldAbsorb;
    }

    const critChance = safeCountItem(u,'furia_crescente')>0 ? 0.18 : 0;
    const critDmg = critChance ? Math.round(dmg*1.5) : null;
    let dodgeChance = 0;
    if(target.element==='vento' && !ignoreDefense){
      let isBot = false;
      try{ isBot = !!(ENEMY_CATALOG && ENEMY_CATALOG[target.champId]); }catch(_){ /* nada */ }
      const low = target.hp/target.maxhp < 0.40;
      dodgeChance = isBot ? (low?.20:.10) : (low?.30:.20);
    }
    const windMiss = (typeof currentWeather!=='undefined' && currentWeather==='vento_forte' && u.range>1) ? .15 : 0;

    return {dmg, critDmg, critChance, dodgeChance, windMiss, dist, mult, hits, proc, ignoreDefense, shieldAbsorb};
  }

  function addHexPolygon(h, fill, stroke, width, opacity, dash){
    try{
      const p = hexToPixel(h.q,h.r);
      const poly = el('polygon', {
        points:hexPoints(p.x,p.y), fill, stroke, 'stroke-width':width,
        opacity, 'vector-effect':'non-scaling-stroke'
      });
      if(dash) poly.setAttribute('stroke-dasharray',dash);
      overlay.appendChild(poly);
    }catch(_){ /* jogo ainda não inicializou grade */ }
  }

  function drawUnitContext(u, now){
    if(!u || !u.alive) return;
    const target = predictedTarget(u);
    const pulse = 0.65 + 0.35*Math.sin(now/150);

    const selectedRing = el('circle', {
      cx:u.rx, cy:u.ry, r:u.isBoss?29:23, fill:'none', stroke:'#e8c250',
      'stroke-width':2.2, opacity:pulse.toFixed(2), 'stroke-dasharray':'5 3',
      'vector-effect':'non-scaling-stroke'
    });
    overlay.appendChild(selectedRing);

    try{
      const occupied = typeof occupiedMap==='function' ? occupiedMap() : {};
      if(!u.cantMove){
        neighbors(u).filter(h=>inGrid(h) && !isBlockedTile(h) && occupied[hexKey(h)]===undefined)
          .forEach(h=>addHexPolygon(h,'rgba(63,127,168,.17)','#5aa8df',1.4,.9,'4 3'));
      }
      if(Array.isArray(allHexes)){
        allHexes.filter(h=>safeHexDistance(u,h)<=Math.max(1,u.range||1) && !(h.q===u.q && h.r===u.r))
          .forEach(h=>addHexPolygon(h,'rgba(201,77,61,.075)','#cf6658',1.15,.72,'2 4'));
      }
    }catch(_){ /* sem grade pronta */ }

    if(target){
      const targetPulse = 0.55 + 0.45*Math.sin(now/105);
      overlay.appendChild(el('line', {
        x1:u.rx, y1:u.ry, x2:target.rx, y2:target.ry,
        stroke:'#ef7665', 'stroke-width':1.8, opacity:.72, 'stroke-dasharray':'6 5',
        'vector-effect':'non-scaling-stroke'
      }));
      overlay.appendChild(el('circle', {
        cx:target.rx, cy:target.ry, r:target.isBoss?31:24, fill:'rgba(201,77,61,.08)',
        stroke:'#ef6655', 'stroke-width':2.4, opacity:targetPulse.toFixed(2),
        'vector-effect':'non-scaling-stroke'
      }));
      drawTooltip(u,target);
    } else {
      drawTooltip(u,null);
    }
  }

  function drawTooltip(u,target){
    let html = `<div style="font-family:Oswald,sans-serif;font-size:13px;font-weight:700;color:#f0d27a;margin-bottom:4px">${u.name}</div>`;
    html += `<div>HP <b>${Math.max(0,Math.round(u.hp))}/${Math.round(u.maxhp)}</b> · ATK <b>${Math.round(u.atk)}</b> · alcance <b>${u.range}</b></div>`;
    if(target){
      const p = predictAttack(u,target);
      html += `<div style="margin-top:5px;color:#c9c1b7">Alvo: <b style="color:#f0eee8">${target.name}</b></div>`;
      if(p){
        if(p.dist > u.range){
          html += `<div style="color:#75b8e6">Próxima ação: mover 1 hex · distância ${p.dist}</div>`;
          html += `<div>Dano quando alcançar: <b style="color:#ef8a76">≈ ${p.dmg}${p.hits>1?' × '+p.hits:''}</b></div>`;
        }else if(p.dmg===0 && isImmuneNow(target,performance.now())){
          html += `<div style="color:#8fd4e8"><b>IMUNE agora</b> · ataque causaria 0</div>`;
        }else{
          html += `<div>Dano previsto: <b style="color:#ef8a76">≈ ${p.dmg}${p.hits>1?' × '+p.hits:''}</b>${p.mult>1?' · vantagem elemental':p.mult<1?' · resistido':''}</div>`;
        }
        if(p.proc) html += `<div style="color:#e8c250">Próximo proc: ${p.proc}</div>`;
        if(p.critChance) html += `<div>Crítico: ${Math.round(p.critChance*100)}% → <b style="color:#e8c250">≈ ${p.critDmg}</b></div>`;
        if(p.windMiss) html += `<div style="color:#9bb5c9">Vento forte: ${Math.round((1-p.windMiss)*100)}% de acerto</div>`;
        if(p.dodgeChance) html += `<div style="color:#8fc99a">Alvo pode esquivar: ${Math.round(p.dodgeChance*100)}%</div>`;
        if(p.shieldAbsorb) html += `<div style="color:#8fd4e8">Escudo absorve ≈ ${p.shieldAbsorb}</div>`;
      }
    }
    html += `<div style="margin-top:5px;color:#777;font-size:9px">azul = movimento · vermelho = alcance/ameaça · clique fixa</div>`;
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';

    try{
      const p = arena.createSVGPoint(); p.x=u.rx; p.y=u.ry;
      const screen = p.matrixTransform(arena.getScreenCTM());
      const wr = wrap.getBoundingClientRect();
      const tw = tooltip.offsetWidth || 190, th = tooltip.offsetHeight || 90;
      let left = screen.x - wr.left + 24;
      let top = screen.y - wr.top - th/2;
      left = Math.max(8, Math.min(wr.width-tw-8,left));
      top = Math.max(8, Math.min(wr.height-th-8,top));
      tooltip.style.left = left+'px'; tooltip.style.top = top+'px';
    }catch(_){ /* ignora */ }
  }

  function watchAttackAnimations(now){
    livingUnits().forEach(u=>{
      const a = u.attackAnim;
      if(!a || !a.start) return;
      const prev = seenAttackStarts.get(u.id);
      if(prev === a.start) return;
      seenAttackStarts.set(u.id,a.start);
      const target = livingUnits().find(o=>o.id===a.targetId);
      if(!target) return;
      attackFx.push({
        kind:(u.range||1)>1?'projectile':'slash',
        x1:u.rx,y1:u.ry,x2:target.rx,y2:target.ry,
        color:u.color||'#e8c250',start:now,life:(u.range||1)>1?260:220
      });
      if(attackFx.length>50) attackFx.splice(0,attackFx.length-50);
    });
  }

  function drawAttackFx(now){
    attackFx = attackFx.filter(f=> now-f.start < f.life);
    attackFx.forEach(f=>{
      const t = Math.max(0,Math.min(1,(now-f.start)/f.life));
      if(f.kind==='projectile'){
        const x=f.x1+(f.x2-f.x1)*t, y=f.y1+(f.y2-f.y1)*t;
        overlay.appendChild(el('line',{
          x1:f.x1+(f.x2-f.x1)*Math.max(0,t-.24), y1:f.y1+(f.y2-f.y1)*Math.max(0,t-.24),
          x2:x,y2:y,stroke:f.color,'stroke-width':3,opacity:(1-t*.35).toFixed(2),
          'stroke-linecap':'round','vector-effect':'non-scaling-stroke'
        }));
        overlay.appendChild(el('circle',{cx:x,cy:y,r:3.5,fill:'#fff7dd',stroke:f.color,'stroke-width':1.5,opacity:.95}));
        if(t>.72){
          overlay.appendChild(el('circle',{cx:f.x2,cy:f.y2,r:(5+(t-.72)*34).toFixed(1),fill:'none',stroke:f.color,'stroke-width':2,opacity:(1-t).toFixed(2),'vector-effect':'non-scaling-stroke'}));
        }
      }else{
        const ang=Math.atan2(f.y2-f.y1,f.x2-f.x1)+Math.PI/2;
        const spread=12;
        const cx=f.x2, cy=f.y2;
        const alpha=Math.sin(t*Math.PI);
        overlay.appendChild(el('line',{
          x1:cx-Math.cos(ang)*spread,y1:cy-Math.sin(ang)*spread,
          x2:cx+Math.cos(ang)*spread,y2:cy+Math.sin(ang)*spread,
          stroke:'#fff2df','stroke-width':3.2,opacity:alpha.toFixed(2),
          'stroke-linecap':'round','vector-effect':'non-scaling-stroke'
        }));
        overlay.appendChild(el('circle',{cx,cy,r:(5+t*14).toFixed(1),fill:'none',stroke:f.color,'stroke-width':2.2,opacity:(1-t).toFixed(2),'vector-effect':'non-scaling-stroke'}));
      }
    });
  }

  function classifyCombatText(text){
    const raw=String(text||'').trim();
    if(raw==='CRÍTICO!'){ pendingCriticalUntil=performance.now()+100; return null; }
    const heal=raw.match(/^\+(\d+)(?:\s+(?:vida|✨))?$/i);
    if(heal) return {kind:'heal',value:heal[1],label:'+'+heal[1]};
    const dmg=raw.match(/^(?:(⚔|🎯|⚡(?:ONDA)?|⛰|🧲|❄|💨|✹|🔥|💥|➹)\s*)?(\d+)$/u);
    if(dmg) return {kind:performance.now()<pendingCriticalUntil?'crit':'damage',value:dmg[2],label:(dmg[1]?dmg[1]+' ':'')+dmg[2]};
    return null;
  }

  try{
    if(typeof spawnFloatText==='function'){
      const originalSpawnFloatText = spawnFloatText;
      spawnFloatText = function(x,y,text,color,mode){
        const parsed = !mode ? classifyCombatText(text) : null;
        if(parsed){
          combatFloaters.push({x,y,text:parsed.label,color,kind:parsed.kind,start:performance.now(),life:parsed.kind==='crit'?1150:900});
          if(combatFloaters.length>80) combatFloaters.splice(0,combatFloaters.length-80);
          return;
        }
        return originalSpawnFloatText(x,y,text,color,mode);
      };
    }
  }catch(_){ /* fallback: mantém floaters originais */ }

  function drawCombatFloaters(now){
    combatFloaters = combatFloaters.filter(f=>now-f.start<f.life);
    combatFloaters.forEach(f=>{
      const t=(now-f.start)/f.life;
      const ease=1-Math.pow(1-t,2);
      const y=f.y-ease*(f.kind==='crit'?42:31);
      const opacity=Math.min(1,(1-t)*1.35);
      const size=f.kind==='crit'?19:(f.kind==='heal'?16:15);
      const fill=f.kind==='heal'?'#7fd58a':(f.kind==='crit'?'#f4ce58':(f.color||'#f0eee8'));
      const txt=el('text',{
        x:f.x,y,fill,opacity:opacity.toFixed(2),'text-anchor':'middle',
        'font-family':'JetBrains Mono, monospace','font-size':size,'font-weight':'800',
        stroke:'#0b0b0d','stroke-width':f.kind==='crit'?4:3,'paint-order':'stroke',
        'vector-effect':'non-scaling-stroke'
      });
      txt.textContent=f.text;
      overlay.appendChild(txt);
    });
  }

  function syncViewBox(){
    const vb=arena.getAttribute('viewBox');
    if(vb) overlay.setAttribute('viewBox',vb);
    else{
      try{ overlay.setAttribute('viewBox',`${camViewBox.x} ${camViewBox.y} ${camViewBox.w} ${camViewBox.h}`); }catch(_){ /* nada */ }
    }
    overlay.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio')||'xMidYMid slice');
  }

  function loop(now){
    syncViewBox();
    while(overlay.firstChild) overlay.removeChild(overlay.firstChild);
    watchAttackAnimations(now);
    drawAttackFx(now);
    drawCombatFloaters(now);

    const id = selectedUnitId!=null ? selectedUnitId : hoveredUnitId;
    const u = livingUnits().find(x=>x.id===id);
    if(u) drawUnitContext(u,now); else tooltip.style.display='none';

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
