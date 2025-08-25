import { cotizacionesDB, configDB } from './database'
import { firebaseQuotesService, authService } from './firebase'

// Sistema híbrido que combina IndexedDB (offline) + Firebase (sincronización)
export class HybridDatabase {
  constructor() {
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    this.companyId = 'default' // Por ahora usar default, luego se puede personalizar
    
    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('🌐 Conectado - iniciando sincronización...')
      this.syncWithCloud()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('📱 Desconectado - usando solo IndexedDB')
    })
  }

  // Crear cotización (híbrido)
  async create(cotizacion) {
    try {
      console.log('💾 [Híbrido] Creando cotización...')
      
      // Agregar metadatos de usuario y empresa
      const currentUser = authService.getCurrentUser()
      const cotizacionData = {
        ...cotizacion,
        companyId: 'TECNOPHONE', // Empresa fija
        companyName: 'TECNOPHONE',
        createdBy: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || null,
        userName: currentUser?.displayName || null,
        syncStatus: this.isOnline ? 'synced' : 'pending',
        lastSyncAttempt: new Date().toISOString()
      }

      // SIEMPRE guardar en IndexedDB primero (funciona offline)
      const localId = await cotizacionesDB.create(cotizacionData)
      console.log('✅ [Híbrido] Guardado en IndexedDB:', localId)

      // Si estamos online, intentar sincronizar con Firebase
      if (this.isOnline) {
        try {
          const firebaseId = await firebaseQuotesService.create({
            ...cotizacionData,
            localId: localId // Referencia cruzada
          })
          
          // Actualizar en IndexedDB con el ID de Firebase
          await cotizacionesDB.update(localId, { 
            firebaseId: firebaseId,
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          })
          
          console.log('🔥 [Híbrido] Sincronizado con Firebase:', firebaseId)
        } catch (firebaseError) {
          console.warn('⚠️ [Híbrido] Error sincronizando con Firebase:', firebaseError)
          // Marcar como pendiente de sincronización
          await cotizacionesDB.update(localId, { 
            syncStatus: 'pending',
            syncError: firebaseError.message 
          })
        }
      }

      return localId
    } catch (error) {
      console.error('❌ [Híbrido] Error creando cotización:', error)
      throw error
    }
  }

  // Obtener todas las cotizaciones
  async getAll() {
    try {
      console.log('📋 [Híbrido] Obteniendo cotizaciones...')
      
      // Siempre obtener de IndexedDB (más rápido, funciona offline)
      let localQuotes = await cotizacionesDB.getAll()
      
      // Si estamos online, sincronizar con Firebase
      if (this.isOnline && !this.syncInProgress) {
        try {
          await this.syncWithCloud()
          // Volver a obtener después de sincronizar
          localQuotes = await cotizacionesDB.getAll()
        } catch (error) {
          console.warn('⚠️ [Híbrido] Error en sincronización automática:', error)
        }
      }
      
      console.log(`✅ [Híbrido] ${localQuotes.length} cotizaciones obtenidas`)
      return localQuotes
    } catch (error) {
      console.error('❌ [Híbrido] Error obteniendo cotizaciones:', error)
      throw error
    }
  }

  // Obtener cotización por ID
  async getByCotizacionId(cotizacionId) {
    try {
      console.log('🔍 [Híbrido] Buscando cotización:', cotizacionId)
      
      // Buscar primero en IndexedDB
      let quote = await cotizacionesDB.getByCotizacionId(cotizacionId)
      
      // Si no está local y estamos online, buscar en Firebase
      if (!quote && this.isOnline) {
        try {
          console.log('🔍 [Híbrido] Buscando en Firebase...')
          const firebaseQuote = await firebaseQuotesService.getByCotizacionId(cotizacionId, this.companyId)
          
          if (firebaseQuote) {
            // Guardar en IndexedDB para próxima vez
            const localId = await cotizacionesDB.create({
              ...firebaseQuote,
              syncStatus: 'synced',
              lastSyncAt: new Date().toISOString()
            })
            
            quote = await cotizacionesDB.getById(localId)
            console.log('📥 [Híbrido] Cotización descargada de Firebase y guardada localmente')
          }
        } catch (error) {
          console.warn('⚠️ [Híbrido] Error buscando en Firebase:', error)
        }
      }
      
      return quote
    } catch (error) {
      console.error('❌ [Híbrido] Error buscando cotización:', error)
      throw error
    }
  }

  // Actualizar cotización
  async update(id, changes) {
    try {
      console.log('📝 [Híbrido] Actualizando cotización:', id)
      
      // Siempre actualizar en IndexedDB
      const updated = await cotizacionesDB.update(id, {
        ...changes,
        syncStatus: this.isOnline ? 'synced' : 'pending',
        lastSyncAttempt: new Date().toISOString()
      })

      // Si estamos online y tiene firebaseId, actualizar en Firebase
      if (this.isOnline && updated) {
        try {
          const quote = await cotizacionesDB.getById(id)
          if (quote?.firebaseId) {
            await firebaseQuotesService.update(quote.firebaseId, changes)
            
            // Marcar como sincronizado
            await cotizacionesDB.update(id, { 
              syncStatus: 'synced',
              lastSyncAt: new Date().toISOString()
            })
            
            console.log('🔥 [Híbrido] Actualizado en Firebase')
          }
        } catch (firebaseError) {
          console.warn('⚠️ [Híbrido] Error actualizando en Firebase:', firebaseError)
          await cotizacionesDB.update(id, { 
            syncStatus: 'pending',
            syncError: firebaseError.message 
          })
        }
      }

      return updated
    } catch (error) {
      console.error('❌ [Híbrido] Error actualizando cotización:', error)
      throw error
    }
  }

  // Eliminar cotización
  async delete(id) {
    try {
      console.log('🗑️ [Híbrido] Eliminando cotización:', id)
      
      // Obtener la cotización para el firebaseId
      const quote = await cotizacionesDB.getById(id)
      
      // Eliminar de IndexedDB
      await cotizacionesDB.delete(id)
      
      // Si estamos online y tiene firebaseId, eliminar de Firebase
      if (this.isOnline && quote?.firebaseId) {
        try {
          await firebaseQuotesService.delete(quote.firebaseId)
          console.log('🔥 [Híbrido] Eliminado de Firebase')
        } catch (firebaseError) {
          console.warn('⚠️ [Híbrido] Error eliminando de Firebase:', firebaseError)
          // La eliminación local ya se hizo, esto es solo un warning
        }
      }
      
      console.log('✅ [Híbrido] Cotización eliminada')
    } catch (error) {
      console.error('❌ [Híbrido] Error eliminando cotización:', error)
      throw error
    }
  }

  // Duplicar cotización
  async duplicate(quote) {
    const duplicated = {
      ...quote,
      id: undefined, // Remover ID local
      firebaseId: undefined, // Remover ID de Firebase
      cotizacion_id: `COT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
      clienteName: `${quote.clienteName} (Copia)`,
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('es-CO'),
      status: 'draft',
      syncStatus: 'pending'
    }
    
    return await this.create(duplicated)
  }

  // Sincronización completa con Firebase
  async syncWithCloud() {
    if (!this.isOnline || this.syncInProgress) {
      console.log('⚠️ [Híbrido] Sincronización cancelada (offline o en progreso)')
      return
    }

    this.syncInProgress = true
    console.log('🔄 [Híbrido] Iniciando sincronización completa...')

    try {
      // 1. Subir cotizaciones pendientes a Firebase
      await this.uploadPendingQuotes()
      
      // 2. Descargar cotizaciones nuevas de Firebase
      await this.downloadNewQuotes()
      
      // 3. Marcar última sincronización
      await configDB.set('lastSyncAt', new Date().toISOString())
      
      console.log('✅ [Híbrido] Sincronización completada')
    } catch (error) {
      console.error('❌ [Híbrido] Error en sincronización:', error)
      throw error
    } finally {
      this.syncInProgress = false
    }
  }

  // Subir cotizaciones pendientes
  async uploadPendingQuotes() {
    try {
      console.log('📤 [Híbrido] Subiendo cotizaciones pendientes...')
      
      const allQuotes = await cotizacionesDB.getAll()
      const pendingQuotes = allQuotes.filter(q => q.syncStatus === 'pending' && !q.firebaseId)
      
      console.log(`📤 [Híbrido] ${pendingQuotes.length} cotizaciones pendientes de subir`)
      
      for (const quote of pendingQuotes) {
        try {
          const firebaseId = await firebaseQuotesService.create({
            ...quote,
            localId: quote.id
          })
          
          await cotizacionesDB.update(quote.id, {
            firebaseId: firebaseId,
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          })
          
          console.log(`✅ [Híbrido] Subido: ${quote.cotizacion_id}`)
        } catch (error) {
          console.error(`❌ [Híbrido] Error subiendo ${quote.cotizacion_id}:`, error)
          await cotizacionesDB.update(quote.id, {
            syncError: error.message
          })
        }
      }
    } catch (error) {
      console.error('❌ [Híbrido] Error en subida:', error)
    }
  }

  // Descargar cotizaciones nuevas
  async downloadNewQuotes() {
    try {
      console.log('📥 [Híbrido] Descargando cotizaciones nuevas...')
      
      const firebaseQuotes = await firebaseQuotesService.getAll(this.companyId)
      const localQuotes = await cotizacionesDB.getAll()
      
      // Crear mapa de cotizaciones locales por firebaseId
      const localFirebaseIds = new Set(
        localQuotes
          .filter(q => q.firebaseId)
          .map(q => q.firebaseId)
      )
      
      // Encontrar cotizaciones que no están localmente
      const newQuotes = firebaseQuotes.filter(fq => !localFirebaseIds.has(fq.firebaseId))
      
      console.log(`📥 [Híbrido] ${newQuotes.length} cotizaciones nuevas para descargar`)
      
      for (const quote of newQuotes) {
        try {
          await cotizacionesDB.create({
            ...quote,
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          })
          
          console.log(`✅ [Híbrido] Descargado: ${quote.cotizacion_id}`)
        } catch (error) {
          console.error(`❌ [Híbrido] Error descargando ${quote.cotizacion_id}:`, error)
        }
      }
    } catch (error) {
      console.error('❌ [Híbrido] Error en descarga:', error)
    }
  }

  // Obtener estadísticas de sincronización
  async getSyncStats() {
    try {
      const allQuotes = await cotizacionesDB.getAll()
      const stats = {
        total: allQuotes.length,
        synced: allQuotes.filter(q => q.syncStatus === 'synced').length,
        pending: allQuotes.filter(q => q.syncStatus === 'pending').length,
        errors: allQuotes.filter(q => q.syncError).length,
        lastSync: await configDB.get('lastSyncAt', null),
        isOnline: this.isOnline
      }
      
      return stats
    } catch (error) {
      console.error('❌ [Híbrido] Error obteniendo stats:', error)
      return { total: 0, synced: 0, pending: 0, errors: 0, lastSync: null, isOnline: false }
    }
  }

  // Forzar sincronización manual
  async forcSync() {
    if (!this.isOnline) {
      throw new Error('No hay conexión a internet')
    }
    
    console.log('🔄 [Híbrido] Sincronización forzada iniciada...')
    await this.syncWithCloud()
  }
}

// Instancia global del sistema híbrido
export const hybridDB = new HybridDatabase()

export default hybridDB
