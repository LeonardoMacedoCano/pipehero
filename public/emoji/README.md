# Vendored emoji icons

These SVGs are a subset of [Noto Emoji](https://github.com/googlefonts/noto-emoji)
(`svg/` directory), copied at commit `8998f5dd683424a73e2314a8c1f1e359c19e8742`.

Only the glyphs the app actually renders are vendored here — see
`src/ui/emojiAssets.ts` for the glyph → file map, and `src/ui/components/Emoji.tsx`
for the component that renders them. They exist so icons render identically on
systems with no colour-emoji font installed (where raw emoji show up as empty
boxes).

File names are the glyph's Unicode code point(s) in lowercase hex, joined by `_`,
with the `U+FE0F` variation selector dropped (matching Noto's own `emoji_u…`
naming, minus the prefix).

Per the Noto Emoji README, the image resources are under the Apache License 2.0
(`LICENSE` in this directory). Attribution is not required in the UI; keeping this
file and `LICENSE` alongside the assets is enough.
