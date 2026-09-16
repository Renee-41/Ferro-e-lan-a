import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCharacterPreviewStage} from '../../js/character-preview-stage.js';

// GLBs are copied byte-for-byte from the requested commits. No manifest-defined clips.
export const CHARACTERS={
  kael:{label:'Kael',commit:'69915b38f8e9c55cbbe312eb6876cec2378fd6af',path:'kael/Kael.glb'},
  glacia:{label:'Glacia',commit:'e83242df4a271aa27613f924db972d3401c8710a',path:'glacia/Glacia.glb'},
  voss:{label:'Voss',commit:'3744a55eea367af5ac35501ba970c28d85724a2c',path:'voss/Voss.glb'},
  ferrha:{label:'Ferrha V3',commit:'e12320689a37bf1ab5af641adeab107fdb88ca94',path:'ferrha/v3/Ferrha.glb'}
};
const ui=Object.fromEntries(['character','clip','play','restart','speed','loop','reset','status','error'].map(id=>[id,document.getElementById(id)]));
const stage=createCharacterPreviewStage(document.getElementById('app'),{inspection:true});
const {scene,renderer,camera,controls}=stage,loader=new GLTFLoader();
let current=null,generation=0,playing=true,speed=1,last=performance.now(),raf,disposedModels=0;

function disposeModel(gltf,mixer){
  mixer?.stopAllAction();mixer?.uncacheRoot(gltf.scene);scene.remove(gltf.scene);
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set(),images=new Set();
  gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});
  for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}
  for(const t of textures){if(t.source?.data?.close)images.add(t.source.data);t.dispose();}
  for(const im of images)im.close();for(const g of geometries)g.dispose();for(const s of skeletons)s.dispose();disposedModels++;
}
function enable(ready){for(const id of ['clip','play','restart','reset'])ui[id].disabled=!ready;}
function status(){
  if(!current)return;
  const {key,action}=current,clip=action?.getClip();
  ui.status.textContent=`${CHARACTERS[key].label} · ${clip?.name??'Sem animações'} · duração ${clip?clip.duration.toFixed(2):'0'} s · ${speed}x · ${playing?'Reproduzindo':'Pausado'}`;
  ui.play.textContent=playing?'Pausar':'Play';ui.play.setAttribute('aria-pressed',String(!playing));
}
function selectClip(index){
  if(!current)return;const clip=current.gltf.animations[index];if(!clip)return;
  // Watch the exact exported clip, including Hit. No additive conversion or gameplay state machine.
  current.mixer.stopAllAction();current.action=current.mixer.clipAction(clip);
  current.action.reset().setLoop(ui.loop.checked?T.LoopRepeat:T.LoopOnce,ui.loop.checked?Infinity:1);
  current.action.clampWhenFinished=true;current.action.play();current.mixer.update(0);
  current.gltf.scene.updateMatrixWorld(true);ui.clip.value=String(index);status();
}
async function loadCharacter(key){
  const request=++generation;enable(false);ui.error.hidden=true;ui.clip.replaceChildren();
  ui.status.textContent=`Carregando ${CHARACTERS[key].label}…`;
  if(current){disposeModel(current.gltf,current.mixer);current=null;}
  try{
    const gltf=await loader.loadAsync(new URL('../../assets/characters/'+CHARACTERS[key].path,import.meta.url).href);
    if(request!==generation){disposeModel(gltf);return;}
    gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;}});
    const mixer=new T.AnimationMixer(gltf.scene);current={key,gltf,mixer,action:null,bounds:null};scene.add(gltf.scene);
    // Options reference indices: even duplicate exported names are preserved faithfully.
    gltf.animations.forEach((clip,i)=>ui.clip.add(new Option(clip.name,String(i))));
    playing=true;last=performance.now();
    selectClip(Math.max(0,gltf.animations.findIndex(c=>c.name==='Idle')));
    current.bounds=new T.Box3().setFromObject(gltf.scene,true);stage.fit(current.bounds);
    mixer.addEventListener('finished',()=>{if(current?.mixer===mixer&&!ui.loop.checked){playing=false;status();}});
    enable(true);if(!gltf.animations.length){ui.clip.disabled=true;ui.play.disabled=true;ui.restart.disabled=true;}
    status();
  }catch(e){
    if(request!==generation)return;
    if(current){disposeModel(current.gltf,current.mixer);current=null;}
    ui.error.textContent=`Não foi possível carregar ${CHARACTERS[key].label}: ${e.message}. Selecione o personagem para tentar novamente.`;ui.error.hidden=false;ui.status.textContent='Falha no carregamento';
    console.error(e);
  }
}
ui.character.onchange=()=>loadCharacter(ui.character.value);
ui.clip.onchange=()=>selectClip(Number(ui.clip.value));
ui.play.onclick=()=>{if(!current?.action)return;if(!playing&&current.action.paused)selectClip(Number(ui.clip.value));playing=!playing;last=performance.now();status();};
ui.restart.onclick=()=>selectClip(Number(ui.clip.value));
ui.speed.onchange=()=>{speed=Number(ui.speed.value);status();};
ui.loop.onchange=()=>selectClip(Number(ui.clip.value));
ui.reset.onclick=()=>{if(current)stage.fit(current.bounds);};
function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;if(playing&&current)current.mixer.update(dt*speed);controls.update();renderer.render(scene,camera);}
raf=requestAnimationFrame(frame);loadCharacter(ui.character.value);
// Read-only inspection for browser validation; all interaction tests use the actual controls.
window.CharacterPreview={snapshot(){
  const model=current?.gltf.scene,bones=[];model?.updateMatrixWorld(true);model?.traverse(o=>{if(o.isBone)bones.push(...o.matrixWorld.elements);});
  return {ready:!!current&&!ui.clip.disabled,character:current?.key,clips:current?.gltf.animations.map(c=>({name:c.name,duration:c.duration})),clip:current?.action?.getClip().name,clipTime:current?.action?.time,mixerTime:current?.mixer.time,playing,speed,camera:camera.position.toArray(),target:controls.target.toArray(),scale:model?.scale.toArray(),bones,disposedModels,loadedModels:scene.children.filter(o=>o===model).length,memory:{...renderer.info.memory}};
}};
addEventListener('pagehide',()=>{generation++;cancelAnimationFrame(raf);if(current)disposeModel(current.gltf,current.mixer);stage.dispose();},{once:true});
