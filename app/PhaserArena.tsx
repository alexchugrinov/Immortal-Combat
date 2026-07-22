"use client";

import { useEffect, useRef } from "react";
import type { Fighter, Stage } from "./ImmortalCombat";
import { FightingEngine, type CombatSnapshot, type FighterState, type InputFrame } from "./fighting-engine";

type Props = {
  mode: "story" | "versus"; level: number; fighters: [Fighter, Fighter]; stage: Stage; paused: boolean;
  onSnapshot: (snapshot: CombatSnapshot) => void; onPause: () => void;
};

const sheets = {
  idle: ["Idle.png", 50, 24, -1], walk: ["Walk.png", 33, 34, -1], block: ["BlockIdle.png", 20, 28, -1],
  crouch: ["Crouch.png", 17, 32, 0], jump: ["Jump.png", 29, 40, 0], light: ["Attack1.png", 30, 82, 0],
  heavy: ["Slash.png", 45, 76, 0], kick: ["Kick.png", 36, 76, 0], hit: ["Impact.png", 23, 68, 0],
  ko: ["Death.png", 69, 48, 0], special: ["Casting2.png", 31, 37, 0],
} as const;

const stateAnimation: Record<FighterState, keyof typeof sheets> = {
  idle: "idle", walk: "walk", crouch: "crouch", block: "block", jump: "jump", light: "light", heavy: "heavy",
  kick: "kick", special: "special", hit: "hit", blockstun: "block", ko: "ko",
};

