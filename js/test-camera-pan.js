/* Inspection pan shared by A and B; independent of combat speed. Existing zoom stays intact. */
(()=>{
  const arena=document.getElementById('arena');if(!arena||typeof updateCamera!=='function')return;
  const base=updateCamera,offset={x:0,y:0},applied={x:0,y:0};let drag=null,suppressClick=false;
  updateCamera=function(dt){
    camViewBox.x-=applied.x;camViewBox.y-=applied.y;base(dt);
    camViewBox.x+=offset.x;camViewBox.y+=offset.y;Object.assign(applied,offset);
  };
  arena.addEventListener('pointerdown',e=>{
    if(e.button!==1&&!(e.button===0&&e.shiftKey))return;
    e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY};arena.setPointerCapture(e.pointerId);
  });
  arena.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const m=arena.getScreenCTM();if(!m)return;
    offset.x=Math.max(-400,Math.min(400,offset.x-(e.clientX-drag.x)/m.a));
    offset.y=Math.max(-400,Math.min(400,offset.y-(e.clientY-drag.y)/m.d));
    drag.x=e.clientX;drag.y=e.clientY;suppressClick=true;
  });
  const stop=e=>{if(drag?.id===e.pointerId){drag=null;if(arena.hasPointerCapture(e.pointerId))arena.releasePointerCapture(e.pointerId);}};
  arena.addEventListener('pointerup',stop);arena.addEventListener('pointercancel',stop);
  arena.addEventListener('click',e=>{if(suppressClick){e.stopImmediatePropagation();suppressClick=false;}},true);
  arena.addEventListener('dblclick',()=>{offset.x=offset.y=0;});
  arena.title='Roda/pinca: zoom. Shift + arrastar ou botao do meio: mover camera. Duplo clique: reset.';
})();
