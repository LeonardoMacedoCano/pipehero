import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGenreGroup } from "./genreGroups.js";

test("normalizeGenreGroup collapses known Rock/Metal/Punk variants and typos", () => {
  for (const raw of [
    "Rock",
    "Hard Rock",
    "Alternative",
    "Alterative",
    "Alternative Rock",
    "Classic Rock",
    "Pop Rock",
    "Pop-Rock",
    "Post Rock",
    "Indie Rock",
    "Soft Rock",
    "Stoner Rock",
    "Instrumental Rock",
    "Rockabilly",
    "Rock 'n Roll",
    "Rock n Roll",
    "Agrorock",
  ]) {
    assert.equal(normalizeGenreGroup(raw), "Rock", `expected "${raw}" to normalize to Rock`);
  }

  for (const raw of [
    "Metal",
    "Death Metal",
    "Heavy Metal",
    "Nu Metal",
    "Nu-Metal",
    "Thrash Metal",
    "Power Metal",
    "Metalcore",
    "Industrial Metal",
    "Folk Metal",
    "Progessive Metal",
    "Progressive Metal",
    "Progresssive Metal",
    "Forró / Metal",
    "Forro Metal",
    "Rap Metal",
  ]) {
    assert.equal(normalizeGenreGroup(raw), "Metal", `expected "${raw}" to normalize to Metal`);
  }

  for (const raw of ["hardcore", "Hardcore", "Hardcore Punk", "Melodic Hardcore", "Pop Punk", "Punk Rock", "Skate Punk"]) {
    assert.equal(normalizeGenreGroup(raw), "Punk", `expected "${raw}" to normalize to Punk`);
  }
});

test("normalizeGenreGroup keeps distinct real genres separate", () => {
  assert.equal(normalizeGenreGroup("Forró"), "Forró");
  assert.equal(normalizeGenreGroup("Sertanejo"), "Sertanejo");
  assert.equal(normalizeGenreGroup("Samba"), "Samba");
  assert.equal(normalizeGenreGroup("Axé"), "Axé");
  assert.equal(normalizeGenreGroup("MPB"), "MPB");
  assert.equal(normalizeGenreGroup("Reggae"), "Reggae");
  assert.equal(normalizeGenreGroup("Rap"), "Rap");
});

test("normalizeGenreGroup falls back to a suffix match for unmapped genres", () => {
  assert.equal(normalizeGenreGroup("Symphonic Metal"), "Metal");
  assert.equal(normalizeGenreGroup("Math Rock"), "Rock");
  assert.equal(normalizeGenreGroup("Dance Pop"), "Pop");
});

test("normalizeGenreGroup keeps genuinely unknown genres untouched", () => {
  assert.equal(normalizeGenreGroup("Vaporwave"), "Vaporwave");
});

test("normalizeGenreGroup handles empty and whitespace-only input", () => {
  assert.equal(normalizeGenreGroup(""), "");
  assert.equal(normalizeGenreGroup("   "), "");
});
