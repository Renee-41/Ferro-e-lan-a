import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const status=document.getElementById('status'),error=document.getElementById('error');
try {
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  document.getElementById('app').appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0x100b1b);scene.fog=new T.FogExp2(0x100b1b,.023);
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04);
  room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xe4daf2,0x302132,2.15));
  const key=new T.DirectionalLight(0xeae2ff,3.1);key.position.set(-8,14,9);scene.add(key);
  const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.05,150);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  controls.minDistance=3;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.48;
  const view=tactical=>{controls.target.set(0,0,0);camera.position.set(tactical?0:12,tactical?19:12,tactical?14:16);controls.update();};
  document.getElementById('reset').onclick=()=>view(true);document.getElementById('top').onclick=()=>view(true);
  document.getElementById('perspective').onclick=()=>view(false);view(true);
  const loader=new GLTFLoader();
  const [arena,ferrha,layout]=await Promise.all([
    loader.loadAsync('assets/arenas/corrupted/Arena_Hexagonal.glb'),
    loader.loadAsync('assets/characters/ferrha/Ferrha_v2.glb'),
    fetch('assets/arenas/corrupted/layout.json').then(r=>r.json())]);
  arena.scene.scale.z=-1;scene.add(arena.scene);
  const model=ferrha.scene,holder=new T.Group(),impact=new T.Group();holder.add(impact);impact.add(model);scene.add(holder);
  model.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.envMap=env.texture;m.envMapIntensity=1.4;});});
  const player=new FerrhaPosePlayer(T,model).load(ferrha.animations);
  const unit={id:1,rx:0,ry:0,q:0,r:0,hp:100,maxhp:100,alive:true,team:'player',speed:1};
  let ctrl=new FerrhaVisualState.Controller(unit,{stridePixels:.4*20*model.scale.x,duration:player.duration});
  let now=0,hit=null,hitToken=0,walkingDemo=false,speed=1,pending=null;
  const nearest=(x,z)=>layout.tiles.reduce((best,t)=>Math.hypot(x-t.position_gltf[0],z+t.position_gltf[2])<best.d?{t,d:Math.hypot(x-t.position_gltf[0],z+t.position_gltf[2])}:best,{d:Infinity}).t;
  const heightAt=(x,z)=>nearest(x,z).position_gltf[1]-.025;
  holder.position.y=heightAt(0,0);
  const keys=new Set();
  addEventListener('keydown',e=>{if(e.target.matches?.('input,textarea,select')||e.target.isContentEditable)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);walkingDemo=false;}});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
  const applySelection=name=>{
    if(name==='Idle'||name==='Walk'){
      if(!unit.alive){
        const yaw=ctrl.yaw;unit.alive=true;
        ctrl=new FerrhaVisualState.Controller(unit,{stridePixels:.4*20*model.scale.x,duration:player.duration});
        ctrl.yaw=ctrl.desiredYaw=yaw;player.sequence=-1;hit=null;
      }
      unit.barrierUntil=0;ctrl.enter('idle');walkingDemo=name==='Walk';return;
    }
    if(!unit.alive)return;
    if(name==='Death')unit.alive=false;
    else if(name==='Barrier')unit.barrierUntil=now+1200;
    else if(name==='Hit')hit={token:++hitToken,at:now,damage:10,source:{rx:unit.rx-20,ry:unit.ry}};
    else {ctrl.enter(name.toLowerCase(),player.duration[name.toLowerCase()]);ctrl.actionDuration=ctrl.remaining;}
  };
  // Commands queued while paused are applied only when the lab clock resumes.
  const select=name=>{if(speed===0)pending=name;else applySelection(name);};
  const setSpeed=value=>{
    if(![0,.5,1,2].includes(Number(value)))return;speed=Number(value);document.querySelectorAll('#speeds button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.speed)===speed));
  };
  for(const value of [0,.5,1,2]){
    const b=document.createElement('button');b.textContent=value.toFixed(1)+'x';b.dataset.speed=value;
    b.setAttribute('aria-pressed',value===speed);b.onclick=()=>setSpeed(value);document.getElementById('speeds').appendChild(b);
  }
  document.getElementById('scale').oninput=e=>{
    const scale=Number(e.target.value);model.scale.setScalar(scale);ctrl.stridePixels=.4*20*scale;
    document.getElementById('scale-value').value=scale.toFixed(2)+'x';
  };
  for(const name of ['Idle','Walk','Attack_A','Attack_B','Attack_C','Hit','Barrier','Death']){
    const button=document.createElement('button');button.textContent=name;button.onclick=()=>select(name);document.getElementById('clips').appendChild(button);
  }
  let last=performance.now(),frames=0,meter=last,fps=0;
  renderer.setAnimationLoop(t=>{
    const realDt=Math.min(.1,(t-last)/1000);last=t;const dt=realDt*speed;now+=dt*1000;
    if(dt>0&&pending){const name=pending;pending=null;applySelection(name);}
    let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    let dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    if(walkingDemo&&!keys.size){dx=Math.cos(now/2000);dz=Math.sin(now/2000);}
    const len=Math.hypot(dx,dz);
    if(len&&unit.alive&&ctrl.remaining===0){
      const x=holder.position.x+dx/len*dt*.9,z=holder.position.z+dz/len*dt*.9,tile=nearest(x,z);
      if(Math.hypot(x-tile.position_gltf[0],z+tile.position_gltf[2])<1.02){holder.position.x=x;holder.position.z=z;}
    }
    unit.rx=holder.position.x*20;unit.ry=holder.position.z*20;
    holder.position.y+=(heightAt(holder.position.x,holder.position.z)-holder.position.y)*(1-Math.exp(-dt*20));
    const v=ctrl.update({unit,hit,dt,now});holder.rotation.y=v.yaw;impact.rotation.z+=(-v.turnLean+v.hitSide*v.hitWeight*.045-impact.rotation.z)*(1-Math.exp(-dt*18));player.update(v,dt);
    controls.update();renderer.render(scene,camera);
    if(++frames&&t-meter>500){fps=Math.round(frames*1000/(t-meter));frames=0;meter=t;}
    status.textContent=`${speed.toFixed(1)}x | ${v.state} · ${fps} FPS · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} tris · WASD / setas${pending?" | pendente: "+pending:""}`;
  });
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.FerroLab={ready:true,select,setSpeed,debug:()=>({...ctrl.snapshot(),position:holder.position.toArray(),scale:model.scale.x,speed,now,camera:camera.position.toArray(),triangles:renderer.info.render.triangles,weights:{...player.weights},clipTimes:Object.fromEntries(Object.entries(player.actions).map(([k,a])=>[k,a.time])),mixerTime:player.mixer.time,clips:ferrha.animations.map(c=>c.name),calls:renderer.info.render.calls})};
} catch(e){console.error(e);error.style.display='grid';error.textContent='Não foi possível abrir o laboratório: '+e.message;}
