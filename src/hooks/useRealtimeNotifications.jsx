import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [currentNotification, setCurrentNotification] = useState(null)
  const { userInfo } = useAuth()
  const lastProcessedTimestamp = useRef(Date.now())
  const unsubscribeRef = useRef(null)

  useEffect(() => {
    if (!userInfo?.email) return

    console.log('🔔 Iniciando listener de notificaciones para:', userInfo.email)

    // Crear query para cotizaciones del usuario actual
    const cotizacionesRef = collection(db, 'cotizaciones')
    const q = query(
      cotizacionesRef,
      where('userEmail', '==', userInfo.email),
      where('companyId', '==', 'TECNOPHONE'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )

    // Listener en tiempo real
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data()
          const updatedAt = new Date(data.updatedAt || data.date).getTime()
          
          // Solo procesar cambios nuevos (después del último timestamp procesado)
          if (updatedAt > lastProcessedTimestamp.current) {
            console.log('🔔 Cambio detectado en cotización:', data.cotizacion_id)
            
            // Verificar si hay cambios en el estado de aprobación
            if (data.status && ['approved', 'revision_requested', 'denied'].includes(data.status)) {
              console.log('📋 Estado de aprobación actualizado:', data.status)
              
              const notification = createNotificationFromQuote(data)
              if (notification) {
                setCurrentNotification(notification)
                setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Mantener solo 10
                
                // Actualizar timestamp para evitar re-procesar
                lastProcessedTimestamp.current = updatedAt
              }
            }
          }
        }
      })
    }, (error) => {
      console.error('❌ Error en listener de notificaciones:', error)
    })

    unsubscribeRef.current = unsubscribe
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        console.log('🔔 Listener de notificaciones desconectado')
      }
    }
  }, [userInfo?.email])

  const createNotificationFromQuote = (quoteData) => {
    if (!quoteData.status || !['approved', 'revision_requested', 'denied'].includes(quoteData.status)) {
      return null
    }

    const notification = {
      id: `${quoteData.cotizacion_id}-${Date.now()}`,
      type: quoteData.status,
      quoteId: quoteData.cotizacion_id,
      clientName: quoteData.clienteName,
      timestamp: quoteData.approvalDate || quoteData.revisionDate || quoteData.updatedAt || new Date().toISOString(),
    }

    // Agregar opciones seleccionadas si está aprobada
    if (quoteData.status === 'approved' && quoteData.selectedOptions) {
      const selectedOptionsFormatted = {}
      
      // Convertir selectedOptions a formato legible
      Object.entries(quoteData.selectedOptions).forEach(([itemId, rowId]) => {
        const selectedRow = quoteData.rows?.find(row => row.id === rowId)
        if (selectedRow) {
          const itemName = selectedRow.itemName || `Producto ${selectedRow.item}`
          selectedOptionsFormatted[itemName] = {
            provider: selectedRow.mayorista || 'Sin proveedor',
            price: formatCurrency(selectedRow.pvpTotal || 0)
          }
        }
      })
      
      notification.selectedOptions = selectedOptionsFormatted
    }

    // Agregar comentarios si hay re-cotización
    if ((quoteData.status === 'revision_requested' || quoteData.status === 'denied') && quoteData.itemComments) {
      const commentsFormatted = {}
      
      Object.entries(quoteData.itemComments).forEach(([itemId, comment]) => {
        if (comment && comment.trim()) {
          // Buscar el nombre del item
          const itemRow = quoteData.rows?.find(row => row.itemId === itemId)
          const itemName = itemRow?.itemName || `Producto ${itemId}`
          commentsFormatted[itemName] = comment
        }
      })
      
      if (Object.keys(commentsFormatted).length > 0) {
        notification.comments = commentsFormatted
      }
    }

    return notification
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const dismissCurrentNotification = () => {
    setCurrentNotification(null)
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setCurrentNotification(null)
  }

  return {
    notifications,
    currentNotification,
    dismissCurrentNotification,
    clearAllNotifications
  }
}

export default useRealtimeNotifications
