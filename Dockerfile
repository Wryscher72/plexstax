# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Run stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=7077 HOST=0.0.0.0
COPY --from=build /app/build ./build
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 7077
# Basic healthcheck using busybox wget (available in alpine images)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O - http://127.0.0.1:7077/healthz || exit 1
CMD ["node", "build"]
