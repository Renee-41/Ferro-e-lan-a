/* Ferro & Lança — notas visíveis do pacote Gameplay Polish v1 (QA). */
(function(){
  if(window.__ferroQaPatchnotesV1) return;
  window.__ferroQaPatchnotesV1=true;

  if(!document.querySelector('script[data-ferro-module="raio-balance"]')){
    const s=document.createElement('script');
    s.src='js/raio-balance.js?v=raio-balance-1';
    s.async=false;
    s.dataset.ferroModule='raio-balance';
    (document.head||document.documentElement).appendChild(s);
  }

  const panel=document.getElementById('patchnotes-panel');
  const button=document.getElementById('patchnotes-btn');
  const dot=document.getElementById('patchnotes-dot');
  if(!panel) return;

  const style=document.createElement('style');
  style.textContent=`
    #qa-gameplay-polish-notes{margin:0 0 18px;padding:12px;border:1px solid rgba(232,194,80,.38);border-radius:8px;background:rgba(232,194,80,.045)}
    #qa-gameplay-polish-notes .qa-notes-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
    #qa-gameplay-polish-notes .qa-notes-title{color:var(--gold);font:800 14px/1.2 Oswald,sans-serif;text-transform:uppercase;letter-spacing:.1em}
    #qa-gameplay-polish-notes .qa-notes-badge{font:800 10px/1 'JetBrains Mono',monospace;color:#ffb08f;border:1px solid rgba(224,105,58,.45);border-radius:999px;padding:5px 8px}
    #qa-gameplay-polish-notes .qa-notes-sub{margin:0 0 11px;color:#aeb5be;font:600 11.5px/1.45 'JetBrains Mono',monospace}
    #qa-gameplay-polish-notes .qa-note-card{margin:0 0 9px;padding:10px 11px;border:1px solid rgba(155,166,181,.24);border-radius:7px;background:rgba(7,9,12,.24);box-shadow:inset 0 1px rgba(255,255,255,.018)}
    #qa-gameplay-polish-notes .qa-note-card:last-child{margin-bottom:0}
    #qa-gameplay-polish-notes .qa-note-card h4{margin:0 0 6px;color:#e8e0d4;font:800 13px/1.25 Oswald,sans-serif;letter-spacing:.025em}
    #qa-gameplay-polish-notes .qa-note-card p{margin:0;color:#b9c1ca;font:600 11.5px/1.55 'JetBrains Mono',monospace}
    #qa-gameplay-polish-notes .qa-note-card strong{color:#f0d473}
    #patchnotes-panel{font-size:11.5px}
  `;
  document.head.appendChild(style);

  const entries=[
    ['Correção visual de combate','Projéteis, impactos, alcance/alvo, efeitos de morte e Terreno Corrompido passam a usar o mesmo retângulo e viewBox da arena, evitando VFX deslocados com zoom.'],
    ['Voltra — Sobrecarga','A cena dramática continua destacando a frase e a ativação, mas sem o freeze prolongado que escondia os pulsos e puxões.'],
    ['Classes oficiais','Atirador vence Tanque, Tanque vence Lutador e Lutador vence Atirador. Lutadores também caçam melhor a backline inimiga.'],
    ['Escolha inicial','Os cards iniciais mostram a classe oficial; a confirmação não mostra três slots vazios e deixa claro que a run começa com uma unidade.'],
    ['Progressão de estrelas','Novo teste: <strong>1★→2★ exige 3 cópias, 2★→3★ exige 5 e 3★→4★ exige 7</strong>. Moedas e preços permanecem inalterados neste teste.'],
    ['Shava rework','Após Golpe Aéreo entra em Embalo, com cura, resistência temporária e sustentação ofensiva.'],
    ['Nerith','Tentáculos herdam parte dos bônus da build e agora são forçados a <strong>alcance 1</strong>: combatem corpo a corpo e não disparam projéteis.'],
    ['Raio','Combo exige 5 golpes cedo, 4 no midgame e 3 no late. Se o alvo morrer, só há <strong>30% de chance</strong> de transferir o combo; nos outros 70% ele termina.'],
    ['Ímã','Pulso ganhou desaceleração e a dupla Ferrha + Ímã ativa o Vínculo Ferromagnético.'],
    ['Shecry rework','Sem bônus de dano por vida baixa: saudável = resistência; ferida = regeneração crescente.'],
    ['Itens e venda','A ficha de recomendação continua disponível fora da mochila. Dentro do inventário, o clique volta ao fluxo de venda original.'],
    ['Loja de Itens / Suporte','Entraram novos itens de Suporte, receitas mais claras por classe e o Coração de Ferro foi diferenciado da Muralha Viva.'],
    ['Relíquias de chefe','Núcleo da Rachadura, Fragmento Corrompido e Coroa de Ferro ganharam efeitos mais marcantes.'],
    ['Suportes no pós-jogo','Resumo da run mostra cura recebida, cura feita, amplificação concedida e participação.'],
    ['Interface','Itens virou Loja de Itens; Perfil, Conquistas e Placar foram agrupados. O Modo CLT/Preguiça continua disponível.'],
    ['Preparação entre ondas','O botão flutuante de <strong>Confirmar posições</strong> agora só aparece depois de sair do intervalo com <strong>Pular</strong> e some novamente ao confirmar, evitando ficar sobre a batalha ativa. O <strong>AUTO</strong> continua pulando e confirmando sozinho.'],
    ['Controles de batalha','O <strong>AUTO</strong> agora fica junto dos controles de velocidade no topo. O botão de <strong>travar a câmera</strong> foi movido para o canto inferior direito da arena.'],
    ['Interações entre personagens','Primeiro pacote de diálogos contextuais entre aliados: <strong>Ferrha + Ímã, Kael + Glacia, Voss + Zeph, Jedegar + Terrus, Gélida + Frosk e Raio + Voltra</strong>. Falas de passiva, ultimate e finalização sempre têm prioridade e interrompem/adiam diálogos de dupla.'],
    ['Câmera fixa','O botão de câmera fixa trava a visão geral e bloqueia roda, pinça e duplo clique até ser liberada.'],
    ['Resumo da run','O espaço lateral livre da batalha passa a mostrar um painel discreto com onda, equipe, número de 4★, itens equipados e estado do Auto.'],
    ['Cinematográficas de passiva','Continuam mais lentas e legíveis, com frase em destaque antes do impacto e retomada do combate.']
  ];

  const READ_KEY='ferroLancaNotesReadQaGameplayPolishV1Interactions';
  const section=document.createElement('div');
  section.id='qa-gameplay-polish-notes';
  section.innerHTML=`<div class="qa-notes-head"><strong class="qa-notes-title">Gameplay Polish v1</strong><span class="qa-notes-badge">EM TESTE · QA</span></div><div class="qa-notes-sub">Reworks e alterações desta versão de teste:</div><div class="qa-note-list">${entries.map(([title,text])=>`<article class="qa-note-card"><h4>${title}</h4><p>${text}</p></article>`).join('')}</div>`;

  const header=panel.firstElementChild;
  if(header) header.insertAdjacentElement('afterend',section);
  else panel.prepend(section);

  try{
    if(localStorage.getItem(READ_KEY)!=='1' && dot) dot.classList.add('show');
  }catch(_){ }

  if(button){
    button.addEventListener('click',()=>{
      try{ localStorage.setItem(READ_KEY,'1'); }catch(_){ }
    });
  }
})();
