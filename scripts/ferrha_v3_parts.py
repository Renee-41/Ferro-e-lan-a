"""Reproducible Ferrha asset. Run with Blender 4.2 Python (bpy + numpy)."""
from pathlib import Path
import bpy, math, json, numpy as np
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'ferrha' / 'v3'
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
    if bone:bind[o.name]=bone
    return o
