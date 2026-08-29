import test from "node:test";
import assert from "node:assert/strict";
import { isAudioElementFormatSupported } from "./audioFormatSupport.js";

function fakeAudio(src: string, canPlayTypeResult: string): HTMLAudioElement {
  return { src, canPlayType: () => canPlayTypeResult } as unknown as HTMLAudioElement;
}

test("reports unsupported when canPlayType returns empty string for a known extension", () => {
  assert.equal(isAudioElementFormatSupported(fakeAudio("https://x/song.opus", "")), false);
});

test("reports supported when canPlayType returns 'probably'", () => {
  assert.equal(isAudioElementFormatSupported(fakeAudio("https://x/song.opus", "probably")), true);
});

test("reports supported when canPlayType returns 'maybe'", () => {
  assert.equal(isAudioElementFormatSupported(fakeAudio("https://x/song.mp3", "maybe")), true);
});

test("ignores query strings when reading the extension", () => {
  assert.equal(isAudioElementFormatSupported(fakeAudio("https://x/song.ogg?token=abc", "")), false);
});

test("does not block unknown/unmapped extensions", () => {
  assert.equal(isAudioElementFormatSupported(fakeAudio("https://x/song.weird", "")), true);
});
