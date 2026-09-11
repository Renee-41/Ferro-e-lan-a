/* Ferrha v2: world-facing visual adapter. Combat is the only source of decisions.
   One WebGL context, shared GLB geometry/textures, bounded animation work per unit. */
(function(){
  if(window.Ferrha3D)return;
  const arena=document.getElementById('arena'),wrap=arena&&arena.closest('.arena-wrap');
  if(!wrap)return;
  const events=new Map();let serial=0,draw=null,failed=false;
  function record(u){let e=events.get(u.id);if(!e){e={unit:u};events.set(u.id,e);}if(e.unit!==u){e={unit:u};events.set(u.id,e);}return e;}
  const api=window.Ferrha3D={
    targetSelected(u,t){if(u.champId==='ferrha')record(u).targetId=t&&t.id;},
    attack(u,t,a){if(u.champId==='ferrha'){const e=record(u);e.targetId=t.id;e.attack={token:++serial,targetId:a.targetId,get start(){return a.start;}};}},
    damage(source,target,damage,at){if(target.champId==='ferrha'&&damage>0)record(target).hit={token:++serial,source:{rx:source.rx,ry:source.ry},damage,at};},
    frame(list,dt,now){
      if(failed)return;
      try{if(draw)draw(list,Math.max(0,dt/1000),now);}
      catch(error){fail(error);}
      const liveIds=new Set(list.map(u=>u.id));for(const id of events.keys())if(!liveIds.has(id))events.delete(id);
    },
    ready:false,debug:()=>[]
  };
  if(getComputedStyle(wrap).position==='static')wrap.style.position='relative';
  const layer=document.createElement('div');layer.id='ferrha-3d-layer';
  Object.assign(layer.style,{position:'absolute',inset:'0',overflow:'hidden',pointerEvents:'none',zIndex:'9'});wrap.appendChild(layer);
  const labels=document.createElementNS('http://www.w3.org/2000/svg','svg');labels.id='ferrha-3d-labels';
  Object.assign(labels.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'10'});wrap.appendChild(labels);
  const status=document.createElement('div');status.id='ferrha-3d-status';status.textContent='Ferrha 3D · carregando';
  Object.assign(status.style,{position:'absolute',right:'8px',top:'8px',color:'#ccd4db',font:'10px monospace',pointerEvents:'none',zIndex:'11'});wrap.appendChild(status);
  function fail(error){
    failed=true;api.ready=window.__ferrha3dReady=false;
    layer.style.display='none';labels.replaceChildren();status.textContent='Ferrha · SVG';
    console.warn('[Ferrha 3D] Fallback SVG:',error);setTimeout(()=>status.remove(),2500);
    if(api.dispose)api.dispose();
  }
  function loadController(){return new Promise((resolve,reject)=>{
    if(window.FerrhaVisualState)return resolve();
    const s=document.createElement('script');s.src=new URL('js/ferrha-visual-state.js?v=3',document.baseURI);s.onload=()=>{const p=document.createElement('script');p.src='js/ferrha-pose-player.js';p.onload=resolve;p.onerror=reject;document.head.appendChild(p);};s.onerror=reject;document.head.appendChild(s);
  });}
  Promise.all([import('https://esm.sh/three@0.180.0'),
    import('https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'),
    import('https://esm.sh/three@0.180.0/examples/jsm/utils/SkeletonUtils.js'),loadController()])
    .then(async([THREE,{GLTFLoader},SkeletonUtils])=>{
      const gltf=await new GLTFLoader().loadAsync(new URL('assets/characters/ferrha/Ferrha_v2.glb',document.baseURI).href);
      start(THREE,SkeletonUtils,gltf);
    }).catch(fail);

  function start(THREE,SkeletonUtils,gltf){
    const names={idle:'Idle',move:'Walk',attack_a:'Attack_A',attack_b:'Attack_B',attack_c:'Attack_C',hit:'Hit',barrier:'Barrier',death:'Death'};
    const clips=new Map(gltf.animations.map(c=>[c.name,c]));
    for(const name of Object.values(names))if(!clips.has(name))throw Error('Clip ausente: '+name);
    const duration=Object.fromEntries(Object.entries(names).map(([k,v])=>[k,clips.get(v).duration]));
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.autoClear=false;renderer.domElement.setAttribute('aria-hidden','true');layer.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('context lost');});
    const instances=new Map();let dimensions={w:0,h:0};
    function instance(u){
      const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xe6efff,0x30291e,2.2));
      const key=new THREE.DirectionalLight(0xffd8af,3);key.position.set(-3,5,4);scene.add(key);
      const rim=new THREE.DirectionalLight(0x8aaed8,1.6);rim.position.set(3,3,-4);scene.add(rim);
      // A fixed observer on +Z. Heading is NOT derived from this camera.
      const camera=new THREE.OrthographicCamera(-1.9,1.9,2.128,-2.128,.01,25);
      camera.position.set(0,3.6,5);camera.lookAt(0,.68,0);camera.updateMatrixWorld();
      const holder=new THREE.Group(),impact=new THREE.Group(),model=SkeletonUtils.clone(gltf.scene);
      scene.add(holder);holder.add(impact);impact.add(model);
      // Keep the authored foot pivot; weapon/shard bounds must never recenter the body.
      const player=new FerrhaPosePlayer(THREE,model).load(gltf.animations);
      const {mixer,actions}=player;
      const ctrl=new FerrhaVisualState.Controller(u,{duration,stridePixels:.4*20});
      const foot=new THREE.Vector3(0,0,0).project(camera);
      return {u,scene,camera,holder,impact,model,mixer,actions,player,ctrl,footY:(1-foot.y)/2,token:-1,hitToken:0,lock:null,hitFading:false};
    }
    function animate(st,v,dt){
      st.player.update(v,dt);
      st.impact.rotation.z+=(v.hitSide*v.hitWeight*.045-st.impact.rotation.z)*(1-Math.exp(-dt*22));
      st.holder.rotation.y=v.yaw;
    }
    function dispose(st){st.mixer.stopAllAction();st.mixer.uncacheRoot(st.model);}
    api.dispose=()=>{for(const st of instances.values())dispose(st);instances.clear();renderer.dispose();};
    api.debug=()=>Array.from(instances,([id,st])=>({id,...st.ctrl.snapshot(),clips:Object.keys(st.actions),mixerTime:st.mixer.time,weights:st.player.weights,webglContexts:1}));
    draw=(list,dt,now)=>{
      const wr=wrap.getBoundingClientRect(),matrix=arena.getScreenCTM();
      labels.replaceChildren();if(!matrix||wr.width<1||wr.height<1)return;
      if(dimensions.w!==wr.width||dimensions.h!==wr.height){renderer.setSize(wr.width,wr.height,false);dimensions={w:wr.width,h:wr.height};}
      labels.setAttribute('viewBox',`0 0 ${wr.width} ${wr.height}`);
      renderer.setScissorTest(false);renderer.setViewport(0,0,wr.width,wr.height);renderer.clear();renderer.setScissorTest(true);
      const wanted=new Set(),lookup=new Map(list.map(u=>[u.id,u]));
      const units=list.filter(u=>u.champId==='ferrha').sort((a,b)=>a.ry-b.ry);
      const scale=Math.hypot(matrix.a,matrix.b);
      for(const u of units){
        wanted.add(u.id);let st=instances.get(u.id);
        if(st&&st.u!==u){dispose(st);instances.delete(u.id);st=null;}
        if(!st){st=instance(u);instances.set(u.id,st);}
        const e=events.get(u.id)||{},a=e.attack||u.attackAnim;
        const target=lookup.get(a&&now-a.start<1200?a.targetId:e.targetId);
        // Only rx/ry are locomotion; the SVG attack lunge is intentionally excluded.
        const v=st.ctrl.update({unit:u,target,attack:a,hit:e.hit,dt,now});animate(st,v,dt);

        const w=76*scale,h=w*1.12;
        const x=matrix.a*u.rx+matrix.c*u.ry+matrix.e-wr.left-w/2;
        const footY=matrix.b*u.rx+matrix.d*u.ry+matrix.f-wr.top;
        const y=footY-h*st.footY;
        if(x+w<0||y+h<0||x>wr.width||y>wr.height)continue;
        const left=Math.max(0,x),bottom=Math.max(0,wr.height-y-h),right=Math.min(wr.width,x+w),top=Math.min(wr.height,wr.height-y);
        renderer.setViewport(x,wr.height-y-h,w,h);renderer.setScissor(left,bottom,right-left,top-bottom);
        renderer.clearDepth();renderer.render(st.scene,st.camera);
        const g=arena.querySelector(`[data-unit-id="${u.id}"]`);
        if(g){
          const clone=g.cloneNode(true);clone.querySelector('[data-unit-body]')?.remove();
          const name=clone.querySelector('.hex-label');if(name)name.setAttribute('y',Number(name.getAttribute('y'))-12);
          const group=document.createElementNS(labels.namespaceURI,'g');
          group.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e-wr.left} ${matrix.f-wr.top})`);
          group.appendChild(clone);labels.appendChild(group);
          for(const child of g.children)child.setAttribute('opacity','0');
        }
      }
      renderer.setScissorTest(false);
      for(const [id,st] of instances)if(!wanted.has(id)){dispose(st);instances.delete(id);}
    };
    api.ready=window.__ferrha3dReady=true;status.textContent='Ferrha 3D · v2';setTimeout(()=>status.remove(),1500);
  }
})();
