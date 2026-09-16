"""Validate the source and reimport the actual exported runtime asset."""
from pathlib import Path
import bpy,json,struct,math
from mathutils import Vector
out=Path(__file__).resolve().parents[1]/'assets/characters/ferrha/v3'
bpy.ops.wm.open_mainfile(filepath=str(out/'Ferrha.blend'))
r=bpy.data.objects['Ferrha_Rig'];scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==r for m in o.modifiers)]
expected={'Ferrha_Body','Hair','Helmet','Spear'}|{'MagneticPlate_%02d'%i for i in range(1,6)}
assert {o.name for o in meshes}==expected
assert len(r.data.bones)==26 and r.location.length<1e-6 and tuple(r.scale)==(1,1,1)
triangles=0;maxweights=0
for o in meshes:
    o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
    assert o.data.uv_layers.active and len(o.data.materials)==1
    for uv in o.data.uv_layers.active.data:assert all(-1e-5<=x<=1.00001 for x in uv.uv)
    for v in o.data.vertices:
        weights=[g.weight for g in v.groups if g.weight>0];maxweights=max(maxweights,len(weights))
        assert weights and abs(sum(weights)-1)<1e-5 and all(math.isfinite(x) for x in v.co)
assert 15000<=triangles<=35000 and maxweights<=4
assert min((o.matrix_world@v.co).z for o in meshes for v in o.data.vertices)>-.001
for name in ['Spear']+sorted(expected-{'Ferrha_Body','Hair','Helmet','Spear'}):
    o=bpy.data.objects[name];assert (o.location-r.data.bones[name].head_local).length<1e-6
    assert all(len(v.groups)==1 and o.vertex_groups[v.groups[0].group].name==name for v in o.data.vertices)
clips={'Idle','Walk','Attack_A','Attack_B','Attack_C','Hit','Death','Special','Barrier'}
assert {a.name for a in bpy.data.actions}==clips
loop_error=0;foot_error=0;grip_error=0;ground=10
for action in bpy.data.actions:
    r.animation_data.action=action;end=round(action.frame_range[1]);first=None
    for frame in range(end+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        grip_error=max(grip_error,(r.pose.bones['Hand.R'].tail-r.pose.bones['Spear'].head).length)
        if action.name in ['Idle','Walk']:
            matrices={p.name:p.matrix.copy() for p in r.pose.bones}
            if frame==0:first=matrices
            if frame==end:loop_error=max(loop_error,max(abs(matrices[n][i][j]-first[n][i][j]) for n in matrices for i in range(4) for j in range(4)))
            # No horizontal facing is baked into the root; world movement owns yaw.
            root=r.pose.bones['Root'].matrix;assert root.translation.length<1e-5
        if action.name=='Walk':
            for side,offset in [('L',0),('R',.5)]:
                phase=(frame/end+offset)%1
                if phase<.5:
                    p=r.pose.bones['Foot.'+side].head;rest=r.data.bones['Foot.'+side].head_local
                    foot_error=max(foot_error,abs(p.y-(-.36/4+.36*phase)),abs(p.z-rest.z))
        if action.name=='Death':
            deps=bpy.context.evaluated_depsgraph_get()
            ground=min(ground,min((e.matrix_world@v.co).z for e in [o.evaluated_get(deps) for o in meshes] for v in e.data.vertices))
assert grip_error<.0001 and loop_error<.002 and foot_error<.002 and ground>-.003,(grip_error,loop_error,foot_error,ground)
raw=(out/'Ferrha.glb').read_bytes();magic,version,total=struct.unpack_from('<4sII',raw);assert magic==b'glTF' and version==2 and total==len(raw)
size,kind=struct.unpack_from('<II',raw,12);gltf=json.loads(raw[20:20+size])
assert len(gltf['meshes'])==9 and len(gltf['materials'])==1
assert {a['name'] for a in gltf['animations']}==clips
assert all('bufferView' in i and 'uri' not in i for i in gltf['images'])
assert all('uri' not in b for b in gltf['buffers'])
assert all(len(s['joints'])==26 for s in gltf['skins'])
assert all('WEIGHTS_0' in p['attributes'] and 'JOINTS_0' in p['attributes'] for m in gltf['meshes'] for p in m['primitives'])
mat=gltf['materials'][0];assert 'baseColorTexture' in mat['pbrMetallicRoughness'] and 'metallicRoughnessTexture' in mat['pbrMetallicRoughness'] and 'normalTexture' in mat
assert not any('camera' in n or n.get('name','').startswith('Preview') for n in gltf['nodes'])
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/'Ferrha.glb'))
imported=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
assert len(imported)==9 and any(o.type=='ARMATURE' and len(o.data.bones)==26 for o in bpy.context.scene.objects)
assert all(tuple(im.size)==(1024,1024) for im in bpy.data.images if im.type=='IMAGE' and im.size[0]>0)
report=json.loads((out/'asset_report.json').read_text());report['validation'].update(glb_reimport='PASS',triangles=triangles,max_weights_per_vertex=maxweights,embedded_textures=len(gltf['images']),uv_bounds='0..1',preview_stage_excluded=True,all_vertices_weighted=True,loop_matrix_error=loop_error,stance_foot_error_m=foot_error,max_spear_grip_error_m=grip_error,death_floor_min_m=ground)
(out/'asset_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report['validation']),flush=True)
__import__('os')._exit(0)
