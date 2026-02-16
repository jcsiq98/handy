# 🏗️ Handy — Roadmap Completo Post-MVP

> **Prerequisito**: Todos los milestones de `MILESTONE_MVP.md` completados y desplegados.
> **Timeline estimado**: 4-6 meses post-MVP
> **Objetivo**: Producto completo listo para escalar, monetizar y crecer orgánicamente.

---

## Fase 1: Monetización y Pagos (Semanas 5-7)

### M9: Integración de Pagos

Implementar pagos in-app para capturar revenue y dar seguridad a ambas partes.

#### Tareas

- [ ] **M9.1** Seleccionar e integrar pasarela de pagos
  - Stripe (internacional) o MercadoPago (LatAm) según país de lanzamiento
  - Configurar cuenta de plataforma (marketplace/connect model)
  - Manejar: cargos, holds (autorización), captures, refunds
- [ ] **M9.2** Flujo de pago del cliente
  - Agregar método de pago (tarjeta de crédito/débito)
  - Guardar tarjetas tokenizadas de forma segura (PCI compliance via Stripe)
  - Al confirmar booking → autorizar monto (hold, no cobrar aún)
  - Al completar servicio → capturar el pago
  - Si se cancela → liberar hold automáticamente
- [ ] **M9.3** Flujo de cobro del proveedor
  - Onboarding de pagos para proveedores (Stripe Connect o equivalente)
  - Por WhatsApp: guiar al proveedor a una página web simple para datos bancarios
  - Dashboard de ganancias (web simple, accesible por link desde WA)
  - Pago automático semanal (o quincenal)
  - Opción de retiro anticipado (con comisión 2%)
- [ ] **M9.4** Modelo de comisión
  - Service fee al cliente: 10-15% sobre el precio del servicio
  - Mostrar desglose transparente: "Servicio: $500 + Fee: $75 = Total: $575"
  - Proveedor recibe: precio del servicio íntegro (comisión sale del fee del cliente)
- [ ] **M9.5** Estimación de precios
  - Precios sugeridos por categoría y tipo de trabajo
  - Proveedor puede ajustar después de ver la descripción del problema
  - Flujo: Cliente solicita → proveedor envía cotización → cliente acepta/negocia → pago se autoriza
- [ ] **M9.6** Facturación y recibos
  - Generar recibo digital después de cada transacción
  - Enviar por email/app al cliente
  - Historial de transacciones para ambos

#### Testing M9

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T9.1 | Agregar tarjeta | E2E | Ingresar tarjeta de prueba (4242...) → guardada exitosamente |
| T9.2 | Hold al confirmar booking | Integration | Crear booking → Stripe muestra payment_intent con status "requires_capture" |
| T9.3 | Capture al completar | Integration | Completar servicio → payment capturado → dinero transferido |
| T9.4 | Refund al cancelar | Integration | Cancelar booking → hold liberado → cliente no cobra |
| T9.5 | Comisión calculada correctamente | Unit | Servicio $1000 → fee $150 → proveedor recibe $1000 → total cliente $1150 |
| T9.6 | Proveedor ve ganancias | E2E | Abrir dashboard → ver listado de trabajos con montos |
| T9.7 | Tarjeta inválida rechazada | E2E | Ingresar tarjeta declinada → error claro al usuario |
| T9.8 | PCI compliance | Security | Datos de tarjeta nunca tocan nuestro servidor (tokenized by Stripe) |
| T9.9 | Recibo generado | Integration | Completar pago → recibo PDF/email generado |
| T9.10 | Payout semanal | Integration | Simular 7 días → payout automático a cuenta del proveedor |

---

### M10: Cotización y Negociación de Precios

#### Tareas

- [ ] **M10.1** Flujo de cotización
  - Proveedor recibe solicitud → puede enviar cotización con precio
  - WhatsApp: "💰 ¿Cuánto cobrarías por este trabajo? Escribe el monto:"
  - Cliente recibe cotización en app con botones: [Aceptar] [Negociar] [Rechazar]
- [ ] **M10.2** Negociación simple
  - Cliente puede contra-ofertar una vez
  - Proveedor acepta o mantiene su precio
  - Máximo 2 rondas de negociación → después "Aceptar o buscar otro"
- [ ] **M10.3** Precios de referencia
  - Mostrar rango de precios por categoría: "Plomería: $300 - $1,500 típicamente"
  - Basado en historial de transacciones reales (cuando haya datos)

