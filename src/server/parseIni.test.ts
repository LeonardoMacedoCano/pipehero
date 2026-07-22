import test from "node:test";
import assert from "node:assert/strict";
import { parseIni } from "./parseIni.js";

test("reads basic section and key=value", () => {
  const result = parseIni("[song]\nname = My Song\nartist = Someone\n");
  assert.equal(result.song.name, "My Song");
  assert.equal(result.song.artist, "Someone");
});

test("section and key names become lowercase, value keeps original case", () => {
  const result = parseIni("[Song]\nName = Title With Capitals\n");
  assert.equal(result.song.name, "Title With Capitals");
});

test("ignores blank lines and comments", () => {
  const result = parseIni("[song]\n; comment\n\nname = X\n# another comment\n");
  assert.equal(result.song.name, "X");
});

test("line with no section open yet is ignored, doesn't break the parser", () => {
  const result = parseIni("loose = no section\n[song]\nname = X\n");
  assert.equal(result.song.name, "X");
});

test("empty string returns an empty object", () => {
  assert.deepEqual(parseIni(""), {});
});
