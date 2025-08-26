import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Mail, User, Shield, Building, Phone, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useAuth } from '../contexts/AuthContext'
import { userService } from '../lib/userService'
import { getAllRoles, getRoleInfo } from '../lib/userRoles'

const UserFormModal = ({ isOpen, onClose, user, onUserSaved }) => {
  const { userProfile, userInfo } = useAuth()
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'vendedor',
    department: '',
    phone: '',
    notes: '',
    isActive: true,
    createAuthAccount: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  // Cargar datos del usuario al editar
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        displayName: user.displayName || '',
        role: user.role || 'vendedor',
        department: user.metadata?.department || '',
        phone: user.metadata?.phone || '',
        notes: user.metadata?.notes || '',
        isActive: user.isActive !== false,
        createAuthAccount: false // Solo para nuevos usuarios
      })
    } else {
      // Resetear formulario para nuevo usuario
      setFormData({
        email: '',
        displayName: '',
        role: 'vendedor',
        department: '',
        phone: '',
        notes: '',
        isActive: true,
        createAuthAccount: true
      })
    }
    
    setError(null)
    setValidationErrors({})
  }, [user, isOpen])

  // Validar formulario
  const validateForm = () => {
    const errors = {}
    
    if (!formData.email.trim()) {
      errors.email = 'Email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email no válido'
    }
    
    if (!formData.displayName.trim()) {
      errors.displayName = 'Nombre es requerido'
    } else if (formData.displayName.trim().length < 2) {
      errors.displayName = 'Nombre debe tener al menos 2 caracteres'
    }
    
    if (!formData.role) {
      errors.role = 'Rol es requerido'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Manejar cambios en el formulario
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpiar error de validación del campo
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  // Guardar usuario
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      if (user) {
        // Actualizar usuario existente
        await userService.updateUser(user.id, {
          email: formData.email.toLowerCase().trim(),
          displayName: formData.displayName.trim(),
          role: formData.role,
          isActive: formData.isActive,
          metadata: {
            department: formData.department.trim() || null,
            phone: formData.phone.trim() || null,
            notes: formData.notes.trim() || null
          }
        }, { ...userInfo, role: userProfile?.role })
      } else {
        // Crear nuevo usuario
        await userService.createUser({
          email: formData.email.toLowerCase().trim(),
          displayName: formData.displayName.trim(),
          role: formData.role,
          companyId: 'TECNOPHONE',
          isActive: formData.isActive,
          department: formData.department.trim() || null,
          phone: formData.phone.trim() || null,
          notes: formData.notes.trim() || null,
          createAuthAccount: formData.createAuthAccount
        }, { ...userInfo, role: userProfile?.role })
      }
      
      onUserSaved()
      
    } catch (error) {
      console.error('Error guardando usuario:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const roles = getAllRoles()
  const selectedRoleInfo = getRoleInfo(formData.role)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-semibold">
                {user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error general */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Información Básica
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`pl-10 ${validationErrors.email ? 'border-red-300' : ''}`}
                        placeholder="usuario@tecnophone.com"
                        disabled={loading}
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <Input
                      value={formData.displayName}
                      onChange={(e) => handleChange('displayName', e.target.value)}
                      className={validationErrors.displayName ? 'border-red-300' : ''}
                      placeholder="Juan Pérez"
                      disabled={loading}
                    />
                    {validationErrors.displayName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.displayName}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rol y permisos */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Rol y Permisos
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol del Usuario *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roles.map((role) => (
                      <div
                        key={role.key}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          formData.role === role.key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleChange('role', role.key)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{role.icon}</span>
                            <span className="font-medium">{role.name}</span>
                          </div>
                          {formData.role === role.key && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Información del rol seleccionado */}
                {selectedRoleInfo && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Permisos del rol:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoleInfo.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Información adicional */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Información Adicional
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <Input
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      placeholder="Ventas, Compras, etc."
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="pl-10"
                        placeholder="+57 300 123 4567"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows="3"
                      placeholder="Notas adicionales sobre el usuario..."
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
              
              {/* Opciones */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Estado del Usuario
                    </label>
                    <p className="text-xs text-gray-500">
                      Los usuarios inactivos no pueden acceder al sistema
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {formData.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                </div>
                
                {!user && (
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Crear Cuenta de Autenticación
                      </label>
                      <p className="text-xs text-gray-500">
                        Crear cuenta en Firebase Auth y enviar email de configuración
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.createAuthAccount}
                        onChange={(e) => handleChange('createAuthAccount', e.target.checked)}
                        className="sr-only peer"
                        disabled={loading}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )}
              </div>
              
              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      {user ? 'Actualizar' : 'Crear'} Usuario
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default UserFormModal
