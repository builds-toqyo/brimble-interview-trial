# ---- Builder stage ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .

# ---- Runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development

# Tools the pipeline needs at runtime:
#   git      - to clone user repos
#   docker   - CLI to talk to the docker.sock bind-mounted from host
#   curl     - to fetch railpack binary & hit Caddy admin API
#   bash     - railpack install script needs bash
RUN apk add --no-cache git docker-cli curl bash ca-certificates

# Install Railpack (https://railpack.com/). Provides the `railpack` binary
# that shells out to docker buildx with the railpack BuildKit frontend.
RUN curl -fsSL https://railpack.com/install.sh | bash \
    && mv /root/.railpack/bin/railpack /usr/local/bin/railpack 2>/dev/null || true \
    && railpack --version || echo "railpack not on PATH — backend will shell to it if installed"

COPY --from=builder /app /app
RUN mkdir -p /app/data /app/workspace
EXPOSE 3001
CMD ["npm", "run", "dev"]
