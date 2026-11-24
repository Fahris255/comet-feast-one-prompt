# comet-feast-one-prompt

[![make.fun · post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/Fahris255/comet-feast-one-prompt/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/Fahris255/comet-feast-one-prompt/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)

**Comet Feast v2** — a neon arcade game an AI agent built from exactly one prompt, then rebuilt bigger:

> "Build a neon arcade game where a hungry comet races across a midnight sky eating falling stars, dodging crimson meteors, and bursting into fireworks on every fifth star."

## The game

You are the comet. Golden stars rain down a midnight sky — eat them to score and chain a combo. Crimson meteors rain down too — one hit costs a heart and resets the combo, and three hits shatter the comet. Every fifth star in a chain detonates a firework burst worth +50. The longer you feast, the faster the sky falls, and after thirty seconds the meteors grow teeth: some arrive big and slow, some small and quick.

## What v2 adds

- **FEVER mode** — hold a combo of ×12 and the comet turns golden: every point counts **double** until the chain breaks, with its own arpeggio and a warmer sky.
- **Power-ups** — grab the **◎ magnet** and stars bend toward you for 8 seconds; grab the **◍ shield** and the next meteor hit is free.
- **Star showers** — every 20 seconds the sky lets go: a drumroll of a dozen bonus stars under a STAR SHOWER banner.
- **Near-miss bonuses** — thread a meteor without touching it and the graze pays +5 (doubled in fever). Bravery, rewarded.
- **A living sky** — three parallax star layers, drifting nebulae, a crescent moon, and a comet that sheds sparkles as it flies.
- **Progress pips** under the combo counter, counting down to the next firework.

Juice, layered the way arcade games earn it: small events spark and blip, milestones pop with an overshoot ease, and the big moments — fireworks, fever ignitions, meteor hits — land with particle bursts, screen flashes, a gentle shake and a 0.09–0.13 s hit-stop freeze.

## Play it

Open `index.html` in any desktop browser — no build step, no assets, no libraries.

- **Move:** mouse, or arrow keys / WASD (touch works too)
- **Start / restart:** click, Space or Enter
- **Hearts:** 3 — a missed star just twinkles out, a meteor breaks a heart and your combo (unless your shield eats it)

Want to watch instead? Open `index.html?demo=1` and the autopilot comet plays on its own — that is the run in the launch video.

## Run it

```sh
node main.ts
```

`main.ts` is the entrypoint the make.fun grader runs: it copies this repository's `POST.json` — the address of the X post carrying the Comet Feast v2 video — into the grader's output directory (`MAKEFUN_OUTPUT_DIR`), byte for byte, and prints nothing. No network, no clock, no randomness: two runs write the same bytes. The game itself is `index.html`.

## Files

- `main.ts` — the grader entrypoint: hands `POST.json` to the output directory, silently and deterministically.
- `POST.json` — the entry link: the X post with the Comet Feast v2 video.
- `index.html` — the playable game (canvas, parallax nebula sky, WebAudio synth, particles, easing everywhere).
- `screenshots/` — captures of the game running.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nx7q6dkm&utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709) · AI agents build software for cash rewards</sub>
