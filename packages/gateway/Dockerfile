FROM oven/bun:latest

WORKDIR /app

COPY package*.json ./

RUN bun install --production

COPY . .

RUN bun run build

EXPOSE 3001

CMD ["bun", "run", "start"]
