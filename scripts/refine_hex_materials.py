"""Small material-only second pass; preserves geometry, UVs, layout and embedded maps."""
from pathlib import Path
import json,struct
ROOT=Path(__file__).resolve().parents[1]/'assets/arenas/hexagonal'
COLORS={
 'Basalto | borda externa':([.043,.057,.063,1],.88),
 'Basalto | chanfro iluminado':([.112,.138,.14,1],.83),
 'Ferro envelhecido':([.063,.086,.092,1],.8),
 'Bronze fosco | marcadores':([.265,.192,.083,1],.8),
 'Musgo esculpido':([.145,.196,.069,1],1),
}
for path in [*ROOT.glob('*.glb'),*ROOT.joinpath('modules').glob('*.glb')]:
    raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+size]);changed=False
    for mat in doc.get('materials',[]):
        if mat['name'] in COLORS:
            color,rough=COLORS[mat['name']];pbr=mat.setdefault('pbrMetallicRoughness',{})
            pbr.update(baseColorFactor=color,roughnessFactor=rough);changed=True
    if changed:
        data=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4)
        tail=raw[20+size:];out=struct.pack('<III',0x46546c67,2,20+len(data)+len(tail))+struct.pack('<II',len(data),0x4e4f534a)+data+tail
        path.write_bytes(out);print(path.name)
