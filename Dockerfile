# Stage 1: builds the frontend AND compiles the server (TypeScript ->
# JS via tsc). Only installs "dependencies" (not "devDependencies") on
# purpose — `canvas` (used only by my test scripts, not by the build
# itself) has no prebuilt binary for Alpine/musl and would break the
# build trying to compile from scratch. That's why `vite`, `typescript`,
# `@types/node` and `@vitejs/plugin-react` live in "dependencies" in
# package.json, even though that's not the most conventional place —
# they're what actually builds the game (`npm run build` = `vite build
# && npm run build:server`).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Stage 2: runtime — only what's needed to serve. server-dist/ is the
# already compiled (tsc) output of server.ts + src/server/*.ts as plain
# JS. Since the Google login feature needs `pg` (Postgres client) at
# runtime, this stage now also carries the build stage's node_modules
# (the same "dependencies" from package.json, minus devDependencies —
# dominated in practice by `pg`'s small dependency tree; the build-only
# tools like vite/typescript ride along unused, which is a fine
# trade-off for a personal project vs. the complexity of pruning them
# out package-by-package).
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server-dist ./server-dist

ENV STATIC_DIR=/app/dist
ENV SONGS_DIR=/songs
ENV PORT=5511

# Runs as an unprivileged user (the node:alpine image already ships
# with the "node" user ready) instead of root — the server only needs
# to read files, no reason to run as root. If the songs folder on the
# host has permissions restricted to a specific user/group, you may
# need to adjust it to be readable by "others" (often already the
# default on Unraid shares).
USER node

EXPOSE 5511

# Lets Docker/Unraid show a real up/down status instead of just "running".
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/api/songs" || exit 1

CMD ["node", "server-dist/server.js"]
