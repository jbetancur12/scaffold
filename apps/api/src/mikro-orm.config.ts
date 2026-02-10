// apps/api/src/mikro-orm.config.ts
import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { ReflectMetadataProvider } from '@mikro-orm/core';
import 'reflect-metadata';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';

const isProduction = process.env.NODE_ENV === 'production';

const baseDir = __dirname;

console.error(`[MikroORM Config] Environment: ${process.env.NODE_ENV}`);
console.error(`[MikroORM Config] BaseDir: ${baseDir}`);
console.error(`[MikroORM Config] CWD: ${process.cwd()}`);

// En producción (Docker): baseDir será /app/apps/api/dist/apps/api/src
// En desarrollo: /path/to/project/apps/api/src
let entitiesPath: string[];
let migrationsPath: string;

if (isProduction) {
    // ⭐ CORRECCIÓN: En producción, __dirname está en /app/apps/api/dist/apps/api/src
    // Entonces modules está en el mismo nivel que __dirname
    entitiesPath = [path.join(baseDir, 'modules/**/*.entity.js')];
    migrationsPath = path.join(baseDir, '../migrations'); // ← NOTA: puede estar un nivel arriba

    console.error(`[MikroORM Config] Production entities path: ${entitiesPath[0]}`);
    console.error(`[MikroORM Config] Production migrations path: ${migrationsPath}`);
} else {
    // En desarrollo, busca archivos .ts
    entitiesPath = [path.join(baseDir, 'modules/**/*.entity.ts')];
    migrationsPath = path.join(baseDir, 'migrations');

    console.error(`[MikroORM Config] Development entities path: ${entitiesPath[0]}`);
    console.error(`[MikroORM Config] Development migrations path: ${migrationsPath}`);
}

// Verificar que el directorio de módulos existe
const modulesDir = path.join(baseDir, 'modules');
console.error(`[MikroORM Config] Modules directory exists: ${fs.existsSync(modulesDir) ? 'YES' : 'NO'}`);

if (fs.existsSync(modulesDir)) {
    const moduleContents = fs.readdirSync(modulesDir);
    console.error(`[MikroORM Config] Modules found: ${moduleContents.join(', ')}`);
}

// Verificar que el directorio de migraciones existe
console.error(`[MikroORM Config] Migrations directory exists: ${fs.existsSync(migrationsPath) ? 'YES' : 'NO'}`);
if (fs.existsSync(migrationsPath)) {
    const migrationFiles = fs.readdirSync(migrationsPath);
    console.error(`[MikroORM Config] Migration files found: ${migrationFiles.length > 0 ? migrationFiles.join(', ') : 'NONE'}`);
}

const config: Options = {
    driver: PostgreSqlDriver,

    // Database connection
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/scaffold_db',

    // Entities
    entities: entitiesPath,
    entitiesTs: isProduction ? undefined : entitiesPath, // Solo en desarrollo

    // Metadata provider
    metadataProvider: isProduction ? ReflectMetadataProvider : TsMorphMetadataProvider,

    // Debug
    debug: process.env.MIKRO_ORM_DEBUG === 'true' || !isProduction,

    // Migrations
    migrations: {
        path: migrationsPath,
        pathTs: migrationsPath,
        glob: '!(*.d).{js,ts}',
        transactional: true,
        disableForeignKeys: false,
        allOrNothing: true,
        emit: 'ts', // Genera migraciones en TypeScript
    },

    // Connection pool (opcional pero recomendado)
    pool: {
        min: 2,
        max: 10,
    },

    // Para producción
    allowGlobalContext: !isProduction, // Solo permitir en desarrollo
};

export default config;