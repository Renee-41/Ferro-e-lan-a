"""Author animation v2 on the existing 26-bone rig. No mesh/skin changes.
Temporary IK constraints are baked into FK keys and removed before export.
Original Ferrha.blend and Ferrha.glb remain the playable v1 baseline.
"""
from pathlib import Path
import bpy,math,json,hashlib
from mathutils import Vector,Euler,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets'/'characters'/'ferrha'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'Ferrha.blend'))
scene=bpy.context.scene;scene.render.fps=30
rig=bpy.data.objects['Ferrha_Rig'];rig.animation_data_clear()
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bones=list(rig.pose.bones);rest={p.name:p.bone.matrix_local.copy() for p in bones}
def reset():
    for p in bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
def rot(name,angles):
    q=rest[name].to_quaternion();rig.pose.bones[name].rotation_quaternion=q.inverted()@Euler(angles).to_quaternion()@q
def offset(name,xyz):rig.pose.bones[name].location=rest[name].to_3x3().inverted()@Vector(xyz)
targets={};temporary=[]
for suf in ['L','R']:
    t=bpy.data.objects.new('Bake_foot_'+suf,None);scene.collection.objects.link(t);temporary.append(t);targets[suf]=t
    t.rotation_mode='QUATERNION';t.rotation_quaternion=rest['Foot.'+suf].to_quaternion()
    p=bpy.data.objects.new('Bake_knee_'+suf,None);scene.collection.objects.link(p);temporary.append(p)
    p.location=((.13 if suf=='L' else -.13),-.6,.3)
    c=rig.pose.bones['Shin.'+suf].constraints.new('IK');c.target=t;c.chain_count=2
    # No extra exported IK bones; the rest-chain plane and seeded bend define the knee.
    c.use_tail=True
    c=rig.pose.bones['Foot.'+suf].constraints.new('COPY_ROTATION');c.target=t
sp=bpy.data.objects.new('Bake_spear',None);scene.collection.objects.link(sp);temporary.append(sp)
sp.rotation_mode='QUATERNION';c=rig.pose.bones['Spear'].constraints.new('COPY_ROTATION');c.target=sp
def spear(pitch=.18,roll=-.10,twist=0):sp.rotation_quaternion=Euler((pitch,roll,twist)).to_quaternion()@rest['Spear'].to_quaternion()
def guard(t):
    reset();offset('Hips',(.005*math.sin(t*2*math.pi),0,-.025+.003*math.sin(t*2*math.pi)))
    rot('Spine',(.035+.008*math.sin(t*2*math.pi),.008*math.sin(t*2*math.pi),0))
    rot('Head',(-.018,0,.012*math.sin(t*2*math.pi)))
    for s,suf in [(1,'L'),(-1,'R')]:
        rot('UpperArm.'+suf,(-.16,s*.34,0));rot('Forearm.'+suf,(-.28,0,0))
        rot('Thigh.'+suf,(-.1,0,0));rot('Shin.'+suf,(.18,0,0))
        targets[suf].location=(s*.132,-.025 if suf=='L' else .025,.073)
    spear(.20+.012*math.sin(t*2*math.pi),-.12)
    for i in range(1,7):
        offset(f'Magnet.{i:02d}',(.005*math.cos(t*2*math.pi+i),0,.010*math.sin(t*2*math.pi+i*.7)))
        rot(f'Magnet.{i:02d}',(0,.025*math.sin(t*2*math.pi+i),0))
def walk(t):
    guard(0);a=2*math.pi*t
    offset('Hips',(.013*math.cos(a),0,-.027+.008*math.cos(2*a)))
    rot('Hips',(0,.023*math.cos(a),.025*math.sin(a)))
    rot('Spine',(.06,-.018*math.cos(a),-.028*math.sin(a)))
    for s,suf in [(1,'L'),(-1,'R')]:
        phase=(t+(0 if suf=='L' else .5))%1
        # Stance foot travels backwards at constant rate; swing foot lifts on its return.
        if phase<.5:y=-.10+.40*phase;lift=0
        else:
            u=(phase-.5)*2;y=.10-.20*(u*u*(3-2*u));lift=.065*math.sin(math.pi*u)
        targets[suf].location=(s*.132,y,.073+lift)
        rot('UpperArm.'+suf,(-.16+s*.12*math.sin(a),s*.34,0))
    spear(.20+.045*math.sin(a+.35),-.12+.025*math.cos(a))
    for i in range(1,7):offset(f'Magnet.{i:02d}',(.012*math.cos(a+i),.009*math.sin(a+i),.013*math.sin(a+.8+i*.4)))
def pulse(t,a,b,c):
    if t<a or t>c:return 0
    u=(t-a)/(b-a) if t<b else (c-t)/(c-b)
    return u*u*(3-2*u)
