/* Ferro & Lança — QA: clareza da escolha inicial e classes nos cards. */
(function(){
  if(window.__ferroStarterUiPolishV1) return;
  window.__ferroStarterUiPolishV1=true;

  let initialSoloFlow=false;

  function classOf(id){
    try{
      return (window.FerroClasses&&window.FerroClasses.get(id)) ||
        (typeof CHAMPION_CATALOG!=='undefined'&&CHAMPION_CATALOG[id]&&CHAMPION_CATALOG[id].classType) || null;
    }catch(_){ return null; }
  }

  function championIdFromCard(card){
    try{
      const name=(card.querySelector('.champ-name')?.textContent||'').trim();
      return Object.keys(CHAMPION_CATALOG||{}).find(id=>CHAMPION_CATALOG[id]?.name===name)||null;
    }catch(_){ return null; }
  }

  function decorateClasses(root){
    if(!root) return;
    root.querySelectorAll('.champ-card').forEach(card=>{
      if(card.querySelector('.starter-class-tag')) return;
      const id=championIdFromCard(card);
      const cls=id&&classOf(id);
      if(!cls) return;
      const chip=document.createElement('span');
      chip.className='champ-tag polish-class-tag starter-class-tag';
      chip.dataset.class=cls;
      chip.textContent=cls.toUpperCase();
      const tags=card.querySelectorAll('.champ-tag');
      if(tags.length) tags[tags.length-1].insertAdjacentElement('afterend',chip);
      else card.querySelector('.champ-name')?.insertAdjacentElement('afterend',chip);
    });
  }

  function polishStarterScreen(){
    const screen=document.getElementById('screen-starter');
    if(screen){
      const title=screen.querySelector('h2');
      if(title) title.textContent='ESCOLHA SEU PERSONAGEM INICIAL';
      const subtitle=screen.querySelector('.subtitle');
      if(subtitle) subtitle.textContent='Comece a run com 1 unidade. Você poderá expandir o time mais tarde na Loja.';
    }
    decorateClasses(document.getElementById('starter-cards'));
  }

  function polishTeamSelect(){
    const slots=document.getElementById('team-slots');
    if(slots) slots.style.display=initialSoloFlow?'none':'';
    if(initialSoloFlow){
      const title=document.getElementById('teamselect-title');
      if(title) title.textContent='PERSONAGEM INICIAL SELECIONADO';
      const screen=document.getElementById('screen-teamselect');
      const subtitle=screen&&screen.querySelector('.subtitle');
      if(subtitle) subtitle.textContent='Confirme sua escolha para iniciar a partida. Novos espaços serão liberados ao longo da run.';
    }
    decorateClasses(document.getElementById('teamselect-cards'));
  }

  try{
    if(typeof openStarterPick==='function'){
      const baseOpenStarterPick=openStarterPick;
      openStarterPick=function(){
        const out=baseOpenStarterPick.apply(this,arguments);
        initialSoloFlow=false;
        polishStarterScreen();
        return out;
      };
    }

    if(typeof openTeamSelect==='function'){
      const baseOpenTeamSelect=openTeamSelect;
      openTeamSelect=function(title){
        initialSoloFlow=/time inicial/i.test(String(title||''));
        const cleanTitle=initialSoloFlow?'PERSONAGEM INICIAL SELECIONADO':title;
        const out=baseOpenTeamSelect.call(this,cleanTitle);
        polishTeamSelect();
        return out;
      };
    }

    if(typeof renderTeamSlots==='function'){
      const baseRenderTeamSlots=renderTeamSlots;
      renderTeamSlots=function(){
        const out=baseRenderTeamSlots.apply(this,arguments);
        polishTeamSelect();
        return out;
      };
    }
  }catch(_){ }

  polishStarterScreen();
  polishTeamSelect();

  window.FerroStarterUiPolish={
    refresh:()=>{polishStarterScreen();polishTeamSelect();},
    isInitialFlow:()=>initialSoloFlow
  };
})();
