import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  enableIndexedDbPersistence
} from 'firebase/firestore'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth'

// IMPORTANTE: Reemplaza estos valores con tu configuración de Firebase
// Ve a https://console.firebase.google.com/ y crea un nuevo proyecto
const firebaseConfig = {
  // 🚨 CONFIGURA ESTOS VALORES EN TU PROYECTO FIREBASE
  apiKey: "AIzaSyDg6Mwzw9aLxsxDqxZyqTNdXAbZWudtz0A",
  authDomain: "cotizador-ebd54.firebaseapp.com",
  projectId: "cotizador-ebd54",
  storageBucket: "cotizador-ebd54.firebasestorage.app",
  messagingSenderId: "627582491863",
  appId: "1:627582491863:web:3bbd09e9850e69f1eae492"
}

// Inicializar Firebase
let app
let db
let auth
let isOnline = navigator.onLine

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
  
  // Habilitar persistencia offline (similar a IndexedDB)
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('📱 Múltiples pestañas abiertas, persistencia limitada')
    } else if (err.code === 'unimplemented') {
      console.warn('🌐 Navegador no soporta persistencia')
    }
  })
  
  console.log('🔥 Firebase inicializado correctamente')
  console.log('🔐 Auth inicializado correctamente')
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error)
}

// Detectar cambios de conectividad
window.addEventListener('online', () => {
  isOnline = true
  console.log('🌐 Conectado - sincronizando...')
  if (db) enableNetwork(db)
})

window.addEventListener('offline', () => {
  isOnline = false
  console.log('📱 Offline - usando caché local')
  if (db) disableNetwork(db)
})