def attack(t,kind):
    guard(0);v=pulse(t,.08,.40,.96);wind=pulse(t,0,.15,.35)
    heavy=kind==2
    offset('Hips',(0,-(.055 if heavy else .026)*v,-.025-.018*wind))
    rot('Spine',(.04+.13*v,0,(-.33 if kind==1 else -.09)*v+.06*wind))
    rot('UpperArm.R',(-.16-.65*v,.05 if heavy else -.14,-.16*v))
    rot('Forearm.R',(-.28-.20*v,0,-.10*v))
    spear(.2+1.20*v-.12*wind,-.12,(.50 if kind==1 else .03)*math.sin(t*math.pi)*v)
    targets['L'].location.y=-.025-(.075 if heavy else .04)*v
    targets['L'].location.z=.073+.025*math.sin(math.pi*t)*v
    for i in range(1,7):offset(f'Magnet.{i:02d}',(0,.023*v,.018*math.sin(t*math.pi)))
def hit(t):
    guard(0);v=pulse(t,0,.23,1);rot('Spine',(.035-.17*v,0,.035*v));rot('Head',(.05*v,0,0))
def barrier(t):
    guard(0);v=min(1,t/.42);v=v*v*(3-2*v)
    offset('Hips',(0,.015,-.025-.035*v));rot('Spine',(.04+.09*v,0,0))
    rot('UpperArm.L',(-.45*v,.38,-.05));spear(.04,-.10)
    for i in range(1,7):
        b=rest[f'Magnet.{i:02d}'].translation
        angle=(i-1)*math.pi/3
        goal=Vector((.67*math.cos(angle),-.45,.99+.32*math.sin(angle)))
        offset(f'Magnet.{i:02d}',(goal-b)*v);rot(f'Magnet.{i:02d}',(0,.18*math.cos(angle)*v,0))
def death(t):
    guard(0);impact=pulse(t,0,.12,.30)
    wobble=pulse(t,.12,.33,.56)
    f=max(0,min(1,(t-.35)/.53));fall=f*f*(3-2*f)
    offset('Hips',(0,0,-.025-.05*wobble));rot('Spine',(-.17*impact+.13*wobble,0,.09*wobble))
    rot('Root',(-1.46*fall,0,.13*fall));offset('Root',(0,0,.19*fall))
    spear(.18-.35*wobble+1.12*fall,-.12-.35*fall)
    # FK legs accompany the fall after the support attempt; IK targets descend with Root.
    rootM=Matrix.Translation((0,0,.19*fall))@Euler((-1.46*fall,0,.13*fall)).to_matrix().to_4x4()
    for s,suf in [(1,'L'),(-1,'R')]:targets[suf].location=rootM@Vector((s*.132,-.025 if suf=='L' else .025,.073))
    for i in range(1,7):
        b=rest[f'Magnet.{i:02d}'].translation
        # Counter Root motion: plates lose their orbit and land individually near the body.
        goal=Vector((b.x*1.4, b.y+.15, .075+.012*(i%2)))
        world=b.lerp(goal,fall)
        local=rootM.inverted()@world
        offset(f'Magnet.{i:02d}',local-b)
        rot(f'Magnet.{i:02d}',(.9*fall,.3*fall*(-1)**i,.2*fall))

spec=[('Idle',2.4,guard),('Walk',1.,walk),('Attack_A',.64,lambda t:attack(t,0)),('Attack_B',.78,lambda t:attack(t,1)),('Attack_C',.94,lambda t:attack(t,2)),('Hit',.3,hit),('Barrier',.9,barrier),('Death',1.8,death)]
baked={}
for name,duration,fn in spec:
    samples=[];frames=round(duration*30)
    for f in range(frames+1):
        scene.frame_set(f);fn(f/frames);bpy.context.view_layer.update()
        evaluated=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
        samples.append({p.name:evaluated.pose.bones[p.name].matrix.copy() for p in bones})
    baked[name]=samples
for p in bones:
    for c in list(p.constraints):p.constraints.remove(c)
for o in temporary:bpy.data.objects.remove(o,do_unlink=True)
for name,duration,fn in spec:
    a=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=a
    for f,matrices in enumerate(baked[name]):
        reset()
        for p in bones:
            # Solve basis from the sampled parent, not Blender's stale evaluated parent.
            if p.parent:
                p.matrix_basis=rest[p.name].inverted() @ rest[p.parent.name] @ matrices[p.parent.name].inverted() @ matrices[p.name]
            else:p.matrix_basis=rest[p.name].inverted() @ matrices[p.name]
            p.keyframe_insert('location',frame=f,group=p.name)
            p.keyframe_insert('rotation_quaternion',frame=f,group=p.name)
    for fc in a.fcurves:
        for key in fc.keyframe_points:key.interpolation='LINEAR'
    a.use_fake_user=True
    tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,a);tr.mute=True
rig.animation_data.action=None;reset();scene.frame_set(0)
meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Ferrha_v2.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_extras=True,export_force_sampling=True)
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.cycles.samples=12
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Ferrha_v2.blend'))
report={'baseline_commit':'fd57f0a2fb797b8736244b3cba4e5e5f7094ee4b','baseline_sha256':{n:hashlib.sha256((OUT/n).read_bytes()).hexdigest() for n in ['Ferrha.glb','Ferrha.blend']},'bones':len(bones),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'mesh_changes':False,'rig_structure_changes':False,'walk_stride_m':.4,'clips':{n:d for n,d,fn in spec},'temporary_ik_baked_and_removed':True}
(OUT/'animation_v2.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
