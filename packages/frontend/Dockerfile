FROM oven/bun:latest AS build
WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile 

COPY . .

RUN bun run build 

# Dev stage: source + deps, runs the Nuxt dev server (used by docker-compose).
FROM oven/bun:latest AS dev
WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3003
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "3003"]

FROM oven/bun:latest AS production
WORKDIR /app

COPY --from=build /app/.output /app/
# .output n'est pas autonome (nuxt.config.ts: nitro.externals.trace=false) et
# référence des deps externalisées (ex. @sentry/core) à l'exécution.
COPY --from=build /app/node_modules /app/node_modules

ENV PORT=3003
EXPOSE 3003
ENTRYPOINT ["bun", "run", "/app/server/index.mjs"]
