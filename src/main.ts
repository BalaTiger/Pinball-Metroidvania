import "./style.css";
import type { Door, Enemy, Item, MetaData, Npc, SaveData, StatKey, Vec } from "./types";
import { WORLD, PLAYER_START, corridors, freshDoors, freshEnemies, freshNpcs, inWalkable, obstacles, roomAt, rooms } from "./world";

const SAVE_KEY = "echo-orbit:run";
const META_KEY = "echo-orbit:meta";
const CELL = 48;
const PICKUP_RADIUS = 78;

type Phase = "aim" | "moving" | "enemy" | "victory" | "dead";
type ToastTone = "normal" | "amber" | "red";

interface ShotResult {
  points: Vec[];
  hitEvents: HitEvent[];
  breakIds: string[];
  breaks: { id:string; x:number; y:number; progress:number }[];
  blockedHits: { key:string; id:string; x:number; y:number; progress:number }[];
  distance: number;
}

interface HitEvent { key:string; id:string; progress:number; vx:number; vy:number }
interface Fragment { x:number; y:number; vx:number; vy:number; life:number; size:number; rotation:number; spin:number }
interface FloatingText { x:number; y:number; life:number; text:string }
interface ShieldRipple { x:number; y:number; life:number }

const app = document.querySelector<HTMLDivElement>("#app")!;

function defaultMeta(): MetaData {
  return { permanentFog: [], cartographerMet: false, teleporters: [], runs: 0, bestBosses: 0 };
}

function loadMeta(): MetaData {
  try { return { ...defaultMeta(), ...JSON.parse(localStorage.getItem(META_KEY) || "{}") }; }
  catch { return defaultMeta(); }
}

function saveMeta(meta: MetaData) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

function initialSave(meta: MetaData): SaveData {
  return {
    player: { ...PLAYER_START, hp: 8, maxHp: 8, currency: 0 },
    enemies: freshEnemies(), doors: freshDoors(), drops: [], inventory: [], equipped: [null, null, null],
    discovered: [...meta.permanentFog], turn: 1, npcs: freshNpcs(),
  };
}

class Game {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  data: SaveData;
  meta = loadMeta();
  phase: Phase = "aim";
  mouse = { x: 0, y: 0, inside: false };
  camera = { x: 0, y: 0, w: 1000, h: 700 };
  preview: ShotResult | null = null;
  animation: { shot: ShotResult; start: number; duration: number; triggeredBreaks:Set<string>; triggeredBlocks:Set<string>; triggeredHits:Set<string> } | null = null;
  enemyAnimating: { enemy: Enemy; from: Vec; to: Vec; start: number } | null = null;
  currentRoom = "";
  lastFrame = 0;
  shake = 0;
  flash = 0;
  toastId = 0;
  lastTrailReveal: Vec | null = null;
  fragments: Fragment[] = [];
  floatingTexts: FloatingText[] = [];
  shieldRipples: ShieldRipple[] = [];
  dropTrails=new Map<string,Vec[]>();
  doorFlash = 0;

  constructor(data: SaveData) {
    this.data = data;
    this.data.doors=this.data.doors.filter((door)=>door.id!=="d-north");
    for (const door of freshDoors()) {
      const saved=this.data.doors.find((candidate)=>candidate.id===door.id);
      if(!saved)this.data.doors.push(door);
      else Object.assign(saved,{axis:door.axis,breakDirection:door.breakDirection,bossLock:door.bossLock,bossExit:door.bossExit,bossRoom:door.bossRoom});
    }
    const savedRoom = roomAt(this.data.player.x, this.data.player.y)?.id;
    for (const enemy of this.data.enemies) if (enemy.kind === "boss" && enemy.active === undefined) enemy.active = enemy.roomId === savedRoom;
    this.mount();
    this.revealCircle(this.data.player.x, this.data.player.y, this.stats().vision);
    this.bind();
    this.resize();
    this.updateUI();
    requestAnimationFrame((t) => this.frame(t));
    this.toast("航向校准完成。拖动鼠标预览轨迹，点击弹射。", "normal");
  }

  mount() {
    app.innerHTML = `
      <main class="shell">
        <header class="topbar">
          <div class="brand"><div class="brand-mark"></div><div><strong>回声轨道</strong><small>ECHO ORBIT</small></div></div>
          <div class="status-strip">
            <div class="stat"><div class="stat-label">壳体完整度</div><div class="stat-value" id="hpText"></div><div class="hp-track"><div class="hp-fill" id="hpFill"></div></div></div>
            <div class="stat"><div class="stat-label">回合</div><div class="stat-value" id="turnText"></div></div>
            <div class="stat"><div class="stat-label">碎片</div><div class="stat-value" id="currencyText"></div></div>
            <div class="stat"><div class="stat-label">冲击力</div><div class="stat-value" id="damageText"></div></div>
            <div class="phase-pill" id="phaseText">等待航向</div>
          </div>
          <button class="icon-btn" id="mapBtn">M · 星图</button>
        </header>
        <section class="game-layout">
          <div class="viewport" id="viewport">
            <canvas id="game"></canvas>
            <div class="room-tag"><div class="eyebrow">区域 · <span id="roomIndex">00</span></div><h2 id="roomName">未知区域</h2></div>
            <div class="toast-stack" id="toasts"></div>
            <div class="hintbar" id="hint"><b>移动鼠标</b> 选择方向 · <b>点击</b> 发射 · 轨迹将计算所有反弹</div>
          </div>
          <aside class="sidebar">
            <section class="objective"><div class="kicker">当前目标</div><h3 id="objectiveTitle">找到空洞冠冕</h3><p id="objectiveText">探索固定的回环地图，穿过迷雾并击败深处的最终守卫。</p></section>
            <section class="equipment"><div class="section-head"><h4>谐振槽 · 3</h4><span class="kicker">点击卸下</span></div><div class="slots" id="slots"></div></section>
            <section class="bag"><div class="section-head"><h4>回收舱</h4><span class="kicker" id="bagCount">0 / 8</span></div><div class="bag-list" id="bagList"></div><div class="bag-tip">点击装备 · 右键分解为碎片</div></section>
            <div class="side-actions"><button class="action-btn" id="teleportBtn">折跃</button><button class="action-btn" id="exitBtn">保存并退出</button></div>
          </aside>
        </section>
      </main>`;
    this.canvas = document.querySelector("#game")!;
    this.ctx = this.canvas.getContext("2d")!;
  }

