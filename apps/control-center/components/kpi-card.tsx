type Props = {
  label: string;
  value: string | number;
  tone?: 'ok' | 'warn' | 'err';
};

export function KpiCard({ label, value, tone }: Props) {
  return (
    <div className="card span-3">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {tone ? <span className={`badge ${tone}`}>{tone}</span> : null}
    </div>
  );
}
