"""Reproducible Glacia asset. Run with Blender 4.2 Python (bpy + numpy)."""
from pathlib import Path
import bpy, math, json, numpy as np
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'glacia'
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




# GLACIA_MODEL
skin=material('Warm rose skin',(.54,.325,.215),0,.72)
ivory=material('Pearl white linen',(.76,.81,.81),0,.83)
iceblue=material('Ice blue silk',(.24,.48,.62),0,.68)
cyan=material('Healing cyan trim',(.028,.36,.47),0,.66)
silver=material('Soft silver',(.46,.56,.60),.8,.36)
dark=material('Deep blue sole',(.022,.065,.098),0,.82)
hair=material('Frost blue hair',(.38,.55,.64),0,.72)
hairlight=material('Pearl hair highlights',(.63,.75,.79),0,.68)
eye=material('Gentle ocean eyes',(.008,.022,.039),0,.30)
white=material('Eye light',(.95,.89,.77),0,.4)
lip=material('Smile',(.20,.075,.045),0,.73)
crystal=material('Ice crystal',(.12,.60,.77),.3,.27,.22)
crystalLight=material('Crystal lit facet',(.55,.85,.92),.25,.3,.16)
crystalDark=material('Crystal blue facet',(.047,.29,.47),.35,.31,.10)

# Compact tactical body, same head/limb family as the refined Ferrha.
ball('Tunic',(0,.012,.641),(.237,.168,.238),iceblue,'Spine',36,24,.84)
ball('Neck',(0,0,.861),(.1,.096,.106),skin,'Neck',24,16)
ball('Head',(0,-.005,1.18),(.363,.277,.354),skin,'Head',56,36,.84)
for sign,suf in [(-1,'R'),(1,'L')]:
    ball('Ear.'+suf,(sign*.35,0,1.112),(.041,.044,.062),skin,'Head',20,14)
    ball('Eye.'+suf,(sign*.127,-.276,1.18),(.033,.018,.052),eye,'Head',24,18,.9)
    ball('Eye glint.'+suf,(sign*.127-.008,-.292,1.199),(.01,.006,.014),white,'Head',16,10)
    line('Gentle brow.'+suf,[(sign*.071,-.272,1.270),(sign*.129,-.272,1.280),(sign*.184,-.26,1.263)],.011,hair,'Head')
ball('Nose',(0,-.282,1.118),(.027,.025,.023),skin,'Head',20,14)
line('Welcoming smile',[(-.062,-.266,1.062),(0,-.285,1.045),(.062,-.266,1.062)],.009,lip,'Head')

# Rounded swept bob, two framing locks and a small tied nape, no spiked crown.
hairparts=[];verts=[];faces=[];n=32;rows=10
spow=lambda v:math.copysign(abs(v)**.84,v)
for j in range(rows+1):
    for i in range(n):
        a=2*math.pi*i/n;end=1.12 if math.sin(a)<-.35 else 1.97;theta=.018+(end-.018)*j/rows
        verts.append((.379*spow(math.sin(theta))*spow(math.cos(a)),.295*spow(math.sin(theta))*spow(math.sin(a)),1.18+.370*spow(math.cos(theta))))
for j in range(rows):
    for i in range(n):
        a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
faces.append(tuple(range(n-1,-1,-1)))
m=bpy.data.meshes.new('Soft bob');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Soft bob',m);scene.collection.objects.link(o);finish(o,o.name,hair,'Head',True);hairparts.append(o)
for sign,suf in [(-1,'R'),(1,'L')]:
    hairparts.append(ball('Framing lock.'+suf,(sign*.303,-.124,1.225),(.076,.128,.21),hair,'Head',28,20,.82))
    hairparts.append(ball('Lock tip.'+suf,(sign*.299,-.12,1.067),(.052,.070,.093),hair,'Head',20,16,.8))
hairparts.append(plate('Soft swept fringe',[(-.275,1.36),(-.20,1.477),(.036,1.539),(.20,1.469),(.063,1.423),(-.145,1.349)],-.233,.093,hair,'Head',.023))
hairparts.append(ball('Nape knot',(0,.314,1.064),(.092,.069,.082),hair,'Head',24,16))
line('Hair light',[(-.176,-.251,1.433),(-.062,-.25,1.473),(.06,-.235,1.468)],.009,hairlight,'Head')
# A slim silver headband and a single droplet communicate gentle ice support.
line('Silver circlet',[(-.30,-.157,1.343),(-.17,-.269,1.366),(0,-.292,1.38),(.17,-.269,1.366),(.30,-.157,1.343)],.013,silver,'Head')
plate('Forehead droplet',[(0,1.41),(.028,1.375),(0,1.342),(-.028,1.375)],-.308,.024,crystal,'Head',.003)

