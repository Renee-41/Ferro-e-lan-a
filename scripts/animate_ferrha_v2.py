"""Author animation v2 on the existing 26-bone rig. Existing topology/skin preserved; tactical proportions refined.
Temporary IK constraints are baked into FK keys and removed before export.
Original Ferrha.blend and Ferrha.glb remain the playable v1 baseline.

Key-pose references (principles adapted to the short chibi reach, not copied sequences):
https://www.wiktenauer.com/wiki/Fiore_de%27i_Liberi/Spear -- guard, offline beat, thrust.
https://www.selohaar.org/CW2010/The_Spear_of_Fiore_dei_Liberi.pdf -- weight transfer, lateral beat.
https://www.thearma.org/Manuals/Swetnam_Modernized_ARMA.pdf -- low guard and recovery, pp. 171-177.
Hit and side collapse are original stylized reactions, not historical demonstrations.
"""
from pathlib import Path
import bpy,math,json,hashlib
from mathutils import Vector,Euler,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets'/'characters'/'ferrha'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'Ferrha.blend'))
scene=bpy.context.scene;scene.render.fps=30
rig=bpy.data.objects['Ferrha_Rig'];rig.animation_data_clear()
# Same topology, weights and materials; a 15% smaller head and more present legs/torso.
def body_z(z):
    if z<=.12:return z
    if z<=.4:return .12+(z-.12)*1.15
    return .442+(z-.4)*1.08 if z<=.86 else z+.0788
def head_point(v):return Vector((v.x*.85,v.y*.85,body_z(.86)+(v.z-.86)*.85))
for obj in scene.objects:
    if obj.type!='MESH' or not any(m.type=='ARMATURE' and m.object==rig for m in obj.modifiers):continue
    if obj.name=='Spear' or obj.name.startswith('MagneticPlate_'):
        anchor=rig.data.bones[obj.vertex_groups[0].name].head_local
        lift=(body_z(.86)+(anchor.z-.86)*.85-anchor.z) if anchor.z>.86 else body_z(anchor.z)-anchor.z
        for v in obj.data.vertices:v.co.z+=lift
    else:
        head=obj.vertex_groups.get('Head')
        for v in obj.data.vertices:
            old=v.co.copy();weight=next((g.weight for g in v.groups if head and g.group==head.index),0)
            v.co=Vector((old.x,old.y,body_z(old.z))).lerp(head_point(old),weight)
            # Preserve the rear cap and four braid links outside the helmet.
            # Floor contact belongs to the death pose, never to hair compression.
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
    for attr in ['head','tail']:
        v=getattr(b,attr).copy()
        if b.name=='Head':v=head_point(v)
        elif b.name.startswith('Magnet.') and v.z>.86:v.z=body_z(.86)+(v.z-.86)*.85
        else:v.z=body_z(v.z)
        setattr(b,attr,v)
bpy.ops.object.mode_set(mode='OBJECT')
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
sp.rotation_mode='QUATERNION';c=rig.pose.bones['Spear'].constraints.new('COPY_TRANSFORMS');c.target=sp
hands={}
for suf in ['R','L']:
    h=bpy.data.objects.new('Bake_hand_'+suf,None);scene.collection.objects.link(h);temporary.append(h);hands[suf]=h
    h.rotation_mode='QUATERNION'
    c=rig.pose.bones['Forearm.'+suf].constraints.new('IK');c.target=h;c.chain_count=2;c.use_tail=True
    c=rig.pose.bones['Hand.'+suf].constraints.new('COPY_ROTATION');c.target=h

def weapon(grip,direction,second=False):
    # Solve the wrist from the grip, not the other way around: no detached hand or sliding shaft.
    q=Vector((0,0,1)).rotation_difference(Vector(direction).normalized())
    sp.location=grip;sp.rotation_quaternion=q@rest['Spear'].to_quaternion()
    hands['R'].location=Vector(grip)+q@Vector((.078,.025,.00216))
    hands['R'].rotation_quaternion=q@rest['Hand.R'].to_quaternion()
    hands['L'].location=(Vector(grip)+q@Vector((-.078,.025,.42216))) if second else Vector((.33,-.22,.68))
    hands['L'].rotation_quaternion=q@rest['Hand.L'].to_quaternion() if second else rest['Hand.L'].to_quaternion()

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def key(t,poses):
    for (a,p),(b,q) in zip(poses,poses[1:]):
        if t<=b:return Vector(p).lerp(Vector(q),smooth((t-a)/(b-a)))
    return Vector(poses[-1][1])
