import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_animation import *
b=Baker('Kael')
for s in ['R','L']:b.add_weapon('Axe.'+s,s)
def guard(t=0,frenzy=0):
    b.reset();a=2*math.pi*t;breath=math.sin(a)
    b.offset('Hips',(.008*math.cos(a),-.006,-.040-.018*frenzy+.004*breath))
    b.rot('Spine',(.105+.05*frenzy+.012*breath,0,.025*math.sin(a+.5)));b.rot('Head',(-.05,0,-.018*breath))
    b.weapon('Axe.R',(-.405,-.20-.03*frenzy,.67+.004*breath),(.18+.10*frenzy,0,-.10))
    b.weapon('Axe.L',(.405,-.16-.04*frenzy,.70-.004*breath),(.08+.12*frenzy,0,.13))
def walk(t):
    guard(t);a=2*math.pi*t;b.walk_feet(t,.42,.066)
    b.offset('Hips',(.022*math.cos(a),-.013,-.045+.012*math.cos(2*a)))
    b.rot('Spine',(.14,-.026*math.cos(a),-.065*math.sin(a)))
    b.weapon('Axe.R',(-.405,-.20+.033*math.sin(a),.67+.016*math.cos(2*a)),(.20+.12*math.sin(a+.3),0,-.10))
    b.weapon('Axe.L',(.405,-.18-.033*math.sin(a),.70+.016*math.cos(2*a)),(.18-.12*math.sin(a+.3),0,.10))
def strike(t,kind):
    guard();a=pulse(t,0,.20,.40);hit=pulse(t,.20,.40,.93)
    if kind==0:
        g=curve(t,[(0,(-.405,-.20,.67)),(.23,(-.46,-.01,.88)),(.40,(-.32,-.33,.62)),(.52,(-.34,-.32,.58)),(.76,(-.42,-.18,.62)),(1,(-.405,-.20,.67))])
        ang=curve(t,[(0,(.18,0,-.1)),(.23,(-.78,.02,-.2)),(.40,(1.40,.10,-.12)),(.52,(1.65,.12,-.1)),(1,(.18,0,-.1))])
        b.weapon('Axe.R',g,ang);b.rot('Spine',(.105+.14*hit,0,.18*a-.21*hit));b.offset('Hips',(0,-.045*hit,-.04-.014*a))
    elif kind==1:
        for side,start,impact in [('R',.04,.32),('L',.34,.63)]:
            u=max(0,min(1,(t-start)/.62));sgn=-1 if side=='R' else 1
            g=curve(u,[(0,(sgn*.405,-.18,.69)),(.27,(sgn*.47,-.03,.86)),(.45,(sgn*.29,-.285,.69)),(.61,(sgn*.24,-.27,.64)),(1,(sgn*.405,-.18,.69))])
            ang=curve(u,[(0,(.12,0,sgn*.12)),(.27,(-.6,sgn*.16,sgn*.22)),(.45,(1.25,-sgn*.35,-sgn*.30)),(.61,(1.48,-sgn*.38,-sgn*.35)),(1,(.12,0,sgn*.12))])
            b.weapon('Axe.'+side,g,ang)
        twist=.22*pulse(t,.04,.21,.36)-.29*pulse(t,.22,.39,.54)+.31*pulse(t,.50,.69,.89)
        b.rot('Spine',(.14,0,twist));b.rot('Hips',(0,0,twist*.25));b.offset('Hips',(0,-.04*pulse(t,.12,.5,.97),-.046))
    else:
        wind=pulse(t,0,.29,.44);drive=pulse(t,.29,.44,.96)
        for s,side in [(-1,'R'),(1,'L')]:
            g=curve(t,[(0,(s*.405,-.18,.69)),(.29,(s*.46,.025,.99)),(.44,(s*.30,-.32,.65)),(.58,(s*.29,-.34,.60)),(.83,(s*.405,-.18,.64)),(1,(s*.405,-.18,.69))])
            ang=curve(t,[(0,(.15,0,s*.1)),(.29,(-.9,0,s*.27)),(.44,(1.38,s*.12,-s*.16)),(.58,(1.55,s*.12,-s*.16)),(1,(.15,0,s*.1))])
            b.weapon('Axe.'+side,g,ang)
        b.offset('Hips',(0,.03*wind-.082*drive,-.04-.035*wind-.015*drive));b.rot('Spine',(.10-.10*wind+.27*drive,0,.27*wind-.25*drive))
        r=b.rest['Foot.L'].translation;b.feet['L'].location=(r.x,-.085*drive,r.z+.035*pulse(t,.12,.27,.43))
def special(t):
    guard(0,1);wind=pulse(t,0,.28,.48);burst=pulse(t,.26,.54,.90)
    b.offset('Hips',(0,.015*wind,-.056-.065*wind+.01*burst));b.rot('Spine',(.15+.17*wind-.13*burst,0,0));b.rot('Head',(-.08*wind+.04*burst,0,0))
    for s,side in [(-1,'R'),(1,'L')]:
        g=curve(t,[(0,(s*.405,-.18,.69)),(.28,(s*.26,-.24,.64)),(.53,(s*.48,-.12,.99)),(.72,(s*.46,-.19,.83)),(1,(s*.405,-.23,.68))])
        a=curve(t,[(0,(.15,0,s*.1)),(.28,(.75,0,-s*.3)),(.53,(-.25,s*.18,s*.5)),(1,(.3,0,s*.12))]);b.weapon('Axe.'+side,g,a)
def hit(t):
    guard();v=pulse(t,0,.22,.9);b.rot('Spine',(.105-.23*v,.03*v,.10*v));b.rot('Head',(.12*v,0,0))
    b.offset('Hips',(0,.025*v,-.04-.012*v))
def death(t):
    guard();w=pulse(t,0,.24,.52);b.offset('Hips',(0,.035*w,-.04-.11*w));b.rot('Spine',(.105-.19*w,0,.11*w))
    for s,side in [(-1,'R'),(1,'L')]:
        f=smooth((t-.2)/.5);b.weapon('Axe.'+side,Vector((s*.405,-.18,.69)).lerp(Vector((s*.19,-.29,.63)),f),(1.3*f,0,-s*1.45*f))
    b.collapse(t,start=.35,finish=.86,roll=-1.49,pitch=-.12,flatten=True)
spec=[('Idle',2.3,guard),('Walk',.8,walk),('Attack_A',.62,lambda t:strike(t,0)),('Attack_B',1.06,lambda t:strike(t,1)),('Attack_C',1.12,lambda t:strike(t,2)),('Hit',.32,hit),('Death',1.65,death),('Special',1.3,special),('FrenzyIdle',.9,lambda t:guard(t,1))]
b.bake(spec,.42,.8,{'Attack_A':[.40],'Attack_B':[.32,.63],'Attack_C':[.44],'Special':[.53]},'Dual-axe chop, alternating combination, heavy double chop; Special enters FrenzyIdle. No gameplay damage or timers.')
b.render()
