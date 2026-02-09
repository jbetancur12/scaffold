FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package definitions
COPY packages/types/package.json ./packages/types/
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Build shared packages
RUN npm run build --workspace=@scaffold/types
RUN npm run build --workspace=@scaffold/schemas

# Build API
RUN npm run build --workspace=api

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Set working directory to api for execution context if needed, or run from root
WORKDIR /app

# Expose API port
EXPOSE 5050

# Start command (adjust path to main.js)
CMD ["node", "apps/api/dist/apps/api/src/index.js"]
