import { 
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
  serverTimestamp 
} from 'firebase/firestore'
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { db, auth } from './firebase'
import { USER_ROLES, createUserStructure, validateUserData, isAdmin } from './userRoles'

// Servicio para gestión de usuarios
export class UserService {
  constructor() {
    this.collectionName = 'users'
  }

  // Crear nuevo usuario (solo administradores)
  async createUser(userData, createdByUser) {
    try {
      // Verificar permisos del usuario que crea
      if (!isAdmin(createdByUser?.role)) {
        throw new Error('Solo los administradores pueden crear usuarios')
      }

      console.log('👤 [UserService] Creando nuevo usuario...', userData.email)

      // Validar datos
      const validation = validateUserData(userData)
      if (!validation.isValid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`)
      }

      // Verificar que el email no exista
      const existingUser = await this.getUserByEmail(userData.email)
      if (existingUser) {
        throw new Error('Ya existe un usuario con este email')
      }

      // Crear estructura de usuario
      const userStructure = createUserStructure(userData, createdByUser.uid)

      // Crear documento en Firestore
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...userStructure,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('✅ [UserService] Usuario creado en Firestore:', docRef.id)

      // Crear cuenta de autenticación de Firebase (opcional)
      if (userData.createAuthAccount) {
        try {
          // Generar contraseña temporal
          const tempPassword = this.generateTempPassword()
          
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userData.email, 
            tempPassword
          )

          // Actualizar perfil
          await updateProfile(userCredential.user, {
            displayName: userData.displayName
          })

          // Enviar email de reset para que establezca su contraseña
          await sendPasswordResetEmail(auth, userData.email)

          // Actualizar documento con UID de Firebase Auth
          await updateDoc(doc(db, this.collectionName, docRef.id), {
            firebaseUid: userCredential.user.uid,
            authAccountCreated: true,
            tempPasswordSent: true,
            updatedAt: serverTimestamp()
          })

          console.log('✅ [UserService] Cuenta de autenticación creada:', userCredential.user.uid)
        } catch (authError) {
          console.warn('⚠️ [UserService] Error creando cuenta de auth:', authError.message)
          // No fallar completamente, el usuario existe en Firestore
        }
      }

      return {
        id: docRef.id,
        ...userStructure
      }

    } catch (error) {
      console.error('❌ [UserService] Error creando usuario:', error)
      throw error
    }
  }

  // Obtener todos los usuarios (solo administradores)
  async getAllUsers(requestingUser) {
    try {
      if (!isAdmin(requestingUser?.role)) {
        throw new Error('Solo los administradores pueden ver todos los usuarios')
      }

      console.log('📋 [UserService] Obteniendo todos los usuarios...')

      const q = query(
        collection(db, this.collectionName),
        where('companyId', '==', 'TECNOPHONE'),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const users = []

      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
          // Convertir timestamps
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
          lastLogin: doc.data().lastLogin?.toDate?.()?.toISOString() || doc.data().lastLogin
        })
      })

      console.log(`✅ [UserService] ${users.length} usuarios obtenidos`)
      return users

    } catch (error) {
      console.error('❌ [UserService] Error obteniendo usuarios:', error)
      throw error
    }
  }

  // Obtener usuario por email
  async getUserByEmail(email) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('email', '==', email.toLowerCase()),
        where('companyId', '==', 'TECNOPHONE')
      )

      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        lastLogin: doc.data().lastLogin?.toDate?.()?.toISOString() || doc.data().lastLogin
      }

    } catch (error) {
      console.error('❌ [UserService] Error obteniendo usuario por email:', error)
      throw error
    }
  }

  // Actualizar usuario (solo administradores)
  async updateUser(userId, updateData, updatingUser) {
    try {
      if (!isAdmin(updatingUser?.role)) {
        throw new Error('Solo los administradores pueden actualizar usuarios')
      }

      console.log('📝 [UserService] Actualizando usuario:', userId)

      // Validar datos si se está cambiando información crítica
      if (updateData.email || updateData.role) {
        const validation = validateUserData({
          ...updateData,
          displayName: updateData.displayName || 'temp',
          companyId: 'TECNOPHONE'
        })
        
        if (!validation.isValid) {
          throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`)
        }
      }

      const docRef = doc(db, this.collectionName, userId)
      
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: updatingUser.uid
      })

      console.log('✅ [UserService] Usuario actualizado:', userId)
      
      // Obtener usuario actualizado
      const updatedDoc = await getDoc(docRef)
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }

    } catch (error) {
      console.error('❌ [UserService] Error actualizando usuario:', error)
      throw error
    }
  }

  // Desactivar usuario (no eliminar, solo desactivar)
  async deactivateUser(userId, deactivatingUser) {
    try {
      if (!isAdmin(deactivatingUser?.role)) {
        throw new Error('Solo los administradores pueden desactivar usuarios')
      }

      console.log('🚫 [UserService] Desactivando usuario:', userId)

      const docRef = doc(db, this.collectionName, userId)
      
      await updateDoc(docRef, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: deactivatingUser.uid,
        updatedAt: serverTimestamp()
      })

      console.log('✅ [UserService] Usuario desactivado:', userId)

    } catch (error) {
      console.error('❌ [UserService] Error desactivando usuario:', error)
      throw error
    }
  }

  // Reactivar usuario
  async reactivateUser(userId, reactivatingUser) {
    try {
      if (!isAdmin(reactivatingUser?.role)) {
        throw new Error('Solo los administradores pueden reactivar usuarios')
      }

      console.log('✅ [UserService] Reactivando usuario:', userId)

      const docRef = doc(db, this.collectionName, userId)
      
      await updateDoc(docRef, {
        isActive: true,
        reactivatedAt: serverTimestamp(),
        reactivatedBy: reactivatingUser.uid,
        updatedAt: serverTimestamp()
      })

      console.log('✅ [UserService] Usuario reactivado:', userId)

    } catch (error) {
      console.error('❌ [UserService] Error reactivando usuario:', error)
      throw error
    }
  }

  // Registrar último login
  async updateLastLogin(userId) {
    try {
      const docRef = doc(db, this.collectionName, userId)
      
      await updateDoc(docRef, {
        lastLogin: serverTimestamp()
      })

    } catch (error) {
      console.warn('⚠️ [UserService] Error actualizando último login:', error)
      // No fallar por esto
    }
  }

  // Generar contraseña temporal
  generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return password
  }

  // Obtener estadísticas de usuarios (para dashboard admin)
  async getUserStats(requestingUser) {
    try {
      if (!isAdmin(requestingUser?.role)) {
        throw new Error('Solo los administradores pueden ver estadísticas')
      }

      const users = await this.getAllUsers(requestingUser)
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        byRole: {}
      }

      // Contar por roles
      Object.values(USER_ROLES).forEach(role => {
        stats.byRole[role] = users.filter(u => u.role === role).length
      })

      return stats

    } catch (error) {
      console.error('❌ [UserService] Error obteniendo estadísticas:', error)
      throw error
    }
  }
}

// Instancia global del servicio
export const userService = new UserService()

export default userService
