"""Ferrha V3: same project atlas/rig pipeline, newly authored guardian shapes."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
exec((HERE/'ferrha_v3_parts.py').read_text(),globals())
skin=material('Warm sienna skin',(.46,.235,.125),0,.66)
iron=material('Forged blue iron',(.14,.20,.24),.72,.48)
steel=material('Satin steel bevels',(.39,.47,.50),.80,.40)
dark=material('Charcoal padded linen',(.023,.032,.038),0,.91)
leather=material('Oxblood leather',(.105,.045,.032),0,.78)
hair=material('Chestnut hair',(.105,.041,.020),0,.70)
hairlight=material('Chestnut ridges',(.18,.078,.036),0,.68)
eye=material('Dark amber eyes',(.025,.012,.006),0,.28)
white=material('Eye catchlight',(.84,.78,.62),0,.38)
lip=material('Warm lip line',(.22,.075,.040),0,.72)
ember=material('Quiet forge inlay',(.9,.17,.026),.18,.46,.62)

# Low centre of mass; head is a softened cheek/jaw volume, not a cuboid.
ball('Torso',(0,.014,.655),(.285,.184,.245),dark,'Spine',32,20,.86)
ball('Neck',(0,0,.91),(.115,.112,.12),skin,'Neck',20,14)
ball('Head',(0,-.012,1.225),(.342,.273,.339),skin,'Head',48,32,.90)
for s,side in [(-1,'R'),(1,'L')]:
    ball('Ear.'+side,(s*.332,.008,1.18),(.043,.052,.074),skin,'Head',18,12)
    ball('Eye.'+side,(s*.122,-.279,1.232),(.043,.019,.052),eye,'Head',22,16,.88)
    ball('Eye light.'+side,(s*.122-.009,-.297,1.251),(.012,.006,.015),white,'Head',14,10)
    line('Determined brow.'+side,[(s*.065,-.285,1.299),(s*.165,-.271,1.326),(s*.189,-.259,1.322)],.017,hair,'Head')
ball('Nose',(0,-.287,1.171),(.029,.033,.027),skin,'Head',18,14)
line('Composed mouth',[(-.058,-.272,1.093),(0,-.282,1.085),(.061,-.270,1.099)],.0085,lip,'Head')

# Wrapped hair shell reaches the nape. Locks emerge naturally below the open helm.
hairparts=[];helmet=[]
def shell(name,radii,topz,endfn,mat,bone='Head',n=32,rows=9):
    verts=[];faces=[]
    for j in range(rows+1):
        for i in range(n):
            a=2*math.pi*i/n;t=.025+(endfn(a)-.025)*j/rows
            verts.append((radii[0]*math.sin(t)*math.cos(a),radii[1]*math.sin(t)*math.sin(a),topz+radii[2]*math.cos(t)))
    for j in range(rows):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,mat,bone,True)
hairparts.append(shell('Wrapped nape hair',(.359,.292,.35),1.225,lambda a:1.08 if math.sin(a)<-.3 else 2.20,hair))
for s in [-1,1]:
    hairparts.append(ball('Temple lock',(s*.318,-.038,1.232),(.041,.087,.169),hair,'Head',22,16,.87))
    hairparts.append(plate('Side swept bang',[(s*.02,1.421),(s*.195,1.452),(s*.303,1.394),(s*.28,1.294),(s*.195,1.349)],-.233,.077,hair,'Head',.015))
    hairparts.append(line('Lock highlight',[(s*.279,-.117,1.32),(s*.332,-.10,1.21),(s*.33,-.064,1.116)],.009,hairlight,'Head'))
# Compact interlocking braid, visible in profile and rear without touching the collar.
for i in range(4):
    hairparts.append(ball('Braid lobe '+str(i),((-.022 if i%2 else .022),.314+i*.014,1.18-i*.057),(.061-i*.006,.060-i*.005,.061),hair if i%2 else hairlight,'HairTie',18,12))
hairparts.append(rod('Braid band',(-.031,.352,.997),(.031,.352,.997),.024,steel,'HairTie',12))
hairparts.append(ball('Braid tip',(0,.359,.952),(.036,.038,.045),hair,'HairTie',16,12))

helmet.append(shell('Open guardian helmet',(.376,.311,.381),1.225,lambda a:.91 if math.sin(a)<-.25 else 1.34,iron))
rim=[]
for i in range(33):
    a=2*math.pi*i/32;t=.91 if math.sin(a)<-.25 else 1.34
    rim.append((.378*math.sin(t)*math.cos(a),.313*math.sin(t)*math.sin(a),1.225+.382*math.cos(t)))
helmet.append(line('Helmet folded rim',rim,.014,steel,'Head'))
helmet.append(plate('Short iron crest',[(-.05,1.566),(0,1.69),(.054,1.584),(.035,1.505),(-.035,1.505)],-.071,.235,steel,'Head',.01))
helmet.append(plate('Crest inset',[(-.017,1.575),(0,1.632),(.020,1.579),(0,1.53)],-.085,.015,iron,'Head',.004))

# Layered breastplate: broad, bevelled planes catch light over matte undercloth.
plate('Breastplate rim',[(-.27,.835),(-.19,.897),(.19,.897),(.27,.835),(.23,.594),(0,.554),(-.23,.594)],-.193,.153,steel,'Spine',.023)
plate('Breastplate face',[(-.237,.822),(-.173,.865),(.173,.865),(.237,.822),(.20,.626),(0,.587),(-.20,.626)],-.222,.115,iron,'Spine',.026)
plate('Guardian keystone',[(-.069,.806),(.069,.806),(.037,.722),(0,.689),(-.037,.722)],-.247,.025,steel,'Spine',.009)
line('Forge chest seam',[(-.185,-.25,.642),(0,-.258,.607),(.185,-.25,.642)],.007,ember,'Spine')
box('Back cuirass',(0,.173,.743),(.44,.092,.265),iron,'Spine',.039)
box('Collar',(0,.004,.893),(.39,.30,.058),dark,'Spine',.026)
ball('Trousers',(0,.018,.405),(.25,.157,.15),dark,'Hips',26,18,.82)
box('Leather belt',(0,.001,.496),(.506,.352,.062),leather,'Hips',.014)
box('Buckle',(0,-.19,.497),(.105,.035,.085),steel,'Hips',.012)
box('Buckle inset',(0,-.213,.497),(.061,.017,.038),iron,'Hips',.007)
for s,side in [(-1,'R'),(1,'L')]:
    plate('Split tasset.'+side,[(s*.035,.475),(s*.225,.474),(s*.261,.346),(s*.188,.306),(s*.049,.33)],-.18,.056,iron,'Thigh.'+side,.017)
    line('Tasset rim.'+side,[(s*.06,-.191,.346),(s*.19,-.194,.327),(s*.244,-.189,.356)],.010,steel,'Thigh.'+side)
    ball('Shoulder padding.'+side,(s*.331,.012,.832),(.131,.142,.12),dark,'UpperArm.'+side,24,16)
    ball('Pauldron rim.'+side,(s*.347,.012,.882),(.155,.174,.103),steel,'Clavicle.'+side,24,16,.72)
    ball('Pauldron cap.'+side,(s*.347,.012,.91),(.147,.165,.089),iron,'Clavicle.'+side,24,16,.72)
    a=(s*.34,0,.828);el=(s*.49,-.012,.69);wr=(s*.623,-.032,.566)
    rod('Upper sleeve.'+side,a,el,.092,dark,'UpperArm.'+side,16,r2=.080)
    ball('Elbow.'+side,el,(.090,.095,.088),dark,'Forearm.'+side,20,14)
    rod('Forearm sleeve.'+side,el,wr,.089,leather,'Forearm.'+side,16,r2=.073)
    ball('Forearm armor.'+side,(s*.555,-.026,.626),(.106,.111,.10),iron,'Forearm.'+side,24,16,.70)
    box('Bracer lip.'+side,(s*.558,-.116,.636),(.119,.035,.12),steel,'Forearm.'+side,.015)
    ball('Glove.'+side,(s*.675,-.049,.543),(.083,.079,.080),leather,'Hand.'+side,22,16,.8)
    box('Knuckle plate.'+side,(s*.678,-.114,.55),(.103,.04,.067),iron,'Hand.'+side,.017)
    rod('Thigh.'+side,(s*.145,0,.41),(s*.17,0,.255),.099,dark,'Thigh.'+side,18,r2=.093)
    ball('Knee guard.'+side,(s*.17,-.052,.275),(.104,.101,.096),steel,'Shin.'+side,22,16,.76)
    rod('Greave.'+side,(s*.17,0,.105),(s*.17,0,.24),.105,iron,'Shin.'+side,16)
    box('Boot sole.'+side,(s*.17,-.055,.035),(.236,.30,.07),dark,'Foot.'+side,.014)
    box('Armored boot.'+side,(s*.17,-.070,.107),(.231,.29,.137),iron,'Foot.'+side,.025)
    box('Steel toe.'+side,(s*.17,-.178,.104),(.220,.085,.096),steel,'Foot.'+side,.018)
    line('Greave bevel.'+side,[(s*.17,-.113,.22),(s*.17,-.118,.15)],.011,steel,'Shin.'+side)

grip=Vector((-.709,-.060,.530));before=list(parts)
rod('Spear shaft',(-.709,-.060,.105),(-.709,-.060,1.63),.024,iron,'Spear',12)
rod('Spear leather grip',(-.709,-.06,.41),(-.709,-.06,.67),.034,leather,'Spear',12)
rod('Spear pommel',(-.709,-.06,.08),(-.709,-.06,.14),.039,steel,'Spear',12,r2=.03)
plate('Spear blade',[(-.709,1.86),(-.800,1.60),(-.709,1.48),(-.618,1.60)],-.09,.06,steel,'Spear',.008)
plate('Spear fuller',[(-.709,1.78),(-.752,1.61),(-.709,1.54),(-.666,1.61)],-.126,.015,iron,'Spear',.003)
spear=join([o for o in parts if o not in before],'Spear','Spear')

# Five controlled shield segments; individually skinned and pivoted for future assembly.
shards=[];shard_points=[(-.62,.16,1.18),(.60,.15,1.21),(-.48,.32,1.43),(.48,.32,1.47),(.19,.44,1.31)]
for i,(x,y,z) in enumerate(shard_points):
    name='MagneticPlate_%02d'%(i+1);before=list(parts);w=.078 if i<2 else .064
    plate(name+' rim',[(x-w,z+.10),(x+w,z+.074),(x+w*.90,z-.075),(x,z-.121),(x-w,z-.052)],y,.065,steel,name,.012)
    plate(name+' face',[(x-w*.78,z+.075),(x+w*.76,z+.052),(x+w*.67,z-.058),(x,z-.09),(x-w*.73,z-.039)],y-.015,.055,iron,name,.010)
    line(name+' forge mark',[(x-.033,y-.03,z-.035),(x+.029,y-.03,z-.018)],.006,ember,name)
    shards.append(join([o for o in parts if o not in before],name,name))

exec((HERE/'ferrha_v3_atlas.py').read_text(),globals())
bpy.ops.object.select_all(action='DESELECT')
armdata=bpy.data.armatures.new('Ferrha V3 skeleton');rig=bpy.data.objects.new('Ferrha_Rig',armdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
bone('Root',(0,0,0),(0,0,.14));bone('Hips',(0,0,.37),(0,0,.55),'Root');bone('Spine',(0,0,.55),(0,0,.85),'Hips')
bone('Neck',(0,0,.85),(0,0,.98),'Spine');bone('Head',(0,0,.98),(0,0,1.54),'Neck');bone('HairTie',(0,.31,1.17),(0,.35,.99),'Head')
for s,side in [(-1,'R'),(1,'L')]:
    bone('Clavicle.'+side,(0,0,.85),(s*.33,0,.846),'Spine')
    bone('UpperArm.'+side,(s*.33,0,.846),(s*.49,-.012,.69),'Clavicle.'+side)
    bone('Forearm.'+side,(s*.49,-.012,.69),(s*.623,-.032,.566),'UpperArm.'+side)
    bone('Hand.'+side,(s*.623,-.032,.566),(s*.709,-.060,.530),'Forearm.'+side)
    bone('Thigh.'+side,(s*.145,0,.415),(s*.17,0,.265),'Hips')
    bone('Shin.'+side,(s*.17,0,.265),(s*.17,0,.095),'Thigh.'+side)
    bone('Foot.'+side,(s*.17,0,.095),(s*.17,-.18,.095),'Shin.'+side)
bone('Spear',grip,grip+Vector((0,0,.25)),'Hand.R')
for i,point in enumerate(shard_points):bone('MagneticPlate_%02d'%(i+1),point,Vector(point)+Vector((0,0,.12)),'Spine')
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for o in parts:
    group=o.vertex_groups.new(name=bind[o.name]);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
    mod=o.modifiers.new('Guardian deformation','ARMATURE');mod.object=rig;o.parent=rig
    if o.name=='Torso' or o.name.startswith('Elbow.'):
        o.vertex_groups.clear();body=o.name=='Torso';side=o.name[-1:]
        g1=o.vertex_groups.new(name='Hips' if body else 'UpperArm.'+side);g2=o.vertex_groups.new(name='Spine' if body else 'Forearm.'+side)
        for v in o.data.vertices:
            t=max(0,min(1,(v.co.z-.44)/.27 if body else (abs(v.co.x)-.457)/.067))
            g1.add([v.index],1-t,'REPLACE');g2.add([v.index],t,'REPLACE')
hair_mesh=join(hairparts,'Hair');helm_mesh=join(helmet,'Helmet')
body_mesh=join([o for o in parts if o not in shards+[hair_mesh,helm_mesh,spear]],'Ferrha_Body')
for o in parts:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    scene.cursor.location=grip if o==spear else shard_points[shards.index(o)] if o in shards else (0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
scene.cursor.location=(0,0,0)
rig['asset']='Ferrha V3 / Ferro & Lanca';rig['class']='Tanque';rig['element']='Metal';rig['forward']='-Y Blender / +Z glTF'
for im in [base,packed,normal,emission]:im.pack()
for o in parts:o.data.calc_loop_triangles()
report={'name':'Ferrha V3','class':'Tanque','element':'Metal','triangles':sum(len(o.data.loop_triangles) for o in parts),'mesh_objects':len(parts),'meshes':[o.name for o in parts],'bones':len(armdata.bones),'materials':1,'texture_resolution':1024,'texture_maps':['BaseColor','Normal','Roughness','Metallic','ORM','Emission'],'normal_map':'Neutral tangent-space; bevels and major forms modeled','unit':'metre','root_pivot':[0,0,0],'rest_pose':'A-pose','magnetic_meshes':[o.name for o in shards],'spear_mesh':'Spear','rig':'26 bones; blended cloth elbows/waist; rigid armor; independent spear and magnetic segments','clips':[],'limitations':['No facial/finger rig','Visual animation adapter; gameplay events remain owned by game logic'],'validation':{}}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
exec((HERE/'ferrha_v3_studio.py').read_text(),globals())
print(json.dumps(report),flush=True)
__import__('os')._exit(0)
