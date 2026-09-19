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
  const gameplayPolish=read(prefix+'js/gameplay-polish.js');
  const patchnotes=read(prefix+'js/qa-patchnotes.js');
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
  assert(!scene.includes('getScreenCTM'),`${prefix} projection must not depend on getScreenCTM`);
  assert(scene.includes('arena.viewBox&&arena.viewBox.baseVal'),`${prefix} SVG viewBox baseVal projection source missing`);
  assert(scene.includes("arena.getAttribute('viewBox')"),`${prefix} SVG viewBox attribute fallback missing`);
  assert(scene.includes('new ResizeObserver(()=>resize())'),`${prefix} resize observer missing`);
  assert(scene.includes('renderImmediately();'),`${prefix} immediate render after arena load missing`);
  for(const diagnostic of ['arenaRect','viewBox','projectionValid']){
    assert(scene.includes(diagnostic),`${prefix} ${diagnostic} debug diagnostic missing`);
  }
  assert(!scene.includes('OrbitControls'),`${prefix} gameplay backdrop must not expose a free 3D camera`);

  for(const moduleName of ['gameplay-reworks','support-systems','qa-run-flow','character-interactions','ui-control-placement','qa-ux','qa-patchnotes','cinematic-slow-patch']){
    assert(gameplayPolish.includes(moduleName),`${prefix} ${moduleName} gameplay-polish module must remain loaded`);
  }
  assert(patchnotes.includes('raio-balance.js'),`${prefix} raio-balance module must remain loaded`);
}

assert.equal(read('js/arena-scene.js'),read('preview-v1/js/arena-scene.js'),'preview arena integration must match branch root');
console.log(JSON.stringify({status:'PASS',copies:2,checks:'layer, API, GLBs, biome, viewBox projection, resize, diagnostics, fallback, input safety, preview modules'}));
