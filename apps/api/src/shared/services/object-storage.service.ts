import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';

type MinioClient = {
    bucketExists: (bucket: string) => Promise<boolean>;
    makeBucket: (bucket: string, region: string) => Promise<void>;
    putObject: (bucket: string, objectName: string, data: Buffer, size: number, metaData?: Record<string, string>) => Promise<unknown>;
    getObject: (bucket: string, objectName: string) => Promise<NodeJS.ReadableStream>;
    removeObject: (bucket: string, objectName: string) => Promise<void>;
};

export class ObjectStorageService {
    private minioClientPromise?: Promise<MinioClient | null>;
    private minioBucketReady = false;

    private get localStorageDir() {
        return resolve(process.cwd(), 'storage', 'quality-documents');
    }

    private sanitizeFileName(fileName: string) {
        return basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    private buildLocalStoragePath(fileName: string) {
        const safeName = this.sanitizeFileName(fileName);
        const persistedName = `${Date.now()}-${randomUUID()}-${safeName}`;
        return {
            absolutePath: resolve(this.localStorageDir, persistedName),
            storagePath: `local:storage/quality-documents/${persistedName}`,
        };
    }

    private async createMinioClient(): Promise<MinioClient | null> {
        if (env.STORAGE_PROVIDER !== 'minio') {
            return null;
        }

        if (!env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
            console.warn('[storage] MINIO_ACCESS_KEY / MINIO_SECRET_KEY no configurados. Se usará almacenamiento local.');
            return null;
        }

        const endpoint = env.MINIO_ENDPOINT || 'http://localhost:9010';
        try {
            const parsed = new URL(endpoint);
            const minioModule = await (Function('return import("minio")')() as Promise<{
                Client?: new (options: Record<string, unknown>) => MinioClient;
                default?: { Client?: new (options: Record<string, unknown>) => MinioClient };
            }>);
            const ClientCtor = minioModule.Client ?? minioModule.default?.Client;

            if (!ClientCtor) {
                console.warn('[storage] No se pudo cargar cliente MinIO. Se usará almacenamiento local.');
                return null;
            }

            return new ClientCtor({
                endPoint: parsed.hostname,
                port: parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80),
                useSSL: parsed.protocol === 'https:',
                accessKey: env.MINIO_ACCESS_KEY,
                secretKey: env.MINIO_SECRET_KEY,
            });
        } catch (error) {
            console.warn('[storage] Error inicializando MinIO. Se usará almacenamiento local.', error);
            return null;
        }
    }

    private async getMinioClient(): Promise<MinioClient | null> {
        if (!this.minioClientPromise) {
            this.minioClientPromise = this.createMinioClient();
        }
        return this.minioClientPromise;
    }

    private async ensureMinioBucket(client: MinioClient) {
        if (this.minioBucketReady) return;
        const bucket = env.MINIO_BUCKET;
        const exists = await client.bucketExists(bucket);
        if (!exists) {
            await client.makeBucket(bucket, 'us-east-1');
        }
        this.minioBucketReady = true;
    }

    private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }

    async saveObject(input: {
        fileName: string;
        mimeType?: string;
        buffer: Buffer;
        folderPrefix?: string;
    }) {
        const minioClient = await this.getMinioClient();
        const folderPrefix = input.folderPrefix
            ? input.folderPrefix.replace(/^\/+|\/+$/g, '')
            : '';

        if (minioClient) {
            await this.ensureMinioBucket(minioClient);
            const safeName = this.sanitizeFileName(input.fileName);
            const objectPathPrefix = folderPrefix
                ? `quality-documents/${folderPrefix}`
                : 'quality-documents';
            const objectKey = `${objectPathPrefix}/${Date.now()}-${randomUUID()}-${safeName}`;
            await minioClient.putObject(
                env.MINIO_BUCKET,
                objectKey,
                input.buffer,
                input.buffer.length,
                input.mimeType ? { 'Content-Type': input.mimeType } : undefined
            );
            return { storagePath: `minio:${env.MINIO_BUCKET}/${objectKey}` };
        }

        await mkdir(this.localStorageDir, { recursive: true });
        const localPath = this.buildLocalStoragePath(input.fileName);
        await writeFile(localPath.absolutePath, input.buffer);
        return { storagePath: localPath.storagePath };
    }

    private parseMinioPath(storagePath: string) {
        const raw = storagePath.replace(/^minio:/, '');
        const separatorIdx = raw.indexOf('/');
        if (separatorIdx < 0) {
            throw new Error('Ruta MinIO inválida');
        }
        return {
            bucket: raw.slice(0, separatorIdx),
            objectKey: raw.slice(separatorIdx + 1),
        };
    }

    private resolveLocalPath(storagePath: string) {
        const normalized = storagePath.startsWith('local:')
            ? storagePath.replace(/^local:/, '')
            : storagePath;
        return resolve(process.cwd(), normalized);
    }

    async readObject(storagePath: string): Promise<Buffer> {
        if (storagePath.startsWith('minio:')) {
            const minioClient = await this.getMinioClient();
            if (!minioClient) {
                throw new Error('MinIO no está disponible para leer el archivo');
            }
            const { bucket, objectKey } = this.parseMinioPath(storagePath);
            const stream = await minioClient.getObject(bucket, objectKey);
            return this.streamToBuffer(stream);
        }

        const absolutePath = this.resolveLocalPath(storagePath);
        return readFile(absolutePath);
    }

    async deleteObject(storagePath?: string) {
        if (!storagePath) return;

        if (storagePath.startsWith('minio:')) {
            const minioClient = await this.getMinioClient();
            if (!minioClient) return;
            const { bucket, objectKey } = this.parseMinioPath(storagePath);
            await minioClient.removeObject(bucket, objectKey).catch(() => undefined);
            return;
        }

        const absolutePath = this.resolveLocalPath(storagePath);
        await unlink(absolutePath).catch(() => undefined);
    }
}
