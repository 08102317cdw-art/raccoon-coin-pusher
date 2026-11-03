"""用 Blender 制作压铸银币：真实圆边、齿边、珠点与原创鲸鱼浮雕。"""
import bpy,math,os,json,base64
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0

def material(name,color,rough):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=1;p.inputs['Roughness'].default_value=rough
 return m
silver=material('压铸银面',(.57,.63,.69),.29)
edge=material('抛光银边',(.78,.83,.88),.19)
engraved=material('浅刻线',(.39,.45,.51),.35)

def finish(obj,name,mat):
 obj.name=name;obj.data.materials.append(mat)
 for face in obj.data.polygons:face.use_smooth=True
 return obj

def medallion():
 n=64;profile=[(0,-.046),(.513,-.046),(.553,-.075),(.574,-.065),(.58,-.047),(.58,.047),(.574,.065),(.553,.075),(.513,.046),(0,.046)]
 verts=[]
 for i,(radius,z) in enumerate(profile):
  for j in range(n):
   a=j*math.tau/n;r=radius-(.0025 if i in[4,5]and j%2 else 0);verts.append((math.cos(a)*r,math.sin(a)*r,z))
 faces=[];groups=[]
 for i in range(len(profile)-1):
  for j in range(n):
   k=(j+1)%n
   if i==0:faces.append((j,(i+1)*n+k,(i+1)*n+j));groups.append(0)
   elif i==len(profile)-2:faces.append((i*n+j,i*n+k,(i+1)*n+j));groups.append(0)
   else:faces.append((i*n+j,i*n+k,(i+1)*n+k,(i+1)*n+j));groups.append(1)
 mesh=bpy.data.meshes.new('圆润压铸币坯');mesh.from_pydata(verts,[],faces);mesh.materials.append(silver);mesh.materials.append(edge);mesh.update()
 o=bpy.data.objects.new('银币坯',mesh);bpy.context.collection.objects.link(o)
 for i,p in enumerate(mesh.polygons):p.material_index=groups[i];p.use_smooth=True
 return o

def relief(name,points,z,depth=.011,mat=silver,bevel=.009):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='2D';curve.resolution_u=5;curve.fill_mode='BOTH';curve.extrude=depth/2;curve.bevel_depth=bevel;curve.bevel_resolution=2
 line=curve.splines.new('BEZIER');line.bezier_points.add(len(points)-1)
 for p,(x,y)in zip(line.bezier_points,points):p.co=(x,y,0);p.handle_left_type=p.handle_right_type='AUTO'
 line.use_cyclic_u=True;o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.location.z=z;o.data.materials.append(mat);return o

def ellipse(cx,cy,rx,ry,n=20):return[(cx+rx*math.cos(i*math.tau/n),cy+ry*math.sin(i*math.tau/n))for i in range(n)]
def line(name,points,z,r=.005,mat=engraved):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=r;curve.bevel_resolution=1
 sp=curve.splines.new('POLY');sp.points.add(len(points)-1)
 for p,(x,y)in zip(sp.points,points):p.co=(x,y,z,1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

base=medallion();body=[base]
# 珠点是实际网格，游戏中仍然只绘制一枚共享实例模型。
for side in[-1,1]:
 for i in range(32):
  a=i*math.tau/32;bpy.ops.mesh.primitive_uv_sphere_add(segments=6,ring_count=3,radius=1,location=(.462*math.cos(a),.462*math.sin(a),side*.048))
  dot=bpy.context.object;dot.scale=(.009,.009,.007);finish(dot,'铸珠',edge);body.append(dot)
 # 鲸鱼轮廓、尾鳍、胸鳍和水花均为浅浮雕，参考图的单色压印语言。
 outline=[(-.305,0),(-.285,.09),(-.22,.145),(-.12,.17),(-.01,.16),(.09,.125),(.17,.065),(.23,.08),(.225,.16),(.19,.225),(.25,.23),(.29,.16),(.35,.23),(.395,.195),(.36,.10),(.28,.005),(.18,-.085),(.06,-.16),(-.08,-.18),(-.215,-.13),(-.285,-.065)]
 shapes=[relief('一体鲸鱼浮雕',outline,side*.049,.002,silver,.004),
  relief('小胸鳍',[(-.015,-.065),(.085,-.08),(.045,-.18),(-.025,-.13)],side*.065,.002,edge,.003),
  relief('圆润肚皮',ellipse(-.105,-.09,.14,.046,20),side*.058,.002,edge,.002)]
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=(-.205,.015,side*.061));eye=bpy.context.object;eye.scale=(.013,.013,.004);finish(eye,'小眼睛',engraved);shapes.append(eye)
 for offset in[-1,1]:shapes.append(line('鲸鱼水花',[(-.10,.145),(-.12+offset*.035,.245),(-.10+offset*.095,.26)],side*.052,.005,edge))
 shapes.append(line('微笑压线',[(-.23,-.045),(-.205,-.065),(-.17,-.06)],side*.058,.0025,engraved))
 # 底面翻转法线后保持同样的凸起方向。
 for o in shapes:
  if side<0:
   o.rotation_euler.x=math.pi
   if o.type=='CURVE' and o.location.z==0:
    o.rotation_euler.x=0
  body.append(o)

# 保存完整可编辑模型，渲染相机与灯光不进入网页网格。
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.095,1)
def area(name,p,energy,size,sy):
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='RECTANGLE';o.data.size=size;o.data.size_y=sy;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
area('长条柔光箱',(-1.1,-.7,2.6),95,1.8,.48);area('右侧轮廓灯',(1.8,1.2,1.8),105,.6,2);area('正面柔光',(-.1,2.2,1.2),50,2.2,2.2)
bpy.ops.object.camera_add(location=(.38,-.85,1.70));camera=bpy.context.object;camera.name='银币产品相机';camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1.5;scene.camera=camera
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
os.makedirs(os.path.join(ROOT,'models'),exist_ok=True);os.makedirs(os.path.join(ROOT,'dist','minted-qa'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'models','minted-whale-coin.blend'))
scene.render.filepath=os.path.join(ROOT,'dist','minted-qa','Blender-压铸银币.png');bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT')
for o in body:o.select_set(True)
bpy.context.view_layer.objects.active=base;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();model=bpy.context.object;model.name='BlenderMintedWhaleCoin'
# 完整雕刻保存在工程中，网页版本单独精简以支持满台实例绘制。
source_tris=sum(len(p.vertices)-2 for p in model.data.polygons)
if source_tris>2400:
 mod=model.modifiers.new('网页网格精简','DECIMATE');mod.ratio=2400/source_tris;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
# Blender Z-up 转换为游戏 Y-up；坐标保持半径 .58、最大厚度约 .15。
out=os.path.join(ROOT,'models','minted-whale-coin.glb');bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
tris=sum(len(p.vertices)-2 for p in model.data.polygons);print('银币三角形数量',tris)
data={'glb':base64.b64encode(open(out,'rb').read()).decode(),'triangles':tris,'radius':.58,'thickness':.15}
open(os.path.join(ROOT,'src','art','minted-coin.js'),'w',encoding='utf-8').write('// Blender 原创压铸鲸鱼银币，由 tools/build-minted-coin.py 生成。\nexport default '+json.dumps(data,separators=(',',':'))+';\n')
