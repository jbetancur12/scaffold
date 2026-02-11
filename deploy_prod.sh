#!/bin/bash

set -e

echo "🚀 Starting Deployment Process..."

# Load environment variables
if [ -f .env.production ]; then
  echo "📄 Loading .env.production..."
  export $(grep -v '^#' .env.production | xargs)
else
  echo "⚠️  .env.production not found. Make sure env vars are set."
fi

echo "⬇️  Pulling latest code..."
git pull origin main

echo "🛑 Stopping old containers..."
docker compose -f docker-compose.prod.yml down

echo "🏗️  Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for containers to be healthy..."
sleep 10

echo "✅ Deployment Complete! Current status:"
docker compose -f docker-compose.prod.yml ps
