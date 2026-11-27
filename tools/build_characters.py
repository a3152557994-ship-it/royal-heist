"""Procedural ring sculpture. Coordinates in metres, facing south."""
from math import sin, cos, pi
from pathlib import Path
import shutil
import bpy
import bmesh
from mathutils import Vector

base = Path(__file__).resolve().parents[1]
tau = 2*pi


def empty(name, loc, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = loc
    obj.empty_display_size = .035
    return obj


def shell(name, rings, mat, parent, loc=(0,0,0), smooth=True):
    n = len(rings[0])
    faces = [tuple(reversed(range(n)))]
    for j in range(len(rings)-1):
        for i in range(n):
            k = j*n+i
            b = j*n+(i+1)%n
            faces.append((k,b,b+n,k+n))
    faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(sum(rings, []), [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = loc
    mesh.materials.append(colors[mat])
    for poly in mesh.polygons:
        poly.use_smooth = smooth and len(poly.vertices)==4
    return obj


def loft(name,p,loc,rows,mat,n=16,fold=0,wave=0):
    rings=[]
    for j,(z,rx,ry,*offset) in enumerate(rows):
        ring=[]
        for i in range(n):
            a=tau*i/n
            f=1+fold*cos(8*a+.22*j)
            ring.append((rx*f*cos(a),ry*f*sin(a)+(offset or [0])[0],z+wave*cos(2*a)*rx))
        rings.append(ring)
    return shell(name,rings,mat,p,loc)


def oval(name,p,loc,r,mat,n=12):
    return loft(name,p,loc,[(r[2]*sin(a),r[0]*cos(a),r[1]*cos(a)) for a in (-1.51,-.88,-.32,.32,.88,1.51)],mat,n)


def cord(name,p,points,radii,mat,n=7):
    pts=list(map(Vector,points))
    rings=[]
    for i,(v,r) in enumerate(zip(pts,radii)):
        axis=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        u=axis.cross(Vector((1,0,0))).normalized()
        w=axis.cross(u)
        rings.append([tuple(v+r*(u*cos(tau*k/n)+w*sin(tau*k/n))) for k in range(n)])
    return shell(name,rings,mat,p)


def build(name):
    global colors
    bpy.ops.wm.read_factory_settings(use_empty=True)
    raid=name=='Raider'
    elite=name=='GuardElite'
    colors={}
    for key,rgb,metal in [
        ('silk',(.022,.048,.088) if raid else (.34,.018,.024) if elite else (.19,.028,.036),0),
        ('lapis',(.038,.095,.145) if raid else (.42,.04,.04) if elite else (.11,.025,.035),.18),
        ('ink',(.014,.019,.027),.1),
        ('red',(.48,.022,.032),.12),('gold',(.76,.42,.085),.80),
        ('bronze',(.32,.15,.048),.68),('jade',(.08,.56,.38),.32),
        ('skin',(.55,.29,.17),0),('ivory',(.89,.76,.54),.1),
        ('steel',(.52,.66,.72),.86),('reed',(.18,.105,.048) if raid else (.22,.125,.058),.12),
        ('amber',(1,.16 if elite else .52,.05),0)]:
        m=bpy.data.materials.new(key)
        m.use_nodes=True
        bs=m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=(*rgb,1)
        bs.inputs['Metallic'].default_value=metal
        bs.inputs['Roughness'].default_value=.37 if metal else .64
        if key=='amber':
            bs.inputs['Emission Color'].default_value=(*rgb,1)
            bs.inputs['Emission Strength'].default_value=2
        colors[key]=m
    body=empty('BodyGroup',(0,0,0),empty(name+'Root',(0,0,0)))
    for s,side in [(-1,'Left'),(1,'Right')]:
        x=s*(.16 if raid else .17)
        leg=empty(side+'Leg',(x,0,.74),body)
        loft('Gathered trouser',leg,(0,0,0),[(-.49,.078,.08),(-.38,.096,.102),(-.30,.11,.12),(-.26,.094,.10),(-.14,.134,.14),(.09,.12,.13)],'silk',16,.045)
        loft('Cloud toe boot',leg,(0,0,-.74),[(0,.10,.161,-.053),(.035,.108,.175,-.06),(.08,.104,.177,-.066),(.105,.09,.142,-.045),(.14,.075,.087),(.33,.087,.09)],'ink')
        oval('Raised toe',leg,(0,-.197,-.65),(.075,.065,.046),'ink')
        for j in range(4):
            loft('Wound gaiter',leg,(0,0,-.58+j*.048),[(0,.082,.089),(.012,.09,.096),(.044,.086,.092)],'lapis',12,wave=.13*s)
        arm=empty(side+'Arm',(s*(.34 if raid else .38),0,1.4 if raid else 1.42),body)
        forward=not raid and s==1
        hand=(s*(.12 if forward else .042),-.54 if forward else -.116,-.15 if forward else -.46)
        elbow=(s*(.10 if forward else .068),-.24 if forward else .008,-.17 if forward else -.236)
        cord('Silk sleeve',arm,[(0,0,0),(s*.025,-.015,-.07),elbow,tuple(Vector(elbow).lerp(Vector(hand),.38))],[.108,.125,.099,.113],'silk',14)
        cord('Vambrace',arm,[tuple(Vector(elbow).lerp(Vector(hand),t)) for t in (.29,.37,.82,.89)],[.088,.095,.067,.072],'bronze',12)
        oval('Glove',arm,hand,(.071,.081,.078),'ink')
        for j in range(2):
            loft('Scaled pauldron',arm,(s*.014,0,-.075+j*.055),[(0,.14-j*.009,.139),(.023,.144-j*.009,.141),(.073,.099,.101),(.092,.045,.047)],'gold' if elite else ('bronze' if j else 'ink'),14,wave=.12)
        if (raid and s==1) or (not raid and s==-1):
            x,y,z=hand
            cord('Ray skin grip',arm,[(x,y+.14,z),(x,y-.14,z)],[.031,.03],'gold' if elite else 'reed')
            oval('Pommel',arm,(x,y+.14,z),(.043,.04,.043),'gold')
            cord('Horned quillons',arm,[(x,y-.16,z-.074),(x,y-.13,z-.034),(x,y-.14,z+.035),(x,y-.18,z+.075)],[.009,.029,.028,.008],'gold')
            rings=[]
            for t in (0,.22,.55,.8,.94,1):
                h=.045*(1-t**5)+.001
                cy=y-.16-t*(.36 if raid else .62)
                cz=z+.102*t*t
                rings.append([(x,cy,cz-h),(x+.013*(1-.95*t),cy,cz+h*.35),(x,cy,cz+h),(x-.013*(1-.95*t),cy,cz+h*.35)])
            shell('Willow leaf blade',rings,'steel',arm,smooth=False)
        if forward:
            tip=(.15,-1.04,-.06)
            cord('Bent rosewood staff',arm,[(.11,-.32,-.20),hand,(.13,-.79,-.08),(.14,-.95,-.035),tip],[.025,.025,.022,.022,.018],'reed')
            pivot=empty('LanternPivot',tip,arm)
            cord('Suspension',pivot,[(0,0,0),(0,0,-.102)],[.009,.009],'gold')
            loft('Luminous silk',pivot,(0,0,0),[(-.37,.084,.084),(-.33,.12,.12),(-.173,.12,.12),(-.15,.096,.096)],'amber',6)
            for i in range(6):
                a=i*tau/6
                cord('Carved rib',pivot,[(r*cos(a),r*sin(a),z) for r,z in [(.087,-.37),(.124,-.33),(.124,-.17),(.103,-.15)]],[.009]*4,'gold')
            loft('Pagoda canopy',pivot,(0,0,0),[(-.169,.154,.154),(-.15,.161,.161),(-.145,.10,.10),(-.099,.036,.036)],'bronze',6)
            for i in range(6):
                a=tau*i/6
                cord('Eave hook',pivot,[(r*cos(a),r*sin(a),z) for r,z in [(.09,-.14),(.15,-.15),(.169,-.125)]],[.014,.012,.003],'gold')
            loft('Pendant fringe',pivot,(0,0,0),[(-.506,.024,.025),(-.42,.014,.015),(-.393,.023,.023),(-.37,.012,.012)],'red',12,.07)
    loft('Pleated riding coat',body,(0,0,0),[(.55 if raid else .44,.33,.218),(.594,.322,.21),(.79,.283,.177),(.96,.224,.151),(1.08,.208,.155),(1.27,.284,.18),(1.39,.32,.157),(1.45,.219,.13),(1.47,.11,.085)],'silk',32,.057,.07)
    for s in [-1,1]:
        cord('Crossed brocade lapel',body,[(s*.09,-.08,1.49),(s*.136,-.127,1.42),(s*.077,-.175,1.34),(-s*.115,-.156,1.17)],[.028,.033,.027,.014],'lapis')
    loft('Waist girdle',body,(0,0,0),[(.966,.233,.168),(.986,.243,.175),(1.052,.233,.17),(1.071,.225,.165)],'red' if raid else 'bronze')
    oval('Engraved clasp',body,(0,-.173,1.018),(.071,.021,.045),'gold')
    oval('Jade drop',body,(.067,-.187,.944),(.023,.014,.04),'jade')
    badge=oval('Mirror medallion' if raid else 'Rank cartouche',body,(0,-.183,1.252),(.12,.027,.108),'bronze' if raid else 'gold',16 if raid else 4)
    for s in [-1,1]:
        cord('Chased cloud scroll',body,[(s*x,-.212,1.25+z) for x,z in [(0,-.051),(.036,-.02),(.063,.01),(.047,.038),(.027,.024),(.034,.013)]],[.006,.009,.008,.007,.005,.003],'gold' if raid else 'bronze')
    if raid or elite:
        rings=[]
        for t in (0,.12,.37,.69,1):
            row=[]
            for thickness in (0,.016):
                for i in (range(17) if not thickness else reversed(range(17))):
                    u=i/8-1
                    row.append((u*(.28+.16*t),.02+.25*t-.16*u*u+.033*cos(u*13)*t+thickness,-.97*t+.07*u*u*t+.024*sin(u*10)*t))
            rings.append(row)
        shell('Cape',rings,'red' if elite else 'lapis',body,(0,.22,1.42))
    if raid:
        sack=loft('LootSack',body,(0,.33,1.12),[(-.186,.091,.071),(-.157,.16,.123),(-.065,.194,.146),(.043,.175,.133),(.134,.093,.078),(.158,.048,.052),(.203,.08,.065)],'reed',20,.084)
        loft('Purse cord',sack,(0,0,.15),[(0,.062,.057),(.019,.061,.058)],'gold')
    loft('Carved jaw and temples',body,(0,0,0),[(1.43,.085,.082),(1.49,.09,.10,-.017),(1.54,.119,.113,-.011),(1.60,.144,.136),(1.68,.15,.139),(1.75,.136,.126),(1.79,.091,.095)],'skin')
    # Sculpted dark hair back-cap + Qing queue braid (eliminates bare skin & mask bleed-through at back of head)
    oval('Back hair cap',body,(0,.032,1.645),(.142,.122,.135),'ink',16)
    if raid:
        oval('Assassin hood nape',body,(0,.045,1.535),(.118,.095,.085),'ink',14)
    else:
        cord('Qing queue braid',body,[(0,.135,1.60),(0,.175,1.46),(0,.205,1.26),(0,.215,1.06),(0,.205,.90)],[.046,.042,.036,.028,.014],'ink',8)
        oval('Braid tie',body,(0,.205,.92),(.024,.024,.032),'red',10)
    for s in [-1,1]:
        oval('Ear',body,(s*.144,0,1.623),(.031,.031,.049),'skin')
        eye=oval('Eye',body,(s*.062,-.125,1.654),(.046,.019,.016),'ivory')
        eye.rotation_euler.y=-s*.12
        oval('Iris',body,(s*.057,-.143,1.653),(.014,.005,.014),'ink')
        cord('Arched brow',body,[(s*.019,-.14,1.674),(s*.069,-.139,1.691),(s*.112,-.105,1.684)],[.013,.017,.005],'ink')
    oval('Nose bridge',body,(0,-.139,1.625),(.033,.038,.051),'skin')
    loft('Silk mask' if raid else 'Pointed beard',body,(0,-.048,0),[(1.48 if raid else 1.40,.038,.075),(1.52,.100,.102),(1.56,.128,.105),(1.605,.136,.104)],'ink',16,wave=.06)
    brim=.46 if raid else .295
    h=1.99 if raid else 2.13 if elite else 2.06
    loft('Swept bamboo brim' if raid else 'Court hat',body,(0,0,0),[(1.716,brim*.98,brim*.93),(1.728,brim,brim*.95),(1.759,brim*.83,brim*.8),(1.845,brim*.39,brim*.38),(1.904,.041,.04)],'reed' if raid else 'gold' if elite else 'ink',32,wave=.092)
    loft('Gilt bound rim',body,(0,0,0),[(1.715,brim,brim*.95),(1.725,brim*1.002,brim*.952)],'gold',32,wave=.092)
    for i in range(28):
        a=tau*i/28
        cord('Bamboo splint' if raid else 'Horsehair tuft',body,[(r*cos(a),r*.95*sin(a),z+.092*cos(2*a)*r) for r,z in [(.035,1.913),(brim*.39,1.854),(brim*.77,1.772)]],[.004,.004,.003] if raid else [.012,.022,.009],'bronze' if raid else 'red',5)
    loft('Crown knot',body,(0,0,0),[(1.895,.04,.04),(1.917,.049,.047),(1.936,.028,.027),(h-.023,.032,.032),(h,.009,.009)],'red' if elite else 'gold')
    if raid:
        cord('Chin tie',body,[(-.147,0,1.728),(-.127,-.062,1.574),(0,-.091,1.484),(.127,-.062,1.574),(.147,0,1.728)],[.007]*5,'reed')
    bpy.context.preferences.filepaths.save_version=0
    dest=base/'art'/name
    bpy.ops.wm.save_as_mainfile(filepath=str(dest.with_suffix('.blend')))
    bpy.ops.export_scene.gltf(filepath=str(dest.with_suffix('.glb')),export_yup=True,export_normals=True,export_materials='EXPORT')
    shutil.copyfile(dest.with_suffix('.glb'),base/'public/models'/f'{name}.glb')


for character in ('Raider','Guard','GuardElite'):
    build(character)
