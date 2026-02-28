# 🚀 Handy — MVP 2 Milestones

> **Objetivo**: Producto desplegado en internet, con onboarding de proveedores vía WhatsApp, verificación de identidad, y filtros de ubicación.
> **Prerequisito**: MVP 1 completado (M1-M8)
> **Stack adicional**: Vercel (frontend) + Railway (backend) + Neon (PostgreSQL) + Upstash (Redis) + API de verificación facial

---

## M1: Deploy — Llevar la app al mundo real

Desplegar backend y frontend en la nube para que cualquier persona con el link pueda usar la app.

### Tareas

- [ ] **M1.1** Configurar base de datos PostgreSQL en producción
  - Crear cuenta en [Neon](https://neon.tech) (tier gratis: 500MB, 1 proyecto)
  - Crear base de datos `handy_prod`
  - Guardar la `DATABASE_URL` de producción

- [ ] **M1.2** Configurar Redis en producción
  - Crear cuenta en [Upstash](https://upstash.com) (tier gratis: 10K req/día)
  - Crear base de datos Redis
  - Guardar la `REDIS_URL` de producción

- [ ] **M1.3** Desplegar backend en Railway
  - Crear cuenta en [Railway](https://railway.app)
  - Conectar repositorio de GitHub
  - Configurar variables de entorno de producción:
    ```
    DATABASE_URL=postgresql://...@neon.tech/handy_prod
    REDIS_URL=redis://...@upstash.com
    JWT_SECRET=<generar con openssl rand -hex 32>
    JWT_REFRESH_SECRET=<generar con openssl rand -hex 32>
    WHATSAPP_TOKEN=<token permanente>
    WHATSAPP_PHONE_NUMBER_ID=<id>
    WHATSAPP_VERIFY_TOKEN=handy-2026-verify
    WHATSAPP_API_URL=https://graph.facebook.com/v21.0
    FRONTEND_URL=https://handy-app.vercel.app
    NODE_ENV=production
    ```
  - Verificar que el Dockerfile funciona en Railway
  - Correr migraciones en producción: `npx prisma migrate deploy`
  - Seed inicial: `npx prisma db seed`
  - Verificar: `https://<app>.railway.app/api/health` → status: ok

- [ ] **M1.4** Desplegar frontend en Vercel
  - Crear cuenta en [Vercel](https://vercel.com)
  - Conectar repositorio → seleccionar directorio `handy/app`
  - Configurar variables de entorno:
    ```
    NEXT_PUBLIC_API_URL=https://<backend>.railway.app
    ```
  - Actualizar `next.config.ts` para apuntar la API a producción
  - Verificar: `https://handy-app.vercel.app` carga correctamente

- [ ] **M1.5** Configurar webhook de WhatsApp en producción
  - En Meta Developer → WhatsApp → Configuration → Webhook:
    - Callback URL: `https://<backend>.railway.app/api/webhook`
    - Verify token: `handy-2026-verify`
  - Ya no se necesita ngrok — Railway tiene URL pública fija
  - Verificar: crear booking → notificación llega a WhatsApp → "aceptar" funciona

- [ ] **M1.6** Configurar dominio personalizado (opcional)
  - Comprar dominio (ej: `handyapp.mx`)
  - Apuntar DNS a Vercel (frontend) y Railway (backend API)
  - Actualizar CORS y FRONTEND_URL

### Verificación M1
```
✅ https://handy-app.vercel.app carga la app
✅ Login con OTP funciona
✅ Se ven los proveedores con sus datos
✅ Crear booking → notificación llega a WhatsApp
✅ Aceptar desde WhatsApp → estado cambia en la app
✅ Chat bidireccional app ↔ WhatsApp funciona
✅ /api/health muestra todos los componentes en verde
```

---

## M2: Onboarding de Proveedores vía WhatsApp — Datos Básicos

El proveedor se registra completamente por WhatsApp, sin descargar ninguna app.
Solo necesita: su celular con WhatsApp + su INE.

### Flujo del usuario

```
Proveedor envía mensaje → Bot responde con bienvenida
→ Pregunta nombre → Pregunta servicios → Pregunta experiencia
→ Pregunta zonas de servicio → Envía link de verificación de identidad
→ "Tu solicitud está en revisión" → Admin aprueba → "¡Bienvenido!"
```

### Tareas

- [ ] **M2.1** Crear estado de onboarding en el handler de WhatsApp
  - Nuevos estados en `ProviderState`:
    ```
    ONBOARDING_NAME        → Pidiendo nombre completo
    ONBOARDING_SERVICES    → Pidiendo categorías de servicio
    ONBOARDING_EXPERIENCE  → Pidiendo años de experiencia
    ONBOARDING_ZONES       → Pidiendo zonas de servicio
    ONBOARDING_BIO         → Pidiendo descripción corta (opcional)
    ONBOARDING_VERIFY      → Esperando verificación de identidad
    ONBOARDING_REVIEW      → En revisión por admin
    ```

- [ ] **M2.2** Crear flujo de onboarding en `whatsapp-provider.handler.ts`
  - Detectar cuando un número no-registrado escribe al bot
  - En vez de "esta línea es solo para proveedores", iniciar onboarding
  - Flujo conversacional:
    1. "¡Hola! ¿Quieres ofrecer tus servicios en Handy? Escribe *si* para comenzar"
    2. "¿Cuál es tu nombre completo?" → guardar
    3. "¿Qué servicios ofreces?" → mostrar lista de categorías con números:
       ```
       1. 🔧 Plomería
       2. ⚡ Electricidad
       3. 🎨 Pintura
       ...
       Escribe los números separados por coma (ej: 1,3,5)
       ```
    4. "¿Cuántos años de experiencia tienes?" → guardar
    5. "¿En qué zona(s) trabajas?" → link a mini-página web con mapa
       (o alternativa: pedir nombres de colonias por texto)
    6. "Escribe una descripción corta de ti (opcional, escribe *skip* para omitir)"
    7. "Último paso: verificación de identidad → [link]"

- [ ] **M2.3** Actualizar schema de Prisma para onboarding
  ```prisma
  model ProviderApplication {
    id              String   @id @default(uuid())
    phone           String   @unique
    name            String
    bio             String?
    yearsExperience Int      @default(0)
    categories      String[] // slugs de categorías
    serviceZones    String[] // nombres de zonas/colonias
    
    // Verificación de identidad
    inePhotoFront   String?  // URL de la foto
    inePhotoBack    String?  // URL de la foto
    selfiePhoto     String?  // URL de la foto
    verificationStatus VerificationStatus @default(PENDING)
    verificationNotes  String?
    
    // Estado del onboarding
    onboardingStep  String   @default("NAME")
    
    // Admin review
    reviewedBy      String?  // admin user id
    reviewedAt      DateTime?
    
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }
  
  enum VerificationStatus {
    PENDING         // Esperando que complete onboarding
    DOCS_SUBMITTED  // Fotos enviadas, esperando revisión
    APPROVED        // Aprobado por admin
    REJECTED        // Rechazado
  }
  ```

- [ ] **M2.4** Crear endpoint para recibir fotos de verificación
  - `POST /api/onboarding/:applicationId/upload` — subir fotos (INE + selfie)
  - Almacenar fotos en S3/Cloudinary/similar
  - Actualizar estado a `DOCS_SUBMITTED`

- [ ] **M2.5** Al completar onboarding, enviar resumen al proveedor
  ```
  📋 *Resumen de tu solicitud:*
  
  👤 Nombre: Juan Pérez
  🔧 Servicios: Plomería, Electricidad
  📅 Experiencia: 5 años
  📍 Zonas: Condesa, Roma Norte, Juárez
  📸 Identidad: Pendiente de verificación
  
  Te notificaremos cuando tu cuenta sea aprobada (24-48 horas).
  ```

### Verificación M2
```
✅ Número nuevo envía mensaje → inicia flujo de onboarding
✅ El proveedor puede completar datos básicos por WhatsApp
✅ Se crea ProviderApplication en la BD
✅ Se guarda resumen y se notifica al proveedor
```

---

## M3: Verificación de Identidad (INE + Selfie + Facial Match)

### Tareas

- [ ] **M3.1** Crear mini-página web de verificación (`/verify/:token`)
  - Página standalone (no requiere login, acceso via token temporal)
  - Diseño mobile-first, ultra simple:
    - Paso 1: "Toma foto de tu INE (frente)" → activa cámara
    - Paso 2: "Ahora el reverso de tu INE"
    - Paso 3: "Tómate una selfie mirando a la cámara"
    - Paso 4: "¡Listo! Enviaremos tus datos para revisión"
  - Generar link temporal con JWT (expira en 1 hora)
  - El bot envía el link por WhatsApp

- [ ] **M3.2** Implementar almacenamiento de fotos
  - Opción A: Cloudinary (tier gratis: 25K transformaciones/mes)
  - Opción B: AWS S3 + presigned URLs
  - Opción C: Supabase Storage (tier gratis: 1GB)
  - Las fotos son sensibles — encriptar o limitar acceso

- [ ] **M3.3** Implementar comparación facial (Opción Híbrida)
  - **Fase 1 (MVP)**: Comparación manual por admin
    - Admin ve las 3 fotos lado a lado
    - Botón: "✅ Coincide" / "❌ No coincide"
  - **Fase 2 (futuro)**: API automática
    - AWS Rekognition `CompareFaces` (~$1 por 1000 comparaciones)
    - O Metamap para LATAM (~$1-2 por verificación)
    - Score de confianza: >90% = auto-aprobar, <70% = rechazar, medio = revisión manual

- [ ] **M3.4** Implementar liveness detection (anti-spoofing)
  - **Fase 1 (MVP)**: Instrucciones simples
    - "Parpadea 2 veces" o "Gira la cabeza a la derecha"
    - Capturar video corto (3 segundos) en vez de solo foto
  - **Fase 2 (futuro)**: SDK de liveness (Metamap, AWS Rekognition FaceLiveness)

- [ ] **M3.5** Notificar resultado por WhatsApp
  - Aprobado: "✅ ¡Tu cuenta ha sido aprobada! Ya puedes recibir trabajos."
    → Crear User + ProviderProfile automáticamente
  - Rechazado: "❌ No pudimos verificar tu identidad. Motivo: [X]. Puedes intentar de nuevo."

### Verificación M3
```
✅ Link de verificación abre correctamente en el celular
✅ Cámara funciona y captura fotos INE + selfie
✅ Fotos se suben y almacenan correctamente
✅ Admin puede ver y comparar las fotos
✅ Al aprobar, se crea la cuenta del proveedor
✅ Proveedor recibe notificación de aprobación/rechazo por WhatsApp
```

---

## M4: Zonas de Servicio — Proveedores

Los proveedores definen dónde trabajan. Se configura durante onboarding y se puede modificar después.

### Tareas

- [ ] **M4.1** Actualizar schema de Prisma
  ```prisma
  model ServiceZone {
    id        String   @id @default(uuid())
    name      String   // "Condesa", "Roma Norte", etc.
    city      String   // "Ciudad de México"
    state     String   // "CDMX"
    country   String   @default("MX")
    lat       Float?   // Centro de la zona (opcional)
    lng       Float?
    isActive  Boolean  @default(true)
    
    providers ProviderServiceZone[]
    
    @@unique([name, city])
  }
  
  model ProviderServiceZone {
    providerId String
    zoneId     String
    provider   ProviderProfile @relation(fields: [providerId], references: [id])
    zone       ServiceZone     @relation(fields: [zoneId], references: [id])
    
    @@id([providerId, zoneId])
  }
  
  // Alternativa más simple: agregar a ProviderProfile
  model ProviderProfile {
    // ... campos existentes ...
    baseLat          Float?    // Ubicación base del proveedor
    baseLng          Float?
    serviceRadiusKm  Int       @default(10)
    serviceZones     ProviderServiceZone[]
  }
  ```

- [ ] **M4.2** Seed de zonas para ciudades principales
  - CDMX: Condesa, Roma Norte, Roma Sur, Polanco, Del Valle, Narvarte, Coyoacán, etc.
  - Monterrey: San Pedro, Valle, Cumbres, etc.
  - Guadalajara: Chapultepec, Providencia, etc.
  - Usar API de geocoding para obtener coordenadas de cada zona

- [ ] **M4.3** Crear mini-página web de selección de zonas
  - Accesible via link desde WhatsApp (sin login, token temporal)
  - Mapa interactivo con zonas marcadas
  - El proveedor toca las zonas donde trabaja
  - Alternativa simple: lista de checkboxes por ciudad
  - Guardar selección → actualizar ProviderServiceZone

- [ ] **M4.4** Permitir configurar zonas vía WhatsApp (alternativa sin web)
  - "¿En qué ciudad trabajas?" → seleccionar
  - "¿En qué zonas/colonias trabajas?" → escribir nombres separados por coma
  - Match fuzzy contra la tabla de ServiceZone
  - Si no existe la zona, crearla automáticamente

- [ ] **M4.5** API para gestionar zonas del proveedor
  - `GET /api/providers/:id/zones` — zonas del proveedor
  - `PUT /api/providers/:id/zones` — actualizar zonas
  - `GET /api/zones?city=CDMX` — listar zonas disponibles por ciudad

### Verificación M4
```
✅ Proveedor puede seleccionar zonas durante onboarding (WhatsApp o web)
✅ Zonas se guardan en la BD correctamente
✅ API devuelve las zonas de un proveedor
✅ Proveedor puede modificar sus zonas después del onboarding
```

---

## M5: Filtro de Búsqueda por Ubicación — Clientes

Los clientes ven solo proveedores que sirven su zona.

### Tareas

- [ ] **M5.1** Detectar ubicación del cliente
  - Solicitar permiso de GPS al abrir la app
  - Reverse geocoding (lat/lng → colonia, ciudad)
  - Opciones de API:
    - Google Maps Geocoding API (gratis: 100 req/día con API key)
    - Nominatim/OpenStreetMap (gratis, sin API key)
    - Mapbox (gratis: 100K req/mes)
  - Guardar ubicación en el contexto de la app
  - Fallback: permitir buscar manualmente por zona

- [ ] **M5.2** Actualizar API de búsqueda de proveedores
  - `GET /api/services/providers?zone=condesa&city=cdmx`
  - `GET /api/services/providers?lat=19.4115&lng=-99.1697&radius=5`
  - Filtrar por:
    - Match exacto de zona (provider.zones contiene la zona del cliente)
    - O por distancia (Haversine formula) si se usa lat/lng
  - Ordenar por: distancia, rating, precio

- [ ] **M5.3** Actualizar UI del buscador en el frontend
  - Mostrar ubicación detectada: "📍 Condesa, CDMX"
  - Botón para cambiar zona manualmente
  - Filtro por zona en la lista de proveedores
  - Indicar distancia aproximada en cada tarjeta de proveedor
  - Estado vacío: "No hay proveedores en tu zona para este servicio"

- [ ] **M5.4** Mostrar zonas de servicio en el perfil del proveedor
  - Sección: "📍 Zonas de servicio"
  - Lista de zonas con formato legible: "Condesa, Roma Norte, Del Valle"
  - Opcional: mapa pequeño mostrando las zonas

### Verificación M5
```
✅ App solicita permiso de ubicación
✅ Se detecta la colonia/zona del cliente
✅ Solo se muestran proveedores que sirven esa zona
✅ Se puede cambiar la zona manualmente
✅ Perfil del proveedor muestra sus zonas de servicio
```

---

## M6: Panel de Admin — Aprobar/Rechazar Proveedores

Dashboard simple para que un administrador gestione las solicitudes de proveedores.

### Tareas

- [ ] **M6.1** Crear rol ADMIN en el schema
  ```prisma
  enum Role {
    CUSTOMER
    PROVIDER
    ADMIN     // Nuevo
  }
  ```

- [ ] **M6.2** Crear endpoints de admin
  - `GET /api/admin/applications` — listar solicitudes pendientes
  - `GET /api/admin/applications/:id` — ver detalle con fotos
  - `PATCH /api/admin/applications/:id/approve` — aprobar
  - `PATCH /api/admin/applications/:id/reject` — rechazar con motivo
  - `GET /api/admin/stats` — estadísticas generales
  - Proteger con guard de rol ADMIN

- [ ] **M6.3** Crear página de admin en el frontend
  - Ruta: `/admin` — dashboard con estadísticas
  - Ruta: `/admin/applications` — lista de solicitudes
  - Ruta: `/admin/applications/:id` — detalle:
    - Fotos de INE (frente/reverso) + selfie lado a lado
    - Datos del proveedor (nombre, servicios, zonas, experiencia)
    - Botones: "✅ Aprobar" / "❌ Rechazar" (con motivo)
  - Proteger acceso: solo usuarios con rol ADMIN

- [ ] **M6.4** Flujo de aprobación
  - Al aprobar:
    1. Crear User con role PROVIDER
    2. Crear ProviderProfile con los datos del application
    3. Crear ProviderService para cada categoría
    4. Crear ProviderServiceZone para cada zona
    5. Enviar notificación WhatsApp: "✅ ¡Aprobado!"
  - Al rechazar:
    1. Actualizar application status a REJECTED
    2. Enviar notificación WhatsApp: "❌ Rechazado: [motivo]"
    3. Permitir reintento

- [ ] **M6.5** Seed de usuario admin
  - Crear admin en el seed con un número de teléfono conocido
  - Login normal con OTP → detecta rol ADMIN → redirige a `/admin`

### Verificación M6
```
✅ Admin puede ver lista de solicitudes pendientes
✅ Admin puede ver fotos de INE y selfie
✅ Admin puede aprobar → se crea la cuenta del proveedor
✅ Proveedor recibe notificación de aprobación por WhatsApp
✅ Admin puede rechazar con motivo
✅ Proveedor rechazado puede reintentar
```

---

## Orden de implementación recomendado

```
M1 (Deploy) → primero, para que tu compañero pueda ver la app
  ↓
M2 (Onboarding básico) → el proveedor se registra por WhatsApp
  ↓
M4 (Zonas — proveedor) → el proveedor elige dónde trabaja
  ↓
M3 (Verificación) → seguridad con INE + selfie
  ↓
M6 (Admin panel) → aprobar/rechazar proveedores
  ↓
M5 (Filtro ubicación — cliente) → el cliente busca por zona
```

---

## Stack adicional requerido

| Herramienta | Propósito | Tier gratis |
|---|---|---|
| Vercel | Frontend hosting | ✅ Sí |
| Railway | Backend hosting | $5 crédito/mes |
| Neon | PostgreSQL producción | ✅ 500MB |
| Upstash | Redis producción | ✅ 10K req/día |
| Cloudinary | Almacenamiento de fotos | ✅ 25K transformaciones/mes |
| Google Maps / Nominatim | Geocoding | ✅ Gratis (Nominatim) |
| AWS Rekognition (futuro) | Comparación facial | ~$1/1000 comparaciones |

