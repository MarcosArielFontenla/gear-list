# Build Loadout Queue — Airsoft Gear Shopping PWA

Quiero que desarrolles una aplicación web llamada **Loadout Queue**.

La aplicación será una PWA instalable para que jugadores de Airsoft puedan organizar los accesorios y elementos de equipamiento que desean comprar, ordenarlos por prioridad y acceder a sus listas desde distintos dispositivos.

La aplicación debe permitir múltiples usuarios. Cada usuario tendrá sus propias listas privadas y, en una etapa posterior, podrá compartirlas con otros usuarios.

Trabajá de manera incremental, verificando que cada etapa compile y funcione antes de continuar.

No sobrearquitectures la solución. Construí primero un MVP funcional, limpio y extensible.

---

# 1. Objetivo del producto

Loadout Queue debe funcionar como una lista de compras especializada en equipamiento de Airsoft.

Un usuario debe poder:

* Registrarse.
* Iniciar sesión.
* Crear listas de equipamiento.
* Crear accesorios dentro de una lista.
* Editar accesorios.
* Eliminar accesorios.
* Ordenar accesorios por prioridad.
* Reordenarlos mediante drag and drop.
* Marcar accesorios como comprados.
* Guardar precios estimados y precios reales.
* Guardar enlaces de compra.
* Ver totales estimados.
* Instalar la aplicación como PWA.
* Consultar la última información descargada cuando no tenga conexión.
* Mantener sus datos sincronizados entre dispositivos mediante una API y una base de datos centralizada.

La primera versión no necesita sincronización offline completa de escrituras.

Cuando el usuario esté offline:

* La interfaz debe seguir cargando.
* Debe poder consultar la última información almacenada localmente.
* Debe mostrarse claramente que no tiene conexión.
* Las acciones de escritura deben deshabilitarse o informar que requieren conexión.

La sincronización avanzada de operaciones offline se implementará más adelante.

---

# 2. Stack tecnológico

## Frontend

Usar:

* React.
* TypeScript.
* Vite.
* React Router.
* Tailwind CSS.
* shadcn/ui.
* TanStack Query.
* React Hook Form.
* Zod.
* dnd-kit.
* vite-plugin-pwa.
* IndexedDB mediante Dexie.js.
* Axios o Fetch API mediante un cliente HTTP centralizado.

## Backend

Usar:

* ASP.NET Core Web API.
* .NET 10.
* Entity Framework Core.
* PostgreSQL.
* ASP.NET Core Identity.
* JWT.
* Refresh tokens.
* FluentValidation.
* Swagger / OpenAPI.
* Serilog.

## Testing

Usar:

* xUnit para backend.
* FluentAssertions.
* Vitest para frontend.
* React Testing Library.

## Infraestructura local

Usar Docker Compose para ejecutar:

* PostgreSQL.
* Backend.
* Frontend, solo si resulta conveniente para desarrollo.

El proyecto debe poder ejecutarse también sin contenerizar frontend y backend durante el desarrollo.

---

# 3. Estructura general del repositorio

Crear un monorepo con esta estructura aproximada:

```text
loadout-queue/
├── apps/
│   ├── web/
│   └── api/
├── tests/
│   ├── api-tests/
│   └── web-tests/
├── infrastructure/
│   └── docker/
├── docs/
├── docker-compose.yml
├── .env.example
├── .editorconfig
├── .gitignore
└── README.md
```

La aplicación backend debe organizarse como un monolito modular.

Dentro de `apps/api`, usar una estructura similar a:

```text
apps/api/
├── Features/
│   ├── Authentication/
│   ├── GearLists/
│   ├── GearItems/
│   └── Dashboard/
├── Domain/
├── Persistence/
├── Common/
├── Middleware/
└── Program.cs
```

Preferir vertical slices o agrupación por funcionalidad.

No crear microservicios.

No agregar CQRS, MediatR, event sourcing ni patrones complejos salvo que exista una necesidad concreta y justificada.

---

# 4. Entidades principales

## ApplicationUser

Extender `IdentityUser<Guid>`.

Propiedades sugeridas:

```csharp
public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
```

## GearList

Representa una lista de compras o un loadout.

Propiedades:

