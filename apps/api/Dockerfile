FROM node:20-bookworm-slim AS builder

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

# Copy tsconfig files
COPY tsconfig.json ./
COPY packages/config ./packages/config

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

# Build shared packages
RUN npm run build --workspace=@scaffold/types
RUN npm run build --workspace=@scaffold/schemas

# Build API
RUN npm run build --workspace=api

# Production stage
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Copy workspace package definitions for npm to recognize workspaces
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Install ONLY production dependencies
RUN npm ci --omit=dev --workspace=api --workspace=@scaffold/types --workspace=@scaffold/schemas

# PDF rendering dependencies (Playwright + Chromium only)
RUN npm install --no-save playwright pug && \
    npx playwright install --with-deps chromium

# Copy built packages (dist folders)
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist

# Copy API built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# IMPORTANT: Copy migrations separately (if they're not in dist)
# If migrations are .ts files, you might need to copy them
COPY --from=builder /app/apps/api/src/migrations ./apps/api/dist/apps/api/src/migrations

# ⭐ Verificar la estructura final
RUN echo "=== Final dist structure ===" && \
    ls -la ./apps/api/dist/ && \
    echo "=== Final src structure ===" && \
    ls -la ./apps/api/dist/apps/api/src/ && \
    echo "=== Migrations check ===" && \
    ls -la ./apps/api/dist/apps/api/src/migrations/ && \
    echo "=== Modules check ===" && \
    ls -la ./apps/api/dist/apps/api/src/modules/ || true

RUN echo "=== BUSCANDO SCRIPT DE MIGRACION ===" && \
    find ./apps/api/dist -name "run-migration.js"

# Set environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose API port
EXPOSE 5050

# Health check (opcional pero recomendado)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5050/health || exit 1

# Start command
CMD ["node", "apps/api/dist/apps/api/src/index.js"]
