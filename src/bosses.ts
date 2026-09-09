import type { Enemy, Vec } from "./types";

/** Data-driven named encounters. Rooms can be streamed independently; only the roomId is required. */
export type BossBehavior = "sweep" | "orbit" | "vortex" | "blink" | "dash";

export interface BossDefinition {
  id: string;
  name: string;
  epithet: string;
  roomId: string;
  color: string;
  accent: string;
  behavior: BossBehavior;
  maxHp: number;
  radius: number;
  damage: number;
  /** Short lore hook shown when the encounter is discovered. */
  lore: string;
  reward: string;
}

export const BOSS_DEFINITIONS: BossDefinition[] = [
  {
    id: "north-warden", name: "断压看守", epithet: "失压回廊的守门者", roomId: "north",
    color: "#596d83", accent: "#8de8ff", behavior: "dash", maxHp: 16, radius: 38, damage: 2,
    lore: "它把最后一段大气压锁在胸腔里，等待轨道回声归零。", reward: "长弧线圈",
  },
  {
    id: "archive-warden", name: "折光典狱长", epithet: "档案馆的删改者", roomId: "archive",
    color: "#60447d", accent: "#d3a7ff", behavior: "orbit", maxHp: 18, radius: 40, damage: 2,
    lore: "每一次反弹都会替它删去一页真相，击中核心才能夺回记忆。", reward: "测绘透镜",
  },
  {
    id: "forge-boss", name: "铸律", epithet: "脉冲熔炉的封锁守卫", roomId: "forge",
    color: "#8a3d32", accent: "#ffbd69", behavior: "sweep", maxHp: 22, radius: 46, damage: 2,
    lore: "古代铸炉以它为节拍，将星骸锻成封锁整座遗迹的门。", reward: "裂解棱镜",
  },
  {
    id: "deep-leviathan", name: "静默利维坦", epithet: "沉默蓄水层的回声兽", roomId: "deep",
    color: "#1d5c68", accent: "#6be8e0", behavior: "vortex", maxHp: 24, radius: 48, damage: 3,
    lore: "它吞下所有声波，水面之下只剩一条指向冠冕的暗流。", reward: "共振尖端",
  },
  {
    id: "shrine-oracle", name: "偏航神谕", epithet: "圣所的盲眼先知", roomId: "shrine",
    color: "#6e4e86", accent: "#f19cff", behavior: "blink", maxHp: 20, radius: 42, damage: 2,
    lore: "神谕早已看见结局；它只需把你的轨迹偏转一格。", reward: "回生电容",
  },
  {
    id: "final-boss", name: "零相", epithet: "轨道尽头的静默王", roomId: "crown",
    color: "#761f3a", accent: "#ff6274", behavior: "vortex", maxHp: 32, radius: 56, damage: 3,
    lore: "冠冕不是王座，而是把世界固定在一次永恒反弹里的锁。", reward: "超频·空洞棱镜",
  },
  {
    id: "gardens-warden", name: "授粉母体", epithet: "离子温室的梦魇园丁", roomId: "ion-gardens",
    color: "#2e784f", accent: "#9dffb0", behavior: "orbit", maxHp: 26, radius: 46, damage: 3,
    lore: "它用乘员的梦培育离子花，花粉会把探索者标记成下一株幼苗。", reward: "回生电容",
  },
  {
    id: "ring-regent", name: "环城摄政", epithet: "沉没环城的礼仪核心", roomId: "sunken",
    color: "#74613c", accent: "#ffd27a", behavior: "sweep", maxHp: 30, radius: 50, damage: 3,
    lore: "礼仪程序仍在运行，摄政者却忘了王已经沉没，只会向空座行礼。", reward: "缓冲外壳",
  },
  {
    id: "last-observer", name: "最后观测者", epithet: "拒绝交卷的守望者", roomId: "observatory",
    color: "#463b86", accent: "#a9a4ff", behavior: "blink", maxHp: 34, radius: 52, damage: 3,
    lore: "它保存太阳熄灭前的最后一帧，任何靠近者都会被重播成旧日残影。", reward: "测绘透镜",
  },
];

const byId = new Map(BOSS_DEFINITIONS.map((boss) => [boss.id, boss]));
export function bossDefinition(enemy: Enemy): BossDefinition | undefined {
  return enemy.kind === "boss" ? byId.get(enemy.bossId || enemy.id) : undefined;
}

export function bossForRoom(roomId: string): BossDefinition | undefined {
  return BOSS_DEFINITIONS.find((boss) => boss.roomId === roomId);
}

/** Returns the phase (1..3) from remaining health; deterministic and save friendly. */
export function bossPhase(enemy: Enemy, definition = bossDefinition(enemy)): number {
  if (!definition) return enemy.phase || 1;
  const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
  return ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
}

/** Pick a movement vector for a named boss. The caller still validates collisions/pathing. */
export function bossMoveVector(enemy: Enemy, player: Vec, definition = bossDefinition(enemy)): Vec {
  const dx = player.x - enemy.x, dy = player.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len, ny = dy / len;
  if (!definition) return { x: nx, y: ny };
  if (definition.behavior === "orbit") return { x: -ny, y: nx };
  if (definition.behavior === "vortex") {
    // Spiral inward: tangential motion remains threatening while closing the gap.
    const tangent = { x: -ny, y: nx };
    const inward = enemy.phase === 3 ? 0.8 : 0.45;
    const tangentWeight = enemy.phase === 3 ? 1 : 0.7;
    const x = nx * inward + tangent.x * tangentWeight, y = ny * inward + tangent.y * tangentWeight;
    const resultLen = Math.hypot(x, y) || 1;
    return { x: x / resultLen, y: y / resultLen };
  }
  return { x: nx, y: ny };
}

export function bossAttackDamage(enemy: Enemy, definition = bossDefinition(enemy)): number {
  if (!definition) return enemy.damage;
  const phase = bossPhase(enemy, definition);
  // Vortex and sweep become area attacks in their final phase.
  const bonus = phase === 3 && (definition.behavior === "vortex" || definition.behavior === "sweep") ? 1 : 0;
  return definition.damage + bonus;
}
