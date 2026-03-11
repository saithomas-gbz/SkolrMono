FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY .env ./

RUN npx prisma generate

RUN npm run build

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