#### Testing M10

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T10.1 | Proveedor envía cotización | Integration | Escribe monto en WA → cliente ve cotización en app |
| T10.2 | Cliente acepta cotización | E2E | Tap "Aceptar" → booking confirmado con precio |
| T10.3 | Cliente contra-oferta | E2E | Tap "Negociar" → escribir monto → proveedor recibe en WA |
| T10.4 | Rango de precios visible | E2E | En pantalla de booking → ver rango de referencia |

---

## Fase 2: Confianza y Seguridad (Semanas 7-9)

### M11: Verificación de Proveedores

#### Tareas

- [ ] **M11.1** Proceso de verificación de identidad
  - Proveedor sube foto de INE/cédula (por WhatsApp o link web)
  - Verificación manual (admin) o automática (API de verificación)
  - Badge "✅ Verificado" en perfil
  - Proveedores verificados aparecen primero en búsquedas
- [ ] **M11.2** Verificación de habilidades (opcional)
  - Certificaciones, fotos de trabajos anteriores
  - Portfolio básico (galería de fotos de trabajos)
  - Integración futura con bases de datos de certificaciones
- [ ] **M11.3** Background check (fase avanzada)
  - Integración con servicio de antecedentes (depende del país)
  - Badge adicional "🛡️ Background verificado"
- [ ] **M11.4** Reporte de problemas
  - Botón "Reportar problema" en la app
  - Categorías: No se presentó, Trabajo mal hecho, Cobro excesivo, Comportamiento inadecuado
  - Sistema de tickets para soporte

#### Testing M11

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T11.1 | Subir documento de identidad | Integration | Enviar foto por WA → guardada en S3 → vinculada al proveedor |
| T11.2 | Badge verificado visible | E2E | Proveedor verificado → badge "✅" en perfil y lista |
| T11.3 | Verificados primero en búsqueda | API | GET providers → verificados aparecen antes que no verificados |
| T11.4 | Reportar problema | E2E | Tap reportar → seleccionar categoría → enviar → ticket creado |
| T11.5 | Admin puede verificar/rechazar | Admin | Dashboard → ver solicitud → aprobar/rechazar → status actualizado |

---

### M12: Sistema de Garantía

#### Tareas

- [ ] **M12.1** Garantía de satisfacción
  - Si el cliente no está satisfecho dentro de 24h → puede abrir disputa
  - Flujo: Disputa abierta → Revisión por soporte → Resolución (refund parcial/total o rechazar)
- [ ] **M12.2** Protección contra no-show
  - Si el proveedor acepta pero no se presenta → refund automático
  - Proveedor penalizado (baja en ranking, posible suspensión)
- [ ] **M12.3** Seguro básico (fase avanzada)
  - Seguro contra daños durante el servicio
  - Partnership con aseguradora local
  - Valor agregado que justifica la comisión

#### Testing M12

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T12.1 | Abrir disputa | E2E | Servicio completado → "Reportar problema" → disputa creada |
| T12.2 | Refund por no-show | Integration | Proveedor no aparece → admin marca no-show → refund automático |
| T12.3 | Penalización a proveedor | DB | No-show → provider penalty_count + 1, ranking baja |

---

## Fase 3: Geolocalización Inteligente (Semanas 9-11)

### M13: Location-Based Matching

#### Tareas

- [ ] **M13.1** Geolocalización del cliente
  - Solicitar permiso de ubicación en la app
  - Guardar coordenadas al crear booking
  - Mostrar mapa con pin en la dirección del servicio
  - Autocompletar dirección (Google Places API o Mapbox)
- [ ] **M13.2** Ubicación del proveedor
  - Al registrarse, proveedor define su "zona de cobertura" (radio en km)
  - Guardar coordenadas base del proveedor
  - Queries con PostGIS: encontrar proveedores dentro de X km del cliente
- [ ] **M13.3** Matching por proximidad
  - Ordenar proveedores por distancia (más cercano primero)
  - Mostrar distancia estimada: "📍 A 2.3 km de ti"
  - Filtro: "Solo proveedores a menos de 5 km"
- [ ] **M13.4** Mapa en la app
  - Vista de mapa con proveedores cercanos como pins
  - Tap en pin → ver mini perfil → tap para ver perfil completo
  - Mapa del tracking: ubicación del proveedor en tiempo real (fase avanzada)
