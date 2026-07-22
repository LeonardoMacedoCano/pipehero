# Architecture

Technical overview of the project — stack, folder structure and how to
run the tests. To install/play, see the [`README`](./README.md); for
production deploy, see [`DEPLOY.md`](./DEPLOY.md).

## Stack

**TypeScript** throughout the project.

- **UI** (menu, HUD, controls): **React** + **styled-components**,
  using the author's own component library
  ([`lcano-react-ui`](https://github.com/LeonardoMacedoCano/lcano-react-ui)).
- **Game engine** (`src/engine`, `src/render`, `src/audio`, `src/game`,
  `src/lyrics`): plain TypeScript, no framework dependency — the
  game's `<canvas>` is imperative code outside React's render tree,
  drawn via `requestAnimationFrame`.
- **Build/dev server**: Vite.
- **Backend**: Node server with no external runtime dependencies (it
  only serves files and lists the songs folder). Compiled from
  TypeScript to plain JS at build time (`server-dist/`), to keep the
  final Docker image without `node_modules`.
- **Tests**: Node's native test runner (`node --test`, via `tsx`) for
  unit tests, plus real integration tests (a real running server, DOM
  simulated via `jsdom`, headless rendering via `node-canvas`).
- **Chart parsing**: [ParseHero](https://github.com/awphi/parsehero),
  just to read Clone Hero's `.chart`/`.mid` files — keeps full
  compatibility with the song library the community already uses,
  with nothing to convert.

## Project structure

```
src/
  engine/    pure game engine — chart parsing, note judgment, chords, sustains, star power
  render/    canvas drawing — positioning logic kept separate from the drawing itself
  audio/     audio↔chart sync and latency calibration
  game/      wires engine + audio + keyboard together
  lyrics/    synced lyrics, read from the chart's own events
  server/    song library — used both in dev (Vite) and in production (server.ts, compiled)
  ui/        React components/pages/hooks (TypeScript + styled-components, lcano-react-ui theme)
scripts/     development tools (generate test songs, inspect a chart)
test/
  integration/  integration tests (real server, real build, simulated DOM, real chart)
  fixtures/     chart files used in the tests
index.html, main.tsx    frontend
vite.config.ts          dev server + songs API
server.ts               production server — compiled (tsc) into server-dist/ by the build
Dockerfile, docker-compose.yml   packaging
```

Every module in `src/` (outside `ui/`) is pure logic (no direct
DOM/canvas/audio) with its `*.test.ts` alongside it — an architecture
decision that lets almost everything be tested without a browser.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Vite), port 5511 |
| `npm run typecheck` | Checks types for the whole project (`tsc --noEmit`) |
| `npm run build` | Builds the production version: frontend in `dist/` + compiled server in `server-dist/` |
| `npm start` | Runs the production server (needs a build first) |
| `npm test` | Unit tests (`node --test`, via `tsx`) |
| `npm run test:integration` | Integration tests (real server, real render, simulated DOM) |
| `npm run test:all` | Both of the above |
| `npm run generate-dev-song` | Generates/regenerates the synthetic placeholder songs |
| `npm run generate-test-chart` | Generates/regenerates the complex synthetic chart used in tests (`test/fixtures/synthetic-complex.chart`) |

CI (`.github/workflows/test.yml`) runs `typecheck` + `test:all` on
every push/PR to `main`.
