/* A/B selection: the same index and combat modules in both modes. */
(()=>{
  const enabled=new URLSearchParams(location.search).get('visual')==='3d';
  const links=document.createElement('nav');links.id='visual-test-switch';
  links.setAttribute('aria-label','Comparar visual do jogo');
  Object.assign(links.style,{position:'fixed',bottom:'8px',left:'8px',zIndex:9999,display:'flex',gap:'8px',background:'#101820ed',padding:'8px',borderRadius:'8px',font:'12px system-ui'});
  for(const [mode,label] of [['2d','A · Jogo 2D'],['3d','B · Arena + Ferrha 3D']]){
    const a=document.createElement('a'),url=new URL(location.href);url.searchParams.set('visual',mode);
    a.href=url;a.textContent=label;a.style.color=(enabled===(mode==='3d'))?'#f1ca79':'#b3c1ca';links.appendChild(a);
  }
  document.body.appendChild(links);
  if(!enabled)return;
  window.Ferro3D={
    ready:false,
    frame(list,dt,now){
      // The existing combat clock owns speed. Camera projection still runs when dt is 0.
      const scaled=dt*(window.FerroBattleTime?.getSpeed()??1);
      window.Arena3D?.frame(list);
      window.Ferrha3D?.frame(list,scaled,now);
    }
  };
  for(const src of ['js/arena-game-3d.js','js/ferrha-3d.js']){
    const script=document.createElement('script');script.src=src;document.head.appendChild(script);
  }
})();
