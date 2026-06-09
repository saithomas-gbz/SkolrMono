FROM oven/bun:latest
WORKDIR /app

COPY package.json tsconfig.json ./

COPY packages/rabbitmq/ ./packages/rabbitmq/
COPY packages/notification-service/ ./packages/notification-service/

WORKDIR /app/packages/notification-service

RUN bun install

RUN bun build ./src/app.ts --outdir ./dist --target node

EXPOSE 3009
CMD ["bun", "dist/app.js"]
