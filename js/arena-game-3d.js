/* Ground projection follows the existing SVG viewBox. No grid or combat decisions. */
(()=>{
  const svg=document.getElementById('arena'),wrap=svg.closest('.arena-wrap');
  const layer=document.createElement('div');layer.id='arena-3d-layer';
  Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});
  wrap.prepend(layer);svg.style.position='relative';
  const heights=new Map();let draw=null;
  const api=window.Arena3D={ready:false,height(q,r){return heights.get(`${q},${r}`)??.27;},
    lift(u){return this.height(u.q,u.r)*30/Math.sqrt(2);},
    frame(list){if(draw)draw(list);}
  };
  Promise.all([import('https://esm.sh/three@0.180.0'),import('https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'),
    fetch('assets/arenas/hexagonal/layout.json').then(r=>r.json())]).then(async([T,{GLTFLoader},layout])=>{
    for(const t of layout.tiles)heights.set(`${t.q},${t.r}`,t.position_gltf[1]-.025);
    const gltf=await new GLTFLoader().loadAsync('assets/arenas/hexagonal/Arena_Hexagonal.glb');
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    layer.appendChild(renderer.domElement);
    const scene=new T.Scene();scene.add(new T.HemisphereLight(0xdde8ef,0x322c22,2.25));
    const key=new T.DirectionalLight(0xffebd2,3);key.position.set(-8,14,9);scene.add(key);
    // Compensate the inclined projection on the ground plane to retain exact SVG grid centers.
    gltf.scene.scale.z=-Math.sqrt(2);scene.add(gltf.scene);
    const camera=new T.OrthographicCamera(-10,10,10,-10,.01,400);
    camera.position.set(0,100,100);camera.lookAt(0,0,0);camera.updateMatrixWorld();
    let width=0,height=0;
    draw=list=>{
      const rect=wrap.getBoundingClientRect(),m=svg.getScreenCTM();if(!m||rect.width<1||rect.height<1)return;
      if(width!==rect.width||height!==rect.height){width=rect.width;height=rect.height;renderer.setSize(width,height,false);}
      // Use the live CTM, including zoom, pan, aspect letterboxing and camera shake.
      const x=(rect.left-m.e)/m.a,y=(rect.top-m.f)/m.d;
      camera.left=(x-250)/30;camera.right=(x+width/m.a-250)/30;
      camera.top=-(y-230)/30;camera.bottom=-(y+height/m.d-230)/30;camera.updateProjectionMatrix();
      renderer.render(scene,camera);
      svg.querySelectorAll('[data-terrain-base]').forEach(n=>n.setAttribute('fill','transparent'));
      for(const u of list){const g=svg.querySelector(`[data-unit-id="${u.id}"]`);if(g)g.setAttribute('transform',`translate(0 ${-api.lift(u)})`);}
    };
    api.ready=true;api.debug=()=>({tiles:heights.size,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls});
    window.Ferro3D.ready=true;
  }).catch(error=>{console.warn('Arena 3D: fallback SVG',error);layer.remove();});
})();
