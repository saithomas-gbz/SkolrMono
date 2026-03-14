FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./

COPY packages/auth-service/ ./packages/auth-service/

WORKDIR /app/packages/auth-service

RUN ls -R src

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

EXPOSE 3000
CMD ["bun", "dist/app.js"]
