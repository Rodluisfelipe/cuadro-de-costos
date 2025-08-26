// Script de debug para inspeccionar cotizaciones en IndexedDB
// Ejecutar en la consola del navegador

console.log('🔍 Iniciando debug de cotizaciones...')

// Función para abrir IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CotizacionesDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('cotizaciones')) {
        db.createObjectStore('cotizaciones', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Función para obtener todas las cotizaciones
const getAllCotizaciones = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction(['cotizaciones'], 'readonly')
    const store = transaction.objectStore('cotizaciones')
    const request = store.getAll()
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('❌ Error abriendo DB:', error)
    return []
  }
}

// Función principal de debug
const debugCotizaciones = async () => {
  console.log('📋 Obteniendo todas las cotizaciones...')
  
  const cotizaciones = await getAllCotizaciones()
  console.log(`✅ Total de cotizaciones en DB: ${cotizaciones.length}`)
  
  if (cotizaciones.length === 0) {
    console.log('⚠️ No hay cotizaciones en la base de datos')
    return
  }
  
  // Agrupar por estado
  const porEstado = {}
  cotizaciones.forEach(quote => {
    const status = quote.status || 'sin_estado'
    if (!porEstado[status]) {
      porEstado[status] = []
    }
    porEstado[status].push(quote)
  })
  
  console.log('📊 Cotizaciones por estado:')
  Object.entries(porEstado).forEach(([status, quotes]) => {
    console.log(`  ${status}: ${quotes.length} cotizaciones`)
  })
  
  // Mostrar detalles de las cotizaciones pendientes de aprobación
  const pendientes = cotizaciones.filter(q => 
    q.status === 'pending' || 
    q.status === 'sent_for_approval' || 
    q.status === 'pending_approval'
  )
  
  console.log(`\n🔍 Cotizaciones pendientes de aprobación: ${pendientes.length}`)
  
  pendientes.forEach((quote, index) => {
    console.log(`\n📋 Cotización ${index + 1}:`)
    console.log(`  ID: ${quote.id}`)
    console.log(`  Cotización ID: ${quote.cotizacion_id}`)
    console.log(`  Cliente: ${quote.clienteName}`)
    console.log(`  Estado: ${quote.status}`)
    console.log(`  Fecha: ${quote.dateFormatted || quote.date}`)
    console.log(`  Total: $${quote.totalGeneral || 0}`)
    console.log(`  Items: ${quote.rows?.length || 0}`)
    console.log(`  Vendedor: ${quote.vendorName || 'N/A'}`)
    console.log(`  Sync Status: ${quote.syncStatus || 'N/A'}`)
    
    if (quote.rows && quote.rows.length > 0) {
      console.log(`  Detalles de items:`)
      quote.rows.forEach((row, rowIndex) => {
        console.log(`    Item ${rowIndex + 1}: ${row.itemName || 'Sin nombre'} - $${row.pvpTotal || 0}`)
      })
    } else {
      console.log(`  ⚠️ No hay items en esta cotización`)
    }
  })
  
  // Mostrar todas las cotizaciones con sus estados
  console.log('\n📋 Todas las cotizaciones:')
  cotizaciones.forEach((quote, index) => {
    console.log(`${index + 1}. ID: ${quote.id}, Cliente: ${quote.clienteName}, Estado: ${quote.status}, Items: ${quote.rows?.length || 0}`)
  })
}

// Ejecutar debug
debugCotizaciones().catch(console.error)

// Función para crear una cotización de prueba
const crearCotizacionPrueba = async () => {
  console.log('🧪 Creando cotización de prueba...')
  
  try {
    const db = await openDB()
    const transaction = db.transaction(['cotizaciones'], 'readwrite')
    const store = transaction.objectStore('cotizaciones')
    
    const cotizacionPrueba = {
      cotizacion_id: 'TEST_' + Date.now(),
      clienteName: 'Cliente de Prueba',
      status: 'pending_approval',
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('es-CO'),
      totalGeneral: 1500000,
      trmGlobal: 4200,
      vendorName: 'Vendedor de Prueba',
      vendorEmail: 'vendedor@test.com',
      rows: [
        {
          itemName: 'Laptop HP Pavilion',
          mayorista: 'HP Colombia',
          marca: 'HP',
          referencia: 'HP-PAV-001',
          configuracion: 'Intel i5, 8GB RAM, 256GB SSD',
          costoUSD: 500,
          costoCOP: 2100000,
          pvpTotal: 1500000,
          cantidad: 1,
          pvpUnitario: 1500000,
          itemId: 'LAPTOP-001',
          itemDescription: 'Laptop para oficina'
        }
      ],
      syncStatus: 'synced',
      lastSyncAt: new Date().toISOString()
    }
    
    const request = store.add(cotizacionPrueba)
    
    request.onsuccess = () => {
      console.log('✅ Cotización de prueba creada con ID:', request.result)
      // Recargar la página para ver los cambios
      setTimeout(() => {
        console.log('🔄 Recargando página...')
        window.location.reload()
      }, 1000)
    }
    
    request.onerror = () => {
      console.error('❌ Error creando cotización de prueba:', request.error)
    }
    
  } catch (error) {
    console.error('❌ Error en crearCotizacionPrueba:', error)
  }
}

// Función para limpiar todas las cotizaciones
const limpiarCotizaciones = async () => {
  console.log('🗑️ Limpiando todas las cotizaciones...')
  
  try {
    const db = await openDB()
    const transaction = db.transaction(['cotizaciones'], 'readwrite')
    const store = transaction.objectStore('cotizaciones')
    
    const request = store.clear()
    
    request.onsuccess = () => {
      console.log('✅ Todas las cotizaciones eliminadas')
      setTimeout(() => {
        console.log('🔄 Recargando página...')
        window.location.reload()
      }, 1000)
    }
    
    request.onerror = () => {
      console.error('❌ Error limpiando cotizaciones:', request.error)
    }
    
  } catch (error) {
    console.error('❌ Error en limpiarCotizaciones:', error)
  }
}

// Exponer funciones globalmente
window.debugCotizaciones = debugCotizaciones
window.crearCotizacionPrueba = crearCotizacionPrueba
window.limpiarCotizaciones = limpiarCotizaciones

console.log('🔧 Funciones disponibles:')
console.log('  debugCotizaciones() - Ver todas las cotizaciones')
console.log('  crearCotizacionPrueba() - Crear cotización de prueba')
console.log('  limpiarCotizaciones() - Eliminar todas las cotizaciones')
