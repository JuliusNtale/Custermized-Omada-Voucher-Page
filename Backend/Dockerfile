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
RUN npm install --omit=dev --no-audit --no-fund \
      --fetch-retries=6 --fetch-retry-mintimeout=15000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

# The generated Prisma client (produced by `prisma generate` in the build
# stage, matching prisma/schema.prisma) - the fresh `npm install` above does
# NOT regenerate it, so it must be carried over explicitly or every model
# type is missing at runtime.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=build /app/dist ./dist
COPY public ./public

EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]