import test from "node:test";
import assert from "node:assert/strict";
import type { SimpleEvent, Timed } from "parsehero";
import { extractLyricEvents, assembleLine, groupIntoPhrases, currentPhrase } from "./lyricsTimeline.js";

function fakeChartEvents(): Timed<SimpleEvent>[] {
  return [
    { type: "event", value: "section intro", tick: 0, assignedTime: 0 },
    { type: "event", value: "phrase_start", tick: 100, assignedTime: 1.0 },
    { type: "event", value: "lyric La-", tick: 100, assignedTime: 1.0 },
    { type: "event", value: "lyric la", tick: 150, assignedTime: 1.2 },
    { type: "event", value: "lyric #zim", tick: 200, assignedTime: 1.4 },
    { type: "event", value: "phrase_end", tick: 250, assignedTime: 1.6 },
    { type: "event", value: "phrase_start", tick: 300, assignedTime: 2.0 },
    { type: "event", value: "lyric Blup", tick: 300, assignedTime: 2.0 },
    { type: "event", value: "phrase_end", tick: 350, assignedTime: 2.3 },
  ];
}

test("extractLyricEvents picks only 'lyric X' events, with time already computed", () => {
  const events = extractLyricEvents(fakeChartEvents());
  assert.equal(events.length, 4);
  assert.equal(events[0].raw, "La-");
  assert.equal(events[0].time, 1.0);
});

test("extractLyricEvents returns an empty list if there are no Events", () => {
  assert.deepEqual(extractLyricEvents(undefined), []);
  assert.deepEqual(extractLyricEvents([]), []);
});

test("assembleLine joins a syllable ending in '-' with no space to the next one", () => {
  assert.equal(assembleLine(["La-", "la"]), "Lala");
});

test("assembleLine removes the '#' and doesn't add a space before that syllable", () => {
  assert.equal(assembleLine(["La-", "la", "#zim"]), "Lalazim");
});

test("assembleLine adds a space between normal syllables (no '-' or '#')", () => {
  assert.equal(assembleLine(["Blup", "blop"]), "Blup blop");
});

test("assembleLine with an empty list returns an empty string", () => {
  assert.equal(assembleLine([]), "");
});

test("groupIntoPhrases groups syllables between phrase_start/phrase_end into phrases", () => {
  const phrases = groupIntoPhrases(fakeChartEvents());
  assert.equal(phrases.length, 2);
  assert.equal(phrases[0].text, "Lalazim");
  assert.equal(phrases[0].startTime, 1.0);
  assert.equal(phrases[0].endTime, 1.6);
  assert.equal(phrases[1].text, "Blup");
});

test("currentPhrase finds the active phrase at a moment within the interval", () => {
  const phrases = groupIntoPhrases(fakeChartEvents());
  const active = currentPhrase(phrases, 1.3);
  assert.equal(active?.text, "Lalazim");
});

test("currentPhrase returns null when there's no active phrase (and the margin has passed)", () => {
  const phrases = groupIntoPhrases(fakeChartEvents());
  assert.equal(currentPhrase(phrases, 1.9, 0.1), null);
});

test("currentPhrase holds the phrase for a bit extra (lingerSeconds) after it ends", () => {
  const phrases = groupIntoPhrases(fakeChartEvents());
  const active = currentPhrase(phrases, 1.65, 0.4);
  assert.equal(active?.text, "Lalazim");
});
