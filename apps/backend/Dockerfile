FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --no-frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY apps/backend apps/backend

RUN pnpm --filter @terminal-poker/backend prisma:generate
RUN pnpm --filter @terminal-poker/shared-types build
RUN pnpm --filter @terminal-poker/backend build

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app /app

WORKDIR /app/apps/backend
EXPOSE 4000

CMD ["node", "dist/server.js"]

