import SearchSelect from './SearchSelect'
import { useCatalog } from '../context/catalog'

/** Selector de categoría con buscador y opción de crear una nueva. */
export default function CategoriaSelect({ value, onChange }) {
  const { categorias } = useCatalog()
  const lista = [...new Set([...categorias, 'Sin categoría', value])]
  return (
    <SearchSelect
      value={value}
      opciones={lista.map((c) => ({ value: c, label: c }))}
      onChange={onChange}
      crear
      placeholder="Buscar o crear categoría…"
      tono={value === 'Sin categoría' ? 'rose' : 'slate'}
    />
  )
}
