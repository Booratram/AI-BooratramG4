FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
COPY frontend/package.json ./frontend/package.json

FROM base AS development
RUN npm install
COPY frontend ./frontend
WORKDIR /app/frontend
EXPOSE 5173

FROM base AS build
RUN npm install
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
