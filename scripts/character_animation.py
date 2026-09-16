"""Bake visual-only poses on an existing character. Never rebuild geometry/materials."""
from pathlib import Path
import bpy,math,json,hashlib
from mathutils import Vector,Euler,Matrix

def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def pulse(t,a,b,c):return smooth((t-a)/(b-a)) if t<=b else smooth((c-t)/(c-b))
def curve(t,keys):
    for (a,p),(b,q) in zip(keys,keys[1:]):
        if t<=b:return Vector(p).lerp(Vector(q),smooth((t-a)/(b-a)))
    return Vector(keys[-1][1])

class Baker:
    def __init__(self,name,socket_adjustments=None,variant=None):
        self.name=name;self.out=Path(__file__).resolve().parents[1]/'assets/characters'/name.lower()
        if variant:self.out/=variant
        bpy.ops.wm.open_mainfile(filepath=str(self.out/(name+'.blend')))
        self.scene=bpy.context.scene;self.scene.render.fps=30;self.rig=bpy.data.objects[name+'_Rig'];self.rig.animation_data_clear()
        self.meshes=[o for o in self.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==self.rig for m in o.modifiers)]
        self.signature=self.geometry_signature()
        for a in list(bpy.data.actions):bpy.data.actions.remove(a)
        self.socket_adjustments=socket_adjustments or {}
        if self.socket_adjustments:
            bpy.context.view_layer.objects.active=self.rig;bpy.ops.object.mode_set(mode='EDIT')
            for name,point in self.socket_adjustments.items():
                bone=self.rig.data.edit_bones[name];delta=Vector(point)-bone.head;bone.head+=delta;bone.tail+=delta
            bpy.ops.object.mode_set(mode='OBJECT')
        self.bones=list(self.rig.pose.bones);self.rest={p.name:p.bone.matrix_local.copy() for p in self.bones}
        self.temps=[];self.feet={};self.hands={};self.weapons={};self.spec=[];self.metrics={}
        for side in ['R','L']:
            self.feet[side]=self.empty('Foot.'+side);self.hands[side]=self.empty('Hand.'+side)
            for bone,target in [('Shin.'+side,self.feet[side]),('Forearm.'+side,self.hands[side])]:
                c=self.rig.pose.bones[bone].constraints.new('IK');c.target=target;c.chain_count=2;c.use_tail=True;c.use_stretch=False
            for bone,target in [('Foot.'+side,self.feet[side]),('Hand.'+side,self.hands[side])]:
                c=self.rig.pose.bones[bone].constraints.new('COPY_ROTATION');c.target=target
            # Exact glove/weapon contact; any tiny IK residual remains inside the wrist cuff.
            c=self.rig.pose.bones['Hand.'+side].constraints.new('COPY_LOCATION');c.target=self.hands[side]
    def geometry_signature(self):
        h=hashlib.sha256()
        for o in sorted(self.meshes,key=lambda o:o.name):
            h.update(o.name.encode())
            h.update(str([(tuple(v.co),[(g.group,g.weight) for g in v.groups]) for v in o.data.vertices]).encode())
            h.update(str([tuple(p.vertices) for p in o.data.polygons]).encode())
        return h.hexdigest()
    def empty(self,name):
        o=bpy.data.objects.new('Bake '+name,None);self.scene.collection.objects.link(o);o.rotation_mode='QUATERNION';self.temps.append(o);return o
    def add_weapon(self,name,side):
        o=self.empty(name);c=self.rig.pose.bones[name].constraints.new('COPY_TRANSFORMS');c.target=o
        self.weapons[name]=(o,side)
    def reset(self):
        for p in self.bones:p.rotation_mode='QUATERNION';p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
        for side in ['R','L']:
            self.feet[side].location=self.rest['Foot.'+side].translation;self.feet[side].rotation_quaternion=self.rest['Foot.'+side].to_quaternion()
        self.offset('Hips',(0,0,-.025))
        for side in ['R','L']:self.rot('Thigh.'+side,(-.12,0,0));self.rot('Shin.'+side,(.20,0,0))
    def rot(self,name,xyz):
        q=self.rest[name].to_quaternion();self.rig.pose.bones[name].rotation_quaternion=q.inverted()@Euler(xyz).to_quaternion()@q
    def offset(self,name,xyz):self.rig.pose.bones[name].location=self.rest[name].to_3x3().inverted()@Vector(xyz)
    def hand(self,side,grip,angles=(0,0,0)):
        q=angles if hasattr(angles,'slerp') else Euler(angles).to_quaternion()
        bone=self.rig.data.bones['Hand.'+side];o=self.hands[side]
        o.location=Vector(grip)+q@(bone.head_local-bone.tail_local);o.rotation_quaternion=q@self.rest[bone.name].to_quaternion()
    def weapon(self,name,position,angles=(0,0,0)):
        q=Euler(angles).to_quaternion();o,side=self.weapons[name]
        o.location=position;o.rotation_quaternion=q@self.rest[name].to_quaternion();self.hand(side,position,q)
    def walk_feet(self,t,stride,lift):
        for side in ['L','R']:
            phase=(t+(0 if side=='L' else .5))%1
            if phase<.5:y=-stride/4+stride*phase;z=0
            else:u=(phase-.5)*2;y=stride/4-stride/2*smooth(u);z=lift*math.sin(math.pi*u)**1.3
            r=self.rest['Foot.'+side].translation;self.feet[side].location=(r.x,y,r.z+z)
    def collapse(self,t,start=.28,finish=.90,roll=-1.48,pitch=-.10,flatten=False):
        f=smooth((t-start)/(finish-start));rot=Euler((pitch*f,roll*f,0)).to_quaternion();m=rot.to_matrix().to_4x4()
        self.rot('Root',(pitch*f,roll*f,0));self.rot('Head',(-.04,-.18*f,0))
        for o in self.temps:o.location=m@o.location.copy();o.rotation_quaternion=rot@o.rotation_quaternion.copy()
        if flatten:
            flat=Euler((math.pi/2,0,math.pi/2)).to_quaternion()
            for name,(o,side) in self.weapons.items():
                q=(o.rotation_quaternion@self.rest[name].to_quaternion().inverted()).slerp(flat,f)
                o.rotation_quaternion=q@self.rest[name].to_quaternion();self.hand(side,o.location,q)
        # One consistent ground correction includes hair, cloth and accessories.
        bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
        low=min(min((e.matrix_world@v.co).z for v in e.data.vertices) for e in [o.evaluated_get(deps) for o in self.meshes])
        lift=max(0,.004-low);self.offset('Root',(0,0,lift))
        for o in self.temps:o.location.z+=lift
    def bake(self,spec,stride,walk_duration,impacts,notes):
        self.spec=spec;baked={};floor=10;grip_error=0;walk_samples=[];worst={};wrist_error=0;worst_wrist={}
        for name,duration,fn in spec:
            samples=[];frames=round(duration*30)
            for f in range(frames+1):
                self.scene.frame_set(f);fn(f/frames);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();ev=self.rig.evaluated_get(deps)
                samples.append({p.name:ev.pose.bones[p.name].matrix.copy() for p in self.bones})
                if name=='Death':floor=min(floor,min(min((e.matrix_world@v.co).z for v in e.data.vertices) for e in [o.evaluated_get(deps) for o in self.meshes]))
                for wn,(target,side) in self.weapons.items():
                    error=(ev.pose.bones['Hand.'+side].tail-ev.pose.bones[wn].head).length
                    if error>grip_error:grip_error=error;worst={'clip':name,'frame':f,'weapon':wn}
                for side in ['L','R']:
                    error=(ev.pose.bones['Forearm.'+side].tail-ev.pose.bones['Hand.'+side].head).length
                    if error>wrist_error:wrist_error=error;worst_wrist={'clip':name,'frame':f,'side':side}
                if name=='Walk':walk_samples.append({'phase':f/frames,'left':list(ev.pose.bones['Foot.L'].head),'right':list(ev.pose.bones['Foot.R'].head)})
            baked[name]=samples
        for p in self.bones:
            for c in list(p.constraints):p.constraints.remove(c)
        for o in self.temps:bpy.data.objects.remove(o,do_unlink=True)
        for name,duration,fn in spec:
            a=bpy.data.actions.new(name);self.rig.animation_data_create();self.rig.animation_data.action=a
            for f,matrices in enumerate(baked[name]):
                for p in self.bones:
                    p.matrix_basis=self.rest[p.name].inverted()@self.rest[p.parent.name]@matrices[p.parent.name].inverted()@matrices[p.name] if p.parent else self.rest[p.name].inverted()@matrices[p.name]
                    for field in ['location','rotation_quaternion','scale']:p.keyframe_insert(field,frame=f,group=p.name)
            for fc in a.fcurves:
                for k in fc.keyframe_points:k.interpolation='LINEAR'
            a.use_fake_user=True;tr=self.rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,a);tr.mute=True
        self.rig.animation_data.action=None
        for p in self.bones:p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
        self.scene.frame_set(0);assert self.geometry_signature()==self.signature
        bpy.ops.object.select_all(action='DESELECT');self.rig.select_set(True)
        for o in self.meshes:o.select_set(True)
        bpy.context.view_layer.objects.active=self.rig
        bpy.ops.export_scene.gltf(filepath=str(self.out/(self.name+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True)
        bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(self.out/(self.name+'.blend')))
        self.metrics={'geometry_preserved':True,'geometry_sha256':self.signature,'death_floor_min_m':floor,'max_grip_error_m':grip_error,'max_wrist_ik_error_m':wrist_error,'worst_wrist_sample':worst_wrist,'worst_grip_sample':worst,'walk_samples':walk_samples}
        manifest={'character':self.name,'model':self.name+'.glb','clips':{n:round(d*30)/30 for n,d,fn in spec},'stride_m':stride,'walk_speed_m_s':stride/walk_duration,'impacts':impacts,'forward':'+Z glTF; world facing owned by renderer','socket_adjustments':self.socket_adjustments,'notes':notes,'validation':{k:v for k,v in self.metrics.items() if k!='walk_samples'}}
        (self.out/'animation_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
        report=json.loads((self.out/'asset_report.json').read_text(encoding='utf-8'));report.update(clips=list(manifest['clips']),animation_status='Authored gameplay test clips; in-place locomotion; external state and facing',animation_manifest='animation_manifest.json')
        report['validation']=manifest['validation'];(self.out/'asset_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
        print(json.dumps(manifest['validation']),flush=True)
        assert grip_error<.018,('Unreachable hand grip',grip_error)
        assert floor>-.003,('Death floor penetration',floor)
    def render(self):
        out=self.out/'previews/animations';out.mkdir(exist_ok=True)
        self.scene.render.resolution_x=480;self.scene.render.resolution_y=480;self.scene.cycles.samples=8
        cam=self.scene.camera;cam.location=(2.8,-6,3.1);cam.data.ortho_scale=3.15;cam.rotation_euler=(Vector((0,0,.78))-cam.location).to_track_quat('-Z','Y').to_euler()
        for name,duration,fn in self.spec:
            self.rig.animation_data.action=bpy.data.actions[name];self.scene.frame_set(round(duration*30*(1 if name=='Death' else .48)))
            self.scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
        print('PREVIEWS COMPLETE',flush=True)
        __import__('sys').stdout.flush();__import__('sys').stderr.flush();__import__('os')._exit(0)
