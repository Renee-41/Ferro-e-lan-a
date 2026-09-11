/* Ferro & Lança — controle de tempo da batalha.
   0.0x pausa a lógica mantendo câmera/inspeção responsivas; 0.5x/1x/2x escalam o combate.
*/
(function(){
  if(window.__ferroTimeControlsLoaded) return;
  window.__ferroTimeControlsLoaded = true;

  const arena = document.getElementById('arena');
  const wrap = arena && arena.closest('.arena-wrap');
  if(!arena || !wrap) return;
  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  let speed = 1;
  let lastNonZeroSpeed = 1;
  let lastAdjustReal = performance.now();
  let timerToken = -50000;
  const scaledTimers = new Map();

  window.__ferroBattleSpeed = speed;

  const style = document.createElement('style');
  style.textContent = `
    #battle-speed-control{position:absolute;right:10px;top:10px;z-index:17;display:flex;align-items:center;gap:3px;padding:4px 5px;border:1px solid rgba(199,207,217,.14);border-radius:8px;background:rgba(7,9,12,.78);box-shadow:0 5px 18px rgba(0,0,0,.28);backdrop-filter:blur(4px);font-family:'JetBrains Mono',monospace;user-select:none;}
    #battle-speed-control .speed-label{font-size:8px;letter-spacing:.12em;color:#7f8994;margin:0 3px 0 2px;}
    #battle-speed-control button{min-width:31px;height:24px;padding:0 5px;border:1px solid rgba(199,207,217,.12);border-radius:5px;background:rgba(255,255,255,.025);color:#aeb6c0;font:700 9px/1 'JetBrains Mono',monospace;cursor:pointer;transition:background .12s,border-color .12s,color .12s,box-shadow .12s;}
    #battle-speed-control button:hover{border-color:rgba(232,194,80,.38);color:#eee7d9;}
    #battle-speed-control button.active{background:rgba(232,194,80,.12);border-color:rgba(232,194,80,.55);color:#f0d473;box-shadow:0 0 10px rgba(232,194,80,.10);}
    #battle-speed-control button[data-speed="0"]{min-width:36px;}
    #battle-speed-control button[data-speed="0"].active{background:rgba(201,77,61,.14);border-color:rgba(232,90,75,.55);color:#ff9a83;box-shadow:0 0 10px rgba(210,70,55,.13);}
    #battle-speed-state{position:absolute;right:10px;top:44px;z-index:16;display:none;padding:3px 7px;border-radius:999px;background:rgba(7,9,12,.74);border:1px solid rgba(232,90,75,.25);color:#ff9a83;font:700 8px/1.2 'JetBrains Mono',monospace;letter-spacing:.08em;pointer-events:none;}
    #battle-speed-state.show{display:block;}
    @media(max-width:640px){#battle-speed-control{right:6px;top:6px;gap:2px;padding:3px}#battle-speed-control .speed-label{display:none}#battle-speed-control button{min-width:29px;height:23px;padding:0 4px;font-size:8px}#battle-speed-state{right:6px;top:37px}}
  `;
  document.head.appendChild(style);

  const control = document.createElement('div');
  control.id = 'battle-speed-control';
  control.setAttribute('aria-label','Velocidade da batalha');
  control.innerHTML = '<span class="speed-label">VEL</span>' +
    '<button type="button" data-speed="0" title="Pausar batalha">0.0</button>' +
    '<button type="button" data-speed="0.5" title="Câmera lenta">0.5</button>' +
    '<button type="button" data-speed="1" class="active" title="Velocidade normal">1.0</button>' +
    '<button type="button" data-speed="2" title="Acelerar batalha">2.0</button>';
  wrap.appendChild(control);

  const state = document.createElement('div');
  state.id = 'battle-speed-state';
  state.textContent = 'PAUSADO · INSPEÇÃO LIBERADA';
  wrap.appendChild(state);

  function setBattlePausedFlag(paused){
    try{ battlePaused = paused; }catch(_){ }
  }

  function setSpeed(next){
    const n = Number(next);
    if(![0,.5,1,2].includes(n)) return;
    // Evita contabilizar o intervalo entre o último frame e o clique com a velocidade nova.
    lastAdjustReal = performance.now();
    speed = n;
    if(speed>0) lastNonZeroSpeed = speed;
    window.__ferroBattleSpeed = speed;
    setBattlePausedFlag(speed===0);
    control.querySelectorAll('button[data-speed]').forEach(btn=>{
      btn.classList.toggle('active', Number(btn.dataset.speed)===speed);
    });
    state.classList.toggle('show', speed===0);
    control.title = speed===0 ? 'Batalha pausada — câmera e inspeção continuam livres' : `Velocidade da batalha: ${speed.toFixed(1)}x`;
  }

  control.addEventListener('click', ev=>{
    const btn = ev.target.closest('button[data-speed]');
    if(!btn) return;
    ev.preventDefault(); ev.stopPropagation();
    setSpeed(btn.dataset.speed);
  });

  // Espaço funciona como pausa/retomar quando a tela de batalha está aberta.
  window.addEventListener('keydown', ev=>{
    if(ev.code!=='Space' || ev.repeat) return;
    const tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : '';
    if(tag==='input' || tag==='textarea' || tag==='select' || (ev.target && ev.target.isContentEditable)) return;
    const battleScreen = document.getElementById('screen-battle');
    if(!battleScreen || !battleScreen.classList.contains('active')) return;
    ev.preventDefault();
    setSpeed(speed===0 ? lastNonZeroSpeed : 0);
  });

  function shiftNumericDeadline(obj, key, delta){
    const value = obj && obj[key];
    if(typeof value!=='number' || !Number.isFinite(value) || value<1000) return;
    if(!/(until|at|start|time)$/i.test(key)) return;
    obj[key] = value + delta;
  }

  function shiftObjectDeadlines(obj, delta, seen, depth){
    if(!obj || typeof obj!=='object' || depth>3) return;
    if(seen.has(obj)) return;
    seen.add(obj);
    Object.keys(obj).forEach(key=>{
      const value = obj[key];
      if(typeof value==='number') shiftNumericDeadline(obj,key,delta);
      else if(value && typeof value==='object') shiftObjectDeadlines(value,delta,seen,depth+1);
    });
  }

  function shiftGlobalDeadlines(delta){
    if(!delta || Math.abs(delta)<.01) return;
    const seen = new WeakSet();
    try{ units.forEach(u=>shiftObjectDeadlines(u,delta,seen,0)); }catch(_){ }
    try{ emberEvents.forEach(e=>shiftObjectDeadlines(e,delta,seen,0)); }catch(_){ }
    try{ Object.values(jedegarStructures).forEach(s=>shiftObjectDeadlines(s,delta,seen,0)); }catch(_){ }
    try{ if(Number.isFinite(fractureNextAt) && fractureNextAt>1000) fractureNextAt += delta; }catch(_){ }
    try{ if(Number.isFinite(fractureEndAt) && fractureEndAt>1000) fractureEndAt += delta; }catch(_){ }
    try{ if(Number.isFinite(shakeUntil) && shakeUntil>1000) shakeUntil += delta; }catch(_){ }
    try{ if(Number.isFinite(weatherTransitionStart) && weatherTransitionStart>1000) weatherTransitionStart += delta; }catch(_){ }
  }

  function adjustAbsoluteTime(){
    const now = performance.now();
    const realDt = Math.max(0, Math.min(120, now-lastAdjustReal));
    lastAdjustReal = now;
    // Datas absolutas continuam armazenadas no relógio real; mover o deadline faz o tempo
    // restante avançar na mesma proporção do multiplicador escolhido.
    shiftGlobalDeadlines(realDt*(1-speed));
  }

  try{
    if(typeof updateBattleLogic==='function'){
      const baseUpdateBattleLogic = updateBattleLogic;
      updateBattleLogic = function(dt){
        adjustAbsoluteTime();
        if(speed===0) return;
        return baseUpdateBattleLogic(dt*speed);
      };
    }
  }catch(_){ }

  try{
    if(typeof updateAnimations==='function'){
      const baseUpdateAnimations = updateAnimations;
      updateAnimations = function(dt){ return baseUpdateAnimations(dt*speed); };
    }
  }catch(_){ }

  // Estes dois sistemas usam relógio absoluto e são chamados fora de updateBattleLogic no loop.
  // Os deadlines já são corrigidos acima; em 0x bloqueamos a execução por completo.
  try{
    if(typeof updateEmberEvents==='function'){
      const baseUpdateEmberEvents = updateEmberEvents;
      updateEmberEvents = function(){ if(speed===0) return; return baseUpdateEmberEvents(); };
    }
  }catch(_){ }
  try{
    if(typeof updateComboState==='function'){
      const baseUpdateComboState = updateComboState;
      updateComboState = function(){ if(speed===0) return; return baseUpdateComboState(); };
    }
  }catch(_){ }

  // setTimeouts disparados DURANTE a batalha (saltos elétricos, impactos atrasados,
  // finishers etc.) passam a obedecer ao mesmo relógio, inclusive se a velocidade mudar no meio.
  function scheduleScaledTimeout(fn, delay, args){
    const token = timerToken--;
    const rec = {remaining:Math.max(0,Number(delay)||0), last:performance.now(), nativeId:null, cancelled:false};
    const step = ()=>{
      if(rec.cancelled) return;
      const now = performance.now();
      const elapsed = Math.max(0, Math.min(250, now-rec.last));
      rec.last = now;
      rec.remaining -= elapsed*speed;
      if(rec.remaining<=0){
        scaledTimers.delete(token);
        fn(...args);
        return;
      }
      const wait = speed>0 ? Math.max(16,Math.min(70,rec.remaining/speed)) : 50;
      rec.nativeId = nativeSetTimeout(step,wait);
    };
    rec.nativeId = nativeSetTimeout(step,Math.min(70,Math.max(16,rec.remaining/Math.max(speed,.25))));
    scaledTimers.set(token,rec);
    return token;
  }

  window.setTimeout = function(fn,delay,...args){
    let active=false;
    try{ active=!!battleActive; }catch(_){ active=false; }
    if(active && typeof fn==='function' && Number(delay)>0) return scheduleScaledTimeout(fn,delay,args);
    return nativeSetTimeout(fn,delay,...args);
  };
  window.clearTimeout = function(id){
    const rec = scaledTimers.get(id);
    if(rec){
      rec.cancelled=true;
      nativeClearTimeout(rec.nativeId);
      scaledTimers.delete(id);
      return;
    }
    return nativeClearTimeout(id);
  };

  // API pequena para outros módulos/futuros controles.
  window.FerroBattleTime = {
    getSpeed:()=>speed,
    setSpeed,
    togglePause:()=>setSpeed(speed===0 ? lastNonZeroSpeed : 0)
  };
})();
