// ========================================
// SCRIPT DE DEBUG PARA FLUJO DE APROBACIÓN
// ========================================
// Ejecutar en la consola del navegador

console.log('🔧 Script de debug para flujo de aprobación cargado')

// Función para verificar estado de la base de datos
function verificarBaseDatos() {
  console.log('🔍 Verificando estado de la base de datos...')
  
  return new Promise((resolve) => {
    const db = indexedDB.open('CotizacionesDB', 1)
    
    db.onsuccess = function(event) {
      const database = event.target.result
      const transaction = database.transaction(['cotizaciones'], 'readonly')
      const store = transaction.objectStore('cotizaciones')
      const request = store.getAll()
      
      request.onsuccess = function() {
        const cotizacionesDB = request.result
        console.log('📊 [IndexedDB] Total de cotizaciones:', cotizacionesDB.length)
        
        // Agrupar por estado
        const porEstado = cotizacionesDB.reduce((acc, quote) => {
          const status = quote.status || 'sin_estado'
          if (!acc[status]) acc[status] = []
          acc[status].push(quote)
          return acc
        }, {})
        
        console.log('📊 [IndexedDB] Cotizaciones por estado:', porEstado)
        
        // Mostrar detalles de cotizaciones pendientes
        if (porEstado.pending_approval && porEstado.pending_approval.length > 0) {
          console.log('⏳ [IndexedDB] Cotizaciones pendientes de aprobación:')
          porEstado.pending_approval.forEach((quote, index) => {
            console.log(`  ${index + 1}. ID: ${quote.cotizacion_id}, Cliente: ${quote.clienteName}, Total: $${quote.totalGeneral?.toLocaleString()}`)
          })
        }
        
        // Mostrar detalles de cotizaciones aprobadas
        if (porEstado.approved && porEstado.approved.length > 0) {
          console.log('✅ [IndexedDB] Cotizaciones aprobadas:')
          porEstado.approved.forEach((quote, index) => {
            console.log(`  ${index + 1}. ID: ${quote.cotizacion_id}, Cliente: ${quote.clienteName}, Total: $${quote.totalGeneral?.toLocaleString()}`)
          })
        }
        
        resolve({
          total: cotizacionesDB.length,
          porEstado,
          cotizaciones: cotizacionesDB
        })
      }
    }
  })
}

