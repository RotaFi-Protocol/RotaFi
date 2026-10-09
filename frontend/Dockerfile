# syntax=docker/dockerfile:1

# Base image shared by every stage. Dependencies are installed here so they are
# cached independently of the application source, which also makes the
# development volume mount fast to boot.
FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Development stage: used by docker-compose with the source bind-mounted and
# the Next.js dev server providing hot reload.
FROM base AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Produce the optimized Next.js build.
FROM base AS build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# Slim runtime image for production / Vercel-style deployments.
FROM node:20-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./
EXPOSE 3000
USER node
CMD ["npm", "start"]
