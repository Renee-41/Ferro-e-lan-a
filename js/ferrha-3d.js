/* Ferro & Lança — protótipo de integração 3D da Ferrha.
   Mantém o jogo/SVG como fonte de verdade e sobrepõe somente o corpo da Ferrha em WebGL.
   Se Three.js ou o GLB falharem, o marcador SVG original continua visível.
*/
(function(){
  if(window.__ferroFerrha3DLoaded) return;
  window.__ferroFerrha3DLoaded = true;

  const arena = document.getElementById('arena');
  const wrap = arena && arena.closest('.arena-wrap');
  if(!arena || !wrap) return;
  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const layer = document.createElement('div');
  layer.id = 'ferrha-3d-layer';
  Object.assign(layer.style, {
    position:'absolute', inset:'0', overflow:'hidden', pointerEvents:'none', zIndex:'9'
  });
  wrap.appendChild(layer);

  const style = document.createElement('style');
  style.textContent = `
    .ferrha-3d-unit{position:absolute;pointer-events:none;transform-origin:50% 75%;will-change:left,top,width,height,opacity;}
    .ferrha-3d-unit canvas{display:block;width:100%;height:100%;filter:drop-shadow(0 7px 5px rgba(0,0,0,.38));}
    .ferrha-3d-loading{position:absolute;right:8px;top:8px;z-index:14;padding:4px 7px;border:1px solid rgba(199,207,217,.22);border-radius:5px;background:rgba(8,10,13,.64);color:rgba(220,226,232,.66);font:9px/1.2 'JetBrains Mono',monospace;pointer-events:none;}
  `;
  document.head.appendChild(style);

  const status = document.createElement('div');
  status.className = 'ferrha-3d-loading';
  status.textContent = 'Ferrha 3D · carregando';
  wrap.appendChild(status);

  const ASSET_URL = new URL('assets/characters/ferrha/Ferrha.glb', document.baseURI).href;
  const THREE_URL = 'https://esm.sh/three@0.180.0';
  const LOADER_URL = 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
  const SKELETON_URL = 'https://esm.sh/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

  Promise.all([import(THREE_URL), import(LOADER_URL), import(SKELETON_URL)])
    .then(([THREE, loaderModule, skeletonModule]) => {
      const loader = new loaderModule.GLTFLoader();
      loader.load(
        ASSET_URL,
        gltf => startFerrha3D(THREE, skeletonModule, gltf),
        undefined,
        err => fail('GLB não carregou', err)
      );
    })
    .catch(err => fail('Three.js não carregou', err));

  function fail(message, err){
    console.warn('[Ferrha 3D]', message, err || '');
    status.textContent = 'Ferrha 3D · fallback SVG';
    setTimeout(()=>status.remove(), 2600);
    window.__ferrha3dReady = false;
  }

  function startFerrha3D(THREE, SkeletonUtils, gltf){
    const cloneSkinned = typeof SkeletonUtils.clone === 'function'
      ? SkeletonUtils.clone
      : obj => obj.clone(true);
    const clipByName = new Map((gltf.animations || []).map(c => [c.name, c]));
    const instances = new Map();
    const clock = new THREE.Clock();

    window.__ferrha3dReady = true;
    status.textContent = 'Ferrha 3D · ativa';
    setTimeout(()=>status.remove(), 1800);

    function gameUnits(){
      try{ return Array.isArray(units) ? units : []; }
      catch(_){ return []; }
    }

    function makeInstance(u){
      const host = document.createElement('div');
      host.className = 'ferrha-3d-unit';
      host.dataset.unitId = String(u.id);
      layer.appendChild(host);

      const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.setAttribute('aria-hidden','true');
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xdde8f4, 0x2b211b, 2.15));
      const key = new THREE.DirectionalLight(0xffd3a2, 3.1);
      key.position.set(3.2, 5.5, 4.5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x6f99c9, 1.35);
      rim.position.set(-4, 3.4, -3);
      scene.add(rim);

      const camera = new THREE.PerspectiveCamera(27, 1, 0.05, 30);
      camera.position.set(2.75, 2.55, 4.8);
      camera.lookAt(0, 0.76, 0);

      const holder = new THREE.Group();
      const model = cloneSkinned(gltf.scene);
      holder.add(model);
      scene.add(holder);

      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      const height = Math.max(0.001, size.y);
      holder.scale.setScalar(1.52 / height);
      holder.rotation.y = u.team === 'player' ? -0.30 : 0.30;

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 28),
        new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.22, depthWrite:false})
      );
      shadow.rotation.x = -Math.PI/2;
      shadow.position.y = 0.008;
      shadow.scale.set(1.0, 0.58, 1.0);
      scene.add(shadow);

      const mixer = new THREE.AnimationMixer(model);
      const actions = {};
      ['Idle','Walk','Attack','Hit','Death','Ability'].forEach(name => {
        const clip = clipByName.get(name);
        if(clip) actions[name] = mixer.clipAction(clip, model);
      });

      const st = {
        id:u.id, host, renderer, scene, camera, holder, mixer, actions,
        current:null, lastX:u.rx, lastY:u.ry, prevHp:u.hp, wasAlive:u.alive,
        lastAttackStart:0, barrierActive:false, lockUntil:0, deadAt:0,
        width:0, height:0, disposed:false
      };
      play(st, 'Idle', true, THREE);
      return st;
    }

    function play(st, name, loop, THREERef){
      const action = st.actions[name] || st.actions.Idle;
      if(!action || (st.current === name && loop)) return;
      const previous = st.current && st.actions[st.current];
      if(previous && previous !== action) previous.fadeOut(0.10);
      action.reset();
      action.enabled = true;
      action.clampWhenFinished = !loop;
      action.setLoop(loop ? THREERef.LoopRepeat : THREERef.LoopOnce, loop ? Infinity : 1);
      action.fadeIn(0.08).play();
      st.current = name;
    }

    function screenPoint(x,y){
      try{
        const p = arena.createSVGPoint();
        p.x=x; p.y=y;
        const m=arena.getScreenCTM();
        return m ? p.matrixTransform(m) : null;
      }catch(_){ return null; }
    }

    function visualPosition(u, now){
      let x=u.rx, y=u.ry;
      if(u.attackAnim){
        const elapsed = now-u.attackAnim.start;
        if(elapsed>=0 && elapsed<u.attackAnim.duration){
          const t = gameUnits().find(o=>o.id===u.attackAnim.targetId);
          if(t){
            const p=elapsed/u.attackAnim.duration;
            const lunge=Math.sin(p*Math.PI)*9;
            const dx=t.rx-u.rx, dy=t.ry-u.ry;
            const d=Math.hypot(dx,dy)||1;
            x+=(dx/d)*lunge; y+=(dy/d)*lunge;
          }
        }
      }
      return {x,y};
    }

    function markerRadiusPx(x,y){
      const a=screenPoint(x,y), b=screenPoint(x+14,y);
      if(!a || !b) return 14;
      return Math.max(4, Math.hypot(b.x-a.x,b.y-a.y));
    }

    function positionHost(st,u,pos){
      const sp=screenPoint(pos.x,pos.y);
      if(!sp){ st.host.style.display='none'; return; }
      const wr=wrap.getBoundingClientRect();
      const radius=markerRadiusPx(pos.x,pos.y);
      const w=Math.max(56,Math.min(156,radius*5.25));
      const h=w*1.22;
      const left=sp.x-wr.left-w/2;
      const top=sp.y-wr.top-h*0.73;
      if(left>wR(wr)+60 || top>wr.height+60 || left+w<-60 || top+h<-60){
        st.host.style.display='none';
        return;
      }
      st.host.style.display='block';
      st.host.style.left=left+'px';
      st.host.style.top=top+'px';
      st.host.style.width=w+'px';
      st.host.style.height=h+'px';
      st.host.style.opacity=u.spawnPortalUntil && performance.now()<u.spawnPortalUntil ? '.72' : '1';
      if(Math.abs(w-st.width)>1 || Math.abs(h-st.height)>1){
        st.width=w; st.height=h;
        st.renderer.setSize(Math.round(w),Math.round(h),false);
        st.camera.aspect=w/h;
        st.camera.updateProjectionMatrix();
      }
    }

    function wR(rect){ return rect.width; }

    function hideOriginalBody(u,pos){
      // Esconde só o círculo-base da Ferrha; nome, HP, mana e efeitos SVG continuam por cima.
      const circles=arena.querySelectorAll('circle[r="14"]');
      for(const c of circles){
        const cx=parseFloat(c.getAttribute('cx')), cy=parseFloat(c.getAttribute('cy'));
        if(Math.abs(cx-pos.x)<1.8 && Math.abs(cy-pos.y)<1.8){
          c.setAttribute('fill-opacity','0');
          c.setAttribute('stroke-opacity','0');
          break;
        }
      }
    }

    function updateAnimation(st,u,now,moved){
      const justDied=st.wasAlive && !u.alive;
      if(justDied){
        st.deadAt=now;
        st.lockUntil=now+1050;
        play(st,'Death',false,THREE);
      }
      if(!u.alive){ st.wasAlive=false; return; }

      const barrier=!!(u.barrierUntil && now<u.barrierUntil);
      if(barrier && !st.barrierActive){
        st.lockUntil=now+900;
        play(st,'Ability',false,THREE);
      }
      st.barrierActive=barrier;

      if(u.attackAnim && u.attackAnim.start && u.attackAnim.start!==st.lastAttackStart){
        st.lastAttackStart=u.attackAnim.start;
        st.lockUntil=now+Math.max(520,u.attackAnim.duration||0);
        play(st,'Attack',false,THREE);
      } else if(st.prevHp!=null && u.hp<st.prevHp-0.1 && now>st.lockUntil-120){
        st.lockUntil=now+430;
        play(st,'Hit',false,THREE);
      } else if(now>=st.lockUntil){
        play(st,moved?'Walk':'Idle',true,THREE);
      }
      st.prevHp=u.hp;
      st.wasAlive=true;
    }

    function dispose(st){
      if(st.disposed) return;
      st.disposed=true;
      st.mixer.stopAllAction();
      st.renderer.dispose();
      st.host.remove();
    }

    function frame(){
      const now=performance.now();
      const delta=Math.min(0.05,clock.getDelta());
      const list=gameUnits();
      const ferrhas=list.filter(u=>u && u.champId==='ferrha');
      const activeIds=new Set(ferrhas.map(u=>u.id));

      ferrhas.forEach(u=>{
        let st=instances.get(u.id);
        if(!st){ st=makeInstance(u); instances.set(u.id,st); }
        const pos=visualPosition(u,now);
        const moved=Math.hypot(pos.x-st.lastX,pos.y-st.lastY)>0.11;
        updateAnimation(st,u,now,moved);
        st.lastX=pos.x; st.lastY=pos.y;

        if(!u.alive && st.deadAt && now-st.deadAt>1120){
          st.host.style.display='none';
        }else{
          positionHost(st,u,pos);
          hideOriginalBody(u,pos);
          st.mixer.update(delta);
          st.renderer.render(st.scene,st.camera);
        }
      });

      for(const [id,st] of instances){
        if(!activeIds.has(id)){
          dispose(st);
          instances.delete(id);
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
