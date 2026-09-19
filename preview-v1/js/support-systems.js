/* Ferro & Lança — Gameplay Polish v1: suporte, itens, relíquias e métricas. */
(function(){
  if(window.__ferroSupportSystemsV1) return;
  window.__ferroSupportSystemsV1=true;
  if(typeof ITEM_CATALOG==='undefined') return;

  const SUPPORT_ITEMS={
    sino_cadencia:{
      name:'Sino de Cadência', kind:'suporte · cadência', cost:70,
      desc:'+18% de velocidade de ataque e +30 de HP. Feito para suportes ativarem cura e utilidade com mais frequência.',
      effect:{speedPct:0.18,hpFlat:30,appliesTo:'all'}
    },
    selo_amparo:{
      name:'Selo de Amparo', kind:'suporte · proteção', cost:75,
      desc:'+70 de HP e 8% de redução de dano. Uma base defensiva para suportes permanecerem vivos e continuarem ajudando.',
      effect:{hpFlat:70,dmgReductionPct:0.08,appliesTo:'all'}
    },
    elo_harmonico:{
      name:'Elo Harmônico', kind:'combinado · suporte · cura', recipe:['sino_cadencia','amplificador'],
      desc:'Sino de Cadência + Núcleo Amplificador. +22% de velocidade e +45 HP. Toda cura direta feita por um Suporte recebe +20% de cura adicional.',
      effect:{speedPct:0.22,hpFlat:45,appliesTo:'all'}
    },
    bandeira_elo:{
      name:'Bandeira do Elo', kind:'combinado · suporte · amplificação', recipe:['selo_amparo','amplificador'],
      desc:'Selo de Amparo + Núcleo Amplificador. +90 HP e 8% de redução. Aliados a até 2 blocos causam +10% de dano enquanto o Suporte estiver vivo.',
      effect:{hpFlat:90,dmgReductionPct:0.08,appliesTo:'all'}
    },
    circulo_restaurador:{
      name:'Círculo Restaurador', kind:'combinado · suporte · regeneração', recipe:['sino_cadencia','amuleto'],
      desc:'Sino de Cadência + Amuleto Vital. +12% de velocidade e +50 HP. A cada 5s, cura 6% da vida máxima do aliado mais ferido a até 3 blocos.',
      effect:{speedPct:0.12,hpFlat:50,appliesTo:'all'}
    }
  };
  Object.assign(ITEM_CATALOG,SUPPORT_ITEMS);

  if(ITEM_CATALOG.coracao_ferro){
    ITEM_CATALOG.coracao_ferro.desc='Amuleto Vital + Placa de Blindagem. +90 HP e 12% de redução. Batimento de Ferro: a cada 5 impactos sofridos, cura 7% da vida máxima e ganha +25% de redução de dano por 2,5s.';
    ITEM_CATALOG.coracao_ferro.effect={hpFlat:90,dmgReductionPct:0.12,appliesTo:'all'};
  }

  if(ITEM_CATALOG.nucleo_rachadura){
    ITEM_CATALOG.nucleo_rachadura.desc='Relíquia de chefe. +50% de dano e +30% de velocidade de ataque. É a relíquia ofensiva de alto impacto da run.';
    ITEM_CATALOG.nucleo_rachadura.effect={atkPct:0.50,speedPct:0.30,appliesTo:'all'};
  }
  if(ITEM_CATALOG.fragmento_corrompido){
    ITEM_CATALOG.fragmento_corrompido.desc='Relíquia de chefe. Mantém a cura de abate e, sempre que elimina um inimigo, absorve corrupção: cura 10% da vida máxima e ganha +15% de dano por 5s.';
    ITEM_CATALOG.fragmento_corrompido.effect={onKillHealChance:0.25,onKillHealPct:0.15,appliesTo:'all'};
  }
  if(ITEM_CATALOG.coroa_ferro){
    ITEM_CATALOG.coroa_ferro.desc='Relíquia de chefe. +320 HP e 25% de redução de dano. Na primeira vez abaixo de 35% de vida, recupera 8% da vida máxima e recebe +20% de redução adicional por 4s.';
    ITEM_CATALOG.coroa_ferro.effect={hpFlat:320,dmgReductionPct:0.25,appliesTo:'all'};
  }

  try{
    if(typeof ITEM_CLASS_TAGS!=='undefined'){
      Object.keys(SUPPORT_ITEMS).forEach(id=>{ ITEM_CLASS_TAGS[id]=['suporte']; });
      function addTagRecursive(id,tag,seen){
        if(!id||seen.has(id)||!ITEM_CATALOG[id]) return;
        seen.add(id);
        const tags=ITEM_CLASS_TAGS[id]||(ITEM_CLASS_TAGS[id]=[]);
        if(!tags.includes(tag)) tags.push(tag);
        const recipe=ITEM_CATALOG[id].recipe||[];
        recipe.forEach(comp=>addTagRecursive(comp,tag,seen));
      }
      Object.entries(ITEM_CLASS_TAGS).forEach(([id,tags])=>{
        [...tags].forEach(tag=>addTagRecursive(id,tag,new Set()));
      });
    }
  }catch(_){ }

  try{
    if(typeof ITEM_ICON_SHAPE_BY_ID!=='undefined'){
      ITEM_ICON_SHAPE_BY_ID.sino_cadencia='core';
      ITEM_ICON_SHAPE_BY_ID.selo_amparo='shield';
      ITEM_ICON_SHAPE_BY_ID.elo_harmonico='core';
      ITEM_ICON_SHAPE_BY_ID.bandeira_elo='shield';
      ITEM_ICON_SHAPE_BY_ID.circulo_restaurador='gem';
    }
  }catch(_){ }

  try{
    if(typeof RECOMMENDED_ITEMS!=='undefined'){
      if(RECOMMENDED_ITEMS.glacia){
        RECOMMENDED_ITEMS.glacia.items=['elo_harmonico','circulo_restaurador','nucleo_eterno'];
        RECOMMENDED_ITEMS.glacia.note='Cura e cadência: Elo aumenta cada cura, Círculo adiciona sustentação automática e Núcleo fortalece a habilidade.';
      }
      if(RECOMMENDED_ITEMS.jedegar){
        RECOMMENDED_ITEMS.jedegar.items=['bandeira_elo','selo_amparo','nucleo_eterno'];
        RECOMMENDED_ITEMS.jedegar.note='Amplificação e sobrevivência: permaneça viva perto do time para os pilares e a Bandeira multiplicarem o valor dos aliados.';
      }
    }
  }catch(_){ }

  const SUPPORT_IDS=new Set(['glacia','jedegar']);
  function owns(u,id){
    try{ return typeof hasItem==='function' ? hasItem(u,id) : !!(u&&Array.isArray(u.itemIds)&&u.itemIds.includes(id)); }
    catch(_){ return false; }
  }
  function statFor(id){
    try{
      const s=ensureMatchStats(id);
      if(s.healingReceived===undefined) s.healingReceived=0;
      if(s.healingDone===undefined) s.healingDone=0;
      if(s.amplificationGiven===undefined) s.amplificationGiven=0;
      return s;
    }catch(_){ return null; }
  }

  let tickDirectReceived=new Map();
  function recordHeal(source,target,amount){
    const real=Math.max(0,Math.round(Number(amount)||0));
    if(!target||real<=0) return;
    if(target.team==='player'){
      const ts=statFor(target.champId);
      if(ts) ts.healingReceived+=real;
      tickDirectReceived.set(target.id,(tickDirectReceived.get(target.id)||0)+real);
    }
    if(source&&source.team==='player'&&SUPPORT_IDS.has(source.champId)){
      const ss=statFor(source.champId);
      if(ss) ss.healingDone+=real;
    }
  }

  function jedegarSource(attacker){
    try{
      const now=performance.now();
      let best=null;
      Object.values(jedegarStructures).forEach(s=>{
        if(s.ownerTeam!==attacker.team||hexDistance(s,attacker)>2) return;
        const owner=units.find(o=>o.id===s.ownerId);
        if(!owner||owner.champId!=='jedegar') return;
        const milestone=getJedegarProgress(owner).milestoneReached;
        let bonus=milestone?0.20:0.10;
        if(s.boostUntil&&now<s.boostUntil) bonus+=0.15;
        if(!best||bonus>best.bonus) best={owner,bonus};
      });
      return best;
    }catch(_){ return null; }
  }

  function bannerSource(attacker){
    try{
      return units.find(s=>s.alive&&s.team===attacker.team&&SUPPORT_IDS.has(s.champId)&&owns(s,'bandeira_elo')&&hexDistance(s,attacker)<=2)||null;
    }catch(_){ return null; }
  }

  try{
    if(typeof doAction==='function'){
      const baseDoAction=doAction;
      doAction=function(u){
        if(!u||!SUPPORT_IDS.has(u.champId)) return baseDoAction.apply(this,arguments);
        let before=[];
        try{ before=units.filter(o=>o.alive&&o.team===u.team).map(o=>[o,o.hp]); }catch(_){ }
        const out=baseDoAction.apply(this,arguments);
        try{
          before.forEach(([target,hp0])=>{
            if(!target.alive||target.hp<=hp0) return;
            let gained=target.hp-hp0;
            recordHeal(u,target,gained);
            if(owns(u,'elo_harmonico')){
              const extra=Math.max(1,Math.round(gained*0.20));
              const old=target.hp;
              target.hp=Math.min(target.maxhp,target.hp+extra);
              const real=target.hp-old;
              if(real>0){
                recordHeal(u,target,real);
                if(typeof spawnFloatText==='function') spawnFloatText(target.rx,target.ry-40,`+${real} ELO`,'#9ed7b1');
              }
            }
          });
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  try{
    if(typeof applyDamage==='function'){
      const baseApplyDamage=applyDamage;
      applyDamage=function(attacker,target,baseDmg,tag,ignoreDefense){
        const now=performance.now();
        const before=target&&typeof target.hp==='number'?target.hp:null;
        const j=attacker?jedegarSource(attacker):null;
        const banner=attacker?bannerSource(attacker):null;
        let nextBase=baseDmg;

        if(banner&&typeof nextBase==='number') nextBase*=1.10;
        if(attacker&&attacker.__fragmentPowerUntil&&now<attacker.__fragmentPowerUntil&&typeof nextBase==='number') nextBase*=1.15;

        let restoreReduction=null;
        if(target){
          let add=0;
          if(owns(target,'coracao_ferro')&&target.__ironHeartGuardUntil&&now<target.__ironHeartGuardUntil) add+=0.25;
          if(owns(target,'coroa_ferro')&&target.__crownGuardUntil&&now<target.__crownGuardUntil) add+=0.20;
          if(add>0){
            restoreReduction=target.dmgReduction||0;
            target.dmgReduction=Math.min(0.88,restoreReduction+add);
          }
        }

        const wasAlive=!!(target&&target.alive);
        const out=baseApplyDamage.call(this,attacker,target,nextBase,tag,ignoreDefense);
        if(restoreReduction!==null&&target) target.dmgReduction=restoreReduction;

        if(before!==null&&target){
          const dealt=Math.max(0,before-target.hp);
          if(dealt>0&&attacker&&attacker.team==='player'){
            const jb=j?j.bonus:0, bb=banner?0.10:0;
            const combined=(1+jb)*(1+bb);
            const totalExtra=combined>1?dealt*(1-1/combined):0;
            const weight=jb+bb;
            if(totalExtra>0&&weight>0){
              if(j&&j.owner&&j.owner.team==='player'){
                const s=statFor(j.owner.champId); if(s) s.amplificationGiven+=Math.round(totalExtra*(jb/weight));
              }
              if(banner&&banner.team==='player'){
                const s=statFor(banner.champId); if(s) s.amplificationGiven+=Math.round(totalExtra*(bb/weight));
              }
            }
          }

          if(dealt>0&&target.alive&&owns(target,'coracao_ferro')){
            target.__ironHeartHits=(target.__ironHeartHits||0)+1;
            if(target.__ironHeartHits>=5){
              target.__ironHeartHits=0;
              target.__ironHeartGuardUntil=now+2500;
              const old=target.hp;
              target.hp=Math.min(target.maxhp,target.hp+Math.round(target.maxhp*0.07));
              const heal=target.hp-old;
              if(heal>0){ recordHeal(null,target,heal); if(typeof spawnFloatText==='function') spawnFloatText(target.rx,target.ry-42,`+${heal} FERRO`,'#c7cfd9'); }
            }
          }

          if(target.alive&&owns(target,'coroa_ferro')&&!target.__crownGuardUsed&&target.hp/target.maxhp<=0.35){
            target.__crownGuardUsed=true;
            target.__crownGuardUntil=now+4000;
            const old=target.hp;
            target.hp=Math.min(target.maxhp,target.hp+Math.round(target.maxhp*0.08));
            const heal=target.hp-old;
            if(heal>0) recordHeal(null,target,heal);
            if(typeof spawnFloatText==='function') spawnFloatText(target.rx,target.ry-48,'COROA DESPERTA','#e8c250');
          }
        }

        if(attacker&&target&&wasAlive&&!target.alive&&owns(attacker,'fragmento_corrompido')){
          const old=attacker.hp;
          attacker.hp=Math.min(attacker.maxhp,attacker.hp+Math.round(attacker.maxhp*0.10));
          const heal=attacker.hp-old;
          if(heal>0) recordHeal(null,attacker,heal);
          attacker.__fragmentPowerUntil=now+5000;
          if(typeof spawnFloatText==='function') spawnFloatText(attacker.rx,attacker.ry-46,'CORRUPÇÃO ABSORVIDA','#b56ee0');
        }
        return out;
      };
    }
  }catch(_){ }

  try{
    if(typeof updateBattleLogic==='function'){
      const baseUpdateBattleLogic=updateBattleLogic;
      updateBattleLogic=function(dt){
        let beforeHp=new Map();
        try{ units.filter(u=>u.alive&&u.team==='player').forEach(u=>beforeHp.set(u.id,u.hp)); }catch(_){ }
        tickDirectReceived=new Map();
        const out=baseUpdateBattleLogic.apply(this,arguments);
        const speed=Number(window.__ferroBattleSpeed);
        const edt=(Number.isFinite(speed)?speed:1)*(Number(dt)||0);

        try{
          units.filter(u=>u.alive&&u.team==='player').forEach(u=>{
            const old=beforeHp.get(u.id);
            if(old===undefined) return;
            const net=Math.max(0,u.hp-old);
            const direct=tickDirectReceived.get(u.id)||0;
            const extra=Math.max(0,Math.round(net-direct));
            if(extra>0){ const s=statFor(u.champId); if(s) s.healingReceived+=extra; }
          });

          if(edt>0){
            units.filter(u=>u.alive&&SUPPORT_IDS.has(u.champId)&&owns(u,'circulo_restaurador')).forEach(u=>{
              u.__restCircleAcc=(u.__restCircleAcc||0)+edt;
              if(u.__restCircleAcc<5000) return;
              u.__restCircleAcc%=5000;
              const allies=units.filter(o=>o.alive&&o.team===u.team&&o.hp<o.maxhp&&hexDistance(u,o)<=3)
                .sort((a,b)=>(a.hp/a.maxhp)-(b.hp/b.maxhp));
              const t=allies[0];
              if(!t) return;
              const old=t.hp;
              t.hp=Math.min(t.maxhp,t.hp+Math.round(t.maxhp*0.06));
              const heal=t.hp-old;
              if(heal>0){
                recordHeal(u,t,heal);
                if(typeof spawnFloatText==='function') spawnFloatText(t.rx,t.ry-34,`+${heal} CÍRCULO`,'#9ed7b1');
              }
            });
          }
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  try{
    if(typeof renderMatchSummary==='function'){
      const baseRenderMatchSummary=renderMatchSummary;
      renderMatchSummary=function(){
        const out=baseRenderMatchSummary.apply(this,arguments);
        try{
          const table=document.getElementById('summary-table');
          if(!table||document.getElementById('support-impact-summary')) return out;
          const ids=Object.keys(matchStats).filter(id=>CHAMPION_CATALOG[id]);
          const supportIds=ids.filter(id=>SUPPORT_IDS.has(id));
          const totalSupport=supportIds.reduce((sum,id)=>{
            const s=statFor(id); return sum+(s?s.healingDone+s.amplificationGiven:0);
          },0);
          const block=document.createElement('div');
          block.id='support-impact-summary';
          block.style.cssText='margin-top:16px;padding-top:12px;border-top:1px solid #3a3f47;';
          block.innerHTML=`
            <div style="font-family:'Oswald',sans-serif;color:var(--gold);margin-bottom:8px;">SUPORTE & CURA</div>
            <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--steel);padding:0 6px 6px;">
              <div>Stack User</div><div>Cura recebida</div><div>Cura feita</div><div>Amplificação</div><div>Participação</div>
            </div>
            ${ids.map(id=>{
              const s=statFor(id)||{};
              const isSupport=SUPPORT_IDS.has(id);
              const impact=(s.healingDone||0)+(s.amplificationGiven||0);
              const pct=isSupport&&totalSupport>0?Math.round(impact/totalSupport*100):0;
              return `<div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;gap:6px;padding:6px;font-family:'JetBrains Mono',monospace;font-size:10px;border-top:1px solid #252a31;${isSupport?'background:rgba(105,164,103,.06);':''}">
                <div>${CHAMPION_CATALOG[id].name}${isSupport?' · SUPORTE':''}</div>
                <div>${Math.round(s.healingReceived||0)}</div>
                <div>${isSupport?Math.round(s.healingDone||0):'—'}</div>
                <div>${isSupport?Math.round(s.amplificationGiven||0):'—'}</div>
                <div>${isSupport?pct+'%':'—'}</div>
              </div>`;
            }).join('')}
          `;
          table.appendChild(block);
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  try{ if(typeof renderItems==='function') renderItems(); }catch(_){ }
  window.FerroSupportStats={statFor,recordHeal};
})();
