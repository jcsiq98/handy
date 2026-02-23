# 🚀 Handy — MVP Milestones

> **Objetivo**: Producto funcional demostrable en calls de Zoom.
> **Timeline**: 4-5 semanas
> **Stack**: NestJS (backend) + Next.js PWA (frontend) + WhatsApp Cloud API (proveedores) + PostgreSQL + Redis

---

## M1: Fundación del Proyecto (Semana 1, Días 1-3)

Configurar la base técnica completa: monorepo, backend, frontend, base de datos, y entorno de desarrollo local.

### Tareas

- [x] **M1.1** Inicializar monorepo con estructura de carpetas ✅
  ```
  handy/
  ├── backend/          # NestJS API
  ├── app/              # Next.js PWA (customer-facing)
  ├── shared/           # Types, constants, utils compartidos
  ├── docker-compose.yml
  ├── .env.example
  └── package.json      # Workspace root
  ```
- [x] **M1.2** Setup backend NestJS con TypeScript ✅
  - Instalar NestJS CLI, crear proyecto
  - Configurar ESLint, Prettier
  - Configurar variables de entorno (@nestjs/config)
  - Crear módulo de health check (`GET /api/health`)
- [x] **M1.3** Setup base de datos PostgreSQL + Prisma ORM ✅
  - docker-compose con PostgreSQL 16 + Redis 7
  - Configurar Prisma con schema inicial
  - Schema de tablas core:
    - `users` (id, phone, name, email, avatar_url, role, created_at)
    - `provider_profiles` (user_id, bio, service_types[], rating_avg, total_jobs, verified, availability, location_lat, location_lng)
    - `service_categories` (id, name, slug, icon, description, is_active)
    - `bookings` (id, customer_id, provider_id, category_id, status, description, address, lat, lng, scheduled_at, price, created_at, updated_at)
    - `messages` (id, booking_id, sender_id, sender_type, content, channel, wa_message_id, read_at, created_at)
    - `ratings` (id, booking_id, from_user_id, to_user_id, score, comment, created_at)
    - `otp_codes` (id, phone, code, expires_at, used, created_at)
    - `refresh_tokens` (id, user_id, token, expires_at, revoked, created_at)
  - Seed script con datos de prueba (10 proveedores ficticios con ratings)
- [x] **M1.4** Setup Redis para sessions y cache ✅
  - Conexión Redis desde NestJS (con fallback in-memory)
  - Service de session management
- [x] **M1.5** Setup Next.js 16 (App Router) para la PWA del cliente ✅
  - Crear proyecto con TypeScript, Tailwind CSS
  - Configurar PWA: manifest.json, iconos
  - Layout base (mobile-first, max-width 480px centrado)
  - Configurar tema de colores Indigo/Purple y tipografía Inter
- [x] **M1.6** Configurar CORS, rate limiting, helmet en backend ✅
- [x] **M1.7** Docker compose funcional: `docker compose up` levanta PostgreSQL + Redis ✅

### Testing M1

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T1.1 | Health check responde | Integration | `curl http://localhost:3000/api/health` → `{ "status": "ok" }` |
| T1.2 | PostgreSQL conectado | Integration | Backend log muestra conexión exitosa al iniciar |
| T1.3 | Redis conectado | Integration | Backend log muestra conexión Redis exitosa |
| T1.4 | Prisma migrations corren | DB | `npx prisma migrate dev` sin errores |
| T1.5 | Seed data se inserta | DB | `npx prisma db seed` → verificar en pgAdmin/psql que existen proveedores |
| T1.6 | Next.js corre | Frontend | `http://localhost:3001` muestra página inicial |
| T1.7 | PWA instalable | Frontend | En Chrome DevTools > Application > Manifest muestra ícono y nombre |
| T1.8 | Docker compose | Infra | `docker compose up -d` levanta PostgreSQL y Redis sin errores |
| T1.9 | CORS configurado | Security | Request desde `localhost:3001` a `localhost:3000` no es bloqueado |

---

## M2: Autenticación con OTP (Semana 1, Días 3-5)

Login/registro sin passwords usando código OTP enviado por WhatsApp o SMS.

