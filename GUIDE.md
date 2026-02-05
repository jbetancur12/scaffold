# Guía de Desarrollo - Scaffold Monorepo

Este documento describe los estándares, patrones y utilidades del proyecto para asegurar que el código sea consistente, agnóstico y escalable.

---

## 🚀 Estándar de Respuesta de API (`ApiResponse`)

Todas las respuestas del servidor **DEBEN** usar la utilidad `ApiResponse` para mantener un formato JSON consistente.

### Éxito (`ApiResponse.success`)
```typescript
return ApiResponse.success(res, data, 'Mensaje opcional', 200);
```
**Estructura resultante:**
```json
{
  "success": true,
  "message": "Mensaje opcional",
  "data": { ... }
}
```

### Paginación (`ApiResponse.pagination`)
Para listas extensas, usa siempre el formato de paginación.
```typescript
return ApiResponse.pagination(res, items, total, page, limit);
```
**Estructura resultante:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
  }
}
```

---

## 🛡️ Manejo de Errores

### Backend (API)
Nunca uses `res.status(400).send()`. Lanza una excepción `AppError` dentro de un `asyncHandler`.

```typescript
// En el controlador
getById = asyncHandler(async (req, res) => {
    const item = await service.find(req.params.id);
    if (!item) {
        throw new AppError('No encontrado', 404);
    }
    return ApiResponse.success(res, item);
});
```

### Frontend (Web)
Los errores de la API se capturan en el bloque `catch`. Si usas los esquemas compartidos, puedes validar errores de Zod fácilmente.

```typescript
try {
    await api.post('/endpoint', data);
} catch (error: any) {
    const message = error.response?.data?.message || 'Error genérico';
    toast({ title: 'Error', description: message, variant: 'destructive' });
}
```

---

## 🔑 Estrategia de Tokens (Seguridad)

El scaffold utiliza una estrategia de doble token para máxima seguridad:

1.  **Access Token**: Se devuelve en el body de la respuesta y se guarda en `localStorage`. Se envía en el header `Authorization: Bearer <token>`. Es de vida corta (15 min).
2.  **Refresh Token**: Se envía automáticamente en una cookie `HttpOnly` y `Secure`. El frontend **no puede** acceder a ella mediante JS, lo que previene ataques XSS. Es de vida larga (7 días) y se usa para renovar el Access Token mediante el endpoint `/auth/refresh`.

---

## 🔐 Gestión de Roles (RBAC)

El scaffold usa el enum `UserRole` definido en `@scaffold/types`.

### Backend: Protegiendo Rutas
Usa el middleware `authenticateToken` seguido de `requireRole`.

```typescript
router.get('/admin-only', 
    authenticateToken, 
    requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
    controller.method
);
```

### Frontend: UI Declarativa (`RoleGuard`)
Para mostrar u ocultar componentes basados en el rol, usa el componente `RoleGuard`.

```tsx
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRole } from '@scaffold/types';

<RoleGuard allowedRoles={[UserRole.SUPERADMIN, UserRole.ADMIN]}>
    <Button>Panel de Control</Button>
</RoleGuard>
```

### Frontend: Hook de Permisos (`useHasRole`)
Si necesitas lógica de permisos dentro de una función o para propiedades:

```tsx
const { hasRole } = useHasRole();

const canEdit = hasRole([UserRole.SUPERADMIN]);
```

---

## 🔗 Validación Compartida (`@scaffold/schemas`)

Para evitar inconsistencias, **toda** validación de datos de entrada (Login, Registro, Creación) debe definirse en el paquete compartido.

1.  **Define el esquema** en `packages/schemas/src/index.ts`.
2.  **Usa `.parse()`** en el backend (Controller) para validar el `req.body`.
3.  **Usa `.parse()`** en el frontend antes de enviar la peticion para dar feedback inmediato al usuario.

---

---

## 📡 Eventos Internos (`EventEmitter`)

Para mantener el código desacoplado, usamos un `eventEmitter` global para efectos secundarios (logs de auditoría, emails, notificaciones).

```typescript
import { eventEmitter, APP_EVENTS } from '../../shared/services/event-emitter.service';

// Emitir un evento
eventEmitter.emitSafe(APP_EVENTS.USER_LOGGED_IN, { userId: user.id, email: user.email });
```
*Los eventos se manejan de forma segura para no tumbar el servidor si un listener falla.*

---

## 🗑️ Borrado Lógico (Soft Delete)

Todas las entidades heredan de `BaseEntity`, que incluye una propiedad `deletedAt`. 

- **Nunca** borres datos físicamente a menos que sea estrictamente necesario.
- Para "borrar" un registro, simplemente marca la fecha: `entity.deletedAt = new Date();`.
- *Nota: En futuras versiones se puede añadir un filtro global en MikroORM para ignorar registros borrados.*

---

## 🏥 Monitoreo y Salud (Health Checks)

El sistema incluye un endpoint de salud para verificar la conectividad de la base de datos y Redis.

- **Endpoint**: `GET /health`
- **Uso**: Útil para orquestadores como Kubernetes o servicios de monitoreo externo.

---

## 📝 Registro de Logs (Winston)

No uses `console.log`. Usa el logger configurado para asegurar que los logs se formateen correctamente y puedan ser enviados a servicios externos en el futuro.

```typescript
import { winstonLogger } from './config/logger';

winstonLogger.info('Iniciando proceso X...');
winstonLogger.error('Fallo crítico en Y', { error });
```

---

## 🛠️ Comandos Útiles

- `npm run dev`: Arranca API y Web en paralelo con Hot Reload.
- `npm run ts-check`: Verifica tipos en todo el proyecto (ejecutar antes de cada commit).
- `npx mikro-orm migration:create`: Crea una nueva migración tras cambiar una entidad.
