"""使用 Blender 便携版制作原创漂流木筏与海湾资产，导出可编辑工程和网页 GLB。"""
import bpy, math, os, json, base64, random
from mathutils import Vector
random.seed(43)
bpy.context.preferences.filepaths.save_version=0
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
G=lambda p:Vector((p[0],-p[2],p[1]))
def mat(name,color,rough=.72,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 return m
wood=[mat('日晒柚木'+str(i),c)for i,c in enumerate([(.66,.36,.13),(.76,.46,.20),(.85,.57,.28),(.71,.40,.16)])]
grain=mat('细木纹与接缝',(.38,.21,.10));rope=mat('亚麻绳',(.86,.74,.48));foam=mat('奶油帆布',(.98,.94,.76));coral=mat('桃子汽水',(.96,.38,.29));aqua=mat('薄荷海水',(.23,.67,.63));ink=mat('海蓝五金',(.10,.29,.35),.45,.2)
leaf=[mat('棕榈叶'+str(i),c)for i,c in enumerate([(.24,.53,.29),(.34,.65,.32),(.47,.72,.37)])]
sand=mat('奶油沙滩',(.93,.80,.53));hill=mat('柔软山丘',(.36,.66,.42));rock=mat('海边岩石',(.58,.69,.58));trunk=mat('棕榈树干',(.53,.33,.17))
collections={}
for name in ['晴日木筏','海湾岛屿']:
 col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col);collections[name]=col
current=collections['晴日木筏']
def finish(o,name,m,bevel=0):
 o.name=name;o.data.materials.append(m)
 for col in list(o.users_collection):col.objects.unlink(o)
 current.objects.link(o)
 if bevel:
  mod=o.modifiers.new('圆润边缘','BEVEL');mod.width=bevel;mod.segments=2
  mod=o.modifiers.new('柔和法线','WEIGHTED_NORMAL')
 return o
def box(name,p,size,m,b=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=G(p));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,b)
def cyl(name,a,b,r,m,vertices=12):
 a,b=G(a),G(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,name,m,.025)
def sphere(name,p,scale,m):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=G(p));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m)
def torus(name,p,major,minor,m,vertical=False):
 bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,location=G(p),major_radius=major,minor_radius=minor);o=bpy.context.object
 if vertical:o.rotation_euler.x=math.pi/2
 return finish(o,name,m)

# 木筏顶面位于局部 y=0，游戏按操作台高度放置，不参与相机拟合或物理求解。
for i in range(13):
 x=(i-6)*1.5;length=21.8+random.uniform(-.2,.2)
 box('圆角甲板'+str(i),(x,-.24,1.0),(1.46,.48,length),wood[i%4],.085)
 for j in range(3):
  z=-8.6+j*6.5+random.uniform(-.6,.6)
  line=box('木材纤维',(x+random.uniform(-.55,.55),.007,z),(.018,.009,random.uniform(2.3,4.8)),grain,0)
 for z in [-8,9.8]:cyl('沉头木钉',(x,.005,z),(x,.025,z),.055,ink,8)
for x in [-6.8,0,6.8]:cyl('绑缚浮木',(x,-.85,-10.9),(x,-.85,12.0),.58,wood[0])
for z in [-7.9,8.8]:
 for x in [-8.7,8.7]:
  for off in [-.15,.15]:torus('扎筏麻绳',(x,-.27,z+off),.38,.047,rope,True)
for x in [-9.6,9.6]:
 for z in [-9.0,10.3]:cyl('系缆木桩',(x,-.6,z),(x,.85,z),.14,wood[0]);torus('绳圈',(x,.5,z),.22,.047,rope)
