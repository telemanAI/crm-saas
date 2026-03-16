FROM node:20-alpine

WORKDIR /app

# Copia package.json dal frontend
COPY frontend/package*.json ./
RUN npm install

# Copia tutto il codice frontend
COPY frontend/ ./

# Build
RUN npm run build

# Espone la porta (Railway sovrascriverà con $PORT)
EXPOSE 3000

# Start con porta dinamica
CMD ["npm", "start"]