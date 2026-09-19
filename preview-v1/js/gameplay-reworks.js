/* Ferro & Lança — Gameplay Polish v1: reworks de lutadores/tanques e triângulo de classes. */
(function(){
  if(window.__ferroGameplayReworksV1) return;
  window.__ferroGameplayReworksV1 = true;

  const PLAYER_CLASS = (window.FerroClasses && window.FerroClasses.byChampion) || {};
  const BEATS = {atirador:'tanque', tanque:'lutador', lutador:'atirador'};
  const ENEMY_CLASS = {
    grum:'tanque', ashka:'atirador', ktul:'lutador', aquin:'atirador', ferrix:'tanque',
    draka:'lutador', boru:'tanque', sylv:'atirador', kryo:'lutador', voltz:'lutador'
  };

  function classOfUnit(u){
    if(!u) return null;
    if(u.isTentacle) return 'lutador';
    return PLAYER_CLASS[u.champId] || ENEMY_CLASS[u.champId] || null;
  }
  function classMultiplier(attacker,target){
    const a=classOfUnit(attacker), b=classOfUnit(target);
    if(!a || !b || a==='suporte' || b==='suporte' || a===b) return 1;
    if(BEATS[a]===b) return 1.18;
    if(BEATS[b]===a) return 0.92;
    return 1;
  }

  window.FerroClassMatchup = {
    enemyClass:Object.assign({},ENEMY_CLASS),
    classOfUnit,
    multiplier:classMultiplier
  };

  try{
    if(typeof CHAMPION_CATALOG!=='undefined'){
      if(CHAMPION_CATALOG.shava){
        CHAMPION_CATALOG.shava.hp=165;
        CHAMPION_CATALOG.shava.desc='Lutadora de entrada agressiva. O Golpe Aéreo inicia uma janela de Embalo: ela recupera fôlego, recebe menos dano por alguns segundos e drena vida dos golpes enquanto continua pressionando. Continua executando alvos muito feridos e usando paredes/obstáculos para controlar o combate.';
      }
      if(CHAMPION_CATALOG.nerith){
        CHAMPION_CATALOG.nerith.desc='Sua força real são os tentáculos. Eles agora herdam bônus de atributos dos itens da Nerith: dano integral, boa parte da velocidade de ataque e parte da vida adicional. Melhorar a build da Nerith melhora também o enxame.';
      }
      if(CHAMPION_CATALOG.raio){
        CHAMPION_CATALOG.raio.desc='Combo Relâmpago: a exigência de golpes acompanha o ritmo da run (5 no começo, 4 no midgame e 3 no late game). O combo pode trocar de alvo se o alvo original cair, evitando perder toda a habilidade em combates acelerados.';
      }
      if(CHAMPION_CATALOG.ima){
        CHAMPION_CATALOG.ima.hp=125;
        CHAMPION_CATALOG.ima.atk=16;
        CHAMPION_CATALOG.ima.desc='Lutadora de controle magnético. A cada 4 golpes puxa o alvo e repele os demais; o pulso agora também desacelera inimigos afetados. Ao lutar com Ferrha, ativa Vínculo Ferromagnético: ganha poder, velocidade, resistência e mais usos da magnetização, enquanto Ferrha recebe defesa adicional.';
      }
      if(CHAMPION_CATALOG.shecry){
        CHAMPION_CATALOG.shecry.desc='Quanto mais vida ainda tem, mais resistente fica. Quanto mais vida perde, mais rapidamente regenera vida, tentando se recompor enquanto permanece na linha de frente. Ao cair abaixo de 30% pela primeira vez, ainda ativa seu escudo e aura glacial.';
      }
    }
  }catch(_){ }

  try{
    if(typeof applyDamage==='function'){
      const baseApplyDamage=applyDamage;
      applyDamage=function(attacker,target,baseDmg,tag,ignoreDefense){
        let dmg=baseDmg;
        if(typeof dmg==='number' && Number.isFinite(dmg)) dmg*=classMultiplier(attacker,target);
        if(attacker && attacker.__polishShecryLegacyFactor && attacker.__polishShecryLegacyFactor>1){
          dmg/=attacker.__polishShecryLegacyFactor;
        }

        let oldReduction=null;
        const now=performance.now();
        if(target && target.champId==='shava' && target.shavaMomentumUntil && now<target.shavaMomentumUntil){
          oldReduction=target.dmgReduction||0;
          target.dmgReduction=Math.min(0.75,oldReduction+0.30);
        }

        const beforeHp=target && typeof target.hp==='number' ? target.hp : null;
        const result=baseApplyDamage.call(this,attacker,target,dmg,tag,ignoreDefense);
        if(oldReduction!==null && target) target.dmgReduction=oldReduction;

        if(attacker && attacker.champId==='shava' && attacker.shavaMomentumUntil && now<attacker.shavaMomentumUntil &&
           beforeHp!==null && target && typeof target.hp==='number'){
          const dealt=Math.max(0,beforeHp-target.hp);
          if(dealt>0 && attacker.alive){
            const heal=Math.max(1,Math.round(dealt*0.15));
            const old=attacker.hp;
            attacker.hp=Math.min(attacker.maxhp,attacker.hp+heal);
            const gained=attacker.hp-old;
            if(gained>0 && typeof spawnFloatText==='function') spawnFloatText(attacker.rx,attacker.ry-30,`+${gained}`,'#7bbf6a');
          }
        }
        return result;
      };
    }
  }catch(_){ }

  try{
    if(typeof nearestEnemy==='function'){
      const baseNearestEnemy=nearestEnemy;
      nearestEnemy=function(u){
        if(classOfUnit(u)!=='lutador') return baseNearestEnemy(u);
        try{
          const enemies=units.filter(o=>o.alive && o.team!==u.team);
          if(!enemies.length) return null;
          const taunters=enemies.filter(e=>e.taunt && hexDistance(u,e)<=e.taunt);
          if(taunters.length) return baseNearestEnemy(u);
          const shooters=enemies.filter(e=>classOfUnit(e)==='atirador');
          if(shooters.length){
            shooters.sort((a,b)=>hexDistance(u,a)-hexDistance(u,b));
            return shooters[0];
          }
        }catch(_){ }
        return baseNearestEnemy(u);
      };
    }
  }catch(_){ }

  try{
    if(typeof tryMoveToward==='function'){
      const baseTryMoveToward=tryMoveToward;
      tryMoveToward=function(u,target){
        const beforeQ=u && u.q, beforeR=u && u.r;
        const out=baseTryMoveToward.apply(this,arguments);
        try{
          if(!u || !target || !u.alive || !target.alive) return out;
          if(classOfUnit(u)!=='lutador' || classOfUnit(target)!=='atirador') return out;
          const now=performance.now();
          if((u.fighterGapReadyAt||0)>now) return out;
          if(hexDistance(u,target)<=Math.max(1,u.range||1)) return out;
          const moved=(u.q!==beforeQ || u.r!==beforeR);
          if(!moved) return out;
          u.fighterGapReadyAt=now+2800;
          baseTryMoveToward(u,target);
          if(typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-34,'INVESTIDA','#e4a088');
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  try{
    if(typeof doAction==='function'){
      const baseDoAction=doAction;
      doAction=function(u){
        if(u && u.champId==='shecry' && u.maxhp>0){
          const missing=Math.max(0,1-u.hp/u.maxhp);
          u.__polishShecryLegacyFactor=1+missing*1.2;
          try{ return baseDoAction.apply(this,arguments); }
          finally{ u.__polishShecryLegacyFactor=0; }
        }
        return baseDoAction.apply(this,arguments);
      };
    }
  }catch(_){ }

  function nerithItemInheritance(){
    const out={atkPct:0,speedPct:0,hpFlat:0};
    try{
      const prog=owned && owned.nerith;
      if(!prog) return out;
      const ids=[...(prog.itemIds||[]),prog.relicId].filter(Boolean);
      ids.forEach(id=>{
        const def=ITEM_CATALOG[id];
        const e=def && def.effect;
        if(!e) return;
        out.atkPct += Number(e.atkPct)||0;
        out.speedPct += Number(e.speedPct)||0;
        out.hpFlat += Number(e.hpFlat)||0;
      });
    }catch(_){ }
    return out;
  }

  try{
    if(typeof spawnNerithTentacle==='function'){
      const baseSpawnNerithTentacle=spawnNerithTentacle;
      spawnNerithTentacle=function(nerith){
        let existing=new Set();
        try{ existing=new Set(units.filter(o=>o.isTentacle).map(o=>o.id)); }catch(_){ }
        const out=baseSpawnNerithTentacle.apply(this,arguments);
        try{
          const inherit=nerithItemInheritance();
          units.filter(o=>o.isTentacle && o.tentacleParentId===nerith.id && !existing.has(o.id)).forEach(t=>{
            const atkMult=1+inherit.atkPct;
            const speedMult=1+inherit.speedPct*0.75;
            const hpAdd=Math.round(inherit.hpFlat*0.50);
            t.atk=Math.max(1,Math.round(t.atk*atkMult));
            t.speed=Math.max(0.2,Math.round(t.speed*speedMult*100)/100);
            if(hpAdd>0){ t.maxhp+=hpAdd; t.hp+=hpAdd; }
            t.nerithInheritedStats={atkPct:inherit.atkPct,speedPct:inherit.speedPct*0.75,hpFlat:hpAdd};
            if((inherit.atkPct>0 || inherit.speedPct>0 || hpAdd>0) && typeof spawnFloatText==='function'){
              spawnFloatText(t.rx,t.ry-28,'HERANÇA','#6fb5df');
            }
          });
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  function raioHitsNeeded(){
    try{
      if(wave>=31) return 3;
      if(wave>=16) return 4;
    }catch(_){ }
    return 5;
  }

  try{
    if(typeof updateComboState==='function'){
      const baseUpdateComboState=updateComboState;
      updateComboState=function(){
        try{
          if(Number(window.__ferroBattleSpeed)!==0){
            units.forEach(u=>{
              if(!u.alive || u.champId!=='raio' || !u.comboActive) return;
              const current=units.find(x=>x.id===u.comboTargetId);
              if(current && current.alive) return;
              const replacement=nearestEnemy(u);
              if(replacement && replacement.alive){
                u.comboTargetId=replacement.id;
                if(typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-36,'NOVO ALVO','#f5e663');
              }
            });
          }
        }catch(_){ }
        return baseUpdateComboState.apply(this,arguments);
      };
    }
  }catch(_){ }

  function reworkBattleTick(dt){
    if(!dt || dt<=0) return;
    const now=performance.now();
    try{
      units.forEach(u=>{
        if(!u.alive) return;

        if(u.champId==='shava' && u.shavaDashStartAt && u.shavaDashStartAt!==u.__polishSeenDashAt){
          u.__polishSeenDashAt=u.shavaDashStartAt;
          u.shavaMomentumUntil=now+4200;
          const heal=Math.round(u.maxhp*0.12);
          const old=u.hp;
          u.hp=Math.min(u.maxhp,u.hp+heal);
          const gained=u.hp-old;
          if(typeof spawnFloatText==='function'){
            spawnFloatText(u.rx,u.ry-50,'EMBALO!','#c9d9e8');
            if(gained>0) spawnFloatText(u.rx,u.ry-30,`+${gained}`,'#7bbf6a');
          }
        }

        if(u.champId==='ima' && u.imaProcAt && u.imaProcAt!==u.__polishSeenImaProcAt){
          u.__polishSeenImaProcAt=u.imaProcAt;
          units.filter(o=>o.alive && o.team!==u.team && hexDistance(u,o)<=5).forEach(o=>{
            o.electroSlowPct=Math.max(o.electroSlowPct||0,0.30);
            o.electroSlowUntil=Math.max(o.electroSlowUntil||0,now+4000);
          });
          if(typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-58,'CAMPO MAGNÉTICO','#c7cfd9');
        }

        if(u.champId==='raio' && !u.comboActive && (u.hitCount||0)>=raioHitsNeeded()){
          u.hitCount=0;
          if(typeof triggerComboUltimate==='function') triggerComboUltimate(u,null);
        }

        if(u.champId==='shecry' && u.hp>0 && u.hp<u.maxhp){
          u.__polishShecryRegenAcc=(u.__polishShecryRegenAcc||0)+dt;
          while(u.__polishShecryRegenAcc>=1000){
            u.__polishShecryRegenAcc-=1000;
            const missing=Math.max(0,1-u.hp/u.maxhp);
            const pct=0.004+missing*0.026;
            const heal=Math.max(1,Math.round(u.maxhp*pct));
            const old=u.hp;
            u.hp=Math.min(u.maxhp,u.hp+heal);
            const gained=u.hp-old;
            if(gained>0 && typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-28,`+${gained}`,'#8fd4e8');
          }
        }
      });

      ['player','enemy'].forEach(team=>{
        const ferrha=units.find(o=>o.alive && o.team===team && o.champId==='ferrha');
        const ima=units.find(o=>o.alive && o.team===team && o.champId==='ima');
        if(!ferrha || !ima) return;

        if(!ima.__polishFerrhaBond){
          ima.__polishFerrhaBond=true;
          const oldMax=ima.maxhp;
          ima.maxhp=Math.round(ima.maxhp*1.15);
          ima.hp+=ima.maxhp-oldMax;
          ima.atk=Math.round(ima.atk*1.25);
          ima.speed=Math.round(ima.speed*1.18*100)/100;
          ima.imaUsesLeft=Math.max(ima.imaUsesLeft||0,5);
          if(typeof spawnFloatText==='function') spawnFloatText(ima.rx,ima.ry-52,'VÍNCULO FERROMAGNÉTICO','#c7cfd9');
        }
        if(!ferrha.__polishImaBond){
          ferrha.__polishImaBond=true;
          ferrha.dmgReduction=Math.min(0.80,(ferrha.dmgReduction||0)+0.08);
          if(typeof spawnFloatText==='function') spawnFloatText(ferrha.rx,ferrha.ry-52,'CAMPO DE ÍMÃ','#c7cfd9');
        }
      });
    }catch(_){ }
  }

  try{
    if(typeof updateBattleLogic==='function'){
      const baseUpdateBattleLogic=updateBattleLogic;
      updateBattleLogic=function(dt){
        const out=baseUpdateBattleLogic.apply(this,arguments);
        const speed=Number(window.__ferroBattleSpeed);
        const effectiveDt=(Number.isFinite(speed)?speed:1)*(Number(dt)||0);
        reworkBattleTick(effectiveDt);
        return out;
      };
    }
  }catch(_){ }

  window.FerroGameplayReworks={version:1,raioHitsNeeded,classOfUnit};
})();
