// Comet Feast v2 — a neon arcade game built from one prompt, then rebuilt
// bigger: fever mode, magnet and shield power-ups, star showers and
// near-miss bonuses join the feast.
//
// The prompt: "Build a neon arcade game where a hungry comet races across a
// midnight sky eating falling stars, dodging crimson meteors, and bursting
// into fireworks on every fifth star."
//
// This file is the entrypoint the grader runs (Node 22, program/v1). It plays
// a full deterministic game headlessly: an autopilot comet chases falling
// stars, threads between crimson meteors for near-miss bonuses, grabs
// magnet and shield power-ups, rides out periodic star showers, and — once
// its combo passes twelve — burns golden in FEVER mode where every point
// counts double. The same rules power the playable browser version in
// index.html; open that file in a browser to play with mouse or keys.
//
// Deterministic by construction: a seeded generator, a fixed tick rate, and
// no clock, network or file input, so two runs print the identical log.

// ---------------------------------------------------------------------------
// Seeded random generator (mulberry32).
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
// Tuning — every number that shapes the feast.
// ---------------------------------------------------------------------------
const WORLD_W = 960;
const WORLD_H = 540;
const TICKS_PER_SECOND = 60;
const GAME_TICKS = 60 * TICKS_PER_SECOND;
const COMET_RADIUS = 14;
const COMET_SPEED = 5.6;
const STAR_POINTS = 10;
const FIREWORK_EVERY = 5;
const FIREWORK_POINTS = 50;
const NEAR_MISS_POINTS = 5;
const NEAR_MISS_RANGE = 52;
const FEVER_COMBO = 12;
const MAGNET_TICKS = 8 * TICKS_PER_SECOND;
const MAGNET_RANGE = 270;
const SHOWER_EVERY_TICKS = 20 * TICKS_PER_SECOND;
const SHOWER_STARS = 12;
const START_LIVES = 3;

type Falling = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  radius: number;
  spin: number;
  big: boolean;
  grazed: boolean;
};

