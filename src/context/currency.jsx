import { createContext, useContext } from 'react'

/**
 * Moneda de visualización global ('ARS' | 'USD').
 * Cambia con qué moneda se muestran todos los totales, gráficos y listas.
 * No cambia la moneda nativa de cada gasto ni el balance de los grupos.
 */
const CurrencyContext = createContext('ARS')

export const CurrencyProvider = CurrencyContext.Provider
export const useCurrency = () => useContext(CurrencyContext)
