FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package definitions
COPY packages/types/package.json ./packages/types/
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Build shared packages
RUN npm run build --workspace=@scaffold/types
RUN npm run build --workspace=@scaffold/schemas

# Build Web
RUN npm run build --workspace=web

# Production stage - pure static file serving
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
