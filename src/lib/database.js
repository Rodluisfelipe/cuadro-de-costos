import Dexie from 'dexie'

// Definir la base de datos para cotizaciones
export class CotizacionesDatabase extends Dexie {
  constructor() {
    super('CotizacionesDB')
    
    // Definir el esquema de la base de datos
    this.version(1).stores({
      cotizaciones: `
        ++id,
        cotizacion_id,
        clienteName,
        trmGlobal,
        rows,
        totalGeneral,
        date,
        dateFormatted,
        status,
        trmOficial,
        lastTrmUpdate,
        createdAt,
        updatedAt
      `,
      configuracion: `
        ++id,
        key,
        value,
        updatedAt
      `
    })

    // Hooks para timestamps automáticos
    this.cotizaciones.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date()
      obj.updatedAt = new Date()
    })

    this.cotizaciones.hook('updating', function (modifications, primKey, obj, trans) {
      modifications.updatedAt = new Date()
    })
  }
}

// Crear instancia de la base de datos
export const db = new CotizacionesDatabase()

// Funciones de utilidad para cotizaciones
export const cotizacionesDB = {
  // Crear una nueva cotización
  async create(cotizacion) {
    try {
      console.log('📊 [DB] Creando nueva cotización:', cotizacion.cotizacion_id)
      const id = await db.cotizaciones.add(cotizacion)
      console.log('✅ [DB] Cotización creada con ID:', id)
      return id
    } catch (error) {
      console.error('❌ [DB] Error creando cotización:', error)
      throw error
    }
  },

  // Obtener todas las cotizaciones
  async getAll() {
    try {
      console.log('📋 [DB] Obteniendo todas las cotizaciones...')
      const cotizaciones = await db.cotizaciones.orderBy('updatedAt').reverse().toArray()
      console.log(`✅ [DB] Se encontraron ${cotizaciones.length} cotizaciones`)
      return cotizaciones
    } catch (error) {
      console.error('❌ [DB] Error obteniendo cotizaciones:', error)
      throw error
    }
  },

  // Obtener cotización por ID interno
  async getById(id) {
    try {
      console.log('🔍 [DB] Buscando cotización por ID:', id)
      const cotizacion = await db.cotizaciones.get(id)
      if (cotizacion) {
        console.log('✅ [DB] Cotización encontrada:', cotizacion.cotizacion_id)
      } else {
        console.log('⚠️ [DB] Cotización no encontrada')
      }
      return cotizacion
    } catch (error) {
      console.error('❌ [DB] Error obteniendo cotización por ID:', error)
      throw error
    }
  },

  // Obtener cotización por cotizacion_id (ID generado por la app)
  async getByCotizacionId(cotizacionId) {
    try {
      console.log('🔍 [DB] Buscando cotización por cotizacion_id:', cotizacionId)
      const cotizacion = await db.cotizaciones.where('cotizacion_id').equals(cotizacionId).first()
      if (cotizacion) {
        console.log('✅ [DB] Cotización encontrada:', cotizacion.clienteName)
      } else {
        console.log('⚠️ [DB] Cotización no encontrada')
      }
      return cotizacion
    } catch (error) {
      console.error('❌ [DB] Error obteniendo cotización por cotizacion_id:', error)
      throw error
    }
  },

  // Actualizar cotización existente
  async update(id, changes) {
    try {
      console.log('📝 [DB] Actualizando cotización ID:', id)
      const updated = await db.cotizaciones.update(id, changes)
      if (updated) {
        console.log('✅ [DB] Cotización actualizada exitosamente')
      } else {
        console.log('⚠️ [DB] No se encontró la cotización para actualizar')
      }
      return updated
    } catch (error) {
      console.error('❌ [DB] Error actualizando cotización:', error)
      throw error
    }
  },

  // Eliminar cotización
  async delete(id) {
    try {
      console.log('🗑️ [DB] Eliminando cotización ID:', id)
      await db.cotizaciones.delete(id)
      console.log('✅ [DB] Cotización eliminada exitosamente')
    } catch (error) {
      console.error('❌ [DB] Error eliminando cotización:', error)
      throw error
    }
  },

  // Buscar cotizaciones por cliente
  async searchByClient(clienteName) {
    try {
      console.log('🔍 [DB] Buscando cotizaciones del cliente:', clienteName)
      const cotizaciones = await db.cotizaciones
        .where('clienteName')
        .startsWithIgnoreCase(clienteName)
        .reverse()
        .sortBy('updatedAt')
      console.log(`✅ [DB] Se encontraron ${cotizaciones.length} cotizaciones para ${clienteName}`)
      return cotizaciones
    } catch (error) {
      console.error('❌ [DB] Error buscando por cliente:', error)
      throw error
    }
  },

  // Obtener cotizaciones por estado
  async getByStatus(status) {
    try {
      console.log('📊 [DB] Obteniendo cotizaciones con estado:', status)
      const cotizaciones = await db.cotizaciones
        .where('status')
        .equals(status)
        .reverse()
        .sortBy('updatedAt')
      console.log(`✅ [DB] Se encontraron ${cotizaciones.length} cotizaciones con estado ${status}`)
      return cotizaciones
    } catch (error) {
      console.error('❌ [DB] Error obteniendo por estado:', error)
      throw error
    }
  },

  // Obtener estadísticas
  async getStats() {
    try {
      console.log('📈 [DB] Calculando estadísticas...')
      const total = await db.cotizaciones.count()
      const draft = await db.cotizaciones.where('status').equals('draft').count()
      const pending = await db.cotizaciones.where('status').equals('pending_approval').count()
      const approved = await db.cotizaciones.where('status').equals('approved').count()
      const denied = await db.cotizaciones.where('status').equals('denied').count()

      const stats = {
        total,
        draft,
        pending_approval: pending,
        approved,
        denied
      }

      console.log('✅ [DB] Estadísticas calculadas:', stats)
      return stats
    } catch (error) {
      console.error('❌ [DB] Error calculando estadísticas:', error)
      throw error
    }
  },

  // Limpiar base de datos (para desarrollo/testing)
  async clear() {
    try {
      console.log('🧹 [DB] Limpiando todas las cotizaciones...')
      await db.cotizaciones.clear()
      console.log('✅ [DB] Base de datos limpiada')
    } catch (error) {
      console.error('❌ [DB] Error limpiando base de datos:', error)
      throw error
    }
  }
}

