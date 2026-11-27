"""Blender 5.2.2 industrial prop & architecture generator for Royal Heist (夜探王府).

Generates beveled, smooth-shaded, grounded (Z=0), outward-normal .blend & .glb assets:
  - DragonChest.glb  (雕花龙纹金柜, with hinged LidPivot)
  - RosewoodChest.glb (紫檀古董箱, with hinged LidPivot)
  - Brazier.glb      (青铜三足鼎火盆)
  - WupengBoat.glb   (江南弧形乌篷快船)
  - PalacePillar.glb (汉白玉须弥座 + 朱漆斗拱宫柱 + 六角宫灯)
  - StoneLantern.glb (庭院石灯笼 / 镇宅石墩)

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_palace_props.py
"""

import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "art"
PUB_MODELS = ROOT / "public" / "models"
ART_DIR.mkdir(parents=True, exist_ok=True)
PUB_MODELS.mkdir(parents=True, exist_ok=True)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_pbr_mat(
    name: str,
    base_color,
    roughness: float = 0.5,
    metallic: float = 0.0,
    emission=None,
    emission_strength: float = 0.0,
    coat: float = 0.0,
):
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color[:3], 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if coat > 0 and "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.15
    return mat


def finalize_mesh(obj, smooth: bool = True, bevel_width: float = 0.0, bevel_segments: int = 2):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel_width > 0:
        bmesh.ops.bevel(
            bm,
            geom=list(bm.edges),
            offset=bevel_width,
            segments=bevel_segments,
            affect="EDGES",
            clamp_overlap=True,
        )
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    obj.select_set(False)
    return obj


def add_box(name, size, loc, mat, parent=None, rot=(0, 0, 0), bevel=0.015, smooth=True):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return finalize_mesh(obj, smooth=smooth, bevel_width=bevel, bevel_segments=2)


