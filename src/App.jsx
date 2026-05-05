import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Building2, CircleDollarSign, RefreshCw, SlidersHorizontal, Target } from 'lucide-react';
import EstablishmentModal from './components/EstablishmentModal';
import EstablishmentTable from './components/EstablishmentTable';
import MetricCard from './components/MetricCard';
import SectionCard from './components/SectionCard';
import { fetchDashboardData } from './lib/api';
import { formatCurrency, formatDate, formatNumber } from './lib/formatters';
import { buildBudgetSimulation, buildStrategicProfiles, getStrategyLabel, resolvePlanningYear } from './lib/strategic';

const PIE_COLORS = ['#25306B', '#006BB9', '#FF1D3D', '#EDF0F5'];
const STRATEGY_OPTIONS = [
  { value: 'coverage', label: 'Maximizar cobertura' },
  { value: 'rural', label: 'Priorizar rurales' },
  { value: 'balance', label: 'Equilibrar comunas' },
  { value: 'need', label: 'Priorizar mayor necesidad' },
  { value: 'lowBudget', label: 'Priorizar menor inversión previa' },
];

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState('all');
  const [dimension, setDimension] = useState('all');
  const [strategy, setStrategy] = useState('coverage');
  const [planningYear, setPlanningYear] = useState('auto');
  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const [budgetInput, setBudgetInput] = useState('15000000');
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const nextData = await fetchDashboardData();
        setData(nextData);
        setError('');
      } catch (nextError) {
        setError(nextError.message || 'No fue posible cargar la información');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const dimensions = useMemo(() => {
    if (!data?.catalogs?.dimensions) {
      return [];
    }

    return data.catalogs.dimensions;
  }, [data]);

  const years = useMemo(() => {
    if (!data?.catalogs?.years) {
      return [];
    }

    return data.catalogs.years;
  }, [data]);

  const filteredItems = useMemo(() => {
    const items = data?.establishments || [];
    const normalizedSearch = normalizeText(search);

    return items.filter((item) => {
      const matchesSearch = !normalizedSearch
        || normalizeText(item.name).includes(normalizedSearch)
        || normalizeText(item.rbd).includes(normalizedSearch)
        || normalizeText(item.commune).includes(normalizedSearch);

      const matchesStatus = status === 'all'
        || (status === 'with' && item.hasPedagogicalOuting)
        || (status === 'without' && !item.hasPedagogicalOuting);

      const matchesYear = year === 'all' || item.year === year;

      const matchesDimension = dimension === 'all' || item.dimensions.includes(dimension);

      return matchesSearch && matchesStatus && matchesYear && matchesDimension;
    });
  }, [data, dimension, search, status, year]);

  const strategicScopedItems = useMemo(() => {
    const items = data?.establishments || [];
    const normalizedSearch = normalizeText(search);

    return items.filter((item) => {
      const matchesSearch = !normalizedSearch
        || normalizeText(item.name).includes(normalizedSearch)
        || normalizeText(item.rbd).includes(normalizedSearch)
        || normalizeText(item.commune).includes(normalizedSearch);

      const matchesDimension = dimension === 'all' || item.dimensions.includes(dimension);

      return matchesSearch && matchesDimension;
    });
  }, [data, dimension, search]);

  const effectivePlanningYear = useMemo(
    () => resolvePlanningYear(years, planningYear === 'auto' ? (year === 'all' ? 'auto' : year) : planningYear),
    [planningYear, year, years],
  );

  const strategicModel = useMemo(
    () => buildStrategicProfiles(strategicScopedItems, effectivePlanningYear, strategy),
    [effectivePlanningYear, strategicScopedItems, strategy],
  );

  const strategicProfiles = useMemo(
    () => (showPendingOnly ? strategicModel.profiles.filter((item) => item.pendingThisYear) : strategicModel.profiles),
    [showPendingOnly, strategicModel.profiles],
  );

  const strategicMap = useMemo(
    () => Object.fromEntries(strategicModel.profiles.map((item) => [item.rbd, item])),
    [strategicModel.profiles],
  );

  const budgetSimulation = useMemo(
    () => buildBudgetSimulation(strategicModel.profiles, budgetInput),
    [budgetInput, strategicModel.profiles],
  );

  const strategicMetrics = useMemo(() => {
    const pendingProfiles = strategicModel.profiles.filter((item) => item.pendingThisYear);
    const tramitableProfiles = strategicModel.profiles.filter((item) => item.hasPmeResources);
    const nonTramitableProfiles = strategicModel.profiles.filter((item) => !item.hasPmeResources);
    const pendingBudget = pendingProfiles.reduce((sum, item) => sum + item.estimatedBudgetForPlanningYear, 0);
    const coverageRate = tramitableProfiles.length
      ? (tramitableProfiles.length - pendingProfiles.length) / tramitableProfiles.length
      : 0;
    const weakestCommune = strategicModel.communeCoverage[0] || null;

    return {
      tramitableCount: tramitableProfiles.length,
      nonTramitableCount: nonTramitableProfiles.length,
      pendingCount: pendingProfiles.length,
      pendingBudget,
      coverageRate,
      weakestCommune,
      topProfiles: strategicProfiles.slice(0, 10),
      communeCoverage: strategicModel.communeCoverage.slice(0, 8),
      ruralityCoverage: strategicModel.ruralityCoverage,
      territorialSummary: strategicModel.communeCoverage.slice(0, 6),
    };
  }, [strategicModel, strategicProfiles]);

  useEffect(() => {
    if (!budgetTouched && strategicMetrics.pendingBudget > 0) {
      setBudgetInput(String(Math.round(strategicMetrics.pendingBudget)));
    }
  }, [budgetTouched, strategicMetrics.pendingBudget]);

  const parsedBudgetInput = Number(budgetInput) || 0;
  const budgetSliderMax = Math.max(Math.round(strategicMetrics.pendingBudget || 0), 1000000);
  const budgetCoverageShare = strategicMetrics.pendingCount
    ? budgetSimulation.coveredCount / strategicMetrics.pendingCount
    : 0;

  const derivedMetrics = useMemo(() => {
    const totalRecords = filteredItems.length;
    const totalEstablishments = new Set(filteredItems.map((item) => item.rbd).filter(Boolean)).size;
    const withOutings = filteredItems.filter((item) => item.hasPedagogicalOuting).length;
    const totalActions = filteredItems.reduce((sum, item) => sum + item.actionCount, 0);
    const estimatedBudget = filteredItems.reduce((sum, item) => sum + item.estimatedBudget, 0);

    const dimensionMap = new Map();
    filteredItems.forEach((item) => {
      item.dimensions.forEach((itemDimension) => {
        if (!itemDimension) {
          return;
        }

        dimensionMap.set(itemDimension, (dimensionMap.get(itemDimension) || 0) + 1);
      });
    });

    const dimensionChart = [...dimensionMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    const statusChart = [
      { name: 'Con salidas', value: withOutings },
      { name: 'Sin salidas', value: Math.max(totalRecords - withOutings, 0) },
    ];

    const yearChart = (data?.catalogs?.years || []).map((itemYear) => {
      const yearItems = filteredItems.filter((item) => item.year === itemYear);

      return {
        year: itemYear,
        establecimientos: yearItems.length,
        acciones: yearItems.reduce((sum, item) => sum + item.actionCount, 0),
      };
    });

    return {
      totalEstablishments,
      totalRecords,
      withOutings,
      totalActions,
      estimatedBudget,
      dimensionChart,
      statusChart,
      yearChart,
    };
  }, [data, filteredItems]);

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-900">
      <div className="absolute inset-0 bg-[url('/auth.webp')] bg-cover bg-center bg-no-repeat opacity-[0.18]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,240,245,0.90)_0%,rgba(237,240,245,0.96)_40%,rgba(237,240,245,1)_100%)]" />

      <div className="relative w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10 2xl:px-12">
        <header className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-brand-hero px-6 py-8 text-white shadow-soft sm:px-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-grid bg-[size:20px_20px] opacity-15" />
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-red/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-brand-blue/35 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
            <div>
              <img
                src="/SLEPCOLCHAGUA.webp"
                alt="Logo SLEP Colchagua"
                className="h-16 w-auto rounded-2xl bg-white/10 p-2 backdrop-blur sm:h-20"
              />
              <p className="mt-5 text-sm uppercase tracking-[0.28em] text-white/75">Dashboard interactivo PME</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Vista ejecutiva y detalle por establecimiento conectada a Google Sheets.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/82 sm:text-base">
                El dashboard cruza la hoja ANALISIS con ESTABLECIMIENTOS usando el RBD, consolida métricas,
                identifica salidas pedagógicas y abre una ficha modal con el detalle de cada escuela.
              </p>
            </div>

            <div className="grid gap-4 rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center gap-3 text-sm text-white/80">
                <RefreshCw size={16} />
                <span>Última actualización: {formatDate(data?.updatedAt)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Fuente</p>
                  <p className="mt-2 text-sm font-medium text-white">Google Apps Script</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Cruce</p>
                  <p className="mt-2 text-sm font-medium text-white">RBD hoja a hoja</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="mt-8 rounded-[2rem] border border-brand-mist bg-white/92 p-12 text-center shadow-soft backdrop-blur">
            <p className="text-lg font-medium text-brand-navy">Cargando dashboard...</p>
            <p className="mt-2 text-sm text-slate-500">Consultando la API y normalizando establecimientos.</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 rounded-[2rem] border border-brand-red/25 bg-[linear-gradient(135deg,rgba(255,29,61,0.12)_0%,rgba(237,240,245,0.95)_100%)] p-6 text-brand-red shadow-soft">
            <p className="text-lg font-semibold">Error de carga</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : null}

        {!loading && !error && data ? (
          <div className="mt-8 space-y-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Con recursos PME"
                value={formatNumber(strategicMetrics.tramitableCount)}
                helper={`Escuelas con recursos asociados en su PME para ${effectivePlanningYear}`}
                tone="coral"
              />
              <MetricCard
                title="Sin recursos PME"
                value={formatNumber(strategicMetrics.nonTramitableCount)}
                helper="Escuelas que no pueden tramitarse por falta de recursos asociados"
                tone="amber"
              />
              <MetricCard
                title={`Pendientes ${effectivePlanningYear}`}
                value={formatNumber(strategicMetrics.pendingCount)}
                helper="Escuelas tramitables sin salida pedagógica en el año activo"
                tone="emerald"
              />
              <MetricCard
                title="Monto a distribuir"
                value={formatCurrency(strategicMetrics.pendingBudget)}
                helper="Gasto potencial sobre las escuelas que sí lo determinaron en su PME"
                tone="sky"
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Establecimientos"
                value={formatNumber(derivedMetrics.totalEstablishments)}
                helper="Escuelas unicas considerando filtros activos"
                tone="sky"
              />
              <MetricCard
                title="Con salidas"
                value={formatNumber(derivedMetrics.withOutings)}
                helper="Tienen evidencia de salida pedagógica en PME"
                tone="emerald"
              />
              <MetricCard
                title="Acciones"
                value={formatNumber(derivedMetrics.totalActions)}
                helper="Total de acciones declaradas"
                tone="amber"
              />
              <MetricCard
                title="Monto estimado"
                value={formatCurrency(derivedMetrics.estimatedBudget)}
                helper="Suma detectada desde observaciones"
                tone="coral"
              />
            </section>

            <SectionCard
              title="Prioridad 2026"
              description="Ranking, estrategia de asignación y lectura presupuestaria para decidir a quiénes les toca salida este año entre las escuelas con recursos PME."
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <Target size={16} />
                    <span>Año activo</span>
                    <select
                      className="bg-transparent font-medium outline-none"
                      value={planningYear}
                      onChange={(event) => setPlanningYear(event.target.value)}
                    >
                      <option value="auto">Automático</option>
                      {years.map((itemYear) => (
                        <option key={itemYear} value={itemYear}>
                          {itemYear}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <SlidersHorizontal size={16} />
                    <span>Estrategia</span>
                    <select
                      className="bg-transparent font-medium outline-none"
                      value={strategy}
                      onChange={(event) => setStrategy(event.target.value)}
                    >
                      {STRATEGY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showPendingOnly}
                      onChange={(event) => setShowPendingOnly(event.target.checked)}
                    />
                    Solo tramitables pendientes
                  </label>
                </div>
              }
            >
              <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Ranking estrategico</p>
                      <h3 className="mt-1 text-lg font-semibold text-brand-navy">Escuelas sugeridas para intervenir</h3>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{getStrategyLabel(strategy)}</p>
                      <p>{formatNumber(strategicProfiles.length)} escuelas evaluadas</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Escuela</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Comuna</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prioridad</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monto</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {strategicMetrics.topProfiles.map((item, index) => (
                          <tr key={item.rbd} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="border-b border-slate-100 px-4 py-3">
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              <p className="mt-1 text-xs text-slate-500">RBD {item.rbd}</p>
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{item.commune}</td>
                            <td className="border-b border-slate-100 px-4 py-3">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                item.priority === 'Alta'
                                  ? 'bg-red-100 text-red-700'
                                  : item.priority === 'Media'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                              >
                                {item.priority}
                              </span>
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 font-semibold text-brand-navy">{formatNumber(item.score)}</td>
                            <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(item.estimatedBudgetForPlanningYear)}</td>
                            <td className="border-b border-slate-100 px-4 py-3 text-slate-500">{item.reasons[0] || 'Sin observación estratégica'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Condición de tramitación</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Con recursos PME</p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-800">{formatNumber(strategicMetrics.tramitableCount)}</p>
                        <p className="mt-1 text-sm text-emerald-700">Base válida para distribuir gasto</p>
                      </div>
                      <div className="rounded-2xl bg-red-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-red-700">Sin recursos PME</p>
                        <p className="mt-2 text-2xl font-semibold text-red-800">{formatNumber(strategicMetrics.nonTramitableCount)}</p>
                        <p className="mt-1 text-sm text-red-700">No pueden tramitarse por falta de recursos</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-brand-mist bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Simulador de presupuesto</p>
                    <h3 className="mt-2 text-lg font-semibold text-brand-navy">Cuánto alcanza el presupuesto disponible</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Ajusta el monto y verás en tiempo real cuántas escuelas tramitables pueden cubrirse.
                    </p>
                    <label className="mt-4 flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Monto total disponible</span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                        value={budgetInput}
                        onChange={(event) => {
                          setBudgetTouched(true);
                          setBudgetInput(event.target.value.replace(/[^0-9]/g, ''));
                        }}
                        placeholder="Ej. 15000000"
                        inputMode="numeric"
                      />
                    </label>

                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                        Ingresado: {formatCurrency(parsedBudgetInput)}
                      </span>
                      <span className="rounded-full bg-brand-mist px-3 py-1 font-medium text-brand-navy">
                        Objetivo total: {formatCurrency(strategicMetrics.pendingBudget)}
                      </span>
                    </div>

                    <div className="mt-4">
                      <input
                        type="range"
                        min="0"
                        max={budgetSliderMax}
                        step={Math.max(Math.round(budgetSliderMax / 100), 10000)}
                        value={Math.min(parsedBudgetInput, budgetSliderMax)}
                        onChange={(event) => {
                          setBudgetTouched(true);
                          setBudgetInput(event.target.value);
                        }}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#25306B]"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[0.25, 0.5, 0.75, 1].map((fraction) => {
                          const nextValue = Math.round(budgetSliderMax * fraction);

                          return (
                            <button
                              key={fraction}
                              type="button"
                              onClick={() => {
                                setBudgetTouched(true);
                                setBudgetInput(String(nextValue));
                              }}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-blue hover:text-brand-blue"
                            >
                              {Math.round(fraction * 100)}%
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">Cobertura simulada</span>
                        <span className="font-semibold text-brand-navy">{formatPercent(budgetCoverageShare)}</span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#25306B_0%,#006BB9_100%)] transition-all duration-300"
                          style={{ width: `${Math.max(Math.min(budgetCoverageShare * 100, 100), 0)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {formatNumber(budgetSimulation.coveredCount)} de {formatNumber(strategicMetrics.pendingCount)} escuelas tramitables cubiertas.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Escuelas cubiertas</p>
                        <p className="mt-2 text-2xl font-semibold text-brand-navy">{formatNumber(budgetSimulation.coveredCount)}</p>
                        <p className="mt-1 text-sm text-slate-500">Segun ranking y presupuesto</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Saldo remanente</p>
                        <p className="mt-2 text-2xl font-semibold text-brand-navy">{formatCurrency(budgetSimulation.remainingBudget)}</p>
                        <p className="mt-1 text-sm text-slate-500">Despues de cubrir las prioridades</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-brand-mist p-4 text-sm text-slate-600">
                      <p><span className="font-semibold text-brand-navy">Comunas cubiertas:</span> {budgetSimulation.coveredCommunes.join(', ') || 'Sin cobertura simulada'}</p>
                      <p className="mt-2"><span className="font-semibold text-brand-navy">Comunas fuera:</span> {budgetSimulation.uncoveredCommunes.join(', ') || 'Ninguna'}</p>
                    </div>

                    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Escuelas que se pueden trabajar</p>
                          <p className="mt-1 text-sm text-slate-500">Listado dinámico según el monto ingresado y el orden de prioridad actual.</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {formatNumber(budgetSimulation.coveredCount)} seleccionadas
                        </span>
                      </div>

                      <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-slate-100">
                        {budgetSimulation.covered.length ? (
                          <table className="min-w-full border-separate border-spacing-0 text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-left">
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">#</th>
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Escuela</th>
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Comuna</th>
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monto</th>
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acumulado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {budgetSimulation.covered.map((item, index) => (
                                <tr key={`${item.rbd}-${item.simulationOrder}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                  <td className="border-b border-slate-100 px-4 py-3 font-semibold text-brand-navy">{formatNumber(item.simulationOrder)}</td>
                                  <td className="border-b border-slate-100 px-4 py-3">
                                    <p className="font-medium text-slate-900">{item.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">RBD {item.rbd}</p>
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{item.commune}</td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(item.estimatedBudgetForPlanningYear)}</td>
                                  <td className="border-b border-slate-100 px-4 py-3 font-semibold text-emerald-700">{formatCurrency(item.simulationAccumulatedBudget)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-slate-500">
                            Con el monto ingresado no entra ninguna escuela. Sube el presupuesto para que aparezcan establecimientos tramitables.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Escuelas que quedan pendientes</p>
                          <p className="mt-1 text-sm text-slate-500">No alcanzan a entrar dentro del monto actual.</p>
                        </div>
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          {formatNumber(budgetSimulation.uncoveredCount)} fuera
                        </span>
                      </div>

                      <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-slate-100">
                        {budgetSimulation.uncovered.length ? (
                          <table className="min-w-full border-separate border-spacing-0 text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-left">
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Escuela</th>
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Comuna</th>
                                <th className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {budgetSimulation.uncovered.map((item, index) => (
                                <tr key={`${item.rbd}-${item.simulationOrder}-outside`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                  <td className="border-b border-slate-100 px-4 py-3">
                                    <p className="font-medium text-slate-900">{item.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">RBD {item.rbd}</p>
                                  </td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{item.commune}</td>
                                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(item.estimatedBudgetForPlanningYear)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-slate-500">
                            No quedan escuelas fuera. Con este monto puedes trabajar todo el grupo tramitable pendiente.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(37,48,107,0.95)_0%,rgba(44,61,158,0.88)_100%)] p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Lectura ejecutiva</p>
                    <p className="mt-3 text-sm leading-7 text-white/80">
                      Bajo la estrategia <span className="font-semibold text-white">{getStrategyLabel(strategy)}</span>, el sistema prioriza
                      {showPendingOnly ? ' escuelas tramitables pendientes del año activo' : ' el universo completo filtrado'} y estima una cobertura de
                      <span className="font-semibold text-white"> {formatPercent(strategicMetrics.coverageRate)}</span> dentro de la base con recursos PME para {effectivePlanningYear}.
                    </p>
                    <p className="mt-4 text-sm leading-7 text-white/80">
                      La comuna con menor cobertura observada entre escuelas tramitables es <span className="font-semibold text-white">{strategicMetrics.weakestCommune?.name || 'Sin dato'}</span>.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Brechas territoriales"
              description="Lectura estratégica de recursos PME por comuna, ruralidad y territorios más rezagados."
            >
              <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-brand-mist bg-white p-4 shadow-sm">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-brand-navy">Brecha por comuna</p>
                      <p className="text-sm text-slate-500">Comparación entre escuelas con y sin recursos PME asociados en {effectivePlanningYear}.</p>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={strategicMetrics.communeCoverage} margin={{ top: 10, right: 10, bottom: 25, left: 0 }}>
                          <CartesianGrid vertical={false} stroke="#d7ddea" />
                          <XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="withBudget" name="Con recursos PME" radius={[10, 10, 0, 0]} fill="#25306B" />
                          <Bar dataKey="withoutBudget" name="Sin recursos PME" radius={[10, 10, 0, 0]} fill="#FF1D3D" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-brand-mist bg-white p-4 shadow-sm">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-brand-navy">Brecha por ruralidad</p>
                      <p className="text-sm text-slate-500">Mide qué parte de la base sí tiene recursos PME y cuál queda fuera por falta de registro.</p>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={strategicMetrics.ruralityCoverage} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid vertical={false} stroke="#d7ddea" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="withBudget" name="Con recursos PME" radius={[10, 10, 0, 0]} fill="#006BB9" />
                          <Bar dataKey="withoutBudget" name="Sin recursos PME" radius={[10, 10, 0, 0]} fill="#FF1D3D" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#f7f9fc_0%,#edf0f5_100%)] p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-brand-navy">Radar territorial</p>
                    <p className="text-sm text-slate-500">Resumen por comuna para identificar dónde conviene concentrar presupuesto y qué escuelas quedan fuera por falta de recursos PME.</p>
                  </div>
                  <div className="grid gap-3">
                    {strategicMetrics.territorialSummary.map((item) => (
                      <div key={item.name} className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{formatPercent(item.coverageRate)} de cobertura</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {formatNumber(item.total)} escuelas
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sin recursos</p>
                            <p className="mt-1 font-semibold text-brand-red">{formatNumber(item.withoutBudget)}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Con recursos</p>
                            <p className="mt-1 font-semibold text-brand-navy">{formatNumber(item.withBudget)}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Monto</p>
                            <p className="mt-1 font-semibold text-slate-700">{formatCurrency(item.estimatedBudget)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title="Panel de métricas"
                description="Distribución por dimensión, estado de salidas pedagógicas y comparación entre 2025 y 2026."
                actions={
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Activity size={16} />
                    <span>{formatNumber(filteredItems.length)} registros visibles</span>
                  </div>
                }
              >
                <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-6">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={derivedMetrics.dimensionChart} margin={{ top: 10, right: 10, bottom: 25, left: 0 }}>
                          <CartesianGrid vertical={false} stroke="#d7ddea" />
                          <XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#006BB9" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="rounded-[1.75rem] border border-brand-mist bg-white p-4 shadow-sm">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-brand-navy">Comparativo anual</p>
                        <p className="text-sm text-slate-500">Cruza la nueva columna Año para comparar 2025 y 2026.</p>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={derivedMetrics.yearChart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                            <CartesianGrid vertical={false} stroke="#d7ddea" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="establecimientos" name="Establecimientos" radius={[10, 10, 0, 0]} fill="#25306B" />
                            <Bar dataKey="acciones" name="Acciones" radius={[10, 10, 0, 0]} fill="#FF1D3D" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="h-fit rounded-[1.75rem] bg-[linear-gradient(180deg,#f7f9fc_0%,#edf0f5_100%)] p-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={derivedMetrics.statusChart}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={4}
                          >
                            {derivedMetrics.statusChart.map((entry, index) => (
                              <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="-mt-4 grid gap-2">
                      {derivedMetrics.statusChart.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
                          <span className="flex items-center gap-2 text-slate-600">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                            {item.name}
                          </span>
                          <span className="font-semibold text-slate-900">{formatNumber(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Resumen ejecutivo" description="Indicadores clave derivados del cruce y normalización del RBD.">
                <div className="grid gap-4">
                  <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(37,48,107,0.95)_0%,rgba(44,61,158,0.88)_100%)] p-5 text-white">
                    <div className="flex items-center gap-3 text-white">
                      <CircleDollarSign size={20} />
                      <h3 className="font-semibold">Lectura presupuestaria</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/80">
                      El monto total estimado se obtiene extrayendo valores monetarios desde observaciones de ANALISIS.
                      Si una fila contiene varios montos, la API los suma automáticamente.
                    </p>
                    <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(derivedMetrics.estimatedBudget)}</p>
                  </div>

                  <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(255,29,61,0.95)_0%,rgba(255,29,61,0.82)_35%,rgba(237,240,245,0.95)_100%)] p-5">
                    <div className="flex items-center gap-3 text-brand-red">
                      <Building2 size={20} />
                      <h3 className="font-semibold">Cobertura y año</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      El detalle modal permite revisar la ficha del establecimiento, y ahora puedes comparar la base entre 2025 y 2026 según la nueva columna Año.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {(data.yearSummary || []).map((item) => (
                        <div key={item.year} className="rounded-2xl bg-white/75 p-4 backdrop-blur">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.year}</p>
                          <p className="mt-2 text-2xl font-semibold text-brand-navy">{formatNumber(item.totalEstablishments)}</p>
                          <p className="mt-1 text-sm text-slate-600">{formatNumber(item.withOutings)} con salidas</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </section>

            <SectionCard
              title="Panel de detalles"
              description="Tabla operativa con lectura rápida por establecimiento. Abre el modal para revisar el cruce completo entre ANALISIS y ESTABLECIMIENTOS."
            >
              <EstablishmentTable
                items={filteredItems}
                onOpen={setSelectedItem}
                strategicMap={strategicMap}
              />
            </SectionCard>
          </div>
        ) : null}
      </div>

      <EstablishmentModal
        item={selectedItem}
        strategicProfile={selectedItem?.rbd ? strategicMap[selectedItem.rbd] : null}
        planningYear={effectivePlanningYear}
        strategyLabel={getStrategyLabel(strategy)}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}