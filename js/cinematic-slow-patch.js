/* Ferro & Lança — QA: leitura longa nas cinematográficas de passiva. */
(function(){
  if(window.__ferroCinematicSlowPatchV1) return;
  window.__ferroCinematicSlowPatchV1=true;

  const api=window.FerroBattleTime;
  const overlay=document.getElementById('combat-cinematic');
  if(!api||typeof api.setSpeed!=='function'||typeof api.getSpeed!=='function'||!overlay) return;

  const baseSetSpeed=api.setSpeed.bind(api);
  let state=null;
  let restoring=false;
  const HOLD_MS=2550;
  const IMPACT_MS=2700;
  const END_MS=3300;

  let baseShake=null;
  try{
    if(typeof triggerScreenShake==='function'){
      baseShake=triggerScreenShake;
      triggerScreenShake=function(intensity,duration){
        if(state&&!restoring){
          state.pendingShake={intensity,duration};
          return;
        }
        return baseShake.apply(this,arguments);
      };
    }
  }catch(_){ }

  function elapsed(){ return state?performance.now()-state.started:0; }
  function preserveOverlay(){
    if(!state) return;
    const t=elapsed();
    if(t<HOLD_MS){
      overlay.classList.add('show','quote');
    }else if(t<IMPACT_MS){
      overlay.classList.add('show');
      overlay.classList.remove('quote');
    }
  }

  const observer=new MutationObserver(()=>{
    if(!state) return;
    if(elapsed()<IMPACT_MS) queueMicrotask(preserveOverlay);
  });
  observer.observe(overlay,{attributes:true,attributeFilter:['class']});

  function realDelay(ms,fn){
    const start=performance.now();
    function frame(now){
      if(now-start>=ms){ fn(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function finishExtendedScene(){
    if(!state) return;
    const restore=state.restoreSpeed||state.originalSpeed||1;
    const pending=state.pendingShake;
    restoring=true;
    overlay.classList.remove('quote');
    const flash=overlay.querySelector('.combat-cine-flash');
    if(flash){
      flash.classList.remove('hit');
      void flash.offsetWidth;
      flash.classList.add('hit');
    }
    if(pending&&baseShake){
      try{ baseShake(pending.intensity,pending.duration); }catch(_){ }
    }else if(baseShake){
      try{ baseShake(8,260); }catch(_){ }
    }
    baseSetSpeed(.5);
    realDelay(END_MS-IMPACT_MS,()=>{
      overlay.className='';
      baseSetSpeed(restore);
      state=null;
      restoring=false;
    });
  }

  api.setSpeed=function(v){
    const n=Number(v);
    const abilityActive=!!window.__ferroAbilityCinematicActive;

    if(abilityActive&&!state&&n===0.5){
      state={started:performance.now(),originalSpeed:api.getSpeed()||1,restoreSpeed:null,pendingShake:null};
      overlay.classList.add('show');
      realDelay(IMPACT_MS,()=>{ if(state&&!restoring) finishExtendedScene(); });
      return baseSetSpeed(.5);
    }

    if(state&&!restoring){
      const t=elapsed();
      if(n===0){
        preserveOverlay();
        return baseSetSpeed(0);
      }
      if(n===0.5&&t<HOLD_MS){
        preserveOverlay();
        return baseSetSpeed(0);
      }
      if(t<IMPACT_MS&&n!==0.5){
        state.restoreSpeed=n||state.originalSpeed;
        preserveOverlay();
        return baseSetSpeed(0);
      }
    }
    return baseSetSpeed(v);
  };

  window.FerroCinematicSlowPatch={
    holdMs:HOLD_MS,impactMs:IMPACT_MS,endMs:END_MS,
    isHolding:()=>!!state
  };
})();
