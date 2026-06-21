FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./

COPY scripts/seed/ ./scripts/seed/
COPY packages/parent-service/ ./packages/parent-service/

WORKDIR /app/packages/parent-service

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

RUN chmod +x docker-entrypoint.sh

EXPOSE 3012
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
