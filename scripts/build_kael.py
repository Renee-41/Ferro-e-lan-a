"""Reproducible Kael asset. Run with Blender 4.2 Python (bpy + numpy)."""
from pathlib import Path
import bpy, math, json, numpy as np
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'kael'
OUT.mkdir(parents=True, exist_ok=True)
(OUT/'textures').mkdir(exist_ok=True)
(OUT/'previews').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for d in bpy.data.materials: bpy.data.materials.remove(d)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
parts=[]
bind={}
pal={}

def material(name, color, metal=0, rough=.5, emit=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*color,1)
    p.inputs['Emission Strength'].default_value=emit
    pal[name]=(color,metal,rough,emit)
    return m

def finish(o,name,mat,bone=None,smooth=False):
    o.name=name
    o.data.materials.append(mat)
    if smooth:
        for p in o.data.polygons: p.use_smooth=True
    parts.append(o)
    if bone: bind[o.name]=bone
    return o

def bevel(o,width=.025,segments=2):
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Forged rounded edges','BEVEL'); m.width=width; m.segments=segments
    bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def ball(name,loc,scale,mat,bone=None,segments=32,rings=20,power=1):
    # A rounded superellipsoid keeps the reference's broad cheeks and compact forms.
    segments=max(12,int(segments*.87));rings=max(8,int(rings*.87))
    verts=[]; faces=[]
    sp=lambda v: math.copysign(abs(v)**power,v)
    for j in range(1,rings):
        lat=-math.pi/2+math.pi*j/rings
        for i in range(segments):
            lon=2*math.pi*i/segments
            verts.append((loc[0]+scale[0]*sp(math.cos(lat))*sp(math.cos(lon)),loc[1]+scale[1]*sp(math.cos(lat))*sp(math.sin(lon)),loc[2]+scale[2]*sp(math.sin(lat))))
    for j in range(rings-2):
        for i in range(segments):
            a=j*segments+i; b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    lo=len(verts); verts.append((loc[0],loc[1],loc[2]-scale[2]))
    hi=len(verts); verts.append((loc[0],loc[1],loc[2]+scale[2]))
    for i in range(segments):
        faces.append((lo,(i+1)%segments,i))
        a=(rings-2)*segments+i; b=(rings-2)*segments+(i+1)%segments
        faces.append((a,b,hi))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,mat,bone,True)

def box(name,loc,scale,mat,bone=None,width=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel(o,width,3)
    return finish(o,name,mat,bone)

def rod(name,a,b,r,mat,bone=None,vertices=16,r2=None):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat,bone,True)

def plate(name,outline,y,depth,mat,bone=None,width=.01):
    n=len(outline)
    verts=[(x,y,z) for x,z in outline]+[(x,y+depth,z) for x,z in outline]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    bevel(o,width,2)
    return finish(o,name,mat,bone)

def line(name,coords,r,mat,bone):
    # Polygonal inlaid strips, no render-only curves.
    obs=[rod(name+str(i),a,b,r,mat,bone,8) for i,(a,b) in enumerate(zip(coords,coords[1:]))]
    return join(obs,name,bone)

