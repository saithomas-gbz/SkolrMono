FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./

COPY packages/billing-service/ ./packages/billing-service/

WORKDIR /app/packages/billing-service

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

RUN chmod +x docker-entrypoint.sh

EXPOSE 3011
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
