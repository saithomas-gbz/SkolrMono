FROM oven/bun:1.3.14
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./

# Fixtures de dev partagées : prisma/seed.ts importe ../../../scripts/seed/dev-users
# (résout /app/scripts/seed/dev-users). Sans ça, `prisma db seed` plante dans l'image (#88).
COPY scripts/seed/ ./scripts/seed/

COPY packages/backend/ ./packages/backend/

WORKDIR /app/packages/backend

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node \
  --external @prisma/client --external .prisma/client \
  --external @fastify/websocket --external ws

RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
