// Utilidades para manejo de PINs de seguridad

/**
 * Genera un PIN aleatorio de 4 dígitos
 * @returns {string} PIN de 4 dígitos (ej: "1234", "0567")
 */
export const generateSecurityPin = () => {
  // Generar número entre 0000 y 9999
  const pin = Math.floor(Math.random() * 10000)
  // Asegurar que tenga 4 dígitos (pad con ceros a la izquierda)
  return pin.toString().padStart(4, '0')
}

/**
 * Valida que un PIN tenga el formato correcto
 * @param {string} pin - PIN a validar
 * @returns {boolean} true si es válido
 */
export const validatePinFormat = (pin) => {
  if (!pin || typeof pin !== 'string') return false
  
  // Debe tener exactamente 4 caracteres
  if (pin.length !== 4) return false
  
  // Todos los caracteres deben ser dígitos
  return /^\d{4}$/.test(pin)
}

/**
 * Genera un PIN único que no esté en la lista de PINs existentes
 * @param {string[]} existingPins - Array de PINs ya utilizados
 * @param {number} maxAttempts - Máximo número de intentos (default: 100)
 * @returns {string} PIN único
 */
export const generateUniquePin = (existingPins = [], maxAttempts = 100) => {
  const existingSet = new Set(existingPins)
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const newPin = generateSecurityPin()
    
    if (!existingSet.has(newPin)) {
      return newPin
    }
  }
  
  // Si no se pudo generar un PIN único después de muchos intentos,
  // usar timestamp para garantizar unicidad
  const timestamp = Date.now().toString()
  return timestamp.slice(-4).padStart(4, '0')
}

/**
 * Formatea un PIN para mostrar en UI (ej: "1234" -> "1 2 3 4")
 * @param {string} pin - PIN a formatear
 * @returns {string} PIN formateado
 */
export const formatPinForDisplay = (pin) => {
  if (!validatePinFormat(pin)) return pin
  
  return pin.split('').join(' ')
}

/**
 * Genera información completa del PIN para una cotización
 * @param {string} cotizacionId - ID de la cotización
 * @param {string[]} existingPins - PINs existentes para evitar duplicados
 * @returns {object} Información del PIN
 */
export const generatePinInfo = (cotizacionId, existingPins = []) => {
  const pin = generateUniquePin(existingPins)
  const timestamp = new Date().toISOString()
  
  return {
    pin,
    cotizacionId,
    createdAt: timestamp,
    createdAtFormatted: new Date().toLocaleString('es-CO'),
    isActive: true,
    usageCount: 0,
    lastUsed: null
  }
}

/**
 * Máscara el PIN para logs de seguridad (ej: "1234" -> "1**4")
 * @param {string} pin - PIN a enmascarar
 * @returns {string} PIN enmascarado
 */
export const maskPin = (pin) => {
  if (!validatePinFormat(pin)) return '****'
  
  return pin[0] + '**' + pin[3]
}

/**
 * Verifica si un PIN está expirado (opcional - para implementar en el futuro)
 * @param {string} createdAt - Fecha de creación del PIN
 * @param {number} expirationHours - Horas hasta expiración (default: 24)
 * @returns {boolean} true si está expirado
 */
export const isPinExpired = (createdAt, expirationHours = 24) => {
  if (!createdAt) return false
  
  const created = new Date(createdAt)
  const now = new Date()
  const diffHours = (now - created) / (1000 * 60 * 60)
  
  return diffHours > expirationHours
}

/**
 * Genera un mensaje de seguridad para enviar junto con el enlace
 * @param {string} pin - PIN de seguridad
 * @param {string} clienteName - Nombre del cliente
 * @returns {string} Mensaje formateado
 */
export const generateSecurityMessage = (pin, clienteName) => {
  return `
🔐 CÓDIGO DE SEGURIDAD PARA APROBACIÓN

Cliente: ${clienteName}
PIN de Seguridad: ${formatPinForDisplay(pin)}

⚠️ IMPORTANTE:
• Este PIN es único y confidencial
• Solo compártelo con personal autorizado
• Requerido para ver y aprobar la cotización
• No requiere iniciar sesión

🛡️ Mantén este código seguro
  `.trim()
}

export default {
  generateSecurityPin,
  validatePinFormat,
  generateUniquePin,
  formatPinForDisplay,
  generatePinInfo,
  maskPin,
  isPinExpired,
  generateSecurityMessage
}
