FROM node:20-alpine

WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Verifica cosa c'è in dist
RUN ls -la dist/

EXPOSE 3001

CMD ["node", "dist/main"]