"""Prepare Poly Haven CC0 PBR textures, moonlit HDRI, and web-optimized 3D nature GLBs.

Runs two steps:
  1. Python/Pillow: converts downloaded Poly Haven 1k albedo/normal/roughness/ARM textures into crisp
     512px WebP PBR maps in public/pbr/ and copies moonlit_golf_1k.hdr.
  2. Blender 5.2.2 (when invoked with Blender --background --python ...): imports Poly Haven
     fir_tree_01.gltf and rock_moss_set_01.gltf, normalizes scale & Z=0 grounding, decimates cleanly
     for 60fps WebGL, resizes embedded textures to 512px, and exports public/models/PalaceTree.glb
     and public/models/GardenRock.glb.
"""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "art" / "vendor"
PUB_PBR = ROOT / "public" / "pbr"
PUB_MODELS = ROOT / "public" / "models"
ART_DIR = ROOT / "art"


def prepare_textures_and_hdri():
    from PIL import Image

    PUB_PBR.mkdir(parents=True, exist_ok=True)
    mapping = {
        "stone_tiles_02": "courtyard",
        "weathered_brown_planks": "wood",
        "ceramic_roof_01": "roof",
        "marble_01": "marble",
        "painted_plaster_wall": "plaster",
    }

    def find_tex(folder: Path, tokens):
        for p in sorted(folder.rglob("*")):
            if not p.is_file() or p.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            low = p.name.lower()
            if any(t in low for t in tokens):
                return p
        return None

    for slug, out_prefix in mapping.items():
        folder = VENDOR / slug
        if not folder.exists():
            raise FileNotFoundError(f"Missing Poly Haven texture folder: {folder}")
        channels = {
            "diff": ["_diff_", "diffuse"],
            "nor": ["_nor_gl_", "_nor_dx_", "normal"],
            "arm": ["_arm_", "_rough_"],
        }
        for ch, toks in channels.items():
            src = find_tex(folder, toks)
            if src is None:
                continue
            img = Image.open(src).convert("RGB")
            img = img.resize((512, 512), Image.Resampling.LANCZOS)
            dst = PUB_PBR / f"{out_prefix}_{ch}.webp"
            img.save(dst, "WEBP", quality=82, method=4)
            print(f"PBR_WEBP {dst.name} ({dst.stat().st_size} bytes)")

    # Copy 1k moonlit HDRI
    hdr_candidates = list((VENDOR / "moonlit_golf").glob("*.hdr"))
    if not hdr_candidates:
        raise FileNotFoundError("Missing moonlit_golf HDRI in art/vendor/moonlit_golf")
    dst_hdr = PUB_PBR / "moonlit_golf_1k.hdr"
    shutil.copy2(hdr_candidates[0], dst_hdr)
    print(f"HDRI_READY {dst_hdr.name} ({dst_hdr.stat().st_size} bytes)")


def prepare_nature_models_in_blender():
    import bpy
    from mathutils import Vector

    PUB_MODELS.mkdir(parents=True, exist_ok=True)

    def convert_asset(slug: str, out_stem: str, target_height: float, decimate_ratio: float, pick_largest: bool = False):
        gltf_path = VENDOR / slug / f"{slug}.gltf"
        if not gltf_path.exists():
            raise FileNotFoundError(f"Missing Poly Haven model: {gltf_path}")

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(gltf_path))

        meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        if not meshes:
            raise RuntimeError(f"No meshes imported from {gltf_path}")

        if pick_largest and len(meshes) > 1:
            # Keep the single largest hero boulder from multi-rock set
            meshes.sort(key=lambda o: len(o.data.polygons), reverse=True)
            keep = meshes[0]
            for extra in meshes[1:]:
                bpy.data.objects.remove(extra, do_unlink=True)
            meshes = [keep]

        # Compute combined bounds
        xs, ys, zs = [], [], []
        for o in meshes:
            for c in o.bound_box:
                p = o.matrix_world @ Vector(c)
                xs.append(p.x)
                ys.append(p.y)
                zs.append(p.z)
        cx = (min(xs) + max(xs)) * 0.5
        cy = (min(ys) + max(ys)) * 0.5
        min_z = min(zs)
        h = max(max(zs) - min_z, 0.01)
        scale = target_height / h

        # Normalize into clean grounded root
        root = bpy.data.objects.new(f"{out_stem}Root", None)
        bpy.context.collection.objects.link(root)
        for o in meshes:
            # Apply existing transform first
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            o.location.x -= cx
            o.location.y -= cy
            o.location.z -= min_z
            bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
            o.scale = (scale, scale, scale)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

            # Decimate cleanly while preserving UVs/materials
            if decimate_ratio < 0.99 and len(o.data.polygons) > 1200:
                mod = o.modifiers.new("DecimateWeb", "DECIMATE")
                mod.ratio = decimate_ratio
                bpy.ops.object.modifier_apply(modifier=mod.name)
            o.select_set(False)
            o.parent = root

        # Downscale embedded textures to 512px max for fast web download
        for img in bpy.data.images:
            if img.type != "IMAGE":
                continue
            w, ih = img.size
            if max(w, ih) > 512:
                scale_i = 512 / max(w, ih)
                img.scale(max(64, int(w * scale_i)), max(64, int(ih * scale_i)))
            img.pack()

        bpy.ops.wm.save_as_mainfile(filepath=str(ART_DIR / f"{out_stem}.blend"))
        for out_p in (ART_DIR / f"{out_stem}.glb", PUB_MODELS / f"{out_stem}.glb"):
            bpy.ops.export_scene.gltf(
                filepath=str(out_p),
                export_format="GLB",
                export_yup=True,
                export_normals=True,
                export_materials="EXPORT",
                export_image_format="WEBP",
                export_image_quality=78,
            )
        total_tris = sum(len(o.data.polygons) for o in meshes)
        print(f"NATURE_GLB {out_stem}.glb: {total_tris} polys, {(PUB_MODELS / f'{out_stem}.glb').stat().st_size} bytes")

    convert_asset("rock_moss_set_01", "GardenRock", target_height=1.35, decimate_ratio=0.35, pick_largest=True)


if __name__ == "__main__":
    if "bpy" in sys.modules:
        prepare_nature_models_in_blender()
    else:
        try:
            import bpy  # noqa: F401
            prepare_nature_models_in_blender()
        except ImportError:
            prepare_textures_and_hdri()
