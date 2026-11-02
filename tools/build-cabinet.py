"""Original v4.2 cabinet mechanisms. Blender 5.1 bpy; game coordinates Y-up.
Run: PYTHONPATH=/data/blender-python python3 tools/build-cabinet.py
Exports editable .blend and web-ready GLB, no downloaded model dependencies.
"""
import bpy, math, os, json, base64
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
G=lambda p:Vector((p[0],-p[2],p[1]))
def material(name,c,metal=.5,rough=.35,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emission
 return m
navy=material('Deep marine enamel',(.025,.105,.15),.58,.3)
teal=material('Cast teal housings',(.08,.25,.29),.58,.32)
steel=material('Brushed nickel',(.36,.44,.47),.85,.27)
brass=material('Satin champagne brass',(.56,.39,.15),.82,.3)
black=material('Rubber / channel interior',(.012,.025,.031),.15,.72)
sideLight=material('Side indicator',(.22,.69,.57),.35,.3,.3)
midLight=material('Special indicator',(.9,.58,.17),.3,.3,.4)
root=bpy.data.objects.new('WhaleCabinetMechanisms',None);bpy.context.collection.objects.link(root)
def group(name,p=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=G(p);o.parent=root;return o
def finish(o,name,mat,parent=None,bevel=0):
 o.name=name;o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Machined edge radii','BEVEL');mod.width=bevel;mod.segments=3
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 for p in o.data.polygons:p.use_smooth=True
 if parent:
  bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
 else:o.parent=root
 return o
def box(name,p,size,mat,parent=None,b=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=G(p));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,parent,min(b,min(size)/3))
def cyl(name,a,b,r,mat,parent=None,verts=20):
 a,b=G(a),G(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat,parent,.012)
def beam(name,a,b,w,d,mat,parent=None):
 a,b=G(a),G(b);v=b-a;bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2);o=bpy.context.object;o.dimensions=(w,d,v.length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,name,mat,parent,.03)
def bolt(name,p,parent=None,axis='y'):
 q=list(p);q[{'x':0,'y':1,'z':2}[axis]]+=.055;cyl(name,p,q,.062,brass,parent,6)
# Tapered cast side decks: lofted cross sections rather than a floating box.
for s in[-1,1]:
 profiles=[(-6.25,5.38,6.67,2.9),(-3.9,5.45,6.6,2.78),(-.4,5.5,6.45,2.15),(3.8,5.58,6.3,.7),(5.1,5.6,6.2,-.55)]
 verts=[]
 for z,inner,outer,top in profiles:
  verts += [G((s*inner,top-.12,z)),G((s*outer,top,z)),G((s*outer,top-.6,z)),G((s*(inner+.1),top-.7,z))]
 faces=[]
 for i in range(len(profiles)-1):
  for j in range(4):a=i*4+j;b=i*4+(j+1)%4;faces.append((a,b,b+4,a+4))
 faces+=[(3,2,1,0),(16,17,18,19)]
 mesh=bpy.data.meshes.new('Cast loft');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Port cast side deck' if s<0 else 'Starboard cast side deck',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,teal,bevel=.075)
 for i in range(len(profiles)-1):
  z,inn,out,y=profiles[i];z2,inn2,out2,y2=profiles[i+1]
  beam('Continuous brass inner molding',(s*(inn+.045),y+.025,z),(s*(inn2+.045),y2+.025,z2),.055,.055,brass)
  beam('Outer nickel molding',(s*(out-.08),y+.02,z),(s*(out2-.08),y2+.02,z2),.075,.075,steel)
 for z,inn,out,y in profiles:bolt('Recessed deck fixing',(s*(out-.28),y+.025,z))
# Side feeders: service housing bolted on deck, curved supports, open U channel.
sideGroups={}
for name,s in [('left',-1),('right',1)]:
 g=group('Feed_'+name);sideGroups[name]=g
 box('Feeder mounting plate',(s*5.82,2.81,-4.7),(1.23,.13,1.65),steel,g,.07)
 box('Hopper cast shell',(s*5.95,3.04,-4.7),(.92,.43,1.38),navy,g,.13)
 box('Hopper brass lid',(s*5.95,3.29,-4.7),(.77,.08,1.22),brass,g,.045)
 box('Inset coin slot',(s*5.95,3.34,-4.7),(.12,.022,.85),black,g,.02)
 # Outer knees attach housing to lower channel support; all off the coin field.
 for dz in[-.61,.61]:
  beam('Feeder rigid knee',(s*5.94,2.79,-4.7+dz),(s*5.2,1.43,-4.7+dz),.17,.15,teal,g)
  beam('Feeder folded lip',(s*5.3,1.45,-4.7+dz),(s*4.34,1.45,-4.7+dz),.075,.14,steel,g)
  beam('Feeder chamfered rail',(s*5.34,1.68,-4.7+dz),(s*4.37,1.53,-4.7+dz),.095,.09,brass,g)
 box('U-channel bed',(s*4.89,1.43,-4.7),(1.13,.095,1.23),steel,g,.025)
 box('Channel rubber inset',(s*4.9,1.486,-4.7),(.91,.015,.89),black,g,.018)
 # No opaque tray in the field; mouth ends at the exact ordinary spawn x.
 box('Mouth indicator',(s*4.48,1.49,-5.35),(.28,.045,.055),sideLight,g,.015)
 for dz in[-.57,.57]:bolt('Hopper captive bolt',(s*6.13,3.34,-4.7+dz),g)
