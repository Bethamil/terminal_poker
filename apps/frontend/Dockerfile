FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --no-frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY apps/frontend apps/frontend

ARG VITE_API_BASE_URL=https://api.poker.example.com
ARG VITE_SOCKET_URL=https://api.poker.example.com
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN pnpm --filter @terminal-poker/shared-types build
RUN pnpm --filter @terminal-poker/frontend build

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

