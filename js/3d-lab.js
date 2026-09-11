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
  const scene=new T.Scene();scene.background=new T.Color(0x10161c);scene.fog=new T.FogExp2(0x10161c,.018);
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04);
  scene.environment=env.texture;scene.environmentIntensity=1.5;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xdde8ef,0x322c22,2.25));
  const key=new T.DirectionalLight(0xffebd2,3);key.position.set(-8,14,9);scene.add(key);
  const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.05,150);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  controls.minDistance=3;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.48;
  const view=tactical=>{controls.target.set(0,0,0);camera.position.set(tactical?0:10,tactical?17:11,tactical?12:14);controls.update();};
  document.getElementById('reset').onclick=()=>view(true);document.getElementById('top').onclick=()=>view(true);
  document.getElementById('perspective').onclick=()=>view(false);view(true);
  const loader=new GLTFLoader();
  const [arena,ferrha,layout]=await Promise.all([
    loader.loadAsync('assets/arenas/hexagonal/Arena_Hexagonal.glb'),
    loader.loadAsync('assets/characters/ferrha/Ferrha_v2.glb'),
    fetch('assets/arenas/hexagonal/layout.json').then(r=>r.json())]);
  arena.scene.scale.z=-1;scene.add(arena.scene);
  const model=ferrha.scene,holder=new T.Group();holder.add(model);model.scale.setScalar(.9);scene.add(holder);
  const player=new FerrhaPosePlayer(T,model).load(ferrha.animations);
  const unit={id:1,rx:0,ry:0,q:0,r:0,hp:100,maxhp:100,alive:true,team:'player',speed:1};
  let ctrl=new FerrhaVisualState.Controller(unit,{stridePixels:.4*.9*20,duration:player.duration});
  let now=0,hit=null,hitToken=0,walkingDemo=false;
  const nearest=(x,z)=>layout.tiles.reduce((best,t)=>Math.hypot(x-t.position_gltf[0],z+t.position_gltf[2])<best.d?{t,d:Math.hypot(x-t.position_gltf[0],z+t.position_gltf[2])}:best,{d:Infinity}).t;
  const heightAt=(x,z)=>nearest(x,z).position_gltf[1]-.025;
  holder.position.y=heightAt(0,0);
  const keys=new Set();
  addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);walkingDemo=false;}});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
  const select=name=>{
    if(name==='Idle'||name==='Walk'){
      unit.alive=true;unit.barrierUntil=0;ctrl=new FerrhaVisualState.Controller(unit,{stridePixels:.4*.9*20,duration:player.duration});
      player.sequence=-1;walkingDemo=name==='Walk';return;
    }
    walkingDemo=false;if(!unit.alive)return;
    if(name==='Death')unit.alive=false;
    else if(name==='Barrier')unit.barrierUntil=now+1200;
    else if(name==='Hit')hit={token:++hitToken,at:now,damage:10,source:{rx:unit.rx-20,ry:unit.ry}};
    else {ctrl.enter(name.toLowerCase(),player.duration[name.toLowerCase()]);ctrl.actionDuration=ctrl.remaining;}
  };
  for(const name of ['Idle','Walk','Attack_A','Attack_B','Attack_C','Hit','Barrier','Death']){
    const button=document.createElement('button');button.textContent=name;button.onclick=()=>select(name);document.getElementById('clips').appendChild(button);
  }
  let last=performance.now(),frames=0,meter=last,fps=0;
  renderer.setAnimationLoop(t=>{
    const dt=Math.min(.1,(t-last)/1000);last=t;now+=dt*1000;
    let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    let dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    if(walkingDemo){dx=Math.cos(now/2000);dz=Math.sin(now/2000);}
    const len=Math.hypot(dx,dz);
    if(len&&unit.alive&&ctrl.remaining===0){
      const x=holder.position.x+dx/len*dt*.9,z=holder.position.z+dz/len*dt*.9,tile=nearest(x,z);
      if(Math.hypot(x-tile.position_gltf[0],z+tile.position_gltf[2])<.95){holder.position.x=x;holder.position.z=z;}
    }
    unit.rx=holder.position.x*20;unit.ry=holder.position.z*20;
    holder.position.y+=(heightAt(holder.position.x,holder.position.z)-holder.position.y)*(1-Math.exp(-dt*20));
    const v=ctrl.update({unit,hit,dt,now});holder.rotation.y=v.yaw;player.update(v,dt);
    controls.update();renderer.render(scene,camera);
    if(++frames&&t-meter>500){fps=Math.round(frames*1000/(t-meter));frames=0;meter=t;}
    status.textContent=`${v.state} · ${fps} FPS · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} tris · WASD / setas`;
  });
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.FerroLab={ready:true,select,debug:()=>({...ctrl.snapshot(),position:holder.position.toArray(),mixerTime:player.mixer.time,clips:ferrha.animations.map(c=>c.name),calls:renderer.info.render.calls})};
} catch(e){console.error(e);error.style.display='grid';error.textContent='Não foi possível abrir o laboratório: '+e.message;}
