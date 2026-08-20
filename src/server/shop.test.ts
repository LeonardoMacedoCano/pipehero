import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SHOP_ITEMS, isValidThemeEffectId, isValidThemeId } from "./shop.js";

const IDS = new Set(SHOP_ITEMS.map((item) => item.id));

test("shop catalog has unique, fully-populated entries with a positive price", () => {
  assert.equal(IDS.size, SHOP_ITEMS.length);
  for (const item of SHOP_ITEMS) {
    assert.ok(item.id.length > 0);
    assert.ok(item.name.length > 0);
    assert.ok(item.description.length > 0);
    assert.ok(["theme", "effect"].includes(item.slot));
    assert.ok(item.refId.length > 0);
    assert.ok(item.priceCoins > 0);
  }
});

test("every shop item's name and price are documented in SETTINGS.md", () => {
  const docs = readFileSync(new URL("../../SETTINGS.md", import.meta.url), "utf-8");
  for (const item of SHOP_ITEMS) {
    assert.ok(docs.includes(item.name), `SETTINGS.md is missing "${item.name}" (id: ${item.id}) — update the doc when the catalog changes.`);
    assert.ok(
      docs.includes(`${item.priceCoins} coins`),
      `SETTINGS.md is missing the price "${item.priceCoins} coins" for "${item.name}" — update the doc when the catalog changes.`
    );
  }
});

test("isValidThemeId accepts the free default and every theme in the catalog, rejects unknown ids", () => {
  assert.ok(isValidThemeId("darkCarbonGreen"));
  for (const item of SHOP_ITEMS.filter((i) => i.slot === "theme")) {
    assert.ok(isValidThemeId(item.refId), item.refId);
  }
  assert.ok(!isValidThemeId("not-a-real-theme"));
  assert.ok(!isValidThemeId(""));
});

test("isValidThemeEffectId accepts the free default and every effect in the catalog, rejects unknown ids", () => {
  assert.ok(isValidThemeEffectId("none"));
  for (const item of SHOP_ITEMS.filter((i) => i.slot === "effect")) {
    assert.ok(isValidThemeEffectId(item.refId), item.refId);
  }
  assert.ok(!isValidThemeEffectId("not-a-real-effect"));
  assert.ok(!isValidThemeEffectId(""));
});