  bind() {
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("pointermove", (e) => {
      const p = this.pointerWorld(e);
      this.mouse = { ...p, inside: true };
      if (this.phase === "aim") this.preview = this.simulateShot(p);
    });
    this.canvas.addEventListener("pointerleave", () => { this.mouse.inside = false; this.preview = null; });
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 0 && this.phase === "aim" && this.preview) this.launch(this.preview);
    });
    document.querySelector("#exitBtn")!.addEventListener("click", () => this.saveAndExit());
    document.querySelector("#mapBtn")!.addEventListener("click", () => this.openMap());
    document.querySelector("#teleportBtn")!.addEventListener("click", () => this.openTeleport());
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "m") this.openMap();
      if (e.key === "Escape") document.querySelector(".overlay")?.remove();
    });
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.camera.w = rect.width; this.camera.h = rect.height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  pointerWorld(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left + this.camera.x, y: e.clientY - r.top + this.camera.y };
  }

  stats() {
    const s = { damage: 2, armor: 0, vision: 160, range: 670, heal: 0, ricochet: 0 };
    for (const item of this.data.equipped) {
      if (!item) continue;
      if (item.stat === "vision") s.vision += item.value;
      else if (item.stat === "range") s.range += item.value;
      else if (item.stat === "damage") s.damage += item.value;
      else if (item.stat === "armor") s.armor += item.value;
      else if (item.stat === "ricochet") s.ricochet += item.value;
      else if (item.stat === "heal") s.heal += item.value;
    }
    return s;
  }

  simulateShot(target: Vec, maxDistance = this.stats().range): ShotResult {
    const p = { x: this.data.player.x, y: this.data.player.y };
    const dx = target.x - p.x, dy = target.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    let vx = dx / len, vy = dy / len;
    const points: Vec[] = [{ ...p }], breakIds: string[] = [];
    const hitEvents: HitEvent[] = [];
    const breaks: { id:string; x:number; y:number; progress:number }[] = [];
    const blockedHits: { key:string; id:string; x:number; y:number; progress:number }[] = [];
    const step = 7;
    const max = maxDistance;
    const activeDoorIds = new Set(this.data.doors.filter((d) => this.doorIsSolid(d)).map((d) => d.id));
    let distance = 0;
    let simulationStep = 0;
    let speedScale = 1;
    const enemyContacts=new Set<string>();

    while (distance < max) {
      simulationStep++;
      const motionStep=step*speedScale;
      let nx = p.x + vx * motionStep, ny = p.y + vy * motionStep;
      let bounced = false;

      for (const door of this.data.doors) {
        if (door.broken || breakIds.includes(door.id) || !activeDoorIds.has(door.id)) continue;
        if (circleRect(nx, ny, 14, door)) {
          const speed = door.axis === "x" ? vx : vy;
          if (!door.bossLock && !door.bossExit && Math.sign(speed) === door.breakDirection) {
            breakIds.push(door.id);
            breaks.push({id:door.id,x:door.x+door.w/2,y:door.y+door.h/2,progress:simulationStep});
            speedScale*=.52;
          } else {
            if(!door.bossLock&&!door.bossExit) blockedHits.push({key:`${door.id}-${simulationStep}`,id:door.id,x:door.x+door.w/2,y:door.y+door.h/2,progress:simulationStep});
            if (door.axis === "x") vx *= -1; else vy *= -1;
            nx = p.x + vx * motionStep; ny = p.y + vy * motionStep; bounced = true;
          }
        }
      }

      for (const ob of obstacles) {
        if (!circleRect(nx, ny, 14, ob)) continue;
        const testX = !circleRect(p.x + vx * motionStep, p.y, 14, ob);
        const testY = !circleRect(p.x, p.y + vy * motionStep, 14, ob);
        if (testX) vy *= -1;
        else if (testY) vx *= -1;
        else { vx *= -1; vy *= -1; }
        nx = p.x + vx * motionStep; ny = p.y + vy * motionStep; bounced = true;
      }

      if (!inWalkable(nx, ny)) {
        const xOkay = inWalkable(p.x + vx * motionStep, p.y);
        const yOkay = inWalkable(p.x, p.y + vy * motionStep);
        if (xOkay && !yOkay) vy *= -1;
        else if (!xOkay && yOkay) vx *= -1;
        else { vx *= -1; vy *= -1; }
        nx = p.x + vx * motionStep; ny = p.y + vy * motionStep; bounced = true;
      }

      for (const enemy of this.data.enemies) {
        if (!enemy.alive || enemy.active === false) continue;
        const ex = nx - enemy.x, ey = ny - enemy.y;
        const min = enemy.r + 14;
        if (ex * ex + ey * ey > min * min) { enemyContacts.delete(enemy.id); continue; }
        if(enemyContacts.has(enemy.id))continue;
        enemyContacts.add(enemy.id);
        const nLen = Math.hypot(ex, ey) || 1;
        const ux = ex / nLen, uy = ey / nLen;
        const dot = vx * ux + vy * uy;
        vx -= 2 * dot * ux; vy -= 2 * dot * uy;
        hitEvents.push({key:`${enemy.id}-${simulationStep}`,id:enemy.id,progress:simulationStep,vx,vy});
        nx = p.x + vx * motionStep; ny = p.y + vy * motionStep; bounced = true;
      }

      p.x = nx; p.y = ny; distance += step;
      if (bounced || simulationStep % 2 === 0) points.push({ ...p });
    }
    const last = points[points.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) points.push({ ...p });
    for(const event of breaks) event.progress=event.progress/Math.max(1,simulationStep);
    for(const event of blockedHits) event.progress=event.progress/Math.max(1,simulationStep);
    for(const event of hitEvents) event.progress=event.progress/Math.max(1,simulationStep);
    return { points, hitEvents, breakIds, breaks, blockedHits, distance };
  }

  doorIsSolid(door: Door) {
    if (door.bossExit) {
      return this.data.enemies.some((e) => e.roomId === door.bossRoom && e.kind === "boss" && e.alive);
    }
    if (!door.bossLock) return !door.broken;
    const targetRoom = door.id === "d-forge" ? "forge" : "crown";
    return this.data.enemies.some((e) => e.roomId === targetRoom && e.kind === "boss" && e.alive && e.active !== false);
  }

  launch(shot: ShotResult) {
    if (shot.points.length < 2) return;
    this.phase = "moving";
    this.lastTrailReveal = { x: this.data.player.x, y: this.data.player.y };
    this.preview = null;
    const duration = Math.max(620, shot.distance * 1.3);
    this.animation = { shot, start: performance.now(), duration, triggeredBreaks:new Set(), triggeredBlocks:new Set(), triggeredHits:new Set() };
    this.updateUI();
  }

  hitEnemy(event:{id:string}){
    const enemy=this.data.enemies.find((candidate)=>candidate.id===event.id);
    if(!enemy?.alive)return false;
    const shotStats=this.stats(),damage=shotStats.damage+shotStats.ricochet;
    enemy.hp-=damage;
    this.shake=Math.max(this.shake,4);
    const killed=enemy.hp<=0;
    if(killed)this.killEnemy(enemy);
    this.updateUI();
    return killed;
  }

  replanAfterKill(event:HitEvent,oldShot:ShotResult,time:number){
    const remaining=Math.max(4,oldShot.distance*(1-event.progress));
    const origin={x:this.data.player.x,y:this.data.player.y};
    const target={x:origin.x+event.vx*100,y:origin.y+event.vy*100};
    const revised=this.simulateShot(target,remaining);
    this.animation={shot:revised,start:time,duration:Math.max(160,remaining*1.3),triggeredBreaks:new Set(),triggeredBlocks:new Set(),triggeredHits:new Set()};
  }

  breakDoor(event: {id:string;x:number;y:number}) {
    const door=this.data.doors.find((d)=>d.id===event.id);
    if(!door||door.broken)return;
    door.broken=true;
    this.shake=Math.max(this.shake,15);
    this.doorFlash=1;
    for(let i=0;i<22;i++){
      const angle=Math.random()*Math.PI*2,force=70+Math.random()*190;
      this.fragments.push({x:event.x+(Math.random()-.5)*20,y:event.y+(Math.random()-.5)*20,vx:Math.cos(angle)*force,vy:Math.sin(angle)*force,life:.65+Math.random()*.45,size:3+Math.random()*7,rotation:Math.random()*Math.PI,spin:(Math.random()-.5)*9});
    }
    this.playDoorImpact();
    this.toast("捷径闸门粉碎——冲击动能大幅衰减。", "amber");
  }

  blockDoor(event:{id?:string;x:number;y:number}){
    this.shake=Math.max(this.shake,5);
    this.floatingTexts.push({x:event.x,y:event.y-18,life:1.25,text:"不可从这一侧打开"});
    const door=this.data.doors.find((candidate)=>candidate.id===event.id);
    let x=event.x,y=event.y;
    if(door){
      if(door.axis==="x")x+=door.breakDirection===-1?-10:10;
      else y+=door.breakDirection===1?10:-10;
    }
    this.shieldRipples.push({x,y,life:.55});
  }

  playDoorImpact() {
    try {
      const AudioCtx=window.AudioContext||(window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      const audio=new AudioCtx(),osc=audio.createOscillator(),gain=audio.createGain();
      osc.type="sawtooth";osc.frequency.setValueAtTime(105,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(38,audio.currentTime+.16);
      gain.gain.setValueAtTime(.09,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);
      osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.2);
    } catch { /* audio feedback is optional */ }
  }

  killEnemy(enemy: Enemy) {
    enemy.alive = false;
    this.data.drops.push(this.generateItem(enemy.x, enemy.y, enemy.kind === "boss"));
    this.toast(enemy.kind === "boss" ? "守卫核心崩解——高阶谐振物已掉落。" : "目标消除，检测到装备掉落。", "amber");
    if (enemy.id === "final-boss") this.victory();
  }

  generateItem(x: number, y: number, boss = false): Item {
    const defs: { stat: StatKey; name: string; unit: string; base: number }[] = [
      { stat: "damage", name: "裂解棱镜", unit: "冲击", base: 1 },
      { stat: "armor", name: "缓冲外壳", unit: "减伤", base: 1 },
      { stat: "vision", name: "测绘透镜", unit: "视野", base: 35 },
      { stat: "range", name: "长弧线圈", unit: "射程", base: 90 },
      { stat: "heal", name: "回生电容", unit: "回合恢复", base: 1 },
      { stat: "ricochet", name: "共振尖端", unit: "额外冲击", base: 1 },
    ];
    const def = defs[Math.floor(Math.random() * defs.length)];
    const roll = Math.random();
    const rarity = boss || roll > .88 ? "epic" : roll > .55 ? "rare" : "common";
    const mult = rarity === "epic" ? 2 : 1;
    const value = def.base * mult;
    return { id: `item-${Date.now()}-${Math.random()}`, name: `${rarity === "epic" ? "超频·" : rarity === "rare" ? "精制·" : ""}${def.name}`, rarity, stat: def.stat, value, description: `+${value} ${def.unit}`, x, y };
  }

  finishShot(shot: ShotResult) {
    const end = shot.points[shot.points.length - 1];
    this.data.player.x = end.x; this.data.player.y = end.y;
    this.animation = null;
    this.lastTrailReveal = null;
    for (const p of shot.points) this.revealCircle(p.x, p.y, 45, false);
    this.revealCircle(end.x, end.y, this.stats().vision);
    this.checkNpcs(shot.points);
    this.activateBossAtRest();
    if (this.phase === "victory") return;
    this.runEnemyTurn();
  }

  activateBossAtRest() {
    const stoppedRoom = roomAt(this.data.player.x, this.data.player.y);
    if (!stoppedRoom?.boss) return;
    const boss = this.data.enemies.find((e) => e.roomId === stoppedRoom.id && e.kind === "boss" && e.alive);
    if (!boss || boss.active !== false) return;
    boss.active = true;
    this.toast("封锁协议启动——守卫信号正在实体化。", "red");
  }

  checkNpcs(path: Vec[]) {
    for (const npc of this.data.npcs) {
      if (npc.met || !path.some((p) => Math.hypot(p.x - npc.x, p.y - npc.y) < 38)) continue;
      npc.met = true;
      if (npc.kind === "cartographer") {
        this.meta.cartographerMet = true;
        this.meta.permanentFog = [...new Set([...this.meta.permanentFog, ...this.data.discovered])];
        this.toast("遇见绘图师：本局已探索区域将跨局保留。", "amber");
      } else {
        if (!this.meta.teleporters.includes(npc.id)) this.meta.teleporters.push(npc.id);
        this.toast(`折跃坐标已永久记录：${npc.name}`, "amber");
      }
      saveMeta(this.meta);
    }
  }

  collectDrop(item:Item){
    this.data.drops=this.data.drops.filter((drop)=>drop.id!==item.id);
    this.dropTrails.delete(item.id);
    delete item.x;delete item.y;delete item.vx;delete item.vy;delete item.attracted;
    if(this.data.inventory.length<8){this.data.inventory.push(item);this.toast(`拾取：${item.name}`,"normal");}
    else{const value=scrapValue(item);this.data.player.currency+=value;this.toast(`回收舱已满，自动分解 +${value} 碎片`,"amber");}
    this.updateUI();
  }

  updateDrops(seconds:number){
    for(const drop of [...this.data.drops]){
      if(drop.x===undefined||drop.y===undefined)continue;
      const dx=this.data.player.x-drop.x,dy=this.data.player.y-drop.y,distance=Math.hypot(dx,dy);
      if(distance<=PICKUP_RADIUS)drop.attracted=true;
      if(!drop.attracted)continue;
      const length=distance||1,acceleration=820;
      drop.vx=(drop.vx||0)+dx/length*acceleration*seconds;
      drop.vy=(drop.vy||0)+dy/length*acceleration*seconds;
      const damping=Math.pow(.045,seconds);drop.vx*=damping;drop.vy*=damping;
      drop.x+=drop.vx*seconds;drop.y+=drop.vy*seconds;
      const trail=this.dropTrails.get(drop.id)||[];trail.push({x:drop.x,y:drop.y});if(trail.length>10)trail.shift();this.dropTrails.set(drop.id,trail);
      if(Math.hypot(this.data.player.x-drop.x,this.data.player.y-drop.y)<=18)this.collectDrop(drop);
    }
  }

  runEnemyTurn() {
    this.phase = "enemy";
    const visible = this.data.enemies.filter((e) => e.alive && e.active !== false && this.isDiscovered(e.x, e.y) && this.onScreen(e.x, e.y, 80));
    const next = (i: number) => {
      if (this.phase === "dead" || this.phase === "victory") return;
      if (i >= visible.length) {
        this.data.turn++;
        const healing = this.stats().heal;
        if (healing) this.data.player.hp = Math.min(this.data.player.maxHp, this.data.player.hp + healing);
        this.phase = "aim";
        this.autoSave();
        this.updateUI();
        return;
      }
      const enemy = visible[i];
      if (!enemy.alive) return next(i + 1);
      const dx = this.data.player.x - enemy.x, dy = this.data.player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      const step = enemy.kind === "charger" ? 100 : enemy.kind === "boss" ? 72 : 58;
      const travel = Math.min(step, Math.max(0, len - enemy.r - 14));
      const from = { x: enemy.x, y: enemy.y };
      const to = this.moveEnemy(enemy, dx / len, dy / len, travel);
      this.enemyAnimating = { enemy, from, to, start: performance.now() };
      setTimeout(() => {
        enemy.x = to.x; enemy.y = to.y; this.enemyAnimating = null;
        if (Math.hypot(enemy.x - this.data.player.x, enemy.y - this.data.player.y) <= enemy.r + 18) this.damagePlayer(enemy.damage);
        this.updateUI();
        setTimeout(() => next(i + 1), 120);
      }, 300);
    };
    this.updateUI();
    setTimeout(() => next(0), 220);
  }

  moveEnemy(enemy:Enemy,dirX:number,dirY:number,distance:number):Vec{
    let x=enemy.x,y=enemy.y,remaining=distance;
    const stepSize=4;
    while(remaining>0){
      const step=Math.min(stepSize,remaining),nextX=x+dirX*step,nextY=y+dirY*step;
      const hitsWall=!circleInWalkable(nextX,nextY,enemy.r);
      const hitsObstacle=obstacles.some((obstacle)=>circleRect(nextX,nextY,enemy.r,obstacle));
      const hitsDoor=this.data.doors.some((door)=>this.enemyDoorIsSolid(door)&&circleRect(nextX,nextY,enemy.r,door));
      const hitsEnemy=this.data.enemies.some((other)=>other.id!==enemy.id&&other.alive&&other.active!==false&&Math.hypot(nextX-other.x,nextY-other.y)<enemy.r+other.r+3);
      if(hitsWall||hitsObstacle||hitsDoor||hitsEnemy)break;
      x=nextX;y=nextY;remaining-=step;
    }
    return{x,y};
  }

  enemyDoorIsSolid(door:Door){
    if(door.bossLock||door.bossExit)return this.doorIsSolid(door);
    return !door.broken;
  }

  damagePlayer(amount: number) {
    const dealt = Math.max(1, amount - this.stats().armor);
    this.data.player.hp -= dealt; this.shake = 10; this.flash = 1;
    this.toast(`壳体受损 -${dealt}`, "red");
    if (this.data.player.hp <= 0) this.gameOver();
  }

  revealCircle(x: number, y: number, radius: number, persist = true) {
    const minX = Math.floor((x - radius) / CELL), maxX = Math.floor((x + radius) / CELL);
    const minY = Math.floor((y - radius) / CELL), maxY = Math.floor((y + radius) / CELL);
    const set = new Set(this.data.discovered);
    for (let gx = minX; gx <= maxX; gx++) for (let gy = minY; gy <= maxY; gy++) {
      const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
      if (Math.hypot(cx - x, cy - y) <= radius + CELL * .7) set.add(`${gx},${gy}`);
    }
    this.data.discovered = [...set];
    if (persist && this.meta.cartographerMet) {
      this.meta.permanentFog = [...new Set([...this.meta.permanentFog, ...this.data.discovered])];
      saveMeta(this.meta);
    }
  }

  isDiscovered(x: number, y: number) { return this.data.discovered.includes(`${Math.floor(x / CELL)},${Math.floor(y / CELL)}`); }
  onScreen(x: number, y: number, pad = 0) { return x > this.camera.x - pad && x < this.camera.x + this.camera.w + pad && y > this.camera.y - pad && y < this.camera.y + this.camera.h + pad; }

  equip(id: string) {
    if (this.phase !== "aim") return;
    const index = this.data.inventory.findIndex((i) => i.id === id);
    if (index < 0) return;
    const item = this.data.inventory.splice(index, 1)[0];
    const slot = this.data.equipped.findIndex((i) => !i);
    if (slot >= 0) this.data.equipped[slot] = item;
    else {
      const replaced = this.data.equipped[0]; this.data.equipped[0] = item;
      if (replaced) this.data.inventory.push(replaced);
    }
    this.preview = null; this.updateUI(); this.autoSave();
  }

  unequip(index: number) {
    if (this.phase !== "aim" || this.data.inventory.length >= 8) return;
    const item = this.data.equipped[index];
    if (item) { this.data.inventory.push(item); this.data.equipped[index] = null; this.updateUI(); this.autoSave(); }
  }

  scrap(id: string) {
    if (this.phase !== "aim") return;
    const index = this.data.inventory.findIndex((i) => i.id === id);
    if (index < 0) return;
    const item = this.data.inventory.splice(index, 1)[0];
    const value = scrapValue(item); this.data.player.currency += value;
    this.toast(`已分解 ${item.name} · +${value} 碎片`, "amber");
    this.updateUI(); this.autoSave();
  }

  updateUI() {
    const s = this.stats();
    setText("hpText", `${Math.max(0, this.data.player.hp)} / ${this.data.player.maxHp}`);
    setText("turnText", String(this.data.turn).padStart(2, "0"));
    setText("currencyText", `◆ ${this.data.player.currency}`);
    setText("damageText", String(s.damage));
    (document.querySelector("#hpFill") as HTMLElement).style.width = `${Math.max(0, this.data.player.hp / this.data.player.maxHp * 100)}%`;
    setText("phaseText", this.phase === "aim" ? "等待航向" : this.phase === "moving" ? "弹射中" : this.phase === "enemy" ? "敌方响应" : this.phase === "victory" ? "核心已静默" : "信号中断");
    const hint = document.querySelector("#hint")!;
    hint.innerHTML = this.phase === "aim" ? `<b>移动鼠标</b> 选择方向 · <b>点击</b> 发射 · 装备可随时调整` : this.phase === "enemy" ? `视野内敌人正在依次行动…` : `惯性航行中…`;
    const slotRoot = document.querySelector("#slots")!;
    slotRoot.innerHTML = this.data.equipped.map((i, n) => i ? `<div class="slot" data-slot="${n}"><span class="rarity rarity-${i.rarity}"></span><div class="name">${i.name}</div><div class="bonus">${i.description}</div></div>` : `<div class="slot empty" data-slot="${n}">＋</div>`).join("");
    slotRoot.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => el.addEventListener("click", () => this.unequip(Number(el.dataset.slot))));
    setText("bagCount", `${this.data.inventory.length} / 8`);
    const bag = document.querySelector("#bagList")!;
    bag.innerHTML = this.data.inventory.length ? this.data.inventory.map((i) => `<div class="item" data-item="${i.id}"><span class="item-gem rarity-${i.rarity}"></span><div><div class="item-name">${i.name}</div><div class="item-desc">${i.description}</div></div><div class="scrap">分解 ${scrapValue(i)}</div></div>`).join("") : `<div class="empty-bag">尚未检测到可回收谐振物</div>`;
    bag.querySelectorAll<HTMLElement>("[data-item]").forEach((el) => {
      el.addEventListener("click", () => this.equip(el.dataset.item!));
      el.addEventListener("contextmenu", (e) => { e.preventDefault(); this.scrap(el.dataset.item!); });
    });
    const tp = document.querySelector<HTMLButtonElement>("#teleportBtn")!;
    tp.disabled = this.phase !== "aim" || this.meta.teleporters.length === 0;
    const exit = document.querySelector<HTMLButtonElement>("#exitBtn")!;
    exit.disabled = this.phase !== "aim";
    const aliveBosses = this.data.enemies.filter((e) => e.kind === "boss" && e.alive).length;
    if (aliveBosses === 1) { setText("objectiveTitle", "进入空洞冠冕"); setText("objectiveText", "熔炉守卫已沉默。沿南侧回环寻找最终 Boss 房。", true); }
  }

  autoSave() { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }
  saveAndExit() { if (this.phase !== "aim") return; this.autoSave(); showTitle(); }

  openTeleport() {
    if (this.phase !== "aim" || !this.meta.teleporters.length) return;
    const known = freshNpcs().filter((n) => this.meta.teleporters.includes(n.id));
    this.modal(`<div class="modal-card"><div class="kicker">折跃网络</div><h2>选择已记录坐标</h2><p>折跃不会消耗回合。你只能前往跨局永久记录的传送大师位置。</p><div class="teleport-list">${known.map((n) => `<button class="teleport-option" data-tp="${n.id}">${n.name}</button>`).join("")}</div><div class="modal-actions"><button class="action-btn" data-close>取消</button></div></div>`);
    document.querySelectorAll<HTMLElement>("[data-tp]").forEach((el) => el.addEventListener("click", () => {
      const npc = known.find((n) => n.id === el.dataset.tp)!;
      this.data.player.x = npc.x; this.data.player.y = npc.y; this.revealCircle(npc.x, npc.y, this.stats().vision);
      document.querySelector(".overlay")?.remove(); this.toast(`已折跃至 ${npc.name}`, "normal"); this.autoSave();
    }));
  }

  openMap() {
    const scale = .28, w = WORLD.w * scale, h = WORLD.h * scale;
    this.modal(`<div class="modal-card" style="width:${w + 60}px"><div class="section-head"><div><div class="kicker">固定世界地图</div><h2 style="margin:5px 0">回声星图</h2></div><button class="icon-btn" data-close>关闭 · ESC</button></div><canvas id="mapCanvas" width="${w}" height="${h}" style="width:${w}px;height:${h}px;background:#06080b;border:1px solid var(--line);cursor:default"></canvas><p>青色：本局已探索区域 · 金色：永久记录的折跃坐标 · 红色：Boss 信号</p></div>`);
    const canvas = document.querySelector<HTMLCanvasElement>("#mapCanvas")!, c = canvas.getContext("2d")!;
    c.scale(scale, scale); c.fillStyle = "#12191b";
    for (const r of [...rooms.map((x) => x.rect), ...corridors]) c.fillRect(r.x, r.y, r.w, r.h);
    const discovered = new Set(this.data.discovered);
    c.fillStyle = "rgba(111,225,196,.42)";
    for (const key of discovered) { const [x,y] = key.split(",").map(Number); c.fillRect(x*CELL,y*CELL,CELL,CELL); }
    for (const n of freshNpcs().filter((n) => this.meta.teleporters.includes(n.id))) { c.fillStyle="#ffbd69"; c.beginPath(); c.arc(n.x,n.y,20,0,Math.PI*2); c.fill(); }
    for (const e of this.data.enemies.filter((e) => e.kind === "boss" && e.alive && e.active !== false && this.isDiscovered(e.x,e.y))) { c.fillStyle="#ff6274"; c.beginPath(); c.arc(e.x,e.y,22,0,Math.PI*2); c.fill(); }
    c.fillStyle="#effff9"; c.beginPath(); c.arc(this.data.player.x,this.data.player.y,18,0,Math.PI*2); c.fill();
  }

  modal(html: string) {
    document.querySelector(".overlay")?.remove();
    const root = document.createElement("div"); root.className = "overlay"; root.innerHTML = html; document.body.appendChild(root);
    root.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => root.remove()));
  }

  toast(message: string, tone: ToastTone) {
    const root = document.querySelector("#toasts"); if (!root) return;
    const el = document.createElement("div"); el.className = `toast ${tone === "normal" ? "" : tone}`; el.textContent = message; el.dataset.id = String(++this.toastId); root.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  gameOver() {
    this.phase = "dead"; localStorage.removeItem(SAVE_KEY); this.meta.runs++; saveMeta(this.meta); this.updateUI();
    setTimeout(() => this.modal(`<div class="modal-card"><div class="kicker" style="color:var(--red)">信号永久中断</div><h2>本次航行已终结</h2><p>装备、敌人与机关状态已经丢失。${this.meta.cartographerMet ? "绘图师记录的迷雾区域仍被保留。" : "你尚未遇见绘图师，本局地图记录无法保留。"}</p><div class="modal-actions"><button class="menu-btn" id="retryBtn">开始下一局</button><button class="action-btn" id="titleBtn">返回主界面</button></div></div>`), 500);
    setTimeout(() => {
      document.querySelector("#retryBtn")?.addEventListener("click", () => startNew());
      document.querySelector("#titleBtn")?.addEventListener("click", () => showTitle());
    }, 550);
  }

  victory() {
    this.phase = "victory"; localStorage.removeItem(SAVE_KEY); this.meta.runs++; this.meta.bestBosses = 2; saveMeta(this.meta); this.updateUI();
    setTimeout(() => this.modal(`<div class="modal-card"><div class="kicker">最终核心已静默</div><h2>轨道重新回响</h2><p>你找到了空洞冠冕，并消灭了固定地图最深处的最终 Boss。这个纵向切片已经完成一轮完整循环。</p><div class="modal-actions"><button class="menu-btn" id="retryBtn">再次航行</button><button class="action-btn" id="titleBtn">返回主界面</button></div></div>`), 650);
    setTimeout(() => {
      document.querySelector("#retryBtn")?.addEventListener("click", () => startNew());
      document.querySelector("#titleBtn")?.addEventListener("click", () => showTitle());
    }, 700);
  }

  frame(time: number) {
    const dt = Math.min(33, time - this.lastFrame); this.lastFrame = time;
    if (!document.body.contains(this.canvas)) return;
    if (this.animation) {
      const a = this.animation, t = Math.min(1, (time - a.start) / a.duration);
      const motionProgress=easeOut(t);
      const pos = pointOnPath(a.shot.points, motionProgress);
      this.data.player.x = pos.x; this.data.player.y = pos.y;
      let replanned=false;
      const dueEvents:[number,"break"|"block"|"hit",any][]=[];
      for(const event of a.shot.breaks)if(event.progress<=motionProgress&&!a.triggeredBreaks.has(event.id))dueEvents.push([event.progress,"break",event]);
      for(const event of a.shot.blockedHits)if(event.progress<=motionProgress&&!a.triggeredBlocks.has(event.key))dueEvents.push([event.progress,"block",event]);
      for(const event of a.shot.hitEvents)if(event.progress<=motionProgress&&!a.triggeredHits.has(event.key))dueEvents.push([event.progress,"hit",event]);
      dueEvents.sort((left,right)=>left[0]-right[0]);
      for(const [,type,event] of dueEvents){
        if(type==="break"){a.triggeredBreaks.add(event.id);this.breakDoor(event);}
        else if(type==="block"){a.triggeredBlocks.add(event.key);this.blockDoor(event);}
        else{
          a.triggeredHits.add(event.key);
          if(this.hitEnemy(event)){
            this.replanAfterKill(event,a.shot,time);
            replanned=true;
            break;
          }
        }
      }
      if (!this.lastTrailReveal || Math.hypot(pos.x - this.lastTrailReveal.x, pos.y - this.lastTrailReveal.y) >= 12) {
        this.revealCircle(pos.x, pos.y, this.stats().vision, false);
        this.lastTrailReveal = { x: pos.x, y: pos.y };
      }
      if (t >= 1&&!replanned&&this.animation===a) this.finishShot(a.shot);
    }
    const seconds=dt/1000;
    this.updateDrops(seconds);
    for(const fragment of this.fragments){fragment.x+=fragment.vx*seconds;fragment.y+=fragment.vy*seconds;fragment.vx*=Math.pow(.12,seconds);fragment.vy*=Math.pow(.12,seconds);fragment.rotation+=fragment.spin*seconds;fragment.life-=seconds;}
    this.fragments=this.fragments.filter((fragment)=>fragment.life>0);
    for(const label of this.floatingTexts){label.y-=28*seconds;label.life-=seconds;}
    this.floatingTexts=this.floatingTexts.filter((label)=>label.life>0);
    for(const ripple of this.shieldRipples)ripple.life-=seconds;
    this.shieldRipples=this.shieldRipples.filter((ripple)=>ripple.life>0);
    this.updateCamera(dt);
    this.draw(time);
    requestAnimationFrame((t) => this.frame(t));
  }

  updateCamera(dt: number) {
    const tx = clamp(this.data.player.x - this.camera.w / 2, 0, Math.max(0, WORLD.w - this.camera.w));
    const ty = clamp(this.data.player.y - this.camera.h / 2, 0, Math.max(0, WORLD.h - this.camera.h));
    const k = 1 - Math.pow(.001, dt / 1000);
    this.camera.x += (tx - this.camera.x) * k; this.camera.y += (ty - this.camera.y) * k;
    const room = roomAt(this.data.player.x, this.data.player.y);
    if (room && room.id !== this.currentRoom) {
      this.currentRoom = room.id; setText("roomName", room.name); setText("roomIndex", String(rooms.indexOf(room) + 1).padStart(2,"0"));
      if (room.boss && this.data.enemies.some((e) => e.roomId === room.id && e.alive && e.active !== false)) this.toast("警告：封锁协议启动。消灭守卫前无法离开。", "red");
    }
  }

  draw(time: number) {
    const c = this.ctx;
    const shakeX = this.shake ? (Math.random()-.5)*this.shake : 0, shakeY = this.shake ? (Math.random()-.5)*this.shake : 0;
    this.shake *= .86; this.flash *= .9; this.doorFlash*=.86;
    c.save(); c.clearRect(0,0,this.camera.w,this.camera.h); c.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
    c.fillStyle="#1a2231"; c.fillRect(0,0,WORLD.w,WORLD.h);
    this.drawWorld(c); this.drawDoors(c); this.drawShieldRipples(c); this.drawFragments(c); this.drawDrops(c,time); this.drawNpcs(c,time); this.drawEnemies(c,time); this.drawPreview(c,time); this.drawPlayer(c,time); this.drawFog(c); this.drawPickupRange(c,time); this.drawFloatingTexts(c); c.restore();
    if (this.flash > .03) { c.fillStyle=`rgba(255,63,89,${this.flash*.14})`; c.fillRect(0,0,this.camera.w,this.camera.h); }
    if (this.doorFlash > .03) { c.fillStyle=`rgba(255,189,105,${this.doorFlash*.16})`; c.fillRect(0,0,this.camera.w,this.camera.h); }
  }

  drawWorld(c: CanvasRenderingContext2D) {
    const all = [...rooms.map((r) => r.rect), ...corridors];
    c.fillStyle="#0d2021";
    for (const r of all) c.fillRect(r.x,r.y,r.w,r.h);
    this.drawWalkableBoundary(c, all);
    c.save();
    const floorMask=new Path2D();
    for(const r of all) floorMask.rect(r.x,r.y,r.w,r.h);
    c.clip(floorMask);
    c.globalAlpha=.1; c.strokeStyle="#75b9b0"; c.lineWidth=1;
    for (let x=0;x<WORLD.w;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,WORLD.h);c.stroke()}
    for (let y=0;y<WORLD.h;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(WORLD.w,y);c.stroke()}
    c.restore();
    for (const o of obstacles) { c.fillStyle="#293446"; c.fillRect(o.x,o.y,o.w,o.h); c.strokeStyle="#557073"; c.strokeRect(o.x+.5,o.y+.5,o.w-1,o.h-1); c.fillStyle="rgba(138,247,213,.12)"; for(let y=o.y+10;y<o.y+o.h;y+=16)c.fillRect(o.x+5,y,o.w-10,2); }
    for (const room of rooms.filter((r)=>r.boss)) { c.strokeStyle=room.final?"rgba(255,98,116,.32)":"rgba(255,189,105,.24)";c.lineWidth=3;c.strokeRect(room.rect.x+9,room.rect.y+9,room.rect.w-18,room.rect.h-18); }
  }

  drawWalkableBoundary(c: CanvasRenderingContext2D, areas: { x:number; y:number; w:number; h:number }[]) {
    const sample = 8;
    c.save();
    c.strokeStyle="rgba(117,197,184,.34)";
    c.lineWidth=2;
    c.beginPath();
    for (const r of areas) {
      for (let x=r.x; x<r.x+r.w; x+=sample) {
        const end=Math.min(x+sample,r.x+r.w), mid=(x+end)/2;
        if (!inWalkable(mid,r.y-2)) { c.moveTo(x,r.y); c.lineTo(end,r.y); }
        if (!inWalkable(mid,r.y+r.h+2)) { c.moveTo(x,r.y+r.h); c.lineTo(end,r.y+r.h); }
      }
      for (let y=r.y; y<r.y+r.h; y+=sample) {
        const end=Math.min(y+sample,r.y+r.h), mid=(y+end)/2;
        if (!inWalkable(r.x-2,mid)) { c.moveTo(r.x,y); c.lineTo(r.x,end); }
        if (!inWalkable(r.x+r.w+2,mid)) { c.moveTo(r.x+r.w,y); c.lineTo(r.x+r.w,end); }
      }
    }
    c.stroke();
    c.restore();
  }

  drawDoors(c: CanvasRenderingContext2D) {
    for (const d of this.data.doors) {
      const solid = this.doorIsSolid(d);
      if (d.broken && !d.bossLock) {
        c.fillStyle="rgba(255,189,105,.38)";
        if(d.axis==="x"){c.fillRect(d.x-3,d.y,8,24);c.fillRect(d.x+8,d.y+d.h-29,9,29);}
        else{c.fillRect(d.x,d.y-3,26,8);c.fillRect(d.x+d.w-31,d.y+8,31,9);}
        continue;
      }
      if ((d.bossLock || d.bossExit) && !solid) continue;
      if(d.bossLock||d.bossExit)this.drawBossDoor(c,d);else this.drawOneWayDoor(c,d);
    }
  }

  drawBossDoor(c:CanvasRenderingContext2D,d:Door){
    c.fillStyle="#b74055";c.shadowColor="#ff6274";c.shadowBlur=12;c.fillRect(d.x,d.y,d.w,d.h);c.shadowBlur=0;c.fillStyle="#191b20";
    if(d.axis==="x")for(let y=d.y+7;y<d.y+d.h;y+=18)c.fillRect(d.x,y,d.w,5);else for(let x=d.x+7;x<d.x+d.w;x+=18)c.fillRect(x,d.y,5,d.h);
  }

  drawOneWayDoor(c:CanvasRenderingContext2D,d:Door){
    const vertical=d.axis==="x";
    const length=vertical?d.h:d.w,thickness=vertical?d.w:d.h;
    const breakSide=vertical?d.breakDirection:-d.breakDirection;
    const solidSide=-breakSide;
    c.save();
    c.translate(d.x+d.w/2,d.y+d.h/2);
    if(vertical)c.rotate(Math.PI/2);

    // Central ratchet slab.
    c.fillStyle="#35404e";c.strokeStyle="#718091";c.lineWidth=1.5;c.fillRect(-length/2,-thickness/2,length,thickness);c.strokeRect(-length/2+.75,-thickness/2+.75,length-1.5,thickness-1.5);

    // Spawn-facing side: a thick wedge, armor ribs and cyan kinetic dampers.
    const inner=solidSide*thickness/2,outer=solidSide*(thickness/2+10);
    c.fillStyle="#657486";c.beginPath();c.moveTo(-length/2,inner);c.lineTo(-length/2+7,outer);c.lineTo(length/2-7,outer);c.lineTo(length/2,inner);c.closePath();c.fill();
    c.strokeStyle="#9badbc";c.lineWidth=2;c.beginPath();c.moveTo(-length/2+7,outer);c.lineTo(length/2-7,outer);c.stroke();
    c.fillStyle="#222b37";
    for(let x=-length/2+12;x<length/2-6;x+=22){c.beginPath();c.moveTo(x-5,inner);c.lineTo(x,outer);c.lineTo(x+6,inner);c.closePath();c.fill();}
    c.shadowColor="#78e7df";c.shadowBlur=8;c.fillStyle="#7ce9df";
    for(let x=-length/2+17;x<length/2-10;x+=34){c.beginPath();c.arc(x,outer,2.6,0,Math.PI*2);c.fill();}
    c.shadowBlur=0;

    // Reverse side: exposed rail, breakable locking pins, wiring and overload core.
    const mechanismY=breakSide*(thickness/2+7);
    c.strokeStyle="#b36e36";c.lineWidth=3;c.beginPath();c.moveTo(-length/2+8,mechanismY);c.lineTo(length/2-8,mechanismY);c.stroke();
    c.strokeStyle="#d3a15f";c.lineWidth=1;
    c.beginPath();c.moveTo(-length/2+10,mechanismY+breakSide*4);c.bezierCurveTo(-length/4,mechanismY+breakSide*11,length/4,mechanismY-breakSide*3,length/2-10,mechanismY+breakSide*5);c.stroke();
    for(const x of [-length*.3,0,length*.3]){
      c.fillStyle=x===0?"#402b25":"#242b34";c.strokeStyle=x===0?"#ffbd69":"#c98243";c.lineWidth=2;c.beginPath();c.arc(x,mechanismY,5.5,0,Math.PI*2);c.fill();c.stroke();
      if(x!==0){c.fillStyle="#e5a154";c.fillRect(x-2.5,mechanismY-breakSide*9,5,18);}
    }
    c.shadowColor="#ff9f45";c.shadowBlur=13;c.fillStyle="#ffbd69";c.beginPath();c.arc(0,mechanismY,2.8,0,Math.PI*2);c.fill();c.shadowBlur=0;
    // Missing maintenance cover plates make this face visibly incomplete.
    c.fillStyle="#0d2021";c.fillRect(-length/2,breakSide>0?thickness/2-2:-thickness/2-3,10,5);c.fillRect(length/2-15,breakSide>0?thickness/2-2:-thickness/2-3,15,5);
    c.restore();
  }

  drawShieldRipples(c:CanvasRenderingContext2D){
    c.save();
    for(const ripple of this.shieldRipples){const progress=1-ripple.life/.55,radius=12+progress*34;c.globalAlpha=Math.max(0,ripple.life/.55);c.strokeStyle="#8af7ed";c.lineWidth=3*(1-progress)+.5;c.shadowColor="#62e1d8";c.shadowBlur=12;c.beginPath();c.arc(ripple.x,ripple.y,radius,0,Math.PI*2);c.stroke();c.beginPath();c.arc(ripple.x,ripple.y,radius*.62,0,Math.PI*2);c.stroke();}
    c.restore();
  }

  drawFragments(c:CanvasRenderingContext2D){
    c.save();
    for(const fragment of this.fragments){c.save();c.translate(fragment.x,fragment.y);c.rotate(fragment.rotation);c.globalAlpha=Math.min(1,fragment.life*1.8);c.fillStyle="#ffbd69";c.shadowColor="#ff9f45";c.shadowBlur=8;c.fillRect(-fragment.size/2,-fragment.size/3,fragment.size,fragment.size*.66);c.restore();}
    c.restore();
  }

  drawFloatingTexts(c:CanvasRenderingContext2D){
    c.save();c.textAlign="center";c.font="600 15px 'Microsoft YaHei', sans-serif";
    for(const label of this.floatingTexts){const fade=Math.min(1,label.life*2);c.globalAlpha=fade;c.fillStyle="#ffd293";c.shadowColor="#000";c.shadowBlur=7;c.fillText(label.text,label.x,label.y);}
    c.restore();
  }

  drawDrops(c: CanvasRenderingContext2D,time:number) {
    for(const d of this.data.drops){
      const color=d.rarity==="epic"?"#b688ff":d.rarity==="rare"?"#55d6e8":"#a8b5b2",trail=this.dropTrails.get(d.id)||[];
      if(trail.length>1){c.save();c.strokeStyle=color;c.lineWidth=3;c.shadowColor=color;c.shadowBlur=8;c.beginPath();c.moveTo(trail[0].x,trail[0].y);for(const point of trail)c.lineTo(point.x,point.y);c.stroke();c.restore();}
      const x=d.x!,y=d.y!+(d.attracted?0:Math.sin(time/280+Number(d.id.length))*4);c.save();c.translate(x,y);c.rotate(time/900);c.fillStyle=color;c.shadowColor=color;c.shadowBlur=d.attracted?22:15;c.fillRect(-8,-8,16,16);c.restore();
    }
  }

  drawPickupRange(c:CanvasRenderingContext2D,time:number){
    if(!this.data.drops.some((drop)=>drop.attracted))return;
    c.save();c.strokeStyle=`rgba(138,247,213,${.46+Math.sin(time/180)*.1})`;c.lineWidth=1.5;c.setLineDash([5,7]);c.lineDashOffset=-time/45;c.shadowColor="#8af7d5";c.shadowBlur=7;c.beginPath();c.arc(this.data.player.x,this.data.player.y,PICKUP_RADIUS,0,Math.PI*2);c.stroke();c.restore();
  }

  drawNpcs(c: CanvasRenderingContext2D,time:number) {
    for(const n of this.data.npcs){if(!this.isDiscovered(n.x,n.y))continue;c.save();c.translate(n.x,n.y);c.strokeStyle=n.kind==="cartographer"?"#8af7d5":"#ffbd69";c.lineWidth=2;c.globalAlpha=.75+.2*Math.sin(time/500);c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,12,time/700,time/700+Math.PI*1.4);c.stroke();c.fillStyle=c.strokeStyle;c.font="10px Rajdhani";c.textAlign="center";c.fillText(n.kind==="cartographer"?"绘图师":"折跃师",0,40);c.restore();}
  }

  drawEnemies(c: CanvasRenderingContext2D,time:number) {
    for(const e of this.data.enemies){if(!e.alive||e.active===false||!this.isDiscovered(e.x,e.y))continue;let x=e.x,y=e.y;if(this.enemyAnimating?.enemy.id===e.id){const t=clamp((time-this.enemyAnimating.start)/300,0,1);x=lerp(this.enemyAnimating.from.x,this.enemyAnimating.to.x,t);y=lerp(this.enemyAnimating.from.y,this.enemyAnimating.to.y,t)}c.save();c.translate(x,y);const boss=e.kind==="boss";c.fillStyle=boss?"#6f1f35":e.kind==="sentinel"?"#7b522f":"#39434b";c.strokeStyle=boss?"#ff6274":e.kind==="charger"?"#ffbd69":"#8aa29e";c.lineWidth=boss?3:2;c.shadowColor=c.strokeStyle;c.shadowBlur=boss?18:5;c.beginPath();if(e.kind==="sentinel"){for(let i=0;i<8;i++){const a=i*Math.PI/4+(i?0:time/1000),rr=i%2?e.r*.75:e.r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath()}else c.arc(0,0,e.r,0,Math.PI*2);c.fill();c.stroke();c.shadowBlur=0;c.fillStyle="#080a0d";c.beginPath();c.arc(0,0,Math.max(5,e.r*.28),0,Math.PI*2);c.fill();c.restore();c.fillStyle="#252a31";c.fillRect(x-e.r,y-e.r-13,e.r*2,4);c.fillStyle=boss?"#ff6274":"#ffbd69";c.fillRect(x-e.r,y-e.r-13,e.r*2*(e.hp/e.maxHp),4);}
  }

  drawPreview(c: CanvasRenderingContext2D,time:number) {
    if(!this.preview||this.phase!=="aim")return;const pts=this.preview.points;c.save();c.strokeStyle="rgba(138,247,213,.57)";c.lineWidth=2;c.setLineDash([7,9]);c.lineDashOffset=-time/45;c.shadowColor="#8af7d5";c.shadowBlur=5;c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(const p of pts)c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);const end=pts[pts.length-1];c.globalAlpha=.8;c.beginPath();c.arc(end.x,end.y,10,0,Math.PI*2);c.stroke();c.restore();
  }

  drawPlayer(c: CanvasRenderingContext2D,time:number) {
    const p=this.data.player;c.save();c.translate(p.x,p.y);const pulse=1+Math.sin(time/180)*.04;c.scale(pulse,pulse);c.fillStyle="#82e8cb";c.shadowColor="#8af7d5";c.shadowBlur=22;c.beginPath();c.arc(0,0,14,0,Math.PI*2);c.fill();c.fillStyle="#effff9";c.shadowBlur=5;c.beginPath();c.arc(-4,-5,5,0,Math.PI*2);c.fill();c.restore();
  }

  drawFog(c: CanvasRenderingContext2D) {
    const discovered=new Set(this.data.discovered);const minX=Math.floor(this.camera.x/CELL)-1,maxX=Math.ceil((this.camera.x+this.camera.w)/CELL)+1,minY=Math.floor(this.camera.y/CELL)-1,maxY=Math.ceil((this.camera.y+this.camera.h)/CELL)+1;
    c.save();
    const vision=this.stats().vision;
    const glow=c.createRadialGradient(this.data.player.x,this.data.player.y,vision*.18,this.data.player.x,this.data.player.y,vision*1.18);
    glow.addColorStop(0,"rgba(0,2,5,0)");
    glow.addColorStop(.58,"rgba(0,2,5,.08)");
    glow.addColorStop(.82,"rgba(0,2,5,.3)");
    glow.addColorStop(1,"rgba(0,2,5,.58)");
    c.fillStyle=glow;
    c.fillRect(this.camera.x-2,this.camera.y-2,this.camera.w+4,this.camera.h+4);
    for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++){
      if(discovered.has(`${gx},${gy}`))continue;
      c.fillStyle="rgba(0,1,3,.975)";
      c.fillRect(gx*CELL,gy*CELL,CELL+.5,CELL+.5);
    }
    c.restore();
  }
}

