# syntax=docker/dockerfile:1

# Base image shared by every stage. Dependencies are installed here so they are
# cached independently of the application source, which also makes the
# development volume mount fast to boot.
FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Development stage: used by docker-compose with the source bind-mounted and
# `tsx watch` providing hot reload.
FROM base AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3002
CMD ["npm", "run", "dev"]

# Compile TypeScript for the production image.
FROM base AS build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# Slim runtime image for production / Render worker deployments.
FROM node:20-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
