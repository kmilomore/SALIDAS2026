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
import FilterBar from './components/FilterBar';
import MetricCard from './components/MetricCard';
import SectionCard from './components/SectionCard';
import { fetchDashboardData } from './lib/api';
import { formatCurrency, formatDate, formatNumber } from './lib/formatters';

const PIE_COLORS = ['#1d4ed8', '#0f766e', '#fb923c', '#ef4444'];

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

      const matchesDimension = dimension === 'all' || item.dimensions.includes(dimension);

      return matchesSearch && matchesStatus && matchesDimension;
    });
  }, [data, dimension, search, status]);

  const derivedMetrics = useMemo(() => {
    const total = filteredItems.length;
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
      { name: 'Sin salidas', value: Math.max(total - withOutings, 0) },
    ];

    return {
      total,
      withOutings,
      totalActions,
      estimatedBudget,
      dimensionChart,
      statusChart,
    };
  }, [filteredItems]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_35%,#eff6ff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-soft sm:px-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-grid bg-[size:20px_20px] opacity-20" />
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-coral/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-sky-500/30 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-sky-200">Dashboard interactivo PME</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Vista ejecutiva y detalle por establecimiento conectada a Google Sheets.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                El dashboard cruza la hoja ANALISIS con ESTABLECIMIENTOS usando el RBD, consolida métricas,
                identifica salidas pedagógicas y abre una ficha modal con el detalle de cada escuela.
              </p>
            </div>

            <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <RefreshCw size={16} />
                <span>Última actualización: {formatDate(data?.updatedAt)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Fuente</p>
                  <p className="mt-2 text-sm font-medium text-white">Google Apps Script</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Cruce</p>
                  <p className="mt-2 text-sm font-medium text-white">RBD hoja a hoja</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-soft">
            <p className="text-lg font-medium text-slate-700">Cargando dashboard...</p>
            <p className="mt-2 text-sm text-slate-500">Consultando la API y normalizando establecimientos.</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-soft">
            <p className="text-lg font-semibold">Error de carga</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : null}

        {!loading && !error && data ? (
          <div className="mt-8 space-y-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Establecimientos"
                value={formatNumber(derivedMetrics.total)}
                helper="Resultados considerando filtros activos"
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
              title="Panel de control"
              description="Filtra la base y explora el comportamiento general del PME por establecimiento."
            >
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
                dimension={dimension}
                onDimensionChange={setDimension}
                dimensions={dimensions}
              />
            </SectionCard>

            <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title="Panel de métricas"
                description="Distribución por dimensión y estado de salidas pedagógicas."
                actions={
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Activity size={16} />
                    <span>{formatNumber(filteredItems.length)} registros visibles</span>
                  </div>
                }
              >
                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={derivedMetrics.dimensionChart} margin={{ top: 10, right: 10, bottom: 25, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#1d4ed8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-80 rounded-[1.75rem] bg-slate-50 p-4">
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
                    <div className="-mt-4 grid gap-2">
                      {derivedMetrics.statusChart.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
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
                  <div className="rounded-[1.75rem] bg-gradient-to-br from-orange-50 to-white p-5">
                    <div className="flex items-center gap-3 text-orange-700">
                      <CircleDollarSign size={20} />
                      <h3 className="font-semibold">Lectura presupuestaria</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      El monto total estimado se obtiene extrayendo valores monetarios desde observaciones de ANALISIS.
                      Si una fila contiene varios montos, la API los suma automáticamente.
                    </p>
                    <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(derivedMetrics.estimatedBudget)}</p>
                  </div>

                  <div className="rounded-[1.75rem] bg-gradient-to-br from-sky-50 to-white p-5">
                    <div className="flex items-center gap-3 text-sky-700">
                      <Building2 size={20} />
                      <h3 className="font-semibold">Cobertura</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      El detalle modal permite revisar la ficha del establecimiento y todos los campos provenientes de la hoja ESTABLECIMIENTOS.
                    </p>
                    <p className="mt-4 text-3xl font-semibold text-slate-900">{formatNumber(filteredItems.filter((item) => item.name && item.name !== 'Sin dato').length)}</p>
                  </div>
                </div>
              </SectionCard>
            </section>

            <SectionCard
              title="Panel de detalles"
              description="Selecciona un establecimiento para abrir la vista modal con el cruce completo entre ANALISIS y ESTABLECIMIENTOS."
            >
              <EstablishmentTable items={filteredItems} onOpen={setSelectedItem} />
            </SectionCard>
          </div>
        ) : null}
      </div>

      <EstablishmentModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}