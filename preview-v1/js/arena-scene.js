/* Ferro & Lança — arena 3D portada do renderer funcional de 954c4ae.
   O loop, a câmera, o grid, as unidades e o combate continuam pertencendo ao jogo SVG. */
(()=>{
  'use strict';

  if(window.FerroArena3D||window.Arena3D) return;

  const svg=document.getElementById('arena');
  const wrap=svg&&svg.closest('.arena-wrap');
  if(!svg||!wrap) return;

  let layer=document.getElementById('arena-3d-layer');
  if(!layer){
    layer=document.createElement('div');
    layer.id='arena-3d-layer';
    wrap.prepend(layer);
  }
  Object.assign(layer.style,{position:'absolute',inset:'0',width:'auto',height:'auto',pointerEvents:'none',overflow:'hidden'});
  layer.setAttribute('aria-hidden','true');
  svg.style.position='relative';

  const scriptUrl=new URL((document.currentScript&&document.currentScript.src)||'./js/arena-scene.js',location.href);
  const projectRoot=new URL(scriptUrl.pathname.includes('/preview-v1/js/')?'../../':'../',scriptUrl);
  const ARENAS={
    normal:{
      model:new URL('assets/arenas/hexagonal/Arena_Hexagonal.glb',projectRoot).href,
      layout:new URL('assets/arenas/hexagonal/layout.json',projectRoot).href
    },
    corrupted:{
      model:new URL('assets/arenas/corrupted/Arena_Hexagonal.glb',projectRoot).href,
      layout:new URL('assets/arenas/corrupted/layout.json',projectRoot).href
    }
  };

  let THREE=null;
  let GLTFLoader=null;
  let renderer=null;
  let scene=null;
  let camera=null;
  let initPromise=null;
  let initialized=false;
  let failed=false;
  let failureReason=null;
  let currentType=null;
  let visible=false;
  let userVisible=true;
  let lastWidth=0;
  let lastHeight=0;
  let lastList=[];
  let lastFrameAt=0;
  const cache=new Map();
  const models=new Map();
  const heightsByType=new Map();

  function boardIsCompatible(){
    try{return typeof RADIUS==='undefined'||RADIUS===4;}
    catch(_){return true;}
  }

  function desiredType(){
    try{return currentBiome==='rachadura'?'corrupted':'normal';}
    catch(_){return 'normal';}
  }

  function setReady(value,reason=null){
    const next=!!value&&!failed&&userVisible&&boardIsCompatible();
    api.ready=next;
    visible=next;
    failureReason=reason;
    wrap.classList.toggle('arena-3d-ready',next);
    layer.style.visibility=next?'visible':'hidden';
    if(next) svg.style.background='transparent';
    else svg.style.removeProperty('background');
  }

  function fallback(error){
    failed=true;
    failureReason='load-or-webgl-error';
    setReady(false,failureReason);
    if(renderer&&renderer.domElement) renderer.domElement.style.display='none';
    console.warn('Arena 3D: fallback SVG',error);
  }

  function height(type,q,r){
    return heightsByType.get(type)?.get(`${q},${r}`)??.27;
  }

  function lift(unit){
    return height(currentType||desiredType(),unit.q,unit.r)*30/Math.sqrt(2);
  }

  async function loadArena(type){
    if(cache.has(type)) return cache.get(type);
    const config=ARENAS[type];
    const promise=Promise.all([
      new GLTFLoader().loadAsync(config.model),
      fetch(config.layout).then(response=>{
        if(!response.ok) throw new Error(`Falha ao carregar layout ${type}: ${response.status}`);
        return response.json();
      })
    ]).then(([gltf,layout])=>{
      const heights=new Map();
      for(const tile of layout.tiles||[]) heights.set(`${tile.q},${tile.r}`,Number(tile.position_gltf?.[1])-.025);
      heightsByType.set(type,heights);
      const root=gltf.scene;
      root.scale.z=-Math.sqrt(2);
      root.visible=false;
      scene.add(root);
      const entry={root,layout};
      models.set(type,entry);
      return entry;
    });
    cache.set(type,promise);
    return promise;
  }

  function showType(type){
    if(type===currentType) return true;
    const wanted=models.get(type);
    if(!wanted) return false;
    models.forEach(entry=>{entry.root.visible=false;});
    wanted.root.visible=true;
    currentType=type;
    return true;
  }

  function projectAndRender(list){
    if(!initialized||failed||!renderer||!scene||!camera) return false;
    if(!userVisible||!boardIsCompatible()){
      setReady(false,boardIsCompatible()?'hidden-by-user':'radius-8-svg-fallback');
      return false;
    }

    const type=desiredType();
    if(!showType(type)) return false;
    const rect=wrap.getBoundingClientRect();
    const matrix=svg.getScreenCTM();
    if(!matrix||Math.abs(matrix.a)<.0001||Math.abs(matrix.d)<.0001||rect.width<1||rect.height<1){
      setReady(false,'svg-projection-unavailable');
      return false;
    }

    const width=Math.round(rect.width);
    const heightPx=Math.round(rect.height);
    if(width!==lastWidth||heightPx!==lastHeight){
      lastWidth=width;
      lastHeight=heightPx;
      renderer.setSize(width,heightPx,false);
    }

    // Projeção do baseline funcional: CTM vivo inclui zoom, pan, letterbox e camera shake.
    const x=(rect.left-matrix.e)/matrix.a;
    const y=(rect.top-matrix.f)/matrix.d;
    camera.left=(x-250)/30;
    camera.right=(x+rect.width/matrix.a-250)/30;
    camera.top=-(y-230)/30;
    camera.bottom=-(y+rect.height/matrix.d-230)/30;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    lastFrameAt=performance.now();

    setReady(true);
    svg.querySelectorAll('[data-terrain-base]').forEach(node=>node.setAttribute('fill','transparent'));
    svg.querySelectorAll('[data-grid-tile]').forEach(node=>{
      const [q,r]=node.getAttribute('data-grid-tile').split(',').map(Number);
      node.setAttribute('transform',`translate(0 ${-height(type,q,r)*30/Math.sqrt(2)})`);
      if(node.getAttribute('data-free-tile')==='true') node.setAttribute('stroke-opacity','.2');
    });
    for(const unit of list||[]){
      const group=svg.querySelector(`[data-unit-id="${unit.id}"]`);
      if(group) group.setAttribute('transform',`translate(0 ${-lift(unit)})`);
    }
    return true;
  }

  async function init(){
    if(initPromise) return initPromise;
    initPromise=(async()=>{
      const modules=await Promise.all([
        import('https://esm.sh/three@0.180.0'),
        import('https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js')
      ]);
      THREE=modules[0];
      GLTFLoader=modules[1].GLTFLoader;
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.05;
      renderer.setClearColor(0x000000,0);
      renderer.domElement.style.pointerEvents='none';
      renderer.domElement.setAttribute('aria-hidden','true');
      layer.replaceChildren(renderer.domElement);

      scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xdde8ef,0x322c22,2.25));
      const key=new THREE.DirectionalLight(0xffebd2,3);
      key.position.set(-8,14,9);
      scene.add(key);

      camera=new THREE.OrthographicCamera(-10,10,10,-10,.01,400);
      camera.position.set(0,100,100);
      camera.lookAt(0,0,0);
      camera.updateMatrixWorld();

      await Promise.all([loadArena('normal'),loadArena('corrupted')]);
      initialized=true;
      showType(desiredType());
      return true;
    })().catch(error=>{fallback(error);return false;});
    return initPromise;
  }

  const api={
    ready:false,
    init,
    height(q,r){return height(currentType||desiredType(),q,r);},
    lift,
    frame(list){
      lastList=Array.isArray(list)?list:[];
      try{return projectAndRender(lastList);}
      catch(error){
        failureReason='temporary-render-error';
        console.warn('Arena 3D: falha temporária de render; mantendo o loop do jogo.',error);
        return false;
      }
    },
    resize(){lastWidth=0;lastHeight=0;return this.frame(lastList);},
    setVisible(value){userVisible=!!value;if(!userVisible)setReady(false,'hidden-by-user');},
    debug(){
      const info=renderer&&renderer.info&&renderer.info.render;
      return {
        ready:api.ready,
        type:currentType,
        canvas:renderer?{
          width:renderer.domElement.width,
          height:renderer.domElement.height,
          cssWidth:renderer.domElement.clientWidth,
          cssHeight:renderer.domElement.clientHeight
        }:null,
        calls:info?info.calls:0,
        triangles:info?info.triangles:0,
        rendererActive:!!renderer&&!failed,
        visible,
        fallback2D:!api.ready,
        fallbackReason:api.ready?null:(failureReason||(!boardIsCompatible()?'radius-8-svg-fallback':'not-ready')),
        cached:[...cache.keys()],
        lastFrameAt
      };
    }
  };

  window.Arena3D=api;
  window.FerroArena3D=api;
  init();
})();
