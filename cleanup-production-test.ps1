# cleanup-production-test.ps1

Write-Host "🧹 Cleaning up production test..." -ForegroundColor Yellow

# Detener servicios de producción
docker-compose -f docker-compose.prod.yml down -v

# Restaurar .env de desarrollo
if (Test-Path .env.backup) {
    Copy-Item .env.backup .env -Force
    Write-Host "✅ .env restored" -ForegroundColor Green
}

# Limpiar imágenes no utilizadas (opcional)
Write-Host "`nDo you want to remove unused Docker images? (Y/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq 'Y' -or $response -eq 'y') {
    docker image prune -a -f
    Write-Host "✅ Unused images removed" -ForegroundColor Green
}

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
Write-Host "You can now start development with: npm run dev" -ForegroundColor Cyan