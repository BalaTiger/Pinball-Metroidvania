import type { Door, Enemy, MapChunk, Npc, Rect, Region, Room } from "./types";

/** World is authored in 640px streaming chunks. The original core sits in the
 * north-west quadrant, while the outer regions are loaded as the player
 * reaches them. */
export const CHUNK_SIZE = 640;
export const WORLD = { w: 4096, h: 3072 };
export const PLAYER_START = { x: 190, y: 750 };

export const rooms: Room[] = [
  { id: "hub", name: "静滞中庭", rect: { x: 80, y: 570, w: 440, h: 360 }, regionId: "core" },
  { id: "north", name: "失压回廊", rect: { x: 280, y: 120, w: 560, h: 330 }, boss: true, regionId: "core" },
  { id: "archive", name: "折光档案馆", rect: { x: 720, y: 500, w: 500, h: 400 }, boss: true, regionId: "core" },
  { id: "forge", name: "脉冲熔炉", rect: { x: 1120, y: 100, w: 500, h: 340 }, boss: true, regionId: "core" },
  { id: "deep", name: "沉默蓄水层", rect: { x: 1350, y: 600, w: 500, h: 390 }, boss: true, regionId: "core" },
  { id: "shrine", name: "偏航圣所", rect: { x: 720, y: 1060, w: 540, h: 320 }, boss: true, regionId: "core" },
  { id: "crown", name: "空洞冠冕", rect: { x: 1770, y: 1070, w: 390, h: 310 }, boss: true, final: true, regionId: "core" },
  { id: "rim-east", name: "东缘风暴井", rect: { x: 2240, y: 180, w: 560, h: 420 }, regionId: "rim" },
  { id: "ion-gardens", name: "离子温室", rect: { x: 2920, y: 620, w: 680, h: 470 }, boss: true, regionId: "gardens" },
  { id: "abyssal", name: "深渊升降井", rect: { x: 2180, y: 1420, w: 620, h: 480 }, regionId: "abyss" },
  { id: "sunken", name: "沉没环城", rect: { x: 3000, y: 1510, w: 760, h: 510 }, boss: true, regionId: "sunken" },
  { id: "skybridge", name: "苍穹桥列", rect: { x: 120, y: 1710, w: 620, h: 420 }, regionId: "sky" },
  { id: "ossuary", name: "回声骨库", rect: { x: 820, y: 1800, w: 560, h: 520 }, regionId: "ossuary" },
  { id: "observatory", name: "逆光观测站", rect: { x: 1500, y: 1810, w: 620, h: 500 }, boss: true, regionId: "observatory" },
  { id: "null-sea", name: "零潮静海", rect: { x: 2240, y: 2200, w: 700, h: 560 }, regionId: "null" },
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
  // Outer-region links. They are intentionally narrow so each transition
  // reads as a room-to-room gate while still supporting continuous movement.
  { x: 1810, y: 1210, w: 500, h: 120 },
  { x: 2160, y: 390, w: 120, h: 900 },
  { x: 2700, y: 380, w: 420, h: 120 },
  { x: 3180, y: 1040, w: 120, h: 560 },
  { x: 2460, y: 1340, w: 120, h: 180 },
  { x: 2700, y: 1650, w: 420, h: 120 },
  { x: 2740, y: 1860, w: 360, h: 120 },
  { x: 2080, y: 2010, w: 120, h: 480 },
  { x: 1260, y: 2020, w: 300, h: 120 },
  { x: 560, y: 1960, w: 320, h: 120 },
  { x: 1380, y: 2040, w: 120, h: 120 },
  { x: 2100, y: 2480, w: 260, h: 120 },
  // Vertical trunks keep the lower half reachable from the original core.
  { x: 600, y: 1280, w: 120, h: 520 },
  { x: 660, y: 1280, w: 180, h: 120 },
  { x: 700, y: 1940, w: 180, h: 140 },
  { x: 2160, y: 1240, w: 120, h: 260 },
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
  { x: 2400, y: 300, w: 120, h: 60 },
  { x: 2580, y: 500, w: 80, h: 90 },
  { x: 3140, y: 760, w: 150, h: 52 },
  { x: 3340, y: 980, w: 90, h: 100 },
  { x: 2330, y: 1580, w: 72, h: 170 },
  { x: 2660, y: 1760, w: 110, h: 80 },
  { x: 3200, y: 1680, w: 120, h: 120 },
  { x: 3420, y: 1850, w: 160, h: 56 },
  { x: 330, y: 1860, w: 150, h: 72 },
  { x: 970, y: 2080, w: 100, h: 150 },
  { x: 1730, y: 1980, w: 80, h: 140 },
  { x: 2450, y: 2400, w: 140, h: 75 },
];

