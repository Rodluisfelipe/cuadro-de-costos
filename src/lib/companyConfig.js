// Configuración de la empresa TECNOPHONE
export const COMPANY_CONFIG = {
  name: 'TECNOPHONE',
  displayName: 'TECNOPHONE',
  code: 'TECH2024', // Código de seguridad único para registro
  description: 'Sistema de Cotizaciones - TECNOPHONE',
  logo: '📱', // Emoji como logo temporal
  colors: {
    primary: '#3B82F6', // Blue
    secondary: '#8B5CF6', // Purple
    accent: '#10B981' // Green
  },
  settings: {
    requireEmailVerification: true,
    allowPasswordReset: true,
    maxUsersPerCompany: 50, // Límite de usuarios por empresa
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas en ms
  }
}

// Validar código de empresa
export const validateCompanyCode = (code) => {
  return code === COMPANY_CONFIG.code
}

// Generar código de empresa único (para futuras empresas)
export const generateCompanyCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Obtener información de la empresa
export const getCompanyInfo = () => {
  return {
    ...COMPANY_CONFIG,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

// Verificar si el email pertenece a la empresa (opcional)
export const isCompanyEmail = (email) => {
  if (!email) return false
  
  // Lista de dominios permitidos para TECNOPHONE
  const allowedDomains = [
    'tecnophone.com',
    'tecnophone.com.co',
    'tecnophone.co',
    // Agregar más dominios según sea necesario
  ]
  
  const domain = email.split('@')[1]?.toLowerCase()
  return allowedDomains.includes(domain)
}

// Mensajes de error específicos de la empresa
export const COMPANY_ERROR_MESSAGES = {
  invalidCode: '❌ Código de empresa inválido. Contacta a tu administrador.',
  emailNotAllowed: '❌ Este email no está autorizado para registrarse en TECNOPHONE.',
  companyFull: '❌ Se ha alcanzado el límite de usuarios para TECNOPHONE.',
  codeRequired: '🔐 Se requiere código de empresa para registrarse.',
  welcomeMessage: '👋 ¡Bienvenido a TECNOPHONE! Ingresa el código de seguridad para continuar.'
}

export default COMPANY_CONFIG