### Tareas

- [ ] **M2.1** Módulo Auth en NestJS
  - `POST /api/auth/request-otp` — genera código 6 dígitos, guarda en DB con TTL 5min
  - `POST /api/auth/verify-otp` — verifica código, retorna JWT access + refresh tokens
  - `POST /api/auth/refresh` — renueva access token con refresh token
  - `POST /api/auth/logout` — invalida refresh token
- [ ] **M2.2** Envío de OTP
  - Opción A (MVP): Enviar OTP por WhatsApp usando la Cloud API que ya tenemos
  - Opción B (fallback): Console log del código para desarrollo
  - Preparar interfaz para integrar Twilio SMS después
- [ ] **M2.3** JWT Strategy con Passport
  - Access token (15min TTL)
  - Refresh token (30 días TTL, stored en Redis)
  - Guard global `@UseGuards(JwtAuthGuard)` para rutas protegidas
- [ ] **M2.4** User creation on first login
  - Si el teléfono no existe en DB → crear user con role 'customer'
  - Si existe → retornar user existente
  - Endpoint `GET /api/auth/me` para obtener perfil actual
- [ ] **M2.5** Pantallas de auth en Next.js
  - Pantalla de bienvenida/splash
  - Input de número de teléfono (con country code selector)
  - Input de código OTP (6 dígitos, auto-focus, auto-submit)
  - Redirect a home después de verificar
  - Guardar token en httpOnly cookie o secure localStorage
- [ ] **M2.6** Middleware de auth en Next.js
  - Proteger rutas que requieren login
  - Redirect a `/login` si no autenticado
  - Persistencia de sesión (no pedir login cada vez)

### Testing M2

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T2.1 | Request OTP genera código | Unit | POST `/api/auth/request-otp` con phone válido → 200 + código en DB |
| T2.2 | OTP expira después de 5min | Unit | Esperar 5min, verificar → 401 "Code expired" |
| T2.3 | OTP incorrecto rechazado | Unit | POST `/api/auth/verify-otp` con código malo → 401 |
| T2.4 | OTP correcto retorna JWT | Integration | POST `/api/auth/verify-otp` con código correcto → 200 + tokens |
| T2.5 | JWT protege rutas | Integration | GET `/api/auth/me` sin token → 401; con token → 200 + user |
| T2.6 | Refresh token funciona | Integration | POST `/api/auth/refresh` → nuevo access token válido |
| T2.7 | Usuario nuevo se crea | Integration | Login con teléfono nuevo → user creado en DB con role 'customer' |
| T2.8 | Usuario existente se encuentra | Integration | Login con teléfono existente → retorna mismo user ID |
| T2.9 | UI: Flujo completo | E2E | Abrir app → ingresar teléfono → ingresar OTP → llega a home |
| T2.10 | UI: Sesión persiste | E2E | Cerrar y reabrir app → sigue logueado sin pedir OTP |
| T2.11 | Rate limiting OTP | Security | Pedir OTP 6+ veces en 1min → 429 "Too many requests" |
| T2.12 | Código OTP es de 6 dígitos | Unit | Verificar que código generado es numérico y 6 chars |

---

## M3: Catálogo de Servicios y Proveedores (Semana 2, Días 1-3)

El cliente puede explorar servicios y ver perfiles de proveedores.

### Tareas

- [ ] **M3.1** API de categorías de servicio
  - `GET /api/services/categories` — lista todas las categorías activas
  - Datos: id, name, slug, icon (emoji o URL), description
  - Seed: Plomería, Electricidad, Limpieza, Jardinería, Reparaciones, Pintura, Cerrajería, Mudanzas
- [ ] **M3.2** API de proveedores
  - `GET /api/providers?category=plumbing&lat=X&lng=Y` — lista proveedores por categoría
  - Incluir: nombre, foto, rating promedio, total trabajos, bio corta, servicios
  - Ordenar por: rating (default), distancia (si hay coordenadas), total trabajos
  - Paginación (limit/offset)
  - `GET /api/providers/:id` — perfil completo de un proveedor
  - Incluir: todo lo anterior + bio completa, reviews recientes (últimos 10), tiempo en plataforma