def join(obs,name,bone=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    for o in obs:
        if o in parts:parts.remove(o)
        bind.pop(o.name,None)
    bpy.ops.object.join()
    o=bpy.context.object;o.name=name;parts.append(o)
    if bone:bind[name]=bone
    return o


# KAEL_MODEL
skin=material('Copper skin',(.43,.205,.105),0,.67)
iron=material('Scorched iron',(.047,.055,.062),.82,.46)
steel=material('Axe cutting edges',(.31,.33,.34),.86,.32)
dark=material('Charcoal cloth',(.024,.020,.021),0,.9)
red=material('Oxide red leather',(.34,.037,.025),0,.76)
hair=material('Coal auburn hair',(.072,.027,.017),0,.71)
tips=material('Copper hair tips',(.23,.057,.019),0,.65)
eye=material('Obsidian eyes',(.012,.007,.004),0,.3)
white=material('Warm ivory',(.74,.58,.36),0,.5)
ember=material('Ember inlay',(.95,.15,.015),.2,.45,.85)
leather=material('Ash leather',(.085,.047,.03),0,.81)
lip=material('Expression',(.14,.034,.014),0,.72)

# Same tactical family as refined Ferrha; broader torso and smaller exposed head.
# Front -Y, metre units. No helmet, cape, floating shards or copied champion assets.
ball('Torso',(0,.018,.655),(.30,.18,.255),skin,'Spine',36,24,.8)
ball('Neck',(0,0,.92),(.12,.11,.12),skin,'Neck',24,16)
ball('Head',(0,-.006,1.21),(.365,.278,.35),skin,'Head',56,36,.82)
for sign,suf in [(-1,'R'),(1,'L')]:
    ball('Ear.'+suf,(sign*.354,0,1.16),(.045,.051,.076),skin,'Head',20,14)
    ball('Eye.'+suf,(sign*.13,-.277,1.225),(.044,.019,.049),eye,'Head',24,16,.8)
    ball('Eye glint.'+suf,(sign*.128-.009,-.295,1.243),(.013,.006,.016),white,'Head',16,10)
    line('Fierce brow.'+suf,[(sign*.068,-.287,1.29),(sign*.19,-.272,1.326)],.021,hair,'Head')
ball('Nose',(0,-.284,1.16),(.033,.034,.028),skin,'Head',20,16)
line('Crooked grin',[(-.070,-.28,1.078),(0,-.298,1.069),(.085,-.278,1.108)],.011,lip,'Head')
plate('Grin tooth',[(.030,1.079),(.065,1.095),(.061,1.077),(.032,1.070)],-.292,.008,white,'Head',.001)
plate('Chin tuft',[(-.072,.995),(.066,.995),(.025,.925),(-.013,.918)],-.239,.053,hair,'Head',.008)

# Wraparound hair cap: rear silhouette is modeled explicitly, not hidden inside the skull.
hairparts=[];verts=[];faces=[];n=32;rows=10
for j in range(rows+1):
    for i in range(n):
        a=2*math.pi*i/n;end=1.22 if math.sin(a)<-.3 else 1.85
        theta=.018+(end-.018)*j/rows
        verts.append((.373*math.sin(theta)*math.cos(a),.292*math.sin(theta)*math.sin(a),1.21+.36*math.cos(theta)))
for j in range(rows):
    for i in range(n):
        a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
mesh=bpy.data.meshes.new('Hair cap');mesh.from_pydata(verts,[],faces);mesh.update()
ob=bpy.data.objects.new('Hair cap',mesh);scene.collection.objects.link(ob);finish(ob,'Hair cap',hair,'Head',True);hairparts.append(ob)
def tuft(name,center,width,height,lean):
    x,y,z=center;verts=[(x-width,y-.06,z),(x+width,y-.06,z),(x+width*.8,y+.08,z),(x-width*.8,y+.08,z),(x+lean,y+.08,z+height),(x+lean-.015,y+.12,z+height*.85)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,3,2,1),(0,1,4),(1,2,4),(2,5,4),(2,3,5),(3,0,4,5)]);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);finish(o,name,hair,'Head');o.data.materials.append(tips)
    for f in o.data.polygons:
        if f.index in [1,3]:f.material_index=1
    hairparts.append(o)
for i,y in enumerate([-.21,-.105,.015,.125,.22]):tuft('Mohawk.'+str(i),(0,y,1.47 if i in [0,4] else 1.54),.10 if i in [0,4] else .115,.20 if i==1 else .15,.045)
for sign in [-1,1]:
    for i in range(2):tuft('Side lock',(sign*(.22+i*.045),.09+i*.055,1.40-i*.085),.065,.12,sign*.075)

