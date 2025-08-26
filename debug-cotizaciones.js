// Script de depuración para verificar datos de cotizaciones
// Ejecutar en la consola del navegador

console.log('🔍 Iniciando depuración de cotizaciones...')

// Función para verificar datos de IndexedDB
async function debugIndexedDB() {
  try {
    // Abrir la base de datos
    const db = indexedDB.open('CotizacionesDB', 1)
    
    db.onsuccess = function(event) {
      const database = event.target.result
      const transaction = database.transaction(['cotizaciones'], 'readonly')
      const store = transaction.objectStore('cotizaciones')
      const request = store.getAll()
      
      request.onsuccess = function() {
        const cotizaciones = request.result
        console.log('📊 [IndexedDB] Total de cotizaciones:', cotizaciones.length)
        
        cotizaciones.forEach((quote, index) => {
          console.log(`📋 [IndexedDB] Cotización ${index + 1}:`, {
            id: quote.id,
            cotizacion_id: quote.cotizacion_id,
            clienteName: quote.clienteName,
            status: quote.status,
            totalGeneral: quote.totalGeneral,
            rowsCount: quote.rows?.length || 0,
            rows: quote.rows?.map(row => ({
              id: row.id,
              itemName: row.itemName,
              mayorista: row.mayorista,
              marca: row.marca,
              referencia: row.referencia,
              configuracion: row.configuracion,
              pvpTotal: row.pvpTotal,
              costoUSD: row.costoUSD,
              cantidad: row.cantidad
            }))
          })
        })
      }
    }
    
    db.onerror = function(event) {
      console.error('❌ Error accediendo a IndexedDB:', event.target.error)
    }
  } catch (error) {
    console.error('❌ Error en depuración IndexedDB:', error)
  }
}

// Función para verificar datos de Firebase
async function debugFirebase() {
  try {
    // Verificar si Firebase está disponible
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('🔥 Firebase disponible')
      // Aquí podrías agregar lógica para verificar Firebase
    } else {
      console.log('⚠️ Firebase no disponible')
    }
  } catch (error) {
    console.error('❌ Error verificando Firebase:', error)
  }
}

// Ejecutar depuración
debugIndexedDB()
debugFirebase()

console.log('✅ Depuración completada. Revisa la consola para más detalles.')
