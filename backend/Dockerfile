FROM node:22-bullseye-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .

FROM node:22-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=development

RUN apt-get update && apt-get install -y \
    git \
    docker.io \
    curl \
    ca-certificates \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Install mise globally (required by Railpack for tool management)
RUN curl https://mise.jdx.dev/install.sh | sh \
    && cp /root/.local/bin/mise /usr/local/bin/mise \
    && chmod +x /usr/local/bin/mise

# Install Railpack (https://railpack.com/). Provides the `railpack` binary
# that shells out to docker buildx with the railpack BuildKit frontend.
# `-f` skips the confirmation prompt. Installs to /usr/local/bin by default.
RUN export PATH="$HOME/.local/bin:$PATH" \
    && curl -fsSL https://railpack.com/install.sh | bash -s -- -f \
    && export PATH="$HOME/.local/bin:$PATH" \
    && railpack --version

# Setup the symlink trick for the specific version Railpack wants
RUN mkdir -p /tmp/railpack/mise \
    && ln -s /usr/local/bin/mise /tmp/railpack/mise/mise-2026.3.17 \
    && chmod -R 777 /tmp/railpack

COPY --from=builder /app /app
RUN mkdir -p /app/data /app/workspace
EXPOSE 3001
CMD ["npm", "run", "dev"]