// Función para crear cotización de prueba
function crearCotizacionPrueba() {
  console.log('🧪 Creando cotización de prueba...')
  
  const testQuote = {
    cotizacion_id: `TEST-${Date.now()}`,
    clienteName: 'Cliente de Prueba',
    vendorName: 'Vendedor de Prueba',
    vendorEmail: 'vendedor@test.com',
    status: 'pending_approval',
    totalGeneral: 1500000,
    trmGlobal: 4200,
    date: new Date().toISOString(),
    dateFormatted: new Date().toLocaleString('es-CO'),
    rows: [
      {
        id: 1,
        itemName: 'Laptop HP',
        itemDescription: 'Laptop HP Pavilion',
        mayorista: 'Distribuidor A',
        marca: 'HP',
        referencia: 'Pavilion 15',
        configuracion: 'Intel i5, 8GB RAM, 256GB SSD',
        cantidad: 1,
        costoUSD: 500,
        costoCOP: 2100000,
        pvpUnitario: 1500000,
        pvpTotal: 1500000,
        margen: 30,
        trm: 4200
      }
    ],
    notes: 'Cotización de prueba para el panel de revisor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // Guardar en IndexedDB directamente
  const db = indexedDB.open('CotizacionesDB', 1)
  db.onsuccess = function(event) {
    const database = event.target.result
    const transaction = database.transaction(['cotizaciones'], 'readwrite')
    const store = transaction.objectStore('cotizaciones')
    const request = store.add(testQuote)
    
    request.onsuccess = function() {
      console.log('✅ Cotización de prueba creada con ID:', request.result)
      verificarBaseDatos()
    }
    
    request.onerror = function() {
      console.error('❌ Error creando cotización de prueba:', request.error)
    }
  }
}

// Función para simular cambio de estado
function simularCambioEstado(cotizacionId, nuevoEstado) {
  console.log(`🔄 Simulando cambio de estado: ${cotizacionId} -> ${nuevoEstado}`)
  
  const db = indexedDB.open('CotizacionesDB', 1)
  db.onsuccess = function(event) {
    const database = event.target.result
    const transaction = database.transaction(['cotizaciones'], 'readwrite')
    const store = transaction.objectStore('cotizaciones')
    
    // Buscar la cotización por cotizacion_id
    const index = store.index('cotizacion_id')
    const request = index.get(cotizacionId)
    
    request.onsuccess = function() {
      const quote = request.result
      if (quote) {
        // Actualizar estado
        quote.status = nuevoEstado
        quote.updatedAt = new Date().toISOString()
        
        if (nuevoEstado === 'approved') {
          quote.approvalDate = new Date().toISOString()
          quote.approvalDateFormatted = new Date().toLocaleString('es-CO')
        }
        
        // Guardar cambios
        const updateRequest = store.put(quote)
        updateRequest.onsuccess = function() {
          console.log(`✅ Estado actualizado: ${cotizacionId} -> ${nuevoEstado}`)
          verificarBaseDatos()
        }
      } else {
        console.error('❌ Cotización no encontrada:', cotizacionId)
      }
    }
  }
}

// Función para limpiar cotizaciones de prueba
function limpiarCotizacionesPrueba() {
  console.log('🧹 Limpiando cotizaciones de prueba...')
  
  const db = indexedDB.open('CotizacionesDB', 1)
  db.onsuccess = function(event) {
    const database = event.target.result
    const transaction = database.transaction(['cotizaciones'], 'readwrite')
    const store = transaction.objectStore('cotizaciones')
    const request = store.getAll()
    
    request.onsuccess = function() {
      const cotizaciones = request.result
      const cotizacionesPrueba = cotizaciones.filter(q => 
        q.cotizacion_id.startsWith('TEST-') || 
        q.clienteName === 'Cliente de Prueba'
      )
      
      console.log(`🗑️ Eliminando ${cotizacionesPrueba.length} cotizaciones de prueba...`)
      
      cotizacionesPrueba.forEach(quote => {
        store.delete(quote.id)
      })
      
      console.log('✅ Cotizaciones de prueba eliminadas')
      verificarBaseDatos()
    }
  }
}

// Función para verificar sincronización
function verificarSincronizacion() {
  console.log('🔄 Verificando estado de sincronización...')
  
  // Verificar si hay conexión a internet
  console.log('🌐 Estado de conexión:', navigator.onLine ? 'Online' : 'Offline')
  
  // Verificar si Firebase está disponible
  if (window.firebase) {
    console.log('🔥 Firebase disponible')
  } else {
    console.log('❌ Firebase no disponible')
  }
  
  // Verificar eventos personalizados
  console.log('🔔 Verificando eventos personalizados...')
  const testEvent = new CustomEvent('testEvent', { detail: 'test' })
  window.dispatchEvent(testEvent)
  console.log('✅ Eventos personalizados funcionando')
}

// Función para forzar refresco de componentes
function forzarRefrescoComponentes() {
  console.log('🔄 Forzando refresco de componentes...')
  
  // Emitir evento de cambio de estado
  window.dispatchEvent(new CustomEvent('cotizacionStatusChanged', {
    detail: {
      cotizacionId: 'FORCED-REFRESH',
      newStatus: 'forced_refresh',
      timestamp: Date.now()
    }
  }))
  
  console.log('✅ Evento de refresco emitido')
}

// Función para mostrar resumen completo
function mostrarResumenCompleto() {
  console.log('📊 ===== RESUMEN COMPLETO DEL SISTEMA =====')
  
  verificarBaseDatos().then((resultado) => {
    console.log('📊 Resumen de la base de datos:', resultado)
    
    // Verificar sincronización
    verificarSincronizacion()
    
    // Verificar componentes React
    console.log('⚛️ Verificando componentes React...')
    
    // Buscar elementos del DOM
    const revisorPanel = document.querySelector('[data-testid="revisor-panel"]') || document.querySelector('.revisor-panel')
    const costosTable = document.querySelector('[data-testid="costos-table"]') || document.querySelector('.costos-table')
    
    console.log('🔍 Panel de Revisor encontrado:', !!revisorPanel)
    console.log('🔍 CostosTable encontrado:', !!costosTable)
    
    console.log('📊 ===== FIN DEL RESUMEN =====')
  })
}

// Agregar funciones al objeto global para fácil acceso
window.debugAprobacion = {
  verificarBaseDatos,
  crearCotizacionPrueba,
  simularCambioEstado,
  limpiarCotizacionesPrueba,
  verificarSincronizacion,
  forzarRefrescoComponentes,
  mostrarResumenCompleto
}

console.log('🔧 Funciones de debug disponibles en window.debugAprobacion')
console.log('💡 Usa: debugAprobacion.mostrarResumenCompleto() para ver todo el estado')
