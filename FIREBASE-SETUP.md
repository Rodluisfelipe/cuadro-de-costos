# 🔥 Configuración de Firebase para Sincronización Multi-Dispositivo

## 📝 **Instrucciones Paso a Paso**

### **1. Crear Proyecto en Firebase**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en **"Crear un proyecto"** o **"Add project"**
3. Nombra tu proyecto (ej: `cotizador-empresa`)
4. **Opcional**: Habilitar Google Analytics
5. Click en **"Crear proyecto"**

### **2. Configurar Firestore Database**

1. En el panel lateral, click en **"Firestore Database"**
2. Click en **"Crear base de datos"**
3. Selecciona **"Iniciar en modo de prueba"** (por ahora)
4. Elige ubicación (recomendado: `us-central`)
5. Click en **"Listo"**

### **3. Obtener Configuración Web**

1. En el panel principal, click en el ícono **Web** (`</>`)
2. Registra la app con un nombre (ej: `cotizador-web`)
3. **NO marcar** "Configure Firebase Hosting" por ahora
4. Click en **"Registrar app"**
5. **COPIAR** la configuración que aparece:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key-aqui",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
}
```

### **4. Configurar en tu Aplicación**

1. Abre el archivo `src/lib/firebase.js`
2. **REEMPLAZA** la configuración por defecto:

```javascript
// 🔥 CAMBIA ESTOS VALORES por los de tu proyecto
const firebaseConfig = {
  apiKey: "TU-API-KEY-AQUI",
  authDomain: "TU-PROYECTO.firebaseapp.com", 
  projectId: "TU-PROJECT-ID",
  storageBucket: "TU-PROYECTO.appspot.com",
  messagingSenderId: "TU-SENDER-ID",
  appId: "TU-APP-ID"
}
```

### **5. Configurar Reglas de Seguridad**

1. En Firebase Console, ve a **Firestore Database** → **Reglas**
2. **REEMPLAZA** las reglas por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso completo por ahora (puedes restringir después)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click en **"Publicar"**

⚠️ **IMPORTANTE**: Estas reglas permiten acceso completo. En producción, considera implementar autenticación y reglas más restrictivas.

### **6. Probar la Configuración**

1. Reinicia tu aplicación:
   ```bash
   npm run dev
   ```

2. Abre las herramientas de desarrollador (F12)
3. Busca estos mensajes en la consola:
   ```
   🔥 Firebase inicializado correctamente
   ✅ [Hook] X cotizaciones cargadas (híbrido)
   📊 [Hook] Sync stats: {...}
   ```

4. En la interfaz verás:
   - **🌐 Online** (indicador verde)
   - **✅ X sincronizadas** (contador de sincronización)

### **7. Verificar Sincronización**

1. **Crear una cotización** en tu aplicación
2. Ve a **Firebase Console** → **Firestore Database**
3. Deberías ver la colección `cotizaciones` con tus datos
4. **Abre la app en otro dispositivo/navegador**
5. Las cotizaciones deberían aparecer automáticamente

## 🎯 **Funcionalidades Habilitadas**

### **✅ Lo que Funciona Ahora:**

- **💾 Almacenamiento Local**: IndexedDB para funcionamiento offline
- **☁️ Sincronización Automática**: Firebase para multi-dispositivo
- **🔄 Sincronización Inteligente**: Automática al conectarse
- **📱 Modo Offline**: Continúa funcionando sin internet
- **🌐 Multi-Usuario**: Cada empresa puede tener sus cotizaciones
- **⚡ Tiempo Real**: Cambios se reflejan en otros dispositivos

### **📊 Indicadores Visuales:**

- **🌐 Online/📱 Offline**: Estado de conectividad
- **📤 X pendientes**: Cotizaciones esperando sincronización
- **✅ X sincronizadas**: Cotizaciones en la nube
- **🔄 Click para sincronizar**: Forzar sincronización manual

## 🛠️ **Configuraciones Avanzadas (Opcional)**

### **Multi-Empresa**

Para manejar múltiples empresas, modifica en `src/lib/hybridDatabase.js`:

```javascript
// Cambiar 'default' por un ID único de empresa
constructor() {
  this.companyId = 'empresa_123' // ID único por empresa
}
```

### **Autenticación (Recomendado para Producción)**

1. En Firebase Console: **Authentication** → **Comenzar**
2. Habilitar **Email/Password** o **Google**
3. Implementar login en la aplicación
4. Actualizar reglas de Firestore para requerir autenticación

### **Backup Automático**

Los datos están automáticamente respaldados en Firebase. Para backups adicionales:

1. Ve a **Firebase Console** → **Firestore Database** → **Exportar**
2. Configura backups programados desde Google Cloud Console

## 🐛 **Solución de Problemas**

### **Error: Firebase no inicializado**
- Verificar que la configuración en `firebase.js` sea correcta
- Verificar que las reglas de Firestore permitan acceso

### **No sincroniza**
- Verificar conexión a internet
- Ver consola del navegador para errores
- Click en el indicador de sincronización para forzar

### **Datos duplicados**
- Eliminar datos de `localStorage` (herramientas de desarrollador)
- Refrescar la página

### **Reglas de Firestore**
Si tienes errores de permisos, usa estas reglas temporales:
```javascript
match /{document=**} {
  allow read, write: if true;
}
```

## 📞 **Soporte**

Si tienes problemas:
1. Revisar la consola del navegador para errores
2. Verificar la configuración de Firebase
3. Probar en modo incógnito
4. Verificar que Firestore esté habilitado

## 🎉 **¡Felicidades!**

Ahora tienes un sistema completo de cotizaciones que funciona:
- **📱 En cualquier dispositivo**
- **👥 Con múltiples usuarios**
- **🔄 Sincronización automática**
- **💾 Funciona offline**
- **☁️ Respaldo en la nube**

¡Tu sistema de cotizaciones ahora es profesional y escalable! 🚀
