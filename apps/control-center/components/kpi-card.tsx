type Props = {
  label: string;
  value: string | number;
  tone?: 'ok' | 'warn' | 'err';
  delta?: string;
  freshness?: 'live' | 'stale' | 'outdated' | 'unknown';
};

export function KpiCard({ label, value, tone, delta, freshness }: Props) {
  return (
    <div className="card span-3">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {tone ? <span className={`badge ${tone}`}>{tone}</span> : null}
        {freshness ? <span className="badge">{freshness}</span> : null}
        {delta ? <span className="badge">Δ {delta}</span> : null}
      </div>
    </div>
  );
}
