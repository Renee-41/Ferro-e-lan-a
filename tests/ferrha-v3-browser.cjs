/* Headless validation of exported character GLBs and their animation previews.
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
    const character='ferrha-v3';await page.goto(`http://127.0.0.1:${port}/${character}-preview.html`);
    await page.waitForFunction(()=>window.CharacterLab?.ready,null,{timeout:30000});
    const expected=['Idle','Walk','Attack_A','Attack_B','Attack_C','Hit','Death','Special','Barrier'];
    for(const name of expected)assert.ok((await page.evaluate(()=>CharacterLab.debug().clips)).includes(name));
    await page.evaluate(()=>CharacterLab.setSpeed(0));
    for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const v=await page.evaluate(([x,z])=>{CharacterLab.resetPosition();for(let i=1;i<=90;i++)CharacterLab.testStep({dt:1/60,position:{x:x*i*.003,z:z*i*.003}});return CharacterLab.debug();},[x,z]);
      assert.ok(Math.abs(Math.atan2(Math.sin(v.yaw-Math.atan2(x,z)),Math.cos(v.yaw-Math.atan2(x,z))))<.015);
    }
    const frozen=await page.evaluate(()=>CharacterLab.debug());await page.mouse.move(750,580);await page.mouse.down();await page.mouse.move(900,650,{steps:8});await page.mouse.up();await page.mouse.wheel(0,-120);await page.waitForTimeout(150);
    const orbit=await page.evaluate(()=>CharacterLab.debug());assert.notDeepEqual(orbit.camera,frozen.camera);assert.equal(orbit.mixerTime,frozen.mixerTime);assert.equal(orbit.yaw,frozen.yaw);
    const timing=[];
    for(const speed of [0,.5,1,2]){
      await page.evaluate(speed=>{CharacterLab.resetPosition();CharacterLab.setSpeed(1);CharacterLab.select('Walk');CharacterLab.setSpeed(speed);},speed);
      await page.waitForTimeout(120);const a=await page.evaluate(()=>({real:performance.now(),...CharacterLab.debug()}));await page.waitForTimeout(420);const b=await page.evaluate(()=>({real:performance.now(),...CharacterLab.debug()}));
      const ratio=(b.mixerTime-a.mixerTime)/((b.real-a.real)/1000);assert.ok(Math.abs(ratio-speed)<.28,JSON.stringify({speed,ratio}));timing.push({speed,ratio});
    }
    await page.evaluate(()=>{CharacterLab.setSpeed(.5);CharacterLab.select('Idle');CharacterLab.resetPosition();});
    for(const name of ['Attack_A','Attack_B','Attack_C','Hit','Special']){
      await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(name=>CharacterLab.debug().state===name,name);
      await page.waitForFunction(()=>['Idle','Walk','FrenzyIdle'].includes(CharacterLab.debug().state));
      const v=await page.evaluate(()=>CharacterLab.debug());assert.ok(Math.abs(Object.entries(v.weights).filter(([n])=>n!=='Hit').reduce((s,[,w])=>s+w,0)-1)<1e-6);
    }
    await page.getByRole('button',{name:'Barrier',exact:true}).click();await page.waitForTimeout(2900);assert.equal(await page.evaluate(()=>CharacterLab.debug().base),'Barrier');
    await page.getByRole('button',{name:'Idle',exact:true}).click();
    await page.getByRole('button',{name:'Idle',exact:true}).click();
    await page.getByRole('button',{name:'Attack_C',exact:true}).click();await page.waitForTimeout(200);await page.getByRole('button',{name:'Hit',exact:true}).click();
    assert.equal(await page.evaluate(()=>CharacterLab.debug().base),'Attack_C');await page.waitForFunction(()=>CharacterLab.debug().base==='Idle');
    await page.getByRole('button',{name:'Death',exact:true}).click();await page.waitForTimeout((await page.evaluate(()=>CharacterLab.manifest.clips.Death))*2000+200);
    assert.equal(await page.evaluate(()=>CharacterLab.debug().base),'Death');await page.getByRole('button',{name:'Attack_A',exact:true}).click();assert.equal(await page.evaluate(()=>CharacterLab.debug().base),'Death');
    await page.screenshot({path:path.join(art,character+'-death.png')});
    await page.getByRole('button',{name:'Idle',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(art,character+'-preview.png')});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',character,headings:8,timing,pausedCamera:true,additiveHit:true,deathHeld:true,clips:await page.evaluate(()=>CharacterLab.debug().clips)}));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
