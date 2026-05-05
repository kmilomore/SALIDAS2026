export default function SectionCard({ title, description, actions, children }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-soft backdrop-blur-md">
      <div className="flex flex-col gap-3 border-b border-brand-mist pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-navy">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}