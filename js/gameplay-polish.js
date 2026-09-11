/* Ferro & Lança — correções pequenas e seguras da passada de Gameplay Polish v1. */
(function(){
  if(window.__ferroGameplayPolishV1) return;
  window.__ferroGameplayPolishV1 = true;

  /* =========================================================
     CLASSES OFICIAIS — definidas no playtest de Gameplay Polish
     Mantemos o "role" narrativo original e adicionamos uma classe
     mecânica separada para UI, recomendações e futuros sistemas.
  ========================================================= */
  const OFFICIAL_CLASS = {
    ferrha:'tanque',
    voss:'atirador',
    nyx:'atirador',
    shava:'lutador',
    kael:'lutador',
    terrus:'tanque',
    jedegar:'suporte',
    pyra:'atirador',
    glacia:'suporte',
    zeph:'atirador',
    ima:'lutador',
    frosk:'lutador',
    gelida:'lutador',
    raio:'lutador',
    shecry:'tanque',
    nerith:'lutador',
    voltra:'atirador'
  };

  const SUGGESTION_CATEGORY = {
    tanque:'tank',
    lutador:'corpo a corpo',
    atirador:'longa distância',
    suporte:'suporte'
  };

  try{
    if(typeof CHAMPION_CATALOG!=='undefined'){
      Object.entries(OFFICIAL_CLASS).forEach(([id,cls])=>{
        if(CHAMPION_CATALOG[id]) CHAMPION_CATALOG[id].classType=cls;
      });
    }
    if(typeof ROLE_CATEGORY!=='undefined'){
      Object.entries(OFFICIAL_CLASS).forEach(([id,cls])=>{
        ROLE_CATEGORY[id]=SUGGESTION_CATEGORY[cls];
      });
    }
  }catch(_){ /* mantém jogo original se algum helper não existir */ }

  window.FerroClasses = {
    byChampion:Object.assign({},OFFICIAL_CLASS),
    get:(id)=>OFFICIAL_CLASS[id]||null,
    beats:{atirador:'tanque',tanque:'lutador',lutador:'atirador'}
  };

  const style=document.createElement('style');
  style.textContent=`
    .polish-class-tag{font-weight:800;letter-spacing:.07em;border:1px solid rgba(255,255,255,.12)}
    .polish-class-tag[data-class="tanque"]{background:rgba(120,145,165,.16);color:#c7d3dd}
    .polish-class-tag[data-class="lutador"]{background:rgba(205,95,62,.14);color:#e4a088}
    .polish-class-tag[data-class="atirador"]{background:rgba(91,143,184,.14);color:#a9c8df}
    .polish-class-tag[data-class="suporte"]{background:rgba(105,164,103,.14);color:#a9d0a7}
  `;
  document.head.appendChild(style);

  function championIdFromCard(card){
    if(!card || typeof CHAMPION_CATALOG==='undefined') return null;
    const name=(card.querySelector('.champ-name')?.textContent||'').trim();
    const pair=Object.entries(CHAMPION_CATALOG).find(([,def])=>def && def.name===name);
    return pair ? pair[0] : null;
  }

  function decorateClassCards(root){
    if(!root) return;
    root.querySelectorAll('.champ-card').forEach(card=>{
      if(card.querySelector('.polish-class-tag')) return;
      const id=championIdFromCard(card);
      const cls=id && OFFICIAL_CLASS[id];
      if(!cls) return;
      const chip=document.createElement('span');
      chip.className='champ-tag polish-class-tag';
      chip.dataset.class=cls;
      chip.textContent=`CLASSE · ${cls.toUpperCase()}`;
      const tags=card.querySelectorAll('.champ-tag');
      if(tags.length) tags[tags.length-1].insertAdjacentElement('afterend',chip);
      else card.querySelector('.champ-name')?.insertAdjacentElement('afterend',chip);
    });
  }

  /* =========================================================
     PROGRESSÃO DE ESTRELAS

     Antes: 2 cópias para TODA estrela.
     QA v1:  1★→2★ = 2 cópias
             2★→3★ = 3 cópias
             3★→4★ = 4 cópias

     O preço de cada cópia continua igual nesta primeira passada.
     Assim isolamos o efeito da cadência sem misturar preço + renda.
  ========================================================= */
  function copiesNeededForNextStar(stars){
    const s=Math.max(1,Number(stars)||1);
    if(s<=1) return 2;
    if(s===2) return 3;
    return 4;
  }

  function patchShopProgression(){
    const root=document.getElementById('shop-cards');
    if(!root || typeof owned==='undefined') return;

    root.querySelectorAll('button[data-buy]').forEach(btn=>{
      const id=btn.dataset.buy;
      const prog=owned[id];
      if(!prog || prog.stars>=MAX_STARS) return; // compra de personagem novo fica intacta
      const needed=copiesNeededForNextStar(prog.stars);
      const cost=Math.round(CHAMPION_CATALOG[id].cost*0.5);
      btn.dataset.polishCopy='1';
      btn.textContent=`Comprar cópia — ${cost} 🪙`;
      btn.disabled=coins<cost;
      const card=btn.closest('.champ-card');
      const line=card && [...card.querySelectorAll('.champ-stats')].find(el=>el.textContent.includes('Cópias pra evoluir'));
      if(line) line.textContent=`Cópias pra evoluir: ${prog.copies}/${needed}`;
    });
    decorateClassCards(root);
  }

  // Intercepta SOMENTE a compra de cópia já marcada acima. Personagem novo,
  // troca de personagem e todos os outros botões continuam no fluxo original.
  document.addEventListener('click',ev=>{
    const btn=ev.target && ev.target.closest ? ev.target.closest('button[data-polish-copy="1"]') : null;
    if(!btn) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();

    try{
      const id=btn.dataset.buy;
      const prog=owned[id];
      if(!prog || prog.stars>=MAX_STARS) return;
      const cost=Math.round(CHAMPION_CATALOG[id].cost*0.5);
      if(coins<cost) return;

      coins-=cost;
      if(typeof sfxCoin==='function') sfxCoin();
      prog.copies=(prog.copies||0)+1;
      const needed=copiesNeededForNextStar(prog.stars);

      if(prog.copies>=needed && prog.stars<MAX_STARS){
        prog.stars++;
        prog.copies=0;
        if(typeof sfxLevelUp==='function') sfxLevelUp();
        if(typeof log==='function') log(`${CHAMPION_CATALOG[id].name} fundiu e virou ${starIcons(prog.stars)}!`, 'sys');
        if(prog.stars>=MAX_STARS && typeof unlockAchievement==='function') unlockAchievement('four_star');
      }

      if(typeof updateCoinBadge==='function') updateCoinBadge();
      if(typeof renderShop==='function') renderShop();
      const roster=document.getElementById('screen-roster');
      if(roster && roster.classList.contains('active') && typeof renderRoster==='function') renderRoster();
    }catch(_){ /* falha segura: não interfere nos demais sistemas */ }
  },true);

  // Envolve renderizadores existentes sem reimplementar suas regras.
  try{
    if(typeof renderShop==='function'){
      const baseRenderShop=renderShop;
      renderShop=function(){
        const out=baseRenderShop.apply(this,arguments);
        patchShopProgression();
        return out;
      };
    }
  }catch(_){ }

  try{
    if(typeof renderRoster==='function'){
      const baseRenderRoster=renderRoster;
      renderRoster=function(){
        const out=baseRenderRoster.apply(this,arguments);
        decorateClassCards(document.getElementById('roster-cards'));
        return out;
      };
    }
  }catch(_){ }

  try{
    if(typeof renderRecommended==='function'){
      const baseRenderRecommended=renderRecommended;
      renderRecommended=function(){
        const out=baseRenderRecommended.apply(this,arguments);
        decorateClassCards(document.getElementById('recommended-cards'));
        return out;
      };
    }
  }catch(_){ }

  // Caso alguma dessas telas já estivesse aberta quando o módulo terminou de carregar.
  try{
    decorateClassCards(document.getElementById('shop-cards'));
    decorateClassCards(document.getElementById('roster-cards'));
    decorateClassCards(document.getElementById('recommended-cards'));
  }catch(_){ }
})();