export function PhaserArena({ mode, level, fighters, stage, paused, onSnapshot, onPause }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const callbacks = useRef({ onSnapshot, onPause });
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { callbacks.current = { onSnapshot, onPause }; }, [onSnapshot, onPause]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let destroyed = false;
    let game: import("phaser").Game | undefined;

    const boot = async () => {
      const Phaser = (await import("phaser")).default;
      if (destroyed) return;
      const base = `${(import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/"}game/knight/`;
      const simulation = new FightingEngine(level);
      let accumulator = 0;
      let lastHitStamp = 0;
      let lastSnapshotFrame = 0;
      let sprites: [import("phaser").GameObjects.Sprite, import("phaser").GameObjects.Sprite];
      let keys: Record<string, import("phaser").Input.Keyboard.Key>;
      let skyParticles: import("phaser").GameObjects.Arc[] = [];

      class CombatScene extends Phaser.Scene {
        constructor() { super("combat"); }
        preload() {
          for (const [key, [file]] of Object.entries(sheets)) this.load.spritesheet(key, `${base}${file}`, { frameWidth: 128, frameHeight: 256 });
        }
        create() {
          const width = 1280, height = 720;
          this.cameras.main.setBackgroundColor(stage.sky);
          const graphics = this.add.graphics();
          graphics.fillStyle(0x06070c, 1).fillRect(0, 0, width, height);
          graphics.fillStyle(parseInt(stage.sky.slice(1), 16), .72).fillRect(0, 0, width, 460);
          graphics.fillStyle(0x090b12, 1).fillRect(0, 510, width, 210);
          graphics.lineStyle(2, parseInt(stage.accent.slice(1), 16), .5).lineBetween(0, 620, width, 620);
          for (let i = 0; i < 22; i++) {
            const buildingHeight = 130 + (i * 73) % 270;
            graphics.fillStyle(i % 4 ? 0x0b0d14 : 0x12111b, 1).fillRect(i * 62 - 24, 510 - buildingHeight, 58, buildingHeight);
            graphics.fillStyle(i % 5 === 0 ? parseInt(stage.accent.slice(1), 16) : 0xd2a76f, .38);
            for (let y = 510 - buildingHeight + 28; y < 480; y += 36) graphics.fillRect(i * 62 - 8, y, 22, 2);
          }
          graphics.fillStyle(0x05060a, .92).fillRect(0, 620, width, 100);
          graphics.lineStyle(1, parseInt(stage.accent.slice(1), 16), .18);
          for (let x = 0; x < width; x += 80) graphics.lineBetween(640, 620, x, 720);
          for (let y = 635; y < 720; y += 22) graphics.lineBetween(0, y, width, y);

          for (let i = 0; i < 38; i++) {
            const x = 20 + (i * 97) % 1240; const y = 500 + (i % 3) * 25;
            const body = this.add.rectangle(x, y, 13, 42 + (i % 4) * 5, i % 8 === 0 ? parseInt(stage.accent.slice(1), 16) : 0x12121a).setOrigin(.5, 1);
            this.add.circle(x, y - body.height - 6, 7, i % 3 ? 0x382b2a : 0x64433a);
          }
          skyParticles = Array.from({ length: 36 }, (_, i) => this.add.circle((i * 149) % width, 80 + (i * 83) % 430, 1 + i % 2, i % 3 ? 0xffc979 : parseInt(stage.accent.slice(1), 16), .38));

          for (const [key, [, end, frameRate, repeat]] of Object.entries(sheets)) {
            this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate, repeat });
          }
          sprites = [
            this.add.sprite(370, 624, "idle").setOrigin(.5, .77).setScale(2.08).setTint(0xffffff, 0xffffff, parseInt(fighters[0].color.slice(1), 16), parseInt(fighters[0].color.slice(1), 16)),
            this.add.sprite(910, 624, "idle").setOrigin(.5, .77).setScale(2.08).setFlipX(true).setTint(0xffffff, 0xffffff, parseInt(fighters[1].color.slice(1), 16), parseInt(fighters[1].color.slice(1), 16)),
          ];
          sprites.forEach((sprite) => sprite.play("idle"));
          const keyboard = this.input.keyboard!;
          keys = keyboard.addKeys({ left: "LEFT", right: "RIGHT", down: "DOWN", jump: "SPACE", block: "D", light: "F", heavy: "G", kick: "H", special: "R", pause: "ESC" }) as Record<string, import("phaser").Input.Keyboard.Key>;
          keys.pause.on("down", () => callbacks.current.onPause());
          callbacks.current.onSnapshot(simulation.snapshot());
        }

        update(_time: number, delta: number) {
          if (pausedRef.current) return;
          accumulator = Math.min(accumulator + delta, 80);
          let snapshot = simulation.snapshot();
          while (accumulator >= 1000 / 60) {
            const keyboardInput: InputFrame = {
              left: keys.left.isDown, right: keys.right.isDown, down: keys.down.isDown, jump: keys.jump.isDown, block: keys.block.isDown,
              light: keys.light.isDown, heavy: keys.heavy.isDown, kick: keys.kick.isDown, special: keys.special.isDown,
            };
            const pads = navigator.getGamepads?.() ?? [];
            const readPad = (pad: Gamepad | null | undefined): InputFrame => ({
              left: Boolean(pad && ((pad.axes[0] ?? 0) < -.25 || pad.buttons[14]?.pressed)), right: Boolean(pad && ((pad.axes[0] ?? 0) > .25 || pad.buttons[15]?.pressed)),
              down: Boolean(pad && ((pad.axes[1] ?? 0) > .35 || pad.buttons[13]?.pressed)), jump: Boolean(pad?.buttons[0]?.pressed), block: Boolean(pad?.buttons[4]?.pressed || pad?.buttons[6]?.pressed),
              light: Boolean(pad?.buttons[2]?.pressed), heavy: Boolean(pad?.buttons[3]?.pressed), kick: Boolean(pad?.buttons[7]?.pressed), special: Boolean(pad?.buttons[1]?.pressed),
            });
            const connected = Array.from(pads).filter((pad): pad is Gamepad => Boolean(pad?.connected));
            const p1Pad = mode === "story" ? connected[0] : connected.length > 1 ? connected[0] : null;
            const padInput = readPad(p1Pad);
            const p1 = Object.fromEntries(Object.keys(keyboardInput).map((key) => [key, keyboardInput[key as keyof InputFrame] || padInput[key as keyof InputFrame]])) as InputFrame;
            const p2 = mode === "story" ? simulation.makeAIInput() : readPad(connected.length > 1 ? connected[1] : connected[0]);
            snapshot = simulation.step(p1, p2); accumulator -= 1000 / 60;
          }
          snapshot.fighters.forEach((fighter, side) => {
            const sprite = sprites[side];
            sprite.setPosition(fighter.x, 624 - fighter.y * 1.05).setFlipX(fighter.facing === -1);
            const animation = stateAnimation[fighter.state];
            if (sprite.anims.currentAnim?.key !== animation) sprite.play(animation, true);
          });
          skyParticles.forEach((particle, i) => { particle.x += .12 + (i % 3) * .08; if (particle.x > 1285) particle.x = -5; });
          if (snapshot.hit && snapshot.hit.stamp !== lastHitStamp) {
            lastHitStamp = snapshot.hit.stamp;
            this.cameras.main.shake(snapshot.hit.blocked ? 55 : 95, snapshot.hit.action === "special" ? .012 : .006);
            const target = snapshot.fighters[snapshot.hit.attacker === 0 ? 1 : 0];
            const burst = this.add.circle(target.x, 440 - target.y, snapshot.hit.action === "special" ? 58 : 28, parseInt(fighters[snapshot.hit.attacker].glow.slice(1), 16), .85);
            this.tweens.add({ targets: burst, scale: 2.4, alpha: 0, duration: 180, onComplete: () => burst.destroy() });
          }
          if (snapshot.frame - lastSnapshotFrame >= 3 || snapshot.winner !== null) { lastSnapshotFrame = snapshot.frame; callbacks.current.onSnapshot({ ...snapshot, fighters: [{ ...snapshot.fighters[0] }, { ...snapshot.fighters[1] }] }); }
        }
      }

      game = new Phaser.Game({ type: Phaser.AUTO, parent: mount, width: 1280, height: 720, backgroundColor: "#08090d", render: { antialias: true, pixelArt: false }, scale: { mode: Phaser.Scale.NONE }, scene: CombatScene });
    };
    void boot();
    return () => { destroyed = true; game?.destroy(true); };
  // A new match owns a fresh Phaser runtime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level, fighters[0].id, fighters[1].id, stage.id]);

  return <div className="phaser-arena" ref={mountRef} aria-label="Immortal Combat fighting arena" />;
}
