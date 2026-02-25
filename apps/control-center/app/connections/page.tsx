import { getConnectionsDrilldown } from '@/lib/drilldowns';

export default async function ConnectionsPage() {
  const data = await getConnectionsDrilldown('24h');

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Connection Health</h1>
          <div className="muted">Gateway/channel/session timeline and auth-state signals (Phase 2)</div>
        </div>
        <a href="./" className="muted">← Back to overview</a>
      </div>

      <section className="grid">
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>State</h3><div>{data.summary.state}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Pairing hints</h3><div>{data.summary.pairingRequiredHints}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Freshness</h3><div>{data.summary.freshness}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Fallback used</h3><div>{String(data.summary.fallbackUsed)}</div></div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Connection Timeline</h3>
          <ul className="list">{data.timeline.length ? data.timeline.map((t) => <li key={`${t.ts}:${t.type}`}>{t.ts} — <strong>{t.normalizedType}</strong> ({t.severity}) {t.message}</li>) : <li className="muted">No connection incidents detected.</li>}</ul>
        </div>
        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Related Source Health</h3>
          <ul className="list">{data.sourceHealth.map((s) => <li key={s.source}><strong>{s.source}</strong>: {s.state} <span className="muted">({s.freshness || 'unknown'})</span></li>)}</ul>
        </div>
      </section>
    </main>
  );
}
