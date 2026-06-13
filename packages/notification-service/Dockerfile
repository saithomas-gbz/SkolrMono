FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./

COPY packages/rabbitmq/ ./packages/rabbitmq/
COPY packages/notification-service/ ./packages/notification-service/

WORKDIR /app/packages/notification-service

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

RUN chmod +x docker-entrypoint.sh

EXPOSE 3009
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