- [ ] **M13.5** Dirección inteligente
  - Guardar direcciones frecuentes del cliente ("Mi casa", "Oficina")
  - Seleccionar dirección guardada al crear booking
  - Enviar dirección exacta al proveedor por WhatsApp con link de Google Maps

#### Testing M13

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T13.1 | Permiso de ubicación | E2E | App solicita permiso → al aceptar, muestra posición en mapa |
| T13.2 | Proveedores por distancia | API | GET providers con lat/lng → ordenados por distancia |
| T13.3 | Filtro por radio | API | GET providers?radius=5km → solo proveedores dentro del radio |
| T13.4 | Distancia mostrada en UI | E2E | Lista de proveedores muestra "📍 A 2.3 km" |
| T13.5 | Mapa con pins | E2E | Vista mapa → pins de proveedores → tap → mini perfil |
| T13.6 | Autocompletar dirección | E2E | Escribir "Col. Roma" → sugerencias de Google Places |
| T13.7 | Link de Maps al proveedor | Integration | Proveedor recibe link clickeable de Google Maps en WA |
| T13.8 | Dirección guardada | E2E | Guardar "Mi casa" → al crear booking aparece como opción |

---

## Fase 4: Notificaciones y Engagement (Semanas 11-13)

### M14: Push Notifications

#### Tareas

- [ ] **M14.1** Configurar Firebase Cloud Messaging (FCM)
  - Setup proyecto Firebase
  - Service worker para PWA web push
  - Solicitar permiso de notificaciones en la app
  - Guardar push tokens por usuario
- [ ] **M14.2** Notificaciones transaccionales
  - Proveedor aceptó tu solicitud
  - Nuevo mensaje en el chat
  - Servicio completado — califica al proveedor
  - Pago procesado
- [ ] **M14.3** Notificaciones de engagement (con moderación)
  - "Han pasado 30 días desde tu último servicio"
  - "Nuevo proveedor de plomería en tu zona con ⭐ 4.9"
  - Configuración: permitir al usuario silenciar por categoría

#### Testing M14

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T14.1 | Permission request | E2E | App solicita permiso → al aceptar, token guardado |
| T14.2 | Push al aceptar booking | Integration | Proveedor acepta → cliente recibe push notification |
| T14.3 | Push de nuevo mensaje | Integration | Proveedor envía mensaje → cliente con app cerrada recibe push |
| T14.4 | Push funciona en PWA | E2E | Instalar PWA → cerrar → recibir push → tap abre app en booking |
| T14.5 | Silenciar notificaciones | E2E | Settings → silenciar marketing → no recibir engagement pushes |

---

### M15: Perfil de Usuario Completo

#### Tareas

- [ ] **M15.1** Pantalla de perfil del cliente
  - Foto de perfil (upload desde cámara o galería)
  - Nombre, teléfono, email (opcional)
  - Direcciones guardadas
  - Métodos de pago guardados
  - Historial de servicios
- [ ] **M15.2** Editar perfil
  - Cambiar nombre, foto, email
  - Agregar/eliminar direcciones
  - Agregar/eliminar métodos de pago
- [ ] **M15.3** Rating del cliente visible
  - El cliente tiene su propio rating (promedio de lo que proveedores lo califican)
  - Visible en su perfil y para proveedores cuando reciben solicitud
- [ ] **M15.4** Configuración
  - Idioma (Español / English)
  - Notificaciones (on/off por tipo)
  - Eliminar cuenta
  - Soporte / Contacto

#### Testing M15

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T15.1 | Ver mi perfil | E2E | Tap perfil → ver nombre, foto, rating, historial |
| T15.2 | Subir foto de perfil | E2E | Tap foto → seleccionar imagen → sube → muestra nueva foto |
| T15.3 | Editar nombre | E2E | Cambiar nombre → guardar → refleja en toda la app |
| T15.4 | Eliminar cuenta | E2E | Confirmar eliminación → datos anonimizados → logout |
| T15.5 | Cambiar idioma | E2E | Cambiar a inglés → toda la UI en inglés |

---

## Fase 5: App Nativa — React Native (Semanas 13-18)

### M16: Migración a React Native

#### Tareas

- [ ] **M16.1** Setup proyecto React Native con Expo
  - Crear proyecto con Expo Router (file-based routing, como Next.js)
  - Configurar TypeScript, ESLint
  - Tema de diseño compartido (colores, tipografía, spacing)
  - Componentes base: Button, Input, Card, Avatar, Badge
