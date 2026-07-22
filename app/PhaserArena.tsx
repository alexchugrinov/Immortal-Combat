"use client";

import { useEffect, useRef } from "react";
import type { Fighter, Stage } from "./ImmortalCombat";
import { FightingEngine, MOVES, type CombatAction, type CombatSnapshot, type FighterState, type InputFrame } from "./fighting-engine";

type Props = {
  mode: "story" | "versus"; level: number; fighters: [Fighter, Fighter]; stage: Stage; soundOn: boolean; paused: boolean;
  onSnapshot: (snapshot: CombatSnapshot) => void; onPause: () => void; onReady: () => void;
};

const poseForState: Record<FighterState, 0 | 1 | 2 | 3 | 4> = {
  idle: 0, walk: 1, crouch: 4, block: 4, jump: 0, light: 2, heavy: 2,
  kick: 3, special: 2, hit: 0, blockstun: 4, ko: 0,
};

type CombatVisual = { texture: string; row: 0 | 5; scale: number; awakenedRow?: 0 | 5 };

const combatVisualFor = (fighter: Fighter): CombatVisual => {
  switch (fighter.id) {
    case "nyra": return { texture: "combat-core", row: 5, scale: 1 };
    case "volt": return { texture: "combat-volt-kael", row: 0, scale: 1 };
    case "kael": return { texture: "combat-volt-kael", row: 5, scale: 1 };
    case "sahra": return { texture: "combat-sahra-aeri", row: 0, scale: 1 };
    case "aeri": return { texture: "combat-sahra-aeri", row: 5, scale: 1 };
    case "kage": return { texture: "combat-kage", row: 0, awakenedRow: 5, scale: 1 };
    default: return { texture: "combat-core", row: 0, scale: 1 };
  }
};

const attackingStates = new Set<FighterState>(["light", "heavy", "kick", "special"]);
const combatTextureFiles: Record<string, string> = {
  "combat-core": "fighters-combat-atlas.png",
  "combat-volt-kael": "fighters-volt-kael.png",
  "combat-sahra-aeri": "fighters-sahra-aeri.png",
  "combat-kage": "fighters-kage.png",
};

