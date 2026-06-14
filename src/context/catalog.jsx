import { createContext, useContext } from 'react'

/**
 * Catálogo editable de la app: categorías, etiquetas y medios de pago.
 * Vive en `App` (persistido en localStorage) y se expone vía contexto para que
 * los selectores y vistas no tengan que recibir todo por props.
 */
const CatalogContext = createContext({ categorias: [], etiquetas: [], medios: [] })

export const CatalogProvider = CatalogContext.Provider
export const useCatalog = () => useContext(CatalogContext)
