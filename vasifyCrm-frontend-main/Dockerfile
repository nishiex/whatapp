# Stage 1: build
FROM node:22-alpine AS builder

WORKDIR /app

RUN addgroup -g 1001 nodejs && adduser -S nextjs -u 1001

RUN npm install -g pnpm@latest

COPY package.json /app

COPY package-lock.json /app

RUN pnpm install

COPY . /app

RUN pnpm build

# Stage 2: runtime
FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Security hardening
RUN addgroup -g 1001 nodejs && adduser -S nextjs -u 1001

# Copy ONLY what Next.js needs at runtime
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost:8004/ || exit 1

CMD ["node_modules/.bin/next", "start"]