function circleRect(x:number,y:number,r:number,rect:{x:number;y:number;w:number;h:number}){const cx=clamp(x,rect.x,rect.x+rect.w),cy=clamp(y,rect.y,rect.y+rect.h);return (x-cx)**2+(y-cy)**2<r*r}
function circleInWalkable(x:number,y:number,r:number){if(!inWalkable(x,y))return false;for(let i=0;i<12;i++){const angle=i*Math.PI/6;if(!inWalkable(x+Math.cos(angle)*r,y+Math.sin(angle)*r))return false;}return true}
function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function lerp(a:number,b:number,t:number){return a+(b-a)*t}
function easeOut(t:number){return 1-Math.pow(1-t,2.2)}
function pointOnPath(points:Vec[],t:number){
  if(points.length===0)return{x:PLAYER_START.x,y:PLAYER_START.y};
  if(points.length===1)return{x:points[0].x,y:points[0].y};
  const f=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(f)),k=f-i;
  return{x:lerp(points[i].x,points[i+1].x,k),y:lerp(points[i].y,points[i+1].y,k)};
}
function scrapValue(i:Item){return i.rarity==="epic"?12:i.rarity==="rare"?7:3}
function setText(id:string,text:string,paragraph=false){const el=document.querySelector(`#${id}`);if(el) paragraph?el.textContent=text:el.textContent=text}