// Funciones para configuración
export const configDB = {
  // Guardar configuración
  async set(key, value) {
    try {
      console.log(`⚙️ [DB] Guardando configuración ${key}:`, value)
      await db.configuracion.put({
        key,
        value: JSON.stringify(value),
        updatedAt: new Date()
      })
      console.log(`✅ [DB] Configuración ${key} guardada`)
    } catch (error) {
      console.error(`❌ [DB] Error guardando configuración ${key}:`, error)
      throw error
    }
  },

  // Obtener configuración
  async get(key, defaultValue = null) {
    try {
      console.log(`🔍 [DB] Obteniendo configuración ${key}...`)
      const config = await db.configuracion.where('key').equals(key).first()
      if (config) {
        const value = JSON.parse(config.value)
        console.log(`✅ [DB] Configuración ${key} encontrada:`, value)
        return value
      } else {
        console.log(`⚠️ [DB] Configuración ${key} no encontrada, usando valor por defecto`)
        return defaultValue
      }
    } catch (error) {
      console.error(`❌ [DB] Error obteniendo configuración ${key}:`, error)
      return defaultValue
    }
  },

  // Eliminar configuración
  async delete(key) {
    try {
      console.log(`🗑️ [DB] Eliminando configuración ${key}...`)
      await db.configuracion.where('key').equals(key).delete()
      console.log(`✅ [DB] Configuración ${key} eliminada`)
    } catch (error) {
      console.error(`❌ [DB] Error eliminando configuración ${key}:`, error)
      throw error
    }
  }
}

// Función para migrar datos de localStorage a IndexedDB
export async function migrateFromLocalStorage() {
  try {
    console.log('🔄 [DB] Iniciando migración desde localStorage...')
    
    // Verificar si ya se migró
    const migrated = await configDB.get('localStorage_migrated', false)
    if (migrated) {
      console.log('ℹ️ [DB] Migración ya realizada previamente')
      return
    }

    // Obtener datos de localStorage
    const oldData = localStorage.getItem('costos-quotes')
    if (!oldData) {
      console.log('ℹ️ [DB] No hay datos en localStorage para migrar')
      await configDB.set('localStorage_migrated', true)
      return
    }

    // Parsear y migrar datos
    const cotizaciones = JSON.parse(oldData)
    console.log(`📦 [DB] Migrando ${cotizaciones.length} cotizaciones...`)

    for (const cotizacion of cotizaciones) {
      // Asegurar que tenga cotizacion_id
      if (!cotizacion.cotizacion_id) {
        cotizacion.cotizacion_id = cotizacion.id
      }
      
      await cotizacionesDB.create(cotizacion)
    }

    // Marcar como migrado
    await configDB.set('localStorage_migrated', true)
    
    // Opcional: limpiar localStorage después de migrar
    // localStorage.removeItem('costos-quotes')
    
    console.log(`✅ [DB] Migración completada: ${cotizaciones.length} cotizaciones migradas`)
  } catch (error) {
    console.error('❌ [DB] Error en migración:', error)
    throw error
  }
}

// Inicializar la base de datos
export async function initializeDB() {
  try {
    console.log('🚀 [DB] Inicializando base de datos...')
    
    // Abrir la base de datos
    await db.open()
    console.log('✅ [DB] Base de datos abierta exitosamente')
    
    // Ejecutar migración si es necesario
    await migrateFromLocalStorage()
    
    console.log('🎉 [DB] Base de datos inicializada completamente')
    return true
  } catch (error) {
    console.error('❌ [DB] Error inicializando base de datos:', error)
    throw error
  }
}

export default db
