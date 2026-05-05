export default function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  year,
  onYearChange,
  years,
  dimension,
  onDimensionChange,
  dimensions,
}) {
  const inputClassName = 'rounded-2xl border border-brand-mist bg-[#f8fafe] px-4 py-3 text-brand-navy outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10';

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr]">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-brand-navy">Buscar establecimiento o RBD</span>
        <input
          className={inputClassName}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ej. 2447-3 o nombre del establecimiento"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-brand-navy">Estado</span>
        <select
          className={inputClassName}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="with">Con salidas pedagógicas</option>
          <option value="without">Sin salidas pedagógicas</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-brand-navy">Año</span>
        <select
          className={inputClassName}
          value={year}
          onChange={(event) => onYearChange(event.target.value)}
        >
          <option value="all">Todos</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-brand-navy">Dimensión</span>
        <select
          className={inputClassName}
          value={dimension}
          onChange={(event) => onDimensionChange(event.target.value)}
        >
          <option value="all">Todas</option>
          {dimensions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}