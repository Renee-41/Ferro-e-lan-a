/* Ferro & Lança — experiência de itens v1
   - remove a página separada de recomendações
   - ícones únicos em SVG para cada item
   - clique no ícone abre ficha: efeito + melhores usuários
   - loot de chefe ganha ficha/aviso explicativo
*/
(function(){
  if(window.__ferroItemExperienceLoaded) return;
  window.__ferroItemExperienceLoaded = true;

  if(typeof ITEM_CATALOG==='undefined' || typeof CHAMPION_CATALOG==='undefined') return;

  const RECS = {
    luneta:['voss','pyra','zeph','voltra'],
    mira:['voss','pyra','zeph','voltra','glacia'],
    manopla:['kael','nyx','raio','shava','frosk'],
    punho_serra:['frosk','raio','shava','kael'],
    presas_sangrentas:['kael','shava','raio','nyx'],
    furia_crescente:['nyx','kael','shava'],
    botas_lutador:['raio','nyx','shava','kael','frosk'],
    brasa:['ferrha','terrus','kael','ima','shecry'],
    placa:['ferrha','terrus','shecry','jedegar','ima'],
    botas:['glacia','voss','pyra','zeph','voltra'],
    amuleto:['kael','shava','nyx','raio'],
    amplificador:['ferrha','kael','terrus','glacia','ima','gelida'],
    furia_blindada:['kael','ferrha','terrus','shecry'],
    carniceiro:['raio','kael','shava','frosk'],
    fio_mortal:['kael','shava','raio'],
    investida_feroz:['raio','nyx','shava','frosk'],
    olho_falcao:['voss','zeph','voltra','pyra'],
    coracao_ferro:['ferrha','terrus','shecry','jedegar'],
    nucleo_eterno:['ferrha','kael','terrus','gelida','glacia'],
    coracao_vital:['terrus','shecry','nerith','jedegar','frosk'],
    manto_robusto:['shecry','nerith','jedegar','terrus'],
    muralha_viva:['ferrha','terrus','shecry','jedegar'],
    precisao_mortal:['voss','pyra','zeph','voltra'],
    brasa_eterna:['kael','ferrha','terrus','shecry'],
    vigor_absoluto:['shecry','terrus','ferrha','nerith'],
    nucleo_rachadura:['voss','pyra','voltra','kael','raio','zeph'],
    fragmento_corrompido:['kael','shava','raio','nyx'],
    coroa_ferro:['ferrha','terrus','shecry','jedegar','nerith']
  };

  const WHY = {
    luneta:'Atiradores aproveitam o alcance extra e o bônus de dano sem se expor.',
    mira:'Boa em quem precisa atacar muitas vezes para ativar cura, corrente ou disparos especiais.',
    manopla:'Dano bruto para lutadores que já precisam ficar colados no alvo.',
    punho_serra:'Especialmente forte contra tanques e chefes com muita redução de dano.',
    presas_sangrentas:'Sustentação para quem troca golpes no corpo a corpo por bastante tempo.',
    furia_crescente:'Favorece personagens rápidos, que fazem muitos testes de crítico durante a luta.',
    botas_lutador:'Acelera ciclos de golpes e, por consequência, habilidades que contam ataques.',
    brasa:'Funciona melhor em linha de frente, onde há mais inimigos próximos para atingir.',
    placa:'Vida e redução de dano ajudam tanques e controladores a permanecerem em campo.',
    botas:'Velocidade universal; excelente para suportes e atiradores que escalam com frequência de ataques.',
    amuleto:'Cura fixa por golpe rende mais em personagens que acertam com frequência.',
    amplificador:'Prioridade para personagens cuja força vem de passivas, barreiras, cura ou estados especiais.',
    furia_blindada:'Mistura dano e resistência sem tirar o lutador da linha de frente.',
    carniceiro:'Pacote agressivo de perfuração, vida e vampirismo para duelos prolongados.',
    fio_mortal:'Feito para atravessar defesa mantendo pressão de dano corpo a corpo.',
    investida_feroz:'Dano + velocidade para personagens que dependem de sequências rápidas de golpes.',
    olho_falcao:'Além do alcance, ajuda o atirador a finalizar automaticamente alvos frágeis.',
    coracao_ferro:'Uma opção segura para quem precisa sobreviver por muito tempo sem perder todos os slots em defesa pura.',
    nucleo_eterno:'Excelente em personagens com passivas decisivas, adicionando também vida e defesa.',
    coracao_vital:'Vida bruta beneficia tanques, invocadores e lutadores que precisam sobreviver ao foco.',
    manto_robusto:'Escala com a vida total do personagem, então rende mais em quem já tem bastante HP.',
    muralha_viva:'Defesa pesada para unidades que precisam segurar a linha de frente.',
    precisao_mortal:'Um dos pacotes mais completos para qualquer atacante de longa distância.',
    brasa_eterna:'Melhor em quem permanece cercado de inimigos e consegue aproveitar várias ativações durante a onda.',
    vigor_absoluto:'Regen contínua e HP percentual favorecem batalhas longas e personagens resistentes.',
    nucleo_rachadura:'Relíquia ofensiva universal; priorize seus principais carregadores de dano.',
    fragmento_corrompido:'O heal por abate rende mais em personagens que finalizam inimigos com frequência.',
    coroa_ferro:'Relíquia defensiva de alto impacto; melhor em quem recebe foco ou precisa permanecer vivo para usar passivas.'
  };

  const ART = {
    luneta:'<path d="M5 24 22 7l5 5L10 29z"/><circle cx="24.5" cy="9.5" r="4.2"/><path d="m7 21 4 4M20 7l5 5"/><path d="M27 3v3M30 6h-3"/>',
    mira:'<circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="3"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7"/><path d="m20 10 3-3"/>',
    manopla:'<path d="M8 14h16v11H9l-3-4z"/><path d="M10 14V9a3 3 0 0 1 6 0v5M16 14V7a3 3 0 0 1 6 0v7"/><path d="M10 20h12"/>',
    punho_serra:'<path d="M6 14h15v12H9l-3-4z"/><path d="M9 14V9h4v5M14 14V7h4v7"/><path d="m21 12 3-4 2 4 3-3-1 8-7 1z"/><path d="M10 21h9"/>',
    presas_sangrentas:'<path d="M8 5 14 17l-5 10-3-11zM24 5 18 17l5 10 3-11z"/><path d="M16 15c3 4 3 7 0 9-3-2-3-5 0-9z"/>',
    furia_crescente:'<path d="M7 24 13 7M14 26l5-18M21 25l4-14"/><path d="m4 17 5-5 4 3M15 13l5-5 4 3"/><path d="M5 28h22"/>',
    botas_lutador:'<path d="M11 4h7v13l7 3v6H7v-7l4-3z"/><path d="M10 20h14M13 8h5"/><path d="m25 11 4 2-4 2"/>',
    brasa:'<path d="M16 3c-1 6-7 8-7 15a7 7 0 0 0 14 0c0-4-2-7-4-10 0 4-2 6-4 6-2-3 2-6 1-11z"/><path d="M16 17c-3 3-3 6 0 9 3-3 3-6 0-9z"/>',
    placa:'<path d="m16 3 10 5v10c0 6-4 9-10 11C10 27 6 24 6 18V8z"/><circle cx="11" cy="11" r="1.2"/><circle cx="21" cy="11" r="1.2"/><circle cx="16" cy="22" r="1.2"/><path d="M10 16h12"/>',
    botas:'<path d="M10 4h7v13h7c3 0 4 2 4 5v3H7v-7l3-2z"/><path d="M3 11h5M2 15h6M4 19h4"/>',
    amuleto:'<path d="M10 4c1 5 3 7 6 7s5-2 6-7"/><path d="M16 11v4"/><path d="M16 27c-7-5-8-9-5-11 2-2 4-1 5 1 1-2 3-3 5-1 3 2 2 6-5 11z"/>',
    amplificador:'<circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7M6 6l5 5M21 21l5 5M26 6l-5 5M11 21l-5 5"/>',
    furia_blindada:'<path d="m16 3 10 5v9c0 6-4 9-10 12C10 26 6 23 6 17V8z"/><path d="M10 15h12v8H10z"/><path d="M12 15v-4h4v4M17 15v-5h4v5"/>',
    carniceiro:'<path d="M8 5h7v15l-4 7H6l3-8z"/><path d="m17 7 9 3-4 4 4 3-8 9-5-4 6-7-4-3z"/><path d="M24 22c2 2 2 4 0 6-2-2-2-4 0-6z"/>',
    fio_mortal:'<path d="m7 25 4-12 12-9 2 2-8 13z"/><path d="M9 17 4 22l6 6 5-5"/><path d="M20 7l5 5"/>',
    investida_feroz:'<path d="M9 5h7v12l7 3v6H6v-7l3-3z"/><path d="m19 9 5 3-5 3M24 9l5 3-5 3"/><path d="M9 21h14"/>',
    olho_falcao:'<path d="M3 16c5-8 21-8 26 0-5 8-21 8-26 0z"/><circle cx="16" cy="16" r="5"/><circle cx="16" cy="16" r="1.5"/><path d="M16 5v4M16 23v4M5 16h4M23 16h4"/>',
    coracao_ferro:'<path d="M16 27C7 20 5 15 6 11c1-4 6-5 10-1 4-4 9-3 10 1 1 4-1 9-10 16z"/><path d="M10 12h12M11 20h10"/><circle cx="10" cy="12" r="1"/><circle cx="22" cy="12" r="1"/><circle cx="16" cy="23" r="1"/>',
    nucleo_eterno:'<circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="4"/><path d="m16 2 3 5-3 3-3-3zM30 16l-5 3-3-3 3-3zM16 30l-3-5 3-3 3 3zM2 16l5-3 3 3-3 3z"/>',
    coracao_vital:'<path d="M16 27C7 20 4 14 7 9c2-4 7-3 9 1 2-4 7-5 9-1 3 5 0 11-9 18z"/><path d="M7 17h5l2-5 4 10 2-5h5"/>',
    manto_robusto:'<path d="M16 4 8 9 5 28c4-3 7-4 11-4s7 1 11 4L24 9z"/><path d="M12 9h8l3 12-7-3-7 3z"/><path d="M16 4v14"/>',
    muralha_viva:'<path d="M4 11h5V7h5v4h4V7h5v4h5v17H4z"/><path d="M9 17h14v11H9z"/><path d="M16 25c-4-3-5-6-3-8 1-1 3-1 3 1 1-2 3-2 4-1 2 2 1 5-4 8z"/>',
    precisao_mortal:'<circle cx="15" cy="16" r="9"/><circle cx="15" cy="16" r="3"/><path d="M15 3v6M15 23v6M2 16h7M21 16h7"/><path d="M5 27 27 5M22 5h5v5"/>',
    brasa_eterna:'<circle cx="16" cy="17" r="5"/><path d="M16 2c0 6-8 8-8 16a8 8 0 0 0 16 0c0-5-2-9-5-12 1 5-2 7-4 6-2-2 1-6 1-10z"/><path d="M16 13v8M12 17h8"/>',
    vigor_absoluto:'<path d="M16 25c-7-5-9-10-6-13 2-2 5-1 6 2 1-3 4-4 6-2 3 3 1 8-6 13z"/><path d="M5 9a13 13 0 0 1 18-3M27 23a13 13 0 0 1-18 3"/><path d="m20 3 3 3-4 2M12 29l-3-3 4-2"/>',
    nucleo_rachadura:'<path d="m16 3 9 8-3 14-6 4-7-6-2-12z"/><path d="m18 5-5 8 5 3-5 5 3 7"/><path d="M8 11h7M18 16h6"/>',
    fragmento_corrompido:'<path d="m19 3 6 7-4 5 3 5-9 9-7-6 3-6-4-5z"/><path d="M11 14c4-4 8-4 11 0-3 4-7 4-11 0z"/><circle cx="16.5" cy="14" r="1.5"/><path d="m10 22 5-4 2 6"/>',
    coroa_ferro:'<path d="M5 10 10 15l6-10 6 10 5-5-2 16H7z"/><path d="M8 21h16M10 25h12"/><circle cx="10" cy="18" r="1"/><circle cx="16" cy="17" r="1"/><circle cx="22" cy="18" r="1"/>'
  };

  function itemTone(id){
    const d=ITEM_CATALOG[id];
    if(d && d.isRelic) return '#d9b7ff';
    if(d && d.recipe) return '#e8c250';
    if(d && /tanque|vida|vampirismo/.test(d.kind||'')) return '#c7cfd9';
    if(d && /longa distância/.test(d.kind||'')) return '#8fd4e8';
    if(d && /corpo a corpo/.test(d.kind||'')) return '#e9a16e';
    return '#f2a541';
  }

  const oldItemIconSVG = (typeof itemIconSVG==='function') ? itemIconSVG : null;
  itemIconSVG = function(itemId,size){
    size=size||32;
    const d=ITEM_CATALOG[itemId];
    const art=ART[itemId];
    if(!art && oldItemIconSVG) return oldItemIconSVG(itemId,size);
    const combined=d&&d.recipe;
    const relic=d&&d.isRelic;
    const frame = relic
      ? '<path d="M16 1 28 8v16l-12 7L4 24V8z" fill="none" stroke="currentColor" stroke-opacity=".55"/><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-dasharray="2 3"/>'
      : combined ? '<path d="M16 1 29 8.5v15L16 31 3 23.5v-15z" fill="none" stroke="currentColor" stroke-opacity=".34"/>' : '';
    return `<svg class="ferro-item-art" data-ferro-item-art="${itemId}" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" stroke="${itemTone(itemId)}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${frame}${art||''}</svg>`;
  };

  const style=document.createElement('style');
  style.textContent=`
    .item-info-trigger{cursor:pointer!important;border-radius:7px;transition:background .12s,transform .12s,box-shadow .12s}.item-info-trigger:hover{background:rgba(232,194,80,.08);box-shadow:0 0 0 1px rgba(232,194,80,.16);transform:translateY(-1px)}
    #item-info-overlay{position:fixed;inset:0;z-index:10020;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,3,5,.76);backdrop-filter:blur(4px)}#item-info-overlay.show{display:flex}
    .item-info-card{width:min(510px,94vw);max-height:86vh;overflow:auto;background:linear-gradient(155deg,#181b20,#0d0f12 72%);border:1px solid rgba(232,194,80,.28);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.58);padding:18px}
    .item-info-head{display:grid;grid-template-columns:74px 1fr auto;gap:13px;align-items:center}.item-info-art{width:70px;height:70px;display:grid;place-items:center;border-radius:10px;background:radial-gradient(circle,rgba(232,194,80,.10),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.10)}
    .item-info-kicker{font:700 9px/1.2 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8f98a3}.item-info-name{font:700 22px/1.08 Oswald,sans-serif;color:#eee7d9;margin-top:3px}.item-info-kind{font:700 9px/1.2 'JetBrains Mono',monospace;color:#e8c250;text-transform:uppercase;margin-top:5px}
    .item-info-close{width:30px;height:30px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#b7bec7;border-radius:7px;cursor:pointer;font-size:17px}.item-info-effect{margin-top:15px;padding:12px;border-left:2px solid #e8c250;background:rgba(232,194,80,.045);font:500 12px/1.55 'JetBrains Mono',monospace;color:#d2d6db}.item-info-section{margin-top:14px}.item-info-section-title{font:700 9px/1.2 'JetBrains Mono',monospace;letter-spacing:.13em;text-transform:uppercase;color:#8f98a3;margin-bottom:7px}.item-info-champs{display:flex;gap:6px;flex-wrap:wrap}.item-info-champ{padding:6px 8px;border:1px solid rgba(255,255,255,.10);border-radius:6px;background:rgba(255,255,255,.025);font:700 10px/1 'JetBrains Mono',monospace;color:#ddd}.item-info-why{font:500 11px/1.5 'JetBrains Mono',monospace;color:#aab1ba}
    #item-loot-toast{position:fixed;left:50%;bottom:24px;z-index:10010;width:min(560px,calc(100vw - 24px));display:none;grid-template-columns:54px 1fr auto;gap:11px;align-items:center;padding:11px 12px;background:linear-gradient(135deg,rgba(25,23,17,.96),rgba(9,11,14,.97));border:1px solid rgba(232,194,80,.42);border-radius:10px;box-shadow:0 16px 45px rgba(0,0,0,.48);transform:translateX(-50%)}#item-loot-toast.show{display:grid;animation:itemLootIn .22s ease-out}.item-loot-art{width:50px;height:50px;display:grid;place-items:center;border:1px solid rgba(232,194,80,.18);border-radius:8px;background:rgba(232,194,80,.05)}.item-loot-kicker{font:700 8px/1.2 'JetBrains Mono',monospace;color:#e8c250;letter-spacing:.13em;text-transform:uppercase}.item-loot-name{font:700 16px/1.1 Oswald,sans-serif;color:#f0eadf;margin:2px 0}.item-loot-desc{font:500 9px/1.35 'JetBrains Mono',monospace;color:#aeb5be;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.item-loot-open{border:1px solid rgba(232,194,80,.28);background:rgba(232,194,80,.08);color:#e8c250;border-radius:6px;padding:7px 9px;font:700 9px 'JetBrains Mono',monospace;cursor:pointer}@keyframes itemLootIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
    @media(max-width:620px){.item-info-card{padding:14px}.item-info-head{grid-template-columns:60px 1fr auto}.item-info-art{width:56px;height:56px}.item-info-name{font-size:19px}#item-loot-toast{bottom:12px;grid-template-columns:46px 1fr}.item-loot-art{width:42px;height:42px}.item-loot-open{grid-column:1/-1;width:100%}}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='item-info-overlay';
  overlay.innerHTML='<div class="item-info-card" role="dialog" aria-modal="true"><div class="item-info-head"><div class="item-info-art"></div><div><div class="item-info-kicker">FICHA DE EQUIPAMENTO</div><div class="item-info-name"></div><div class="item-info-kind"></div></div><button class="item-info-close" type="button" aria-label="Fechar">×</button></div><div class="item-info-effect"></div><div class="item-info-section"><div class="item-info-section-title">Bom para</div><div class="item-info-champs"></div></div><div class="item-info-section"><div class="item-info-section-title">Por que funciona</div><div class="item-info-why"></div></div></div>';
  document.body.appendChild(overlay);

  const loot=document.createElement('div');
  loot.id='item-loot-toast';
  loot.innerHTML='<div class="item-loot-art"></div><div><div class="item-loot-kicker"></div><div class="item-loot-name"></div><div class="item-loot-desc"></div></div><button type="button" class="item-loot-open">Ver item</button>';
  document.body.appendChild(loot);
  let lootTimer=null, lootItemId=null;

  function champNames(itemId){
    return (RECS[itemId]||[]).filter(id=>CHAMPION_CATALOG[id]).map(id=>CHAMPION_CATALOG[id].name);
  }

  function showItem(itemId,opts){
    const d=ITEM_CATALOG[itemId]; if(!d) return;
    opts=opts||{};
    overlay.querySelector('.item-info-art').innerHTML=itemIconSVG(itemId,58);
    overlay.querySelector('.item-info-kicker').textContent=opts.kicker || (d.isRelic?'RELÍQUIA DE CHEFE':'FICHA DE EQUIPAMENTO');
    overlay.querySelector('.item-info-name').textContent=d.name;
    overlay.querySelector('.item-info-kind').textContent=d.kind || 'equipamento';
    overlay.querySelector('.item-info-effect').textContent=d.desc || 'Sem descrição disponível.';
    const names=champNames(itemId);
    overlay.querySelector('.item-info-champs').innerHTML=names.length ? names.map(n=>`<span class="item-info-champ">${n}</span>`).join('') : '<span class="item-info-champ">Uso situacional</span>';
    overlay.querySelector('.item-info-why').textContent=WHY[itemId] || 'O valor deste item depende da composição e da posição na arena.';
    overlay.classList.add('show');
  }

  function hideItem(){ overlay.classList.remove('show'); }
  overlay.querySelector('.item-info-close').addEventListener('click',hideItem);
  overlay.addEventListener('click',e=>{ if(e.target===overlay) hideItem(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&overlay.classList.contains('show')) hideItem(); });

  function showLoot(itemId,opts){
    const d=ITEM_CATALOG[itemId]; if(!d) return;
    opts=opts||{}; lootItemId=itemId;
    loot.querySelector('.item-loot-art').innerHTML=itemIconSVG(itemId,40);
    loot.querySelector('.item-loot-kicker').textContent=opts.kicker || (d.isRelic?'RELÍQUIA DE CHEFE OBTIDA':'EQUIPAMENTO OBTIDO');
    loot.querySelector('.item-loot-name').textContent=d.name + (opts.coins ? ` · +${opts.coins} moedas` : '');
    loot.querySelector('.item-loot-desc').textContent=d.desc || '';
    loot.classList.add('show');
    clearTimeout(lootTimer); lootTimer=setTimeout(()=>loot.classList.remove('show'),9000);
  }
  loot.querySelector('.item-loot-open').addEventListener('click',()=>{ if(lootItemId) showItem(lootItemId,{kicker:'ESPÓLIO OBTIDO'}); loot.classList.remove('show'); });
  loot.querySelector('.item-loot-art').addEventListener('click',()=>{ if(lootItemId) showItem(lootItemId,{kicker:'ESPÓLIO OBTIDO'}); });

  const recBtn=document.querySelector('.nav-btn[data-screen="recommended"]');
  if(recBtn) recBtn.remove();
  const recScreen=document.getElementById('screen-recommended');
  if(recScreen){ recScreen.classList.remove('active'); recScreen.style.display='none'; }
  try{
    if(Array.isArray(TUTORIAL_STEPS_MENU)){
      for(let i=TUTORIAL_STEPS_MENU.length-1;i>=0;i--){
        if(String(TUTORIAL_STEPS_MENU[i]&&TUTORIAL_STEPS_MENU[i].selector||'').includes('recommended')) TUTORIAL_STEPS_MENU.splice(i,1);
      }
    }
  }catch(_){ }

  function enhanceItemCards(){
    const cards=document.querySelectorAll('#item-cards .champ-card');
    const byName={}; Object.entries(ITEM_CATALOG).forEach(([id,d])=>byName[d.name]=id);
    cards.forEach(card=>{
      const nameEl=card.querySelector('.champ-name');
      const id=nameEl&&byName[nameEl.textContent.trim()];
      const svg=card.querySelector('.ferro-item-art');
      if(!id||!svg) return;
      const host=svg.parentElement;
      if(!host) return;
      host.classList.add('item-info-trigger'); host.dataset.itemInfo=id;
      host.title='Clique para ver efeito e recomendações';
    });
  }

  if(typeof renderItems==='function'){
    const baseRenderItems=renderItems;
    renderItems=function(){ const out=baseRenderItems(); enhanceItemCards(); return out; };
  }

  if(typeof onInvTilePointerDown==='function'){
    const basePointerDown=onInvTilePointerDown;
    onInvTilePointerDown=function(e,itemId,renderTargetKey){
      if(!e.target.closest('.ferro-item-art')) return basePointerDown(e,itemId,renderTargetKey);
      e.preventDefault();
      const tileEl=e.target.closest('.inv-tile');
      if(typeof mobileEquipMode!=='undefined' && mobileEquipMode){
        showItem(itemId); return;
      }
      const sx=e.clientX, sy=e.clientY; let started=false;
      function move(ev){
        if(started) return;
        if(Math.abs(ev.clientX-sx)>6||Math.abs(ev.clientY-sy)>6){
          started=true; cleanup();
          if(typeof beginItemDrag==='function') beginItemDrag(ev,itemId,tileEl,renderTargetKey);
        }
      }
      function up(){ cleanup(); if(!started) showItem(itemId); }
      function cleanup(){ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); }
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',up,{once:true});
    };
  }

  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-item-info]');
    if(!trigger) return;
    e.preventDefault(); e.stopPropagation();
    showItem(trigger.dataset.itemInfo);
  },true);

  try{
    if(typeof log==='function'){
      const baseLog=log;
      log=function(msg,cls){
        const out=baseLog(msg,cls);
        const text=String(msg||'');
        if(text.includes('deixou cair uma relíquia:')){
          const hit=Object.entries(ITEM_CATALOG).find(([,d])=>d&&d.isRelic&&text.includes(d.name));
          if(hit) setTimeout(()=>showLoot(hit[0],{kicker:'RELÍQUIA DE CHEFE OBTIDA'}),180);
        } else if(text.includes('Colosso da Forja foi abatido:')){
          const hit=Object.entries(ITEM_CATALOG).find(([,d])=>d&&!d.isRelic&&text.includes(d.name));
          const coinMatch=text.match(/\+(\d+) moedas/);
          if(hit) setTimeout(()=>showLoot(hit[0],{kicker:'ESPÓLIO DA FORJA',coins:coinMatch?Number(coinMatch[1]):0}),180);
        }
        return out;
      };
    }
  }catch(_){ }

  window.__ferroItemExperience={showItem,showLoot,recommendations:RECS};

  try{
    if(document.getElementById('screen-items')&&document.getElementById('screen-items').classList.contains('active')) renderItems();
  }catch(_){ }
})();
