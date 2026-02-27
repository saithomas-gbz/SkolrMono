FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

RUN npx prisma generate

RUN npx prisma migrate deploy

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
