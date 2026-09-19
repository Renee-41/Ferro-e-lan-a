"""Ferro & Lanca: modular painted hex arena. Blender 4.2 / bpy + numpy.

The input image informs the raised rims and painted inset surfaces only.
Coordinates match game.js: flat-top axial hexes, radius four (61 cells).
"""
from pathlib import Path
from math import sin, cos, pi, sqrt
import bpy, bmesh, numpy as np, math, json, random, sys
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]/'assets'/'arenas'/'hexagonal'
for d in ['', 'textures', 'modules', 'previews']:(OUT/d).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
random.seed(17)
collections={}
for name in ['01_BOARD','02_FOUNDATION','03_BORDER_DECOR','04_BACKGROUND','05_MODULE_LIBRARY','PREVIEW_ONLY']:
    c=bpy.data.collections.new(name);scene.collection.children.link(c);collections[name]=c
def link(o,col):
    for c in list(o.users_collection):c.objects.unlink(o)
    collections[col].objects.link(o);return o
def material(name,color,rough=.8,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*color,1);return m
rim=material('Basalto | borda externa',(.038,.055,.062),.78)
rimlight=material('Basalto | chanfro iluminado',(.094,.128,.133),.72)
stone=material('Pedra cinza azulada',(.145,.20,.207),.88)
stoneLight=material('Pedra | arestas pintadas',(.25,.32,.315),.82)
iron=material('Ferro envelhecido',(.063,.086,.092),.65,.25)
bronze=material('Bronze fosco | marcadores',(.30,.205,.075),.66,.35)
moss=material('Musgo esculpido',(.155,.225,.065),1)
far=material('Ruinas distantes',(.046,.091,.105),.95)
farLight=material('Ruinas | planos largos',(.077,.139,.15),.96)

# Two-by-two 2K atlas, with broad painterly patches rather than photographic noise.
# Each 1024px quadrant is a reusable terrain variant. Linear RGB authored explicitly.
N=2048;T=N//2
base=np.ones((N,N,4),np.float32);rough=np.ones((N,N,4),np.float32)
normal=np.ones((N,N,4),np.float32);normal[:,:,:3]=(.5,.5,1)
orm=np.ones((N,N,4),np.float32);orm[:,:,2]=0;orm[:,:,1]=.89
Y,X=np.mgrid[-1.12:1.12:complex(T),-1.12:1.12:complex(T)]
apothem=.94*sqrt(3)/2
ed=np.maximum.reduce([X*cos(pi/6+i*pi/3)+Y*sin(pi/6+i*pi/3) for i in range(6)])/apothem
for k in range(4):
    rng=np.random.default_rng(711+k)
    # Quiet earth centre, moss/stone only around the rim.
    colors=[(.385,.287,.149),(.345,.278,.140),(.30,.325,.273),(.35,.265,.151)]
    c=np.empty((T,T,3),np.float32);c[:]=colors[k]
    cloud=np.zeros_like(X)
    for f,amp in [(2.8,.10),(6.5,.045),(14,.020),(31,.008)]:
        a,b=rng.uniform(0,6,2);cloud+=amp*np.sin(X*f+a)*np.cos(Y*f*.79+b)
    # Quantized, overlapping colour washes simulate broad flat brush strokes.
    cloud=np.round(cloud*45)/45
    c*=1+cloud[:,:,None]
    wash=np.maximum(0,1-(X*.69)**2-(Y*.65)**2)*.037
    c+=wash[:,:,None]*np.array([1,.91,.61])
    grass_edge=.72 if k==1 else .84
    if k==2:grass_edge=.94
    wave=.075*np.sin(X*14+Y*9+k)+.032*np.cos(Y*28-X*5)
    grass=(ed>grass_edge+wave)&(ed<1.025)
    grassColor=np.stack([.125+.022*cloud,.188+.040*cloud,.057+.016*cloud],axis=-1)
    c[grass]=grassColor[grass]
    # Discrete broad leaves at selected margins, not high-frequency fur.
    for i in range(34 if k==1 else 20):
        a=rng.uniform(0,2*pi);rad=rng.uniform(.61,.79)
        px,py=rad*cos(a),rad*sin(a)
        dx,dy=X-px,Y-py;orient=a+rng.uniform(-1,1)
        lx=dx*cos(orient)+dy*sin(orient);ly=-dx*sin(orient)+dy*cos(orient)
        leaf=(abs(lx)/rng.uniform(.023,.040)+abs(ly)/rng.uniform(.055,.09)<1)&grass
        c[leaf]=(.205,.28,.082) if i%3 else (.105,.159,.037)
    # Flat painted pebbles positioned outside the navigable centre.
    for i in range(8 if k!=2 else 16):
        a=rng.uniform(0,2*pi);rad=rng.uniform(.61,.77)
        px,py=rad*cos(a),rad*sin(a);dx,dy=X-px,Y-py
        sx,sy=rng.uniform(.04,.10),rng.uniform(.028,.063)
        shape=(abs(dx)/sx+abs(dy)/sy<1)&(ed<.96)
        c[shape]=(.24,.264,.217) if k!=2 else (.34,.367,.318)
        highlight=shape&(dy>sy*.15);c[highlight]+=.044
    # A few tapering angular hairline cracks confined mostly to the outer strip.
    for i in range(3):
        a=(i*2*pi/3)+.31*k;start=np.array([cos(a),sin(a)])*.82
        prev=start
        for seg in range(3):
            nxt=prev-np.array([cos(a+.25*(-1)**seg),sin(a+.25*(-1)**seg)])*.08
            d=nxt-prev;u=np.clip(((X-prev[0])*d[0]+(Y-prev[1])*d[1])/(d@d),0,1)
            dist=np.sqrt((X-prev[0]-u*d[0])**2+(Y-prev[1]-u*d[1])**2)
            crack=(dist<.006-seg*.001)&(ed<.94);c[crack]=(.125,.119,.078)
            prev=nxt
    # Recessed edge painted dark, inside edge picked out in warm light.
    c[(ed>.94)&(ed<1.04)]*=.80
    ix=k%2;iy=k//2
    base[iy*T:(iy+1)*T,ix*T:(ix+1)*T,:3]=np.clip(c,0,1)
    orm[iy*T:(iy+1)*T,ix*T:(ix+1)*T,1]=np.where(grass,.97,.86)
