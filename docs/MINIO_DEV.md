# MinIO en desarrollo (puertos alternos)

En este proyecto, para desarrollo, MinIO corre en `docker-compose.dev.yml` con puertos alternos:

- API S3: `http://localhost:9010`
- Consola: `http://localhost:9011`
- Usuario: `minioadmin`
- Password: `minioadmin`

## Levantar servicios

```bash
npm run db:up
```

## Estado actual de documentos controlados

Actualmente los archivos de documentos controlados se guardan en disco local del API:

- `storage/quality-documents`

## Activar MinIO como backend de almacenamiento

En `.env` (raíz) configura:

```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9010
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=mrp-quality-documents
```

Si `STORAGE_PROVIDER=minio` pero MinIO no está disponible, el sistema hace fallback a local.