# 左后角的条纹阳伞与小凳，只占机台周边留白。
cyl('伞柄',(-8.2,0,-4.5),(-8.2,5.25,-4.5),.065,rope)
for i in range(12):
 a=i*math.tau/12;b=(i+1)*math.tau/12
 verts=[G((-8.2,5.65,-4.5)),G((-8.2+2.55*math.cos(a),4.9,-4.5+2.55*math.sin(a))),G((-8.2+2.55*math.cos(b),4.9,-4.5+2.55*math.sin(b)))]
 mesh=bpy.data.meshes.new('帆布伞片');mesh.from_pydata(verts,[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('苏打条纹阳伞',mesh);current.objects.link(o);o.data.materials.append(foam if i%2 else coral)
cyl('小圆桌',(-7.6,.4,-.2),(-7.6,1.25,-.2),.1,wood[0]);cyl('桌面',(-7.6,1.25,-.2),(-7.6,1.42,-.2),.9,wood[2],32)
sphere('椰子饮料',(-7.55,1.65,-.2),(.26,.27,.26),wood[0]);cyl('饮料吸管',(-7.55,1.8,-.2),(-7.45,2.18,-.2),.025,coral,6)
# 救生圈、小木箱和钓鱼竿让木筏成为可辨识的旅行场景。
torus('救生圈奶油底',(8.0,.3,5.2),.8,.22,foam)
for i in range(4):
 a=i*math.pi/2;sphere('救生圈珊瑚绳套',(8+.8*math.cos(a),.32,5.2+.8*math.sin(a)),(.28,.24,.26),coral)
box('旅行木箱',(7.8,.55,-5.8),(1.5,1.1,1.2),wood[0],.1)
for z in[-6.1,-5.5]:box('木箱束带',(7.8,.57,z),(1.54,1.13,.09),rope,.015)
cyl('钓鱼竿',(8,.2,8.5),(9.4,5.3,10.9),.055,wood[0],10)
cyl('垂钓线',(9.4,5.3,10.9),(10.1,-1.0,12.0),.013,rope,6)
sphere('漂流浮标',(10.1,-.9,12),(.13,.22,.13),coral)

current=collections['海湾岛屿']
def palm(x,y,z,s,turn=0):
 top=(x+.4*s,y+5.5*s,z)
 cyl('棕榈树干',(x,y,z),top,.19*s,trunk)
 for k in range(7):
  a=turn+k*math.tau/7;dx,dz=math.cos(a),math.sin(a);sx,sy,sz=top
  pts=[G((sx,sy,sz)),G((sx+dx*1.4*s-dz*.4*s,sy+.5*s,sz+dz*1.4*s+dx*.4*s)),G((sx+dx*3*s,sy-.5*s,sz+dz*3*s)),G((sx+dx*1.4*s+dz*.4*s,sy+.5*s,sz+dz*1.4*s-dx*.4*s))]
  mesh=bpy.data.meshes.new('棕榈叶片');mesh.from_pydata(pts,[],[(0,1,2),(0,2,3)]);mesh.update();o=bpy.data.objects.new('棕榈叶',mesh);current.objects.link(o);o.data.materials.append(leaf[k%3])
 for k in range(3):sphere('椰果',(top[0]+.3*math.cos(k*2),top[1]-.3,top[2]+.3*math.sin(k*2)),(.22,.28,.22),wood[0])
for cx,cz,scale in[(-35,-46,1),(44,-69,1.2),(-68,-96,1.4)]:
 sphere('海湾沙洲',(cx,-.8,cz),(16*scale,2.4,8*scale),sand)
 sphere('青草小岛',(cx,1.0,cz-2),(12*scale,3.3*scale,6*scale),hill)
 for i in range(5):
  px=cx+(i-2)*4.2*scale;pz=cz+random.uniform(-2,3);palm(px,2.6,pz,random.uniform(.8,1.25)*scale,random.random()*6)
 for i in range(7):sphere('灌木',(cx+random.uniform(-13,13)*scale,1.2,cz+random.uniform(-5,4)*scale),(1.8*scale,1.3*scale,1.5*scale),leaf[i%3])
 for i in range(3):sphere('圆润海石',(cx+random.uniform(-14,14)*scale,0,cz+random.uniform(3,6)*scale),(2.1,1.6,1.7),rock)

# 可编辑工程包含独立预览摄影棚；预览水面和相机不导出到游戏资产。
current=bpy.data.collections.new('场景预览');bpy.context.scene.collection.children.link(current)
water=mat('预览海水',(.19,.65,.66),.35)
box('预览海面',(0,-2.1,-65),(380,.2,300),water,0)
bpy.ops.object.camera_add(location=G((29,28,39)));camera=bpy.context.object;camera.name='木筏预览相机';camera.rotation_euler=(G((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=44
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.world.color=(.35,.55,.55)
bpy.ops.object.light_add(type='SUN',location=G((-12,25,15)));sun=bpy.context.object;sun.name='晴日柔光';sun.data.energy=2.3;sun.data.angle=.18;sun.rotation_euler=(.35,-.45,-.4)
bpy.ops.object.light_add(type='AREA',location=G((0,18,3)));fill=bpy.context.object;fill.name='海天补光';fill.data.energy=1800;fill.data.shape='DISK';fill.data.size=25
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_location=G((0,0,0));area.spaces.active.region_3d.view_distance=37
os.makedirs(os.path.join(ROOT,'models'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'models','sunny-drift.blend'))
exports={}
for name,filename in [('晴日木筏','sunny-raft.glb'),('海湾岛屿','holiday-islands.glb')]:
 bpy.ops.object.select_all(action='DESELECT')
 for o in collections[name].objects:o.select_set(True)
 if not bpy.context.selected_objects:continue
 bpy.context.view_layer.objects.active=bpy.context.selected_objects[0]
 bpy.ops.object.convert(target='MESH')
 # 静态资产按材质合并，运行时保持较少绘制调用。
 mats={}
 for o in list(collections[name].objects):
  if o.type=='MESH':mats.setdefault(o.data.materials[0].name,[]).append(o)
 for group in mats.values():
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0]
  if len(group)>1:bpy.ops.object.join()
 bpy.ops.object.select_all(action='DESELECT')
 for o in collections[name].objects:o.select_set(True)
 out=os.path.join(ROOT,'models',filename)
 bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
 exports['raft' if name=='晴日木筏' else 'islands']=base64.b64encode(open(out,'rb').read()).decode()
for key,filename in [('raft','holiday-raft.js'),('islands','holiday-islands.js')]:
 out=os.path.join(ROOT,'src','art',filename)
 open(out,'w',encoding='utf-8').write('// 原创 Blender 晴日漂流资产，由 tools/build-holiday.py 生成。\nexport default '+json.dumps(exports[key])+';\n')
print('晴日木筏与海湾资产已导出。')
