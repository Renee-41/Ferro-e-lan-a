/* Pure visual controller. Inputs are combat snapshots/events; never writes to units.
   Game +X = right, +Y = down. GLB front = +Z. No camera enters this module. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.FerrhaVisualState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  const bearing=(dx,dy)=>Math.atan2(dx,dy);
  const defaults={idle:2.4,move:1,attack_a:.64,attack_b:.78,attack_c:.94,hit:.3,barrier:.9,death:1.8};
  class Controller {
    constructor(u,config={}){
      this.duration={...defaults,...config.duration};
      this.stridePixels=config.stridePixels||8; // 0.4m cycle at 20 SVG units/m.
      this.x=u.rx;this.y=u.ry;this.yaw=u.team==='player'?Math.PI/2:-Math.PI/2;
      this.desiredYaw=this.yaw;this.speed=0;this.moveWeight=0;this.phase=0;
      this.base='idle';this.state='idle';this.sequence=0;this.attackIndex=0;
      this.attackToken=null;this.hitToken=null;this.hitSequence=0;
      this.hitWeight=0;this.hitSide=0;this.hitLeft=0;this.remaining=0;
      this.barrierActive=false;this.dead=false;this.deathAge=0;this.hp=u.hp;
    }
    enter(state,duration){
      this.base=state;this.remaining=duration||0;this.sequence++;
      this.preparing=false;this.attackContact=false;
    }
    nextAttack(){return ['attack_a','attack_b','attack_c'][[0,1,2,1,0,2,0,1,0,2,1,2][this.attackIndex%12]];}
    attackDuration(u,state){return Math.max(.28,Math.min(this.duration[state],.9/Math.max(.1,u.speed||1)*.88));}
    update({unit:u,target,attack,hit,anticipate=false,dt=1/60,now=0}){
      const elapsed=Math.max(0,dt),step=elapsed;
      if(step===0)return this.snapshot();
      const dx=u.rx-this.x,dy=u.ry-this.y,d=Math.hypot(dx,dy);
      this.x=u.rx;this.y=u.ry;
      const teleported=d>90 || elapsed>.25;
      const speed=(!teleported && elapsed>0)?d/elapsed:0;
      this.speed+=(speed-this.speed)*(1-Math.exp(-step*15));
      const moving=speed>1.0 && !teleported;
      if(d>.001 && d<=90) this.desiredYaw=bearing(dx,dy);
      const newAttack=attack && (attack.token??attack.start)!==this.attackToken && now-attack.start<500;
      const barrier=!!(u.barrierUntil && now<u.barrierUntil);
      this.remaining=Math.max(0,this.remaining-step);
      if(this.preparing){
        if(!anticipate||moving||target?.id!==this.prepareTarget||u.actionTimer>this.actionDuration*400){this.enter('idle');}
        else {this.remaining=Math.max(.001,u.actionTimer/1000);this.prepareProgress=clamp(1-u.actionTimer/(this.actionDuration*400),0,1);}
      }
      if(!u.alive && !this.dead){this.dead=true;this.enter('death',this.duration.death);this.speed=0;}
      if(this.dead){
        this.deathAge+=step;this.moveWeight=0;this.hitWeight=0;
        this.state='death';return this.snapshot();
      }
      if(barrier && !this.barrierActive){this.enter('barrier',this.duration.barrier);}
      else if(newAttack && !barrier && this.base!=='barrier'){
        // A visual-only deterministic sequence: no gameplay RNG, no repeating ABC loop.
        const state=this.nextAttack();this.attackIndex++;
        // Fit the recovery inside the real attack interval; do not change combat cadence.
        const total=this.attackDuration(u,state);
        // Damage already happened in combat: present contact now, then recovery.
        this.enter(state,total*.6);this.attackContact=true;
        this.actionDuration=total;
      }
      if(newAttack)this.attackToken=attack.token??attack.start;
      this.barrierActive=barrier;
      if(this.base==='barrier' && this.remaining===0 && barrier) this.remaining=step;
      if(this.remaining===0 && this.base!=='idle' && this.base!=='move')this.enter('idle');
      const locked=this.remaining>0;
      if(target && (!moving || newAttack || this.base.startsWith('attack'))){
        const tx=target.rx-u.rx,ty=target.ry-u.ry;
        if(Math.hypot(tx,ty)>.05)this.desiredYaw=bearing(tx,ty);
      }
      const difference=angleDelta(this.yaw,this.desiredYaw);
      this.yaw+=clamp(difference*(1-Math.exp(-step*18)),-step*12,step*12);
      this.yaw=Math.atan2(Math.sin(this.yaw),Math.cos(this.yaw));
      const weightTarget=(!locked && moving)?clamp(this.speed/25,0,1):0;
      this.moveWeight+=(weightTarget-this.moveWeight)*(1-Math.exp(-step*(weightTarget>this.moveWeight?14:18)));
      if(!locked){
        const next=this.moveWeight>.025?'move':'idle';
        if(next!==this.base)this.enter(next);
        if(moving)this.phase=(this.phase+d/this.stridePixels)%1;
        const state=this.nextAttack(),total=this.attackDuration(u,state);
        // Read the existing action timer and already-selected target; never select targets here.
        if(!moving&&anticipate&&u.actionTimer>0&&u.actionTimer<total*400){
          this.enter(state,u.actionTimer/1000);this.preparing=true;this.prepareTarget=target.id;
          this.actionDuration=total;this.prepareProgress=clamp(1-u.actionTimer/(total*400),0,1);
        }
      }
      // Additive recoil can coexist with an attack or barrier; never restarts the base clip.
      if(hit && hit.token!==this.hitToken && hit.damage>0 && now-hit.at<400){
        this.hitToken=hit.token;this.hitSequence++;
        this.hitLeft=this.duration.hit;
        this.hitStrength=clamp(.30+hit.damage/Math.max(1,u.maxhp)*3,.3,1);
        this.hitSide=hit.source?Math.sin(angleDelta(this.yaw,bearing(hit.source.rx-u.rx,hit.source.ry-u.ry))):0;
      }
      this.hitLeft=Math.max(0,this.hitLeft-step);
      this.hitWeight=this.hitLeft>0?this.hitStrength:0;
      this.hp=u.hp;
      this.state=this.hitWeight && !locked?'hit':this.base;
      return this.snapshot();
    }
    snapshot(){return {state:this.state,base:this.base,sequence:this.sequence,yaw:this.yaw,
      desiredYaw:this.desiredYaw,speed:this.speed,moveWeight:this.moveWeight,phase:this.phase,
      actionDuration:this.actionDuration,remaining:this.remaining,preparing:!!this.preparing,prepareProgress:this.prepareProgress,attackContact:!!this.attackContact,hitSequence:this.hitSequence,
      hitWeight:this.hitWeight,hitSide:this.hitSide,deathAge:this.deathAge,dead:this.dead};}
  }
  return {Controller,bearing,angleDelta};
});
