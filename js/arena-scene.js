/* Ferro & Lança — arena 3D como cenário visual seguro.
   O SVG continua sendo a fonte única de gameplay, interação, câmera e VFX. */
(function(){
  'use strict';

  if(window.FerroArena3D) return;

  const arena=document.getElementById('arena');
  const wrap=arena&&arena.closest('.arena-wrap');
  let layer=document.getElementById('arena-3d-layer');
  if(wrap&&!layer){
    layer=document.createElement('div');
    layer.id='arena-3d-layer';
    layer.setAttribute('aria-hidden','true');
    wrap.prepend(layer);
  }
  const scriptUrl=new URL((document.currentScript&&document.currentScript.src)||'./js/arena-scene.js',location.href);
  const projectRoot=new URL(scriptUrl.pathname.includes('/preview-v1/js/')?'../../':'../',scriptUrl);
  const ARENAS={
    normal:{
      model:new URL('assets/arenas/hexagonal/Arena_Hexagonal.glb',projectRoot).href,
      layout:new URL('assets/arenas/hexagonal/layout.json',projectRoot).href,
      clear:0x0b0e10
    },
    corrupted:{
      model:new URL('assets/arenas/corrupted/Arena_Hexagonal.glb',projectRoot).href,
      layout:new URL('assets/arenas/corrupted/layout.json',projectRoot).href,
      clear:0x100b1b
    }
  };

  let THREE=null;
  let GLTFLoader=null;
  let renderer=null;
  let scene=null;
  let camera=null;
  let raf=0;
  let initPromise=null;
  let disposed=false;
  let failed=false;
  let userVisible=true;
  let currentType=null;
  let pendingType=null;
  let switchToken=0;
  let lastWidth=0;
  let lastHeight=0;
  let lastFrameAt=0;
  let fps=0;
  let fpsFrames=0;
  let fpsWindowStart=performance.now();
  const cache=new Map();

  function boardIsCompatible(){
    try{return typeof RADIUS==='undefined'||RADIUS===4;}
    catch(_){return true;}
  }

  function setReadyState(ready){
    const active=!!ready&&userVisible&&!failed&&!disposed&&boardIsCompatible();
    wrap&&wrap.classList.toggle('arena-3d-ready',active);
    if(layer) layer.style.visibility=(failed||disposed||!userVisible||!boardIsCompatible())?'hidden':'visible';
  }

  function fallback(error){
    failed=true;
    pendingType=null;
    setReadyState(false);
    if(renderer&&renderer.domElement) renderer.domElement.style.display='none';
    console.warn('Arena 3D indisponível; mantendo o tabuleiro 2D.',error);
  }

  function disposeMaterial(material){
    if(!material) return;
    Object.values(material).forEach(value=>{
      if(value&&value.isTexture&&typeof value.dispose==='function') value.dispose();
    });
    if(typeof material.dispose==='function') material.dispose();
  }

  function disposeObject(root){
    if(!root) return;
    root.traverse(object=>{
      if(object.geometry&&typeof object.geometry.dispose==='function') object.geometry.dispose();
      const materials=Array.isArray(object.material)?object.material:[object.material];
      materials.forEach(disposeMaterial);
    });
  }

  async function loadArena(type){
    if(cache.has(type)) return cache.get(type);
    const config=ARENAS[type];
    if(!config) throw new Error('Tipo de arena inválido: '+type);

    const promise=Promise.all([
      new GLTFLoader().loadAsync(config.model),
      fetch(config.layout).then(response=>{
        if(!response.ok) throw new Error('Falha ao carregar layout '+response.status);
        return response.json();
      })
    ]).then(([gltf,layout])=>{
      const root=gltf.scene;
      const heights=(layout.tiles||[]).map(tile=>Number(tile.position_gltf&&tile.position_gltf[1])-.025).filter(Number.isFinite);
      const averageHeight=heights.length?heights.reduce((sum,value)=>sum+value,0)/heights.length:0;

      // A projeção inclinada mantém os centros do grid no mesmo eixo do SVG.
      // Centralizar a pequena variação cosmética de altura evita deslocar o gameplay.
      root.scale.z=-Math.SQRT2;
      root.position.y=-averageHeight;
      root.visible=false;
      root.traverse(object=>{
        if(!object.isMesh) return;
        object.castShadow=true;
        object.receiveShadow=true;
      });
      scene.add(root);
      return {root,config,averageHeight};
    });
    cache.set(type,promise);
    return promise;
  }

  function arenaBox(){
    const arenaRect=arena.getBoundingClientRect();
    const wrapRect=wrap.getBoundingClientRect();
    return {
      left:arenaRect.left-wrapRect.left-wrap.clientLeft,
      top:arenaRect.top-wrapRect.top-wrap.clientTop,
      width:arenaRect.width,
      height:arenaRect.height,
      screen:arenaRect
    };
  }

  function syncProjection(){
    if(!renderer||!camera||!arena||!layer) return false;
    const box=arenaBox();
    const width=Math.max(0,Math.round(box.width));
    const height=Math.max(0,Math.round(box.height));
    if(width<2||height<2) return false;

    layer.style.left=box.left+'px';
    layer.style.top=box.top+'px';
    layer.style.width=box.width+'px';
    layer.style.height=box.height+'px';

    if(width!==lastWidth||height!==lastHeight){
      lastWidth=width;
      lastHeight=height;
      renderer.setSize(width,height,false);
    }

    const matrix=arena.getScreenCTM();
    if(!matrix||Math.abs(matrix.a)<.0001||Math.abs(matrix.d)<.0001) return false;
    const x=(box.screen.left-matrix.e)/matrix.a;
    const y=(box.screen.top-matrix.f)/matrix.d;
    camera.left=(x-250)/30;
    camera.right=(x+box.width/matrix.a-250)/30;
    camera.top=-(y-230)/30;
    camera.bottom=-(y+box.height/matrix.d-230)/30;
    camera.updateProjectionMatrix();
    return true;
  }

  function desiredBiome(){
    try{return currentBiome==='rachadura'?'corrupted':'normal';}
    catch(_){return 'normal';}
  }

  async function setArena(type){
    type=type==='corrupted'?'corrupted':'normal';
    if(failed||disposed) return false;
    if(!initPromise) init();
    if(!renderer) await initPromise;
    if(failed||disposed) return false;
    if(type===currentType){setReadyState(true);return true;}
    if(type===pendingType) return true;

    pendingType=type;
    const token=++switchToken;
    try{
      const loaded=await loadArena(type);
      if(token!==switchToken||disposed) return false;
      setReadyState(false);
      await new Promise(resolve=>setTimeout(resolve,currentType?150:0));
      if(token!==switchToken||disposed) return false;
      cache.forEach(value=>Promise.resolve(value).then(entry=>{entry.root.visible=false;}).catch(()=>{}));
      loaded.root.visible=true;
      renderer.setClearColor(loaded.config.clear,1);
      currentType=type;
      pendingType=null;
      if(renderer.domElement) renderer.domElement.style.display='block';
      setReadyState(true);
      return true;
    }catch(error){
      fallback(error);
      return false;
    }
  }

  function frame(now){
    if(disposed) return;
    raf=requestAnimationFrame(frame);
    const compatible=boardIsCompatible();
    setReadyState(!!currentType&&compatible);
    if(!compatible||!userVisible||failed||!renderer||!scene||!camera) return;

    const wanted=desiredBiome();
    if(wanted!==currentType&&wanted!==pendingType) setArena(wanted);
    if(!currentType||!syncProjection()) return;
    renderer.render(scene,camera);
    lastFrameAt=now;
    fpsFrames++;
    if(now-fpsWindowStart>=500){
      fps=Math.round(fpsFrames*1000/(now-fpsWindowStart));
      fpsFrames=0;
      fpsWindowStart=now;
    }
  }

  async function init(){
    if(initPromise) return initPromise;
    initPromise=(async()=>{
      if(!arena||!wrap||!layer) throw new Error('Estrutura da arena não encontrada');
      const modules=await Promise.all([
        import('https://esm.sh/three@0.180.0'),
        import('https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js')
      ]);
      THREE=modules[0];
      GLTFLoader=modules[1].GLTFLoader;

      renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.05;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden','true');
      renderer.domElement.style.pointerEvents='none';
      layer.replaceChildren(renderer.domElement);

      scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xdde8ff,0x332518,2.25));
      const key=new THREE.DirectionalLight(0xffebd2,3);
      key.position.set(8,14,9);
      key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);
      scene.add(key);
      const rim=new THREE.DirectionalLight(0x9cabbc,.8);
      rim.position.set(-10,7,-7);
      scene.add(rim);

      camera=new THREE.OrthographicCamera(-10,10,10,-10,.01,400);
      camera.position.set(0,100,100);
      camera.lookAt(0,0,0);
      camera.updateMatrixWorld();

      await setArena(desiredBiome());
      if(!raf) raf=requestAnimationFrame(frame);
      const preload=()=>loadArena(currentType==='normal'?'corrupted':'normal').catch(error=>{
        console.warn('Pré-carregamento da arena alternativa falhou.',error);
      });
      if('requestIdleCallback' in window) requestIdleCallback(preload,{timeout:2500});
      else setTimeout(preload,900);
      return true;
    })().catch(error=>{fallback(error);return false;});
    return initPromise;
  }

  function setVisible(value){
    userVisible=!!value;
    setReadyState(!!currentType);
  }

  function resize(){
    lastWidth=0;
    lastHeight=0;
    return syncProjection();
  }

  function dispose(){
    disposed=true;
    switchToken++;
    if(raf) cancelAnimationFrame(raf);
    cache.forEach(value=>Promise.resolve(value).then(entry=>disposeObject(entry.root)).catch(()=>{}));
    cache.clear();
    if(renderer){renderer.dispose();if(renderer.forceContextLoss) renderer.forceContextLoss();}
    layer&&layer.replaceChildren();
    wrap&&wrap.classList.remove('arena-3d-ready');
  }

  window.FerroArena3D={
    init,
    setArena,
    resize,
    setVisible,
    dispose,
    debug(){
      return {
        arena:currentType,
        pending:pendingType,
        rendererActive:!!renderer&&!failed&&!disposed,
        visible:!!(wrap&&wrap.classList.contains('arena-3d-ready')),
        fallback2D:failed||!boardIsCompatible(),
        fallbackReason:failed?'load-or-webgl-error':(!boardIsCompatible()?'expanded-grid-has-no-matching-3d-asset':null),
        canvas:renderer?{width:renderer.domElement.width,height:renderer.domElement.height}:null,
        camera:camera?{left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom}:null,
        cached:[...cache.keys()],
        fps,
        lastFrameAt
      };
    }
  };

  init();
})();