- [ ] **M3.3** API de reviews de un proveedor
  - `GET /api/providers/:id/reviews?page=1&limit=10`
  - Datos: rating, comentario, nombre del cliente (primer nombre + inicial), fecha
- [ ] **M3.4** Pantalla Home del cliente
  - Header con saludo: "Hola, [nombre] 👋"
  - Barra de búsqueda (UI, funcional en M futuro)
  - Grid de categorías con iconos/emojis
  - Sección "Proveedores destacados" (top rated)
- [ ] **M3.5** Pantalla de lista de proveedores (por categoría)
  - Cards con: foto, nombre, rating (estrellas), # trabajos, bio corta
  - Indicador "Disponible" / "Ocupado" (basado en campo availability)
  - Pull-to-refresh
- [ ] **M3.6** Pantalla de perfil de proveedor
  - Foto grande, nombre, rating promedio con estrellas
  - Bio completa
  - Lista de servicios que ofrece
  - Reviews de otros clientes (scroll)
  - Botón CTA: "Solicitar Servicio" (fijo en bottom)
  - Botón secundario: "Contactar" (abre chat directo)
- [ ] **M3.7** Seed data con proveedores realistas
  - 8-12 proveedores con nombres, bios, fotos (placeholder de UI Faces o similar)
  - Reviews de prueba variados (1-5 estrellas, con comentarios)
  - Distribución realista de ratings (mayoría 4-5, algunos 3, pocos 1-2)

### Testing M3

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T3.1 | Categorías se listan | API | GET `/api/services/categories` → array con 8 categorías |
| T3.2 | Proveedores por categoría | API | GET `/api/providers?category=plumbing` → lista filtrada |
| T3.3 | Proveedor sin categoría devuelve todos | API | GET `/api/providers` → todos los proveedores |
| T3.4 | Perfil de proveedor completo | API | GET `/api/providers/:id` → incluye bio, reviews, rating |
| T3.5 | Reviews paginados | API | GET `/api/providers/:id/reviews?limit=5` → máx 5 reviews |
| T3.6 | Proveedor inexistente → 404 | API | GET `/api/providers/fake-id` → 404 |
| T3.7 | UI: Home muestra categorías | E2E | Abrir home → ver grid de categorías con iconos |
| T3.8 | UI: Tap categoría → lista | E2E | Tap "Plomería" → ver lista de plomeros |
| T3.9 | UI: Tap proveedor → perfil | E2E | Tap un proveedor → ver perfil completo con reviews |
| T3.10 | UI: Botón "Solicitar" visible | E2E | En perfil de proveedor → botón "Solicitar Servicio" fijo en bottom |
| T3.11 | Performance: categorías < 200ms | Perf | Respuesta de API en menos de 200ms |
| T3.12 | Performance: proveedores < 500ms | Perf | Lista de proveedores carga en menos de 500ms |

---

## M4: Flujo de Booking / Solicitud de Servicio (Semana 2, Días 3-5)

El cliente puede solicitar un servicio a un proveedor específico.

### Tareas

- [ ] **M4.1** API de creación de solicitud
  - `POST /api/bookings` — crear service request
  - Body: `{ providerId, categoryId, description, address, lat, lng, scheduledAt? }`
  - Validaciones: proveedor existe, categoría válida, descripción no vacía
  - Status inicial: `pending`
  - Retorna: booking completo con ID
- [ ] **M4.2** API de gestión de solicitudes
  - `GET /api/bookings` — mis solicitudes (como cliente)
  - `GET /api/bookings/:id` — detalle de una solicitud
  - `PATCH /api/bookings/:id/cancel` — cancelar solicitud (solo si status es pending/accepted)
  - Status flow: `pending → accepted → in_progress → completed → rated` (o `cancelled` desde pending/accepted)
- [ ] **M4.3** Pantalla de solicitud (flujo multi-step)
  - Step 1: Descripción del problema (textarea + opción de foto futura)
  - Step 2: Dirección / ubicación (input texto por ahora, GPS en futuro)
  - Step 3: ¿Cuándo? (Hoy / Mañana / Elegir fecha)
  - Step 4: Resumen y confirmar
  - Animación de "Enviando solicitud..." → "¡Solicitud enviada!"
