const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

function read(relative){
  return fs.readFileSync(path.join(root,relative),'utf8');
}

for(const prefix of ['', 'preview-v1/']){
  const html=read(prefix+'index.html');
  const css=read(prefix+'css/overhaul-v1-fixes.css');
  const camera=read(prefix+'js/camera-controls.js');
  const scene=read(prefix+'js/arena-scene.js');

  assert(camera.includes("['arena-scene','js/arena-scene.js?v=arena-scene-1']"),`${prefix} arena scene loader missing`);
  assert(scene.includes("wrap.prepend(layer)"),`${prefix} canvas layer must be inserted behind the SVG arena`);
  assert(scene.includes('https://esm.sh/three@0.180.0'),`${prefix} pinned Three.js import missing`);

  assert.match(css,/#arena-3d-layer\{[^}]*pointer-events:none/s,`${prefix} WebGL layer must not capture input`);
  assert.match(css,/#arena\{[\s\S]*z-index:1/,`${prefix} SVG gameplay must remain above WebGL`);
  assert(css.includes('polygon[fill="rgba(28,58,34,0.55)"]'),`${prefix} normal terrain transparency hook missing`);
  assert(css.includes('polygon[fill="rgba(58,32,74,0.55)"]'),`${prefix} corrupted terrain transparency hook missing`);

  for(const method of ['init','setArena','resize','setVisible','dispose','debug']){
    assert(scene.includes(method),`${prefix} FerroArena3D.${method} missing`);
  }
  assert(scene.includes('assets/arenas/hexagonal/Arena_Hexagonal.glb'),`${prefix} approved normal GLB missing`);
  assert(scene.includes('assets/arenas/corrupted/Arena_Hexagonal.glb'),`${prefix} approved corrupted GLB missing`);
  assert(scene.includes("currentBiome==='rachadura'?'corrupted':'normal'"),`${prefix} real biome state is not connected`);
  assert(scene.includes("RADIUS===4"),`${prefix} expanded-grid safe fallback missing`);
  assert(!scene.includes('OrbitControls'),`${prefix} gameplay backdrop must not expose a free 3D camera`);
}

assert.equal(read('js/arena-scene.js'),read('preview-v1/js/arena-scene.js'),'preview arena integration must match branch root');
console.log(JSON.stringify({status:'PASS',copies:2,checks:'layer, API, GLBs, biome, fallback, input safety'}));
