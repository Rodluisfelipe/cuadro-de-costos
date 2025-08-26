import { 
  doc, 
  updateDoc, 
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

// Servicio para gestión de compras
export class PurchaseService {
  constructor() {
    this.collectionName = 'cotizaciones'
  }

  // Actualizar precio final de compra para un item
  async updateFinalPurchasePrice(quoteId, itemIndex, finalPrice, buyerUser) {
    try {
      console.log('🛒 [Purchase] Actualizando precio final:', { quoteId, itemIndex, finalPrice })

      if (!quoteId || itemIndex === undefined || !finalPrice || !buyerUser) {
        throw new Error('Parámetros requeridos faltantes')
      }

      const quoteRef = doc(db, this.collectionName, quoteId)

      // Crear objeto de actualización de compra
      const purchaseUpdate = {
        itemIndex,
        finalPurchasePrice: parseFloat(finalPrice),
        updatedBy: buyerUser.email,
        updatedAt: new Date().toISOString(),
        buyerNotes: '', // Se puede agregar después
        marginDifference: null // Se calculará en el cliente
      }

      // Actualizar el documento con el nuevo precio
      await updateDoc(quoteRef, {
        [`purchaseData.${itemIndex}`]: purchaseUpdate,
        purchaseStatus: 'in_progress',
        lastPurchaseUpdate: serverTimestamp(),
        purchaseHistory: arrayUnion({
          ...purchaseUpdate,
          action: 'price_update',
          timestamp: serverTimestamp()
        })
      })

      console.log('✅ [Purchase] Precio final actualizado exitosamente')
      return { success: true, data: purchaseUpdate }

    } catch (error) {
      console.error('❌ [Purchase] Error actualizando precio final:', error)
      throw error
    }
  }

  // Finalizar proceso de compra para una cotización
  async finalizePurchase(quoteId, buyerUser, notes = '') {
    try {
      console.log('🛒 [Purchase] Finalizando compra:', quoteId)

      const quoteRef = doc(db, this.collectionName, quoteId)

      await updateDoc(quoteRef, {
        purchaseStatus: 'completed',
        purchaseCompletedAt: serverTimestamp(),
        purchaseCompletedBy: buyerUser.email,
        purchaseNotes: notes,
        purchaseHistory: arrayUnion({
          action: 'purchase_completed',
          completedBy: buyerUser.email,
          notes: notes,
          timestamp: serverTimestamp()
        })
      })

      console.log('✅ [Purchase] Compra finalizada exitosamente')
      return { success: true }

    } catch (error) {
      console.error('❌ [Purchase] Error finalizando compra:', error)
      throw error
    }
  }

  // Obtener estadísticas de compras
  async getPurchaseStats(buyerUser) {
    try {
      console.log('📊 [Purchase] Obteniendo estadísticas de compras')

      // Por ahora retornamos estadísticas mock
      // En el futuro se puede implementar con queries específicas
      return {
        totalPurchases: 0,
        inProgress: 0,
        completed: 0,
        averageMarginDifference: 0,
        totalSavings: 0
      }

    } catch (error) {
      console.error('❌ [Purchase] Error obteniendo estadísticas:', error)
      throw error
    }
  }

  // Calcular diferencia de margen
  calculateMarginDifference(originalPrice, finalPrice, originalMargin) {
    try {
      if (!originalPrice || !finalPrice || originalMargin === undefined) {
        return null
      }

      // Calcular costo base original
      const originalCost = originalPrice / (1 + originalMargin / 100)
      
      // Calcular nuevo margen
      const newMargin = ((finalPrice - originalCost) / originalCost) * 100
      
      // Calcular diferencia
      const marginDifference = newMargin - originalMargin
      
      // Calcular ahorro/costo adicional
      const priceDifference = finalPrice - originalPrice
      const percentageDifference = (priceDifference / originalPrice) * 100

      return {
        originalPrice,
        finalPrice,
        originalCost,
        originalMargin,
        newMargin,
        marginDifference,
        priceDifference,
        percentageDifference,
        isImprovement: marginDifference > 0
      }

    } catch (error) {
      console.error('❌ [Purchase] Error calculando diferencia de margen:', error)
      return null
    }
  }

  // Validar permisos de comprador
  validateBuyerPermissions(user) {
    if (!user || !user.role) {
      throw new Error('Usuario no válido')
    }

    if (user.role !== 'comprador') {
      throw new Error('Solo los compradores pueden realizar estas operaciones')
    }

    if (!user.isActive) {
      throw new Error('Usuario inactivo')
    }

    return true
  }
}

// Instancia singleton del servicio
export const purchaseService = new PurchaseService()

export default purchaseService
