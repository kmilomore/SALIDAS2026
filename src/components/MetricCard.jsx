export default function MetricCard({ title, value, helper, tone = 'sky' }) {
  const tones = {
    sky: 'from-sky-600/15 to-white text-sky-900 border-sky-100',
    amber: 'from-amber-500/15 to-white text-amber-900 border-amber-100',
    emerald: 'from-emerald-500/15 to-white text-emerald-900 border-emerald-100',
    coral: 'from-rose-500/15 to-white text-rose-900 border-rose-100',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-soft ${tones[tone] || tones.sky}`}>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}