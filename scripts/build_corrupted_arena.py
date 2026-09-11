"""Variant of the approved board: reuse meshes/UVs; repaint the atlas and add peripheral crystals."""
from pathlib import Path
import bpy, numpy as np, math, json
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/arenas/hexagonal';OUT=ROOT/'assets/arenas/corrupted'
for part in ['', 'textures', 'modules']:(OUT/part).mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'Arena_Hexagonal.blend'))
scene=bpy.context.scene

# Keep the approved brushwork and its four UV quadrants. No new texture density.
source=bpy.data.images['Arena_BaseColor'];N=source.size[0];T=N//2
pixels=np.array(source.pixels[:],dtype=np.float32).reshape(N,N,4)
emission=np.zeros_like(pixels);emission[:,:,3]=1
Y,X=np.mgrid[-1.12:1.12:complex(T),-1.12:1.12:complex(T)]
radius=np.hypot(X,Y)
colors=[(.33,.235,.285),(.26,.275,.31),(.36,.33,.405),(.295,.215,.33)]
for k,color in enumerate(colors):
    iy,ix=k//2,k%2;part=pixels[iy*T:(iy+1)*T,ix*T:(ix+1)*T,:3]
    old=part.copy();luma=old.mean(axis=2);wash=np.clip(luma/np.median(luma),.68,1.3)
    part[:]=np.array(color)*wash[:,:,None]
    moss=(old[:,:,1]>old[:,:,0]*1.05)&(old[:,:,0]>old[:,:,2]*1.5)
    part[moss]=np.array([.18,.16,.13])*wash[moss,None]
    edge=emission[iy*T:(iy+1)*T,ix*T:(ix+1)*T,:3]
    # Angular veins and broken glyph segments stop outside the clear placement zone.
    for i in range(2 if k!=3 else 3):
        a=i*math.tau/3+k*.7;p=np.array([math.cos(a),math.sin(a)])*.80
        for seg in range(3):
            angle=a+(.48 if seg%2 else -.30)
            q=p-np.array([math.cos(angle),math.sin(angle)])*.075
            d=q-p;u=np.clip(((X-p[0])*d[0]+(Y-p[1])*d[1])/(d@d),0,1)
            dist=np.hypot(X-p[0]-u*d[0],Y-p[1]-u*d[1])
            border=(dist<.015-seg*.002)&(radius>.55)
            core=(dist<.0065-seg*.001)&(radius>.55)
            part[border]=(.048,.022,.058)
            if k!=0:
                part[core]=(.46,.045,.25) if k!=2 else (.31,.05,.38)
                edge[core]=(.65,.012,.23) if k!=2 else (.36,.016,.60)
            p=q
    # Tiny interrupted runes along two edges; none underneath unit feet.
    if k==3:
        mark=(abs(X+.64)<.009)&(abs(Y)<.16)&(abs(Y)>.045)
        part[mark]=(.39,.06,.25);edge[mark]=(.38,.018,.16)

def image(name,data):
    im=bpy.data.images.new(name,width=N,height=N,alpha=True)
    im.colorspace_settings.name='sRGB';im.pixels.foreach_set(data.ravel())
    im.filepath_raw=str(OUT/'textures'/f'{name}.png');im.file_format='PNG';im.save();im.pack();return im
albedo=image('Corrupted_BaseColor',pixels);glow=image('Corrupted_Emission',emission)
paint=bpy.data.materials['Terreno | atlas pintado 2K'];nodes=paint.node_tree.nodes
for n in nodes:
    if n.type=='TEX_IMAGE' and n.image==source:n.image=albedo
