"""Render the module library and a scale check with the existing Ferrha asset."""
from pathlib import Path
import bpy,json,math
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets'/'arenas'/'hexagonal'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'Arena_Hexagonal.blend'))
scene=bpy.context.scene;cam=scene.camera;scene.cycles.samples=16
def aim(point):cam.rotation_euler=(Vector(point)-cam.location).to_track_quat('-Z','Y').to_euler()
# Verify a round-trip of the actual runtime file while reusing only the studio lighting.
for name in ['01_BOARD','02_FOUNDATION','03_BORDER_DECOR','04_BACKGROUND']:
    for o in list(bpy.data.collections[name].objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'Arena_Hexagonal.glb'))
imported_tiles=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Hex_q')]
assert len(imported_tiles)==61
layout=json.loads((OUT/'layout.json').read_text())
positions={(c['q'],c['r']):c['position_blender'] for c in layout['tiles']}
ferrha=ROOT/'assets'/'characters'/'ferrha'/'Ferrha.glb'
if ferrha.exists():
    for i,coord in enumerate([(-2,0),(-3,2),(-1,-2),(2,0),(3,-2),(1,2)]):
        before=set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(ferrha));new=set(bpy.data.objects)-before
        rig=next(o for o in new if o.type=='ARMATURE')
        if rig.animation_data:
            rig.animation_data.action=None
            for tr in rig.animation_data.nla_tracks:tr.mute=True
        for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        rig.location=positions[coord];rig.rotation_euler.z=-.28 if i<3 else .28
    scene.frame_set(1)
    cam.location=(0,-14,23);aim((0,0,.5));cam.data.ortho_scale=18.8
    scene.render.resolution_x=1400;scene.render.resolution_y=1100
    scene.render.filepath=str(OUT/'previews'/'Arena_escala_Ferrha.png');bpy.ops.render.render(write_still=True)

# Reload the source to keep this library image independent of the scale-check actors.
bpy.ops.wm.open_mainfile(filepath=str(OUT/'Arena_Hexagonal.blend'))
scene=bpy.context.scene;cam=scene.camera;scene.cycles.samples=16
for name in ['01_BOARD','02_FOUNDATION','03_BORDER_DECOR','04_BACKGROUND']:bpy.data.collections[name].hide_render=True
bpy.data.objects['Preview_mist'].hide_render=True
bpy.data.objects['Preview_ground'].location.z=-.01
bpy.data.collections['05_MODULE_LIBRARY'].hide_render=False
templates=sorted(bpy.data.collections['05_MODULE_LIBRARY'].objects,key=lambda o:o.name)
for o,(x,y) in zip(templates,[(-1.2,1.25),(1.2,1.25),(-1.2,-1.25),(1.2,-1.25)]):
    o.hide_render=False;o.hide_viewport=False;o.location=(x,y,.28)
cam.location=(2,-3.5,6);aim((0,0,.15));cam.data.ortho_scale=6.4
scene.render.resolution_x=1200;scene.render.resolution_y=1000
scene.render.filepath=str(OUT/'previews'/'Arena_modulos.png');bpy.ops.render.render(write_still=True)
(OUT/'roundtrip.json').write_text(json.dumps({'runtime_glb_reimported':True,'imported_tiles':61,'ferrha_scale_preview':ferrha.exists(),'characters_in_runtime_arena':False},indent=2),encoding='utf-8')
