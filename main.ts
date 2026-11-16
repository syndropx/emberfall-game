// Emberfall — hand-in program for make.fun's best-game-01 (Node 22, standard library only).
//
// The game itself is the static site under game/: a golden-hour wave-defense FPS that a
// desktop browser runs offline from game/index.html. This program copies game/ and
// screenshots/ into the output directory and writes dossier.json with the kit's vendored
// library, byte for byte the way the scorer rebuilds it. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own limits, passed through so the dossier this writes is exactly the one the
// scorer accepts: at most 4 screenshots of 256 KiB, at most 993 files and 48 MiB under
// game/, no game path over 1,000 bytes, dossier text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
