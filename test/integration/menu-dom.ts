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

interface FakeGamepadButton {
  pressed: boolean;
}

const fakeGamepadButtons: FakeGamepadButton[] = Array.from({ length: 8 }, () => ({ pressed: false }));
const fakeGamepad = { id: "Fake Guitar Controller", index: 0, buttons: fakeGamepadButtons, axes: [] as number[] };
(dom.window.navigator as unknown as { getGamepads: () => unknown[] }).getGamepads = () => [fakeGamepad];

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

function clickButtonWithText(document: Document, text: string): boolean {
  const button = [...document.querySelectorAll("#root button")].find((b) => b.textContent?.includes(text));
  button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  return !!button;
}

try {
  await vite.ssrLoadModule("/main.tsx");
  await new Promise((r) => setTimeout(r, 300));

  const document = dom.window.document;
  const root = document.getElementById("root");
  checks.push({ name: "App mounts into #root", ok: !!root && root.innerHTML.length > 0 });

  checks.push({
    name: "main menu shows every expected item",
    ok: ["Um Jogador", "Multijogador", "Entrar com Google", "Amigos", "Conquistas", "Opções"].every((label) =>
      root?.innerHTML.includes(label)
    ),
  });

  const clickedLocked = clickButtonWithText(document, "Multijogador");
  await new Promise((r) => setTimeout(r, 100));
  checks.push({ name: "clicking a locked item exists and is clickable", ok: clickedLocked });
  checks.push({
    name: "clicking a locked item shows an explanatory message, doesn't navigate",
    ok: !!root?.innerHTML.includes("ainda não implementado") && document.querySelectorAll("#root canvas").length === 0,
  });

  checks.push({ name: "'Um Jogador' navigates to the song list", ok: clickButtonWithText(document, "Um Jogador") });
  await new Promise((r) => setTimeout(r, 300));

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

  const firstSongButton = [...document.querySelectorAll("#root button")].find((b) => b.textContent?.includes("Test Song"));
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
    name: "'Change song' button goes back to the song list (not all the way to the main menu)",
    ok: document.querySelectorAll("#root canvas").length === 0 && !!root?.innerHTML.includes("Test Song"),
  });

  checks.push({ name: "'« Menu' from the song list goes back to the main menu", ok: clickButtonWithText(document, "« Menu") });
  await new Promise((r) => setTimeout(r, 200));
  checks.push({ name: "main menu shows again after going back", ok: !!root?.innerHTML.includes("Um Jogador") });

  checks.push({ name: "'Opções' navigates to the options screen", ok: clickButtonWithText(document, "Opções") });
  await new Promise((r) => setTimeout(r, 200));

  const actionLabels = ["Verde", "Vermelho", "Amarelo", "Azul", "Laranja", "Aberta", "Star Power"];
  checks.push({
    name: "Controles tab lists every control action",
    ok: actionLabels.every((label) => root?.innerHTML.includes(label)),
  });

  const remapButtons = [...document.querySelectorAll("#root button")].filter((b) => b.textContent?.trim() === "Remapear");
  const verdeRemapButton = remapButtons.find((b) => b.parentElement?.parentElement?.textContent?.includes("Verde"));
  checks.push({ name: "'Remapear' button exists for the Verde action", ok: !!verdeRemapButton });

  verdeRemapButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "clicking 'Remapear' enters listening state",
    ok: !!root?.innerHTML.includes("Pressione uma tecla"),
  });

  dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { code: "KeyZ", bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "pressing a key while listening shows it captured, with Confirmar/Cancelar",
    ok: !!root?.innerHTML.includes(">Z<") && !!root?.innerHTML.includes("Confirmar"),
  });

  checks.push({ name: "'Confirmar' commits the new binding", ok: clickButtonWithText(document, "Confirmar") });
  await new Promise((r) => setTimeout(r, 100));

  const storedAfterRemap = dom.window.localStorage.getItem("pipehero:keyBindings");
  const bindingsAfterRemap = storedAfterRemap ? JSON.parse(storedAfterRemap) : null;
  checks.push({
    name: "confirming the remap persists fretGreen -> KeyZ to localStorage",
    ok: bindingsAfterRemap?.fretGreen?.source === "keyboard" && bindingsAfterRemap?.fretGreen?.code === "KeyZ",
  });
  checks.push({
    name: "Verde row now displays the new key (Z) instead of the listening prompt",
    ok: !root?.innerHTML.includes("Pressione uma tecla") && !!root?.innerHTML.includes(">Z<"),
  });

  checks.push({ name: "'Restaurar padrões' resets the bindings", ok: clickButtonWithText(document, "Restaurar padrões") });
  await new Promise((r) => setTimeout(r, 100));

  const storedAfterReset = dom.window.localStorage.getItem("pipehero:keyBindings");
  const bindingsAfterReset = storedAfterReset ? JSON.parse(storedAfterReset) : null;
  checks.push({
    name: "'Restaurar padrões' restores fretGreen -> KeyA in localStorage",
    ok: bindingsAfterReset?.fretGreen?.source === "keyboard" && bindingsAfterReset?.fretGreen?.code === "KeyA",
  });

  const vermelhoRemapButton = [...document.querySelectorAll("#root button")]
    .filter((b) => b.textContent?.trim() === "Remapear")
    .find((b) => b.parentElement?.parentElement?.textContent?.includes("Vermelho"));
  checks.push({ name: "'Remapear' button exists for the Vermelho action", ok: !!vermelhoRemapButton });

  vermelhoRemapButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));

  fakeGamepadButtons[2].pressed = true;
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "pressing a gamepad button (guitar seen as a joystick, not a keyboard) is captured while listening",
    ok: !!root?.innerHTML.includes("Botão 3") && !!root?.innerHTML.includes("Confirmar"),
  });
  fakeGamepadButtons[2].pressed = false;

  checks.push({
    name: "'Confirmar' commits the gamepad binding",
    ok: clickButtonWithText(document, "Confirmar"),
  });
  await new Promise((r) => setTimeout(r, 100));

  const storedAfterGamepadRemap = dom.window.localStorage.getItem("pipehero:keyBindings");
  const bindingsAfterGamepadRemap = storedAfterGamepadRemap ? JSON.parse(storedAfterGamepadRemap) : null;
  checks.push({
    name: "confirming the gamepad remap persists fretRed -> {gamepad, Fake Guitar Controller#0, button 2}",
    ok:
      bindingsAfterGamepadRemap?.fretRed?.source === "gamepad" &&
      bindingsAfterGamepadRemap?.fretRed?.deviceId === "Fake Guitar Controller#0" &&
      bindingsAfterGamepadRemap?.fretRed?.button === 2,
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
