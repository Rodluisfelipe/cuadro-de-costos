// Script de debug para verificar el flujo de aprobación completo
// Ejecutar en la consola del navegador

console.log('🔍 Iniciando debug del flujo de aprobación...')

// Función para verificar el estado actual del sistema
const debugFlujoAprobacion = async () => {
  console.log('📊 === ESTADO ACTUAL DEL SISTEMA ===')
  
  // 1. Verificar IndexedDB
  console.log('\n🔍 1. Verificando IndexedDB...')
  try {
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
        const porEstado = {}
        cotizacionesDB.forEach(quote => {
          const status = quote.status || 'sin_estado'
          if (!porEstado[status]) {
            porEstado[status] = []
          }
          porEstado[status].push(quote)
        })
        
        console.log('📊 [IndexedDB] Cotizaciones por estado:')
        Object.entries(porEstado).forEach(([status, quotes]) => {
          console.log(`  ${status}: ${quotes.length} cotizaciones`)
        })
        
        // Mostrar cotizaciones pendientes de aprobación
        const pendingQuotes = cotizacionesDB.filter(q => 
          q.status === 'pending' || q.status === 'sent_for_approval' || q.status === 'pending_approval'
        )
        
        console.log(`\n🔍 [IndexedDB] Cotizaciones pendientes de aprobación: ${pendingQuotes.length}`)
        pendingQuotes.forEach((quote, index) => {
          console.log(`  ${index + 1}. ID: ${quote.id}, Cliente: ${quote.clienteName}, Estado: ${quote.status}, Items: ${quote.rows?.length || 0}`)
        })
        
        // Continuar con la verificación del hook
        verificarHook(cotizacionesDB)
      }
    }
  } catch (error) {
    console.error('❌ Error verificando IndexedDB:', error)
  }
}

// Función para verificar el hook useCotizaciones
const verificarHook = (cotizacionesDB) => {
  console.log('\n🔍 2. Verificando hook useCotizaciones...')
  
  // Verificar si el hook está disponible en el componente RevisorPanel
  if (window.RevisorPanelDebug) {
    console.log('✅ Hook disponible en RevisorPanel')
    console.log('📊 Cotizaciones del hook:', window.RevisorPanelDebug.cotizaciones)
    console.log('📊 Loading del hook:', window.RevisorPanelDebug.loading)
  } else {
    console.log('⚠️ Hook no disponible en RevisorPanel')
  }
  
  // Verificar si hay diferencias entre IndexedDB y el hook
  if (window.RevisorPanelDebug && window.RevisorPanelDebug.cotizaciones) {
    const hookCotizaciones = window.RevisorPanelDebug.cotizaciones
    console.log(`\n🔍 Comparando IndexedDB (${cotizacionesDB.length}) vs Hook (${hookCotizaciones.length})`)
    
    if (cotizacionesDB.length !== hookCotizaciones.length) {
      console.log('⚠️ Diferencia en cantidad de cotizaciones')
      console.log('  IndexedDB:', cotizacionesDB.length)
      console.log('  Hook:', hookCotizaciones.length)
    } else {
      console.log('✅ Cantidad de cotizaciones coincide')
    }
  }
  
  // Continuar con la verificación del componente
  verificarComponente(cotizacionesDB)
}

// Función para verificar el componente RevisorPanel
const verificarComponente = (cotizacionesDB) => {
  console.log('\n🔍 3. Verificando componente RevisorPanel...')
  
  // Verificar si el componente está montado
  const revisorPanel = document.querySelector('[data-testid="revisor-panel"]') || 
                      document.querySelector('.min-h-screen.bg-gradient-to-br')
  
  if (revisorPanel) {
    console.log('✅ Componente RevisorPanel encontrado en el DOM')
    
    // Verificar si hay cotizaciones mostradas
    const quoteCards = revisorPanel.querySelectorAll('.bg-white\\/80')
    console.log(`📊 Tarjetas de cotizaciones encontradas: ${quoteCards.length}`)
    
    if (quoteCards.length === 0) {
      console.log('⚠️ No hay tarjetas de cotizaciones visibles')
      
      // Verificar si hay mensaje de "no hay cotizaciones"
      const noQuotesMessage = revisorPanel.querySelector('.text-xl.font-semibold.text-gray-900')
      if (noQuotesMessage) {
        console.log('📝 Mensaje mostrado:', noQuotesMessage.textContent)
      }
    }
  } else {
    console.log('⚠️ Componente RevisorPanel no encontrado en el DOM')
  }
  
  // Continuar con la verificación del filtro
  verificarFiltro(cotizacionesDB)
}

