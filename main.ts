// Sky Courier — entry hand-in for best-flight-game-20261126-0057.
// Node 22, standard library only. The game is plain static files under
// game/ (index.html plus classic scripts, no build step, no network), and
// this program hands it in: it copies game/ and screenshots/ beside this
// file into /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, so the judge can
// read the game, its screenshots and its source outline.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it:  node serve.ts, then open the printed local address.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Only create directories; never delete anything (the grader mounts
// /output, and removing it would break the hand-in).
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Dossier caps from the competition's scorer: text is capped at 160 KiB,
// at most 4 screenshots of 256 KiB each, game/ at most 993 files and
// 48 MiB in all, no path under game/ longer than 1000 bytes.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log('dossier.json: ' + Buffer.byteLength(dossier, 'utf8') + ' bytes');
