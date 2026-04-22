# ---- Builder stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# ---- Runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=builder /app /app
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["npm", "run", "dev"]