- [ ] **M4.4** Pantalla de seguimiento de solicitud (post-booking)
  - Status con timeline visual (pending → accepted → in_progress → completed)
  - Info del proveedor asignado
  - Botón de chat
  - Botón de cancelar (si aplica)
- [ ] **M4.5** Pantalla de historial de solicitudes
  - Lista de todas mis solicitudes pasadas
  - Filtro por status (activas / completadas / canceladas)
  - Tap → detalle de la solicitud
- [ ] **M4.6** Notificación en tiempo real cuando el proveedor acepta
  - WebSocket (Socket.IO) para push en tiempo real
  - Actualizar UI sin refresh

### Testing M4

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T4.1 | Crear booking | API | POST `/api/bookings` → 201 + booking con status "pending" |
| T4.2 | Booking sin auth → 401 | API | POST `/api/bookings` sin JWT → 401 |
| T4.3 | Booking con proveedor inexistente → 404 | API | providerId fake → 404 |
| T4.4 | Booking sin descripción → 400 | API | description vacía → 400 validation error |
| T4.5 | Listar mis bookings | API | GET `/api/bookings` → solo bookings del usuario actual |
| T4.6 | Cancelar booking pending | API | PATCH `/api/bookings/:id/cancel` → status "cancelled" |
| T4.7 | Cancelar booking completed → error | API | No se puede cancelar un booking ya completado → 400 |
| T4.8 | UI: Flujo completo de solicitud | E2E | Describir problema → dirección → fecha → confirmar → ver tracking |
| T4.9 | UI: Status se actualiza en real-time | E2E | Proveedor acepta → pantalla del cliente cambia sin refresh |
| T4.10 | UI: Historial muestra bookings | E2E | Ir a historial → ver solicitudes pasadas con status |
| T4.11 | UI: Cancelar desde la app | E2E | En tracking → cancelar → confirmar → status cambia a "cancelled" |
| T4.12 | No crear booking duplicado | API | Crear 2 bookings al mismo proveedor con click rápido → solo 1 |

---

## M5: Integración WhatsApp para Proveedores (Semana 3, Días 1-3)

Cuando un cliente solicita un servicio, el proveedor es notificado por WhatsApp y puede aceptar/rechazar.

### Tareas

- [ ] **M5.1** Módulo WhatsApp en NestJS
  - Migrar/adaptar whatsappService.js existente a módulo NestJS (TypeScript)
  - Funciones: sendTextMessage, sendInteractiveButtons, sendInteractiveList, markAsRead
  - Webhook controller para recibir mensajes entrantes de WhatsApp
  - Verificación de webhook (Meta challenge)
- [ ] **M5.2** Notificación de nuevo trabajo al proveedor
  - Cuando se crea un booking → enviar WhatsApp al proveedor:
    ```
    🔔 *¡Nuevo trabajo!*
    
    📋 Servicio: Plomería
    📝 "Se me rompió un tubo en el baño"
    📍 Col. Roma Norte, CDMX
    📅 Hoy
    👤 Cliente: María G. (⭐ 4.8)
    
    [✅ Aceptar]  [❌ Rechazar]
    ```
  - Botones interactivos de WhatsApp para aceptar/rechazar
- [ ] **M5.3** Procesamiento de respuesta del proveedor
  - Proveedor toca "Aceptar":
    - Actualizar booking status → `accepted`
    - Notificar al cliente (WebSocket + push futuro)
    - Enviar al proveedor: "✅ ¡Trabajo aceptado! El cliente será notificado."
  - Proveedor toca "Rechazar":
    - Actualizar booking status → `rejected`
    - Notificar al cliente
    - (Futuro: ofrecer a otro proveedor)