```csharp
public class GearList
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ApplicationUser Owner { get; set; } = null!;
    public ICollection<GearItem> Items { get; set; } = [];
}
```

## GearItem

Propiedades:

```csharp
public class GearItem
{
    public Guid Id { get; set; }
    public Guid GearListId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public GearCategory Category { get; set; }
    public PurchasePriority Priority { get; set; }
    public PurchaseStatus Status { get; set; }

    public decimal? EstimatedPrice { get; set; }
    public decimal? ActualPrice { get; set; }

    public string? ProductUrl { get; set; }
    public string? ImageUrl { get; set; }
    public string? StoreName { get; set; }
    public string? Notes { get; set; }

    public int Position { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? PurchasedAt { get; set; }

    public Guid Version { get; set; }

    public GearList GearList { get; set; } = null!;
}
```

## PurchasePriority

```csharp
public enum PurchasePriority
{
    BuyNow = 1,
    BuyNext = 2,
    Later = 3,
    Someday = 4
}
```

## PurchaseStatus

```csharp
public enum PurchaseStatus
{
    Planned = 1,
    Researching = 2,
    ReadyToBuy = 3,
    Purchased = 4,
    Cancelled = 5
}
```

## GearCategory

```csharp
public enum GearCategory
{
    PrimaryWeapon = 1,
    SecondaryWeapon = 2,
    Protection = 3,
    Clothing = 4,
    TacticalGear = 5,
    Optics = 6,
    WeaponAccessories = 7,
    Communication = 8,
    BackpackAndStorage = 9,
    Maintenance = 10,
    Other = 11
}
```

Configurar correctamente las precisiones decimales para precios.

Utilizar `decimal`, nunca `double`, para importes monetarios.

---

# 5. Autenticación

Implementar autenticación propia con:

* ASP.NET Core Identity.
* Registro mediante email, contraseña y display name.
* Inicio de sesión.
* JWT access token.
* Refresh token.
* Revocación de refresh token.
* Endpoint para obtener el usuario actual.
* Logout.
* Password hashing mediante Identity.

No implementar inicialmente:

* Confirmación de email.
* Recuperación de contraseña.
* Login social.
* Autenticación multifactor.

Diseñar la solución para permitir agregarlos posteriormente.

Los refresh tokens deben almacenarse de manera segura en la base de datos.

Preferir almacenar el refresh token en una cookie:

* `HttpOnly`.
* `Secure` en producción.
* `SameSite` correctamente configurado.

Evitar guardar refresh tokens en `localStorage`.

El frontend debe mantener el access token de la manera más segura y simple posible.

Implementar renovación automática del access token cuando corresponda.

---

# 6. Reglas de autorización

Cada usuario solo puede consultar y modificar:

* Sus propias listas.
* Los accesorios pertenecientes a sus propias listas.

Nunca confiar en un `OwnerId` enviado por el frontend.

El backend debe obtener el usuario autenticado desde el token.

Todos los endpoints privados deben verificar ownership.

Una petición sobre una lista ajena debe devolver `404 Not Found` o `403 Forbidden`, aplicando un criterio consistente.

---

# 7. Endpoints del backend

Usar rutas REST claras.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

## Gear Lists

```text
GET    /api/gear-lists
GET    /api/gear-lists/{id}
POST   /api/gear-lists
PUT    /api/gear-lists/{id}
DELETE /api/gear-lists/{id}
```

El delete puede ser inicialmente un borrado lógico mediante `IsArchived`.

## Gear Items

```text
GET    /api/gear-lists/{listId}/items
GET    /api/gear-lists/{listId}/items/{itemId}
POST   /api/gear-lists/{listId}/items
PUT    /api/gear-lists/{listId}/items/{itemId}
DELETE /api/gear-lists/{listId}/items/{itemId}
PATCH  /api/gear-lists/{listId}/items/{itemId}/status
PUT    /api/gear-lists/{listId}/items/reorder
```

## Dashboard

```text
GET /api/dashboard/summary
GET /api/gear-lists/{listId}/summary
```

La respuesta de resumen puede incluir:

* Cantidad total de accesorios.
* Cantidad pendiente.
* Cantidad comprada.
* Próxima compra.
* Total estimado.
* Total estimado de `BuyNow`.
* Total real gastado.
* Diferencia entre precio estimado y precio real.

