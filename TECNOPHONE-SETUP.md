# 🏢 Sistema de Cotizaciones - TECNOPHONE

## 🔐 **Configuración de Seguridad por Empresa**

### **📋 Información de la Empresa**
- **Nombre:** TECNOPHONE
- **Código de Seguridad:** `TECH2024`
- **Descripción:** Sistema de Cotizaciones exclusivo para personal de TECNOPHONE
- **Logo:** 📱

### **🎯 Características del Sistema**

#### **✅ Seguridad Implementada:**
- 🔐 **Código único de empresa** requerido para registro
- 👥 **Acceso exclusivo** para personal de TECNOPHONE
- 🏢 **Separación de datos** por empresa
- 📧 **Verificación de email** obligatoria
- 🔄 **Recuperación de contraseña** disponible

#### **✅ Funcionalidades:**
- 💾 **Sincronización híbrida** (IndexedDB + Firebase)
- 📱 **Funciona offline** y online
- 🌐 **Multi-dispositivo** con sincronización automática
- 📊 **Sistema de aprobaciones** de cotizaciones
- 👤 **Gestión de usuarios** por empresa

### **🚀 Cómo Usar el Sistema**

#### **📝 Para Nuevos Usuarios:**
1. **Abrir la aplicación** → Ver pantalla de bienvenida de TECNOPHONE
2. **Click "Crear Cuenta"** → Se abre modal de registro
3. **Ingresar código:** `TECH2024` → Validación automática
4. **Completar datos:** Nombre, email, contraseña
5. **Verificar email** → Revisar bandeja de entrada
6. **Iniciar sesión** → Acceso completo al sistema

#### **🔑 Para Usuarios Existentes:**
1. **Abrir la aplicación** → Ver pantalla de bienvenida
2. **Click "Iniciar Sesión"** → Modal de login
3. **Ingresar credenciales** → Acceso directo
4. **Sincronización automática** → Datos actualizados

### **🔧 Configuración Técnica**

#### **📁 Archivos de Configuración:**
- `src/lib/companyConfig.js` - Configuración de TECNOPHONE
- `src/contexts/AuthContext.jsx` - Lógica de autenticación
- `src/components/AuthModal.jsx` - Interfaz de login/registro
- `src/lib/firebase.js` - Servicios de Firebase

#### **🔐 Código de Seguridad:**
```javascript
// Código actual: TECH2024
// Ubicación: src/lib/companyConfig.js
export const COMPANY_CONFIG = {
  name: 'TECNOPHONE',
  code: 'TECH2024', // ← Código de seguridad
  // ...
}
```

### **🛡️ Seguridad y Permisos**

#### **✅ Lo que está Permitido:**
- ✅ Usuarios con código válido pueden registrarse
- ✅ Personal de TECNOPHONE puede acceder al sistema
- ✅ Cada usuario ve solo sus cotizaciones
- ✅ Sincronización automática entre dispositivos
- ✅ Recuperación de contraseña por email

#### **❌ Lo que está Restringido:**
- ❌ Sin código válido no se puede registrar
- ❌ Usuarios no pueden ver cotizaciones de otros
- ❌ No se puede acceder sin autenticación
- ❌ No se pueden modificar datos de otros usuarios

### **📊 Estructura de Datos**

#### **👤 Información de Usuario:**
```javascript
{
  uid: "user-id",
  email: "usuario@tecnophone.com",
  displayName: "Juan Pérez",
  companyId: "TECNOPHONE",
  companyName: "TECNOPHONE",
  companyCode: "TECH2024",
  createdAt: "2024-01-01T00:00:00.000Z",
  isActive: true
}
```

#### **📋 Información de Cotización:**
```javascript
{
  cotizacion_id: "COT-1234567890",
  clienteName: "Cliente Ejemplo",
  companyId: "TECNOPHONE",
  companyName: "TECNOPHONE",
  createdBy: "user-id",
  userEmail: "usuario@tecnophone.com",
  userName: "Juan Pérez",
  // ... otros campos de cotización
}
```

### **🔧 Administración del Sistema**

#### **📝 Cambiar Código de Seguridad:**
1. Editar `src/lib/companyConfig.js`
2. Cambiar el valor de `code: 'TECH2024'`
3. Reiniciar la aplicación
4. Notificar al personal sobre el nuevo código

#### **👥 Gestionar Usuarios:**
- Los usuarios se crean automáticamente al registrarse
- Se almacenan en Firebase Firestore (colección `users`)
- Se pueden ver en Firebase Console → Firestore Database

#### **📊 Monitoreo:**
- Firebase Console → Authentication → Users
- Firebase Console → Firestore Database → users
- Logs en consola del navegador

### **🚨 Solución de Problemas**

#### **❌ Error: "Código de empresa inválido"**
- Verificar que el código sea exactamente `TECH2024`
- Verificar mayúsculas/minúsculas
- Contactar administrador si persiste

#### **❌ Error: "Email no autorizado"**
- Verificar dominio del email
- Contactar administrador para agregar dominio
- Usar email corporativo de TECNOPHONE

#### **❌ Error: "Límite de usuarios alcanzado"**
- Contactar administrador
- Revisar configuración en `companyConfig.js`
- Aumentar `maxUsersPerCompany` si es necesario

#### **❌ Error de Sincronización:**
- Verificar conexión a internet
- Revisar reglas de Firestore
- Verificar configuración de Firebase

### **📞 Contacto y Soporte**

#### **🔧 Para Administradores:**
- **Cambiar código:** Editar `companyConfig.js`
- **Agregar dominios:** Modificar `allowedDomains` en `companyConfig.js`
- **Ver usuarios:** Firebase Console → Authentication
- **Ver datos:** Firebase Console → Firestore Database

#### **👤 Para Usuarios:**
- **Problemas de registro:** Verificar código `TECH2024`
- **Problemas de login:** Usar recuperación de contraseña
- **Problemas técnicos:** Contactar administrador

### **🎉 Beneficios del Sistema**

| **Característica** | **Beneficio** |
|-------------------|---------------|
| 🔐 **Código único** | Solo personal autorizado |
| 🏢 **Empresa específica** | Datos separados y seguros |
| 📱 **Multi-dispositivo** | Acceso desde cualquier lugar |
| 💾 **Offline/Online** | Funciona sin internet |
| 🔄 **Sincronización** | Datos siempre actualizados |
| 📊 **Aprobaciones** | Flujo de trabajo profesional |

### **🚀 Próximas Mejoras**

- [ ] **Panel de administración** para gestionar usuarios
- [ ] **Roles y permisos** (Admin, Usuario, Supervisor)
- [ ] **Notificaciones** por email de cotizaciones
- [ ] **Reportes** y estadísticas
- [ ] **Integración** con sistemas externos
- [ ] **Backup automático** de datos

---

**🏢 TECNOPHONE - Sistema de Cotizaciones Profesional**  
**🔐 Código de Seguridad: TECH2024**  
**📧 Soporte: administrador@tecnophone.com**
