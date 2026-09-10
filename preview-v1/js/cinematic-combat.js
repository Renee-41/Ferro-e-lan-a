/* Ferro & Lança — cinematografia de combate
   - primeira habilidade assinatura de cada SU por onda recebe zoom + slow + freeze + frase
   - finalizações ganham freeze-frame mais curto e mais legível
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
    voss:'Um tiro. Uma resposta.',
    nyx:'Você piscou.',
    kael:'Então queimem comigo.',
    terrus:'Eu não cedo.',
    pyra:'Agora eu entendi.',
    glacia:'Ainda não é sua hora.',
    zeph:'Tenta acompanhar.',
    ima:'Venha.',
    frosk:'Fica parado.',
    gelida:'O frio sempre cobra.',
    raio:'Vamos terminar isso.',
    shecry:'Quanto mais dói, mais forte eu fico.',
    nerith:'ELE já escolheu.',
    voltra:'Segura a carga.',
    jedegar:'Ergam-se.',
    shava:'Olha o passo.'
  };
  const ABILITY_NAMES={
    ferrha:'LANÇA DE FERRO',voss:'TIRO PERFURANTE',nyx:'RAJADA DUPLA',kael:'GOLPE FLAMEJANTE',
    terrus:'TREMOR DE PEDRA',pyra:'EXPLOSÃO',glacia:'MARÉ RESTAURADORA',zeph:'CHUVA DE FLECHAS',
    ima:'MAGNETIZAÇÃO',frosk:'CONGELAMENTO',gelida:'PRISÃO GLACIAL',raio:'COMBO RELÂMPAGO',
    shecry:'COLOSSO GLACIAL',nerith:'CHAMADO DAS PROFUNDEZAS',voltra:'SOBRECARGA',jedegar:'PILAR DA PERSEVERANÇA',shava:'PASSO DO VENTO'
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
  function realWave(){ try{return Number(wave)||0;}catch(_){return 0;} }
  function playerUnit(u){ return !!(u&&u.alive&&u.team==='player'&&!u.isTentacle); }

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
    try{ if(typeof triggerScreenShake==='function') triggerScreenShake(big?12:6,big?280:160); }catch(_){ }
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

  function showAbilityCinematic(u,abilityName,onCast){
    if(cinematicActive || !playerUnit(u)){ if(onCast) onCast(); return; }
    const before=getSpeed();
    if(before===0){ if(onCast) onCast(); return; }
    cinematicActive=true;
    window.__ferroAbilityCinematicActive=true;
    u.__cinemaLock=true;
    focusUnit(u,true);
    kicker.textContent=abilityName || ABILITY_NAMES[u.champId] || 'HABILIDADE ASSINATURA';
    nameEl.textContent=u.name || (typeof CHAMPION_CATALOG!=='undefined'&&CHAMPION_CATALOG[u.champId]?CHAMPION_CATALOG[u.champId].name:u.champId);
    lineEl.textContent=`“${LINES[u.champId]||'Agora.'}”`;
    overlay.className='show';
    setSpeed(.5);
    let froze=false,cast=false,hit=false;

    runTimeline(1450,(t)=>{
      if(t>=270&&!froze){ froze=true; setSpeed(0); overlay.classList.add('quote'); }
      if(t>=850&&!cast){
        cast=true; setSpeed(.5); overlay.classList.remove('quote');
        u.__signatureCastUntil=performance.now()+700;
        if(onCast) onCast();
      }
      if(t>=920&&!hit){ hit=true; pulseFlash(false); }
    },()=>{
      overlay.className='';
      setSpeed(before);
      u.__cinemaLock=false;
      window.__ferroAbilityCinematicActive=false;
      cinematicActive=false;
      focusUnit(u,false);
    });
  }

  function specialThreshold(u){
    if(!u) return 0;
    if(u.special==='lanca'||u.special==='rajada'||u.special==='explosao') return 3;
    if(u.special==='perfuro'||u.special==='chuva'||u.special==='furia'||u.special==='couraca'||u.special==='ima'||u.special==='cura') return 4;
    if(u.special==='congelamento') return u.champId==='frosk'?4:5;
    return 0;
  }
  function likelyCanAttack(u){
    try{
      const target=typeof nearestEnemy==='function'?nearestEnemy(u):null;
      if(!target) return false;
      return typeof hexDistance==='function' ? hexDistance(u,target)<=Math.max(1,u.range||1) : true;
    }catch(_){ return true; }
  }
  function aboutToSpecial(u){
    const n=specialThreshold(u);
    if(!n || !playerUnit(u) || !likelyCanAttack(u)) return false;
    if(u.special==='ima' && !(u.imaUsesLeft>0)) return false;
    if(u.special==='cura'){
      try{ if(!units.some(o=>o.alive&&o.team===u.team&&o.hp<o.maxhp)) return false; }catch(_){ }
    }
    if(u.special==='chuva'){
      try{ if(units.filter(o=>o.alive&&o.team!==u.team).length<2) return false; }catch(_){ }
    }
    return (((u.hitCount||0)+1)%n)===0;
  }

  try{
    if(typeof doAction==='function'){
      const baseAction=doAction;
      doAction=function(u){
        if(u&&u.__cinemaLock) return;
        try{
          if(aboutToSpecial(u) && u.__fullCinematicWave!==realWave() && !cinematicActive){
            u.__fullCinematicWave=realWave();
            showAbilityCinematic(u,ABILITY_NAMES[u.champId],()=>baseAction(u));
            return;
          }
        }catch(_){ }
        return baseAction(u);
      };
    }
  }catch(_){ }

  // Raio dispara por uma função própria, então o gatilho é interceptado diretamente.
  try{
    if(typeof triggerComboUltimate==='function'){
      const baseCombo=triggerComboUltimate;
      triggerComboUltimate=function(u,attacker){
        if(u&&u.__cinemaLock) return;
        try{
          if(playerUnit(u) && u.__fullCinematicWave!==realWave() && !cinematicActive){
            u.__fullCinematicWave=realWave();
            showAbilityCinematic(u,ABILITY_NAMES.raio,()=>baseCombo(u,attacker));
            return;
          }
        }catch(_){ }
        return baseCombo(u,attacker);
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

  window.FerroCombatCinema={showAbilityCinematic,runFinisher,isActive:()=>cinematicActive};
})();