- [ ] **M5.4** Flujo de estado del proveedor por WhatsApp
  - Después de aceptar, enviar opciones:
    ```
    ¿Qué deseas hacer?
    [📍 Estoy en camino]  [💬 Chat con cliente]
    ```
  - "Estoy en camino" → actualizar status a `provider_arriving`
  - Al llegar y empezar: "Escribe *empezar* cuando inicies el trabajo"
  - "empezar" → status `in_progress`
  - "Escribe *completar* cuando termines"
  - "completar" → status `completed` → trigger rating flow
- [ ] **M5.5** State machine del proveedor en WhatsApp
  - Reutilizar patrón de session manager del proyecto actual
  - Estados: IDLE → REQUEST_RECEIVED → ACCEPTED → ARRIVING → IN_PROGRESS → COMPLETED
  - Manejar mensajes fuera de flujo con mensaje de ayuda
- [ ] **M5.6** Timeout de solicitud
  - Si el proveedor no responde en 10 minutos → auto-rechazar
  - Notificar al cliente: "El proveedor no respondió, ¿deseas buscar otro?"

### Testing M5

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T5.1 | Webhook WhatsApp verificación | Integration | GET webhook con challenge → responde con challenge |
| T5.2 | Booking crea notificación WA | Integration | Crear booking → proveedor recibe WhatsApp con detalles |
| T5.3 | Proveedor acepta → status cambia | Integration | Tap "Aceptar" en WA → booking status = "accepted" en DB |
| T5.4 | Proveedor rechaza → status cambia | Integration | Tap "Rechazar" en WA → booking status = "rejected" en DB |
| T5.5 | Cliente notificado de aceptación | Integration | Proveedor acepta → WebSocket envía update al cliente |
| T5.6 | Flujo completo WA | E2E Manual | Crear booking desde app → WA llega → aceptar → en camino → empezar → completar |
| T5.7 | Timeout funciona | Integration | No responder 10min → status auto-rejected |
| T5.8 | Mensaje fuera de flujo | WA | Proveedor escribe "hola" random → recibe menú de ayuda |
| T5.9 | State machine persiste | Integration | Proveedor acepta, espera 1h, escribe "empezar" → funciona correctamente |
| T5.10 | Doble aceptación ignorada | API | Proveedor toca "Aceptar" 2 veces → solo primera cuenta |
| T5.11 | Webhook duplicados manejados | API | WhatsApp envía mismo webhook 2 veces → no duplica acciones |

---

## M6: Chat Bridge — App ↔ WhatsApp (Semana 3, Días 3-5)

El cliente escribe en la app, el proveedor lee en WhatsApp. Y viceversa. Ambos creen estar en una conversación normal.

### Tareas

- [ ] **M6.1** Módulo de mensajes en backend
  - `POST /api/bookings/:id/messages` — enviar mensaje (desde app)
  - `GET /api/bookings/:id/messages` — obtener historial de mensajes
  - Guardar cada mensaje con: sender_id, sender_type, content, channel (app/whatsapp), timestamp
- [ ] **M6.2** Bridge: App → WhatsApp
  - Cliente envía mensaje desde la app
  - Backend recibe → guarda en DB → envía por WhatsApp al proveedor
  - Formato WA: `💬 *María* dice:\n"¿A qué hora puedes venir?"`
  - Manejar rate limits de WhatsApp (máx 80 msgs/seg)
- [ ] **M6.3** Bridge: WhatsApp → App
  - Proveedor responde en WhatsApp
  - Webhook recibe → identifica booking activo → guarda en DB → envía por WebSocket al cliente
  - El cliente ve el mensaje aparecer en tiempo real en la app
- [ ] **M6.4** Pantalla de chat en la app
  - Diseño tipo WhatsApp/iMessage (burbujas, timestamps)
  - Mensajes del cliente a la derecha (azul), proveedor a la izquierda (gris)
  - Input de texto con botón enviar
  - Auto-scroll al nuevo mensaje
  - Indicador "escribiendo..." (nice to have)
  - Mensaje de sistema: "Chat iniciado", "Servicio completado"
- [ ] **M6.5** WebSocket para mensajes en tiempo real
  - Socket.IO namespace para chat: `/chat`
  - Eventos: `message:new`, `message:read`, `typing`
  - Autenticación del socket con JWT
