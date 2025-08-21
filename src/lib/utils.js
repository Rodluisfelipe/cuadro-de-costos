import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Formatear números como moneda colombiana
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0"
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formatear números como moneda estadounidense
export function formatUSD(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatear porcentajes
export function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) return "0%"
  return `${parseFloat(value).toFixed(1)}%`
}

// Parsear valor de entrada a número
export function parseNumber(value) {
  if (typeof value === 'string') {
    // Remover caracteres no numéricos excepto punto y coma
    const cleaned = value.replace(/[^\d.,]/g, '')
    return parseFloat(cleaned.replace(',', '.')) || 0
  }
  return parseFloat(value) || 0
}