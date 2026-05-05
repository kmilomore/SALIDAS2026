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
import { Activity, Building2, CircleDollarSign, RefreshCw } from 'lucide-react';
import EstablishmentModal from './components/EstablishmentModal';
import EstablishmentTable from './components/EstablishmentTable';
import MetricCard from './components/MetricCard';
import SectionCard from './components/SectionCard';
import { fetchDashboardData } from './lib/api';
import { formatCurrency, formatDate, formatNumber } from './lib/formatters';
import { buildStrategicProfiles, resolvePlanningYear } from './lib/strategic';

const PIE_COLORS = ['#25306B', '#006BB9', '#FF1D3D', '#EDF0F5'];

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
    () => resolvePlanningYear(years, year === 'all' ? 'auto' : year),
    [year, years],
  );

  const strategicModel = useMemo(
    () => buildStrategicProfiles(strategicScopedItems, effectivePlanningYear, 'coverage'),
    [effectivePlanningYear, strategicScopedItems],
  );

  const strategicProfiles = useMemo(
    () => strategicModel.profiles.filter((item) => !item.wasCovered2025 && item.hasPmeResources),
    [strategicModel.profiles],
  );

  const strategicMap = useMemo(
    () => Object.fromEntries(strategicModel.profiles.map((item) => [item.rbd, item])),
    [strategicModel.profiles],
  );

  const strategicMetrics = useMemo(() => {
    const pendingProfiles = strategicModel.profiles.filter((item) => item.pendingThisYear);
    const tramitableProfiles = strategicModel.profiles.filter((item) => item.hasPmeResources);
    const nonTramitableProfiles = strategicModel.profiles.filter((item) => !item.hasPmeResources);
    const notCovered2025Profiles = tramitableProfiles.filter((item) => !item.wasCovered2025);
    const pendingBudget = pendingProfiles.reduce((sum, item) => sum + item.estimatedBudgetForPlanningYear, 0);
    const coverageRate = tramitableProfiles.length
      ? (tramitableProfiles.length - pendingProfiles.length) / tramitableProfiles.length
      : 0;
    const weakestCommune = strategicModel.communeCoverage[0] || null;

    return {
      tramitableCount: tramitableProfiles.length,
      nonTramitableCount: nonTramitableProfiles.length,
      pendingCount: pendingProfiles.length,
      notCovered2025Count: notCovered2025Profiles.length,
      pendingBudget,
      coverageRate,
      weakestCommune,
      uncoveredProfiles: strategicProfiles,
      communeCoverage: strategicModel.communeCoverage.slice(0, 8),
      ruralityCoverage: strategicModel.ruralityCoverage,
      territorialSummary: strategicModel.communeCoverage.slice(0, 6),
    };
  }, [strategicModel, strategicProfiles]);

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

    const records2025 = (data?.establishments || []).filter((item) => item.year === '2025');
    const requested2025 = records2025.filter((item) => item.hasPedagogicalOuting);
    const concreted2025 = requested2025.filter((item) => item.wasCovered2025);
    const pending2025 = requested2025.filter((item) => !item.wasCovered2025);
    const schools2025Map = new Map();

    requested2025.forEach((item) => {
      const current = schools2025Map.get(item.rbd) || {
        rbd: item.rbd,
        name: item.name,
        commune: item.commune,
        actions: 0,
        requested: false,
        concreted: false,
      };

      current.actions += Number(item.actionCount) || 0;
      current.requested = true;
      current.concreted = current.concreted || Boolean(item.wasCovered2025);

      schools2025Map.set(item.rbd, current);
    });

    const pme2025SummaryChart = [
      { name: 'Solicitado en PME 2025', value: new Set(requested2025.map((item) => item.rbd)).size },
      { name: 'Concretado en 2025', value: new Set(concreted2025.map((item) => item.rbd)).size },
      { name: 'No concretado en 2025', value: new Set(pending2025.map((item) => item.rbd)).size },
    ];

    const pme2025SchoolsChart = [...schools2025Map.values()]
      .sort((left, right) => right.actions - left.actions || String(left.name || '').localeCompare(String(right.name || ''), 'es'))
      .slice(0, 10)
      .map((item) => ({
        name: item.name,
        commune: item.commune,
        actions: item.actions,
        status: item.concreted ? 'Concretada' : 'No concretada',
      }));

    return {
      totalEstablishments,
      totalRecords,
      withOutings,
      totalActions,
      estimatedBudget,
      dimensionChart,
      statusChart,
      yearChart,
      pme2025SummaryChart,
      pme2025SchoolsChart,
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
                title={`Priorizables ${effectivePlanningYear}`}
                value={formatNumber(strategicMetrics.pendingCount)}
                helper="Escuelas con recursos PME y sin salida en el último PME disponible"
                tone="emerald"
              />
              <MetricCard
                title="No cubiertas 2025"
                value={formatNumber(strategicMetrics.notCovered2025Count)}
                helper="Base priorizable que no fue abordada durante 2025"
                tone="sky"
              />
            </section>

            <section className="grid gap-4 md:grid-cols-1 xl:grid-cols-1">
              <MetricCard
                title="Criterio 2026"
                value="Priorizar no cubiertas 2025"
                helper="La priorización se apoya primero en la cobertura 2025 y luego en criterios territoriales"
                tone="amber"
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
              title="Escuelas no cubiertas en 2025"
              description="Listado simple de escuelas con recursos PME que no fueron abordadas en 2025."
            >
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Listado 2026</p>
                    <h3 className="mt-1 text-lg font-semibold text-brand-navy">Escuelas no cubiertas en 2025</h3>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{formatNumber(strategicMetrics.notCovered2025Count)} escuelas</p>
                    <p>Con recursos PME disponibles</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Escuela</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">RBD</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Comuna</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Año de referencia</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acciones</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategicMetrics.uncoveredProfiles.length ? strategicMetrics.uncoveredProfiles.map((item, index) => (
                        <tr key={item.rbd} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{item.rbd}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{item.commune}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{item.referenceYear || effectivePlanningYear}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{formatNumber(item.actionsForPlanningYear)}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-500">{item.reasons[0] || 'No cubierta en 2025'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                            No hay escuelas con recursos PME pendientes por listar fuera de la cobertura 2025.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Seguimiento de salidas 2025"
              description="Compara lo solicitado en el PME 2025, lo efectivamente concretado y las escuelas con mayor cantidad de acciones declaradas en 2025."
            >
              <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-brand-mist bg-white p-4 shadow-sm">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-brand-navy">Solicitado vs concretado en 2025</p>
                      <p className="text-sm text-slate-500">Escuelas que declararon salida en su PME 2025 y cruce con la hoja de cobertura real 2025.</p>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={derivedMetrics.pme2025SummaryChart} margin={{ top: 10, right: 10, bottom: 25, left: 0 }}>
                          <CartesianGrid vertical={false} stroke="#d7ddea" />
                          <XAxis dataKey="name" angle={-12} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {derivedMetrics.pme2025SummaryChart.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.name === 'Concretado en 2025' ? '#006BB9' : entry.name === 'No concretado en 2025' ? '#FF1D3D' : '#25306B'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {derivedMetrics.pme2025SummaryChart.map((item) => (
                      <div key={item.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.name}</p>
                        <p className="mt-2 text-2xl font-semibold text-brand-navy">{formatNumber(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-brand-mist bg-white p-4 shadow-sm">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-brand-navy">Escuelas con más acciones declaradas en 2025</p>
                    <p className="text-sm text-slate-500">Top de establecimientos que declararon salidas en su PME 2025, con estado de concreción real.</p>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={derivedMetrics.pme2025SchoolsChart} layout="vertical" margin={{ top: 10, right: 10, bottom: 0, left: 30 }}>
                        <CartesianGrid horizontal={false} stroke="#d7ddea" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [formatNumber(value), 'Acciones 2025']} />
                        <Bar dataKey="actions" radius={[0, 12, 12, 0]}>
                          {derivedMetrics.pme2025SchoolsChart.map((entry) => (
                            <Cell key={`${entry.name}-${entry.status}`} fill={entry.status === 'Concretada' ? '#006BB9' : '#FF8A00'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {derivedMetrics.pme2025SchoolsChart.map((item) => (
                      <div key={`${item.name}-${item.commune}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-slate-500">{item.commune}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-brand-navy">{formatNumber(item.actions)} acciones</p>
                          <p className={item.status === 'Concretada' ? 'text-xs text-sky-700' : 'text-xs text-amber-700'}>{item.status}</p>
                        </div>
                      </div>
                    ))}
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
        strategyLabel="Cobertura 2025"
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}