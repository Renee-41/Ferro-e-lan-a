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
  page.on('console',m=>{if(m.type()==='error'||m.text().includes('Ferrha'))console.log(m.text());});
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='esm.sh'||url.hostname==='cdn.jsdelivr.net'){
      const i=url.pathname.indexOf('/examples/');const dest=i>=0?'/__three'+url.pathname.slice(i):'/__three/build/three.module.js';
      return route.fulfill({contentType:'text/javascript',body:`export * from 'http://127.0.0.1:${port}${dest}';`});
    }
    if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();
  });
  try{
    await page.goto(`http://127.0.0.1:${port}/ferrha-corrompida-lab.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.FerroLab?.ready,{},{timeout:25000});
    const headings=[];
    for(const [keys,yaw] of [[['d'],Math.PI/2],[['a'],-Math.PI/2],[['w'],Math.PI],[['s'],0],[['d','w'],Math.PI*.75],[['a','w'],-Math.PI*.75],[['d','s'],Math.PI*.25],[['a','s'],-Math.PI*.25]]){
      const before=await page.evaluate(()=>FerroLab.debug().position);
      for(const key of keys)await page.keyboard.down(key);
      await new Promise(r=>setTimeout(r,420));
      for(const key of keys)await page.keyboard.up(key);
      const v=await page.evaluate(()=>FerroLab.debug());assert.notDeepEqual(before,v.position);
      assert.ok(Math.abs(Math.atan2(Math.sin(v.yaw-yaw),Math.cos(v.yaw-yaw)))<.15);headings.push(keys.join('+'));
    }
    const timing=[];
    for(const speed of [0,.5,1,2]){
      await page.evaluate(speed=>{FerroLab.setSpeed(1);FerroLab.select('Walk');FerroLab.setSpeed(speed);},speed);
      await new Promise(r=>setTimeout(r,100));
      const a=await page.evaluate(()=>({real:performance.now(),...FerroLab.debug()}));
      await new Promise(r=>setTimeout(r,450));
      const b=await page.evaluate(()=>({real:performance.now(),...FerroLab.debug()}));
      const ratio=(b.mixerTime-a.mixerTime)/((b.real-a.real)/1000);
      if(speed===0){assert.deepEqual(b.position,a.position);assert.equal(b.now,a.now);assert.deepEqual(b.clipTimes,a.clipTimes);}
      else assert.ok(Math.abs(ratio-speed)<.3,JSON.stringify({speed,ratio}));
      timing.push({speed,ratio});
    }
    await page.evaluate(()=>FerroLab.setSpeed(0));
    const frozen=await page.evaluate(()=>FerroLab.debug());
    await page.mouse.move(750,580);await page.mouse.down();await page.mouse.move(900,660,{steps:8});await page.mouse.up();await page.mouse.wheel(0,-180);
    await new Promise(r=>setTimeout(r,200));
    const orbit=await page.evaluate(()=>FerroLab.debug());assert.notDeepEqual(orbit.camera,frozen.camera);assert.deepEqual(orbit.clipTimes,frozen.clipTimes);assert.equal(orbit.yaw,frozen.yaw);
    await page.locator('#top').click();await page.evaluate(()=>{FerroLab.setSpeed(.5);});
    for(const name of ['Attack_A','Attack_B','Attack_C','Hit','Barrier']){
      await page.getByRole('button',{name,exact:true}).click();
      await page.waitForFunction(name=>FerroLab.debug().state===name.toLowerCase(),name);
      await page.waitForFunction(()=>['idle','move'].includes(FerroLab.debug().state));
    }
    await page.getByRole('button',{name:'Death',exact:true}).click();
    await page.waitForFunction(()=>FerroLab.debug().deathAge>2);
    assert.equal(await page.evaluate(()=>FerroLab.debug().dead),true);
    await page.getByRole('button',{name:'Attack_A',exact:true}).click();assert.equal(await page.evaluate(()=>FerroLab.debug().state),'death');
    await page.getByRole('button',{name:'Idle',exact:true}).click();await page.waitForFunction(()=>FerroLab.debug().state==='idle');
    await page.locator('#scale').fill('0.9');assert.equal(await page.evaluate(()=>FerroLab.debug().scale),.9);
    await page.locator('#scale').fill('1');
    await new Promise(r=>setTimeout(r,400));await page.screenshot({path:path.join(art,'corrupted-lab-tactical.png')});
    await page.locator('#perspective').click();await new Promise(r=>setTimeout(r,250));await page.screenshot({path:path.join(art,'corrupted-lab-perspective.png')});
    await page.locator('#reset').click();
    const v=await page.evaluate(()=>FerroLab.debug());assert.equal(v.clips.length,8);assert.ok(v.triangles<42000);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:'PASS',headings,timing,pausedOrbit:true,clips:v.clips,triangles:v.triangles,calls:v.calls}));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
