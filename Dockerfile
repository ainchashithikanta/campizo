# Stage 1: Build Workspace
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools required for C++ addons on Alpine musl
RUN apk add --no-cache python3 make g++ libc6-compat

# Enable pinned pnpm package manager via Corepack
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/ ./apps/
COPY modules/ ./modules/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @college-hub/api... build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder --chown=nodeuser:nodejs /app/apps/api ./apps/api
COPY --from=builder --chown=nodeuser:nodejs /app/modules ./modules
COPY --from=builder --chown=nodeuser:nodejs /app/packages ./packages
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

USER nodeuser

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-4000}/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
