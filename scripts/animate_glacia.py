import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_animation import *
b=Baker('Glacia');b.add_weapon('Scepter','R')
def guard(t=0):
    b.reset();a=2*math.pi*t;breath=math.sin(a)
    b.offset('Hips',(.004*breath,0,-.016+.002*breath));b.rot('Spine',(.012+.006*breath,0,0));b.rot('Head',(-.012,0,.014*breath))
    b.weapon('Scepter',(-.45,-.10,.64+.004*breath),(.035,0,0));b.hand('L',(.43,-.13,.66+.008*breath),(-.55,0,0));b.rot('RobeHem',(.012*breath,0,0))
def walk(t):
    guard(t);a=t*2*math.pi;b.walk_feet(t,.32,.043)
    b.offset('Hips',(.009*math.cos(a),0,-.022+.005*math.cos(2*a)));b.rot('Spine',(.035,-.013*math.cos(a),-.025*math.sin(a)))
    b.weapon('Scepter',(-.45,-.10+.012*math.sin(a),.64+.006*math.cos(2*a)),(.035+.018*math.sin(a+.4),0,0))
    b.hand('L',(.43,-.13-.023*math.sin(a),.66+.01*math.cos(a)),(-.55,.03*math.sin(a),0));b.rot('RobeHem',(.045*math.sin(a+.45),.015*math.cos(a),0))
def attack(t,kind):
    guard();wind=pulse(t,0,.22,.40);v=pulse(t,.22,.40,.94)
    if kind==0:
        b.weapon('Scepter',(-.45,-.10+.025*wind-.075*v,.64+.026*wind),(.035+.20*v,0,0))
        b.hand('L',(.43,-.13-.09*v,.66+.055*v),(-.55-.20*v,0,0));b.rot('Spine',(.012+.035*v,0,-.035*v))
    elif kind==1:
        g=curve(t,[(0,(.43,-.13,.66)),(.22,(.46,-.10,.86)),(.40,(.42,-.29,.84)),(.61,(.24,-.31,.70)),(.80,(.38,-.22,.62)),(1,(.43,-.13,.66))])
        b.hand('L',g,(-.55-.55*v,-.12*v,.15*wind));b.weapon('Scepter',(-.47,-.10,.64+.08*v),(.035,-.08*v,0));b.rot('Spine',(.012,0,-.10*wind+.10*v))
    else:
        wind=pulse(t,0,.32,.49);seal=pulse(t,.32,.49,.96)
        b.weapon('Scepter',(-.46,-.10-.10*seal,.64+.14*wind-.055*seal),(.035+.08*seal,-.06*wind,0))
        b.hand('L',(.43-.17*seal,-.13-.18*seal,.66+.20*wind+.035*seal),(-.55-.65*seal,0,0))
        b.offset('Hips',(0,-.016*seal,-.016+.018*wind-.027*seal));b.rot('Spine',(.012+.055*seal,0,-.06*wind));b.rot('RobeHem',(.02*seal,0,0))
def special(t):
    guard();u=pulse(t,0,.55,1);cast=pulse(t,.28,.62,1)
    g=curve(t,[(0,(.43,-.13,.66)),(.22,(.36,-.19,.72)),(.45,(.45,-.19,.97)),(.64,(.48,-.24,.91)),(.83,(.36,-.30,.76)),(1,(.43,-.13,.66))])
    b.hand('L',g,(-.55-.55*cast,-.08*u,.16*u));b.weapon('Scepter',(-.46,-.10-.045*cast,.64+.16*u),(.035,-.045*u,0))
    b.offset('Hips',(0,0,-.016+.012*u));b.rot('Spine',(-.02*u,0,-.035*u));b.rot('Head',(-.04*u,0,.03*u));b.rot('CrystalFocus',(0,0,.40*u));b.rot('RobeHem',(-.035*cast,0,.02*u))
def hit(t):
    guard();v=pulse(t,0,.23,.88);b.rot('Spine',(.012-.115*v,0,.045*v));b.rot('Head',(.05*v,0,-.02*v))
def death(t):
    guard();sink=pulse(t,0,.31,.66);f=smooth((t-.30)/.57)
    b.offset('Hips',(0,.018*sink,-.016-.115*sink));b.rot('Spine',(.05+.10*sink,0,-.04*sink))
    b.weapon('Scepter',Vector((-.45,-.10,.64)).lerp(Vector((-.16,-.25,.64)),f),(.035+.25*f,0,0));b.hand('L',Vector((.43,-.13,.66)).lerp(Vector((.21,-.20,.62)),f),(-.55-.35*f,0,0))
    b.rot('RobeHem',(.12*f,0,-.04*f));b.collapse(t,start=.40,finish=.95,roll=-1.47,pitch=.02)
spec=[('Idle',3.0,guard),('Walk',.95,walk),('Attack_A',.68,lambda t:attack(t,0)),('Attack_B',1.08,lambda t:attack(t,1)),('Attack_C',1.20,lambda t:attack(t,2)),('Hit',.30,hit),('Death',2.15,death),('Special',1.8,special)]
b.bake(spec,.32,.95,{'Attack_A':[.40],'Attack_B':[.40],'Attack_C':[.49],'Special':[.62]},'Frost flick, circular seal and grounded ice pulse; Special lifts the healing palm and crystal focus. Existing FX sockets retained.')
b.render()
