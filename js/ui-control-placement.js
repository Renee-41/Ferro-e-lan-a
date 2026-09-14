/* Ferro & Lança — posicionamento final dos controles compactos de batalha. */
(function(){
  if(window.__ferroUiControlPlacementV1) return;
  window.__ferroUiControlPlacementV1=true;

  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  if(!wrap) return;

  const style=document.createElement('style');
  style.textContent=`
    #qa-battle-tools:empty{display:none!important}
    #camera-lock-btn{position:absolute;right:10px;bottom:10px;z-index:24;width:34px;height:34px;padding:0;border:1px solid rgba(155,166,181,.30);border-radius:8px;background:rgba(11,13,16,.86);color:#c9d0d8;font:700 15px/1 'JetBrains Mono',monospace;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.30);backdrop-filter:blur(5px)}
    #camera-lock-btn:hover{border-color:rgba(242,173,85,.70);color:#f2d7a7}
    #camera-lock-btn.on{border-color:rgba(232,194,80,.78);color:#f0d473;background:rgba(232,194,80,.12)}
    #battle-speed-control #qa-auto-rounds-btn{min-width:48px;margin-right:3px;padding:0 7px}
    #battle-speed-control #qa-auto-rounds-btn.on{background:rgba(232,194,80,.12);border-color:rgba(232,194,80,.55);color:#f0d473;box-shadow:0 0 10px rgba(232,194,80,.10)}
    @media(max-width:640px){#camera-lock-btn{right:6px;bottom:6px;width:32px;height:32px}#battle-speed-control #qa-auto-rounds-btn{min-width:42px;padding:0 5px;margin-right:2px}}
  `;
  document.head.appendChild(style);

  function placeControls(){
    const cameraBtn=document.getElementById('camera-lock-btn');
    if(cameraBtn && cameraBtn.parentElement!==wrap) wrap.appendChild(cameraBtn);

    const speed=document.getElementById('battle-speed-control');
    const auto=document.getElementById('qa-auto-rounds-btn');
    if(speed&&auto&&auto.parentElement!==speed){
      const firstSpeed=speed.querySelector('button[data-speed]');
      if(firstSpeed) speed.insertBefore(auto,firstSpeed);
      else speed.appendChild(auto);
    }

    const oldHost=document.getElementById('qa-battle-tools');
    if(oldHost&&!oldHost.children.length) oldHost.style.display='none';
  }

  placeControls();
  const observer=new MutationObserver(placeControls);
  observer.observe(wrap,{childList:true,subtree:true});
  setTimeout(placeControls,0);
  setTimeout(placeControls,250);
})();
