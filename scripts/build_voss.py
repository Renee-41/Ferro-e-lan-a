"""Reproducible Voss asset. Run with Blender 4.2 Python (bpy + numpy)."""
from pathlib import Path
import bpy, math, json, numpy as np
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'voss'
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



# VOSS_MODEL
skin=material('Warm coastal skin',(.50,.285,.155),0,.7)
ocean=material('Ocean blue canvas',(.023,.105,.17),0,.8)
teal=material('Turquoise mantle',(.025,.31,.32),0,.72)
bronze=material('Weathered bronze',(.38,.21,.078),.78,.4)
steel=material('Harpoon steel',(.25,.34,.36),.87,.32)
beige=material('Sailcloth linen',(.66,.53,.32),0,.86)
leather=material('Light saddle leather',(.27,.135,.063),0,.8)
dark=material('Dark sole and bowstring',(.021,.029,.034),0,.82)
hair=material('Deep brown hair',(.044,.036,.030),0,.67)
hairlight=material('Hair broad highlights',(.10,.069,.043),0,.67)
eye=material('Obsidian eyes',(.006,.012,.016),0,.29)
white=material('Ivory eye highlights',(.9,.84,.67),0,.42)
lip=material('Expression',(.19,.072,.033),0,.7)
lens=material('Blue glass sight',(.027,.43,.49),.35,.23)

# Refined Ferrha family: compact torso, short limbs and a 0.71 m head, no exaggerated anatomy.
ball('Tunic',(0,.015,.647),(.244,.17,.242),ocean,'Spine',36,24,.83)
ball('Neck',(0,0,.867),(.101,.101,.108),skin,'Neck',24,16)
ball('Head',(0,-.005,1.185),(.365,.277,.355),skin,'Head',56,36,.83)
for sign,suf in [(-1,'R'),(1,'L')]:
    ball('Ear.'+suf,(sign*.353,.0,1.12),(.044,.045,.065),skin,'Head',20,14)
    ball('Eye.'+suf,(sign*.126,-.276,1.185),(.035,.019,.053),eye,'Head',24,18,.87)
    ball('Eye glint.'+suf,(sign*.126-.008,-.293,1.202),(.01,.006,.014),white,'Head',16,10)
    line('Brow.'+suf,[(sign*.073,-.279,1.264),(sign*.17,-.265,1.280+(suf=='L')*.014)],.013,hair,'Head')
ball('Nose',(0,-.283,1.126),(.028,.026,.025),skin,'Head',20,14)
line('Confident smile',[(-.055,-.27,1.055),(.012,-.286,1.050),(.070,-.266,1.071)],.008,lip,'Head')
rod('Bronze ear stud',(.386,-.034,1.103),(.386,-.048,1.103),.019,bronze,'Head',12)

# Swept crop and short tied tail, explicitly outside the rounded head surface.
hairparts=[];verts=[];faces=[];n=32;rows=10
spow=lambda v:math.copysign(abs(v)**.83,v)
for j in range(rows+1):
    for i in range(n):
        a=2*math.pi*i/n;end=1.12 if math.sin(a)<-.35 else 1.91;theta=.018+(end-.018)*j/rows
        verts.append((.38*spow(math.sin(theta))*spow(math.cos(a)),.294*spow(math.sin(theta))*spow(math.sin(a)),1.185+.366*spow(math.cos(theta))))
for j in range(rows):
    for i in range(n):
        a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
m=bpy.data.meshes.new('Swept hair cap');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Swept hair cap',m);scene.collection.objects.link(o);finish(o,o.name,hair,'Head',True);hairparts.append(o)
for name,outline,y,depth in [
    ('Swept forelock',[(-.30,1.36),(-.22,1.48),(.08,1.56),(.27,1.49),(.12,1.45),(-.20,1.30)],-.252,.11),
    ('Temple lock',[(-.33,1.38),(-.26,1.38),(-.28,1.16),(-.35,1.12),(-.36,1.28)],-.139,.19)]:
    hairparts.append(plate(name,outline,y,depth,hair,'Head',.018))
