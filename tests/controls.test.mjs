import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keyboard controls use arrows for movement and S D F for attacks", async () => {
  const source = await readFile("app/PhaserArena.tsx", "utf8");
  assert.match(source, /jump: "UP"/);
  assert.match(source, /block: "A"/);
  assert.match(source, /light: "S"/);
  assert.match(source, /heavy: "D"/);
  assert.match(source, /kick: "F"/);
  assert.match(source, /special: "R"/);
  assert.doesNotMatch(source, /jump: "SPACE"/);
});

test("visible control legends match the engine bindings", async () => {
  const source = await readFile("app/ImmortalCombat.tsx", "utf8");
  for (const label of ["↑", "A", "S", "D", "F", "R"]) assert.match(source, new RegExp(`<kbd>${label}</kbd>`));
});
