/* Ferro & Lança — arsenal de atiradores v1
   Cinco combinados fortes de longa distância com funções diferentes:
   cadência, anti-tanque, foco de alvo, área e sobrevivência/kiting.
*/
(function(){
  if(window.__ferroShooterItemsLoaded) return;
  window.__ferroShooterItemsLoaded = true;

  if(typeof ITEM_CATALOG==='undefined') return;

  const NEW_ITEMS = {
    tambor_repeticao:{
      name:'Tambor de Repetição', kind:'combinado · longa distância · cadência',
      recipe:['mira','botas'],
      desc:'Mira Telescópica + Botas Aceleradas. +35% de velocidade de ataque. A cada 4 ataques básicos, o alvo recebe um disparo repetido de 55% do dano base. Só alcance 2+.',
      effect:{speedPct:0.35, appliesTo:'ranged'}
    },
    municao_perfurante:{
      name:'Munição Perfurante', kind:'combinado · longa distância · anti-tanque',
      recipe:['luneta','placa'],
      desc:'Luneta de Longo Alcance + Placa de Blindagem. +25% de dano. Cada ataque básico tem 30% de chance de atravessar completamente a redução de dano do alvo. Só alcance 2+.',
      effect:{atkPct:0.25, appliesTo:'ranged'}
    },
    marca_cacador:{
      name:'Marca do Caçador', kind:'combinado · longa distância · alvo único',
      recipe:['luneta','amplificador'],
      desc:'Luneta de Longo Alcance + Núcleo Amplificador. +15% de dano. Atacar repetidamente o MESMO alvo aumenta o dano básico em 7% por acerto consecutivo, até +35%. Trocar de alvo zera a sequência. Só alcance 2+.',
      effect:{atkPct:0.15, appliesTo:'ranged'}
    },
    camara_estilhacos:{
      name:'Câmara de Estilhaços', kind:'combinado · longa distância · área',
      recipe:['mira','brasa'],
      desc:'Mira Telescópica + Brasa Selvagem. +20% de dano. Ataques básicos espalham 30% do dano base em até 2 inimigos adjacentes ao alvo. Só alcance 2+.',
      effect:{atkPct:0.20, appliesTo:'ranged'}
    },
    mecanismo_recuo:{
      name:'Mecanismo de Recuo', kind:'combinado · longa distância · sobrevivência',
      recipe:['botas','amplificador'],
      desc:'Botas Aceleradas + Núcleo Amplificador. +20% de velocidade de ataque. Quando um inimigo corpo a corpo acerta o usuário, a cada 5s o impacto é reduzido em 35% e o agressor é empurrado 1 bloco. Só alcance 2+.',
      effect:{speedPct:0.20, appliesTo:'ranged'}
    }
  };

  Object.assign(ITEM_CATALOG, NEW_ITEMS);

  try{
    if(typeof ITEM_CLASS_TAGS!=='undefined'){
      Object.keys(NEW_ITEMS).forEach(id=>{ ITEM_CLASS_TAGS[id]=['longa_distancia']; });
    }
  }catch(_){ }

  // O catálogo-base tem um fallback de ícones por forma. Criamos cinco formas novas,
  // então mesmo a ficha de item do módulo item-experience desenha cada arma diferente.
  try{
    if(typeof ITEM_ICON_SHAPES!=='undefined' && typeof ITEM_ICON_SHAPE_BY_ID!=='undefined'){
      Object.assign(ITEM_ICON_SHAPES,{
        repeater:'<circle cx="13" cy="16" r="8"/><circle cx="13" cy="16" r="3"/><path d="M21 12h7v8h-7M6 9 2 6M6 23l-4 3M13 5V2"/>',
        piercer:'<path d="M4 19 22 7l6 2-4 5L7 24z"/><path d="M19 9l4 6M8 18l5 5"/><path d="M25 4 30 2l-2 5"/>',
        huntermark:'<circle cx="16" cy="16" r="10"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8"/><path d="m11 17 3 3 7-8"/>',
        shrapnel:'<path d="M5 17h13l5-5v10l-5-5"/><path d="m21 8 3-5 2 5M25 14l5-2-2 5M24 24l3 5-6-2M16 23l-2 6-3-5"/>',
        recoil:'<path d="M7 11h17v10H7z"/><path d="M24 14h5M24 18h5M7 16H2"/><path d="m5 12-4 4 4 4"/><path d="M12 21v6h7v-6"/>'
      });
      ITEM_ICON_SHAPE_BY_ID.tambor_repeticao='repeater';
      ITEM_ICON_SHAPE_BY_ID.municao_perfurante='piercer';
      ITEM_ICON_SHAPE_BY_ID.marca_cacador='huntermark';
      ITEM_ICON_SHAPE_BY_ID.camara_estilhacos='shrapnel';
      ITEM_ICON_SHAPE_BY_ID.mecanismo_recuo='recoil';
    }
  }catch(_){ }

  const recommendedByItem={
    tambor_repeticao:['zeph','voltra','pyra','voss'],
    municao_perfurante:['voss','pyra','voltra','zeph'],
    marca_cacador:['voss','voltra','pyra','zeph'],
    camara_estilhacos:['pyra','zeph','voltra','voss'],
    mecanismo_recuo:['voltra','voss','pyra','zeph','glacia']
  };

  // A ficha de itens expõe o mesmo objeto de recomendações usado pelo modal.
  try{
    if(window.__ferroItemExperience && window.__ferroItemExperience.recommendations){
      Object.assign(window.__ferroItemExperience.recommendations,recommendedByItem);
    }
  }catch(_){ }

  try{
    if(typeof RECOMMENDED_ITEMS!=='undefined'){
      const patch={
        voss:['marca_cacador','municao_perfurante','precisao_mortal'],
        pyra:['camara_estilhacos','municao_perfurante','precisao_mortal'],
        zeph:['tambor_repeticao','camara_estilhacos','olho_falcao'],
        voltra:['tambor_repeticao','marca_cacador','mecanismo_recuo'],
        glacia:['mecanismo_recuo','mira','amplificador']
      };
      Object.entries(patch).forEach(([cid,items])=>{
        if(RECOMMENDED_ITEMS[cid]) RECOMMENDED_ITEMS[cid].items=items;
      });
    }
  }catch(_){ }

  function isRangedUnit(u){ return !!(u && Number(u.range)>1); }
  function owns(u,id){
    try{ return typeof countItem==='function' && countItem(u,id)>0; }
    catch(_){ return !!(u&&Array.isArray(u.itemIds)&&u.itemIds.includes(id)); }
  }
  function basicAttack(tag){ return tag===undefined || tag===null || tag===''; }
  function fx(u,text,color){
    try{ if(typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-42,text,color||'#e8c250'); }catch(_){ }
  }

  try{
    if(typeof applyDamage==='function'){
      const baseApplyDamage=applyDamage;
      applyDamage=function(attacker,target,baseDmg,tag,ignoreDefense){
        if(!attacker || !target) return baseApplyDamage.apply(this,arguments);

        const ranged=isRangedUnit(attacker);
        const basic=basicAttack(tag);
        let nextBase=baseDmg;
        let nextIgnore=ignoreDefense;
        const now=performance.now();

        // Marca do Caçador: o primeiro tiro marca; os seguintes crescem até +35%.
        if(ranged && basic && owns(attacker,'marca_cacador')){
          if(attacker.__hunterTargetId===target.id){
            attacker.__hunterStacks=Math.min(5,(attacker.__hunterStacks||0)+1);
          }else{
            attacker.__hunterTargetId=target.id;
            attacker.__hunterStacks=0;
          }
          if(attacker.__hunterStacks>0){
            nextBase=Math.round(nextBase*(1+0.07*attacker.__hunterStacks));
            if(attacker.__hunterStacks===5) fx(attacker,'MARCA ×5','#f0d473');
          }
        }

        // Munição Perfurante: proc raro e legível em vez de perfuração plana invisível.
        if(ranged && basic && owns(attacker,'municao_perfurante') && Math.random()<0.30){
          nextIgnore=true;
          fx(attacker,'PERFUROU','#d7e0ea');
        }

        // Mecanismo de Recuo: defesa só contra quem realmente conseguiu colar no atirador.
        let restoreReduction=null;
        let recoil=false;
        if(isRangedUnit(target) && owns(target,'mecanismo_recuo') && attacker.alive){
          let adjacent=true;
          try{ adjacent=typeof hexDistance==='function' ? hexDistance(attacker,target)<=1 : Number(attacker.range)<=1; }catch(_){ }
          if(adjacent && Number(attacker.range)<=1 && now>=(target.__recoilReadyAt||0)){
            target.__recoilReadyAt=now+5000;
            restoreReduction=target.dmgReduction||0;
            target.dmgReduction=Math.min(0.85,restoreReduction+0.35);
            recoil=true;
          }
        }

        const out=baseApplyDamage(attacker,target,nextBase,tag,nextIgnore);

        if(restoreReduction!==null) target.dmgReduction=restoreReduction;
        if(recoil){
          fx(target,'RECUO','#9fc5df');
          try{ if(attacker.alive && typeof knockbackUnit==='function') knockbackUnit(target,attacker,1); }catch(_){ }
        }

        if(ranged && basic){
          // Tambor: o disparo repetido usa a função base para não encadear novos procs.
          if(owns(attacker,'tambor_repeticao')){
            attacker.__repeatShotCount=((attacker.__repeatShotCount||0)+1)%4;
            if(attacker.__repeatShotCount===0 && target.alive){
              fx(attacker,'REPETIÇÃO','#f2ad55');
              baseApplyDamage(attacker,target,Math.max(1,Math.round(Number(baseDmg)*0.55)),'↻',false);
            }
          }

          // Estilhaços: até dois alvos adjacentes; não gera novos estilhaços.
          if(owns(attacker,'camara_estilhacos')){
            try{
              const splash=units
                .filter(o=>o.alive&&o.team!==attacker.team&&o.id!==target.id&&hexDistance(o,target)<=1)
                .sort((a,b)=>a.hp-b.hp)
                .slice(0,2);
              splash.forEach(o=>{
                baseApplyDamage(attacker,o,Math.max(1,Math.round(Number(baseDmg)*0.30)),'✦',false);
                if(typeof spawnCastEffect==='function') spawnCastEffect(o.rx,o.ry,'#f0bd72');
              });
            }catch(_){ }
          }
        }
        return out;
      };
    }
  }catch(_){ }

  // Se a tela de itens estiver aberta quando o módulo chegar, atualiza na hora.
  try{
    const s=document.getElementById('screen-items');
    if(s&&s.classList.contains('active')&&typeof renderItems==='function') renderItems();
  }catch(_){ }
})();
