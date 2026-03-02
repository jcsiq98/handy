# 🧪 Guía de Pruebas - M3: Verificación de Identidad

## 📋 Paso 1: Eliminar Proveedor Demo

Si ya tienes un proveedor demo asociado a tu número, elimínalo primero:

### Opción A: Desde tu máquina local (si tienes acceso a la BD)

```bash
cd handy/backend
npx ts-node scripts/delete-provider-by-phone.ts +52TU_NUMERO
```

**Ejemplo:**
```bash
npx ts-node scripts/delete-provider-by-phone.ts +5215512345678
```

### Opción B: Desde Railway (producción)

1. Ve a tu proyecto en Railway
2. Abre la consola de la base de datos (PostgreSQL)
3. Ejecuta estas queries (reemplaza `+52TU_NUMERO` con tu número):

```sql
-- Ver qué hay asociado a tu número
SELECT * FROM users WHERE phone = '+52TU_NUMERO';
SELECT * FROM provider_applications WHERE phone = '+52TU_NUMERO';
SELECT * FROM provider_profiles WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

-- Eliminar en orden (respetando foreign keys)
DELETE FROM provider_service_zones WHERE provider_id IN (
  SELECT id FROM provider_profiles WHERE user_id IN (
    SELECT id FROM users WHERE phone = '+52TU_NUMERO'
  )
);

DELETE FROM bookings WHERE provider_id IN (
  SELECT id FROM provider_profiles WHERE user_id IN (
    SELECT id FROM users WHERE phone = '+52TU_NUMERO'
  )
) OR customer_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

DELETE FROM messages WHERE sender_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

DELETE FROM ratings WHERE from_user_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
) OR to_user_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

DELETE FROM refresh_tokens WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

DELETE FROM otp_codes WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

DELETE FROM provider_profiles WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+52TU_NUMERO'
);

DELETE FROM provider_applications WHERE phone = '+52TU_NUMERO';

DELETE FROM users WHERE phone = '+52TU_NUMERO';
```

---

## 📱 Paso 2: Hacer Onboarding desde tu Celular

### Instrucciones paso a paso:

1. **Abre WhatsApp** en tu celular

2. **Envía un mensaje** al número de WhatsApp de Handy (el que está configurado en tu backend)

3. **El bot responderá** con un mensaje de bienvenida:
   ```
   👋 ¡Hola! Bienvenido a Handy.
   
   Somos una plataforma que conecta clientes con proveedores...
   
   🛠 ¿Te gustaría ofrecer tus servicios en Handy?
   
   ✅ Escribe *"si"* para comenzar tu registro
   ```

4. **Escribe "si"** para comenzar

5. **Sigue el flujo de onboarding:**
   - **Paso 1:** Escribe tu nombre completo
   - **Paso 2:** Selecciona servicios (escribe números separados por coma, ej: `1,3,5`)
   - **Paso 3:** Escribe años de experiencia (solo el número)
   - **Paso 4:** Escribe tu ciudad
   - **Paso 5:** Escribe zonas/colonias (separadas por coma)
   - **Paso 6:** Escribe una bio (o escribe "skip" para omitir)

6. **Al finalizar**, recibirás un mensaje con un **link de verificación**:
   ```
   🔐 Último paso: Verificación de identidad
   
   Para completar tu registro, necesitamos verificar tu identidad...
   
   👉 Haz clic en este enlace para continuar:
   https://handy-jhisac0b6-jcsiq98s-projects.vercel.app/verify/TOKEN...
   ```

---

## 🔐 Paso 3: Completar Verificación de Identidad

1. **Abre el link** en tu celular (debería abrirse automáticamente en el navegador)

2. **Verás la página de verificación** con instrucciones

3. **Sigue los pasos:**
   - **Paso 1:** Toma foto del **frente de tu INE**
     - Puedes usar la cámara o seleccionar de galería
   - **Paso 2:** Toma foto del **reverso de tu INE**
   - **Paso 3:** Tómate una **selfie** mirando a la cámara
   - **Paso 4:** Lee las instrucciones de **liveness** (parpadear, girar cabeza)
   - **Paso 5:** Confirma y envía

4. **Verás un mensaje de éxito:**
   ```
   ✅ ¡Fotos enviadas!
   
   Hemos recibido tus documentos correctamente.
   Tu solicitud está en revisión...
   ```

---

## ✅ Paso 4: Verificar en la Base de Datos

Después de subir las fotos, verifica que todo se guardó correctamente:

```sql
-- Ver la aplicación
SELECT 
  id,
  phone,
  name,
  verification_status,
  ine_photo_front IS NOT NULL as has_ine_front,
  ine_photo_back IS NOT NULL as has_ine_back,
  selfie_photo IS NOT NULL as has_selfie,
  created_at
FROM provider_applications
WHERE phone = '+52TU_NUMERO';
```

**Deberías ver:**
- `verification_status = 'DOCS_SUBMITTED'`
- Las 3 columnas de fotos deberían tener URLs (no NULL)

---

## 🐛 Troubleshooting

### El link de verificación no funciona
- Verifica que `FRONTEND_URL` en Railway apunte a tu URL de Vercel
- Verifica que el token no haya expirado (expira en 1 hora)

### Las fotos no se suben
- Verifica que Cloudinary esté configurado en Railway:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Revisa los logs de Railway para ver errores

### El bot de WhatsApp no responde
- Verifica que el webhook esté configurado en Meta Developer
- Verifica que `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` estén configurados
- Revisa los logs de Railway

### No puedo acceder a la cámara
- Asegúrate de dar permisos de cámara al navegador
- Prueba en un navegador diferente (Chrome, Safari, Firefox)

---

## 📝 Checklist de Pruebas

- [ ] Proveedor demo eliminado
- [ ] Onboarding por WhatsApp completado
- [ ] Link de verificación recibido
- [ ] Página de verificación carga correctamente
- [ ] Fotos de INE (frente) capturadas/subidas
- [ ] Fotos de INE (reverso) capturadas/subidas
- [ ] Selfie capturada/subida
- [ ] Liveness detection completado
- [ ] Fotos subidas exitosamente
- [ ] Estado en BD cambió a `DOCS_SUBMITTED`
- [ ] URLs de fotos guardadas en Cloudinary

---

## 🎯 Próximo Paso: M6 (Panel de Admin)

Una vez que las fotos estén subidas, necesitarás implementar M6 para:
- Ver las fotos en un panel de admin
- Comparar manualmente las fotos
- Aprobar/rechazar la aplicación
- Notificar al proveedor por WhatsApp

