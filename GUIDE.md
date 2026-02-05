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

## 🔐 Gestión de Roles (RBAC)

El scaffold usa el enum `UserRole` definido en `@scaffold/types`.

### Backend: Protegiendo Rutas
Usa el middleware `authenticateToken` seguido de `authorizeRoles`.

```typescript
router.get('/admin-only', 
    authenticateToken, 
    authorizeRoles(UserRole.SUPERADMIN, UserRole.ADMIN),
    controller.method
);
```

### Frontend: UI Condicional
Usa el objeto `user` del `AuthContext`.

```typescript
const { user } = useAuth();

{user?.role === UserRole.SUPERADMIN && (
    <Button>Solo para Superadmin</Button>
)}
```

---

## 🔗 Validación Compartida (`@scaffold/schemas`)

Para evitar inconsistencias, **toda** validación de datos de entrada (Login, Registro, Creación) debe definirse en el paquete compartido.

1.  **Define el esquema** en `packages/schemas/src/index.ts`.
2.  **Usa `.parse()`** en el backend (Controller) para validar el `req.body`.
3.  **Usa `.parse()`** en el frontend antes de enviar la peticion para dar feedback inmediato al usuario.

---

## 🛠️ Comandos Útiles

- `npm run dev`: Arranca API y Web en paralelo con Hot Reload.
- `npm run ts-check`: Verifica tipos en todo el proyecto (ejecutar antes de cada commit).
- `npx mikro-orm migration:create`: Crea una nueva migración tras cambiar una entidad.