/** Region metadata is data-driven so narrative and objective systems can
 * reference a stable id without knowing geometry details. */
export const regions: Region[] = [
  { id: "core", name: "静滞核心", lore: "轨道坠毁后，旧王庭把记忆压成了可反弹的回声。", biome: "teal", bounds: { x: 0, y: 0, w: 2240, h: 1500 }, roomIds: ["hub", "north", "archive", "forge", "deep", "shrine", "crown"], recommendedPower: 1, bossId: "forge-boss" },
  { id: "rim", name: "东缘风暴井", lore: "风暴井保存着第一枚导航棱镜，棱镜会回应失落的王印。", biome: "storm", bounds: { x: 2080, y: 0, w: 960, h: 1340 }, roomIds: ["rim-east"], recommendedPower: 3 },
  { id: "gardens", name: "离子温室", lore: "温室中的植物以乘员的梦为养分，守门者仍在等待授粉。", biome: "verdant", bounds: { x: 2800, y: 320, w: 1296, h: 1280 }, roomIds: ["ion-gardens"], recommendedPower: 4, bossId: "gardens-warden" },
  { id: "abyss", name: "深渊升降井", lore: "升降井直通旧世界底座，井壁刻着被抹除的航线。", biome: "abyss", bounds: { x: 2000, y: 1280, w: 1120, h: 760 }, roomIds: ["abyssal"], recommendedPower: 4 },
  { id: "sunken", name: "沉没环城", lore: "沉没的环城仍按王庭钟声运转，居民只剩自动礼仪。", biome: "sunken", bounds: { x: 2800, y: 1320, w: 1296, h: 900 }, roomIds: ["sunken"], recommendedPower: 5, bossId: "ring-regent" },
  { id: "sky", name: "苍穹桥列", lore: "桥列连接两颗失联卫星，风会把旧日誓言吹回耳边。", biome: "sky", bounds: { x: 0, y: 1560, w: 920, h: 760 }, roomIds: ["skybridge"], recommendedPower: 3 },
  { id: "ossuary", name: "回声骨库", lore: "骨库收集每次航行的残响，寻找能证明你身份的那一枚。", biome: "bone", bounds: { x: 640, y: 1660, w: 920, h: 760 }, roomIds: ["ossuary"], recommendedPower: 4 },
  { id: "observatory", name: "逆光观测站", lore: "观测站记录着太阳熄灭前的最后一帧，守望者拒绝交卷。", biome: "violet", bounds: { x: 1360, y: 1660, w: 920, h: 760 }, roomIds: ["observatory"], recommendedPower: 5, bossId: "last-observer" },
  { id: "null", name: "零潮静海", lore: "静海吞掉声音与重力，只有空洞冠冕能在此保持方向。", biome: "null", bounds: { x: 2000, y: 2080, w: 1120, h: 992 }, roomIds: ["null-sea"], recommendedPower: 6 },
];

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const chunkKey = (cx: number, cy: number) => `${cx},${cy}`;
export function chunkAt(x: number, y: number): MapChunk {
  const cx = Math.max(0, Math.min(Math.floor(x / CHUNK_SIZE), Math.ceil(WORLD.w / CHUNK_SIZE) - 1));
  const cy = Math.max(0, Math.min(Math.floor(y / CHUNK_SIZE), Math.ceil(WORLD.h / CHUNK_SIZE) - 1));
  const bounds = { x: cx * CHUNK_SIZE, y: cy * CHUNK_SIZE, w: CHUNK_SIZE, h: CHUNK_SIZE };
  return { key: chunkKey(cx, cy), x: cx, y: cy, loaded: true, regionIds: regions.filter((r) => intersects(r.bounds, bounds)).map((r) => r.id) };
}
export function loadedChunks(x: number, y: number, radius = 1): MapChunk[] {
  const center = chunkAt(x, y), cols = Math.ceil(WORLD.w / CHUNK_SIZE), rows = Math.ceil(WORLD.h / CHUNK_SIZE), out: MapChunk[] = [];
  for (let cy = Math.max(0, center.y - radius); cy <= Math.min(rows - 1, center.y + radius); cy++) for (let cx = Math.max(0, center.x - radius); cx <= Math.min(cols - 1, center.x + radius); cx++) {
    const bounds = { x: cx * CHUNK_SIZE, y: cy * CHUNK_SIZE, w: CHUNK_SIZE, h: CHUNK_SIZE };
    out.push({ key: chunkKey(cx, cy), x: cx, y: cy, loaded: true, regionIds: regions.filter((r) => intersects(r.bounds, bounds)).map((r) => r.id) });
  }
  return out;
}
export function regionAt(x: number, y: number) { return regions.find((region) => inside(x, y, region.bounds)); }
export function getLoadedGeometry(x: number, y: number, radius = 1) {
  const chunks = loadedChunks(x, y, radius), bounds: Rect = { x: Math.max(0, (Math.min(...chunks.map((c) => c.x)) * CHUNK_SIZE)), y: Math.max(0, (Math.min(...chunks.map((c) => c.y)) * CHUNK_SIZE)), w: (Math.max(...chunks.map((c) => c.x)) - Math.min(...chunks.map((c) => c.x)) + 1) * CHUNK_SIZE, h: (Math.max(...chunks.map((c) => c.y)) - Math.min(...chunks.map((c) => c.y)) + 1) * CHUNK_SIZE };
  return { chunks, rooms: rooms.filter((room) => intersects(room.rect, bounds)), corridors: corridors.filter((rect) => intersects(rect, bounds)), obstacles: obstacles.filter((rect) => intersects(rect, bounds)) };
}

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
    enemy("e7", "drone", 2380, 320, 18, 5, 1, "rim-east"),
    enemy("e8", "charger", 2660, 470, 22, 6, 1, "rim-east"),
    enemy("e9", "drone", 3060, 760, 18, 6, 1, "ion-gardens"),
    enemy("e10", "sentinel", 3480, 980, 24, 7, 1, "ion-gardens"),
    enemy("e11", "charger", 2320, 1600, 22, 7, 1, "abyssal"),
    enemy("e12", "drone", 3280, 1740, 18, 7, 1, "sunken"),
    enemy("e13", "sentinel", 520, 2040, 24, 6, 1, "skybridge"),
    enemy("e14", "charger", 1100, 2180, 22, 8, 1, "ossuary"),
    enemy("e15", "drone", 1700, 2200, 18, 8, 1, "observatory"),
    enemy("e16", "sentinel", 2600, 2480, 24, 8, 1, "null-sea"),
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
    { id: "relay-rim", kind: "teleporter", name: "折跃师 · 风暴井", x: 2500, y: 520, met: false },
    { id: "relay-south", kind: "teleporter", name: "折跃师 · 沉环站", x: 3060, y: 1900, met: false },
    { id: "relay-sky", kind: "teleporter", name: "折跃师 · 苍穹桥", x: 300, y: 2010, met: false },
  ];
}

export const inside = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const inWalkable = (x: number, y: number) => rooms.some((room) => inside(x, y, room.rect)) || corridors.some((r) => inside(x, y, r));

export function roomAt(x: number, y: number) {
  return rooms.find((room) => inside(x, y, room.rect));
}
