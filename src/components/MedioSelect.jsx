import SearchSelect from './SearchSelect'
import { useCatalog } from '../context/catalog'

/** Selector de medio de pago con buscador. */
export default function MedioSelect({ value, onChange, variant = 'chip' }) {
  const { medios } = useCatalog()
  return (
    <SearchSelect
      value={value}
      opciones={medios.map((m) => ({ value: m.id, label: m.nombre }))}
      onChange={onChange}
      placeholder="Buscar medio de pago…"
      variant={variant}
    />
  )
}