---

# 8. DTOs y validación

No exponer directamente las entidades de Entity Framework.

Crear DTOs específicos para:

* Requests.
* Responses.
* Listados.
* Detalles.
* Actualizaciones parciales.

Ejemplo:

```csharp
public sealed record CreateGearItemRequest(
    string Name,
    string? Description,
    GearCategory Category,
    PurchasePriority Priority,
    PurchaseStatus Status,
    decimal? EstimatedPrice,
    string? ProductUrl,
    string? ImageUrl,
    string? StoreName,
    string? Notes
);
```

Validaciones mínimas:

* `Name` obligatorio.
* `Name` con longitud máxima razonable.
* `EstimatedPrice` no puede ser negativo.
* `ActualPrice` no puede ser negativo.
* URLs válidas.
* Prioridades y estados válidos.
* Una lista debe tener nombre.
* El usuario no puede acceder a listas ajenas.

Utilizar FluentValidation.

Devolver errores con `ProblemDetails`.

Implementar un middleware global para excepciones.

---

# 9. Reordenamiento

Los accesorios deben poder:

* Cambiar de posición dentro de una misma prioridad.
* Moverse entre prioridades.
* Mantener un orden persistido.

El frontend utilizará dnd-kit.

El backend debe recibir una operación de reordenamiento.

Ejemplo:

```json
{
  "items": [
    {
      "itemId": "GUID",
      "priority": "BuyNow",
      "position": 0,
      "version": "GUID"
    },
    {
      "itemId": "GUID",
      "priority": "BuyNow",
      "position": 1,
      "version": "GUID"
    }
  ]
}
```

La actualización debe ser transaccional.

Validar que todos los accesorios pertenezcan a la lista y al usuario autenticado.

---

# 10. Concurrencia y sincronización

Cada `GearItem` debe tener:

```csharp
public Guid Version { get; set; }
```

Cada vez que se actualice un accesorio:

* Validar que la versión recibida coincida con la versión actual.
* Generar una nueva versión.
* Actualizar `UpdatedAt`.

Cuando la versión no coincida, devolver:

```text
409 Conflict
```

Incluir en la respuesta información suficiente para que el frontend pueda volver a cargar la versión más reciente.

Para el MVP, utilizar una estrategia sencilla:

* El servidor es la fuente de verdad.
* TanStack Query invalida y vuelve a consultar después de una mutación.
* Ante un conflicto, mostrar una notificación y recargar el elemento.

No implementar inicialmente resolución avanzada de conflictos.

No implementar CRDT.

No implementar event sourcing.

---

# 11. Frontend

Crear una interfaz responsive y mobile-first.

Debe funcionar correctamente en:

* Escritorio.
* Tablet.
* Teléfono móvil.
* Modo PWA instalada.

## Pantallas

### Login

* Email.
* Contraseña.
* Botón de inicio de sesión.
* Enlace hacia registro.
* Mensajes de error claros.

### Register

* Display name.
* Email.
* Contraseña.
* Confirmación de contraseña.

### Dashboard

Mostrar:

* Saludo al usuario.
* Cantidad de listas.
* Total de accesorios pendientes.
* Cantidad comprada.
* Total estimado.
* Acceso rápido a la próxima compra.
* Listas recientes.

### Gear Lists

Mostrar las listas del usuario.

Cada tarjeta debe incluir:

* Nombre.
* Descripción.
* Cantidad de accesorios.
* Cantidad comprada.
* Total estimado.
* Fecha de actualización.

Permitir:

* Crear lista.
* Editar lista.
* Archivar lista.
* Abrir lista.

### Gear List Detail

Esta será la pantalla principal.

Mostrar cuatro columnas:

```text
Buy Now
Buy Next
Later
Someday
```

Cada columna contiene tarjetas de accesorios.

Permitir drag and drop:

* Dentro de una columna.
* Entre columnas.

Cada tarjeta debe mostrar:

* Nombre.
* Categoría.
* Estado.
* Precio estimado.
* Tienda.
* Imagen cuando exista.
* Indicador de comprado.
* Botón de edición.
* Botón de eliminación.
* Enlace externo al producto.

En móvil, evitar cuatro columnas comprimidas.

Usar alguna de estas estrategias:

