import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createCanvas } from "canvas";
import { parseChart } from "../../node_modules/parsehero/dist/index.js";
import { loadTrack } from "../../src/engine/chartTrack.js";
import { drawFrame } from "../../src/render/draw.js";
import { RENDER_CONFIG, LANE_COLORS, noteRenderKey } from "../../src/render/layout.js";

const OUT_DIR = "test/integration/screenshots";
mkdirSync(OUT_DIR, { recursive: true });

const raw = readFileSync("test/fixtures/synthetic-complex.chart", "utf-8");
const { chart } = parseChart(raw);
const notes = loadTrack(chart, "ExpertSingle");
console.log(`Chart: ${chart.Song.name} — ${chart.Song.artist} (${notes.length} notes)`);

const canvas = createCanvas(RENDER_CONFIG.canvasWidth, RENDER_CONFIG.canvasHeight);
const ctx = canvas.getContext("2d");

function save(filename: string): void {
  writeFileSync(`${OUT_DIR}/${filename}`, canvas.toBuffer("image/png"));
}

const firstNoteTime = notes[0].time;
const midNoteTime = notes[Math.floor(notes.length / 2)].time;
const sustainNote = notes.find((n) => n.duration > 0.3);

const checks: { name: string; ok: boolean }[] = [];

let visible = drawFrame(ctx, notes, 0);
save("01-start-no-notes.png");
checks.push({ name: `t=0 has no visible notes (chart only starts at ~${firstNoteTime.toFixed(1)}s)`, ok: visible.length === 0 });

visible = drawFrame(ctx, notes, firstNoteTime - 1.0);
save("02-note-approaching.png");
checks.push({ name: "1st note visible 1s before the hit", ok: visible.some((n) => n.id === notes[0].id) });

visible = drawFrame(ctx, notes, firstNoteTime);
save("03-first-note-at-pipe-mouth.png");
const firstOnLine = visible.find((n) => n.id === notes[0].id);
checks.push({
  name: "1st note exactly on the hit line (y === hitLineY)",
  ok: !!firstOnLine && Math.abs(firstOnLine.y - RENDER_CONFIG.hitLineY) < 0.01,
});

if (!firstOnLine) {
  console.error("Failure: 1st note not found on the hit line — aborting pixel check.");
  process.exit(1);
}

const expectedHex = LANE_COLORS[notes[0].fret];
const expectedRgb = [
  parseInt(expectedHex.slice(1, 3), 16),
  parseInt(expectedHex.slice(3, 5), 16),
  parseInt(expectedHex.slice(5, 7), 16),
];
const candidateOffsets = [
  { dx: 0, dy: 0.85 },
  { dx: 0.55, dy: 0.55 },
  { dx: -0.55, dy: 0.55 },
  { dx: 0.75, dy: 0.15 },
  { dx: -0.75, dy: 0.15 },
];
let pixelMatches = false;
let lastSampled: Uint8ClampedArray | null = null;
for (const { dx, dy } of candidateOffsets) {
  const sampleX = Math.round(firstOnLine.x + dx * firstOnLine.radius);
  const sampleY = Math.round(firstOnLine.y + dy * firstOnLine.radius);
  const sampled = ctx.getImageData(sampleX, sampleY, 1, 1).data;
  lastSampled = sampled;
  if (
    Math.abs(sampled[0] - expectedRgb[0]) < 40 &&
    Math.abs(sampled[1] - expectedRgb[1]) < 40 &&
    Math.abs(sampled[2] - expectedRgb[2]) < 40
  ) {
    pixelMatches = true;
    break;
  }
}
checks.push({
  name: `some point near the edge of the 1st drop has the right lane color (expected ~${expectedHex}, last sample rgb(${lastSampled?.[0]},${lastSampled?.[1]},${lastSampled?.[2]}))`,
  ok: pixelMatches,
});

visible = drawFrame(ctx, notes, midNoteTime);
save("04-mid-song.png");
checks.push({ name: "middle of the song has visible notes", ok: visible.length > 0 });

const outOfBounds = visible.filter(
  (n) => n.y < -50 || n.y > RENDER_CONFIG.canvasHeight + 50 || n.x < 0 || n.x > RENDER_CONFIG.canvasWidth
);
checks.push({ name: "no note drawn outside the canvas bounds", ok: outOfBounds.length === 0 });

if (sustainNote) {
  visible = drawFrame(ctx, notes, sustainNote.time);
  save("05-sustain-drop-line.png");
  const rendered = visible.find((n) => n.id === sustainNote.id);
  checks.push({ name: "sustain renders as a drop line (sustainDrops not empty)", ok: !!rendered && rendered.sustainDrops.length > 0 });
} else {
  checks.push({ name: "sustain renders as a drop line (sustainDrops not empty)", ok: false });
}

const judgedHits = new Map([[noteRenderKey(notes[0].fret, notes[0].time), firstNoteTime - 0.05]]);
let drawSucceeded = true;
try {
  drawFrame(ctx, notes, firstNoteTime, RENDER_CONFIG, judgedHits);
  save("06-drop-entering-pipe.png");
} catch (err) {
  drawSucceeded = false;
  console.error("Failure drawing the absorb animation:", err);
}
checks.push({ name: "drop-entering-pipe animation draws without throwing", ok: drawSucceeded });

console.log("\n=== Checks ===");
let allOk = true;
for (const c of checks) {
  console.log(`${c.ok ? "✔" : "✘"} ${c.name}`);
  if (!c.ok) allOk = false;
}

console.log(`\nPNGs saved in ${OUT_DIR}/ for visual inspection.`);
console.log(`\nRender validation (perspective track, pipes, drops): ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);
