export type CombatAction = "light" | "heavy" | "kick" | "special";
export type FighterState = "idle" | "walk" | "crouch" | "block" | "jump" | "light" | "heavy" | "kick" | "special" | "hit" | "blockstun" | "ko";

export type InputFrame = {
  left: boolean; right: boolean; down: boolean; jump: boolean; block: boolean;
  light: boolean; heavy: boolean; kick: boolean; special: boolean;
};

export type Combatant = {
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  health: number; meter: number; state: FighterState; stateFrame: number;
  hitstun: number; blockstun: number; moveConnected: boolean;
};

export type CombatSnapshot = {
  fighters: [Combatant, Combatant];
  timer: number; phase: "ready" | "fight" | "ko"; winner: 0 | 1 | null;
  frame: number; hit: { attacker: 0 | 1; blocked: boolean; action: CombatAction; stamp: number; frame: number } | null;
};

type Move = {
  startup: number; active: number; recovery: number; damage: number; chip: number;
  reach: number; hitstun: number; blockstun: number; push: number; meter: number;
  level: "high" | "mid"; hitBottom: number; hitHeight: number;
};

export const MOVES: Record<CombatAction, Move> = {
  light: { startup: 5, active: 3, recovery: 11, damage: 6, chip: 0, reach: 116, hitstun: 13, blockstun: 7, push: 18, meter: 8, level: "high", hitBottom: 96, hitHeight: 58 },
  heavy: { startup: 10, active: 4, recovery: 18, damage: 13, chip: 1, reach: 138, hitstun: 21, blockstun: 12, push: 31, meter: 13, level: "high", hitBottom: 88, hitHeight: 76 },
  kick: { startup: 8, active: 5, recovery: 17, damage: 10, chip: 1, reach: 154, hitstun: 17, blockstun: 10, push: 25, meter: 10, level: "mid", hitBottom: 42, hitHeight: 90 },
  special: { startup: 17, active: 7, recovery: 28, damage: 19, chip: 3, reach: 265, hitstun: 28, blockstun: 16, push: 48, meter: 0, level: "mid", hitBottom: 24, hitHeight: 142 },
};

export type CombatBox = { kind: "hurt" | "hit" | "guard"; side: 0 | 1; x: number; y: number; width: number; height: number };

const EMPTY_INPUT: InputFrame = { left: false, right: false, down: false, jump: false, block: false, light: false, heavy: false, kick: false, special: false };
const actionKeys: CombatAction[] = ["special", "kick", "heavy", "light"];
const attackStates = new Set<FighterState>(["light", "heavy", "kick", "special"]);
const cloneInput = (input?: Partial<InputFrame>): InputFrame => ({ ...EMPTY_INPUT, ...input });

export class FightingEngine {
  readonly fighters: [Combatant, Combatant] = [this.makeFighter(370, 1), this.makeFighter(910, -1)];
  private previous: [InputFrame, InputFrame] = [cloneInput(), cloneInput()];
  private buffers: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  private readyFrames = 100;
  private remainingFrames = 60 * 60;
  private hitstop = 0;
  private hitEvent: CombatSnapshot["hit"] = null;
  private hitStamp = 0;
  private readonly difficulty: number;
  frame = 0;
  winner: 0 | 1 | null = null;

  constructor(difficulty = 1) { this.difficulty = difficulty; }

  private makeFighter(x: number, facing: 1 | -1): Combatant {
    return { x, y: 0, vx: 0, vy: 0, facing, health: 100, meter: 35, state: "idle", stateFrame: 0, hitstun: 0, blockstun: 0, moveConnected: false };
  }

  makeAIInput(): InputFrame {
    const self = this.fighters[1];
    const rival = this.fighters[0];
    const distance = Math.abs(self.x - rival.x);
    const input = cloneInput();
    if (this.readyFrames > 0 || this.winner !== null) return input;
    const toward = rival.x < self.x ? "left" : "right";
    if (distance > 175) input[toward] = true;
    if (distance < 185 && this.frame % Math.max(20, 44 - this.difficulty * 2) === 0) {
      const roll = (this.frame * 17 + this.difficulty * 13) % 100;
      if (self.meter >= 40 && roll > 88) input.special = true;
      else if (roll > 65) input.kick = true;
      else if (roll > 35) input.heavy = true;
      else input.light = true;
    }
    if (distance < 165 && rival.stateFrame > 0 && attackStates.has(rival.state) && (this.frame + this.difficulty) % 7 < 3) input.block = true;
    if (distance < 115 && this.frame % 91 === 0) input.down = true;
    return input;
  }

