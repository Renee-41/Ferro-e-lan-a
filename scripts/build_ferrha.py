"""Reproducible Ferrha asset. Run with Blender 4.2 Python (bpy + numpy)."""
from pathlib import Path
import bpy, math, json, numpy as np
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'ferrha'
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

skin=material('Warm umber skin',(.46,.235,.125),0,.68)
iron=material('Blackened iron',(.065,.082,.098),.82,.42)
steel=material('Brushed steel edges',(.22,.28,.31),.85,.34)
dark=material('Charcoal underarmor',(.021,.026,.030),.1,.85)
hair=material('Dark chestnut hair',(.043,.021,.014),0,.64)
eye=material('Obsidian eyes',(.008,.006,.006),0,.27)
white=material('Warm eye highlights',(.9,.78,.58),0,.35)
ember=material('Recessed forge seams',(.85,.15,.023),.25,.4,1.1)
leather=material('Grip leather',(.10,.061,.038),0,.8)
lip=material('Expression',(.13,.047,.025),0,.7)

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

# Body at 1.60 m stylized game scale, front = -Y. Head is ~53% of body height.
ball('Body', (0,.015,.54),(.255,.17,.27),dark,'Spine',32,24,.82)
ball('Neck',(0,0,.80),(.11,.105,.12),skin,'Neck',24,16)
ball('Head',(0,-.012,1.155),(.465,.345,.425),skin,'Head',64,40,.83)
for s,suffix in [(-1,'R'),(1,'L')]:
    ball('Ear.'+suffix,(s*.444,-.005,1.05),(.051,.050,.082),skin,'Head',20,16)
    # The eyes stay close to the minimal oval marks in the supplied reference.
    ball('Eye.'+suffix,(s*.153,-.348,1.137),(.035,.021,.067),eye,'Head',24,20,.9)
    ball('Glint.'+suffix,(s*.153-.008,-.368,1.163),(.008,.004,.012),white,'Head',12,8)
    line('Brow.'+suffix,[(s*.110,-.352,1.239),(s*.190,-.340,1.259)],.015,hair,'Head')
ball('Small nose',(0,-.36,1.059),(.031,.026,.026),skin,'Head',20,12)
line('Determined mouth',[(-.043,-.337,.976),(0,-.347,.972),(.040,-.338,.983)],.0055,lip,'Head')

