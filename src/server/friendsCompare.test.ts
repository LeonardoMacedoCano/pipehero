import test from "node:test";
import assert from "node:assert/strict";
import { buildCompareRows, buildStarDistribution, computeWeightedScore, countWins, determineWinner } from "./friendsCompare.js";

test("determineWinner picks the higher star count, ties, or unplayed", () => {
  assert.equal(determineWinner(5, 3), "me");
  assert.equal(determineWinner(2, 4), "friend");
  assert.equal(determineWinner(3, 3), "tie");
  assert.equal(determineWinner(null, 4), "unplayed");
  assert.equal(determineWinner(4, null), "unplayed");
  assert.equal(determineWinner(null, null), "unplayed");
});

test("computeWeightedScore sums stars weighted by difficulty", () => {
  assert.equal(computeWeightedScore([]), 0);
  assert.equal(
    computeWeightedScore([
      { difficulty: "Expert", stars: 5 },
      { difficulty: "Easy", stars: 3 },
    ]),
    23
  );
});

test("buildCompareRows merges both sides by song+difficulty, including songs only one side played", () => {
  const rows = buildCompareRows(
    [
      { songId: "song-a", difficulty: "Expert", stars: 5 },
      { songId: "song-b", difficulty: "Hard", stars: 2 },
    ],
    [{ songId: "song-a", difficulty: "Expert", stars: 3 }]
  );

  assert.equal(rows.length, 2);
  const songA = rows.find((r) => r.songId === "song-a")!;
  assert.deepEqual(songA, { songId: "song-a", difficulty: "Expert", myStars: 5, friendStars: 3, winner: "me" });
  const songB = rows.find((r) => r.songId === "song-b")!;
  assert.deepEqual(songB, { songId: "song-b", difficulty: "Hard", myStars: 2, friendStars: null, winner: "unplayed" });
});

test("countWins counts only decisive rows, not ties or unplayed", () => {
  const rows = buildCompareRows(
    [
      { songId: "a", difficulty: "Expert", stars: 5 },
      { songId: "b", difficulty: "Hard", stars: 3 },
      { songId: "c", difficulty: "Medium", stars: 2 },
    ],
    [
      { songId: "a", difficulty: "Expert", stars: 2 },
      { songId: "b", difficulty: "Hard", stars: 4 },
      { songId: "c", difficulty: "Medium", stars: 2 },
    ]
  );
  assert.deepEqual(countWins(rows), { myWins: 1, friendWins: 1 });
});

test("buildStarDistribution buckets counts sum to the input length", () => {
  const distribution = buildStarDistribution([
    { difficulty: "Expert", stars: 5 },
    { difficulty: "Expert", stars: 5 },
    { difficulty: "Expert", stars: 3 },
    { difficulty: "Easy", stars: 0 },
  ]);
  assert.deepEqual(distribution.Expert, [0, 0, 0, 1, 0, 2]);
  assert.deepEqual(distribution.Easy, [1, 0, 0, 0, 0, 0]);
  assert.deepEqual(distribution.Hard, [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(distribution.Medium, [0, 0, 0, 0, 0, 0]);
});
