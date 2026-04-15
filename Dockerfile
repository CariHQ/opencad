# OpenCAD API Server — Production Docker Image
FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/document/package.json packages/document/
COPY packages/ai/package.json packages/ai/
COPY packages/sync/package.json packages/sync/
RUN pnpm install --frozen-lockfile --prod

# Build
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Production image
FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 opencad && \
    adduser --system --uid 1001 opencad
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/sync/dist ./packages/sync/dist
COPY --from=builder /app/packages/document/dist ./packages/document/dist
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/package.json ./

USER opencad
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "packages/sync/dist/server.js"]
