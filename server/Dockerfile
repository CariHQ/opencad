# ── Build stage ────────────────────────────────────────────────────────────────
FROM rust:slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Cache dependencies by building a stub first.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Build the real source.
COPY src ./src
COPY migrations ./migrations
# Touch main.rs so cargo knows to rebuild
RUN touch src/main.rs && cargo build --release

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 opencad && \
    adduser  --system --uid 1001 --ingroup opencad opencad

WORKDIR /app
COPY --from=builder /build/target/release/opencad-server .

USER opencad
EXPOSE 3000
ENV PORT=3000 \
    RUST_LOG=opencad_server=info,tower_http=info

CMD ["./opencad-server"]
