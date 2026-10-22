import { BufferGeometry, Group, Line, Mesh, MeshBasicMaterial, Points, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { releaseBattleResources } from '../src/modules/Game/battleResources';

describe('battle GPU cleanup', () => {
  it('releases shared mesh, line and particle resources exactly once', () => {
    const group = new Group();
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const geometry = new BufferGeometry();
    const particles = new BufferGeometry();
    const line = new BufferGeometry();
    group.add(new Mesh(geometry, material), new Mesh(geometry, material));
    group.add(new Points(particles, material), new Line(line, material));
    const disposed = [texture, material, geometry, particles, line].map((resource) => vi.spyOn(resource, 'dispose'));
    releaseBattleResources(group);
    for (const dispose of disposed) expect(dispose).toHaveBeenCalledTimes(1);
  });
});
