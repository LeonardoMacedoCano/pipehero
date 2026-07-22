# Deploy on Unraid (or any Docker server)

**Important:** this guide was written and the Dockerfile was validated
as much as possible **without Docker available** in the environment
where it was developed — I simulated what I could, but a real `docker
build`/`docker compose up` has **never actually run**. Treat the first
deploy as a test, not as something guaranteed.

## Step by step

1. Copy the whole `pipehero/` folder to your Unraid server (or clone
   the repository there, if you're using git).

2. Inside `pipehero/`, copy the example environment file:

   ```
   cp .env.example .env
   ```

3. Edit `.env` and set `MUSIC_PATH` to the real path of your songs
   folder on Unraid — for example:

   ```
   MUSIC_PATH=/mnt/user/guitar-hero-songs
   ```

   That folder should contain one subfolder per song, each with:
   - `notes.chart` (required)
   - an audio file: `.ogg`, `.mp3` or `.wav` (optional, but without
     audio the song plays "muted")
   - `song.ini` (optional — without it, the menu uses the folder name)

   This is exactly the folder format Clone Hero already uses, so songs
   downloaded for it should work here directly, with no reorganizing
   needed (depending on device/chart performance, see the note about
   limitations at the end of this file).

4. Start the container:

   ```
   docker compose up -d --build
   ```

5. Access `http://<server-ip>:5511` from any PC on your home network.

## Environment variables

| Variable | Where | Default | What it is |
|---|---|---|---|
| `MUSIC_PATH` | `.env` (used by `docker-compose.yml`) | — (required) | Real folder on the host with the songs |
| `HOST_PORT` | `.env` | `5511` | Host port that points to the game |
| `PORT` | `.env` | `5511` | Port the server listens on inside the container |
| `PIPEHERO_SOURCE_PATH` | `.env` | `.` | Build context — only needed if `docker-compose.yml` lives somewhere other than the source code (e.g. Unraid's `appdata` layout) |
| `SONGS_DIR` | inside the container (already fixed in `docker-compose.yml`) | `/songs` | No need to touch — it's the internal mount point |

## Running without Docker (directly on the server)

If you'd rather not use Docker:

```
npm install
npm run build
SONGS_DIR=/mnt/user/guitar-hero-songs PORT=5511 npm start
```

## Updating after changing the code

```
docker compose up -d --build
```

`--build` rebuilds the image with the changes. **Adding new songs to
the folder does NOT need this** — the list is read every time the menu
loads, so just drop the new folder into `MUSIC_PATH` and refresh the
browser (F5).

## What I couldn't validate (no Docker in this environment)

- Whether the image actually builds without errors with a real `docker
  build` (I simulated the equivalent with `npm ci --omit=dev` + `npm
  run build` outside Docker, and the runtime stage copying only the
  final files into an isolated folder — both worked, but Docker itself
  has its own variables, like the network layer and Alpine's exact
  behavior).
- Latency when accessing from another PC on the network — since the
  entire game runs in the browser of whoever accesses it (its own web
  engine, not desktop streaming), the only network latency is loading
  the files (chart + audio) once, not during gameplay. Still worth
  testing from a PC genuinely different from the server.
- Compatibility with *real* Clone Hero songs — most of the development
  and automated tests use synthetic charts and songs (generated, with
  no connection to any real song). The parser (ParseHero) has already
  been validated separately against complex real charts, but the full
  song folder (chart + real audio together, read by the server) has
  more limited coverage.
- The container runs as an unprivileged user (`USER node` in the
  Dockerfile, instead of root) — if the folder pointed to by
  `MUSIC_PATH` has permissions restricted to a specific host
  user/group, you may need to make it readable by "others". Default
  Unraid shares are usually already readable by any user, but this has
  never been tested with real Docker.

**Recommended action when you test this:** start with 1-2 real songs
before copying the whole library, to make it easier to isolate a
problem if something doesn't work.
