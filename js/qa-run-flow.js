/* Ferro & Lança — QA: fluxo de run, inventário e qualidade de vida. */
(function(){
  if(window.__ferroQaRunFlowV1) return;
  window.__ferroQaRunFlowV1=true;

  const AUTO_KEY='ferroLancaQaAutoRounds';
  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  let autoRounds=false;
  try{ autoRounds=localStorage.getItem(AUTO_KEY)==='1'; }catch(_){ }

  const style=document.createElement('style');
  style.textContent=`
    #qa-position-actions{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:10040;display:none;gap:8px;align-items:center;padding:8px;border:1px solid rgba(155,166,181,.28);border-radius:10px;background:rgba(13,15,19,.94);box-shadow:0 12px 34px rgba(0,0,0,.46);backdrop-filter:blur(8px)}
    #qa-position-actions.show{display:flex}#qa-position-actions button{white-space:nowrap}
    #qa-battle-tools{position:absolute;right:10px;top:54px;z-index:23;display:flex;gap:5px;align-items:center;pointer-events:auto}
    #qa-battle-tools button{min-width:44px;padding:6px 9px;border:1px solid rgba(155,166,181,.28);border-radius:7px;background:rgba(11,13,16,.82);color:#c9d0d8;font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.05em;cursor:pointer;box-shadow:0 5px 16px rgba(0,0,0,.22)}
    #qa-battle-tools button:hover{border-color:rgba(242,173,85,.7);color:#f2d7a7}#qa-battle-tools button.on{border-color:rgba(232,194,80,.78);color:#f0d473;background:rgba(232,194,80,.10)}
    #qa-run-summary{position:absolute;left:12px;top:58px;z-index:8;width:152px;padding:9px 10px;border:1px solid rgba(155,166,181,.16);border-radius:9px;background:rgba(9,11,14,.68);box-shadow:0 8px 24px rgba(0,0,0,.18);backdrop-filter:blur(5px);pointer-events:none;font:600 10.5px/1.45 'JetBrains Mono',monospace;color:#aeb7c1}
    #qa-run-summary .qa-run-title{font:800 10px/1.2 'Oswald',sans-serif;letter-spacing:.12em;color:#efcf91;text-transform:uppercase;margin-bottom:6px}#qa-run-summary b{color:#e9e4dc}
    @media(max-width:1120px){#qa-run-summary{display:none}#qa-battle-tools{top:48px}}
    @media(max-width:620px){#qa-position-actions{bottom:10px;width:calc(100vw - 20px);justify-content:center;flex-wrap:wrap}#qa-position-actions button{flex:1}}
  `;
  document.head.appendChild(style);

  function visible(el){
    if(!el) return false;
    const s=getComputedStyle(el);
    return s.display!=='none' && s.visibility!=='hidden' && el.getClientRects().length>0;
  }
  function buttonByText(text){
    const want=String(text).trim().toUpperCase();
    return [...document.querySelectorAll('button')].find(b=>visible(b) && String(b.textContent||'').trim().toUpperCase()===want)||null;
  }

  /* A ficha de recomendação captura o clique antes do inventário. Dentro da mochila,
     o clique volta a pertencer ao fluxo de venda original; ficha continua funcionando
     em cards de loja/loot e outros pontos. */
  function restoreInventorySelling(){
    document.querySelectorAll('.inv-tile [data-item-info], .inv-tile.item-info-trigger').forEach(el=>{
      el.removeAttribute('data-item-info');
      el.classList.remove('item-info-trigger');
    });
    document.querySelectorAll('.inv-tile').forEach(tile=>{
      const id=tile.dataset.itemId;
      try{
        if(id && typeof ITEM_CATALOG!=='undefined' && ITEM_CATALOG[id]) tile.title=ITEM_CATALOG[id].name+' — clique para vender; arraste até um slot para equipar';
      }catch(_){ }
    });
  }

  /* Tentáculos são lutadores corpo a corpo. Força alcance 1 tanto no gameplay quanto
     na leitura de VFX, evitando tiros/projéteis gerados pelo feedback de combate. */
  try{
    if(typeof spawnNerithTentacle==='function'){
      const baseSpawnTentacle=spawnNerithTentacle;
      spawnNerithTentacle=function(nerith){
        let before=new Set();
        try{ before=new Set(units.filter(u=>u&&u.isTentacle).map(u=>u.id)); }catch(_){ }
        const out=baseSpawnTentacle.apply(this,arguments);
        try{
          units.filter(u=>u&&u.isTentacle&&!before.has(u.id)).forEach(t=>{ t.range=1; });
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }
  function enforceMeleeTentacles(){
    try{ units.filter(u=>u&&u.isTentacle).forEach(t=>{ if(t.range!==1)t.range=1; }); }catch(_){ }
  }

  /* Confirmação de posições sempre acessível, mesmo quando a grade/lista aumenta a página. */
  const floatActions=document.createElement('div');
  floatActions.id='qa-position-actions';
  floatActions.innerHTML='<button type="button" class="main-btn" data-qa-proxy="confirm">Confirmar posições</button><button type="button" class="ghost-btn" data-qa-proxy="default">Posições padrão</button>';
  document.body.appendChild(floatActions);
  floatActions.addEventListener('click',e=>{
    const proxy=e.target.closest('[data-qa-proxy]'); if(!proxy)return;
    const original=buttonByText(proxy.dataset.qaProxy==='confirm'?'CONFIRMAR POSIÇÕES':'POSIÇÕES PADRÃO');
    if(original && !original.disabled) original.click();
  });
  function syncFloatingActions(){
    const confirm=buttonByText('CONFIRMAR POSIÇÕES');
    const proxyConfirm=floatActions.querySelector('[data-qa-proxy="confirm"]');
    if(proxyConfirm) proxyConfirm.disabled=!!(confirm&&confirm.disabled);
    floatActions.classList.toggle('show',!!confirm && !autoRounds);
  }

  /* Controles compactos da batalha. Camera-controls reutiliza este mesmo host. */
  let tools=document.getElementById('qa-battle-tools');
  if(!tools && wrap){ tools=document.createElement('div'); tools.id='qa-battle-tools'; wrap.appendChild(tools); }
  let autoBtn=null;
  if(tools){
    autoBtn=document.createElement('button');
    autoBtn.id='qa-auto-rounds-btn';
    autoBtn.type='button';
    tools.appendChild(autoBtn);
    function syncAutoButton(){
      autoBtn.textContent=autoRounds?'AUTO ✓':'AUTO';
      autoBtn.classList.toggle('on',autoRounds);
      autoBtn.setAttribute('aria-pressed',autoRounds?'true':'false');
      autoBtn.title=autoRounds?'Auto ligado: pula intervalo e confirma a preparação da próxima onda.':'Auto: pula intervalo e confirma automaticamente a próxima onda.';
    }
    syncAutoButton();
    autoBtn.addEventListener('click',()=>{
      autoRounds=!autoRounds;
      try{ localStorage.setItem(AUTO_KEY,autoRounds?'1':'0'); }catch(_){ }
      syncAutoButton();
      syncFloatingActions();
    });
  }

  let autoBusy=false;
  function autoStep(){
    if(!autoRounds || autoBusy) return;
    const skip=buttonByText('PULAR');
    const confirm=buttonByText('CONFIRMAR POSIÇÕES');
    const defaults=buttonByText('POSIÇÕES PADRÃO');
    let target=null;
    if(skip && !skip.disabled) target=skip;
    else if(confirm){
      if(confirm.disabled && defaults && !defaults.disabled) target=defaults;
      else if(!confirm.disabled) target=confirm;
    }
    if(!target) return;
    autoBusy=true;
    try{ target.click(); }catch(_){ }
    setTimeout(()=>{autoBusy=false;},420);
  }

  /* Usa o espaço lateral vazio como painel discreto da run, sem virar outro log. */
  let runSummary=null;
  if(wrap){
    runSummary=document.createElement('div');
    runSummary.id='qa-run-summary';
    wrap.appendChild(runSummary);
  }
  function updateRunSummary(){
    if(!runSummary) return;
    let w='—',team=[];
    try{ w=typeof wave!=='undefined'?wave:'—'; }catch(_){ }
    try{ team=Array.isArray(units)?units.filter(u=>u&&u.team==='player'&&!u.isTentacle):[]; }catch(_){ team=[]; }
    const unique=[];
    const seen=new Set();
    team.forEach(u=>{if(!seen.has(u.champId)){seen.add(u.champId);unique.push(u);}});
    const maxed=unique.filter(u=>(Number(u.stars)||1)>=4).length;
    const itemCount=unique.reduce((sum,u)=>sum+(Array.isArray(u.itemIds)?u.itemIds.filter(Boolean).length:0)+(u.relicId?1:0),0);
    runSummary.innerHTML=`<div class="qa-run-title">Resumo da run</div><div>Onda <b>${w}</b></div><div>Equipe <b>${unique.length||'—'}</b></div><div>4★ <b>${maxed}/${unique.length||0}</b></div><div>Itens equipados <b>${itemCount}</b></div><div>Auto <b>${autoRounds?'ligado':'desligado'}</b></div>`;
  }

  const observer=new MutationObserver(()=>{
    restoreInventorySelling();
    syncFloatingActions();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  restoreInventorySelling();
  syncFloatingActions();
  setInterval(()=>{
    restoreInventorySelling();
    enforceMeleeTentacles();
    syncFloatingActions();
    updateRunSummary();
    autoStep();
  },250);

  window.FerroQaRunFlow={
    getAuto:()=>autoRounds,
    setAuto(v){
      autoRounds=!!v;
      try{localStorage.setItem(AUTO_KEY,autoRounds?'1':'0');}catch(_){ }
      if(autoBtn){
        autoBtn.textContent=autoRounds?'AUTO ✓':'AUTO';
        autoBtn.classList.toggle('on',autoRounds);
        autoBtn.setAttribute('aria-pressed',autoRounds?'true':'false');
      }
      syncFloatingActions();
    },
    restoreInventorySelling,
    enforceMeleeTentacles
  };
})();
