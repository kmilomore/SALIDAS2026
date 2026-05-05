export default function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dimension,
  onDimensionChange,
  dimensions,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-600">Buscar establecimiento o RBD</span>
        <input
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ej. 2447-3 o nombre del establecimiento"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-600">Estado</span>
        <select
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="with">Con salidas pedagógicas</option>
          <option value="without">Sin salidas pedagógicas</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-600">Dimensión</span>
        <select
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
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