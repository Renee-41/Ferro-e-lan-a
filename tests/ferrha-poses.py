"""Inspect authored skin contact and key poses with the existing Blender runtime."""
from pathlib import Path
import bpy,json,sys
from mathutils import Vector
root=Path(__file__).resolve().parents[1];out=root/'tests'/'artifacts';out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/characters/ferrha/Ferrha_v2.blend'))
s=bpy.context.scene;r=bpy.data.objects['Ferrha_Rig']
for tr in r.animation_data.nla_tracks:tr.mute=True
report={}
for name in ['Idle','Walk','Attack_A','Attack_B','Attack_C','Barrier','Death']:
    r.animation_data.action=bpy.data.actions[name];end=int(r.animation_data.action.frame_range[1]);rows=[]
    for f in range(end+1):
        s.frame_set(f);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
        row={'frame':f,'feet':[list(r.pose.bones['Foot.'+side].head) for side in ['L','R']]}
        if name=='Death' or f==0:
            row['floor']={}
            for mesh in ['Ferrha_Body','Helmet','Hair','Spear']:
                ob=bpy.data.objects[mesh].evaluated_get(deps)
                row['floor'][mesh]=min((ob.matrix_world@v.co).z for v in ob.data.vertices)
        spear=bpy.data.objects['Spear'].evaluated_get(deps)
        q=r.pose.bones['Spear'].matrix.to_quaternion()@r.data.bones['Spear'].matrix_local.to_quaternion().inverted()
        expected=r.pose.bones['Spear'].head+q@Vector((.078,.025,.00216))
        row['grip_error']=(r.pose.bones['Hand.R'].head-expected).length
        row['grip']=list(r.pose.bones['Spear'].head)
        row['axis']=list((r.pose.bones['Spear'].tail-r.pose.bones['Spear'].head).normalized())
        rows.append(row)
    report[name]=rows
(out/'pose-metrics.json').write_text(json.dumps(report,indent=2))
print('FINAL FLOOR',report['Death'][-1]['floor'],flush=True)
print('ALL DEATH MIN',min(min(row['floor'].values()) for row in report['Death']),flush=True)
print('MAX GRIP ERROR',{k:max(row['grip_error'] for row in v) for k,v in report.items()},flush=True)
assert len(r.data.bones)==26
assert max(v.co.y for v in bpy.data.objects['Hair'].data.vertices)>.37, 'Rear braid compressed again'
assert min(min(row['floor'].values()) for row in report['Death'])>-.001, 'Death penetrates floor'
assert max(row['grip_error'] for rows in report.values() for row in rows)<.002, 'Hand detached from spear'
for row in report['Walk'][:15]:
    assert abs(row['feet'][0][1]-(-.10+.4*row['frame']/30))<.003, 'Stance sliding'
    assert abs(row['feet'][0][2]-.073)<.003, 'Stance foot not planted'
for name,minimum in [('Attack_A',.25),('Attack_C',.35)]:
    rows=report[name];wind=rows[round((len(rows)-1)*(.22 if name=='Attack_A' else .29))];contact=rows[round((len(rows)-1)*.4)]
    assert wind['grip'][1]-contact['grip'][1]>minimum, 'Missing thrust extension'
    assert (Vector(rows[-1]['grip'])-Vector(rows[0]['grip'])).length<.002, 'Incomplete recovery'
b=report['Attack_B'];assert min(row['axis'][0] for row in b)<-.75 and max(row['axis'][0] for row in b)>.75, 'Missing lateral sweep'
print('POSE CHECKS PASS',flush=True)
if '--render' in sys.argv:
    s.render.resolution_x=420;s.render.resolution_y=420;s.render.resolution_percentage=100;s.cycles.samples=8
    camera=s.camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.65
    for name,f,label,pos in [('Idle',0,'front',(3,-5,2.5)),('Idle',0,'rear',(2,5,2.5)),('Idle',0,'profile',(5,0,2)),('Attack_A',8,'thrust',(5,-1,2)),('Attack_B',14,'sweep',(2,-5,2.8)),('Attack_C',13,'heavy',(5,-1,2)),('Barrier',30,'barrier',(2,-5,2.4)),('Death',54,'death',(2,-4,3))]:
        r.animation_data.action=bpy.data.actions[name];s.frame_set(f)
        camera.location=pos;camera.rotation_euler=(Vector((0,-.12,.78))-camera.location).to_track_quat('-Z','Y').to_euler()
        s.render.filepath=str(out/f'pose-{label}.png');bpy.ops.render.render(write_still=True)
