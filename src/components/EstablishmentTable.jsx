import { useMemo, useState } from 'react';
import { ChevronRight, MapPin, School, SearchX } from 'lucide-react';
import { compactText, formatCurrency, formatNumber } from '../lib/formatters';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function EstablishmentTable({ items, onOpen, strategicMap = {} }) {
  const [schoolFilter, setSchoolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [actionsFilter, setActionsFilter] = useState('all');
  const [coverage2025Filter, setCoverage2025Filter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  const yearOptions = useMemo(
    () => [...new Set(items.map((item) => item.year).filter(Boolean))].sort(),
    [items],
  );

  const actionOptions = useMemo(
    () => [...new Set(items.map((item) => item.actionCount).filter((value) => value !== undefined && value !== null))]
      .sort((left, right) => left - right),
    [items],
  );

  const itemsWithProfiles = useMemo(
    () => items.map((item) => ({ ...item, strategicProfile: strategicMap[item.rbd] || null })),
    [items, strategicMap],
  );

  const filteredItems = useMemo(() => {
    const normalizedSchoolFilter = normalizeText(schoolFilter);

    return itemsWithProfiles.filter((item) => {
      const matchesSchool = !normalizedSchoolFilter
        || normalizeText(item.name).includes(normalizedSchoolFilter)
        || normalizeText(item.rbd).includes(normalizedSchoolFilter);

      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'with' && item.hasPedagogicalOuting)
        || (statusFilter === 'without' && !item.hasPedagogicalOuting);

      const matchesYear = yearFilter === 'all' || item.year === yearFilter;
      const matchesActions = actionsFilter === 'all' || String(item.actionCount) === actionsFilter;
      const matchesCoverage2025 = coverage2025Filter === 'all'
        || (coverage2025Filter === 'not-covered' && !item.wasCovered2025);

      return matchesSchool && matchesStatus && matchesYear && matchesActions && matchesCoverage2025;
    });
  }, [actionsFilter, coverage2025Filter, itemsWithProfiles, schoolFilter, statusFilter, yearFilter]);

  const sortedItems = useMemo(() => {
    const priorityOrder = { Alta: 3, Media: 2, Baja: 1 };

    return [...filteredItems].sort((left, right) => {
      const leftProfile = left.strategicProfile || {};
      const rightProfile = right.strategicProfile || {};

      let comparison = 0;

      switch (sortBy) {
        case 'budget':
          comparison = (right.estimatedBudget || 0) - (left.estimatedBudget || 0);
          break;
        case 'actions':
          comparison = (right.actionCount || 0) - (left.actionCount || 0);
          break;
        case 'commune':
          comparison = String(left.commune || '').localeCompare(String(right.commune || ''), 'es');
          break;
        case 'status':
          comparison = Number(left.hasPedagogicalOuting) - Number(right.hasPedagogicalOuting);
          break;
        case 'priority':
        default:
          comparison = (priorityOrder[rightProfile.priority] || 0) - (priorityOrder[leftProfile.priority] || 0);
          if (comparison === 0) {
            comparison = (right.actionCount || 0) - (left.actionCount || 0);
          }
          break;
      }

      if (comparison === 0) {
        comparison = String(left.name || '').localeCompare(String(right.name || ''), 'es');
      }

      return comparison;
    });
  }, [filteredItems, sortBy]);

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
          <span className="rounded-full bg-slate-100 px-3 py-1">{formatNumber(sortedItems.length)} registros visibles</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
            {formatNumber(sortedItems.filter((item) => item.hasPedagogicalOuting).length)} con salida
          </span>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 lg:grid-cols-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Escuela o RBD</span>
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
            value={schoolFilter}
            onChange={(event) => setSchoolFilter(event.target.value)}
            placeholder="Buscar por nombre o RBD"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Estado</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="with">Con salida</option>
            <option value="without">Sin salida</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Año</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Acciones</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
            value={actionsFilter}
            onChange={(event) => setActionsFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            {actionOptions.map((actionCount) => (
              <option key={actionCount} value={String(actionCount)}>
                {formatNumber(actionCount)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Cobertura 2025</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
            value={coverage2025Filter}
            onChange={(event) => setCoverage2025Filter(event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="not-covered">No fue cubierta el 2025</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Ordenar por</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="priority">Prioridad</option>
            <option value="budget">Monto</option>
            <option value="actions">Acciones</option>
            <option value="commune">Comuna</option>
            <option value="status">Estado</option>
          </select>
        </label>
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
                Prioridad
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
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Motivo
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recomendación
              </th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ver
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedItems.map((item, index) => (
              <tr
                key={`${item.rbd}-${item.year}-${index}`}
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
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.strategicProfile?.priority === 'Alta'
                        ? 'bg-red-100 text-red-700'
                        : item.strategicProfile?.priority === 'Media'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.strategicProfile?.priority || 'Sin dato'}
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
                <td className="border-b border-slate-100 px-4 py-4 align-top text-sm text-slate-500">
                  <div className="max-w-[12rem]">
                    <span className="line-clamp-3">{compactText(item.strategicProfile?.reasons?.[0], 'Sin motivo estrategico')}</span>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 align-top">
                  <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {compactText(item.strategicProfile?.recommendation, 'Sin recomendacion')}
                  </span>
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

        {!sortedItems.length ? (
          <div className="border-t border-slate-100 px-6 py-10 text-center text-slate-500">
            <p className="text-base font-medium text-slate-700">No hay resultados para los filtros del panel de detalles.</p>
            <p className="mt-2 text-sm text-slate-500">Ajusta escuela, estado, año o acciones para volver a mostrar registros.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}