// Función para verificar el filtro aplicado
const verificarFiltro = (cotizacionesDB) => {
  console.log('\n🔍 4. Verificando filtro aplicado...')
  
  // Verificar qué filtro está activo
  const filterButtons = document.querySelectorAll('button[onclick*="setFilter"]')
  let activeFilter = 'unknown'
  
  filterButtons.forEach(button => {
    if (button.classList.contains('bg-gradient-to-r')) {
      const text = button.textContent.trim()
      if (text.includes('Pendientes')) activeFilter = 'pending'
      else if (text.includes('Todas')) activeFilter = 'all'
      else if (text.includes('Aprobadas')) activeFilter = 'approved'
      else if (text.includes('Rechazadas')) activeFilter = 'rejected'
      else if (text.includes('Re-cotización')) activeFilter = 'revision'
    }
  })
  
  console.log(`📊 Filtro activo: ${activeFilter}`)
  
  // Verificar si el filtro está afectando la visualización
  const pendingQuotes = cotizacionesDB.filter(q => 
    q.status === 'pending' || q.status === 'sent_for_approval' || q.status === 'pending_approval'
  )
  
  if (activeFilter === 'pending' && pendingQuotes.length === 0) {
    console.log('⚠️ Filtro "pending" activo pero no hay cotizaciones pendientes')
  } else if (activeFilter === 'pending' && pendingQuotes.length > 0) {
    console.log(`✅ Filtro "pending" activo y hay ${pendingQuotes.length} cotizaciones pendientes`)
  }
  
  // Continuar con la verificación final
  verificarFinal(cotizacionesDB)
}

// Función para verificación final y recomendaciones
const verificarFinal = (cotizacionesDB) => {
  console.log('\n🔍 5. Verificación final y recomendaciones...')
  
  const pendingQuotes = cotizacionesDB.filter(q => 
    q.status === 'pending' || q.status === 'sent_for_approval' || q.status === 'pending_approval'
  )
  
  console.log('\n📋 === RESUMEN DEL DIAGNÓSTICO ===')
  console.log(`• Total de cotizaciones en BD: ${cotizacionesDB.length}`)
  console.log(`• Cotizaciones pendientes de aprobación: ${pendingQuotes.length}`)
  console.log(`• Estados disponibles: ${[...new Set(cotizacionesDB.map(q => q.status).filter(Boolean))].join(', ')}`)
  
  if (pendingQuotes.length === 0) {
    console.log('\n⚠️ PROBLEMA IDENTIFICADO: No hay cotizaciones pendientes de aprobación')
    console.log('💡 RECOMENDACIONES:')
    console.log('  1. Verifica que se estén guardando con el estado correcto (pending_approval)')
    console.log('  2. Usa el botón "Crear Test" en el RevisorPanel para generar datos de prueba')
    console.log('  3. Verifica la consola del CostosTable cuando envíes una cotización')
    console.log('  4. Revisa si hay errores en la función saveCotizacion')
  } else {
    console.log('\n✅ DATOS ENCONTRADOS: Hay cotizaciones pendientes de aprobación')
    console.log('💡 RECOMENDACIONES:')
    console.log('  1. Verifica que el hook useCotizaciones esté sincronizado')
    console.log('  2. Usa el botón "Recargar" en el RevisorPanel')
    console.log('  3. Verifica que el filtro esté en "pending"')
  }
  
  console.log('\n🔧 === ACCIONES RECOMENDADAS ===')
  console.log('1. Ejecuta: crearCotizacionPrueba() - Para generar datos de prueba')
  console.log('2. Ejecuta: debugCotizaciones() - Para ver todas las cotizaciones')
  console.log('3. Verifica la consola del CostosTable al enviar a aprobación')
  console.log('4. Usa los botones de debug en el RevisorPanel')
}

// Función para crear una cotización de prueba
const crearCotizacionPrueba = async () => {
  console.log('🧪 Creando cotización de prueba...')
  
  try {
    const db = indexedDB.open('CotizacionesDB', 1)
    db.onsuccess = function(event) {
      const database = event.target.result
      const transaction = database.transaction(['cotizaciones'], 'readwrite')
      const store = transaction.objectStore('cotizaciones')
      
      const testQuote = {
        cotizacion_id: 'TEST-DEBUG-' + Date.now(),
        clienteName: 'Cliente Debug',
        vendorName: 'Vendedor Debug',
        vendorEmail: 'debug@test.com',
        status: 'pending_approval',
        totalGeneral: 1000000,
        trmGlobal: 4200,
        date: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString('es-CO'),
        rows: [
          {
            id: 1,
            itemName: 'Producto Debug',
            mayorista: 'Proveedor Debug',
            marca: 'Debug',
            referencia: 'DEBUG-001',
            configuracion: 'Configuración de prueba',
            cantidad: 1,
            costoUSD: 100,
            costoCOP: 420000,
            pvpUnitario: 1000000,
            pvpTotal: 1000000,
            margen: 20,
            trm: 4200
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const request = store.add(testQuote)
      
      request.onsuccess = () => {
        console.log('✅ Cotización de prueba creada con ID:', request.result)
        console.log('🔄 Recargando página para ver los cambios...')
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
      
      request.onerror = () => {
        console.error('❌ Error creando cotización de prueba:', request.error)
      }
      
    }
    
  } catch (error) {
    console.error('❌ Error en crearCotizacionPrueba:', error)
  }
}

// Ejecutar debug principal
debugFlujoAprobacion().catch(console.error)

// Exponer funciones globalmente
window.debugFlujoAprobacion = debugFlujoAprobacion
window.crearCotizacionPrueba = crearCotizacionPrueba

console.log('🔧 Funciones disponibles:')
console.log('  debugFlujoAprobacion() - Verificar estado completo del sistema')
console.log('  crearCotizacionPrueba() - Crear cotización de prueba')
