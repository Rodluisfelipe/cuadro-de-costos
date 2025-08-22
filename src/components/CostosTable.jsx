import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Moon, Sun, Download, FileText, Save } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { useTheme } from '../hooks/useTheme.jsx'
import { formatCurrency, formatPercentage, parseNumber, cn } from '../lib/utils'
import jsPDF from 'jspdf'

const CostosTable = () => {
  const { theme, setTheme } = useTheme()
  
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
    
    // 1. Calcular COSTO COP: si hay USD convertir, sino usar directo
    let costoCOP = 0
    if (costoUSD > 0 && trm > 0) {
      costoCOP = costoUSD * trm
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
  const [savedQuotes, setSavedQuotes] = useState([])
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Estado para controlar items colapsados en móvil
  const [collapsedItems, setCollapsedItems] = useState(new Set())

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
    loadSavedQuotes()
  }, [])

  // Funciones para localStorage
  const loadSavedQuotes = () => {
    try {
      console.log('🔍 Intentando cargar cotizaciones del localStorage...')
      const saved = localStorage.getItem('costos-quotes')
      console.log('📦 Datos en localStorage:', saved)
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('✅ Cotizaciones cargadas:', parsed)
        setSavedQuotes(parsed)
      } else {
        console.log('ℹ️ No hay cotizaciones guardadas')
      }
    } catch (error) {
      console.error('❌ Error cargando cotizaciones:', error)
    }
  }

  const saveQuote = () => {
    console.log('💾 Iniciando proceso de guardado...')
    console.log('👤 Cliente actual:', clienteName)
    
    if (!clienteName.trim()) {
      console.log('❌ Error: Cliente vacío')
      alert('Por favor ingresa el nombre del cliente')
      return
    }

    const quote = {
      id: Date.now(),
      clienteName: clienteName.trim(),
      trmGlobal,
      rows,
      totalGeneral: rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0),
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('es-CO')
    }

    console.log('📋 Cotización a guardar:', quote)
    console.log('📊 Cotizaciones existentes:', savedQuotes)

    try {
      const updated = [...savedQuotes, quote]
      console.log('📦 Cotizaciones actualizadas:', updated)
      
      localStorage.setItem('costos-quotes', JSON.stringify(updated))
      console.log('✅ Guardado en localStorage exitoso')
      
      setSavedQuotes(updated)
      setSaveSuccess(true)
      
      // Verificar que se guardó correctamente
      const verification = localStorage.getItem('costos-quotes')
      console.log('🔍 Verificación de guardado:', verification ? 'ÉXITO' : 'FALLÓ')
      
      // Ocultar mensaje de éxito después de 2 segundos
      setTimeout(() => setSaveSuccess(false), 2000)
      
      console.log('✅ Cotización guardada completamente:', quote)
    } catch (error) {
      console.error('❌ Error guardando cotización:', error)
      alert('Error al guardar la cotización')
    }
  }

  // Funciones de debugging para localStorage
  const debugLocalStorage = () => {
    console.log('🔍 DEBUG LOCALSTORAGE:')
    console.log('📊 savedQuotes state:', savedQuotes)
    console.log('👤 clienteName state:', clienteName)
    console.log('📦 localStorage directo:', localStorage.getItem('costos-quotes'))
    console.log('🌐 localStorage disponible:', typeof Storage !== "undefined")
    console.log('📝 Todas las keys en localStorage:', Object.keys(localStorage))
  }

  const clearLocalStorage = () => {
    if (confirm('¿Estás seguro de que quieres limpiar todas las cotizaciones guardadas?')) {
      localStorage.removeItem('costos-quotes')
      setSavedQuotes([])
      console.log('🗑️ localStorage limpiado')
    }
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
  const EditableCell = ({ value, onChange, type = 'text', className = '', minWidth = '120px' }) => {
    const [localValue, handleChange, handleFocus, handleBlur] = useIndependentInput(value, onChange)
    
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
          textAlign: 'center',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: '14px'
        }}
        className={className}
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
      className="mb-3"
    >
      <div 
        onClick={onExpand}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
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
    >
      <Card className="mb-6 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-full"
                disabled={rows.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
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
              <MobileCellWrapper label="MAYORISTA" colorClass="text-purple-600 dark:text-purple-400">
                <MobileEditableCell 
                  value={row.mayorista}
                  onChange={(value) => updateRow(row.id, 'mayorista', value)}
                  className="font-medium"
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
              <span className="hidden sm:inline">Guardar</span>
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

            {/* Botón Nuevo */}
            <Button 
              variant="outline"
              className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>

            {/* Espaciador */}
            <div className="flex-1 hidden lg:block"></div>
            
            {/* Botones de debugging (temporales) */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={debugLocalStorage}
                variant="outline" 
                size="sm"
                className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 text-xs"
              >
                🔍 Debug
              </Button>
              <Button 
                onClick={clearLocalStorage}
                variant="outline" 
                size="sm"
                className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs"
              >
                🗑️ Limpiar
              </Button>
            </div>

            {/* Badge de estado */}
            <div className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Sistema Activo</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="w-full px-4 py-8">
        <Card className="shadow-xl border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm w-full">
          <CardContent className="p-6">
                        {/* Tabla Desktop con scroll horizontal y columnas fijas */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    {/* Columnas fijas */}
                    <th className="sticky left-0 z-10 p-4 text-center font-semibold text-xs w-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-2 border-r-gray-400 dark:border-r-gray-500">ITEM</th>
                    <th className="sticky left-20 z-10 p-4 text-center font-semibold text-xs w-24 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-2 border-r-gray-400 dark:border-r-gray-500">CANT.</th>
                    <th className="sticky left-44 z-10 p-4 text-left font-semibold text-xs w-40 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-2 border-r-gray-400 dark:border-r-gray-500">MAYORISTA</th>
                    
                    {/* Columnas con scroll */}
                    <th className="p-4 text-left font-semibold text-xs w-36 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">MARCA</th>
                    <th className="p-4 text-left font-semibold text-xs w-40 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">REFERENCIA</th>
                    <th className="p-4 text-left font-semibold text-xs w-48 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">CONFIGURACIÓN</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">COSTO USD</th>
                    <th className="p-4 text-center font-semibold text-xs w-24 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">TRM</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">COSTO COP</th>
                    <th className="p-4 text-center font-semibold text-xs w-24 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">IVA %</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">VALOR IVA</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">COSTO+IVA</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">COSTO TOTAL</th>
                    <th className="p-4 text-center font-semibold text-xs w-28 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">MARGEN %</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">PVP UNIT.</th>
                    <th className="p-4 text-center font-semibold text-xs w-24 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">IVA PVP %</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">IVA PVP</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">PVP+IVA</th>
                    <th className="p-4 text-center font-semibold text-xs w-32 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">PVP TOTAL</th>
                    <th className="p-4 text-center font-semibold text-xs w-24 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                      {/* Columnas fijas */}
                      <td className="sticky left-0 z-10 p-4 text-center font-medium text-blue-600 dark:text-blue-400 w-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-2 border-r-gray-400 dark:border-r-gray-500">
                        {row.item}
                      </td>
                      <td className="sticky left-20 z-10 p-3 w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-2 border-r-gray-400 dark:border-r-gray-500">
                        <EditableCell 
                          type="number"
                          value={row.cantidad}
                          onChange={(value) => updateRow(row.id, 'cantidad', Math.max(1, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="sticky left-44 z-10 p-3 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-2 border-r-gray-400 dark:border-r-gray-500">
                        <EditableCell 
                          type="text"
                          value={row.mayorista}
                          onChange={(value) => updateRow(row.id, 'mayorista', value)}
                          minWidth="100%"
                        />
                      </td>
                      
                      {/* Columnas con scroll */}
                      <td className="p-3 w-36 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="text"
                          value={row.marca}
                          onChange={(value) => updateRow(row.id, 'marca', value)}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-3 w-40 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="text"
                          value={row.referencia}
                          onChange={(value) => updateRow(row.id, 'referencia', value)}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-3 w-48 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="text"
                          value={row.configuracion}
                          onChange={(value) => updateRow(row.id, 'configuracion', value)}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-3 w-32 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="number"
                          value={row.costoUSD}
                          onChange={(value) => updateRow(row.id, 'costoUSD', Math.max(0, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-3 w-24 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="number"
                          value={row.trm}
                          onChange={(value) => updateRow(row.id, 'trm', Math.max(0, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-3 w-32 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="number"
                          value={row.costoCOP}
                          onChange={(value) => updateRow(row.id, 'costoCOP', Math.max(0, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-3 w-24 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="number"
                          value={row.ivaPercentCosto}
                          onChange={(value) => updateRow(row.id, 'ivaPercentCosto', Math.max(0, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-4 text-center font-medium text-red-600 dark:text-red-400 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.valorIvaCosto)}
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium text-orange-600 dark:text-orange-400 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.costoConIva)}
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium text-purple-600 dark:text-purple-400 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.costoTotal)}
                        </div>
                      </td>
                      <td className="p-3 w-28 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="number"
                          value={row.margen}
                          onChange={(value) => updateRow(row.id, 'margen', Math.max(0, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-4 text-center font-medium text-green-600 dark:text-green-400 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.pvpUnitario)}
                        </div>
                      </td>
                      <td className="p-3 w-24 border border-gray-300 dark:border-gray-600">
                        <EditableCell 
                          type="number"
                          value={row.ivaPercentPVP}
                          onChange={(value) => updateRow(row.id, 'ivaPercentPVP', Math.max(0, parseNumber(value)))}
                          minWidth="100%"
                        />
                      </td>
                      <td className="p-4 text-center font-medium text-blue-600 dark:text-blue-400 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.valorIvaPVP)}
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium text-indigo-600 dark:text-indigo-400 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.pvpMasIva)}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-green-700 dark:text-green-300 w-32 border border-gray-300 dark:border-gray-600">
                        <div className="whitespace-nowrap">
                          {formatCurrency(row.pvpTotal)}
                        </div>
                      </td>
                      <td className="p-4 text-center w-24 border border-gray-300 dark:border-gray-600">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xl transition-colors"
                        >
                          ❌
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
                
                {/* Pie de tabla con totales */}
                <div className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex justify-between items-center">
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
            <div className="lg:hidden">
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
                {rows.map((row, index) => {
                  const isCollapsed = collapsedItems.has(row.id)
                  
                  if (isCollapsed) {
                    return (
                      <CollapsedMobileCard 
                        key={`collapsed-${row.id}`}
                        row={row} 
                        index={index}
                        onExpand={() => toggleItemCollapse(row.id)}
                      />
                    )
                  }
                  
                  return (
                    <MobileCard key={row.id} row={row} index={index} />
                  )
                })}
              </AnimatePresence>
              
              {/* Resumen Mobile */}
              <Card className="bg-gray-50 dark:bg-gray-800 border-2">
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

        {/* Botón flotante para agregar fila */}
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            onClick={addRow}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

export default CostosTable