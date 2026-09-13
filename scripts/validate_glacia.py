"""Check source skin/UVs, casting sockets and standalone GLB reimport."""
from pathlib import Path
import bpy,json,struct,math
out=Path(__file__).resolve().parents[1]/'assets/characters/glacia'
bpy.ops.wm.open_mainfile(filepath=str(out/'Glacia.blend'))
r=bpy.data.objects['Glacia_Rig'];meshes=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==r for m in o.modifiers)]
assert {o.name for o in meshes}=={'Glacia_Body','Hair','Robes','Scepter','IceCrystal'}
assert len(r.data.bones)==23 and r.location.length<1e-6
triangles=0;max_weights=0
for o in meshes:
    o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
    assert o.data.uv_layers.active and len(o.data.materials)==1
    for uv in o.data.uv_layers.active.data:assert all(-1e-5<=x<=1.00001 for x in uv.uv)
    for v in o.data.vertices:
        weights=[g.weight for g in v.groups if g.weight>0];max_weights=max(max_weights,len(weights))
        assert weights and abs(sum(weights)-1)<1e-5 and all(math.isfinite(x) for x in v.co)
assert 8000<triangles<35000 and max_weights<=4
assert r.data.bones['Scepter'].parent.name=='Hand.R'
assert r.data.bones['CrystalFocus'].parent.name=='Scepter' and r.data.bones['HealPalm'].parent.name=='Hand.L'
for mesh,bone in [('Scepter','Scepter'),('IceCrystal','CrystalFocus')]:
    o=bpy.data.objects[mesh];assert (o.location-r.data.bones[bone].head_local).length<1e-6
    assert all(len(v.groups)==1 and o.vertex_groups[v.groups[0].group].name==bone for v in o.data.vertices)
grip_error=0;focus_distance=[];palm_heights={};floor=10
for action in bpy.data.actions:
    r.animation_data.action=action
    for frame in range(int(action.frame_range[1])+1):
        bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
        grip_error=max(grip_error,(r.pose.bones['Hand.R'].tail-r.pose.bones['Scepter'].head).length)
        focus_distance.append((r.pose.bones['CrystalFocus'].head-r.pose.bones['Scepter'].head).length)
        if frame==int(action.frame_range[1]):palm_heights[action.name]=r.pose.bones['HealPalm'].head.z
        if frame%5==0:
            deps=bpy.context.evaluated_depsgraph_get()
            for o in meshes:
                ev=o.evaluated_get(deps);floor=min(floor,min((ev.matrix_world@v.co).z for v in ev.data.vertices))
assert grip_error<.001 and max(focus_distance)-min(focus_distance)<.001
assert palm_heights['Blessing_Test']-palm_heights['Idle']>.12
assert floor>-.002,floor
raw=(out/'Glacia.glb').read_bytes();magic,version,total=struct.unpack_from('<4sII',raw)
assert magic==b'glTF' and version==2 and total==len(raw)
size,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
gltf=json.loads(raw[20:20+size]);assert len(gltf['meshes'])==5 and len(gltf['materials'])==1
assert {a['name'] for a in gltf['animations']}=={'Idle','Blessing_Test','Release_Test'}
assert all('bufferView' in image and 'uri' not in image for image in gltf['images'])
assert all('uri' not in buffer for buffer in gltf['buffers']) and all(len(s['joints'])==23 for s in gltf['skins'])
assert all('WEIGHTS_0' in p['attributes'] and 'JOINTS_0' in p['attributes'] for m in gltf['meshes'] for p in m['primitives'])
assert not any('camera' in n or n.get('name','').startswith('Preview') for n in gltf['nodes'])
assert 'emissiveTexture' in gltf['materials'][0]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/'Glacia.glb'))
imported=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
assert len(imported)==5 and any(o.type=='ARMATURE' and len(o.data.bones)==23 for o in bpy.context.scene.objects)
report=json.loads((out/'asset_report.json').read_text(encoding='utf-8'))
report['validation']={'blender_and_glb':'PASS','glb_reimport':'PASS','triangles':triangles,'max_weights_per_vertex':max_weights,'scepter_grip_error_m':grip_error,'fx_socket_follow':'PASS','floor_min_m':floor,'embedded_textures':len(gltf['images']),'uv_bounds':'0..1','preview_stage_excluded':True,'all_vertices_weighted':True}
(out/'asset_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8');print(json.dumps(report['validation']),flush=True)
__import__('sys').stdout.flush();__import__('sys').stderr.flush();__import__('os')._exit(0)