* Tabs por prioridad.
* Secciones verticales.
* Carrusel horizontal accesible.

Preferir tabs o secciones verticales.

### Create/Edit Gear Item

Formulario con:

* Name.
* Description.
* Category.
* Priority.
* Status.
* Estimated price.
* Actual price.
* Product URL.
* Image URL.
* Store name.
* Notes.

Cuando el estado cambia a `Purchased`:

* Permitir ingresar precio real.
* Registrar `PurchasedAt`.
* Mostrar confirmación.

### Purchased Items

Mostrar historial de compras con:

* Nombre.
* Categoría.
* Precio estimado.
* Precio real.
* Diferencia.
* Fecha de compra.
* Tienda.

### Settings

Para el MVP:

* Display name.
* Logout.
* Información básica de la PWA.
* Estado de conexión.

---

# 12. Diseño visual

Crear una interfaz moderna, simple y con identidad táctica, sin exagerar.

Evitar que parezca un videojuego militar.

Usar:

* Fondos oscuros o neutros.
* Superficies limpias.
* Tipografía legible.
* Espaciado amplio.
* Iconos simples.
* Estados visuales claros.
* Buen contraste.
* Accesibilidad básica.

La aplicación debe sentirse como una herramienta práctica de organización.

Agregar soporte para:

* Dark mode.
* Light mode.

No utilizar imágenes con copyright dentro del repositorio.

Usar placeholders o imágenes externas de prueba claramente reemplazables.

---

# 13. PWA

Configurar la aplicación con `vite-plugin-pwa`.

Debe incluir:

* `manifest.webmanifest`.
* Nombre: `Loadout Queue`.
* Short name: `Loadout`.
* Iconos requeridos.
* Theme color.
* Background color.
* Modo `standalone`.
* Página de fallback offline.
* Service Worker.
* Actualización controlada del Service Worker.
* Aviso cuando exista una nueva versión disponible.

Cachear:

* HTML base.
* JavaScript.
* CSS.
* Iconos.
* Fuentes locales.
* App shell.

No cachear indiscriminadamente respuestas privadas de autenticación.

Para consultas de listas y accesorios:

* Guardar una copia de la última respuesta válida en IndexedDB.
* Cuando exista conexión, usar la API como fuente principal.
* Cuando no exista conexión, mostrar los datos locales.
* Mostrar una etiqueta `Offline data` o equivalente.

No implementar todavía escrituras offline.

Cuando el usuario intente crear, editar, eliminar o reordenar sin conexión:

* Bloquear la acción.
* Mostrar un mensaje claro.
* No simular que el cambio fue guardado.

---

# 14. Estado de red

Crear un hook o servicio centralizado para detectar:

* Online.
* Offline.
* Reconexión.

Mostrar un banner cuando no haya conexión.

Cuando vuelva la conexión:

* Invalidar queries relevantes.
* Consultar nuevamente la API.
* Actualizar IndexedDB.
* Ocultar el banner offline.
* Mostrar una notificación breve de reconexión.

No depender únicamente de `navigator.onLine`.

Cuando sea necesario, verificar conectividad real contra un endpoint liviano:

```text
GET /api/health
```

---

# 15. TanStack Query

Usar TanStack Query para:

* Consultas.
* Mutaciones.
* Invalidación de caché.
* Estados de carga.
* Errores.
* Reintentos controlados.

No duplicar innecesariamente el estado remoto en Zustand.

Zustand debe usarse solamente para estado local de interfaz cuando sea necesario, por ejemplo:

* Tema.
* Sidebar.
* Modal seleccionado.
* Estado temporal de drag and drop.

El estado proveniente del backend debe administrarse principalmente con TanStack Query.

---

# 16. Base de datos

Usar PostgreSQL.

Crear migraciones de Entity Framework Core.

Agregar índices para:

* `GearList.OwnerId`.
* `GearItem.GearListId`.
* `GearItem.Priority`.
* `GearItem.Status`.
* `GearItem.Position`.
* Refresh tokens por usuario y token hash.

Configurar correctamente las relaciones y eliminaciones.

Evitar cascade deletes peligrosos sin analizarlos.

Crear datos de desarrollo opcionales.

Incluir un usuario demo solo en ambiente Development.

---

