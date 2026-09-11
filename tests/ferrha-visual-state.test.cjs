const {test}=require('node:test');const assert=require('node:assert/strict');
const {Controller,bearing,angleDelta}=require('../js/ferrha-visual-state.js');
const unit=()=>({id:1,rx:0,ry:0,hp:100,maxhp:100,alive:true,team:'player',speed:1});
function tick(c,u,extra={},dt=1/60){return c.update({unit:u,now:100,dt,...extra});}
for(const [name,dx,dy,yaw] of [['east',1,0,Math.PI/2],['west',-1,0,-Math.PI/2],['north',0,-1,Math.PI],['south',0,1,0],['NE',1,-1,Math.PI*.75],['NW',-1,-1,-Math.PI*.75],['SE',1,1,Math.PI*.25],['SW',-1,1,-Math.PI*.25]]){
  test('world orientation '+name,()=>{const u=unit(),c=new Controller(u);for(let i=0;i<70;i++){u.rx+=dx;u.ry+=dy;tick(c,u);}assert.ok(Math.abs(angleDelta(c.yaw,yaw))<.002);});
}
test('short arc across +/- pi, with bounded angular velocity',()=>{
  const u=unit(),c=new Controller(u);c.yaw=Math.PI-.02;const target={rx:-.02,ry:-1};
  const before=c.yaw;tick(c,u,{target});assert.ok(Math.abs(angleDelta(before,c.yaw))<.03);
});
test('attacks alternate and are not reset by repeated snapshots or attack lunges',()=>{
  const u=unit(),c=new Controller(u);const names=[];
  for(let k=0;k<4;k++){
    const attack={start:100+k*1000,targetId:2};const now=attack.start;
    tick(c,u,{attack,now,target:{rx:0,ry:-50}});names.push(c.base);const seq=c.sequence;
    for(let i=0;i<5;i++)tick(c,u,{attack,now:now+20+i});assert.equal(seq,c.sequence);
    assert.equal(c.phase,0);for(let i=0;i<90;i++)tick(c,u,{now:now+500+i});
  }
  assert.deepEqual(names,['attack_a','attack_b','attack_c','attack_b']);
});
test('barrier interrupts attack, then holds until the real barrier expires',()=>{
  const u=unit(),c=new Controller(u);tick(c,u,{attack:{start:100},now:100});
  u.barrierUntil=2500;tick(c,u,{now:150});assert.equal(c.base,'barrier');
  for(let i=0;i<100;i++)tick(c,u,{now:200+i*16});assert.equal(c.base,'barrier');
  for(let i=0;i<5;i++)tick(c,u,{now:2600+i*16});assert.equal(c.base,'idle');
});
test('hit is additive during attacks; death overrides every state and freezes heading',()=>{
  const u=unit(),c=new Controller(u);tick(c,u,{attack:{start:100},now:100});const seq=c.sequence;
  tick(c,u,{hit:{token:1,at:110,damage:12,source:{rx:-1,ry:0}},now:110});
  assert.equal(c.base,'attack_a');assert.equal(c.sequence,seq);assert.ok(c.hitWeight>0);
  const yaw=c.yaw;u.alive=false;u.barrierUntil=2000;tick(c,u,{now:120});
  assert.equal(c.base,'death');u.rx=100;tick(c,u,{now:150,target:{rx:200,ry:0}});
  assert.equal(c.yaw,yaw);assert.equal(c.hitWeight,0);
});
test('walk phase is travelled distance, independent of framerate',()=>{
  const run=fps=>{const u=unit(),c=new Controller(u);for(let i=0;i<fps;i++){u.rx+=13/fps;tick(c,u,{},1/fps);}return c.phase;};
  assert.ok(Math.abs(run(30)-run(120))<1e-9);
});
test('stop settles to idle and teleport never advances gait',()=>{
  const u=unit(),c=new Controller(u);for(let i=0;i<20;i++){u.rx+=1;tick(c,u);}assert.ok(c.moveWeight>.8);
  for(let i=0;i<40;i++)tick(c,u);assert.equal(c.base,'idle');assert.ok(c.moveWeight<.01);
  const phase=c.phase;u.rx+=100;tick(c,u);assert.equal(c.phase,phase);
});
test('controller does not mutate combat snapshots',()=>{
  const u=Object.freeze(unit()),c=new Controller(u);assert.doesNotThrow(()=>tick(c,u,{attack:{start:100}}));
});
