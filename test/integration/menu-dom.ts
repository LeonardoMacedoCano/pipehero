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

const audioPausedState = new WeakMap<HTMLMediaElement, boolean>();
Object.defineProperty(dom.window.HTMLMediaElement.prototype, "paused", {
  configurable: true,
  get(this: HTMLMediaElement) {
    return audioPausedState.get(this) ?? true;
  },
});
dom.window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
  audioPausedState.set(this, false);
  return Promise.resolve();
};
dom.window.HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
  audioPausedState.set(this, true);
};

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
  {
    id: "other-song",
    name: "Another Track",
    artist: "Jane Roe",
    genre: "Rock",
    album: "",
    coverUrl: null,
    chartFormat: "chart",
    chartUrl: "/songs/other-song/notes.chart",
    audioUrl: "/songs/other-song/song.wav",
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

function clickRowWithText(document: Document, text: string): boolean {
  const row = [...document.querySelectorAll("#root tbody tr")].find((r) => r.textContent?.includes(text));
  row?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  return !!row;
}

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;

function typeIntoInput(input: HTMLInputElement, text: string): void {
  nativeInputValueSetter.call(input, text);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

try {
  await vite.ssrLoadModule("/main.tsx");
  await new Promise((r) => setTimeout(r, 1500));

  const document = dom.window.document;
  const root = document.getElementById("root");
  checks.push({ name: "App mounts into #root", ok: !!root && root.innerHTML.length > 0 });

  checks.push({
    name: "main menu shows every expected item",
    ok: ["Single Player", "Multiplayer", "Log in with Google", "Friends", "Achievements", "Options"].every((label) =>
      root?.innerHTML.includes(label)
    ),
  });

  const clickedLocked = clickButtonWithText(document, "Multiplayer");
  await new Promise((r) => setTimeout(r, 100));
  checks.push({ name: "clicking a locked item exists and is clickable", ok: clickedLocked });
  checks.push({
    name: "clicking a locked item shows an explanatory message, doesn't navigate",
    ok: !!root?.innerHTML.includes("not implemented yet") && document.querySelectorAll("#root canvas").length === 0,
  });

  checks.push({ name: "'Single Player' navigates to the song list", ok: clickButtonWithText(document, "Single Player") });
  await new Promise((r) => setTimeout(r, 300));

  const songRows = document.querySelectorAll("#root tbody tr");
  checks.push({ name: "menu renders at least 1 clickable song row", ok: songRows.length >= 1 });

  checks.push({
    name: "song name appears in the menu",
    ok: !!root?.innerHTML.includes("Test Song"),
  });

  checks.push({
    name: "artist/genre appear in the menu",
    ok: !!root?.innerHTML.includes("John Doe") && !!root?.innerHTML.includes("Metal"),
  });

  checks.push({
    name: "both songs appear in the list before searching",
    ok: !!root?.innerHTML.includes("Test Song") && !!root?.innerHTML.includes("Another Track"),
  });

  const searchFieldPicker = document.querySelectorAll("#root select")[0] as HTMLSelectElement | undefined;
  checks.push({ name: "song list has a search field picker (SearchFilterRSQL)", ok: !!searchFieldPicker });

  if (searchFieldPicker) {
    searchFieldPicker.value = "artist";
    searchFieldPicker.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  }
  await new Promise((r) => setTimeout(r, 100));

  const searchValueInput = document.querySelector("#root input") as HTMLInputElement | null;
  checks.push({ name: "picking a search field enables the filter value input", ok: !!searchValueInput });
  if (searchValueInput) typeIntoInput(searchValueInput, "Doe");
  await new Promise((r) => setTimeout(r, 100));

  const addFilterButton = [...document.querySelectorAll("#root button")].find((b) => b.getAttribute("title") === "Adicionar");
  checks.push({
    name: "'Add filter' button is enabled once a field and value are set",
    ok: !!addFilterButton && !(addFilterButton as HTMLButtonElement).disabled,
  });

  addFilterButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  checks.push({
    name: "adding an 'Artist contains Doe' filter keeps the matching song and filters out the other one",
    ok: !!root?.innerHTML.includes("Test Song") && !root?.innerHTML.includes("Another Track"),
  });

  const songRowWithHint = [...document.querySelectorAll("#root tbody tr")].find((r) => r.textContent?.includes("Test Song"));
  checks.push({
    name: "song rows show a click hint (clickableRows)",
    ok: songRowWithHint?.getAttribute("title") === "Click to choose a difficulty",
  });

  checks.push({ name: "clicking the 'Test Song' row opens its options modal", ok: clickRowWithText(document, "Test Song") });
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

  checks.push({ name: "'Home' from the song list goes back to the main menu", ok: clickButtonWithText(document, "Home") });
  await new Promise((r) => setTimeout(r, 200));
  checks.push({ name: "main menu shows again after going back", ok: !!root?.innerHTML.includes("Single Player") });

  clickButtonWithText(document, "Single Player");
  await new Promise((r) => setTimeout(r, 300));
  clickRowWithText(document, "Test Song");
  await new Promise((r) => setTimeout(r, 300));
  [...document.querySelectorAll("#root button")].find((b) => b.textContent?.trim() === "Expert")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  checks.push({ name: "re-entering the game shows the canvas again", ok: !!document.querySelector("#root canvas") });

  const audioEl = document.querySelector("#root audio") as HTMLMediaElement | null;
  checks.push({ name: "the <audio> element is present", ok: !!audioEl });
  Object.defineProperty(audioEl, "ended", { get: () => true, configurable: true });

  await new Promise((r) => setTimeout(r, 900));

  checks.push({
    name: "song ending shows the results screen (score + song name) and hides the canvas HUD",
    ok: !!root?.innerHTML.includes("Test Song") && !!root?.innerHTML.includes("Score") && !root?.innerHTML.includes("Star Power"),
  });

  const resultsBackButton = [...document.querySelectorAll("#root button")].find((b) => b.textContent?.includes("Back to menu"));
  checks.push({ name: "results screen has a 'Back to menu' button", ok: !!resultsBackButton });

  resultsBackButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  checks.push({
    name: "'Back to menu' from the results screen leaves the game screen (back to the song list)",
    ok: document.querySelectorAll("#root canvas").length === 0 && !!root?.innerHTML.includes("Test Song"),
  });

  clickButtonWithText(document, "Home");
  await new Promise((r) => setTimeout(r, 200));

  checks.push({ name: "'Options' navigates to the options screen", ok: clickButtonWithText(document, "Options") });
  await new Promise((r) => setTimeout(r, 200));

  const actionLabels = ["Green", "Red", "Yellow", "Blue", "Orange", "Open", "Star Power"];
  checks.push({
    name: "Controls tab lists every control action",
    ok: actionLabels.every((label) => root?.innerHTML.includes(label)),
  });

  const remapButtons = [...document.querySelectorAll("#root button")].filter((b) => b.textContent?.trim() === "Remap");
  const greenRemapButton = remapButtons.find((b) => b.parentElement?.parentElement?.textContent?.includes("Green"));
  checks.push({ name: "'Remap' button exists for the Green action", ok: !!greenRemapButton });

  greenRemapButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "clicking 'Remap' enters listening state",
    ok: !!root?.innerHTML.includes("Press a key"),
  });

  dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { code: "KeyZ", bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "pressing a key while listening shows it captured, with Confirm/Cancel",
    ok: !!root?.innerHTML.includes(">Z<") && !!root?.innerHTML.includes("Confirm"),
  });

  checks.push({ name: "'Confirm' commits the new binding", ok: clickButtonWithText(document, "Confirm") });
  await new Promise((r) => setTimeout(r, 100));

  const storedAfterRemap = dom.window.localStorage.getItem("pipehero:keyBindings");
  const bindingsAfterRemap = storedAfterRemap ? JSON.parse(storedAfterRemap) : null;
  checks.push({
    name: "confirming the remap persists fretGreen -> KeyZ to localStorage",
    ok: bindingsAfterRemap?.fretGreen?.source === "keyboard" && bindingsAfterRemap?.fretGreen?.code === "KeyZ",
  });
  checks.push({
    name: "Green row now displays the new key (Z) instead of the listening prompt",
    ok: !root?.innerHTML.includes("Press a key") && !!root?.innerHTML.includes(">Z<"),
  });

  checks.push({ name: "'Restore defaults' resets the bindings", ok: clickButtonWithText(document, "Restore defaults") });
  await new Promise((r) => setTimeout(r, 100));

  const storedAfterReset = dom.window.localStorage.getItem("pipehero:keyBindings");
  const bindingsAfterReset = storedAfterReset ? JSON.parse(storedAfterReset) : null;
  checks.push({
    name: "'Restore defaults' restores fretGreen -> KeyA in localStorage",
    ok: bindingsAfterReset?.fretGreen?.source === "keyboard" && bindingsAfterReset?.fretGreen?.code === "KeyA",
  });

  const redRemapButton = [...document.querySelectorAll("#root button")]
    .filter((b) => b.textContent?.trim() === "Remap")
    .find((b) => b.parentElement?.parentElement?.textContent?.includes("Red"));
  checks.push({ name: "'Remap' button exists for the Red action", ok: !!redRemapButton });

  redRemapButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));

  fakeGamepadButtons[2].pressed = true;
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "pressing a gamepad button (guitar seen as a joystick, not a keyboard) is captured while listening",
    ok: !!root?.innerHTML.includes("Button 3") && !!root?.innerHTML.includes("Confirm"),
  });
  fakeGamepadButtons[2].pressed = false;

  checks.push({
    name: "'Confirm' commits the gamepad binding",
    ok: clickButtonWithText(document, "Confirm"),
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

  checks.push({ name: "'Account' tab button exists", ok: clickButtonWithText(document, "Account") });
  await new Promise((r) => setTimeout(r, 300));
  checks.push({
    name: "Account tab shows a locked 'Account' item when logged out (no DATABASE_URL in this test env)",
    ok: !!root?.innerHTML.includes("Account  🔒"),
  });

  checks.push({
    name: "clicking the locked Account item shows the log-in hint",
    ok: clickButtonWithText(document, "Account  🔒"),
  });
  await new Promise((r) => setTimeout(r, 100));
  checks.push({
    name: "hint explains you need to log in first",
    ok: !!root?.innerHTML.includes("Log in with Google from the menu"),
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
