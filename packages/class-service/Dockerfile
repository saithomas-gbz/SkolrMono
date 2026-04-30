FROM oven/bun:latest
WORKDIR /app

COPY package.json tsconfig.json ./

COPY packages/class-service/ ./packages/class-service/

WORKDIR /app/packages/class-service

RUN ls -R src

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

EXPOSE 3003
CMD ["bun", "dist/app.js"]
