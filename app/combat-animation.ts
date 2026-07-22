import type { FighterState } from "./fighting-engine";

export type MotionSample = {
  pose: 0 | 1 | 2 | 3 | 4;
  walkFrame: number;
  attackFrame: number;
  kickFrame: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 3;
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < .5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2;
};

const ATTACK_LENGTHS: Partial<Record<FighterState, number>> = {
  light: 18,
  heavy: 30,
  kick: 34,
  special: 48,
};

/**
 * Visual clip sampler. Combat timing remains owned by FightingEngine; this
 * function turns its deterministic state/frame data into authored animation
 * phases (anticipation, contact and recovery) at 60 Hz.
 */
export function sampleMotion(state: FighterState, stateFrame: number, timeMs: number, side: 0 | 1): MotionSample {
  const direction = side === 0 ? 1 : -1;
  const idleWave = Math.sin(timeMs / 265 + side * Math.PI);
  const sample: MotionSample = { pose: 0, walkFrame: 0, attackFrame: 0, kickFrame: 0, x: 0, y: idleWave * 1.7, scaleX: 1 + idleWave * .004, scaleY: 1 - idleWave * .006, rotation: 0 };

  if (state === "walk") {
    const frame = Math.floor(timeMs / 74) % 8;
    const stride = Math.sin((frame / 8) * Math.PI * 2);
    return { pose: frame === 1 || frame === 2 || frame === 5 || frame === 6 ? 1 : 0, walkFrame: frame, attackFrame: 0, kickFrame: 0, x: stride * 2.5 * direction, y: Math.abs(stride) * -4, scaleX: 1 + Math.abs(stride) * .008, scaleY: 1 - Math.abs(stride) * .008, rotation: stride * .012 * direction };
  }

  if (state === "jump") {
    return { ...sample, pose: 0, x: 5 * direction, y: -2, scaleX: .97, scaleY: 1.035, rotation: -.035 * direction };
  }

  if (state === "crouch") return { ...sample, pose: 4, y: 18, scaleX: 1.04, scaleY: .86 };
  if (state === "block" || state === "blockstun") return { ...sample, pose: 4, x: -7 * direction, y: 5, scaleX: .96, scaleY: .96, rotation: -.025 * direction };
  if (state === "hit") return { ...sample, pose: 0, x: -22 * direction, y: 2, scaleX: 1.06, scaleY: .94, rotation: -.08 * direction };
  if (state === "ko") return { ...sample, pose: 0, x: -35 * direction, y: 72, scaleX: .96, scaleY: .96, rotation: -1.42 * direction };

  const length = ATTACK_LENGTHS[state];
  if (!length) return sample;
  const t = clamp01(stateFrame / length);
  sample.attackFrame = Math.min(6, Math.floor(t * 7));
  sample.kickFrame = Math.min(7, Math.floor(t * 8));
  const anticipationEnd = state === "special" ? .34 : state === "kick" ? .24 : .28;
  const contactEnd = state === "light" ? .57 : .64;

  if (t < anticipationEnd) {
    const phase = easeInOut(t / anticipationEnd);
    return { ...sample, pose: state === "kick" ? 1 : 0, x: -10 * phase * direction, y: state === "kick" ? 7 * phase : 2 * phase, scaleX: 1 - .035 * phase, scaleY: 1 + .025 * phase, rotation: -.065 * phase * direction };
  }

  if (t < contactEnd) {
    const phase = easeOut((t - anticipationEnd) / (contactEnd - anticipationEnd));
    const reach = state === "light" ? 19 : state === "heavy" ? 32 : state === "kick" ? 37 : 24;
    return { ...sample, pose: state === "kick" ? 3 : 2, x: (-10 + reach * phase) * direction, y: state === "kick" ? -8 * phase : -2 * phase, scaleX: 1 + .045 * phase, scaleY: 1 - .025 * phase, rotation: (state === "kick" ? .065 : .035) * phase * direction };
  }

  const recovery = easeInOut((t - contactEnd) / (1 - contactEnd));
  return { ...sample, pose: recovery < .42 ? (state === "kick" ? 3 : 2) : 0, x: (state === "light" ? 17 : 25) * (1 - recovery) * direction, y: -3 * (1 - recovery), scaleX: 1 + .025 * (1 - recovery), scaleY: 1 - .018 * (1 - recovery), rotation: .025 * (1 - recovery) * direction };
}