# 17. Seguridad

Aplicar como mínimo:

* HTTPS preparado para producción.
* CORS restringido mediante configuración.
* JWT con expiración corta.
* Refresh tokens revocables.
* Hash de refresh tokens en base de datos.
* Rate limiting básico en endpoints de login y registro.
* Validación de inputs.
* Protección contra acceso horizontal a recursos de otros usuarios.
* No guardar secretos en el repositorio.
* Variables mediante configuración y environment variables.
* No registrar contraseñas, tokens o datos sensibles.
* Headers de seguridad razonables.

Crear `.env.example` y documentación de variables necesarias.

---

# 18. Observabilidad

Configurar:

* Serilog.
* Logging estructurado.
* Correlation ID por request.
* Health check.
* Logs diferentes por ambiente.

Endpoints:

```text
GET /health
GET /api/health
```

No agregar herramientas externas de observabilidad en el MVP.

---

# 19. Tests mínimos

## Backend

Agregar pruebas para:

* Registro.
* Login.
* Acceso a endpoint autenticado.
* Usuario no puede consultar listas ajenas.
* Crear lista.
* Crear accesorio.
* Actualizar accesorio.
* Eliminar accesorio.
* Reordenar accesorios.
* Conflicto de versión devuelve 409.
* Cálculo de resumen.
* Validaciones de precios negativos.

Priorizar integration tests con una base de datos real efímera o Testcontainers para PostgreSQL.

No utilizar únicamente EF Core InMemory para pruebas de persistencia.

## Frontend

Agregar pruebas para:

* Formulario de login.
* Formulario de creación de accesorio.
* Renderizado de prioridades.
* Estado offline.
* Error de API.
* Cambio de estado a comprado.
* Cálculo visual de totales.

No buscar cobertura artificialmente alta.

Priorizar comportamientos importantes.

---

# 20. Docker

Crear un `docker-compose.yml` para desarrollo.

Servicios:

```text
postgres
api
```

Opcionalmente:

```text
web
```

Configurar:

* Volumen persistente para PostgreSQL.
* Health checks.
* Variables mediante `.env`.
* Dependencias correctas entre servicios.
* Puertos claros.
* Migraciones documentadas.

No ejecutar migraciones destructivas automáticamente en producción.

---

# 21. README

Crear un README completo con:

* Descripción del producto.
* Capturas como placeholders.
* Stack.
* Requisitos.
* Configuración local.
* Variables de entorno.
* Ejecución del frontend.
* Ejecución del backend.
* Ejecución con Docker.
* Migraciones.
* Tests.
* Instalación como PWA.
* Arquitectura.
* Decisiones técnicas.
* Limitaciones del MVP.
* Roadmap.

---

# 22. Roadmap posterior

Documentar, pero no implementar todavía:

## Fase 2

* Invitaciones.
* Listas compartidas.
* Roles Owner, Editor y Viewer.
* SignalR.
* Actualizaciones en tiempo real.
* Escrituras offline.
* Cola de sincronización en IndexedDB.
* Resolución de conflictos.
* Subida real de imágenes.
* Recuperación de contraseña.
* Confirmación de email.

## Fase 3

* Seguimiento de precios.
* Historial de precios.
* Alertas de descuentos.
* Presupuesto mensual.
* Conversión de monedas.
* Exportación.
* Estadísticas.
* Plantillas de loadouts.
* Listas públicas.
* Comparación de productos.

No implementar funciones de Fase 2 o Fase 3 durante el MVP salvo que sean estrictamente necesarias.

---

# 23. Orden de implementación

Trabajar en este orden:

## Etapa 1 — Inicialización

* Crear monorepo.
* Crear frontend.
* Crear backend.
* Configurar PostgreSQL.
* Configurar Docker Compose.
* Crear README inicial.
* Verificar que todo compile.

## Etapa 2 — Backend base

* Configuración.
* Entity Framework Core.
* Entidades.
* DbContext.
* Migraciones.
* Swagger.
* Health checks.
* Middleware de errores.
* Serilog.
* Verificar compilación y tests.

## Etapa 3 — Autenticación

* Identity.
* Registro.
* Login.
* JWT.
* Refresh token.
* Logout.
* Current user.
* Tests.
* Verificar funcionamiento.

