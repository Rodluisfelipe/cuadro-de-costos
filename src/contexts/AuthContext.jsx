import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../lib/firebase'
import { validateCompanyCode, COMPANY_ERROR_MESSAGES, getCompanyInfo } from '../lib/companyConfig'
import { userService } from '../lib/userService'
import { USER_ROLES, getRoleInfo, hasPermission, canCreateQuotes, isAdmin } from '../lib/userRoles'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para UI
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register' | 'reset'
  const [companyCode, setCompanyCode] = useState('')
  const [companyCodeValidated, setCompanyCodeValidated] = useState(false)

  // Estados para sistema de roles
  const [userProfile, setUserProfile] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [roleInfo, setRoleInfo] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    console.log('🔐 [Auth] Inicializando contexto de autenticación...')
    
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      console.log('🔄 [Auth] Estado de autenticación cambió:', user ? user.email : 'sin usuario')
      
      setCurrentUser(user)
      
      if (user) {
        // Cargar perfil del usuario desde Firestore
        await loadUserProfile(user)
        setShowAuthModal(false)
        setError(null)
      } else {
        // Limpiar datos de perfil al cerrar sesión
        setUserProfile(null)
        setUserRole(null)
        setRoleInfo(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Cargar perfil del usuario desde Firestore
  const loadUserProfile = async (user) => {
    try {
      setLoadingProfile(true)
      console.log('👤 [Auth] Cargando perfil del usuario:', user.email)
      
      const profile = await userService.getUserByEmail(user.email)
      
      if (profile) {
        setUserProfile(profile)
        setUserRole(profile.role)
        setRoleInfo(getRoleInfo(profile.role))
        
        // Actualizar último login
        await userService.updateLastLogin(profile.id)
        
        console.log('✅ [Auth] Perfil cargado:', {
          role: profile.role,
          permissions: profile.permissions
        })
      } else {
        // Usuario autenticado pero sin perfil en Firestore
        console.warn('⚠️ [Auth] Usuario autenticado pero sin perfil en sistema')
        setUserProfile(null)
        setUserRole(USER_ROLES.VENDEDOR) // Rol por defecto para compatibilidad
        setRoleInfo(getRoleInfo(USER_ROLES.VENDEDOR))
      }
      
    } catch (error) {
      console.error('❌ [Auth] Error cargando perfil:', error)
      // En caso de error, asignar rol por defecto
      setUserRole(USER_ROLES.VENDEDOR)
      setRoleInfo(getRoleInfo(USER_ROLES.VENDEDOR))
    } finally {
      setLoadingProfile(false)
    }
  }

  // Verificar si el usuario tiene un permiso específico
  const checkPermission = (permission) => {
    return hasPermission(userRole, permission)
  }

  // Verificar si el usuario puede crear cotizaciones
  const canQuote = () => {
    return canCreateQuotes(userRole)
  }

  // Verificar si el usuario es administrador
  const isUserAdmin = () => {
    return isAdmin(userRole)
  }

  // Validar código de empresa
  const validateCompanyCodeHandler = (code) => {
    const isValid = validateCompanyCode(code)
    setCompanyCodeValidated(isValid)
    
    if (isValid) {
      setCompanyCode(code)
      setError(null)
      console.log('✅ [Auth] Código de empresa válido')
    } else {
      setError({
        type: 'error',
        message: COMPANY_ERROR_MESSAGES.invalidCode
      })
    }
    
    return isValid
  }

  // Registrar usuario
  const register = async (email, password, displayName) => {
    try {
      setLoading(true)
      setError(null)
      console.log('📝 [Auth] Registrando usuario...')
      
      // Verificar que el código de empresa esté validado
      if (!companyCodeValidated) {
        throw new Error(COMPANY_ERROR_MESSAGES.codeRequired)
      }
      
      // Agregar información de la empresa al registro
      const companyInfo = getCompanyInfo()
      const result = await authService.register(email, password, displayName, companyInfo)
      
      if (result.needsVerification) {
        setError({
          type: 'info',
          message: 'Te hemos enviado un email de verificación. Por favor revisa tu bandeja de entrada.'
        })
      }
      
      return result
    } catch (error) {
      console.error('❌ [Auth] Error en registro:', error)
      setError({
        type: 'error',
        message: getErrorMessage(error)
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Iniciar sesión
  const login = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔑 [Auth] Iniciando sesión...')
      
      const user = await authService.login(email, password)
      
      return user
    } catch (error) {
      console.error('❌ [Auth] Error en login:', error)
      setError({
        type: 'error',
        message: getErrorMessage(error)
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Cerrar sesión
  const logout = async () => {
    try {
      setLoading(true)
      console.log('👋 [Auth] Cerrando sesión...')
      
      await authService.logout()
      
      setCurrentUser(null)
      setError(null)
    } catch (error) {
      console.error('❌ [Auth] Error cerrando sesión:', error)
      setError({
        type: 'error',
        message: 'Error al cerrar sesión'
      })
    } finally {
      setLoading(false)
    }
  }

  // Restablecer contraseña
  const resetPassword = async (email) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 [Auth] Restableciendo contraseña...')
      
      await authService.resetPassword(email)
      
      setError({
        type: 'success',
        message: 'Te hemos enviado un email para restablecer tu contraseña.'
      })
    } catch (error) {
      console.error('❌ [Auth] Error restableciendo contraseña:', error)
      setError({
        type: 'error',
        message: getErrorMessage(error)
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal de autenticación
  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode)
    setShowAuthModal(true)
    setError(null)
    
    // Resetear validación de código si es registro
    if (mode === 'register') {
      setCompanyCodeValidated(false)
      setCompanyCode('')
    }
  }

  // Cerrar modal de autenticación
  const closeAuthModal = () => {
    setShowAuthModal(false)
    setError(null)
    setCompanyCodeValidated(false)
    setCompanyCode('')
  }

  // Limpiar errores
  const clearError = () => {
    setError(null)
  }

  // Verificar si el usuario está autenticado
  const isAuthenticated = !!currentUser

  // Obtener información del usuario
  const userInfo = currentUser ? {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    emailVerified: currentUser.emailVerified,
    photoURL: currentUser.photoURL
  } : null

  const value = {
    // Estado
    currentUser,
    userInfo,
    loading,
    error,
    isAuthenticated,
    
    // Sistema de roles
    userProfile,
    userRole,
    roleInfo,
    loadingProfile,
    
    // Modal state
    showAuthModal,
    authMode,
    companyCode,
    companyCodeValidated,
    
    // Funciones de autenticación
    register,
    login,
    logout,
    resetPassword,
    validateCompanyCode: validateCompanyCodeHandler,
    
    // Funciones de roles y permisos
    checkPermission,
    canQuote,
    isUserAdmin,
    loadUserProfile,
    
    // Funciones de UI
    openAuthModal,
    closeAuthModal,
    setAuthMode,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Función para convertir errores de Firebase a mensajes amigables
function getErrorMessage(error) {
  switch (error.code) {
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.'
    case 'auth/user-not-found':
      return 'No existe una cuenta con este email.'
    case 'auth/wrong-password':
      return 'Contraseña incorrecta.'
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este email.'
    case 'auth/invalid-email':
      return 'El email no es válido.'
    case 'auth/operation-not-allowed':
      return 'Operación no permitida.'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.'
    case 'auth/missing-email':
      return 'Debes proporcionar un email.'
    case 'auth/invalid-credential':
      return 'Credenciales inválidas.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intenta más tarde.'
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet.'
    default:
      return error.message || 'Ha ocurrido un error inesperado.'
  }
}

export default AuthContext