# Compact hair cap with a high open forehead; back hair and braid separate from helmet.
def cap(name,mat,rx,ry,rz,cz,theta_end,bone='Head'):
    verts=[]; faces=[]; n=48; rows=14
    for j in range(rows+1):
        theta=.025+(theta_end-.025)*j/rows
        for i in range(n):
            a=2*math.pi*i/n
            sp=lambda v: math.copysign(abs(v)**.83,v)
            verts.append((rx*sp(math.sin(theta))*sp(math.cos(a)),ry*sp(math.sin(theta))*sp(math.sin(a)),cz+rz*sp(math.cos(theta))))
    for j in range(rows):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.append(tuple(range(n-1,-1,-1)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    finish(o,name,mat,bone)
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Shell thickness','SOLIDIFY');m.thickness=.018
    bpy.ops.object.modifier_apply(modifier=m.name)
    return o
cap('Hair cap',hair,.478,.36,.424,1.155,1.13)
hairparts=[]
for s in [-1,1]:
    hairparts.append(ball('Temple lock',(s*.405,.025,1.172),(.063,.23,.21),hair,'Head',24,20,.7))
hairparts.append(ball('Back hair',(0,.284,1.15),(.33,.099,.29),hair,'Head',32,24,.85))
for i in range(4):
    hairparts.append(ball('Braid link',( .10+(.025 if i%2 else -.025),.353+i*.014,1.02-i*.068),(.077-i*.009,.070-i*.007,.060),hair,'Head',20,12,.82))
hairparts.append(rod('Braid iron tie',(.10,.40,.768),(.10,.40,.80),.043,steel,'Head',12))
join(hairparts,'Hair and short braid','Head')
cap('Helmet shell',iron,.493,.373,.455,1.155,.98)
# A compact angular brow and cheek guards: open face, no huge horns.
verts=[];faces=[]
for j in range(2):
    for i in range(48):
        a=2*math.pi*i/48
        sp=lambda v: math.copysign(abs(v)**.83,v)
        drop=.027*max(0,-math.sin(a))**12
        verts.append((.505*sp(math.sin(.98))*sp(math.cos(a)),.385*sp(math.sin(.98))*sp(math.sin(a)),1.155+.455*sp(math.cos(.98))-.052*j-drop))
for i in range(48):faces.append((i,(i+1)%48,(i+1)%48+48,i+48))
mesh=bpy.data.meshes.new('Curved helmet brow');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Helmet brow',mesh);scene.collection.objects.link(o);finish(o,'Helmet brow',steel,'Head')
bpy.context.view_layer.objects.active=o
m=o.modifiers.new('Brow thickness','SOLIDIFY');m.thickness=.018;bpy.ops.object.modifier_apply(modifier=m.name)
bevel(o,.005,2)
for s,suffix in [(-1,'R'),(1,'L')]:
    plate('Helmet temple.'+suffix,[(s*.381,1.39),(s*.461,1.372),(s*.475,1.19),(s*.421,1.13),(s*.391,1.22)],-.13,.19,iron,'Head',.014)
crest=plate('Helmet crest',[(-.044,1.429),(-.056,1.60),(0,1.668),(.056,1.60),(.044,1.429)],-.105,.25,steel,'Head',.009)
plate('Crest iron inset',[(-.019,1.458),(-.024,1.59),(0,1.624),(.024,1.59),(.019,1.458)],-.116,.01,iron,'Head',.003)

# Breastplate with a recognizable downward anvil-shaped centre.
plate('Breastplate',[(-.21,.795),(-.265,.693),(-.22,.50),(0,.45),(.22,.50),(.265,.693),(.21,.795),(0,.756)],-.172,.29,iron,'Spine',.028)
plate('Breastplate upper rim',[(-.204,.796),(0,.752),(.204,.796),(.193,.753),(0,.712),(-.193,.753)],-.205,.035,steel,'Spine',.009)
plate('Chest anvil badge',[(-.069,.675),(.069,.675),(.048,.641),(.020,.627),(.036,.601),(-.036,.601),(-.020,.627),(-.048,.641)],-.216,.018,steel,'Spine',.004)
line('Chest forge inlay',[(-.151,-.206,.568),(0,-.222,.518),(.151,-.206,.568)],.007,ember,'Spine')
box('Waist girdle',(0,-.004,.448),(.435,.33,.078),dark,'Hips',.02)
box('Belt clasp',(0,-.188,.449),(.10,.035,.065),steel,'Hips',.01)
for s,suffix in [(-1,'R'),(1,'L')]:
    plate('Hip plate.'+suffix,[(s*.018,.425),(s*.21,.453),(s*.274,.314),(s*.088,.29)],-.172,.10,iron,'Hips',.02)
    line('Hip rim.'+suffix,[(s*.085,-.188,.313),(s*.251,-.183,.335)],.009,steel,'Hips')
    # Arms slope down 30 degrees; flexible upper/lower sleeves follow two bones.
    a=(s*.238,0,.725); elbow=(s*.444,0,.615); hand=(s*.628,-.003,.502)
    rod('Upper sleeve.'+suffix,a,elbow,.084,dark,'UpperArm.'+suffix,24)
    rod('Elbow sleeve.'+suffix,elbow,hand,.075,dark,'Forearm.'+suffix,24)
    ball('Elbow.'+suffix,elbow,(.085,.085,.085),dark,'Forearm.'+suffix,20,16)
    ball('Pauldron.'+suffix,(s*.334,.012,.738),(.17,.169,.126),iron,'UpperArm.'+suffix,24,14,.62)
    plate('Shoulder edge.'+suffix,[(s*.21,.733),(s*.26,.673),(s*.433,.657),(s*.487,.731)],-.145,.042,steel,'UpperArm.'+suffix,.012)
    g=box('Gauntlet.'+suffix,(s*.547,-.014,.554),(.189,.193,.166),iron,'Forearm.'+suffix,.036)
    g.rotation_euler.y=s*.52
    box('Gauntlet face.'+suffix,(s*.55,-.118,.555),(.127,.037,.11),steel,'Forearm.'+suffix,.016)
    ball('Mitten hand.'+suffix,hand,(.077,.084,.075),dark,'Hand.'+suffix,24,18,.78)
    ball('Thumb.'+suffix,(s*.60,-.071,.522),(.035,.038,.049),iron,'Hand.'+suffix,20,12)
    ball('Thigh.'+suffix,(s*.122,.016,.31),(.097,.104,.134),dark,'Thigh.'+suffix,24,18,.8)
    ball('Knee.'+suffix,(s*.127,-.016,.232),(.104,.105,.085),iron,'Shin.'+suffix,24,18,.72)
    box('Greave.'+suffix,(s*.131,.005,.15),(.188,.205,.208),iron,'Shin.'+suffix,.036)
    box('Boot.'+suffix,(s*.132,-.041,.066),(.215,.304,.132),iron,'Foot.'+suffix,.039)
    box('Boot toe.'+suffix,(s*.132,-.162,.070),(.192,.064,.084),steel,'Foot.'+suffix,.021)
    plate('Shin front.'+suffix,[(s*.072,.232),(s*.184,.232),(s*.175,.12),(s*.13,.084),(s*.083,.12)],-.108,.026,steel,'Shin.'+suffix,.008)

# Six independent magnetic plates. Origins at their centres for future orbit animation.
shards=[]
placements=[(-.646,.065,1.17,-.20,.21,.33),(.665,.11,1.26,.24,.19,.28),(-.690,.09,.855,.32,.19,.23),(.715,.13,.945,-.26,.19,.29),(-.345,.46,1.19,-.15,.18,.28),(.27,.49,1.05,.25,.18,.24)]
for i,(x,y,z,angle,w,h) in enumerate(placements,1):
    name=f'MagneticPlate_{i:02d}'; bone=f'Magnet.{i:02d}'
    outline=[(-w*.48,h*.26),(-w*.23,h*.51),(w*.38,h*.37),(w*.5,-h*.24),(-w*.18,-h*.51),(-w*.47,-h*.24)]
    o=plate(name,outline,-.036,.072,iron,bone,.013)
    rim=plate(name+' ridge',[(-w*.23,h*.39),(w*.29,h*.28),(w*.35,h*.16),(-w*.30,h*.26)],-.049,.015,steel,bone,.005)
    glow=line(name+' inlay',[(-w*.23,-.052,-h*.12),(w*.23,-.052,-h*.04)],.006,ember,bone)
    o=join([o,rim,glow],name,bone)
    o.location=(x,y,z);o.rotation_euler=(.1*(-1)**i,angle,(-1)**i*.10)
    shards.append(o)

# Single separately addressable forged spear, fitted near right hand, with broad diamond tip.
sp=[]; sx=-.706
sp.append(rod('Spear shaft',(sx,-.028,.10),(sx,-.028,1.51),.025,iron,'Spear',12))
sp.append(rod('Spear grip',(sx,-.028,.41),(sx,-.028,.66),.031,leather,'Spear',12))
for z in [.415,.48,.545,.61,.655]:
    sp.append(rod('Grip ring',(sx,-.028,z),(sx,-.028,z+.012),.033,iron,'Spear',12))
sp.append(rod('Spear socket',(sx,-.028,1.40),(sx,-.028,1.52),.042,steel,'Spear',12))
sp.append(plate('Spear blade',[(sx,1.84),(sx-.096,1.596),(sx,1.465),(sx+.096,1.596)],-.053,.05,steel,'Spear',.004))
sp.append(plate('Spear blade ridge',[(sx,1.805),(sx-.019,1.594),(sx,1.505),(sx+.019,1.594)],-.061,.014,iron,'Spear',.002))
sp.append(rod('Spear butt',(sx,-.028,.075),(sx,-.028,.16),.032,steel,'Spear',12,r2=.025))
spear=join(sp,'Spear','Spear')
from mathutils import Matrix
pivot=Vector((sx,-.028,.5))
worldrot=Matrix.Translation(pivot) @ Matrix.Rotation(-.15,4,'Y') @ Matrix.Translation(-pivot)
spear.matrix_world=worldrot @ spear.matrix_world

# Apply all model transforms so the asset origin is ground centre; shard origins remain local.
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)

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
    im=bpy.data.images.new('Ferrha_'+name,width=N,height=N,alpha=True)
    im.colorspace_settings.name='Non-Color' if linear else 'sRGB'
    # Blender stores color pixels in linear space and encodes them when saving PNG.
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw=str(OUT/'textures'/('Ferrha_'+name+'.png'))
    im.file_format='PNG';im.save();return im
base=tex('BaseColor',rgba)
packed=tex('ORM',orm,True)
rough=np.ones_like(orm);rough[:,:,:3]=orm[:,:,1,None];tex('Roughness',rough,True)
metal=np.ones_like(orm);metal[:,:,:3]=orm[:,:,2,None];tex('Metallic',metal,True)
norm=np.ones_like(orm);norm[:,:,:3]=(.5,.5,1);normal=tex('Normal',norm,True)
emission=tex('Emission',em)
atlas=bpy.data.materials.new('Ferrha | 1K PBR atlas');atlas.use_nodes=True
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

# Basic humanoid armature, plus independent magnetic and spear controls.
bpy.ops.object.select_all(action='DESELECT')
armdata=bpy.data.armatures.new('Ferrha skeleton');rig=bpy.data.objects.new('Ferrha_Rig',armdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
    return b
bone('Root',(0,0,0),(0,0,.14))
bone('Hips',(0,0,.32),(0,0,.48),'Root')
bone('Spine',(0,0,.48),(0,0,.73),'Hips')
bone('Neck',(0,0,.73),(0,0,.86),'Spine')
bone('Head',(0,0,.86),(0,0,1.45),'Neck')
for s,suffix in [(-1,'R'),(1,'L')]:
    bone('Clavicle.'+suffix,(0,0,.73),(s*.238,0,.725),'Spine')
    bone('UpperArm.'+suffix,(s*.238,0,.725),(s*.444,0,.615),'Clavicle.'+suffix)
    bone('Forearm.'+suffix,(s*.444,0,.615),(s*.628,-.003,.502),'UpperArm.'+suffix)
    bone('Hand.'+suffix,(s*.628,-.003,.502),(s*.695,-.003,.468),'Forearm.'+suffix)
    bone('Thigh.'+suffix,(s*.122,0,.398),(s*.127,0,.23),'Hips')
    bone('Shin.'+suffix,(s*.127,0,.23),(s*.132,0,.073),'Thigh.'+suffix)
    bone('Foot.'+suffix,(s*.132,0,.073),(s*.132,-.17,.073),'Shin.'+suffix)
bone('Spear',(sx,-.028,.5),(sx,-.028,.85),'Hand.R')
for i,o in enumerate(shards,1):bone(f'Magnet.{i:02d}',o.location,o.location+Vector((0,0,.15)),'Root')
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for o in parts:
    group=o.vertex_groups.new(name=bind[o.name]);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
    mod=o.modifiers.new('Ferrha skeletal deformation','ARMATURE');mod.object=rig
    o.parent=rig
# Blend the torso over hips/spine; rigid armor remains rigid to preserve plate shapes.
body=bpy.data.objects['Body'];body.vertex_groups.clear()
gh=body.vertex_groups.new(name='Hips');gs=body.vertex_groups.new(name='Spine')
for v in body.data.vertices:
    t=max(0,min(1,(v.co.z-.39)/.23));gh.add([v.index],1-t,'REPLACE');gs.add([v.index],t,'REPLACE')
# Soft elbow sleeves get a short two-bone transition; armored sections keep rigid weights.
for s,suf in [(-1,'R'),(1,'L')]:
    for name in ['Upper sleeve.','Elbow sleeve.']:
        o=bpy.data.objects[name+suf];o.vertex_groups.clear()
        a=o.vertex_groups.new(name='UpperArm.'+suf);b=o.vertex_groups.new(name='Forearm.'+suf)
        for v in o.data.vertices:
            pos=o.matrix_world @ v.co;t=max(0,min(1,(abs(pos.x)-.40)/.088))
            a.add([v.index],1-t,'REPLACE');b.add([v.index],t,'REPLACE')
# Join by useful runtime part while retaining bone weights and disconnected rigid plates.
helmet_parts=[o for o in parts if o.name.startswith('Helmet') or o.name=='Crest iron inset']
hair_parts=[o for o in parts if o.name in ['Hair cap','Hair and short braid']]
helmet_mesh=join(helmet_parts,'Helmet')
hair_mesh=join(hair_parts,'Hair')
main_parts=[o for o in parts if o not in shards and o not in [spear,helmet_mesh,hair_mesh]]
body_mesh=join(main_parts,'Ferrha_Body')
for o in [body_mesh,helmet_mesh,hair_mesh,spear]:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    scene.cursor.location=pivot if o==spear else (0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
scene.cursor.location=(0,0,0)
rig['asset']='Ferrha / Ferro & Lanca'
rig['reference']='Image-based chibi proportions; no source mesh supplied.'
rig['scale']='Metres; Z up in Blender, -Y forward; origin ground centre.'
rig['rig_notes']='FK starter rig; rigid armor, mitten hands, 6 magnetic controls. No facial rig or IK.'

# Short starter clips, not motion-capture or final authored gameplay animation.
scene.render.fps=24
def reset():
    for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
def key(frame):
    for p in rig.pose.bones:
        p.keyframe_insert('location',frame=frame,group=p.name)
        p.keyframe_insert('rotation_euler',frame=frame,group=p.name)
def make_action(name,frames,fn):
    rig.animation_data_create();a=bpy.data.actions.new(name);rig.animation_data.action=a
    for f,t in frames:reset();fn(t);key(f)
    a.use_fake_user=True
    tr=rig.animation_data.nla_tracks.new();tr.name=name
    tr.strips.new(name,1,a);tr.mute=True
    return a
def idle(t):
    rig.pose.bones['Spine'].rotation_euler.x=.017*math.sin(t*2*math.pi)
    for i in range(1,7):rig.pose.bones[f'Magnet.{i:02d}'].location.y=.018*math.sin(t*2*math.pi+i*.8)
make_action('Idle',[(1,0),(13,.25),(25,.5),(37,.75),(49,1)],idle)
def walk(t):
    a=math.sin(t*2*math.pi)
    for sign,suf in [(1,'L'),(-1,'R')]:
        rig.pose.bones['Thigh.'+suf].rotation_euler.x=sign*.35*a
        rig.pose.bones['Shin.'+suf].rotation_euler.x=max(0,-sign*a)*.32
        rig.pose.bones['UpperArm.'+suf].rotation_euler.x=-sign*.18*a
    rig.pose.bones['Hips'].location.y=.012*(1-math.cos(t*4*math.pi))
make_action('Walk',[(1,0),(7,.25),(13,.5),(19,.75),(25,1)],walk)
def attack(t):
    v=math.sin(t*math.pi)
    rig.pose.bones['Spine'].rotation_euler.z=-.15*v
    rig.pose.bones['UpperArm.R'].rotation_euler.x=-.85*v
    rig.pose.bones['Forearm.R'].rotation_euler.z=.35*v
make_action('Attack',[(1,0),(7,.3),(11,.65),(21,1)],attack)
def hit(t):
    v=math.sin(t*math.pi);rig.pose.bones['Spine'].rotation_euler.x=-.19*v
    rig.pose.bones['Head'].rotation_euler.x=.12*v
make_action('Hit',[(1,0),(4,.45),(13,1)],hit)
def death(t):
    rig.pose.bones['Root'].rotation_euler.x=-1.36*t
    rig.pose.bones['Root'].location.z=.20*t
    rig.pose.bones['UpperArm.L'].rotation_euler.y=.3*t
make_action('Death',[(1,0),(9,.4),(25,1)],death)
def ability(t):
    v=math.sin(t*math.pi)
    rig.pose.bones['UpperArm.L'].rotation_euler.y=-.45*v
    for i in range(1,7):
        p=rig.pose.bones[f'Magnet.{i:02d}'];p.location.x=(.10 if i%2 else -.10)*v
        p.location.z=-.27*v;p.rotation_euler.y=.65*v
make_action('Ability',[(1,0),(9,.35),(17,.65),(33,1)],ability)
rig.animation_data.action=None;reset();scene.frame_set(1)

# Asset-only selection for export. Cameras and stage stay out of the GLB.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
print('Exporting GLB',flush=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'Ferrha.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_skins=True,export_yup=True,export_extras=True,export_tangents=True)

for o in parts:o.data.calc_loop_triangles()
tris=sum(len(o.data.loop_triangles) for o in parts)
report={'triangles':tris,'mesh_objects':len(parts),'magnetic_meshes':[o.name for o in shards],'spear_mesh':spear.name,'bones':len(armdata.bones),'texture_resolution':1024,'clips':['Idle','Walk','Attack','Hit','Death','Ability'],'head_height':.85,'body_height_without_crest':1.58,'normal_map':'Neutral tangent-space; large forms and bevels modeled in geometry','rig':'FK starter, rigid plate weights and blended torso; needs production animation review'}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

# Studio preview setup, saved in Blender but excluded from runtime export.
stage=bpy.data.collections.new('PREVIEW ONLY');scene.collection.children.link(stage)
def staging(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    stage.objects.link(o)
floor=material('Preview floor',(.024,.033,.038),.15,.63)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.016));o=bpy.context.object;o.name='Preview ground';o.data.materials.append(floor);staging(o)
def target(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);stage.objects.link(o);o.location=loc;target(o,(0,0,.8))
light('Large warm key',(-3,-4,6),450,4,(1,.84,.68))
light('Cool fill',(3,-2,3),330,3,(.61,.78,1))
light('Steel rim',(1,3,4),650,2,(.70,.86,1))
scene.world.color=(.20,.20,.20)
camdata=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',camdata);stage.objects.link(cam);scene.camera=cam
camdata.type='ORTHO';camdata.ortho_scale=2.46;cam.location=(2.6,-6,3);target(cam,(0,0,.88))
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
for im in [base,packed,normal,emission]:im.pack()
# Open .blend in a useful material-preview pose.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=3.2
            area.spaces.active.region_3d.view_location=(0,0,.83)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Ferrha.blend'))
print('Rendering hero',flush=True)
scene.render.filepath=str(OUT/'previews'/'Ferrha_hero.png');bpy.ops.render.render(write_still=True)
cam.location=(0,-6,1.4);target(cam,(0,0,.91));camdata.ortho_scale=2.08
scene.render.filepath=str(OUT/'previews'/'Ferrha_front.png');bpy.ops.render.render(write_still=True)
cam.location=(-2.6,6,2.7);target(cam,(0,0,.90));camdata.ortho_scale=2.3
scene.render.filepath=str(OUT/'previews'/'Ferrha_back.png');bpy.ops.render.render(write_still=True)
cam.location=(3,-5,5);target(cam,(0,0,.85));camdata.ortho_scale=2.35
scene.render.filepath=str(OUT/'previews'/'Ferrha_isometric.png');bpy.ops.render.render(write_still=True)
for size in [40,60,80]:
    scene.render.resolution_x=size;scene.render.resolution_y=size
    scene.render.filepath=str(OUT/'previews'/f'Ferrha_gameplay_{size}px.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report),flush=True)