- [ ] **M16.2** Migrar pantallas de auth
  - Splash screen nativa
  - Login con teléfono + OTP
  - Secure storage para tokens (expo-secure-store)
- [ ] **M16.3** Migrar pantallas de servicios
  - Home con categorías
  - Lista de proveedores
  - Perfil de proveedor
  - Flujo de booking
- [ ] **M16.4** Migrar chat
  - Pantalla de chat con Gifted Chat o custom
  - WebSocket connection con Socket.IO client
  - Push notifications nativas (expo-notifications)
- [ ] **M16.5** Migrar perfil y settings
  - Perfil del usuario
  - Configuración
  - Historial
- [ ] **M16.6** Features nativas
  - Camera para fotos de perfil (expo-camera)
  - GPS para ubicación (expo-location)
  - Haptic feedback en interacciones clave
  - Animaciones nativas (Reanimated)
- [ ] **M16.7** App Store submission
  - Apple Developer Account ($99/year)
  - Google Play Developer Account ($25 one-time)
  - Screenshots, descripción, metadata
  - Review process (Apple: 1-7 días, Google: 1-3 días)
  - TestFlight para beta testers (iOS)
  - Internal testing track (Android)

#### Testing M16

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T16.1 | App corre en iOS simulator | Dev | `npx expo start --ios` → app abre sin crashes |
| T16.2 | App corre en Android emulator | Dev | `npx expo start --android` → app abre sin crashes |
| T16.3 | Auth flow completo | E2E | Login → OTP → home (ambas plataformas) |
| T16.4 | Booking flow completo | E2E | Browse → select → book → track (ambas plataformas) |
| T16.5 | Chat funciona | E2E | Enviar y recibir mensajes en tiempo real |
| T16.6 | Push notifications | E2E | App cerrada → recibir push → tap abre booking correcto |
| T16.7 | GPS funciona | E2E | Permitir ubicación → coordenadas correctas |
| T16.8 | Performance: cold start < 3s | Perf | Abrir app desde cero en menos de 3 segundos |
| T16.9 | App Store review pasa | Submission | No rechazos por Apple/Google |
| T16.10 | TestFlight beta | Beta | 10+ beta testers instalan y completan un flujo |

---

## Fase 6: Admin Dashboard y Operaciones (Semanas 15-17)

### M17: Panel de Administración

#### Tareas

- [ ] **M17.1** Dashboard web (Next.js separado o en la misma app)
  - Autenticación de admin (role-based access)
  - Dashboard principal con KPIs:
    - Total usuarios (clientes + proveedores)
    - Bookings hoy / esta semana / este mes
    - Revenue total y comisión ganada
    - Rating promedio de la plataforma
    - Proveedores activos vs inactivos
- [ ] **M17.2** Gestión de usuarios
  - Lista de clientes con búsqueda y filtros
  - Lista de proveedores con status de verificación
  - Ver perfil detallado de cualquier usuario
  - Suspender / banear usuarios
  - Verificar / rechazar documentos de proveedores
- [ ] **M17.3** Gestión de bookings
  - Lista de todos los bookings con filtros (status, fecha, categoría)
  - Detalle de booking con timeline de eventos
  - Intervenir en disputas: ver mensajes, decidir refund
  - Cancelar/completar bookings manualmente
- [ ] **M17.4** Gestión de pagos
  - Lista de transacciones
  - Payouts pendientes / completados
  - Procesar refunds manuales
  - Revenue report exportable (CSV)
- [ ] **M17.5** Gestión de categorías
  - CRUD de categorías de servicio
  - Activar / desactivar categorías
  - Ordenar categorías (featured, priority)
- [ ] **M17.6** Moderación de contenido
  - Reviews reportados
  - Mensajes flaggeados
  - Acciones: eliminar review, warn user, ban user

#### Testing M17

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T17.1 | Solo admin puede acceder | Security | User normal → 403. Admin → acceso completo |
| T17.2 | KPIs correctos | Integration | Dashboard → números coinciden con queries directas a DB |
| T17.3 | Suspender usuario | E2E | Admin suspende → usuario no puede hacer bookings → error message |
| T17.4 | Verificar proveedor | E2E | Admin aprueba → badge aparece en perfil del proveedor |
| T17.5 | Refund manual | E2E | Admin procesa refund → dinero devuelto al cliente → registro en DB |
| T17.6 | Export CSV funciona | E2E | Click export → descarga CSV con datos correctos |

