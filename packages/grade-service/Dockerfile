FROM oven/bun:latest
WORKDIR /app

COPY package.json tsconfig.json ./

COPY packages/grade-service/ ./packages/grade-service/

WORKDIR /app/packages/grade-service

RUN bun install
RUN bun prisma generate

RUN bun build ./src/app.ts --outdir ./dist --target node --external @prisma/client --external .prisma/client

RUN chmod +x docker-entrypoint.sh

EXPOSE 3007
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "dist/app.js"]
