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

# Copy tsconfig files
COPY tsconfig.json ./
COPY packages/config ./packages/config

# Copy source code
COPY packages ./packages
COPY apps/web ./apps/web

# Build shared packages
RUN npm run build --workspace=@scaffold/types
RUN npm run build --workspace=@scaffold/schemas

# Build Web with ARG
ARG VITE_API_URL=http://localhost:5050
ENV VITE_API_URL=$VITE_API_URL

RUN echo "Building with VITE_API_URL=$VITE_API_URL" && \
    npm run build --workspace=web

# ⭐ Verificar que el build se generó correctamente
RUN echo "=== Checking web dist ===" && \
    ls -la ./apps/web/dist/ && \
    echo "=== Checking index.html ===" && \
    ls -la ./apps/web/dist/index.html

# Production stage - pure static file serving
FROM nginx:alpine

# ⭐ Copiar archivos estáticos
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# ⭐ Copiar configuración de Nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# ⭐ Verificar que los archivos se copiaron
RUN echo "=== Nginx html directory ===" && \
    ls -la /usr/share/nginx/html/

# ⭐ Crear usuario nginx si no existe (mejora de seguridad)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# ⭐ Cambiar a usuario no-root
USER nginx

# Expose port 80
EXPOSE 80

# ⭐ Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]