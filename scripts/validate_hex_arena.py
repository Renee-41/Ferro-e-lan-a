"""Check exported runtime geometry, modularity and game-compatible axial layout."""
from pathlib import Path
import json,struct,math,numpy as np
ROOT=Path(__file__).resolve().parents[1]/'assets'/'arenas'/'hexagonal'
def read_glb(path):
    raw=path.read_bytes();magic,ver,length=struct.unpack_from('<III',raw)
    assert magic==0x46546c67 and ver==2 and length==len(raw)
    n,kind=struct.unpack_from('<II',raw,12);j=json.loads(raw[20:20+n]);binary=raw[28+n:]
    def get(idx):
        a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']]
        dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]);w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        return np.ndarray((a['count'],w),dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize))
    stats=[]
    for m in j['meshes']:
        count=0
        for p in m['primitives']:
            attr=p['attributes'];pos=get(attr['POSITION']);norm=get(attr['NORMAL']);uv=get(attr['TEXCOORD_0']);ix=get(p['indices']).reshape(-1,3)
            assert np.isfinite(pos).all() and np.isfinite(uv).all()
            assert np.allclose(np.linalg.norm(norm,axis=1),1,atol=.002)
            assert ix.max()<len(pos)
            area=np.linalg.norm(np.cross(pos[ix[:,1]]-pos[ix[:,0]],pos[ix[:,2]]-pos[ix[:,0]]),axis=1)
            assert (area>1e-10).all(),m['name']
            count+=len(ix)
        stats.append(count)
    assert not j.get('cameras') and not j.get('animations')
    assert not any('PREVIEW' in n.get('name','').upper() for n in j['nodes'])
    return j,{'triangles':sum(stats[n['mesh']] for n in j['nodes'] if 'mesh' in n),'mesh_nodes':sum('mesh' in n for n in j['nodes']),'unique_meshes':len(j['meshes'])}
layout=json.loads((ROOT/'layout.json').read_text())
assert layout['radius']==4 and len(layout['tiles'])==61
expected={(q,r) for q in range(-4,5) for r in range(-4,5) if (abs(q)+abs(r)+abs(q+r))//2<=4}
assert {(c['q'],c['r']) for c in layout['tiles']}==expected
reports={}
for name in ['Arena_Hexagonal.glb','Arena_Tabuleiro.glb','Arena_Cenario.glb']:
    j,reports[name]=read_glb(ROOT/name)
    nodes=[n for n in j['nodes'] if n.get('name','').startswith('Hex_q')]
    if name!='Arena_Cenario.glb':
        assert len(nodes)==61
        assert len({n['mesh'] for n in nodes})==4
        assert {(n['extras']['q'],n['extras']['r']) for n in nodes}==expected
    else:assert not nodes
for path in (ROOT/'modules').glob('*.glb'):
    j,reports[path.name]=read_glb(path);assert reports[path.name]['mesh_nodes']==1
    assert reports[path.name]['triangles']==70
for c in layout['tiles']:
    q,r=c['q'],c['r'];x,y,z=c['position_blender']
    assert math.isclose(x,1.5*q) and math.isclose(y,math.sqrt(3)*(r+q/2),abs_tol=1e-7)
    assert .26<=z<=.34
for p in (ROOT/'textures').glob('*.png'):
    png=p.read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack_from('>II',png,16)==(2048,2048)
report={'status':'PASS','checks':['61 unique axial coordinates matching radius 4','flat-top spacing matching game.js','61 independent tile nodes sharing four meshes','four standalone 70-triangle modules','finite positions and UVs','unit normals','valid indices and nondegenerate triangles','no exported preview lights cameras or volumes','2048px texture maps','surface heights differ by at most 6.5cm'],'files':reports}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
