"""Same light and scale for the four-character quality comparison; no source assets edited."""
from pathlib import Path
import bpy,json,math
from mathutils import Vector
root=Path(__file__).resolve().parents[1];out=root/'assets/characters/ferrha/v3'
bpy.ops.wm.open_mainfile(filepath=str(out/'Ferrha.blend'));scene=bpy.context.scene;r=bpy.data.objects['Ferrha_Rig']
r.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
cam=scene.camera;cam.data.ortho_scale=2.65;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.cycles.samples=20
def aim(point):cam.rotation_euler=(Vector(point)-cam.location).to_track_quat('-Z','Y').to_euler()
for name,loc in [('front',(0,-6,1.4)),('back',(0,6,1.6)),('profile',(6,0,1.6)),('isometric',(3,-5,4.5))]:
    cam.location=loc;aim((0,0,.87));scene.render.filepath=str(out/'previews'/('Ferrha_'+name+'.png'));bpy.ops.render.render(write_still=True)
for size in [40,60,80]:
    scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.filepath=str(out/'previews'/('Ferrha_gameplay_%dpx.png'%size));bpy.ops.render.render(write_still=True)
# Compare against the exact contemporary models under identical lighting and metre scale.
r.location.x=-2.7;refs={}
for x,name in [(-.9,'Kael'),(.9,'Voss'),(2.7,'Glacia')]:
    file=root.parent/(name.lower()+'-prototype')/'assets/characters'/name.lower()/(name+'.glb')
    before=set(bpy.data.objects);actions=set(bpy.data.actions);bpy.ops.import_scene.gltf(filepath=str(file))
    added=set(bpy.data.objects)-before;rig=next(o for o in added if o.type=='ARMATURE')
    if rig.animation_data:
        for track in rig.animation_data.nla_tracks:track.mute=True
        idle=next(a for a in set(bpy.data.actions)-actions if a.name.startswith('Idle'))
        rig.animation_data.action=idle
    # Importer roots may be a wrapper empty; offset only the highest parent.
    parent=rig
    while parent.parent and parent.parent in added:parent=parent.parent
    parent.location.x+=x;refs[name]=str(file)
scene.frame_set(0);bpy.context.view_layer.update();scene.render.resolution_x=1400;scene.render.resolution_y=600;cam.data.ortho_scale=8.3;cam.location=(0,-10,4.4);aim((0,0,.82))
for x,name in [(-2.7,'FERRHA V3'),(-.9,'KAEL'),(.9,'VOSS'),(2.7,'GLACIA')]:
    font=bpy.data.curves.new(name,'FONT');font.body=name;font.align_x='CENTER';font.size=.13
    o=bpy.data.objects.new(name,font);scene.collection.objects.link(o);o.location=(x,-.48,.005);o.rotation_euler=(0,0,0)
scene.render.filepath=str(out/'previews/Ferrha_family_comparison.png');bpy.ops.render.render(write_still=True)
print('FRONT BACK PROFILE ISOMETRIC GAMEPLAY COMPARISON COMPLETE',flush=True);__import__('os')._exit(0)
