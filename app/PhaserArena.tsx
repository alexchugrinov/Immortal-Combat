"use client";

import { useEffect, useRef } from "react";
import type { Fighter, Stage } from "./ImmortalCombat";
import { FightingEngine, type CombatSnapshot, type FighterState, type InputFrame } from "./fighting-engine";

type Props = {
  mode: "story" | "versus"; level: number; fighters: [Fighter, Fighter]; stage: Stage; paused: boolean;
  onSnapshot: (snapshot: CombatSnapshot) => void; onPause: () => void;
};

const poseForState: Record<FighterState, 0 | 1 | 2 | 3> = {
  idle: 0, walk: 0, crouch: 3, block: 3, jump: 0, light: 1, heavy: 1,
  kick: 2, special: 1, hit: 0, blockstun: 3, ko: 0,
};

const usesNyraArt = (fighter: Fighter) => ["nyra", "sahra", "aeri"].includes(fighter.id);

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
      const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
      const simulation = new FightingEngine(level);
      let accumulator = 0;
      let lastHitStamp = 0;
      let lastSnapshotFrame = 0;
      let sprites: [import("phaser").GameObjects.Sprite, import("phaser").GameObjects.Sprite];
      let shadows: [import("phaser").GameObjects.Ellipse, import("phaser").GameObjects.Ellipse];
      let powerAuras: [import("phaser").GameObjects.Arc, import("phaser").GameObjects.Arc];
      let keys: Record<string, import("phaser").Input.Keyboard.Key>;
      let skyParticles: import("phaser").GameObjects.Arc[] = [];

      class CombatScene extends Phaser.Scene {
        constructor() { super("combat"); }
        preload() {
          this.load.spritesheet("combat-atlas", `${base}game/fighters-combat-atlas.png`, { frameWidth: 384, frameHeight: 512 });
          this.load.image("arena-neon", `${base}game/neon-rooftop-arena.png`);
        }
        create() {
          const width = 1280, height = 720;
          this.cameras.main.setBackgroundColor(stage.sky);
          const backdrop = this.add.image(640, 360, "arena-neon").setDisplaySize(1304, 734).setDepth(0);
          this.tweens.add({ targets: backdrop, x: 648, scaleX: 1.018, scaleY: 1.018, duration: 9000, yoyo: true, repeat: -1, ease: "Sine.InOut" });
          const atmosphere = this.add.graphics().setDepth(1);
          atmosphere.fillStyle(parseInt(stage.sky.slice(1), 16), .1).fillRect(0, 0, width, height);
          atmosphere.fillStyle(0x030408, .22).fillRect(0, 0, width, 120);
          atmosphere.lineStyle(2, parseInt(stage.accent.slice(1), 16), .62).lineBetween(0, 626, width, 626);
          skyParticles = Array.from({ length: 42 }, (_, i) => this.add.circle((i * 149) % width, 75 + (i * 83) % 505, 1 + i % 2, i % 3 ? 0xffc979 : parseInt(stage.accent.slice(1), 16), .5).setDepth(5));

          shadows = [
            this.add.ellipse(370, 620, 240, 34, 0x000000, .68).setDepth(7),
            this.add.ellipse(910, 620, 240, 34, 0x000000, .68).setDepth(7),
          ];
          powerAuras = [
            this.add.circle(370, 430, 112, parseInt(fighters[0].glow.slice(1), 16), .13).setStrokeStyle(3, parseInt(fighters[0].glow.slice(1), 16), .8).setDepth(8).setVisible(false),
            this.add.circle(910, 430, 112, parseInt(fighters[1].glow.slice(1), 16), .13).setStrokeStyle(3, parseInt(fighters[1].glow.slice(1), 16), .8).setDepth(8).setVisible(false),
          ];
          sprites = [
            this.add.sprite(370, 626, "combat-atlas", usesNyraArt(fighters[0]) ? 4 : 0).setOrigin(.5, .96).setScale(.91).setDepth(10),
            this.add.sprite(910, 626, "combat-atlas", usesNyraArt(fighters[1]) ? 4 : 0).setOrigin(.5, .96).setScale(.91).setFlipX(true).setDepth(10),
          ];
          const keyboard = this.input.keyboard!;
          keyboard.addCapture(["LEFT", "RIGHT", "DOWN", "SPACE", "D", "F", "G", "H", "R", "ESC"]);
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
            const rowOffset = usesNyraArt(fighters[side]) ? 4 : 0;
            const pose = poseForState[fighter.state];
            const airborne = fighter.y > 1;
            const breathe = fighter.state === "idle" ? Math.sin(this.time.now / 260 + side) * .008 : 0;
            const crouch = fighter.state === "crouch" ? .84 : 1;
            const hitTilt = fighter.state === "hit" ? (side ? -5 : 5) : 0;
            const koTilt = fighter.state === "ko" ? (side ? 84 : -84) : hitTilt;
            sprite.setFrame(rowOffset + pose)
              .setPosition(fighter.x, 626 - fighter.y * 1.06 + (fighter.state === "walk" ? Math.sin(this.time.now / 85) * 4 : 0))
              .setFlipX(fighter.facing === -1)
              .setScale(.91 + breathe, (.91 + breathe) * crouch)
              .setRotation(Phaser.Math.DegToRad(koTilt))
              .setAlpha(fighter.state === "ko" ? .78 : 1);
            if (fighter.state === "hit") sprite.setTintFill(0xff6b5e); else sprite.clearTint();
            shadows[side].setPosition(fighter.x, 622).setScale(airborne ? .62 : 1, airborne ? .72 : 1).setAlpha(airborne ? .32 : .68);
            const charging = fighter.state === "special";
            powerAuras[side].setVisible(charging).setPosition(fighter.x, 430 - fighter.y).setScale(1 + Math.sin(this.time.now / 70) * .12).setAlpha(.55 + Math.sin(this.time.now / 90) * .25);
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
