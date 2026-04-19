# ─── Stage 1: Install wasm-pack + build the web app ────────────────────────────
FROM node:22-slim AS builder

# Install system deps for wasm-pack and Rust
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      ca-certificates \
      build-essential \
      pkg-config \
      libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust + wasm-pack
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup target add wasm32-unknown-unknown
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json       packages/shared/
COPY packages/document/package.json     packages/document/
COPY packages/ai/package.json           packages/ai/
COPY packages/sync/package.json         packages/sync/
COPY packages/sync-rs/package.json      packages/sync-rs/
COPY packages/geometry/package.json     packages/geometry/
COPY packages/app/package.json          packages/app/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build --filter '@opencad/app...'

# ─── Stage 2: Serve the SPA on Cloud Run ────────────────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g serve@14

COPY --from=builder /app/packages/app/dist /app

# Cloud Run injects $PORT at runtime (default 8080).
# `serve -s` enables SPA mode: unknown paths fall back to index.html.
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s /app -l $PORT"]