export function PhaserArena({ mode, level, fighters, stage, soundOn, paused, onSnapshot, onPause, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const callbacks = useRef({ onSnapshot, onPause, onReady });
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { callbacks.current = { onSnapshot, onPause, onReady }; }, [onSnapshot, onPause, onReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let destroyed = false;
    let game: import("phaser").Game | undefined;
    let audioContext: AudioContext | null = null;

    const boot = async () => {
      const Phaser = (await import("phaser")).default;
      if (destroyed) return;
      const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
      const simulation = new FightingEngine(level);
      const visuals: [CombatVisual, CombatVisual] = [combatVisualFor(fighters[0]), combatVisualFor(fighters[1])];
      let accumulator = 0;
      let lastHitStamp = 0;
      let lastSnapshotFrame = 0;
      const specialCastFrames = [-1, -1];
      let sprites: [import("phaser").GameObjects.Sprite, import("phaser").GameObjects.Sprite];
      let shadows: [import("phaser").GameObjects.Ellipse, import("phaser").GameObjects.Ellipse];
      let powerAuras: [import("phaser").GameObjects.Arc, import("phaser").GameObjects.Arc];
      let keys: Record<string, import("phaser").Input.Keyboard.Key>;
      let skyParticles: import("phaser").GameObjects.Arc[] = [];
      let debugGraphics: import("phaser").GameObjects.Graphics;
      let debugLabel: import("phaser").GameObjects.Text;
      let debugVisible = false;
      let gamepadPausePressed = false;
      const wakeAudio = () => {
        if (!soundOn) return;
        audioContext ??= new window.AudioContext();
        if (audioContext.state === "suspended") void audioContext.resume();
      };
      const playImpact = (special: boolean, blocked: boolean) => {
        if (!soundOn) return;
        wakeAudio();
        if (!audioContext) return;
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = special ? "sawtooth" : blocked ? "triangle" : "square";
        oscillator.frequency.setValueAtTime(special ? 180 : blocked ? 105 : 76, now);
        oscillator.frequency.exponentialRampToValueAtTime(special ? 48 : 34, now + (special ? .22 : .09));
        gain.gain.setValueAtTime(special ? .085 : .055, now);
        gain.gain.exponentialRampToValueAtTime(.0001, now + (special ? .24 : .1));
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + (special ? .25 : .11));
      };

      class CombatScene extends Phaser.Scene {
        constructor() { super("combat"); }
        preload() {
          for (const texture of new Set(visuals.map((visual) => visual.texture))) {
            this.load.spritesheet(texture, `${base}game/${combatTextureFiles[texture]}`, { frameWidth: 384, frameHeight: 512, endFrame: 9 });
          }
          this.load.image("arena-stage", `${base}game/${stage.image}`);
        }
        create() {
          const width = 1280, height = 720;
          this.cameras.main.setBackgroundColor(stage.sky);
          const backdrop = this.add.image(640, 360, "arena-stage").setDisplaySize(1304, 734).setDepth(0);
          this.tweens.add({ targets: backdrop, x: 648, scaleX: 1.018, scaleY: 1.018, duration: 9000, yoyo: true, repeat: -1, ease: "Sine.InOut" });
          const atmosphere = this.add.graphics().setDepth(1);
          atmosphere.fillStyle(parseInt(stage.sky.slice(1), 16), .1).fillRect(0, 0, width, height);
          atmosphere.fillStyle(0x030408, .22).fillRect(0, 0, width, 120);
          atmosphere.lineStyle(2, parseInt(stage.accent.slice(1), 16), .62).lineBetween(0, 626, width, 626);
          skyParticles = Array.from({ length: 42 }, (_, i) => this.add.circle((i * 149) % width, 75 + (i * 83) % 505, 1 + i % 2, i % 3 ? 0xffc979 : parseInt(stage.accent.slice(1), 16), .5).setDepth(5));
          debugGraphics = this.add.graphics().setDepth(40).setVisible(false);
          debugLabel = this.add.text(18, 672, "COMBAT GYM · HIT / HURT / GUARD BOXES", { fontFamily: "monospace", fontSize: "12px", color: "#ffffff", backgroundColor: "#08080ccc", padding: { x: 9, y: 6 } }).setDepth(41).setVisible(false);

          shadows = [
            this.add.ellipse(370, 620, 240, 34, 0x000000, .68).setDepth(7),
            this.add.ellipse(910, 620, 240, 34, 0x000000, .68).setDepth(7),
          ];
          powerAuras = [
            this.add.circle(370, 430, 112, parseInt(fighters[0].glow.slice(1), 16), .13).setStrokeStyle(3, parseInt(fighters[0].glow.slice(1), 16), .8).setDepth(8).setVisible(false),
            this.add.circle(910, 430, 112, parseInt(fighters[1].glow.slice(1), 16), .13).setStrokeStyle(3, parseInt(fighters[1].glow.slice(1), 16), .8).setDepth(8).setVisible(false),
          ];
          sprites = [
            this.add.sprite(370, 626, visuals[0].texture, visuals[0].row).setOrigin(.5, .96).setScale(visuals[0].scale).setDepth(10),
            this.add.sprite(910, 626, visuals[1].texture, visuals[1].row).setOrigin(.5, .96).setScale(visuals[1].scale).setFlipX(true).setDepth(10),
          ];
          const keyboard = this.input.keyboard!;
          keyboard.addCapture(["LEFT", "RIGHT", "DOWN", "SPACE", "D", "F", "G", "H", "R", "ESC", "BACKTICK"]);
          keys = keyboard.addKeys({ left: "LEFT", right: "RIGHT", down: "DOWN", jump: "SPACE", block: "D", light: "F", heavy: "G", kick: "H", special: "R", pause: "ESC", debug: "BACKTICK" }) as Record<string, import("phaser").Input.Keyboard.Key>;
          keyboard.on("keydown", wakeAudio);
          keys.pause.on("down", () => callbacks.current.onPause());
          keys.debug.on("down", () => { debugVisible = !debugVisible; debugGraphics.setVisible(debugVisible); debugLabel.setVisible(debugVisible); });
          callbacks.current.onSnapshot(simulation.snapshot());
          callbacks.current.onReady();
        }

        update(_time: number, delta: number) {
          const pads = navigator.getGamepads?.() ?? [];
          const connected = Array.from(pads).filter((pad): pad is Gamepad => Boolean(pad?.connected));
          const pausePressed = connected.some((pad) => Boolean(pad.buttons[9]?.pressed || pad.buttons[8]?.pressed));
          if (pausePressed && !gamepadPausePressed) callbacks.current.onPause();
          gamepadPausePressed = pausePressed;
          if (pausedRef.current) return;
          accumulator = Math.min(accumulator + delta, 80);
          let snapshot = simulation.snapshot();
          while (accumulator >= 1000 / 60) {
            const keyboardInput: InputFrame = {
              left: keys.left.isDown, right: keys.right.isDown, down: keys.down.isDown, jump: keys.jump.isDown, block: keys.block.isDown,
              light: keys.light.isDown, heavy: keys.heavy.isDown, kick: keys.kick.isDown, special: keys.special.isDown,
            };
            const readPad = (pad: Gamepad | null | undefined): InputFrame => ({
              left: Boolean(pad && ((pad.axes[0] ?? 0) < -.25 || pad.buttons[14]?.pressed)), right: Boolean(pad && ((pad.axes[0] ?? 0) > .25 || pad.buttons[15]?.pressed)),
              down: Boolean(pad && ((pad.axes[1] ?? 0) > .35 || pad.buttons[13]?.pressed)), jump: Boolean(pad?.buttons[0]?.pressed), block: Boolean(pad?.buttons[4]?.pressed || pad?.buttons[6]?.pressed),
              light: Boolean(pad?.buttons[2]?.pressed), heavy: Boolean(pad?.buttons[3]?.pressed), kick: Boolean(pad?.buttons[7]?.pressed), special: Boolean(pad?.buttons[1]?.pressed),
            });
            const p1Pad = mode === "story" ? connected[0] : connected.length > 1 ? connected[0] : null;
            const padInput = readPad(p1Pad);
            const p1 = Object.fromEntries(Object.keys(keyboardInput).map((key) => [key, keyboardInput[key as keyof InputFrame] || padInput[key as keyof InputFrame]])) as InputFrame;
            const p2 = mode === "story" ? simulation.makeAIInput() : readPad(connected.length > 1 ? connected[1] : connected[0]);
            snapshot = simulation.step(p1, p2); accumulator -= 1000 / 60;
          }
          snapshot.fighters.forEach((fighter, side) => {
            const sprite = sprites[side];
            const visual = visuals[side];
            const rowOffset = fighter.state === "special" && visual.awakenedRow !== undefined ? visual.awakenedRow : visual.row;
            const basePose = poseForState[fighter.state];
            let pose = fighter.state === "walk" && Math.floor(this.time.now / 105) % 2 === 0 ? 0 : basePose;
            if (attackingStates.has(fighter.state)) {
              const move = MOVES[fighter.state as CombatAction];
              const showingStrike = fighter.stateFrame >= Math.max(1, move.startup - 2) && fighter.stateFrame < move.startup + move.active + 4;
              pose = showingStrike ? basePose : 0;
            }
            const airborne = fighter.y > 1;
            const breathe = fighter.state === "idle" ? Math.sin(this.time.now / 260 + side) * .008 : 0;
            const crouch = fighter.state === "crouch" ? .84 : 1;
            const hitTilt = fighter.state === "hit" ? (side ? -5 : 5) : 0;
            const koTilt = fighter.state === "ko" ? (side ? 84 : -84) : hitTilt;
            sprite.setFrame(rowOffset + pose)
              .setPosition(fighter.x, 626 - fighter.y * 1.06 + (fighter.state === "walk" ? Math.sin(this.time.now / 85) * 4 : 0))
              .setFlipX(fighter.facing === -1)
              .setScale(visual.scale + breathe, (visual.scale + breathe) * crouch)
              .setRotation(Phaser.Math.DegToRad(koTilt))
              .setAlpha(fighter.state === "ko" ? .78 : 1);
            if (fighter.state === "hit") sprite.setTint(0xff6b5e).setTintMode(Phaser.TintModes.FILL); else sprite.clearTint();
            shadows[side].setPosition(fighter.x, 622).setScale(airborne ? .62 : 1, airborne ? .72 : 1).setAlpha(airborne ? .32 : .68);
            const charging = fighter.state === "special";
            powerAuras[side].setVisible(charging).setPosition(fighter.x, 430 - fighter.y).setScale(1 + Math.sin(this.time.now / 70) * .12).setAlpha(.55 + Math.sin(this.time.now / 90) * .25);
            if (fighter.state === "special" && fighter.stateFrame >= MOVES.special.startup) {
              const castFrame = snapshot.frame - fighter.stateFrame;
              if (specialCastFrames[side] !== castFrame) {
                specialCastFrames[side] = castFrame;
                const color = parseInt(fighters[side].glow.slice(1), 16);
                const orb = this.add.circle(fighter.x + fighter.facing * 62, 420 - fighter.y, 24, color, .86).setStrokeStyle(3, 0xffffff, .82).setDepth(12);
                this.tweens.add({ targets: orb, x: fighter.x + fighter.facing * MOVES.special.reach, scale: 1.65, alpha: 0, duration: 220, ease: "Quad.Out", onComplete: () => orb.destroy() });
              }
            }
          });
          skyParticles.forEach((particle, i) => { particle.x += .12 + (i % 3) * .08; if (particle.x > 1285) particle.x = -5; });
          debugGraphics.clear();
          if (debugVisible) {
            for (const box of simulation.debugBoxes()) {
              const color = box.kind === "hit" ? 0xff4242 : box.kind === "guard" ? 0x49c6ff : 0x56ef8f;
              debugGraphics.lineStyle(2, color, .95).fillStyle(color, .12).fillRect(box.x, 626 - box.y - box.height, box.width, box.height).strokeRect(box.x, 626 - box.y - box.height, box.width, box.height);
            }
          }
          if (snapshot.hit && snapshot.hit.stamp !== lastHitStamp) {
            lastHitStamp = snapshot.hit.stamp;
            playImpact(snapshot.hit.action === "special", snapshot.hit.blocked);
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
    return () => { destroyed = true; game?.destroy(true); void audioContext?.close(); };
  // A new match owns a fresh Phaser runtime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level, fighters[0].id, fighters[1].id, stage.id, soundOn]);

  return <div className="phaser-arena" ref={mountRef} aria-label="Immortal Combat fighting arena" />;
}
