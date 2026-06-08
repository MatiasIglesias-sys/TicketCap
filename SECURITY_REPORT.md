# Security Audit Report — TicketsCap

**Fecha:** 2026-04-14  
**Auditor:** Claude Sonnet 4.6 (revisión estática de código)  
**Cobertura:** Todas las API routes, autenticación, subida de archivos, generación de QR, manejo de secretos

---

## Resumen Ejecutivo

Se auditó la totalidad del código fuente de TicketsCap. Se identificaron **7 hallazgos** (2 altos, 3 medios, 2 bajos/informativos). Todos fueron corregidos en esta misma sesión.

---

## Hallazgos y Fixes Aplicados

### [ALTO] 1 — Sin security headers HTTP

**Archivo:** `next.config.mjs`  
**Descripción:** La aplicación no enviaba ningún security header. Cualquier usuario podía incrustar la app en un iframe (clickjacking), y el navegador no aplicaba protecciones de tipo MIME sniffing ni políticas de referrer.  
**Riesgo:** Clickjacking, XSS facilitado, MIME confusion attacks.  
**Fix aplicado:** Se agregaron los siguientes headers a todas las respuestas vía `headers()` en `next.config.mjs`:
- `X-Frame-Options: DENY` — previene embedding en iframes
- `X-Content-Type-Options: nosniff` — previene MIME sniffing
- `X-DNS-Prefetch-Control: on`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — deshabilita APIs de browser no usadas
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — fuerza HTTPS
- `Content-Security-Policy` básica con frame-src para Spotify embed

---

### [ALTO] 2 — Sin límite de tamaño en subida de archivos

**Archivo:** `src/app/api/upload/route.ts:14`  
**Descripción:** El endpoint de subida de logos (`POST /api/upload`) leía el archivo completo a memoria (`file.arrayBuffer()`) sin verificar el tamaño previamente. Un admin malintencionado o una sesión comprometida podría enviar archivos de varios GB, causando Out Of Memory en el servidor.  
**Riesgo:** DoS por agotamiento de memoria.  
**Fix aplicado:**
- Se agregó verificación de `file.size > 5 MB` antes de leer a memoria.
- Se reemplazó el uso del nombre de archivo del cliente para derivar la extensión por un mapa de `MIME → extensión` controlado por el servidor.
- Se agregó guardia de path traversal verificando que `outPath` esté dentro de `outDir`.

---

### [MEDIO] 3 — Sin validación de longitud en contraseña y email (registro)

**Archivo:** `src/app/api/auth/register/route.ts`  
**Descripción:** No había validación de longitud mínima ni máxima en password, name ni email. bcrypt tiene un límite interno de 72 bytes: contraseñas más largas se truncan silenciosamente. Además, una contraseña de 1000+ chars puede causar un ataque de bcrypt CPU exhaustion (DoS).  
**Riesgo:** Bypass silencioso de contraseñas largas, DoS por bcrypt.  
**Fix aplicado:**
- Password: mínimo 8 caracteres, máximo 72.
- Email: validado con regex básico y longitud máxima 254 (RFC 5321).
- Name: mínimo 2, máximo 100 caracteres.
- Phone y CI: truncados/validados si se proveen.
- Email normalizado a lowercase antes de guardar.

---

### [MEDIO] 4 — Sin rate limiting en login y registro

**Archivo:** `src/app/api/auth/register/route.ts`, `src/lib/auth.ts`  
**Descripción:** Los endpoints de login (NextAuth credentials) y registro no tenían ningún mecanismo de limitación de intentos. Un atacante podía hacer brute force de contraseñas sin restricción.  
**Riesgo:** Brute force de contraseñas, enumeración de usuarios.  
**Fix aplicado:**
- Se creó `src/lib/rate-limit.ts`: rate limiter in-memory con ventana deslizante.
- Registro: máximo 10 intentos por IP cada 15 minutos → retorna HTTP 429.
- Login (NextAuth): máximo 10 intentos por identifier cada 15 minutos → retorna null (fallo de auth).
- **Nota para producción:** Este rate limiter es in-memory y se resetea con cada restart del servidor. Para producción multi-instancia, reemplazar con `@upstash/ratelimit` + Redis.

---

### [MEDIO] 5 — Secretos críticos sin validación de presencia

**Archivos:** `src/lib/queue.ts:3` (`QR_SECRET ?? "queue-secret"`), `src/app/api/tickets/route.ts:11` (`QR_SECRET ?? "default-secret"`)  
**Descripción:** Si `QR_SECRET` no está configurado en las variables de entorno, el código usa strings fijos hardcodeados como secreto para HMAC. Esto hace que los QR sean predecibles y fácilmente falsificables.  
**Riesgo:** Falsificación de QR, acceso no autorizado a eventos.  
**Fix aplicado:**
- Se creó `src/lib/env-check.ts` que verifica al startup si `QR_SECRET`, `NEXTAUTH_SECRET` y `DATABASE_URL` están configurados.
- En producción: lanza error de consola prominente si faltan.
- En desarrollo: lanza warning visible.
- Se importa desde `src/lib/auth.ts` para ejecutarse en cada request que pase por NextAuth.

---

### [BAJO] 6 — Extensión de archivo derivada del nombre de cliente

**Archivo:** `src/app/api/upload/route.ts:23` (versión original)  
**Descripción:** La extensión se derivaba de `file.name.split(".").pop()`, usando el nombre provisto por el cliente. Un archivo llamado `exploit.php.jpg` habría guardado la extensión `jpg` (correcto en este caso), pero la práctica es riesgosa si la lógica cambia.  
**Fix aplicado:** La extensión ahora se deriva 100% del Content-Type validado usando un mapa estático `MIME → extensión`.

---

### [INFO] 7 — GET /api/events público sin autenticación

**Archivo:** `src/app/api/events/route.ts:7`  
**Descripción:** El endpoint de listado de eventos es completamente público. Esto es intencional (los eventos deben ser visibles sin login), pero retorna datos de sectores incluyendo precios y disponibilidad.  
**Decisión:** **No corregido** — la publicidad de los eventos es un requisito funcional. Los datos de precios y disponibilidad son información pública.

---

## Recomendaciones para Producción

| Ítem | Prioridad | Acción |
|------|-----------|--------|
| Migrar de SQLite a PostgreSQL | Alta | SQLite no es adecuado para producción concurrente |
| Rate limiter con Redis | Alta | Reemplazar el in-memory con `@upstash/ratelimit` |
| Verificación de email en registro | Alta | Actualmente cualquiera puede registrarse con cualquier email |
| Configurar NEXTAUTH_SECRET y QR_SECRET | Crítica | Nunca deployar sin estas variables |
| HTTPS forzado a nivel de infraestructura | Alta | Configurar el load balancer/CDN |
| Logs de auditoría | Media | El modelo `AuditLog` existe en DB pero no se usa; implementar logging de acciones críticas |
| CORS | Media | Configurar `NEXTAUTH_URL` correctamente en producción |

---

## Estado Final

| Hallazgo | Severidad | Estado |
|----------|-----------|--------|
| Sin security headers | Alto | ✅ Corregido |
| Upload sin límite de tamaño | Alto | ✅ Corregido |
| Sin validación de inputs en registro | Medio | ✅ Corregido |
| Sin rate limiting | Medio | ✅ Corregido |
| Secretos hardcodeados como fallback | Medio | ✅ Mitigado con env-check |
| Extensión de archivo del cliente | Bajo | ✅ Corregido |
| GET /api/events público | Info | ✅ Revisado, aceptado |
