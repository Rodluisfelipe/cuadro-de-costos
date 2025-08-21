import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Moon, Sun, Download, FileText } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.jsx'
import { formatCurrency, parseNumber } from '../lib/utils'

const CostosTablePure = () => {
  const { theme, setTheme } = useTheme()
  
  const [rows, setRows] = useState([
    {
      id: 1,
      item: '',
      descripcion: '',
      cantidad: 1,
      mayorista: '',
      marca: '',
      referencia: '',
      costoUnitario: 0,
      iva: 19,
      pvpUnitario: 0,
      pvpTotal: 0,
      costoEntidad: 0,
      diferencia: 0,
      links: ''
    }
  ])
  
  const [presupuesto, setPresupuesto] = useState(0)

  // Aplicar tema al body
  React.useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark' : ''
  }, [theme])

  // Calcular valores automáticamente
  const calculateRow = useCallback((row) => {
    const cantidad = parseNumber(row.cantidad) || 1
    const costoUnitario = parseNumber(row.costoUnitario) || 0
    const iva = parseNumber(row.iva) || 0
    
    const pvpUnitario = costoUnitario * (1 + (iva / 100))
    const pvpTotal = cantidad * pvpUnitario
    const costoEntidad = parseNumber(row.costoEntidad) || 0
    const diferencia = pvpTotal - costoEntidad

    return {
      ...row,
      cantidad: Math.max(1, cantidad),
      costoUnitario: Math.max(0, costoUnitario),
      iva: Math.max(0, iva),
      pvpUnitario,
      pvpTotal,
      costoEntidad: Math.max(0, costoEntidad),
      diferencia
    }
  }, [])

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

  // Agregar nueva fila
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      item: '',
      descripcion: '',
      cantidad: 1,
      mayorista: '',
      marca: '',
      referencia: '',
      costoUnitario: 0,
      iva: 19,
      pvpUnitario: 0,
      pvpTotal: 0,
      costoEntidad: 0,
      diferencia: 0,
      links: ''
    }
    setRows(prev => [...prev, newRow])
  }

  // Eliminar fila
  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id))
    }
  }

  // Calcular totales
  const totalVenta = rows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)
  const diferenciasPresupuesto = totalVenta - parseNumber(presupuesto)

  // Componente de celda editable
  const EditableCell = ({ value, onChange, type = 'text', className = '' }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input input-transparent ${className}`}
    />
  )

  // Componente de fila para desktop
  const DesktopRow = ({ row, index }) => (
    <motion.tr
      key={row.id}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <td className="text-center font-bold">{index + 1}</td>
      <td>
        <EditableCell 
          value={row.item}
          onChange={(value) => updateRow(row.id, 'item', value)}
        />
      </td>
      <td>
        <EditableCell 
          value={row.descripcion}
          onChange={(value) => updateRow(row.id, 'descripcion', value)}
        />
      </td>
      <td>
        <EditableCell 
          type="number"
          value={row.cantidad}
          onChange={(value) => updateRow(row.id, 'cantidad', Math.max(1, parseNumber(value)))}
        />
      </td>
      <td>
        <EditableCell 
          value={row.mayorista}
          onChange={(value) => updateRow(row.id, 'mayorista', value)}
        />
      </td>
      <td>
        <EditableCell 
          value={row.marca}
          onChange={(value) => updateRow(row.id, 'marca', value)}
        />
      </td>
      <td>
        <EditableCell 
          value={row.referencia}
          onChange={(value) => updateRow(row.id, 'referencia', value)}
        />
      </td>
      <td>
        <EditableCell 
          type="number"
          value={row.costoUnitario}
          onChange={(value) => updateRow(row.id, 'costoUnitario', Math.max(0, parseNumber(value)))}
        />
      </td>
      <td>
        <EditableCell 
          type="number"
          value={row.iva}
          onChange={(value) => updateRow(row.id, 'iva', Math.max(0, parseNumber(value)))}
        />
      </td>
      <td className="text-center font-bold text-green">
        {formatCurrency(row.pvpUnitario)}
      </td>
      <td className="text-center font-bold text-green">
        {formatCurrency(row.pvpTotal)}
      </td>
      <td>
        <EditableCell 
          type="number"
          value={row.costoEntidad}
          onChange={(value) => updateRow(row.id, 'costoEntidad', Math.max(0, parseNumber(value)))}
        />
      </td>
      <td className={`text-center font-bold ${row.diferencia >= 0 ? 'text-green' : 'text-red'}`}>
        {formatCurrency(row.diferencia)}
      </td>
      <td>
        <EditableCell 
          value={row.links}
          onChange={(value) => updateRow(row.id, 'links', value)}
          className="text-blue"
        />
      </td>
      <td className="text-center">
        <button
          onClick={() => removeRow(row.id)}
          className="btn btn-ghost text-red"
          disabled={rows.length === 1}
          style={{ opacity: rows.length === 1 ? 0.5 : 1 }}
        >
          <X size={16} />
        </button>
      </td>
    </motion.tr>
  )

  // Componente de card para móvil
  const MobileCard = ({ row, index }) => (
    <motion.div
      key={row.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="card mb-4 animate-fade-in"
    >
      <div className="card-content">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Item #{index + 1}</h3>
          <button
            onClick={() => removeRow(row.id)}
            className="btn btn-ghost text-red"
            disabled={rows.length === 1}
            style={{ opacity: rows.length === 1 ? 0.5 : 1 }}
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="mobile-grid">
          <div className="mobile-grid-2">
            <div>
              <label className="mobile-label text-gray">ITEM</label>
              <EditableCell 
                value={row.item}
                onChange={(value) => updateRow(row.id, 'item', value)}
              />
            </div>
            <div>
              <label className="mobile-label text-gray">CANTIDAD</label>
              <EditableCell 
                type="number"
                value={row.cantidad}
                onChange={(value) => updateRow(row.id, 'cantidad', Math.max(1, parseNumber(value)))}
              />
            </div>
          </div>
          
          <div>
            <label className="mobile-label text-gray">DESCRIPCIÓN</label>
            <EditableCell 
              value={row.descripcion}
              onChange={(value) => updateRow(row.id, 'descripcion', value)}
            />
          </div>
          
          <div className="mobile-grid-2">
            <div>
              <label className="mobile-label text-gray">MAYORISTA</label>
              <EditableCell 
                value={row.mayorista}
                onChange={(value) => updateRow(row.id, 'mayorista', value)}
              />
            </div>
            <div>
              <label className="mobile-label text-gray">MARCA</label>
              <EditableCell 
                value={row.marca}
                onChange={(value) => updateRow(row.id, 'marca', value)}
              />
            </div>
          </div>
          
          <div>
            <label className="mobile-label text-gray">REFERENCIA</label>
            <EditableCell 
              value={row.referencia}
              onChange={(value) => updateRow(row.id, 'referencia', value)}
            />
          </div>
          
          <div className="mobile-grid-2">
            <div>
              <label className="mobile-label text-gray">COSTO UNITARIO</label>
              <EditableCell 
                type="number"
                value={row.costoUnitario}
                onChange={(value) => updateRow(row.id, 'costoUnitario', Math.max(0, parseNumber(value)))}
              />
            </div>
            <div>
              <label className="mobile-label text-gray">IVA (%)</label>
              <EditableCell 
                type="number"
                value={row.iva}
                onChange={(value) => updateRow(row.id, 'iva', Math.max(0, parseNumber(value)))}
              />
            </div>
          </div>
          
          <div className="mobile-grid-2">
            <div className="bg-green-light text-center">
              <label className="mobile-label text-green">PVP UNITARIO</label>
              <div className="font-bold text-green">
                {formatCurrency(row.pvpUnitario)}
              </div>
            </div>
            <div className="bg-green-light text-center">
              <label className="mobile-label text-green">PVP TOTAL</label>
              <div className="font-bold text-green">
                {formatCurrency(row.pvpTotal)}
              </div>
            </div>
          </div>
          
          <div>
            <label className="mobile-label text-gray">COSTO ENTIDAD</label>
            <EditableCell 
              type="number"
              value={row.costoEntidad}
              onChange={(value) => updateRow(row.id, 'costoEntidad', Math.max(0, parseNumber(value)))}
            />
          </div>
          
          <div className={`text-center ${row.diferencia >= 0 ? 'bg-green-light' : 'bg-red-light'}`}>
            <label className="mobile-label">DIFERENCIA</label>
            <div className={`font-bold ${row.diferencia >= 0 ? 'text-green' : 'text-red'}`}>
              {formatCurrency(row.diferencia)}
            </div>
          </div>
          
          <div>
            <label className="mobile-label text-gray">LINKS</label>
            <EditableCell 
              value={row.links}
              onChange={(value) => updateRow(row.id, 'links', value)}
              className="text-blue"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen">
      {/* Header y Navbar */}
      <div className="header">
        <div className="container">
          <div className="header-content">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="title"
            >
              📊 Cuadro de Costos
            </motion.h1>
            
            <div className="toolbar">
              <button className="btn btn-outline">
                <FileText size={16} />
                Nuevo Proyecto
              </button>
              <button className="btn btn-outline">
                <Download size={16} />
                Exportar
              </button>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="card">
          <div className="card-content">
            {/* Tabla Desktop */}
            <div className="table-container lg:block hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ITEM</th>
                    <th>DESCRIPCIÓN</th>
                    <th>CANTIDAD</th>
                    <th>MAYORISTA</th>
                    <th>MARCA</th>
                    <th>REFERENCIA</th>
                    <th>COSTO UNITARIO</th>
                    <th>IVA (%)</th>
                    <th>PVP UNITARIO</th>
                    <th>PVP TOTAL</th>
                    <th>COSTO ENTIDAD</th>
                    <th>DIFERENCIA</th>
                    <th>LINKS</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rows.map((row, index) => (
                      <DesktopRow key={row.id} row={row} index={index} />
                    ))}
                  </AnimatePresence>
                </tbody>
                
                {/* Pie de tabla con totales */}
                <tfoot>
                  <tr className="bg-gray-light">
                    <td colSpan="9" className="text-center font-bold" style={{ fontSize: '1.1rem', padding: '1rem' }}>
                      TOTAL VENTA:
                    </td>
                    <td colSpan="2" className="text-center font-bold text-green" style={{ fontSize: '1.25rem', padding: '1rem' }}>
                      {formatCurrency(totalVenta)}
                    </td>
                    <td colSpan="4" style={{ padding: '1rem' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">PRESUPUESTO:</span>
                        <input
                          type="number"
                          value={presupuesto}
                          onChange={(e) => setPresupuesto(parseNumber(e.target.value))}
                          className="input"
                          placeholder="0"
                          style={{ width: '8rem' }}
                        />
                        {presupuesto > 0 && (
                          <span className={`font-bold ${diferenciasPresupuesto >= 0 ? 'text-green' : 'text-red'}`}>
                            ({diferenciasPresupuesto >= 0 ? '+' : ''}{formatCurrency(diferenciasPresupuesto)})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="lg:hidden">
              <AnimatePresence>
                {rows.map((row, index) => (
                  <MobileCard key={row.id} row={row} index={index} />
                ))}
              </AnimatePresence>
              
              {/* Resumen Mobile */}
              <div className="card bg-gray-light" style={{ border: '2px solid #e5e7eb' }}>
                <div className="card-content text-center">
                  <div className="font-bold mb-4" style={{ fontSize: '1.1rem' }}>TOTAL VENTA</div>
                  <div className="font-bold text-green mb-4" style={{ fontSize: '1.5rem' }}>
                    {formatCurrency(totalVenta)}
                  </div>
                  
                  <div className="mobile-grid">
                    <label className="mobile-label">PRESUPUESTO</label>
                    <input
                      type="number"
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(parseNumber(e.target.value))}
                      placeholder="Ingrese presupuesto"
                      className="input"
                    />
                    {presupuesto > 0 && (
                      <div className={`font-bold ${diferenciasPresupuesto >= 0 ? 'text-green' : 'text-red'}`} style={{ fontSize: '1.1rem' }}>
                        Diferencia: {diferenciasPresupuesto >= 0 ? '+' : ''}{formatCurrency(diferenciasPresupuesto)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón flotante para agregar fila */}
        <motion.button
          className="floating-btn"
          onClick={addRow}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={24} />
        </motion.button>
      </div>
    </div>
  )
}

export default CostosTablePure