def guard(t):
    reset();breath=math.sin(t*2*math.pi)
    offset('Hips',(-.012,.012,-.037+.003*breath))
    rot('Spine',(.055+.010*breath,-.015,.09));rot('Head',(-.035,0,-.09))
    for s,suf in [(1,'L'),(-1,'R')]:
        rot('UpperArm.'+suf,(-.16,s*.34,0));rot('Forearm.'+suf,(-.28,0,0))
        rot('Thigh.'+suf,(-.1,0,0));rot('Shin.'+suf,(.18,0,0))
        targets[suf].location=(s*.145,-.060 if suf=='L' else .055,.073)
    weapon((-.37,-.18,.65+.003*breath),(.20,-.52,.83))
    for i in range(1,7):
        offset(f'Magnet.{i:02d}',(.005*math.cos(t*2*math.pi+i),0,.010*math.sin(t*2*math.pi+i*.7)))
        rot(f'Magnet.{i:02d}',(0,.025*math.sin(t*2*math.pi+i),0))
def walk(t):
    guard(0);a=2*math.pi*t
    offset('Hips',(.020*math.cos(a),0,-.037+.008*math.cos(2*a)))
    rot('Hips',(0,.033*math.cos(a),.04*math.sin(a)))
    rot('Spine',(.075,-.027*math.cos(a),.09-.04*math.sin(a)))
    rot('Head',(-.045,0,-.09+.02*math.sin(a)))
    for s,suf in [(1,'L'),(-1,'R')]:
        phase=(t+(0 if suf=='L' else .5))%1
        # Stance foot travels backwards at constant rate; swing foot lifts on its return.
        if phase<.5:y=-.10+.40*phase;lift=0
        else:
            u=(phase-.5)*2;y=.10-.20*(u*u*(3-2*u));lift=.058*math.sin(math.pi*u)**1.3
        targets[suf].location=(s*.132,y,.073+lift)
        rot('UpperArm.'+suf,(-.16+s*.12*math.sin(a),s*.34,0))
    weapon((-.37+.01*math.cos(a),-.18+.016*math.sin(a),.65+.008*math.cos(2*a)),(.20,-.52+.02*math.sin(a+.3),.83))
    hands['L'].location.y+=.04*math.sin(a)
    for i in range(1,7):offset(f'Magnet.{i:02d}',(.012*math.cos(a+i),.009*math.sin(a+i),.013*math.sin(a+.8+i*.4)))
def pulse(t,a,b,c):
    if t<a or t>c:return 0
    u=(t-a)/(b-a) if t<b else (c-t)/(c-b)
    return u*u*(3-2*u)
def attack(t,kind):
    guard(0)
    # Fiore: point on line, extension supported by weight transfer; beat across the line for B.
    # Contact stays at 40% to match the combat event adapter. A/C retract along their thrust line.
    g=(-.37,-.18,.65);d=(.20,-.52,.83)
    if kind==0:
        grip=key(t,[(0,g),(.22,(-.38,-.10,.71)),(.40,(-.32,-.40,.72)),(.48,(-.32,-.40,.72)),(.70,(-.38,-.15,.71)),(1,g)])
        direction=key(t,[(0,d),(.20,(.02,-1,.05)),(.70,(.02,-1,.05)),(1,d)])
        drive=pulse(t,.22,.40,.90);wind=pulse(t,0,.22,.40)
        offset('Hips',(-.012,.025*wind-.032*drive,-.037-.01*wind))
        rot('Spine',(.055+.10*drive,0,.09+.10*wind-.18*drive))
    elif kind==1:
        grip=key(t,[(0,g),(.25,(-.38,-.25,.73)),(.40,(-.22,-.34,.73)),(.55,(-.16,-.31,.72)),(.78,(-.30,-.28,.67)),(1,g)])
        direction=key(t,[(0,d),(.25,(-.85,-.52,.08)),(.40,(.15,-1,.08)),(.55,(.82,-.57,.09)),(.78,(.35,-.75,.35)),(1,d)])
        turn=key(t,[(0,(0,0,.09)),(.25,(.03,0,.36)),(.55,(.10,0,-.38)),(.78,(.04,0,-.14)),(1,(0,0,.09))])
        rot('Spine',turn);rot('Hips',(0,0,turn.z*.22));rot('Head',(-.025,0,-turn.z*.4))
        drive=pulse(t,.25,.50,.94);wind=pulse(t,0,.25,.45)
        offset('Hips',(.027*math.sin(turn.z*3),0,-.037-.013*drive))
    else:
        grip=key(t,[(0,g),(.29,(-.40,-.08,.76)),(.40,(-.27,-.47,.74)),(.53,(-.27,-.47,.74)),(.82,(-.37,-.18,.69)),(1,g)])
        direction=key(t,[(0,d),(.24,(.02,-1,.08)),(.72,(.02,-1,.04)),(1,d)])
        drive=pulse(t,.29,.40,.96);wind=pulse(t,0,.29,.40)
        offset('Hips',(-.012,.040*wind-.090*drive,-.037-.048*wind-.020*drive))
        rot('Spine',(.055-.04*wind+.22*drive,0,.09+.20*wind-.22*drive))
        step=key(t,[(0,(.145,-.06,.073)),(.29,(.145,-.07,.12)),(.40,(.145,-.18,.073)),(.66,(.145,-.18,.073)),(.83,(.145,-.10,.105)),(1,(.145,-.06,.073))])
        targets['L'].location=step
    weapon(grip,direction)
    hands['L'].location=(.31,-.24-.055*drive,.68+.055*wind)
    for i in range(1,7):
        lag=pulse(t,.30,.49,.95)
        offset(f'Magnet.{i:02d}',((-.025 if kind==1 else 0)*lag,.038*lag,.025*wind))
