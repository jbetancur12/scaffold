import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import 'dotenv/config';

const config: Options = {
    driver: PostgreSqlDriver,
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/scaffold_db',
    entities: ['dist/**/*.entity.js', 'apps/api/dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV === 'development',
    migrations: {
        path: 'dist/migrations',
        pathTs: 'src/migrations',
    },
};

export default config;
