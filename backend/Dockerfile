FROM node:20-slim

WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Verifica cosa c'è in dist
RUN ls -la dist/

EXPOSE 3001


# Esegui le migration prima di avviare l'app
CMD ["sh", "-c", "npm run migration:run && node dist/main"]