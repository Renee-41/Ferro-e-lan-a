/* Visual pose blending only. Caller supplies game-scaled seconds and world heading. */
window.FerrhaPosePlayer=class {
  constructor(THREE,model){
    this.THREE=THREE;this.model=model;this.mixer=new THREE.AnimationMixer(model);
    this.actions={};this.weights={};this.sequence=-1;this.hitSequence=0;
  }
  load(clips){
    const names={idle:'Idle',move:'Walk',attack_a:'Attack_A',attack_b:'Attack_B',attack_c:'Attack_C',hit:'Hit',barrier:'Barrier',death:'Death'};
    this.duration={};
    for(const [key,name] of Object.entries(names)){
      const clip=clips.find(c=>c.name===name);if(!clip)throw Error('Missing '+name);
      this.duration[key]=clip.duration;
      if(key==='hit'){
        const additive=clip.clone();additive.tracks=additive.tracks.filter(t=>/^(Spine|Head)\./.test(t.name));
        this.THREE.AnimationUtils.makeClipAdditive(additive,0);
        this.hit=this.mixer.clipAction(additive).setLoop(this.THREE.LoopOnce,1);continue;
      }
      const a=this.actions[key]=this.mixer.clipAction(clip);
      this.weights[key]=key==='idle'?1:0;
      a.setEffectiveWeight(this.weights[key]);
      if(key==='idle'||key==='move')a.play();
      else {a.setLoop(this.THREE.LoopOnce,1);a.clampWhenFinished=true;}
    }
    this.actions.move.setEffectiveTimeScale(0);
    return this;
  }
  update(v,dt){
    if(dt<=0)return; // including blend envelopes, additive recoil and mixer time
    const locomotion=v.base==='idle'||v.base==='move';
    if(this.sequence!==v.sequence){
      this.sequence=v.sequence;
      if(!locomotion){
        const a=this.actions[v.base];a.reset().play();
        a.setEffectiveTimeScale(v.base.startsWith('attack')?this.duration[v.base]/v.actionDuration:1);
        if(v.attackContact)a.time=this.duration[v.base]*.4;
      }
    }
    // Convex interpolation keeps total base weight at 1, even on interrupted transitions.
    const rate=v.dead?24:v.base==='barrier'?16:v.attackContact?32:18;
    const ease=1-Math.exp(-dt*rate);
    for(const [key,a] of Object.entries(this.actions)){
      const target=locomotion?(key==='idle'?1-v.moveWeight:key==='move'?v.moveWeight:0):(key===v.base?1:0);
      this.weights[key]+=(target-this.weights[key])*ease;
      a.setEffectiveWeight(this.weights[key]);
    }
    this.actions.move.time=v.phase*this.duration.move;
    if(v.preparing){const a=this.actions[v.base];a.time=this.duration[v.base]*.4*v.prepareProgress;a.setEffectiveTimeScale(0);}
    if(v.hitSequence!==this.hitSequence&&!v.dead){
      this.hitSequence=v.hitSequence;this.hit.reset().play();
    }
    const hitTarget=v.dead?0:v.hitWeight;
    this.hitWeight=(this.hitWeight||0)+(hitTarget-(this.hitWeight||0))*(1-Math.exp(-dt*35));
    this.hit.setEffectiveWeight(this.hitWeight);
    this.mixer.update(dt);
  }
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);}
};
