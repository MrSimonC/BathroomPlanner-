import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readProject } from '$lib/utils/projectValidation';
import { resolveRooms } from '$lib/utils/roomDetection';
import { getCatalogItem, getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { furniturePlanBounds } from '$lib/utils/furniturePlanBounds';
import { projectToPreparedRoomPlan } from '$lib/utils/interchange';
import { createProjectFromRoomPlan, validateRoomPlan } from '$lib/utils/roomplanImport';

// Entirely synthetic; no private scan or third-party plan is included.
const source = JSON.parse(readFileSync(new URL('./fixtures/synthetic-bathroom.openplan.json', import.meta.url), 'utf8'));

describe('synthetic bathroom authoring regression', () => {
  it('validates native geometry, named room, openings and explicit fixture footprints', () => {
    const project = readProject(structuredClone(source)), floor = project.floors[0];
    expect(project.floors).toEqual(source.floors);
    expect(floor.walls.map(w => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y))).toEqual([300, 240, 300, 240]);
    for (const [i, wall] of floor.walls.entries()) {
      expect(wall.end).toEqual(floor.walls[(i + 1) % 4].start);
      expect(wall).toMatchObject({ thickness: 10, height: 240 });
    }
    expect(resolveRooms(floor)).toHaveLength(1);
    expect(resolveRooms(floor)[0]).toMatchObject({ name: 'Bathroom', area: 7.2 });
    expect(floor.doors[0]).toMatchObject({ wallId: 'bathroom-south', position: .75, width: 75, height: 205, swingDirection: 'right', flipSide: false });
    expect(floor.windows[0]).toMatchObject({ wallId: 'bathroom-north', position: .75, width: 80, height: 60, sillHeight: 150 });
    expect(floor.furniture.map(getFurnitureSize)).toEqual([
      { width: 170, depth: 75, height: 60 }, { width: 55, depth: 42, height: 85 }, { width: 40, depth: 65, height: 40 },
    ]);
    const bounds = floor.furniture.map(item => {
      expect(getCatalogItem(item.catalogId)).toBeDefined();
      const bounds = furniturePlanBounds(item);
      expect(bounds.minX).toBeGreaterThan(5); expect(bounds.maxX).toBeLessThan(295);
      expect(bounds.minY).toBeGreaterThan(5); expect(bounds.maxY).toBeLessThan(235);
      return bounds;
    });
    for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i], b = bounds[j];
      expect(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY).toBe(true);
    }
  });

  it('preserves exact native JSON and metre interchange geometry through reimport', () => {
    const project = readProject(source);
    expect(readProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
    const interchange = projectToPreparedRoomPlan(project);
    expect(() => validateRoomPlan(interchange)).not.toThrow();
    const floor = readProject(createProjectFromRoomPlan(interchange, 'Bathroom roundtrip')).floors[0];
    for (const expected of project.floors[0].walls) {
      const actual = floor.walls.find(w => w.id === expected.id)!;
      expect(actual).toMatchObject({ thickness: expected.thickness, height: expected.height });
      for (const end of ['start', 'end'] as const) for (const axis of ['x', 'y'] as const) {
        expect(actual[end][axis]).toBeCloseTo(expected[end][axis], 6);
      }
    }
    expect(floor.doors).toEqual(project.floors[0].doors);
    expect(floor.windows).toEqual(project.floors[0].windows);
    for (const expected of project.floors[0].furniture) {
      expect(floor.furniture.find(item => item.id === expected.id)).toMatchObject(expected);
    }
    expect(resolveRooms(floor)[0]).toMatchObject({ name: 'Bathroom', area: 7.2 });
  });
});
