"""Validate the delivered GLB, not only the authoring scene."""
from pathlib import Path
import json, struct, math
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'assets'/'characters'/'ferrha'
raw=(ROOT/'Ferrha.glb').read_bytes()
magic,version,length=struct.unpack_from('<III',raw)
assert magic==0x46546c67 and version==2 and length==len(raw)
n,kind=struct.unpack_from('<II',raw,12)
j=json.loads(raw[20:20+n]);bstart=20+n+8;binary=raw[bstart:]
dtypes={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(i):
    a=j['accessors'][i];v=j['bufferViews'][a['bufferView']]
    dt=np.dtype(dtypes[a['componentType']]);w=width[a['type']]
    off=v.get('byteOffset',0)+a.get('byteOffset',0)
    return np.ndarray((a['count'],w),dt,buffer=binary,offset=off,strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize))
triangles=0;verts=0;degenerate=0
for mesh in j['meshes']:
    for p in mesh['primitives']:
        a=p['attributes'];pos=accessor(a['POSITION']);uv=accessor(a['TEXCOORD_0']);normal=accessor(a['NORMAL'])
        indices=accessor(p['indices']).reshape(-1,3)
        assert np.isfinite(pos).all() and np.isfinite(uv).all()
        assert np.min(uv)>=-.0001 and np.max(uv)<=1.0001
        assert np.max(indices)<len(pos)
        assert np.allclose(np.linalg.norm(normal,axis=1),1,atol=.002)
        assert np.allclose(accessor(a['WEIGHTS_0']).sum(axis=1),1,atol=.0001)
        assert accessor(a['JOINTS_0']).max()<len(j['skins'][0]['joints'])
        areas=np.linalg.norm(np.cross(pos[indices[:,1]]-pos[indices[:,0]],pos[indices[:,2]]-pos[indices[:,0]]),axis=1)
        degenerate+=int((areas<1e-12).sum());triangles+=len(indices);verts+=len(pos)
mesh_names=[n['name'] for n in j['nodes'] if 'mesh' in n]
for name in ['Spear','Helmet','Hair','Ferrha_Body']+[f'MagneticPlate_{i:02d}' for i in range(1,7)]:assert name in mesh_names,name
assert len(j['meshes'])==10
assert 15000<=triangles<=35000
clips={}
for a in j['animations']:
    times=[accessor(s['input']) for s in a['samplers']]
    clips[a['name']]=round(max(float(t.max()) for t in times),3)
    assert len(a['channels'])>0
    for s in a['samplers']:assert np.isfinite(accessor(s['output'])).all()
assert set(clips)=={'Idle','Walk','Attack','Hit','Death','Ability'}
for name in ['BaseColor','Normal','Roughness','Metallic','ORM','Emission']:
    png=(ROOT/'textures'/f'Ferrha_{name}.png').read_bytes()
    assert png[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack_from('>II',png,16)==(1024,1024)
report={'status':'PASS','glb_triangles':triangles,'exported_vertices_including_uv_splits':verts,'mesh_objects':mesh_names,'skin_joints':len(j['skins'][0]['joints']),'animation_duration_seconds':clips,'degenerate_triangles':degenerate,'checks':['GLB container length and buffers','finite geometry','normal lengths','UV bounds','indices in range','normalized skin weights','joint indices','separate named meshes','15k-35k triangle budget','six animation clips','six 1024x1024 texture maps']}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
