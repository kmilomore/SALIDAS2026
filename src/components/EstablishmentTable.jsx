import { ChevronRight, MapPin, School } from 'lucide-react';
import { compactText, formatCurrency, formatNumber } from '../lib/formatters';

export default function EstablishmentTable({ items, onOpen }) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
        No hay establecimientos para los filtros actuales.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <button
          key={item.rbd}
          type="button"
          onClick={() => onOpen(item)}
          className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-soft"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">RBD {compactText(item.rbd)}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{compactText(item.name, 'Establecimiento sin nombre')}</h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.hasPedagogicalOuting
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.hasPedagogicalOuting ? 'Con salida' : 'Sin salida'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <School size={16} />
                <span>Dimensiones</span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700">{item.dimensions.join(', ') || 'Sin clasificación'}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={16} />
                <span>Ubicación</span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700">{compactText(item.commune)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
              {formatNumber(item.actionCount)} acciones
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              {formatCurrency(item.estimatedBudget)} estimado
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span className="line-clamp-2 max-w-[85%]">{compactText(item.observation)}</span>
            <ChevronRight className="transition group-hover:translate-x-1" size={18} />
          </div>
        </button>
      ))}
    </div>
  );
}