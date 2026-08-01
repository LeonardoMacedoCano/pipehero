# How to play

## Basic flow

1. Open the game in your browser — you land on the **main menu**.
   Click **"Single Player"** to reach the **song menu**.
2. Click a song. A modal opens with the **available difficulties**
   and latency calibration.
3. Click a difficulty — the game **starts playing right away**, no
   "Start" button. If the browser blocks autoplay (happens if loading
   takes too long), a "Tap to start" overlay appears: one click fixes
   it.
4. To exit, use the **"« Change song"** button at the top of the game
   screen.

## Controls

Default bindings:

| Key | Lane | Color |
|---|---|---|
| `A` | 1 | 🟢 Green |
| `S` | 2 | 🔴 Red |
| `J` | 3 | 🟡 Yellow |
| `K` | 4 | 🔵 Blue |
| `L` | 5 | 🟠 Orange |
| `Left Shift` | Activate Star Power | — |

Every action can be remapped to a different keyboard key **or** to a
gamepad/joystick button (e.g. a PC guitar that the OS sees as a
controller) from **Options → Controls**.

### Input mode: Tap vs. Strum bar

Also in **Options → Controls**, a toggle switches how notes register:

- **Tap** (default): pressing the right fret key by itself hits the
  note — no strumming needed. Has a dedicated `Space` key for the
  **Open** note (no fret held).
- **Strum bar**: holding a fret key does nothing by itself — you also
  need to strum, `↑`/`↓` by default (remappable, direction doesn't
  matter). Closer to how a real guitar controller works: hold the
  right fret(s), then strum to register the hit. There's no separate
  Open key here — an Open note is hit by strumming while **no**
  colored fret is held, same as on real hardware.

The Controls list only shows the bindings that apply to the mode
you're in.

## Goal

Press the right key exactly when the note (drop) reaches the pipe
mouth at the bottom of the screen. The closer to the exact time, the
better the judgment — and the higher the score.

## Difficulty

The difficulty chosen in the modal doesn't just change the chart's
note density — it also changes how precise your timing needs to be:

| Difficulty | "Perfect" window | "Good" window |
|---|---|---|
| Expert | ±50ms | ±140ms |
| Hard | ±70ms | ±170ms |
| Medium | ±90ms | ±200ms |
| Easy | ±120ms | ±240ms |

Outside these windows, the note counts as a miss (the drop falls and
fades away — no extra penalty, it just doesn't score).

## Chords and long notes (sustain)

- **Chords** (two or more notes at the same time): all-or-nothing —
  you need to hit every key in the chord together to score.
- **Sustain** (long note): hold the key down while the "drop line"
  passes. The bonus is proportional to how long you held it correctly
  — releasing before the end still guarantees the partial bonus
  already earned.

## Rock Meter

A meter from **0 to 100** (starts at 50) tracks how the crowd feels
about your playing:

| Action | Rock Meter |
|---|---|
| Hit a note | +1 |
| Miss a note (nothing pressed in time) | -3 |
| Wrong key while a note is actually due | -3 — same as missing it |
| Wrong key with nothing due nearby | -1 — still costs you, just less |

Any miss or wrong press also resets your combo streak.

Four zones, mostly visual — except the bottom one:

| Zone | Range |
|---|---|
| Critical | 0–9 |
| Red | 10–32 |
| Yellow | 33–65 (song starts here) |
| Green | 66–100 |

**Activate Star Power while in the critical zone and every hit is
worth 4x** (+4 instead of +1) — a genuine last-second comeback tool,
same as in Guitar Hero III.

**Reach 0 and the song ends immediately** — same as running out of
health in Guitar Hero/Rock Band, no continuing from where you left
off.

## Star Power

- Certain stretches of a song are **Star Power** phrases — hitting
  notes within them fills the meter (top-right corner).
- With the meter at **50% or more**, press **Left Shift** (or
  whatever it's remapped to) to activate.
- While active, score **doubles**. The meter drains on its own —
  about **12.5 seconds** if activated right at 50%, up to **25
  seconds** if you wait for a full 100% charge.
- Also boosts the **Rock Meter** while it's in the critical zone (see
  above) — worth saving for a near-fail moment.

## Latency calibration

If notes always seem early or late relative to the sound you hear,
adjust the calibration **before you start playing**, in the same modal
where you pick the difficulty (`−10ms` / `+10ms` buttons). The value is
saved in the browser for future sessions.

## Where the songs come from

The menu lists whatever is in the songs folder configured on the
server (Clone Hero's folder format: `.chart`/`.mid` + audio +
`song.ini`). If the song you want to play doesn't show up in the menu,
that's a server configuration issue, not the game itself — see
[`DEPLOY.md`](./DEPLOY.md).
