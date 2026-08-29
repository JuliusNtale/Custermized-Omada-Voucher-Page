# ---------- build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
# npm ci requires package-lock.json; fall back to install for a fresh checkout.
RUN npm install --no-audit --no-fund \
      --fetch-retries=6 --fetch-retry-mintimeout=15000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- runtime stage ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
# `prisma` is a runtime dependency now (the entrypoint runs `prisma migrate
# deploy` against the SQLite file on every start).
RUN npm install --omit=dev --no-audit --no-fund \
      --fetch-retries=6 --fetch-retry-mintimeout=15000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

# The generated Prisma client (produced by `prisma generate` in the build
# stage, matching prisma/schema.prisma) - the fresh `npm install` above does
# NOT regenerate it, so it must be carried over explicitly.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY public ./public
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# SQLite database lives here on a mounted volume; must be writable by `node`.
RUN mkdir -p /data && chown -R node:node /data \
    && chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
USER node
ENTRYPOINT ["/app/docker-entrypoint.sh"]
