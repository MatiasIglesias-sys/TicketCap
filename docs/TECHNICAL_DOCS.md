# TicketCAP — Documentación Técnica

> Club Atlético Peñarol — Sistema de venta de entradas  
> Stack: Next.js 14 (App Router) · Prisma + SQLite · NextAuth v4 · TypeScript

---

## Índice

1. [Inicio rápido](#inicio-rápido)
2. [Cuentas de prueba](#cuentas-de-prueba)
3. [Rutas de la aplicación](#rutas-de-la-aplicación)
4. [Comandos útiles](#comandos-útiles)
5. [Arquitectura general](#arquitectura-general)
6. [Base de datos](#base-de-datos)
7. [Autenticación](#autenticación)
8. [Sistema de fila virtual](#sistema-de-fila-virtual)
9. [Venta escalonada](#venta-escalonada)
10. [Compra de entradas](#compra-de-entradas)
11. [Escaneo de QR](#escaneo-de-qr)
12. [Banners y assets](#banners-y-assets)
13. [Variables de entorno](#variables-de-entorno)
14. [Scripts de utilidad](#scripts-de-utilidad)
15. [Historial de cambios](#historial-de-cambios)
16. [Deuda técnica](#deuda-técnica)

---

## Inicio rápido

### Requisitos

- Node.js 18+
- npm 9+

### Instalación (primera vez)

```bash
# 1. Instalar dependencias
npm install

# 2. Generar cliente Prisma
npx prisma generate

# 3. Crear la base de datos SQLite y aplicar el esquema
npx prisma db push

# 4. Cargar datos de prueba
npx tsx prisma/seed.ts

# 5. Iniciar en modo desarrollo
npm run dev
```

Luego abrí: **http://localhost:3000**

### Flujo de compra de prueba

1. Entrá con `carlos@example.com` / `penarol2026`
2. Ir a **Eventos** → seleccionar un partido
3. Hacé click en un sector del mapa del estadio
4. Seleccioná cantidad y confirmá la compra
5. Ir a **Mis Tickets** para ver el QR generado

### Flujo de scanner (admin)

1. Entrá con `admin@ticketscap.com.uy` / `admin2026`
2. Ir a `/admin/scanner`
3. Copiá el `qrCode` de un ticket (visible en la DB con `npx prisma studio`)
4. Pegalo en el scanner y validá

---

## Cuentas de prueba

| Rol | Email | Contraseña | Notas |
|---|---|---|---|
| Admin | admin@ticketscap.com.uy | admin2026 | Acceso completo al panel |
| Socio Activo | carlos@example.com | penarol2026 | Matrícula CAP-001234 — cuota al día |
| Socio Adherente | maria@example.com | penarol2026 | Matrícula CAP-005678 — 30% descuento |
| Hincha sin socio | hincha@example.com | penarol2026 | Sin matrícula vinculada |
| Portero/Scanner | portero@ticketscap.com.uy | admin2026 | Solo acceso al scanner QR |

---

## Rutas de la aplicación

| Ruta | Descripción |
|---|---|
| `/` | Home con próximos partidos |
| `/eventos` | Listado de todos los eventos con filtros por torneo |
| `/eventos/:id` | Detalle del evento + mapa del estadio + compra |
| `/mis-tickets` | Wallet digital con QR de entradas |
| `/perfil` | Perfil del usuario y estado de socio |
| `/admin` | Dashboard de administración |
| `/admin/eventos` | Gestión de eventos |
| `/admin/socios` | Padrón de socios |
| `/admin/scanner` | Scanner QR para acceso al estadio |
| `/login` | Inicio de sesión |
| `/registro` | Registro de nueva cuenta |

---

## Comandos útiles

```bash
# Ver y editar la DB en el navegador
npx prisma studio

# Aplicar cambios de schema a la DB (requiere servidor detenido)
npx prisma db push

# Regenerar el cliente Prisma con tipos actualizados (requiere servidor detenido)
npx prisma generate

# Resetear la DB y volver a seedear
npx prisma db push --force-reset && npx tsx prisma/seed.ts

# Generar un QR_SECRET seguro para .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **Importante**: siempre detener el servidor antes de correr `prisma db push` o `prisma generate` en Windows — el archivo DLL de Prisma queda bloqueado mientras el servidor está activo.

---

## Arquitectura general

```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── eventos/
│   │   ├── page.tsx                # Listado de eventos con filtros
│   │   └── [id]/page.tsx           # Detalle del evento
│   ├── mis-tickets/page.tsx        # Tickets del usuario
│   ├── perfil/page.tsx             # Perfil de usuario
│   ├── admin/                      # Panel de administración
│   └── api/
│       ├── auth/                   # NextAuth + registro
│       ├── queue/                  # Fila virtual (join/status/release/admin)
│       ├── tickets/                # Compra y listado de entradas
│       ├── events/                 # CRUD de eventos (admin)
│       ├── scanner/                # Validación de QR en puerta
│       └── socios/                 # Búsqueda de socios
├── components/
│   ├── queue/
│   │   ├── QueueGate.tsx           # Orquestador principal de la fila
│   │   └── QueueWaitingRoom.tsx    # Sala de espera
│   ├── stadium/
│   │   └── StadiumSelector.tsx     # Selector de sectores y compra
│   ├── admin/
│   │   ├── AdminEventControls.tsx  # Controles de edición de evento
│   │   └── CreateEventForm.tsx     # Formulario de creación de evento
│   └── layout/
│       ├── Navbar.tsx
│       └── Footer.tsx
└── lib/
    ├── queue.ts                    # Constantes, tokens HMAC, prioridad
    ├── auth.ts                     # NextAuth config
    ├── prisma.ts                   # Singleton de Prisma
    ├── venta-escalonada.ts         # Cálculo de estado de venta por fecha
    ├── banner.ts                   # Composición de banners con sharp
    ├── team-logos.ts               # Logos conocidos de equipos
    └── utils.ts                    # Helpers de formato
```

---

## Base de datos

**Provider:** SQLite (archivo local `prisma/dev.db`)

### Modelos

| Modelo | Descripción |
|---|---|
| `User` | Usuario del sistema. Rol: `HINCHA`, `ADMIN`, `OPERADOR` |
| `Socio` | Datos del carnet de socio vinculado a un User |
| `Event` | Partido/espectáculo con configuración de venta |
| `Sector` | Sector del estadio con precio y disponibilidad |
| `Ticket` | Entrada individual con QR único |
| `Order` | Orden de compra (agrupa uno o más Tickets) |
| `QueueEntry` | Entrada en la fila virtual por usuario+evento |
| `AuditLog` | Log de acciones administrativas |

### Campos importantes de `Event`

| Campo | Tipo | Descripción |
|---|---|---|
| `filaVirtual` | Boolean | Si el evento usa fila virtual |
| `ventaEstado` | String | Estado manual: `CERRADO`, `PREVENTA_SOCIOS`, `PREVENTA_ADHERENTES`, `VENTA_GENERAL`, `AGOTADO` |
| `ventaEscalonadaActiva` | Boolean | Si usa fechas automáticas por fase |
| `diasAntesRanking` | Int | Días antes del evento en que abre la fase ranking |
| `diasAntesSocios` | Int | Días antes en que abre la fase socios |
| `diasAntesGeneral` | Int | Días antes en que abre la fase general |
| `rankingMinAsistenciaPct` | Int | Porcentaje mínimo de asistencia que debe tener un socio ranking para comprar en fase ranking. Default: 45 (45%) |
| `limiteXUsuario` | Int | Máximo de entradas por usuario |

### Modelo `QueueEntry`

| Campo | Descripción |
|---|---|
| `userId` + `eventId` | Unique — un usuario solo puede estar una vez en cada fila |
| `estado` | `ESPERANDO`, `ACTIVO`, `EXPIRADO`, `COMPLETADO` |
| `posicion` | Posición en la fila (1 = primero). 0 cuando es ACTIVO |
| `prioridad` | 0=general, 1=adherente, 2=socio ranking — determina orden de avance |
| `accessToken` | Token HMAC firmado, válido 15 minutos desde que se cede el slot |
| `accessExpiry` | Timestamp de expiración del accessToken |
| `expiresAt` | Expiración de la entrada en la fila (2h de espera máxima) |

---

## Autenticación

**Provider:** NextAuth v4 con `CredentialsProvider`

- Contraseñas hasheadas con `bcrypt` (salt rounds: 12)
- Sesión tipo `jwt` (no base de datos)
- El token JWT incluye: `id`, `name`, `email`, `role`, `socio` (objeto completo)
- Los datos de `socio` se re-leen de DB en cada `session()` callback para mantenerlos frescos

### Roles

| Rol | Permisos |
|---|---|
| `HINCHA` | Comprar entradas, ver sus tickets |
| `OPERADOR` | Acceso a panel admin (solo lectura + escaneo) |
| `ADMIN` | Acceso total: crear/editar eventos, gestionar socios, ver logs |

### Vinculación de socios

Un usuario puede vincularse a un socio mediante su matrícula en la página de perfil. El sistema valida que la matrícula exista en la tabla `socios` y que no esté ya vinculada a otro usuario.

---

## Sistema de fila virtual

### Constantes (`src/lib/queue.ts`)

```typescript
QUEUE_MAX_CONCURRENT = 50     // usuarios simultáneos en ventana de compra
QUEUE_ACCESS_MINUTES = 15     // minutos para completar la compra
QUEUE_ADVANCE_BATCH  = 6      // batch del avance manual desde admin
QUEUE_AUTO_THRESHOLD = 40     // viewers concurrentes para activar fila (no implementado aún)
```

### Flujo completo

```
Usuario llega al evento
        │
        ▼
┌───────────────────┐
│   QueueGate.tsx   │  ← Orquestador principal
└───────────────────┘
        │
        ├─► sessionStorage tiene token válido?
        │         └─► Sí → phase = "access" (directo a compra)
        │
        ├─► checkStatus() → /api/queue/status
        │         ├─► ACTIVO    → phase = "access"
        │         ├─► ESPERANDO → phase = "waiting"
        │         └─► Sin entrada → phase = "info"
        │
        ▼
    phase = "info"  →  botón "Continuar"
        │
        ▼
    POST /api/queue/join
        │
        ├─► Verifica elegibilidad (fase de venta)
        │         └─► No elegible → 403 + phase = "blocked"
        │
        ├─► Expira entradas ACTIVO vencidas
        │
        ├─► activoCount < 50?
        │         ├─► Sí → crea entrada ACTIVO + accessToken → phase = "access"
        │         └─► No → crea entrada ESPERANDO → phase = "waiting"
        │
        ▼
    phase = "waiting"  →  QueueWaitingRoom
        │  (poll cada 8s a /api/queue/status)
        │
        ▼
    status = "ACTIVO"  →  phase = "access"
        │
        ▼
    StadiumSelector  →  POST /api/tickets  →  /mis-tickets
```

### Tokens de acceso

Los `accessToken` se generan con HMAC-SHA256:

```
payload = userId:eventId:expiresAt
sig     = HMAC_SHA256(payload, QR_SECRET).hex().slice(0, 24)
token   = base64url({ userId, eventId, expiresAt, sig })
```

**Verificación en compra**: `/api/tickets` llama a `verifyAccessToken(queueToken)` antes de procesar. Verifica firma + expiración. Si `QR_SECRET` no está definido en `.env`, el servidor lanza un error claro al arrancar.

### Prioridad en la fila

```
0 = usuario general / sin socio
1 = adherente al día
2 = socio ranking al día (ACTIVO, SUSCRIPTOR, VITALICIO, INTERIOR)
```

Al avanzar la cola, primero pasan los de mayor prioridad, luego por orden de llegada (posición). El avance usa `prisma.$transaction([...])` para actualizar todos los slots en una sola operación batch.

### Liberación de slots

| Evento | Mecanismo | Efecto |
|---|---|---|
| Compra completada | `StadiumSelector` → COMPLETADO en DB + limpia sessionStorage | Slot cede, siguiente avanza en próximo poll |
| Timer de 15 min expira | `QueueWaitingRoom` countdown → redirect home | Status route expira entradas ACTIVO vencidas en cada poll |
| F5 / cerrar pestaña | `beforeunload` → limpia sessionStorage + `sendBeacon(/api/queue/release)` | sessionStorage limpio + slot EXPIRADO en DB |
| Navegar con Link (Next.js) | `beforeunload` NO se dispara | Slot preservado, sessionStorage intacto |
| Cerrar sesión | `signOut()` limpia `queue_access_*` en sessionStorage | Token inaccesible para otra sesión |

### Seguridad entre sesiones

- `sessionStorage` (no `localStorage`) — persiste en la misma pestaña aunque se navegue, pero se borra al cerrar o con F5
- El token guardado incluye `userId`: se valida al leer que coincida con el usuario actual
- Si el usuario no está autenticado, sessionStorage se limpia y se muestra phase "info"
- Al cerrar sesión, se limpian todos los tokens `queue_access_*` del sessionStorage

---

## Venta escalonada

**Archivo:** `src/lib/venta-escalonada.ts`

Cuando `ventaEscalonadaActiva = true`, el estado de venta se calcula en runtime comparando la fecha actual con las ventanas de apertura:

```
fechaEvento - diasAntesRanking  →  abre fase RANKING (solo socios ranking al día)
fechaEvento - diasAntesSocios   →  abre fase SOCIOS  (todos los socios al día)
fechaEvento - diasAntesGeneral  →  abre fase GENERAL (todos)
```

La función `computeVentaEstado(event, now)` devuelve el estado efectivo que se muestra en la UI (homepage, listado, detalle).

La validación de elegibilidad se hace **dos veces**:
1. Al intentar **unirse a la fila** (`/api/queue/join`)
2. Al intentar **comprar** (`/api/tickets`) — por si la ventana cambia entre ambos momentos

---

## Compra de entradas

**Endpoint:** `POST /api/tickets`

### Validaciones en orden

1. Sesión activa (NextAuth)
2. Si `filaVirtual`: token de cola válido (`verifyAccessToken`)
3. Sector existente y habilitado
4. `disponibles >= cantidad`
5. `existingTickets + cantidad <= limiteXUsuario`
6. Elegibilidad de venta (manual o escalonada)
7. Precio correcto según categoría de socio

### Precios

| Categoría | Precio |
|---|---|
| ACTIVO / SUSCRIPTOR / VITALICIO / INTERIOR (al día) | `precioSocio` |
| ADHERENTE al día | `precio * 0.70` (30% descuento) |
| Resto | `precio` (precio general) |

### Post-compra

- Crea `Order` + N `Ticket` con QR único por ticket
- Decrementa `disponibles` en el sector
- Redirige a `/mis-tickets?nuevo=1` (que muestra banner de éxito)
- Libera el slot de la fila (entrada pasa a COMPLETADO)
- Limpia sessionStorage del token de cola

---

## Escaneo de QR

**Endpoint:** `POST /api/scanner`

### Formato del QR

```
TCAP:{ticketId}:{signature_16hex}
```

La firma se genera con: `HMAC_SHA256(ticketId|userId|eventId|timestamp, QR_SECRET).hex().slice(0, 16)`

### Validaciones

1. Formato correcto (`TCAP:xxx:yyy`)
2. Ticket existe en DB
3. Estado del ticket: `ACTIVO`
4. Ventana de acceso: desde 3h antes hasta 2h después del evento
5. Firma HMAC válida

### Estados resultantes

| Resultado | Estado ticket |
|---|---|
| Entrada válida | `USADO` + `usadoAt = now()` |
| Ya escaneada | Error 409 (no cambia estado) |
| Fuera de ventana | Error 403 |
| QR inválido | Error 401 |

---

## Banners y assets

**Archivo:** `src/lib/banner.ts`

Los banners de eventos se generan con `sharp` (composición de imágenes).

### Logos de equipos

Los logos conocidos se almacenan en `public/images/logos/` y se referencian en `src/lib/team-logos.ts`.

**Comportamiento al generar banner:**
- Si `rivalEscudo` comienza con `/` (path local): se lee con `fs.readFileSync(path.join(process.cwd(), 'public', rivalEscudo))`
- Si es una URL externa: se hace `fetch()`

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Path al archivo SQLite: `file:./dev.db` |
| `NEXTAUTH_SECRET` | Sí | Secret para firmar tokens NextAuth |
| `NEXTAUTH_URL` | Sí | URL base de la app (ej: `http://localhost:3000`) |
| `QR_SECRET` | **Sí siempre** | Secret HMAC para access tokens de fila y QR de entradas. El servidor no arranca sin este valor. |

Para generar un `QR_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Scripts de utilidad

### `scripts/simulate-queue.ts`

Simula carga en la fila virtual para pruebas de rendimiento.

```bash
# Crear 50 entradas ACTIVO + 1000 ESPERANDO para un evento
npx tsx scripts/simulate-queue.ts --setup --eventId=<id>

# Liberar 10 slots cada 30 segundos (simular compradores reales)
npx tsx scripts/simulate-queue.ts --drain --eventId=<id> --interval=30 --batch=10

# Limpiar todos los datos de simulación
npx tsx scripts/simulate-queue.ts --clean --eventId=<id>
```

Los usuarios simulados tienen emails con prefijo `sim+` para identificarlos y se pueden eliminar con `--clean`.

---

## Historial de cambios

### 2026-05-15 — Bugs y seguridad

| Cambio | Archivos afectados |
|---|---|
| **Fix QR_SECRET sin fallback débil**: si `QR_SECRET` no está en `.env`, el servidor lanza un error claro en vez de usar `"queue-secret"` | `src/lib/queue.ts`, `api/tickets/route.ts` |
| **Fix O(N) queries en status route**: el avance de candidatos y el recálculo de posiciones ahora usan `prisma.$transaction([...])` — batch en una sola round-trip. Además, el recálculo se salta si no hubo candidatos que avanzaron | `api/queue/status/route.ts` |
| **Rename `rankingMinAntiguedad` → `rankingMinAsistenciaPct`**: campo renombrado en schema, APIs, componentes admin y tests para reflejar su significado real (% de asistencia, no años de antigüedad) | `prisma/schema.prisma`, `api/tickets/route.ts`, `api/events/route.ts`, `api/events/[id]/route.ts`, `AdminEventControls.tsx`, `CreateEventForm.tsx`, `admin/page.tsx`, `admin/eventos/page.tsx`, `api-tickets.test.ts` |
| **Eliminación de `(prisma.queueEntry as any)`**: todos los casts `as any` reemplazados por `prisma.queueEntry.*` con tipos correctos | `api/queue/join`, `api/queue/status`, `api/queue/release`, `api/queue/admin`, `api/tickets` |
| **Fix F5 libera slot**: `beforeunload` ahora limpia `sessionStorage` antes de enviar el beacon | `QueueGate.tsx`, `StadiumSelector.tsx` |
| **Fix "Crear cuenta" oculto si hay sesión**: botón en homepage condicional con `!session` | `src/app/page.tsx` |
| **Fix error `session is not defined` en homepage**: imports de `getServerSession` + `authOptions` agregados | `src/app/page.tsx` |

### Sesión anterior

| Cambio | Archivos afectados |
|---|---|
| **Sistema de fila virtual completo**: join, status, release, sala de espera, access token, prioridad, timer, renovación en re-login | `src/lib/queue.ts`, `api/queue/*`, `QueueGate.tsx`, `QueueWaitingRoom.tsx` |
| **Verificación de elegibilidad antes de unirse a la fila** | `api/queue/join/route.ts` |
| **Seguridad entre cuentas**: sessionStorage con userId binding, limpieza al logout | `QueueGate.tsx`, `Navbar.tsx` |
| **Post-compra correcta**: redirect a `/mis-tickets?nuevo=1`, libera slot, limpia sessionStorage | `StadiumSelector.tsx` |
| **Venta escalonada**: cálculo de fase en runtime con `computeVentaEstado` | `src/lib/venta-escalonada.ts` |
| **Fix banner con logos locales**: `fs.readFileSync` para paths `/images/logos/*` | `src/lib/banner.ts` |
| **Filtros de eventos**: Apertura → Intermedio → Clausura → Copa Libertadores → Copa Sudamericana → Copa AUF Uruguay | `src/app/eventos/page.tsx` |
| **Fix 500 en `/api/tickets`**: removido campo `emailEntradas` que no existe en schema | `api/tickets/route.ts` |
| **Script de simulación de carga** | `scripts/simulate-queue.ts` |

---

## Deuda técnica

| Prioridad | Problema | Estado |
|---|---|---|
| 🟢 Baja | HMAC de access tokens recortado a 96 bits (`.slice(0, 24)`) en vez del hash completo | Pendiente — aceptable para este sistema |
| 🟢 Baja | Tracker de viewers en memoria (`_trackers` Map) — se resetea al reiniciar el servidor | Pendiente — no crítico en dev |

---

*Actualizado: 2026-05-15*
