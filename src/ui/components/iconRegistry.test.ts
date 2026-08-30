import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ICONS } from "./iconRegistry.js";
import { ACHIEVEMENTS } from "../../server/achievements.js";
import { SHOP_CATEGORIES } from "./shop/shopCategories.js";
import { AVATAR_OPTIONS } from "../cosmetics/avatarCatalog.js";

const SRC_DIR = fileURLToPath(new URL("../..", import.meta.url));
const known = new Set(Object.keys(ICONS));

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const ALL_FILES = sourceFiles(SRC_DIR);

test("every catalog icon name resolves to a registered icon", () => {
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(known.has(achievement.icon), `achievement "${achievement.code}" uses unknown icon "${achievement.icon}"`);
  }
  for (const category of SHOP_CATEGORIES) {
    assert.ok(known.has(category.icon), `shop category "${category.id}" uses unknown icon "${category.icon}"`);
  }
  for (const avatar of AVATAR_OPTIONS) {
    assert.ok(known.has(avatar.icon), `avatar "${avatar.id}" uses unknown icon "${avatar.icon}"`);
  }
});

test("every icon name referenced in source resolves to a registered icon", () => {
  for (const file of ALL_FILES) {
    if (file.endsWith("iconRegistry.test.ts")) continue;
    const text = readFileSync(file, "utf-8");

    for (const match of text.matchAll(/<Icon\s+[^>]*\bname="([a-z-]+)"/g)) {
      assert.ok(known.has(match[1]), `${file}: <Icon name="${match[1]}"> is not in the registry`);
    }
    if (/(?:missions|economyRoutes)\.ts$/.test(file)) {
      for (const match of text.matchAll(/\bicon:\s*"([a-z][a-z-]*)"/g)) {
        assert.ok(known.has(match[1]), `${file}: icon "${match[1]}" is not in the registry`);
      }
    }
    if (file.endsWith("shopItemPreview.tsx")) {
      for (const line of text.split("\n").filter((l) => l.includes("PREVIEW_ICON"))) {
        for (const match of line.matchAll(/"([a-z-]+)"/g)) {
          assert.ok(known.has(match[1]), `${file}: preview icon "${match[1]}" is not in the registry`);
        }
      }
    }
  }
});

test("no raw emoji left in the UI or catalog source", () => {
  const ALLOWED = new Set(["★", "✓"]);
  const emojiish = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  for (const file of ALL_FILES) {
    const lines = readFileSync(file, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (emojiish.test(ch) && !ALLOWED.has(ch)) {
          assert.fail(`${file}:${i + 1} contains a raw emoji ("${ch}") — render it with <Icon name="…"> instead`);
        }
      }
    }
  }
});
