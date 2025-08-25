import { useState, useEffect, useCallback } from 'react'
import { cotizacionesDB, initializeDB } from '../lib/database'
import { hybridDB } from '../lib/hybridDatabase'

export const useCotizaciones = () => {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [syncStats, setSyncStats] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Inicializar la base de datos
  useEffect(() => {
    const initDB = async () => {
      try {
        console.log('🚀 [Hook] Inicializando base de datos...')
        await initializeDB()
        setDbInitialized(true)
        console.log('✅ [Hook] Base de datos inicializada')
      } catch (error) {
        console.error('❌ [Hook] Error inicializando BD:', error)
        setError('Error inicializando la base de datos')
      }
    }

    initDB()
  }, [])

  // Cargar cotizaciones cuando la DB esté lista
  useEffect(() => {
    if (dbInitialized) {
      loadCotizaciones()
    }
  }, [dbInitialized])

  // Detectar cambios de conectividad
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('🌐 [Hook] Conectado - sincronizando...')
      loadCotizaciones() // Recargar con sincronización
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      console.log('📱 [Hook] Desconectado - modo offline')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Función para cargar todas las cotizaciones (híbrido)
  const loadCotizaciones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📋 [Hook] Cargando cotizaciones (híbrido)...')
      
      // Usar sistema híbrido (IndexedDB + Firebase)
      const allCotizaciones = await hybridDB.getAll()
      setCotizaciones(allCotizaciones)
      
      // Obtener estadísticas de sincronización
      const stats = await hybridDB.getSyncStats()
      setSyncStats(stats)
      
      console.log(`✅ [Hook] ${allCotizaciones.length} cotizaciones cargadas`)
      console.log(`📊 [Hook] Sync stats:`, stats)
    } catch (error) {
      console.error('❌ [Hook] Error cargando cotizaciones:', error)
      setError('Error cargando cotizaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  // Función para guardar cotización (crear o actualizar) - híbrido
  const saveCotizacion = useCallback(async (cotizacionData) => {
    try {
      setError(null)
      console.log('💾 [Hook] Guardando cotización (híbrido)...')

      let result
      if (cotizacionData.id) {
        // Actualizar cotización existente
        const { id, ...updateData } = cotizacionData
        result = await hybridDB.update(id, updateData)
        console.log('✅ [Hook] Cotización actualizada (híbrido)')
      } else {
        // Crear nueva cotización
        result = await hybridDB.create(cotizacionData)
        console.log('✅ [Hook] Nueva cotización creada (híbrido):', result)
      }

      // Recargar cotizaciones para actualizar el estado
      await loadCotizaciones()
      
      return result
    } catch (error) {
      console.error('❌ [Hook] Error guardando cotización:', error)
      setError('Error guardando cotización')
      throw error
    }
  }, [loadCotizaciones])

  // Función para eliminar cotización - híbrido
  const deleteCotizacion = useCallback(async (id) => {
    try {
      setError(null)
      console.log('🗑️ [Hook] Eliminando cotización (híbrido) ID:', id)
      
      await hybridDB.delete(id)
      
      // Recargar cotizaciones para actualizar el estado
      await loadCotizaciones()
      
      console.log('✅ [Hook] Cotización eliminada (híbrido)')
    } catch (error) {
      console.error('❌ [Hook] Error eliminando cotización:', error)
      setError('Error eliminando cotización')
      throw error
    }
  }, [loadCotizaciones])

  // Función para buscar cotización por ID de cotización - híbrido
  const getCotizacionById = useCallback(async (cotizacionId) => {
    try {
      setError(null)
      console.log('🔍 [Hook] Buscando cotización (híbrido):', cotizacionId)
      
      const cotizacion = await hybridDB.getByCotizacionId(cotizacionId)
      
      if (cotizacion) {
        console.log('✅ [Hook] Cotización encontrada (híbrido)')
      } else {
        console.log('⚠️ [Hook] Cotización no encontrada (híbrido)')
      }
      
      return cotizacion
    } catch (error) {
      console.error('❌ [Hook] Error buscando cotización:', error)
      setError('Error buscando cotización')
      throw error
    }
  }, [])

  // Función para buscar cotizaciones por cliente
  const searchByClient = useCallback(async (clienteName) => {
    try {
      setError(null)
      console.log('🔍 [Hook] Buscando cotizaciones del cliente:', clienteName)
      
      const results = await cotizacionesDB.searchByClient(clienteName)
      
      console.log(`✅ [Hook] ${results.length} cotizaciones encontradas`)
      return results
    } catch (error) {
      console.error('❌ [Hook] Error buscando por cliente:', error)
      setError('Error buscando por cliente')
      throw error
    }
  }, [])

  // Función para obtener cotizaciones por estado
  const getCotizacionesByStatus = useCallback(async (status) => {
    try {
      setError(null)
      console.log('📊 [Hook] Obteniendo cotizaciones con estado:', status)
      
      const results = await cotizacionesDB.getByStatus(status)
      
      console.log(`✅ [Hook] ${results.length} cotizaciones con estado ${status}`)
      return results
    } catch (error) {
      console.error('❌ [Hook] Error obteniendo por estado:', error)
      setError('Error obteniendo cotizaciones por estado')
      throw error
    }
  }, [])

  // Función para obtener estadísticas
  const getStats = useCallback(async () => {
    try {
      setError(null)
      console.log('📈 [Hook] Obteniendo estadísticas...')
      
      const stats = await cotizacionesDB.getStats()
      
      console.log('✅ [Hook] Estadísticas obtenidas:', stats)
      return stats
    } catch (error) {
      console.error('❌ [Hook] Error obteniendo estadísticas:', error)
      setError('Error obteniendo estadísticas')
      throw error
    }
  }, [])

  // Función para duplicar cotización - híbrido
  const duplicateCotizacion = useCallback(async (cotizacion) => {
    try {
      setError(null)
      console.log('📋 [Hook] Duplicando cotización (híbrido):', cotizacion.cotizacion_id)
      
      const newId = await hybridDB.duplicate(cotizacion)
      
      // Recargar cotizaciones
      await loadCotizaciones()
      
      console.log('✅ [Hook] Cotización duplicada (híbrido) con ID:', newId)
      return newId
    } catch (error) {
      console.error('❌ [Hook] Error duplicando cotización:', error)
      setError('Error duplicando cotización')
      throw error
    }
  }, [loadCotizaciones])

  // Función para limpiar todas las cotizaciones (para desarrollo)
  const clearAllCotizaciones = useCallback(async () => {
    try {
      setError(null)
      console.log('🧹 [Hook] Limpiando todas las cotizaciones...')
      
      await cotizacionesDB.clear()
      
      // Recargar cotizaciones (debería estar vacío)
      await loadCotizaciones()
      
      console.log('✅ [Hook] Todas las cotizaciones eliminadas')
    } catch (error) {
      console.error('❌ [Hook] Error limpiando cotizaciones:', error)
      setError('Error limpiando cotizaciones')
      throw error
    }
  }, [loadCotizaciones])

  // Función para refrescar cotizaciones manualmente
  const refreshCotizaciones = useCallback(() => {
    if (dbInitialized) {
      loadCotizaciones()
    }
  }, [dbInitialized, loadCotizaciones])

  // Función para forzar sincronización
  const forceSync = useCallback(async () => {
    try {
      setError(null)
      console.log('🔄 [Hook] Forzando sincronización...')
      
      await hybridDB.forcSync()
      await loadCotizaciones()
      
      console.log('✅ [Hook] Sincronización forzada completada')
    } catch (error) {
      console.error('❌ [Hook] Error en sincronización forzada:', error)
      setError('Error en sincronización: ' + error.message)
      throw error
    }
  }, [loadCotizaciones])

  // Función para obtener estadísticas de sincronización
  const getSyncStats = useCallback(async () => {
    try {
      const stats = await hybridDB.getSyncStats()
      setSyncStats(stats)
      return stats
    } catch (error) {
      console.error('❌ [Hook] Error obteniendo sync stats:', error)
      return null
    }
  }, [])

  return {
    // Estado
    cotizaciones,
    loading,
    error,
    dbInitialized,
    syncStats,
    isOnline,
    
    // Funciones principales
    saveCotizacion,
    deleteCotizacion,
    duplicateCotizacion,
    
    // Funciones de búsqueda
    getCotizacionById,
    searchByClient,
    getCotizacionesByStatus,
    
    // Funciones de utilidad
    getStats,
    refreshCotizaciones,
    clearAllCotizaciones, // Solo para desarrollo
    
    // Funciones de sincronización
    forceSync,
    getSyncStats,
    
    // Estado derivado
    totalCotizaciones: cotizaciones.length,
    hasCotizaciones: cotizaciones.length > 0
  }
}

export default useCotizaciones
