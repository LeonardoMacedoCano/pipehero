# Stage 1: builds the frontend AND compiles the server (TypeScript ->
# JS via tsc). Only installs "dependencies" (not "devDependencies") on
# purpose — `canvas` (used only by my test scripts, not by the build
# itself) has no prebuilt binary for Alpine/musl and would break the
# build trying to compile from scratch. That's why `vite`, `typescript`
# and `@types/node` live in "dependencies" in package.json, even though
# that's not the most conventional place — they're what actually builds
# the game (`npm run build` = `vite build && npm run build:server`).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Stage 2: runtime — only what's needed to serve. server-dist/ is the
# already compiled (tsc) output of server.ts + src/server/*.ts as plain
# JS — the runtime has no TypeScript or any other package from
# node_modules installed (only Node's native modules).
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
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
CMD ["node", "server-dist/server.js"]
