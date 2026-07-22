import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const atlases = [
  "public/game/fighters-combat-atlas.png",
  "public/game/fighters-volt-kael.png",
  "public/game/fighters-sahra-aeri.png",
  "public/game/fighters-kage.png",
];

const stages = [
  "public/game/stage-neon.png",
  "public/game/stage-temple.png",
  "public/game/stage-oasis.png",
];

test("combat atlases have an exact transparent 5x2 frame grid", async () => {
  for (const path of atlases) {
    const png = await readFile(path);
    assert.equal(png.subarray(1, 4).toString(), "PNG", `${path} is a PNG`);
    assert.equal(png.readUInt32BE(16), 1920, `${path} width`);
    assert.equal(png.readUInt32BE(20), 1024, `${path} height`);
    assert.equal(png[25], 6, `${path} must be RGBA`);
    assert.equal(1920 / 5, 384, "frame width");
    assert.equal(1024 / 2, 512, "frame height");
  }
});

test("portrait atlas has exact 4x2 cells and is never stretched in CSS", async () => {
  const png = await readFile("public/fighter-atlas.png");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(width, 1716);
  assert.equal(height, 916);
  assert.equal(width % 4, 0, "portrait columns divide evenly");
  assert.equal(height % 2, 0, "portrait rows divide evenly");
  const css = await readFile("app/globals.css", "utf8");
  assert.doesNotMatch(css, /background-size:400% 200%/, "portrait cells must preserve their aspect ratio");
});

test("stage art uses one consistent cinematic 16:9 canvas", async () => {
  for (const path of stages) {
    const png = await readFile(path);
    assert.equal(png.subarray(1, 4).toString(), "PNG", `${path} is a PNG`);
    assert.equal(png.readUInt32BE(16), 1600, `${path} width`);
    assert.equal(png.readUInt32BE(20), 900, `${path} height`);
  }
});

test("social title art matches its declared 1200x630 share ratio", async () => {
  const png = await readFile("public/og.png");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
