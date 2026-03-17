FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

FROM base AS development
RUN npm ci
COPY frontend ./frontend
WORKDIR /app/frontend
EXPOSE 5173

FROM base AS build
RUN npm ci
COPY frontend ./frontend
WORKDIR /app/frontend
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