ball('Trousers',(0,.005,.405),(.245,.155,.155),dark,'Hips',32,20,.78)
box('Wide belt',(0,0,.489),(.50,.346,.072),leather,'Hips',.018)
box('Iron buckle',(0,-.187,.49),(.105,.031,.086),iron,'Hips',.009)
plate('Buckle ember',[(-.023,.511),(.029,.5),(.0,.468),(-.017,.485)],-.208,.008,ember,'Hips',.001)
plate('Red battle apron',[(-.18,.475),(.18,.475),(.13,.296),(.036,.27),(-.055,.315),(-.15,.288)],-.173,.045,red,'Hips',.008)
# A diagonal harness and one charred shoulder leave the powerful arms readable.
line('Red harness',[(-.22,-.115,.856),(-.11,-.183,.759),(.06,-.189,.608),(.19,-.145,.522)],.037,red,'Spine')
for sign,suf in [(-1,'R'),(1,'L')]:
    ball('Deltoid.'+suf,(sign*.345,0,.835),(.145,.15,.15),skin,'UpperArm.'+suf,28,20,.8)
    a=(sign*.365,0,.815);b=(sign*.51,-.008,.69);c=(sign*.653,-.022,.564)
    rod('Upper arm.'+suf,a,b,.118,skin,'UpperArm.'+suf,20,r2=.097)
    ball('Elbow.'+suf,b,(.105,.106,.103),skin,'Forearm.'+suf,24,16)
    rod('Forearm.'+suf,b,c,.104,skin,'Forearm.'+suf,20,r2=.074)
    rod('Wrist wrap.'+suf,(sign*.58,-.015,.633),c,.098,red,'Forearm.'+suf,16,r2=.082)
    box('Bracer plate.'+suf,(sign*.601,-.097,.619),(.115,.052,.12),iron,'Forearm.'+suf,.013)
    ball('Fist.'+suf,(sign*.710,-.03,.526),(.091,.088,.081),skin,'Hand.'+suf,28,18,.72)
    box('Knuckle guard.'+suf,(sign*.708,-.10,.532),(.114,.038,.062),leather,'Hand.'+suf,.012)
    line('Ember bracer.'+suf,[(sign*.566,-.127,.652),(sign*.615,-.13,.615)],.009,ember,'Forearm.'+suf)
    rod('Thigh.'+suf,(sign*.135,0,.41),(sign*.147,0,.254),.108,dark,'Thigh.'+suf,20,r2=.097)
    ball('Knee.'+suf,(sign*.15,-.028,.265),(.095,.105,.097),leather,'Shin.'+suf,24,16,.77)
    rod('Boot shaft.'+suf,(sign*.15,.0,.10),(sign*.15,0,.265),.096,leather,'Shin.'+suf,16)
    box('Boot.'+suf,(sign*.15,-.06,.085),(.213,.288,.17),dark,'Foot.'+suf,.025)
    box('Boot toe.'+suf,(sign*.15,-.165,.077),(.207,.095,.12),iron,'Foot.'+suf,.015)
    box('Boot cuff.'+suf,(sign*.15,-.005,.222),(.215,.207,.048),red,'Shin.'+suf,.01)
    line('Heat scar.'+suf,[(sign*.40,-.129,.80),(sign*.445,-.122,.756)],.015,red,'UpperArm.'+suf)
ball('Scorched pauldron',(-.355,.017,.898),(.17,.16,.09),iron,'UpperArm.R',24,16,.7)
line('Shoulder ember',[(-.46,-.105,.908),(-.35,-.145,.934),(-.28,-.11,.914)],.012,ember,'UpperArm.R')
rod('Left shoulder band',(.28,0,.876),(.37,0,.799),.152,red,'UpperArm.L',16,r2=.135)

axes=[];grips={}
for sign,suf in [(-1,'R'),(1,'L')]:
    before=list(parts);name='Axe.'+suf;grips[suf]=Vector((sign*.736,-.048,.53))
    rod('Axe haft.'+suf,(sign*.70,-.048,.27),(sign*.80,-.048,1.01),.031,leather,name,12)
    rod('Axe grip.'+suf,(sign*.723,-.048,.435),(sign*.754,-.048,.65),.040,red,name,12)
    rod('Axe pommel.'+suf,(sign*.692,-.048,.252),(sign*.70,-.048,.305),.047,iron,name,12)
    outline=[(.78,.99),(.93,1.036),(1.08,1.09),(1.18,1.04),(1.19,.77),(.98,.665),(.99,.82),(.78,.83)]
    plate('Axe blade.'+suf,[(sign*x,z) for x,z in outline],-.102,.108,iron,name,.016)
    edge=[(1.08,1.09),(1.18,1.04),(1.19,.77),(.98,.665),(1.026,.79),(1.12,.83),(1.115,1.022)]
    plate('Axe silver edge.'+suf,[(sign*x,z) for x,z in edge],-.112,.129,steel,name,.006)
    line('Axe heat channel.'+suf,[(sign*.86,-.121,.942),(sign*.99,-.123,.972),(sign*1.082,-.123,.935)],.014,ember,name)
    box('Axe socket.'+suf,(sign*.786,-.048,.898),(.10,.145,.21),iron,name,.01)
    axe=join([o for o in parts if o not in before],name,name);axes.append(axe)

