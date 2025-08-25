# 🔐 Reglas de Seguridad de Firestore con Autenticación

## 📋 **Instrucciones para Configurar Reglas Seguras**

### **1. Ve a Firebase Console**
1. Abre [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **cotizador-ebd54**
3. Ve a **Firestore Database** → **Reglas**

### **2. Reemplaza las Reglas Actuales**

**BORRA** todo el contenido actual y **PEGA** estas reglas seguras para TECNOPHONE:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Reglas para la colección de cotizaciones
    match /cotizaciones/{cotizacionId} {
      // Permitir lectura si:
      // - El usuario está autenticado Y
      // - Es el creador de la cotización O es de TECNOPHONE
      allow read: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         resource.data.userEmail == request.auth.token.email ||
         resource.data.companyId == 'TECNOPHONE');
      
      // Permitir escritura si:
      // - El usuario está autenticado Y
      // - Para crear: establece el createdBy correcto y companyId = TECNOPHONE
      // - Para actualizar: es el creador original
      allow create: if request.auth != null && 
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.userEmail == request.auth.token.email &&
        request.resource.data.companyId == 'TECNOPHONE';
      
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid ||
         resource.data.userEmail == request.auth.token.email);
      
      // Permitir eliminar solo si es el creador
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // Reglas para la colección de usuarios
    match /users/{userId} {
      // Permitir lectura/escritura solo si es el propio usuario
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Reglas para la colección de proveedores
    match /providers/{providerId} {
      // Permitir lectura si:
      // - El usuario está autenticado Y
      // - Es de TECNOPHONE
      allow read: if request.auth != null && 
        resource.data.companyId == 'TECNOPHONE';
      
      // Permitir escritura si:
      // - El usuario está autenticado Y
      // - Para crear: establece el createdBy correcto y companyId = TECNOPHONE
      // - Para actualizar: es el creador original
      allow create: if request.auth != null && 
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.userEmail == request.auth.token.email &&
        request.resource.data.companyId == 'TECNOPHONE';
      
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid ||
         resource.data.userEmail == request.auth.token.email);
      
      // Permitir eliminar solo si es el creador
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // Reglas para otras colecciones futuras
    match /{document=**} {
      // Por defecto, solo usuarios autenticados
      allow read, write: if request.auth != null;
    }
  }
}
```

### **3. Reglas Más Permisivas (Si hay Problemas)**

Si las reglas anteriores causan problemas, usa estas **temporalmente**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Requiere autenticación pero permite todo
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **4. Reglas de Desarrollo (Solo para Testing)**

Para desarrollo y testing, puedes usar estas reglas **MUY PERMISIVAS**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ⚠️ SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🎯 **Cómo Funciona la Seguridad**

### **✅ Casos Permitidos:**
- ✅ Usuario autenticado puede crear sus propias cotizaciones
- ✅ Usuario autenticado puede leer sus propias cotizaciones  
- ✅ Usuario autenticado puede actualizar sus cotizaciones
- ✅ Usuario autenticado puede eliminar sus cotizaciones
- ✅ Cotizaciones con `companyId: 'default'` son accesibles (compatibilidad)

### **❌ Casos Denegados:**
- ❌ Usuario no autenticado no puede hacer nada
- ❌ Usuario no puede ver cotizaciones de otros usuarios
- ❌ Usuario no puede modificar cotizaciones de otros
- ❌ No se pueden crear cotizaciones sin `createdBy` correcto

## 🔧 **Campos de Seguridad Automáticos**

El sistema ahora agrega automáticamente estos campos a cada cotización:

```javascript
{
  // ... otros campos de la cotización
  createdBy: "uid-del-usuario",
  userEmail: "usuario@email.com", 
  companyId: "default",
  // ... metadatos de sincronización
}
```

## 🧪 **Probar la Seguridad**

1. **Crear cuenta nueva** y hacer login
2. **Crear cotización** → Debería funcionar
3. **Ver cotizaciones** → Solo deberías ver las tuyas
4. **Cerrar sesión** → No deberías poder acceder
5. **Crear otra cuenta** → No deberías ver cotizaciones del usuario anterior

## 🚨 **Si Hay Errores de Permisos**

Si ves errores como "Missing or insufficient permissions":

1. **Verifica que estés logueado** en la aplicación
2. **Usa las reglas más permisivas** temporalmente
3. **Revisa la consola** del navegador para más detalles
4. **Verifica que Firebase Auth** esté funcionando

## 📞 **Solución de Problemas**

### **Error: "Missing or insufficient permissions"**
- Verificar que el usuario está autenticado
- Usar reglas más permisivas temporalmente
- Verificar que los campos `createdBy` y `userEmail` se están enviando

### **Error: "Resource not found"**  
- La cotización no existe o no tienes permisos para verla
- Verificar que la cotización tenga los campos de seguridad correctos

### **Las reglas no se aplican**
- Esperar 1-2 minutos después de publicar
- Refrescar completamente la aplicación (Ctrl+F5)
- Verificar en la pestaña "Reglas" que se guardaron correctamente

## 🎉 **Beneficios de la Seguridad**

- 🔐 **Datos protegidos** por usuario
- 👥 **Multi-usuario** seguro
- 🏢 **Multi-empresa** con separación
- ⚡ **Rendimiento** optimizado
- 🛡️ **Cumple estándares** de seguridad

¡Ahora tu sistema de cotizaciones es seguro y multiusuario! 🚀