shader=nodes.get('Principled BSDF');n=nodes.new('ShaderNodeTexImage');n.image=glow
paint.node_tree.links.new(n.outputs['Color'],shader.inputs['Emission Color']);shader.inputs['Emission Strength'].default_value=1.25
palette={
 'Basalto | borda externa':(.029,.020,.043),
 'Basalto | chanfro iluminado':(.125,.087,.163),
 'Pedra cinza azulada':(.132,.098,.173),
 'Pedra | arestas pintadas':(.19,.145,.23),
 'Ferro envelhecido':(.059,.038,.078),
 'Bronze fosco | marcadores':(.23,.105,.19),
 'Musgo esculpido':(.10,.071,.106),
 'Ruinas distantes':(.037,.025,.067),
 'Ruinas | planos largos':(.080,.054,.125),
}
for name,color in palette.items():
    m=bpy.data.materials.get(name)
    if m:
        p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
        p.inputs['Roughness'].default_value=.9;m.diffuse_color=(*color,1)

def material(name,color,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.58
    p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
    return m
crystal=material('Cristal corrompido',(.14,.024,.20))
facet=material('Cristal | face energetica',(.42,.025,.22),.5)
verts=[];faces=[];indices=[]
clusters=[(-8.0,-2.5),(8.0,-2.0),(-7.2,4.8),(7.1,4.9),(-3.4,8.3),(3.8,8.4)]
for k,(x,y) in enumerate(clusters):
    for j in range(3):
        h=[1.15,.70,.48][j];r=[.30,.22,.16][j];cx=x+(j-1)*.36;cy=y+(j%2)*.22
        start=len(verts)
        verts.extend([(cx+r*math.cos(i*math.tau/5),cy+r*math.sin(i*math.tau/5),-.2) for i in range(5)])
        verts.append((cx+.15*(-1)**k,cy+.1,h))
        faces.append(tuple(start+i for i in range(4,-1,-1)));indices.append(0)
        for i in range(5):faces.append((start+i,start+(i+1)%5,start+5));indices.append(1 if i==k%5 else 0)
mesh=bpy.data.meshes.new('Crystals_shared');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Corrupted_crystals_periphery',mesh);bpy.data.collections['04_BACKGROUND'].objects.link(obj)
mesh.materials.append(crystal);mesh.materials.append(facet)
for p,idx in zip(mesh.polygons,indices):p.material_index=idx
uv=mesh.uv_layers.new(name='UVMap')
for loop in mesh.loops:
    v=mesh.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*.1,v.z*.1)

cols=['01_BOARD','02_FOUNDATION','03_BORDER_DECOR','04_BACKGROUND']
assets=[o for name in cols for o in bpy.data.collections[name].objects if o.type=='MESH']
def export(name,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.hide_set(False);o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',use_selection=True,
        export_animations=False,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
export('Arena_Hexagonal.glb',assets)
export('Arena_Tabuleiro.glb',[o for o in assets if o.name not in bpy.data.collections['04_BACKGROUND'].objects])
export('Arena_Cenario.glb',list(bpy.data.collections['04_BACKGROUND'].objects))
templates=sorted(bpy.data.collections['05_MODULE_LIBRARY'].objects,key=lambda o:o.name)
for name,o in zip(['Hex_Terra_Corrompida','Hex_Musgo_Sombrio','Hex_Pedra_Rachada','Hex_Veias_Energeticas'],templates):
    o.hide_viewport=False;o.location=(0,0,0);export('modules/'+name+'.glb',[o]);o.hide_viewport=True
layout=json.loads((BASE/'layout.json').read_text(encoding='utf-8'));layout['biome']='corrupted'
layout['variants']=['dead_earth','shadow_moss','cracked_stone','energy_veins']
(OUT/'layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
# Embed inherited PBR maps in the variant source; originals remain untouched.
for im in bpy.data.images:
    if im.name.startswith('Arena_') and not im.packed_file:im.pack()
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.065,.19,1)
for o in bpy.data.collections['PREVIEW_ONLY'].objects:
    if o.type=='LIGHT':o.data.color=(.8,.7,1) if o.location.y>0 else (.9,.84,1)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Arena_Corrompida.blend'))
print(json.dumps({'tiles':61,'variants':4,'new_crystal_triangles':sum(len(p.vertices)-2 for p in mesh.polygons),
 'clear_center_radius_m':.55,'extra_materials':2,'atlas_size':N,'source_preserved':True}),flush=True)
