import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listSongs } from "./songLibrary.js";

function makeSongsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "pipehero-songs-test-"));

  const songA = join(dir, "song-a");
  mkdirSync(songA);
  writeFileSync(join(songA, "notes.chart"), "[Song]\n{\n}\n");
  writeFileSync(
    join(songA, "song.ini"),
    [
      "[song]",
      "name = Song A",
      "artist = John Doe",
      "album = Test Album",
      "year = 1999",
      "genre = Metal",
      "charter = John Doe, Jane Doe",
      "diff_guitar = 4",
      "diff_band = 3",
      "preview_start_time = 45000",
      "loading_phrase = Test hint",
      "",
    ].join("\n")
  );
  writeFileSync(join(songA, "song.ogg"), "");
  writeFileSync(join(songA, "album.jpg"), "");

  const songB = join(dir, "song-without-ini");
  mkdirSync(songB);
  writeFileSync(join(songB, "notes.chart"), "[Song]\n{\n}\n");
  writeFileSync(join(songB, "audio.mp3"), "");

  const notASong = join(dir, "folder-without-chart");
  mkdirSync(notASong);
  writeFileSync(join(notASong, "read-me.txt"), "not a song");

  const songMid = join(dir, "song-mid");
  mkdirSync(songMid);
  writeFileSync(join(songMid, "notes.mid"), "");
  writeFileSync(join(songMid, "song.ini"), "[song]\nname = MIDI Song\nartist = Jane Doe\n");
  writeFileSync(join(songMid, "song.opus"), "");

  const songWithStems = join(dir, "song-with-stems");
  mkdirSync(songWithStems);
  writeFileSync(join(songWithStems, "notes.chart"), "[Song]\n{\n}\n");
  writeFileSync(join(songWithStems, "vocals.ogg"), "");
  writeFileSync(join(songWithStems, "bass.ogg"), "");
  writeFileSync(join(songWithStems, "drums_1.ogg"), "");
  writeFileSync(join(songWithStems, "drums_2.ogg"), "");
  writeFileSync(join(songWithStems, "drums_3.ogg"), "");
  writeFileSync(join(songWithStems, "guitar.ogg"), "");

  const songWithPreview = join(dir, "song-with-preview");
  mkdirSync(songWithPreview);
  writeFileSync(join(songWithPreview, "notes.chart"), "[Song]\n{\n}\n");
  writeFileSync(join(songWithPreview, "guitar.ogg"), "");
  writeFileSync(join(songWithPreview, "preview.ogg"), "");

  const songWithDifficulties = join(dir, "song-with-difficulties");
  mkdirSync(songWithDifficulties);
  writeFileSync(
    join(songWithDifficulties, "notes.chart"),
    [
      "[Song]",
      "{",
      "  Resolution = 192",
      "}",
      "[SyncTrack]",
      "{",
      "  0 = TS 4",
      "  0 = B 120000",
      "}",
      "[ExpertSingle]",
      "{",
      "  0 = N 0 0",
      "  192 = N 1 0",
      "}",
      "[MediumSingle]",
      "{",
      "  0 = N 0 0",
      "}",
      "",
    ].join("\n")
  );

  return dir;
}

test("lists folders that have notes.chart OR notes.mid", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    assert.equal(songs.length, 6);
    assert.ok(!songs.some((s) => s.id === "folder-without-chart"));
    assert.ok(songs.some((s) => s.id === "song-mid"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reads basic metadata from song.ini when it exists", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    assert.equal(songA.name, "Song A");
    assert.equal(songA.artist, "John Doe");
    assert.equal(songA.genre, "Metal");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reads extended metadata from song.ini: album, year, charter, preview, loading phrase", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    assert.equal(songA.album, "Test Album");
    assert.equal(songA.year, "1999");
    assert.equal(songA.charter, "John Doe, Jane Doe");
    assert.equal(songA.previewStartSeconds, 45);
    assert.equal(songA.loadingPhrase, "Test hint");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reads the difficulty ratings (diff_*) from song.ini, null when absent", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    assert.equal(songA.difficultyRatings.guitar, 4);
    assert.equal(songA.difficultyRatings.band, 3);
    assert.equal(songA.difficultyRatings.drums, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without song.ini, uses the folder name and 'Unknown' as the artist", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songB = songs.find((s) => s.id === "song-without-ini")!;
    assert.equal(songB.name, "song-without-ini");
    assert.equal(songB.artist, "Unknown");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detects the audio file in several formats (ogg, mp3, opus) and builds the right URL", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    const songB = songs.find((s) => s.id === "song-without-ini")!;
    const songMid = songs.find((s) => s.id === "song-mid")!;
    assert.deepEqual(songA.audioUrls, ["/songs/song-a/song.ogg"]);
    assert.deepEqual(songB.audioUrls, ["/songs/song-without-ini/audio.mp3"]);
    assert.deepEqual(songMid.audioUrls, ["/songs/song-mid/song.opus"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("collects every audio stem of a multitrack song (vocals, bass, drums, guitar) instead of picking just one", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songWithStems = songs.find((s) => s.id === "song-with-stems")!;
    assert.deepEqual(songWithStems.audioUrls, [
      "/songs/song-with-stems/bass.ogg",
      "/songs/song-with-stems/drums_1.ogg",
      "/songs/song-with-stems/drums_2.ogg",
      "/songs/song-with-stems/drums_3.ogg",
      "/songs/song-with-stems/guitar.ogg",
      "/songs/song-with-stems/vocals.ogg",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("excludes preview.* from the stems, since it's just a short preview clip, not part of the full mix", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songWithPreview = songs.find((s) => s.id === "song-with-preview")!;
    assert.deepEqual(songWithPreview.audioUrls, ["/songs/song-with-preview/guitar.ogg"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detects the album cover when it exists, null when it doesn't", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    const songB = songs.find((s) => s.id === "song-without-ini")!;
    assert.equal(songA.coverUrl, "/songs/song-a/album.jpg");
    assert.equal(songB.coverUrl, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("chartUrl and chartFormat: notes.chart becomes 'chart', notes.mid becomes 'mid'", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    const songMid = songs.find((s) => s.id === "song-mid")!;
    assert.equal(songA.chartUrl, "/songs/song-a/notes.chart");
    assert.equal(songA.chartFormat, "chart");
    assert.equal(songMid.chartUrl, "/songs/song-mid/notes.mid");
    assert.equal(songMid.chartFormat, "mid");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a folder that doesn't exist returns an empty list, not an error", async () => {
  const songs = await listSongs("/path/that/does/not/really/exist");
  assert.deepEqual(songs, []);
});

test("availableDifficulties lists only the difficulties with note tracks in the chart", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songWithDifficulties = songs.find((s) => s.id === "song-with-difficulties")!;
    assert.deepEqual(songWithDifficulties.availableDifficulties, ["Expert", "Medium"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("availableDifficulties is empty for a chart with no note tracks, not an error", async () => {
  const dir = makeSongsDir();
  try {
    const songs = await listSongs(dir);
    const songA = songs.find((s) => s.id === "song-a")!;
    const songMid = songs.find((s) => s.id === "song-mid")!;
    assert.deepEqual(songA.availableDifficulties, []);
    assert.deepEqual(songMid.availableDifficulties, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
