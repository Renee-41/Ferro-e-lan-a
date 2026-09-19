const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const tools=process.env.FERRO_TEST_TOOLS||path.join(os.tmpdir(),'ferro-3d-testtools','node_modules');
const {chromium}=require(path.join(tools,'playwright'));

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png'};

const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://local');
  const relative=decodeURIComponent(url.pathname==='/'?'index.html':url.pathname.slice(1));
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    response.writeHead(404);response.end();return;
  }
  response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const executablePath=process.env.FERRO_BROWSER;
  const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  const results=[];
  try{
    for(const [pagePath,viewport] of [['/',{width:1366,height:768}],['/preview-v1/',{width:390,height:844}]]){
      const page=await browser.newPage({viewport});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
      await page.goto(`http://127.0.0.1:${port}${pagePath}`,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{
        document.querySelectorAll('.screen').forEach(screen=>screen.classList.remove('active'));
        document.getElementById('screen-battle').classList.add('active');
        document.getElementById('intro-canvas').style.display='none';
        document.getElementById('intro-preshow').style.display='none';
        document.getElementById('intro-screen').style.display='none';
      });
      await page.waitForFunction(()=>window.FerroArena3D&&window.FerroArena3D.debug().arena==='normal'&&window.FerroArena3D.debug().canvas?.width>0,null,{timeout:60000});

      const normal=await page.evaluate(()=>({
        debug:window.FerroArena3D.debug(),
        layerPointer:getComputedStyle(document.getElementById('arena-3d-layer')).pointerEvents,
        canvasPointer:getComputedStyle(document.querySelector('#arena-3d-layer canvas')).pointerEvents,
        layerZ:getComputedStyle(document.getElementById('arena-3d-layer')).zIndex,
        svgZ:getComputedStyle(document.getElementById('arena')).zIndex
      }));
      assert.equal(normal.debug.rendererActive,true);
      assert.equal(normal.debug.visible,true);
      assert.equal(normal.layerPointer,'none');
      assert.equal(normal.canvasPointer,'none');
      assert(Number(normal.layerZ)<Number(normal.svgZ));

      await page.evaluate(()=>{currentBiome='rachadura';});
      await page.waitForFunction(()=>window.FerroArena3D.debug().arena==='corrupted'&&!window.FerroArena3D.debug().pending,null,{timeout:60000});
      const corrupted=await page.evaluate(()=>window.FerroArena3D.debug());
      assert.equal(corrupted.visible,true);
      assert(corrupted.cached.includes('normal')&&corrupted.cached.includes('corrupted'));

      await page.evaluate(()=>{RADIUS=8;});
      await page.waitForFunction(()=>window.FerroArena3D.debug().fallback2D===true);
      const expanded=await page.evaluate(()=>window.FerroArena3D.debug());
      assert.equal(expanded.visible,false);
      assert.equal(expanded.fallbackReason,'expanded-grid-has-no-matching-3d-asset');

      const relevant=errors.filter(message=>!/firebase|google|analytics|favicon/i.test(message));
      assert.deepEqual(relevant,[]);
      results.push({page:pagePath,viewport,normal:normal.debug.arena,corrupted:corrupted.arena,expandedFallback:expanded.fallback2D,canvas:normal.debug.canvas});
      await page.close();
    }
    console.log(JSON.stringify({status:'PASS',results}));
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
