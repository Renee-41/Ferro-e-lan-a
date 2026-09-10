/* Ferro & Lança — feedback visual de combate.
   1) movimento/alcance/alvo
   2) previsão aproximada de dano
   3) reforço visual do ataque
   4) números de dano/cura mais legíveis
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
    minWidth:'170px', maxWidth:'235px', padding:'8px 10px', borderRadius:'8px',
    border:'1px solid rgba(232,194,80,.65)', background:'rgba(12,13,16,.94)',
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

  function svgEl(name, attrs){
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k,v]) => node.setAttribute(k, String(v)));
    return node;
  }
  function aliveUnits(){
    try{ return Array.isArray(units) ? units.filter(u => u && u.alive) : []; }
    catch(_){ return []; }
  }
  function hdist(a,b){
    try{ return typeof hexDistance === 'function' ? hexDistance(a,b) : 999; }
    catch(_){ return 999; }
  }
  function worldPoint(ev){
    try{
      const p = arena.createSVGPoint();
      p.x = ev.clientX; p.y = ev.clientY;
      const m = arena.getScreenCTM();
      return m ? p.matrixTransform(m.inverse()) : null;
    }catch(_){ return null; }
  }
  function hitUnit(p){
    if(!p) return null;
    let best = null, bestD = Infinity;
    aliveUnits().forEach(u => {
      const d = Math.hypot(p.x-u.rx, p.y-u.ry);
      const r = u.isBoss ? 27 : 21;
      if(d <= r && d < bestD){ best = u; bestD = d; }
    });
    return best;
  }

  arena.addEventListener('pointerdown', ev => {
    if(ev.button === 0) pointerDown = {x:ev.clientX, y:ev.clientY};
  }, {passive:true});
  arena.addEventListener('pointermove', ev => {
    const hit = hitUnit(worldPoint(ev));
    hoveredUnitId = hit ? hit.id : null;
    arena.style.cursor = hit ? 'pointer' : '';
  }, {passive:true});
  arena.addEventListener('pointerleave', () => {
    hoveredUnitId = null;
    arena.style.cursor = '';
  }, {passive:true});
  arena.addEventListener('pointerup', ev => {
    if(ev.button !== 0 || !pointerDown) return;
    const moved = Math.hypot(ev.clientX-pointerDown.x, ev.clientY-pointerDown.y);
    pointerDown = null;
    if(moved > 7) return;
    const hit = hitUnit(worldPoint(ev));
    selectedUnitId = hit ? (selectedUnitId === hit.id ? null : hit.id) : null;
  }, {passive:true});

  function safeCount(u,id){
    try{ return typeof countItem === 'function' ? countItem(u,id) : 0; }
    catch(_){ return 0; }
  }
  function amp(u){
    try{ return typeof passiveAmp === 'function' ? passiveAmp(u) : 1; }
    catch(_){ return 1; }
  }
  function aura(u){
    try{ return typeof jedegarAuraMultiplier === 'function' ? jedegarAuraMultiplier(u) : 1; }
    catch(_){ return 1; }
  }
  function elem(a,b){
    try{ return typeof elemMultiplier === 'function' ? elemMultiplier(a,b) : 1; }
    catch(_){ return 1; }
  }
  function targetFor(u){
    try{ if(typeof nearestEnemy === 'function') return nearestEnemy(u); }
    catch(_){ /* fallback */ }
    return aliveUnits().filter(o => o.team !== u.team).sort((a,b) => hdist(u,a)-hdist(u,b))[0] || null;
  }
  function immuneNow(t, now){
    return !!(
      (t.frenzyUntil && now<t.frenzyUntil) ||
      (t.barrierUntil && now<t.barrierUntil) ||
      (t.ghostUntil && now<t.ghostUntil) ||
      (t.champId==='raio' && t.comboActive) ||
      (t.voltraDetonateUntil && now<t.voltraDetonateUntil)
    );
  }

  function predict(u,t){
    if(!u || !t) return null;
    const now = performance.now();
    const dist = hdist(u,t);
    let base = Number(u.atk) || 0;
    let ignoreDefense = false;
    let hits = 1;
    let proc = '';

    if(u.range>1) base = Math.round(base*(1+Math.max(0,dist-1)*0.08));
    if(u.champId==='shecry') base = Math.round(base*(1+(1-u.hp/u.maxhp)*1.2));

    const nextHit = (u.hitCount||0)+1;
    if(u.special==='lanca' && nextHit%3===0){ base=Math.round(base*1.8); proc='Lança reforçada'; }
    if(u.special==='perfuro' && nextHit%4===0){ base=Math.round(base*1.6); ignoreDefense=true; proc='Perfuração'; }
    if(u.special==='rajada' && nextHit%3===0){ hits=2; proc='Rajada dupla'; }
    if(u.special==='furia'){
      base=Math.round(base*(1+(1-u.hp/u.maxhp)*0.8));
      if(u.frenzyUntil && now<u.frenzyUntil) base=Math.round(base*(1.5+0.10*((u.stars||1)-1)));
      if(nextHit%4===0){ base=Math.round(base*1.6); proc='Golpe flamejante'; }
    }
    if(u.special==='couraca' && nextHit%4===0){ base=Math.round(base*1.5); proc='Tremor'; }
    if(u.special==='ima' && nextHit%4===0 && (u.imaUsesLeft||0)>0){ base=Math.round(base*1.5); proc='Ímã'; }
    if(u.special==='congelamento'){
      const n = u.champId==='frosk' ? 4 : 5;
      if(nextHit%n===0){ if(u.champId==='frosk') base=Math.round(base*1.3); proc='Congelamento'; }
    }

    const mult = elem(u.element,t.element);
    let dmg = Math.round(base*mult*aura(u)*
      (u.jedegarDeathBuffUntil && now<u.jedegarDeathBuffUntil ? 1.25 : 1)*
      (u.shavaSecretBonus ? 1.15 : 1)*
      (u.shavaWeakenUntil && now<u.shavaWeakenUntil ? 0.75 : 1));

    if(u.champId==='gelida' && u.gelidaDmgBuffUntil && now<u.gelidaDmgBuffUntil) dmg=Math.round(dmg*2);
    if(t.vulnerableUntil && now<t.vulnerableUntil) dmg=Math.round(dmg*1.15);

    if(!ignoreDefense){
      let reduction = t.dmgReduction || 0;
      if(t.barrierUntil && now<t.barrierUntil) reduction=Math.min(.9,reduction+0.15*(t.stars||1)*amp(t));
      if(t.element==='metal'){
        try{
          const ima = units.find(o => o.alive && o.team===t.team && o.champId==='ima' && o.id!==t.id && hdist(o,t)<=1);
          if(ima) reduction += 0.08*amp(ima);
        }catch(_){ /* noop */ }
      }
      if(t.champId==='shecry') reduction += (t.hp/t.maxhp)*0.35;
      if(t.crateShieldUntil && now<t.crateShieldUntil) reduction += 0.10;
      if(t.special==='couraca') dmg=Math.round(dmg*0.8);

      let pen = 0;
      const serra = safeCount(u,'punho_serra');
      if(serra>0) pen=Math.max(pen,0.15*serra);
      if(safeCount(u,'carniceiro')>0) pen=Math.max(pen,0.25);
      if(safeCount(u,'fio_mortal')>0) pen=Math.max(pen,0.25);
      if(pen>0) reduction *= (1-Math.min(1,pen));
      try{
        if(typeof jedegarEnemyDefenseDebuff==='function' && jedegarEnemyDefenseDebuff(t)) reduction=Math.max(0,reduction-0.30);
      }catch(_){ /* noop */ }
      if(t.jedegarShieldUntil && now<t.jedegarShieldUntil) reduction=Math.min(.9,reduction+0.20);
      if(t.champId==='frosk') reduction=Math.min(.9,reduction+0.15);
      if(t.shavaArmorDebuffUntil && now<t.shavaArmorDebuffUntil) reduction=Math.max(0,reduction-0.20);
      if(reduction) dmg=Math.round(dmg*(1-reduction));
    }

    if(immuneNow(t,now)) dmg=0;
    let shield = 0;
    if(t.shecryShield>0 && dmg>0){ shield=Math.min(dmg,t.shecryShield); dmg-=shield; }

    const critChance = safeCount(u,'furia_crescente')>0 ? .18 : 0;
    const critDmg = critChance ? Math.round(dmg*1.5) : 0;
    let dodge = 0;
    if(t.element==='vento' && !ignoreDefense){
      let bot = false;
      try{ bot = !!(ENEMY_CATALOG && ENEMY_CATALOG[t.champId]); }catch(_){ /* noop */ }
      const low = t.hp/t.maxhp < .40;
      dodge = bot ? (low ? .20 : .10) : (low ? .30 : .20);
    }
    const windMiss = (typeof currentWeather!=='undefined' && currentWeather==='vento_forte' && u.range>1) ? .15 : 0;
    return {dmg,critChance,critDmg,dodge,windMiss,dist,mult,hits,proc,shield};
  }

  function addHex(h, fill, stroke, opacity, dash){
    try{
      const p = hexToPixel(h.q,h.r);
      const poly = svgEl('polygon', {
        points:hexPoints(p.x,p.y), fill, stroke, opacity,
        'stroke-width':1.35, 'vector-effect':'non-scaling-stroke'
      });
      if(dash) poly.setAttribute('stroke-dasharray',dash);
      overlay.appendChild(poly);
    }catch(_){ /* grade ainda não pronta */ }
  }

  function showTooltip(u,t){
    let html = `<div style="font-family:Oswald,sans-serif;font-size:13px;font-weight:700;color:#f0d27a;margin-bottom:4px">${u.name}</div>`;
    html += `<div>HP <b>${Math.max(0,Math.round(u.hp))}/${Math.round(u.maxhp)}</b> · ATK <b>${Math.round(u.atk)}</b> · alcance <b>${u.range}</b></div>`;
    if(t){
      const p = predict(u,t);
      html += `<div style="margin-top:5px;color:#c9c1b7">Alvo: <b style="color:#f0eee8">${t.name}</b></div>`;
      if(p){
        if(p.dist>u.range){
          html += `<div style="color:#75b8e6">Próxima ação: mover 1 hex · distância ${p.dist}</div>`;
          html += `<div>Dano ao alcançar: <b style="color:#ef8a76">≈ ${p.dmg}${p.hits>1?' × '+p.hits:''}</b></div>`;
        }else if(p.dmg===0 && immuneNow(t,performance.now())){
          html += `<div style="color:#8fd4e8"><b>IMUNE agora</b> · dano 0</div>`;
        }else{
          html += `<div>Dano previsto: <b style="color:#ef8a76">≈ ${p.dmg}${p.hits>1?' × '+p.hits:''}</b>${p.mult>1?' · vantagem':p.mult<1?' · resistido':''}</div>`;
        }
        if(p.proc) html += `<div style="color:#e8c250">Próximo proc: ${p.proc}</div>`;
        if(p.critChance) html += `<div>Crítico ${Math.round(p.critChance*100)}% → <b style="color:#e8c250">≈ ${p.critDmg}</b></div>`;
        if(p.windMiss) html += `<div style="color:#9bb5c9">Vento: ${Math.round((1-p.windMiss)*100)}% de acerto</div>`;
        if(p.dodge) html += `<div style="color:#8fc99a">Esquiva do alvo: ${Math.round(p.dodge*100)}%</div>`;
        if(p.shield) html += `<div style="color:#8fd4e8">Escudo absorve ≈ ${p.shield}</div>`;
      }
    }
    html += `<div style="margin-top:5px;color:#777;font-size:9px">azul = movimento · vermelho = alcance/alvo · clique fixa</div>`;
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';

    try{
      const p = arena.createSVGPoint(); p.x=u.rx; p.y=u.ry;
      const s = p.matrixTransform(arena.getScreenCTM());
      const wr = wrap.getBoundingClientRect();
      const tw = tooltip.offsetWidth || 190, th = tooltip.offsetHeight || 90;
      let left = s.x-wr.left+24;
      let top = s.y-wr.top-th/2;
      left = Math.max(8,Math.min(wr.width-tw-8,left));
      top = Math.max(8,Math.min(wr.height-th-8,top));
      tooltip.style.left=left+'px'; tooltip.style.top=top+'px';
    }catch(_){ /* noop */ }
  }

  function drawContext(u,now){
    if(!u || !u.alive) return;
    const t = targetFor(u);
    const pulse = .65+.35*Math.sin(now/150);
    overlay.appendChild(svgEl('circle',{
      cx:u.rx,cy:u.ry,r:u.isBoss?29:23,fill:'none',stroke:'#e8c250',
      'stroke-width':2.2,opacity:pulse.toFixed(2),'stroke-dasharray':'5 3','vector-effect':'non-scaling-stroke'
    }));

    try{
      const occ = typeof occupiedMap==='function' ? occupiedMap() : {};
      if(!u.cantMove){
        neighbors(u).filter(h => inGrid(h) && !isBlockedTile(h) && occ[hexKey(h)]===undefined)
          .forEach(h => addHex(h,'rgba(63,127,168,.17)','#5aa8df',.9,'4 3'));
      }
      if(Array.isArray(allHexes)){
        allHexes.filter(h => hdist(u,h)<=Math.max(1,u.range||1) && !(h.q===u.q && h.r===u.r))
          .forEach(h => addHex(h,'rgba(201,77,61,.075)','#cf6658',.72,'2 4'));
      }
    }catch(_){ /* noop */ }

    if(t){
      const tp=.55+.45*Math.sin(now/105);
      overlay.appendChild(svgEl('line',{
        x1:u.rx,y1:u.ry,x2:t.rx,y2:t.ry,stroke:'#ef7665','stroke-width':1.8,
        opacity:.72,'stroke-dasharray':'6 5','vector-effect':'non-scaling-stroke'
      }));
      overlay.appendChild(svgEl('circle',{
        cx:t.rx,cy:t.ry,r:t.isBoss?31:24,fill:'rgba(201,77,61,.08)',stroke:'#ef6655',
        'stroke-width':2.4,opacity:tp.toFixed(2),'vector-effect':'non-scaling-stroke'
      }));
    }
    showTooltip(u,t);
  }

  function watchAttacks(now){
    aliveUnits().forEach(u => {
      const a=u.attackAnim;
      if(!a || !a.start || seenAttackStarts.get(u.id)===a.start) return;
      seenAttackStarts.set(u.id,a.start);
      const t=aliveUnits().find(o => o.id===a.targetId);
      if(!t) return;
      attackFx.push({kind:(u.range||1)>1?'projectile':'slash',x1:u.rx,y1:u.ry,x2:t.rx,y2:t.ry,color:u.color||'#e8c250',start:now,life:(u.range||1)>1?260:220});
      if(attackFx.length>50) attackFx.splice(0,attackFx.length-50);
    });
  }

  function drawAttacks(now){
    attackFx=attackFx.filter(f => now-f.start<f.life);
    attackFx.forEach(f => {
      const t=Math.max(0,Math.min(1,(now-f.start)/f.life));
      if(f.kind==='projectile'){
        const x=f.x1+(f.x2-f.x1)*t, y=f.y1+(f.y2-f.y1)*t;
        const tail=Math.max(0,t-.24);
        overlay.appendChild(svgEl('line',{
          x1:f.x1+(f.x2-f.x1)*tail,y1:f.y1+(f.y2-f.y1)*tail,x2:x,y2:y,
          stroke:f.color,'stroke-width':3,opacity:(1-t*.35).toFixed(2),'stroke-linecap':'round','vector-effect':'non-scaling-stroke'
        }));
        overlay.appendChild(svgEl('circle',{cx:x,cy:y,r:3.5,fill:'#fff7dd',stroke:f.color,'stroke-width':1.5,opacity:.95}));
        if(t>.72) overlay.appendChild(svgEl('circle',{cx:f.x2,cy:f.y2,r:(5+(t-.72)*34).toFixed(1),fill:'none',stroke:f.color,'stroke-width':2,opacity:(1-t).toFixed(2),'vector-effect':'non-scaling-stroke'}));
      }else{
        const a=Math.atan2(f.y2-f.y1,f.x2-f.x1)+Math.PI/2;
        const alpha=Math.sin(t*Math.PI), spread=12;
        overlay.appendChild(svgEl('line',{
          x1:f.x2-Math.cos(a)*spread,y1:f.y2-Math.sin(a)*spread,x2:f.x2+Math.cos(a)*spread,y2:f.y2+Math.sin(a)*spread,
          stroke:'#fff2df','stroke-width':3.2,opacity:alpha.toFixed(2),'stroke-linecap':'round','vector-effect':'non-scaling-stroke'
        }));
        overlay.appendChild(svgEl('circle',{cx:f.x2,cy:f.y2,r:(5+t*14).toFixed(1),fill:'none',stroke:f.color,'stroke-width':2.2,opacity:(1-t).toFixed(2),'vector-effect':'non-scaling-stroke'}));
      }
    });
  }

  function classifyText(text){
    const raw=String(text||'').trim();
    if(raw==='CRÍTICO!'){ pendingCriticalUntil=performance.now()+100; return null; }
    const heal=raw.match(/^\+(\d+)(?:\s+(?:vida|✨))?$/i);
    if(heal) return {kind:'heal',label:'+'+heal[1]};
    const dmg=raw.match(/^(?:(⚔|🎯|⚡(?:ONDA)?|⛰|🧲|❄|💨|✹|🔥|💥|➹)\s*)?(\d+)$/u);
    if(dmg) return {kind:performance.now()<pendingCriticalUntil?'crit':'damage',label:(dmg[1]?dmg[1]+' ':'')+dmg[2]};
    return null;
  }

  try{
    if(typeof spawnFloatText==='function'){
      const original=spawnFloatText;
      spawnFloatText=function(x,y,text,color,mode){
        const parsed=!mode ? classifyText(text) : null;
        if(parsed){
          combatFloaters.push({x,y,text:parsed.label,color,kind:parsed.kind,start:performance.now(),life:parsed.kind==='crit'?1150:900});
          if(combatFloaters.length>80) combatFloaters.splice(0,combatFloaters.length-80);
          return;
        }
        return original(x,y,text,color,mode);
      };
    }
  }catch(_){ /* mantém o sistema original */ }

  function drawFloaters(now){
    combatFloaters=combatFloaters.filter(f => now-f.start<f.life);
    combatFloaters.forEach(f => {
      const t=(now-f.start)/f.life;
      const y=f.y-(1-Math.pow(1-t,2))*(f.kind==='crit'?42:31);
      const opacity=Math.min(1,(1-t)*1.35);
      const size=f.kind==='crit'?19:(f.kind==='heal'?16:15);
      const fill=f.kind==='heal'?'#7fd58a':(f.kind==='crit'?'#f4ce58':(f.color||'#f0eee8'));
      const txt=svgEl('text',{
        x:f.x,y,fill,opacity:opacity.toFixed(2),'text-anchor':'middle','font-family':'JetBrains Mono, monospace',
        'font-size':size,'font-weight':800,stroke:'#0b0b0d','stroke-width':f.kind==='crit'?4:3,'paint-order':'stroke','vector-effect':'non-scaling-stroke'
      });
      txt.textContent=f.text;
      overlay.appendChild(txt);
    });
  }

  function syncViewBox(){
    const vb=arena.getAttribute('viewBox');
    if(vb) overlay.setAttribute('viewBox',vb);
    else{
      try{ overlay.setAttribute('viewBox',`${camViewBox.x} ${camViewBox.y} ${camViewBox.w} ${camViewBox.h}`); }
      catch(_){ /* noop */ }
    }
    overlay.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio') || 'xMidYMid slice');
  }

  function frame(now){
    syncViewBox();
    overlay.replaceChildren();
    watchAttacks(now);
    drawAttacks(now);
    drawFloaters(now);

    const id=selectedUnitId!=null ? selectedUnitId : hoveredUnitId;
    const u=aliveUnits().find(x => x.id===id);
    if(u) drawContext(u,now);
    else tooltip.style.display='none';

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