hairparts.append(ball('Tied tail',(0,.329,1.08),(.105,.097,.145),hair,'Head',24,18,.8))
hairparts.append(ball('Tail tip',(.035,.395,.954),(.077,.069,.079),hair,'Head',20,14,.78))
hairparts.append(rod('Tail clasp',(-.087,.327,1.13),(.087,.327,1.13),.024,bronze,'Head',12))
line('Hair sweep highlight',[(-.18,-.272,1.444),(-.03,-.276,1.488),(.13,-.256,1.486)],.008,hairlight,'Head')

# Short shoulder mantle rather than a long silhouette competing with the crossbow.
mantle=[]
mantle.append(ball('Left mantle shoulder',(.245,.035,.83),(.15,.177,.082),teal,'Spine',24,16,.75))
mantle.append(plate('Short shoulder tail',[(.08,.85),(.34,.85),(.36,.55),(.25,.507),(.11,.59)],.165,.047,teal,'Spine',.012))
line('Mantle seam',[(.11,.225,.604),(.25,.224,.53),(.341,.218,.565)],.011,beige,'Spine')
for sign,suf in [(-1,'R'),(1,'L')]:
    box('Standing collar.'+suf,(sign*.092,-.095,.846),(.105,.083,.07),beige,'Spine',.012)
    a=(sign*.255,0,.80);b=(sign*.431,0,.672);c=(sign*.591,-.012,.55)
    ball('Sleeve shoulder.'+suf,a,(.104,.119,.118),beige,'UpperArm.'+suf,24,18)
    rod('Sleeve.'+suf,a,b,.091,beige,'UpperArm.'+suf,20,r2=.078)
    ball('Elbow.'+suf,b,(.081,.084,.080),beige,'Forearm.'+suf,24,16)
    rod('Forearm.'+suf,b,c,.078,skin,'Forearm.'+suf,20,r2=.058)
    rod('Glove cuff.'+suf,(sign*.54,-.009,.588),c,.076,leather,'Forearm.'+suf,16,r2=.066)
    ball('Glove.'+suf,(sign*.635,-.016,.521),(.075,.074,.071),leather,'Hand.'+suf,26,18,.78)
    box('Glove back.'+suf,(sign*.635,-.076,.531),(.082,.030,.046),bronze,'Hand.'+suf,.009)
    rod('Trouser leg.'+suf,(sign*.12,0,.43),(sign*.13,0,.256),.099,ocean,'Thigh.'+suf,20,r2=.080)
    ball('Knee.'+suf,(sign*.13,-.014,.268),(.082,.086,.083),ocean,'Shin.'+suf,24,16)
    rod('Sea boot.'+suf,(sign*.133,0,.083),(sign*.13,0,.281),.083,leather,'Shin.'+suf,16,r2=.091)
    box('Boot.'+suf,(sign*.133,-.058,.075),(.188,.261,.15),leather,'Foot.'+suf,.025)
    box('Sole.'+suf,(sign*.133,-.058,.026),(.19,.265,.05),dark,'Foot.'+suf,.014)
    rod('Boot turn-down.'+suf,(sign*.13,0,.249),(sign*.13,0,.285),.098,beige,'Shin.'+suf,16)
    box('Boot buckle.'+suf,(sign*.135,-.098,.208),(.044,.021,.036),bronze,'Shin.'+suf,.005)
ball('Waist',(0,.017,.438),(.219,.151,.115),ocean,'Hips',28,18,.82)
box('Utility belt',(0,.0,.48),(.455,.323,.054),leather,'Hips',.014)
box('Compass buckle',(0,-.18,.48),(.074,.035,.065),bronze,'Hips',.009)
line('Cross strap',[(-.188,-.12,.839),(-.087,-.181,.738),(.074,-.181,.581),(.183,-.132,.512)],.026,leather,'Spine')
box('Hip pouch',(.239,.002,.428),(.12,.16,.164),leather,'Hips',.018)
box('Pouch flap',(.241,-.087,.473),(.13,.025,.07),beige,'Hips',.009)
# Rope loops and spare barbed bolts read as hunting equipment, not magic props.
for i in range(2):
    coords=[(-.218+.050*math.cos(a),-.105-i*.018,.424+.061*math.sin(a)) for a in [2*math.pi*j/20 for j in range(21)]]
    line('Belt rope.'+str(i),coords,.011,beige,'Hips')
