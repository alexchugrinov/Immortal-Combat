import test from "node:test";
import assert from "node:assert/strict";
import { sampleMotion } from "../app/combat-animation.ts";

test("walk clip advances through eight authored phases", () => {
  const frames = Array.from({ length: 8 }, (_, frame) => sampleMotion("walk", frame, frame * 74, 0).walkFrame);
  assert.deepEqual(frames, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.notEqual(sampleMotion("walk", 0, 74, 0).y, sampleMotion("walk", 0, 0, 0).y);
});

test("attacks contain anticipation, contact and recovery", () => {
  const anticipation = sampleMotion("heavy", 2, 0, 0);
  const contact = sampleMotion("heavy", 14, 0, 0);
  const recovery = sampleMotion("heavy", 29, 0, 0);
  assert.equal(anticipation.pose, 0);
  assert.equal(contact.pose, 2);
  assert.equal(recovery.pose, 0);
  assert.ok(anticipation.attackFrame < contact.attackFrame);
  assert.ok(contact.attackFrame < recovery.attackFrame);
  assert.ok(anticipation.x < 0, "anticipation draws back");
  assert.ok(contact.x > 0, "contact lunges forward");
});

test("the same clip mirrors motion for the opposing side", () => {
  const left = sampleMotion("kick", 14, 0, 0);
  const right = sampleMotion("kick", 14, 0, 1);
  assert.equal(left.pose, right.pose);
  assert.equal(left.x, -right.x);
  assert.equal(left.rotation, -right.rotation);
});
