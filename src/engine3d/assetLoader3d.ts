import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export type ModelKey =
  | 'Raider'
  | 'Guard'
  | 'GuardElite'
  | 'DragonChest'
  | 'RosewoodChest'
  | 'Brazier'
  | 'WupengBoat'
  | 'PalacePillar'
  | 'StoneLantern'
  | 'PalaceTree'
  | 'GardenRock';

const MODEL_KEYS: ModelKey[] = [
  'Raider',
  'Guard',
  'GuardElite',
  'DragonChest',
  'RosewoodChest',
  'Brazier',
  'WupengBoat',
  'PalacePillar',
  'StoneLantern',
  'PalaceTree',
  'GardenRock',
];

export interface RoyalAssetBundle {
  models: Partial<Record<ModelKey, THREE.Group>>;
  hdrTexture: THREE.DataTexture | null;
}

let cachedPromise: Promise<RoyalAssetBundle> | null = null;
let cachedBundle: RoyalAssetBundle | null = null;

function enableShadowCascade(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

/**
 * Loads all Blender 5.2 sculpted GLB models + Poly Haven CC0 moonlit HDRI once and caches in memory.
 * Resilient: any single failed network file resolves cleanly to undefined so fallback never crashes.
 */
export function loadRoyalAssetBundle(): Promise<RoyalAssetBundle> {
  if (cachedBundle) return Promise.resolve(cachedBundle);
  if (cachedPromise) return cachedPromise;

  const gltfLoader = new GLTFLoader();
  const hdrLoader = new HDRLoader();

  const modelTasks = MODEL_KEYS.map(async (key): Promise<[ModelKey, THREE.Group | null]> => {
    try {
      const gltf = await gltfLoader.loadAsync(`./models/${key}.glb`);
      enableShadowCascade(gltf.scene);
      return [key, gltf.scene];
    } catch (err) {
      console.warn(`[RoyalAssets] Failed loading ./models/${key}.glb`, err);
      return [key, null];
    }
  });

  const hdrTask: Promise<THREE.DataTexture | null> = hdrLoader
    .loadAsync('./pbr/moonlit_golf_1k.hdr')
    .then((tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      return tex;
    })
    .catch((err) => {
      console.warn('[RoyalAssets] Failed loading ./pbr/moonlit_golf_1k.hdr', err);
      return null;
    });

  cachedPromise = Promise.all([Promise.all(modelTasks), hdrTask]).then(([entries, hdrTexture]) => {
    const models: Partial<Record<ModelKey, THREE.Group>> = {};
    for (const [k, scene] of entries) {
      if (scene) models[k] = scene;
    }
    cachedBundle = { models, hdrTexture };
    return cachedBundle;
  });

  return cachedPromise;
}

/**
 * Deep-clones a cached GLB scene with independent materials when dynamic tinting/emissive updates are needed.
 */
export function cloneAssetModel(bundle: RoyalAssetBundle, key: ModelKey, cloneMaterials = false): THREE.Group | null {
  const src = bundle.models[key];
  if (!src) return null;
  const clone = src.clone(true);
  clone.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.sharedAssetGeo = true;
    if (cloneMaterials && mesh.material) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
    } else {
      mesh.userData.sharedAssetMat = true;
    }
  });
  return clone;
}

/**
 * Generates a per-renderer PMREM environment texture from the cached Poly Haven moonlit HDRI.
 */
export function buildMoonlitEnvMap(
  renderer: THREE.WebGLRenderer,
  bundle: RoyalAssetBundle
): THREE.Texture | null {
  if (!bundle.hdrTexture) return null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(bundle.hdrTexture);
  pmrem.dispose();
  return envRT.texture;
}
