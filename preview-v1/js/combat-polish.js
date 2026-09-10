/* Ferro & Lança — polimento do pacote de combate.
   - reposiciona o inspector para não cobrir unidade/alvo
   - reduz a força visual dos hexes vermelhos
   - adiciona feedback de morte sem mexer na câmera
*/
(function(){
  if(window.__ferroCombatPolishV1) return;
  window.__ferroCombatPolishV1 = true;

  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  if(!arena||!wrap) return;
  if(getComputedStyle(wrap).position==='static') wrap.style.position='relative';

  const NS='http://www.w3.org/2000/svg';
  const deathLayer=document.createElementNS(NS,'svg');
  deathLayer.id='combat-death-overlay';
  deathLayer.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio')||'xMidYMid slice');
  Object.assign(deathLayer.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'14',overflow:'hidden'});
  wrap.appendChild(deathLayer);

  const snapshots=new Map();
  let deathFx=[];
  const sideCache=new Map();

  function allUnits(){
    try{return Array.isArray(units)?units:[];}catch(_){return [];}
  }
  function aliveUnits(){return allUnits().filter(u=>u&&u.alive);}
  function svgEl(name,attrs){
    const n=document.createElementNS(NS,name);
    Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));
    return n;
  }
  function syncViewBox(){
    const vb=arena.getAttribute('viewBox');
    if(vb) deathLayer.setAttribute('viewBox',vb);
    else{
      try{deathLayer.setAttribute('viewBox',`${camViewBox.x} ${camViewBox.y} ${camViewBox.w} ${camViewBox.h}`);}catch(_){/* noop */}
    }
    deathLayer.setAttribute('preserveAspectRatio',arena.getAttribute('preserveAspectRatio')||'xMidYMid slice');
  }
  function toLocalScreen(u){
    try{
      const p=arena.createSVGPoint();p.x=u.rx;p.y=u.ry;
      const s=p.matrixTransform(arena.getScreenCTM());
      const wr=wrap.getBoundingClientRect();
      return{x:s.x-wr.left,y:s.y-wr.top};
    }catch(_){return null;}
  }
  function rectOverlap(a,b){
    const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
    const y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    return x*y;
  }
  function overflowPenalty(r,w,h){
    let p=0;
    if(r.x<8)p+=(8-r.x)*80;
    if(r.y<8)p+=(8-r.y)*80;
    if(r.x+r.w>w-8)p+=(r.x+r.w-(w-8))*80;
    if(r.y+r.h>h-8)p+=(r.y+r.h-(h-8))*80;
    return p;
  }

  function smartPlaceTooltip(){
    const tooltip=document.getElementById('combat-feedback-tooltip');
    if(!tooltip||tooltip.style.display==='none') return;
    const title=tooltip.querySelector('div');
    const name=title?title.textContent.trim():'';
    if(!name) return;
    const u=aliveUnits().find(x=>x.name===name);
    if(!u) return;
    const src=toLocalScreen(u);
    if(!src) return;

    let target=null;
    try{if(typeof nearestEnemy==='function') target=nearestEnemy(u);}catch(_){/* noop */}
    const tgt=target?toLocalScreen(target):null;
    const wr=wrap.getBoundingClientRect();
    const tw=tooltip.offsetWidth||190,th=tooltip.offsetHeight||100;
    const gap=42;
    const candidates={
      right:{x:src.x+gap,y:src.y-th/2,w:tw,h:th},
      left:{x:src.x-gap-tw,y:src.y-th/2,w:tw,h:th},
      top:{x:src.x-tw/2,y:src.y-gap-th,w:tw,h:th},
      bottom:{x:src.x-tw/2,y:src.y+gap,w:tw,h:th}
    };
    const dangerRects=[{x:src.x-38,y:src.y-38,w:76,h:76}];
    if(tgt) dangerRects.push({x:tgt.x-42,y:tgt.y-42,w:84,h:84});

    function score(r){
      let s=overflowPenalty(r,wr.width,wr.height);
      dangerRects.forEach(d=>{s+=rectOverlap(r,d)*5;});
      if(tgt){
        const mx=(src.x+tgt.x)/2,my=(src.y+tgt.y)/2;
        s+=rectOverlap(r,{x:mx-28,y:my-28,w:56,h:56})*1.3;
      }
      return s;
    }

    let side=sideCache.get(name);
    if(!side||!candidates[side]||score(candidates[side])>500){
      side=Object.keys(candidates).sort((a,b)=>score(candidates[a])-score(candidates[b]))[0];
      sideCache.set(name,side);
    }
    const r=candidates[side];
    const left=Math.max(8,Math.min(wr.width-tw-8,r.x));
    const top=Math.max(8,Math.min(wr.height-th-8,r.y));
    tooltip.style.left=left+'px';
    tooltip.style.top=top+'px';
  }

  function softenCombatOverlay(){
    const layer=document.getElementById('combat-feedback-overlay');
    if(!layer)return;
    layer.style.overflow='hidden';
    layer.querySelectorAll('polygon').forEach(p=>{
      const stroke=(p.getAttribute('stroke')||'').toLowerCase();
      if(stroke==='#cf6658'){
        p.setAttribute('opacity','.32');
        p.setAttribute('fill','rgba(201,77,61,.025)');
      }else if(stroke==='#5aa8df'){
        p.setAttribute('opacity','.62');
        p.setAttribute('fill','rgba(63,127,168,.10)');
      }
    });
    layer.querySelectorAll('line').forEach(l=>{
      if((l.getAttribute('stroke')||'').toLowerCase()==='#ef7665') l.setAttribute('opacity','.42');
    });
  }

  function detectDeaths(now){
    allUnits().forEach(u=>{
      if(!u)return;
      const prev=snapshots.get(u.id);
      const snap={alive:!!u.alive,x:u.rx,y:u.ry,color:u.color||'#d7c9b8',name:u.name||'',boss:!!u.isBoss};
      if(prev&&prev.alive&&!snap.alive){
        deathFx.push({x:prev.x,y:prev.y,color:prev.color,name:prev.name,boss:prev.boss,start:now,life:prev.boss?1250:900});
        if(deathFx.length>40)deathFx.splice(0,deathFx.length-40);
      }
      snapshots.set(u.id,snap);
    });
  }

  function drawDeaths(now){
    deathFx=deathFx.filter(f=>now-f.start<f.life);
    deathFx.forEach(f=>{
      const t=(now-f.start)/f.life;
      const ease=1-Math.pow(1-t,2);
      const radius=(f.boss?18:13)+ease*(f.boss?38:27);
      deathLayer.appendChild(svgEl('circle',{
        cx:f.x,cy:f.y,r:radius.toFixed(1),fill:'none',stroke:f.color,
        'stroke-width':f.boss?3.2:2.4,opacity:Math.max(0,1-t).toFixed(2),
        'stroke-dasharray':f.boss?'8 4':'5 4','vector-effect':'non-scaling-stroke'
      }));
      deathLayer.appendChild(svgEl('circle',{
        cx:f.x,cy:f.y,r:Math.max(2,14*(1-t)).toFixed(1),fill:'#fff4dc',
        opacity:Math.max(0,.48-t*.55).toFixed(2)
      }));

      for(let i=0;i<(f.boss?12:8);i++){
        const a=(Math.PI*2*i)/(f.boss?12:8)+(f.start%1000)*.001;
        const d=ease*(f.boss?48:33);
        deathLayer.appendChild(svgEl('circle',{
          cx:(f.x+Math.cos(a)*d).toFixed(1),cy:(f.y+Math.sin(a)*d).toFixed(1),
          r:(f.boss?2.5:1.8),fill:f.color,opacity:Math.max(0,1-t).toFixed(2)
        }));
      }

      if(t<.72){
        const label=svgEl('text',{
          x:f.x,y:(f.y-24-ease*15).toFixed(1),'text-anchor':'middle',fill:'#e7ddd1',
          opacity:Math.max(0,1-t/.72).toFixed(2),'font-family':'Oswald, sans-serif',
          'font-size':f.boss?15:12,'font-weight':'700',stroke:'#0a0908','stroke-width':3,
          'paint-order':'stroke','vector-effect':'non-scaling-stroke'
        });
        label.textContent=f.boss?'CHEFE ABATIDO':'CAIU';
        deathLayer.appendChild(label);
      }
    });
  }

  function frame(now){
    syncViewBox();
    deathLayer.replaceChildren();
    detectDeaths(now);
    drawDeaths(now);
    softenCombatOverlay();
    smartPlaceTooltip();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
