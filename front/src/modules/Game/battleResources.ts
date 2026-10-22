import { Line, Mesh, Points, SkinnedMesh, Texture, type Object3D } from 'three';

/** Dispose each shared GPU resource once, including embers, bowstrings and rigs. */
export function releaseBattleResources(root: Object3D) {
  const resources = new Set<{ dispose(): void }>();
  root.traverse((object) => {
    if (object instanceof SkinnedMesh) resources.add(object.skeleton);
    if (!(object instanceof Mesh || object instanceof Points || object instanceof Line)) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value instanceof Texture) resources.add(value);
      resources.add(material);
    }
  });
  for (const resource of resources) resource.dispose();
}
