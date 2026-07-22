# PipeHero

![Tests](https://github.com/LeonardoMacedoCano/pipehero/actions/workflows/test.yml/badge.svg)
![License](https://img.shields.io/github/license/LeonardoMacedoCano/pipehero)

A **Guitar Hero/Clone Hero**-style rhythm game, playable **entirely in
the browser** — nothing to install. Point it at a folder of songs in
Clone Hero's format (`.chart`/`.mid` + audio + `song.ini`) and any PC
on the network can open it in a browser and play with the keyboard.

It's not Clone Hero (the desktop app) running inside a container — it's
a web game engine built from scratch, compatible with the files the
Clone Hero community already uses. Technical details in
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

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
| Run it on my own server with my own songs (Docker/Unraid) | [`DEPLOY.md`](./DEPLOY.md) |
| Know the controls and how the game works | [`HOW-TO-PLAY.md`](./HOW-TO-PLAY.md) |
| Understand the stack and code structure (contribute) | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |

## License

[MIT](./LICENSE)
