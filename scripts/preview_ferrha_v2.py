from pathlib import Path
import bpy,json
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'assets'/'characters'/'ferrha'
(OUT/'previews'/'v2').mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'Ferrha_v2.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Ferrha_Rig'];scene.cycles.samples=10
scene.render.resolution_x=448;scene.render.resolution_y=448
for t in rig.animation_data.nla_tracks:t.mute=True
for name,frame in [('Idle',15),('Walk',8),('Attack_A',8),('Attack_B',11),('Attack_C',13),('Barrier',30),('Death',54)]:
    rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame)
    scene.render.filepath=str(OUT/'previews'/'v2'/f'{name}.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
for name,pos in [('Hair_Rear',(2,5,2.5)),('Hair_Profile',(5,0,2))]:
    scene.camera.location=pos;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=2.65
    scene.camera.rotation_euler=(Vector((0,0,.78))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/'previews'/'v2'/f'{name}.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=bpy.data.actions['Walk']
foot=[]
for frame in range(31):
    scene.frame_set(frame);bpy.context.view_layer.update()
    foot.append({'frame':frame,'left':list(rig.pose.bones['Foot.L'].head),'right':list(rig.pose.bones['Foot.R'].head)})
(OUT/'v2_foot_samples.json').write_text(json.dumps(foot,indent=2),encoding='utf-8')
