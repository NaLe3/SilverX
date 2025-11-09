FROM node:20

WORKDIR /app

# Copie manifest et config TS d'abord pour optimiser le cache
COPY package.json tsconfig.json ./
RUN npm install

# Copie tout le projet (incluant src/)
COPY . .

# Compile TypeScript en JavaScript (dist/)
RUN npm run build

EXPOSE 8080
CMD ["node", "dist/server.js"]
