/* Ferro & Lança — Gameplay Polish v1: UX, CLT mode, navegação e áudio. */
(function(){
  if(window.__ferroQaUxV1) return;
  window.__ferroQaUxV1=true;

  const CLT_KEY='ferroLancaCltMode';
  const SOUND_KEY='ferroLancaSoundPref';
  let cltMode=false;
  try{ cltMode=localStorage.getItem(CLT_KEY)==='1'; }catch(_){ }

  const style=document.createElement('style');
  style.textContent=`
    #item-trash-zone{display:none!important;pointer-events:none!important}
    .qa-settings-card{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;background:rgba(0,0,0,.15);border:1px solid #3a3f47;border-radius:6px}
    .qa-profile-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
    .qa-profile-tabs button.active{border-color:var(--gold);color:var(--gold);background:rgba(232,194,80,.08)}
    .qa-profile-section{display:none}.qa-profile-section.active{display:block}
    .clt-short{font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.45;color:#c5cbd2}
  `;
  document.head.appendChild(style);

  function renameItemShop(){
    const nav=document.querySelector('.nav-btn[data-screen="items"]');
    if(nav) nav.textContent='Loja de Itens';
    const h=document.querySelector('#screen-items h2');
    if(h) h.textContent='Loja de Itens';
  }

  function buildUnifiedProfile(){
    const profileScreen=document.getElementById('screen-profile');
    const achievementsScreen=document.getElementById('screen-achievements');
    const leaderboardScreen=document.getElementById('screen-leaderboard');
    if(!profileScreen||!achievementsScreen||!leaderboardScreen||profileScreen.dataset.qaUnified==='1') return;
    profileScreen.dataset.qaUnified='1';

    const profilePanel=profileScreen.querySelector('.panel');
    const achievementsPanel=achievementsScreen.querySelector('.panel');
    const leaderboardPanel=leaderboardScreen.querySelector('.panel');
    if(!profilePanel||!achievementsPanel||!leaderboardPanel) return;

    const navAchievements=document.querySelector('.nav-btn[data-screen="achievements"]');
    const navLeaderboard=document.querySelector('.nav-btn[data-screen="leaderboard"]');
    const navProfile=document.querySelector('.nav-btn[data-screen="profile"]');
    if(navAchievements) navAchievements.style.display='none';
    if(navLeaderboard) navLeaderboard.style.display='none';
    if(navProfile) navProfile.textContent='Perfil';

    const tabs=document.createElement('div');
    tabs.className='qa-profile-tabs';
    tabs.innerHTML=`
      <button class="ghost-btn active" data-qa-profile-tab="profile">Perfil</button>
      <button class="ghost-btn" data-qa-profile-tab="achievements">Conquistas</button>
      <button class="ghost-btn" data-qa-profile-tab="leaderboard">Placar</button>`;
    profileScreen.insertBefore(tabs,profileScreen.firstChild);

    profilePanel.classList.add('qa-profile-section','active');
    profilePanel.dataset.qaProfileSection='profile';
    achievementsPanel.classList.add('qa-profile-section');
    achievementsPanel.dataset.qaProfileSection='achievements';
    leaderboardPanel.classList.add('qa-profile-section');
    leaderboardPanel.dataset.qaProfileSection='leaderboard';
    profileScreen.appendChild(achievementsPanel);
    profileScreen.appendChild(leaderboardPanel);

    function show(which){
      profileScreen.querySelectorAll('[data-qa-profile-section]').forEach(p=>p.classList.toggle('active',p.dataset.qaProfileSection===which));
      tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.qaProfileTab===which));
      try{
        if(which==='profile'&&typeof renderProfile==='function') renderProfile();
        if(which==='achievements'&&typeof renderAchievementsList==='function') renderAchievementsList();
        if(which==='leaderboard'&&typeof renderLeaderboard==='function') renderLeaderboard();
      }catch(_){ }
    }
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('[data-qa-profile-tab]');
      if(b) show(b.dataset.qaProfileTab);
    });
    show('profile');
  }

  function moveSoundToSettings(){
    const settings=document.querySelector('#screen-settings .panel > div');
    const btn=document.getElementById('sound-toggle-btn');
    if(!settings||!btn||document.getElementById('qa-sound-card')) return;
    const card=document.createElement('div');
    card.id='qa-sound-card';
    card.className='qa-settings-card';
    card.innerHTML=`<div><div style="font-family:'Oswald',sans-serif;font-size:14px;color:#eae4d8;">Som do jogo</div><div class="subtitle" style="margin:2px 0 0;">Começa ligado ao iniciar uma partida. Desative aqui se preferir jogar sem som.</div></div>`;
    card.appendChild(btn);
    settings.insertBefore(card,settings.firstChild);

    const saved=(()=>{ try{return localStorage.getItem(SOUND_KEY);}catch(_){return null;} })();
    if(saved==='0'){
      try{ if(typeof setSoundEnabled==='function') setSoundEnabled(false); }catch(_){ }
    }

    btn.addEventListener('click',()=>{
      setTimeout(()=>{
        try{ localStorage.setItem(SOUND_KEY,soundEnabled?'1':'0'); }catch(_){ }
      },0);
    });

    ['mode-pve','mode-pvp','mode-continue'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      el.addEventListener('click',()=>{
        let pref=null;
        try{ pref=localStorage.getItem(SOUND_KEY); }catch(_){ }
        if(pref==='0') return;
        try{
          if(typeof setSoundEnabled==='function') setSoundEnabled(true);
          localStorage.setItem(SOUND_KEY,'1');
        }catch(_){ }
      },true);
    });
  }

  const CLASS_SHORT={
    tanque:'Linha de frente. Aguenta dano e protege o time.',
    lutador:'Caça atiradores. Encurta distância e vence no corpo a corpo.',
    atirador:'Dano de backline. Forte contra tanques, frágil se um lutador alcançar.',
    suporte:'Mantém e amplifica o time. Valor vem de cura, proteção e buffs.'
  };

  function recommendedNamesForItem(itemId){
    try{
      const names=[];
      Object.entries(RECOMMENDED_ITEMS||{}).forEach(([cid,rec])=>{
        if(rec&&Array.isArray(rec.items)&&rec.items.includes(itemId)&&CHAMPION_CATALOG[cid]) names.push(CHAMPION_CATALOG[cid].name);
      });
      return names.slice(0,4);
    }catch(_){ return []; }
  }

  function shortItem(def,id){
    const e=(def&&def.effect)||{};
    const bits=[];
    if(e.atkPct) bits.push(`+${Math.round(e.atkPct*100)}% dano`);
    if(e.hpFlat) bits.push(`+${Math.round(e.hpFlat)} vida`);
    if(e.hpPct) bits.push(`+${Math.round(e.hpPct*100)}% vida`);
    if(e.speedPct) bits.push(`+${Math.round(e.speedPct*100)}% vel. ataque`);
    if(e.dmgReductionPct) bits.push(`${Math.round(e.dmgReductionPct*100)}% redução de dano`);
    if(e.range) bits.push(`+${e.range} alcance`);
    if(!bits.length){
      const desc=String(def&&def.desc||'');
      const sentence=desc.split('.').map(s=>s.trim()).find(Boolean);
      if(sentence) bits.push(sentence.length>100?sentence.slice(0,97)+'…':sentence);
    }
    const rec=recommendedNamesForItem(id);
    return `${bits.join(' · ') || 'Efeito especial'}${rec.length?`<br><strong>Bom para:</strong> ${rec.join(', ')}`:''}`;
  }

  function findChampionIdByCard(card){
    const name=(card.querySelector('.champ-name')?.textContent||'').trim();
    try{ return Object.keys(CHAMPION_CATALOG).find(id=>CHAMPION_CATALOG[id].name===name)||null; }catch(_){return null;}
  }
  function findItemIdByCard(card){
    const name=(card.querySelector('.champ-name')?.textContent||'').trim();
    try{ return Object.keys(ITEM_CATALOG).find(id=>ITEM_CATALOG[id].name===name)||null; }catch(_){return null;}
  }

  function applyCltView(){
    document.body.classList.toggle('clt-mode',cltMode);
    if(!cltMode) return;
    ['shop-cards','roster-cards','recommended-cards'].forEach(rootId=>{
      const root=document.getElementById(rootId); if(!root) return;
      root.querySelectorAll('.champ-card').forEach(card=>{
        const id=findChampionIdByCard(card); if(!id) return;
        const cls=(window.FerroClasses&&window.FerroClasses.get(id))||CHAMPION_CATALOG[id].classType||'personagem';
        const desc=card.querySelector('.champ-desc');
        if(desc){
          desc.classList.add('clt-short');
          desc.innerHTML=`<strong>${String(cls).toUpperCase()}</strong> · ${CLASS_SHORT[cls]||'Função híbrida.'}`;
        }
      });
    });
    const itemRoot=document.getElementById('item-cards');
    if(itemRoot){
      itemRoot.querySelectorAll('.champ-card').forEach(card=>{
        const id=findItemIdByCard(card); if(!id) return;
        const desc=card.querySelector('.champ-desc');
        if(desc){ desc.classList.add('clt-short'); desc.innerHTML=shortItem(ITEM_CATALOG[id],id); }
      });
    }
  }

  function installCltSetting(){
    const settings=document.querySelector('#screen-settings .panel > div');
    if(!settings||document.getElementById('qa-clt-card')) return;
    const card=document.createElement('div');
    card.id='qa-clt-card'; card.className='qa-settings-card';
    card.innerHTML=`<div><div style="font-family:'Oswald',sans-serif;font-size:14px;color:#eae4d8;">Modo CLT / Preguiça</div><div class="subtitle" style="margin:2px 0 0;">Resume personagens, itens e estatísticas para quem quer só montar o time e jogar.</div></div><button class="ghost-btn" id="qa-clt-toggle"></button>`;
    settings.appendChild(card);
    const btn=card.querySelector('button');
    function sync(){ btn.textContent=cltMode?'Ligado':'Desligado'; btn.classList.toggle('on',cltMode); }
    sync();
    btn.addEventListener('click',()=>{
      cltMode=!cltMode;
      try{ localStorage.setItem(CLT_KEY,cltMode?'1':'0'); }catch(_){ }
      sync();
      try{
        if(typeof renderShop==='function') renderShop();
        if(typeof renderItems==='function') renderItems();
        if(typeof renderRoster==='function') renderRoster();
        if(typeof renderRecommended==='function') renderRecommended();
      }catch(_){ }
      applyCltView();
    });
  }

  function simplifyTrashLanguage(){
    const trash=document.getElementById('item-trash-zone');
    if(trash){ trash.style.display='none'; trash.setAttribute('aria-hidden','true'); }
    document.querySelectorAll('.inv-tile').forEach(t=>{
      const id=t.dataset.itemId;
      if(id&&typeof ITEM_CATALOG!=='undefined'&&ITEM_CATALOG[id]) t.title=ITEM_CATALOG[id].name+' — clique para vender; arraste até um slot para equipar';
    });
  }

  renameItemShop();
  buildUnifiedProfile();
  moveSoundToSettings();
  installCltSetting();

  try{
    if(typeof renderShop==='function'){ const base=renderShop; renderShop=function(){const out=base.apply(this,arguments);applyCltView();return out;}; }
    if(typeof renderItems==='function'){ const base=renderItems; renderItems=function(){const out=base.apply(this,arguments);applyCltView();simplifyTrashLanguage();return out;}; }
    if(typeof renderRoster==='function'){ const base=renderRoster; renderRoster=function(){const out=base.apply(this,arguments);applyCltView();simplifyTrashLanguage();return out;}; }
    if(typeof renderRecommended==='function'){ const base=renderRecommended; renderRecommended=function(){const out=base.apply(this,arguments);applyCltView();return out;}; }
    if(typeof renderInventoryPanel==='function'){ const base=renderInventoryPanel; renderInventoryPanel=function(){const out=base.apply(this,arguments);simplifyTrashLanguage();return out;}; }
  }catch(_){ }

  simplifyTrashLanguage();
  applyCltView();
  window.FerroQaUx={getCltMode:()=>cltMode,setCltMode:(v)=>{cltMode=!!v;applyCltView();}};
})();
