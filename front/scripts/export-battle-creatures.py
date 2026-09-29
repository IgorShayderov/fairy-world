"""Convert licensed Blender source assets to self-contained animated GLBs.

Run with Blender 4.5: blender -b --disable-autoexec --python this.py -- SOURCE_DIR OUTPUT_DIR
See public/models/battle/ATTRIBUTION.md for original sources and asset licenses.
"""
import bpy
import os
import sys

source, output = sys.argv[sys.argv.index('--') + 1:][:2]
os.makedirs(output, exist_ok=True)
# Clip tuples: public name, source action, start, end, duration in seconds.
models = {
    'chimera': ('cerberus.blend', 'Armature', ['Cerberus'], [
        ('Idle', 'Idle', 1, 21, 1.5), ('Walk', 'Walk', 1, 31, .9),
        ('Attack', 'Attack', 1, 41, 1.1), ('Death', 'die', 1, 35, 1.5)],
        {'Material.001': ('cerberus_texture.png', None)}),
    'hag': ('mage.blend', 'Armature', ['Cube'], [
        ('Idle', 'Idle', 1, 21, 1.5), ('Walk', 'Walk', 1, 25, .9),
        ('Attack', 'Attack', 1, 65, 1.4), ('Death', 'Die', 1, 29, 1.5)],
        {'Material.003': ('female_mage_texture.p', None)}),
    'goblin': ('goblin/Goblin.blend', 'GoblinArmature', ['Goblin'], [
        ('Idle', 'Attack-two handedAction', 0, 35, 2),
        ('Walk', 'Walk-fast', 3, 30, .9),
        ('Attack', 'Attack-two handed.002', 68, 133, 1.2),
        ('Death', 'Die-jump-ground-face4 test', 120, 206, 1.6)],
        {'Goblin-body': ('goblin-texture.png', 'goblin-normal.png'),
         'Goblin-Knife': ('Goblin-Knife-texture.png', None)}),
    'wolf': ('wolves/Wolf.blend', 'skeleton', ['Wolf.001'], [
        ('Idle', 'Armature.001Action', 1, 4, 1),
        ('Walk', 'Armature.001Action', 5, 12, .65),
        ('Attack', 'Armature.001Action', 13, 17, .8),
        ('Death', 'Armature.001Action', 18, 28, 1.2)],
        {'Fur.001': ('boar-TT7020705.png', 'boar-TT7020705_nm.png'),
         'Fur ligth.001': ('boar-TT7020726.png', 'boar-TT7020726_nm.png')}),
    'minotaur': ('minotaur/ChargerTaur.blend', 'MinotaurArm',
        ['Minotaur', 'WarAxe', 'Circle', 'Minotaur.001', 'Minotaur.002', 'Minotaur.003', 'Minotaur.005'], [
        ('Idle', 'Action.005', 1, 4, 1), ('Walk', 'Action.005', 5, 12, .7),
        ('Attack', 'Action.005', 13, 16, .85), ('Death', 'Action.005', 19, 24, 1.2)],
        {'Fur': ('catfur.jpg', None)}),
    'bone-knight': ('bone-knight.blend', 'SkelArm', ['Skeleton', 'SkullSword', 'SpikeShield'], [
        ('Idle', 'Action', 1, 4, 1), ('Walk', 'Action', 5, 12, .8),
        ('Attack', 'Action', 13, 16, .8), ('Death', 'Action', 21, 26, 1.1)], {}),
    'golem': ('golem.blend', 'Armature', ['stone'], [
        ('Idle', 'idle', 1, 100, 3), ('Walk', 'walk', 1, 35, 1.2),
        ('Attack', 'attack', 1, 35, 1.2), ('Death', 'die', 1, 15, 1.3),
        ('Hit', 'flinch', 1, 10, .4)],
        {'stoneBaked': ('stoneBaked', 'stoneNormal')}),
    'dragon': ('dragon/dragon-2_80.blend', 'Armature', ['dragon'], [
        ('Idle', 'Idle', 1, 102, 3), ('Walk', 'Walk', 1, 41, 1),
        ('Attack', 'Attack', 1, 41, 1.2), ('Death', 'Die', 1, 60, 1.8)], {}),
    'bog-lurker': ('forest/forest-monster-final.blend', 'Armature', ['Monster', 'Tree'], [
        ('Idle', 'Idle', 0, 191, 4), ('Walk', 'Walk', 0, 40, 1.3),
        ('Attack', 'Attack', 0, 30, 1.2), ('Death', 'Dying', 0, 35, 1.5)],
        {'Monster': ('forest-monster-skin1.png', 'forest-monster-norm.png'),
         'Tree': ('skin_dieing.png', 'tree-norm.png')}),
    'wraith': ('priest.blend', 'varsoi_male.000', ['Cultist.001'], [
        ('Idle', 'VM_idle', 0, 80, 3), ('Walk', 'VM_walk', 0, 34, 1),
        ('Attack', 'VM_attack_range_pistol.L', 0, 50, 1.2),
        ('Death', 'pose_base', 0, 38, 1.5)],
        {'Cultist': ('Cultist copia.png', 'CultistNormal.png')}),
    'harpy': ('harpy/Flying terror.blend', 'ArmaStalker', ['stalker'], [
        ('Idle', 'walk.001', 1, 28, 1.5), ('Walk', 'walk.001', 1, 28, .8),
        ('Attack', 'attack', 40, 71, 1), ('Death', 'die.001', 1, 40, 1.5)],
        {'skin.001': ('stalker.png.001', None)}),
}

