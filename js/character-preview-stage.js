// Shared with the Ferrha preview: one lighting/camera setup, independent of gameplay.
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export function createCharacterPreviewStage(host,{inspection=false}={}){
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=inspection;renderer.shadowMap.type=T.PCFSoftShadowMap;host.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(inspection?0x24272b:0x111923);
  const room=new RoomEnvironment(),pm=new T.PMREMGenerator(renderer),env=pm.fromScene(room,.04);
  scene.environment=env.texture;room.dispose();pm.dispose();
  scene.add(new T.HemisphereLight(0xe2edf7,0x30343e,2.1));
  const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,6,5);scene.add(light);
  light.castShadow=inspection;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-4;light.shadow.camera.right=4;
  light.shadow.camera.top=4;light.shadow.camera.bottom=-4;light.shadow.camera.near=.1;light.shadow.camera.far=20;
  light.shadow.normalBias=.012;light.shadow.bias=-.0001;
  const stage=new T.Mesh(inspection?new T.PlaneGeometry(200,200):new T.CylinderGeometry(2.4,2.4,.12,6),new T.MeshStandardMaterial({color:inspection?0x45474a:0x293e4b,roughness:.9}));
  if(inspection){stage.rotation.x=-Math.PI/2;stage.position.y=-.004;stage.receiveShadow=true;}else stage.position.y=-.06;
  scene.add(stage);
  const camera=new T.PerspectiveCamera(35,innerWidth/innerHeight,.03,100);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  controls.minDistance=inspection?.6:2;controls.maxDistance=inspection?25:15;controls.maxPolarAngle=Math.PI*.49;
  function view(top=false){camera.position.set(top?0:3,top?5:2.6,top?3.8:4.6);controls.target.set(0,.70,0);controls.update();}
  function fit(bounds){
    const center=bounds.getCenter(new T.Vector3()),radius=Math.max(bounds.getSize(new T.Vector3()).length()/2,.4);
    const vf=T.MathUtils.degToRad(camera.fov),hf=2*Math.atan(Math.tan(vf/2)*camera.aspect);
    const distance=radius/Math.sin(Math.min(vf,hf)/2)*1.18;
    controls.target.copy(center);camera.position.copy(center).addScaledVector(new T.Vector3(3,1.9,4.6).normalize(),distance);
    camera.far=Math.max(100,distance*4);camera.updateProjectionMatrix();controls.update();
  }
  view();
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  addEventListener('resize',resize);
  return {renderer,scene,camera,controls,view,fit,dispose(){removeEventListener('resize',resize);controls.dispose();env.dispose();stage.geometry.dispose();stage.material.dispose();renderer.dispose();renderer.domElement.remove();}};
}
