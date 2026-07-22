# Immortal Combat

A browser-based elemental fighting prototype with story progression, local versus, unlockable fighters, OH currency, secret reward codes, and a Phaser-powered frame-based combat engine.

## Play

- Public game: <https://alexchugrinov.github.io/Immortal-Combat/>
- No ChatGPT account or sign-in is required.
- Progress, unlocked fighters, redeemed codes, and OH are stored locally in the player's browser.

## Controls

Story mode uses a conventional keyboard layout. Local versus uses keyboard plus controller or two controllers, avoiding keyboard ghosting and cramped two-player bindings:

- Story: arrows move, `Space` jumps, and the left hand controls defense and attacks. A connected controller also works.
- Versus with two controllers: controller 1 controls Player 1 and controller 2 controls Player 2.
- Versus with one controller: Player 1 uses the keyboard and Player 2 uses the controller.

| Controller input | Action |
| --- | --- |
| Left stick / D-pad | Move / crouch |
| South (`A` / `✕`) | Jump |
| Left bumper / trigger | Guard |
| Right trigger | Kick |
| West (`X` / `□`) | Quick attack |
| North (`Y` / `△`) | Heavy attack |
| East (`B` / `○`) | Elemental power |
| Menu / Options | Pause |

| Player | Move | Jump | Crouch | Block | Light | Heavy | Kick | Power |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Player 1 | `←` / `→` | `Space` | `↓` | `D` | `F` | `G` | `H` | `R` |
| Player 2 | Controller stick | `A` / `✕` | Stick down | `LB` / `L1` | `X` / `□` | `Y` / `△` | `RT` / `R2` | `B` / `○` |

Combat runs at a fixed 60 Hz simulation rate with buffered input, explicit startup/active/recovery frames, pushboxes, hurtboxes, per-frame attack boxes, hit-stop, hit-stun, block-stun, chip damage, knockback, crouch evasion, power-meter requirements, best-of-three rounds, and deterministic story AI. Press the backtick key during combat to display the hit/hurt/guard-box training overlay.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

## Builds

```bash
npm run build          # Sites/Cloudflare build
npm run build:pages    # Static GitHub Pages build
npm test               # Production build and smoke test
```

The GitHub Pages workflow builds a standalone static version into `dist-pages` and publishes it automatically after every push to `main`. GitHub Pages is public and independent of ChatGPT hosting.

## GitHub Pages setup

In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The included workflow handles the remaining build and deployment steps.

## Technology

React, TypeScript, Phaser, Tailwind CSS, Vite, and vinext.

The production artwork is stored as normalized atlases: 4×2 portrait cells, 5×2 transparent combat-pose cells, and consistent 16:9 stage canvases. The interface preserves each source image's aspect ratio instead of stretching it to fit.
