FROM oven/bun:latest AS build
WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile 

COPY . .

RUN bun run build 

FROM oven/bun:latest AS production
WORKDIR /app

COPY --from=build /app/.output /app/

EXPOSE 3003
ENTRYPOINT ["bun", "run", "/app/server/index.mjs"]
