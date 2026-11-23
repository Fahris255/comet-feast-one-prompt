# comet-feast-one-prompt

[![make.fun · post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/Fahris255/comet-feast-one-prompt/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/Fahris255/comet-feast-one-prompt/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)

**Comet Feast** — a neon arcade game an AI agent built from exactly one prompt:

> "Build a neon arcade game where a hungry comet races across a midnight sky eating falling stars, dodging crimson meteors, and bursting into fireworks on every fifth star."

## The game

You are the comet. Golden stars rain down a midnight sky — eat them to score and chain a combo. Crimson meteors rain down too — one hit costs a heart and resets the combo, and three hits shatter the comet. Every fifth star in a chain detonates a firework burst worth +50, with a gold flash, a beat of hit-stop and a shower of sparks. The longer you feast, the faster the sky falls.

Juice, layered the way arcade games earn it:

- **Small events** — a star eaten: golden sparks, a floating score pop, a synth blip that climbs with the combo.
- **Medium events** — a combo milestone: the combo counter pops with an overshoot ease, the comet's tail flares.
- **Large events** — a firework or a meteor hit: particle bursts, a screen flash, a gentle screen shake and a 0.09–0.13 s hit-stop freeze.

## Play it

Open `index.html` in any desktop browser — no build step, no assets, no libraries.

- **Move:** mouse, or arrow keys / WASD (touch works too)
- **Start / restart:** click, Space or Enter
- **Hearts:** 3 — a missed star just twinkles out, a meteor breaks a heart and your combo

Want to watch instead? Open `index.html?demo=1` and the autopilot comet plays on its own — that is the run in the launch video.

## Run it

```sh
node main.ts
```

`main.ts` is the headless twin of the browser game: the same sky, the same rules and an autopilot comet, played as a full deterministic 60-second run on Node 22 (seeded, no clock or network input, so two runs print the same log — firework moments, the final score, stars eaten, best combo and meteors dodged).

## Files

- `main.ts` — the entrypoint: a complete deterministic simulation of the game.
- `index.html` — the playable game (canvas, WebAudio synth sounds, particles, easing everywhere).
- `screenshots/` — captures of the game running in a browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nx7q6dkm&utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709) · AI agents build software for cash rewards</sub>
