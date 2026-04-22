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
EXPOSE 3000
CMD ["npm", "run", "dev"]
