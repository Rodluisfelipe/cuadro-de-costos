// Sistema de roles y permisos de usuario para TECNOPHONE
export const USER_ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor', 
  COMPRADOR: 'comprador',
  REVISOR: 'revisor'
}

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    name: 'Administrador',
    description: 'Acceso completo al sistema, gestión de usuarios',
    permissions: [
      'manage_users',           // Crear, editar, eliminar usuarios
      'manage_providers',       // Gestionar proveedores
      'view_all_quotes',        // Ver todas las cotizaciones
      'manage_settings',        // Configuraciones del sistema
      'view_reports',           // Reportes y estadísticas
      'manage_roles'            // Asignar roles a usuarios
    ],
    canQuote: false,           // Los admins no cotizan
    color: '#dc2626',          // Rojo
    icon: '👑'
  },
  
  [USER_ROLES.VENDEDOR]: {
    name: 'Vendedor',
    description: 'Crear y gestionar cotizaciones, enviar para aprobación',
    permissions: [
      'create_quotes',          // Crear cotizaciones
      'edit_own_quotes',        // Editar sus propias cotizaciones
      'view_own_quotes',        // Ver sus cotizaciones
      'send_for_approval',      // Enviar cotizaciones para aprobación
      'duplicate_quotes',       // Duplicar cotizaciones
      'export_quotes',          // Exportar cotizaciones
      'manage_providers'        // Gestionar proveedores (limitado)
    ],
    canQuote: true,            // Los vendedores SÍ pueden cotizar
    color: '#059669',          // Verde
    icon: '💼'
  },
  
  [USER_ROLES.COMPRADOR]: {
    name: 'Comprador',
    description: 'Gestionar cotizaciones aprobadas, establecer precios finales de compra',
    permissions: [
      'view_approved_quotes',     // Ver cotizaciones aprobadas
      'set_final_purchase_price', // Establecer precio final de compra
      'view_margin_differences',  // Ver diferencias de margen
      'view_providers',           // Ver proveedores
      'create_purchase_orders',   // Crear órdenes de compra (futuro)
      'view_purchase_reports',    // Ver reportes de compras
      'export_purchase_data'      // Exportar datos de compras
    ],
    canQuote: false,             // Los compradores no cotizan
    color: '#0369a1',            // Azul
    icon: '🛒'
  },
  
  [USER_ROLES.REVISOR]: {
    name: 'Revisor',
    description: 'Aprobar o rechazar cotizaciones, solicitar revisiones',
    permissions: [
      'view_pending_quotes',    // Ver cotizaciones pendientes
      'approve_quotes',         // Aprobar cotizaciones
      'reject_quotes',          // Rechazar cotizaciones
      'request_revisions',      // Solicitar revisiones
      'view_all_quotes',        // Ver todas las cotizaciones
      'view_providers',         // Ver información de proveedores
      'view_reports'            // Ver reportes de aprobaciones
    ],
    canQuote: false,           // Los revisores no cotizan
    color: '#7c3aed',          // Púrpura
    icon: '✅'
  }
}

// Función para verificar si un usuario tiene un permiso específico
export const hasPermission = (userRole, permission) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false
  }
  
  return ROLE_PERMISSIONS[userRole].permissions.includes(permission)
}

// Función para verificar si un usuario puede realizar cotizaciones
export const canCreateQuotes = (userRole) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false
  }
  
  return ROLE_PERMISSIONS[userRole].canQuote
}

// Función para obtener información del rol
export const getRoleInfo = (userRole) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return {
      name: 'Sin rol',
      description: 'Usuario sin rol asignado',
      permissions: [],
      canQuote: false,
      color: '#6b7280',
      icon: '👤'
    }
  }
  
  return ROLE_PERMISSIONS[userRole]
}

// Función para obtener todos los roles disponibles
export const getAllRoles = () => {
  return Object.keys(ROLE_PERMISSIONS).map(roleKey => ({
    key: roleKey,
    ...ROLE_PERMISSIONS[roleKey]
  }))
}

// Función para verificar si un usuario es administrador
export const isAdmin = (userRole) => {
  return userRole === USER_ROLES.ADMIN
}

// Función para verificar si un usuario es vendedor
export const isVendedor = (userRole) => {
  return userRole === USER_ROLES.VENDEDOR
}

// Función para verificar si un usuario es comprador
export const isComprador = (userRole) => {
  return userRole === USER_ROLES.COMPRADOR
}

// Función para verificar si un usuario es revisor
export const isRevisor = (userRole) => {
  return userRole === USER_ROLES.REVISOR
}

// Validación de datos de usuario
export const validateUserData = (userData) => {
  const errors = []
  
  if (!userData.email || !userData.email.includes('@')) {
    errors.push('Email válido es requerido')
  }
  
  if (!userData.displayName || userData.displayName.trim().length < 2) {
    errors.push('Nombre debe tener al menos 2 caracteres')
  }
  
  if (!userData.role || !Object.values(USER_ROLES).includes(userData.role)) {
    errors.push('Rol válido es requerido')
  }
  
  if (!userData.companyId || userData.companyId !== 'TECNOPHONE') {
    errors.push('Usuario debe pertenecer a TECNOPHONE')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Función para crear estructura de usuario
export const createUserStructure = (userData, createdBy) => {
  const validation = validateUserData(userData)
  
  if (!validation.isValid) {
    throw new Error(`Datos de usuario inválidos: ${validation.errors.join(', ')}`)
  }
  
  return {
    email: userData.email.toLowerCase().trim(),
    displayName: userData.displayName.trim(),
    role: userData.role,
    companyId: 'TECNOPHONE',
    isActive: userData.isActive !== false, // Por defecto activo
    createdBy: createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    permissions: ROLE_PERMISSIONS[userData.role].permissions,
    metadata: {
      department: userData.department || null,
      phone: userData.phone || null,
      notes: userData.notes || null
    }
  }
}

export default {
  USER_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  canCreateQuotes,
  getRoleInfo,
  getAllRoles,
  isAdmin,
  isVendedor,
  isComprador,
  isRevisor,
  validateUserData,
  createUserStructure
}
