import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { ReflectMetadataProvider } from '@mikro-orm/core';
import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const config: Options = {
    driver: PostgreSqlDriver,
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/scaffold_db',
    entities: ['dist/**/*.entity.js', 'apps/api/dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],
    metadataProvider: isProduction ? ReflectMetadataProvider : TsMorphMetadataProvider,
    debug: !isProduction,
    migrations: {
        path: 'dist/migrations',
        pathTs: 'src/migrations',
    },
};

export default config;
