FROM oven/bun:latest
WORKDIR /app

COPY package.json tsconfig.json ./

COPY packages/class-service/ ./packages/class-service/

WORKDIR /app/packages/class-service

RUN ls -R src

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

RUN chmod +x docker-entrypoint.sh

EXPOSE 3003
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
