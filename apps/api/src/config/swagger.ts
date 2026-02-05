import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Scaffold API',
        version: '1.0.0',
        description: 'API documentation for the agnostic scaffold platform',
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Development server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    paths: {
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Iniciar sesión',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', example: 'admin@example.com' },
                                    password: { type: 'string', example: 'password123' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Login exitoso' },
                    401: { description: 'Credenciales inválidas' },
                },
            },
        },
        '/users': {
            get: {
                tags: ['Users'],
                summary: 'Listar usuarios (Superadmin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de usuarios' },
                },
            },
        },
    },
};

export const setupSwagger = (app: Express) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
