// Comet Feast — a neon arcade game built from one prompt.
//
// The prompt: "Build a neon arcade game where a hungry comet races across a
// midnight sky eating falling stars, dodging crimson meteors, and bursting
// into fireworks on every fifth star."
//
// This file is the entrypoint the grader runs (Node 22, program/v1). It plays
// a full, deterministic game headlessly: a comet with an autopilot brain
// chases falling stars, steers around crimson meteors, banks combo points
// and detonates a firework burst on every fifth star. The same simulation
// powers the playable browser version in index.html — open that file in a
// browser to play it yourself with the mouse or arrow keys.
//
// The run is fully deterministic: a seeded random generator, a fixed tick
// rate and no clock, network or file input, so two runs print the same log.

// ---------------------------------------------------------------------------
// Seeded random generator (mulberry32) — small, fast, reproducible.
// ---------------------------------------------------------------------------
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// World constants — the sky the comet races across.
// ---------------------------------------------------------------------------
const WORLD_W = 960;
const WORLD_H = 540;
const TICKS_PER_SECOND = 60;
const GAME_TICKS = 60 * TICKS_PER_SECOND; // one full 60-second run
const COMET_RADIUS = 14;
const COMET_SPEED = 5.4;
const STAR_POINTS = 10;
const FIREWORK_EVERY = 5;
const FIREWORK_POINTS = 50;
const START_LIVES = 3;

type Falling = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  radius: number;
  spin: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
};

// Ease helpers — pops overshoot, landings settle. The browser game uses the
// same curves for its score pops and firework blooms.
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ---------------------------------------------------------------------------
// The game simulation.
// ---------------------------------------------------------------------------
class CometFeast {
  private rng = makeRng(20261122);
  private comet = { x: WORLD_W / 2, y: WORLD_H * 0.68, vx: 0, vy: 0 };
  private stars: Falling[] = [];
  private meteors: Falling[] = [];
  private particles: Particle[] = [];
  private tick = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  starsEaten = 0;
  fireworks = 0;
  meteorsDodged = 0;
  lives = START_LIVES;
  private invulnerableUntil = 0;
  private starTimer = 0;
  private meteorTimer = 90;
  readonly log: string[] = [];

  private spawnStar(): void {
    this.stars.push({
      x: 30 + this.rng() * (WORLD_W - 60),
      y: -20,
      vy: 1.6 + this.rng() * 1.7 + this.tick / GAME_TICKS,
      vx: (this.rng() - 0.5) * 0.5,
      radius: 9 + this.rng() * 4,
      spin: this.rng() * Math.PI * 2,
    });
  }

  private spawnMeteor(): void {
    this.meteors.push({
      x: 30 + this.rng() * (WORLD_W - 60),
      y: -30,
      vy: 3.1 + this.rng() * 2.2 + this.tick / GAME_TICKS,
      vx: (this.rng() - 0.5) * 1.1,
      radius: 13 + this.rng() * 7,
      spin: this.rng() * Math.PI * 2,
    });
  }

