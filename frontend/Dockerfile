# Multi-stage build: only the final "runner" stage's contents end up in the
# image that actually ships -- the deps/builder stages (full node_modules,
# build cache, source) are discarded, so the runtime image only carries
# next.config.mjs's standalone output plus static assets.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are baked into the client bundle at build time, not
# read at container start -- must be passed as build args, not just runtime
# env vars, or the frontend silently keeps whatever default is in the code.
# NEXT_PUBLIC_API_URL matters most: lib/api.js's browser-side client fetches
# this URL directly (not through this app's own server), so it must be the
# real public URL the backend is reachable at, not an internal Docker
# hostname the visitor's browser could never resolve.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# The standalone build's own server.js expects these copied alongside it in
# this exact shape -- see Next.js's own docs on output:"standalone".
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# node:slim images already ship a non-root "node" user.
USER node

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