---

## Fase 7: Crecimiento y Retención (Semanas 17-20)

### M18: Sistema de Referidos

#### Tareas

- [ ] **M18.1** Código de referido único por usuario
  - Generar código al crear cuenta (ej: "MARIA2024")
  - Compartir por WhatsApp, redes sociales, link directo
  - Deep link que abre la app y registra el referido
- [ ] **M18.2** Recompensas
  - Quien refiere: crédito de $X después de que el referido complete su primer servicio
  - Quien es referido: descuento de $X en primer servicio
  - Trackear: referidos, conversiones, recompensas entregadas
- [ ] **M18.3** Referidos de proveedores
  - Proveedores también pueden referir a otros proveedores
  - Recompensa: bonus después de que el referido complete 5 trabajos

### M19: Programa de Lealtad para Proveedores

#### Tareas

- [ ] **M19.1** Niveles de proveedor
  - Bronce (0-10 trabajos) → Standard
  - Plata (11-50 trabajos) → Prioridad en búsqueda, badge
  - Oro (51-200 trabajos) → Top priority, comisión reducida, soporte prioritario
  - Platino (200+ trabajos) → Lo anterior + featured en home, herramientas premium
- [ ] **M19.2** Suscripción Premium para proveedores (opcional)
  - $10-20/mes → Perfil destacado, estadísticas avanzadas, soporte prioritario
  - Free trial de 30 días para nuevos proveedores
- [ ] **M19.3** Badges y logros
  - "⚡ Respuesta rápida" — responde en < 5 min consistentemente
  - "⭐ Top Rated" — rating > 4.8 con 20+ reviews
  - "🛡️ Verificado" — identidad verificada
  - "📅 Veterano" — más de 1 año en la plataforma

### M20: Analytics y Métricas

#### Tareas

- [ ] **M20.1** Event tracking
  - Integrar Mixpanel, Amplitude o PostHog
  - Trackear: signup, booking_created, booking_completed, message_sent, rating_submitted
  - Funnels: visit → signup → first_booking → completed → repeat
- [ ] **M20.2** Provider analytics (en su dashboard)
  - Trabajos completados este mes
  - Ingreso total del mes
  - Rating promedio
  - Tasa de aceptación
  - Tiempo promedio de respuesta
- [ ] **M20.3** Business analytics (admin)
  - Revenue MRR/ARR
  - Customer LTV
  - CAC (costo de adquisición)
  - Churn rate (clientes y proveedores)
  - Net Promoter Score (NPS)

#### Testing M18-M20

| # | Test | Tipo | Cómo verificar |
|---|------|------|----------------|
| T18.1 | Código referido generado | Unit | Nuevo usuario → código único asignado |
| T18.2 | Deep link funciona | E2E | Click link referido → app abre → código pre-llenado |
| T18.3 | Recompensa otorgada | Integration | Referido completa servicio → crédito agregado a quien refirió |
| T19.1 | Nivel se actualiza | Integration | Proveedor completa trabajo 11 → sube a Plata |
| T19.2 | Badge visible | E2E | Proveedor con "Top Rated" → badge visible en perfil |
| T20.1 | Eventos trackeados | Analytics | Completar booking → evento visible en Mixpanel |
| T20.2 | Funnel correcto | Analytics | Ver funnel signup→booking → porcentajes correctos |

---

## Fase 8: Funcionalidades Avanzadas (Semanas 20-24)

### M21: Booking Programado y Recurrente

- [ ] Seleccionar fecha y hora específica para el servicio
- [ ] Servicios recurrentes: "Limpieza cada martes a las 10am"
- [ ] Calendario del proveedor con disponibilidad
- [ ] Recordatorios automáticos (24h y 1h antes) por push y WhatsApp

### M22: Multi-idioma

- [ ] Español (principal)
- [ ] Inglés
- [ ] i18n en frontend (next-intl o react-i18next)
- [ ] i18n en mensajes de WhatsApp
- [ ] Detección automática de idioma preferido

### M23: Fotos y Media en Chat

- [ ] Cliente puede enviar fotos del problema desde la app
- [ ] Fotos se envían al proveedor por WhatsApp
- [ ] Proveedor puede enviar fotos del trabajo por WhatsApp → se ven en la app
- [ ] Galería de fotos del trabajo completado (antes/después)

### M24: Proveedores con Múltiples Trabajadores

