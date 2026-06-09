FROM oven/bun:latest
WORKDIR /app

COPY package.json tsconfig.json ./

COPY packages/rabbitmq/ ./packages/rabbitmq/
COPY packages/planning-services/ ./packages/planning-services/

WORKDIR /app/packages/planning-services

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

RUN chmod +x docker-entrypoint.sh

EXPOSE 3008
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