def add_lathe(name, profile_rz, segments, mat, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, smooth=True, cap_ends=True):
    """Create a revolved mesh from [(radius, z), ...] profile."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, z in profile_rz:
        ring = []
        for i in range(segments):
            ang = (i / segments) * math.tau
            v = bm.verts.new((math.cos(ang) * r, math.sin(ang) * r, z))
            ring.append(v)
        rings.append(ring)
    for ri in range(len(rings) - 1):
        r0, r1 = rings[ri], rings[ri + 1]
        for i in range(segments):
            ni = (i + 1) % segments
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))
    if cap_ends:
        if profile_rz[0][0] > 1e-4:
            bm.faces.new(list(reversed(rings[0])))
        if profile_rz[-1][0] > 1e-4:
            bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return finalize_mesh(obj, smooth=smooth, bevel_width=0.0)


def add_cylinder(name, r_bot, r_top, height, segments, mat, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, smooth=True):
    return add_lathe(
        name,
        [(r_bot, -height / 2), (r_top, height / 2)],
        segments,
        mat,
        loc=loc,
        rot=rot,
        parent=parent,
        smooth=smooth,
        cap_ends=True,
    )


def add_torus(name, major_r, minor_r, maj_seg, min_seg, mat, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, arc=math.tau):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    steps = maj_seg if arc >= math.tau - 1e-3 else maj_seg + 1
    for i in range(steps):
        u = (i / maj_seg) * arc
        cu, su = math.cos(u), math.sin(u)
        ring = []
        for j in range(min_seg):
            v = (j / min_seg) * math.tau
            r = major_r + math.cos(v) * minor_r
            x = cu * r
            y = su * r
            z = math.sin(v) * minor_r
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    loop_count = maj_seg if arc >= math.tau - 1e-3 else maj_seg
    for i in range(loop_count):
        r0 = rings[i]
        r1 = rings[(i + 1) % len(rings)]
        for j in range(min_seg):
            nj = (j + 1) % min_seg
            bm.faces.new((r0[j], r1[j], r1[nj], r0[nj]))
    if arc < math.tau - 1e-3:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return finalize_mesh(obj, smooth=True)


def add_empty(name, loc=(0, 0, 0), parent=None):
    emp = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(emp)
    emp.location = Vector(loc)
    if parent:
        emp.parent = parent
    return emp


def save_and_export(stem: str):
    blend_path = ART_DIR / f"{stem}.blend"
    glb_art = ART_DIR / f"{stem}.glb"
    glb_pub = PUB_MODELS / f"{stem}.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    for out_p in (glb_art, glb_pub):
        bpy.ops.export_scene.gltf(
            filepath=str(out_p),
            export_format="GLB",
            export_yup=True,
            export_apply=False,
            export_normals=True,
            export_materials="EXPORT",
        )
    print(f"BUILT {stem}: {glb_pub.stat().st_size} bytes")


# ============================================================
# 1 & 2. IMPERIAL TREASURE CHESTS (DragonChest / RosewoodChest)
# ============================================================
def build_chest(stem: str, dragon: bool):
    reset_scene()
    root = add_empty(f"{stem}Root", (0, 0, 0))

    if dragon:
        w, d, h = 1.48, 0.90, 0.68
        base_z = 0.14
        wood_mat = make_pbr_mat("ImperialLacquer", (0.42, 0.045, 0.04), roughness=0.24, metallic=0.08, coat=0.75)
        trim_mat = make_pbr_mat("ImperialGold", (0.86, 0.64, 0.16), roughness=0.24, metallic=0.92)
        panel_mat = make_pbr_mat("CarvedRedPanel", (0.55, 0.07, 0.05), roughness=0.30, metallic=0.14, coat=0.5)
        plinth_mat = make_pbr_mat("DarkEbonyPlinth", (0.10, 0.04, 0.03), roughness=0.45, metallic=0.1)
    else:
        w, d, h = 1.18, 0.76, 0.56
        base_z = 0.10
        wood_mat = make_pbr_mat("RosewoodLacquer", (0.20, 0.075, 0.048), roughness=0.34, metallic=0.06, coat=0.45)
        trim_mat = make_pbr_mat("AntiqueBrass", (0.72, 0.50, 0.16), roughness=0.30, metallic=0.86)
        panel_mat = make_pbr_mat("RosewoodInset", (0.28, 0.10, 0.06), roughness=0.40, metallic=0.08)
        plinth_mat = make_pbr_mat("DarkWoodFoot", (0.11, 0.05, 0.035), roughness=0.55, metallic=0.05)

    # Carved cloud-scroll corner feet (grounded at Z = 0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_box(
                f"Foot_{sx}_{sy}",
                (0.20, 0.18, base_z),
                (sx * (w * 0.44), sy * (d * 0.42), base_z * 0.5),
                plinth_mat,
                parent=root,
                bevel=0.025,
            )
    # Carved apron stretcher frame under box
    add_box("BaseApron", (w + 0.06, d + 0.06, 0.065), (0, 0, base_z + 0.02), plinth_mat, parent=root, bevel=0.015)

    # Main chest carcase (slightly wider rim molding + recessed ornamental side panels)
    body_z = base_z + 0.04 + h * 0.5
    add_box("ChestBody", (w, d, h), (0, 0, body_z), wood_mat, parent=root, bevel=0.024)
    # Front/back recessed gilded framed panels
    for sy in (-1, 1):
        add_box(
            f"FrontPanel_{sy}",
            (w * 0.76, 0.04, h * 0.68),
            (0, sy * (d * 0.5 + 0.004), body_z),
            panel_mat,
            parent=root,
            bevel=0.012,
        )
        add_box(
            f"GoldFrameTop_{sy}",
            (w * 0.80, 0.035, 0.035),
            (0, sy * (d * 0.5 + 0.012), body_z + h * 0.34),
            trim_mat,
            parent=root,
            bevel=0.008,
        )
        add_box(
            f"GoldFrameBot_{sy}",
            (w * 0.80, 0.035, 0.035),
            (0, sy * (d * 0.5 + 0.012), body_z - h * 0.34),
            trim_mat,
            parent=root,
            bevel=0.008,
        )

    # Brass/gold vertical straps & corner L-brackets
    for sx in (-w * 0.34, w * 0.34):
        add_box(f"Strap_{sx:.2f}", (0.095, d + 0.045, h + 0.01), (sx, 0, body_z), trim_mat, parent=root, bevel=0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-0.36, 0.36):
                add_box(
                    f"Corner_{sx}_{sy}_{sz}",
                    (0.14, 0.14, 0.12),
                    (sx * (w * 0.5 - 0.05), sy * (d * 0.5 - 0.05), body_z + sz * h),
                    trim_mat,
                    parent=root,
                    bevel=0.012,
                )

    # Side carrying handles (brass bail rings)
    for sx in (-1, 1):
        add_cylinder(
            f"SideMount_{sx}",
            0.09,
            0.08,
            0.03,
            14,
            trim_mat,
            loc=(sx * (w * 0.5 + 0.012), 0, body_z + 0.02),
            rot=(0, math.pi / 2, 0),
            parent=root,
        )
        add_torus(
            f"SideRing_{sx}",
            0.09,
            0.018,
            16,
            8,
            trim_mat,
            loc=(sx * (w * 0.5 + 0.035), 0, body_z - 0.04),
            rot=(0, math.pi / 2, 0),
            parent=root,
        )

    # Front Ruyi Cloud Lock Medallion (front is -Y in Blender -> +Z in glTF export!)
    lock_y = -d * 0.5 - 0.025
    add_cylinder(
        "LockPlate",
        0.15,
        0.14,
        0.032,
        18,
        trim_mat,
        loc=(0, lock_y, body_z + h * 0.24),
        rot=(math.pi / 2, 0, 0),
        parent=root,
    )
    add_box("LockHasp", (0.06, 0.04, 0.18), (0, lock_y - 0.015, body_z + h * 0.33), trim_mat, parent=root, bevel=0.008)
    add_torus(
        "LockRing",
        0.065,
        0.014,
        14,
        8,
        trim_mat,
        loc=(0, lock_y - 0.025, body_z + h * 0.16),
        rot=(math.pi / 2, 0, 0),
        parent=root,
    )

    # Hinged Vaulted Lid Pivot along back top edge (+Y in Blender -> -Z in glTF!)
    lid_top_z = base_z + 0.04 + h
    lid_pivot = add_empty("LidPivot", (0, d * 0.5, lid_top_z), parent=root)

    # Build a sculpted arched barrel-vault lid mesh in local LidPivot coordinates
    lid_h = 0.24 if dragon else 0.19
    lid_w = w + 0.07
    lid_d = d + 0.07
    mesh = bpy.data.meshes.new("VaultedLid")
    bm = bmesh.new()
    arch_steps = 10
    profile_yz = []
    for i in range(arch_steps + 1):
        t = i / arch_steps
        ang = t * math.pi
        y_local = -lid_d * 0.5 + math.cos(ang) * (lid_d * 0.5)
        z_local = 0.04 + math.sin(ang) * lid_h
        profile_yz.append((y_local, z_local))
    # Close bottom of arch
    left_verts = []
    right_verts = []
    for y_l, z_l in profile_yz:
        left_verts.append(bm.verts.new((-lid_w * 0.5, y_l, z_l)))
        right_verts.append(bm.verts.new((lid_w * 0.5, y_l, z_l)))
    # Bottom front & back corners
    lb_back = bm.verts.new((-lid_w * 0.5, 0.0, 0.0))
    lb_front = bm.verts.new((-lid_w * 0.5, -lid_d, 0.0))
    rb_back = bm.verts.new((lid_w * 0.5, 0.0, 0.0))
    rb_front = bm.verts.new((lid_w * 0.5, -lid_d, 0.0))

    # Arch skin faces
    for i in range(arch_steps):
        bm.faces.new((left_verts[i], right_verts[i], right_verts[i + 1], left_verts[i + 1]))
    # Front/back skirts & bottom
    bm.faces.new((lb_back, rb_back, right_verts[0], left_verts[0]))
    bm.faces.new((left_verts[-1], right_verts[-1], rb_front, lb_front))
    bm.faces.new((lb_front, rb_front, rb_back, lb_back))
    # End caps
    bm.faces.new([lb_back, *left_verts, lb_front])
    bm.faces.new([rb_front, *reversed(right_verts), rb_back])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    lid_obj = bpy.data.objects.new("VaultedLid", mesh)
    bpy.context.collection.objects.link(lid_obj)
    lid_obj.data.materials.append(wood_mat)
    lid_obj.parent = lid_pivot
    finalize_mesh(lid_obj, smooth=True, bevel_width=0.012, bevel_segments=2)

    # Gold lid bands extruded snugly along the exact elliptical vaulted lid profile!
    for sx in (-w * 0.34, w * 0.34):
        band_mesh = bpy.data.meshes.new(f"LidBand_{sx:.2f}")
        bm = bmesh.new()
        bw = 0.048
        b_thick = 0.022
        l_in, r_in, l_out, r_out = [], [], [], []
        for y_l, z_l in profile_yz:
            # Outward normal of ellipse arch
            ny = (y_l + lid_d * 0.5) / max(lid_d * 0.5, 1e-4)
            nz = max(0.0, (z_l - 0.04) / max(lid_h, 1e-4))
            nlen = math.hypot(ny, nz) or 1.0
            oy, oz = (ny / nlen) * b_thick, (nz / nlen) * b_thick
            l_in.append(bm.verts.new((sx - bw, y_l, z_l - 0.004)))
            r_in.append(bm.verts.new((sx + bw, y_l, z_l - 0.004)))
            l_out.append(bm.verts.new((sx - bw, y_l + oy, z_l + oz)))
            r_out.append(bm.verts.new((sx + bw, y_l + oy, z_l + oz)))
        for i in range(len(profile_yz) - 1):
            bm.faces.new((l_out[i], r_out[i], r_out[i + 1], l_out[i + 1]))
            bm.faces.new((l_in[i], l_out[i], l_out[i + 1], l_in[i + 1]))
            bm.faces.new((r_out[i], r_in[i], r_in[i + 1], r_out[i + 1]))
        bm.faces.new((l_in[0], r_in[0], r_out[0], l_out[0]))
        bm.faces.new((l_out[-1], r_out[-1], r_in[-1], l_in[-1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(band_mesh)
        bm.free()
        band_obj = bpy.data.objects.new(f"LidBand_{sx:.2f}", band_mesh)
        bpy.context.collection.objects.link(band_obj)
        band_obj.data.materials.append(trim_mat)
        band_obj.parent = lid_pivot
        finalize_mesh(band_obj, smooth=True)
    if dragon:
        # Carved imperial dragon ridge ornament along vault crown
        add_box("DragonCrestBar", (w * 0.62, 0.14, 0.08), (0, -lid_d * 0.5, lid_h + 0.055), trim_mat, parent=lid_pivot, bevel=0.02)
        for sx in (-w * 0.28, 0.0, w * 0.28):
            add_cylinder(
                f"DragonFinial_{sx:.2f}",
                0.075,
                0.02,
                0.13,
                10,
                trim_mat,
                loc=(sx, -lid_d * 0.5, lid_h + 0.12),
                parent=lid_pivot,
            )

    save_and_export(stem)


# ============================================================
# 3. BRONZE IMPERIAL TRIPOD BRAZIER (青铜三足鼎火盆)
# ============================================================
def build_brazier():
    reset_scene()
    root = add_empty("BrazierRoot", (0, 0, 0))

    bronze_dark = make_pbr_mat("AgedBronze", (0.14, 0.10, 0.07), roughness=0.42, metallic=0.84)
    bronze_gold = make_pbr_mat("PatinaGoldBronze", (0.58, 0.42, 0.17), roughness=0.30, metallic=0.88)
    ember_mat = make_pbr_mat("GlowingEmbers", (0.65, 0.10, 0.01), roughness=0.72, metallic=0.0, emission=(1.0, 0.22, 0.02), emission_strength=2.6)
    charcoal_mat = make_pbr_mat("CharredCoal", (0.045, 0.035, 0.035), roughness=0.88, metallic=0.05, emission=(0.55, 0.08, 0.01), emission_strength=0.45)
    stone_mat = make_pbr_mat("StoneBaseRing", (0.34, 0.35, 0.37), roughness=0.82, metallic=0.04)

    # Carved octagonal stone base pad (grounded at Z = 0)
    add_lathe(
        "StonePedestal",
        [(0.58, 0.0), (0.56, 0.08), (0.48, 0.12), (0.44, 0.14)],
        8,
        stone_mat,
        parent=root,
        smooth=False,
    )

    # Three curved beast-claw tripod legs (cleanly overlapping into claw pads)
    for i in range(3):
        ang = (i / 3.0) * math.tau
        leg_pivot = add_empty(f"Leg_{i}", (0, 0, 0), parent=root)
        leg_pivot.rotation_euler = Euler((0, 0, ang))
        add_lathe(f"Claw_{i}", [(0.095, 0.11), (0.09, 0.16), (0.072, 0.23)], 12, bronze_gold, loc=(0.35, 0, 0), parent=leg_pivot)
        add_cylinder(f"LegLower_{i}", 0.062, 0.074, 0.38, 12, bronze_dark, loc=(0.36, 0, 0.37), rot=(0, -0.10, 0), parent=leg_pivot)
        add_cylinder(f"LegUpper_{i}", 0.076, 0.090, 0.28, 12, bronze_dark, loc=(0.33, 0, 0.62), rot=(0, 0.20, 0), parent=leg_pivot)
        add_cylinder(f"KneeBoss_{i}", 0.085, 0.06, 0.12, 12, bronze_gold, loc=(0.39, 0, 0.56), rot=(0, math.pi / 2, 0), parent=leg_pivot)

    # Sculpted curved bronze cauldron belly + flared lip (lathe profile!)
    bowl_profile = [
        (0.02, 0.56),
        (0.24, 0.57),
        (0.42, 0.64),
        (0.50, 0.76),
        (0.48, 0.88),
        (0.54, 0.96),
        (0.60, 1.00),
        (0.58, 1.04),
        (0.49, 1.03),
        (0.46, 0.94),
    ]
    add_lathe("CauldronBowl", bowl_profile, 24, bronze_dark, parent=root, smooth=True, cap_ends=False)

    # Relief golden bands around cauldron waist & rim
    add_torus("WaistBand", 0.505, 0.024, 24, 8, bronze_gold, loc=(0, 0, 0.78), parent=root)
    add_torus("RimBand", 0.59, 0.022, 24, 8, bronze_gold, loc=(0, 0, 1.01), parent=root)

    # Twin auspicious loop ear handles + hanging rings
    for sx in (-1, 1):
        add_torus(
            f"EarLoop_{sx}",
            0.12,
            0.026,
            16,
            8,
            bronze_gold,
            loc=(sx * 0.54, 0, 1.04),
            rot=(math.pi / 2, 0, 0),
            parent=root,
            arc=math.pi * 1.15,
        )
        add_torus(
            f"SideRing_{sx}",
            0.095,
            0.018,
            14,
            8,
            bronze_gold,
            loc=(sx * 0.52, 0, 0.78),
            rot=(0, math.pi / 2, 0),
            parent=root,
        )

    # Glowing ember base topped with dark charred charcoal chunks for realistic fire-bowl contrast
    add_lathe(
        "CharcoalBed",
        [(0.45, 0.91), (0.42, 0.96), (0.28, 1.01), (0.12, 1.04), (0.01, 1.05)],
        16,
        ember_mat,
        parent=root,
        smooth=True,
    )
    for idx, (lx, ly, lz, rx, ry, rz) in enumerate([
        (-0.14, 0.08, 1.03, 0.25, 0.15, 0.4),
        (0.15, -0.06, 1.04, -0.18, 0.22, 1.2),
        (0.02, -0.16, 1.01, 0.30, -0.12, -0.6),
        (-0.08, -0.10, 1.06, -0.22, -0.20, 2.1),
        (0.12, 0.14, 1.02, 0.15, -0.25, 0.9),
        (-0.22, -0.04, 1.00, 0.10, 0.30, 1.8),
        (0.0, 0.03, 1.08, 0.20, -0.15, 0.1),
    ]):
        add_box(f"CharChunk_{idx}", (0.24, 0.095, 0.085), (lx, ly, lz), charcoal_mat, parent=root, rot=(rx, ry, rz), bevel=0.024)

    save_and_export("Brazier")


# ============================================================
# 4. JIANGNAN CURVED WUPENG ESCAPE BOAT (江南月夜乌篷快船)
# ============================================================
def build_wupeng_boat():
    reset_scene()
    root = add_empty("WupengBoatRoot", (0, 0, 0))

    hull_wood = make_pbr_mat("AgedBoatWood", (0.22, 0.12, 0.065), roughness=0.62, metallic=0.05)
    deck_wood = make_pbr_mat("WetDeckPlank", (0.28, 0.17, 0.095), roughness=0.58, metallic=0.04)
    canopy_mat = make_pbr_mat("WovenBambooBlack", (0.07, 0.075, 0.085), roughness=0.72, metallic=0.06)
    brass_trim = make_pbr_mat("BoatBrassTrim", (0.78, 0.56, 0.18), roughness=0.28, metallic=0.86)
    lantern_jade = make_pbr_mat("EscapeJadeLantern", (0.16, 0.88, 0.62), roughness=0.25, metallic=0.0, emission=(0.12, 0.92, 0.58), emission_strength=4.2)

    # Sculpted curved canoe/sampan hull along X axis (-2.95 to +2.95) with upturned prows!
    stations = [
        # (x, half_w_bot, half_w_top, z_bot, z_top)
        (-3.05, 0.02, 0.06, 0.52, 0.64),
        (-2.50, 0.24, 0.44, 0.14, 0.58),
        (-1.60, 0.52, 0.78, 0.02, 0.54),
        (-0.50, 0.64, 0.90, 0.00, 0.52),
        (0.60,  0.64, 0.90, 0.00, 0.52),
        (1.65,  0.50, 0.76, 0.04, 0.56),
        (2.55,  0.22, 0.42, 0.18, 0.64),
        (3.15,  0.02, 0.06, 0.60, 0.74),
    ]
    mesh = bpy.data.meshes.new("CurvedHull")
    bm = bmesh.new()
    rings = []
    for x, wb, wt, zb, zt in stations:
        # 6-point cross-section (port top -> port bilge -> keel -> stbd bilge -> stbd top -> inner hollow)
        pts = [
            (x, -wt, zt),
            (x, -wb, zb + 0.06),
            (x, 0.0, zb),
            (x, wb, zb + 0.06),
            (x, wt, zt),
            (x, wt * 0.84, zt - 0.05),
            (x, wb * 0.82, zb + 0.14),
            (x, -wb * 0.82, zb + 0.14),
            (x, -wt * 0.84, zt - 0.05),
        ]
        rings.append([bm.verts.new(p) for p in pts])
    n_pts = len(rings[0])
    for i in range(len(rings) - 1):
        r0, r1 = rings[i], rings[i + 1]
        for j in range(n_pts):
            nj = (j + 1) % n_pts
            bm.faces.new((r0[j], r1[j], r1[nj], r0[nj]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    hull_obj = bpy.data.objects.new("CurvedHull", mesh)
    bpy.context.collection.objects.link(hull_obj)
    hull_obj.data.materials.append(hull_wood)
    hull_obj.parent = root
    finalize_mesh(hull_obj, smooth=True)

    # Interior floor planks & wooden seat thwarts
    add_box("DeckFloor", (3.8, 1.05, 0.06), (0.0, 0, 0.18), deck_wood, parent=root, bevel=0.01)
    for tx in (-1.55, 1.45):
        add_box(f"Thwart_{tx:.1f}", (0.34, 1.38, 0.065), (tx, 0, 0.44), deck_wood, parent=root, bevel=0.012)

    # Arched multi-layered black woven bamboo canopy (乌篷) with curved roof eaves!
    canopy_mesh = bpy.data.meshes.new("BambooCanopy")
    bm = bmesh.new()
    c_len = 2.45
    c_x0 = -1.35
    c_segs = 14
    thick = 0.055
    for seg_i in range(c_segs + 1):
        pass
    front_out, back_out, front_in, back_in = [], [], [], []
    for i in range(c_segs + 1):
        ang = (i / c_segs) * math.pi
        cy = math.cos(ang) * 0.86
        cz = 0.50 + math.sin(ang) * 0.92
        cy_i = math.cos(ang) * (0.86 - thick)
        cz_i = 0.50 + math.sin(ang) * (0.92 - thick)
        front_out.append(bm.verts.new((c_x0 + c_len, cy, cz)))
        back_out.append(bm.verts.new((c_x0, cy, cz)))
        front_in.append(bm.verts.new((c_x0 + c_len, cy_i, cz_i)))
        back_in.append(bm.verts.new((c_x0, cy_i, cz_i)))
    for i in range(c_segs):
        bm.faces.new((back_out[i], front_out[i], front_out[i + 1], back_out[i + 1]))
        bm.faces.new((front_in[i], back_in[i], back_in[i + 1], front_in[i + 1]))
        bm.faces.new((front_out[i], front_in[i], front_in[i + 1], front_out[i + 1]))
        bm.faces.new((back_in[i], back_out[i], back_out[i + 1], back_in[i + 1]))
    # Bottom edge caps
    bm.faces.new((back_out[0], back_in[0], front_in[0], front_out[0]))
    bm.faces.new((front_out[-1], front_in[-1], back_in[-1], back_out[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(canopy_mesh)
    bm.free()
    canopy_obj = bpy.data.objects.new("BambooCanopy", canopy_mesh)
    bpy.context.collection.objects.link(canopy_obj)
    canopy_obj.data.materials.append(canopy_mat)
    canopy_obj.parent = root
    finalize_mesh(canopy_obj, smooth=True)

    # Ornate arched bamboo & brass binding hoops along canopy
    for hx in (-1.30, -0.52, 0.28, 1.05):
        add_torus(
            f"CanopyRib_{hx:.2f}",
            0.88,
            0.032,
            18,
            8,
            brass_trim,
            loc=(hx, 0, 0.50),
            rot=(math.pi / 2, 0, math.pi / 2),
            parent=root,
            arc=math.pi,
        )

    # Traditional stern sculling oar (摇橹) resting across stern
    add_cylinder("OarShaft", 0.028, 0.032, 2.35, 8, deck_wood, loc=(-2.2, 0.28, 0.62), rot=(0.15, 1.32, 0.22), parent=root)
    add_box("OarBlade", (0.72, 0.16, 0.03), (-3.28, 0.48, 0.34), deck_wood, parent=root, rot=(0.15, 0.25, 0.22), bevel=0.008)

    # Curved bow lantern pole & ornate hexagonal emerald-jade beacon lantern!
    add_cylinder("BowPole", 0.034, 0.024, 1.55, 8, hull_wood, loc=(2.18, 0, 1.12), rot=(0, 0.30, 0), parent=root)
    add_cylinder("BowPoleHook", 0.022, 0.018, 0.36, 8, brass_trim, loc=(2.54, 0, 1.78), rot=(0, 1.38, 0), parent=root)
    # Hexagonal Palace Lantern on bow
    lan_x, lan_z = 2.68, 1.48
    add_cylinder("LanternCord", 0.008, 0.008, 0.20, 6, brass_trim, loc=(lan_x, 0, lan_z + 0.25), parent=root)
    add_lathe("LanternRoof", [(0.22, 0.0), (0.14, 0.06), (0.04, 0.11), (0.01, 0.14)], 6, canopy_mat, loc=(lan_x, 0, lan_z + 0.14), parent=root, smooth=False)
    add_cylinder("LanternCore", 0.14, 0.16, 0.30, 6, lantern_jade, loc=(lan_x, 0, lan_z), parent=root, smooth=False)
    add_lathe("LanternBase", [(0.14, 0.0), (0.10, -0.05), (0.05, -0.08)], 6, brass_trim, loc=(lan_x, 0, lan_z - 0.15), parent=root, smooth=False)
    # Lantern corner ribs
    for i in range(6):
        a = (i / 6.0) * math.tau
        add_cylinder(
            f"LanternRib_{i}",
            0.011,
            0.011,
            0.31,
            6,
            brass_trim,
            loc=(lan_x + math.cos(a) * 0.155, math.sin(a) * 0.155, lan_z),
            parent=root,
        )

    save_and_export("WupengBoat")


# ============================================================
# 5. QING IMPERIAL PALACE COLUMN WITH DOUGONG & LANTERN (朱红斗拱宫柱)
# ============================================================
def build_palace_pillar():
    reset_scene()
    root = add_empty("PalacePillarRoot", (0, 0, 0))

    marble_mat = make_pbr_mat("CarvedMarble", (0.76, 0.74, 0.70), roughness=0.58, metallic=0.03)
    lacquer_red = make_pbr_mat("PalaceRedLacquer", (0.42, 0.045, 0.035), roughness=0.34, metallic=0.06, coat=0.45)
    gold_mat = make_pbr_mat("ImperialGoldLeaf", (0.86, 0.64, 0.18), roughness=0.24, metallic=0.90)
    teal_beam = make_pbr_mat("QingTealDouGong", (0.07, 0.24, 0.22), roughness=0.42, metallic=0.12)
    lantern_red = make_pbr_mat("PalaceLanternSilk", (0.95, 0.26, 0.08), roughness=0.35, metallic=0.0, emission=(1.0, 0.24, 0.06), emission_strength=3.6)

    # Multi-tier carved white marble drum plinth (须弥座 + 鼓镜柱础, grounded Z=0)
    add_box("SquarePlinth", (1.26, 1.26, 0.18), (0, 0, 0.09), marble_mat, parent=root, bevel=0.025)
    add_lathe(
        "MarbleDrumBase",
        [(0.58, 0.18), (0.60, 0.24), (0.52, 0.34), (0.55, 0.42), (0.47, 0.50)],
        20,
        marble_mat,
        parent=root,
        smooth=True,
    )

    # Tapered vermilion lacquered palace column shaft
    add_lathe(
        "ColumnShaft",
        [(0.44, 0.50), (0.42, 1.80), (0.39, 3.00)],
        24,
        lacquer_red,
        parent=root,
        smooth=True,
    )
    # Ornate gilded neck & base rings
    add_torus("BaseGoldCollar", 0.445, 0.025, 24, 8, gold_mat, loc=(0, 0, 0.52), parent=root)
    add_torus("NeckGoldCollar", 0.40, 0.032, 24, 8, gold_mat, loc=(0, 0, 2.86), parent=root)
    add_torus("NeckGoldCollar2", 0.395, 0.022, 24, 8, gold_mat, loc=(0, 0, 2.74), parent=root)

    # Layered Qing Dougong Bracket Capital (斗拱)
    add_box("DougongTier1", (0.98, 0.98, 0.16), (0, 0, 3.06), teal_beam, parent=root, bevel=0.015)
    add_box("DougongGoldStrip", (1.06, 1.06, 0.05), (0, 0, 3.16), gold_mat, parent=root, bevel=0.01)
    add_box("DougongTier2", (1.28, 1.28, 0.18), (0, 0, 3.27), teal_beam, parent=root, bevel=0.018)
    # Four protruding carved bracket arms
    for ang in (0, math.pi / 2, math.pi, 1.5 * math.pi):
        bx, by = math.cos(ang) * 0.52, math.sin(ang) * 0.52
        add_box(f"BracketArm_{ang:.1f}", (0.42, 0.14, 0.14), (bx, by, 3.12), gold_mat, parent=root, rot=(0, 0, ang), bevel=0.012)

    # Carved overhanging lantern arm & hanging hexagonal Imperial Palace Lantern (on -Y -> +Z south face)
    add_box("LanternArm", (0.075, 0.72, 0.075), (0, -0.70, 2.74), gold_mat, parent=root, bevel=0.01)
    add_box("LanternScroll", (0.06, 0.36, 0.06), (0, -0.56, 2.60), gold_mat, parent=root, rot=(0.55, 0, 0), bevel=0.01)
    ly, lz = -1.00, 2.28
    add_cylinder("PillarLanternCord", 0.012, 0.012, 0.24, 6, gold_mat, loc=(0, ly, lz + 0.34), parent=root)
    add_lathe("PillarLanternRoof", [(0.28, 0.0), (0.18, 0.08), (0.05, 0.15), (0.01, 0.19)], 6, gold_mat, loc=(0, ly, lz + 0.18), parent=root, smooth=False)
    add_cylinder("PillarLanternSilk", 0.18, 0.21, 0.38, 6, lantern_red, loc=(0, ly, lz), parent=root, smooth=False)
    add_lathe("PillarLanternBase", [(0.19, 0.0), (0.13, -0.06), (0.04, -0.10)], 6, gold_mat, loc=(0, ly, lz - 0.19), parent=root, smooth=False)
    # Hanging crimson silk tassel
    add_cylinder("PillarLanternTassel", 0.045, 0.018, 0.24, 8, lacquer_red, loc=(0, ly, lz - 0.38), parent=root)
    for i in range(6):
        a = (i / 6.0) * math.tau
        add_cylinder(
            f"PillarLanternRib_{i}",
            0.014,
            0.014,
            0.40,
            6,
            gold_mat,
            loc=(math.cos(a) * 0.20, ly + math.sin(a) * 0.20, lz),
            parent=root,
        )

    save_and_export("PalacePillar")


# ============================================================
# 6. CARVED IMPERIAL STONE GUARDIAN LION / COURTYARD LANTERN (庭院石灯笼)
# ============================================================
def build_stone_lantern():
    reset_scene()
    root = add_empty("StoneLanternRoot", (0, 0, 0))

    granite = make_pbr_mat("CarvedGranite", (0.42, 0.44, 0.46), roughness=0.78, metallic=0.04)
    moss_stone = make_pbr_mat("MossyGranite", (0.28, 0.33, 0.28), roughness=0.84, metallic=0.02)
    warm_core = make_pbr_mat("WarmLanternLight", (1.0, 0.72, 0.34), roughness=0.3, emission=(1.0, 0.65, 0.22), emission_strength=3.5)

    # Hexagonal lotus pedestal (Z=0)
    add_lathe(
        "Pedestal",
        [(0.46, 0.0), (0.44, 0.12), (0.34, 0.20), (0.38, 0.28), (0.26, 0.34)],
        6,
        moss_stone,
        parent=root,
        smooth=False,
    )
    # Carved stone shaft
    add_lathe(
        "Shaft",
        [(0.20, 0.34), (0.17, 0.78), (0.21, 1.15), (0.34, 1.24), (0.36, 1.32)],
        6,
        granite,
        parent=root,
        smooth=False,
    )
    # Glowing lantern fire-box + 6 stone corner mullions
    add_cylinder("LightCore", 0.18, 0.18, 0.34, 6, warm_core, loc=(0, 0, 1.49), parent=root, smooth=False)
    for i in range(6):
        a = (i / 6.0) * math.tau
        add_cylinder(f"Mullion_{i}", 0.032, 0.032, 0.38, 6, granite, loc=(math.cos(a) * 0.23, math.sin(a) * 0.23, 1.50), parent=root)

    # Sweeping upturned hexagonal pagoda roof + lotus bud finial
    add_lathe(
        "PagodaRoof",
        [(0.48, 1.66), (0.54, 1.72), (0.34, 1.84), (0.16, 1.98), (0.08, 2.04), (0.11, 2.11), (0.04, 2.20), (0.01, 2.26)],
        6,
        granite,
        parent=root,
        smooth=False,
    )
    save_and_export("StoneLantern")


# ============================================================
# 7. GNARLED QING COURTYARD ANCIENT PINE (王府月夜古松)
# ============================================================
def build_palace_pine():
    """Sculpted windswept Qing courtyard pine with gnarled curved trunk, forked boughs & organic needle cloud pads."""
    reset_scene()
    root = add_empty("PalaceTreeRoot", (0, 0, 0))

    bark_mat = make_pbr_mat("PineBark", (0.16, 0.11, 0.085), roughness=0.88, metallic=0.02)
    foliage_dark = make_pbr_mat("PineNeedleDeep", (0.055, 0.145, 0.105), roughness=0.82, metallic=0.02)
    foliage_mid = make_pbr_mat("PineNeedleMoonlit", (0.085, 0.21, 0.15), roughness=0.78, metallic=0.03)

    def make_tube_branch(name, pts_r, segs, mat):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        rings = []
        for idx, (pt, r) in enumerate(pts_r):
            p = Vector(pt)
            if idx < len(pts_r) - 1:
                tang = (Vector(pts_r[idx + 1][0]) - p).normalized()
            else:
                tang = (p - Vector(pts_r[idx - 1][0])).normalized()
            up_ref = Vector((0, 0, 1)) if abs(tang.z) < 0.92 else Vector((1, 0, 0))
            side = tang.cross(up_ref).normalized()
            binorm = tang.cross(side).normalized()
            ring = []
            for s in range(segs):
                a = (s / segs) * math.tau
                vpos = p + (side * math.cos(a) + binorm * math.sin(a)) * r
                ring.append(bm.verts.new(vpos))
            rings.append(ring)
        for ri in range(len(rings) - 1):
            r0, r1 = rings[ri], rings[ri + 1]
            for s in range(segs):
                ns = (s + 1) % segs
                bm.faces.new((r0[s], r0[ns], r1[ns], r1[s]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(mat)
        obj.parent = root
        return finalize_mesh(obj, smooth=True)

    # Flared surface roots + gently S-curved gnarled main trunk (grounded at Z = 0)
    make_tube_branch(
        "MainTrunk",
        [
            ((0.0, 0.0, 0.0), 0.42),
            ((0.04, -0.04, 0.55), 0.30),
            ((0.18, 0.08, 1.35), 0.25),
            ((0.10, 0.16, 2.25), 0.21),
            ((-0.14, 0.08, 3.15), 0.16),
            ((-0.26, -0.06, 4.05), 0.11),
            ((-0.15, -0.10, 4.75), 0.06),
        ],
        12,
        bark_mat,
    )
    # Four flared roots gripping the soil
    for i in range(4):
        a = i * (math.pi / 2) + 0.35
        make_tube_branch(
            f"Root_{i}",
            [
                ((math.cos(a) * 0.18, math.sin(a) * 0.18, 0.35), 0.15),
                ((math.cos(a) * 0.50, math.sin(a) * 0.50, 0.10), 0.10),
                ((math.cos(a) * 0.78, math.sin(a) * 0.78, 0.0), 0.04),
            ],
            8,
            bark_mat,
        )

    # Sweeping bonsai-style palace pine boughs
    boughs = [
        ("Bough_E", [((0.14, 0.12, 2.15), 0.13), ((0.85, 0.28, 2.38), 0.09), ((1.55, 0.18, 2.52), 0.045)]),
        ("Bough_W", [((0.04, 0.12, 2.60), 0.12), ((-0.75, -0.22, 2.85), 0.08), ((-1.45, -0.35, 3.02), 0.04)]),
        ("Bough_N", [((-0.12, 0.06, 3.20), 0.10), ((0.18, 0.88, 3.45), 0.07), ((0.35, 1.48, 3.60), 0.035)]),
        ("Bough_S", [((-0.18, 0.02, 3.55), 0.095), ((0.45, -0.78, 3.78), 0.065), ((0.85, -1.32, 3.92), 0.035)]),
        ("Bough_Top", [((-0.24, -0.05, 4.10), 0.08), ((-0.82, 0.35, 4.38), 0.05), ((-1.15, 0.55, 4.52), 0.03)]),
    ]
    for bname, pts in boughs:
        make_tube_branch(bname, pts, 8, bark_mat)

    # Sculpted flattened organic pine-needle cloud clusters (云片松针, icosphere-sculpted pads!)
    clusters = [
        ((1.48, 0.16, 2.66), (1.15, 0.92, 0.38), foliage_dark),
        ((0.92, 0.32, 2.58), (0.82, 0.70, 0.32), foliage_mid),
        ((-1.42, -0.34, 3.16), (1.18, 0.95, 0.40), foliage_dark),
        ((-0.82, -0.18, 3.04), (0.78, 0.68, 0.32), foliage_mid),
        ((0.36, 1.42, 3.74), (1.12, 0.92, 0.38), foliage_dark),
        ((0.88, -1.26, 4.06), (1.05, 0.88, 0.36), foliage_mid),
        ((-1.10, 0.54, 4.64), (1.02, 0.86, 0.36), foliage_dark),
        ((-0.12, -0.06, 5.02), (1.35, 1.15, 0.48), foliage_mid),
        ((0.28, 0.18, 4.86), (0.95, 0.82, 0.36), foliage_dark),
    ]
    for ci, (loc, sc, mat) in enumerate(clusters):
        mesh = bpy.data.meshes.new(f"PinePad_{ci}")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts:
            # Organic ruffled pine-bough silhouette (flat underside, billowy top)
            ang = math.atan2(v.co.y, v.co.x)
            ruff = 1.0 + 0.14 * math.sin(ang * 5.0 + ci * 1.7) + 0.08 * math.cos(v.co.z * 7.0 + ci)
            v.co.x *= sc[0] * ruff
            v.co.y *= sc[1] * ruff
            v.co.z *= sc[2] * (0.65 if v.co.z < 0 else 1.15)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(f"PinePad_{ci}", mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = Vector(loc)
        obj.data.materials.append(mat)
        obj.parent = root
        finalize_mesh(obj, smooth=True)

    save_and_export("PalaceTree")


def main():
    build_chest("DragonChest", dragon=True)
    build_chest("RosewoodChest", dragon=False)
    build_brazier()
    build_wupeng_boat()
    build_palace_pillar()
    build_stone_lantern()
    build_palace_pine()
    print("ALL_PALACE_PROPS_BUILT")


if __name__ == "__main__":
    main()
