FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/package.json

FROM base AS development
RUN npm install
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
EXPOSE 3003

FROM base AS production-deps
RUN npm install --omit=dev
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate

FROM node:20-alpine AS production
WORKDIR /app/backend
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=production-deps /app/backend /app/backend
WORKDIR /app/backend
RUN npm run build
EXPOSE 3003
CMD ["npm", "run", "start"]
