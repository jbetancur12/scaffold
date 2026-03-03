#!/bin/bash

# --- Configuración ---
COMPOSE_FILE="docker-compose.prod.yml"
API_CONTAINER="mrp-app-api-1"

echo "🚀 Iniciando despliegue de mrp-app..."

# 1. Traer los últimos cambios
echo "📥 Actualizando código desde Git..."
git pull origin main

# 2. Reconstruir imágenes
echo "🏗️  Reconstruyendo imágenes (esto puede tardar un poco)..."
docker compose -f $COMPOSE_FILE build --no-cache

# 3. Levantar servicios
echo "🆙 Reiniciando contenedores..."
docker compose -f $COMPOSE_FILE up -d

# 4. Limpieza de imágenes huérfanas (opcional pero recomendado)
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

# 5. Ejecutar migraciones automáticamente (modo producción)
echo "🗄️  Ejecutando migraciones de base de datos..."
docker compose -f $COMPOSE_FILE exec -T api npm run migration:prod --workspace=api

echo "✅ ¡Despliegue completado con éxito!"
echo "🌐 Revisa tu sitio en: https://color.betancur.work"
