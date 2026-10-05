FROM --platform=$BUILDPLATFORM node:22-alpine AS base
RUN apk add --no-cache libc6-compat bash
RUN corepack enable && corepack prepare pnpm@11.13.0 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM --platform=$BUILDPLATFORM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM --platform=$BUILDPLATFORM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_SHARP_PATH=/app/node_modules/sharp
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN --mount=type=cache,target=/app/.next/cache \
    pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=448"
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]