  step(rawOne: Partial<InputFrame>, rawTwo: Partial<InputFrame>): CombatSnapshot {
    const inputs: [InputFrame, InputFrame] = [cloneInput(rawOne), cloneInput(rawTwo)];
    this.frame++;
    if (this.readyFrames > 0) { this.readyFrames--; this.previous = inputs; return this.snapshot(); }
    if (this.winner !== null) return this.snapshot();
    if (this.hitstop > 0) { this.hitstop--; this.previous = inputs; return this.snapshot(); }

    this.remainingFrames--;
    for (const side of [0, 1] as const) this.captureInputs(side, inputs[side]);
    this.updateFacing();
    for (const side of [0, 1] as const) this.updateFighter(side, inputs[side]);
    this.resolvePushboxes();
    for (const side of [0, 1] as const) this.resolveAttack(side, inputs[side === 0 ? 1 : 0]);
    this.previous = inputs;

    if (this.fighters[0].health <= 0 || this.fighters[1].health <= 0 || this.remainingFrames <= 0) {
      const winner: 0 | 1 = this.fighters[0].health >= this.fighters[1].health ? 0 : 1;
      this.winner = winner; this.fighters[0].state = winner === 0 ? "idle" : "ko"; this.fighters[1].state = winner === 1 ? "idle" : "ko";
    }
    return this.snapshot();
  }

  private captureInputs(side: 0 | 1, input: InputFrame) {
    const previous = this.previous[side];
    for (const key of ["jump", ...actionKeys] as const) if (input[key] && !previous[key]) this.buffers[side].set(key, this.frame + 7);
    for (const [key, expiry] of this.buffers[side]) if (expiry < this.frame) this.buffers[side].delete(key);
  }

  private consume(side: 0 | 1, key: string) { const found = this.buffers[side].has(key); if (found) this.buffers[side].delete(key); return found; }

  private updateFacing() {
    const [one, two] = this.fighters;
    if (!attackStates.has(one.state) && one.hitstun === 0) one.facing = one.x <= two.x ? 1 : -1;
    if (!attackStates.has(two.state) && two.hitstun === 0) two.facing = two.x <= one.x ? 1 : -1;
  }

  private updateFighter(side: 0 | 1, input: InputFrame) {
    const fighter = this.fighters[side];
    fighter.stateFrame++;
    if (fighter.hitstun > 0) { fighter.hitstun--; fighter.state = "hit"; fighter.x += fighter.vx; fighter.vx *= .82; if (!fighter.hitstun) this.enter(fighter, "idle"); return; }
    if (fighter.blockstun > 0) { fighter.blockstun--; fighter.state = "blockstun"; fighter.x += fighter.vx; fighter.vx *= .8; if (!fighter.blockstun) this.enter(fighter, input.block ? "block" : "idle"); return; }

    if (fighter.y > 0 || fighter.state === "jump") {
      const horizontal = Number(input.right) - Number(input.left);
      fighter.x += horizontal * 5.4; fighter.y += fighter.vy; fighter.vy -= .92;
      if (fighter.y <= 0) { fighter.y = 0; fighter.vy = 0; this.enter(fighter, "idle"); }
      return;
    }

    if (attackStates.has(fighter.state)) {
      const move = MOVES[fighter.state as CombatAction];
      if (fighter.stateFrame >= move.startup + move.active + move.recovery) this.enter(fighter, "idle");
      return;
    }

    const bufferedAction = actionKeys.find((action) => this.buffers[side].has(action));
    if (bufferedAction && (bufferedAction !== "special" || fighter.meter >= 40)) {
      this.consume(side, bufferedAction); if (bufferedAction === "special") fighter.meter -= 40;
      this.enter(fighter, bufferedAction); fighter.moveConnected = false; return;
    }
    if (this.consume(side, "jump")) { fighter.vy = 14.8; fighter.y = 1; this.enter(fighter, "jump"); return; }
    if (input.block) { this.enter(fighter, "block"); return; }
    if (input.down) { this.enter(fighter, "crouch"); return; }
    const direction = Number(input.right) - Number(input.left);
    if (direction) { fighter.x += direction * 6.1; this.enter(fighter, "walk", false); }
    else this.enter(fighter, "idle", false);
    fighter.x = Math.max(115, Math.min(1165, fighter.x));
  }

