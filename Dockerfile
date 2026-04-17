# Root Dockerfile delegates to the Rust server image.
# Build from the repo root:  docker build -f server/Dockerfile server/
# Or use docker-compose:     docker compose up
#
# See server/Dockerfile for the full multi-stage build.
# See docker-compose.yml for local development with PostgreSQL.
