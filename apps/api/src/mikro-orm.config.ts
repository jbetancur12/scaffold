// apps/api/src/mikro-orm.config.ts
import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { ReflectMetadataProvider } from '@mikro-orm/core';
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';

// ⭐ Cargar .env desde la raíz del monorepo
config({ path: join(process.cwd(), '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// ⭐ En desarrollo con tsx, __dirname existe
// En producción compilada, también existe
const baseDir = __dirname;

console.error(`[MikroORM Config] Environment: ${process.env.NODE_ENV}`);
console.error(`[MikroORM Config] BaseDir: ${baseDir}`);
console.error(`[MikroORM Config] CWD: ${process.cwd()}`);

let entitiesPath: string[];
let migrationsPath: string;

if (isProduction) {
    entitiesPath = [join(baseDir, 'modules/**/*.entity.js')];
    migrationsPath = join(baseDir, '../migrations');

    console.error(`[MikroORM Config] Production entities path: ${entitiesPath[0]}`);
    console.error(`[MikroORM Config] Production migrations path: ${migrationsPath}`);
} else {
    entitiesPath = [join(baseDir, 'modules/**/*.entity.ts')];
    migrationsPath = join(baseDir, 'migrations');

    console.error(`[MikroORM Config] Development entities path: ${entitiesPath[0]}`);
    console.error(`[MikroORM Config] Development migrations path: ${migrationsPath}`);
}

// Verificar que el directorio de módulos existe
const modulesDir = join(baseDir, 'modules');
console.error(`[MikroORM Config] Modules directory exists: ${existsSync(modulesDir) ? 'YES' : 'NO'}`);

if (existsSync(modulesDir)) {
    const moduleContents = readdirSync(modulesDir);
    console.error(`[MikroORM Config] Modules found: ${moduleContents.join(', ')}`);

    // Verificar entidades en cada módulo
    moduleContents.forEach(module => {
        const modulePath = join(modulesDir, module);
        if (statSync(modulePath).isDirectory()) {
            const files = readdirSync(modulePath);
            const entities = files.filter(f => f.endsWith('.entity.ts') || f.endsWith('.entity.js'));
            console.error(`[MikroORM Config] ${module} entities: ${entities.join(', ') || 'NONE'}`);
        }
    });
}

// Verificar que el directorio de migraciones existe
console.error(`[MikroORM Config] Migrations directory exists: ${existsSync(migrationsPath) ? 'YES' : 'NO'}`);
if (existsSync(migrationsPath)) {
    const migrationFiles = readdirSync(migrationsPath);
    console.error(`[MikroORM Config] Migration files found: ${migrationFiles.length > 0 ? migrationFiles.join(', ') : 'NONE'}`);
}

const mikroOrmConfig: Options = {
    driver: PostgreSqlDriver,
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/scaffold_db',
    entities: entitiesPath,
    entitiesTs: isProduction ? undefined : entitiesPath,
    metadataProvider: isProduction ? ReflectMetadataProvider : TsMorphMetadataProvider,
    debug: process.env.MIKRO_ORM_DEBUG === 'true' || !isProduction,
    migrations: {
        path: migrationsPath,
        pathTs: migrationsPath,
        glob: '!(*.d).{js,ts}',
        transactional: true,
        disableForeignKeys: false,
        allOrNothing: true,
        emit: 'ts',
    },
    pool: {
        min: 2,
        max: 10,
    },
    allowGlobalContext: !isProduction,
};

export default mikroOrmConfig;