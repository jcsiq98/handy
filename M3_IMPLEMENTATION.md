# M3: Verificación de Identidad - Implementación Completada

## ✅ Tareas Completadas

### M3.1: Página web de verificación (`/verify/:token`)
- ✅ Página standalone en `/verify/[token]` (Next.js)
- ✅ Diseño mobile-first y simple
- ✅ Flujo paso a paso:
  1. Verificación de token
  2. Foto de INE (frente)
  3. Foto de INE (reverso)
  4. Selfie
  5. Liveness detection (instrucciones simples)
  6. Subida de fotos
- ✅ Acceso mediante token JWT temporal (expira en 1 hora)

### M3.2: Almacenamiento de fotos con Cloudinary
- ✅ Servicio `CloudinaryService` implementado
- ✅ Subida de fotos a Cloudinary con:
  - Transformaciones automáticas (límite de tamaño, calidad)
  - Organización en carpetas (`verification/ine`, `verification/selfie`)
  - URLs HTTPS seguras
- ✅ Manejo de errores y logging

### M3.3: Endpoints backend
- ✅ `GET /api/onboarding/verify/:token` - Verificar token y obtener info de aplicación
- ✅ `POST /api/onboarding/verify/:token/photos` - Subir fotos de verificación
- ✅ Generación de tokens JWT temporales (1 hora de expiración)
- ✅ Validación de archivos (tipo, tamaño máximo 5MB)

### M3.4: Integración con WhatsApp
- ✅ Handler de onboarding actualizado para enviar link de verificación
- ✅ El bot envía el link por WhatsApp al completar el onboarding básico
- ✅ Mensaje personalizado con instrucciones

### M3.5: Liveness detection básico
- ✅ Instrucciones simples en la UI:
  - "Parpadea 2 veces"
  - "Gira la cabeza a la derecha e izquierda"
- ✅ Implementado como paso previo a la subida de fotos

### M3.6: Flujo actualizado
- ✅ El onboarding ya no auto-aprueba proveedores
- ✅ Estado inicial: `PENDING` (requiere verificación)
- ✅ Después de subir fotos: `DOCS_SUBMITTED` (esperando revisión admin)
- ✅ La aprobación final se hará desde el panel de admin (M6)

## 📁 Archivos Creados/Modificados

### Backend
- `src/modules/onboarding/onboarding.module.ts` - Módulo de onboarding
- `src/modules/onboarding/onboarding.service.ts` - Servicio principal
- `src/modules/onboarding/onboarding.controller.ts` - Controller con endpoints
- `src/modules/onboarding/cloudinary.service.ts` - Servicio de Cloudinary
- `src/modules/onboarding/dto/upload-photos.dto.ts` - DTOs
- `src/modules/whatsapp/whatsapp-onboarding.handler.ts` - Actualizado para enviar link
- `src/app.module.ts` - Agregado OnboardingModule

### Frontend
- `app/src/app/verify/[token]/page.tsx` - Página de verificación completa

## 🔧 Configuración Requerida

### Variables de Entorno (Backend)

Agregar a `.env` o variables de producción:

```bash
# Cloudinary (obtener de https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Frontend URL (para generar links de verificación)
FRONTEND_URL=https://handy-app.vercel.app  # o http://localhost:3001 en desarrollo
```

### Cloudinary Setup

1. Crear cuenta en [Cloudinary](https://cloudinary.com) (tier gratis: 25K transformaciones/mes)
2. Obtener credenciales del Dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. Configurar en Railway (producción) o `.env` (desarrollo)

## 🧪 Testing

### Flujo de prueba:

1. **Onboarding por WhatsApp:**
   - Enviar mensaje al bot de WhatsApp
   - Completar todos los pasos del onboarding
   - Recibir link de verificación

2. **Verificación:**
   - Abrir link en el navegador móvil
   - Subir fotos de INE (frente y reverso)
   - Subir selfie
   - Completar instrucciones de liveness
   - Verificar que las fotos se suban correctamente

3. **Verificación en BD:**
   - Verificar que `ProviderApplication` tenga:
     - `verificationStatus = 'DOCS_SUBMITTED'`
     - URLs de fotos en `inePhotoFront`, `inePhotoBack`, `selfiePhoto`

## 📝 Próximos Pasos (M6 - Panel de Admin)

Para completar el flujo de verificación, falta implementar M6:
- Panel de admin para revisar fotos
- Comparación manual de fotos (Fase 1)
- Aprobación/rechazo de aplicaciones
- Notificación por WhatsApp al aprobar/rechazar
- Creación automática de User + ProviderProfile al aprobar

## 🔒 Seguridad

- ✅ Tokens JWT con expiración de 1 hora
- ✅ Validación de tipo y tamaño de archivos
- ✅ Fotos almacenadas en Cloudinary (no en servidor)
- ✅ Endpoints públicos pero protegidos por token temporal
- ✅ Verificación de token antes de permitir subida de fotos

## 🐛 Notas

- Si Cloudinary no está configurado, el servicio lanzará un error al intentar subir fotos
- El token expira en 1 hora - si expira, el proveedor necesitará solicitar un nuevo link
- Las fotos se comprimen automáticamente por Cloudinary (máx 2000x2000px, calidad auto)