# Apply transforms before unified UV packing. The reference pipeline is reused without importing its asset.
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# KAEL_ATLAS
# Unwrap together to allocate unique, non-overlapping islands for a shared 1K atlas.
print('Unwrapping',len(parts),'meshes',flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.uv.smart_project(angle_limit=1.05,island_margin=.008,area_weight=.3,correct_aspect=True,scale_to_bounds=True)
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(rotate=True,margin=.005)
bpy.ops.object.mode_set(mode='OBJECT')

# Rasterize physically based material values into the UV atlas, then pad island edges.
# Shape/bevel normals are geometric; the supplied normal map is neutral tangent-space.
N=1024
rgba=np.zeros((N,N,4),np.float32); rgba[:,:,3]=1
orm=np.ones((N,N,4),np.float32)
em=np.zeros((N,N,4),np.float32); em[:,:,3]=1
mask=np.zeros((N,N),bool)
def raster(uv,color,metal,rough,emit):
    p=np.array(uv)*N
    xmin=max(0,int(np.floor(p[:,0].min())));xmax=min(N-1,int(np.ceil(p[:,0].max())))
    ymin=max(0,int(np.floor(p[:,1].min())));ymax=min(N-1,int(np.ceil(p[:,1].max())))
    if xmax<xmin or ymax<ymin:return
    xs,ys=np.meshgrid(np.arange(xmin,xmax+1)+.5,np.arange(ymin,ymax+1)+.5)
    a,b,c=p; den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-9:return
    u=((b[1]-c[1])*(xs-c[0])+(c[0]-b[0])*(ys-c[1]))/den
    v=((c[1]-a[1])*(xs-c[0])+(a[0]-c[0])*(ys-c[1]))/den
    inside=(u>=-.002)&(v>=-.002)&(u+v<=1.002)
    rgba[ymin:ymax+1,xmin:xmax+1,:3][inside]=color
    orm[ymin:ymax+1,xmin:xmax+1,1][inside]=rough
    orm[ymin:ymax+1,xmin:xmax+1,2][inside]=metal
    em[ymin:ymax+1,xmin:xmax+1,:3][inside]=np.array(color)*min(emit,1)
    mask[ymin:ymax+1,xmin:xmax+1][inside]=True
for o in parts:
    o.data.calc_loop_triangles(); uv=o.data.uv_layers.active.data
    for t in o.data.loop_triangles:
        mat=o.data.materials[t.material_index]
        raster([uv[k].uv[:] for k in t.loops],*pal[mat.name])
for it in range(5):
    old=mask.copy()
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
        take=np.roll(old,(dy,dx),(0,1))&~mask
        for arr in [rgba,orm,em]:arr[take]=np.roll(arr,(dy,dx),(0,1))[take]
        mask|=take
def tex(name,arr,linear=False):
    im=bpy.data.images.new('Kael_'+name,width=N,height=N,alpha=True)
    im.colorspace_settings.name='Non-Color' if linear else 'sRGB'
    # Blender stores color pixels in linear space and encodes them when saving PNG.
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw=str(OUT/'textures'/('Kael_'+name+'.png'))
    im.file_format='PNG';im.save();return im
base=tex('BaseColor',rgba)
packed=tex('ORM',orm,True)
rough=np.ones_like(orm);rough[:,:,:3]=orm[:,:,1,None];tex('Roughness',rough,True)
metal=np.ones_like(orm);metal[:,:,:3]=orm[:,:,2,None];tex('Metallic',metal,True)
norm=np.ones_like(orm);norm[:,:,:3]=(.5,.5,1);normal=tex('Normal',norm,True)
emission=tex('Emission',em)
atlas=bpy.data.materials.new('Kael | 1K PBR atlas');atlas.use_nodes=True
nodes=atlas.node_tree.nodes;links=atlas.node_tree.links;p=nodes.get('Principled BSDF')
def inode(im,x,y):
    n=nodes.new('ShaderNodeTexImage');n.image=im;n.location=(x,y);return n
links.new(inode(base,-650,380).outputs['Color'],p.inputs['Base Color'])
sep=nodes.new('ShaderNodeSeparateColor');sep.location=(-360,50)
links.new(inode(packed,-650,60).outputs['Color'],sep.inputs[0])
links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
nm=nodes.new('ShaderNodeNormalMap');nm.location=(-340,-180)
links.new(inode(normal,-650,-210).outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],p.inputs['Normal'])
links.new(inode(emission,-650,-480).outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=1.1
for o in parts:
    o.data.materials.clear();o.data.materials.append(atlas)
    for face in o.data.polygons:face.material_index=0


# KAEL_RIG
bpy.ops.object.select_all(action='DESELECT')
armdata=bpy.data.armatures.new('Kael skeleton');rig=bpy.data.objects.new('Kael_Rig',armdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
bone('Root',(0,0,0),(0,0,.14));bone('Hips',(0,0,.37),(0,0,.55),'Root')
bone('Spine',(0,0,.55),(0,0,.85),'Hips');bone('Neck',(0,0,.85),(0,0,.98),'Spine');bone('Head',(0,0,.98),(0,0,1.54),'Neck')
for sign,suf in [(-1,'R'),(1,'L')]:
    bone('Clavicle.'+suf,(0,0,.85),(sign*.33,0,.846),'Spine')
    bone('UpperArm.'+suf,(sign*.33,0,.846),(sign*.51,-.008,.69),'Clavicle.'+suf)
    bone('Forearm.'+suf,(sign*.51,-.008,.69),(sign*.653,-.022,.564),'UpperArm.'+suf)
    bone('Hand.'+suf,(sign*.653,-.022,.564),(sign*.736,-.048,.53),'Forearm.'+suf)
    bone('Axe.'+suf,grips[suf],grips[suf]+Vector((sign*.024,0,.2)),'Hand.'+suf)
    bone('Thigh.'+suf,(sign*.135,0,.415),(sign*.15,0,.265),'Hips')
    bone('Shin.'+suf,(sign*.15,0,.265),(sign*.15,0,.085),'Thigh.'+suf)
    bone('Foot.'+suf,(sign*.15,0,.085),(sign*.15,-.18,.085),'Shin.'+suf)
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for o in parts:
    group=o.vertex_groups.new(name=bind[o.name]);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
    mod=o.modifiers.new('Kael skeletal deformation','ARMATURE');mod.object=rig;o.parent=rig
    # Short soft transitions at elbows and waist; metal/axes are weighted rigidly.
    if o.name=='Torso' or o.name.startswith('Elbow.'):
        o.vertex_groups.clear();isbody=o.name=='Torso';suf=o.name[-1:]
        g1=o.vertex_groups.new(name='Hips' if isbody else 'UpperArm.'+suf)
        g2=o.vertex_groups.new(name='Spine' if isbody else 'Forearm.'+suf)
        for v in o.data.vertices:
            t=max(0,min(1,(v.co.z-.42)/.30 if isbody else (abs(v.co.x)-.475)/.07))
            g1.add([v.index],1-t,'REPLACE');g2.add([v.index],t,'REPLACE')
hair_mesh=join(hairparts,'Hair')
body_mesh=join([o for o in parts if o not in axes and o!=hair_mesh],'Kael_Body')
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    scene.cursor.location=grips[o.name[-1]] if o in axes else (0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
scene.cursor.location=(0,0,0)
rig['asset']='Kael / Ferro & Lanca';rig['class']='Lutador';rig['element']='Fogo'
rig['forward']='-Y in Blender / +Z in glTF';rig['scale']='metres; root at ground centre'
rig['rig_notes']='21-bone FK humanoid, separate Axe.R and Axe.L grip controls. No facial or finger rig.'

# Small authored readiness/weapon-grip checks, not a full combat animation pack.
from mathutils import Euler
rest={p.name:p.bone.matrix_local.to_quaternion() for p in rig.pose.bones}
def reset():
    for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
def rotate(name,xyz):rig.pose.bones[name].rotation_quaternion=rest[name].inverted()@Euler(xyz).to_quaternion()@rest[name]
def stance(t):
    rotate('Spine',(.055+.008*math.sin(2*math.pi*t),0,0))
    for sign,suf in [(-1,'R'),(1,'L')]:
        rotate('UpperArm.'+suf,(.08,-sign*.18,sign*.12));rotate('Forearm.'+suf,(.07,0,-sign*.16))
def strike(t,suf):
    stance(0);sgn=-1 if suf=='R' else 1
    # Lift one axe, chop forward, then return; FK weapon stays fixed in its gripping hand.
    knots=[(0,0),(.28,-.85),(.48,1.0),(.62,.85),(1,0)]
    v=0
    for (a,x),(b,y) in zip(knots,knots[1:]):
        if t<=b:
            u=max(0,(t-a)/(b-a));v=x+(y-x)*u*u*(3-2*u);break
    rotate('UpperArm.'+suf,(.08+v,-sgn*.18,sgn*.12))
    rotate('Forearm.'+suf,(.07+.2*max(0,v),0,-sgn*.16))
    rotate('Spine',(.055+.08*max(0,v),0,sgn*.12*v))
scene.render.fps=30
for name,duration,fn in [('Idle',2.4,stance),('Axe_R_Test',.9,lambda t:strike(t,'R')),('Axe_L_Test',.9,lambda t:strike(t,'L'))]:
    rig.animation_data_create();action=bpy.data.actions.new(name);rig.animation_data.action=action
    for f in range(round(duration*30)+1):
        reset();fn(f/(duration*30))
        for p in rig.pose.bones:
            p.keyframe_insert('rotation_quaternion',frame=f,group=p.name);p.keyframe_insert('location',frame=f,group=p.name)
    for fc in action.fcurves:
        for k in fc.keyframe_points:k.interpolation='LINEAR'
    action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
rig.animation_data.action=None;reset();scene.frame_set(0)
for im in [base,packed,normal,emission]:im.pack()
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Kael.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_tangents=True)
for o in parts:o.data.calc_loop_triangles()
report={'name':'Kael','class':'Lutador','element':'Fogo','base_branch':'main','base_commit':'b0b69128a84c994643234f5c106e1532a039c5e3','triangles':sum(len(o.data.loop_triangles) for o in parts),'mesh_objects':len(parts),'meshes':[o.name for o in parts],'bones':len(armdata.bones),'materials':1,'texture_resolution':1024,'texture_maps':['BaseColor','Normal','Roughness','Metallic','ORM','Emission'],'normal_map':'Neutral tangent-space; bevels and large forms modeled','unit':'metre','root_pivot':[0,0,0],'rest_pose':'A-pose','head_height_m':.7,'height_with_hair_m':1.74,'weapons':['Axe.R','Axe.L'],'weapon_origins':'grip centre; independent mesh and child bone for each hand','clips':['Idle','Axe_R_Test','Axe_L_Test'],'animation_status':'Starter inspection clips only; complete gameplay animation set not included','rig':'21-bone FK humanoid; blended waist/elbows; rigid accessories; mitten hands','visual_reference':'Refined Ferrha proportions and material family; original Kael design, dual-axe offensive archetype requested by user','reference_url':'https://www.leagueoflegends.com/en-us/champions/olaf/','validation':{}}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')

# Studio stays in the .blend, excluded from the exported runtime asset.
stage=bpy.data.collections.new('PREVIEW ONLY');scene.collection.children.link(stage)
def staging(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    stage.objects.link(o)
floor=material('Preview floor',(.031,.026,.026),.05,.76)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));o=bpy.context.object;o.name='Preview ground';o.data.materials.append(floor);staging(o)
def target(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Warm key',(-3,-4,6),440,4,(1,.85,.72)),('Cool fill',(3,-2,3),310,3,(.66,.79,1)),('Ember rim',(1,3,4),530,2,(1,.5,.26))]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);stage.objects.link(o);o.location=loc;target(o,(0,0,.8))
scene.world.color=(.20,.20,.20)
d=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',d);stage.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.8;cam.location=(2.8,-6,3);target(cam,(0,0,.9))
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.view_settings.view_transform='AgX'
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Kael.blend'))
if '--no-render' not in __import__('sys').argv:
    rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
    for name,loc in [('hero',(2.8,-6,3)),('front',(0,-6,1.65)),('back',(-2.8,6,2.8)),('profile',(6,-.3,2)),('isometric',(3,-5,5))]:
        cam.location=loc;target(cam,(0,0,.88));scene.render.filepath=str(OUT/'previews'/f'Kael_{name}.png');bpy.ops.render.render(write_still=True)
    for size in [40,60,80]:
        scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.filepath=str(OUT/'previews'/f'Kael_gameplay_{size}px.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report),flush=True)

