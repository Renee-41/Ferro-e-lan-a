# Apply transforms before unified UV packing. The reference pipeline is reused without importing its asset.
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# FERRHA_ATLAS
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