rough[:,:,:3]=orm[:,:,1,None]
def save_image(name,pixels,linear=False):
    im=bpy.data.images.new(name,width=N,height=N,alpha=True)
    im.colorspace_settings.name='Non-Color' if linear else 'sRGB';im.pixels.foreach_set(pixels.ravel())
    im.filepath_raw=str(OUT/'textures'/f'{name}.png');im.file_format='PNG';im.save();return im
albedo=save_image('Arena_BaseColor',base)
packed=save_image('Arena_ORM',orm,True)
save_image('Arena_Roughness',rough,True)
norm=save_image('Arena_Normal',normal,True)
metal=np.ones_like(base);metal[:,:,:3]=0;save_image('Arena_Metallic',metal,True)
paint=material('Terreno | atlas pintado 2K',(.3,.25,.14))
nodes=paint.node_tree.nodes;links=paint.node_tree.links;p=nodes.get('Principled BSDF')
n=nodes.new('ShaderNodeTexImage');n.image=albedo;links.new(n.outputs['Color'],p.inputs['Base Color'])
n=nodes.new('ShaderNodeTexImage');n.image=packed
s=nodes.new('ShaderNodeSeparateColor');links.new(n.outputs['Color'],s.inputs[0]);links.new(s.outputs[1],p.inputs['Roughness']);links.new(s.outputs[2],p.inputs['Metallic'])
n=nodes.new('ShaderNodeTexImage');n.image=norm
s=nodes.new('ShaderNodeNormalMap');links.new(n.outputs['Color'],s.inputs['Color']);links.new(s.outputs[0],p.inputs['Normal'])

def mesh_obj(name,verts,faces,mats,indices=None,col='01_BOARD'):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);collections[col].objects.link(o)
    for m in mats:mesh.materials.append(m)
    if indices:
        for face,idx in zip(mesh.polygons,indices):face.material_index=idx
    return o
def bevel(o,width=.05,segments=1):
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Chanfro largo','BEVEL');m.width=width;m.segments=segments
    bpy.ops.object.modifier_apply(modifier=m.name)
    return o
def block(name,loc,scale,mat,col='03_BORDER_DECOR',rotation=0,bevel_width=.055):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler.z=rotation
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);link(o,col);bevel(o,bevel_width,1);return o
def column(name,xy,radius,depth,z,mat,vertices=6,col='03_BORDER_DECOR'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=(*xy,z))
    o=bpy.context.object;o.name=name;o.data.materials.append(mat);link(o,col);bevel(o,.035,1);return o

