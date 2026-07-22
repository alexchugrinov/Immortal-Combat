# Immortal Combat

A browser-based elemental fighting game with story progression, two-player local keyboard combat, unlockable fighters, OH currency, secret reward codes, and a WebGL 3D arena.

## Play

- Public game: <https://alexchugrinov.github.io/Immortal-Combat/>
- No ChatGPT account or sign-in is required.
- Progress, unlocked fighters, redeemed codes, and OH are stored locally in the player's browser.

## Controls

The keyboard has a complete two-player layout. The game also detects browser-compatible gamepads automatically:

- Story: controller 1 controls Player 1.
- Versus with two controllers: controller 1 controls Player 1 and controller 2 controls Player 2.
- Versus with one controller: Player 1 uses the keyboard and Player 2 uses the controller.
- Keyboard and controller inputs can be mixed during a match.

| Controller input | Action |
| --- | --- |
| Left stick / D-pad | Move / crouch |
| South (`A` / `✕`) | Jump |
| Left bumper / trigger | Guard |
| Right bumper | Dash toward rival |
| Right trigger | Kick |
| West (`X` / `□`) | Quick attack |
| North (`Y` / `△`) | Heavy attack |
| East (`B` / `○`) | Elemental power |
| Menu / Options | Pause |

| Player | Move | Jump | Crouch | Dash | Guard | Quick | Heavy | Kick | Power |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Player 1 | `A` / `D` | `W` | `S` | `Q` | `E` | `F` | `G` | `R` | `T` |
| Player 2 | `←` / `→` | `↑` | `↓` | `U` | `I` | `J` | `K` | `O` | `L` |

Attacks have different startup, reach, damage, and recovery. Crouch under high punches, use kicks to catch crouching rivals, guard to reduce damage, dash into range, and spend 40 power for an elemental attack.

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

React, TypeScript, Three.js, Tailwind CSS, Vite, and vinext.

The rigged humanoid base characters and animation library are by [Quaternius](https://quaternius.com/) and distributed under CC0 1.0. The original license files are included beside the model assets in `public/models/quaternius`.
