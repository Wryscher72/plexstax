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
ENV NODE_ENV=production PORT=7077
COPY --from=build /app/build ./build
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 7077
CMD ["node", "build"]
