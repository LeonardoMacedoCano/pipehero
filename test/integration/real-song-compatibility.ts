import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseChart } from "../../node_modules/parsehero/dist/index.js";
import { loadTrack } from "../../src/engine/chartTrack.js";
import { listAvailableDifficulties } from "../../src/engine/availableTracks.js";
import { extractStarPowerPhrases } from "../../src/engine/starPower.js";
import { extractLyricEvents, groupIntoPhrases } from "../../src/lyrics/lyricsTimeline.js";
import { parseIni } from "../../src/server/parseIni.js";

const UPLOAD_DIR = process.argv[2];
if (!UPLOAD_DIR) {
  console.log("test/integration/real-song-compatibility.ts: skipped (needs a real folder as argument).");
  console.log("Usage: tsx test/integration/real-song-compatibility.ts <folder-with-a-real-song's-files>");
  process.exit(0);
}

const filesInDir = readdirSync(UPLOAD_DIR);
function resolveUploadPath(suffix: string): string {
  const match = filesInDir.find((f) => f.toLowerCase().endsWith(suffix.toLowerCase()));
  if (!match) throw new Error(`Couldn't find any file ending in "${suffix}" in ${UPLOAD_DIR}`);
  return join(UPLOAD_DIR, match);
}

const checks: { name: string; ok: boolean; extra: string }[] = [];
function check(name: string, ok: boolean, extra = ""): void {
  checks.push({ name, ok, extra });
}

const iniRaw = readFileSync(resolveUploadPath("song.ini"), "utf-8");
const ini = parseIni(iniRaw).song ?? {};
check("song.ini: name/artist/album/genre present", !!(ini.name && ini.artist && ini.album && ini.genre));
check("song.ini: charter has multiple names (comma)", (ini.charter ?? "").includes(","));
check("song.ini: diff_guitar is numeric", Number.isFinite(Number(ini.diff_guitar)));
check("song.ini: preview_start_time is numeric", Number.isFinite(Number(ini.preview_start_time)));
console.log(`song.ini: name="${ini.name}" (${Object.keys(ini).length} fields read)`);

const chartRaw = readFileSync(resolveUploadPath("guitar.bak"), "utf-8");
const { chart: chartFromText, warnings: chartWarnings } = parseChart(chartRaw);
check("guitar.bak (.chart): parses without warnings", chartWarnings.length === 0, `${chartWarnings.length} warnings`);

const chartDifficulties = listAvailableDifficulties(chartFromText);
check("guitar.bak: detects multiple difficulties", chartDifficulties.length >= 2, chartDifficulties.join(", "));

const expertNotesFromChart = chartDifficulties.includes("Expert") ? loadTrack(chartFromText, "ExpertSingle") : [];
check("guitar.bak: ExpertSingle loads notes", expertNotesFromChart.length > 0, `${expertNotesFromChart.length} notes`);
check(
  "guitar.bak: has chords",
  expertNotesFromChart.some((n) => n.isChord)
);
check(
  "guitar.bak: has sustains (duration > 0)",
  expertNotesFromChart.some((n) => n.duration > 0),
  `${expertNotesFromChart.filter((n) => n.duration > 0).length} sustains`
);

const starPowerPhrasesFromChart = chartDifficulties.includes("Expert")
  ? extractStarPowerPhrases(chartFromText.ExpertSingle, chartFromText.Song.resolution, chartFromText.SyncTrack.bpms)
  : [];
check("guitar.bak: detects Star Power phrases", starPowerPhrasesFromChart.length > 0, `${starPowerPhrasesFromChart.length} phrases`);

const lyricEventsFromChart = extractLyricEvents(chartFromText.Events);
check("guitar.bak: detects lyric events embedded in the chart", lyricEventsFromChart.length > 0, `${lyricEventsFromChart.length} events (content not displayed)`);
const lyricPhrasesFromChart = groupIntoPhrases(chartFromText.Events);
check("guitar.bak: groups lyrics into full phrases", lyricPhrasesFromChart.length > 0, `${lyricPhrasesFromChart.length} phrases`);

const midBuffer = readFileSync(resolveUploadPath("notes.mid"));
const { chart: chartFromMid, warnings: midWarnings } = parseChart(
  midBuffer.buffer.slice(midBuffer.byteOffset, midBuffer.byteOffset + midBuffer.byteLength)
);
const benignWarningPattern = /ignored\.$|^Unsupported chart section/;
const concerningWarnings = midWarnings.filter((w) => !benignWarningPattern.test(w));
check(
  "notes.mid: no concerning warnings (ignoring drums/vocals is expected)",
  concerningWarnings.length === 0,
  midWarnings.length ? `${midWarnings.length} warnings, all expected (unsupported tracks)` : "0 warnings"
);

const midDifficulties = listAvailableDifficulties(chartFromMid);
check("notes.mid: also detects multiple difficulties", midDifficulties.length >= 2, midDifficulties.join(", "));

if (midDifficulties.includes("Expert")) {
  const expertNotesFromMid = loadTrack(chartFromMid, "ExpertSingle");
  check(
    "cross-check: .chart and .mid agree on the Expert note count (same song, different formats)",
    Math.abs(expertNotesFromMid.length - expertNotesFromChart.length) <= 2,
    `.chart=${expertNotesFromChart.length} notes, .mid=${expertNotesFromMid.length} notes`
  );
}

const opusStats = statSync(resolveUploadPath("song.opus"));
check("song.opus: file exists and has a plausible audio size", opusStats.size > 100_000, `${(opusStats.size / 1024).toFixed(0)}KB`);

console.log("\n=== Checks (real files, straight from upload) ===");
let allOk = true;
for (const c of checks) {
  console.log(`${c.ok ? "✔" : "✘"} ${c.name}${c.extra ? ` — ${c.extra}` : ""}`);
  if (!c.ok) allOk = false;
}

console.log(`\nPhase 8 validation (real song): ${allOk ? "OK ✔" : "FAILED ✘"}`);
console.log("\nNo lyrics were printed or copied — event counting only.");
process.exit(allOk ? 0 : 1);
