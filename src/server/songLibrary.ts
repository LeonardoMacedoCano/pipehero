import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Song } from "../types.js";
import { parseIni } from "./parseIni.js";

const AUDIO_EXTENSIONS = [".opus", ".ogg", ".mp3", ".wav", ".flac", ".m4a"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const CHART_FILENAMES = ["notes.chart", "notes.mid"];

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findChartFile(songPath: string): Promise<string | null> {
  for (const filename of CHART_FILENAMES) {
    if (await pathExists(join(songPath, filename))) return filename;
  }
  return null;
}

async function findFirstFileByExtensions(songPath: string, extensions: string[]): Promise<string | null> {
  const entries = await readdir(songPath);
  return entries.find((file) => extensions.some((ext) => file.toLowerCase().endsWith(ext))) ?? null;
}

function toNumberOrNull(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const MS_PER_SECOND = 1000;

export async function listSongs(songsDir: string): Promise<Song[]> {
  let entries;
  try {
    entries = await readdir(songsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const songs: Song[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const songPath = join(songsDir, entry.name);
    const chartFilename = await findChartFile(songPath);
    if (!chartFilename) continue;

    let metadata: Record<string, string> = {};
    const iniPath = join(songPath, "song.ini");
    if (await pathExists(iniPath)) {
      const raw = await readFile(iniPath, "utf-8");
      metadata = parseIni(raw).song ?? {};
    }

    const audioFile = await findFirstFileByExtensions(songPath, AUDIO_EXTENSIONS);
    const coverFile = await findFirstFileByExtensions(songPath, IMAGE_EXTENSIONS);
    const previewStartMs = toNumberOrNull(metadata.preview_start_time);

    songs.push({
      id: entry.name,
      name: metadata.name ?? entry.name,
      artist: metadata.artist ?? "Unknown",
      album: metadata.album ?? "",
      year: metadata.year ?? "",
      charter: metadata.charter ?? "",
      genre: metadata.genre ?? "",
      loadingPhrase: metadata.loading_phrase ?? "",
      previewStartSeconds: previewStartMs !== null ? previewStartMs / MS_PER_SECOND : 0,
      difficultyRatings: {
        band: toNumberOrNull(metadata.diff_band),
        guitar: toNumberOrNull(metadata.diff_guitar),
        bass: toNumberOrNull(metadata.diff_bass),
        drums: toNumberOrNull(metadata.diff_drums),
        vocals: toNumberOrNull(metadata.diff_vocals),
      },
      chartUrl: `/songs/${entry.name}/${chartFilename}`,
      chartFormat: chartFilename.endsWith(".mid") ? "mid" : "chart",
      audioUrl: audioFile ? `/songs/${entry.name}/${audioFile}` : null,
      coverUrl: coverFile ? `/songs/${entry.name}/${coverFile}` : null,
    });
  }

  return songs.sort((a, b) => a.name.localeCompare(b.name));
}
