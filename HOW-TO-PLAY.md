# How to play

## Basic flow

1. Open the game in your browser — you land straight on a **song
   menu**.
2. Click a song. A modal opens with the **available difficulties**
   and latency calibration.
3. Click a difficulty — the game **starts playing right away**, no
   "Start" button. If the browser blocks autoplay (happens if loading
   takes too long), a "Tap to start" overlay appears: one click fixes
   it.
4. To exit, use the **"« Change song"** button at the top of the game
   screen.

## Controls

| Key | Lane | Color |
|---|---|---|
| `A` | 1 | 🟢 Green |
| `S` | 2 | 🔴 Red |
| `J` | 3 | 🟡 Yellow |
| `K` | 4 | 🔵 Blue |
| `L` | 5 | 🟠 Orange |
| `Space` | Open note | ⚪ White (bar across the whole track) |
| `Shift` (either) | Activate Star Power | — |

Keys are fixed for now (no remapping in the UI yet).

## Goal

Press the right key exactly when the note (drop) reaches the pipe
mouth at the bottom of the screen. The closer to the exact time, the
better the judgment — and the higher the score.

## Difficulty

The difficulty chosen in the modal doesn't just change the chart's
note density — it also changes how precise your timing needs to be:

| Difficulty | "Perfect" window | "Good" window |
|---|---|---|
| Expert | ±35ms | ±90ms |
| Hard | ±50ms | ±110ms |
| Medium | ±70ms | ±140ms |
| Easy | ±90ms | ±170ms |

Outside these windows, the note counts as a miss (the drop falls and
fades away — no extra penalty, it just doesn't score).

## Chords and long notes (sustain)

- **Chords** (two or more notes at the same time): all-or-nothing —
  you need to hit every key in the chord together to score.
- **Sustain** (long note): hold the key down while the "drop line"
  passes. The bonus is proportional to how long you held it correctly
  — releasing before the end still guarantees the partial bonus
  already earned.

## Star Power

- Certain stretches of a song are **Star Power** phrases — hitting
  notes within them fills the meter (top-right corner).
- With the meter at **50% or more**, press **Shift** to activate.
- While active, score **doubles**. The meter drains on its own after
  about **12 seconds** of use.

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