robes=[]
for sign,suf in [(-1,'R'),(1,'L')]:
    a=(sign*.25,0,.79);b=(sign*.421,0,.663);c=(sign*.579,-.012,.545)
    ball('Sleeve shoulder.'+suf,a,(.102,.117,.116),ivory,'UpperArm.'+suf,24,18)
    rod('Sleeve.'+suf,a,b,.090,ivory,'UpperArm.'+suf,20,r2=.095)
    ball('Elbow.'+suf,b,(.083,.083,.078),ivory,'Forearm.'+suf,24,16)
    rod('Flowing cuff.'+suf,b,(sign*.525,-.008,.584),.09,iceblue,'Forearm.'+suf,20,r2=.115)
    rod('Cuff silver hem.'+suf,(sign*.508,-.007,.596),(sign*.528,-.008,.581),.112,silver,'Forearm.'+suf,16,r2=.114)
    rod('Wrist.'+suf,(sign*.518,-.008,.59),c,.060,skin,'Forearm.'+suf,16,r2=.048)
    if suf=='R':ball('Hand.R',(-.622,-.017,.518),(.073,.069,.064),skin,'Hand.R',26,18,.8)
    else:
        # An open offering palm reads as a healer, not a second striking fist.
        ball('Open palm',(.625,-.025,.525),(.050,.028,.055),skin,'Hand.L',26,18,.85)
        for i,(z,length) in enumerate([(.488,.042),(.523,.055),(.557,.045)]):
            rod('Relaxed finger.'+str(i),(.654,-.025,z),(.654+length,-.023,z+.009),.014,skin,'Hand.L',12,r2=.012)
            ball('Fingertip.'+str(i),(.654+length,-.023,z+.009),(.013,.013,.014),skin,'Hand.L',16,10)
        rod('Open thumb',(.606,-.025,.561),(.617,-.025,.594),.018,skin,'Hand.L',12,r2=.015)
    rod('Trouser leg.'+suf,(sign*.118,0,.43),(sign*.126,0,.264),.091,cyan,'Thigh.'+suf,20,r2=.074)
    rod('Soft boot.'+suf,(sign*.128,0,.081),(sign*.126,0,.275),.083,ivory,'Shin.'+suf,16,r2=.086)
    box('Shoe.'+suf,(sign*.128,-.053,.07),(.182,.248,.14),iceblue,'Foot.'+suf,.024)
    box('Sole.'+suf,(sign*.128,-.053,.023),(.185,.25,.045),dark,'Foot.'+suf,.012)
    box('Silver shoe band.'+suf,(sign*.128,-.127,.112),(.17,.043,.029),silver,'Foot.'+suf,.008)
    robes.append(ball('Shawl shoulder.'+suf,(sign*.188,.015,.834),(.163,.173,.066),ivory,'Spine',26,16,.82))
    robes.append(plate('Shawl front.'+suf,[(sign*.24,.837),(sign*.045,.832),(0,.692),(sign*.184,.743)],-.162,.043,ivory,'Spine',.013))
    line('Shawl cyan piping.'+suf,[(sign*.216,-.207,.764),(sign*.09,-.209,.72),(0,-.21,.683)],.012,cyan,'Spine')
ball('Waist',(0,.012,.442),(.212,.146,.107),iceblue,'Hips',28,18,.84)
box('Silver sash',(0,.0,.482),(.427,.312,.04),silver,'Hips',.013)
plate('Sash droplet',[(0,.526),(.046,.482),(0,.423),(-.046,.482)],-.171,.03,crystal,'Hips',.004)
# Twelve broad cloth panels; the split colour hem reads without noisy embroidery.
verts=[];faces=[];count=16
for z,rx,ry in [(.478,.218,.149),(.362,.268,.185),(.225,.302,.214)]:
    for i in range(count):
        a=2*math.pi*i/count;hem=.018*math.cos(a*4) if z<.3 else 0
        verts.append((rx*math.cos(a),ry*math.sin(a),z+hem))
for j in range(2):
    for i in range(count):
        a=j*count+i;b=j*count+(i+1)%count;faces.append((a,b,b+count,a+count))
m=bpy.data.meshes.new('Flared robe');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Flared robe',m);scene.collection.objects.link(o);finish(o,o.name,ivory,'Hips',True)
o.data.materials.append(iceblue)
for f in o.data.polygons:
    if f.index%count in [2,3,10,11]:f.material_index=1
bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Cloth thickness','SOLIDIFY');mod.thickness=.012;bpy.ops.object.modifier_apply(modifier=mod.name);robes.append(o)
coords=[(.304*math.cos(2*math.pi*i/32),.216*math.sin(2*math.pi*i/32),.225+.018*math.cos(8*math.pi*i/32)) for i in range(33)]
robes.append(line('Robe hem',coords,.010,cyan,'RobeHem'))
robes.append(plate('Soft back stole',[(-.16,.837),(.16,.837),(.148,.625),(0,.58),(-.148,.625)],.179,.035,iceblue,'Spine',.018))

# A short, blunt crescent cradle supports one large faceted ice droplet.
grip=Vector((-.645,-.025,.518));focus=Vector((-.666,-.025,1.23));before=list(parts)
rod('Pearl scepter',(grip.x+.012,-.025,.292),(focus.x,-.025,1.078),.026,ivory,'Scepter',16,r2=.022)
rod('Cyan scepter grip',(grip.x+.004,-.025,.452),(grip.x-.004,-.025,.602),.034,cyan,'Scepter',16)
for z in [.30,.435,.62,1.05]:rod('Silver ferrule',(grip.x,-.025,z-.015),(grip.x,-.025,z+.015),.034,silver,'Scepter',16)
coords=[(focus.x+.139*math.cos(a),-.025,1.18+.139*math.sin(a)) for a in [math.pi+math.pi*i/14 for i in range(15)]]
line('Crescent cradle',coords,.018,silver,'Scepter')
for sign in [-1,1]:ball('Cradle pearl',(focus.x+sign*.139,-.025,1.18),(.026,.027,.028),iceblue,'Scepter',16,12)
scepter=join([o for o in parts if o not in before],'Scepter','Scepter')
verts=[];fac=[];sides=6
for z,rad in [(1.112,.022),(1.21,.078),(1.287,.065)]:
    for i in range(sides):
        a=2*math.pi*i/sides;verts.append((focus.x+rad*math.cos(a),focus.y+rad*math.sin(a),z))
verts.append((focus.x,focus.y,1.414));top=len(verts)-1
fac.append(tuple(range(sides-1,-1,-1)))
for j in range(2):
    for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;fac.append((a,b,b+sides,a+sides))
for i in range(sides):fac.append((12+i,12+(i+1)%sides,top))
m=bpy.data.meshes.new('Ice droplet');m.from_pydata(verts,[],fac);m.update();o=bpy.data.objects.new('IceCrystal',m);scene.collection.objects.link(o);finish(o,o.name,crystal,'CrystalFocus');o.data.materials.append(crystalLight);o.data.materials.append(crystalDark)
for f in o.data.polygons:f.material_index=f.index%3
ice_mesh=o
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
import bmesh
for o in parts:
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free()
# GLACIA_ATLAS
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
    im=bpy.data.images.new('Glacia_'+name,width=N,height=N,alpha=True)
    im.colorspace_settings.name='Non-Color' if linear else 'sRGB'
    # Blender stores color pixels in linear space and encodes them when saving PNG.
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw=str(OUT/'textures'/('Glacia_'+name+'.png'))
    im.file_format='PNG';im.save();return im
base=tex('BaseColor',rgba)
packed=tex('ORM',orm,True)
rough=np.ones_like(orm);rough[:,:,:3]=orm[:,:,1,None];tex('Roughness',rough,True)
metal=np.ones_like(orm);metal[:,:,:3]=orm[:,:,2,None];tex('Metallic',metal,True)
norm=np.ones_like(orm);norm[:,:,:3]=(.5,.5,1);normal=tex('Normal',norm,True)
emission=tex('Emission',em)
atlas=bpy.data.materials.new('Glacia | 1K PBR atlas');atlas.use_nodes=True
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




