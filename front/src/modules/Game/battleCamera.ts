import { Box3, Vector3 } from 'three';

import type { PerspectiveCamera} from 'three';

/** Fit every edge hex plus standing models inside a HUD-safe portion of the view. */
export function fitBattleCamera(camera: PerspectiveCamera, cells: Vector3[]) {
  const bounds = new Box3().setFromPoints(cells);
  bounds.min.add(new Vector3(-1.8, -0.12, -1));
  bounds.max.add(new Vector3(1.8, 4, 1));
  const target = bounds.getCenter(new Vector3());
  const direction = new Vector3(0.08, 0.53, 0.82).normalize();
  const right = new Vector3(0, 1, 0).cross(direction).normalize();
  const up = direction.clone().cross(right).normalize();
  const tangent = Math.tan(camera.fov * Math.PI / 360);
  let distance = 15;
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const offset = new Vector3(x, y, z).sub(target);
        distance = Math.max(distance, offset.dot(direction) + Math.max(
          Math.abs(offset.dot(right)) / (tangent * camera.aspect * 0.9),
          Math.abs(offset.dot(up)) / (tangent * 0.8)
        ));
      }
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.far = Math.max(160, distance + bounds.getSize(new Vector3()).length() * 2);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { target, distance };
}
