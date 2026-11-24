// Comet Feast v2 — entrypoint for the make.fun grader.
//
// The game itself lives in index.html (open it in a browser and play).
// This program has one job: hand the grader the entry's POST.json,
// which names the X post that carries the Comet Feast v2 video.
//
// Contract (how the grader runs it):
//   MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// It copies POST.json from the bot directory into the output directory,
// byte for byte, and prints nothing on success. No network, no clock,
// no randomness — two runs write the same bytes.

import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const botDir = process.env.MAKEFUN_BOT_DIR ?? ".";
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";

mkdirSync(outputDir, { recursive: true });
copyFileSync(join(botDir, "POST.json"), join(outputDir, "POST.json"));
