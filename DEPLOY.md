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
| `MUSIC_PATH` | `.env` (used by `docker-compose.yml`) | project's own `songs/` folder | Real folder on the host with the songs. If unset, falls back to the project's bundled `songs/` folder (only synthetic test songs) |
| `HOST_PORT` | `.env` | `5511` | Host port that points to the game |
| `PORT` | `.env` | `5511` | Port the server listens on inside the container |
| `PIPEHERO_SOURCE_PATH` | `.env` | `.` | Build context — only needed if `docker-compose.yml` lives somewhere other than the source code (e.g. Unraid's `appdata` layout) |
| `SONGS_DIR` | inside the container (already fixed in `docker-compose.yml`) | `/songs` | No need to touch — it's the internal mount point |
| `DATABASE_URL` | `.env` | unset (login disabled) | Connection string of your **existing** Postgres server — see "Login with Google" below |
| `GOOGLE_CLIENT_ID` | `.env` | unset (login disabled) | OAuth Client ID from Google Cloud Console — see "Login with Google" below |
| `SESSION_SECRET` | `.env` | unset (login disabled) | Random secret used to sign the session cookie — see "Login with Google" below |

## Login with Google (optional)

Without these three variables set, the "Log in with Google" button on
the menu stays locked (with an explanatory hint) and **the rest of the
game keeps working normally** — this is optional, not a requirement.

1. **Database**: you need a Postgres already running somewhere (this
   project doesn't spin up a new Postgres). If you already have an
   existing database (e.g. `postgres`) and prefer to isolate PipeHero
   in its **own schema** inside it, instead of a whole new database —
   connect as a user with privilege to create roles/schemas (usually
   `postgres`) — via `psql` or a GUI tool (pgAdmin, Adminer, DBeaver) —
   and run:

   ```sql
   -- Creates the user PipeHero will use. Generate a strong password, e.g.:
   -- openssl rand -base64 24
   CREATE USER pipehero WITH LOGIN PASSWORD 'change-this-to-a-strong-password';

   -- Connect to the existing database (e.g. postgres) and create a
   -- schema already owned by the pipehero user — it gets full control
   -- over just that schema, nothing else in the database.
   \c postgres
   CREATE SCHEMA pipehero AUTHORIZATION pipehero;

   -- Makes that user always "land" in this schema by default, so
   -- table names don't need to be qualified with "pipehero." — this is
   -- what lets the app create its tables in the right place without
   -- needing to know the database is shared.
   ALTER ROLE pipehero SET search_path TO pipehero;
   ```

   (If you'd rather have a fully separate database instead of a schema
   inside an existing one, swap the three commands above for
   `CREATE DATABASE pipehero OWNER pipehero;` and use that name instead
   of `postgres` in the connection string below — works the same, it's
   just a matter of how much isolation you want.)

   No need to create any table — `users`/`sessions` are created
   automatically inside the `pipehero` schema the first time the server
   boots, using that same user.

   Build the connection string with the existing database (not the
   schema — the schema is already resolved by the `search_path` set
   above):

   ```
   DATABASE_URL=postgres://pipehero:YOUR_PASSWORD@POSTGRES_HOST:5432/postgres
   ```

   **Watch out for `POSTGRES_HOST`** if Postgres runs on the same
   Unraid server but outside PipeHero's `docker-compose.yml`: from
   inside the container, `localhost`/`127.0.0.1` points at the
   container itself, not the host — use the Unraid server's LAN IP
   (e.g. `192.168.1.10`), not `localhost`.

2. **Google Cloud Console**: go to
   https://console.cloud.google.com/apis/credentials, create a project
   (if you don't have one yet) and click "Create Credentials" → "OAuth
   client ID" → type **"Web application"**.

   **Important — Google does not accept an IP address as an origin.**
   In "Authorized JavaScript origins" only these work: `http://localhost`
   (or `http://localhost:<port>`, only for testing on your own machine)
   or a **real hostname with HTTPS** — never a raw IP
   (`http://192.168.x.x:5511` will **never** work, with or without a
   port, with or without HTTPS). If you access the game through a
   domain with HTTPS (directly, behind a reverse proxy, or via a tunnel
   like Cloudflare/Tailscale), use that address — exactly as it appears
   in the browser's address bar, **no trailing slash, no path**:

   ```
   https://your-domain.example.com
   ```

   (No need to set "Authorized redirect URIs" — this flow doesn't use a
   redirect.) Copy the generated **Client ID** (not the secret — it's
   not used):

   ```
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```

   After saving, Google sometimes takes a few minutes to propagate the
   change — try an incognito tab or a hard refresh (Ctrl+Shift+R) if it
   errors right away. If it keeps saying "no registered origin" /
   "invalid_client", double check that the `GOOGLE_CLIENT_ID` in your
   `.env` is exactly the same Client ID you edited (easy to mix up if
   you've already created more than one while testing).

3. **Session secret** — any large random value, for example:

   ```
   SESSION_SECRET=$(openssl rand -hex 32)
   ```

   Changing this value later logs everyone out (the session cookie no
   longer matches the signature).

4. `docker compose up -d --build` again to apply the new variables.

**If the server's IP changes** (DHCP), login stops working until you
add the new address to "Authorized JavaScript origins" in Google Cloud
Console — worth considering a fixed IP for the server on your network.

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
