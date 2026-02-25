# 🎬 Handy — Guión de Demo para Zoom

> Duración estimada: 8-12 minutos
> Preparación: 2 dispositivos (teléfono con app + teléfono con WhatsApp del proveedor)

---

## Antes de la Demo

### Checklist de preparación
- [ ] Backend corriendo y accesible
- [ ] Frontend cargado en navegador/PWA
- [ ] Seed de demo ejecutado: `npm run db:seed:demo`
- [ ] WhatsApp Business verificado y conectado
- [ ] Dos teléfonos listos:
  - 📱 **Teléfono 1**: App Handy abierta (cliente)
  - 📱 **Teléfono 2**: WhatsApp del proveedor

### URLs útiles
- App: `https://handy-app.vercel.app` (o localhost:3001)
- API: `https://handy-api.up.railway.app/api/health`
- Swagger: `https://handy-api.up.railway.app/api/docs`

---

## Guión Paso a Paso

### 📱 Acto 1: La App se Siente Nativa (1 min)

1. **Abrir la app en el teléfono**
   - Mostrar la splash screen con el logo de Handy
   - "Esto es una PWA — se instala directo desde el navegador, sin App Store"

2. **Mostrar el prompt de instalación**
   - "El usuario recibe un prompt para agregarla a su pantalla de inicio"
   - Demostrar que se abre como app nativa (sin barra del navegador)

---

### 🔐 Acto 2: Login con OTP (1 min)

1. **Pantalla de Login**
   - "El login es por teléfono, sin contraseña — como lo espera un usuario joven"
   - Ingresar número: `+5215500000001`

2. **Verificar OTP**
   - "En producción, el código llega por WhatsApp"
   - Ingresar código OTP
   - "Autenticado con JWT, sesión segura"

---

### 🏠 Acto 3: Explorar el Marketplace (2 min)

1. **Home Page**
   - "Handy conecta jóvenes con profesionales del hogar"
   - Mostrar las 8 categorías de servicio
   - Mostrar los proveedores mejor calificados

2. **Explorar una categoría** (ej: Plomería)
   - Tap en "🔧 Plomería"
   - "Vemos proveedores filtrados por categoría, ordenados por calificación"
   - Mostrar los filtros por categoría

3. **Ver perfil de un proveedor**
   - Tap en "Carlos Mendoza"
   - "Perfil completo: bio, calificación, verificación, reviews"
   - Scroll para ver reviews reales de otros clientes

---

### 📋 Acto 4: Solicitar un Servicio (2 min)

1. **Tap en "Solicitar servicio"**
   - "El flujo es multi-step, optimizado para móvil"

2. **Paso 1: Describir el problema**
   - Escribir: "Se rompió la tubería del baño y hay una fuga"

3. **Paso 2: Dirección**
   - "Orizaba 150, Col. Roma Norte, CDMX"

4. **Paso 3: Confirmar**
   - "El cliente revisa todo antes de confirmar"
   - Tap en "Confirmar solicitud"
   - "¡Listo! Ahora viene lo interesante..."

---

### 📲 Acto 5: El Proveedor Recibe en WhatsApp (2 min)

> 🔄 Cambiar al **Teléfono 2** (WhatsApp del proveedor)

1. **Mostrar el mensaje de WhatsApp**
   - "El proveedor recibe la solicitud directamente en su WhatsApp"
   - "No necesita instalar ninguna app — usa lo que ya conoce"
   - Mostrar: categoría, dirección, nombre del cliente

2. **Aceptar la solicitud**
   - Tap en el botón "✅ Aceptar"
   - "Con un solo tap, el proveedor acepta"

3. **Mostrar actualización en tiempo real**
   > 🔄 Volver al **Teléfono 1** (App del cliente)
   - "Miren: el estado cambió a 'Aceptado' en tiempo real"
   - "Esto es WebSocket — actualización instantánea"

---

### 💬 Acto 6: Chat Bridge App ↔ WhatsApp (2 min)

1. **Abrir el chat desde la app**
   - Tap en "💬 Chatear con Carlos"
   - Escribir: "Hola, ¿puede venir hoy en la tarde?"

2. **Mostrar que llega al WhatsApp del proveedor**
   > 🔄 Teléfono 2
   - "El mensaje del cliente llega al WhatsApp del proveedor"
   - Responder desde WhatsApp: "Claro, ¿le funciona a las 3pm?"

3. **Mostrar que la respuesta llega a la app**
   > 🔄 Teléfono 1
   - "La respuesta del proveedor aparece en tiempo real en la app"
   - "Todo el chat es bidireccional: App ↔ WhatsApp"
   - Mostrar que indica "via WA" en los mensajes del proveedor

---

### ⭐ Acto 7: Calificación (1 min)

1. **Después de completar el servicio**
   - Navegar a "Mis Solicitudes" → seleccionar un booking completado
   - "Después del servicio, el cliente califica al proveedor"

2. **Calificar**
   - Seleccionar 5 estrellas
   - Escribir: "Excelente trabajo, muy profesional"
   - "Esto alimenta el sistema de ratings que vimos en los perfiles"

---

### 🏁 Cierre (1 min)

> "En resumen, Handy permite:
> 1. ✅ Buscar y comparar profesionales del hogar
> 2. ✅ Solicitar servicios desde el teléfono
> 3. ✅ Los proveedores reciben todo en WhatsApp — cero fricción
> 4. ✅ Chat bidireccional App ↔ WhatsApp
> 5. ✅ Ratings y reviews para construir confianza
> 6. ✅ Todo en una PWA que se siente nativa
>
> Y todo esto en **4 semanas** de desarrollo."

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| App no carga | Verificar que NEXT_PUBLIC_API_URL apunta al backend correcto |
| OTP no llega | En dev, el código se muestra en la respuesta del API |
| WhatsApp no recibe | Verificar WHATSAPP_ENABLED=true y token válido |
| WebSocket no conecta | Verificar CORS permite el dominio del frontend |
| Chat no funciona | Verificar que MessagesModule está importado en AppModule |
| Booking no se crea | Verificar que hay providers seeded con categoryId correcto |

---

## Datos de Demo

### Cliente de prueba
- **Teléfono**: +5215500000001
- **Nombre**: Ana Martínez García
- Tiene 4 bookings activos y múltiples completados

### Proveedores destacados
| Nombre | Teléfono | Servicio | Rating |
|--------|----------|----------|--------|
| Carlos Mendoza | +5215512345001 | Plomería | 4.8 ⭐ |
| Roberto Hernández | +5215512345002 | Electricidad | 4.9 ⭐ |
| María G. López | +5215512345003 | Limpieza | 4.7 ⭐ |
| Patricia Sánchez | +5215512345009 | Limpieza | 4.9 ⭐ |