## Etapa 4 — Gear Lists

* CRUD.
* Ownership.
* Validaciones.
* Tests.

## Etapa 5 — Gear Items

* CRUD.
* Estados.
* Prioridades.
* Posiciones.
* Versionado.
* Tests.

## Etapa 6 — Reordenamiento

* Endpoint transaccional.
* dnd-kit.
* Invalidación de queries.
* Conflictos.
* Tests.

## Etapa 7 — Frontend completo

* Autenticación.
* Dashboard.
* Listas.
* Detalle.
* Formularios.
* Historial de compras.
* Responsive design.

## Etapa 8 — PWA

* Manifest.
* Service Worker.
* App shell.
* Instalación.
* Actualización.
* Estado offline.
* IndexedDB para lectura offline.

## Etapa 9 — Calidad

* Tests.
* Manejo de errores.
* Loading states.
* Empty states.
* Accesibilidad.
* README.
* Limpieza de código.

Después de cada etapa:

1. Ejecutar build.
2. Ejecutar tests.
3. Corregir errores.
4. Resumir qué fue implementado.
5. Indicar qué archivos importantes fueron creados o modificados.
6. Continuar con la siguiente etapa únicamente cuando el estado sea estable.

---

# 24. Reglas de implementación

Seguir estas reglas:

* No generar pseudocódigo cuando se pueda implementar código real.
* No dejar métodos críticos con `TODO`.
* No ocultar errores de compilación.
* No asumir que algo funciona sin ejecutar build o tests.
* Mantener métodos pequeños.
* Evitar abstracciones innecesarias.
* Evitar repositorios genéricos sobre Entity Framework Core.
* Usar `async` y `await` correctamente.
* Pasar `CancellationToken`.
* Usar `AsNoTracking` en consultas de solo lectura.
* Ejecutar filtros en la base de datos.
* No materializar tablas completas antes de filtrar.
* Evitar problemas N+1.
* No devolver entidades directamente.
* No guardar secretos.
* No agregar dependencias sin necesidad.
* Mantener nombres y código en inglés.
* Mantener documentación técnica en inglés.
* La interfaz visual puede estar inicialmente en inglés.
* Preparar la UI para internacionalización futura, pero no implementar un sistema completo de traducciones todavía.

---

# 25. Criterios de aceptación del MVP

El MVP estará terminado cuando:

* Un usuario pueda registrarse.
* Pueda iniciar sesión.
* Pueda cerrar sesión.
* Pueda crear varias listas.
* Pueda crear accesorios.
* Pueda editarlos.
* Pueda eliminarlos.
* Pueda moverlos entre prioridades.
* Pueda reordenarlos.
* Pueda marcarlos como comprados.
* Pueda guardar precio estimado y real.
* Pueda consultar totales.
* No pueda acceder a información de otros usuarios.
* La aplicación sea responsive.
* Sea instalable como PWA.
* La interfaz cargue offline.
* Muestre la última información descargada offline.
* Impida escrituras offline de forma clara.
* Los cambios guardados online aparezcan en otros dispositivos al volver a consultar.
* Backend y frontend tengan tests básicos.
* El proyecto pueda ejecutarse siguiendo únicamente el README.

---

# 26. Primera tarea

Comenzá inspeccionando el directorio actual.

Si está vacío:

1. Creá la estructura inicial del monorepo.
2. Inicializá el frontend con React, TypeScript y Vite.
3. Inicializá el backend con ASP.NET Core Web API en .NET 10.
4. Agregá PostgreSQL mediante Docker Compose.
5. Creá `.gitignore`, `.editorconfig`, `.env.example` y un README inicial.
6. Configurá comandos claros para ejecutar ambos proyectos.
7. Ejecutá el build del frontend y del backend.
8. Corregí cualquier error.
9. Mostrá un resumen de los archivos creados y los comandos de ejecución.

Si el directorio ya contiene código:

1. Inspeccioná toda la estructura.
2. No sobrescribas archivos sin necesidad.
3. Identificá qué partes del proyecto ya existen.
4. Compará el estado actual contra este requerimiento.
5. Proponé y ejecutá el siguiente incremento más seguro.
6. Conservá cualquier implementación válida existente.

Empezá ahora con la Etapa 1.