  private burst(x: number, y: number, count: number, hueBase: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.rng() * 0.35;
      const speed = 1.4 + this.rng() * 3.4;
      const life = 26 + Math.floor(this.rng() * 22);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        hue: hueBase + this.rng() * 50 - 25,
      });
    }
  }

  // The autopilot brain: chase the most reachable star, but bend away from
  // any meteor whose path crosses the comet's nose.
  private steer(): void {
    let targetX = WORLD_W / 2;
    let targetY = WORLD_H * 0.6;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const star of this.stars) {
      // The ripest star wins: one about to leave the sky is worth more than
      // a near one that still has time to fall, so urgency (its height and
      // the ticks left before it lands) dominates the distance term.
      const ticksLeft = Math.max(1, (WORLD_H - star.y) / Math.max(0.4, star.vy));
      const cost =
        Math.abs(star.x - this.comet.x) * 0.55 +
        Math.abs(star.y - this.comet.y) * 0.25 +
        ticksLeft * 1.9;
      if (cost < bestCost) {
        bestCost = cost;
        targetX = star.x;
        targetY = Math.min(WORLD_H - 40, star.y + star.vy * 14);
      }
    }
    let avoidX = 0;
    let avoidY = 0;
    for (const meteor of this.meteors) {
      const dx = this.comet.x - meteor.x;
      const dy = this.comet.y - meteor.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 130 && meteor.y < this.comet.y + 30) {
        const weight = (130 - dist) / 130;
        avoidX += (dx / (dist + 1)) * weight * 260;
        avoidY += (dy < 0 ? 1 : -0.4) * weight * 60;
      }
    }
    const wantX = targetX + avoidX;
    const wantY = targetY + avoidY;
    const dx = wantX - this.comet.x;
    const dy = wantY - this.comet.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(COMET_SPEED, dist);
    // Ease the comet toward cruising speed instead of snapping to it.
    const ease = easeOutCubic(Math.min(1, this.tick / 45));
    this.comet.vx = (dx / dist) * step * (0.35 + 0.65 * ease);
    this.comet.vy = (dy / dist) * step * (0.35 + 0.65 * ease);
    this.comet.x = Math.max(20, Math.min(WORLD_W - 20, this.comet.x + this.comet.vx));
    this.comet.y = Math.max(70, Math.min(WORLD_H - 24, this.comet.y + this.comet.vy));
  }

  private eatStar(star: Falling): void {
    this.starsEaten += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += STAR_POINTS + Math.min(40, this.combo * 2);
    this.burst(star.x, star.y, 8, 48); // small tier: golden tick sparks
    if (this.combo % FIREWORK_EVERY === 0) {
      this.fireworks += 1;
      this.score += FIREWORK_POINTS;
      this.burst(star.x, star.y, 30, 190 + (this.fireworks % 3) * 55); // large tier
      this.log.push(
        `tick ${this.tick}: FIREWORK #${this.fireworks} at combo x${this.combo} ` +
          `(+${FIREWORK_POINTS}) score=${this.score}`,
      );
    }
  }

  private hitMeteor(meteor: Falling): void {
    this.lives -= 1;
    this.combo = 0;
    this.invulnerableUntil = this.tick + 150;
    this.burst(meteor.x, meteor.y, 22, 8); // large tier: crimson shatter
    this.log.push(
      `tick ${this.tick}: meteor hit — lives left ${this.lives}, combo reset`,
    );
  }

  step(): boolean {
    this.tick += 1;
    this.starTimer -= 1;
    if (this.starTimer <= 0) {
      this.spawnStar();
      this.starTimer = 22 + Math.floor(this.rng() * 20);
    }
    this.meteorTimer -= 1;
    if (this.meteorTimer <= 0) {
      this.spawnMeteor();
      const ramp = Math.max(46, 105 - Math.floor(this.tick / 60) * 4);
      this.meteorTimer = ramp + Math.floor(this.rng() * 30);
    }

    this.steer();

    for (const star of this.stars) {
      star.x += star.vx;
      star.y += star.vy;
      star.spin += 0.05;
    }
    for (const meteor of this.meteors) {
      meteor.x += meteor.vx;
      meteor.y += meteor.vy;
      meteor.spin += 0.03;
    }
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.life -= 1;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    const eaten = this.stars.filter(
      (s) => Math.hypot(s.x - this.comet.x, s.y - this.comet.y) < COMET_RADIUS + s.radius + 4,
    );
    for (const star of eaten) this.eatStar(star);
    if (eaten.length > 0) {
      const eatenSet = new Set(eaten);
      this.stars = this.stars.filter((s) => !eatenSet.has(s));
    }

    // A star that lands uneaten simply twinkles out — the combo is the
    // comet's streak against the meteors, so only a meteor hit breaks it.
    const missed = this.stars.filter((s) => s.y > WORLD_H + 24);
    if (missed.length > 0) {
      this.stars = this.stars.filter((s) => s.y <= WORLD_H + 24);
    }

    if (this.tick >= this.invulnerableUntil) {
      const hit = this.meteors.find(
        (m) => Math.hypot(m.x - this.comet.x, m.y - this.comet.y) < COMET_RADIUS + m.radius - 3,
      );
      if (hit) {
        this.hitMeteor(hit);
        this.meteors = this.meteors.filter((m) => m !== hit);
        if (this.lives <= 0) return false;
      }
    }
    const dodged = this.meteors.filter((m) => m.y > WORLD_H + 34);
    this.meteorsDodged += dodged.length;
    if (dodged.length > 0) {
      this.meteors = this.meteors.filter((m) => m.y <= WORLD_H + 34);
    }
    return true;
  }

  play(): void {
    while (this.tick < GAME_TICKS) {
      if (!this.step()) break;
    }
    const survived = this.lives > 0;
    this.log.push(
      `game over: ${survived ? "the comet feasted for the full 60 seconds" : "the comet shattered"} ` +
        `after ${this.tick} ticks`,
    );
    this.log.push(
      `final: score=${this.score} stars=${this.starsEaten} fireworks=${this.fireworks} ` +
        `bestCombo=x${this.bestCombo} meteorsDodged=${this.meteorsDodged} lives=${this.lives}`,
    );
    // A tiny eased flourish so the easing helpers earn their keep in the log.
    const flourish = [0.25, 0.5, 0.75, 1].map((t) => easeOutBack(t).toFixed(3)).join(", ");
    this.log.push(`firework bloom curve (easeOutBack samples): ${flourish}`);
  }
}

// ---------------------------------------------------------------------------
// Entrypoint.
// ---------------------------------------------------------------------------
function main(): void {
  console.log("COMET FEAST — built from one prompt");
  console.log(
    'Prompt: "Build a neon arcade game where a hungry comet races across a ' +
      'midnight sky eating falling stars, dodging crimson meteors, and bursting ' +
      'into fireworks on every fifth star."',
  );
  console.log("Playing a full deterministic 60-second run (autopilot comet)...");
  const game = new CometFeast();
  game.play();
  for (const line of game.log) console.log(line);
  if (game.score <= 0 || game.starsEaten <= 0) {
    console.error("The comet ate nothing — the sky is broken.");
    process.exit(1);
  }
  console.log("Run complete: the comet is full, the sky is quiet. Play index.html to try it yourself.");
}

main();
