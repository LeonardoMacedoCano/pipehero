import test from "node:test";
import assert from "node:assert/strict";
import { isInsideDir } from "./pathGuard.js";

test("the directory itself counts as inside", () => {
  assert.equal(isInsideDir("/data/songs", "/data/songs"), true);
});

test("a file inside the directory is inside", () => {
  assert.equal(isInsideDir("/data/songs/song-a/notes.chart", "/data/songs"), true);
});

test("a sibling directory that merely shares the prefix is NOT inside", () => {
  assert.equal(isInsideDir("/data/songs-secret/file.txt", "/data/songs"), false);
});

test("a path that only textually starts with the dir but isn't a subpath is NOT inside", () => {
  assert.equal(isInsideDir("/data/songsx", "/data/songs"), false);
});
