import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import 'dotenv/config';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Determine base path - when running from dist, __dirname will be in dist folder
// In production docker: /app/apps/api/dist/apps/api/src
// In local dev: /path/to/project/apps/api/src
const baseDir = __dirname;

const config: Options = {
    driver: PostgreSqlDriver,
    // Use DATABASE_URL from environment or fallback to local dev defaults
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/scaffold_db',

    // Relative to this config file's location
    entities: [
        path.join(baseDir, '**/*.entity.js'),
        path.join(baseDir, '**/*.entity.ts')
    ],
    entitiesTs: [path.join(baseDir, '**/*.entity.ts')],

    metadataProvider: TsMorphMetadataProvider,
    debug: !isProduction,

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