def tile_mesh(variant):
    # Concentric 6-sided rings: lower bevel, thick side wall, top chamfer, raised rim,
    # inset terrain and a perfectly flat 1.4m-wide movement/placement zone.
    rings=[(.885,-.28),(.948,-.225),(.948,-.052),(.914,.010),(.873,.010),(.846,-.025)]
    verts=[(r*cos(i*pi/3),r*sin(i*pi/3),z) for r,z in rings for i in range(6)]
    faces=[tuple(range(5,-1,-1))];ids=[0]
    for j in range(len(rings)-1):
        for i in range(6):faces.append((j*6+i,j*6+(i+1)%6,(j+1)*6+(i+1)%6,(j+1)*6+i));ids.append([0,0,1,1,0][j])
    verts.append((0,0,-.025));center=len(verts)-1
    for i in range(6):faces.append((center,30+i,30+(i+1)%6));ids.append(2)
    o=mesh_obj('Hex_template_'+str(variant),verts,faces,[rim,rimlight,paint],ids,col='05_MODULE_LIBRARY')
    uv=o.data.uv_layers.new(name='TerrainAtlas')
    ix,iy=variant%2,variant//2
    for poly in o.data.polygons:
        for loop in poly.loop_indices:
            v=o.data.vertices[o.data.loops[loop].vertex_index].co
            uv.data[loop].uv=((ix+(v.x/2.24+.5))/2,(iy+(v.y/2.24+.5))/2)
    o['tile_radius_m']=1.;o['walkable_radius_m']=.70;o['surface_local_z']=-.025
    o['variant']=['earth','moss','stone','weathered_earth'][variant]
    return o
templates=[tile_mesh(i) for i in range(4)]
cells=[];tiles=[]
def gridxy(q,r):return 1.5*q,sqrt(3)*(r+q/2)
for q in range(-4,5):
    for r in range(-4,5):
        dist=(abs(q)+abs(r)+abs(q+r))//2
        if dist>4:continue
        x,y=gridxy(q,r)
        # Heights are cosmetic and small; no new movement rules are implied.
        h=.295+([0,.035,.065][(q*3+r*5)%3] if dist>=3 else [0,.018][(q+r)%2])
        variant=(1 if (dist>=3 and (q-r)%3!=0) else 0)
        if q>=2 and r>=-1:variant=2
        if (q*7+r*11)%9==0:variant=3
        o=bpy.data.objects.new(f'Hex_q{q:+d}_r{r:+d}',templates[variant].data);collections['01_BOARD'].objects.link(o)
        o.location=(x,y,h);o.rotation_euler.z=((q*13+r*7)%6)*pi/3
        o['q']=q;o['r']=r;o['terrain']=templates[variant]['variant'];o['surface_z']=h-.025;o['walkable']=True
        tiles.append(o);cells.append({'q':q,'r':r,'object':o.name,'position_blender':[x,y,h-.025],'position_gltf':[x,h-.025,-y],'terrain_variant':variant,'visual_height_only':True})

# Recover the stepped perimeter; snap to a lattice of .00001m.
edges={}
for cell in cells:
    x,y=gridxy(cell['q'],cell['r']);v=[(round(x+cos(i*pi/3),5),round(y+sin(i*pi/3),5)) for i in range(6)]
    for a,b in zip(v,v[1:]+v[:1]):
        key=tuple(sorted((a,b)))
        if key in edges:del edges[key]
        else:edges[key]=(a,b)
forward={a:b for a,b in edges.values()};start=next(iter(forward));outline=[start];p=forward[start]
while p!=start:
    outline.append(p);p=forward[p]
assert len(outline)==len(edges)
def plinth(name,scale,zlo,zhi,mat):
    n=len(outline);v=[(x*scale,y*scale,zlo) for x,y in outline]+[(x*scale,y*scale,zhi) for x,y in outline]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh_obj(name,v,f,[mat],col='02_FOUNDATION');bevel(o,.035,1);return o
plinth('Foundation_solid',1.027,-.48,.075,stone)
plinth('Foundation_dark_lower_band',1.035,-.46,-.29,rim)
plinth('Foundation_top_lip',1.023,.042,.108,rimlight)
print('Built 61 tiles and solid foundation',flush=True)

# Restrained edge language: chunky clamps and small stone fragments, outside movement.
for k in range(6):
    a=k*pi/3;qx,qy=7.05*cos(a),7.05*sin(a)
    # Midpoints near the six corners carry an iron cap and one small bronze marker.
    o=block(f'Foundation_clamp_{k:02d}',(qx,qy,-.08),(.33,.42,.41),iron,'03_BORDER_DECOR',a,.045)
    block(f'Foundation_marker_{k:02d}',(qx,qy,.148),(.20,.26,.048),bronze,'03_BORDER_DECOR',a,.025)

