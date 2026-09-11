/* Ferro & Lança — correções pequenas e seguras da passada de Gameplay Polish v1. */
(function(){
  if(window.__ferroGameplayPolishV1) return;
  window.__ferroGameplayPolishV1 = true;

  // O sistema de sugestão de equipe foi criado antes de Shava/Jedegar.
  // Sem categoria, os dois ficavam praticamente invisíveis para a composição automática.
  try{
    if(typeof ROLE_CATEGORY!=='undefined'){
      ROLE_CATEGORY.shava='corpo a corpo';
      ROLE_CATEGORY.jedegar='suporte';
    }
  }catch(_){ /* não interfere no jogo se o helper não estiver disponível */ }
})();