# Gantry columns mounted outside playing surface, rail carries a moving carriage.
gantry=group('SpecialFeedGantry')
for s in[-1,1]:
 box('Gantry anchor foot',(s*5.42,1.5,-.45),(.65,.18,1.0),navy,gantry,.08)
 box('Gantry pedestal',(s*5.42,2.42,-.45),(.28,1.72,.42),teal,gantry,.07)
 box('Gantry pillar inlay',(s*5.42,2.42,-.21),(.095,1.42,.025),brass,gantry,.014)
 box('Rail end casting',(s*5.42,3.25,-.45),(.58,.57,.61),navy,gantry,.1)
 for z in[-.8,-.1]:bolt('Gantry base bolt',(s*5.42,1.6,z),gantry)
 bolt('Rail end fixing',(s*5.42,3.3,-.12),gantry,axis='z')
# Dark slim rail at the break between platforms; not a giant suspended basket.
box('Linear bearing rail',(0,3.24,-.45),(10.8,.14,.19),steel,gantry,.025)
box('Rear cable conduit',(0,3.1,-.59),(10.5,.1,.12),navy,gantry,.02)
box('Rack brass guide',(0,3.31,-.49),(10.15,.035,.05),brass,gantry,.01)
carriage=group('SpecialCarriage',(0,3.24,-.45))
box('Carriage bearing body',(0,3.24,-.45),(1.04,.32,.49),navy,carriage,.09)
box('Carriage side trim',(0,3.43,-.45),(.8,.06,.43),brass,carriage,.025)
for x in[-.37,.37]:
 cyl('Rail roller',(x,3.35,-.76),(x,3.35,-.57),.13,black,carriage)
 cyl('Roller axle',(x,3.35,-.79),(x,3.35,-.72),.055,brass,carriage,12)
# Short open delivery fork, visibly connected to carriage, no filled blocking plate.
for s in[-1,1]:
 beam('Carriage nozzle cheek',(s*.48,3.1,-.34),(s*.68,2.57,.6),.095,.1,steel,carriage)
 beam('Delivery front edge',(s*.68,2.57,.6),(s*.68,2.53,.81),.09,.1,brass,carriage)
box('Nozzle rear bridge',(0,2.93,-.1),(1.05,.13,.16),teal,carriage,.04)
box('Special coin status',(0,3.25,-.18),(.42,.085,.03),midLight,carriage,.02)
# Side-mounted terminal pedestal for the responsive landscape cabinet layout.
# It is exported as a named optional subassembly, not a floating overlay.
landscape=group('LandscapeLCDDock')
box('Terminal cast plinth',(-13.3,-3.25,3.75),(13.25,.35,1.15),navy,landscape,.1)
box('Terminal brass footing',(-13.3,-3.07,3.75),(13.5,.07,1.3),brass,landscape,.025)
beam('Terminal rear support',(-13.3,-3.1,3.5),(-13.3,-.5,1.9),.38,.3,teal,landscape)
# Native outlet marker for regression comparison with actual physics spawn.
marker=group('SpecialCoinOutlet',(0,2.45,.6));bpy.context.view_layer.update();mw=marker.matrix_world.copy();marker.parent=carriage;marker.matrix_world=mw
# Front collection mouth: bolted fascia, bevelled funnel, slatted catch bed.
catch=group('FrontCoinCollector')
box('Collector recessed rear wall',(0,-1.48,3.95),(10.3,2.7,.08),navy,catch,.04)
box('Collector catch floor',(0,-2.65,4.75),(10.3,.15,1.65),black,catch,.04)
box('Collection lower fascia',(0,-2.83,4.5),(10.7,.4,.24),navy,catch,.12)
box('Mouth brass sill',(0,-.18,4.2),(10.34,.13,.3),brass,catch,.05)
box('Collection darkness',(0,-2.28,4.78),(9.85,.84,.06),black,catch,.05)
for s in[-1,1]:
 beam('Collector cheek',(s*5.15,-.24,4.2),(s*4.82,-2.52,5.1),.25,.32,teal,catch)
for x in[-4.75,-4.25,-3.75,-3.25,-2.75,-2.25,-1.75,-1.25,-.75,-.25,.25,.75,1.25,1.75,2.25,2.75,3.25,3.75,4.25,4.75]:
 box('Catch tray rib',(x,-2.52,4.97),(.045,.045,1.0),steel,catch,.01)
# Merge static mesh objects per material within each subassembly, keep animation nodes.
for owner in [root,*sideGroups.values(),gantry,carriage,catch,landscape]:
 meshes=[o for o in list(owner.children) if o.type=='MESH']
 for m in list(bpy.data.materials):
  matches=[o for o in list(owner.children) if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
  if len(matches)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in matches:o.select_set(True)
  bpy.context.view_layer.objects.active=matches[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name=owner.name+'_'+m.name
# Save art source, export optimised triangles with preserved moving carriage.
bpy.context.scene.unit_settings.system='METRIC'
blend=os.path.join(ROOT,'models/whale-cabinet.blend');glb=os.path.join(ROOT,'models/whale-cabinet.glb')
bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',export_apply=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
with open(os.path.join(ROOT,'src/art/cabinet-glb.js'),'w') as out:
 out.write('// Original Blender model; editable source in models/whale-cabinet.blend\nexport default '+json.dumps(base64.b64encode(open(glb,'rb').read()).decode())+';\n')
print(json.dumps({'blender':bpy.app.version_string,'glb':os.path.getsize(glb),'meshes':sum(o.type=='MESH' for o in bpy.context.scene.objects)},ensure_ascii=False))
# bpy wheel teardown can fault after complete save; explicit successful process exit.
os._exit(0)
