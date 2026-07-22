import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

const indexHtml = readFileSync("index.html", "utf-8");
const dom = new JSDOM(indexHtml, { url: "http://localhost/", runScripts: "outside-only" });

const globalAny = globalThis as unknown as Record<string, unknown>;
globalAny.window = dom.window;
globalAny.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalAny.HTMLElement = dom.window.HTMLElement;
globalAny.Event = dom.window.Event;
globalAny.KeyboardEvent = dom.window.KeyboardEvent;
globalAny.localStorage = dom.window.localStorage;
globalAny.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16);
globalAny.cancelAnimationFrame = (id: number) => clearTimeout(id);
globalAny.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {};

const FAKE_SONGS = [
  {
    id: "test-song",
    name: "Test Song",
    artist: "John Doe",
    genre: "Metal",
    album: "",
    coverUrl: null,
    chartFormat: "chart",
    chartUrl: "/songs/test-song/notes.chart",
    audioUrl: "/songs/test-song/song.wav",
  },
];

const FAKE_CHART_TEXT = `[Song]
{
  Name = "Test Song"
  Artist = "John Doe"
  Offset = 0
  Resolution = 192
}
[SyncTrack]
{
  0 = TS 4
  0 = B 120000
}
[ExpertSingle]
{
  0 = N 0 0
  192 = N 1 0
}
`;

globalAny.fetch = async (url: string | URL) => {
  const path = String(url);
  if (path === "/api/songs") {
    return { ok: true, status: 200, json: async () => FAKE_SONGS };
  }
  if (path === "/songs/test-song/notes.chart") {
    return { ok: true, status: 200, text: async () => FAKE_CHART_TEXT };
  }
  throw new Error(`fetch not mocked for: ${path}`);
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  ssr: {
    noExternal: ["lcano-react-ui", "styled-components"],
  },
});

const checks: { name: string; ok: boolean }[] = [];

try {
  await vite.ssrLoadModule("/main.tsx");
  await new Promise((r) => setTimeout(r, 300));

  const document = dom.window.document;
  const root = document.getElementById("root");
  checks.push({ name: "App mounts into #root", ok: !!root && root.innerHTML.length > 0 });

  const songButtons = document.querySelectorAll("#root button");
  checks.push({ name: "menu renders at least 1 clickable song", ok: songButtons.length >= 1 });

  checks.push({
    name: "song name appears in the menu",
    ok: !!root?.innerHTML.includes("Test Song"),
  });

  checks.push({
    name: "artist/genre appear in the menu",
    ok: !!root?.innerHTML.includes("John Doe") && !!root?.innerHTML.includes("Metal"),
  });

  const firstSongButton = document.querySelector("#root button");
  firstSongButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));

  const difficultyButton = [...document.querySelectorAll("#root button")].find(
    (b) => b.textContent?.trim() === "Expert"
  );
  checks.push({ name: "options modal opens with the available difficulty (Expert)", ok: !!difficultyButton });
  checks.push({
    name: "hasn't entered the game just from opening the modal (no <canvas> yet)",
    ok: document.querySelectorAll("#root canvas").length === 0,
  });

  difficultyButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  const canvas = document.querySelector("#root canvas");
  checks.push({ name: "clicking the difficulty enters the game screen (shows the <canvas>)", ok: !!canvas });

  checks.push({
    name: "game screen shows Star Power (no combo/hits/misses HUD)",
    ok: !!root?.innerHTML.includes("Star Power"),
  });

  const backButton = [...document.querySelectorAll("#root button")].find((b) =>
    b.textContent?.includes("Change song")
  );
  checks.push({ name: "'Change song' button exists on the game screen", ok: !!backButton });

  backButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  checks.push({
    name: "'Change song' button goes back to the menu",
    ok: document.querySelectorAll("#root canvas").length === 0 && !!root?.innerHTML.includes("Test Song"),
  });
} finally {
  await vite.close();
}

console.log("=== Checks (real React App, DOM simulated via jsdom) ===");
let allOk = true;
for (const c of checks) {
  console.log(`${c.ok ? "✔" : "✘"} ${c.name}`);
  if (!c.ok) allOk = false;
}

console.log(`\nMenu -> modal -> game flow validation: ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);