  private enter(fighter: Combatant, state: FighterState, reset = true) {
    if (fighter.state === state && !reset) return;
    fighter.state = state; fighter.stateFrame = 0;
  }

  private resolvePushboxes() {
    const [one, two] = this.fighters;
    const overlap = 94 - Math.abs(one.x - two.x);
    if (overlap <= 0) return;
    const direction = one.x <= two.x ? -1 : 1;
    one.x = Math.max(115, Math.min(1165, one.x + direction * overlap / 2));
    two.x = Math.max(115, Math.min(1165, two.x - direction * overlap / 2));
  }

  private resolveAttack(side: 0 | 1, defenderInput: InputFrame) {
    const attacker = this.fighters[side];
    if (!attackStates.has(attacker.state) || attacker.moveConnected) return;
    const action = attacker.state as CombatAction;
    const move = MOVES[action];
    if (attacker.stateFrame < move.startup || attacker.stateFrame >= move.startup + move.active) return;
    const target = this.fighters[side === 0 ? 1 : 0];
    const inFront = (target.x - attacker.x) * attacker.facing > 0;
    const attackLeft = attacker.facing === 1 ? attacker.x + 34 : attacker.x - move.reach;
    const targetHeight = target.state === "crouch" ? 86 : 168;
    const targetLeft = target.x - 38;
    const horizontalHit = attackLeft < targetLeft + 76 && attackLeft + move.reach - 34 > targetLeft;
    const verticalHit = move.hitBottom < target.y + targetHeight && move.hitBottom + move.hitHeight > target.y;
    if (!inFront || !horizontalHit || !verticalHit) return;
    attacker.moveConnected = true;
    const guardMatches = move.level === "mid" || !defenderInput.down;
    const blocked = defenderInput.block && guardMatches && target.hitstun === 0 && !attackStates.has(target.state);
    const damage = blocked ? move.chip : move.damage;
    target.health = Math.max(0, target.health - damage);
    target.vx = attacker.facing * move.push * (blocked ? .55 : 1);
    if (blocked) { target.blockstun = move.blockstun; this.enter(target, "blockstun"); }
    else { target.hitstun = move.hitstun; this.enter(target, "hit"); }
    attacker.meter = Math.min(100, attacker.meter + move.meter);
    target.meter = Math.min(100, target.meter + (blocked ? 3 : 7));
    this.hitstop = blocked ? 3 : action === "special" ? 9 : 6;
    this.hitEvent = { attacker: side, blocked, action, stamp: ++this.hitStamp, frame: this.frame };
  }

  snapshot(): CombatSnapshot {
    return { fighters: this.fighters, timer: Math.max(0, Math.ceil(this.remainingFrames / 60)), phase: this.winner !== null ? "ko" : this.readyFrames > 0 ? "ready" : "fight", winner: this.winner, frame: this.frame, hit: this.hitEvent };
  }

  debugBoxes(): CombatBox[] {
    const boxes: CombatBox[] = [];
    for (const side of [0, 1] as const) {
      const fighter = this.fighters[side];
      const height = fighter.state === "crouch" ? 86 : 168;
      boxes.push({ kind: "hurt", side, x: fighter.x - 38, y: fighter.y, width: 76, height });
      if (fighter.state === "block" || fighter.state === "blockstun") boxes.push({ kind: "guard", side, x: fighter.x - 44, y: fighter.y + 30, width: 88, height: fighter.state === "crouch" ? 60 : 132 });
      if (attackStates.has(fighter.state)) {
        const move = MOVES[fighter.state as CombatAction];
        if (fighter.stateFrame >= move.startup && fighter.stateFrame < move.startup + move.active) {
          boxes.push({ kind: "hit", side, x: fighter.facing === 1 ? fighter.x + 34 : fighter.x - move.reach, y: move.hitBottom, width: move.reach - 34, height: move.hitHeight });
        }
      }
    }
    return boxes;
  }
}
