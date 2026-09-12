/* Ferro & Lança — notas visíveis do pacote Gameplay Polish v1 (QA). */
(function(){
  if(window.__ferroQaPatchnotesV1) return;
  window.__ferroQaPatchnotesV1=true;

  // Pequenos hotfixes de balanceamento do pacote QA podem ser carregados daqui
  // sem tocar na main nem duplicar a lógica central do jogo.
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

  const READ_KEY='ferroLancaNotesReadQaGameplayPolishV1VisualFixes';
  const section=document.createElement('div');
  section.id='qa-gameplay-polish-notes';
  section.style.cssText='margin:0 0 18px;padding:12px;border:1px solid rgba(232,194,80,.38);border-radius:8px;background:rgba(232,194,80,.06);';
  section.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
      <strong style="color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Gameplay Polish v1</strong>
      <span style="font:700 9px/1 'JetBrains Mono',monospace;color:#ffb08f;border:1px solid rgba(224,105,58,.45);border-radius:999px;padding:4px 7px;">EM TESTE · QA</span>
    </div>
    <div class="subtitle" style="margin:0 0 10px;">Reworks e alterações desta versão de teste:</div>
    <ul style="margin-top:0;">
      <li><strong>Correção visual de combate:</strong> projéteis, impactos, indicadores de alcance/alvo, efeitos de morte e marcações do Terreno Corrompido agora usam exatamente o mesmo retângulo e viewBox da arena, evitando VFX “soltos” ou deslocados quando o tabuleiro está centralizado/zoomado.</li>
      <li><strong>Voltra — Sobrecarga:</strong> a cena dramática continua destacando a frase e a ativação, mas não usa mais o freeze prolongado do restante das passivas; os pulsos e puxões ficam visíveis durante a sequência.</li>
      <li><strong>Classes oficiais e vantagem de classe:</strong> Atirador vence Tanque, Tanque vence Lutador e Lutador vence Atirador. Lutadores também passam a buscar melhor a backline inimiga.</li>
      <li><strong>Escolha inicial mais clara:</strong> os cards iniciais agora mostram a classe oficial do personagem; a confirmação deixa de exibir três slots vazios e remove a mensagem de “1 a 3”, deixando claro que a run começa com uma única unidade.</li>
      <li><strong>Progressão de estrelas:</strong> 1★→2★ exige 2 cópias, 2★→3★ exige 3 e 3★→4★ exige 4.</li>
      <li><strong>Shava rework:</strong> ganhou mais sobrevivência e, após o Golpe Aéreo, entra em Embalo com cura, resistência temporária e sustentação ofensiva.</li>
      <li><strong>Nerith:</strong> tentáculos agora herdam parte dos bônus de dano, velocidade e vida dos itens equipados nela.</li>
      <li><strong>Raio:</strong> o combo elétrico exige 5 golpes no começo, 4 no midgame e 3 no late game. Se o alvo morrer durante o combo, há apenas <strong>30% de chance</strong> de continuar em outro inimigo; nos outros 70%, o combo termina e a imunidade acaba junto.</li>
      <li><strong>Ímã:</strong> pulso magnético ganhou desaceleração e a dupla Ferrha + Ímã ativa o Vínculo Ferromagnético com bônus defensivos/ofensivos próprios.</li>
      <li><strong>Shecry rework:</strong> saiu o bônus de dano por vida baixa; agora a identidade é resistência quando saudável e regeneração crescente conforme perde vida.</li>
      <li><strong>Novos itens de Suporte:</strong> Sino de Cadência, Selo de Amparo, Elo Harmônico, Bandeira do Elo e Círculo Restaurador.</li>
      <li><strong>Filtros da Loja de Itens:</strong> componentes necessários para receitas passam a aparecer junto da classe do item combinado, reduzindo receitas “escondidas”.</li>
      <li><strong>Coração de Ferro refeito:</strong> deixa de competir diretamente com Muralha Viva e passa a curar/fortalecer a defesa após vários impactos recebidos.</li>
      <li><strong>Relíquias de chefe fortalecidas:</strong> Núcleo da Rachadura, Fragmento Corrompido e Coroa de Ferro ganharam efeitos mais marcantes.</li>
      <li><strong>Suportes no pós-jogo:</strong> resumo da run passa a mostrar cura recebida, cura feita, amplificação concedida e participação.</li>
      <li><strong>Interface reorganizada:</strong> “Itens” virou “Loja de Itens”; Perfil, Conquistas e Placar foram agrupados em uma mesma área com abas internas.</li>
      <li><strong>Modo CLT / Preguiça:</strong> opção nas Configurações para resumir descrições de personagens e itens para quem quer informação rápida.</li>
      <li><strong>Som e venda de itens:</strong> controles de áudio foram movidos para Configurações e a venda por clique ficou mais direta; a lixeira visual foi removida.</li>
      <li><strong>Cinematográficas de passiva:</strong> ficaram mais lentas e legíveis, com a frase permanecendo mais tempo antes do impacto e da retomada do combate.</li>
    </ul>
  `;

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
