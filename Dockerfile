FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/backend apps/backend
COPY apps/frontend/dist apps/frontend/dist
COPY packages/shared-types packages/shared-types

RUN test -f apps/backend/dist/server.js
RUN test -f apps/frontend/dist/index.html

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @terminal-poker/backend prisma:generate

ENV NODE_ENV=production

WORKDIR /app/apps/backend
EXPOSE 4000

CMD ["node", "dist/server.js"]
