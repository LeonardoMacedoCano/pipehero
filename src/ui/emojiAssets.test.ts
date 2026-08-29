import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { emojiAssets } from "./emojiAssets.js";

const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));

const TEXT_SYMBOLS = new Set([0x2605, 0x2713, 0x2192, 0x2212]);

function isIconChar(codePoint: number): boolean {
  if (codePoint < 0x2190 || TEXT_SYMBOLS.has(codePoint)) return false;
  return (
    (codePoint >= 0x2190 && codePoint <= 0x2bff) ||
    (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
    codePoint === 0xfe0f
  );
}

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if ((entry.endsWith(".ts") || entry.endsWith(".tsx")) && entry !== "emojiAssets.ts" && entry !== "emojiAssets.test.ts") {
      out.push(full);
    }
  }
  return out;
}

function glyphTokens(text: string): string[] {
  const tokens: string[] = [];
  let run = "";
  for (const ch of text) {
    if (isIconChar(ch.codePointAt(0)!)) {
      run += ch;
    } else if (run) {
      tokens.push(run);
      run = "";
    }
  }
  if (run) tokens.push(run);
  return tokens;
}

test("every emoji glyph used in the app has an entry in emojiAssets", () => {
  const usages = new Map<string, string>();
  for (const file of collectSourceFiles(SRC_DIR)) {
    for (const token of glyphTokens(readFileSync(file, "utf-8"))) {
      if (!usages.has(token)) usages.set(token, file);
    }
  }
  for (const [token, file] of usages) {
    assert.ok(
      token in emojiAssets,
      `${file} renders the emoji "${token}" but emojiAssets has no entry for it — add it (and vendor the SVG in public/emoji/).`
    );
  }
});

test("every emojiAssets entry points to a vendored SVG that exists", () => {
  for (const [glyph, path] of Object.entries(emojiAssets)) {
    assert.ok(path.startsWith("/emoji/") && path.endsWith(".svg"), `emojiAssets["${glyph}"] = "${path}" is not an /emoji/*.svg path`);
    assert.ok(existsSync(join(PUBLIC_DIR, path)), `emojiAssets["${glyph}"] points to ${path}, which is missing from public/emoji/`);
  }
});
