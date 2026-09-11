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
    await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.Ferrha3D?.ready,{},{timeout:25000});
    await page.evaluate(()=>{
      document.querySelectorAll('[id^="intro"]').forEach(e=>e.style.display='none');
      showScreen('battle');battleActive=false;startBattleLoopIfNeeded();
      units=[makeUnit(901,'player','ferrha',CHAMPION_CATALOG.ferrha,1,-1,0),makeUnit(902,'enemy','terrus',CHAMPION_CATALOG.terrus,1,1,-1),makeUnit(903,'player','gelida',CHAMPION_CATALOG.gelida,1,-1,1)];
      for(const u of units){u.hp=u.maxhp=10000;u.atk=1;}
      document.getElementById('banner').style.display='none';
    });
    await page.waitForFunction(()=>Ferrha3D.debug().length===1);
    const headings=[];
    for(const [name,dx,dy,yaw] of [['east',30,0,Math.PI/2],['west',-30,0,-Math.PI/2],['north',0,-30,Math.PI],['south',0,30,0]]){
      await page.evaluate(({dx,dy})=>{const u=units[0];u.targetRx=u.rx+dx;u.targetRy=u.ry+dy;},{dx,dy});
      await page.waitForFunction(yaw=>{const s=Ferrha3D.debug()[0];return Math.abs(Math.atan2(Math.sin(s.yaw-yaw),Math.cos(s.yaw-yaw)))<.07;},yaw);
      headings.push({name,...await page.evaluate(()=>Ferrha3D.debug()[0])});
      if(name==='north')await page.screenshot({path:path.join(art,'ferrha-north.png')});
    }
    const attacks=[];
    for(let i=0;i<3;i++){
      await page.evaluate(()=>{const u=units[0],t=units[1];u.targetRx=u.rx;u.targetRy=u.ry;u.range=99;u.special=null;doAction(u);});
      await page.waitForFunction(()=>Ferrha3D.debug()[0].base.startsWith('attack'));
      attacks.push(await page.evaluate(()=>Ferrha3D.debug()[0].base));
      await page.waitForFunction(()=>['idle','move'].includes(Ferrha3D.debug()[0].base));
    }
    assert.deepEqual(attacks,['attack_a','attack_b','attack_c']);
    await page.evaluate(()=>applyDamage(units[1],units[0],500,'teste',true));
    await page.waitForFunction(()=>Ferrha3D.debug()[0].hitSequence>0);
    await page.evaluate(()=>{units[0].barrierUntil=performance.now()+1000;});
    await page.waitForFunction(()=>Ferrha3D.debug()[0].base==='barrier');
    await page.screenshot({path:path.join(art,'ferrha-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('#ferrha-3d-layer canvas').width>0);
    await page.screenshot({path:path.join(art,'ferrha-mobile.png')});
    await page.evaluate(()=>{units[0].barrierUntil=0;units[0].hp=0;units[0].alive=false;});
    await page.waitForFunction(()=>Ferrha3D.debug()[0].base==='death');
    assert.equal(await page.locator('#ferrha-3d-layer canvas').count(),1);
    // Recreating units with the same ID must discard the dead animation instance.
    await page.evaluate(()=>{units[0]=makeUnit(901,'player','ferrha',CHAMPION_CATALOG.ferrha,1,0,0);});
    await page.waitForFunction(()=>!Ferrha3D.debug()[0].dead);
    const report={status:'PASS',headings:headings.map(s=>({name:s.name,yaw:s.yaw})),attacks,webglContexts:1,errors};
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(art,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
