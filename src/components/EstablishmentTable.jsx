import { ChevronRight, MapPin, School, SearchX } from 'lucide-react';
import { compactText, formatCurrency, formatNumber } from '../lib/formatters';

export default function EstablishmentTable({ items, onOpen }) {
  if (!items.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-10 text-center text-slate-500">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <SearchX size={22} />
        </div>
        <p className="mt-4 text-base font-medium text-slate-700">No hay establecimientos para los filtros actuales.</p>
        <p className="mt-2 text-sm text-slate-500">Prueba otra comuna, dimensión o estado para recuperar resultados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Detalle operativo</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Tabla de establecimientos</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{formatNumber(items.length)} registros</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
            {formatNumber(items.filter((item) => item.hasPedagogicalOuting).length)} con salida
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Establecimiento
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                RBD / Comuna
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dimensión
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Estado
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Año
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Acciones
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Monto
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Observación
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ver
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.rbd}
                className={`group transition hover:bg-sky-50/60 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/45'}`}
              >
                <td className="border-b border-slate-100 px-5 py-4 align-top">
                  <div className="max-w-xs">
                    <div className="flex items-center gap-2 text-slate-900">
                      <School size={16} className="text-sky-700" />
                      <span className="font-semibold">{compactText(item.name, 'Establecimiento sin nombre')}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{compactText(item.dependency)}</p>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top text-sm text-slate-600">
                  <p className="font-medium text-slate-800">{compactText(item.rbd)}</p>
                  <p className="mt-2 flex items-center gap-2 text-slate-500">
                    <MapPin size={14} />
                    {compactText(item.commune)}
                  </p>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top">
                  <div className="flex max-w-xs flex-wrap gap-2">
                    {(item.dimensions.length ? item.dimensions : ['Sin clasificación']).map((dimension) => (
                      <span key={`${item.rbd}-${dimension}`} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        {dimension}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.hasPedagogicalOuting ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.hasPedagogicalOuting ? 'Con salida' : 'Sin salida'}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top">
                  <span className="inline-flex rounded-full bg-brand-mist px-3 py-1 text-xs font-semibold text-brand-navy">
                    {compactText(item.year, 'Sin año')}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top text-sm font-semibold text-slate-800">
                  {formatNumber(item.actionCount)}
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top text-sm font-semibold text-amber-700">
                  {formatCurrency(item.estimatedBudget)}
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top text-sm text-slate-500">
                  <div className="max-w-sm">
                    <span className="line-clamp-3">{compactText(item.observation)}</span>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    Abrir
                    <ChevronRight className="transition group-hover:translate-x-1" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}