import * as T from 'three';

// Visual adapter only. dt MUST be simulation seconds, scaled once by the game's clock.
// Positions/targets come from the game. No AI, damage, cooldowns or camera-facing logic.
export class CharacterAnimationPlayer {
  constructor(gltf,manifest){
    this.manifest=manifest;this.root=new T.Group();this.model=gltf.scene;this.root.add(this.model);
    this.mixer=new T.AnimationMixer(this.model);this.actions={};this.weights={};this.phase=0;this.yaw=0;this.yawVelocity=0;this.clock=0;this.state='Idle';this.frenzy=false;this.moveWeight=0;this.events=0;
    for(const clip of gltf.animations){
      let source=clip;
      if(clip.name==='Hit'){source=clip.clone();source.tracks=source.tracks.filter(t=>/^(Spine|Head)\./.test(t.name));T.AnimationUtils.makeClipAdditive(source,0);}
      const a=this.actions[clip.name]=this.mixer.clipAction(source);this.weights[clip.name]=clip.name==='Idle'?1:0;
      if(!['Idle','Walk','FrenzyIdle'].includes(clip.name)){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}
      a.setEffectiveWeight(this.weights[clip.name]).play();
    }
    this.actions.Walk.setEffectiveTimeScale(0);this.position=new T.Vector3();
  }
  get locked(){return !['Idle','Walk','FrenzyIdle'].includes(this.state);}
  play(name,token){
    if(!this.actions[name])throw Error('Missing animation '+name);
    if(token!==undefined&&token===this.token)return;
    if(this.state==='Death'&&name!=='Idle')return;
    if(name==='Hit'){this.token=token;this.hitClock=0;this.actions.Hit.reset().play();this.events++;return;}
    this.token=token;this.state=name;this.clock=0;this.events++;
    if(name==='Idle')this.frenzy=false;
    if(name==='FrenzyIdle')this.frenzy=true;
    if(this.locked)this.actions[name].reset().play();
  }
  update({dt,position=this.position,target=null}){
    if(dt<=0)return; // Mixer, blends, yaw and gait all freeze. Camera is external.
    const next=new T.Vector3(position.x,position.y||0,position.z),d=next.clone().sub(this.position),distance=Math.hypot(d.x,d.z);
    this.position.copy(next);this.root.position.copy(next);
    const moving=distance>.00001&&distance<1.5&&this.state!=='Death';
    let desired=this.yaw;
    if(moving)desired=Math.atan2(d.x,d.z);
    if(target&&(!moving||this.locked)&&this.state!=='Death')desired=Math.atan2(target.x-next.x,target.z-next.z);
    if(this.state!=='Death'){
      const diff=Math.atan2(Math.sin(desired-this.yaw),Math.cos(desired-this.yaw));
      const wanted=T.MathUtils.clamp(diff*16,-10,10);this.yawVelocity+=(wanted-this.yawVelocity)*(1-Math.exp(-24*dt));
      let turn=this.yawVelocity*dt;if(Math.sign(turn)===Math.sign(diff)&&Math.abs(turn)>Math.abs(diff)){turn=diff;this.yawVelocity=0;}
      this.yaw=Math.atan2(Math.sin(this.yaw+turn),Math.cos(this.yaw+turn));
    }else this.yawVelocity=0;
    this.root.rotation.y=this.yaw;
    if(!this.locked)this.state=moving?'Walk':this.frenzy?'FrenzyIdle':'Idle';
    const mw=moving&&!this.locked?1:0;this.moveWeight+=(mw-this.moveWeight)*(1-Math.exp(-dt*(mw?15:19)));
    if(moving)this.phase=(this.phase+distance/this.manifest.stride_m)%1;
    this.actions.Walk.time=this.phase*this.manifest.clips.Walk;
    const locomotion=!this.locked,idle=this.frenzy&&this.actions.FrenzyIdle?'FrenzyIdle':'Idle';
    for(const [name,a] of Object.entries(this.actions)){
      if(name==='Hit')continue;
      const wanted=locomotion?(name==='Walk'?this.moveWeight:name===idle?1-this.moveWeight:0):name===this.state?1:0;
      this.weights[name]+=(wanted-this.weights[name])*(1-Math.exp(-dt*(this.state==='Hit'?30:this.state==='Death'?25:19)));
      a.setEffectiveWeight(this.weights[name]);
    }
    if(this.hitClock!==undefined){this.hitClock+=dt;if(this.hitClock>=this.manifest.clips.Hit)this.hitClock=undefined;}
    this.weights.Hit=this.hitClock!==undefined&&this.state!=='Death'?.85*Math.sin(Math.PI*this.hitClock/this.manifest.clips.Hit):0;
    this.actions.Hit.setEffectiveWeight(this.weights.Hit);this.mixer.update(dt);this.clock+=dt;
    if(this.locked&&this.state!=='Death'&&this.clock>=this.manifest.clips[this.state]){
      const empowered=this.state==='Special'&&this.actions.FrenzyIdle;
      this.state=empowered?'FrenzyIdle':idle;if(empowered)this.frenzy=true;this.clock=0;
    }
    this.model.rotation.z+=( (moving&&!this.locked?-this.yawVelocity*.002:0)-this.model.rotation.z)*(1-Math.exp(-12*dt));
  }
  debug(){return {state:this.hitClock!==undefined?'Hit':this.state,base:this.state,phase:this.phase,yaw:this.yaw,clock:this.clock,frenzy:this.frenzy,mixerTime:this.mixer.time,weights:{...this.weights},position:this.position.toArray(),clips:Object.keys(this.actions),events:this.events};}
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);}
}