- [ ] **M6.6** Manejar mensajes cuando la app está cerrada
  - Guardar mensajes en DB siempre
  - Al abrir el chat → cargar historial completo desde API
  - Badge/indicador de mensajes no leídos (futuro: push notification)

### Testing M6

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T6.1 | Enviar mensaje desde app | API | POST message → 201 + guardado en DB |
| T6.2 | Mensaje llega a WhatsApp | Integration | Enviar desde app → proveedor ve mensaje en WA |
| T6.3 | Respuesta WA llega a app | Integration | Proveedor responde en WA → mensaje aparece en app |
| T6.4 | Historial se carga | API | GET messages → lista ordenada cronológicamente |
| T6.5 | WebSocket entrega en real-time | Integration | Proveedor envía → cliente conectado ve en <2 segundos |
| T6.6 | Chat sin booking activo → error | API | POST message a booking cancelado → 400 |
| T6.7 | Solo participantes pueden chatear | Security | User C intenta chatear en booking de User A → 403 |
| T6.8 | Mensajes offline se guardan | Integration | App cerrada → proveedor envía → abrir app → mensajes ahí |
| T6.9 | UI: Burbujas correctas | E2E | Mis mensajes azul derecha, proveedor gris izquierda |
| T6.10 | UI: Auto-scroll | E2E | Nuevo mensaje → chat scrollea automáticamente |
| T6.11 | Mensaje largo no rompe layout | UI | Enviar mensaje de 500+ caracteres → se muestra correctamente |
| T6.12 | Emojis y caracteres especiales | Integration | Enviar "🔧 ¡Listo! ¿$500 está bien?" → llega correctamente a ambos lados |

---

## M7: Ratings y Reviews (Semana 4, Días 1-2)

Después de completar un servicio, ambos se califican mutuamente.

### Tareas

- [ ] **M7.1** API de ratings
  - `POST /api/bookings/:id/rate` — calificar (como cliente al proveedor, o vice versa)
  - Body: `{ score: 1-5, comment?: string }`
  - Validaciones: booking debe estar en status "completed", no puede calificar dos veces, solo participantes
  - Actualizar rating_average del proveedor/cliente al guardar
- [ ] **M7.2** Rating flow en la app (cliente califica al proveedor)
  - Después de "Servicio completado" → mostrar pantalla de calificación
  - Selector de estrellas (1-5) con animación
  - Campo de comentario (opcional)
  - "Enviar" → guardar → mostrar "¡Gracias!"
  - Si no califica → recordatorio después de 24h (futuro)
- [ ] **M7.3** Rating flow en WhatsApp (proveedor califica al cliente)
  - Después de completar → enviar al proveedor:
    ```
    ⭐ ¿Cómo estuvo el cliente?
    [⭐ 1-2 Mal]  [⭐⭐⭐ 3 OK]  [⭐⭐⭐⭐⭐ 4-5 Excelente]
    ```
  - Opción de dejar comentario o skip
  - Guardar rating del cliente
- [ ] **M7.4** Mostrar ratings en perfil de proveedor
  - Rating promedio actualizado
  - Reviews más recientes visibles en perfil
- [ ] **M7.5** Mostrar rating del cliente al proveedor
  - En la notificación de nuevo trabajo: "👤 Cliente: María G. (⭐ 4.8)"
  - Proveedores con más info toman mejores decisiones

### Testing M7

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T7.1 | Calificar proveedor | API | POST rate con score 5 → 201 + rating guardado |
| T7.2 | No calificar dos veces | API | POST rate segundo vez → 400 "Already rated" |
| T7.3 | Solo participantes califican | Security | User C califica booking de User A → 403 |
| T7.4 | Solo bookings completed | API | Calificar booking pending → 400 |
| T7.5 | Rating promedio se actualiza | DB | Después de calificar → provider.rating_avg recalculado |
| T7.6 | Score fuera de rango → error | API | Score 0 o 6 → 400 validation error |
| T7.7 | UI: Estrellas animadas | E2E | Tap estrellas → animación, color cambia |
| T7.8 | UI: Pantalla aparece post-servicio | E2E | Servicio completado → pantalla de rating aparece |
| T7.9 | WA: Proveedor califica | Integration | Proveedor toca botón de rating → guardado en DB |
| T7.10 | Reviews visibles en perfil | E2E | Ir a perfil de proveedor → ver reviews recientes |

