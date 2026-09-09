export interface RoomLore {
  id: string;
  epithet: string;
  summary: string;
  signal: string;
  objective: string;
  color: string;
}

/** Narrative bible for the orbital ruins. Kept separate from level geometry so streaming chunks can reuse it. */
export const ROOM_LORE: Record<string, RoomLore> = {
  hub: { id: "hub", epithet: "静滞中庭 · 失速的心脏", summary: "古代轨道城的转子停在最后一拍，所有回声都从这里出发。", signal: "中庭的引力锚仍在低声计数。", objective: "沿着北侧失压回廊寻找第一枚回声钥印。", color: "#8af7d5" },
  north: { id: "north", epithet: "失压回廊 · 漂浮的誓言", summary: "守城者曾在这里宣誓守护‘零点冠冕’，如今只剩泄压阀的白雾。", signal: "侦测到旧军团的巡弋无人机。", objective: "击穿巡弋哨并取得通往档案馆的坐标。", color: "#55d6e8" },
  archive: { id: "archive", epithet: "折光档案馆 · 被删去的年代", summary: "档案晶片记录着一场人为的日蚀：有人把整座城锁进了循环。", signal: "墨弦的测绘笔记指向熔炉核心。", objective: "与绘图师墨弦会合，拼出熔炉封锁协议。", color: "#b688ff" },
  forge: { id: "forge", epithet: "脉冲熔炉 · 炽白王座", summary: "熔炉把星核锻成弹射体。守卫‘铸律’仍执行着早已失效的命令。", signal: "高能 Boss 信号：铸律，冠冕的第一重锁。", objective: "击败铸律，让南侧回环重新通电。", color: "#ffbd69" },
  deep: { id: "deep", epithet: "沉默蓄水层 · 黑潮之下", summary: "冷却液淹没了旧城区，水面下传来不属于机器的呼吸。", signal: "未知生物回声与玩家轨迹同步。", objective: "穿越黑潮，寻找偏航圣所的下行闸门。", color: "#4da6ff" },
  shrine: { id: "shrine", epithet: "偏航圣所 · 逆行祷文", summary: "失落教团相信只要让轨道逆行，时间就会吐回被夺走的人。", signal: "圣所石碑显示：冠冕并非王冠，而是一枚方向。", objective: "校准逆行祷文，打开通往冠冕的最后航道。", color: "#d08cff" },
  crown: { id: "crown", epithet: "空洞冠冕 · 零点之门", summary: "冠冕是城市的记忆核心。它等待一个能承受全部回声的载体。", signal: "终局 Boss 信号：零相，循环的主机。", objective: "击败零相，决定让回声归还星海，或继续守望。", color: "#ff6274" },
  "rim-east": { id: "rim-east", epithet: "东缘风暴井 · 逆风航标", summary: "风暴把城市外环撕成垂直的井，旧导航棱镜仍在雷暴里闪烁。", signal: "检测到断压看守的巡航脉冲。", objective: "穿过风暴井，夺回第一枚导航棱镜。", color: "#8de8ff" },
  "ion-gardens": { id: "ion-gardens", epithet: "离子温室 · 梦的花冠", summary: "温室用乘员的梦培育离子花，花粉记录着城市尚未发生的未来。", signal: "温室守门者正在苏醒。", objective: "击败守门者，取得能稳定零潮的花粉核。", color: "#7ff0b0" },
  abyssal: { id: "abyssal", epithet: "深渊升降井 · 被抹除的航线", summary: "升降井的每一层都通向一条被王庭删掉的历史。", signal: "井底回声与玩家身份吻合。", objective: "沿升降井下行，找出被抹除的旧航线。", color: "#6e83c8" },
  sunken: { id: "sunken", epithet: "沉没环城 · 礼仪的残骸", summary: "沉没的环城仍在自动举行迎王礼，钟声把水压变成了节拍。", signal: "环城摄政者拒绝承认王庭已死。", objective: "打破环城礼仪，夺取第二枚回声钥印。", color: "#4db7b5" },
  skybridge: { id: "skybridge", epithet: "苍穹桥列 · 风中的誓言", summary: "桥列悬在轨道碎片之间，风把每一名失踪乘员的名字吹回来。", signal: "侦测到来自骨库的求救回波。", objective: "跨过桥列，保护通往骨库的航道。", color: "#9bc5ff" },
  ossuary: { id: "ossuary", epithet: "回声骨库 · 身份的空壳", summary: "骨库收藏每次航行留下的残响，其中一枚记录着你的真实身份。", signal: "残响正在拼合‘载体’档案。", objective: "找回身份残响，打开观测站封锁。", color: "#d7c6a1" },
  observatory: { id: "observatory", epithet: "逆光观测站 · 最后一帧", summary: "观测站保存着太阳熄灭前的最后一帧，守望者把它当作永恒的证词。", signal: "高能 Boss 信号：最后观测者。", objective: "击败最后观测者，校准零潮入口。", color: "#e1a7ff" },
  "null-sea": { id: "null-sea", epithet: "零潮静海 · 无声的终点", summary: "静海吞掉声音与重力，所有方向都指向同一片空白。", signal: "零相的回声从冠冕之外回传。", objective: "穿过零潮静海，完成最后一次弹射。", color: "#ff8fb1" },
};

export const STORY_BEATS = [
  { title: "唤醒引力锚", text: "你从静滞中庭醒来。轨道城‘阿刻戎’正在重复毁灭前的最后九分钟，找到空洞冠冕才能打破循环。" },
  { title: "拼合失落坐标", text: "绘图师墨弦证实：冠冕被三重封锁保护。穿过档案馆与熔炉，收集足以改写航道的回声。" },
  { title: "让熔炉熄火", text: "铸律守卫把所有来客判定为‘偏航’。击败它，南侧回环会重新通电，黑潮下的道路将显形。" },
  { title: "直面零相", text: "最后的回声来自你自己。零相正在冠冕中等待，将你的每一次弹射当作重启指令。" },
  { title: "选择回声的归宿", text: "零点之门已经打开。让阿刻戎回到星海，或留下成为下一位守望者。" },
] as const;

export function loreForRoom(id?: string | null): RoomLore | undefined { return id ? ROOM_LORE[id] : undefined; }
export function storyBeatFor(aliveBosses: number, metCartographer: boolean, victory = false) {
  if (victory) return STORY_BEATS[4];
  if (aliveBosses <= 0) return STORY_BEATS[3];
  if (aliveBosses === 1) return STORY_BEATS[2];
  return metCartographer ? STORY_BEATS[1] : STORY_BEATS[0];
}