box('Back bolt case',(-.108,.193,.649),(.137,.099,.244),leather,'Spine',.014)
for i in range(3):
    x=-.153+i*.044;rod('Spare bolt.'+str(i),(x,.197,.685),(x,.197,.954),.011,steel,'Spine',8)
    plate('Bolt fletch.'+str(i),[(x-.021,.91),(x-.026,.952),(x,.975),(x+.020,.942),(x+.015,.915)],.185,.025,beige,'Spine',.003)

# Harpoon crossbow: strong transverse bow, central rail, barbed bolt and bronze line reel.
before=list(parts);grip=Vector((-.658,-.026,.521));weaponbone='HarpoonCrossbow';x=grip.x
box('Crossbow stock',(x,.035,.595),(.096,.305,.087),leather,weaponbone,.015)
box('Trigger grip',(x,-.027,.525),(.083,.096,.150),leather,weaponbone,.013)
box('Bronze receiver',(x,-.163,.608),(.12,.157,.095),bronze,weaponbone,.012)
box('Turquoise rail',(x,-.378,.624),(.084,.415,.063),ocean,weaponbone,.01)
rod('Bolt rail',(x,-.17,.674),(x,-.735,.674),.018,steel,weaponbone,12)
box('Support grip',(x,-.285,.566),(.10,.142,.055),leather,weaponbone,.009)
# Flattened bow limbs curve forward into a broad, unmistakable ranged silhouette.
for sign in [-1,1]:
    line('Bow bronze rim',[(x,-.50,.634),(x+sign*.18,-.525,.63),(x+sign*.32,-.445,.624)],.033,bronze,weaponbone)
    line('Bow turquoise limb',[(x+sign*.06,-.508,.655),(x+sign*.18,-.535,.65),(x+sign*.30,-.46,.644)],.024,teal,weaponbone)
    rod('Bowstring',(x+sign*.32,-.445,.624),(x,-.196,.632),.007,dark,weaponbone,8)
    # Strong visible barbs on the oversized harpoon point.
    line('Harpoon barb',[(x,-.773,.674),(x+sign*.071,-.672,.674),(x+sign*.055,-.742,.674)],.016,bronze,weaponbone)
rod('Harpoon shaft',(x,-.19,.682),(x,-.821,.682),.014,steel,weaponbone,12)
rod('Harpoon point',(x,-.78,.682),(x,-.912,.682),.041,steel,weaponbone,8,r2=0)
rod('Reel spindle',(x-.10,-.112,.59),(x-.18,-.112,.59),.064,bronze,weaponbone,16)
rod('Reel rope',(x-.109,-.112,.59),(x-.165,-.112,.59),.051,beige,weaponbone,16)
rod('Reel cap',(x-.17,-.112,.59),(x-.189,-.112,.59),.066,bronze,weaponbone,16)
rod('Sight',(x,-.17,.722),(x,-.29,.722),.029,bronze,weaponbone,12)
rod('Sight lens',(x,-.292,.722),(x,-.30,.722),.024,lens,weaponbone,12)
weapon=join([o for o in parts if o not in before],weaponbone,weaponbone)
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# VOSS_ATLAS
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
    im=bpy.data.images.new('Voss_'+name,width=N,height=N,alpha=True)
    im.colorspace_settings.name='Non-Color' if linear else 'sRGB'
    # Blender stores color pixels in linear space and encodes them when saving PNG.
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw=str(OUT/'textures'/('Voss_'+name+'.png'))
    im.file_format='PNG';im.save();return im
base=tex('BaseColor',rgba)
packed=tex('ORM',orm,True)
rough=np.ones_like(orm);rough[:,:,:3]=orm[:,:,1,None];tex('Roughness',rough,True)
metal=np.ones_like(orm);metal[:,:,:3]=orm[:,:,2,None];tex('Metallic',metal,True)
norm=np.ones_like(orm);norm[:,:,:3]=(.5,.5,1);normal=tex('Normal',norm,True)
emission=tex('Emission',em)
atlas=bpy.data.materials.new('Voss | 1K PBR atlas');atlas.use_nodes=True
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



