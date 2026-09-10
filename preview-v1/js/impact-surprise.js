/* Ferro & Lança — Impacto & Surpresa
   - preparação tática PVE limitada a 10s
   - inimigos ocultos até o reveal de início da onda
   - onda 15: Colosso da Forja, criatura de espólio
   - VFX assinatura: Kael, Ferrha, Voltra e Glacia
*/
(function(){
  if(window.__ferroImpactSurpriseLoaded) return;
  window.__ferroImpactSurpriseLoaded = true;

  const arena = document.getElementById('arena');
  const wrap = arena && arena.closest('.arena-wrap');
  if(!arena || !wrap) return;
  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const NS = 'http://www.w3.org/2000/svg';
  const prepSeconds = 10;
  let revealLockedUntil = 0;
  let lastTickSecond = null;
  let audioCtx = null;
  const signatureState = new Map();
  const healBursts = [];

  const style = document.createElement('style');
  style.textContent = `
    #impact-surprise-reveal{position:absolute;inset:0;z-index:18;pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0;background:radial-gradient(circle at 50% 52%,rgba(24,20,15,.30),rgba(4,5,7,.96) 62%);backdrop-filter:blur(1px);transition:opacity .18s ease;overflow:hidden;}
    #impact-surprise-reveal.show{opacity:1;}
    #impact-surprise-reveal.fade{opacity:0;transition:opacity .32s ease;}
    #impact-surprise-reveal::before,#impact-surprise-reveal::after{content:"";position:absolute;left:7%;right:7%;height:1px;background:linear-gradient(90deg,transparent,rgba(232,194,80,.75),transparent);box-shadow:0 0 18px rgba(232,194,80,.25);}
    #impact-surprise-reveal::before{top:43%;} #impact-surprise-reveal::after{bottom:43%;}
    .impact-reveal-copy{text-align:center;text-transform:uppercase;font-family:Oswald,sans-serif;letter-spacing:.16em;text-shadow:0 3px 18px rgba(0,0,0,.9);transform:scale(.96);animation:impactRevealPunch .55s ease-out forwards;}
    .impact-reveal-kicker{font:700 10px/1.2 'JetBrains Mono',monospace;color:#aeb5be;letter-spacing:.24em;margin-bottom:6px;}
    .impact-reveal-title{font-size:30px;font-weight:800;color:#eee7d9;}
    .impact-reveal-title.reward{color:#e8c250;text-shadow:0 0 16px rgba(232,194,80,.35),0 3px 18px rgba(0,0,0,.9);}
    @keyframes impactRevealPunch{0%{transform:scale(.86);opacity:0}45%{transform:scale(1.035);opacity:1}100%{transform:scale(1);opacity:1}}
    #signature-vfx-overlay{position:absolute;pointer-events:none;z-index:10;overflow:visible;}
    .forge-coin{position:absolute;z-index:19;width:8px;height:8px;border-radius:50%;border:1px solid rgba(255,242,185,.85);background:radial-gradient(circle at 35% 30%,#fff2a8 0 18%,#e8c250 22% 62%,#9c6919 68%);box-shadow:0 0 9px rgba(232,194,80,.55);pointer-events:none;animation:forgeCoinBurst .9s cubic-bezier(.2,.75,.35,1) forwards;}
    @keyframes forgeCoinBurst{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}12%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.9) rotate(var(--rot));opacity:0}}
    #position-timer-label.impact-danger{color:#ff8a5b!important;text-shadow:0 0 10px rgba(255,80,35,.55);animation:impactTimerPulse .42s ease-in-out infinite alternate;}
    @keyframes impactTimerPulse{from{transform:scale(1)}to{transform:scale(1.035)}}
  `;
  document.head.appendChild(style);

  const reveal = document.createElement('div');
  reveal.id = 'impact-surprise-reveal';
  reveal.innerHTML = '<div class="impact-reveal-copy"><div class="impact-reveal-kicker">AMEAÇA OCULTA</div><div class="impact-reveal-title">CONTATO</div></div>';
  wrap.appendChild(reveal);

  const vfx = document.createElementNS(NS, 'svg');
  vfx.id = 'signature-vfx-overlay';
  vfx.setAttribute('preserveAspectRatio', arena.getAttribute('preserveAspectRatio') || 'xMidYMid meet');
  wrap.appendChild(vfx);

  function getAudio(){
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      if(!audioCtx) audioCtx = new Ctx();
      if(audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
      return audioCtx;
    }catch(_){ return null; }
  }

  function tone(freq, when, dur, gainValue, type){
    const ctx = getAudio();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,gainValue), when + Math.min(.025,dur*.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(when + dur + .03);
  }

  function playRevealSound(){
    const ctx = getAudio();
    if(!ctx) return;
    const t = ctx.currentTime + .01;
    tone(74,t,.42,.12,'sine');
    tone(148,t+.02,.22,.055,'square');
    tone(920,t+.07,.075,.035,'triangle');
    tone(610,t+.12,.09,.03,'triangle');
  }

  function playTickSound(sec){
    if(sec<1 || sec>3) return;
    const ctx = getAudio();
    if(!ctx) return;
    const t = ctx.currentTime + .005;
    tone(sec===1?620:470,t,.055,sec===1?.04:.025,'square');
  }

  function playLootSound(){
    const ctx = getAudio();
    if(!ctx) return;
    const t = ctx.currentTime + .01;
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.07,.20,.035,'triangle'));
  }

  function showReveal(){
    const currentWave = (typeof wave!=='undefined' ? wave : 0);
    const reward = currentWave===15;
    const kicker = reveal.querySelector('.impact-reveal-kicker');
    const title = reveal.querySelector('.impact-reveal-title');
    kicker.textContent = reward ? 'ONDA 15 · ESPÓLIO DETECTADO' : `ONDA ${currentWave} · AMEAÇA OCULTA`;
    title.textContent = reward ? 'COLOSSO DA FORJA' : 'CONTATO';
    title.classList.toggle('reward', reward);
    const copy = reveal.querySelector('.impact-reveal-copy');
    copy.style.animation = 'none'; void copy.offsetWidth; copy.style.animation = '';
    reveal.classList.remove('fade');
    reveal.classList.add('show');
    playRevealSound();
    revealLockedUntil = performance.now() + 820;
    setTimeout(()=>{ reveal.classList.add('fade'); reveal.classList.remove('show'); }, 510);
    setTimeout(()=>{ reveal.classList.remove('fade'); }, 900);
  }

  try{
    if(typeof updateBattleLogic==='function'){
      const baseUpdateBattleLogic = updateBattleLogic;
      updateBattleLogic = function(dt){
        if(performance.now() < revealLockedUntil) return;
        return baseUpdateBattleLogic(dt);
      };
    }
  }catch(_){ }

  try{
    if(typeof openPositionSelect==='function'){
      const baseOpenPositionSelect = openPositionSelect;
      openPositionSelect = function(teamIds, side, defaultSlots, title, onConfirm, timerSeconds, presetMap){
        if(typeof mode!=='undefined' && mode==='pve' && side==='left'){
          timerSeconds = prepSeconds;
          if(!String(title).includes('ameaça oculta')) title = `${title} · ${prepSeconds}s · ameaça oculta`;
        }
        return baseOpenPositionSelect(teamIds, side, defaultSlots, title, onConfirm, timerSeconds, presetMap);
      };
    }
  }catch(_){ }

  const timerLabel = document.getElementById('position-timer-label');
  if(timerLabel){
    const observeTimer = ()=>{
      const m = String(timerLabel.textContent||'').match(/(\d+)s/);
      const sec = m ? Number(m[1]) : null;
      timerLabel.classList.toggle('impact-danger', sec!==null && sec<=3);
      if(sec!==null && sec<=3 && sec!==lastTickSecond){
        lastTickSecond = sec;
        playTickSound(sec);
      }
      if(sec===null || sec>3) lastTickSecond = null;
    };
    new MutationObserver(observeTimer).observe(timerLabel,{childList:true,subtree:true,characterData:true});
    observeTimer();
  }

  try{
    if(typeof buildTeams==='function'){
      const baseBuildTeams = buildTeams;
      buildTeams = function(playerIds1, playerIds2OrEnemies, mode2p, ownedSrc1, ownedSrc2){
        if(typeof mode!=='undefined' && mode==='pve' && !mode2p) showReveal();
        return baseBuildTeams(playerIds1, playerIds2OrEnemies, mode2p, ownedSrc1, ownedSrc2);
      };
    }
  }catch(_){ }

  const FORGE_BOSS_ID = 'colosso_forja';
  const forgeBossDef = {
    name:'Colosso da Forja', element:'metal', hp:520, atk:7, range:1, speed:0.58,
    special:null, desc:'Criatura de espólio. Carrega metal, equipamento e moedas da forja.'
  };

  try{
    if(typeof ENEMY_CATALOG!=='undefined') ENEMY_CATALOG[FORGE_BOSS_ID] = forgeBossDef;
    if(typeof randomEnemyWave==='function'){
      const baseRandomEnemyWave = randomEnemyWave;
      randomEnemyWave = function(waveNum){
        if(typeof mode!=='undefined' && mode==='pve' && waveNum===15){
          if(typeof lastWaveEvent!=='undefined') lastWaveEvent = 'boss';
          const hpScale = typeof waveHpScale==='function' ? waveHpScale(waveNum) : 2.5;
          const atkBonus = typeof waveAtkBonus==='function' ? waveAtkBonus(waveNum) : 8;
          return [{
            key:FORGE_BOSS_ID, boosted:false, isBoss:true, isRewardBoss:true,
            scaled:{hp:Math.round(forgeBossDef.hp*hpScale), atk:Math.round(forgeBossDef.atk+atkBonus), range:1, speed:forgeBossDef.speed, stars:2, special:null}
          }];
        }
        const saved = (typeof ENEMY_CATALOG!=='undefined') ? ENEMY_CATALOG[FORGE_BOSS_ID] : null;
        if(saved) delete ENEMY_CATALOG[FORGE_BOSS_ID];
        try{ return baseRandomEnemyWave(waveNum); }
        finally{ if(saved) ENEMY_CATALOG[FORGE_BOSS_ID] = saved; }
      };
    }
  }catch(_){ }

  try{
    if(typeof applyTempEnemyStats==='function'){
      const baseApplyTempEnemyStats = applyTempEnemyStats;
      applyTempEnemyStats = function(wavePicks){
        const out = baseApplyTempEnemyStats(wavePicks);
        try{
          const enemyUnits = units.filter(x=>x.team==='enemy');
          wavePicks.forEach((pick,i)=>{
            if(pick && pick.isRewardBoss && enemyUnits[i]) enemyUnits[i].isRewardBoss = true;
          });
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  function arenaToWrap(x,y){
    try{
      const pt = arena.createSVGPoint(); pt.x=x; pt.y=y;
      const screen = pt.matrixTransform(arena.getScreenCTM());
      const wr = wrap.getBoundingClientRect();
      return {x:screen.x-wr.left,y:screen.y-wr.top};
    }catch(_){ return {x:wrap.clientWidth/2,y:wrap.clientHeight/2}; }
  }

  function spawnCoinBurst(x,y){
    const p = arenaToWrap(x,y);
    for(let i=0;i<16;i++){
      const coin = document.createElement('div');
      coin.className = 'forge-coin';
      coin.style.left = p.x+'px'; coin.style.top = p.y+'px';
      const angle = (Math.PI*2*i/16) + (Math.random()-.5)*.35;
      const dist = 42 + Math.random()*78;
      coin.style.setProperty('--dx', (Math.cos(angle)*dist).toFixed(1)+'px');
      coin.style.setProperty('--dy', (Math.sin(angle)*dist - 28).toFixed(1)+'px');
      coin.style.setProperty('--rot', ((Math.random()*540)-270).toFixed(0)+'deg');
      coin.style.animationDelay = (Math.random()*.09).toFixed(2)+'s';
      wrap.appendChild(coin);
      setTimeout(()=>coin.remove(),1100);
    }
  }

  function pickForgeItem(){
    try{
      const candidates = Object.entries(ITEM_CATALOG).filter(([,d])=>d && !d.isRelic && Number(d.cost)>=50 && Number(d.cost)<=100);
      if(!candidates.length) return null;
      return candidates[Math.floor(Math.random()*candidates.length)];
    }catch(_){ return null; }
  }

  function awardForgeBoss(target){
    if(!target || target.__forgeRewardPaid) return;
    target.__forgeRewardPaid = true;
    const rewardCoins = 180 + Math.floor(Math.random()*61);
    try{
      coins += rewardCoins;
      totalCoinsThisRun += rewardCoins;
      updateCoinBadge();
    }catch(_){ }
    const rewardItem = pickForgeItem();
    if(rewardItem){
      try{ itemInventory[rewardItem[0]] = (itemInventory[rewardItem[0]]||0) + 1; }catch(_){ }
    }
    try{
      spawnFloatText(target.rx,target.ry-44,`+${rewardCoins} 🪙`,'#e8c250','dramatic');
      if(rewardItem) spawnFloatText(target.rx,target.ry-68,`EQUIPAMENTO: ${rewardItem[1].name}`,'#fff2a8','dramatic');
      spawnShockwaveRing(target.rx,target.ry,260,'#e8c250',0);
      spawnShockwaveRing(target.rx,target.ry,190,'#fff2a8',110);
      log(`💰 O Colosso da Forja foi abatido: +${rewardCoins} moedas${rewardItem ? ` e ${rewardItem[1].name}` : ''}!`,'hl');
    }catch(_){ }
    spawnCoinBurst(target.rx,target.ry);
    playLootSound();
  }

  try{
    if(typeof checkVictory==='function'){
      const baseCheckVictory = checkVictory;
      checkVictory = function(){
        try{
          if(typeof mode!=='undefined' && mode==='pve'){
            units.filter(u=>u && u.isRewardBoss && !u.alive && !u.__forgeRewardPaid).forEach(awardForgeBoss);
          }
        }catch(_){ }
        return baseCheckVictory();
      };
    }
  }catch(_){ }

  window.__ferroImpactSurprise = { revealLockedUntil:()=>revealLockedUntil };
})();
