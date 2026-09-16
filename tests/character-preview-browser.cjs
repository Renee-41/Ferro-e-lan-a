/* Real GLBs, real WebGL, UI-driven playback. Assets must match the requested Git blobs. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tools=process.env.FERRO_TEST_TOOLS||path.join(os.tmpdir(),'ferrha-v2-testtools/node_modules');
const {chromium}=require(path.join(tools,'playwright')),art=path.join(__dirname,'artifacts/character-preview');fs.mkdirSync(art,{recursive:true});
const sources={kael:['69915b38f8e9c55cbbe312eb6876cec2378fd6af','assets/characters/kael/Kael.glb'],glacia:['e83242df4a271aa27613f924db972d3401c8710a','assets/characters/glacia/Glacia.glb'],voss:['3744a55eea367af5ac35501ba970c28d85724a2c','assets/characters/voss/Voss.glb'],ferrha:['e12320689a37bf1ab5af641adeab107fdb88ca94','assets/characters/ferrha/v3/Ferrha.glb']};
const expected={};
for(const [key,[commit,file]] of Object.entries(sources)){
  const actual=execFileSync('git',['hash-object',file],{cwd:root,encoding:'utf8'}).trim(),original=execFileSync('git',['rev-parse',commit+':'+file],{cwd:root,encoding:'utf8'}).trim();assert.equal(actual,original,key+' GLB modified');
  const raw=fs.readFileSync(path.join(root,file)),gltf=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());expected[key]=gltf.animations.map(a=>a.name);
}
const mime={'.js':'text/javascript','.html':'text/html','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.FERRO_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[],results={};
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url()+' '+r.status());});page.on('requestfailed',r=>failed.push(r.url()+' '+r.failure()?.errorText));
  const snapshot=()=>page.evaluate(()=>CharacterPreview.snapshot());
  async function character(key){await page.selectOption('#character',key);await page.waitForFunction(key=>CharacterPreview.snapshot().ready&&CharacterPreview.snapshot().character===key,key);await page.waitForTimeout(160);}
  function delta(a,b){return Math.max(...a.bones.map((x,i)=>Math.abs(x-b.bones[i])));}
  try{
    await page.goto(base+'/tools/character-animation-preview/index.html');await page.waitForFunction(()=>window.CharacterPreview?.snapshot().ready);
    for(const key of Object.keys(sources)){
      await character(key);const initial=await snapshot();assert.equal(initial.clip,'Idle');assert.deepEqual(initial.scale,[1,1,1]);assert.deepEqual(initial.clips.map(c=>c.name),expected[key]);
      assert.deepEqual(await page.locator('#clip option').allTextContents(),expected[key]);assert.equal(initial.loadedModels,1);
      const motion=[];
      for(let i=0;i<initial.clips.length;i++){
        const clip=initial.clips[i];await page.selectOption('#clip',String(i));await page.waitForTimeout(55);const a=await snapshot();const before=await page.locator('canvas').screenshot();await page.waitForTimeout(190);const b=await snapshot(),after=await page.locator('canvas').screenshot();
        assert.equal(b.clip,clip.name);assert.ok(b.mixerTime>a.mixerTime);assert.ok(delta(a,b)>1e-5,key+' '+clip.name+' static bones');assert.notEqual(Buffer.compare(before,after),0,key+' '+clip.name+' static pixels');
        fs.writeFileSync(path.join(art,key+'-'+clip.name+'.png'),after);motion.push({clip:clip.name,duration:clip.duration,moving:true});
      }
      results[key]=motion;
    }
    await page.selectOption('#clip',String((await snapshot()).clips.findIndex(c=>c.name==='Walk')));
    await page.click('#play');const frozen=await snapshot();await page.waitForTimeout(230);const paused=await snapshot();assert.equal(paused.mixerTime,frozen.mixerTime);assert.deepEqual(paused.bones,frozen.bones);
    await page.mouse.move(850,650);await page.mouse.down();await page.mouse.move(1000,720,{steps:8});await page.mouse.up();await page.mouse.wheel(0,-150);await page.waitForTimeout(200);const moved=await snapshot();assert.notDeepEqual(moved.camera,paused.camera);assert.equal(moved.mixerTime,paused.mixerTime);
    await page.click('#reset');await page.waitForTimeout(180);assert.notDeepEqual((await snapshot()).camera,moved.camera);await page.click('#play');
    const timing=[];
    for(const speed of [.5,1,1.5,2]){
      await page.selectOption('#speed',String(speed));const a=await page.evaluate(()=>({real:performance.now(),...CharacterPreview.snapshot()}));await page.waitForTimeout(450);const b=await page.evaluate(()=>({real:performance.now(),...CharacterPreview.snapshot()}));const ratio=(b.mixerTime-a.mixerTime)/((b.real-a.real)/1000);assert.ok(Math.abs(ratio-speed)<.30,JSON.stringify({speed,ratio}));timing.push({speed,ratio});
    }
    // Once mode holds the exported ending, and Play/restart can repeat it.
    await page.uncheck('#loop');await page.selectOption('#clip',String((await snapshot()).clips.findIndex(c=>c.name==='Death')));await page.waitForFunction(()=>!CharacterPreview.snapshot().playing);assert.equal((await snapshot()).clip,'Death');await page.click('#play');assert.equal((await snapshot()).playing,true);await page.check('#loop');
    for(let i=0;i<3;i++)for(const key of Object.keys(sources))await character(key);
    const stable=await snapshot();assert.ok(stable.disposedModels>=16);assert.equal(stable.loadedModels,1);assert.ok(stable.memory.geometries<15,JSON.stringify(stable.memory));assert.ok(stable.memory.textures<12,JSON.stringify(stable.memory));
    // Rapid selections must not let a late response install the wrong character.
    await page.evaluate(()=>{const s=document.getElementById('character');for(const v of ['kael','glacia','voss','ferrha']){s.value=v;s.dispatchEvent(new Event('change'));}});
    await page.waitForFunction(()=>CharacterPreview.snapshot().ready&&CharacterPreview.snapshot().character==='ferrha');await page.waitForTimeout(650);assert.equal((await snapshot()).loadedModels,1);
    await page.screenshot({path:path.join(art,'viewer.png')});
    // Existing Ferrha viewer shares the stage and must still work.
    await page.goto(base+'/ferrha-v3-preview.html');await page.waitForFunction(()=>window.CharacterLab?.ready);await page.getByRole('button',{name:'Walk',exact:true}).click();await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>CharacterLab.debug().state),'Walk');
    assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
    const report={status:'PASS',unchangedGlbs:true,characters:results,timing,pauseAndOrbit:true,repeatedSwitches:12,rapidSwitch:true,disposal:true,originalPreview:true,consoleErrors:errors,httpErrors:failed};
    fs.writeFileSync(path.join(art,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
