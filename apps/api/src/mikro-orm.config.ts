import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { ReflectMetadataProvider } from '@mikro-orm/core';
import 'reflect-metadata';
import 'dotenv/config';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Determine base path - when running from dist, __dirname will be in dist folder
// In production docker: /app/apps/api/dist/apps/api/src
// In local dev: /path/to/project/apps/api/src
const baseDir = __dirname;

console.error(`[MikroORM Config] Environment: ${process.env.NODE_ENV}`);
console.error(`[MikroORM Config] BaseDir: ${baseDir}`);
console.error(`[MikroORM Config] CWD: ${process.cwd()}`);

// Calculate relative path from CWD to entities for globbing (to handle nested workspace execution)
// e.g., if CWD is /app/apps/api and baseDir is /app/apps/api/dist/apps/api/src
// relative path is ./dist/apps/api/src
const relativeBaseDir = path.relative(process.cwd(), baseDir);
const entitiesPathJS = path.join(baseDir, '**/*.entity.js');
const entitiesPathTS = path.join(baseDir, '**/*.entity.ts');
const relativeEntitiesPathJS = path.join(relativeBaseDir, '**/*.entity.js');
const relativeEntitiesPathTS = path.join(relativeBaseDir, '**/*.entity.ts');

console.error(`[MikroORM Config] Relative BaseDir: ${relativeBaseDir}`);
console.error(`[MikroORM Config] Entities Path JS (Absolute): ${entitiesPathJS}`);
console.error(`[MikroORM Config] Entities Path JS (Relative): ${relativeEntitiesPathJS}`);

// Check if a known entity file exists to verify baseDir is correct
const sampleEntity = path.join(baseDir, 'modules/user/user.entity.js');
console.error(`[MikroORM Config] Checking for sample entity at ${sampleEntity}: ${fs.existsSync(sampleEntity) ? 'FOUND' : 'NOT FOUND'}`);

const config: Options = {
    driver: PostgreSqlDriver,
    // Use DATABASE_URL from environment or fallback to local dev defaults
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/scaffold_db',

    // Use both absolute and relative paths to cover all execution contexts (root vs workspace)
    entities: [
        entitiesPathJS,
        entitiesPathTS,
        relativeEntitiesPathJS,
        relativeEntitiesPathTS
    ],
    entitiesTs: [entitiesPathTS, relativeEntitiesPathTS],

    // Use ReflectMetadataProvider in production to avoid reliance on source files
    metadataProvider: isProduction ? ReflectMetadataProvider : TsMorphMetadataProvider,
    debug: true,

    migrations: {
        path: path.join(baseDir, 'migrations'),
        pathTs: path.join(baseDir, 'migrations'),
        glob: '!(*.d).{js,ts}',
        transactional: true,
        disableForeignKeys: false,
        allOrNothing: true,
    },
};

export default config;
