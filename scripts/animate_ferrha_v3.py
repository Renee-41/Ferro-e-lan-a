"""Weighted guardian key poses. Facing remains outside all animation clips."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_animation import *
b=Baker('Ferrha',variant='v3');b.add_weapon('Spear','R')
shard_names=['MagneticPlate_%02d'%i for i in range(1,6)]
def spear(grip,direction,second=0):
    q=Vector((0,0,1)).rotation_difference(Vector(direction).normalized())
    o=b.weapons['Spear'][0];o.location=grip;o.rotation_quaternion=q@b.rest['Spear'].to_quaternion();b.hand('R',grip,q)
    if second:
        contact=Vector(grip)+q@Vector((0,0,.40))
        normal=b.hands['L'].location.copy();b.hand('L',contact,q)
        b.hands['L'].location=normal.lerp(b.hands['L'].location,second)
def guard(t=0):
    b.reset();a=2*math.pi*t;breath=math.sin(a)
    b.offset('Hips',(0,.006,-.038+.0025*breath));b.rot('Spine',(.055+.008*breath,0,.035));b.rot('Head',(-.03,0,-.035))
    b.hand('L',(.365,-.185,.69+.002*breath),(-.28,0,-.10))
    spear((-.37,-.17,.67+.002*breath),(-.13,-.38,.91))
    for i,name in enumerate(shard_names):
        b.offset(name,(.003*math.cos(a+i),0,.008*math.sin(a+i*.8)));b.rot(name,(0,.016*math.sin(a+i),0))
    b.rot('HairTie',(.018*math.sin(a-.4),0,.009*breath))
def walk(t):
    guard(t);a=2*math.pi*t;b.walk_feet(t,.36,.059)
    b.offset('Hips',(.017*math.cos(a),-.008,-.040+.008*math.cos(2*a)))
    b.rot('Spine',(.080,-.015*math.cos(a),.035-.044*math.sin(a)));b.rot('Head',(-.04,0,-.035+.02*math.sin(a)))
    spear((-.37+.006*math.cos(a),-.17+.018*math.sin(a),.67+.008*math.cos(2*a)),(-.13,-.38+.018*math.sin(a+.3),.91))
    b.hand('L',(.365,-.185-.030*math.sin(a),.69+.008*math.cos(2*a)),(-.28,0,-.10))
    b.rot('HairTie',(.07*math.sin(a-.4),.025*math.cos(a),0))
    for i,name in enumerate(shard_names):b.offset(name,(.007*math.cos(a+i),.010*math.sin(a+i),.013*math.sin(a+i*.8-.4)))
def attack(t,kind):
    guard();g=(-.37,-.17,.67);d=(-.13,-.38,.91)
    if kind==0:
        wind=pulse(t,0,.23,.41);drive=pulse(t,.23,.41,.93)
        grip=curve(t,[(0,g),(.23,(-.40,-.09,.735)),(.41,(-.33,-.345,.725)),(.52,(-.33,-.345,.725)),(.80,(-.38,-.19,.70)),(1,g)])
        direction=curve(t,[(0,d),(.22,(.01,-1,.07)),(.72,(.01,-1,.07)),(1,d)])
        b.offset('Hips',(0,.016*wind-.035*drive,-.038-.012*wind));b.rot('Spine',(.055+.105*drive,0,.035+.12*wind-.16*drive))
    elif kind==1:
        wind=pulse(t,0,.25,.47);drive=pulse(t,.25,.52,.96)
        grip=curve(t,[(0,g),(.25,(-.39,-.20,.76)),(.45,(-.29,-.29,.745)),(.59,(-.19,-.275,.715)),(.80,(-.34,-.22,.68)),(1,g)])
        direction=curve(t,[(0,d),(.25,(-.83,-.55,.10)),(.45,(.08,-1,.08)),(.59,(.80,-.6,.09)),(.80,(.22,-.66,.52)),(1,d)])
        twist=curve(t,[(0,(0,0,.035)),(.25,(.05,0,.26)),(.59,(.11,0,-.30)),(1,(.055,0,.035))])
        b.rot('Spine',twist);b.rot('Hips',(0,0,twist.z*.20));b.rot('Head',(-.03,0,-twist.z*.3));b.offset('Hips',(.015*math.sin(twist.z*3),0,-.041-.012*drive))
    else:
        wind=pulse(t,0,.32,.46);drive=pulse(t,.32,.46,.96)
        grip=curve(t,[(0,g),(.32,(-.40,-.085,.74)),(.46,(-.295,-.40,.71)),(.60,(-.295,-.40,.70)),(.84,(-.37,-.19,.68)),(1,g)])
        direction=curve(t,[(0,d),(.28,(.025,-1,.04)),(.75,(.025,-1,.04)),(1,d)])
        b.offset('Hips',(0,.025*wind-.083*drive,-.038-.032*wind-.012*drive));b.rot('Spine',(.055-.025*wind+.20*drive,0,.035+.17*wind-.18*drive))
        r=b.rest['Foot.L'].translation;b.feet['L'].location=(r.x,-.093*drive,r.z+.042*pulse(t,.12,.29,.46))
    spear(grip,direction);b.hand('L',(.35,-.20-.04*drive,.685+.035*wind),(-.35,0,-.15))
    for i,name in enumerate(shard_names):b.offset(name,(0,.035*pulse(t,.30,.53,.95),.018*wind))
    b.rot('HairTie',(.11*pulse(t,.30,.57,.98),0,-.06*drive))
def fortify(t,release=True):
    guard();v=smooth(t/.38)*(1-smooth((t-.78)/.22) if release else 1);brace=pulse(t,.23,.39,.62)
    b.offset('Hips',(0,.012*v,-.038-.055*v-.009*brace));b.rot('Spine',(.055+.08*v,0,.035*(1-v)));b.rot('Head',(-.03-.05*v,0,-.035*(1-v)))
    spear(Vector((-.37,-.17,.67)).lerp(Vector((-.23,-.265,.70)),v),Vector((-.13,-.38,.91)).lerp(Vector((.99,-.08,.08)),v),v)
    # Shield fan leaves the face visible. Successive plates arrive with a short magnetic delay.
    goals=[(-.49,-.45,.80),(.49,-.45,.80),(-.39,-.41,1.14),(.39,-.41,1.14),(0,-.48,.62)]
    for i,name in enumerate(shard_names):
        u=smooth((t-.035*(i%3))/.34)*(1-smooth((t-.78)/.22) if release else 1)
        b.offset(name,(Vector(goals[i])-b.rest[name].translation)*u);b.rot(name,(0,(-.18 if i%2 else .18)*u,0))
    b.rot('HairTie',(-.045*brace,0,0))
def hit(t):
    guard();v=pulse(t,0,.20,.82);b.rot('Spine',(.055-.105*v,.018*v,.035+.035*v));b.rot('Head',(-.03+.065*v,0,-.035))
    b.offset('Hips',(0,.012*v,-.038-.008*v))
def death(t):
    guard();sink=pulse(t,0,.31,.61);f=smooth((t-.25)/.48)
    b.offset('Hips',(0,.025*sink,-.038-.115*sink));b.rot('Spine',(.055+.11*sink,0,.06*sink))
    spear(Vector((-.37,-.17,.67)).lerp(Vector((-.20,-.20,.63)),f)+Vector((0,.02*sink,-.07*sink)),Vector((-.13,-.38,.91)).lerp(Vector((.02,-1,.03)),f))
    b.hand('L',Vector((.365,-.185,.69)).lerp(Vector((.22,-.19,.60)),f),(-.30,0,0))
    all_meshes=b.meshes;b.meshes=[o for o in all_meshes if o.name not in shard_names]
    b.collapse(t,start=.43,finish=.82,roll=-1.52,pitch=-.09,flatten=True);b.meshes=all_meshes
    bpy.context.view_layer.update()
    # Armor loses magnetic support and settles beside the body; it cannot prop the corpse up.
    for i,name in enumerate(shard_names):
        u=smooth((t-.37-.025*(i%2))/.50);p=b.rig.pose.bones[name];m=p.matrix.copy()
        goal=Vector(((-1 if i%2 else 1)*(.47+.15*(i//2)),.35+.15*(i%2),.055))
        q=m.to_quaternion().slerp(Euler((math.pi/2,0,.2*(i-2))).to_quaternion(),u)
        p.matrix=Matrix.LocRotScale(m.translation.lerp(goal,u),q,Vector((1,1,1)))
        bpy.context.view_layer.update();obj=bpy.data.objects[name].evaluated_get(bpy.context.evaluated_depsgraph_get())
        low=min((obj.matrix_world@v.co).z for v in obj.data.vertices)
        if low<.004:
            m=p.matrix.copy();m.translation.z+=.004-low;p.matrix=m
spec=[('Idle',2.4,guard),('Walk',.8,walk),('Attack_A',.70,lambda t:attack(t,0)),('Attack_B',1.03,lambda t:attack(t,1)),('Attack_C',1.17,lambda t:attack(t,2)),('Hit',.30,hit),('Death',1.9,death),('Special',1.6,fortify),('Barrier',1.3,lambda t:fortify(t,False))]
b.bake(spec,.36,.8,{'Attack_A':[.41],'Attack_B':[.45],'Attack_C':[.46],'Special':[.39]},'Stable guardian; short thrust, lateral beat and committed step-thrust. Special recovers; Barrier holds a metal shield fan. Root yaw belongs to the renderer.')
b.render()
