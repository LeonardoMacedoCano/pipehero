import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SHOP_ITEMS, isValidCosmeticId, type CosmeticSlot } from "./shop.js";

const IDS = new Set(SHOP_ITEMS.map((item) => item.id));
const SLOTS: CosmeticSlot[] = ["theme", "effect", "avatar", "border", "background", "tag"];

test("shop catalog has unique, fully-populated entries with a positive price", () => {
  assert.equal(IDS.size, SHOP_ITEMS.length);
  for (const item of SHOP_ITEMS) {
    assert.ok(item.id.length > 0);
    assert.ok(item.name.length > 0);
    assert.ok(item.description.length > 0);
    assert.ok(SLOTS.includes(item.slot));
    assert.ok(item.refId.length > 0);
    assert.ok(item.priceCoins > 0);
  }
});

test("every theme/effect item's name and price are documented in SETTINGS.md", () => {
  const docs = readFileSync(new URL("../../SETTINGS.md", import.meta.url), "utf-8");
  for (const item of SHOP_ITEMS.filter((i) => i.slot === "theme" || i.slot === "effect")) {
    assert.ok(docs.includes(item.name), `SETTINGS.md is missing "${item.name}" (id: ${item.id}) — update the doc when the catalog changes.`);
    assert.ok(
      docs.includes(`${item.priceCoins} coins`),
      `SETTINGS.md is missing the price "${item.priceCoins} coins" for "${item.name}" — update the doc when the catalog changes.`
    );
  }
});

test("every profile cosmetic's name and description are documented in PROFILE.md", () => {
  const docs = readFileSync(new URL("../../PROFILE.md", import.meta.url), "utf-8");
  for (const item of SHOP_ITEMS.filter((i) => i.slot === "avatar" || i.slot === "border" || i.slot === "background" || i.slot === "tag")) {
    assert.ok(docs.includes(item.name), `PROFILE.md is missing "${item.name}" (id: ${item.id}) — update the doc when the catalog changes.`);
    assert.ok(
      docs.includes(item.description),
      `PROFILE.md is missing the description for "${item.name}" (id: ${item.id}) — update the doc when the catalog changes.`
    );
  }
});

test("isValidCosmeticId accepts the free defaults for theme/effect, rejects unknown ids", () => {
  assert.ok(isValidCosmeticId("theme", "darkCarbonGreen"));
  assert.ok(isValidCosmeticId("effect", "none"));
  assert.ok(!isValidCosmeticId("theme", "not-a-real-theme"));
  assert.ok(!isValidCosmeticId("effect", "not-a-real-effect"));
});

test("isValidCosmeticId accepts every catalog refId for its own slot, rejects it for other slots", () => {
  for (const item of SHOP_ITEMS) {
    assert.ok(isValidCosmeticId(item.slot, item.refId), `${item.slot}/${item.refId} should be valid`);
    for (const otherSlot of SLOTS.filter((slot) => slot !== item.slot)) {
      assert.ok(!isValidCosmeticId(otherSlot, item.refId), `${item.refId} should not be valid under ${otherSlot}`);
    }
  }
});

test("avatar/border/background/tag slots have no free default — every non-empty id must be in the catalog", () => {
  for (const slot of ["avatar", "border", "background", "tag"] as const) {
    assert.ok(!isValidCosmeticId(slot, ""));
    assert.ok(!isValidCosmeticId(slot, "not-a-real-id"));
  }
});
