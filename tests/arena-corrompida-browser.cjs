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
    await page.goto(`http://127.0.0.1:${port}/arena-corrompida-preview.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.ArenaCorrupted?.ready,{},{timeout:20000});
    await new Promise(r=>setTimeout(r,400));
    await page.screenshot({path:path.join(art,'corrupted-tactical.png')});
    await page.locator('#reset').click();await new Promise(r=>setTimeout(r,400));
    await page.screenshot({path:path.join(art,'corrupted-perspective.png')});
    assert.deepEqual(errors,[]);const debug=await page.evaluate(()=>ArenaCorrupted.debug());assert.equal(debug.tiles,61);assert.ok(debug.triangles<10000);
    console.log(JSON.stringify({status:'PASS',...debug}));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