type PowerUp = {
  x: number;
  y: number;
  vy: number;
  kind: "magnet" | "shield";
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

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ---------------------------------------------------------------------------
// The simulation.
// ---------------------------------------------------------------------------
class CometFeastV2 {
  private rng = makeRng(20261124);
  private comet = { x: WORLD_W / 2, y: WORLD_H * 0.68, vx: 0, vy: 0 };
  private stars: Falling[] = [];
  private meteors: Falling[] = [];
  private powerups: PowerUp[] = [];
  private particles: Particle[] = [];
  private tick = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  starsEaten = 0;
  fireworks = 0;
  nearMisses = 0;
  showersRidden = 0;
  powerupsTaken = 0;
  feverTicks = 0;
  feverIgnitions = 0;
  lives = START_LIVES;
  private shieldUp = false;
  private magnetUntil = 0;
  private invulnerableUntil = 0;
  private starTimer = 0;
  private meteorTimer = 80;
  private powerTimer = 420;
  private showerAt = SHOWER_EVERY_TICKS;
  private showerLeft = 0;
  private showerSpawnTimer = 0;
  readonly log: string[] = [];

  private get fever(): boolean {
    return this.combo >= FEVER_COMBO;
  }
  private get magnetOn(): boolean {
    return this.tick < this.magnetUntil;
  }

  private spawnStar(x?: number): void {
    this.stars.push({
      x: x ?? 30 + this.rng() * (WORLD_W - 60),
      y: -20,
      vy: 1.6 + this.rng() * 1.6 + (this.tick / GAME_TICKS) * 0.9,
      vx: (this.rng() - 0.5) * 0.5,
      radius: 9 + this.rng() * 4,
      spin: this.rng() * Math.PI * 2,
      big: false,
      grazed: false,
    });
  }

  private spawnMeteor(): void {
    const big = this.tick > GAME_TICKS / 2 && this.rng() < 0.3;
    this.meteors.push({
      x: 30 + this.rng() * (WORLD_W - 60),
      y: -34,
      vy: big ? 2.2 + this.rng() * 1.1 : 3.1 + this.rng() * 2.1 + this.tick / GAME_TICKS,
      vx: (this.rng() - 0.5) * 1.1,
      radius: big ? 24 + this.rng() * 6 : 13 + this.rng() * 7,
      spin: this.rng() * Math.PI * 2,
      big,
      grazed: false,
    });
  }

  private spawnPowerup(): void {
    const kind = this.rng() < 0.5 ? "magnet" : "shield";
    this.powerups.push({
      x: 50 + this.rng() * (WORLD_W - 100),
      y: -24,
      vy: 1.35,
      kind,
      spin: this.rng() * Math.PI * 2,
    });
    this.log.push(`tick ${this.tick}: a ${kind} power-up drifts into the sky`);
  }

  private burst(x: number, y: number, count: number, hueBase: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.rng() * 0.35;
      const speed = 1.4 + this.rng() * 3.6;
      const life = 26 + Math.floor(this.rng() * 24);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        hue: hueBase + this.rng() * 50 - 25,
      });
    }
  }

  // Autopilot: ripest star first (or a power-up when close), bend away from
  // meteors, but not so far that a graze becomes a miss — near misses pay.
  private steer(): void {
    let targetX = WORLD_W / 2;
    let targetY = WORLD_H * 0.6;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const star of this.stars) {
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
    for (const p of this.powerups) {
      const d = Math.hypot(p.x - this.comet.x, p.y - this.comet.y);
      if (d < 300) {
        targetX = p.x;
        targetY = Math.min(WORLD_H - 40, p.y + p.vy * 14);
      }
    }
    let avoidX = 0;
    let avoidY = 0;
    for (const meteor of this.meteors) {
      const dx = this.comet.x - meteor.x;
      const dy = this.comet.y - meteor.y;
      const dist = Math.hypot(dx, dy);
      const danger = meteor.radius + 118;
      if (dist < danger && meteor.y < this.comet.y + 34) {
        const weight = (danger - dist) / danger;
        avoidX += (dx / (dist + 1)) * weight * 270;
        avoidY += (dy < 0 ? 1 : -0.4) * weight * 62;
      }
    }
    const wantX = targetX + avoidX;
    const wantY = targetY + avoidY;
    const dx = wantX - this.comet.x;
    const dy = wantY - this.comet.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ramp = easeInOutSine(Math.min(1, this.tick / 50));
    const step = Math.min(COMET_SPEED * (0.4 + 0.6 * ramp), dist);
    this.comet.vx = (dx / dist) * step;
    this.comet.vy = (dy / dist) * step;
    this.comet.x = Math.max(20, Math.min(WORLD_W - 20, this.comet.x + this.comet.vx));
    this.comet.y = Math.max(70, Math.min(WORLD_H - 24, this.comet.y + this.comet.vy));
  }

  private eatStar(star: Falling): void {
    this.starsEaten += 1;
    const wasFever = this.fever;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.fever ? 2 : 1;
    const gained = (STAR_POINTS + Math.min(40, this.combo * 2)) * mult;
    this.score += gained;
    this.burst(star.x, star.y, this.fever ? 12 : 8, this.fever ? 42 : 48);
    if (!wasFever && this.fever) {
      this.feverIgnitions += 1;
      this.log.push(
        `tick ${this.tick}: FEVER ignites at combo x${this.combo} — every point counts double`,
      );
      this.burst(this.comet.x, this.comet.y, 26, 40);
    }
    if (this.combo % FIREWORK_EVERY === 0) {
      this.fireworks += 1;
      const bonus = FIREWORK_POINTS * mult;
      this.score += bonus;
      this.burst(star.x, star.y, 32, 185 + (this.fireworks % 3) * 55);
      this.log.push(
        `tick ${this.tick}: FIREWORK #${this.fireworks} at combo x${this.combo} (+${bonus}) score=${this.score}`,
      );
    }
  }

  private takePowerup(p: PowerUp): void {
    this.powerupsTaken += 1;
    if (p.kind === "magnet") {
      this.magnetUntil = this.tick + MAGNET_TICKS;
      this.log.push(`tick ${this.tick}: MAGNET on — stars bend toward the comet for 8s`);
    } else {
      this.shieldUp = true;
      this.log.push(`tick ${this.tick}: SHIELD up — the next meteor hit is free`);
    }
    this.burst(p.x, p.y, 16, p.kind === "magnet" ? 190 : 215);
  }

  private hitMeteor(meteor: Falling): void {
    if (this.shieldUp) {
      this.shieldUp = false;
      this.invulnerableUntil = this.tick + 120;
      this.burst(meteor.x, meteor.y, 20, 215);
      this.log.push(`tick ${this.tick}: the shield eats a meteor — comet unharmed`);
      return;
    }
    this.lives -= 1;
    this.combo = 0;
    this.invulnerableUntil = this.tick + 150;
    this.burst(meteor.x, meteor.y, 24, 8);
    this.log.push(`tick ${this.tick}: meteor hit — lives left ${this.lives}, combo and fever reset`);
  }

  step(): boolean {
    this.tick += 1;

    // Star shower: a drumroll of stars every twenty seconds.
    if (this.tick >= this.showerAt && this.showerLeft === 0) {
      this.showerLeft = SHOWER_STARS;
      this.showerSpawnTimer = 0;
      this.showersRidden += 1;
      this.showerAt += SHOWER_EVERY_TICKS;
      this.log.push(`tick ${this.tick}: STAR SHOWER #${this.showersRidden} — the sky lets go`);
    }
    if (this.showerLeft > 0) {
      this.showerSpawnTimer -= 1;
      if (this.showerSpawnTimer <= 0) {
        this.spawnStar();
        this.showerLeft -= 1;
        this.showerSpawnTimer = 5;
      }
    }

    this.starTimer -= 1;
    if (this.starTimer <= 0) {
      this.spawnStar();
      this.starTimer = 22 + Math.floor(this.rng() * 20);
    }
    this.meteorTimer -= 1;
    if (this.meteorTimer <= 0) {
      this.spawnMeteor();
      const ramp = Math.max(44, 102 - Math.floor(this.tick / 60) * 4);
      this.meteorTimer = ramp + Math.floor(this.rng() * 28);
    }
    this.powerTimer -= 1;
    if (this.powerTimer <= 0) {
      this.spawnPowerup();
      this.powerTimer = 620 + Math.floor(this.rng() * 320);
    }

    this.steer();

    for (const star of this.stars) {
      if (this.magnetOn) {
        const dx = this.comet.x - star.x;
        const dy = this.comet.y - star.y;
        const d = Math.hypot(dx, dy);
        if (d < MAGNET_RANGE && d > 1) {
          star.x += (dx / d) * 2.6;
          star.y += (dy / d) * 2.6;
        }
      }
      star.x += star.vx;
      star.y += star.vy;
      star.spin += 0.05;
    }
    for (const meteor of this.meteors) {
      meteor.x += meteor.vx;
      meteor.y += meteor.vy;
      meteor.spin += 0.03;
    }
    for (const p of this.powerups) {
      p.y += p.vy;
      p.spin += 0.04;
    }
    for (const pt of this.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.045;
      pt.life -= 1;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.fever) this.feverTicks += 1;

    const eaten = this.stars.filter(
      (s) => Math.hypot(s.x - this.comet.x, s.y - this.comet.y) < COMET_RADIUS + s.radius + 4,
    );
    for (const star of eaten) this.eatStar(star);
    if (eaten.length > 0) {
      const eatenSet = new Set(eaten);
      this.stars = this.stars.filter((s) => !eatenSet.has(s));
    }
    this.stars = this.stars.filter((s) => s.y <= WORLD_H + 24);

    const grabbed = this.powerups.filter(
      (p) => Math.hypot(p.x - this.comet.x, p.y - this.comet.y) < COMET_RADIUS + 18,
    );
    for (const p of grabbed) this.takePowerup(p);
    if (grabbed.length > 0) {
      const grabbedSet = new Set(grabbed);
      this.powerups = this.powerups.filter((p) => !grabbedSet.has(p));
    }
    this.powerups = this.powerups.filter((p) => p.y <= WORLD_H + 30);

    // Near miss: a meteor that threads past the comet without touching it.
    for (const meteor of this.meteors) {
      const d = Math.hypot(meteor.x - this.comet.x, meteor.y - this.comet.y);
      if (!meteor.grazed && d < NEAR_MISS_RANGE + meteor.radius && meteor.y > this.comet.y) {
        meteor.grazed = true;
        this.nearMisses += 1;
        const gained = NEAR_MISS_POINTS * (this.fever ? 2 : 1);
        this.score += gained;
        this.burst(meteor.x, meteor.y - meteor.radius, 5, 200);
      }
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
    this.meteors = this.meteors.filter((m) => m.y <= WORLD_H + 40);
    return true;
  }

  play(): void {
    while (this.tick < GAME_TICKS) {
      if (!this.step()) break;
    }
    const survived = this.lives > 0;
    this.log.push(
      `game over: ${survived ? "the comet feasted for the full 60 seconds" : "the comet shattered"} after ${this.tick} ticks`,
    );
    this.log.push(
      `final: score=${this.score} stars=${this.starsEaten} fireworks=${this.fireworks} ` +
        `bestCombo=x${this.bestCombo} nearMisses=${this.nearMisses} showers=${this.showersRidden} ` +
        `powerups=${this.powerupsTaken} feverSeconds=${(this.feverTicks / TICKS_PER_SECOND).toFixed(1)} feverIgnitions=${this.feverIgnitions} lives=${this.lives}`,
    );
    const flourish = [0.25, 0.5, 0.75, 1].map((t) => easeOutBack(t).toFixed(3)).join(", ");
    this.log.push(`firework bloom curve (easeOutBack samples): ${flourish}`);
  }
}

// ---------------------------------------------------------------------------
// Entrypoint.
// ---------------------------------------------------------------------------
function main(): void {
  console.log("COMET FEAST v2 — built from one prompt, rebuilt bigger");
  console.log(
    'Prompt: "Build a neon arcade game where a hungry comet races across a ' +
      'midnight sky eating falling stars, dodging crimson meteors, and bursting ' +
      'into fireworks on every fifth star."',
  );
  console.log("New in v2: FEVER mode at combo x12 (double points), magnet + shield");
  console.log("power-ups, star showers every 20 seconds, and near-miss bonuses.");
  console.log("Playing a full deterministic 60-second run (autopilot comet)...");
  const game = new CometFeastV2();
  game.play();
  for (const line of game.log) console.log(line);
  if (game.score <= 0 || game.starsEaten <= 0 || game.fireworks <= 0) {
    console.error("The feast fell flat — the sky is broken.");
    process.exit(1);
  }
  console.log("Run complete. Open index.html and feast yourself.");
}

main();
