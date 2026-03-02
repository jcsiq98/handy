# 🗑️ Eliminar Proveedor Demo - Instrucciones

## Tu número: `+526565884840`

## Opción 1: Ejecutar SQL en Railway (Recomendado)

1. **Ve a tu proyecto en Railway**
   - Abre https://railway.app
   - Selecciona tu proyecto de Handy

2. **Abre la base de datos PostgreSQL**
   - En el panel lateral, busca "PostgreSQL" o "Neon"
   - Haz clic en "Query" o "Console"

3. **Copia y pega este SQL** (ya tiene tu número configurado):

```sql
-- Ver qué hay asociado al número primero
SELECT '=== USUARIO ===' as info;
SELECT id, phone, name, role FROM users WHERE phone = '+526565884840';

SELECT '=== APLICACIÓN ===' as info;
SELECT id, phone, name, verification_status FROM provider_applications WHERE phone = '+526565884840';

SELECT '=== PERFIL PROVEEDOR ===' as info;
SELECT pp.id, pp.user_id, u.name 
FROM provider_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE u.phone = '+526565884840';

-- ============================================
-- ELIMINAR (ejecutar en orden)
-- ============================================

-- 1. Eliminar zonas de servicio del proveedor
DELETE FROM provider_service_zones 
WHERE provider_id IN (
  SELECT pp.id 
  FROM provider_profiles pp
  JOIN users u ON u.id = pp.user_id
  WHERE u.phone = '+526565884840'
);

-- 2. Eliminar bookings del proveedor o como cliente
DELETE FROM bookings 
WHERE provider_id IN (
  SELECT pp.id 
  FROM provider_profiles pp
  JOIN users u ON u.id = pp.user_id
  WHERE u.phone = '+526565884840'
) OR customer_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
);

-- 3. Eliminar mensajes
DELETE FROM messages 
WHERE sender_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
);

-- 4. Eliminar ratings
DELETE FROM ratings 
WHERE from_user_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
) OR to_user_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
);

-- 5. Eliminar refresh tokens
DELETE FROM refresh_tokens 
WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
);

-- 6. Eliminar OTP codes
DELETE FROM otp_codes 
WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
);

-- 7. Eliminar perfil de proveedor
DELETE FROM provider_profiles 
WHERE user_id IN (
  SELECT id FROM users WHERE phone = '+526565884840'
);

-- 8. Eliminar aplicación de proveedor
DELETE FROM provider_applications 
WHERE phone = '+526565884840';

-- 9. Finalmente, eliminar el usuario
DELETE FROM users 
WHERE phone = '+526565884840';

-- Verificar que se eliminó
SELECT '=== VERIFICACIÓN ===' as info;
SELECT COUNT(*) as usuarios_restantes FROM users WHERE phone = '+526565884840';
SELECT COUNT(*) as aplicaciones_restantes FROM provider_applications WHERE phone = '+526565884840';
```

4. **Ejecuta el SQL** (debería mostrar "0" en la verificación final)

---

## Opción 2: Usar Railway CLI (si lo tienes instalado)

```bash
# Conectar a la BD de Railway
railway connect postgres

# Luego ejecutar el SQL del archivo
psql < handy/backend/scripts/delete-provider-sql.sql
```

---

## ✅ Verificación

Después de ejecutar el SQL, verifica que:

1. **No hay usuario:**
   ```sql
   SELECT * FROM users WHERE phone = '+526565884840';
   -- Debe retornar 0 filas
   ```

2. **No hay aplicación:**
   ```sql
   SELECT * FROM provider_applications WHERE phone = '+526565884840';
   -- Debe retornar 0 filas
   ```

---

## 📱 Siguiente Paso: Hacer Onboarding

Una vez eliminado, puedes hacer onboarding desde tu celular:

1. Envía un mensaje al número de WhatsApp de Handy
2. Escribe "si" cuando te pregunte
3. Completa el flujo de onboarding
4. Recibirás el link de verificación
5. Sube las fotos de INE + selfie

¡Listo para probar! 🚀

