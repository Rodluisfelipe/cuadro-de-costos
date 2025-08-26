import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Moon, Sun, Download, FileText, Save, Send, Package } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

// Utilidades para IDs únicos y codificación
const generateUniqueId = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `COT-${timestamp}-${random}`.toUpperCase()
}

const encodeQuoteToBase64 = (quote) => {
  try {
    const jsonString = JSON.stringify(quote)
    return btoa(unescape(encodeURIComponent(jsonString)))
  } catch (error) {
    console.error('Error codificando cotización:', error)
    return null
  }
}

const decodeQuoteFromBase64 = (base64String) => {
  try {
    const jsonString = decodeURIComponent(escape(atob(base64String)))
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error decodificando cotización:', error)
    return null
  }
}

const generateApprovalLink = (quote) => {
  const encodedQuote = encodeQuoteToBase64(quote)
  if (!encodedQuote) return null
  
  return `?approval=${encodedQuote}`
}

// Función eliminada - ya no generamos mensajes de WhatsApp

// Función eliminada - ya no usamos WhatsApp para aprobaciones
import { Card, CardContent } from './ui/card'
import { useTheme } from '../hooks/useTheme.jsx'
import { useCotizaciones } from '../hooks/useCotizaciones.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import SavedQuotesModal from './SavedQuotesModal.jsx'
import ProvidersModal from './ProvidersModal.jsx'
import ProviderAutocomplete from './ProviderAutocomplete.jsx'
import FirstItemModal from './FirstItemModal.jsx'
import NotificationToast from './NotificationToast.jsx'
import AdditionalCostsModal from './AdditionalCostsModal.jsx'
import PinValidationModal from './PinValidationModal.jsx'
import UserManagement from './UserManagement.jsx'
import BuyerPanel from './BuyerPanel.jsx'
import RevisorPanel from './RevisorPanel.jsx'
import useRealtimeNotifications from '../hooks/useRealtimeNotifications.jsx'
import { providersManager } from '../lib/providersConfig.js'

import { formatCurrency, formatPercentage, parseNumber, cn } from '../lib/utils'
import jsPDF from 'jspdf'

// URL base de la aplicación desplegada


