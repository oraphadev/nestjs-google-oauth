FROM node:24.13.0-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM node:24.13.0-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN pnpm db:migrate

RUN pnpm build

RUN pnpm prune --prod

FROM node:24.13.0-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nestjs:nodejs /app/src/modules/database ./src/modules/database

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

USER nestjs

CMD ["node", "dist/src/main.js"]