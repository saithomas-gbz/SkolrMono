FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY .env ./

# Install dotenv for prisma config
RUN npm install dotenv

RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