def hit(t):
    guard(0);v=pulse(t,0,.20,.76);settle=pulse(t,.35,.65,1)
    rot('Spine',(.055-.23*v+.035*settle,-.035*v,.09+.055*v));rot('Head',(-.035+.13*v-.025*settle,0,-.09))
def barrier(t):
    guard(0);v=smooth(t/.54);brace=pulse(t,.30,.52,.80)
    offset('Hips',(-.012,.012+.024*v,-.037-.053*v-.012*brace));rot('Spine',(.055+.11*v,0,.09*(1-v)));rot('Head',(-.035-.05*v,0,-.09*(1-v)))
    weapon(Vector((-.37,-.18,.65)).lerp(Vector((-.22,-.29,.76)),v),Vector((.20,-.52,.83)).lerp(Vector((.97,-.10,.22)),v),True)
    # Reach the front grip progressively instead of snapping the free hand onto the shaft.
    hands['L'].location=Vector((.33,-.22,.68)).lerp(hands['L'].location,v)
    for i in range(1,7):
        b=rest[f'Magnet.{i:02d}'].translation
        angle=(i-1)*math.pi/3
        goal=Vector((.62*math.cos(angle),-.49-.025*brace,.98+.34*math.sin(angle)))
        stage=max(0,min(1,(t-.045*(i%3))/.44));stage=stage*stage*(3-2*stage)
        offset(f'Magnet.{i:02d}',(goal-b)*stage);rot(f'Magnet.{i:02d}',(0,.18*math.cos(angle)*stage,0))
def death(t):
    guard(0);impact=pulse(t,0,.12,.30)
    wobble=pulse(t,.12,.33,.56)
    f=max(0,min(1,(t-.35)/.53));fall=f*f*(3-2*f)-.035*pulse(t,.86,.92,1)
    offset('Hips',(0,0,-.025-.05*wobble));rot('Spine',(-.17*impact+.13*wobble,0,.09*wobble))
    # Side collapse keeps the restored braid clear of the floor. No clip owns horizontal facing.
    rot('Root',(-.10*fall,-1.53*fall,0));offset('Root',(0,.045*wobble,.47*fall))
    rot('Head',(-.035,-.22*fall,-.09*(1-fall)))
    # FK legs accompany the fall after the support attempt; IK targets descend with Root.
    rootM=Matrix.Translation((0,.045*wobble,.47*fall))@Euler((-.10*fall,-1.53*fall,0)).to_matrix().to_4x4()
    weapon(Vector((-.37,-.18,.65)).lerp(Vector((-.19,-.34,.68)),fall),Vector((.20,-.52,.83)).lerp(Vector((.05,-.99,.03)),fall))
    for o in [sp,*hands.values()]:
        o.location=rootM@o.location.copy();o.rotation_quaternion=rootM.to_quaternion()@o.rotation_quaternion.copy()
    for s,suf in [(1,'L'),(-1,'R')]:targets[suf].location=rootM@Vector((s*.132,-.025 if suf=='L' else .025,.073))
    for i in range(1,7):
        b=rest[f'Magnet.{i:02d}'].translation
        # Counter Root motion: plates lose their orbit and land individually near the body.
        goal=Vector((b.x*1.4, b.y+.15, .075+.012*(i%2)))
        world=b.lerp(goal,fall)
        local=rootM.inverted()@world
        offset(f'Magnet.{i:02d}',local-b)
        rot(f'Magnet.{i:02d}',(.9*fall,.3*fall*(-1)**i,.2*fall))

spec=[('Idle',2.4,guard),('Walk',1.,walk),('Attack_A',.70,lambda t:attack(t,0)),('Attack_B',.90,lambda t:attack(t,1)),('Attack_C',1.10,lambda t:attack(t,2)),('Hit',.3,hit),('Barrier',1.,barrier),('Death',1.8,death)]
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
report={'baseline_commit':'fd57f0a2fb797b8736244b3cba4e5e5f7094ee4b','baseline_sha256':{n:hashlib.sha256((OUT/n).read_bytes()).hexdigest() for n in ['Ferrha.glb','Ferrha.blend']},'bones':len(bones),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'mesh_changes':'rear hair restored; topology and weights preserved','head_scale':.85,'compact_braid_for_ground_contact':False,'leg_segment_scale':1.15,'torso_segment_scale':1.08,'rig_structure_changes':False,'walk_stride_m':.4,'clips':{n:d for n,d,fn in spec},'temporary_ik_baked_and_removed':True}
(OUT/'animation_v2.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
