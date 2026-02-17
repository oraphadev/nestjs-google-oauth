FROM node:24.13.0-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN pnpm build

FROM base AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nestjs:nodejs /app/src/modules/database ./src/modules/database

ENV NODE_ENV=production
ENV PORT=8081

EXPOSE 8081

USER nestjs

CMD ["sh", "-c", "pnpm db:migrate && pnpm start:prod"]