let game: Game | null = null;

function showTitle() {
  game = null;
  const meta=loadMeta(), hasSave=!!localStorage.getItem(SAVE_KEY);
  app.innerHTML=`<div class="overlay"><div class="title-screen"><div class="title-visual"><div class="orbit o1"></div><div class="orbit o2"></div><div class="hero-orb"></div>${Array.from({length:12},(_,i)=>`<i class="trail-dot" style="left:${16+i*3.1}%;top:${37+i*1.25}%"></i>`).join("")}<div class="title-copy"><div class="num">PROJECT / 01</div><h1>回声<span>轨道</span></h1><p>PINBALL × ROGUELIKE</p></div></div><div class="menu-panel"><div class="eyebrow">固定迷宫 · 永久死亡</div><h2>${hasSave?"检测到未完成航行":"等待首次航向"}</h2><p>在无重力遗迹中规划反弹路径。每一次停下，都会让迷雾中的敌人获得回应。</p>${hasSave?`<button class="menu-btn" id="continueBtn">继续上次游戏</button>`:""}<button class="menu-btn" id="newBtn">${hasSave?"开始新游戏 · 删除临时存档":"开始新游戏"}</button><div class="menu-meta"><div class="meta-card">已完成航行<b>${meta.runs}</b></div><div class="meta-card">永久地图记录<b>${meta.cartographerMet?Math.round(meta.permanentFog.length/(WORLD.w/CELL*WORLD.h/CELL)*100)+"%":"未解锁"}</b></div></div></div></div></div>`;
  document.querySelector("#continueBtn")?.addEventListener("click",continueGame);
  document.querySelector("#newBtn")?.addEventListener("click",startNew);
}

function continueGame(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return startNew();game=new Game(JSON.parse(raw));}catch{startNew()}}
function startNew(){localStorage.removeItem(SAVE_KEY);const meta=loadMeta();game=new Game(initialSave(meta));game.autoSave()}

showTitle();
