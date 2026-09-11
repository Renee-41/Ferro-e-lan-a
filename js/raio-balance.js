/* Ferro & Lança — QA: ajuste do Raio para impedir transferência garantida do Combo Relâmpago. */
(function(){
  if(window.__ferroRaioBalanceV1) return;
  window.__ferroRaioBalanceV1=true;

  const TRANSFER_CHANCE=0.30;

  try{
    if(typeof CHAMPION_CATALOG!=='undefined' && CHAMPION_CATALOG.raio){
      CHAMPION_CATALOG.raio.desc='Combo Relâmpago: a exigência de golpes acompanha o ritmo da run (5 no começo, 4 no midgame e 3 no late game). Se o alvo morrer durante o combo, há 30% de chance de Raio continuar em outro inimigo; caso contrário, o combo termina.';
    }
  }catch(_){ }

  try{
    if(typeof updateComboState==='function'){
      const baseUpdateComboState=updateComboState;
      updateComboState=function(){
        try{
          units.forEach(u=>{
            if(!u || !u.alive || u.champId!=='raio' || !u.comboActive) return;
            const current=units.find(x=>x.id===u.comboTargetId);
            if(current && current.alive) return;

            // O módulo de rework tenta transferir o combo automaticamente quando o alvo cai.
            // Aqui decidimos antes: somente 30% das mortes permitem essa transferência.
            if(Math.random()>=TRANSFER_CHANCE){
              u.comboActive=false;
              u.comboTargetId=null;
              u.comboPhase=null;
              u.comboNextAt=0;
              if(typeof spawnFloatText==='function') spawnFloatText(u.rx,u.ry-36,'COMBO QUEBROU','#9aa3ad');
            }
          });
        }catch(_){ }
        return baseUpdateComboState.apply(this,arguments);
      };
    }
  }catch(_){ }

  window.FerroRaioBalance={transferChance:TRANSFER_CHANCE};
})();
