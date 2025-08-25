import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Modal from './ui/modal'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { COMPANY_CONFIG, COMPANY_ERROR_MESSAGES } from '../lib/companyConfig'

const AuthModal = () => {
  const { 
    showAuthModal, 
    authMode, 
    closeAuthModal, 
    setAuthMode,
    register,
    login,
    resetPassword,
    error,
    loading,
    clearError,
    companyCodeValidated,
    validateCompanyCode
  } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    companyCode: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpiar errores al escribir
    if (error) {
      clearError()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (authMode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden')
        }
        
        // Validar código de empresa si no está validado
        if (!companyCodeValidated) {
          const isValid = validateCompanyCode(formData.companyCode)
          if (!isValid) {
            return // Error ya manejado en validateCompanyCode
          }
        }
        
        await register(formData.email, formData.password, formData.displayName)
      } else if (authMode === 'login') {
        await login(formData.email, formData.password)
      } else if (authMode === 'reset') {
        await resetPassword(formData.email)
      }
    } catch (error) {
      // Error ya manejado en el contexto
      console.error('Error en formulario:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      companyCode: ''
    })
    clearError()
  }

  const switchMode = (newMode) => {
    setAuthMode(newMode)
    resetForm()
  }

  const handleClose = () => {
    closeAuthModal()
    resetForm()
  }

  return (
    <Modal
      isOpen={showAuthModal}
      onClose={handleClose}
      title={
        authMode === 'login' ? '🔑 Iniciar Sesión' :
        authMode === 'register' ? '📝 Crear Cuenta' :
        '🔄 Restablecer Contraseña'
      }
      size="small"
    >
      <div className="p-6">
        {/* Mensajes de Error/Éxito */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            error.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
              : error.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
              : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
          }`}>
            {error.message}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código de Empresa (solo registro) */}
          {authMode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔐 Código de Empresa
              </label>
              <div className="relative">
                <Input
                  type="text"
                  name="companyCode"
                  value={formData.companyCode}
                  onChange={handleInputChange}
                  placeholder="Ingresa el código de TECNOPHONE"
                  required
                  className={`w-full pr-10 ${companyCodeValidated ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
                  disabled={companyCodeValidated}
                />
                {companyCodeValidated && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-green-500">✅</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Código único para personal de {COMPANY_CONFIG.displayName}
              </p>
            </div>
          )}

          {/* Nombre (solo registro) */}
          {authMode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre Completo
              </label>
              <Input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="Ej: Juan Pérez"
                required
                className="w-full"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="ejemplo@correo.com"
              required
              className="w-full"
            />
          </div>

          {/* Contraseña (no reset) */}
          {authMode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña
              </label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full"
              />
            </div>
          )}

          {/* Confirmar contraseña (solo registro) */}
          {authMode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar Contraseña
              </label>
              <Input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repite la contraseña"
                required
                minLength={6}
                className="w-full"
              />
            </div>
          )}

          {/* Botón Principal */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Procesando...
              </div>
            ) : (
              authMode === 'login' ? '🔑 Iniciar Sesión' :
              authMode === 'register' ? '📝 Crear Cuenta' :
              '📧 Enviar Email'
            )}
          </Button>
        </form>

        {/* Enlaces de Navegación */}
        <div className="mt-6 text-center space-y-2">
          {authMode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Regístrate aquí
                </button>
              </div>
            </>
          )}

          {authMode === 'register' && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Inicia sesión aquí
              </button>
            </div>
          )}

          {authMode === 'reset' && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              ¿Recordaste tu contraseña?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Inicia sesión aquí
              </button>
            </div>
          )}
        </div>

        {/* Términos y Condiciones (solo registro) */}
        {authMode === 'register' && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad.
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AuthModal
