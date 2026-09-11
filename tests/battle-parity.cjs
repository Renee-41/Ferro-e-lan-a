/* Headless integration against the real index.html and combat functions.
   Test-only CDN routing uses the same Three 0.180.0 package, never user profiles. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const tools=process.env.FERRO_TEST_TOOLS||path.join(os.tmpdir(),'ferrha-v2-testtools','node_modules');
const {chromium}=require(path.join(tools,'playwright'));
const art=path.join(__dirname,'artifacts');fs.mkdirSync(art,{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local');const vendor=url.pathname.startsWith('/__three/');
  const base=vendor?path.join(tools,'three'):root;
  const relative=vendor?url.pathname.slice('/__three/'.length):url.pathname==='/'?'index.html':url.pathname.slice(1);
  const p=path.resolve(base,decodeURIComponent(relative));
  if(!p.startsWith(base+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Access-Control-Allow-Origin','*');const ext=path.extname(p);res.setHeader('Content-Type',mime[ext]||'application/octet-stream');
  if(vendor&&ext==='.js')res.end(fs.readFileSync(p,'utf8').replace(/from 'three'/g,"from '/__three/build/three.module.js'"));
  else fs.createReadStream(p).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const browser=await chromium.launch({executablePath:process.env.FERRO_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
  page.on('console',m=>{if(m.text().includes('Ferrha'))console.log(m.text());});
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='esm.sh'){
      const i=url.pathname.indexOf('/examples/');const dest=i>=0?'/__three'+url.pathname.slice(i):'/__three/build/three.module.js';
      return route.fulfill({contentType:'text/javascript',body:`export * from 'http://127.0.0.1:${port}${dest}';`});
    }
    if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();
  });
  try{
    const results=[];
    for(const mode of ['2d','3d']){
      await page.goto(`http://127.0.0.1:${port}/?visual=${mode}`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.FerroBattleTime);
      if(mode==='3d')await page.waitForFunction(()=>window.Ferrha3D?.ready&&window.Arena3D?.ready);
      else assert.equal(await page.locator('#ferrha-3d-layer').count(),0);
      results.push(await page.evaluate(()=>{
        let seed=5711,now=5000;Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
        Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
        units=[makeUnit(901,'player','ferrha',CHAMPION_CATALOG.ferrha,1,-1,0),makeUnit(902,'enemy','terrus',CHAMPION_CATALOG.terrus,1,1,0)];
        for(const u of units){u.hp=u.maxhp=100000;u.atk=8;}
        battleActive=true;battlePaused=false;FerroBattleTime.setSpeed(1);
        obstacleHexes.clear();voidHexes.clear();hazardHexes.clear();
        for(let i=0;i<240;i++){now+=50;updateBattleLogic(50);updateAnimations(50);}
        return units.map(u=>({id:u.id,hp:u.hp,q:u.q,r:u.r,rx:u.rx,ry:u.ry,alive:u.alive,actionTimer:u.actionTimer}));
      }));
    }
    assert.deepEqual(results[0],results[1]);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:'PASS',identicalCombatSnapshots:true,steps:240,units:results[0]}));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