const CostosTable = () => {
  const { theme, setTheme } = useTheme()
  
  // Hook de autenticación y roles
  const { 
    userInfo, 
    userRole, 
    roleInfo, 
    canQuote, 
    checkPermission, 
    isUserAdmin,
    isUserComprador,
    isUserRevisor,
    logout 
  } = useAuth()
  
  // Hook para manejar cotizaciones con Dexie + Firebase
  const {
    cotizaciones: savedQuotes,
    loading: dbLoading,
    error: dbError,
    syncStats,
    isOnline,
    saveCotizacion,
    deleteCotizacion,
    duplicateCotizacion,
    getCotizacionById,
    refreshCotizaciones,
    forceSync
  } = useCotizaciones()

  // Hook para notificaciones en tiempo real
  const {
    currentNotification,
    dismissCurrentNotification
  } = useRealtimeNotifications()

  // Auto-dismiss notificaciones después de 10 segundos
  useEffect(() => {
    if (currentNotification) {
      const timer = setTimeout(() => {
        dismissCurrentNotification()
      }, 10000) // 10 segundos

      return () => clearTimeout(timer)
    }
  }, [currentNotification, dismissCurrentNotification])

  // Verificar permisos al cargar
  useEffect(() => {
    // Si el usuario no puede cotizar, mostrar interfaz apropiada según su rol
    if (!canQuote() && userRole) {
      console.log(`👤 Usuario con rol ${userRole} - ${roleInfo?.name}`)
      
      if (isUserAdmin()) {
        console.log('🔐 Mostrando panel de administrador')
        setShowUserManagement(true)
      } else if (isUserComprador()) {
        console.log('🛒 Mostrando panel de comprador')
        setShowUserManagement(false)
      } else if (isUserRevisor()) {
        console.log('✅ Mostrando panel de revisor')
        setShowUserManagement(false)
      } else {
        console.log('ℹ️ Usuario sin permisos de cotización')
      }
    }
  }, [userRole, canQuote, isUserAdmin, isUserComprador, isUserRevisor, roleInfo])

  // Función para obtener información del proveedor
  const getProviderInfo = (providerName) => {
    if (!providerName) return null
    
    const providers = providersManager.getAll()
    const provider = providers.find(p => 
      p.name.toLowerCase().trim() === providerName.toLowerCase().trim()
    )
    
    return provider || {
      name: providerName,
      imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(providerName)}&size=150&background=0ea5e9&color=fff&rounded=true`,
      category: 'No especificado'
    }
  }

  // Función para obtener resumen de aprobación
  const getApprovalSummary = () => {
    if (!editingQuote || !editingQuote.selectedOptions) return null

    const allRows = editingQuote.rows || rows
    const selectedRowIds = Object.values(editingQuote.selectedOptions)
    
    const approvedRows = allRows.filter(row => selectedRowIds.includes(row.id))
    const rejectedRows = allRows.filter(row => !selectedRowIds.includes(row.id))
    
    const approvedTotal = approvedRows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)
    const rejectedTotal = rejectedRows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)
    const originalTotal = approvedTotal + rejectedTotal

    return {
      approved: {
        rows: approvedRows,
        count: approvedRows.length,
        total: approvedTotal
      },
      rejected: {
        rows: rejectedRows,
        count: rejectedRows.length,
        total: rejectedTotal
      },
      originalTotal,
      savings: rejectedTotal
    }
  }
  
  const [rows, setRows] = useState([
    {
      id: 1,
      item: 1,
      cantidad: 1,
      mayorista: '',
      marca: '',
      referencia: '',
      configuracion: '',
      costoUSD: 0,
      trm: 4200,
      costoCOP: 0,
      ivaPercentCosto: 0,
      valorIvaCosto: 0,
      costoConIva: 0,
      costoTotal: 0,
      margen: 30,
      pvpUnitario: 0,
      ivaPercentPVP: 0,
      valorIvaPVP: 0,
      pvpMasIva: 0,
      pvpTotal: 0
    }
  ])
  
  const [presupuesto, setPresupuesto] = useState(0)
  const [trmGlobal, setTrmGlobal] = useState(4200)

  // Actualizar TRM en todas las filas cuando cambia el TRM global
  const updateGlobalTRM = (newTRM) => {
    setTrmGlobal(newTRM)
    setRows(prevRows => 
      prevRows.map(row => ({
        ...row,
        trm: newTRM
      }))
    )
  }

  // Calcular valores automáticamente
  const calculateRow = useCallback((row) => {
    const cantidad = Math.max(1, parseNumber(row.cantidad) || 1)
    const costoUSD = Math.max(0, parseNumber(row.costoUSD) || 0)
    const trm = Math.max(0, parseNumber(row.trm) || trmGlobal)
    const ivaPercentCosto = Math.max(0, parseNumber(row.ivaPercentCosto) || 0)
    const margen = Math.max(0, parseNumber(row.margen) || 30)
    const ivaPercentPVP = Math.max(0, parseNumber(row.ivaPercentPVP) || 0)
    
    // Calcular costos adicionales
    const additionalCosts = row.additionalCosts || []
    const additionalCostUSD = additionalCosts.reduce((sum, cost) => {
      if (cost.description.trim()) {
        if (cost.currency === 'USD' && cost.valueUSD > 0) {
          return sum + cost.valueUSD
        } else if (cost.currency === 'COP' && cost.valueCOP > 0) {
          // Convertir COP a USD usando TRM
          return sum + (cost.valueCOP / trm)
        }
      }
      return sum
    }, 0)
    
    // 1. Calcular COSTO COP: si hay USD convertir, sino usar directo (incluyendo costos adicionales)
    let costoCOP = 0
    const totalCostoUSD = costoUSD + additionalCostUSD
    if (totalCostoUSD > 0 && trm > 0) {
      costoCOP = totalCostoUSD * trm
    } else {
      costoCOP = Math.max(0, parseNumber(row.costoCOP) || 0)
    }
    
    // 2. Calcular VALOR DEL IVA del costo
    const valorIvaCosto = costoCOP * (ivaPercentCosto / 100)
    
    // 3. Calcular COSTO CON IVA INCLUIDO
    const costoConIva = costoCOP + valorIvaCosto
    
    // 4. Calcular COSTO TOTAL (costo con IVA * cantidad)
    const costoTotal = costoConIva * cantidad
    
    // 5. Calcular PVP UNITARIO usando la fórmula: costo / (1 - (margen/100))
    // Validar que el margen no sea 100% o mayor para evitar división por cero
    const denominador = 1 - (margen / 100)
    const pvpUnitario = denominador > 0 ? costoCOP / denominador : costoCOP
    
    // 6. Calcular VALOR DEL IVA del PVP
    const valorIvaPVP = pvpUnitario * (ivaPercentPVP / 100)
    
    // 7. Calcular PVP MAS IVA
    const pvpMasIva = pvpUnitario + valorIvaPVP
    
    // 8. Calcular PVP TOTAL
    const pvpTotal = pvpMasIva * cantidad

    return {
      ...row,
      cantidad,
      costoUSD,
      additionalCostUSD,
      trm,
      costoCOP,
      ivaPercentCosto,
      valorIvaCosto,
      costoConIva,
      costoTotal,
      margen,
      pvpUnitario,
      ivaPercentPVP,
      valorIvaPVP,
      pvpMasIva,
      pvpTotal
    }
  }, [trmGlobal])

  // Actualizar fila
  const updateRow = useCallback((id, field, value) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row.id === id 
          ? calculateRow({ ...row, [field]: value })
          : row
      )
    )
  }, [calculateRow])

  // Estados para TRM oficial de Superfinanciera
  const [oficialTRM, setOficialTRM] = useState(null)
  const [trmLoading, setTrmLoading] = useState(false)
  const [trmError, setTrmError] = useState(null)
  const [lastTrmUpdate, setLastTrmUpdate] = useState(null)

  // Estados para cliente y guardado
  const [clienteName, setClienteName] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Estado para controlar items colapsados en móvil
  const [collapsedItems, setCollapsedItems] = useState(new Set())
  
  // Estados para gestión de cotizaciones guardadas
  const [showSavedQuotes, setShowSavedQuotes] = useState(false) // Mantener para compatibilidad
  const [showQuotesModal, setShowQuotesModal] = useState(false) // Nuevo modal
  const [editingQuote, setEditingQuote] = useState(null)
  
  // Estados para gestión de proveedores
  const [showProvidersModal, setShowProvidersModal] = useState(false)
  
  // Estados para sistema de aprobación

  const [approvalQuote, setApprovalQuote] = useState(null)
  const [showApprovalView, setShowApprovalView] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState({}) // {itemId: rowId}
  const [itemComments, setItemComments] = useState({}) // {itemId: comment}

  // Estados para nuevo flujo basado en ítems
  const [currentItem, setCurrentItem] = useState(null)
  const [showFirstItemModal, setShowFirstItemModal] = useState(false)
  const [itemBasedMode, setItemBasedMode] = useState(false)

    // Estado para modo solo lectura
  const isReadOnlyMode = editingQuote && (
    editingQuote.status === 'approved' ||
    editingQuote.status === 'denied'
  )

  // Estados para costos adicionales
  const [showAdditionalCostsModal, setShowAdditionalCostsModal] = useState(false)
  const [selectedRowForCosts, setSelectedRowForCosts] = useState(null)
  
  // Estados para sistema de roles
  const [showUserManagement, setShowUserManagement] = useState(false)

  // Estados para PIN de seguridad
  const [showPinValidation, setShowPinValidation] = useState(false)
  const [pinAttempts, setPinAttempts] = useState(0)
  const [validatedPin, setValidatedPin] = useState(null)

  // Función para abrir modal de costos adicionales
  const openAdditionalCostsModal = (row) => {
    setSelectedRowForCosts(row)
    setShowAdditionalCostsModal(true)
  }

  // Función para guardar costos adicionales
  const saveAdditionalCosts = (additionalCosts) => {
    if (selectedRowForCosts) {
      updateRow(selectedRowForCosts.id, 'additionalCosts', additionalCosts)
      setSelectedRowForCosts(null)
    }
  }

  // Función para obtener TRM oficial de datos.gov.co (GOBIERNO COLOMBIANO)
  const fetchOficialTRM = async () => {
    setTrmLoading(true)
    setTrmError(null)
    
    try {
      console.log('🏛️ Consultando TRM oficial de datos.gov.co...')
      
      // API OFICIAL del gobierno colombiano
      const response = await fetch('https://www.datos.gov.co/resource/ceyp-9c7c.json?$select=valor,vigenciadesde&$order=vigenciadesde%20DESC&$limit=1')
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Respuesta datos.gov.co:', data)

      if (data && data.length > 0 && data[0].valor) {
        const trm = parseFloat(data[0].valor)
        const fecha = data[0].vigenciadesde.split('T')[0] // Extraer solo la fecha
        
        setOficialTRM(trm)
        setLastTrmUpdate(new Date().toLocaleString('es-CO'))
        console.log(`✅ TRM oficial obtenida: $${trm.toFixed(2)} (${fecha}) - Solo informativo`)
        
      } else {
        throw new Error('No se encontró valor de TRM en la respuesta')
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo TRM oficial:', error)
      setTrmError(error.message)
    } finally {
      setTrmLoading(false)
    }
  }

  // Cargar TRM oficial al montar el componente
  useEffect(() => {
    fetchOficialTRM()
    
    // Sincronizar proveedores con Firebase al iniciar
    const syncProviders = async () => {
      try {
        console.log('🔄 [Inicio] Sincronizando proveedores...')
        await providersManager.forceSync()
        console.log('✅ [Inicio] Proveedores sincronizados')
      } catch (error) {
        console.warn('⚠️ [Inicio] Error sincronizando proveedores:', error)
      }
    }
    
    // Ejecutar sincronización después de un breve delay para que Firebase se inicialice
    setTimeout(syncProviders, 2000)
    
    // Verificar si hay un enlace de aprobación en la URL
    const urlParams = new URLSearchParams(window.location.search)
    const approvalData = urlParams.get('approval') // Método antiguo (Base64)
    const approvalId = urlParams.get('approval_id') // Método nuevo (ID de BD)
    
    if (approvalId) {
      // Método nuevo: Mostrar modal de PIN antes de cargar
      console.log('🔐 Cotización requiere PIN de seguridad:', approvalId)
      setShowPinValidation(true)
      window.pendingApprovalId = approvalId
    } else if (approvalData) {
      // Método antiguo: Decodificar desde URL (para compatibilidad)
      const decodedQuote = decodeQuoteFromBase64(approvalData)
      if (decodedQuote) {
        setApprovalQuote(decodedQuote)
        setShowApprovalView(true)
        console.log('📋 Cotización para aprobación cargada (método antiguo):', decodedQuote)
      } else {
        alert('Error: El enlace de aprobación no es válido')
      }
    } else {
      // Si no hay cotización para aprobar y es primera vez, mostrar modal de primer ítem
      setTimeout(() => {
        if (!editingQuote && !currentItem && rows.length === 1 && !rows[0].mayorista) {
          setShowFirstItemModal(true)
        }
      }, 1000) // Esperar un poco para que se cargue todo
    }
  }, [])

  // Función para validar PIN de seguridad
  const validateSecurityPin = async (enteredPin) => {
    try {
      const approvalId = window.pendingApprovalId
      if (!approvalId) {
        console.error('❌ No hay ID de aprobación pendiente')
        return false
      }

      console.log('🔐 Validando PIN para cotización:', approvalId)
      
      // Obtener la cotización de la base de datos
      const quote = await getCotizacionById(approvalId)
      
      if (!quote) {
        console.error('❌ Cotización no encontrada:', approvalId)
        alert('Error: Cotización no encontrada')
        return false
      }

      // Verificar si la cotización tiene PIN de seguridad
      if (!quote.securityPin || !quote.securityPin.pin) {
        console.error('❌ Cotización sin PIN de seguridad')
        alert('Error: Esta cotización no tiene un PIN de seguridad configurado')
        return false
      }

      // Validar formato del PIN ingresado
      if (!validatePinFormat(enteredPin)) {
        console.error('❌ Formato de PIN inválido')
        return false
      }

      // Comparar PINs
      const isValidPin = enteredPin === quote.securityPin.pin
      
      if (isValidPin) {
        console.log('✅ PIN válido - cargando cotización')
        
        // Actualizar estadísticas de uso del PIN
        try {
          const updatedSecurityPin = {
            ...quote.securityPin,
            usageCount: (quote.securityPin.usageCount || 0) + 1,
            lastUsed: new Date().toISOString()
          }
          
          await saveCotizacion({
            id: quote.id,
            securityPin: updatedSecurityPin
          })
        } catch (error) {
          console.warn('⚠️ Error actualizando estadísticas de PIN:', error)
          // No fallar la validación por esto
        }
        
        // Cargar la cotización para aprobación
        setValidatedPin(enteredPin)
        setShowPinValidation(false)
        setPinAttempts(0)
        
        // Cargar cotización
        await loadQuoteForApproval(approvalId)
        
        return true
      } else {
        console.log('❌ PIN incorrecto')
        setPinAttempts(prev => prev + 1)
        return false
      }
      
    } catch (error) {
      console.error('❌ Error validando PIN:', error)
      alert('Error al validar el PIN. Intenta de nuevo.')
      return false
    }
  }

  // Función para cargar cotización desde BD para aprobación
  const loadQuoteForApproval = async (cotizacionId) => {
    try {
      console.log('🔍 Cargando cotización para aprobación desde BD:', cotizacionId)
      
      const quote = await getCotizacionById(cotizacionId)
      
      if (quote) {
        setApprovalQuote(quote)
        setShowApprovalView(true)
        console.log('✅ Cotización para aprobación cargada desde BD:', quote)
      } else {
        console.error('❌ Cotización no encontrada en BD:', cotizacionId)
        alert('Error: La cotización no fue encontrada. Es posible que haya sido eliminada.')
      }
    } catch (error) {
      console.error('❌ Error cargando cotización para aprobación:', error)
      alert('Error al cargar la cotización para aprobación.')
    }
  }

  // Función para guardar cotización usando Dexie
  const saveQuote = async () => {
    console.log('💾 Iniciando proceso de guardado...')
    console.log('👤 Cliente actual:', clienteName)
    console.log('✏️ Editando cotización:', editingQuote)
    
    if (!clienteName.trim()) {
      console.log('❌ Error: Cliente vacío')
      alert('Por favor ingresa el nombre del cliente')
      return
    }

    try {
      let result

      if (editingQuote && editingQuote.id) {
        // ACTUALIZAR cotización existente
        console.log('🔄 Actualizando cotización existente ID:', editingQuote.id)
        
        const updateData = {
      clienteName: clienteName.trim(),
      trmGlobal,
      rows,
      totalGeneral: rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0),
          // NO cambiar: cotizacion_id, date, createdAt
          // Solo actualizar: updatedAt se maneja automáticamente
        }

        result = await saveCotizacion({
          id: editingQuote.id, // ID para identificar que es actualización
          ...updateData
        })
        
        console.log('✅ Cotización actualizada correctamente')
        
      } else {
        // CREAR nueva cotización
        console.log('➕ Creando nueva cotización...')
        
        const newQuote = {
          cotizacion_id: generateUniqueId(),
          clienteName: clienteName.trim(),
          trmGlobal,
          rows,
          totalGeneral: rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0),
          date: new Date().toISOString(),
          dateFormatted: new Date().toLocaleString('es-CO'),
          status: 'draft'
        }

        result = await saveCotizacion(newQuote)
        
        console.log('✅ Nueva cotización creada:', newQuote.cotizacion_id)
      }
      
      setSaveSuccess(true)
      
      // Si estábamos editando, limpiar el estado de edición
      if (editingQuote) {
        setEditingQuote(null)
        console.log('🔄 Modo edición finalizado')
      }
      
      // Ocultar mensaje de éxito después de 2 segundos
      setTimeout(() => setSaveSuccess(false), 2000)
      
      console.log('✅ Guardado completado exitosamente')
    } catch (error) {
      console.error('❌ Error guardando cotización:', error)
      alert('Error al guardar la cotización')
    }
  }

  // Funciones para gestión de cotizaciones guardadas
  const loadQuote = (quote) => {
    console.log('📂 Cargando cotización para edición:', quote)
    
    setClienteName(quote.clienteName)
    setTrmGlobal(quote.trmGlobal)
    setRows(quote.rows)
    setEditingQuote(quote) // Esto es CLAVE para que sepa que está editando
    setShowSavedQuotes(false)
    
    console.log('✅ Estado de edición establecido con ID:', quote.id)
    console.log('✅ Cotización ID:', quote.cotizacion_id)
  }

  const deleteQuote = async (quoteId) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta cotización?')) {
      try {
        await deleteCotizacion(quoteId)
      console.log('🗑️ Cotización eliminada:', quoteId)
      } catch (error) {
        console.error('❌ Error eliminando cotización:', error)
        alert('Error al eliminar la cotización')
      }
    }
  }

  const exportQuotePDF = (quote) => {
    // Temporalmente cargar la cotización para exportar
    const currentClientName = clienteName
    const currentTrmGlobal = trmGlobal
    const currentRows = rows
    
    setClienteName(quote.clienteName)
    setTrmGlobal(quote.trmGlobal)
    setRows(quote.rows)
    
    setTimeout(() => {
      exportToPDF()
      // Restaurar estado original
      setClienteName(currentClientName)
      setTrmGlobal(currentTrmGlobal)
      setRows(currentRows)
    }, 100)
  }

  const duplicateQuote = async (quote) => {
    try {
      await duplicateCotizacion(quote)
      console.log('📋 Cotización duplicada exitosamente')
    } catch (error) {
      console.error('❌ Error duplicando cotización:', error)
      alert('Error al duplicar la cotización')
    }
  }

  // Función para agrupar filas de aprobación por ítems
  const getGroupedApprovalRows = (rows) => {
    if (!rows || rows.length === 0) return []
    
    const groups = {}
    rows.forEach(row => {
      const itemId = row.itemId || `item-${row.item || row.id}`
      const itemName = row.itemName || `Producto ${row.item}`
      
      if (!groups[itemId]) {
        groups[itemId] = {
          item: {
            id: itemId,
            name: itemName,
            description: row.itemDescription || ''
          },
          options: []
        }
      }
      groups[itemId].options.push(row)
    })

    return Object.values(groups)
  }

  // Función para agrupar filas por ítems
    const getGroupedRows = () => {
    // Si es una cotización aprobada y estamos editando, mostrar solo las opciones seleccionadas
    let rowsToShow = rows
    if (editingQuote && editingQuote.status === 'approved' && editingQuote.selectedOptions) {
      const selectedRowIds = Object.values(editingQuote.selectedOptions)
      rowsToShow = rows.filter(row => selectedRowIds.includes(row.id))
      console.log('📋 Mostrando solo opciones aprobadas:', selectedRowIds)
    }

    if (!itemBasedMode) {
      // Modo tradicional: cada fila es independiente
      return rowsToShow.map(row => ({
        item: {
          id: row.itemId || `item-${row.id}`,
          name: row.itemName || `Producto ${row.item}`,
          description: row.itemDescription || ''
        },
        options: [row]
      }))
    }

    // Modo ítem: agrupar por itemId, incluyendo ítems sin opciones
    const groups = {}
    rowsToShow.forEach(row => {
      // Usar itemId si existe, sino crear uno único por fila
      const itemId = row.itemId || `item-${row.id}`
      const itemName = row.itemName || `Producto ${row.item}`

      if (!groups[itemId]) {
        groups[itemId] = {
          item: {
            id: itemId,
            name: itemName,
            description: row.itemDescription || ''
          },
          options: []
        }
      }
      groups[itemId].options.push(row)
    })

    return Object.values(groups)
  }

  // Funciones para el nuevo flujo basado en ítems
  const handleFirstItemAdd = async (item) => {
    console.log('📦 Agregando ítem:', item)
    setItemBasedMode(true)
    
    // Verificar si es realmente el primer ítem (sin datos previos)
    const isReallyFirstItem = rows.length === 1 && 
                              !rows[0].mayorista && 
                              !rows[0].marca && 
                              !rows[0].itemId &&
                              !rows[0].itemName
    
    if (isReallyFirstItem) {
      // Es el primer ítem y la primera fila está completamente vacía
      setCurrentItem(item)
      setRows(prevRows => {
        const updatedRows = [...prevRows]
        updatedRows[0] = {
          ...updatedRows[0],
          itemId: item.id,
          itemName: item.name,
          itemDescription: item.description,
          configuracion: item.description || item.name
        }
        return updatedRows
      })
    } else {
      // Siempre añadir nuevo ítem con nueva fila (incluso si hay ítems sin opciones)
      const newRow = {
        id: Date.now() + Math.random(),
        item: rows.length + 1,
        itemId: item.id,
        itemName: item.name,
        itemDescription: item.description,
        cantidad: 1,
        mayorista: '',
        marca: '',
        referencia: '',
        configuracion: item.description || item.name,
        costoUSD: 0,
        trm: trmGlobal,
        costoCOP: 0,
        ivaPercentCosto: 0,
        valorIvaCosto: 0,
        costoConIva: 0,
        costoTotal: 0,
        margen: 30,
        pvpUnitario: 0,
        ivaPercentPVP: 0,
        valorIvaPVP: 0,
        pvpMasIva: 0,
        pvpTotal: 0
      }
      setRows(prevRows => [...prevRows, newRow])
      console.log('📦 Nuevo ítem añadido como fila adicional:', item.name)
    }
    
    setShowFirstItemModal(false)
  }

  const addNewItemOption = (item = null) => {
    // Si no se pasa un ítem específico, usar el actual
    const targetItem = item || currentItem
    if (!targetItem) return
    
    // Agregar nueva fila para el ítem específico
    const newRow = {
      id: Date.now() + Math.random(), // ID único
      item: rows.length + 1,
      itemId: targetItem.id,
      itemName: targetItem.name,
      itemDescription: targetItem.description,
      cantidad: 1,
      mayorista: '',
      marca: '',
      referencia: '',
      configuracion: targetItem.description || targetItem.name,
      costoUSD: 0,
      trm: trmGlobal,
      costoCOP: 0,
      ivaPercentCosto: 0,
      valorIvaCosto: 0,
      costoConIva: 0,
      costoTotal: 0,
      margen: 30,
      pvpUnitario: 0,
      ivaPercentPVP: 0,
      valorIvaPVP: 0,
      pvpMasIva: 0,
      pvpTotal: 0
    }
    
    setRows(prevRows => [...prevRows, newRow])
    console.log('📦 Nueva opción añadida para:', targetItem.name)
  }

  const addNewItem = () => {
    setShowFirstItemModal(true)
  }

  const newQuote = () => {
    if (editingQuote || rows.length > 0 || clienteName.trim()) {
      if (confirm('¿Estás seguro de que quieres crear una nueva cotización? Se perderán los cambios no guardados.')) {
        // Limpiar completamente el estado
        setClienteName('')
        setRows([{
          id: 1,
          item: 1,
          cantidad: 1,
          mayorista: '',
          marca: '',
          referencia: '',
          configuracion: '',
          costoUSD: 0,
          trm: trmGlobal,
          costoCOP: 0,
          ivaPercentCosto: 0,
          valorIvaCosto: 0,
          costoConIva: 0,
          costoTotal: 0,
          margen: 30,
          pvpUnitario: 0,
          ivaPercentPVP: 0,
          valorIvaPVP: 0,
          pvpMasIva: 0,
          pvpTotal: 0
        }])
        setEditingQuote(null) // CLAVE: limpiar estado de edición
        setShowSavedQuotes(false)
        setCollapsedItems(new Set())

        setShowApprovalView(false)
        
        // Limpiar estados del modo ítem
        setCurrentItem(null)
        setItemBasedMode(false)
        setShowFirstItemModal(false)
        
        console.log('🆕 Nueva cotización iniciada - estado de edición limpiado')
        
        // Mostrar modal de primer ítem después de un momento
        setTimeout(() => {
          setShowFirstItemModal(true)
        }, 500)
      }
    } else {
      setEditingQuote(null) // También limpiar aquí
      setShowSavedQuotes(false)
      
      // Limpiar estados del modo ítem
      setCurrentItem(null)
      setItemBasedMode(false)
      
      console.log('🔄 Estado de edición limpiado')
      
      // Mostrar modal de primer ítem
      setTimeout(() => {
        setShowFirstItemModal(true)
      }, 300)
    }
  }

  // Funciones para sistema de aprobación simplificado
  const sendForApproval = async () => {
    if (!clienteName.trim()) {
      alert('Por favor ingresa el nombre del cliente antes de enviar a aprobación')
      return
    }

    if (rows.length === 0) {
      alert('Por favor añade al menos un item antes de enviar a aprobación')
      return
    }

    try {
      // Preparar la cotización
      const quote = {
        cotizacion_id: editingQuote ? editingQuote.cotizacion_id : generateUniqueId(),
        clienteName: clienteName.trim(),
        trmGlobal,
        rows,
        totalGeneral: rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0),
        date: editingQuote ? editingQuote.date : new Date().toISOString(),
        dateFormatted: editingQuote ? editingQuote.dateFormatted : new Date().toLocaleString('es-CO'),
        status: 'pending_approval',
        trmOficial: oficialTRM,
        lastTrmUpdate: lastTrmUpdate,
        // Información del vendedor
        vendorName: userInfo?.displayName || userInfo?.email || 'Vendedor',
        vendorEmail: userInfo?.email || 'sin-email',
        // Metadatos adicionales
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sentForApprovalAt: new Date().toISOString(),
        sentForApprovalBy: userInfo?.email || 'Vendedor'
      }

      // Si estamos editando, incluir el ID de la BD
      if (editingQuote && editingQuote.id) {
        quote.id = editingQuote.id
      }

      // Guardar en la base de datos
      console.log('💾 Guardando cotización en BD para aprobación...')
      await saveCotizacion(quote)
      
      // Obtener la cotización guardada con su ID de BD
      const savedQuote = await getCotizacionById(quote.cotizacion_id)
      
      if (!savedQuote) {
        throw new Error('No se pudo recuperar la cotización guardada')
      }

      console.log('✅ Cotización enviada para aprobación exitosamente')
      console.log('📊 ID de BD:', savedQuote.id, 'ID de Cotización:', savedQuote.cotizacion_id)
      
      // Mostrar mensaje de éxito
      alert('✅ Cotización enviada para aprobación exitosamente.\n\nLa cotización ahora está disponible en el Panel de Revisor para su revisión.')
      
      // Actualizar estado de edición si es necesario
      if (!editingQuote) {
        setEditingQuote(savedQuote)
      }
      
      // Limpiar el formulario después de enviar
      setClienteName('')
      setRows([])
      setEditingQuote(null)
      
    } catch (error) {
      console.error('❌ Error enviando cotización para aprobación:', error)
      alert('Error al enviar la cotización para aprobación. Por favor, intenta de nuevo.')
    }
  }



  const handleApproval = async (approved) => {
    if (!approvalQuote) return

    console.log('🔄 [DEBUG] Iniciando proceso de aprobación')
    console.log('📋 [DEBUG] approvalQuote:', approvalQuote)
    console.log('📋 [DEBUG] approvalQuote.cotizacion_id:', approvalQuote.cotizacion_id)

    let updatedQuote = { ...approvalQuote }

    if (approved) {
      // APROBACIÓN: Verificar que se hayan seleccionado opciones
      const groupedRows = getGroupedApprovalRows(approvalQuote.rows)
      const hasAllSelections = groupedRows.every(group => selectedOptions[group.item.id])
      
      if (!hasAllSelections) {
        alert('Por favor selecciona una opción para cada producto antes de aprobar.')
        return
      }

      // Crear filas finales con solo las opciones seleccionadas
      const selectedRows = []
      groupedRows.forEach(group => {
        const selectedRowId = selectedOptions[group.item.id]
        const selectedRow = group.options.find(row => row.id === selectedRowId)
        if (selectedRow) {
          selectedRows.push(selectedRow)
        }
      })

      // Calcular nuevo total
      const newTotal = selectedRows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)

      // Actualizar cotización con opciones seleccionadas
      updatedQuote = {
        ...approvalQuote,
        rows: selectedRows,
        totalGeneral: newTotal,
        status: 'approved',
        selectedOptions: selectedOptions,
        itemComments: itemComments,
        approvalDate: new Date().toISOString(),
        approvalDateFormatted: new Date().toLocaleString('es-CO')
      }

      console.log('✅ Cotización aprobada con opciones seleccionadas')

    } else {
      // RE-COTIZACIÓN: Recopilar comentarios
      const groupedRows = getGroupedApprovalRows(approvalQuote.rows)
      const hasComments = Object.values(itemComments).some(comment => comment && comment.trim())
      
      if (!hasComments) {
        alert('Por favor añade comentarios específicos para orientar la re-cotización.')
        return
      }

      // Actualizar cotización con comentarios
      updatedQuote = {
        ...approvalQuote,
        status: 'revision_requested',
        itemComments: itemComments,
        revisionDate: new Date().toISOString(),
        revisionDateFormatted: new Date().toLocaleString('es-CO')
      }

      console.log('🔄 Re-cotización solicitada con comentarios')
    }
    
    try {
      // Guardar en base de datos (Firebase + IndexedDB)
      console.log('🔍 [DEBUG] Buscando cotización existente con ID:', approvalQuote.cotizacion_id)
      const existingQuote = await getCotizacionById(approvalQuote.cotizacion_id)
      console.log('📋 [DEBUG] Cotización encontrada:', existingQuote)
      
      if (existingQuote) {
        // ACTUALIZAR cotización existente - mantener el ID para evitar duplicados
        await saveCotizacion({
          id: existingQuote.id, // ✅ Mantener ID para actualizar, no crear nuevo
          ...existingQuote,
          ...updatedQuote,
          // Asegurar que no se pierdan campos críticos
          cotizacion_id: existingQuote.cotizacion_id,
          date: existingQuote.date,
          dateFormatted: existingQuote.dateFormatted,
          createdAt: existingQuote.createdAt,
          updatedAt: new Date().toISOString()
        })
        console.log('✅ Cotización existente actualizada con ID:', existingQuote.id)
      } else {
        await saveCotizacion(updatedQuote)
        console.log('✅ Nueva cotización creada')
      }
      
      console.log(`✅ Cotización ${approvalQuote.cotizacion_id} ${approved ? 'aprobada' : 'enviada a revisión'} - guardada en Firebase`)
      
      // Mostrar mensaje de éxito
      alert(approved 
        ? '✅ Cotización aprobada correctamente. El vendedor será notificado automáticamente.' 
        : '🔄 Solicitud de re-cotización enviada. El vendedor será notificado automáticamente.'
      )
      
    } catch (error) {
      console.error('❌ Error guardando estado:', error)
      alert('❌ Error al procesar la respuesta. Por favor intenta de nuevo.')
      return
    }
    
    // Limpiar estados
    setShowApprovalView(false)
    setApprovalQuote(null)
    setSelectedOptions({})
    setItemComments({})
  }

  // Función para exportar PDF DETALLADO con diseño intuitivo
  const exportToPDF = () => {
    if (!clienteName.trim()) {
      alert('Por favor ingresa el nombre del cliente antes de exportar')
      return
    }

    try {
      const doc = new jsPDF('portrait') // Formato vertical más limpio
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 15
      const cardWidth = pageWidth - (margin * 2)
      
      // Colores del tema
      const primary = [59, 130, 246]    // Azul
      const success = [34, 197, 94]     // Verde
      const warning = [245, 158, 11]    // Naranja
      const danger = [239, 68, 68]      // Rojo
      const gray = [107, 114, 128]      // Gris
      const lightGray = [248, 250, 252] // Gris claro
      
      // HEADER COMPACTO Y ELEGANTE
      doc.setFillColor(...primary)
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      // Título principal
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('COTIZACION INTERNA', 20, 15)
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('PARA APROBACION', 20, 25)
      
      // Info básica en header
      const currentDate = new Date().toLocaleDateString('es-CO')
      doc.setFontSize(10)
      doc.text(`${currentDate}`, pageWidth - 60, 15)
      doc.text(`TRM: $${trmGlobal?.toFixed(2) || 'N/A'}`, pageWidth - 60, 25)
      
      // TARJETA 1: INFORMACIÓN DEL PROYECTO
      let yPos = 50
      
      // Función helper para crear tarjetas
      const createCard = (x, y, width, height, title, color = primary) => {
        // Sombra
        doc.setFillColor(200, 200, 200)
        doc.rect(x + 1, y + 1, width, height, 'F')
        
        // Tarjeta principal
        doc.setFillColor(...lightGray)
        doc.rect(x, y, width, height, 'F')
        doc.setDrawColor(...color)
        doc.setLineWidth(0.5)
        doc.rect(x, y, width, height, 'S')
        
        // Header de la tarjeta
        doc.setFillColor(...color)
        doc.rect(x, y, width, 12, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(title, x + 5, y + 8)
      }
      
      // Tarjeta de información del proyecto
      createCard(margin, yPos, cardWidth, 55, 'INFORMACION DEL PROYECTO', primary)
      
      yPos += 18
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      doc.text(`Cliente: ${clienteName}`, margin + 5, yPos)
      yPos += 8
      doc.text(`Fecha: ${currentDate}`, margin + 5, yPos)
      yPos += 8
      
      // TRM en dos columnas
      doc.text(`TRM Usada: $${trmGlobal?.toFixed(2) || 'N/A'}`, margin + 5, yPos)
      doc.text(`TRM Oficial: $${oficialTRM?.toFixed(2) || 'N/A'}`, margin + 90, yPos)
      yPos += 8
      
      // Comparación de TRM
      if (oficialTRM && trmGlobal) {
        const diferenciaTRM = Math.abs(oficialTRM - trmGlobal)
        const porcentajeDif = ((diferenciaTRM / oficialTRM) * 100).toFixed(1)
        const esMayor = trmGlobal > oficialTRM ? 'MAYOR' : 'MENOR'
        const esAlerta = trmGlobal > oficialTRM
        
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...(esAlerta ? danger : success))
        doc.text(`${esAlerta ? 'ALERTA' : 'OK'}: Diferencia ${porcentajeDif}% ${esMayor}`, margin + 5, yPos)
      }
      
      yPos += 8
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...warning)
      doc.text('PENDIENTE DE APROBACION', margin + 5, yPos)
      
      // TARJETA 2: RESUMEN FINANCIERO (3 mini-tarjetas)
      yPos += 15
      const totalCostos = rows.reduce((sum, row) => sum + (row.costoTotal || 0), 0)
      const totalVentas = rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)
      const margenTotal = totalVentas - totalCostos
      const margenPorcentaje = totalCostos > 0 ? ((margenTotal / totalCostos) * 100) : 0
      
      // Mini-tarjetas financieras en fila
      const cardSmallWidth = (cardWidth - 20) / 3
      
      // Tarjeta COSTOS
      createCard(margin, yPos, cardSmallWidth, 35, 'COSTOS TOTALES', danger)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`$${totalCostos.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + 5, yPos + 25)
      
      // Tarjeta VENTAS
      createCard(margin + cardSmallWidth + 10, yPos, cardSmallWidth, 35, 'VENTAS TOTALES', primary)
      doc.text(`$${totalVentas.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + cardSmallWidth + 15, yPos + 25)
      
      // Tarjeta MARGEN
      const margenColor = margenPorcentaje > 20 ? success : margenPorcentaje > 10 ? warning : danger
      createCard(margin + (cardSmallWidth + 10) * 2, yPos, cardSmallWidth, 35, 'MARGEN', margenColor)
      doc.text(`${margenPorcentaje.toFixed(1)}%`, margin + (cardSmallWidth + 10) * 2 + 5, yPos + 20)
      doc.setFontSize(8)
      doc.text(`$${margenTotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + (cardSmallWidth + 10) * 2 + 5, yPos + 30)
      
      // TARJETA 3: PRODUCTOS (Una tarjeta por producto)
      yPos += 20
      
      // Función para crear tarjeta de producto
      const createProductCard = (product, index, y) => {
        const cardHeight = 45
        createCard(margin, y, cardWidth, cardHeight, `PRODUCTO ${index + 1}: ${product.mayorista || 'Sin proveedor'}`, primary)
        
        let cardY = y + 15
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        
        // Línea 1: Identificación
        doc.text(`Marca: ${product.marca || 'N/A'}`, margin + 5, cardY)
        doc.text(`Referencia: ${product.referencia || 'N/A'}`, margin + 70, cardY)
        doc.text(`Cantidad: ${product.cantidad || 1}`, margin + 120, cardY)
        cardY += 8
        
        // Línea 2: Costos - precios completos
        doc.text(`Costo COP: $${(product.costoCOP || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + 5, cardY)
        doc.text(`Costo + IVA: $${(product.costoConIva || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + 70, cardY)
        cardY += 8
        
        // Línea 3: Precios y margen
        doc.setFont('helvetica', 'bold')
        const margen = product.margen || 0
        const margenColor = margen > 30 ? success : margen > 15 ? warning : danger
        doc.setTextColor(...margenColor)
        doc.text(`Margen: ${margen.toFixed(1)}%`, margin + 5, cardY)
        
        doc.setTextColor(0, 0, 0)
        doc.text(`PVP Unitario: $${(product.pvpUnitario || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + 70, cardY)
        doc.setFont('helvetica', 'bold')
        doc.text(`PVP Total: $${(product.pvpTotal || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, margin + 140, cardY)
        
        return cardHeight + 10
      }
      
      // Mostrar solo los primeros productos para evitar páginas innecesarias
      const maxProductos = Math.min(rows.length, 6) // Máximo 6 productos
      
      for (let i = 0; i < maxProductos; i++) {
        if (yPos > pageHeight - 60) {
          doc.addPage()
          yPos = 30
        }
        
        const cardHeight = createProductCard(rows[i], i, yPos)
        yPos += cardHeight
      }
      
      // Si hay más productos, mostrar resumen
      if (rows.length > maxProductos) {
        const remainingProducts = rows.length - maxProductos
        createCard(margin, yPos, cardWidth, 25, `Y ${remainingProducts} PRODUCTOS MAS...`, gray)
        yPos += 35
      }
      
      // TARJETA 4: ANÁLISIS RÁPIDO
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = 30
      }
      
      createCard(margin, yPos, cardWidth, 50, 'ANALISIS RAPIDO DE RENTABILIDAD', warning)
      
      yPos += 18
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      // Análisis simplificado - solo productos principales
      const productosAnalisis = rows.slice(0, 3)
      productosAnalisis.forEach((row, index) => {
        const margen = row.margen || 0
        const indicador = margen > 30 ? 'EXCELENTE' : margen > 15 ? 'BUENO' : 'REVISAR'
        const color = margen > 30 ? success : margen > 15 ? warning : danger
        
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(`${indicador}`, margin + 5, yPos)
        
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.text(`Proveedor: ${row.mayorista || `Producto ${index + 1}`} - Margen: ${margen.toFixed(1)}%`, margin + 35, yPos)
        yPos += 8
      })
      
      if (rows.length > 3) {
        doc.setTextColor(...gray)
        doc.setFontSize(9)
        doc.text(`+ ${rows.length - 3} productos adicionales`, margin + 5, yPos)
      }
      
      // FOOTER COMPACTO DE APROBACIÓN
      yPos += 20
      if (yPos > pageHeight - 50) {
        doc.addPage()
        yPos = 30
      }
      
      createCard(margin, yPos, cardWidth, 35, 'APROBACION', success)
      
      yPos += 18
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('ESTADO: PENDIENTE DE APROBACION', margin + 5, yPos)
      
      yPos += 10
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Firma Jefe: ____________________', margin + 5, yPos)
      doc.text(`Fecha: ${currentDate}`, margin + 120, yPos)
      
      // Guardar el PDF
      const fileName = `Cotizacion_INTERNA_${clienteName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      console.log('✅ PDF REDISEÑADO exportado:', fileName)
      
    } catch (error) {
      console.error('Error exportando PDF:', error)
      alert('Error al generar el PDF')
    }
  }

  // Agregar nueva fila
  const addRow = () => {
    const newItem = rows.length + 1
    const newRow = {
      id: Date.now(),
      item: newItem,
      cantidad: 1,
      mayorista: '',
      marca: '',
      referencia: '',
      configuracion: '',
      costoUSD: 0,
      trm: trmGlobal,
      costoCOP: 0,
      ivaPercentCosto: 0,
      valorIvaCosto: 0,
      costoConIva: 0,
      costoTotal: 0,
      margen: 30,
      pvpUnitario: 0,
      ivaPercentPVP: 0,
      valorIvaPVP: 0,
      pvpMasIva: 0,
      pvpTotal: 0
    }
    setRows(prev => [...prev, calculateRow(newRow)])
    
    // En móvil, colapsar todos los items anteriores cuando se añade uno nuevo
    if (window.innerWidth < 1024) { // lg breakpoint
      const allCurrentIds = new Set(rows.map(row => row.id))
      setCollapsedItems(allCurrentIds)
    }
  }

  // Eliminar fila
  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id))
      // Remover del set de colapsados si existe
      setCollapsedItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // Funciones para manejar colapso de items en móvil
  const toggleItemCollapse = (id) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const expandAllItems = () => {
    setCollapsedItems(new Set())
  }

  const collapseAllItems = () => {
    const allIds = new Set(rows.map(row => row.id))
    setCollapsedItems(allIds)
  }

  // Calcular totales
  const totalVenta = rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)
  const diferenciasPresupuesto = totalVenta - parseNumber(presupuesto)

  // Hook para manejar input independiente - Solo guarda en onBlur
  const useIndependentInput = (initialValue, onSave) => {
    const [localValue, setLocalValue] = useState(initialValue || '')
    const isFocusedRef = useRef(false)
    
    // Solo actualizar desde el exterior si NO está enfocado
    useEffect(() => {
      if (!isFocusedRef.current) {
        setLocalValue(initialValue || '')
      }
    }, [initialValue])
    
    const handleChange = (value) => {
      // Solo actualizar estado local, NO guardar
      setLocalValue(value)
    }
    
    const handleFocus = () => {
      isFocusedRef.current = true
    }
    
    const handleBlur = () => {
      isFocusedRef.current = false
      // Solo guardar cuando se sale del campo
      onSave(localValue)
    }
    
    return [localValue, handleChange, handleFocus, handleBlur]
  }

  // Componente de celda editable independiente
  const EditableCell = ({ value, onChange, type = 'text', className = '', minWidth = '120px', multiline = false }) => {
    const [localValue, handleChange, handleFocus, handleBlur] = useIndependentInput(value, onChange)
    
    // Determinar alineación según el tipo
    const textAlign = type === 'text' ? 'left' : 'center'
    
    // Si está en modo solo lectura, mostrar solo el valor
    if (isReadOnlyMode) {
      return (
        <div
          style={{ 
            minWidth,
            width: '100%',
            padding: '4px 8px',
            textAlign,
            fontSize: '12px',
            lineHeight: multiline ? '1.3' : '1',
            minHeight: multiline ? '32px' : 'auto'
          }}
          className={cn(
            'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded overflow-visible',
            multiline ? 'whitespace-pre-wrap' : 'whitespace-nowrap',
            className
          )}
        >
          {value || '-'}
        </div>
      )
    }
    
    // Si es multiline, usar textarea
    if (multiline) {
      return (
        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
          rows={2}
          style={{ 
            minWidth,
            width: '100%',
            padding: '4px 8px',
            textAlign,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '12px',
            resize: 'none',
            lineHeight: '1.3',
            minHeight: '32px'
          }}
          className={cn('overflow-visible', className)}
        />
      )
    }
    
    return (
      <input
        type={type}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        style={{ 
          minWidth,
          width: '100%',
          padding: '4px 8px',
          textAlign,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: '12px'
        }}
        className={cn('overflow-visible whitespace-nowrap', className)}
      />
    )
  }

    // Componente de fila para desktop eliminado (integrado directamente en la tabla)


  // Componente de celda móvil mejorada con bordes - Memoizado para evitar re-renders
  const MobileCellWrapper = React.memo(({ label, children, className = "", colorClass = "" }) => (
    <div className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <label className={`block text-xs font-semibold mb-2 ${colorClass || 'text-gray-600 dark:text-gray-400'}`}>
        {label}
      </label>
      {children}
    </div>
  ))

  // Componente de input móvil específico - más estable
  const MobileEditableCell = React.memo(({ value, onChange, type = 'text', className = '' }) => {
    const [localValue, setLocalValue] = useState(value || '')
    const [isFocused, setIsFocused] = useState(false)
    
    // Actualizar valor local solo si no está enfocado
    useEffect(() => {
      if (!isFocused && value !== localValue) {
        setLocalValue(value || '')
      }
    }, [value, isFocused, localValue])
    
    const handleFocus = () => {
      setIsFocused(true)
    }
    
    const handleBlur = () => {
      setIsFocused(false)
      if (onChange && localValue !== value) {
        onChange(localValue)
      }
    }
    
    const handleChange = (e) => {
      setLocalValue(e.target.value)
    }
    
    return (
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        className={`w-full h-9 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
      />
    )
  })

  // Componente de card colapsado para móvil
  const CollapsedMobileCard = React.memo(({ row, index, onExpand }) => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-3 relative z-0"
    >
      <div 
        onClick={onExpand}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 relative z-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {row.item}
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {row.mayorista || `Item #${index + 1}`}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {row.marca} {row.referencia}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(row.pvpTotal)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Toca para expandir
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  ))

  // Componente de card para móvil mejorado - Memoizado
  const MobileCard = React.memo(({ row, index }) => (
    <motion.div
      key={row.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative z-0"
    >
      <Card className="mb-6 border-2 border-gray-200 dark:border-gray-700 shadow-xl relative z-0">
        <CardContent className="p-4 sm:p-6">
          {/* Header con gradiente */}
          <div className="flex justify-between items-center mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h3 className="font-bold text-xl text-blue-700 dark:text-blue-300">
              Item #{index + 1}
            </h3>
            <div className="flex items-center gap-2">
              {/* Botón colapsar - solo visible en móvil */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleItemCollapse(row.id)}
                className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-full lg:hidden"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
              {/* Botón eliminar */}
              {!isReadOnlyMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-full"
                disabled={rows.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
              )}
            </div>
          </div>
          
          {/* Sección 1: Identificación */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-l-4 border-blue-500 pl-2">
              📋 IDENTIFICACIÓN
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <MobileCellWrapper label="ITEM" colorClass="text-blue-600 dark:text-blue-400">
                <div className="text-center text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 py-2 rounded border border-blue-200 dark:border-blue-600">
                  {row.item}
                </div>
              </MobileCellWrapper>
              <MobileCellWrapper label="CANTIDAD" colorClass="text-green-600 dark:text-green-400">
                <MobileEditableCell 
                  type="number"
                  value={row.cantidad}
                  onChange={(value) => updateRow(row.id, 'cantidad', Math.max(1, parseNumber(value)))}
                  className="text-center font-bold"
                />
              </MobileCellWrapper>
            </div>
          </div>

          {/* Sección 2: Datos del Producto */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-l-4 border-purple-500 pl-2">
              🏷️ DATOS DEL PRODUCTO
            </h4>
            <div className="space-y-3">
              <MobileCellWrapper label="PROVEEDOR" colorClass="text-purple-600 dark:text-purple-400">
                <ProviderAutocomplete
                  value={row.mayorista}
                  onChange={(value, provider) => {
                    updateRow(row.id, 'mayorista', value)
                    // Aquí podrías guardar información adicional del proveedor si es necesario
                  }}
                  placeholder="Buscar proveedor..."
                  className="w-full"
                  showImage={true}
                />
              </MobileCellWrapper>
              
              <div className="grid grid-cols-2 gap-3">
                <MobileCellWrapper label="MARCA" colorClass="text-purple-600 dark:text-purple-400">
                  <MobileEditableCell 
                    value={row.marca}
                    onChange={(value) => updateRow(row.id, 'marca', value)}
                  />
                </MobileCellWrapper>
                <MobileCellWrapper label="REFERENCIA" colorClass="text-purple-600 dark:text-purple-400">
                  <MobileEditableCell 
                    value={row.referencia}
                    onChange={(value) => updateRow(row.id, 'referencia', value)}
                  />
                </MobileCellWrapper>
              </div>
              
              <MobileCellWrapper label="CONFIGURACIÓN" colorClass="text-purple-600 dark:text-purple-400">
                <MobileEditableCell 
                  value={row.configuracion}
                  onChange={(value) => updateRow(row.id, 'configuracion', value)}
                />
              </MobileCellWrapper>
            </div>
          </div>

          {/* Sección 3: Costos */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-l-4 border-orange-500 pl-2">
              💰 COSTOS
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MobileCellWrapper label="COSTO USD" colorClass="text-blue-600 dark:text-blue-400">
                  <MobileEditableCell 
                    type="number"
                    value={row.costoUSD}
                    onChange={(value) => updateRow(row.id, 'costoUSD', Math.max(0, parseNumber(value)))}
                    className="text-blue-600 dark:text-blue-400 font-mono font-bold"
                  />
                </MobileCellWrapper>
                <MobileCellWrapper label="TRM" colorClass="text-orange-600 dark:text-orange-400">
                  <MobileEditableCell 
                    type="number"
                    value={row.trm}
                    onChange={(value) => updateRow(row.id, 'trm', Math.max(0, parseNumber(value)))}
                    className="text-orange-600 dark:text-orange-400 font-mono font-bold"
                  />
                </MobileCellWrapper>
              </div>
              
              <MobileCellWrapper label="COSTO COP" className="bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600" colorClass="text-purple-700 dark:text-purple-300">
                <MobileEditableCell 
                  type="number"
                  value={row.costoCOP}
                  onChange={(value) => updateRow(row.id, 'costoCOP', Math.max(0, parseNumber(value)))}
                  className="text-center text-lg font-bold text-purple-600 dark:text-purple-400"
                />
              </MobileCellWrapper>
              
              <div className="grid grid-cols-2 gap-3">
                <MobileCellWrapper label="IVA COSTO (%)" colorClass="text-red-600 dark:text-red-400">
                  <MobileEditableCell 
                    type="number"
                    value={row.ivaPercentCosto}
                    onChange={(value) => updateRow(row.id, 'ivaPercentCosto', Math.max(0, parseNumber(value)))}
                    className="text-red-600 dark:text-red-400 font-bold"
                  />
                </MobileCellWrapper>
                <MobileCellWrapper label="VALOR IVA" colorClass="text-red-600 dark:text-red-400">
                  <div className="text-center font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 py-2 rounded border border-red-200 dark:border-red-600">
                    {formatCurrency(row.valorIvaCosto)}
                  </div>
                </MobileCellWrapper>
              </div>
              
              <MobileCellWrapper label="COSTO TOTAL" className="bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600" colorClass="text-orange-700 dark:text-orange-300">
                <div className="text-center text-lg font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 py-3 rounded border border-orange-200 dark:border-orange-600">
                  {formatCurrency(row.costoTotal)}
                </div>
              </MobileCellWrapper>
            </div>
          </div>

          {/* Sección 4: Precios de Venta */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-l-4 border-green-500 pl-2">
              💵 PRECIOS DE VENTA
            </h4>
            <div className="space-y-3">
              <MobileCellWrapper label="MARGEN (%)" colorClass="text-green-600 dark:text-green-400">
                <MobileEditableCell 
                  type="number"
                  value={row.margen}
                  onChange={(value) => updateRow(row.id, 'margen', Math.max(0, parseNumber(value)))}
                  className="text-green-600 dark:text-green-400 font-bold text-center"
                />
              </MobileCellWrapper>
              
              <MobileCellWrapper label="PVP UNITARIO" className="bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600" colorClass="text-green-700 dark:text-green-300">
                <div className="text-center text-lg font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 py-3 rounded border border-green-200 dark:border-green-600">
                  {formatCurrency(row.pvpUnitario)}
                </div>
              </MobileCellWrapper>
              
              <div className="grid grid-cols-2 gap-3">
                <MobileCellWrapper label="IVA PVP (%)" colorClass="text-blue-600 dark:text-blue-400">
                  <MobileEditableCell 
                    type="number"
                    value={row.ivaPercentPVP}
                    onChange={(value) => updateRow(row.id, 'ivaPercentPVP', Math.max(0, parseNumber(value)))}
                    className="text-blue-600 dark:text-blue-400 font-bold"
                  />
                </MobileCellWrapper>
                <MobileCellWrapper label="VALOR IVA PVP" colorClass="text-blue-600 dark:text-blue-400">
                  <div className="text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 py-2 rounded border border-blue-200 dark:border-blue-600">
                    {formatCurrency(row.valorIvaPVP)}
                  </div>
                </MobileCellWrapper>
              </div>
              
              <MobileCellWrapper label="PVP + IVA" colorClass="text-indigo-600 dark:text-indigo-400">
                <div className="text-center text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 py-3 rounded border border-indigo-200 dark:border-indigo-600">
                  {formatCurrency(row.pvpMasIva)}
                </div>
              </MobileCellWrapper>
              
              <MobileCellWrapper label="PVP TOTAL" className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-500 border-2" colorClass="text-green-700 dark:text-green-300">
                <div className="text-center text-xl font-black text-green-700 dark:text-green-300 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 py-4 rounded-lg shadow-inner border border-green-300 dark:border-green-600">
                  {formatCurrency(row.pvpTotal)}
                </div>
              </MobileCellWrapper>
            </div>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  ))

  // Renderizado condicional según el rol del usuario
  if (showUserManagement && isUserAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header para administradores */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Panel de Administrador
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userInfo?.displayName} - {roleInfo?.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowUserManagement(false)}
                className="text-sm"
              >
                Ver Cotizador
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              
              <Button variant="outline" onClick={logout} size="sm">
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        
        {/* Contenido del panel de administrador */}
        <div className="p-6">
          <UserManagement />
        </div>
        
        {/* Notificación Toast */}
        <NotificationToast
          notification={currentNotification}
          onClose={dismissCurrentNotification}
        />
      </div>
    )
  }

  // Renderizar panel de comprador
  if (isUserComprador()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header para compradores */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🛒</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Panel de Comprador
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userInfo?.displayName} - {roleInfo?.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              
              <Button variant="outline" onClick={logout} size="sm">
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        
        {/* Contenido del panel de comprador */}
        <BuyerPanel />
        
        {/* Notificación Toast */}
        <NotificationToast
          notification={currentNotification}
          onClose={dismissCurrentNotification}
        />
      </div>
    )
  }

  // Renderizar panel de revisor
  if (isUserRevisor()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header para revisores */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">✅</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Panel de Revisor
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userInfo?.displayName} - {roleInfo?.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              
              <Button variant="outline" onClick={logout} size="sm">
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        
        {/* Contenido del panel de revisor */}
        <RevisorPanel />
        
        {/* Notificación Toast */}
        <NotificationToast
          notification={currentNotification}
          onClose={dismissCurrentNotification}
        />
      </div>
    )
  }

  // Verificar si el usuario puede acceder al cotizador (solo vendedores)
  if (!canQuote() && userRole && !isUserAdmin() && !isUserComprador() && !isUserRevisor()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">{roleInfo?.icon || '👤'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {roleInfo?.name || 'Usuario'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {roleInfo?.description || 'Rol sin permisos de cotización'}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Tu rol actual no tiene permisos para crear cotizaciones. 
              Las funcionalidades específicas para tu rol estarán disponibles próximamente.
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            Cerrar Sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header Increíble - No fijo pero con diseño espectacular */}
      <div className="w-full px-4 py-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto">
          
          {/* Primera fila: Logo con gradiente + Tema */}
          <div className="flex items-center justify-between mb-6">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex-shrink-0"
            >
              📊 Cuadro de Costos
        {itemBasedMode && currentItem && !isReadOnlyMode && (
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2 block lg:inline">
            📦 {currentItem.name}
          </span>
        )}
        {isReadOnlyMode && editingQuote.status === 'approved' && (
          <span className="text-sm font-normal text-green-600 dark:text-green-400 ml-2 block lg:inline">
            ✅ Cotización Aprobada - Solo Lectura
          </span>
        )}
        {isReadOnlyMode && editingQuote.status === 'denied' && (
          <span className="text-sm font-normal text-red-600 dark:text-red-400 ml-2 block lg:inline">
            ❌ Cotización Denegada - Solo Lectura
          </span>
        )}
            </motion.h1>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300"
            >
              {theme === "light" ? 
                <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : 
                <Sun className="h-5 w-5 text-yellow-500" />
              }
            </Button>
          </div>

          {/* Segunda fila: Campos hermosos en grid responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            
            {/* Campo Cliente - Diseño hermoso */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200/60 dark:border-purple-700/60 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg"></div>
                <label className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Cliente
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <Input
                  type="text"
                  value={clienteName}
                  onChange={(e) => setClienteName(e.target.value)}
                  className="flex-1 h-9 text-sm font-medium bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-700 focus:border-purple-400 dark:focus:border-purple-500 text-purple-800 dark:text-purple-200 rounded-lg backdrop-blur-sm"
                  placeholder="Nombre del cliente"
                  autoComplete="off"
                />
              </div>
              
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-2 opacity-80">
                Para cotización
              </div>
            </motion.div>

            {/* TRM Global - Diseño hermoso */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-blue-200/60 dark:border-blue-700/60 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg"></div>
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  TRM Global
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <Input
                    id="trm-global"
                    name="trm-global"
                    type="number"
                    value={trmGlobal}
                    onChange={(e) => updateGlobalTRM(parseNumber(e.target.value))}
                    className="w-24 h-9 text-sm font-mono font-bold bg-white/80 dark:bg-gray-800/80 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500 text-blue-800 dark:text-blue-200 text-center rounded-lg backdrop-blur-sm"
                    placeholder="4200"
                    autoComplete="off"
                  />
                </div>
                
                <div className="text-lg">⚙️</div>
              </div>
              
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 opacity-80">
                Para cálculos
              </div>
            </motion.div>
            
            {/* TRM Oficial - Diseño hermoso */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200/60 dark:border-green-700/60 shadow-lg hover:shadow-xl transition-all duration-300 md:col-span-2 lg:col-span-1"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg animate-pulse"></div>
                <div className="text-sm font-semibold text-green-700 dark:text-green-300">
                  TRM Oficial
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇨🇴</span>
                  {trmLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-green-600 dark:text-green-400">Consultando...</span>
                    </div>
                  ) : trmError ? (
                    <div className="text-sm text-red-500 dark:text-red-400">
                      No disponible
                    </div>
                  ) : oficialTRM ? (
                    <div className="text-lg font-mono font-bold text-green-700 dark:text-green-300">
                      ${oficialTRM.toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Cargando...
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-green-600 dark:text-green-400 opacity-75">
                  datos.gov.co
                </div>
              </div>
              
              {lastTrmUpdate && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-2 opacity-75">
                  {lastTrmUpdate}
                </div>
              )}
            </motion.div>
          </div>

          {/* Tercera fila: Botones de acción hermosos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center gap-3"
          >
            
            {/* Botón Guardar */}
            <Button 
              onClick={saveQuote}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{editingQuote ? 'Actualizar' : 'Guardar'}</span>
            </Button>

            {/* Mensaje de éxito con estilo */}
            <AnimatePresence>
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm font-bold shadow-lg border border-green-200 dark:border-green-700"
                >
                  ✅ Guardado exitosamente
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón Exportar PDF */}
            <Button 
              onClick={() => exportToPDF()}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>

            {/* Botón Ver Cotizaciones */}
            <Button 
              onClick={() => setShowQuotesModal(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <div className="h-4 w-4 mr-2">📋</div>
              <span className="hidden sm:inline">Cotizaciones ({savedQuotes.length})</span>
              <span className="sm:hidden">({savedQuotes.length})</span>
            </Button>

            {/* Botón Gestionar Proveedores */}
            <Button 
              onClick={() => setShowProvidersModal(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <div className="h-4 w-4 mr-2">🏢</div>
              <span className="hidden sm:inline">Proveedores</span>
              <span className="sm:hidden">🏢</span>
            </Button>

            {/* Botón Enviar a Aprobación */}
            <Button 
              onClick={sendForApproval}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Enviar a Aprobación</span>
              <span className="sm:hidden">📤</span>
            </Button>

            {/* Botón Nuevo */}
            <Button 
              onClick={newQuote}
              variant="outline"
              className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>



            {/* Espaciador */}
            <div className="flex-1 hidden lg:block"></div>

            {/* Badge de estado */}
            {editingQuote ? (
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-700">
                <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                  ✏️ Editando: {editingQuote.clienteName}
                  {editingQuote.status && editingQuote.status !== 'draft' && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white dark:bg-gray-800">
                      {editingQuote.status === 'pending_approval' && '⏳ Pendiente'}
                      {editingQuote.status === 'approved' && '✅ Aprobada'}
                      {editingQuote.status === 'denied' && '❌ Rechazada'}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                {/* Indicador de conectividad */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                  isOnline 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700'
                    : 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isOnline 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    isOnline 
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {isOnline ? '🌐 Online' : '📱 Offline'}
                  </span>
                </div>

                {/* Indicador de sincronización */}
                {syncStats && (
                  <div 
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700 cursor-pointer"
                    onClick={isOnline ? forceSync : undefined}
                    title={isOnline ? 'Click para sincronizar' : 'Sin conexión'}
                  >
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {syncStats.pending > 0 
                        ? `📤 ${syncStats.pending} pendientes`
                        : `✅ ${syncStats.synced} sincronizadas`
                      }
                    </span>
                  </div>
                )}

                {/* Menú de Usuario */}
                <div className="flex items-center gap-4">
                  {/* Info del usuario */}
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {userInfo?.displayName?.charAt(0)?.toUpperCase() || userInfo?.email?.charAt(0)?.toUpperCase() || '👤'}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                      <div className="font-medium">{userInfo?.displayName || 'Usuario'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email}</div>
                    </div>
                  </div>

                  {/* Botón de cerrar sesión */}
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    title="Cerrar sesión"
                  >
                    <span className="hidden sm:inline">👋 Salir</span>
                    <span className="sm:hidden">👋</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Dashboard de Estado de Cotizaciones */}
      {savedQuotes.length > 0 && (
        <motion.div
          className="w-full px-4 pt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📊 Estado de Cotizaciones</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total */}
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{savedQuotes.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
              
              {/* Pendientes */}
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {savedQuotes.filter(q => q.status === 'pending_approval').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">⏳ Pendientes</div>
              </div>
              
              {/* Aprobadas */}
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {savedQuotes.filter(q => q.status === 'approved').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">✅ Aprobadas</div>
              </div>
              
              {/* Rechazadas */}
              <div className="text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {savedQuotes.filter(q => q.status === 'denied').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">❌ Rechazadas</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Resumen de Aprobación - Solo para cotizaciones aprobadas/denegadas */}
      {isReadOnlyMode && (() => {
        const summary = getApprovalSummary()
        if (!summary) return null

        return (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mx-4 mb-6 p-6 rounded-xl shadow-xl border-2 ${
              editingQuote.status === 'approved' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-700'
            }`}
          >
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${
                editingQuote.status === 'approved' 
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {editingQuote.status === 'approved' ? '✅ RESUMEN DE APROBACIÓN' : '❌ RESUMEN DE DENEGACIÓN'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {editingQuote.approvalDateFormatted || editingQuote.revisionDateFormatted}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Opciones Aprobadas */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                  ✅ Aprobadas
                </h3>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {summary.approved.count}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">opciones</div>
                  <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(summary.approved.total)}
                  </div>
                </div>
              </div>

              {/* Opciones Rechazadas */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                  ❌ No Aprobadas
                </h3>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary.rejected.count}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">opciones</div>
                  <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                    {formatCurrency(summary.rejected.total)}
                  </div>
                </div>
              </div>

              {/* Total y Ahorro */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  💰 Resumen
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Original:</span>
                    <div className="font-semibold text-gray-700 dark:text-gray-300">
                      {formatCurrency(summary.originalTotal)}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Aprobado:</span>
                    <div className="font-bold text-lg text-green-600 dark:text-green-400">
                      {formatCurrency(summary.approved.total)}
                    </div>
                  </div>
                  {summary.savings > 0 && (
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Ahorro:</span>
                      <div className="font-semibold text-orange-600 dark:text-orange-400">
                        -{formatCurrency(summary.savings)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })()}

      {/* Contenido Principal */}
      <div className="w-full px-1 py-4">
        <Card className="shadow-xl border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm w-full overflow-visible">
          <CardContent className="p-2 overflow-visible">
                        {/* Tabla Desktop Optimizada - Todas las columnas visibles */}
            <div className="hidden lg:block overflow-x-auto overflow-y-visible">
              <table className="w-full text-xs leading-tight" style={{tableLayout: 'auto', minWidth: '1500px'}}>
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    {/* Todas las columnas optimizadas */}
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">ITEM</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">CANT.</th>
                    <th className="p-1 text-left font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">PROVEEDOR</th>
                    
                    {/* Todas las columnas con tamaño reducido */}
                    <th className="p-1 text-left font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">MARCA</th>
                    <th className="p-1 text-left font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">REF.</th>
                    <th className="p-1 text-left font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">CONFIG.</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">USD</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">+USD</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">TRM</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">COP</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">IVA%</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">V.IVA</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">C+IVA</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">C.TOT</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">MAR%</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">PVP.U</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">IVA%</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">V.IVA</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">PVP+I</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">TOTAL</th>
                    <th className="p-1 text-center font-semibold text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">ACC</th>
                  </tr>
                </thead>
                <tbody>
                  {getGroupedRows().map((group, groupIndex) => (
                    <React.Fragment key={group.item.id}>
                      {/* Header del ítem */}
                      <tr className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-700">
                        <td colSpan="17" className="p-4 font-semibold text-blue-800 dark:text-blue-200 text-sm border border-gray-300 dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span className="font-bold">{group.item.name}</span>
                            {group.item.description && (
                              <span className="text-blue-600 dark:text-blue-300 font-normal">
                                - {group.item.description}
                              </span>
                            )}
                            <span className="ml-auto flex items-center gap-3">
                              <span className="text-xs text-blue-600 dark:text-blue-400">
                                {group.options.length} opción{group.options.length !== 1 ? 'es' : ''}
                              </span>
                              {!isReadOnlyMode && (
                                <button
                                  onClick={() => addNewItemOption(group.item)}
                                  className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-md"
                                  title={`Añadir opción para: ${group.item.name}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Opciones del ítem */}
                      {group.options.map((row, optionIndex) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30" style={{minHeight: '40px'}}>
                      {/* Todas las columnas optimizadas */}
                      <td className="p-0.5 text-center font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        {row.item}
                      </td>
                      <td className="p-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="number"
                          value={row.cantidad}
                          onChange={(value) => updateRow(row.id, 'cantidad', Math.max(1, parseNumber(value)))}
                          minWidth="60px"
                        />
                      </td>
                      <td className="p-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                        <ProviderAutocomplete
                          value={row.mayorista}
                          onChange={(value, provider) => {
                            updateRow(row.id, 'mayorista', value)
                            // Aquí podrías guardar información adicional del proveedor si es necesario
                          }}
                          placeholder="Proveedor..."
                          className="w-full min-w-[150px] whitespace-nowrap"
                          showImage={true}
                          maxSuggestions={3}
                        />
                      </td>
                      
                      {/* Todas las columnas con padding reducido */}
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="text"
                          value={row.marca}
                          onChange={(value) => updateRow(row.id, 'marca', value)}
                          minWidth="120px"
                          className="whitespace-nowrap"
                        />
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{minHeight: '40px', verticalAlign: 'top'}}>
                        <EditableCell 
                          type="text"
                          value={row.referencia}
                          onChange={(value) => updateRow(row.id, 'referencia', value)}
                          minWidth="150px"
                          multiline={true}
                        />
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{minHeight: '40px', verticalAlign: 'top'}}>
                        <EditableCell 
                          type="text"
                          value={row.configuracion}
                          onChange={(value) => updateRow(row.id, 'configuracion', value)}
                          minWidth="200px"
                          multiline={true}
                        />
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="number"
                          value={row.costoUSD}
                          onChange={(value) => updateRow(row.id, 'costoUSD', Math.max(0, parseNumber(value)))}
                          minWidth="80px"
                        />
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        {!isReadOnlyMode ? (
                          <button
                            onClick={() => openAdditionalCostsModal(row)}
                            className="w-full h-full min-h-[28px] text-xs bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 text-green-700 dark:text-green-400 hover:from-green-100 hover:to-blue-100 dark:hover:from-green-900/30 dark:hover:to-blue-900/30 border border-green-300 dark:border-green-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 font-medium shadow-sm hover:shadow-md"
                            title="Añadir/Gestionar costos adicionales"
                          >
                            {(row.additionalCosts && row.additionalCosts.length > 0) ? (
                              <div className="flex flex-col items-center leading-tight">
                                <span className="text-xs">💰 {row.additionalCosts.length}</span>
                                <span className="text-xs font-bold">
                                  {row.additionalCostUSD > 0 ? `+$${row.additionalCostUSD.toFixed(0)}` : '+$0'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Plus className="w-3 h-3" />
                                <span>Costo</span>
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="text-center">
                            {(row.additionalCosts && row.additionalCosts.length > 0) ? (
                              <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                                <span className="text-xs">💰 {row.additionalCosts.length}</span>
                                <span className="text-xs font-bold">
                                  +${row.additionalCostUSD.toFixed(0)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="number"
                          value={row.trm}
                          onChange={(value) => updateRow(row.id, 'trm', Math.max(0, parseNumber(value)))}
                          minWidth="80px"
                        />
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.costoCOP)}
                        </span>
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="number"
                          value={row.ivaPercentCosto}
                          onChange={(value) => updateRow(row.id, 'ivaPercentCosto', Math.max(0, parseNumber(value)))}
                          minWidth="50px"
                        />
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.valorIvaCosto)}
                        </span>
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.costoConIva)}
                        </span>
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.costoTotal)}
                        </span>
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="number"
                          value={row.margen}
                          onChange={(value) => updateRow(row.id, 'margen', Math.max(0, parseNumber(value)))}
                          minWidth="50px"
                        />
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-green-700 dark:text-green-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.pvpUnitario)}
                        </span>
                      </td>
                      <td className="p-0.5 border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        <EditableCell 
                          type="number"
                          value={row.ivaPercentPVP}
                          onChange={(value) => updateRow(row.id, 'ivaPercentPVP', Math.max(0, parseNumber(value)))}
                          minWidth="50px"
                        />
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-green-700 dark:text-green-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.valorIvaPVP)}
                        </span>
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-semibold text-green-700 dark:text-green-300 text-xs leading-none whitespace-nowrap">
                          {formatCurrency(row.pvpMasIva)}
                        </span>
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 min-w-[100px]" style={{verticalAlign: 'top'}}>
                        <span className="font-bold text-xs text-green-700 dark:text-green-300 leading-none whitespace-nowrap">
                          {formatCurrency(row.pvpTotal)}
                        </span>
                      </td>
                      <td className="p-0.5 text-center border border-gray-300 dark:border-gray-600" style={{verticalAlign: 'top'}}>
                        {!isReadOnlyMode && (
                        <button
                          onClick={() => deleteRow(row.id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs transition-colors leading-none"
                        >
                          ❌
                        </button>
                        )}
                      </td>
                    </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
                
                {/* Espaciado normal */}
                <div className="h-6"></div>
                
                {/* Pie de tabla con totales */}
                <div className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex justify-between items-center z-1 mt-4">
                  <div className="text-right font-bold text-lg">
                    TOTAL VENTA: <span className="text-green-600 dark:text-green-400 text-xl">{formatCurrency(totalVenta)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">PRESUPUESTO:</span>
                    <Input
                      id="presupuesto-global"
                      name="presupuesto-global"
                      type="number"
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(parseNumber(e.target.value))}
                      className="w-32"
                      placeholder="0"
                      autoComplete="off"
                    />
                    {presupuesto > 0 && (
                      <span className={cn(
                        "font-bold",
                        totalVenta <= presupuesto ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {formatCurrency(presupuesto - totalVenta)}
                      </span>
                    )}
                  </div>
                </div>


            {/* Cards Mobile con colapso */}
            <div className="lg:hidden relative z-0">
              {/* Botones de control de colapso */}
              {rows.length > 1 && (
                <div className="mb-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAllItems}
                    className="text-xs"
                  >
                    Expandir Todo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAllItems}
                    className="text-xs"
                  >
                    Colapsar Todo
                  </Button>
                </div>
              )}
              
              <AnimatePresence>
                {getGroupedRows().map((group, groupIndex) => (
                  <div key={group.item.id} className="mb-6">
                    {/* Header del ítem en móvil */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <h3 className="font-bold text-blue-800 dark:text-blue-200 text-base">
                            {group.item.name}
                          </h3>
                          {group.item.description && (
                            <p className="text-blue-600 dark:text-blue-300 text-sm">
                              {group.item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                            {group.options.length} opción{group.options.length !== 1 ? 'es' : ''}
                          </span>
                          {!isReadOnlyMode && (
                            <button
                              onClick={() => addNewItemOption(group.item)}
                              className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-md"
                              title={`Añadir opción para: ${group.item.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Opciones del ítem */}
                    {group.options.map((row, optionIndex) => {
                  const isCollapsed = collapsedItems.has(row.id)
                  
                  if (isCollapsed) {
                    return (
                      <CollapsedMobileCard 
                        key={`collapsed-${row.id}`}
                        row={row} 
                            index={optionIndex}
                        onExpand={() => toggleItemCollapse(row.id)}
                      />
                    )
                  }
                  
                  return (
                        <MobileCard key={row.id} row={row} index={optionIndex} />
                  )
                })}
                  </div>
                ))}
              </AnimatePresence>
              
              {/* Espaciado normal móvil */}
              <div className="h-8"></div>
              
              {/* Resumen Mobile */}
              <Card className="bg-gray-50 dark:bg-gray-800 border-2 mt-4">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-lg font-bold mb-2">TOTAL VENTA</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">
                      {formatCurrency(totalVenta)}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">PRESUPUESTO</label>
                      <Input
                        id="presupuesto-mobile"
                        name="presupuesto-mobile"
                        type="number"
                        value={presupuesto}
                        onChange={(e) => setPresupuesto(parseNumber(e.target.value))}
                        placeholder="Ingrese presupuesto"
                        autoComplete="off"
                      />
                      {presupuesto > 0 && (
                        <div className={cn(
                          "font-bold text-lg",
                          diferenciasPresupuesto >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          Diferencia: {diferenciasPresupuesto >= 0 ? '+' : ''}{formatCurrency(diferenciasPresupuesto)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

                {/* Botón flotante - Solo si no está en modo solo lectura */}
        {!isReadOnlyMode && (
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
              onClick={itemBasedMode ? addNewItem : addRow}
            size="icon"
              className={`h-14 w-14 rounded-full shadow-lg ${
                itemBasedMode
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              }`}
              title={itemBasedMode ? "Añadir nuevo producto" : "Agregar nueva fila"}
            >
              {itemBasedMode ? <Package className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </Button>
        </motion.div>
        )}
      </div>



      {/* Vista de Aprobación */}
      <AnimatePresence>
        {showApprovalView && approvalQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 z-50 overflow-auto"
          >
            <div className="min-h-screen">
              {/* Header Moderno */}
                <motion.div
                initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative bg-white/10 backdrop-blur-md border-b border-white/20 p-4 lg:p-6"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Título Principal */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white">
                          Panel de Aprobación
                    </h1>
                        <p className="text-blue-200 text-sm lg:text-base">
                          Revisa y decide sobre esta cotización
                    </p>
                        </div>
                        </div>

                    {/* Información Rápida */}
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                        <div className="text-xs text-blue-200">ID</div>
                        <div className="font-mono font-semibold text-white text-sm">
                          {approvalQuote.cotizacion_id.split('-')[1]?.slice(0, 8) || approvalQuote.cotizacion_id}
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                        <div className="text-xs text-blue-200">Vendedor</div>
                        <div className="font-semibold text-white text-sm">
                          {approvalQuote.vendorName || 'No especificado'}
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                        <div className="text-xs text-blue-200">Cliente</div>
                        <div className="font-semibold text-white text-sm">
                          {approvalQuote.clienteName}
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-400/30">
                        <div className="text-xs text-green-200">Total</div>
                        <div className="font-bold text-green-300 text-sm">
                          {formatCurrency(approvalQuote.totalGeneral)}
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

              {/* Contenido Principal */}
              <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
                {/* Productos con opciones para selección */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    📊 Detalles de la Cotización
                  </h2>
                  
                  {/* Información general */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                      <span className="text-sm text-blue-600 dark:text-blue-400">📅 Fecha</span>
                      <div className="font-semibold">{approvalQuote.dateFormatted}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                      <span className="text-sm text-purple-600 dark:text-purple-400">💱 TRM Utilizada</span>
                      <div className="font-semibold">{approvalQuote.trmGlobal.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                      <span className="text-sm text-green-600 dark:text-green-400">💱 TRM Oficial</span>
                      <div className="font-semibold">{approvalQuote.trmOficial ? approvalQuote.trmOficial.toLocaleString() : 'N/A'}</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg">
                      <span className="text-sm text-orange-600 dark:text-orange-400">📦 Items</span>
                      <div className="font-semibold">{approvalQuote.rows.length}</div>
                    </div>
                  </div>

                  {/* Productos con opciones para selección */}
                  <div className="space-y-6">
                    {getGroupedApprovalRows(approvalQuote.rows).map((group, groupIndex) => (
                      <motion.div 
                        key={group.item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groupIndex * 0.1 }}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
                      >
                        {/* Header del producto mejorado */}
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm p-4 lg:p-6 border-b border-white/10">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Package className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white text-lg lg:text-xl">
                                  {group.item.name}
                                </h3>
                                {group.item.description && (
                                  <p className="text-blue-200 text-sm lg:text-base">
                                    {group.item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-500/20 backdrop-blur-sm text-blue-200 px-3 py-1 rounded-full text-sm font-medium border border-blue-400/30">
                                {group.options.length} opción{group.options.length !== 1 ? 'es' : ''}
                              </span>
                              {selectedOptions[group.item.id] && (
                                <span className="bg-green-500/20 backdrop-blur-sm text-green-200 px-3 py-1 rounded-full text-sm font-medium border border-green-400/30 flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  Seleccionado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Opciones del producto */}
                        <div className="p-2 lg:p-4 space-y-3">
                          {group.options.map((row, optionIndex) => (
                            <motion.div
                              key={row.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: (groupIndex * 0.1) + (optionIndex * 0.05) }}
                              className={`relative cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${
                                selectedOptions[group.item.id] === row.id
                                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 shadow-lg shadow-green-500/20'
                                  : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20'
                              }`}
                              onClick={() => setSelectedOptions(prev => ({
                                ...prev,
                                [group.item.id]: row.id
                              }))}
                            >
                              {/* Indicador de selección */}
                              {selectedOptions[group.item.id] === row.id && (
                                <div className="absolute top-3 right-3 z-10">
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}

                              <div className="p-4 lg:p-6">
                                {/* Header de la opción */}
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                                  {/* Logo del proveedor mejorado */}
                                  <div className="flex-shrink-0">
                                    {(() => {
                                      const providerInfo = getProviderInfo(row.mayorista)
                                      return (
                                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden border-2 border-white/20 bg-white shadow-lg">
                                          <img
                                            src={providerInfo?.imageUrl || `https://via.placeholder.com/80x80?text=${encodeURIComponent(row.mayorista || 'N/A')}`}
                                            alt={row.mayorista || 'Proveedor'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.src = `https://via.placeholder.com/80x80?text=${encodeURIComponent(row.mayorista || 'N/A')}`
                                            }}
                                          />
                                        </div>
                                      )
                                    })()}
                                  </div>

                                  {/* Información principal */}
                                  <div className="flex-1">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                                      <div>
                                        <h4 className="font-bold text-white text-lg">
                                          {row.mayorista || 'Sin proveedor'}
                                        </h4>
                                        <p className="text-blue-200 text-sm">
                                          {row.marca} {row.referencia}
                                        </p>
                                        {row.configuracion && row.configuracion !== `${row.marca} ${row.referencia}` && (
                                          <p className="text-blue-300 text-xs mt-1 italic">
                                            📝 {row.configuracion}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-2xl text-green-300">
                                          {formatCurrency(row.pvpTotal)}
                                        </div>
                                        <div className="text-green-200 text-sm">
                                          ${row.costoUSD?.toLocaleString() || '0'} USD
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Desglose Financiero Completo */}
                                <div className="space-y-4">
                                  {/* Información básica */}
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="text-xs text-blue-200">Cantidad</div>
                                      <div className="font-semibold text-white">{row.cantidad}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="text-xs text-blue-200">TRM Utilizada</div>
                                      <div className="font-semibold text-white">${row.trm?.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="text-xs text-blue-200">Margen Aplicado</div>
                                      <div className="font-semibold text-white">{row.margen}%</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="text-xs text-blue-200">IVA PVP</div>
                                      <div className="font-semibold text-white">{row.ivaPercentPVP}%</div>
                                    </div>
                                  </div>

                                  {/* Desglose de Costos */}
                                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                      </svg>
                                      Desglose de Costos y Precios
                                    </h5>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {/* Columna de Costos */}
                                      <div className="space-y-3">
                                        <div className="text-xs font-medium text-orange-200 mb-2">💰 ESTRUCTURA DE COSTOS</div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">Costo Base USD:</span>
                                          <span className="font-semibold text-white">${row.costoUSD?.toLocaleString() || '0'}</span>
                                        </div>

                                        {/* Mostrar costos adicionales si existen */}
                                        {row.additionalCosts && row.additionalCosts.length > 0 && (
                                          <div className="bg-orange-500/10 rounded-lg p-2 border border-orange-400/20 my-2">
                                            <div className="text-xs font-medium text-orange-200 mb-2">
                                              💰 COSTOS ADICIONALES ({row.additionalCosts.length})
                                            </div>
                                            {row.additionalCosts.map((cost, costIndex) => (
                                              <div key={cost.id || costIndex} className="flex justify-between items-start py-1 text-xs">
                                                <div className="flex-1 pr-2">
                                                  <div className="text-orange-200">{cost.description}</div>
                                                  {cost.includeIVA && (
                                                    <div className="text-orange-300 text-xs">+ IVA incluido</div>
                                                  )}
                                                </div>
                                                <div className="text-orange-100 font-semibold">
                                                  {cost.currency === 'USD' 
                                                    ? `$${cost.valueUSD?.toLocaleString() || '0'} USD`
                                                    : `${formatCurrency(cost.valueCOP || 0)}`
                                                  }
                                                </div>
                                              </div>
                                            ))}
                                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-orange-400/20">
                                              <span className="text-xs font-medium text-orange-200">Total Adicionales USD:</span>
                                              <span className="font-bold text-orange-100">
                                                +${row.additionalCostUSD?.toFixed(2) || '0.00'}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">Costo Total USD:</span>
                                          <span className="font-semibold text-white">
                                            ${((row.costoUSD || 0) + (row.additionalCostUSD || 0)).toLocaleString()}
                                          </span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">Costo COP (TRM):</span>
                                          <span className="font-semibold text-white">{formatCurrency(row.costoCOP || 0)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">IVA Costo ({row.ivaPercentCosto}%):</span>
                                          <span className="font-semibold text-white">{formatCurrency(row.valorIvaCosto || 0)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b-2 border-orange-400/30">
                                          <span className="text-sm font-medium text-orange-200">Costo Total + IVA:</span>
                                          <span className="font-bold text-orange-300">{formatCurrency(row.costoConIva || 0)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2">
                                          <span className="text-sm font-medium text-orange-200">Costo Final (x{row.cantidad}):</span>
                                          <span className="font-bold text-lg text-orange-300">{formatCurrency(row.costoTotal || 0)}</span>
                                        </div>
                                      </div>

                                      {/* Columna de Precios de Venta */}
                                      <div className="space-y-3">
                                        <div className="text-xs font-medium text-green-200 mb-2">💵 PRECIO DE VENTA</div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">PVP Unitario:</span>
                                          <span className="font-semibold text-white">{formatCurrency(row.pvpUnitario || 0)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">Margen Aplicado:</span>
                                          <span className="font-semibold text-green-300">+{row.margen}%</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                                          <span className="text-xs text-blue-200">IVA PVP ({row.ivaPercentPVP}%):</span>
                                          <span className="font-semibold text-white">{formatCurrency(row.valorIvaPVP || 0)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2 border-b-2 border-green-400/30">
                                          <span className="text-sm font-medium text-green-200">PVP + IVA Unitario:</span>
                                          <span className="font-bold text-green-300">{formatCurrency(row.pvpMasIva || 0)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-2">
                                          <span className="text-sm font-medium text-green-200">Precio Final (x{row.cantidad}):</span>
                                          <span className="font-bold text-xl text-green-300">{formatCurrency(row.pvpTotal || 0)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Resumen de Rentabilidad */}
                                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-400/20">
                                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                                        <div className="text-xs font-medium text-blue-200">💹 RENTABILIDAD:</div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-xs text-blue-200">
                                            Ganancia Bruta: 
                                            <span className="font-bold text-blue-300 ml-1">
                                              {formatCurrency((row.pvpTotal || 0) - (row.costoTotal || 0))}
                                            </span>
                                          </span>
                                          <span className="text-xs text-blue-200">
                                            ROI: 
                                            <span className="font-bold text-blue-300 ml-1">
                                              {row.costoTotal > 0 ? (((row.pvpTotal - row.costoTotal) / row.costoTotal) * 100).toFixed(1) : 0}%
                                            </span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                  </div>
                </motion.div>
                          ))}
                        </div>

                        {/* Resumen Comparativo */}
                        {group.options.length > 1 && (
                          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-t border-white/10 p-4 lg:p-6">
                            <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Comparación de Opciones
                            </h5>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Opción más económica */}
                              {(() => {
                                const cheapest = group.options.reduce((prev, current) => 
                                  (prev.pvpTotal < current.pvpTotal) ? prev : current
                                )
                                return (
                                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-400/20">
                                    <div className="text-xs font-medium text-green-200 mb-1">💰 MÁS ECONÓMICA</div>
                                    <div className="font-semibold text-green-300">{cheapest.mayorista}</div>
                                    <div className="text-xl font-bold text-green-300">{formatCurrency(cheapest.pvpTotal)}</div>
                                    <div className="text-xs text-green-200">Ahorro vs más cara: {formatCurrency(Math.max(...group.options.map(o => o.pvpTotal)) - cheapest.pvpTotal)}</div>
                                  </div>
                                )
                              })()}

                              {/* Mejor margen */}
                              {(() => {
                                const bestMargin = group.options.reduce((prev, current) => 
                                  (prev.margen > current.margen) ? prev : current
                                )
                                return (
                                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/20">
                                    <div className="text-xs font-medium text-blue-200 mb-1">📈 MEJOR MARGEN</div>
                                    <div className="font-semibold text-blue-300">{bestMargin.mayorista}</div>
                                    <div className="text-xl font-bold text-blue-300">{bestMargin.margen}%</div>
                                    <div className="text-xs text-blue-200">Ganancia: {formatCurrency((bestMargin.pvpTotal || 0) - (bestMargin.costoTotal || 0))}</div>
                                  </div>
                                )
                              })()}

                              {/* Promedio del grupo */}
                              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/20">
                                <div className="text-xs font-medium text-purple-200 mb-1">📊 PROMEDIO GRUPO</div>
                                <div className="font-semibold text-purple-300">{group.options.length} opciones</div>
                                <div className="text-xl font-bold text-purple-300">
                                  {formatCurrency(group.options.reduce((sum, opt) => sum + opt.pvpTotal, 0) / group.options.length)}
                                </div>
                                <div className="text-xs text-purple-200">
                                  Rango: {formatCurrency(Math.min(...group.options.map(o => o.pvpTotal)))} - {formatCurrency(Math.max(...group.options.map(o => o.pvpTotal)))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Área de comentarios por producto mejorada */}
                        <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 p-4 lg:p-6">
                          <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            Comentarios para {group.item.name}
                          </label>
                          <textarea
                            value={itemComments[group.item.id] || ''}
                            onChange={(e) => setItemComments(prev => ({
                              ...prev,
                              [group.item.id]: e.target.value
                            }))}
                            placeholder="Deja comentarios específicos para este producto (opcional)..."
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-200 resize-none transition-all duration-200"
                            rows={3}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Resumen de Selección Mejorado */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 lg:p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      Resumen de Selección
                  </h2>
                  </div>
                  
                  {Object.keys(selectedOptions).length > 0 ? (
                    <div className="space-y-3">
                      {getGroupedApprovalRows(approvalQuote.rows).map((group) => {
                        const selectedRowId = selectedOptions[group.item.id]
                        const selectedRow = group.options.find(row => row.id === selectedRowId)
                        
                        return (
                          <div key={group.item.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-medium">{group.item.name}:</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {selectedRow ? `${selectedRow.mayorista} - ${formatCurrency(selectedRow.pvpTotal)}` : 'No seleccionado'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-800 dark:text-blue-200">Total Seleccionado:</span>
                          <span className="font-bold text-xl text-green-600 dark:text-green-400">
                            {formatCurrency(
                              Object.entries(selectedOptions).reduce((total, [itemId, rowId]) => {
                                const group = getGroupedApprovalRows(approvalQuote.rows).find(g => g.item.id === itemId)
                                const selectedRow = group?.options.find(row => row.id === rowId)
                                return total + (selectedRow?.pvpTotal || 0)
                              }, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      ⚠️ Selecciona al menos una opción de cada producto para continuar
                    </div>
                  )}
                </motion.div>

                {/* Botones de Decisión Mejorados */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 lg:p-8"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      ¿Cuál es tu decisión?
                    </h2>
                    <p className="text-blue-200">
                      Revisa las opciones seleccionadas y toma una decisión
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Botón Aprobar */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="space-y-4"
                    >
                      <Button
                        onClick={() => handleApproval(true)}
                        disabled={Object.keys(selectedOptions).length === 0}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg lg:text-xl py-6 lg:py-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          APROBAR COTIZACIÓN
                        </div>
                      </Button>
                      <div className="text-center text-sm text-green-200 bg-green-500/10 backdrop-blur-sm rounded-lg p-3 border border-green-400/20">
                        ✅ Las opciones seleccionadas serán aprobadas y el vendedor será notificado automáticamente
                      </div>
                    </motion.div>

                    {/* Botón Re-cotización */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="space-y-4"
                    >
                      <Button
                        onClick={() => handleApproval(false)}
                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-lg lg:text-xl py-6 lg:py-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 font-bold"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          SOLICITAR RE-COTIZACIÓN
                        </div>
                      </Button>
                      <div className="text-center text-sm text-orange-200 bg-orange-500/10 backdrop-blur-sm rounded-lg p-3 border border-orange-400/20">
                        🔄 Los comentarios serán enviados para ajustar la cotización
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vista de Cotizaciones Guardadas */}
      <AnimatePresence>
        {showSavedQuotes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
          >
            {/* Header de Cotizaciones Guardadas */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">📋 Cotizaciones Guardadas</h2>
                  <p className="text-purple-100">Gestiona tus cotizaciones guardadas: ver, editar, duplicar o eliminar</p>
                </div>
                <Button
                  onClick={() => setShowSavedQuotes(false)}
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  size="sm"
                >
                  ✕ Cerrar
                </Button>
              </div>
            </div>

            {/* Contenido de Cotizaciones */}
            <div className="p-6">
              {savedQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No hay cotizaciones guardadas
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    Crea tu primera cotización y haz clic en "Guardar" para verla aquí
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {savedQuotes.map((quote) => (
                    <motion.div
                      key={quote.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      {/* Header de la tarjeta */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-4 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 truncate">
                          👤 {quote.clienteName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                          🆔 {quote.cotizacion_id}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📅 {quote.dateFormatted}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          💰 Total: {formatCurrency(quote.totalGeneral)}
                        </p>
                        {quote.status && (
                          <div className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                            quote.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            quote.status === 'denied' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            quote.status === 'pending_approval' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {quote.status === 'approved' ? '✅ Aprobada' :
                             quote.status === 'denied' ? '❌ Denegada' :
                             quote.status === 'pending_approval' ? '⏳ Pendiente' :
                             '📝 Borrador'}
                          </div>
                        )}
                      </div>

                      {/* Detalles de la cotización */}
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">📦 Items:</span>
                            <span className="ml-1 font-semibold">{quote.rows.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">💱 TRM:</span>
                            <span className="ml-1 font-semibold">{quote.trmGlobal.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => loadQuote(quote)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs h-8"
                            size="sm"
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            onClick={() => exportQuotePDF(quote)}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-xs h-8"
                            size="sm"
                          >
                            📄 PDF
                          </Button>
                          <Button
                            onClick={() => duplicateQuote(quote)}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs h-8"
                            size="sm"
                          >
                            📋 Duplicar
                          </Button>
                          <Button
                            onClick={() => deleteQuote(quote.id)}
                            variant="outline"
                            className="border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-8"
                            size="sm"
                          >
                            🗑️ Eliminar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Cotizaciones Guardadas */}
      <SavedQuotesModal
        isOpen={showQuotesModal}
        onClose={() => setShowQuotesModal(false)}
        savedQuotes={savedQuotes}
        onLoadQuote={loadQuote}
        onDeleteQuote={deleteQuote}
        onDuplicateQuote={duplicateQuote}
        onExportQuote={exportQuotePDF}
        loading={dbLoading}
      />

      {/* Modal de Gestión de Proveedores */}
      <ProvidersModal
        isOpen={showProvidersModal}
        onClose={() => setShowProvidersModal(false)}
      />

      {/* Modal de Primer Ítem */}
      <FirstItemModal
        isOpen={showFirstItemModal}
        onClose={() => setShowFirstItemModal(false)}
        onItemAdd={handleFirstItemAdd}
      />

      {/* Notificación Toast */}
      <NotificationToast
        notification={currentNotification}
        onClose={dismissCurrentNotification}
      />

      {/* Modal de Costos Adicionales */}
      <AdditionalCostsModal
        isOpen={showAdditionalCostsModal}
        onClose={() => setShowAdditionalCostsModal(false)}
        rowData={selectedRowForCosts}
        onSave={saveAdditionalCosts}
        formatCurrency={formatCurrency}
      />

      {/* Modal de Validación de PIN */}
      <PinValidationModal
        isOpen={showPinValidation}
        onValidate={validateSecurityPin}
        onClose={() => {
          setShowPinValidation(false)
          setPinAttempts(0)
          setValidatedPin(null)
          window.pendingApprovalId = null
          // Redirigir a la página principal si se cancela
          window.location.href = '/'
        }}
        clienteName={approvalQuote?.clienteName || 'Cliente'}
        cotizacionId={window.pendingApprovalId}
        attempts={pinAttempts}
        maxAttempts={3}
      />
    </div>
  )
}

// Funciones globales para debugging (disponibles en consola del navegador)
if (typeof window !== 'undefined') {
  window.debugSync = {
    // Forzar sincronización completa
    async forceFullSync() {
      try {
        console.log('🔄 [Debug] Iniciando sincronización completa...')
        
        // Sincronizar proveedores
        console.log('🔄 [Debug] Sincronizando proveedores...')
        await providersManager.forceSync()
        
        // Sincronizar cotizaciones
        console.log('🔄 [Debug] Sincronizando cotizaciones...')
        const { hybridDB } = await import('../lib/hybridDatabase')
        await hybridDB.forcSync()
        
        console.log('✅ [Debug] Sincronización completa terminada')
        return { success: true, message: 'Sincronización completa exitosa' }
      } catch (error) {
        console.error('❌ [Debug] Error en sincronización:', error)
        return { success: false, error: error.message }
      }
    },
    
    // Verificar estado de datos locales
    async checkLocalData() {
      try {
        const { cotizacionesDB } = await import('../lib/database')
        const quotes = await cotizacionesDB.getAll()
        const providers = providersManager.getAll()
        
        console.log('📊 [Debug] Estado de datos locales:')
        console.log('📋 Cotizaciones:', quotes.length)
        console.log('🏪 Proveedores:', providers.length)
        console.log('📋 Detalle cotizaciones:', quotes.map(q => ({
          id: q.cotizacion_id,
          syncStatus: q.syncStatus,
          hasFirebaseId: !!q.firebaseId,
          clienteName: q.clienteName
        })))
        
        return {
          quotes: quotes.length,
          providers: providers.length,
          quotesDetails: quotes,
          providersDetails: providers
        }
      } catch (error) {
        console.error('❌ [Debug] Error verificando datos:', error)
        return { error: error.message }
      }
    },
    
    // Limpiar datos locales (usar con cuidado)
    async clearLocalData() {
      if (!confirm('⚠️ ¿Estás seguro de que quieres limpiar TODOS los datos locales?')) {
        return { cancelled: true }
      }
      
      try {
        const { cotizacionesDB } = await import('../lib/database')
        await cotizacionesDB.clear()
        localStorage.removeItem('tecnophone_providers')
        
        console.log('🗑️ [Debug] Datos locales limpiados')
        return { success: true, message: 'Datos locales limpiados' }
      } catch (error) {
        console.error('❌ [Debug] Error limpiando datos:', error)
        return { error: error.message }
      }
    },
    
    // Forzar sincronización solo de cotizaciones
    async forceQuotesSync() {
      try {
        console.log('🔄 [Debug] Sincronizando solo cotizaciones...')
        const { hybridDB } = await import('../lib/hybridDatabase')
        await hybridDB.forcSync()
        console.log('✅ [Debug] Sincronización de cotizaciones completada')
        return { success: true, message: 'Cotizaciones sincronizadas' }
      } catch (error) {
        console.error('❌ [Debug] Error sincronizando cotizaciones:', error)
        return { success: false, error: error.message }
      }
    },
    
    // Crear cotización de prueba
    async createTestQuote() {
      try {
        const testQuote = {
          cotizacion_id: `TEST-${Date.now()}`,
          clienteName: 'Cliente de Prueba',
          date: new Date().toISOString().split('T')[0],
          rows: [
            {
              id: 1,
              item: 1,
              cantidad: 1,
              mayorista: 'Proveedor Test',
              marca: 'Test Brand',
              referencia: 'TEST-001',
              configuracion: 'Configuración de prueba',
              costoUSD: 100,
              pvpTotal: 150
            }
          ],
          totalGeneral: 150,
          companyId: 'TECNOPHONE',
          status: 'draft'
        }
        
        const { hybridDB } = await import('../lib/hybridDatabase')
        const result = await hybridDB.create(testQuote)
        
        console.log('✅ [Debug] Cotización de prueba creada:', result)
        return { success: true, quote: testQuote, result }
      } catch (error) {
        console.error('❌ [Debug] Error creando cotización de prueba:', error)
        return { success: false, error: error.message }
      }
    }
  }
  
  console.log('🛠️ [Debug] Herramientas de sincronización disponibles:')
  console.log('   window.debugSync.forceFullSync() - Forzar sincronización completa')
  console.log('   window.debugSync.forceQuotesSync() - Sincronizar solo cotizaciones')
  console.log('   window.debugSync.checkLocalData() - Verificar datos locales')
  console.log('   window.debugSync.createTestQuote() - Crear cotización de prueba')
  console.log('   window.debugSync.clearLocalData() - Limpiar datos locales')
}

export default CostosTable