# GLACIA_RIG
from mathutils import Euler
bpy.ops.object.select_all(action='DESELECT');armdata=bpy.data.armatures.new('Glacia skeleton');rig=bpy.data.objects.new('Glacia_Rig',armdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
bone('Root',(0,0,0),(0,0,.14));bone('Hips',(0,0,.37),(0,0,.54),'Root');bone('Spine',(0,0,.54),(0,0,.81),'Hips')
bone('Neck',(0,0,.81),(0,0,.936),'Spine');bone('Head',(0,0,.936),(0,0,1.5),'Neck')
for sign,suf in [(-1,'R'),(1,'L')]:
    bone('Clavicle.'+suf,(0,0,.81),(sign*.25,0,.79),'Spine')
    bone('UpperArm.'+suf,(sign*.25,0,.79),(sign*.421,0,.663),'Clavicle.'+suf)
    bone('Forearm.'+suf,(sign*.421,0,.663),(sign*.579,-.012,.545),'UpperArm.'+suf)
    bone('Hand.'+suf,(sign*.579,-.012,.545),(sign*.645,-.025,.518),'Forearm.'+suf)
    bone('Thigh.'+suf,(sign*.118,0,.422),(sign*.126,0,.268),'Hips')
    bone('Shin.'+suf,(sign*.126,0,.268),(sign*.128,0,.07),'Thigh.'+suf)
    bone('Foot.'+suf,(sign*.128,0,.07),(sign*.128,-.17,.07),'Shin.'+suf)
bone('Scepter',grip,grip+Vector((0,0,.20)),'Hand.R');bone('CrystalFocus',focus,focus+Vector((0,0,.10)),'Scepter')
bone('HealPalm',(.625,-.096,.526),(.625,-.15,.526),'Hand.L');bone('RobeHem',(0,0,.39),(0,0,.23),'Hips')
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for o in parts:
    g=o.vertex_groups.new(name=bind[o.name]);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    mod=o.modifiers.new('Glacia skeletal deformation','ARMATURE');mod.object=rig;o.parent=rig
    if o.name in ['Tunic','Flared robe'] or o.name.startswith('Elbow.'):
        o.vertex_groups.clear();suf=o.name[-1:]
        names=('Hips','Spine') if o.name=='Tunic' else ('Hips','RobeHem') if o.name=='Flared robe' else ('UpperArm.'+suf,'Forearm.'+suf)
        a=o.vertex_groups.new(name=names[0]);b=o.vertex_groups.new(name=names[1])
        for v in o.data.vertices:
            value=(v.co.z-.42)/.28 if o.name=='Tunic' else (.47-v.co.z)/.18 if o.name=='Flared robe' else (abs(v.co.x)-.391)/.062
            t=max(0,min(1,value));a.add([v.index],1-t,'REPLACE');b.add([v.index],t,'REPLACE')
hair_mesh=join(hairparts,'Hair');robe_mesh=join(robes,'Robes')
body_mesh=join([o for o in parts if o not in [scepter,ice_mesh,hair_mesh,robe_mesh]],'Glacia_Body')
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    scene.cursor.location=grip if o==scepter else focus if o==ice_mesh else (0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
scene.cursor.location=(0,0,0)
rig['asset']='Glacia / Ferro & Lanca';rig['class']='Suporte';rig['element']='Agua / Gelo'
rig['forward']='-Y Blender / +Z glTF';rig['fx_sockets']='CrystalFocus: ice/healing focus; HealPalm: palm casting origin'
rig['rig_notes']='23-bone FK humanoid, separate scepter/crystal, lightweight RobeHem control; mitten hands; no cloth simulation.'

# Quiet inspection clips: blessing rather than an offensive attack. No gameplay logic or VFX simulation.
rest={p.name:p.bone.matrix_local.copy() for p in rig.pose.bones}
sp=bpy.data.objects.new('Bake upright scepter',None);scene.collection.objects.link(sp);sp.rotation_mode='QUATERNION';sp.rotation_quaternion=rest['Scepter'].to_quaternion()
c=rig.pose.bones['Scepter'].constraints.new('COPY_ROTATION');c.target=sp
def reset():
    for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
def rotate(name,xyz):
    q=rest[name].to_quaternion();rig.pose.bones[name].rotation_quaternion=q.inverted()@Euler(xyz).to_quaternion()@q
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def pose(v,breath=0):
    reset();rotate('Spine',(.006+.004*breath,0,-.025*v));rotate('Head',(-.016,0,.018*v))
    rotate('UpperArm.R',(.035,.15*v,.025));rotate('Forearm.R',(.02,.10*v,0))
    rotate('UpperArm.L',(.045,-.42*v,-.03));rotate('Forearm.L',(-.12*v,-.33*v,0));rotate('Hand.L',(-.90*v,0,0))
    rotate('RobeHem',(.008*breath,0,.012*v))
spec=[('Idle',2.6,lambda t:pose(0,math.sin(2*math.pi*t))),('Blessing_Test',1.5,lambda t:pose(smooth(t/.75))),('Release_Test',1.2,lambda t:pose(1-smooth(t)))]
scene.render.fps=30;baked={}
for name,duration,fn in spec:
    frames=round(duration*30);samples=[]
    for f in range(frames+1):
        scene.frame_set(f);fn(f/frames);bpy.context.view_layer.update();ev=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
        samples.append({p.name:ev.pose.bones[p.name].matrix.copy() for p in rig.pose.bones})
    baked[name]=samples
for c in list(rig.pose.bones['Scepter'].constraints):rig.pose.bones['Scepter'].constraints.remove(c)
bpy.data.objects.remove(sp,do_unlink=True)
for name,duration,fn in spec:
    rig.animation_data_create();a=bpy.data.actions.new(name);rig.animation_data.action=a
    for f,matrices in enumerate(baked[name]):
        reset()
        for p in rig.pose.bones:
            p.matrix_basis=rest[p.name].inverted()@rest[p.parent.name]@matrices[p.parent.name].inverted()@matrices[p.name] if p.parent else rest[p.name].inverted()@matrices[p.name]
            p.keyframe_insert('rotation_quaternion',frame=f,group=p.name);p.keyframe_insert('location',frame=f,group=p.name)
    for fc in a.fcurves:
        for k in fc.keyframe_points:k.interpolation='LINEAR'
    a.use_fake_user=True;tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,a);tr.mute=True
rig.animation_data.action=None;reset();scene.frame_set(0)
for im in [base,packed,normal,emission]:im.pack()
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Glacia.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_tangents=True)
for o in parts:o.data.calc_loop_triangles()
report={'name':'Glacia','class':'Suporte','element':'Agua / Gelo','base_branch':'main','base_commit':'b0b69128a84c994643234f5c106e1532a039c5e3','triangles':sum(len(o.data.loop_triangles) for o in parts),'mesh_objects':len(parts),'meshes':[o.name for o in parts],'bones':len(armdata.bones),'materials':1,'texture_resolution':1024,'texture_maps':['BaseColor','Normal','Roughness','Metallic','ORM','Emission'],'normal_map':'Neutral tangent-space; large forms modeled','unit':'metre','root_pivot':[0,0,0],'rest_pose':'A-pose','head_height_m':.708,'height_m':1.55,'weapon':'Scepter','weapon_origin':'right hand grip centre','fx_sockets':['CrystalFocus','HealPalm'],'fx_status':'Attachment bones and subtle crystal emission provided; no gameplay particle effects included','clips':[n for n,d,fn in spec],'animation_status':'Starter idle/blessing/release inspection clips, not a full gameplay set','rig':'23-bone FK humanoid, blended elbows/waist/robe hem; separate focus; no cloth simulation or facial rig','visual_reference':'Refined Ferrha tactical family; original calm ice/water healer','validation':{}}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
# GLACIA_STUDIO

