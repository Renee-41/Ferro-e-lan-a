"""Round-trip the exported GLB and render representative starter-animation frames."""
from pathlib import Path
import bpy,json
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'assets'/'characters'/'ferrha'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'Ferrha.blend'))
for o in list(bpy.data.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Preview ground'):
        bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=str(OUT/'Ferrha.glb'))
scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
scene.render.resolution_x=384;scene.render.resolution_y=384;scene.cycles.samples=12
scene.camera.data.ortho_scale=2.6
for tr in rig.animation_data.nla_tracks:tr.mute=True
checks={}
for name,frame in [('Idle',13),('Walk',7),('Attack',11),('Hit',4),('Death',25),('Ability',17)]:
    action=next(a for a in bpy.data.actions if a.name==name or a.name.startswith(name+'_'))
    rig.animation_data.action=action
    scene.frame_set(frame)
    scene.render.filepath=str(OUT/'previews'/f'Ferrha_clip_{name}.png')
    bpy.ops.render.render(write_still=True)
    checks[name]={'frame':frame,'action':action.name}
(OUT/'roundtrip.json').write_text(json.dumps({'imported_glb':True,'mesh_objects':len([o for o in scene.objects if o.type=='MESH' and o.name!='Preview ground']),'clips_sampled':checks},indent=2),encoding='utf-8')
