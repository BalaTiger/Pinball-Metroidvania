export type Vec = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type EnemyKind = "drone" | "charger" | "sentinel" | "boss";

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  damage: number;
  roomId: string;
  alive: boolean;
  active?: boolean;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  axis: "x" | "y";
  breakDirection: 1 | -1;
  broken: boolean;
  bossLock?: boolean;
  bossExit?: boolean;
  bossRoom?: string;
}

export interface Room {
  id: string;
  name: string;
  rect: Rect;
  boss?: boolean;
  final?: boolean;
}

export type Rarity = "common" | "rare" | "epic";
export type StatKey = "damage" | "armor" | "vision" | "range" | "heal" | "ricochet";

export interface Item {
  id: string;
  name: string;
  rarity: Rarity;
  stat: StatKey;
  value: number;
  description: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  attracted?: boolean;
  pickupLocked?: boolean;
}

export interface Npc {
  id: string;
  kind: "cartographer" | "teleporter";
  name: string;
  x: number;
  y: number;
  met: boolean;
}

export interface SaveData {
  player: { x: number; y: number; hp: number; maxHp: number; currency: number };
  enemies: Enemy[];
  doors: Door[];
  drops: Item[];
  inventory: Item[];
  equipped: (Item | null)[];
  discovered: string[];
  turn: number;
  npcs: Npc[];
}

export interface MetaData {
  permanentFog: string[];
  cartographerMet: boolean;
  teleporters: string[];
  runs: number;
  bestBosses: number;
}
