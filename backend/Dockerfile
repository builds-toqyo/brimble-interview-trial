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
RUN apk add --no-cache git docker-cli curl bash ca-certificates tar

# Install mise (required by Railpack for tool management)
RUN curl -fsSL https://mise.run | sh \
    && echo 'export PATH="$HOME/.local/bin:$PATH"' >> /etc/profile \
    && export PATH="$HOME/.local/bin:$PATH"

# Install Railpack (https://railpack.com/). Provides the `railpack` binary
# that shells out to docker buildx with the railpack BuildKit frontend.
# `-f` skips the confirmation prompt. Installs to /usr/local/bin by default.
RUN export PATH="$HOME/.local/bin:$PATH" \
    && curl -fsSL https://railpack.com/install.sh | bash -s -- -f \
    && export PATH="$HOME/.local/bin:$PATH" \
    && railpack --version

COPY --from=builder /app /app
RUN mkdir -p /app/data /app/workspace
EXPOSE 3001
CMD ["npm", "run", "dev"]
