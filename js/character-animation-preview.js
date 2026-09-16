import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CharacterAnimationPlayer} from './character-animation-player.js';
const name=document.body.dataset.character,base=`assets/characters/${name.toLowerCase()}/`;
try{
  const manifest=await (await fetch(base+'animation_manifest.json')).json();const gltf=await new GLTFLoader().loadAsync(base+manifest.model);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.getElementById('app').appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0x111923);const envScene=new RoomEnvironment(),pm=new T.PMREMGenerator(renderer),env=pm.fromScene(envScene,.04);scene.environment=env.texture;envScene.dispose();pm.dispose();
  scene.add(new T.HemisphereLight(0xe2edf7,0x30343e,2.1));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,6,5);scene.add(light);
  const stage=new T.Mesh(new T.CylinderGeometry(2.4,2.4,.12,6),new T.MeshStandardMaterial({color:0x293e4b,roughness:.9}));stage.position.y=-.06;scene.add(stage);
  const player=new CharacterAnimationPlayer(gltf,manifest);scene.add(player.root);
  const camera=new T.PerspectiveCamera(35,innerWidth/innerHeight,.03,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=15;controls.maxPolarAngle=Math.PI*.49;
  function view(top=false){camera.position.set(top?0:3,top?5:2.6,top?3.8:4.6);controls.target.set(0,.70,0);controls.update();}view();
  document.getElementById('reset').onclick=()=>view();document.getElementById('tactical').onclick=()=>view(true);
  let speed=1,auto=false,direction=new T.Vector3(0,0,1),position=new T.Vector3(),target=null,queued=null;
  const marker=new T.Mesh(new T.CylinderGeometry(.055,.12,.35,8),new T.MeshStandardMaterial({color:0xbd9972}));marker.position.set(1.25,.175,1.25);marker.visible=false;scene.add(marker);
  function select(clip){if(speed===0){queued=clip;return;}auto=clip==='Walk';target=null;marker.visible=false;player.play(clip);}
  const add=(id,label,fn)=>{const button=document.createElement('button');button.textContent=label;button.onclick=fn;document.getElementById(id).appendChild(button);return button;};
  for(const clip of Object.keys(manifest.clips))add('clips',clip,()=>select(clip));
  function setSpeed(value){speed=value;document.querySelectorAll('#speeds button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.speed)===value));}
  for(const value of [0,.5,1,2]){const b=add('speeds',value+'x',()=>setSpeed(value));b.dataset.speed=value;}setSpeed(1);
  const dirs={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};
  for(const [label,[x,z]] of Object.entries(dirs))add('directions',label,()=>{direction.set(x,0,z).normalize();select('Walk');});
  let targetIndex=0;document.getElementById('target').onclick=()=>{auto=false;targetIndex++;target=new T.Vector3((targetIndex%2?1:-1)*1.2,0,(targetIndex%4<2?1:-1)*1.2);marker.position.set(target.x,.175,target.z);marker.visible=true;};
  const keys=new Set();addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;keys.add(e.key.toLowerCase());if(e.key.startsWith('Arrow'))e.preventDefault();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
  let last=performance.now();function frame(now){requestAnimationFrame(frame);const real=Math.min((now-last)/1000,.1);last=now;const dt=real*speed;
    if(dt>0&&queued){const q=queued;queued=null;select(q);}
    const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if(x||z){direction.set(x,0,z).normalize();auto=false;target=null;marker.visible=false;}
    if(dt>0&&!player.locked&&(auto||x||z)){
      const candidate=position.clone().addScaledVector(direction,manifest.walk_speed_m_s*dt);
      if(Math.hypot(candidate.x,candidate.z)<1.6)position.copy(candidate);else if(auto)direction.negate();
    }
    player.update({dt,position,target});controls.update();renderer.render(scene,camera);
    const state=player.debug();document.getElementById('status').textContent=`${name} · ${state.state} · ${speed}x · ${renderer.info.render.triangles.toLocaleString('pt-BR')} tris${queued?' · ação aguardando retomada':''}`;
  }requestAnimationFrame(frame);
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.CharacterLab={ready:true,select,setSpeed,debug:()=>({...player.debug(),speed,camera:camera.position.toArray(),triangles:renderer.info.render.triangles}),testStep:data=>player.update(data),resetPosition:()=>{position.set(0,0,0);player.position.copy(position);player.root.position.copy(position);},manifest};
}catch(e){const error=document.getElementById('error');error.style.display='grid';error.textContent='Falha ao carregar animações: '+e.message;console.error(e);}
