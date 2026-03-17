FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
COPY package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

FROM base AS development
RUN npm ci
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
EXPOSE 3003

FROM base AS build
RUN npm ci
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

FROM base AS production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
WORKDIR /app/backend
EXPOSE 3003
CMD ["sh", "./scripts/docker-entrypoint.sh"]