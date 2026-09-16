import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_animation import *
# Slide the unweighted support socket to the rear edge of the EXISTING foregrip.
# This permits a forward-facing aim within the short chibi arms, without remodeling.
b=Baker('Voss',{'SupportGrip':[-.658,-.222,.566]});b.add_weapon('HarpoonCrossbow','R')
def hold(grip,angles=(0,0,0)):
    b.weapon('HarpoonCrossbow',grip,angles);q=Euler(angles).to_quaternion()
    support=Vector(grip)+q@(b.rest['SupportGrip'].translation-b.rest['HarpoonCrossbow'].translation)
    b.hand('L',support,q@Euler((0,0,math.pi)).to_quaternion())
def guard(t=0):
    b.reset();a=2*math.pi*t;breath=math.sin(a)
    b.offset('Hips',(-.006,.004,-.027+.002*breath));b.rot('Spine',(.065+.006*breath,0,0));b.rot('Head',(-.035,0,0))
    hold((.035,-.17,.70+.002*breath),(.006*breath,0,0))
def walk(t):
    guard(t);a=t*2*math.pi;b.walk_feet(t,.32,.048)
    b.offset('Hips',(.014*math.cos(a),-.008,-.032+.007*math.cos(2*a)));b.rot('Spine',(.085,-.017*math.cos(a),-.027*math.sin(a)));b.rot('Head',(-.055,0,.014*math.sin(a)))
    hold((.035+.005*math.cos(a),-.165,.70+.006*math.cos(2*a)),(.013*math.sin(a),.018*math.sin(a),0))
def attack(t,kind):
    guard()
    impact=[.32,.41,.53][kind];wind=pulse(t,0,impact-.10,impact);kick=pulse(t,impact-.015,impact+.045,impact+.22)
    recover=pulse(t,impact,impact+.17,.96)
    if kind==0:
        hold((.035,-.17+.026*kick,.70+.006*wind),(-.018*wind-.045*kick,0,0));b.rot('Spine',(.065-.055*kick,0,0))
    elif kind==1:
        hold((.015,-.168+.037*kick,.706+.018*wind),(-.025*wind-.065*kick,-.17*pulse(t,0,.40,.96),0))
        b.offset('Hips',(-.025,0,-.035-.024*wind));b.rot('Spine',(.065-.07*kick,-.045*wind,0));b.rot('Head',(-.035,.025*wind,0))
    else:
        hold((.035,-.145+.040*kick,.716+.02*wind),(-.025*wind-.095*kick,.03*wind,0))
        b.offset('Hips',(0,.018*kick,-.03-.041*wind));b.rot('Spine',(.065+.04*wind-.125*kick,0,0));b.rot('Head',(-.035+.045*kick,0,0))
        r=b.rest['Foot.R'].translation;b.feet['R'].location=(r.x,.06*wind,r.z)
    # The trigger hand stays attached; brace/recoil/recovery, never a melee swing.
def special(t):
    guard();prep=pulse(t,0,.43,.64);kick=pulse(t,.64,.71,.95)
    hold((.033,-.16+.039*kick,.70+.048*prep),(-.04*prep-.11*kick,-.085*prep,0))
    b.offset('Hips',(0,.020*kick,-.027-.057*prep));b.rot('Spine',(.065+.055*prep-.12*kick,0,0));b.rot('Head',(-.035-.022*prep+.035*kick,0,0))
    r=b.rest['Foot.R'].translation;b.feet['R'].location=(r.x,.07*prep,r.z)
def hit(t):
    guard();v=pulse(t,0,.21,.91);b.rot('Spine',(.065-.16*v,0,.06*v));b.rot('Head',(.03*v,0,-.03*v));hold((.035,-.17+.055*v,.70),(-.035*v,0,0))
def death(t):
    guard();sink=pulse(t,0,.24,.61);f=smooth((t-.2)/.50)
    b.offset('Hips',(0,.025*sink,-.027-.11*sink));b.rot('Spine',(.065-.18*sink,0,.08*sink))
    hold(Vector((.035,-.17,.70)).lerp(Vector((.03,-.14,.62)),f)+Vector((0,.085*sink,-.11*sink)),(.22*f,-.20*f,0))
    b.collapse(t,start=.32,finish=.90,roll=1.47,pitch=-.08)
spec=[('Idle',2.7,guard),('Walk',.82,walk),('Attack_A',.56,lambda t:attack(t,0)),('Attack_B',.76,lambda t:attack(t,1)),('Attack_C',1.05,lambda t:attack(t,2)),('Hit',.28,hit),('Death',1.65,death),('Special',1.4,special)]
b.bake(spec,.32,.82,{'Attack_A':[.32],'Attack_B':[.41],'Attack_C':[.53],'Special':[.64]},'Straight forward aim, fast shot, canted shot, braced heavy shot and charged piercing preparation. Existing appearance/weapon preserved; support socket moved within the existing grip.')
b.render()