# VOSS_RIG
from mathutils import Euler,Matrix
bpy.ops.object.select_all(action='DESELECT');armdata=bpy.data.armatures.new('Voss skeleton');rig=bpy.data.objects.new('Voss_Rig',armdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
bone('Root',(0,0,0),(0,0,.14));bone('Hips',(0,0,.37),(0,0,.54),'Root')
bone('Spine',(0,0,.54),(0,0,.81),'Hips');bone('Neck',(0,0,.81),(0,0,.94),'Spine');bone('Head',(0,0,.94),(0,0,1.50),'Neck')
for sign,suf in [(-1,'R'),(1,'L')]:
    bone('Clavicle.'+suf,(0,0,.81),(sign*.255,0,.80),'Spine')
    bone('UpperArm.'+suf,(sign*.255,0,.80),(sign*.431,0,.672),'Clavicle.'+suf)
    bone('Forearm.'+suf,(sign*.431,0,.672),(sign*.591,-.012,.55),'UpperArm.'+suf)
    bone('Hand.'+suf,(sign*.591,-.012,.55),(sign*.658,-.026,.521),'Forearm.'+suf)
    bone('Thigh.'+suf,(sign*.12,0,.422),(sign*.13,0,.268),'Hips')
    bone('Shin.'+suf,(sign*.13,0,.268),(sign*.133,0,.075),'Thigh.'+suf)
    bone('Foot.'+suf,(sign*.133,0,.075),(sign*.133,-.17,.075),'Shin.'+suf)
support=Vector((grip.x,-.285,.566))
bone(weaponbone,grip,grip+Vector((0,-.2,0)),'Hand.R');bone('SupportGrip',support,support+Vector((0,-.08,0)),weaponbone)
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for o in parts:
    g=o.vertex_groups.new(name=bind[o.name]);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    mod=o.modifiers.new('Voss skeletal deformation','ARMATURE');mod.object=rig;o.parent=rig
    if o.name=='Tunic' or o.name.startswith('Elbow.'):
        o.vertex_groups.clear();isbody=o.name=='Tunic';suf=o.name[-1:]
        a=o.vertex_groups.new(name='Hips' if isbody else 'UpperArm.'+suf);b=o.vertex_groups.new(name='Spine' if isbody else 'Forearm.'+suf)
        for v in o.data.vertices:
            t=max(0,min(1,(v.co.z-.42)/.28 if isbody else (abs(v.co.x)-.40)/.063));a.add([v.index],1-t,'REPLACE');b.add([v.index],t,'REPLACE')
hair_mesh=join(hairparts,'Hair');mantle_mesh=join(mantle,'ShoulderMantle')
body_mesh=join([o for o in parts if o not in [weapon,hair_mesh,mantle_mesh]],'Voss_Body')
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    scene.cursor.location=grip if o==weapon else (0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
scene.cursor.location=(0,0,0)
rig['asset']='Voss / Ferro & Lanca';rig['class']='Atirador';rig['element']='Agua'
rig['forward']='-Y Blender / +Z glTF';rig['rig_notes']='21-bone humanoid; right-hand crossbow and left SupportGrip socket; mitten hands; no facial rig.'

# Temporary two-arm IK proves a usable two-hand aim; baked FK needs no runtime solver.
rest={p.name:p.bone.matrix_local.copy() for p in rig.pose.bones};temporary=[];hands={}
for suf in ['R','L']:
    o=bpy.data.objects.new('Bake wrist '+suf,None);scene.collection.objects.link(o);o.rotation_mode='QUATERNION';temporary.append(o);hands[suf]=o
    c=rig.pose.bones['Forearm.'+suf].constraints.new('IK');c.chain_count=2;c.use_tail=True;c.target=o
    c=rig.pose.bones['Hand.'+suf].constraints.new('COPY_ROTATION');c.target=o
sp=bpy.data.objects.new('Bake crossbow',None);scene.collection.objects.link(sp);sp.rotation_mode='QUATERNION';temporary.append(sp)
c=rig.pose.bones[weaponbone].constraints.new('COPY_TRANSFORMS');c.target=sp
def reset():
    for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
def rotate(name,xyz):
    q=rest[name].to_quaternion();rig.pose.bones[name].rotation_quaternion=q.inverted()@Euler(xyz).to_quaternion()@q
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def pose(aim,breath=0,recoil=0):
    reset();q=Euler((.04*aim,0,.70*aim)).to_quaternion()
    position=grip.lerp(Vector((-.18,-.17,.67)),aim)+q@Vector((0,.032*recoil,.002*breath))
    sp.location=position;sp.rotation_quaternion=q@rest[weaponbone].to_quaternion()
    hands['R'].location=position+q@Vector((.067,.014,.029));hands['R'].rotation_quaternion=q@rest['Hand.R'].to_quaternion()
    leftgrip=position+q@(support-grip)
    leftrotation=q@Euler((0,0,math.pi)).to_quaternion()
    hands['L'].location=rest['Hand.L'].translation.lerp(leftgrip+leftrotation@Vector((-.067,.014,.029)),aim)
    hands['L'].rotation_quaternion=rest['Hand.L'].to_quaternion().slerp(leftrotation@rest['Hand.L'].to_quaternion(),aim)
    rotate('Spine',(.02+.025*aim+.003*breath,0,.20*aim));rotate('Head',(-.012,0,.48*aim))
    for sign,suf in [(-1,'R'),(1,'L')]:rotate('Forearm.'+suf,(.035,0,sign*.04))
spec=[('Idle',2.4,lambda t:pose(0,math.sin(2*math.pi*t))),('Aim_Test',1.2,lambda t:pose(smooth(t/.75))),('Recoil_Test',.7,lambda t:pose(1,0,math.sin(math.pi*min(1,t/.6)) if t<.6 else 0))]
scene.render.fps=30;baked={}
for name,duration,fn in spec:
    frames=round(duration*30);samples=[]
    for f in range(frames+1):
        scene.frame_set(f);fn(f/frames);bpy.context.view_layer.update();ev=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
        samples.append({p.name:ev.pose.bones[p.name].matrix.copy() for p in rig.pose.bones})
    baked[name]=samples
for p in rig.pose.bones:
    for c in list(p.constraints):p.constraints.remove(c)
for o in temporary:bpy.data.objects.remove(o,do_unlink=True)
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
bpy.ops.export_scene.gltf(filepath=str(OUT/'Voss.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_tangents=True)
for o in parts:o.data.calc_loop_triangles()
report={'name':'Voss','class':'Atirador','element':'Agua','base_branch':'main','base_commit':'b0b69128a84c994643234f5c106e1532a039c5e3','triangles':sum(len(o.data.loop_triangles) for o in parts),'mesh_objects':len(parts),'meshes':[o.name for o in parts],'bones':len(armdata.bones),'materials':1,'texture_resolution':1024,'texture_maps':['BaseColor','Normal','Roughness','Metallic','ORM','Emission'],'normal_map':'Neutral tangent-space; large forms modeled','unit':'metre','root_pivot':[0,0,0],'rest_pose':'A-pose','head_height_m':.71,'height_m':1.56,'weapon':'HarpoonCrossbow','weapon_origin':'right hand grip centre','support_socket':'SupportGrip','clips':[n for n,d,fn in spec],'animation_status':'Starter aim/recoil inspection clips, not a full gameplay animation set','rig':'21-bone FK humanoid, temporary arm IK baked and removed, blended elbows/waist, rigid weapon and mantle','visual_reference':'Refined Ferrha tactical family; original maritime explorer and ocean hunter','validation':{}}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
# VOSS_STUDIO

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
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Voss.blend'))
if '--no-render' not in __import__('sys').argv:
    rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
    for name,loc in [('hero',(2.8,-6,3)),('front',(0,-6,1.65)),('back',(-2.8,6,2.8)),('profile',(6,-.3,2)),('isometric',(3,-5,5))]:
        cam.location=loc;target(cam,(0,0,.88));scene.render.filepath=str(OUT/'previews'/f'Voss_{name}.png');bpy.ops.render.render(write_still=True)
    rig.animation_data.action=bpy.data.actions['Aim_Test'];scene.frame_set(36);cam.location=(2.8,-6,3);target(cam,(0,0,.88));scene.render.filepath=str(OUT/'previews'/'Voss_aim.png');bpy.ops.render.render(write_still=True)
    rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);cam.location=(3,-5,5);target(cam,(0,0,.88))
    for size in [40,60,80]:
        scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.filepath=str(OUT/'previews'/f'Voss_gameplay_{size}px.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report),flush=True)


