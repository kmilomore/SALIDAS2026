import { ExternalLink, X } from 'lucide-react';
import { compactText, formatCurrency, formatNumber } from '../lib/formatters';

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{compactText(value)}</span>
    </div>
  );
}

function KeyValueTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
        No hay campos adicionales disponibles para este establecimiento.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      <div className="max-h-[56vh] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Campo
              </th>
              <th className="sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, value], index) => (
              <tr key={key} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">{key.replace(/_/g, ' ')}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-800">{compactText(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EstablishmentModal({ item, onClose }) {
  if (!item) {
    return null;
  }

  const extraFields = Object.entries(item.establishmentRaw || {}).filter(
    ([key, value]) => value !== '' && value !== null && value !== undefined && !['rbd', 'nombre', 'nombre_establecimiento'].includes(key),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl md:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Ficha establecimiento</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{compactText(item.name, 'Establecimiento sin nombre')}</h3>
            <p className="mt-2 text-sm text-slate-500">RBD {compactText(item.rbd)} · {compactText(item.commune)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.hasPedagogicalOuting ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {item.hasPedagogicalOuting ? 'Con salidas pedagógicas' : 'Sin salidas pedagógicas'}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {formatNumber(item.actionCount)} acciones
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-97px)] gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailRow label="Estado" value={item.hasPedagogicalOuting ? 'Con salidas pedagógicas' : 'Sin salidas pedagógicas'} />
              <DetailRow label="N° acciones" value={formatNumber(item.actionCount)} />
              <DetailRow label="Monto estimado" value={formatCurrency(item.estimatedBudget)} />
              <DetailRow label="Dimensiones" value={item.dimensions.join(', ')} />
            </div>

            <div className="rounded-[1.75rem] bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Observaciones PME</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{compactText(item.observation)}</p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-900">Resumen del establecimiento</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <ExternalLink size={14} />
                  Datos base
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailRow label="Nombre" value={item.name} />
                <DetailRow label="Dependencia" value={item.dependency} />
                <DetailRow label="Comuna" value={item.commune} />
                <DetailRow label="Nivel" value={item.level} />
                <DetailRow label="Área" value={item.area} />
                <DetailRow label="Ruralidad" value={item.rurality} />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] bg-gradient-to-br from-sky-50 via-white to-orange-50 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Campos complementarios</p>
              <p className="mt-1 text-sm text-slate-500">Vista tabular para revisar rápidamente todos los atributos disponibles desde ESTABLECIMIENTOS.</p>
            </div>

            <KeyValueTable rows={extraFields} />
          </div>
        </div>
      </div>
    </div>
  );
}