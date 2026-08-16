# Settings

Open **Options** from the gear icon (⚙️, top-right rail on desktop) or
the **☰** menu (mobile drawer). Four tabs: [Controls](#controls) ·
[Appearance](#appearance-themes) · [Graphics](#graphics-quality) ·
[Account](#account).

## Controls

- **Input device** — `Automatic` / `Touch` / `Keyboard`. Automatic
  detects touch vs. mouse/keyboard per device; override it if it
  guesses wrong (e.g. a touchscreen laptop you want to play with a
  keyboard).
- **Input mode** — `Tap` / `Strum bar` toggle. Full rules for each in
  [`HOW-TO-PLAY.md`](./HOW-TO-PLAY.md#input-mode-tap-vs-strum-bar).
- **Key / gamepad mapping** — click **Remap** on any action, then
  press a keyboard key or a gamepad button to bind it. Reusing a
  binding that's already assigned elsewhere unbinds it from the old
  action (you'll see a warning when that happens). **Restore
  defaults** resets every action back to the factory bindings.

## Appearance (themes)

| Theme | Feel |
|---|---|
| **Dark Carbon Green** (default) | Brushed carbon with a vivid green edge — the classic green/red/yellow/blue/orange lane colors. |
| **Dark Onyx Amber** | Brushed carbon with a warm amber edge — amber/red/green/blue/purple lanes. |
| **Dracula Dark** | The classic Dracula color scheme — purple/red/yellow/cyan/orange lanes. |

This isn't just a menu skin — **each theme also recolors the 5 lanes
and pipes in-game**, not only the surrounding UI. Pick whichever set of
5 colors you find easiest to tell apart at a glance.

**Effect** — an optional animated overlay on top of whichever theme
you picked, applied to the whole site (menus and gameplay alike).
Off (`None`) by default.

| Effect | What it does |
|---|---|
| **None** (default) | No animation. |
| **End Cycle** | A slow, subtle hue drift that eases back and forth, inspired by the color cycling in Minecraft's End portal. |
| **Breathing** | A gentle brightness pulse across the whole site, like it's slowly breathing in and out. |
| **Bloom** | A very soft wash of the theme's accent color breathes across the whole screen. |

All effects respect your OS's "reduce motion" setting (disabled automatically if you have that on).

## Graphics quality

| Level | What you get |
|---|---|
| **Low** | Notes glow purple during Star Power instead of sparking lightning, and hit-splash particles are removed. Best for older or budget phones. |
| **Medium** (default) | Lightning bolts and hit particles, tuned to stay smooth on most phones. |
| **High** | Richer lightning with more bolts, plus the screen's native resolution. Best for high-end phones and desktops. |

## Account

- **Log in with Google** (optional) — unlocks two things: the
  [achievement system](./ACHIEVEMENTS.md) and syncing your settings
  across devices (see below). Everything else in the game — including
  every setting on this page — already works fully without logging
  in, saved locally in your browser.
- **Latency calibration** — `−10ms` / `+10ms` buttons. If notes always
  feel early or late relative to the sound you hear, nudge this before
  you start playing.
- **Log out** — from the account summary shown here once you're
  logged in.

### What syncs with your account

Six settings save to your browser's local storage immediately, on
every device, logged in or not — and additionally sync to your Google
account (so they follow you to a new device) once you're logged in:

- Key / gamepad bindings
- Tap vs. Strum bar mode
- Theme
- Theme effect
- Graphics quality
- Latency calibration

Log in from a second device and these six pull down automatically the
first time you open Options or Account there.
