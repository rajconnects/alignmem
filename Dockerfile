# Decision Journal — Docker image
# Two-stage: build with dev deps, run with prod deps only.

FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS run

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/bin ./bin
COPY --from=build /app/engine ./engine
COPY --from=build /app/samples ./samples

EXPOSE 3000

CMD ["node", "bin/alignmink-dtp.mjs", "start", "--no-open"]
