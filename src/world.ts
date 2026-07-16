import type { Door, Enemy, Npc, Rect, Room } from "./types";

export const WORLD = { w: 2240, h: 1500 };
export const PLAYER_START = { x: 190, y: 750 };

export const rooms: Room[] = [
  { id: "hub", name: "静滞中庭", rect: { x: 80, y: 570, w: 440, h: 360 } },
  { id: "north", name: "失压回廊", rect: { x: 280, y: 120, w: 560, h: 330 } },
  { id: "archive", name: "折光档案馆", rect: { x: 720, y: 500, w: 500, h: 400 } },
  { id: "forge", name: "脉冲熔炉", rect: { x: 1120, y: 100, w: 500, h: 340 }, boss: true },
  { id: "deep", name: "沉默蓄水层", rect: { x: 1350, y: 600, w: 500, h: 390 } },
  { id: "shrine", name: "偏航圣所", rect: { x: 720, y: 1060, w: 540, h: 320 } },
  { id: "crown", name: "空洞冠冕", rect: { x: 1770, y: 1070, w: 390, h: 310 }, boss: true, final: true },
];

// Corridors are carved out of the solid world alongside rooms.
export const corridors: Rect[] = [
  { x: 445, y: 360, w: 110, h: 300 },
  { x: 500, y: 690, w: 260, h: 120 },
  { x: 780, y: 400, w: 110, h: 120 },
  { x: 1180, y: 250, w: 110, h: 390 },
  { x: 1200, y: 720, w: 180, h: 120 },
  { x: 920, y: 880, w: 110, h: 200 },
  { x: 1210, y: 1210, w: 610, h: 120 },
  { x: 1600, y: 920, w: 120, h: 340 },
  { x: 1540, y: 410, w: 110, h: 210 },
  { x: 790, y: 900, w: 110, h: 180 },
];

export const obstacles: Rect[] = [
  { x: 305, y: 690, w: 70, h: 120 },
  { x: 590, y: 230, w: 120, h: 48 },
  { x: 930, y: 610, w: 55, h: 170 },
  { x: 1070, y: 550, w: 54, h: 130 },
  { x: 1320, y: 210, w: 95, h: 70 },
  { x: 1480, y: 730, w: 72, h: 150 },
  { x: 920, y: 1160, w: 140, h: 55 },
  { x: 1900, y: 1180, w: 60, h: 110 },
];

export function freshDoors(): Door[] {
  return [
    { id: "d-archive", x: 708, y: 690, w: 18, h: 120, axis: "x", breakDirection: -1, broken: false },
    { id: "d-loop", x: 790, y: 986, w: 110, h: 18, axis: "y", breakDirection: -1, broken: false },
    { id: "d-forge", x: 1180, y: 432, w: 110, h: 18, axis: "y", breakDirection: -1, broken: false, bossLock: true },
    { id: "d-forge-exit", x: 1540, y: 432, w: 110, h: 18, axis: "y", breakDirection: 1, broken: false, bossExit: true, bossRoom: "forge" },
    { id: "d-crown", x: 1765, y: 1210, w: 18, h: 120, axis: "x", breakDirection: 1, broken: false, bossLock: true },
  ];
}

export function freshEnemies(): Enemy[] {
  return [
    enemy("e1", "drone", 620, 340, 18, 3, 1, "north"),
    enemy("e2", "charger", 825, 610, 22, 4, 1, "archive"),
    enemy("e3", "sentinel", 1090, 790, 24, 5, 1, "archive"),
    enemy("e4", "drone", 1510, 690, 18, 3, 1, "deep"),
    enemy("e5", "charger", 1740, 850, 22, 4, 1, "deep"),
    enemy("e6", "sentinel", 820, 1260, 24, 5, 1, "shrine"),
    enemy("forge-boss", "boss", 1430, 265, 42, 14, 2, "forge"),
    enemy("final-boss", "boss", 2010, 1230, 54, 24, 2, "crown"),
  ];
}

function enemy(id: string, kind: Enemy["kind"], x: number, y: number, r: number, hp: number, damage: number, roomId: string): Enemy {
  return { id, kind, x, y, r, hp, maxHp: hp, damage, roomId, alive: true, active: kind !== "boss" };
}

export function freshNpcs(): Npc[] {
  return [
    { id: "cartographer", kind: "cartographer", name: "绘图师 · 墨弦", x: 1010, y: 720, met: false },
    { id: "relay-west", kind: "teleporter", name: "折跃师 · 西站", x: 400, y: 820, met: false },
    { id: "relay-east", kind: "teleporter", name: "折跃师 · 东站", x: 1410, y: 900, met: false },
  ];
}

export const inside = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const inWalkable = (x: number, y: number) => rooms.some((room) => inside(x, y, room.rect)) || corridors.some((r) => inside(x, y, r));

export function roomAt(x: number, y: number) {
  return rooms.find((room) => inside(x, y, room.rect));
}
