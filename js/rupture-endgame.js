/* Ferro & Lança — Ruptura: endgame e bênçãos caóticas
   - novas bênçãos com efeitos que mudam a run
   - escolha de Ruptura a cada 10 ondas após a 80
   - Forja da Ruptura: sumidouro infinito de ouro entre ondas
   - mantém o save usando activeBlessings, sem alterar o formato do snapshot
*/
(function(){
  if(window.__ferroRuptureEndgameLoaded) return;
  window.__ferroRuptureEndgameLoaded = true;

  if(typeof BLESSINGS==='undefined' || typeof activeBlessings==='undefined') return;

  const CHAOS_BLESSINGS = {
    sede_forja:{name:'Sede da Forja',icon:'🔥',pro:'+25% de ataque por nível',con:'A equipe sangra 1% da vida máxima a cada 2,5s',max:4},
    vidro_vivo:{name:'Vidro Vivo',icon:'◇',pro:'+18% de velocidade por nível',con:'-15% de vida máxima por nível',max:4},
    ultimo_de_pe:{name:'Último de Pé',icon:'☠',pro:'O último aliado vivo causa +65% de dano por nível',con:'Todo o time perde 6% de redução de dano por nível',max:3},
    aposta_rachadura:{name:'Aposta da Rachadura',icon:'🎲',pro:'+30% de moedas extras ao fim de cada onda por nível',con:'Inimigos ganham +15% de vida e ataque por nível',max:4},
    tempestade_caotica:{name:'Tempestade Caótica',icon:'⚡',pro:'A Rachadura atinge unidades aleatórias durante a luta',con:'Os raios não distinguem aliados de inimigos',max:4},
    sangue_no_chao:{name:'Sangue no Chão',icon:'🩸',pro:'Quem consegue um abate cura 8% da vida máxima por nível',con:'Os inimigos recebem exatamente o mesmo benefício',max:3},
    ritmo_quebrado:{name:'Ritmo Quebrado',icon:'⏱',pro:'+12% de ataque e +10% de velocidade por nível',con:'A cada poucos segundos um aliado aleatório perde o ritmo por um instante',max:4},
    pacto_gigante:{name:'Pacto do Gigante',icon:'🗿',pro:'+28% de vida máxima por nível',con:'-12% de velocidade por nível',max:4}
  };

  Object.entries(CHAOS_BLESSINGS).forEach(([id,b])=>{
    BLESSINGS[id] = {name:b.name,icon:b.icon,pro:b.pro,con:b.con,chaotic:true};
  });

  const HIDDEN = {
    forge_atk:{name:'Forja · Arsenal',icon:'⚒',pro:'+4% ATK permanente',con:'',hidden:true},
    forge_hp:{name:'Forja · Armadura',icon:'⬡',pro:'+5% HP permanente',con:'',hidden:true},
    forge_speed:{name:'Forja · Engrenagem',icon:'»',pro:'+3% velocidade permanente',con:'',hidden:true},
    forge_wild:{name:'Forja · Instabilidade',icon:'?',pro:'Mutação imprevisível',con:'',hidden:true},
    forge_wild_atk:{name:'Instabilidade · Ataque',icon:'!',pro:'+6% ATK',con:'',hidden:true},
    forge_wild_hp:{name:'Instabilidade · Vida',icon:'!',pro:'+7% HP',con:'',hidden:true},
    forge_wild_speed:{name:'Instabilidade · Velocidade',icon:'!',pro:'+5% velocidade',con:'',hidden:true},
    forge_wild_enemy:{name:'Instabilidade · Inimigos',icon:'!',pro:'',con:'Inimigos +6%',hidden:true},
    blessing_reroll_spent:{name:'Rerrolagem paga',icon:'↻',pro:'',con:'',hidden:true}
  };
  Object.assign(BLESSINGS,HIDDEN);

  const RUPTURES = {
    rupture_sem_freio:{name:'SEM FREIO',icon:'»',pro:'+15% velocidade da equipe por nível',con:'-8% de vida máxima por nível'},
    rupture_fome:{name:'FOME DE IMPACTO',icon:'✦',pro:'Todo dano causado aumenta 15% por nível',con:'Isso vale para os dois lados'},
    rupture_titas:{name:'ERA DOS TITÃS',icon:'⬢',pro:'+8% de vida e ataque na equipe por nível',con:'Inimigos ganham +30% HP e +10% ATK por nível'},
    rupture_ouro_maldito:{name:'OURO MALDITO',icon:'◆',pro:'Receba 1.000 moedas imediatamente por nível escolhido',con:'Inimigos ganham +15% de vida e ataque por nível'},
    rupture_instavel:{name:'CÉU PARTIDO',icon:'⚡',pro:'Tempestades da Rachadura ficam mais frequentes e violentas',con:'Elas continuam atingindo qualquer lado'},
    rupture_ultimo:{name:'NÃO MORRA AGORA',icon:'☠',pro:'Último aliado vivo recebe mais +40% de dano por nível',con:'Até sobrar um, você não ganha nada'}
  };
  Object.entries(RUPTURES).forEach(([id,r])=>{
    BLESSINGS[id]={name:`Ruptura · ${r.name}`,icon:r.icon,pro:r.pro,con:r.con,hidden:true,rupture:true};
  });

  function stacks(id){
    try{ return activeBlessings.reduce((n,x)=>n+(x===id?1:0),0); }catch(_){ return 0; }
  }
  function has(id){ return stacks(id)>0; }
  function addToken(id){ activeBlessings.push(id); }
  function isPve(){ try{ return mode==='pve'; }catch(_){ return false; } }
  function currentWave(){ try{ return Number(wave)||0; }catch(_){ return 0; } }

  function ensureCheckpointDefinitions(){
    try{
      activeBlessings.forEach(id=>{
        if(/^rupture_checkpoint_\d+$/.test(id) && !BLESSINGS[id]){
          BLESSINGS[id]={name:'Marco da Ruptura',icon:'◇',pro:'',con:'',hidden:true};
        }
      });
    }catch(_){ }
  }

  try{
    if(typeof loadGameSnapshot==='function'){
      const baseLoad=loadGameSnapshot;
      loadGameSnapshot=function(){ const out=baseLoad.apply(this,arguments); ensureCheckpointDefinitions(); return out; };
    }
  }catch(_){ }

  /* ---------- efeitos permanentes nos Stack Users ---------- */
  try{
    if(typeof computeUnitStats==='function'){
      const baseCompute=computeUnitStats;
      computeUnitStats=function(def,prog){
        const s=baseCompute(def,prog);
        if(!isPve()) return s;
        const sede=stacks('sede_forja');
        const vidro=stacks('vidro_vivo');
        const ultimo=stacks('ultimo_de_pe');
        const ritmo=stacks('ritmo_quebrado');
        const gigante=stacks('pacto_gigante');
        const semFreio=stacks('rupture_sem_freio');
        const titas=stacks('rupture_titas');
        const fa=stacks('forge_atk') + stacks('forge_wild_atk')*1.5;
        const fh=stacks('forge_hp') + stacks('forge_wild_hp')*1.4;
        const fs=stacks('forge_speed') + stacks('forge_wild_speed')*(5/3);

        if(sede) s.atk=Math.round(s.atk*(1+0.25*sede));
        if(vidro){ s.speed=Math.round(s.speed*(1+0.18*vidro)*100)/100; s.hp=Math.max(1,Math.round(s.hp*Math.max(.25,1-0.15*vidro))); }
        if(ultimo) s.dmgReduction=Math.max(0,(s.dmgReduction||0)-0.06*ultimo);
        if(ritmo){ s.atk=Math.round(s.atk*(1+0.12*ritmo)); s.speed=Math.round(s.speed*(1+0.10*ritmo)*100)/100; }
        if(gigante){ s.hp=Math.round(s.hp*(1+0.28*gigante)); s.speed=Math.max(.15,Math.round(s.speed*Math.max(.35,1-0.12*gigante)*100)/100); }
        if(semFreio){ s.speed=Math.round(s.speed*(1+0.15*semFreio)*100)/100; s.hp=Math.max(1,Math.round(s.hp*Math.max(.25,1-0.08*semFreio))); }
        if(titas){ s.hp=Math.round(s.hp*(1+0.08*titas)); s.atk=Math.round(s.atk*(1+0.08*titas)); }
        if(fa) s.atk=Math.round(s.atk*(1+0.04*fa));
        if(fh) s.hp=Math.round(s.hp*(1+0.05*fh));
        if(fs) s.speed=Math.round(s.speed*(1+0.03*fs)*100)/100;
        return s;
      };
    }
  }catch(_){ }

  /* ---------- inimigos também escalam com pactos arriscados ---------- */
  try{
    if(typeof randomEnemyWave==='function'){
      const baseRandom=randomEnemyWave;
      randomEnemyWave=function(waveNum){
        const picks=baseRandom(waveNum);
        if(!isPve() || !Array.isArray(picks)) return picks;
        const aposta=stacks('aposta_rachadura');
        const titas=stacks('rupture_titas');
        const ouro=stacks('rupture_ouro_maldito');
        const wild=stacks('forge_wild_enemy');
        const hpMult=1 + aposta*0.15 + titas*0.30 + ouro*0.15 + wild*0.06;
        const atkMult=1 + aposta*0.15 + titas*0.10 + ouro*0.15 + wild*0.06;
        if(hpMult<=1.001 && atkMult<=1.001) return picks;
        return picks.map(p=>{
          if(!p || !p.scaled) return p;
          p.scaled.hp=Math.max(1,Math.round(p.scaled.hp*hpMult));
          p.scaled.atk=Math.max(1,Math.round(p.scaled.atk*atkMult*10)/10);
          return p;
        });
      };
    }
  }catch(_){ }

  /* ---------- dano contextual: último sobrevivente, sangue e Ruptura ---------- */
  try{
    if(typeof applyDamage==='function'){
      const baseDamage=applyDamage;
      applyDamage=function(attacker,target,amount,icon,ignoreDefense){
        let dmg=Number(amount)||0;
        let real=attacker;
        try{
          if((!real || real.id===undefined) && attacker && attacker.champId){
            real=units.find(u=>u.alive && u.champId===attacker.champId && u.team===attacker.team) || attacker;
          }
          if(isPve()){
            const hunger=stacks('rupture_fome');
            if(hunger) dmg*=1+0.15*hunger;
            if(real && real.team==='player'){
              const alive=units.filter(u=>u.alive && u.team==='player').length;
              if(alive===1){
                dmg*=1 + 0.65*stacks('ultimo_de_pe') + 0.40*stacks('rupture_ultimo');
              }
            }
          }
        }catch(_){ }
        const wasAlive=!!(target && target.alive);
        const out=baseDamage(attacker,target,Math.max(0,Math.round(dmg)),icon,ignoreDefense);
        try{
          const blood=stacks('sangue_no_chao');
          if(isPve() && blood && wasAlive && target && !target.alive && real && real.alive && real.maxhp){
            const heal=Math.max(1,Math.round(real.maxhp*0.08*blood));
            real.hp=Math.min(real.maxhp,real.hp+heal);
            if(typeof spawnFloatText==='function') spawnFloatText(real.rx,real.ry-36,`+${heal} SANGUE`,'#d46a63');
          }
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  let drainClock=0, stormClock=0, rhythmClock=0;
  function ruptureStorm(){
    try{
      const chaos=stacks('tempestade_caotica');
      const sky=stacks('rupture_instavel');
      if(!chaos && !sky) return;
      const living=units.filter(u=>u.alive && (u.team==='player'||u.team==='enemy'));
      if(!living.length) return;
      const count=Math.min(living.length,2+chaos+sky);
      const shuffled=living.slice().sort(()=>Math.random()-.5).slice(0,count);
      const elems=['fogo','gelo','eletrico','vento','corrupted'];
      shuffled.forEach((u,i)=>{
        const elem=elems[(Math.floor(Math.random()*elems.length)+i)%elems.length];
        const frac=u.team==='player' ? (0.045+0.01*chaos) : (0.07+0.012*chaos);
        const dmg=Math.max(1,Math.round(u.maxhp*frac*(1+0.15*sky)));
        if(typeof spawnLightningBolt==='function') spawnLightningBolt(u.rx+(Math.random()*60-30),u.ry-80,u.rx,u.ry);
        if(typeof spawnCastEffect==='function') spawnCastEffect(u.rx,u.ry,elem==='corrupted'?'#9b4fd9':'#f5e663');
        baseChaosDamage({team:'rupture',element:elem,champId:'rupture',name:'Rachadura'},u,dmg,'⚡',true);
      });
      if(typeof triggerScreenShake==='function') triggerScreenShake(4+sky,180);
      if(typeof log==='function') log('⚡ A Rachadura descarrega energia sem escolher lado!','hl');
    }catch(_){ }
  }
  let baseChaosDamage=function(attacker,target,dmg,icon,ignore){
    try{ return applyDamage(attacker,target,dmg,icon,ignore); }catch(_){ return null; }
  };
  try{
    // usa a versão já encadeada de applyDamage; a tempestade deve obedecer defesas/passivas.
    baseChaosDamage=applyDamage;
  }catch(_){ }

  try{
    if(typeof updateBattleLogic==='function'){
      const baseUpdate=updateBattleLogic;
      updateBattleLogic=function(dt){
        const out=baseUpdate(dt);
        try{
          if(!isPve() || !battleActive) return out;
          const speed=Number(window.__ferroBattleSpeed);
          if(Number.isFinite(speed) && speed<=0) return out;
          const gameDt=(Number(dt)||0)*(Number.isFinite(speed)?speed:1);

          const sede=stacks('sede_forja');
          if(sede){
            drainClock+=gameDt;
            if(drainClock>=2500){
              drainClock%=2500;
              units.filter(u=>u.alive&&u.team==='player').forEach(u=>{
                const dmg=Math.max(1,Math.round(u.maxhp*0.01*sede));
                baseChaosDamage({team:'rupture',element:'fogo',champId:'sede_forja',name:'Sede da Forja'},u,dmg,'🩸',true);
              });
            }
          } else drainClock=0;

          const chaos=stacks('tempestade_caotica');
          const sky=stacks('rupture_instavel');
          if(chaos||sky){
            stormClock+=gameDt;
            const every=Math.max(2600,8000-chaos*900-sky*1100);
            if(stormClock>=every){ stormClock%=every; ruptureStorm(); }
          } else stormClock=0;

          const rhythm=stacks('ritmo_quebrado');
          if(rhythm){
            rhythmClock+=gameDt;
            const every=Math.max(4500,8500-rhythm*650);
            if(rhythmClock>=every){
              rhythmClock%=every;
              const pool=units.filter(u=>u.alive&&u.team==='player');
              if(pool.length){
                const u=pool[Math.floor(Math.random()*pool.length)];
                u.actionTimer=(u.actionTimer||0)+Math.max(250,700-rhythm*80);
                if(typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-34,'RITMO QUEBRADO','#b98cf0');
              }
            }
          } else rhythmClock=0;
        }catch(_){ }
        return out;
      };
    }
  }catch(_){ }

  /* ---------- nova tela de escolha de bênçãos ---------- */
  try{
    if(typeof showBlessingChoice==='function'){
      showBlessingChoice=function(onResolved){
        ensureCheckpointDefinitions();
        const overlay=document.getElementById('blessing-overlay');
        const el=document.getElementById('blessing-cards');
        if(!overlay||!el){ if(onResolved) onResolved(); return; }

        function available(){
          return Object.keys(BLESSINGS).filter(id=>{
            const b=BLESSINGS[id];
            if(!b || b.hidden) return false;
            if(CHAOS_BLESSINGS[id]) return stacks(id)<CHAOS_BLESSINGS[id].max;
            return !has(id);
          });
        }
        function sample(arr,n){
          const copy=arr.slice();
          for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
          return copy.slice(0,n);
        }
        function resolve(){
          overlay.classList.remove('show');
          try{ pendingBlessingChoice=false; }catch(_){ }
          if(onResolved) onResolved();
        }
        function draw(){
          const pool=available();
          if(!pool.length){
            el.innerHTML='<div class="champ-card"><div class="champ-name">A Rachadura está saturada.</div><div class="champ-desc">Você já levou todas as bênçãos ao limite. A progressão continua pela Forja e pelas Rupturas do pós-80.</div><button class="main-btn" data-bdone style="width:100%;margin-top:8px;">Continuar</button></div>';
            el.querySelector('[data-bdone]').onclick=resolve;
            return;
          }
          const chaosAvail=pool.filter(id=>CHAOS_BLESSINGS[id]);
          let picks=[];
          if(chaosAvail.length && currentWave()>=10) picks.push(sample(chaosAvail,1)[0]);
          sample(pool.filter(id=>!picks.includes(id)),3-picks.length).forEach(id=>picks.push(id));
          const rerolls=stacks('blessing_reroll_spent');
          const rerollCost=250+rerolls*125;
          const skipCost=500;
          el.innerHTML=picks.map(id=>{
            const b=BLESSINGS[id];
            const lv=CHAOS_BLESSINGS[id] ? stacks(id)+1 : 1;
            return `<div class="champ-card rupture-blessing-card" data-blessing="${id}" style="cursor:pointer;${b.chaotic?'border-color:#8c5ec2;':''}">
              <div class="champ-name">${b.icon} ${b.name}${b.chaotic?` <span style="font-size:9px;color:#b98cf0;">CAÓTICA · Nv.${lv}</span>`:''}</div>
              <div class="champ-stats" style="color:#7bbf6a;">✓ ${b.pro}</div>
              <div class="champ-stats" style="color:#c94d3d;">✗ ${b.con}</div>
            </div>`;
          }).join('') + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <button class="ghost-btn" data-reroll-blessing>↻ Rerrolar · ${rerollCost} 🪙</button>
            <button class="ghost-btn" data-skip-blessing>Dispensar · ${skipCost} 🪙</button>
          </div>`;
          el.querySelectorAll('[data-blessing]').forEach(card=>card.onclick=()=>{
            try{ applyBlessing(card.dataset.blessing); }catch(_){ addToken(card.dataset.blessing); }
            resolve();
          });
          el.querySelector('[data-reroll-blessing]').onclick=()=>{
            if(coins<rerollCost) return;
            coins-=rerollCost; addToken('blessing_reroll_spent'); updateCoinBadge();
            if(typeof log==='function') log(`↻ A Rachadura cobrou ${rerollCost} moedas por novas opções.`,'sys');
            draw();
          };
          el.querySelector('[data-skip-blessing]').onclick=()=>{
            if(coins<skipCost) return;
            coins-=skipCost; updateCoinBadge();
            if(typeof log==='function') log(`Bênção dispensada por ${skipCost} moedas.`,'sys');
            resolve();
          };
        }
        draw();
        overlay.classList.add('show');
      };
    }
  }catch(_){ }

  /* ---------- Ruptura: escolha obrigatória a cada 10 ondas depois da 80 ---------- */
  const style=document.createElement('style');
  style.textContent=`
    #rupture-choice-overlay,#rupture-forge-overlay{position:fixed;inset:0;z-index:10030;display:none;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 42%,rgba(70,36,92,.32),rgba(4,5,8,.96) 60%);backdrop-filter:blur(5px)}
    #rupture-choice-overlay.show,#rupture-forge-overlay.show{display:flex}
    .rupture-panel{width:min(880px,96vw);max-height:90vh;overflow:auto;border:1px solid rgba(185,140,240,.42);border-radius:10px;background:linear-gradient(180deg,rgba(18,14,24,.98),rgba(8,9,12,.98));box-shadow:0 22px 80px rgba(0,0,0,.65),0 0 36px rgba(155,79,217,.12);padding:20px}
    .rupture-title{font:800 25px/1 'Oswald',sans-serif;letter-spacing:.09em;color:#e8e0ff;text-transform:uppercase}.rupture-sub{font:10px/1.5 'JetBrains Mono',monospace;color:#9da6b2;margin-top:7px}
    .rupture-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:17px}.rupture-card{padding:14px;border:1px solid #49355f;border-radius:8px;background:rgba(155,79,217,.055);cursor:pointer;transition:.14s}.rupture-card:hover{transform:translateY(-2px);border-color:#b98cf0;background:rgba(155,79,217,.11)}
    .rupture-card h4{margin:0 0 8px;font:700 15px/1.2 'Oswald',sans-serif;color:#ece4ff}.rupture-card p{margin:5px 0;font:10px/1.45 'JetBrains Mono',monospace}.rupture-good{color:#80c778}.rupture-bad{color:#df7669}
    #rupture-forge-btn{position:absolute;right:18px;bottom:18px;z-index:4;padding:8px 12px;border:1px solid #8c5ec2;border-radius:7px;background:rgba(31,19,41,.94);color:#d9c1f5;font:700 10px/1 'JetBrains Mono',monospace;cursor:pointer;box-shadow:0 0 18px rgba(155,79,217,.14)}
    .forge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}.forge-card{padding:14px;border:1px solid #40394a;border-radius:8px;background:rgba(255,255,255,.025)}.forge-card h4{margin:0 0 6px;font:700 15px 'Oswald',sans-serif;color:#eee7d9}.forge-card p{min-height:34px;font:10px/1.45 'JetBrains Mono',monospace;color:#aeb6c0}.forge-card button{width:100%;margin-top:8px}
    @media(max-width:720px){.rupture-grid{grid-template-columns:1fr}.forge-grid{grid-template-columns:1fr}.rupture-panel{padding:14px}.rupture-title{font-size:21px}#rupture-forge-btn{right:8px;bottom:8px}}
  `;
  document.head.appendChild(style);

  const choice=document.createElement('div'); choice.id='rupture-choice-overlay';
  choice.innerHTML='<div class="rupture-panel"><div class="rupture-title">RUPTURA</div><div class="rupture-sub" data-rsub></div><div class="rupture-grid" data-rgrid></div></div>';
  document.body.appendChild(choice);

  function showRuptureChoice(done){
    const w=currentWave();
    const marker=`rupture_checkpoint_${w}`;
    if(has(marker)){ if(done) done(); return; }
    if(!BLESSINGS[marker]) BLESSINGS[marker]={name:`Ruptura da onda ${w}`,icon:'◇',pro:'',con:'',hidden:true};
    choice.querySelector('[data-rsub]').textContent=`Onda ${w} concluída. A partir daqui a run não fica mais estável: escolha uma mutação permanente. Ela pode aparecer de novo e acumular.`;
    const ids=Object.keys(RUPTURES).sort(()=>Math.random()-.5).slice(0,3);
    const grid=choice.querySelector('[data-rgrid]');
    grid.innerHTML=ids.map(id=>{
      const r=RUPTURES[id],lv=stacks(id)+1;
      return `<div class="rupture-card" data-rpick="${id}"><h4>${r.icon} ${r.name} · Nv.${lv}</h4><p class="rupture-good">✓ ${r.pro}</p><p class="rupture-bad">✗ ${r.con}</p></div>`;
    }).join('');
    grid.querySelectorAll('[data-rpick]').forEach(card=>card.onclick=()=>{
      const id=card.dataset.rpick;
      addToken(id); addToken(marker);
      if(id==='rupture_ouro_maldito'){
        const reward=1000;
        coins+=reward; totalCoinsThisRun+=reward; updateCoinBadge();
        if(typeof sfxCoin==='function') sfxCoin();
      }
      if(typeof log==='function'){
        const r=RUPTURES[id]; log(`◇ RUPTURA: ${r.name} — ${r.pro} / ${r.con}`,'hl');
      }
      choice.classList.remove('show');
      if(done) done();
    });
    choice.classList.add('show');
  }

  /* ---------- Forja da Ruptura ---------- */
  const forge=document.createElement('div'); forge.id='rupture-forge-overlay';
  forge.innerHTML='<div class="rupture-panel"><div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><div class="rupture-title">FORJA DA RUPTURA</div><div class="rupture-sub">O ouro deixa de ser placar e vira combustível. Cada compra fica mais cara, sem limite de níveis.</div></div><button class="ghost-btn" data-forge-close>Fechar</button></div><div class="forge-grid" data-forge-grid></div></div>';
  document.body.appendChild(forge);
  let forgePausedPrep=false;

  function upgradeCost(base,id,growth){ return Math.round(base*Math.pow(growth,stacks(id))); }
  function forgeOptions(){
    return [
      {id:'forge_atk',name:'Martelar Arsenal',desc:'+4% de ATK para todos os seus Stack Users nas próximas ondas.',base:650,growth:1.48},
      {id:'forge_hp',name:'Reforçar Armaduras',desc:'+5% de vida máxima para toda a equipe.',base:650,growth:1.48},
      {id:'forge_speed',name:'Ajustar Engrenagens',desc:'+3% de velocidade de movimento/ataque para toda a equipe.',base:750,growth:1.52},
      {id:'forge_wild',name:'Alimentar a Rachadura',desc:'Compra barata e imprevisível: pode fortalecer ataque, vida, velocidade… ou os inimigos.',base:500,growth:1.34}
    ];
  }
  function drawForge(){
    const grid=forge.querySelector('[data-forge-grid]');
    grid.innerHTML=forgeOptions().map(o=>{
      const lv=stacks(o.id),cost=upgradeCost(o.base,o.id,o.growth);
      return `<div class="forge-card"><h4>${o.name} · Nv.${lv}</h4><p>${o.desc}</p><button class="main-btn" data-forge-buy="${o.id}" data-cost="${cost}" ${coins<cost?'disabled':''}>Forjar · ${cost} 🪙</button></div>`;
    }).join('');
    grid.querySelectorAll('[data-forge-buy]').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.forgeBuy,cost=Number(btn.dataset.cost)||0;
      if(coins<cost) return;
      coins-=cost; addToken(id);
      if(id==='forge_wild'){
        const outcomes=['forge_wild_atk','forge_wild_hp','forge_wild_speed','forge_wild_enemy'];
        const got=outcomes[Math.floor(Math.random()*outcomes.length)];
        addToken(got);
        const labels={forge_wild_atk:'+6% ATK',forge_wild_hp:'+7% HP',forge_wild_speed:'+5% velocidade',forge_wild_enemy:'INIMIGOS +6% HP/ATK'};
        if(typeof log==='function') log(`? A Forja cuspiu uma instabilidade: ${labels[got]}.`,'hl');
      } else if(typeof log==='function') log(`⚒ ${btn.closest('.forge-card').querySelector('h4').textContent} concluído.`,'sys');
      if(typeof sfxCoin==='function') sfxCoin();
      updateCoinBadge(); drawForge();
    });
  }
  function pausePrepForForge(){
    forgePausedPrep=false;
    const btn=document.getElementById('read-log-btn');
    const prep=document.getElementById('prep-overlay');
    if(btn && prep && getComputedStyle(prep).display!=='none' && String(btn.textContent).trim()==='Ler registro'){
      btn.click(); forgePausedPrep=true;
    }
  }
  function resumePrepAfterForge(){
    if(!forgePausedPrep) return;
    forgePausedPrep=false;
    const btn=document.getElementById('read-log-btn');
    const prep=document.getElementById('prep-overlay');
    if(btn && prep && getComputedStyle(prep).display!=='none' && String(btn.textContent).trim()==='Continuar preparo') btn.click();
  }
  function openForge(){ pausePrepForForge(); drawForge(); forge.classList.add('show'); }
  function closeForge(){ forge.classList.remove('show'); resumePrepAfterForge(); }
  forge.querySelector('[data-forge-close]').onclick=closeForge;
  forge.addEventListener('click',e=>{ if(e.target===forge) closeForge(); });

  function ensureForgeButton(){
    const prep=document.getElementById('prep-overlay');
    if(!prep) return;
    let btn=document.getElementById('rupture-forge-btn');
    if(!btn){
      btn=document.createElement('button'); btn.type='button'; btn.id='rupture-forge-btn'; btn.textContent='◇ FORJA DA RUPTURA';
      btn.onclick=openForge; prep.appendChild(btn);
    }
    btn.style.display=(isPve() && currentWave()>=80)?'block':'none';
  }

  /* bônus econômico e checkpoint entram exatamente antes do preparo da próxima onda */
  let apostaPaidWave=-1;
  try{
    if(typeof startPrepTimer==='function'){
      const basePrep=startPrepTimer;
      startPrepTimer=function(){
        const w=currentWave();
        const aposta=stacks('aposta_rachadura');
        if(isPve() && aposta && apostaPaidWave!==w){
          apostaPaidWave=w;
          const bonus=Math.max(1,Math.round((20+w*8)*0.30*aposta));
          coins+=bonus; totalCoinsThisRun+=bonus; updateCoinBadge();
          if(typeof log==='function') log(`🎲 Aposta da Rachadura pagou +${bonus} moedas.`,'hl');
        }
        const go=()=>{ basePrep(); ensureForgeButton(); };
        const marker=`rupture_checkpoint_${w}`;
        if(isPve() && w>=80 && w%10===0 && !has(marker)) showRuptureChoice(go);
        else go();
      };
    }
  }catch(_){ }

  try{
    if(typeof startPveRun==='function'){
      const baseStart=startPveRun;
      startPveRun=function(){
        apostaPaidWave=-1; drainClock=0; stormClock=0; rhythmClock=0;
        const out=baseStart.apply(this,arguments);
        ensureForgeButton();
        return out;
      };
    }
  }catch(_){ }

  window.FerroRupture={stacks,showRuptureChoice,openForge,ruptures:RUPTURES,chaosBlessings:CHAOS_BLESSINGS};
})();