def rock(name,loc,scale,mat,col='04_BACKGROUND',seed=0):
    rng=random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
    o=bpy.context.object;o.name=name;link(o,col)
    for v in o.data.vertices:
        v.co.x*=scale[0]*rng.uniform(.85,1.13);v.co.y*=scale[1]*rng.uniform(.85,1.13);v.co.z*=scale[2]*rng.uniform(.87,1.08)
    o.data.materials.append(mat);return o

# The ruins sit behind the field. Their broad shapes stay below the board's visual priority.
for k,(x,y,h) in enumerate([(-8.1,4.7,2.6),(-6.2,8.0,3.7),(-3.9,9.8,2.6),(3.9,9.8,3.3),(7.6,6.9,2.1)]):
    rock(f'Ruins_island_{k}',(x,y,-.40),(1.6,1.25,.60),far,seed=k)
    block(f'Ruin_foot_{k}',(x,y,.02),(1.08,.95,.28),farLight,'04_BACKGROUND',.11*k,.08)
    # Masonry made of a few oversized courses, with clear seams and angled cap.
    for j in range(int(h/.6)):
        drift=.045*j*(-1)**k
        block(f'Ruin_pillar_{k}_{j}',(x+drift,y,.31+j*.57),(.63-j*.022,.62-j*.023,.52),far if j%3 else farLight,'04_BACKGROUND',.035*k,.043)
    topz=.31+(int(h/.6)-1)*.57+.27
    cap=block(f'Ruin_broken_cap_{k}',(x+.04,y,topz+.08),(.77,.71,.20),farLight,'04_BACKGROUND',.10,.055)
    cap.rotation_euler.y=.09*(-1)**k
    for j in range(3):
        rock(f'Ruin_rubble_{k}_{j}',(x+.65+j*.23,y-.5+j*.18,-.02),(.36,.30,.25),far,seed=100+k*5+j)

# Broken lintels suggest an old guardian gate, without a full wall occluding play.
block('Ruin_lintel_left',(-5.17,8.80,2.48),(2.00,.48,.48),farLight,'04_BACKGROUND',.47,.06)
block('Ruin_lintel_right',(5.31,8.40,1.72),(1.7,.48,.46),far,'04_BACKGROUND',-.56,.06)
for i,(x,y) in enumerate([(-9,-2),(-8.7,.2),(8.7,1.7),(8.9,-1.6),(-.8,10.4),(1.0,11.0)]):
    rock(f'Distant_rock_{i}',(x,y,-.75),(1.05,.75,1.2 if i%2 else .8),far,seed=33+i)

# Broad, sparse moss on the foundation corners gives life without occupying cells.
for i in range(15):
    p=outline[(i*7)%len(outline)];x,y=p
    o=rock(f'Edge_moss_{i}',(x*1.012,y*1.012,.109),(.14,.19,.035),moss,'03_BORDER_DECOR',seed=i+400)

# Batch static environment geometry; keep all 61 game cells independent.
for col,name in [('02_FOUNDATION','Arena_Foundation'),('03_BORDER_DECOR','Arena_EdgeDecor'),('04_BACKGROUND','Arena_Background')]:
    objects=list(collections[col].objects)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=name
    scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # Bevel intersections may leave microscopic edges; remove them before float32 export.
    mesh=bpy.context.object.data;bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.dissolve_degenerate(bm,dist=.00001,edges=list(bm.edges))
    bm.to_mesh(mesh);bm.free();mesh.update()

