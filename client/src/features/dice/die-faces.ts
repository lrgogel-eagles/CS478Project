import type { DieKind } from './notation';

type Point = readonly [number, number];

type Face = {
  points: Point[];
  light?: number;
};

function ring(count: number, radius: number, start: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((start + (360 / count) * index) * Math.PI) / 180;
    return [24 + radius * Math.cos(angle), 25 + radius * Math.sin(angle)] as const;
  });
}

function pick(points: Point[], index: number): Point {
  const point = points[index % points.length];
  if (!point) throw new Error(`No die corner at ${index}`);
  return point;
}

function twelveSided(): Face[] {
  const outer = ring(10, 21.5, -90);
  const inner = ring(5, 10.5, -90);
  const faces: Face[] = [{ points: inner, light: 1 }];
  for (let index = 0; index < 5; index += 1) {
    faces.push({ points: [pick(inner, index), pick(outer, 2 * index), pick(outer, 2 * index + 1), pick(outer, 2 * index + 2), pick(inner, index + 1)] });
  }
  return faces;
}

function twentySided(): Face[] {
  const top: Point = [24, 3];
  const upperRight: Point = [42.2, 13.5];
  const lowerRight: Point = [42.2, 35.5];
  const bottom: Point = [24, 46];
  const lowerLeft: Point = [5.8, 35.5];
  const upperLeft: Point = [5.8, 13.5];
  const apex: Point = [24, 11.5];
  const innerLeft: Point = [12.5, 32];
  const innerRight: Point = [35.5, 32];
  return [
    { points: [apex, innerLeft, innerRight], light: 1 },
    { points: [apex, upperLeft, top] },
    { points: [apex, top, upperRight] },
    { points: [apex, innerLeft, upperLeft] },
    { points: [apex, innerRight, upperRight] },
    { points: [innerLeft, upperLeft, lowerLeft] },
    { points: [innerLeft, lowerLeft, bottom] },
    { points: [innerLeft, innerRight, bottom] },
    { points: [innerRight, bottom, lowerRight] },
    { points: [innerRight, lowerRight, upperRight] },
  ];
}

function tenSided(): Face[] {
  const kiteTop: Point = [24, 3];
  const middleLeft: Point = [14, 27];
  const middleRight: Point = [34, 27];
  const centre: Point = [24, 33];
  return [
    { points: [kiteTop, middleLeft, centre, middleRight], light: 1 },
    { points: [kiteTop, [4, 21], [6, 31], middleLeft] },
    { points: [kiteTop, middleRight, [42, 31], [44, 21]] },
    { points: [middleLeft, [6, 31], [24, 46], centre] },
    { points: [centre, [24, 46], [42, 31], middleRight] },
  ];
}

function eightSided(): Face[] {
  const front: Point = [26, 27];
  return [
    { points: [[24, 3], [4, 24], front], light: 0.8 },
    { points: [[24, 3], front, [44, 24]], light: 1 },
    { points: [[4, 24], [24, 46], front] },
    { points: [front, [24, 46], [44, 24]] },
  ];
}

const DIE_SHAPES = {
  d4: [
    { points: [[24, 4], [4, 41], [28, 46]], light: 1 },
    { points: [[24, 4], [28, 46], [45, 40]], light: 0.3 },
  ],
  d6: [
    { points: [[6, 15], [35, 15], [35, 44], [6, 44]], light: 1 },
    { points: [[6, 15], [15, 6], [44, 6], [35, 15]], light: 1.1 },
    { points: [[35, 15], [44, 6], [44, 35], [35, 44]], light: 0.2 },
  ],
  d8: eightSided(),
  d10: tenSided(),
  d12: twelveSided(),
  d20: twentySided(),
  d100: tenSided(),
} satisfies Record<DieKind, Face[]>;

export const LABEL_SPOTS = {
  d4: [18.5, 32],
  d6: [20.5, 30],
  d8: [30, 19],
  d10: [24, 22],
  d12: [24, 25.5],
  d20: [24, 27.5],
  d100: [24, 22],
} as const satisfies Record<DieKind, Point>;

function faceLight(face: Face) {
  if (face.light !== undefined) return face.light;
  const count = face.points.length;
  const cx = face.points.reduce((sum, [x]) => sum + x, 0) / count - 24;
  const cy = face.points.reduce((sum, [, y]) => sum + y, 0) / count - 25;
  return 0.45 + 0.35 * (-(cx + cy) / Math.hypot(cx, cy || 1));
}

export type ShadedFace = {
  points: string;
  shade: number;
  isLit: boolean;
};

export function shadedFaces(kind: DieKind): ShadedFace[] {
  return DIE_SHAPES[kind].map((face: Face) => {
    const light = Math.max(0, Math.min(1.1, faceLight(face)));
    return {
      points: face.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
      shade: Math.round((1 - Math.min(1, light)) * 100),
      isLit: light > 1,
    };
  });
}