// Servicio de cotizaciones en Firebase
export const firebaseQuotesService = {
  // Crear cotización en Firebase
  async create(cotizacion) {
    try {
      if (!db) throw new Error('Firebase no inicializado')
      
      const cotizacionData = {
        ...cotizacion,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Campos adicionales para multi-empresa
        companyId: cotizacion.companyId || 'default',
        createdBy: cotizacion.createdBy || 'anonymous'
      }
      
      console.log('🔥 Creando cotización en Firebase...')
      const docRef = await addDoc(collection(db, 'cotizaciones'), cotizacionData)
      
      console.log('✅ Cotización creada en Firebase:', docRef.id)
      return docRef.id // Retorna el ID de Firebase
    } catch (error) {
      console.error('❌ Error creando en Firebase:', error)
      throw error
    }
  },

  // Obtener todas las cotizaciones
  async getAll(companyId = 'default') {
    try {
      if (!db) throw new Error('Firebase no inicializado')
      
      console.log('📋 Obteniendo cotizaciones de Firebase...')
      const q = query(
        collection(db, 'cotizaciones'),
        where('companyId', '==', companyId),
        orderBy('updatedAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const cotizaciones = []
      
      querySnapshot.forEach((doc) => {
        cotizaciones.push({
          firebaseId: doc.id,
          ...doc.data(),
          // Convertir timestamps a fechas
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          approvalDate: doc.data().approvalDate?.toDate()
        })
      })
      
      console.log(`✅ ${cotizaciones.length} cotizaciones obtenidas de Firebase`)
      return cotizaciones
    } catch (error) {
      console.error('❌ Error obteniendo de Firebase:', error)
      throw error
    }
  },

  // Obtener cotización por ID de cotización (no Firebase ID)
  async getByCotizacionId(cotizacionId, companyId = 'default') {
    try {
      if (!db) throw new Error('Firebase no inicializado')
      
      console.log('🔍 Buscando cotización en Firebase:', cotizacionId)
      const q = query(
        collection(db, 'cotizaciones'),
        where('cotizacion_id', '==', cotizacionId),
        where('companyId', '==', companyId),
        limit(1)
      )
      
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        console.log('⚠️ Cotización no encontrada en Firebase')
        return null
      }
      
      const doc = querySnapshot.docs[0]
      const cotizacion = {
        firebaseId: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        approvalDate: doc.data().approvalDate?.toDate()
      }
      
      console.log('✅ Cotización encontrada en Firebase')
      return cotizacion
    } catch (error) {
      console.error('❌ Error buscando en Firebase:', error)
      throw error
    }
  },

  // Actualizar cotización
  async update(firebaseId, changes) {
    try {
      if (!db) throw new Error('Firebase no inicializado')
      
      console.log('📝 Actualizando cotización en Firebase:', firebaseId)
      
      const updateData = {
        ...changes,
        updatedAt: serverTimestamp()
      }
      
      const docRef = doc(db, 'cotizaciones', firebaseId)
      await updateDoc(docRef, updateData)
      
      console.log('✅ Cotización actualizada en Firebase')
      return true
    } catch (error) {
      console.error('❌ Error actualizando en Firebase:', error)
      throw error
    }
  },

  // Eliminar cotización
  async delete(firebaseId) {
    try {
      if (!db) throw new Error('Firebase no inicializado')
      
      console.log('🗑️ Eliminando cotización de Firebase:', firebaseId)
      
      const docRef = doc(db, 'cotizaciones', firebaseId)
      await deleteDoc(docRef)
      
      console.log('✅ Cotización eliminada de Firebase')
    } catch (error) {
      console.error('❌ Error eliminando de Firebase:', error)
      throw error
    }
  },

  // Suscribirse a cambios en tiempo real
  subscribeToChanges(companyId = 'default', callback) {
    try {
      if (!db) throw new Error('Firebase no inicializado')
      
      console.log('👀 Suscribiéndose a cambios en tiempo real...')
      
      const q = query(
        collection(db, 'cotizaciones'),
        where('companyId', '==', companyId),
        orderBy('updatedAt', 'desc')
      )
      
      return onSnapshot(q, (querySnapshot) => {
        const cotizaciones = []
        querySnapshot.forEach((doc) => {
          cotizaciones.push({
            firebaseId: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            approvalDate: doc.data().approvalDate?.toDate()
          })
        })
        
        console.log(`🔄 Cambios detectados: ${cotizaciones.length} cotizaciones`)
        callback(cotizaciones)
      }, (error) => {
        console.error('❌ Error en suscripción:', error)
      })
    } catch (error) {
      console.error('❌ Error creando suscripción:', error)
      throw error
    }
  },

  // Verificar conectividad
  isConnected() {
    return isOnline
  }
}

// Utilidades
export const firebaseUtils = {
  // Generar ID único para company
  generateCompanyId() {
    return `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // Configurar reglas de seguridad recomendadas
  getSecurityRules() {
    return `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura para cotizaciones por companyId
    match /cotizaciones/{document} {
      allow read, write: if resource.data.companyId == request.auth.token.companyId
        || resource.data.companyId == 'default';
    }
  }
}
    `
  }
}

// Servicios de Autenticación
export const authService = {
  // Registrar nuevo usuario
  async register(email, password, displayName, companyInfo = null) {
    try {
      console.log('📝 Registrando nuevo usuario:', email)
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Actualizar perfil con nombre
      if (displayName) {
        await updateProfile(user, {
          displayName: displayName
        })
      }
      
      // Guardar información de la empresa en Firestore
      if (companyInfo) {
        try {
          const userDoc = {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            companyId: companyInfo.name,
            companyName: companyInfo.displayName,
            companyCode: companyInfo.code,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
          }
          
          await addDoc(collection(db, 'users'), userDoc)
          console.log('✅ Información de empresa guardada en Firestore')
        } catch (firestoreError) {
          console.warn('⚠️ Error guardando en Firestore:', firestoreError)
          // No fallar el registro si Firestore falla
        }
      }
      
      // Enviar email de verificación
      await sendEmailVerification(user)
      
      console.log('✅ Usuario registrado exitosamente:', user.uid)
      return { user, needsVerification: true }
    } catch (error) {
      console.error('❌ Error en registro:', error)
      throw error
    }
  },

  // Iniciar sesión
  async login(email, password) {
    try {
      console.log('🔑 Iniciando sesión:', email)
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log('✅ Sesión iniciada exitosamente:', user.uid)
      return user
    } catch (error) {
      console.error('❌ Error en login:', error)
      throw error
    }
  },

  // Cerrar sesión
  async logout() {
    try {
      console.log('👋 Cerrando sesión...')
      
      await signOut(auth)
      
      console.log('✅ Sesión cerrada exitosamente')
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error)
      throw error
    }
  },

  // Restablecer contraseña
  async resetPassword(email) {
    try {
      console.log('🔄 Enviando email de restablecimiento:', email)
      
      await sendPasswordResetEmail(auth, email)
      
      console.log('✅ Email de restablecimiento enviado')
    } catch (error) {
      console.error('❌ Error enviando email de restablecimiento:', error)
      throw error
    }
  },

  // Obtener usuario actual
  getCurrentUser() {
    return auth.currentUser
  },

  // Escuchar cambios de autenticación
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback)
  },

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return !!auth.currentUser
  },

  // Obtener token de autenticación
  async getAuthToken() {
    try {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken()
      }
      return null
    } catch (error) {
      console.error('❌ Error obteniendo token:', error)
      return null
    }
  }
}

export { db, auth }
export default app