# Recalculate normals and simple UVs for untextured props. Terrain UVs remain unchanged.
all_assets=[o for key in ['01_BOARD','02_FOUNDATION','03_BORDER_DECOR','04_BACKGROUND'] for o in collections[key].objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in all_assets:o.select_set(True)
bpy.context.view_layer.objects.active=tiles[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
for o in all_assets:
    if not o.data.uv_layers:
        uv=o.data.uv_layers.new(name='UVMap')
        for loop in o.data.loops:
            v=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*.2+.5,v.y*.2+.5)

def export(name,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True,export_tangents=True,export_cameras=False,export_lights=False)
for im in [albedo,packed,norm]:im.pack()
print('Exporting runtime arena and modular kit',flush=True)
export('Arena_Hexagonal.glb',all_assets)
board=[o for o in all_assets if o not in collections['04_BACKGROUND'].objects[:]]
export('Arena_Tabuleiro.glb',board)
names=['Hex_Terra','Hex_Grama','Hex_Pedra','Hex_Terra_Gasta']
for name,o in zip(names,templates):
    o.location=(0,0,0);o['module_origin']='Top movement plane is local Z=-0.025m; add desired tile elevation.'
    export(f'modules/{name}.glb',[o])
# A separate background can be culled, removed or replaced without touching the board.
export('Arena_Cenario.glb',list(collections['04_BACKGROUND'].objects))
for o in templates:o.hide_render=True;o.hide_viewport=True
collections['05_MODULE_LIBRARY'].hide_render=True
layout={'name':'Ferro & Lanca / Arena hexagonal modular','orientation':'flat-top','radius':4,'tile_count':len(cells),'hex_radius_m':1,'spacing_x_m':1.5,'spacing_diagonal_m':sqrt(3),'blender_forward':'-Y','gltf_up':'Y','coordinates':'x=1.5*q; y=sqrt(3)*(r+q/2); glTF=[x,surfaceZ,-y]','centre_placement_radius_m':.70,'height_variation_is_cosmetic':True,'tiles':cells}
(OUT/'layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
tri=lambda objects:sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
report={'tile_count':len(tiles),'triangles_per_module':tri([templates[0]]),'board_triangles':tri(board),'full_scene_triangles':tri(all_assets),'unique_tile_meshes':4,'mesh_objects_full_scene':len(all_assets),'atlas_size':2048,'materials_full_scene':len({m.name for o in all_assets for m in o.data.materials}),'height_range_m':[min(c['position_blender'][2] for c in cells),max(c['position_blender'][2] for c in cells)],'normal_map':'Neutral tangent space; all bevels and relief are geometry. No high-poly bake.','textures':'Original procedural painted-style colour atlas; no photographic textures.','runtime_fog':'Use native engine fog; preview fog is excluded from GLB.'}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

# Render-only atmospheric stage. No costly volume or lights enter the runtime GLB.
groundmat=material('Preview | background',(.028,.053,.065),1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1.3));o=bpy.context.object;o.name='Preview_ground';o.data.materials.append(groundmat);link(o,'PREVIEW_ONLY')
world=bpy.data.worlds.new('Bruma azul');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.18,.23,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,size,color,target=(0,0,0)):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);collections['PREVIEW_ONLY'].objects.link(o);o.location=loc;aim(o,target)
area('Luz quente ampla',(-6,-8,17),2700,10,(1,.86,.65))
area('Preenchimento frio',(9,-1,12),1800,12,(.63,.82,1))
area('Luz suave das ruinas',(-2,11,9),1800,10,(.72,.89,1))
# Far mist volume sits behind, keeping tile contours crisp and movement legible.
mist=bpy.data.materials.new('Preview | nevoa');mist.use_nodes=True
mist.node_tree.nodes.clear();v=mist.node_tree.nodes.new('ShaderNodeVolumePrincipled');v.inputs['Density'].default_value=.013;v.inputs['Color'].default_value=(.47,.61,.65,1)
out=mist.node_tree.nodes.new('ShaderNodeOutputMaterial');mist.node_tree.links.new(v.outputs['Volume'],out.inputs['Volume'])
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,8,1.8));o=bpy.context.object;o.name='Preview_mist';o.scale=(35,10,8);o.data.materials.append(mist);link(o,'PREVIEW_ONLY')
camdata=bpy.data.cameras.new('Arena camera');cam=bpy.data.objects.new('Arena camera',camdata);collections['PREVIEW_ONLY'].objects.link(cam);scene.camera=cam
camdata.type='ORTHO';camdata.ortho_scale=24.7;cam.location=(15,-20,23);aim(cam,(0,1.0,.3))
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_distance=24;a.spaces.active.region_3d.view_location=(0,0,.2)
for im in bpy.data.images:
    if im.name.startswith('Arena_'):im.filepath='//textures/'+im.name+'.png'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Arena_Hexagonal.blend'))
if '--no-render' in sys.argv:
    print(json.dumps(report),flush=True)
    sys.exit(0)
print('Rendering overview',flush=True)
scene.render.filepath=str(OUT/'previews'/'Arena_perspectiva.png');bpy.ops.render.render(write_still=True)
cam.location=(0,-12,23);aim(cam,(0,.25,0));camdata.ortho_scale=19.9
scene.render.filepath=str(OUT/'previews'/'Arena_tatica.png');bpy.ops.render.render(write_still=True)
cam.location=(0,0,26);cam.rotation_euler=(0,0,0);camdata.ortho_scale=19.5
scene.render.resolution_x=1200;scene.render.resolution_y=1200
scene.render.filepath=str(OUT/'previews'/'Arena_topo.png');bpy.ops.render.render(write_still=True)
cam.location=(5,-8,7);aim(cam,(2,-4.5,.25));camdata.ortho_scale=5.7
scene.render.resolution_x=1200;scene.render.resolution_y=900
scene.render.filepath=str(OUT/'previews'/'Arena_detalhe.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report),flush=True)
