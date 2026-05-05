export default function MetricCard({ title, value, helper, tone = 'sky' }) {
  const tones = {
    sky: 'from-brand-blue/16 via-white to-brand-mist text-brand-navy border-brand-blue/15',
    amber: 'from-brand-red/12 via-white to-brand-mist text-brand-red border-brand-red/15',
    emerald: 'from-brand-navy/14 via-white to-brand-mist text-brand-navy border-brand-navy/15',
    coral: 'from-brand-red/18 via-white to-brand-mist text-brand-red border-brand-red/20',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-soft ${tones[tone] || tones.sky}`}>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}