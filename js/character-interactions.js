/* Ferro & Lança — interações contextuais entre personagens.
   Regra de prioridade: cinematográficas/passivas/finalizações sempre vencem diálogos de dupla.
*/
(function(){
  if(window.__ferroCharacterInteractionsV1) return;
  window.__ferroCharacterInteractionsV1=true;

  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  if(!wrap) return;

  const START_PAIRS=[
    {key:'start-ferrha-ima',a:'ferrha',b:'ima',lines:[['Ímã','Ferrha, puxa eles pra mim.'],['Ferrha','Então segura.']]},
    {key:'start-kael-glacia',a:'kael',b:'glacia',lines:[['Kael','Não apaga meu fogo.'],['Glacia','Então para de queimar a gente!']]},
    {key:'start-voss-zeph',a:'voss',b:'zeph',lines:[['Zeph','Quem derrubar mais?'],['Voss','Você ainda está contando?']]},
    {key:'start-jedegar-terrus',a:'jedegar',b:'terrus',lines:[['Jedegar','Firme como o solo.'],['Terrus','E pesado como montanha.']]},
    {key:'start-frosk-gelida',a:'frosk',b:'gelida',lines:[['Frosk','Congela e quebra!'],['Gélida','Você sempre pula a parte elegante.']]},
    {key:'start-raio-voltra',a:'raio',b:'voltra',lines:[['Raio','Você sempre faz essa cara séria?'],['Voltra','Só quando você começa a falar.']]}
  ];

  const style=document.createElement('style');
  style.textContent=`
    #character-interaction{position:absolute;left:50%;top:10px;transform:translate(-50%,-8px);z-index:25;min-width:220px;max-width:min(440px,72%);padding:8px 12px;border:1px solid rgba(155,166,181,.28);border-radius:9px;background:rgba(8,10,13,.88);box-shadow:0 8px 26px rgba(0,0,0,.38);backdrop-filter:blur(7px);opacity:0;pointer-events:none;transition:opacity .14s ease,transform .14s ease;text-align:center}
    #character-interaction.show{opacity:1;transform:translate(-50%,0)}
    #character-interaction .ci-speaker{font:800 10px/1.2 'Oswald',sans-serif;letter-spacing:.11em;text-transform:uppercase;color:#efcf91;margin-bottom:3px}
    #character-interaction .ci-line{font:600 12px/1.35 'JetBrains Mono',monospace;color:#e7e2da}
    @media(max-width:640px){#character-interaction{top:42px;max-width:86%;padding:7px 10px}#character-interaction .ci-line{font-size:10.5px}}
  `;
  document.head.appendChild(style);

  const box=document.createElement('div');
  box.id='character-interaction';
  box.innerHTML='<div class="ci-speaker"></div><div class="ci-line"></div>';
  wrap.appendChild(box);
  const speakerEl=box.querySelector('.ci-speaker');
  const lineEl=box.querySelector('.ci-line');

  const seen=new Set();
  const reserved=new Set();
  const queue=[];
  let active=null;
  let dialogueToken=0;
  let lastDialogueEndedAt=0;

  function specialBusy(){
    try{
      if(window.FerroCombatCinema&&typeof window.FerroCombatCinema.isActive==='function'&&window.FerroCombatCinema.isActive()) return true;
    }catch(_){ }
    if(window.__ferroAbilityCinematicActive) return true;
    try{ if(typeof finisherActive!=='undefined'&&finisherActive) return true; }catch(_){ }
    return false;
  }

  function isBattleActive(){
    try{ return !!battleActive; }catch(_){ return false; }
  }

  function player(id,aliveOnly=true){
    try{
      return units.find(u=>u&&u.team==='player'&&!u.isTentacle&&u.champId===id&&(!aliveOnly||u.alive))||null;
    }catch(_){ return null; }
  }

  function pairAlive(a,b){ return !!(player(a)&&player(b)); }

  function hide(){ box.classList.remove('show'); }
  function showLine(pair){
    speakerEl.textContent=pair[0];
    lineEl.textContent=`“${pair[1]}”`;
    box.classList.add('show');
  }

  function finishActive(){
    hide();
    active=null;
    lastDialogueEndedAt=performance.now();
    setTimeout(pump,180);
  }

  function play(item){
    active=item;
    seen.add(item.key);
    reserved.delete(item.key);
    const token=++dialogueToken;
    const started=performance.now();
    let stage=-1;

    function frame(now){
      if(token!==dialogueToken) return;
      if(!isBattleActive()||specialBusy()){
        finishActive();
        return;
      }
      const elapsed=now-started;
      const nextStage=elapsed<1350?0:elapsed<2750?1:2;
      if(nextStage!==stage){
        stage=nextStage;
        if(stage<2) showLine(item.lines[stage]);
      }
      if(stage>=2){ finishActive(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function pump(){
    if(active||!queue.length) return;
    if(!isBattleActive()||specialBusy()||performance.now()-lastDialogueEndedAt<900){
      setTimeout(pump,220);
      return;
    }
    play(queue.shift());
  }

  function queueDialogue(key,lines){
    if(!key||!Array.isArray(lines)||lines.length<2||seen.has(key)||reserved.has(key)) return false;
    reserved.add(key);
    queue.push({key,lines});
    pump();
    return true;
  }

  function queueStartInteraction(){
    const eligible=START_PAIRS.filter(p=>!seen.has(p.key)&&pairAlive(p.a,p.b));
    if(!eligible.length) return;
    let idx=0;
    try{ idx=(Math.max(1,Number(wave)||1)-1)%eligible.length; }catch(_){ }
    const pick=eligible[idx]||eligible[0];
    queueDialogue(pick.key,pick.lines);
  }

  /* Interação contextual Ímã + Ferrha: dispara na primeira magnetização relevante. */
  let lastImaProc=0;
  function watchImaPull(){
    const ima=player('ima');
    if(!ima||!player('ferrha')) return;
    const proc=Number(ima.imaProcAt)||0;
    if(proc&&proc!==lastImaProc){
      lastImaProc=proc;
      queueDialogue('event-ferrha-ima-pull', [['Ímã','Agora!'],['Ferrha','Já entendi.']]);
    }
  }

  /* Glacia salvando Kael: observa uma ação de cura quando Kael já estava realmente em perigo. */
  try{
    if(typeof doAction==='function'){
      const baseDoAction=doAction;
      doAction=function(u){
        let kael=null,before=null,wasLow=false;
        try{
          if(u&&u.champId==='glacia'&&u.team==='player'){
            kael=player('kael');
            if(kael){ before=kael.hp; wasLow=kael.maxhp>0&&kael.hp/kael.maxhp<=0.45; }
          }
        }catch(_){ }
        const out=baseDoAction.apply(this,arguments);
        try{
          if(kael&&kael.alive&&wasLow&&typeof before==='number'&&kael.hp>before){
            queueDialogue('event-kael-glacia-save', [['Kael','Eu ainda tava bem!'],['Glacia','Claro que estava.']]);
          }
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  /* Dano contextual: Voss roubando um alvo que Zeph já estava focando e Terrus aguentando pancada pesada. */
  try{
    if(typeof applyDamage==='function'){
      const baseApplyDamage=applyDamage;
      applyDamage=function(attacker,target){
        let wasAlive=false,beforeHp=null,zephWasOnTarget=false;
        try{
          wasAlive=!!(target&&target.alive);
          beforeHp=target&&typeof target.hp==='number'?target.hp:null;
          if(attacker&&attacker.team==='player'&&attacker.champId==='voss'&&target){
            const zeph=player('zeph');
            if(zeph){
              zephWasOnTarget=zeph.targetId===target.id||zeph.target===target||zeph.target===target.id||(zeph.target&&zeph.target.id===target.id);
            }
          }
        }catch(_){ }
        const out=baseApplyDamage.apply(this,arguments);
        try{
          if(wasAlive&&target&&!target.alive&&attacker&&attacker.team==='player'&&attacker.champId==='voss'&&player('zeph')&&zephWasOnTarget){
            queueDialogue('event-voss-zeph-steal', [['Zeph','Esse era meu.'],['Voss','Era.']]);
          }
          if(target&&target.team==='player'&&target.champId==='terrus'&&target.alive&&player('jedegar')&&beforeHp!==null&&target.maxhp>0){
            const dealt=Math.max(0,beforeHp-target.hp);
            if(dealt/target.maxhp>=0.25||target.hp/target.maxhp<=0.35){
              queueDialogue('event-jedegar-terrus-heavy', [['Jedegar','Ainda firme?'],['Terrus','Pergunta pra eles.']]);
            }
          }
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  let previousBattle=false;
  setInterval(()=>{
    const activeNow=isBattleActive();
    if(activeNow&&!previousBattle){
      setTimeout(()=>{ if(isBattleActive()&&!specialBusy()) queueStartInteraction(); },420);
    }
    previousBattle=activeNow;
    if(activeNow) watchImaPull();
    if(active&&specialBusy()){
      dialogueToken++;
      finishActive();
    }
    pump();
  },140);

  window.FerroCharacterInteractions={
    queue:queueDialogue,
    seen:key=>seen.has(key),
    isBusy:()=>!!active,
    approvedPairs:START_PAIRS.map(p=>({a:p.a,b:p.b,key:p.key}))
  };
})();
