# PipeHero

<img src="./public/pipehero-icon.png" alt="PipeHero rock-hand icon" width="120" />

![Tests](https://github.com/LeonardoMacedoCano/pipehero/actions/workflows/test.yml/badge.svg)
![License](https://img.shields.io/github/license/LeonardoMacedoCano/pipehero)

A **Guitar Hero/Clone Hero**-style rhythm game, playable **entirely in
the browser** — nothing to install. Point it at a folder of songs in
Clone Hero's format (`.chart`/`.mid` + audio + `song.ini`) and anyone
on the network can open it and play — keyboard and mouse on a PC,
touch on a phone or tablet, portrait or landscape, no app store needed.

<table>
<tr><td align="center">

![Desktop gameplay on Expert difficulty, several notes on the highway and the splash effect of a note just hit](./public/screenshot-gameplay.png)
<sub>Desktop</sub>

</td><td align="center">

![Phone gameplay in landscape orientation, wider highway and the touch lane highlighted where a note was just hit](./public/screenshot-gameplay-mobile.png)
<sub>Phone, landscape</sub>

</td></tr>
</table>

It's not Clone Hero (the desktop app) running inside a container — it's
a web game engine built from scratch, compatible with the files the
Clone Hero community already uses. Technical details in
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Features

- Reads Clone Hero song folders directly (`.chart`/`.mid` + audio +
  `song.ini`) — no conversion needed.
- Keyboard, gamepad, or touch (auto-detected), **Tap** or **Strum bar**
  input mode, every action remappable — see
  [`HOW-TO-PLAY.md`](./HOW-TO-PLAY.md) for controls on every device.
- Chords, sustains, Star Power and a Rock Meter that can end the song
  early — full rules also in [`HOW-TO-PLAY.md`](./HOW-TO-PLAY.md).
- 3 themes (each recolors the lanes too) and 3 graphics-quality tiers
  for low-end phones up to desktops — see [`SETTINGS.md`](./SETTINGS.md).
- 16 achievements to unlock with an optional Google login, which also
  syncs your settings across devices — see
  [`ACHIEVEMENTS.md`](./ACHIEVEMENTS.md).
- Self-hostable with Docker so anyone on your network can play — see
  [`DEPLOY.md`](./DEPLOY.md).

## Try it now (local, with placeholder songs)

Requires [Node.js](https://nodejs.org) 20+.

```
npm install
npm run dev
```

Opens `http://localhost:5511` with 2 synthetic test songs already
included — no need for real content to try it out.

## More info

| I want to... | See |
|---|---|
| Know the controls and how the game works, on any device | [`HOW-TO-PLAY.md`](./HOW-TO-PLAY.md) |
| Remap controls, change theme/graphics, manage my account | [`SETTINGS.md`](./SETTINGS.md) |
| See the full achievement list | [`ACHIEVEMENTS.md`](./ACHIEVEMENTS.md) |
| Run it on my own server with my own songs (Docker/Unraid) | [`DEPLOY.md`](./DEPLOY.md) |
| Understand the stack and code structure (contribute) | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |

## License

[MIT](./LICENSE)