- [ ] Cuenta de "empresa" para proveedores con equipo
- [ ] Asignar trabajos a empleados específicos
- [ ] Dashboard de equipo con stats por empleado
- [ ] El cliente siempre ve la marca/empresa, no al empleado individual

### M25: Búsqueda Inteligente y Recomendaciones

- [ ] Búsqueda por texto libre: "se me tapó el lavabo" → sugiere Plomería
- [ ] Proveedores recomendados basados en historial del cliente
- [ ] "Otros clientes también contrataron..."
- [ ] ML básico para matching (basado en ratings, distancia, disponibilidad, velocidad de respuesta)

---

## Arquitectura Final (Post todas las fases)

```
                         ┌───────────────┐
                         │   CDN         │
                         │  (Cloudflare) │
                         └───────┬───────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
     ┌────────────────┐ ┌───────────────┐  ┌────────────────┐
     │ React Native   │ │ Next.js PWA   │  │ Admin Dashboard │
     │ iOS + Android  │ │ (Web client)  │  │ (Next.js)      │
     └───────┬────────┘ └──────┬────────┘  └───────┬────────┘
             │                  │                    │
             └──────────┬───────┘────────────────────┘
                        ▼
              ┌─────────────────┐
              │  API Gateway    │
              │  (Rate limit,   │
              │   Auth, Logs)   │
              └────────┬────────┘
                       ▼
              ┌─────────────────────────────────────────────┐
              │           NestJS Backend                     │
              │                                              │
              │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
              │  │  Auth    │ │ Bookings │ │   Chat       │ │
              │  │  Module  │ │ Module   │ │   Module     │ │
              │  └─────────┘ └──────────┘ └──────────────┘ │
              │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
              │  │ Users   │ │ Payments │ │  WhatsApp    │ │
              │  │ Module  │ │ Module   │ │  Module      │ │
              │  └─────────┘ └──────────┘ └──────────────┘ │
              │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
              │  │ Ratings │ │ Notif.   │ │  Analytics   │ │
              │  │ Module  │ │ Module   │ │  Module      │ │
              │  └─────────┘ └──────────┘ └──────────────┘ │
              │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
              │  │ Search  │ │ Admin    │ │  Referrals   │ │
              │  │ Module  │ │ Module   │ │  Module      │ │
              │  └─────────┘ └──────────┘ └──────────────┘ │
              └──────────┬──────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┬──────────────┐
          ▼              ▼              ▼              ▼
   ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐
   │ PostgreSQL │ │   Redis   │ │    S3     │ │  WhatsApp  │
   │ + PostGIS  │ │  Cache +  │ │  Storage  │ │ Cloud API  │
   │            │ │  Pub/Sub  │ │  (media)  │ │            │
   └────────────┘ └───────────┘ └───────────┘ └────────────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
           ┌───────────┐ ┌───────────┐
           │  Stripe/  │ │ Firebase  │
           │ MercadoPago│ │   FCM    │
           │ (payments)│ │  (push)  │
           └───────────┘ └───────────┘
```

---

## Timeline Visual Completo

```
Semana:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24
         ├───────────────────┤
         │    MVP (M1-M8)    │
                              ├───────────────┤
                              │ Pagos (M9-M10)│
                                               ├───────────┤
                                               │Trust M11-12│
                                                            ├───────────┤
                                                            │  Geo M13  │
                                                            ├───────────┤
                                                            │ Notif M14 │
                                                                         ├───────────────────┤
                                                                         │React Native M16   │
                                                            ├────────────┤
                                                            │ Admin M17  │
                                                                                  ├───────────────────┤
                                                                                  │ Growth M18-20     │
                                                                                               ├──────────────┤
                                                                                               │Advanced M21-25│
```

---

## Métricas de Éxito por Fase

| Fase | Métrica Clave | Target |
|------|--------------|--------|
| MVP | Demo funcional en Zoom | Flujo completo sin errores |
| Pagos | Primera transacción real | $1 de revenue |
| Confianza | Proveedores verificados | 80%+ del supply verificado |
| Geo | Match por proximidad | < 5km distancia promedio |
| App Nativa | App Store live | 100+ descargas primer mes |
| Admin | Operaciones automatizadas | < 1h/día de operación manual |
| Growth | Crecimiento orgánico | 20%+ de nuevos usuarios por referidos |
| Avanzado | Retención | 40%+ de clientes repiten en 60 días |

