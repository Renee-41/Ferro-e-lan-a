/* Ferro & Lança — cinematografia de combate
   - cena completa SOMENTE em passivas de virada (Frenesi, Barreira, Pele de Pedra etc.)
   - especiais normais por contagem de golpes NÃO interrompem mais o combate
   - finalizações continuam com freeze-frame próprio
   - respeita e restaura a velocidade escolhida pelo jogador
*/
(function(){
  if(window.__ferroCinematicCombatLoaded) return;
  window.__ferroCinematicCombatLoaded=true;

  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  if(!arena||!wrap) return;
  if(getComputedStyle(wrap).position==='static') wrap.style.position='relative';

  const LINES={
    ferrha:'Atrás de mim.',
    kael:'Então queimem comigo.',
    terrus:'Eu não cedo.',
    gelida:'O frio sempre cobra.',
    shecry:'Quanto mais dói, mais forte eu fico.',
    nerith:'ELE já escolheu.',
    voltra:'Segura a carga.',
    jedegar:'Permaneçam.'
  };

  const PASSIVE_NAMES={
    ferrha:'BARREIRA DE FERRO',
    kael:'FRENESI',
    terrus:'PELE DE PEDRA',
    gelida:'ÚLTIMO SUSPIRO',
    shecry:'COLOSSO GLACIAL',
    nerith:'FRENESI ABISSAL',
    voltra:'COLAPSO DE SOBRECARGA',
    jedegar:'ÚLTIMO PILAR'
  };

  const style=document.createElement('style');
  style.textContent=`
    #combat-cinematic{position:absolute;inset:0;z-index:28;pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0;overflow:hidden;transition:opacity .12s ease;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,.04),rgba(0,0,0,.58) 72%)}
    #combat-cinematic.show{opacity:1}#combat-cinematic.finisher{background:radial-gradient(circle at 50% 50%,rgba(80,15,12,.08),rgba(0,0,0,.82) 72%)}
    #combat-cinematic::before,#combat-cinematic::after{content:"";position:absolute;left:-6%;right:-6%;height:22%;background:linear-gradient(180deg,rgba(2,3,5,.96),rgba(2,3,5,.62));transition:transform .28s cubic-bezier(.2,.8,.2,1)}
    #combat-cinematic::before{top:0;transform:translateY(-105%)}#combat-cinematic::after{bottom:0;transform:translateY(105%) rotate(180deg)}
    #combat-cinematic.show::before,#combat-cinematic.show::after{transform:translateY(0)}#combat-cinematic.show::after{transform:translateY(0) rotate(180deg)}
    .combat-cine-copy{position:relative;z-index:2;width:min(640px,86%);text-align:center;text-transform:uppercase;filter:drop-shadow(0 5px 16px rgba(0,0,0,.9));transform:scale(.95);opacity:.25;transition:transform .2s ease,opacity .2s ease}
    #combat-cinematic.quote .combat-cine-copy,#combat-cinematic.finisher .combat-cine-copy{transform:scale(1);opacity:1}
    .combat-cine-kicker{font:700 9px/1.2 'JetBrains Mono',monospace;letter-spacing:.25em;color:#99a3af;margin-bottom:7px}.combat-cine-name{font:800 clamp(18px,4vw,34px)/1 'Oswald',sans-serif;letter-spacing:.08em;color:#eee7d9}.combat-cine-line{margin-top:9px;font:600 clamp(13px,2.5vw,20px)/1.25 'Oswald',sans-serif;letter-spacing:.03em;color:#f0d473;text-transform:none;font-style:italic}
    .combat-cine-flash{position:absolute;inset:0;z-index:3;opacity:0;background:#fff;mix-blend-mode:screen}.combat-cine-flash.hit{animation:cineFlash .24s ease-out}@keyframes cineFlash{0%{opacity:.8}100%{opacity:0}}
    #combat-cinematic.finisher .combat-cine-kicker{color:#ff9a83}#combat-cinematic.finisher .combat-cine-name{font-size:clamp(24px,5vw,44px);color:#fff2e6}#combat-cinematic.finisher .combat-cine-line{color:#e0693a}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='combat-cinematic';
  overlay.innerHTML='<div class="combat-cine-copy"><div class="combat-cine-kicker"></div><div class="combat-cine-name"></div><div class="combat-cine-line"></div></div><div class="combat-cine-flash"></div>';
  wrap.appendChild(overlay);
  const kicker=overlay.querySelector('.combat-cine-kicker');
  const nameEl=overlay.querySelector('.combat-cine-name');
  const lineEl=overlay.querySelector('.combat-cine-line');
  const flash=overlay.querySelector('.combat-cine-flash');

  let cinematicActive=false;
  let currentToken=0;
  window.__ferroAbilityCinematicActive=false;

  function speedApi(){ return window.FerroBattleTime&&typeof window.FerroBattleTime.setSpeed==='function' ? window.FerroBattleTime : null; }
  function getSpeed(){ const api=speedApi(); return api ? api.getSpeed() : 1; }
  function setSpeed(v){ const api=speedApi(); if(api) api.setSpeed(v); }
  function playerUnit(u){ return !!(u&&u.team==='player'&&!u.isTentacle); }

  function focusUnit(u,on){
    try{
      if(on){ dramaticActive=true; dramaticUnitId=u.id; }
      else if(!finisherActive){ dramaticActive=false; dramaticUnitId=null; }
    }catch(_){ }
  }

  try{
    if(typeof updateDramaticCheck==='function'){
      const baseCheck=updateDramaticCheck;
      updateDramaticCheck=function(){ if(window.__ferroAbilityCinematicActive) return; return baseCheck(); };
    }
  }catch(_){ }

  function pulseFlash(big){
    flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit');
    try{ if(typeof triggerScreenShake==='function') triggerScreenShake(big?12:7,big?280:190); }catch(_){ }
  }

  function runTimeline(duration,step,done){
    const token=++currentToken;
    const started=performance.now();
    function frame(now){
      if(token!==currentToken) return;
      const elapsed=now-started;
      try{ step(elapsed); }catch(_){ }
      if(elapsed>=duration){ if(done) done(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /*
    A passiva já foi confirmada pela lógica do jogo quando chegamos aqui.
    A cena transforma aquele instante em um freeze-frame visual: aproxima, desacelera,
    congela na frase, dá o impacto da ativação e devolve o controle ao relógio anterior.
    Especiais comuns (3º/4º/5º golpe) nunca chamam esta função.
  */
  function showPassiveCinematic(u,passiveName){
    if(cinematicActive || !playerUnit(u)) return;
    const before=getSpeed();
    if(before===0) return; // não tira o jogador de uma pausa manual

    cinematicActive=true;
    window.__ferroAbilityCinematicActive=true;
    focusUnit(u,true);
    kicker.textContent='PASSIVA ATIVADA · '+(passiveName||PASSIVE_NAMES[u.champId]||'MOMENTO DE VIRADA');
    nameEl.textContent=u.name || (typeof CHAMPION_CATALOG!=='undefined'&&CHAMPION_CATALOG[u.champId]?CHAMPION_CATALOG[u.champId].name:u.champId);
    lineEl.textContent=`“${LINES[u.champId]||'Agora.'}”`;
    overlay.className='show';
    setSpeed(.5);

    let froze=false,impact=false;
    runTimeline(1450,(t)=>{
      if(t>=260&&!froze){
        froze=true;
        setSpeed(0);
        overlay.classList.add('quote');
      }
      if(t>=870&&!impact){
        impact=true;
        setSpeed(.5);
        overlay.classList.remove('quote');
        u.__signatureCastUntil=performance.now()+700;
        pulseFlash(false);
      }
    },()=>{
      overlay.className='';
      setSpeed(before);
      window.__ferroAbilityCinematicActive=false;
      cinematicActive=false;
      focusUnit(u,false);
    });
  }

  function snapshotPassiveState(u){
    if(!u) return null;
    return {
      alive:!!u.alive,
      frenzyUsed:!!u.frenzyUsed,
      barrierUsed:!!u.barrierUsed,
      stoneSkinUsed:!!u.stoneSkinUsed,
      ghostUntil:Number(u.ghostUntil)||0,
      shecryUltUsed:!!u.shecryUltUsed,
      voltraDetonating:!!u.voltraDetonating
    };
  }

  function detectPassiveMoment(u,before){
    if(!u||!before||!playerUnit(u) && !(before.alive&&u.team==='player')) return null;

    if(u.champId==='kael' && !before.frenzyUsed && u.frenzyUsed) return PASSIVE_NAMES.kael;
    if(u.champId==='ferrha' && !before.barrierUsed && u.barrierUsed) return PASSIVE_NAMES.ferrha;
    if(u.champId==='terrus' && !before.stoneSkinUsed && u.stoneSkinUsed) return PASSIVE_NAMES.terrus;
    if(u.champId==='gelida' && before.ghostUntil<=0 && (Number(u.ghostUntil)||0)>0) return PASSIVE_NAMES.gelida;
    if(u.champId==='shecry' && !before.shecryUltUsed && u.shecryUltUsed) return PASSIVE_NAMES.shecry;
    if(u.champId==='voltra' && !before.voltraDetonating && u.voltraDetonating) return PASSIVE_NAMES.voltra;

    if(u.champId==='nerith' && before.alive && !u.alive){
      try{
        if(units.some(t=>t.isTentacle&&t.tentacleParentId===u.id&&t.tentacleFrenzy)) return PASSIVE_NAMES.nerith;
      }catch(_){ }
    }

    if(u.champId==='jedegar' && before.alive && !u.alive){
      try{
        if(units.some(a=>a.alive&&a.team===u.team&&a.jedegarDeathBuffUntil&&a.jedegarDeathBuffUntil>performance.now())) return PASSIVE_NAMES.jedegar;
      }catch(_){ }
    }
    return null;
  }

  /* O ponto de verdade para passivas defensivas/de morte é applyDamage.
     Observamos a transição de estado que a própria lógica original confirmou e só então
     disparamos a câmera. Não tentamos adivinhar dano letal antes das reduções/escudos. */
  try{
    if(typeof applyDamage==='function'){
      const baseApplyDamage=applyDamage;
      applyDamage=function(attacker,target){
        const before=snapshotPassiveState(target);
        const out=baseApplyDamage.apply(this,arguments);
        try{
          const passiveName=detectPassiveMoment(target,before);
          if(passiveName && !cinematicActive){
            showPassiveCinematic(target,passiveName);
          }
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  const FINISH_LINES={
    ferrha:'Fica atrás de mim.',voss:'Alvo encerrado.',nyx:'Tarde demais.',kael:'Cinzas.',terrus:'Até aqui.',
    pyra:'Experimento concluído.',glacia:'Acabou.',zeph:'Nem viu passar.',ima:'Capturado.',frosk:'Congelado.',gelida:'Silêncio.',
    raio:'Circuito fechado.',shecry:'Ainda estou de pé.',nerith:'ELE agradece.',voltra:'Descarga completa.',jedegar:'Permaneçam.',shava:'Caiu no ritmo.'
  };

  function runFinisher(killer,onDone){
    if(!killer){ if(onDone) onDone(); return; }
    const before=getSpeed();
    cinematicActive=true;
    window.__ferroAbilityCinematicActive=false;
    try{ finisherActive=true; dramaticActive=true; dramaticUnitId=killer.id; }catch(_){ }
    kicker.textContent='GOLPE FINAL';
    nameEl.textContent=killer.name||killer.champId||'STACK USER';
    lineEl.textContent=`“${FINISH_LINES[killer.champId]||'Fim.'}”`;
    overlay.className='show finisher quote';
    if(before>0) setSpeed(.5);
    let froze=false,impact=false;
    runTimeline(1850,(t)=>{
      if(t>=230&&!froze){ froze=true; if(before>0) setSpeed(0); }
      if(t>=900&&!impact){
        impact=true;
        if(before>0) setSpeed(.5);
        pulseFlash(true);
      }
    },()=>{
      overlay.className='';
      if(before>0) setSpeed(before);
      try{ finisherActive=false; dramaticActive=false; dramaticUnitId=null; }catch(_){ }
      cinematicActive=false;
      if(onDone) onDone();
    });
  }

  try{
    if(typeof triggerFinisherSequence==='function') triggerFinisherSequence=runFinisher;
  }catch(_){ }

  window.FerroCombatCinema={showPassiveCinematic,runFinisher,isActive:()=>cinematicActive};
})();