# Studio stays in the .blend, excluded from the exported runtime asset.
stage=bpy.data.collections.new('PREVIEW ONLY');scene.collection.children.link(stage)
def staging(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    stage.objects.link(o)
floor=material('Preview floor',(.022,.032,.042),.05,.76)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));o=bpy.context.object;o.name='Preview ground';o.data.materials.append(floor);staging(o)
def target(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Warm key',(-3,-4,6),440,4,(1,.85,.72)),('Cool fill',(3,-2,3),310,3,(.66,.79,1)),('Sea rim',(1,3,4),530,2,(.55,.85,1))]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);stage.objects.link(o);o.location=loc;target(o,(0,0,.8))
scene.world.color=(.20,.20,.20)
d=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',d);stage.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.8;cam.location=(2.8,-6,3);target(cam,(0,0,.9))
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.view_settings.view_transform='AgX'
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Glacia.blend'))
if '--no-render' not in __import__('sys').argv:
    rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
    for name,loc in [('hero',(2.8,-6,3)),('front',(0,-6,1.65)),('back',(-2.8,6,2.8)),('profile',(6,-.3,2)),('isometric',(3,-5,5))]:
        cam.location=loc;target(cam,(0,0,.88));scene.render.filepath=str(OUT/'previews'/f'Glacia_{name}.png');bpy.ops.render.render(write_still=True)
    rig.animation_data.action=bpy.data.actions['Blessing_Test'];scene.frame_set(45);cam.location=(2.8,-6,3);target(cam,(0,0,.88));scene.render.filepath=str(OUT/'previews'/'Glacia_blessing.png');bpy.ops.render.render(write_still=True)
    rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);cam.location=(3,-5,5);target(cam,(0,0,.88))
    for size in [40,60,80]:
        scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.filepath=str(OUT/'previews'/f'Glacia_gameplay_{size}px.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report),flush=True)
# Embedded bpy can retain worker threads after all exports/renders have finished.
__import__('sys').stdout.flush();__import__('sys').stderr.flush();__import__('os')._exit(0)



