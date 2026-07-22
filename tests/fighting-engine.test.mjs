import test from "node:test";
import assert from "node:assert/strict";
import { FightingEngine } from "../app/fighting-engine.ts";

const empty = { left: false, right: false, down: false, jump: false, block: false, light: false, heavy: false, kick: false, special: false };
const ready = (engine) => { for (let frame = 0; frame < 101; frame++) engine.step(empty, empty); };

test("a buffered light attack connects inside its active range", () => {
  const engine = new FightingEngine();
  ready(engine);
  engine.fighters[0].x = 560;
  engine.fighters[1].x = 660;
  engine.step({ ...empty, light: true }, empty);
  for (let frame = 0; frame < 22; frame++) engine.step(empty, empty);
  assert.equal(engine.fighters[1].health, 94);
  assert.ok(engine.fighters[1].hitstun >= 0);
});

test("crouching evades high attacks but not kicks", () => {
  const engine = new FightingEngine();
  ready(engine);
  engine.fighters[0].x = 560;
  engine.fighters[1].x = 660;
  engine.step({ ...empty, light: true }, { ...empty, down: true });
  for (let frame = 0; frame < 22; frame++) engine.step(empty, { ...empty, down: true });
  assert.equal(engine.fighters[1].health, 100);
  engine.step({ ...empty, kick: true }, { ...empty, down: true });
  for (let frame = 0; frame < 24; frame++) engine.step(empty, { ...empty, down: true });
  assert.equal(engine.fighters[1].health, 90);
});

test("blocking converts damage into chip and block-stun", () => {
  const engine = new FightingEngine();
  ready(engine);
  engine.fighters[0].x = 560;
  engine.fighters[1].x = 660;
  engine.step({ ...empty, heavy: true }, { ...empty, block: true });
  for (let frame = 0; frame < 12; frame++) engine.step(empty, { ...empty, block: true });
  assert.equal(engine.fighters[1].health, 99);
  assert.ok(engine.fighters[1].blockstun > 0);
});

test("jump uses a rising and falling arc and returns to the ground", () => {
  const engine = new FightingEngine();
  ready(engine);
  engine.step({ ...empty, jump: true }, empty);
  for (let frame = 0; frame < 10; frame++) engine.step(empty, empty);
  assert.ok(engine.fighters[0].y > 0);
  for (let frame = 0; frame < 50; frame++) engine.step(empty, empty);
  assert.equal(engine.fighters[0].y, 0);
  assert.equal(engine.fighters[0].state, "idle");
});
