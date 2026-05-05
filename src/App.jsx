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

const PIE_COLORS = ['#25306B', '#006BB9', '#FF1D3D', '#EDF0F5'];

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
              title="Panel de control"
              description="Filtra la base y explora el comportamiento general del PME por establecimiento."
            >
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
                year={year}
                onYearChange={setYear}
                years={years}
                dimension={dimension}
                onDimensionChange={setDimension}
                dimensions={dimensions}
              />
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
              <EstablishmentTable items={filteredItems} onOpen={setSelectedItem} />
            </SectionCard>
          </div>
        ) : null}
      </div>

      <EstablishmentModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}