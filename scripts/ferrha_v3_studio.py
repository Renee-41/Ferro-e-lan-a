# Studio stays in the .blend, excluded from the exported runtime asset.
stage=bpy.data.collections.new('PREVIEW ONLY');scene.collection.children.link(stage)
def staging(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    stage.objects.link(o)
floor=material('Preview floor',(.028,.038,.044),.05,.76)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));o=bpy.context.object;o.name='Preview ground';o.data.materials.append(floor);staging(o)
def target(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Warm key',(-3,-4,6),440,4,(1,.85,.72)),('Cool fill',(3,-2,3),310,3,(.66,.79,1)),('Ember rim',(1,3,4),530,2,(.7,.84,1))]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);stage.objects.link(o);o.location=loc;target(o,(0,0,.8))
scene.world.color=(.20,.20,.20)
d=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',d);stage.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.8;cam.location=(2.8,-6,3);target(cam,(0,0,.9))
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.view_settings.view_transform='AgX'
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Ferrha.blend'))
