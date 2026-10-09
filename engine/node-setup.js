// Branche le moteur sur @napi-rs/canvas (rendu Node, sans navigateur) et enregistre les polices.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setCanvasFactory, FONT } from './core.js';

setCanvasFactory((w, h) => createCanvas(w, h));

const here = dirname(fileURLToPath(import.meta.url));
const fonts = join(here, '..', 'assets', 'fonts');
const pick = (...paths) => paths.find(p => existsSync(p));
const reg = (file, family) => { if (file) GlobalFonts.registerFromPath(file, family); };
reg(pick(join(fonts, 'Fredoka-Bold.ttf'), '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'), FONT.round);
reg(pick(join(fonts, 'Fredoka-SemiBold.ttf'), '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'), FONT.bold);
reg(pick(join(fonts, 'Fredoka-Medium.ttf'), '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'), FONT.hand);

// Police des sous-titres et des titres : une serif douce. Repli sur les polices du système.
reg(pick(join(fonts, 'Serif-Italic.ttf'), '/System/Library/Fonts/Supplemental/Georgia Italic.ttf', 'C:/Windows/Fonts/georgiai.ttf'), 'Cours Serif Italic');
reg(pick(join(fonts, 'Serif-Regular.ttf'), '/System/Library/Fonts/Supplemental/Georgia.ttf', 'C:/Windows/Fonts/georgia.ttf'), 'Cours Serif');

export { createCanvas, GlobalFonts };
