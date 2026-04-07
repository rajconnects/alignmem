# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY reader/package*.json ./
RUN npm ci

COPY reader/ ./
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS run

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
