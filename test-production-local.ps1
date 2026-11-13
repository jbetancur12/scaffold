# test-production-local.ps1

Write-Host "🚀 Testing Production Build Locally" -ForegroundColor Green

# 1. Detener desarrollo
Write-Host "`n📍 Stopping development services..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down

# 2. Backup .env
if (Test-Path .env) {
    Copy-Item .env .env.backup -Force
    Write-Host "✅ .env backed up" -ForegroundColor Green
}

# 3. Crear .env de producción local
@"
#===========================================
# GENERAL
#===========================================
NODE_ENV=production

#===========================================
# DATABASE
#===========================================
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=scaffold_db
DB_PORT=5434

#===========================================
# REDIS
#===========================================
REDIS_PORT=6381

#===========================================
# API
#===========================================
API_PORT=5050
PORT=5050
CORS_ORIGIN=http://localhost:8080

# JWT Configuration
JWT_SECRET=local-production-test-secret-min-32-characters-long-change-this
JWT_REFRESH_SECRET=local-production-refresh-secret-min-32-chars-change-this

#===========================================
# WEB
#===========================================
WEB_PORT=8080
VITE_API_URL=http://localhost:5050
"@ | Out-File -FilePath .env -Encoding utf8

Write-Host "✅ Production .env created" -ForegroundColor Green

# 4. Limpiar contenedores anteriores
Write-Host "`n🧹 Cleaning previous builds..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down -v

# 5. Build (esto puede tardar varios minutos)
Write-Host "`n🔨 Building images..." -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes on first build..." -ForegroundColor Gray
docker-compose -f docker-compose.prod.yml build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    Write-Host "Check the errors above and fix them before deploying to VPS" -ForegroundColor Yellow
    
    # Restaurar .env
    if (Test-Path .env.backup) {
        Copy-Item .env.backup .env -Force
    }
    exit 1
}

Write-Host "`n✅ Build successful!" -ForegroundColor Green

# 6. Levantar servicios
Write-Host "`n🚀 Starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# 7. Esperar a que inicien
Write-Host "`n⏳ Waiting for services to be ready..." -ForegroundColor Yellow
$seconds = 40
for ($i = $seconds; $i -gt 0; $i--) {
    Write-Host "`r   Waiting... $i seconds remaining" -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 1
}
Write-Host ""

# 8. Verificar estado
Write-Host "`n🔍 Service status:" -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

# 9. Verificar health de API
Write-Host "`n🏥 Checking API health..." -ForegroundColor Yellow
$maxRetries = 5
$retryCount = 0
$apiHealthy = $false

while ($retryCount -lt $maxRetries -and -not $apiHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5050/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ API is healthy!" -ForegroundColor Green
            Write-Host $response.Content -ForegroundColor Gray
            $apiHealthy = $true
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "   Retry $retryCount/$maxRetries..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }
}

if (-not $apiHealthy) {
    Write-Host "⚠️  API health check failed" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose -f docker-compose.prod.yml logs api" -ForegroundColor Yellow
}

# 10. Verificar Web
Write-Host "`n🌐 Checking Web..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Web health check failed" -ForegroundColor Yellow
}

# 11. Mostrar resumen
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ PRODUCTION TEST IS RUNNING!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

Write-Host "`n📍 URLs:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend:  http://localhost:8080" -ForegroundColor White
Write-Host "   🔌 API:       http://localhost:5050/health" -ForegroundColor White
Write-Host "   📊 Swagger:   http://localhost:5050/api-docs" -ForegroundColor White

Write-Host "`n📝 Useful commands:" -ForegroundColor Cyan
Write-Host "   View all logs:     docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
Write-Host "   View API logs:     docker-compose -f docker-compose.prod.yml logs -f api" -ForegroundColor Gray
Write-Host "   View Web logs:     docker-compose -f docker-compose.prod.yml logs -f web" -ForegroundColor Gray
Write-Host "   Restart API:       docker-compose -f docker-compose.prod.yml restart api" -ForegroundColor Gray
Write-Host "   Stop all:          docker-compose -f docker-compose.prod.yml down" -ForegroundColor Gray
Write-Host "   Clean everything:  docker-compose -f docker-compose.prod.yml down -v" -ForegroundColor Gray

Write-Host "`n🔙 To return to development:" -ForegroundColor Cyan
Write-Host "   1. docker-compose -f docker-compose.prod.yml down" -ForegroundColor Gray
Write-Host "   2. Copy-Item .env.backup .env -Force" -ForegroundColor Gray
Write-Host "   3. npm run db:up" -ForegroundColor Gray
Write-Host "   4. npm run dev" -ForegroundColor Gray

Write-Host "`n" -NoNewline
Read-Host "Press ENTER to view logs (Ctrl+C to exit)"

docker-compose -f docker-compose.prod.yml logs -f