/* Ferro & Lança — QA: alinha overlays/VFX ao retângulo real do SVG da arena.
   Motivo: arena-wrap pode ser muito maior que #arena (SVG centralizado com max-width),
   então overlays em inset:0 ficam escalados/deslocados apesar de usarem o mesmo viewBox. */
(function(){
  if(window.__ferroQaVisualAlignmentV1) return;
  window.__ferroQaVisualAlignmentV1=true;

  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  if(!arena||!wrap) return;
  if(getComputedStyle(wrap).position==='static') wrap.style.position='relative';

  const WORLD_LAYERS=[
    'combat-feedback-overlay',
    'biome-mechanics-overlay',
    'combat-death-overlay',
    'signature-vfx-overlay'
  ];

  function arenaBox(){
    const ar=arena.getBoundingClientRect();
    const wr=wrap.getBoundingClientRect();
    return {
      left:ar.left-wr.left-wrap.clientLeft,
      top:ar.top-wr.top-wrap.clientTop,
      width:ar.width,
      height:ar.height,
      screen:ar
    };
  }

  function syncLayer(layer,box){
    if(!layer) return;
    layer.style.position='absolute';
    layer.style.inset='auto';
    layer.style.left=box.left+'px';
    layer.style.top=box.top+'px';
    layer.style.width=box.width+'px';
    layer.style.height=box.height+'px';
    layer.style.right='auto';
    layer.style.bottom='auto';
    layer.style.maxWidth='none';
    layer.style.maxHeight='none';

    const vb=arena.getAttribute('viewBox');
    if(vb) layer.setAttribute('viewBox',vb);
    else{
      try{ layer.setAttribute('viewBox',`${camViewBox.x} ${camViewBox.y} ${camViewBox.w} ${camViewBox.h}`); }catch(_){ }
    }
    layer.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio')||'xMidYMid slice');
  }

  function syncBiomeChip(box){
    const chip=document.getElementById('biome-mechanics-chip');
    if(!chip) return;
    chip.style.left=(box.left+10)+'px';
    chip.style.top=(box.top+27)+'px';
  }

  function keepTooltipNearArena(box){
    const tip=document.getElementById('combat-feedback-tooltip');
    if(!tip||tip.style.display==='none') return;
    const tw=tip.offsetWidth||190, th=tip.offsetHeight||100;
    let left=parseFloat(tip.style.left)||box.left+8;
    let top=parseFloat(tip.style.top)||box.top+8;

    // Não deixa o inspector escapar para áreas vazias do painel quando o SVG está centralizado.
    const minLeft=box.left+8;
    const maxLeft=Math.max(minLeft,box.left+box.width-tw-8);
    const minTop=box.top+8;
    const maxTop=Math.max(minTop,box.top+box.height-th-8);
    left=Math.max(minLeft,Math.min(maxLeft,left));
    top=Math.max(minTop,Math.min(maxTop,top));
    tip.style.left=left+'px';
    tip.style.top=top+'px';
  }

  function frame(){
    const box=arenaBox();
    WORLD_LAYERS.forEach(id=>syncLayer(document.getElementById(id),box));

    // Qualquer futuro SVG de VFX que use o mesmo viewBox também fica preso ao tabuleiro.
    wrap.querySelectorAll('svg[id*="overlay"]').forEach(layer=>{
      if(layer!==arena && !WORLD_LAYERS.includes(layer.id)) syncLayer(layer,box);
    });

    syncBiomeChip(box);
    keepTooltipNearArena(box);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.FerroVisualAlignment={
    debug(){
      const box=arenaBox();
      const layers={};
      WORLD_LAYERS.forEach(id=>{
        const el=document.getElementById(id);
        if(!el) return;
        const r=el.getBoundingClientRect();
        layers[id]={left:r.left,top:r.top,width:r.width,height:r.height};
      });
      return {arena:{left:box.screen.left,top:box.screen.top,width:box.screen.width,height:box.screen.height},layers};
    }
  };
})();
