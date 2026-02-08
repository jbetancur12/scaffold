#!/bin/bash

# Stop script on error
set -e

echo "🚀 Starting Deployment Process..."

# Load environment variables
if [ -f .env.production ]; then
  echo "📄 Loading .env.production..."
  export $(cat .env.production | xargs)
else
  echo "⚠️  Warning: .env.production file not found. Ensuring vars are set in environment."
fi

# Pull latest code
echo "⬇️  Pulling latest code..."
git pull origin main

# Build and start containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
echo "🐘 Running Database Migrations..."
docker compose -f docker-compose.prod.yml exec api npm run migration:up

# Check status
echo "✅ Deployment Complete! Status:"
docker compose -f docker-compose.prod.yml ps