def texture(name):
    image = bpy.data.images.get(name) or next((image for image in bpy.data.images if image.name.startswith(name + '.')), None)
    if not image:
        candidate = os.path.join(os.path.dirname(bpy.data.filepath), name)
        if os.path.exists(candidate):
            image = bpy.data.images.load(candidate)
    if not image:
        raise ValueError('Missing texture: ' + name)
    if not image.packed_file:
        image.filepath = bpy.path.abspath(image.filepath)
        image.reload()
    if max(image.size) > 1024:
        factor = 1024 / max(image.size)
        image.scale(max(1, int(image.size[0] * factor)), max(1, int(image.size[1] * factor)))
    return image

for key, (path, rig_name, mesh_names, clips, textures) in models.items():
    if len(sys.argv[sys.argv.index('--') + 1:]) > 2 and key not in sys.argv[sys.argv.index('--') + 3:]:
        continue
    bpy.ops.wm.open_mainfile(filepath=os.path.join(source, path), load_ui=False, use_scripts=False)
    scene = bpy.context.scene
    def show_collection(collection):
        collection.exclude = False
        collection.hide_viewport = False
        collection.collection.hide_viewport = False
        for child in collection.children:
            show_collection(child)
    show_collection(bpy.context.view_layer.layer_collection)
    scene.render.fps = 30
    rig = bpy.data.objects[rig_name]
    objects = [rig] + [bpy.data.objects[name] for name in mesh_names]
    # Keep attachment parents, but never export cameras, backdrop planes or alternate death rigs.
    for obj in list(objects):
        parent = obj.parent
        while parent:
            if parent not in objects:
                objects.append(parent)
            parent = parent.parent
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
        if obj.animation_data:
            obj.animation_data.action = None
            for track in list(obj.animation_data.nla_tracks):
                obj.animation_data.nla_tracks.remove(track)
    for mat in {slot.material for obj in objects if obj.type == 'MESH' for slot in obj.material_slots if slot.material}:
        if mat.use_nodes:
            continue
        color = tuple(mat.diffuse_color)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = (*color[:3], 1)
        bsdf.inputs['Roughness'].default_value = .8
        if any(word in mat.name.lower() for word in ['steel', 'iron', 'silver', 'gold']):
            bsdf.inputs['Metallic'].default_value = .65
            bsdf.inputs['Roughness'].default_value = .4
        if mat.name in textures:
            diffuse, normal = textures[mat.name]
            node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = texture(diffuse)
            mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
            if normal:
                node = mat.node_tree.nodes.new('ShaderNodeTexImage')
                node.image = texture(normal)
                node.image.colorspace_settings.name = 'Non-Color'
                normal_node = mat.node_tree.nodes.new('ShaderNodeNormalMap')
                mat.node_tree.links.new(node.outputs['Color'], normal_node.inputs['Color'])
                mat.node_tree.links.new(normal_node.outputs['Normal'], bsdf.inputs['Normal'])
    rig.animation_data_create()
    for name, action_name, start, end, seconds in clips:
        action = bpy.data.actions[action_name]
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, 0, action)
        strip.action_frame_start = start
        strip.action_frame_end = end
        strip.scale = seconds * scene.render.fps / (end - start)
        strip.extrapolation = 'NOTHING'
    scene.frame_set(0)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(output, key + '.glb'), export_format='GLB',
        use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS',
        export_skins=True, export_force_sampling=True, export_def_bones=True,
        export_materials='EXPORT', export_yup=True)
    print('EXPORTED', key, flush=True)
