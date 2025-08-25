import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { COMPANY_CONFIG } from '../lib/companyConfig'

const ProtectedRoute = ({ children, fallback = null }) => {
  const { isAuthenticated, loading, openAuthModal } = useAuth()

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            🔐 Verificando autenticación...
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Por favor espera un momento
          </p>
        </div>
      </div>
    )
  }

  // Si está autenticado, mostrar el contenido
  if (isAuthenticated) {
    return children
  }

  // Si hay un fallback personalizado, mostrarlo
  if (fallback) {
    return fallback
  }

  // Si no está autenticado, mostrar pantalla de bienvenida
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
          {/* Logo/Icono */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto flex items-center justify-center text-2xl">
              {COMPANY_CONFIG.logo}
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {COMPANY_CONFIG.displayName}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Sistema de Cotizaciones
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {COMPANY_CONFIG.description}
          </p>

          {/* Características */}
          <div className="text-left mb-6 space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="text-green-500 mr-2">✅</span>
              Sincronización en la nube
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="text-green-500 mr-2">✅</span>
              Acceso desde cualquier dispositivo
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="text-green-500 mr-2">✅</span>
              Funciona sin internet
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="text-green-500 mr-2">✅</span>
              Sistema de aprobaciones
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="text-blue-500 mr-2">🔐</span>
              Acceso exclusivo para personal de {COMPANY_CONFIG.displayName}
            </div>
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              🔑 Iniciar Sesión
            </button>
            
            <button
              onClick={() => openAuthModal('register')}
              className="w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
            >
              📝 Crear Cuenta
            </button>
          </div>

          {/* Información adicional */}
          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-1">🔒 Tus datos están protegidos</p>
            <p>🌐 Sincronización automática</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProtectedRoute
