import { getConnectionsDrilldown } from '@/lib/drilldowns';
import { normalizeRange } from '@/lib/metrics';
import { TopNav } from '@/components/top-nav';
import { BiControls } from '@/components/bi-controls';

export default async function ConnectionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const range = normalizeRange(typeof params.range === 'string' ? params.range : null);
  const compare = params.compare === 'previous' ? 'previous' : 'off';
  const segment = params.segment === 'healthy' || params.segment === 'attention' ? params.segment : 'all';
  const data = await getConnectionsDrilldown(range);

  const timeline = segment === 'healthy'
    ? data.timeline.filter((t) => t.severity === 'info')
    : segment === 'attention'
      ? data.timeline.filter((t) => t.severity !== 'info')
      : data.timeline;

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Connection Health</h1>
          <div className="muted">Gateway/channel/session timeline and pairing-state drilldowns</div>
        </div>
      </div>
      <TopNav current="/connections" />
      <BiControls path="/connections" range={range} compare={compare} segment={segment} />

      <section className="grid">
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>State</h3><div className="kpi-value">{data.summary.state}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Pairing hints</h3><div className="kpi-value">{data.summary.pairingRequiredHints}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Freshness</h3><div className="kpi-value">{data.summary.freshness}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Fallback</h3><div className="kpi-value">{String(data.summary.fallbackUsed)}</div></div>

        <div className="card span-8">
          <h3 style={{ marginTop: 0 }}>Connection Timeline ({segment})</h3>
          <ul className="list">{timeline.length ? timeline.map((t) => <li key={`${t.ts}:${t.type}`}>{t.ts} — <strong>{t.normalizedType}</strong> ({t.severity}) {t.message}</li>) : <li className="muted">No connection incidents for this segment.</li>}</ul>
        </div>
        <div className="card span-4">
          <h3 style={{ marginTop: 0 }}>Source Health</h3>
          <ul className="list">{data.sourceHealth.map((s) => <li key={s.source}><strong>{s.source}</strong>: {s.state} <span className="muted">({s.freshness || 'unknown'})</span></li>)}</ul>
        </div>
      </section>
    </main>
  );
}
