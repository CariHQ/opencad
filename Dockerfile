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

# ─── Stage 2: Serve with nginx ──────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copy built app
COPY --from=builder /app/packages/app/dist /usr/share/nginx/html

# SPA routing: all paths fall back to index.html
RUN printf 'server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    # Forward /api requests upstream (Cloud Run sidecar / backend service)\n\
    location /api/ {\n\
        proxy_pass http://localhost:8081;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json application/wasm;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