---

## M8: Deploy, PWA y Polish (Semana 4, Días 3-5)

Desplegar todo en la nube para poder mostrar en demos.

### Tareas

- [ ] **M8.1** Deploy del backend
  - Railway o Render para NestJS
  - Variables de entorno configuradas
  - PostgreSQL managed (Railway o Supabase)
  - Redis managed (Upstash)
  - SSL/HTTPS automático
- [ ] **M8.2** Deploy del frontend
  - Vercel para Next.js (free tier)
  - Dominio personalizado (ej: app.handy.com o handy-app.vercel.app)
  - Variables de entorno (API URL)
- [ ] **M8.3** Configurar WhatsApp webhook con URL de producción
  - Actualizar webhook URL en Meta Developer Dashboard
  - Verificar que mensajes llegan al backend en producción
- [ ] **M8.4** PWA final touches
  - manifest.json con nombre, colores, iconos
  - Splash screen
  - Instalar prompt ("Agregar a pantalla de inicio")
  - Verificar en iPhone Safari + Android Chrome
- [ ] **M8.5** UI Polish
  - Loading skeletons en listas
  - Empty states con ilustraciones
  - Error states con retry
  - Transiciones y animaciones suaves
  - Responsive en diferentes tamaños de pantalla móvil
- [ ] **M8.6** Datos de demo
  - Seed de producción con proveedores que se vean reales
  - Fotos de perfil de stock (Unsplash/AI generated)
  - Direcciones reales de la ciudad de lanzamiento
  - Reviews y ratings realistas
- [ ] **M8.7** Demo script
  - Paso a paso de lo que se muestra en la call de Zoom
  - Screenshots / screen recording como backup
  - Tener dos dispositivos listos (app + WhatsApp del proveedor)

### Testing M8

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T8.1 | Backend live responde | Smoke | `curl https://api.handy.com/api/health` → 200 |
| T8.2 | Frontend live carga | Smoke | Abrir URL en navegador → app carga correctamente |
| T8.3 | Auth funciona en prod | E2E | Login con teléfono real → recibir OTP → entrar |
| T8.4 | WhatsApp webhook funciona en prod | E2E | Crear booking → proveedor recibe WA en teléfono real |
| T8.5 | Chat bridge funciona en prod | E2E | Enviar mensaje desde app → llega a WA → respuesta llega a app |
| T8.6 | PWA instalable en iPhone | E2E | Safari → Share → Add to Home Screen → abre como app |
| T8.7 | PWA instalable en Android | E2E | Chrome → prompt de instalación → abre como app |
| T8.8 | Performance: page load < 3s | Perf | Lighthouse score > 80 |
| T8.9 | Flujo completo sin errores | E2E | Login → browse → book → WA acepta → chat → complete → rate |
| T8.10 | Demo con 2 dispositivos | Manual | Ensayar demo script completo sin interrupciones |

---

## Resumen de Entregables MVP

| Semana | Milestones | Entregable |
|--------|-----------|------------|
| 1 | M1 + M2 | Backend corriendo + Auth funcional + App con login |
| 2 | M3 + M4 | Cliente puede explorar servicios y crear solicitudes |
| 3 | M5 + M6 | WhatsApp notifica proveedores + Chat bridge funcional |
| 4 | M7 + M8 | Ratings + Deploy + Demo listo para Zoom calls |

### Métricas de éxito del MVP

- [ ] Un usuario puede, desde su teléfono, solicitar un servicio a un proveedor
- [ ] El proveedor recibe la solicitud en su WhatsApp y puede aceptar
- [ ] Ambos pueden chatear (app ↔ WhatsApp) sin fricción
- [ ] Después del servicio, ambos se califican
- [ ] Todo funciona en una URL pública demostrable en Zoom
- [ ] La app se siente nativa cuando se instala como PWA

